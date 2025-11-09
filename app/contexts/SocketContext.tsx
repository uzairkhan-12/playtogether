import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

// Types for Socket.IO events
interface VideoControlData {
  action: 'play' | 'pause' | 'seek' | 'volume' | 'stop' | 'next' | 'previous';
  videoId: string;
  currentTime?: number;
  seekTime?: number;
  volume?: number;
  video?: {
    title: string;
    url: string;
    duration: number;
  };
  timestamp: string;
}

interface PlaybackStatus {
  videoId: string;
  currentTime: number;
  isPlaying: boolean;
  volume: number;
}

interface ConnectionStatus {
  isConnected: boolean;
  isParentOnline: boolean;
  isChildOnline: boolean;
  error?: string;
}

interface SocketContextType {
  socket: Socket | null;
  connectionStatus: ConnectionStatus;
  // Parent methods
  playVideo: (videoId: string, currentTime?: number) => void;
  pauseVideo: (videoId: string, currentTime: number) => void;
  seekVideo: (videoId: string, seekTime: number) => void;
  setVolume: (videoId: string, volume: number) => void;
  stopVideo: (videoId: string) => void;
  nextVideo: (currentVideoId: string) => void;
  previousVideo: (currentVideoId: string) => void;
  // Child methods
  sendControlAck: (action: string, videoId: string, status: 'success' | 'error') => void;
  sendPlaybackStatus: (status: PlaybackStatus) => void;
  // Event listeners
  onVideoControl: (callback: (data: VideoControlData) => void) => void;
  onChildStatus: (callback: (data: any) => void) => void;
  onPlaybackStatus: (callback: (data: any) => void) => void;
  onParentConnected: (callback: (data: any) => void) => void;
  onChildConnected: (callback: (data: any) => void) => void;
  // Connection methods
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
  announcePresence: () => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connectionStatus: {
    isConnected: false,
    isParentOnline: false,
    isChildOnline: false
  },
  playVideo: () => {},
  pauseVideo: () => {},
  seekVideo: () => {},
  setVolume: () => {},
  stopVideo: () => {},
  nextVideo: () => {},
  previousVideo: () => {},
  sendControlAck: () => {},
  sendPlaybackStatus: () => {},
  onVideoControl: () => {},
  onChildStatus: () => {},
  onPlaybackStatus: () => {},
  onParentConnected: () => {},
  onChildConnected: () => {},
  connect: () => {},
  disconnect: () => {},
  reconnect: () => {},
  announcePresence: () => {}
});

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { token, user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    isParentOnline: false,
    isChildOnline: false
  });

  useEffect(() => {
    if (isAuthenticated && token && user) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, token, user]);

  // Separate effect for delayed presence announcement after login
  useEffect(() => {
    if (socket && socket.connected && user?.pairedWith && isAuthenticated) {
      const timer = setTimeout(() => {
        console.log('🔄 Additional presence announcement after login');
        if (socket.connected) {
          socket.emit('user_online', { 
            userId: user._id, 
            role: user.role, 
            pairedWith: user.pairedWith 
          });
        }
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [socket?.connected, user?.pairedWith, isAuthenticated]);

  const connect = () => {
    if (socket) {
      socket.disconnect();
    }

    const newSocket = io('http://192.168.100.216:8888', {
      auth: {
        token: token,
        userId: user?._id,
        role: user?.role,
        pairedWith: user?.pairedWith
      },
      transports: ['websocket', 'polling']
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('🔌 Socket connected:', newSocket.id);
      setConnectionStatus(prev => ({ ...prev, isConnected: true, error: undefined }));
      
      // Immediately join appropriate room and announce presence
      if (user?.role && user?.pairedWith) {
        console.log('📡 Joining room and announcing presence for:', {
          userId: user._id,
          role: user.role,
          pairedWith: user.pairedWith,
          userName: user.name
        });
        newSocket.emit('join_room', { 
          userId: user._id, 
          role: user.role, 
          pairedWith: user.pairedWith 
        });
        newSocket.emit('user_online', { 
          userId: user._id, 
          role: user.role, 
          pairedWith: user.pairedWith 
        });
        
        // Additional check to ensure paired device knows we're online
        setTimeout(() => {
          if (newSocket.connected) {
            console.log('🔄 Re-announcing presence after connection stabilized');
            newSocket.emit('user_online', { 
              userId: user._id, 
              role: user.role, 
              pairedWith: user.pairedWith 
            });
          }
        }, 2000);
      } else {
        console.log('⚠️ User not paired or missing data:', {
          role: user?.role,
          pairedWith: user?.pairedWith,
          userId: user?._id
        });
      }
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      // Announce going offline
      if (user?.role && user?.pairedWith) {
        newSocket.emit('user_offline', { 
          userId: user._id, 
          role: user.role, 
          pairedWith: user.pairedWith 
        });
      }
      setConnectionStatus(prev => ({ 
        ...prev, 
        isConnected: false, 
        isParentOnline: false, 
        isChildOnline: false 
      }));
    });

    newSocket.on('connect_error', (error) => {
      console.error('🔌 Socket connection error:', error);
      setConnectionStatus(prev => ({ 
        ...prev, 
        isConnected: false, 
        error: error.message 
      }));
    });

    // Enhanced parent-child connection events
    newSocket.on('parent_online', (data) => {
      console.log('👨‍👩‍👧‍👦 Parent came online:', data);
      setConnectionStatus(prev => ({ ...prev, isParentOnline: true }));
    });

    newSocket.on('child_online', (data) => {
      console.log('👶 Child came online:', data);
      setConnectionStatus(prev => ({ ...prev, isChildOnline: true }));
    });

    newSocket.on('parent_offline', (data) => {
      console.log('👨‍👩‍👧‍👦 Parent went offline:', data);
      setConnectionStatus(prev => ({ ...prev, isParentOnline: false }));
    });

    newSocket.on('child_offline', (data) => {
      console.log('👶 Child went offline:', data);
      setConnectionStatus(prev => ({ ...prev, isChildOnline: false }));
    });

    // Legacy events for backward compatibility
    newSocket.on('parent_connected', (data) => {
      console.log('👨‍👩‍👧‍👦 Parent connected (legacy):', data);
      setConnectionStatus(prev => ({ ...prev, isParentOnline: true }));
    });

    newSocket.on('child_connected', (data) => {
      console.log('👶 Child connected (legacy):', data);
      setConnectionStatus(prev => ({ ...prev, isChildOnline: true }));
    });

    newSocket.on('parent_disconnected', (data) => {
      console.log('👨‍👩‍👧‍👦 Parent disconnected (legacy):', data);
      setConnectionStatus(prev => ({ ...prev, isParentOnline: false }));
    });

    newSocket.on('child_disconnected', (data) => {
      console.log('👶 Child disconnected (legacy):', data);
      setConnectionStatus(prev => ({ ...prev, isChildOnline: false }));
    });

    // Pairing events
    newSocket.on('pairing_success', (data) => {
      console.log('🎉 Pairing success received:', data);
    });

    newSocket.on('presence_confirmed', (data) => {
      console.log('✅ Presence confirmation received:', data);
    });

    setSocket(newSocket);

    // Error handling
    newSocket.on('error', (error) => {
      console.error('🔌 Socket error:', error);
      setConnectionStatus(prev => ({ ...prev, error: error.message }));
    });

    setSocket(newSocket);
  };

  const disconnect = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setConnectionStatus({
        isConnected: false,
        isParentOnline: false,
        isChildOnline: false
      });
    }
  };

  const reconnect = () => {
    console.log('🔄 Reconnecting socket with updated user data...');
    disconnect();
    setTimeout(() => {
      connect();
    }, 1000); // Brief delay to ensure clean disconnection
  };

  const announcePresence = () => {
    if (socket && socket.connected && user?.role && user?.pairedWith) {
      console.log('📢 Manually announcing presence for:', {
        userId: user._id,
        role: user.role,
        pairedWith: user.pairedWith,
        userName: user.name
      });
      socket.emit('user_online', { 
        userId: user._id, 
        role: user.role, 
        pairedWith: user.pairedWith 
      });
    } else {
      console.log('⚠️ Cannot announce presence - socket not connected or user not paired');
    }
  };

  // Parent methods
  const playVideo = (videoId: string, currentTime: number = 0) => {
    if (socket && user?.role === 'parent') {
      socket.emit('video_play', { videoId, currentTime });
    }
  };

  const pauseVideo = (videoId: string, currentTime: number) => {
    if (socket && user?.role === 'parent') {
      socket.emit('video_pause', { videoId, currentTime });
    }
  };

  const seekVideo = (videoId: string, seekTime: number) => {
    if (socket && user?.role === 'parent') {
      socket.emit('video_seek', { videoId, seekTime });
    }
  };

  const setVolume = (videoId: string, volume: number) => {
    if (socket && user?.role === 'parent') {
      socket.emit('video_volume', { videoId, volume });
    }
  };

  const stopVideo = (videoId: string) => {
    if (socket && user?.role === 'parent') {
      socket.emit('video_stop', { videoId });
    }
  };

  const nextVideo = (currentVideoId: string) => {
    if (socket && user?.role === 'parent') {
      socket.emit('video_next', { currentVideoId });
    }
  };

  const previousVideo = (currentVideoId: string) => {
    if (socket && user?.role === 'parent') {
      socket.emit('video_previous', { currentVideoId });
    }
  };

  // Child methods
  const sendControlAck = (action: string, videoId: string, status: 'success' | 'error') => {
    if (socket && user?.role === 'child') {
      socket.emit('video_control_ack', { action, videoId, status });
    }
  };

  const sendPlaybackStatus = (status: PlaybackStatus) => {
    if (socket && user?.role === 'child') {
      socket.emit('playback_status', status);
    }
  };

  // Event listeners
  const onVideoControl = (callback: (data: VideoControlData) => void) => {
    if (socket) {
      socket.on('video_control', callback);
      return () => socket.off('video_control', callback);
    }
  };

  const onChildStatus = (callback: (data: any) => void) => {
    if (socket) {
      socket.on('child_status', callback);
      return () => socket.off('child_status', callback);
    }
  };

  const onPlaybackStatus = (callback: (data: any) => void) => {
    if (socket) {
      socket.on('child_playback_status', callback);
      return () => socket.off('child_playback_status', callback);
    }
  };

  const onParentConnected = (callback: (data: any) => void) => {
    if (socket) {
      socket.on('parent_connected', callback);
      return () => socket.off('parent_connected', callback);
    }
  };

  const onChildConnected = (callback: (data: any) => void) => {
    if (socket) {
      socket.on('child_connected', callback);
      return () => socket.off('child_connected', callback);
    }
  };

  return (
    <SocketContext.Provider value={{
      socket,
      connectionStatus,
      playVideo,
      pauseVideo,
      seekVideo,
      setVolume,
      stopVideo,
      nextVideo,
      previousVideo,
      sendControlAck,
      sendPlaybackStatus,
      onVideoControl,
      onChildStatus,
      onPlaybackStatus,
      onParentConnected,
      onChildConnected,
      connect,
      disconnect,
      reconnect,
      announcePresence
    }}>
      {children}
    </SocketContext.Provider>
  );
};