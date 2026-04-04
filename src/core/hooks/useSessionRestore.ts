import { useEffect, useState } from 'react';
import { secureStorage } from '@/core/storage/secureStorage';
import { useAuthStore } from '@/features/auth/store/authStore';
import { apiClient, unwrap, type ApiResponse } from '@/core/api/apiClient';
import type { CourierUser } from '@/features/auth/types/auth.types';

const RESTORE_TIMEOUT_MS = 8_000; // safety net: never block the app more than 8s

interface CourierMeResponse {
  id: string;
  user_id: string;
  company_id: string;
  operational_status: 'AVAILABLE' | 'UNAVAILABLE' | 'IN_SERVICE';
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export function useSessionRestore() {
  const [isRestoring, setIsRestoring] = useState(true);
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);

  useEffect(() => {
    let done = false;

    // Safety net: if restore takes longer than RESTORE_TIMEOUT_MS, unblock the app
    const safetyTimer = setTimeout(() => {
      if (!done) {
        done = true;
        setIsRestoring(false);
      }
    }, RESTORE_TIMEOUT_MS);

    async function restore() {
      try {
        const token = await secureStorage.getToken();
        if (!token) return; // no stored token — go straight to login

        const res = await apiClient.get<ApiResponse<CourierMeResponse>>('/api/courier/me');
        const profile = unwrap(res);

        const user: CourierUser = {
          id: profile.user_id,
          name: profile.user.name,
          email: profile.user.email,
          role: 'COURIER',
          company_id: profile.company_id,
          operationalStatus:
            profile.operational_status === 'IN_SERVICE' ? 'AVAILABLE' : profile.operational_status,
        };

        setSession(user, token);
      } catch {
        // Token invalid, expired, or network error — force re-login
        clearSession();
      } finally {
        // Always unblock, regardless of outcome
        if (!done) {
          done = true;
          clearTimeout(safetyTimer);
          setIsRestoring(false);
        }
      }
    }

    restore();

    return () => {
      // On unmount: mark done so safetyTimer doesn't call setState on dead component
      done = true;
      clearTimeout(safetyTimer);
    };
  }, [setSession, clearSession]);

  return { isRestoring };
}
