import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

// API configuration
const API_BASE_URL = 'http://192.168.100.216:8888/api';

// Types
interface User {
  _id: string;
  name: string;
  email: string;
  role: 'parent' | 'child';
  pairedWith?: string;
  pairingCode?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasLoggedInBefore: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; user?: User; message?: string }>;
  register: (name: string, email: string, password: string, role?: 'parent' | 'child') => Promise<{ success: boolean; user?: User; message?: string }>;
  logout: () => Promise<void>;
  generatePairingCode: () => Promise<{ success: boolean; pairingCode?: string; message?: string }>;
  pairWithParent: (pairingCode: string) => Promise<{ success: boolean; message?: string }>;
  refreshProfile: () => Promise<{ success: boolean; user?: User }>;
}

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Auth context
const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  hasLoggedInBefore: false,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  logout: async () => {},
  generatePairingCode: async () => ({ success: false }),
  pairWithParent: async () => ({ success: false }),
  refreshProfile: async () => ({ success: false })
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoggedInBefore, setHasLoggedInBefore] = useState(false);

  useEffect(() => {
    checkAuthState();
  }, []);

  // Check if user is already authenticated
  const checkAuthState = async () => {
    try {
      const savedToken = await SecureStore.getItemAsync('authToken');
      const userData = await AsyncStorage.getItem('userData');
      const hasLoggedBefore = await AsyncStorage.getItem('hasLoggedInBefore');
      
      if (hasLoggedBefore === 'true') {
        setHasLoggedInBefore(true);
        console.log('📝 AuthContext: User has logged in before');
      }
      
      if (savedToken && userData) {
        const parsedUser: User = JSON.parse(userData);
        setToken(savedToken);
        setUser(parsedUser);
        
        // Set default authorization header
        api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
        
        // Verify token is still valid
        await refreshProfile();
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
      await logout();
    } finally {
      setIsLoading(false);
    }
  };

  // Login function
  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', {
        email,
        password
      });

      if (response.data.success) {
        const { user, token } = response.data.data;
        
        // Save to secure storage
        await SecureStore.setItemAsync('authToken', token);
        await AsyncStorage.setItem('userData', JSON.stringify(user));
        await AsyncStorage.setItem('hasLoggedInBefore', 'true');
        
        // Update state
        setToken(token);
        setUser(user);
        setHasLoggedInBefore(true);
        
        // Set authorization header
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        console.log('✅ Login successful, socket will reconnect with user data');
        
        return { success: true, user };
      }
      return { success: false, message: 'Login failed' };
    } catch (error: any) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed'
      };
    }
  };

  // Register function
  const register = async (name: string, email: string, password: string, role: 'parent' | 'child' = 'parent') => {
    try {
      const response = await api.post('/auth/register', {
        name,
        email,
        password,
        role
      });

      if (response.data.success) {
        const { user, token } = response.data.data;
        
        // Save to secure storage
        await SecureStore.setItemAsync('authToken', token);
        await AsyncStorage.setItem('userData', JSON.stringify(user));
        
        // Update state
        setToken(token);
        setUser(user);
        
        // Set authorization header
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        return { success: true, user };
      }
      return { success: false, message: 'Registration failed' };
    } catch (error: any) {
      console.error('Register error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed'
      };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Clear secure storage
      await SecureStore.deleteItemAsync('authToken');
      await AsyncStorage.removeItem('userData');
      
      // Clear state
      setToken(null);
      setUser(null);
      
      // Remove authorization header
      delete api.defaults.headers.common['Authorization'];
      
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Generate pairing code (for parents)
  const generatePairingCode = async () => {
    try {
      const response = await api.post('/auth/generate-code');
      
      if (response.data.success) {
        return {
          success: true,
          pairingCode: response.data.data.pairingCode
        };
      }
      return { success: false, message: 'Failed to generate pairing code' };
    } catch (error: any) {
      console.error('Generate pairing code error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to generate pairing code'
      };
    }
  };

  // Pair with parent (for children)
  const pairWithParent = async (pairingCode: string) => {
    try {
      const response = await api.post('/auth/pair', {
        pairingCode
      });

      if (response.data.success) {
        // Update user data with pairing info
        await refreshProfile();
        return { success: true };
      }
      return { success: false, message: 'Failed to pair with parent' };
    } catch (error: any) {
      console.error('Pair with parent error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to pair with parent'
      };
    }
  };

  // Refresh user profile
  const refreshProfile = async () => {
    try {
      const response = await api.get('/auth/profile');
      
      if (response.data.success) {
        const updatedUser: User = response.data.data.user;
        setUser(updatedUser);
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
        return { success: true, user: updatedUser };
      }
      return { success: false };
    } catch (error: any) {
      console.error('Refresh profile error:', error);
      // If token is invalid, logout
      if (error.response?.status === 401) {
        await logout();
      }
      return { success: false };
    }
  };

  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isLoading,
      isAuthenticated,
      hasLoggedInBefore,
      login,
      register,
      logout,
      generatePairingCode,
      pairWithParent,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Export the configured axios instance for use in other components
export { api };