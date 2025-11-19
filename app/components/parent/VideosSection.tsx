import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  StyleSheet,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';

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
  onDeleteVideo?: (videoId: string) => Promise<boolean>;
  formatTime: (seconds: number) => string;
  formatFileSize: (bytes: number) => string;
}

const VideosSection: React.FC<VideosSectionProps> = ({
  videos,
  isLoadingVideos,
  childConnected,
  currentlyPlaying,
  childPlaybackStatus,
  onPlayVideo,
  onDeleteVideo,
  formatTime,
  formatFileSize,
}) => {
  const { theme } = useTheme();
  const { serverBaseUrl } = useAuth();
  const [selectedForDelete, setSelectedForDelete] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState<string | null>(null);

  // Helper function to construct full thumbnail URL
  const getFullThumbnailUrl = (relativePath: string): string => {
    if (!relativePath) return '';
    
    // If already a full URL, return as is
    if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
      return relativePath;
    }
    
    // If relative path, prepend server base URL
    if (relativePath.startsWith('/')) {
      return `${serverBaseUrl}${relativePath}`;
    }
    
    // If just filename, assume it's in uploads/thumbnails
    return `${serverBaseUrl}/uploads/thumbnails/${relativePath}`;
  };

  const { width } = useWindowDimensions();

  // Responsive grid calculation
  const horizontalPadding = 40; // matches parent paddingHorizontal: 20
  const gap = 12;
  let numColumns = 1;
  if (width >= 1100) numColumns = 4;
  else if (width >= 800) numColumns = 3;
  else if (width >= 600) numColumns = 2;
  else numColumns = 1;

  const cardWidth = Math.floor((width - horizontalPadding - (numColumns - 1) * gap) / numColumns);
  const thumbnailHeight = Math.round(cardWidth * 0.56);

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
          <View style={[styles.videosGrid, { justifyContent: 'flex-start' }] }>
            {videos.map((video, idx) => (
              <TouchableOpacity
                key={video._id}
                style={[
                  styles.videoGridCard,
                  { 
                    width: cardWidth,
                    marginRight: (idx % numColumns) === (numColumns - 1) ? 0 : gap,
                    marginBottom: 12,
                    opacity: childConnected ? 1 : 0.7
                  }
                ]}
                onPress={() => onPlayVideo(video)}
                onLongPress={() => {
                  // Show delete button on long press
                  setSelectedForDelete(prev => (prev === video._id ? null : video._id));
                }}
                disabled={!childConnected}
              >
                <View style={[styles.videoGridThumbnail, { height: thumbnailHeight }] }>
                  {video.thumbnailUrl ? (
                    <Image 
                      source={{ 
                        uri: getFullThumbnailUrl(video.thumbnailUrl),
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
                  
                  {/* File Size Badge */}
                  <View style={[styles.gridFileSizeBadge, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
                    <Text style={styles.gridFileSizeText}>{formatFileSize(video.fileSize)}</Text>
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
                  {/* Delete overlay: shown after long-press */}
                  {selectedForDelete === video._id && (
                    <View style={styles.deleteOverlay}>
                      {isDeleting === video._id ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <TouchableOpacity
                          onPress={() => {
                            // Confirmation
                            Alert.alert(
                              'Delete Video',
                              'Are you sure you want to delete this video? This action cannot be undone.',
                              [
                                { text: 'Cancel', style: 'cancel', onPress: () => setSelectedForDelete(null) },
                                { text: 'Delete', style: 'destructive', onPress: async () => {
                                  if (!onDeleteVideo) return;
                                  setIsDeleting(video._id);
                                  const ok = await onDeleteVideo(video._id);
                                  setIsDeleting(null);
                                  setSelectedForDelete(null);
                                  if (!ok) {
                                    // Optionally show error handled by parent
                                  }
                                }}
                              ]
                            );
                          }}
                          style={styles.deleteButton}
                        >
                          <Text style={styles.deleteButtonText}>Delete</Text>
                        </TouchableOpacity>
                      )}
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
  gridFileSizeBadge: { 
    position: 'absolute', 
    top: 8, 
    left: 8, 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 8 
  },
  gridFileSizeText: { 
    color: '#fff', 
    fontSize: 10, 
    fontWeight: '600' 
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
  // Delete overlay/button styles
  deleteOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 6,
    borderRadius: 8,
  },
  deleteButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#E53935',
    borderRadius: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
});

export default VideosSection;