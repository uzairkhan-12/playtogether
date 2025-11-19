import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, useWindowDimensions } from 'react-native';
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

  const { width } = useWindowDimensions();

  // Better mobile-first responsive sizing
  const isMobile = width < 768;
  const isSmallMobile = width < 400;
  
  // Calculate button count for spacing
  const buttonCount = 4 + (onToggleRepeat ? 1 : 0) + (onToggleFullscreen ? 1 : 0);
  
  // Responsive button sizing with better mobile optimization
  let buttonSize: number;
  let mainButtonSize: number;
  let iconSize: number;
  let spacing: number;
  
  if (isSmallMobile) {
    buttonSize = 44; // Minimum touch target size
    mainButtonSize = 56;
    iconSize = 20;
    spacing = 4;
  } else if (isMobile) {
    buttonSize = 48;
    mainButtonSize = 64;
    iconSize = 24;
    spacing = 6;
  } else {
    buttonSize = Math.round(Math.max(48, Math.min(72, width * 0.08)));
    mainButtonSize = Math.round(buttonSize * 1.3);
    iconSize = Math.round(buttonSize * 0.5);
    spacing = 12;
  }
  
  const mainIconSize = Math.round(mainButtonSize * 0.5);

  const buttonStyle = (enabled: boolean) => [
    styles.controlButton,
    {
      width: buttonSize,
      height: buttonSize,
      borderRadius: Math.round(buttonSize / 2),
      backgroundColor: enabled && canPlay ? theme.primary : theme.textSecondary,
      opacity: enabled && canPlay ? 1 : 0.5,
      marginHorizontal: spacing / 2,
    }
  ];

  // On very small screens, consider wrapping to two rows
  const shouldWrap = isSmallMobile && buttonCount > 5;

  return (
    <View style={[styles.controlsContainer, shouldWrap && styles.wrappedContainer]}>
      {/* Primary controls row */}
      <View style={shouldWrap ? styles.primaryRow : styles.singleRow}>
        {/* Previous Button */}
        <TouchableOpacity
          style={buttonStyle(hasPrevious)}
          onPress={onPrevious}
          disabled={!canPlay || !hasPrevious}
        >
          <Ionicons name="play-skip-back" size={iconSize} color="#fff" />
        </TouchableOpacity>

        {/* Play/Pause Button */}
        <TouchableOpacity
          style={[buttonStyle(true), { 
            width: mainButtonSize, 
            height: mainButtonSize, 
            borderRadius: Math.round(mainButtonSize / 2),
            marginHorizontal: spacing
          }]}
          onPress={onTogglePlayPause}
          disabled={!canPlay}
        >
          <Ionicons 
            name={isPlaying ? 'pause' : 'play'} 
            size={mainIconSize} 
            color="#fff" 
          />
        </TouchableOpacity>

        {/* Stop Button */}
        <TouchableOpacity
          style={buttonStyle(true)}
          onPress={onStop}
          disabled={!canPlay}
        >
          <Ionicons name="stop" size={iconSize} color="#fff" />
        </TouchableOpacity>

        {/* Next Button */}
        <TouchableOpacity
          style={buttonStyle(hasNext)}
          onPress={onNext}
          disabled={!canPlay || !hasNext}
        >
          <Ionicons name="play-skip-forward" size={iconSize} color="#fff" />
        </TouchableOpacity>

        {/* On single row, show repeat and fullscreen */}
        {!shouldWrap && onToggleRepeat && (
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
              size={iconSize} 
              color="#fff" 
            />
          </TouchableOpacity>
        )}

        {!shouldWrap && onToggleFullscreen && (
          <TouchableOpacity
            style={buttonStyle(true)}
            onPress={onToggleFullscreen}
            disabled={!canPlay}
          >
            <Ionicons 
              name={isFullscreen ? "contract" : "expand"} 
              size={iconSize} 
              color="#fff" 
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Secondary controls row (only when wrapped) */}
      {shouldWrap && (
        <View style={styles.secondaryRow}>
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
                size={iconSize} 
                color="#fff" 
              />
            </TouchableOpacity>
          )}

          {onToggleFullscreen && (
            <TouchableOpacity
              style={buttonStyle(true)}
              onPress={onToggleFullscreen}
              disabled={!canPlay}
            >
              <Ionicons 
                name={isFullscreen ? "contract" : "expand"} 
                size={iconSize} 
                color="#fff" 
              />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  controlsContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  wrappedContainer: {
    gap: 8,
  },
  singleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  secondaryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  controlButton: {
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});

export default PlaybackControls;