import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';

interface VolumeControlProps {
  volume: number;
  canControl: boolean;
  onVolumeChange: (volume: number) => void;
}

const VolumeControl: React.FC<VolumeControlProps> = ({
  volume,
  canControl,
  onVolumeChange,
}) => {
  const { theme } = useTheme();

  const quickVolumeButtons = [0, 25, 50, 75, 100];

  return (
    <View style={styles.volumeSection}>
      <Text style={[styles.volumeLabel, { color: theme.text }]}>
        Volume: {Math.round(volume)}%{!canControl && " (Offline)"}
      </Text>
      
      {/* Volume Slider */}
      <View style={styles.volumeControl}>
        <Ionicons name="volume-low" size={20} color={theme.text} />
        <View style={styles.sliderContainer}>
          <View style={[styles.slider, { 
            backgroundColor: theme.border,
            opacity: canControl ? 1 : 0.5
          }]}>
            <TouchableOpacity
              style={styles.sliderTrack}
              onPress={(e) => {
                if (!canControl) return;
                const newVolume = (e.nativeEvent.locationX / 200) * 100;
                onVolumeChange(Math.max(0, Math.min(100, newVolume)));
              }}
              disabled={!canControl}
            >
              <View 
                style={[styles.sliderFill, { 
                  backgroundColor: canControl ? theme.primary : theme.textSecondary,
                  width: `${volume}%`
                }]} 
              />
              <View 
                style={[styles.sliderThumb, { 
                  backgroundColor: canControl ? theme.primary : theme.textSecondary,
                  left: `${volume}%`
                }]} 
              />
            </TouchableOpacity>
          </View>
        </View>
        <Ionicons name="volume-high" size={20} color={theme.text} />
      </View>

      {/* Quick Volume Buttons */}
      <View style={styles.quickVolume}>
        {quickVolumeButtons.map((vol) => (
          <TouchableOpacity
            key={vol}
            style={[styles.volumeButton, { 
              backgroundColor: volume === vol ? theme.primary : theme.border,
              opacity: canControl ? 1 : 0.5
            }]}
            onPress={() => onVolumeChange(vol)}
            disabled={!canControl}
          >
            <Text style={[styles.volumeButtonText, { 
              color: volume === vol ? '#fff' : theme.text 
            }]}>
              {vol}%
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  volumeSection: {
    paddingVertical: 16,
  },
  volumeLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
    textAlign: 'center',
  },
  volumeControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sliderContainer: {
    flex: 1,
  },
  slider: {
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  sliderTrack: {
    height: 20,
    width: 200,
    borderRadius: 10,
    position: 'relative',
  },
  sliderFill: {
    height: '100%',
    borderRadius: 10,
  },
  sliderThumb: {
    position: 'absolute',
    top: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    marginLeft: -12,
  },
  quickVolume: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  volumeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 50,
    alignItems: 'center',
  },
  volumeButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default VolumeControl;