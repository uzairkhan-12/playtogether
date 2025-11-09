import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { router } from 'expo-router';
import 'react-native-reanimated';

import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SocketProvider } from '@/contexts/SocketContext';

// Main app layout component
function AppLayout() {
  const { user, isLoading, hasLoggedInBefore } = useAuth();

  useEffect(() => {
    console.log('🏠 AppLayout: isLoading:', isLoading, 'user:', user?.role, user?.name, 'hasLoggedInBefore:', hasLoggedInBefore);
    
    if (!isLoading) {
      if (!user) {
        // No user logged in
        if (hasLoggedInBefore) {
          // User has logged in before, skip welcome and go to login
          console.log('🔄 AppLayout: No user but has logged in before, redirecting to login');
          router.replace('/auth/login');
        } else {
          // First time user, show welcome screen
          console.log('🔄 AppLayout: First time user, redirecting to welcome');
          router.replace('/auth/welcome');
        }
      } else {
        // User logged in, redirect to tabs (let tab layout handle role-based routing)
        console.log('🔄 AppLayout: User logged in, redirecting to tabs');
        router.replace('/(tabs)');
      }
    }
  }, [user, isLoading, hasLoggedInBefore]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <AppLayout />
          <StatusBar style="auto" />
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
