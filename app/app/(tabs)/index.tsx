import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator, Image, useWindowDimensions } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useSocket } from '@/contexts/SocketContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { api } from '@/contexts/AuthContext';
import VideosSection from '@/components/parent/VideosSection';
import VideoControlPanel from '@/components/parent/VideoControlPanel';
import { useVideoPlaylist } from '@/hooks/useVideoPlaylist';

interface Video {
  _id: string;
  title: string;
  description?: string;
  duration: number;
  thumbnailUrl?: string;
  url: string;
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

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const formattedSize = Math.round(bytes / Math.pow(1024, i) * 100) / 100;
  return `${formattedSize} ${sizes[i]}`;
};

// Simplified function - duration will be calculated on the server
const getVideoDuration = async (videoUri: string): Promise<number> => {
  // Return 0 for client-side, server will calculate actual duration
  return 0;
};

export default function HomeScreen() {
  const { user, logout, refreshProfile } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const { socket, reconnect } = useSocket();



  // State declarations
  const [videos, setVideos] = useState<Video[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [childConnected, setChildConnected] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  
  // Video playlist hook
  const {
    currentVideo,
    playbackStatus,
    volume,
    canControl,
    hasPrevious,
    hasNext,
    isFullscreen,
    isRepeat,
    playVideo,
    pauseVideo,
    resumeVideo,
    stopVideo,
    playNext,
    playPrevious,
    changeVolume,
    togglePlayPause,
    toggleFullscreen,
    toggleRepeat,
  } = useVideoPlaylist({
    videos,
    socket,
    isConnected,
    childConnected,
    onVideoChange: (video) => {
      console.log('🎵 Current video changed:', video?.title || 'None');
    },
  });

  // Fetch videos
  const fetchVideos = async () => {
    if (user?.role !== 'parent') return;
    try {
      setIsLoadingVideos(true);
      const response = await api.get('/videos');
      if (response.data.success) {
        setVideos(response.data.data.videos);
      }
    } catch (error: any) {
      console.error('Failed to fetch videos:', error);
      Alert.alert('Error', 'Failed to load videos');
    } finally {
      setIsLoadingVideos(false);
    }
  };

  // Delete video handler (called from VideosSection on parent dashboard)
  const handleDeleteVideo = async (videoId: string) => {
    try {
      const response = await api.delete(`/videos/${videoId}`);
      if (response.data.success) {
        // Refresh videos list after successful deletion
        await fetchVideos();
        return true;
      }
      Alert.alert('Delete Failed', response.data.message || 'Could not delete video');
      return false;
    } catch (error: any) {
      console.error('Delete video error:', error);
      Alert.alert('Delete Error', error.response?.data?.message || error.message || 'Failed to delete video');
      return false;
    }
  };

  const refreshChildStatus = () => {
    if (socket?.connected) {
      socket.emit('get_paired_status');
    }
  };

  // File picker
  const handleFileSelect = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ 
        type: 'video/*',
        copyToCacheDirectory: true
      });
      
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const file = res.assets[0];
        setSelectedFile(file);
        try {
          const duration = await getVideoDuration(file.uri);
          setVideoDuration(duration);
        } catch (error) {
          setVideoDuration(0);
        }
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick a file');
    }
  };

  // Video control wrapper for compatibility
  const handlePlayVideo = (video: Video) => {
    if (!childConnected || !isConnected) {
      Alert.alert('Connection Error', 'Child device is offline or connection unavailable.');
      return;
    }
    playVideo(video);
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => logout() }
    ]);
  };

  const handleUpload = async () => {
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

      const resp = await api.post('/videos/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 10 * 60 * 1000,
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
  };

  // Effects
  useEffect(() => {
    if (user?.role === 'child') {
      router.replace('/VideoPlayerScreen');
      return;
    }
    
    if (user?.role === 'parent') {
      fetchVideos();
    }
  }, [user]);

  useEffect(() => {
    if (!uploadModalVisible) {
      setVideoDuration(0);
    }
  }, [uploadModalVisible]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    setIsConnected(socket.connected);

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    const handleChildConnected = () => setChildConnected(true);
    const handleChildDisconnected = () => {
      setChildConnected(false);
      if (currentVideo) {
        stopVideo();
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('child_connected', handleChildConnected);
    socket.on('child_disconnected', handleChildDisconnected);

      // Child playback status is now handled by the useVideoPlaylist hook

      socket.on('paired_status', (data) => {
        console.log('📡 Received paired_status:', data);
        setChildConnected(data.isOnline);
      });

      socket.on('child_online', (data) => {
        console.log('📡 Child came online:', data);
        setChildConnected(true);
      });

      socket.on('child_offline', (data) => {
        console.log('📡 Child went offline:', data);
        setChildConnected(false);
      });

      socket.on('pairing_success', (data) => {
        console.log('🔗 Pairing success received:', data);
        setChildConnected(true);
        
        // Refresh user profile to get updated pairing info
        refreshProfile();
        
        // Reconnect socket with updated pairing information
        console.log('🔄 Parent reconnecting socket after pairing success');
        reconnect();
      });

      socket.emit('get_paired_status');

      return () => {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        socket.off('child_connected', handleChildConnected);
        socket.off('child_disconnected', handleChildDisconnected);
        socket.off('child_playback_status');
        socket.off('paired_status');
        socket.off('child_online');
        socket.off('child_offline');
        socket.off('pairing_success');
      };
  }, [socket, currentVideo]);

  // Don't render if child (will redirect)
  if (user?.role === 'child') {
    return null;
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      {/** Responsive header: stack on narrow screens */}
      <View style={[styles.header, (useWindowDimensions().width < 600) && { flexDirection: 'column', alignItems: 'flex-start' }]}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>Parent Dashboard</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Welcome, {user?.name}
          </Text>
        </View>
  <View style={[styles.headerButtons, (useWindowDimensions().width < 600) && { marginTop: 12 }] }>
          <View style={styles.connectionStatus}>
            <View style={styles.statusIcon}>
              <Ionicons 
                name={isConnected ? 'wifi' : 'wifi-outline'} 
                size={20} 
                color={isConnected ? theme.success : theme.error} 
              />
            </View>
            <View style={styles.statusIcon}>
              <Ionicons 
                name={childConnected ? 'phone-portrait' : 'phone-portrait-outline'} 
                size={20} 
                color={childConnected ? theme.success : theme.error} 
              />
            </View>
            <TouchableOpacity onPress={refreshChildStatus} style={styles.refreshButton}>
              <Ionicons 
                name="refresh" 
                size={16} 
                color={theme.textSecondary} 
              />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={toggleTheme} style={styles.themeButton}>
            <Ionicons name={isDark ? 'sunny' : 'moon'} size={24} color={theme.text} />
          </TouchableOpacity>
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
          <Ionicons name="warning" size={20} color="#fff" />
          <Text style={styles.connectionBannerText}>
            {!isConnected 
              ? 'Socket disconnected - Controls unavailable'
              : 'Child device offline - Playback unavailable'
            }
          </Text>
        </View>
      )}

      {/* Video Control Panel */}
      {currentVideo && (
        <VideoControlPanel
          currentVideo={currentVideo}
          videos={videos}
          isConnected={isConnected}
          childConnected={childConnected}
          playbackStatus={playbackStatus}
          volume={volume}
          onTogglePlayPause={togglePlayPause}
          onStop={stopVideo}
          onNext={playNext}
          onPrevious={playPrevious}
          onVolumeChange={changeVolume}
          onToggleFullscreen={toggleFullscreen}
          isFullscreen={isFullscreen}
          onToggleRepeat={toggleRepeat}
          isRepeat={isRepeat}
          formatTime={formatTime}
          formatFileSize={formatFileSize}
        />
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

            <TouchableOpacity style={styles.filePicker} onPress={handleFileSelect}>
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
                onPress={handleUpload}
                disabled={!selectedFile || !uploadTitle.trim() || isUploading}
              >
                {isUploading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff' }}>Upload</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Videos Section */}
      <VideosSection
        videos={videos}
        isLoadingVideos={isLoadingVideos}
        childConnected={childConnected}
        currentlyPlaying={currentVideo}
        childPlaybackStatus={playbackStatus}
        onPlayVideo={handlePlayVideo}
        onDeleteVideo={handleDeleteVideo}
        formatTime={formatTime}
        formatFileSize={formatFileSize}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingVertical: 20 },
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  connectionStatus: { flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 8 },
  statusIcon: { position: 'relative', padding: 4 },
  refreshButton: { 
    padding: 4, 
    marginLeft: 4,
    borderRadius: 12,
    backgroundColor: 'transparent'
  },
  connectionBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, marginHorizontal: 20, borderRadius: 8, gap: 8 },
  connectionBannerText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: 'bold' },
  subtitle: { fontSize: 16, marginTop: 4 },
  themeButton: { padding: 8 },
  uploadButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', margin: 20, padding: 16, borderRadius: 12, gap: 8 },
  uploadText: { fontSize: 16, fontWeight: '600' },
  videosSection: { paddingHorizontal: 20, paddingBottom: 20 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  emptyState: { alignItems: 'center', padding: 40, borderRadius: 12, gap: 12 },
  emptyText: { fontSize: 18, fontWeight: '600' },
  emptySubtext: { fontSize: 14, textAlign: 'center' },
  videoCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, marginBottom: 12, gap: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  videoThumbnail: { width: 120, height: 80, borderRadius: 12, justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden' },
  thumbnailImage: { width: '100%', height: '100%', borderRadius: 12 },
  thumbnailPlaceholder: { width: '100%', height: '100%', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  playButtonOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12 },
  playIcon: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.8, shadowRadius: 4 },
  durationBadge: { position: 'absolute', bottom: 6, right: 6, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  durationText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  offlineOverlay: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 4, padding: 2 },
  videoInfo: { flex: 1 },
  videoTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  videoDescription: { fontSize: 14, marginBottom: 2, opacity: 0.8 },
  videoMeta: { fontSize: 13, marginBottom: 2 },
  videoDate: { fontSize: 12, marginTop: 2 },
  offlineStatus: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  offlineText: { fontSize: 12, fontWeight: '600' },
  playingStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  playingIndicator: { width: 8, height: 8, borderRadius: 4 },
  playingText: { fontSize: 12, fontWeight: '600' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: '90%', borderRadius: 12, padding: 16, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  filePicker: { padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ccc', marginBottom: 12, alignItems: 'center', backgroundColor: '#f5f5f5', minHeight: 50, justifyContent: 'center' },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 12 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  modalButton: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  controlPanel: { margin: 16, padding: 16, borderRadius: 12, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  controlTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  controlStatusRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: 12 },
  controlStatusItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  controlStatusText: { fontSize: 12, fontWeight: '500' },
  timeText: { fontSize: 14, fontWeight: '500' },
  playbackControls: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 20 },
  controlButton: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2 },
  volumeSection: { marginBottom: 16 },
  volumeLabel: { fontSize: 16, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  volumeControl: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 12 },
  sliderContainer: { flex: 1, height: 40, justifyContent: 'center' },
  slider: { height: 6, borderRadius: 3, position: 'relative' },
  sliderTrack: { width: '100%', height: '100%' },
  sliderFill: { height: '100%', borderRadius: 3, position: 'absolute', left: 0, top: 0 },
  sliderThumb: { width: 20, height: 20, borderRadius: 10, position: 'absolute', top: -7, marginLeft: -10, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3 },
  quickVolume: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 },
  volumeButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, minWidth: 50, alignItems: 'center' },
  volumeButtonText: { fontSize: 14, fontWeight: '600' },
  
  // Grid Layout Styles
  scrollContainer: {
    flexGrow: 1,
  },
  videosGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 20
  },
  videoGridCard: { 
    width: '48%', 
    marginBottom: 12,
  },
  videoGridThumbnail: { 
    width: '100%', 
    height: 180, 
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center', 
    position: 'relative', 
    overflow: 'hidden',
    elevation: 3, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.25, 
    shadowRadius: 6
  },
  gridThumbnailImage: { 
    width: '100%', 
    height: '100%', 
    borderRadius: 16 
  },
  gridThumbnailPlaceholder: { 
    width: '100%', 
    height: '100%', 
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  gridPlayButtonOverlay: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0,0,0,0.3)', 
    borderRadius: 16 
  },
  gridDurationBadge: { 
    position: 'absolute', 
    bottom: 8, 
    right: 8, 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 8 
  },
  gridDurationText: { 
    color: '#fff', 
    fontSize: 11, 
    fontWeight: '700' 
  },
  titleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  overlayTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 16,
  },
  gridOfflineOverlay: { 
    position: 'absolute', 
    top: 8, 
    right: 8, 
    backgroundColor: 'rgba(244, 67, 54, 0.9)', 
    borderRadius: 6, 
    padding: 4 
  },
  gridPlayingOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 6,
    padding: 4,
  },
  gridPlayingIndicator: { 
    width: 8, 
    height: 8, 
    borderRadius: 4 
  },
});