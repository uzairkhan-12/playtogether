import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';

interface PlaybackStatusProps {
  isConnected: boolean;
  childConnected: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  formatTime: (seconds: number) => string;
}

const PlaybackStatus: React.FC<PlaybackStatusProps> = ({
  isConnected,
  childConnected,
  isPlaying,
  currentTime,
  duration,
  formatTime,
}) => {
  const { theme } = useTheme();

  const getPlaybackStatus = () => {
    // Video is considered ended if:
    // 1. currentTime is within 2 seconds of duration AND not playing, OR
    // 2. currentTime >= duration (exact end)
    const isNearEnd = duration > 0 && currentTime >= duration - 2;
    const isAtEnd = duration > 0 && currentTime >= duration;
    const hasEnded = isAtEnd || (isNearEnd && !isPlaying);
    
    if (hasEnded) {
      return '⏹️ Ended';
    }
    return isPlaying ? '▶️ Playing' : '⏸️ Paused';
  };

  const getStatusIcon = () => {
    const isNearEnd = duration > 0 && currentTime >= duration - 2;
    const isAtEnd = duration > 0 && currentTime >= duration;
    const hasEnded = isAtEnd || (isNearEnd && !isPlaying);
    
    if (hasEnded) {
      return 'stop';
    }
    return isPlaying ? 'play' : 'pause';
  };

  const getStatusColor = () => {
    if (!childConnected) return theme.error;
    
    const isNearEnd = duration > 0 && currentTime >= duration - 2;
    const isAtEnd = duration > 0 && currentTime >= duration;
    const hasEnded = isAtEnd || (isNearEnd && !isPlaying);
    
    if (hasEnded) {
      return theme.textSecondary;
    }
    return isPlaying ? theme.success : theme.warning;
  };

  return (
    <View style={styles.statusContainer}>
      {/* Connection Status Row */}
      <View style={styles.statusRow}>
        <View style={styles.statusItem}>
          <Ionicons 
            name="wifi" 
            size={16} 
            color={isConnected ? theme.success : theme.error} 
          />
          <Text style={[styles.statusText, { color: theme.text }]}>Socket</Text>
        </View>
        <View style={styles.statusItem}>
          <Ionicons 
            name="phone-portrait" 
            size={16} 
            color={childConnected ? theme.success : theme.error} 
          />
          <Text style={[styles.statusText, { color: theme.text }]}>Child</Text>
        </View>
        <View style={styles.statusItem}>
          <Ionicons 
            name={getStatusIcon()} 
            size={16} 
            color={getStatusColor()} 
          />
          <Text style={[styles.statusText, { color: theme.text }]}>
            {childConnected ? getPlaybackStatus() : 'Offline'}
          </Text>
        </View>
      </View>

      {/* Time Display */}
      <Text style={[styles.timeText, { color: theme.text }]}>
        {formatTime(currentTime)} / {formatTime(duration)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  statusContainer: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 8,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  timeText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default PlaybackStatus;