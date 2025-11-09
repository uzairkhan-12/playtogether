import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const router = useRouter();

  const handlePairDevice = () => {
    if (user?.role === 'parent') {
      router.push('/auth/parent-pairing');
    } else {
      router.push('/auth/child-pairing');
    }
  };

  const handleBack = () => {
    if (user?.role === 'child') {
      router.push('/VideoPlayerScreen');
    } else {
      router.back();
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/auth/welcome');
          }
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
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 20,
      gap: 16,
    },
    backButton: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: theme.surface,
    },
    headerContent: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 8,
    },
    headerSubtitle: {
      fontSize: 16,
      color: theme.textSecondary,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
    },
    section: {
      marginBottom: 30,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 15,
    },
    settingItem: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    settingLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    settingIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    settingInfo: {
      flex: 1,
    },
    settingTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 2,
    },
    settingDescription: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    settingRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    switch: {
      marginLeft: 8,
    },
    userInfo: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 20,
      marginBottom: 30,
    },
    userAvatar: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    userAvatarText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#fff',
    },
    userName: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 4,
    },
    userEmail: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 8,
    },
    userRole: {
      fontSize: 12,
      color: theme.primary,
      fontWeight: '600',
      textTransform: 'uppercase',
      backgroundColor: theme.primary + '20',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      alignSelf: 'flex-start',
    },
    logoutButton: {
      backgroundColor: '#FF6B6B',
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 20,
    },
    logoutButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        {user?.role === 'child' && (
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
        )}
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>Manage your account and preferences</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* User Info */}
        <View style={styles.userInfo}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {user?.name ? getInitials(user.name) : 'U'}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>
          <Text style={styles.userRole}>{user?.role || 'user'}</Text>
        </View>

        {/* Device Pairing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Device Pairing</Text>
          <TouchableOpacity style={styles.settingItem} onPress={handlePairDevice}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Ionicons name="link" size={20} color={theme.primary} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>
                  {user?.role === 'parent' ? 'Show Pairing Code' : 'Pair with Parent'}
                </Text>
                <Text style={styles.settingDescription}>
                  {user?.role === 'parent' 
                    ? 'Generate code to pair child devices' 
                    : 'Enter code to connect with parent device'
                  }
                </Text>
              </View>
            </View>
            <View style={styles.settingRight}>
              <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Appearance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <TouchableOpacity style={styles.settingItem} onPress={toggleTheme}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Ionicons 
                  name={isDark ? 'moon' : 'sunny'} 
                  size={20} 
                  color={theme.primary} 
                />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Theme</Text>
                <Text style={styles.settingDescription}>
                  {isDark ? 'Dark mode' : 'Light mode'}
                </Text>
              </View>
            </View>
            <View style={styles.settingRight}>
              <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Ionicons name="information-circle" size={20} color={theme.primary} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Version</Text>
                <Text style={styles.settingDescription}>PlayTogether 1.0.0</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={20} color="#fff" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}