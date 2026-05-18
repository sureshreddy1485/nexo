import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // Hydrate from storage on app start
  hydrate: async () => {
    try {
      const token = await AsyncStorage.getItem('nexchat_token');
      const userStr = await AsyncStorage.getItem('nexchat_user');
      if (token && userStr) {
        const user = JSON.parse(userStr);
        set({ token, user, isAuthenticated: true });
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
    } catch (e) {
      console.log('Hydrate error:', e);
    }
  },

  signup: async (formData) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post('/auth/signup', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await AsyncStorage.setItem('nexchat_token', data.token);
      await AsyncStorage.setItem('nexchat_user', JSON.stringify(data.user));
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Signup failed';
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  login: async (identifier, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post('/auth/login', { identifier, password });
      await AsyncStorage.setItem('nexchat_token', data.token);
      await AsyncStorage.setItem('nexchat_user', JSON.stringify(data.user));
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed';
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (_) {}
    await AsyncStorage.removeItem('nexchat_token');
    await AsyncStorage.removeItem('nexchat_user');
    delete api.defaults.headers.common['Authorization'];
    set({ user: null, token: null, isAuthenticated: false });
  },

  updateUser: (updates) => {
    const updated = { ...get().user, ...updates };
    set({ user: updated });
    AsyncStorage.setItem('nexchat_user', JSON.stringify(updated));
  },

  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}));

export default useAuthStore;
