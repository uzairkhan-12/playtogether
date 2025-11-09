import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';

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

interface VideosSectionProps {
  videos: Video[];
  isLoadingVideos: boolean;
  childConnected: boolean;
  currentlyPlaying: Video | null;
  childPlaybackStatus: {
    isPlaying: boolean;
    currentTime: number;
    volume: number;
    duration: number;
  };
  onPlayVideo: (video: Video) => void;
  formatTime: (seconds: number) => string;
}

const VideosSection: React.FC<VideosSectionProps> = ({
  videos,
  isLoadingVideos,
  childConnected,
  currentlyPlaying,
  childPlaybackStatus,
  onPlayVideo,
  formatTime,
}) => {
  const { theme } = useTheme();

  return (
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
        <ScrollView 
          horizontal={false}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.scrollContainer}
        >
          <View style={styles.videosGrid}>
            {videos.map((video) => (
              <TouchableOpacity
                key={video._id}
                style={[styles.videoGridCard, { 
                  opacity: childConnected ? 1 : 0.7
                }]}
                onPress={() => onPlayVideo(video)}
                disabled={!childConnected}
              >
                <View style={styles.videoGridThumbnail}>
                  {video.thumbnailUrl ? (
                    <Image 
                      source={{ 
                        uri: video.thumbnailUrl.replace('http://', 'https://'),
                        headers: { 'Accept': 'image/*' }
                      }} 
                      style={styles.gridThumbnailImage}
                      resizeMode="cover"
                      onError={(error) => {
                        console.log('Thumbnail load error:', error.nativeEvent.error);
                      }}
                    />
                  ) : (
                    <View style={[styles.gridThumbnailPlaceholder, { backgroundColor: theme.primary }]}>
                      <Ionicons name="videocam" size={32} color="#fff" />
                    </View>
                  )}
                  
                  {/* Play Button Overlay */}
                  <View style={styles.gridPlayButtonOverlay}>
                    <Ionicons 
                      name={currentlyPlaying?._id === video._id ? "pause-circle" : "play-circle"} 
                      size={40} 
                      color="#fff" 
                      style={styles.playIcon}
                    />
                  </View>
                  
                  {/* Duration Badge */}
                  <View style={[styles.gridDurationBadge, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
                    <Text style={styles.gridDurationText}>{formatTime(video.duration)}</Text>
                  </View>
                  
                  {/* Title Overlay */}
                  <View style={styles.titleOverlay}>
                    <Text style={styles.overlayTitle} numberOfLines={2}>
                      {video.title}
                    </Text>
                  </View>
                  
                  {/* Status Indicators */}
                  {!childConnected && (
                    <View style={styles.gridOfflineOverlay}>
                      <Ionicons name="wifi-outline" size={14} color="#fff" />
                    </View>
                  )}
                  
                  {currentlyPlaying?._id === video._id && childConnected && (
                    <View style={styles.gridPlayingOverlay}>
                      <View style={[styles.gridPlayingIndicator, { 
                        backgroundColor: childPlaybackStatus.isPlaying ? '#4CAF50' : '#FF9800' 
                      }]} />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  videosSection: { 
    paddingHorizontal: 20, 
    paddingBottom: 20 
  },
  sectionTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 16 
  },
  sectionHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  emptyState: { 
    alignItems: 'center', 
    padding: 40, 
    borderRadius: 12, 
    gap: 12 
  },
  emptyText: { 
    fontSize: 18, 
    fontWeight: '600' 
  },
  emptySubtext: { 
    fontSize: 14, 
    textAlign: 'center' 
  },
  
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
  playIcon: { 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.8, 
    shadowRadius: 4 
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

export default VideosSection;