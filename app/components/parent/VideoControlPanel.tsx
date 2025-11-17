import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import PlaybackControls from './PlaybackControls';
import VolumeControl from './VolumeControl';
import PlaybackStatus from './PlaybackStatus';

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

interface VideoControlPanelProps {
  currentVideo: Video;
  videos: Video[];
  isConnected: boolean;
  childConnected: boolean;
  playbackStatus: {
    isPlaying: boolean;
    currentTime: number;
    volume: number;
    duration: number;
  };
  volume: number;
  onTogglePlayPause: () => void;
  onStop: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onVolumeChange: (volume: number) => void;
  formatTime: (seconds: number) => string;
  formatFileSize: (bytes: number) => string;
}

const VideoControlPanel: React.FC<VideoControlPanelProps> = ({
  currentVideo,
  videos,
  isConnected,
  childConnected,
  playbackStatus,
  volume,
  onTogglePlayPause,
  onStop,
  onNext,
  onPrevious,
  onVolumeChange,
  formatTime,
  formatFileSize,
}) => {
  const { theme } = useTheme();

  const canControl = isConnected && childConnected;
  const currentIndex = videos.findIndex(video => video._id === currentVideo._id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < videos.length - 1;

  return (
    <View style={[styles.controlPanel, { 
      backgroundColor: theme.card,
      opacity: canControl ? 1 : 0.6 
    }]}>
      {/* Header */}
      <Text style={[styles.controlTitle, { color: theme.text }]}>
        Now Playing: {currentVideo.title}
      </Text>
      
      {/* Video Info */}
      <View style={styles.videoInfo}>
        <Text style={[styles.videoInfoText, { color: theme.textSecondary }]}>
          Duration: {formatTime(currentVideo.duration)} • Size: {formatFileSize(currentVideo.fileSize)} • Format: {currentVideo.format.toUpperCase()}
        </Text>
        <Text style={[styles.videoInfoText, { color: theme.textSecondary }]}>
          Uploaded by: {currentVideo.uploadedBy.name} • {currentVideo.playCount} plays
        </Text>
      </View>
      
      {/* Playback Status */}
      <PlaybackStatus
        isConnected={isConnected}
        childConnected={childConnected}
        isPlaying={playbackStatus.isPlaying}
        currentTime={playbackStatus.currentTime}
        duration={playbackStatus.duration}
        formatTime={formatTime}
      />

      {/* Playback Controls */}
      <PlaybackControls
        isPlaying={playbackStatus.isPlaying}
        canPlay={canControl}
        onTogglePlayPause={onTogglePlayPause}
        onStop={onStop}
        onPrevious={onPrevious}
        onNext={onNext}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
      />

      {/* Volume Control */}
      <VolumeControl
        volume={volume}
        canControl={canControl}
        onVolumeChange={onVolumeChange}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  controlPanel: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  controlTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  videoInfo: {
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  videoInfoText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
});

export default VideoControlPanel;