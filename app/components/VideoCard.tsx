import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface VideoCardProps {
  video: { _id: string; title: string };
  isSelected?: boolean;
  onPlay: () => void;
}

export default function VideoCard({ video, isSelected, onPlay }: VideoCardProps) {
  return (
    <TouchableOpacity onPress={onPlay} style={[styles.card, isSelected && styles.selected]}>
      <View style={styles.iconWrapper}>
        <Ionicons name="play-circle" size={32} color={isSelected ? '#fff' : '#007AFF'} />
      </View>
      <Text style={[styles.title, { color: isSelected ? '#fff' : '#000' }]}>{video.title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    backgroundColor: '#f2f2f2', borderRadius: 10, marginHorizontal: 20, marginBottom: 10,
  },
  selected: { backgroundColor: '#007AFF' },
  iconWrapper: { marginRight: 10 },
  title: { fontSize: 16, fontWeight: '600' },
});
