import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Slider } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PlayerControlsProps {
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSeek: (time: number) => void;
  onVolume: (volume: number) => void;
  currentTime: number;
  duration: number;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const PlayerControls: React.FC<PlayerControlsProps> = ({
  isPlaying,
  onPlay,
  onPause,
  onStop,
  onSeek,
  onVolume,
  currentTime,
  duration,
}) => {
  return (
    <View style={styles.container}>
      {/* Seek Bar */}
      <View style={styles.seekContainer}>
        <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
        {/* <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={duration || 1}
          value={currentTime}
          minimumTrackTintColor="#1DB954"
          maximumTrackTintColor="#999"
          thumbTintColor="#fff"
          onSlidingComplete={onSeek}
        /> */}
        <Text style={styles.timeText}>{formatTime(duration)}</Text>
      </View>

      {/* Play Controls */}
      <View style={styles.controls}>
        <TouchableOpacity onPress={onStop}>
          <Ionicons name="stop" size={28} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity onPress={isPlaying ? onPause : onPlay}>
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={40} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Volume Control */}
      <View style={styles.volumeContainer}>
        <Ionicons name="volume-low" size={20} color="#fff" />
        <Slider
          style={styles.volumeSlider}
          minimumValue={0}
          maximumValue={100}
          minimumTrackTintColor="#1DB954"
          maximumTrackTintColor="#999"
          thumbTintColor="#fff"
          onSlidingComplete={onVolume}
        />
        <Ionicons name="volume-high" size={20} color="#fff" />
      </View>
    </View>
  );
};

export default PlayerControls;

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  seekContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeText: {
    color: '#fff',
    fontSize: 12,
    width: 40,
    textAlign: 'center',
  },
  slider: {
    flex: 1,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    marginBottom: 8,
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  volumeSlider: {
    flex: 1,
    marginHorizontal: 8,
  },
});
