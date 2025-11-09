import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface FamilySetupGuideProps {
  visible: boolean;
  onClose: () => void;
}

export default function FamilySetupGuide({ visible, onClose }: FamilySetupGuideProps) {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    container: {
      backgroundColor: theme.background,
      borderRadius: 20,
      padding: 24,
      margin: 20,
      maxHeight: '80%',
      width: '90%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
    },
    closeButton: {
      padding: 8,
      borderRadius: 16,
      backgroundColor: theme.surface,
    },
    content: {
      flex: 1,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 16,
      marginTop: 20,
    },
    deviceSection: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    deviceHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      gap: 12,
    },
    deviceIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    parentDevice: {
      backgroundColor: theme.primary + '20',
    },
    childDevice: {
      backgroundColor: '#4CAF50' + '20',
    },
    deviceTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    deviceSubtitle: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    stepsList: {
      marginTop: 8,
    },
    stepItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 8,
      gap: 8,
    },
    stepNumber: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 2,
    },
    stepNumberText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#fff',
    },
    stepText: {
      flex: 1,
      fontSize: 14,
      color: theme.text,
      lineHeight: 20,
    },
    tipContainer: {
      backgroundColor: theme.primary + '10',
      borderRadius: 12,
      padding: 16,
      marginTop: 16,
      borderLeftWidth: 4,
      borderLeftColor: theme.primary,
    },
    tipHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      gap: 8,
    },
    tipTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.primary,
    },
    tipText: {
      fontSize: 14,
      color: theme.text,
      lineHeight: 20,
    },
    gotItButton: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 20,
    },
    gotItButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
  });

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Family Setup Guide</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Setup Process</Text>

            {/* Parent Device Section */}
            <View style={styles.deviceSection}>
              <View style={styles.deviceHeader}>
                <View style={[styles.deviceIcon, styles.parentDevice]}>
                  <Ionicons name="person" size={20} color={theme.primary} />
                </View>
                <View>
                  <Text style={styles.deviceTitle}>Parent Device</Text>
                  <Text style={styles.deviceSubtitle}>Control & manage videos</Text>
                </View>
              </View>

              <View style={styles.stepsList}>
                <View style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                  <Text style={styles.stepText}>Download PlayTogether app</Text>
                </View>
                <View style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>2</Text>
                  </View>
                  <Text style={styles.stepText}>Create account with "Parent" role</Text>
                </View>
                <View style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>3</Text>
                  </View>
                  <Text style={styles.stepText}>Get your 6-digit pairing code</Text>
                </View>
                <View style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>4</Text>
                  </View>
                  <Text style={styles.stepText}>Share code with child's device</Text>
                </View>
              </View>
            </View>

            {/* Child Device Section */}
            <View style={styles.deviceSection}>
              <View style={styles.deviceHeader}>
                <View style={[styles.deviceIcon, styles.childDevice]}>
                  <Ionicons name="phone-portrait" size={20} color="#4CAF50" />
                </View>
                <View>
                  <Text style={styles.deviceTitle}>Child Device</Text>
                  <Text style={styles.deviceSubtitle}>Watch videos remotely</Text>
                </View>
              </View>

              <View style={styles.stepsList}>
                <View style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                  <Text style={styles.stepText}>Download PlayTogether app</Text>
                </View>
                <View style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>2</Text>
                  </View>
                  <Text style={styles.stepText}>Create account with "Child" role</Text>
                </View>
                <View style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>3</Text>
                  </View>
                  <Text style={styles.stepText}>Enter the pairing code from parent</Text>
                </View>
                <View style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>4</Text>
                  </View>
                  <Text style={styles.stepText}>Devices are now connected!</Text>
                </View>
              </View>
            </View>

            <View style={styles.tipContainer}>
              <View style={styles.tipHeader}>
                <Ionicons name="bulb" size={20} color={theme.primary} />
                <Text style={styles.tipTitle}>Pro Tips</Text>
              </View>
              <Text style={styles.tipText}>
                • Both devices need internet connection{'\n'}
                • Keep the pairing code private within your family{'\n'}
                • You can re-pair devices anytime from Settings{'\n'}
                • Parent can control multiple child devices
              </Text>
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.gotItButton} onPress={onClose}>
            <Text style={styles.gotItButtonText}>Got it!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}