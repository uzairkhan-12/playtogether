import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { HapticTab } from '@/components/haptic-tab';

export default function TabLayout() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  console.log('📱 TabLayout: Rendering for user:', user?.role, user?.name);

  // Auto-redirect children to video player
  React.useEffect(() => {
    if (user?.role === 'child') {
      console.log('📱 TabLayout: Child detected, redirecting to VideoPlayerScreen');
      router.replace('/(tabs)/VideoPlayerScreen');
    }
  }, [user, router]);

  // For children, show only the video player (no tabs) but allow settings access
  if (user?.role === 'child') {
    console.log('📱 TabLayout: Setting up child layout');
    return (
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' }, // Hide tabs for children
        }}>
        <Tabs.Screen
          name="index"
          options={{
            href: null, // Hide from navigation
          }}
        />
        <Tabs.Screen
          name="VideoPlayerScreen"
          options={{
            title: 'Player',
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            href: null, // Hide from tab bar but allow direct navigation
          }}
        />
      </Tabs>
    );
  }

  // For parents, show full navigation
  console.log('📱 TabLayout: Setting up parent layout');
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="VideoPlayerScreen"
        options={{
          href: null, // Hide from tab bar
        }}
      />
    </Tabs>
  );
}
