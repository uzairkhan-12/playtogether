import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator, Image } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useSocket } from '@/contexts/SocketContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
// import * as VideoThumbnails from 'expo-video-thumbnails';
import { api } from '@/contexts/AuthContext';


interface Video {
  _id: string;
  title: string;
  description?: string;
  duration: number;
  thumbnailUrl?: string;
  cloudinaryUrl: string;
  uploadedAt: string;
  playCount: number;
  fileSize: number;
  format: string;
  uploadStatus: string;
  uploadedBy: {
    _id: string;
    name: string;
    email: string;
  };
}

// Utility function to format time
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Safe VideoThumbnails wrapper
const safeVideoThumbnails = {
  getThumbnailAsync: async (videoUri: string, options: any) => {
    try {
      const VideoThumbnails = await import('expo-video-thumbnails');
      return await VideoThumbnails.getThumbnailAsync(videoUri, options);
    } catch (error: any) {
      console.log('VideoThumbnails not available:', error?.message || 'Unknown error');
      return { uri: '', duration: 0 };
    }
  }
};

// Function to get video duration
const getVideoDuration = async (videoUri: string): Promise<number> => {
  try {
    const { duration }: any = await safeVideoThumbnails.getThumbnailAsync(videoUri, {
      time: 0,
    });
    console.log('Video duration:', duration);
    return duration || 0;
  } catch (error) {
    console.error('Error getting video duration:', error);
    // Fallback: Return 0 and let backend handle duration extraction
    return 0;
  }
};

// Function to generate thumbnail from video
const generateThumbnail = async (videoUri: string): Promise<string> => {
  try {
    const { uri } = await safeVideoThumbnails.getThumbnailAsync(videoUri, {
      time: 1000, // Capture at 1 second
      quality: 0.6, // Medium quality
    });
    console.log('Thumbnail generated:', uri);
    return uri;
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    return '';
  }
};

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const { socket } = useSocket();
  const [videos, setVideos] = useState<Video[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [childConnected, setChildConnected] = useState(false);
  
  // Upload modal state
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number>(0);

  // Video control state
  const [currentlyPlaying, setCurrentlyPlaying] = useState<Video | null>(null);
  const [childPlaybackStatus, setChildPlaybackStatus] = useState({
    isPlaying: false,
    currentTime: 0,
    volume: 100,
    duration: 0
  });
  const [volumeControl, setVolumeControl] = useState(100);
  const [showControls, setShowControls] = useState(false);

  // Fetch videos function
  const fetchVideos = async () => {
    if (user?.role !== 'parent') return;
    
    try {
      setIsLoadingVideos(true);
      const response = await api.get('/videos');
      if (response.data.success) {
        console.log('Fetched videos:', response.data.data.videos);
        // Debug thumbnail URLs
        response.data.data.videos.forEach((video: any, index: number) => {
          console.log(`Video ${index + 1} (${video.title}):`, {
            thumbnailUrl: video.thumbnailUrl,
            cloudinaryUrl: video.cloudinaryUrl,
            hasThumbnail: !!video.thumbnailUrl,
            httpsUrl: video.thumbnailUrl?.replace('http://', 'https://')
          });
        });
        setVideos(response.data.data.videos);
      }
    } catch (error: any) {
      console.error('Failed to fetch videos:', error);
      Alert.alert('Error', 'Failed to load videos');
    } finally {
      setIsLoadingVideos(false);
    }
  };

  // Fetch videos on component mount
  useEffect(() => {
    if (user?.role === 'parent') {
      fetchVideos();
    }
  }, [user]);

  // Handle file selection and extract duration/thumbnail
  const handleFileSelect = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ 
        type: 'video/*',
        copyToCacheDirectory: true
      });
      
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const file = res.assets[0];
        setSelectedFile(file);
        
        // Extract video duration
        try {
          const duration = await getVideoDuration(file.uri);
          setVideoDuration(duration);
          console.log('Video duration:', duration);
        } catch (error) {
          console.error('Error getting video duration:', error);
          setVideoDuration(0);
        }
        
        // Note: Thumbnail will be generated by the backend from the video
      }
    } catch (err) {
      console.error('DocumentPicker error', err);
      Alert.alert('Error', 'Failed to pick a file');
    }
  };

  // Reset upload state when modal closes
  useEffect(() => {
    if (!uploadModalVisible) {
      setVideoDuration(0);
    }
  }, [uploadModalVisible]);

  useEffect(() => {
    // Monitor socket connection and child status
    if (socket) {
      setIsConnected(socket.connected);
      
      const handleConnect = () => setIsConnected(true);
      const handleDisconnect = () => setIsConnected(false);
      
      // Listen for child connection status
      const handleChildConnected = () => {
        console.log('Child device connected');
        setChildConnected(true);
      };
      
      const handleChildDisconnected = () => {
        console.log('Child device disconnected');
        setChildConnected(false);
        // Stop any currently playing video when child disconnects
        if (currentlyPlaying) {
          setShowControls(false);
          setCurrentlyPlaying(null);
          setChildPlaybackStatus({
            isPlaying: false,
            currentTime: 0,
            volume: 100,
            duration: 0
          });
        }
      };

      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      socket.on('child_connected', handleChildConnected);
      socket.on('child_disconnected', handleChildDisconnected);

      // Listen for child playback status updates
      socket.on('child_playback_status', (data) => {
        setChildPlaybackStatus({
          isPlaying: data.isPlaying,
          currentTime: data.currentTime,
          volume: data.volume,
          duration: data.duration || 0
        });
      });

      // Listen for child status updates
      socket.on('child_status', (data) => {
        console.log('Child status update:', data);
      });

      // Listen for paired status response
      socket.on('paired_status', (data) => {
        console.log('Paired status received:', data);
        setChildConnected(data.isOnline);
      });

      // Check initial child connection status
      socket.emit('get_paired_status');

      return () => {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        socket.off('child_connected', handleChildConnected);
        socket.off('child_disconnected', handleChildDisconnected);
        socket.off('child_playback_status');
        socket.off('child_status');
        socket.off('paired_status');
      };
    }
  }, [socket, currentlyPlaying]);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: () => logout()
        }
      ]
    );
  };

  const playVideo = (video: Video) => {
    // Check if child is connected before playing
    if (!childConnected) {
      Alert.alert(
        'Child Offline',
        'Cannot play video. The child device is currently offline.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!isConnected) {
      Alert.alert(
        'Connection Error',
        'Cannot play video. Socket connection is not available.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (socket) {
      // Stop current video if playing
      if (currentlyPlaying) {
        socket.emit('video_stop', {
          videoId: currentlyPlaying._id
        });
      }

      // Play new video
      socket.emit('video_play', {
        videoId: video._id,
        currentTime: 0
      });
      
      setCurrentlyPlaying(video);
      setShowControls(true);
      setVolumeControl(100);
      // Show duration immediately in control panel
      setChildPlaybackStatus(prev => ({ ...prev, duration: video.duration, isPlaying: true }));
    }
  };

  // Video control functions with connection checks
  const pauseVideo = () => {
    if (!childConnected || !isConnected) {
      Alert.alert('Connection Error', 'Child device is offline. Cannot control playback.');
      return;
    }

    if (socket && currentlyPlaying) {
      socket.emit('video_pause', {
        videoId: currentlyPlaying._id,
        currentTime: childPlaybackStatus.currentTime
      });
    }
  };

  const resumeVideo = () => {
    if (!childConnected || !isConnected) {
      Alert.alert('Connection Error', 'Child device is offline. Cannot control playback.');
      return;
    }

    if (socket && currentlyPlaying) {
      socket.emit('video_play', {
        videoId: currentlyPlaying._id,
        currentTime: childPlaybackStatus.currentTime
      });
    }
  };

  const stopVideo = () => {
    if (socket && currentlyPlaying) {
      socket.emit('video_stop', {
        videoId: currentlyPlaying._id
      });
      setShowControls(false);
      setCurrentlyPlaying(null);
    }
  };

  const changeVolume = (volume: number) => {
    if (!childConnected || !isConnected) {
      Alert.alert('Connection Error', 'Child device is offline. Cannot adjust volume.');
      return;
    }

    setVolumeControl(volume);
    if (socket && currentlyPlaying) {
      socket.emit('video_volume', {
        videoId: currentlyPlaying._id,
        volume: Math.round(volume)
      });
    }
  };

  const seekTo = (seconds: number) => {
    if (!childConnected || !isConnected) {
      Alert.alert('Connection Error', 'Child device is offline. Cannot seek video.');
      return;
    }

    if (socket && currentlyPlaying) {
      socket.emit('video_seek', {
        videoId: currentlyPlaying._id,
        seekTime: seconds
      });
    }
  };

  // Auto-hide controls when child disconnects during playback
  useEffect(() => {
    if (!childConnected && showControls) {
      setShowControls(false);
      setCurrentlyPlaying(null);
      Alert.alert(
        'Child Disconnected',
        'The child device has gone offline. Playback controls have been disabled.',
        [{ text: 'OK' }]
      );
    }
  }, [childConnected, showControls]);

  // Redirect child users to video player screen
  if (user?.role === 'child') {
    router.replace('/VideoPlayerScreen');
    return null;
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>Parent Dashboard</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Welcome, {user?.name}
          </Text>
        </View>
        <View style={styles.headerButtons}>
          {/* Connection Status Icons */}
          <View style={styles.connectionStatus}>
            {/* Socket Connection Status */}
            <View style={styles.statusIcon}>
              <Ionicons 
                name={isConnected ? 'wifi' : 'wifi-outline'} 
                size={20} 
                color={isConnected ? theme.success : theme.error} 
              />
            </View>
            
            {/* Child Connection Status */}
            <View style={styles.statusIcon}>
              <Ionicons 
                name={childConnected ? 'phone-portrait' : 'phone-portrait-outline'} 
                size={20} 
                color={childConnected ? theme.success : theme.error} 
              />
            </View>
          </View>

          {/* Theme Toggle */}
          <TouchableOpacity onPress={toggleTheme} style={styles.themeButton}>
            <Ionicons 
              name={isDark ? 'sunny' : 'moon'} 
              size={24} 
              color={theme.text} 
            />
          </TouchableOpacity>

          {/* Logout */}
          <TouchableOpacity onPress={handleLogout} style={styles.themeButton}>
            <Ionicons name="log-out-outline" size={24} color={theme.error} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Connection Status Banner */}
      {(!isConnected || !childConnected) && (
        <View style={[styles.connectionBanner, { 
          backgroundColor: !isConnected ? theme.error : theme.warning 
        }]}>
          <Ionicons 
            name="warning" 
            size={20} 
            color="#fff" 
          />
          <Text style={styles.connectionBannerText}>
            {!isConnected 
              ? 'Socket disconnected - Controls unavailable'
              : 'Child device offline - Playback unavailable'
            }
          </Text>
        </View>
      )}

      {/* Video Control Panel */}
      {showControls && currentlyPlaying && (
        <View style={[styles.controlPanel, { 
          backgroundColor: theme.card,
          opacity: childConnected ? 1 : 0.6 
        }]}>
          <Text style={[styles.controlTitle, { color: theme.text }]}>
            Now Playing: {currentlyPlaying.title}
          </Text>
          
          {/* Connection Status in Control Panel */}
          <View style={styles.controlStatusRow}>
            <View style={styles.controlStatusItem}>
              <Ionicons 
                name="wifi" 
                size={16} 
                color={isConnected ? theme.success : theme.error} 
              />
              <Text style={[styles.controlStatusText, { color: theme.text }]}>
                Socket
              </Text>
            </View>
            <View style={styles.controlStatusItem}>
              <Ionicons 
                name="phone-portrait" 
                size={16} 
                color={childConnected ? theme.success : theme.error} 
              />
              <Text style={[styles.controlStatusText, { color: theme.text }]}>
                Child
              </Text>
            </View>
            <View style={styles.controlStatusItem}>
              <Ionicons 
                name={childPlaybackStatus.isPlaying ? 'play' : 'pause'} 
                size={16} 
                color={childConnected && childPlaybackStatus.isPlaying ? theme.success : theme.warning} 
              />
              <Text style={[styles.controlStatusText, { color: theme.text }]}>
                {childConnected ? (childPlaybackStatus.isPlaying ? 'Playing' : 'Paused') : 'Offline'}
              </Text>
            </View>
          </View>

          {/* Time Display */}
          <Text style={[styles.timeText, { color: theme.text, textAlign: 'center', marginVertical: 8 }]}>
            {formatTime(childPlaybackStatus.currentTime)} / {formatTime(childPlaybackStatus.duration)}
          </Text>

          {/* Playback Controls */}
          <View style={styles.playbackControls}>
            <TouchableOpacity
              style={[
                styles.controlButton, 
                { 
                  backgroundColor: childConnected ? theme.primary : theme.textSecondary,
                  opacity: childConnected ? 1 : 0.5
                }
              ]}
              onPress={childPlaybackStatus.isPlaying ? pauseVideo : resumeVideo}
              disabled={!childConnected}
            >
              <Ionicons 
                name={childPlaybackStatus.isPlaying ? 'pause' : 'play'} 
                size={24} 
                color="#fff" 
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.controlButton, 
                { 
                  backgroundColor: theme.error,
                  opacity: childConnected ? 1 : 0.5
                }
              ]}
              onPress={stopVideo}
              disabled={!childConnected}
            >
              <Ionicons name="stop" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Volume Control */}
          <View style={styles.volumeSection}>
            <Text style={[styles.volumeLabel, { color: theme.text }]}>
              Volume: {Math.round(volumeControl)}%
              {!childConnected && " (Offline)"}
            </Text>
            <View style={styles.volumeControl}>
              <Ionicons name="volume-low" size={20} color={theme.text} />
              <View style={styles.sliderContainer}>
                <View 
                  style={[styles.slider, { 
                    backgroundColor: theme.border,
                    opacity: childConnected ? 1 : 0.5
                  }]}
                >
                  <TouchableOpacity
                    style={styles.sliderTrack}
                    onPress={(e) => {
                      if (!childConnected) {
                        Alert.alert('Offline', 'Child device is offline. Cannot adjust volume.');
                        return;
                      }
                      // Simple slider implementation
                      const newVolume = (e.nativeEvent.locationX / 200) * 100;
                      changeVolume(Math.max(0, Math.min(100, newVolume)));
                    }}
                    disabled={!childConnected}
                  >
                    <View 
                      style={[
                        styles.sliderFill, 
                        { 
                          backgroundColor: childConnected ? theme.primary : theme.textSecondary,
                          width: `${volumeControl}%`
                        }
                      ]} 
                    />
                    <View 
                      style={[
                        styles.sliderThumb, 
                        { 
                          backgroundColor: childConnected ? theme.primary : theme.textSecondary,
                          left: `${volumeControl}%`
                        }
                      ]} 
                    />
                  </TouchableOpacity>
                </View>
              </View>
              <Ionicons name="volume-high" size={20} color={theme.text} />
            </View>
          </View>

          {/* Quick Volume Buttons */}
          <View style={styles.quickVolume}>
            {[0, 25, 50, 75, 100].map((vol) => (
              <TouchableOpacity
                key={vol}
                style={[
                  styles.volumeButton, 
                  { 
                    backgroundColor: volumeControl === vol ? theme.primary : theme.border,
                    opacity: childConnected ? 1 : 0.5
                  }
                ]}
                onPress={() => {
                  if (!childConnected) {
                    Alert.alert('Offline', 'Child device is offline. Cannot adjust volume.');
                    return;
                  }
                  changeVolume(vol);
                }}
                disabled={!childConnected}
              >
                <Text style={[
                  styles.volumeButtonText, 
                  { color: volumeControl === vol ? '#fff' : theme.text }
                ]}>
                  {vol}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Upload Button */}
      {user?.role === 'parent' && (
        <TouchableOpacity 
          style={[styles.uploadButton, { backgroundColor: theme.primary }]}
          onPress={() => setUploadModalVisible(true)}
        >
          <Ionicons name="cloud-upload" size={24} color="#fff" />
          <Text style={[styles.uploadText, { color: '#fff' }]}>Upload New Video</Text>
        </TouchableOpacity>
      )}

      {/* Upload Modal */}
      <Modal
        visible={uploadModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setUploadModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}> 
            <Text style={[styles.modalTitle, { color: theme.text }]}>Upload Video</Text>

            <TouchableOpacity
              style={styles.filePicker}
              onPress={handleFileSelect}
            >
              <Text style={{ color: theme.text }}>
                {selectedFile ? 'Change video file' : 'Choose video file'}
              </Text>
            </TouchableOpacity>

            <TextInput
              placeholder="Title"
              placeholderTextColor={theme.textSecondary}
              value={uploadTitle}
              onChangeText={setUploadTitle}
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            />

            <TextInput
              placeholder="Description (optional)"
              placeholderTextColor={theme.textSecondary}
              value={uploadDescription}
              onChangeText={setUploadDescription}
              style={[styles.input, { color: theme.text, borderColor: theme.border, height: 80 }]}
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.error }]}
                onPress={() => {
                  setUploadModalVisible(false);
                  setSelectedFile(null);
                  setUploadTitle('');
                  setUploadDescription('');
                  setVideoDuration(0);
                }}
                disabled={isUploading}
              >
                <Text style={{ color: '#fff' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, { 
                  backgroundColor: theme.primary,
                  opacity: (!selectedFile || !uploadTitle.trim() || isUploading) ? 0.5 : 1
                }]}
                onPress={async () => {
                  if (!selectedFile) {
                    Alert.alert('No file', 'Please choose a video file to upload');
                    return;
                  }
                  if (!uploadTitle.trim()) {
                    Alert.alert('Missing title', 'Please enter a title for the video');
                    return;
                  }

                  setIsUploading(true);
                  try {
                    const formData = new FormData();
                    formData.append('video', {
                      uri: selectedFile.uri,
                      name: selectedFile.name || 'video.mp4',
                      type: (selectedFile as any).mimeType || 'video/mp4'
                    } as any);
                    formData.append('title', uploadTitle);
                    formData.append('description', uploadDescription || '');
                    formData.append('duration', videoDuration.toString());

                    // Note: Thumbnail is generated by the backend from the video

                    const resp = await api.post('/videos/upload', formData, {
                      headers: { 'Content-Type': 'multipart/form-data' },
                      timeout: 10 * 60 * 1000, // 10 minutes timeout
                      onUploadProgress: (progressEvent) => {
                        if (progressEvent.total) {
                          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                          console.log(`Upload progress: ${percentCompleted}%`);
                        }
                      }
                    });

                    if (resp.data.success) {
                      Alert.alert('Uploaded', 'Video uploaded successfully');
                      setUploadModalVisible(false);
                      setSelectedFile(null);
                      setUploadTitle('');
                      setUploadDescription('');
                      setVideoDuration(0);
                      // Refresh videos list
                      fetchVideos();
                    } else {
                      Alert.alert('Upload failed', resp.data.message || 'Unknown error');
                    }
                  } catch (err: any) {
                    console.error('Upload error', err);
                    
                    let errorMessage = 'Upload failed';
                    if (err.code === 'ECONNABORTED' || err.code === 'TIMEOUT') {
                      errorMessage = 'Upload timed out. Please check your connection and try again.';
                    } else if (err.response?.status === 408) {
                      errorMessage = 'Upload was interrupted. Please try again with a stable connection.';
                    } else if (err.response?.status === 413) {
                      errorMessage = 'File too large. Please compress your video or use a smaller file.';
                    } else if (err.response?.data?.message) {
                      errorMessage = err.response.data.message;
                    } else if (err.message) {
                      errorMessage = err.message;
                    }
                    
                    Alert.alert('Upload Error', errorMessage);
                  } finally {
                    setIsUploading(false);
                  }
                }}
                disabled={!selectedFile || !uploadTitle.trim() || isUploading}
              >
                {isUploading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff' }}>Upload</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Videos List */}
      <View style={styles.videosSection}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Your Videos</Text>
          {isLoadingVideos && <ActivityIndicator color={theme.primary} />}
        </View>
        
        {videos.length === 0 && !isLoadingVideos ? (
          <View style={[styles.emptyState, { backgroundColor: theme.card }]}>
            <Ionicons name="videocam-off" size={48} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No videos uploaded yet
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
              Upload your first video to get started
            </Text>
          </View>
        ) : (
          videos.map((video) => (
            <TouchableOpacity
              key={video._id}
              style={[
                styles.videoCard, 
                { 
                  backgroundColor: theme.card,
                  opacity: childConnected ? 1 : 0.7
                }
              ]}
              onPress={() => playVideo(video)}
              disabled={!childConnected}
            >
              {/* Video Thumbnail */}
              <View style={styles.videoThumbnail}>
                {video.thumbnailUrl ? (
                  <Image 
                    source={{ 
                      uri: (() => {
                        let url = video.thumbnailUrl.replace('http://', 'https://');
                        // Add .jpg extension if not present to help React Native recognize the format
                        if (!url.includes('.jpg') && !url.includes('.png') && !url.includes('.jpeg')) {
                          url += '.jpg';
                        }
                        return url;
                      })(),
                      headers: {
                        'Accept': 'image/*',
                      }
                    }} 
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                    onError={(error) => {
                      console.error(`❌ Failed to load thumbnail for ${video.title}:`, error.nativeEvent.error);
                      console.log('📷 Original thumbnail URL:', video.thumbnailUrl);
                      const httpsUrl = video.thumbnailUrl?.replace('http://', 'https://') || '';
                      console.log('🔧 Converted thumbnail URL:', httpsUrl);
                    }}
                    onLoad={() => {
                      console.log(`✅ Successfully loaded thumbnail for ${video.title}`);
                    }}
                    onLoadStart={() => {
                      console.log(`🔄 Started loading thumbnail for ${video.title}`);
                    }}
                  />
                ) : (
                  <View style={[styles.thumbnailPlaceholder, { backgroundColor: theme.primary }]}>
                    <Ionicons name="videocam" size={32} color="#fff" />
                  </View>
                )}
                
                {/* Play Button Overlay */}
                <View style={styles.playButtonOverlay}>
                  <Ionicons 
                    name={currentlyPlaying?._id === video._id ? "pause-circle" : "play-circle"} 
                    size={36} 
                    color="#fff" 
                    style={styles.playIcon}
                  />
                </View>
                
                {/* Duration Badge */}
                <View style={[styles.durationBadge, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
                  <Text style={styles.durationText}>{formatTime(video.duration)}</Text>
                </View>
                
                {!childConnected && (
                  <View style={styles.offlineOverlay}>
                    <Ionicons name="wifi-outline" size={16} color="#fff" />
                  </View>
                )}
              </View>
              
              <View style={styles.videoInfo}>
                <Text style={[styles.videoTitle, { color: theme.text }]} numberOfLines={2}>
                  {video.title}
                </Text>
                {video.description && (
                  <Text style={[styles.videoDescription, { color: theme.textSecondary }]} numberOfLines={1}>
                    {video.description}
                  </Text>
                )}
                <Text style={[styles.videoMeta, { color: theme.textSecondary }]}>
                  {video.playCount} plays • {(video.fileSize / (1024 * 1024)).toFixed(1)} MB
                </Text>
                <Text style={[styles.videoDate, { color: theme.textSecondary }]}>
                  {new Date(video.uploadedAt).toLocaleDateString()}
                </Text>
                
                {/* Connection Status */}
                {!childConnected && (
                  <View style={styles.offlineStatus}>
                    <Ionicons name="wifi-outline" size={12} color={theme.error} />
                    <Text style={[styles.offlineText, { color: theme.error }]}>
                      Child offline
                    </Text>
                  </View>
                )}
                
                {/* Playing Status */}
                {currentlyPlaying?._id === video._id && childConnected && (
                  <View style={styles.playingStatus}>
                    <View style={[
                      styles.playingIndicator, 
                      { backgroundColor: childPlaybackStatus.isPlaying ? theme.success : theme.warning }
                    ]} />
                    <Text style={[styles.playingText, { 
                      color: childPlaybackStatus.isPlaying ? theme.success : theme.warning 
                    }]}>
                      {childPlaybackStatus.isPlaying ? 'Playing' : 'Paused'}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 8,
  },
  statusIcon: {
    position: 'relative',
    padding: 4,
  },
  connectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  connectionBannerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  themeButton: {
    padding: 8,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '600',
  },
  videosSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 12,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  videoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    gap: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  videoThumbnail: {
    width: 120,
    height: 80,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
  },
  playIcon: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  durationText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  offlineOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 4,
    padding: 2,
  },
  videoInfo: {
    flex: 1,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  videoDescription: {
    fontSize: 14,
    marginBottom: 2,
    opacity: 0.8,
  },
  videoMeta: {
    fontSize: 13,
    marginBottom: 2,
  },
  videoDate: {
    fontSize: 12,
    marginTop: 2,
  },
  offlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  offlineText: {
    fontSize: 12,
    fontWeight: '600',
  },
  playingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  playingIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  playingText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  /* Upload modal styles */
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  modalContent: {
    width: '90%',
    borderRadius: 12,
    padding: 16,
    maxHeight: '80%'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  videoPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    gap: 12,
  },
  thumbnailPreview: {
    width: 60,
    height: 45,
    borderRadius: 6,
  },
  videoInfoPreview: {
    flex: 1,
  },
  videoTitlePreview: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  videoDurationPreview: {
    fontSize: 14,
  },
  filePicker: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 12,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    minHeight: 50,
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  // Video Control Panel Styles
  controlPanel: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  controlTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  controlStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 12,
  },
  controlStatusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  controlStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  timeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  playbackControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 20,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  volumeSection: {
    marginBottom: 16,
  },
  volumeLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  volumeControl: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 12,
  },
  sliderContainer: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
  },
  slider: {
    height: 6,
    borderRadius: 3,
    position: 'relative',
  },
  sliderTrack: {
    width: '100%',
    height: '100%',
  },
  sliderFill: {
    height: '100%',
    borderRadius: 3,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  sliderThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: 'absolute',
    top: -7,
    marginLeft: -10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  quickVolume: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  volumeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    minWidth: 50,
    alignItems: 'center',
  },
  volumeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
