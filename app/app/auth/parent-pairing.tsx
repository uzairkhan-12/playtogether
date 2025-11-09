import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Share,
  Clipboard
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useSocket } from '@/contexts/SocketContext';
import { Ionicons } from '@expo/vector-icons';

export default function ParentPairingScreen() {
  const [pairingCode, setPairingCode] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const { user, generatePairingCode, refreshProfile } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const { reconnect } = useSocket();
  const router = useRouter();

  useEffect(() => {
    // Check if user already has a pairing code
    if (user?.pairingCode) {
      setPairingCode(user.pairingCode);
    } else {
      // Generate initial pairing code
      handleGenerateCode();
    }
  }, []);

  const handleGenerateCode = async () => {
    setGenerating(true);
    try {
      const result = await generatePairingCode();
      if (result.success && result.pairingCode) {
        setPairingCode(result.pairingCode);
        
        // Refresh profile to get updated user data
        await refreshProfile();
        
        // Reconnect socket with updated pairing info
        console.log('🔄 Parent reconnecting socket after generating pairing code');
        reconnect();
      } else {
        Alert.alert('Error', result.message || 'Failed to generate pairing code');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to generate pairing code');
    } finally {
      setGenerating(false);
    }
  };

  const handleShare = async () => {
    try {
      const message = `Join me on PlayTogether! Use this code to pair your child device: ${pairingCode}`;
      await Share.share({
        message,
        title: 'PlayTogether Pairing Code',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleCopy = async () => {
    try {
      Clipboard.setString(pairingCode);
      Alert.alert('Copied!', 'Pairing code copied to clipboard');
    } catch (error) {
      console.error('Copy error:', error);
    }
  };

  const handleContinue = () => {
    // Check if we came from settings by looking at navigation state
    const canGoBack = router.canGoBack();
    if (canGoBack) {
      router.back(); // Go back to settings
    } else {
      router.replace('/(tabs)'); // Go to main app
    }
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
    themeButton: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: theme.surface,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
      justifyContent: 'center',
    },
    iconContainer: {
      alignItems: 'center',
      marginBottom: 30,
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
      marginBottom: 40,
      lineHeight: 24,
    },
    codeContainer: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      marginBottom: 30,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    codeLabel: {
      fontSize: 16,
      color: theme.textSecondary,
      marginBottom: 10,
    },
    codeText: {
      fontSize: 36,
      fontWeight: 'bold',
      color: theme.primary,
      letterSpacing: 8,
      marginBottom: 20,
    },
    codeActions: {
      flexDirection: 'row',
      gap: 15,
    },
    codeActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      gap: 8,
    },
    codeActionText: {
      fontSize: 14,
      color: theme.text,
      fontWeight: '600',
    },
    instructionsContainer: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 20,
      marginBottom: 30,
    },
    instructionsTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 15,
    },
    instructionItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 12,
      gap: 12,
    },
    stepNumber: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    stepNumberText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#fff',
    },
    instructionText: {
      flex: 1,
      fontSize: 14,
      color: theme.text,
      lineHeight: 20,
    },
    buttonContainer: {
      gap: 12,
    },
    regenerateButton: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      height: 50,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      gap: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },
    regenerateButtonText: {
      color: theme.text,
      fontSize: 16,
      fontWeight: '600',
    },
    continueButton: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      height: 50,
      justifyContent: 'center',
      alignItems: 'center',
    },
    continueButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    loadingContainer: {
      alignItems: 'center',
      gap: 10,
    },
    loadingText: {
      fontSize: 16,
      color: theme.textSecondary,
    },
  });

  if (generating && !pairingCode) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View />
          <TouchableOpacity onPress={toggleTheme} style={styles.themeButton}>
            <Ionicons 
              name={isDark ? 'sunny' : 'moon'} 
              size={24} 
              color={theme.text} 
            />
          </TouchableOpacity>
        </View>
        <View style={styles.content}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.loadingText}>Generating pairing code...</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        {router.canGoBack() ? (
          <TouchableOpacity onPress={() => router.back()} style={styles.themeButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
        ) : (
          <View />
        )}
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
            <Ionicons name="link" size={40} color="#fff" />
          </View>
          <Text style={styles.title}>Pair Child Device</Text>
          <Text style={styles.subtitle}>
            Share this code with your child to connect their device
          </Text>
        </View>

        {pairingCode ? (
          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>Pairing Code</Text>
            <Text style={styles.codeText}>{pairingCode}</Text>
            <View style={styles.codeActions}>
              <TouchableOpacity style={styles.codeActionButton} onPress={handleCopy}>
                <Ionicons name="copy" size={16} color={theme.text} />
                <Text style={styles.codeActionText}>Copy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.codeActionButton} onPress={handleShare}>
                <Ionicons name="share" size={16} color={theme.text} />
                <Text style={styles.codeActionText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>How to pair:</Text>
          
          <View style={styles.instructionItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.instructionText}>
              <Text style={{fontWeight: '600'}}>On child's device:</Text> Install PlayTogether from app store
            </Text>
          </View>

          <View style={styles.instructionItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.instructionText}>
              <Text style={{fontWeight: '600'}}>Create account:</Text> Register as "Child" role
            </Text>
          </View>

          <View style={styles.instructionItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.instructionText}>
              <Text style={{fontWeight: '600'}}>Enter this code:</Text> When prompted, input the pairing code above
            </Text>
          </View>

          <View style={styles.instructionItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>4</Text>
            </View>
            <Text style={styles.instructionText}>
              <Text style={{fontWeight: '600'}}>Connected!</Text> Start uploading and controlling videos remotely
            </Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.regenerateButton} 
            onPress={handleGenerateCode}
            disabled={generating}
          >
            {generating ? (
              <ActivityIndicator color={theme.text} />
            ) : (
              <>
                <Ionicons name="refresh" size={18} color={theme.text} />
                <Text style={styles.regenerateButtonText}>Generate New Code</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.continueButtonText}>Continue to App</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}