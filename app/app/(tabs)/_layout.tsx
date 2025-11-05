import { Stack } from 'expo-router';
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';

export default function TabLayout() {
  const { user } = useAuth();
  const router = useRouter();

  // Role-based routing - redirect based on user role
  React.useEffect(() => {
    if (user) {
      if (user.role === 'parent') {
        // Parents see dashboard
        router.replace('/');
      } else if (user.role === 'child') {
        // Children see video player
        router.replace('/VideoPlayerScreen');
      }
    }
  }, [user, router]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="VideoPlayerScreen" />
    </Stack>
  );
}
