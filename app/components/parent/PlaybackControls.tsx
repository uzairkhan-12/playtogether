import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';

interface PlaybackControlsProps {
  isPlaying: boolean;
  canPlay: boolean;
  onTogglePlayPause: () => void;
  onStop: () => void;
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  onToggleRepeat?: () => void;
  isRepeat?: boolean;
}

const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  canPlay,
  onTogglePlayPause,
  onStop,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  onToggleFullscreen,
  isFullscreen = false,
  onToggleRepeat,
  isRepeat = false,
}) => {
  const { theme } = useTheme();

  const buttonStyle = (enabled: boolean) => [
    styles.controlButton,
    {
      backgroundColor: enabled && canPlay ? theme.primary : theme.textSecondary,
      opacity: enabled && canPlay ? 1 : 0.5,
    }
  ];

  return (
    <View style={styles.controlsContainer}>
      {/* Previous Button */}
      <TouchableOpacity
        style={buttonStyle(hasPrevious)}
        onPress={onPrevious}
        disabled={!canPlay || !hasPrevious}
      >
        <Ionicons name="play-skip-back" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Play/Pause Button */}
      <TouchableOpacity
        style={[buttonStyle(true), styles.mainButton]}
        onPress={onTogglePlayPause}
        disabled={!canPlay}
      >
        <Ionicons 
          name={isPlaying ? 'pause' : 'play'} 
          size={32} 
          color="#fff" 
        />
      </TouchableOpacity>

      {/* Stop Button */}
      <TouchableOpacity
        style={buttonStyle(true)}
        onPress={onStop}
        disabled={!canPlay}
      >
        <Ionicons name="stop" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Next Button */}
      <TouchableOpacity
        style={buttonStyle(hasNext)}
        onPress={onNext}
        disabled={!canPlay || !hasNext}
      >
        <Ionicons name="play-skip-forward" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Repeat Button */}
      {onToggleRepeat && (
        <TouchableOpacity
          style={[
            buttonStyle(true),
            isRepeat && { backgroundColor: theme.accent || theme.primary }
          ]}
          onPress={onToggleRepeat}
          disabled={!canPlay}
        >
          <Ionicons 
            name="repeat" 
            size={24} 
            color="#fff" 
          />
        </TouchableOpacity>
      )}

      {/* Fullscreen Button */}
      {onToggleFullscreen && (
        <TouchableOpacity
          style={buttonStyle(true)}
          onPress={onToggleFullscreen}
          disabled={!canPlay}
        >
          <Ionicons 
            name={isFullscreen ? "contract" : "expand"} 
            size={24} 
            color="#fff" 
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  mainButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
});

export default PlaybackControls;