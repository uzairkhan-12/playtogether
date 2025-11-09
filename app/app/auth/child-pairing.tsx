import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useSocket } from '@/contexts/SocketContext';
import { Ionicons } from '@expo/vector-icons';

export default function ChildPairingScreen() {
  const [pairingCode, setPairingCode] = useState('');
  const [loading, setLoading] = useState(false);

  const { pairWithParent } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const { socket, reconnect } = useSocket();
  const router = useRouter();

  const handlePair = async () => {
    if (!pairingCode.trim()) {
      Alert.alert('Error', 'Please enter a pairing code');
      return;
    }

    setLoading(true);
    try {
      const result = await pairWithParent(pairingCode.trim().toUpperCase());
      if (result.success) {
        // Reconnect socket with updated pairing information
        console.log('🔄 Pairing successful, reconnecting socket with updated data...');
        reconnect();
        
        // Give socket time to reconnect, then notify parent
        setTimeout(() => {
          if (socket && socket.connected) {
            console.log('📡 Child notifying parent about successful pairing');
            socket.emit('child_paired_success', { pairingCode: pairingCode.trim().toUpperCase() });
            socket.emit('user_online', { role: 'child' });
          }
        }, 2000);
        
        Alert.alert(
          'Success!', 
          'Successfully paired with parent device!',
          [
            {
              text: 'OK',
              onPress: () => {
                // Check if we came from settings
                const canGoBack = router.canGoBack();
                if (canGoBack) {
                  router.back(); // Go back to settings
                } else {
                  router.replace('/(tabs)'); // Go to main app
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', result.message || 'Failed to pair with parent');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pair with parent. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Pairing?',
      'You can pair with a parent device later from the settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Skip', 
          onPress: () => router.replace('/(tabs)')
        }
      ]
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 20,
    },
    backButton: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: theme.surface,
    },
    themeButton: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: theme.surface,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
    },
    iconContainer: {
      alignItems: 'center',
      marginBottom: 40,
      marginTop: 20,
    },
    icon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.text,
      textAlign: 'center',
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
    },
    inputContainer: {
      marginBottom: 30,
    },
    inputLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 12,
    },
    input: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 16,
      fontSize: 18,
      color: theme.text,
      textAlign: 'center',
      letterSpacing: 4,
      fontWeight: '600',
      borderWidth: 2,
      borderColor: theme.border,
    },
    inputFocused: {
      borderColor: theme.primary,
    },
    inputHint: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      marginTop: 8,
    },
    helpContainer: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 20,
      marginBottom: 30,
    },
    helpTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    helpText: {
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 20,
      marginBottom: 12,
    },
    helpList: {
      marginLeft: 10,
    },
    helpItem: {
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 20,
      marginBottom: 4,
    },
    buttonContainer: {
      gap: 12,
      paddingBottom: 20,
    },
    pairButton: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      height: 50,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    pairButtonDisabled: {
      backgroundColor: theme.textSecondary + '40',
    },
    pairButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    skipButton: {
      backgroundColor: 'transparent',
      borderRadius: 12,
      height: 50,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    skipButtonText: {
      color: theme.textSecondary,
      fontSize: 16,
      fontWeight: '600',
    },
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.background + 'CC',
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingContainer: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      gap: 12,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
    },
    loadingText: {
      fontSize: 16,
      color: theme.text,
      fontWeight: '600',
    },
  });

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleTheme} style={styles.themeButton}>
            <Ionicons 
              name={isDark ? 'sunny' : 'moon'} 
              size={24} 
              color={theme.text} 
            />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <View style={styles.icon}>
              <Ionicons name="phone-portrait" size={40} color="#fff" />
            </View>
            <Text style={styles.title}>Pair with Parent</Text>
            <Text style={styles.subtitle}>
              Enter the pairing code from your parent's device to connect
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Pairing Code</Text>
            <TextInput
              style={[
                styles.input,
                pairingCode.length > 0 && styles.inputFocused
              ]}
              value={pairingCode}
              onChangeText={(text) => setPairingCode(text.toUpperCase())}
              placeholder="ENTER CODE"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              keyboardType="default"
              returnKeyType="done"
              onSubmitEditing={handlePair}
            />
            <Text style={styles.inputHint}>
              Enter the 6-character code from parent device
            </Text>
          </View>

          <View style={styles.helpContainer}>
            <View style={styles.helpTitle}>
              <Ionicons name="help-circle" size={20} color={theme.primary} />
              <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>
                Need help?
              </Text>
            </View>
            <Text style={styles.helpText}>
              To get the pairing code:
            </Text>
            <View style={styles.helpList}>
              <Text style={styles.helpItem}>
                • Ask your parent to open PlayTogether
              </Text>
              <Text style={styles.helpItem}>
                • They should go to Settings → Pair Device
              </Text>
              <Text style={styles.helpItem}>
                • Or they can generate it during their first setup
              </Text>
              <Text style={styles.helpItem}>
                • The code will be displayed on their screen
              </Text>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[
                styles.pairButton,
                (!pairingCode.trim() || loading) && styles.pairButtonDisabled
              ]}
              onPress={handlePair}
              disabled={!pairingCode.trim() || loading}
            >
              <Ionicons 
                name="link" 
                size={20} 
                color="#fff" 
              />
              <Text style={styles.pairButtonText}>Pair Device</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.skipButton} 
              onPress={handleSkip}
              disabled={loading}
            >
              <Text style={styles.skipButtonText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.loadingText}>Pairing with parent...</Text>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}