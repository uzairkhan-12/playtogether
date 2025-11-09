import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import FamilySetupGuide from '@/components/FamilySetupGuide';

export default function WelcomeScreen() {
  const { theme, isDark, toggleTheme } = useTheme();
  const router = useRouter();
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  const handleGetStarted = () => {
    router.push('/auth/register');
  };

  const handleLogin = () => {
    router.push('/auth/login');
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
    helpButton: {
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
      justifyContent: 'center',
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: 40,
    },
    logo: {
      fontSize: 64,
      marginBottom: 20,
    },
    appName: {
      fontSize: 32,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 10,
    },
    tagline: {
      fontSize: 18,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 26,
    },
    featuresContainer: {
      marginVertical: 40,
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      gap: 16,
    },
    featureIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
    },
    featureText: {
      flex: 1,
    },
    featureTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
    },
    featureDescription: {
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 20,
    },
    howItWorksContainer: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 20,
      marginVertical: 20,
    },
    howItWorksTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 16,
      textAlign: 'center',
    },
    stepContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 16,
      gap: 12,
    },
    stepNumber: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    stepNumberText: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#fff',
    },
    stepContent: {
      flex: 1,
    },
    stepTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
    },
    stepDescription: {
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 20,
    },
    buttonContainer: {
      gap: 12,
      paddingBottom: 20,
    },
    getStartedButton: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      height: 50,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    getStartedButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    loginButton: {
      backgroundColor: 'transparent',
      borderRadius: 12,
      height: 50,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    loginButtonText: {
      color: theme.text,
      fontSize: 16,
      fontWeight: '600',
    },
  });

  const features = [
    {
      icon: 'phone-portrait',
      title: 'Remote Control',
      description: 'Control videos on your child\'s device from anywhere'
    },
    {
      icon: 'people',
      title: 'Family Connection',
      description: 'Easy pairing between parent and child devices'
    },
    {
      icon: 'play-circle',
      title: 'Video Management',
      description: 'Upload, organize, and play videos seamlessly'
    },
    {
      icon: 'shield-checkmark',
      title: 'Safe & Secure',
      description: 'Private family network with secure connections'
    }
  ];

  const steps = [
    {
      title: 'Parent Setup',
      description: 'Create parent account and get pairing code'
    },
    {
      title: 'Child Setup',
      description: 'Create child account on their device'
    },
    {
      title: 'Pair Devices',
      description: 'Enter pairing code to connect devices'
    },
    {
      title: 'Start Playing',
      description: 'Upload videos and control playback remotely!'
    }
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setShowSetupGuide(true)} style={styles.helpButton}>
          <Ionicons name="help-circle" size={24} color={theme.text} />
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
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>🎬</Text>
          <Text style={styles.appName}>PlayTogether</Text>
          <Text style={styles.tagline}>
            Connect parent and child devices for remote video control
          </Text>
        </View>

        <View style={styles.featuresContainer}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name={feature.icon as any} size={22} color={theme.primary} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.howItWorksContainer}>
          <Text style={styles.howItWorksTitle}>How It Works</Text>
          {steps.map((step, index) => (
            <View key={index} style={styles.stepContainer}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDescription}>{step.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.getStartedButton} onPress={handleGetStarted}>
            <Ionicons name="rocket" size={20} color="#fff" />
            <Text style={styles.getStartedButtonText}>Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>Already have an account? Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FamilySetupGuide 
        visible={showSetupGuide} 
        onClose={() => setShowSetupGuide(false)} 
      />
    </ScrollView>
  );
}