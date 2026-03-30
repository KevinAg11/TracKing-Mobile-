import { create } from 'zustand';
import { secureStorage } from '@/core/storage/secureStorage';
import type { AuthState, CourierUser, OperationalStatus } from '../types/auth.types';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,

  setSession: (user: CourierUser, token: string) => {
    // Persist token async — fire and forget (restore hook reads it on next launch)
    if (token) secureStorage.setToken(token);
    set({ user, accessToken: token, isAuthenticated: true });
  },

  clearSession: () => {
    secureStorage.clearToken();
    set({ user: null, accessToken: null, isAuthenticated: false });
  },

  setOperationalStatus: (status: OperationalStatus) => {
    set((state) => ({
      user: state.user ? { ...state.user, operationalStatus: status } : null,
    }));
  },
}));
