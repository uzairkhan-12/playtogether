// app/screens/VideoPlayerScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions, 
  ActivityIndicator,
  StatusBar 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useSocket } from '@/contexts/SocketContext';
import { useRouter } from 'expo-router';

interface VideoData {
  _id: string;
  title: string;
  url: string;
  duration: number;
}

interface VideoControlData {
  action: 'play' | 'pause' | 'seek' | 'volume' | 'stop';
  video?: VideoData;
  seekTime?: number;
  volume?: number;
}

export default function VideoPlayerScreen() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const { socket } = useSocket();
  const router = useRouter();

  // Redirect parent users to dashboard
  if (user?.role === 'parent') {
    router.replace('/');
    return null;
  }

  const [currentVideo, setCurrentVideo] = useState<VideoData | null>(null);
  const [videoSource, setVideoSource] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [volume, setVolume] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [parentConnected, setParentConnected] = useState(false);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingPlayRef = useRef(false);

  // Initialize player with video source
  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = false;
    p.volume = volume;
    // Add playback event listeners
    p.addListener('statusChange', (status, oldStatus, error) => {
      console.log('📹 Player status changed:', oldStatus, '->', status);
      if (error) {
        console.error('Player error:', error);
        setError('Video playback error');
        setIsLoading(false);
      }
    });
  });

  // Auto-hide controls after 3 seconds
  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  // Monitor playback status
  useEffect(() => {
    if (!player || !videoSource) return;

    const interval = setInterval(() => {
      try {
        const status = player.status;
        
        if (status === 'readyToPlay') {
          setCurrentTime(player.currentTime || 0);
          setDuration(player.duration || 0);
          setIsLoading(false);
          
          // Handle pending play request
          if (pendingPlayRef.current) {
            console.log('✅ Player ready, starting playback');
            player.play();
            setIsPlaying(true);
            pendingPlayRef.current = false;
            resetControlsTimeout();
          }
          
          // Update playing state
          if (player.playing !== isPlaying) {
            setIsPlaying(player.playing);
          }
        } else if (status === 'loading') {
          setIsLoading(true);
        } else if (status === 'error') {
          setError('Video playback error');
          setIsLoading(false);
          pendingPlayRef.current = false;
        } else if (status === 'idle') {
          // Video ended
          if (isPlaying) {
            setIsPlaying(false);
            setShowControls(true);
          }
        }
      } catch (err) {
        console.log('Status check error:', err);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [player, videoSource, isPlaying]);

  // Handle socket video controls
  useEffect(() => {
    if (!socket) return;

    // Socket connection monitoring
    setIsSocketConnected(socket.connected);

    const handleConnect = () => {
      console.log('🔌 Child socket connected');
      setIsSocketConnected(true);
    };

    const handleDisconnect = () => {
      console.log('🔌 Child socket disconnected');
      setIsSocketConnected(false);
      setParentConnected(false);
    };

    const handleParentConnected = (data: any) => {
      console.log('👨‍👩‍👧‍👦 Parent connected:', data);
      setParentConnected(true);
    };

    const handleParentDisconnected = (data: any) => {
      console.log('👨‍👩‍👧‍👦 Parent disconnected:', data);
      setParentConnected(false);
    };

    // Video control handler
    const handleControl = async (data: VideoControlData) => {
      console.log('📺 Received video_control:', data);
      setError(null);

      try {
        switch (data.action) {
          case 'play':
            if (data.video) {
              // New video to play
              if (!currentVideo || data.video._id !== currentVideo._id) {
                console.log('🎬 Loading new video:', data.video.title);
                setIsLoading(true);
                setCurrentVideo(data.video);
                pendingPlayRef.current = true;
                setIsPlaying(false);
                
                // Small delay to ensure state updates
                setTimeout(() => {
                  setVideoSource(data.video.url);
                }, 100);
              } else {
                // Resume current video
                console.log('▶️ Resuming video');
                try {
                  if (player) {
                    if (player.status === 'readyToPlay') {
                      player.play();
                      setIsPlaying(true);
                      resetControlsTimeout();
                    } else {
                      pendingPlayRef.current = true;
                      setIsLoading(true);
                    }
                  }
                } catch (err) {
                  console.log('Play failed, will retry when ready');
                  pendingPlayRef.current = true;
                }
              }
            }
            break;

          case 'pause':
            console.log('⏸️ Pausing video');
            pendingPlayRef.current = false;
            try {
              if (player && player.playing) {
                player.pause();
                setIsPlaying(false);
                setShowControls(true);
              }
            } catch (err) {
              console.log('Pause failed:', err);
            }
            break;

          case 'seek':
            if (typeof data.seekTime === 'number') {
              console.log('⏩ Seeking to:', data.seekTime);
              try {
                if (player && player.status === 'readyToPlay') {
                  player.currentTime = data.seekTime;
                  setCurrentTime(data.seekTime);
                }
              } catch (err) {
                console.log('Seek failed:', err);
              }
            }
            break;

          case 'volume':
            if (typeof data.volume === 'number') {
              const vol = data.volume / 100;
              console.log('🔊 Setting volume:', vol);
              try {
                if (player) {
                  player.volume = vol;
                  setVolume(vol);
                }
              } catch (err) {
                console.log('Volume change failed:', err);
              }
            }
            break;

          case 'stop':
            console.log('⏹️ Stopping video');
            pendingPlayRef.current = false;
            try {
              if (player) {
                player.pause();
                player.currentTime = 0;
              }
            } catch (err) {
              console.log('Stop failed:', err);
            }
            setCurrentVideo(null);
            setVideoSource('');
            setIsPlaying(false);
            setCurrentTime(0);
            setShowControls(true);
            break;
        }
      } catch (err) {
        console.error('❌ Video control error:', err);
        setError('Failed to process video command');
        setIsLoading(false);
      }
    };

    // Register socket event listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('parent_connected', handleParentConnected);
    socket.on('parent_disconnected', handleParentDisconnected);
    socket.on('video_control', handleControl);

    // Send acknowledgment for video control received
    const sendAck = (action: string, videoId: string, status: string) => {
      socket.emit('video_control_ack', {
        action,
        videoId,
        status
      });
    };

    // Send periodic playback status updates
    const playbackStatusInterval = setInterval(() => {
      if (currentVideo && socket.connected) {
        socket.emit('playback_status', {
          videoId: currentVideo._id,
          currentTime,
          isPlaying,
          volume: Math.round(volume * 100)
        });
      }
    }, 2000); // Send status every 2 seconds

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('parent_connected', handleParentConnected);
      socket.off('parent_disconnected', handleParentDisconnected);
      socket.off('video_control', handleControl);
      clearInterval(playbackStatusInterval);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [socket, player, currentVideo, currentTime, isPlaying, volume]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      pendingPlayRef.current = false;
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  const formatTime = (seconds: number): string => {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlayPause = () => {
    if (!player) return;
    
    try {
      if (player.status !== 'readyToPlay') {
        console.log('Player not ready yet');
        return;
      }

      if (player.playing) {
        player.pause();
        setIsPlaying(false);
        pendingPlayRef.current = false;
      } else {
        player.play();
        setIsPlaying(true);
        resetControlsTimeout();
      }
    } catch (err) {
      console.error('Play/Pause error:', err);
      setError('Playback control failed');
    }
  };

  const handleScreenPress = () => {
    resetControlsTimeout();
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card }]}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Child Video Player
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            Welcome, {user?.name}
          </Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={toggleTheme} style={styles.themeButton}>
            <Ionicons 
              name={isDark ? 'sunny' : 'moon'} 
              size={24} 
              color={theme.text} 
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.themeButton}>
            <Ionicons name="log-out-outline" size={24} color={theme.error} />
          </TouchableOpacity>
        </View>
      </View>
      
      {currentVideo && videoSource ? (
        <TouchableOpacity 
          style={styles.videoContainer} 
          activeOpacity={1}
          onPress={handleScreenPress}
        >
          {/* Video Player */}
          <VideoView 
            style={styles.video} 
            player={player}
            nativeControls={false}
            contentFit="contain"
          />

          {/* Loading Indicator */}
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.loadingText}>Loading video...</Text>
            </View>
          )}

          {/* Error Message */}
          {error && (
            <View style={styles.errorOverlay}>
              <Ionicons name="warning" size={40} color="#ff4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Play/Pause Button */}
          {showControls && !isLoading && (
            <TouchableOpacity
              style={styles.playPauseButton}
              onPress={togglePlayPause}
              activeOpacity={0.8}
            >
              <View style={styles.playPauseIconWrapper}>
                <Ionicons 
                  name={isPlaying ? 'pause' : 'play'} 
                  size={50} 
                  color="#fff" 
                />
              </View>
            </TouchableOpacity>
          )}

          {/* Video Info Overlay */}
          {showControls && (
            <>
              {/* Top Gradient */}
              <View style={styles.topGradient}>
                <Text style={styles.videoTitle} numberOfLines={1}>
                  {currentVideo.title}
                </Text>
              </View>

              {/* Bottom Controls */}
              <View style={styles.bottomGradient}>
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }
                      ]} 
                    />
                  </View>
                  <View style={styles.timeContainer}>
                    <Text style={styles.timeText}>
                      {formatTime(currentTime)}
                    </Text>
                    <Text style={styles.timeText}>
                      {formatTime(duration)}
                    </Text>
                  </View>
                </View>

                {/* Volume Indicator */}
                <View style={styles.volumeIndicator}>
                  <Ionicons 
                    name={volume === 0 ? 'volume-mute' : volume < 0.5 ? 'volume-low' : 'volume-high'} 
                    size={20} 
                    color="#fff" 
                  />
                  <Text style={styles.volumeText}>{Math.round(volume * 100)}%</Text>
                </View>
              </View>
            </>
          )}
        </TouchableOpacity>
      ) : (
        // Waiting State
        <View style={styles.center}>
          <View style={styles.waitingCard}>
            <Ionicons name="videocam-off-outline" size={80} color={theme.textSecondary} />
            <Text style={[styles.waitingTitle, { color: theme.text }]}>
              Waiting for Video
            </Text>
            <Text style={[styles.waitingSubtitle, { color: theme.textSecondary }]}>
              Your parent will start a video soon
            </Text>
            
            {/* Connection Status Indicators */}
            <View style={styles.connectionStatus}>
              <View style={styles.statusRow}>
                <Ionicons 
                  name={isSocketConnected ? 'wifi' : 'wifi-outline'} 
                  size={20} 
                  color={isSocketConnected ? '#4CAF50' : theme.textSecondary} 
                />
                <Text style={[styles.statusText, { 
                  color: isSocketConnected ? '#4CAF50' : theme.textSecondary 
                }]}>
                  {isSocketConnected ? 'Connected' : 'Disconnected'}
                </Text>
              </View>
              
              <View style={styles.statusRow}>
                <Ionicons 
                  name={parentConnected ? 'person' : 'person-outline'} 
                  size={20} 
                  color={parentConnected ? '#4CAF50' : theme.textSecondary} 
                />
                <Text style={[styles.statusText, { 
                  color: parentConnected ? '#4CAF50' : theme.textSecondary 
                }]}>
                  Parent {parentConnected ? 'Online' : 'Offline'}
                </Text>
              </View>
            </View>

            <View style={styles.pulseContainer}>
              <View style={[styles.pulse, styles.pulse1]} />
              <View style={[styles.pulse, styles.pulse2]} />
              <View style={[styles.pulse, styles.pulse3]} />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 0, // No padding since header handles it
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50, // Account for status bar
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  themeButton: {
    padding: 8,
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
    justifyContent: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  waitingCard: {
    alignItems: 'center',
    gap: 16,
    padding: 30,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
    minWidth: width * 0.7,
  },
  waitingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  waitingSubtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  pulseContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
  },
  pulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
  },
  pulse1: {
    opacity: 0.3,
  },
  pulse2: {
    opacity: 0.6,
  },
  pulse3: {
    opacity: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
  },
  errorOverlay: {
    position: 'absolute',
    top: '50%',
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  playPauseButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -40 }, { translateY: -40 }],
  },
  playPauseIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingTop: 50,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  videoTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 30,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  progressContainer: {
    gap: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  volumeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  volumeText: {
    color: '#fff',
    fontSize: 13,
  },
  connectionStatus: {
    gap: 8,
    marginTop: 20,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
    width: '100%',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
});