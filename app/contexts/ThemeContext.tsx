import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

// Theme colors
const lightTheme = {
  background: '#FFFFFF',
  surface: '#F5F5F5',
  primary: '#007AFF',
  secondary: '#5856D6',
  accent: '#FF3B30',
  text: '#000000',
  textSecondary: '#666666',
  border: '#E5E5E5',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  card: '#FFFFFF',
  shadow: '#000000',
  overlay: 'rgba(0,0,0,0.5)',
  // Video control colors
  controlBackground: 'rgba(0,0,0,0.7)',
  controlText: '#FFFFFF',
  progressTrack: 'rgba(255,255,255,0.3)',
  progressFill: '#007AFF',
  volumeTrack: 'rgba(255,255,255,0.3)',
  volumeFill: '#007AFF'
};

const darkTheme = {
  background: '#000000',
  surface: '#1C1C1E',
  primary: '#0A84FF',
  secondary: '#5E5CE6',
  accent: '#FF453A',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  border: '#38383A',
  success: '#30D158',
  warning: '#FF9F0A',
  error: '#FF453A',
  card: '#2C2C2E',
  shadow: '#000000',
  overlay: 'rgba(0,0,0,0.8)',
  // Video control colors
  controlBackground: 'rgba(0,0,0,0.8)',
  controlText: '#FFFFFF',
  progressTrack: 'rgba(255,255,255,0.3)',
  progressFill: '#0A84FF',
  volumeTrack: 'rgba(255,255,255,0.3)',
  volumeFill: '#0A84FF'
};

// Theme context
const ThemeContext = createContext({
  theme: lightTheme,
  isDark: false,
  toggleTheme: () => {},
  setTheme: () => {}
});

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemColorScheme === 'dark');
  const [themeMode, setThemeMode] = useState('system'); // 'light', 'dark', 'system'

  useEffect(() => {
    loadThemePreference();
  }, []);

  useEffect(() => {
    if (themeMode === 'system') {
      setIsDark(systemColorScheme === 'dark');
    }
  }, [systemColorScheme, themeMode]);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('themeMode');
      if (savedTheme) {
        setThemeMode(savedTheme);
        if (savedTheme !== 'system') {
          setIsDark(savedTheme === 'dark');
        }
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }
  };

  const saveThemePreference = async (mode) => {
    try {
      await AsyncStorage.setItem('themeMode', mode);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const setTheme = async (mode) => {
    setThemeMode(mode);
    await saveThemePreference(mode);
    
    if (mode === 'system') {
      setIsDark(systemColorScheme === 'dark');
    } else {
      setIsDark(mode === 'dark');
    }
  };

  const toggleTheme = () => {
    const newMode = isDark ? 'light' : 'dark';
    setTheme(newMode);
  };

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      isDark, 
      themeMode,
      toggleTheme, 
      setTheme 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};