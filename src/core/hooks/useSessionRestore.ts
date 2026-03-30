import { useEffect, useState } from 'react';
import { secureStorage } from '@/core/storage/secureStorage';
import { useAuthStore } from '@/features/auth/store/authStore';
import { apiClient, unwrap, type ApiResponse } from '@/core/api/apiClient';
import type { CourierUser } from '@/features/auth/types/auth.types';

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

/**
 * BUG-02 FIX: early return inside try does NOT skip finally in JS,
 * but we make it explicit to avoid confusion and ensure isRestoring
 * is always set to false regardless of code path.
 */
export function useSessionRestore() {
  const [isRestoring, setIsRestoring] = useState(true);
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      try {
        const token = await secureStorage.getToken();
        if (!token) {
          // No stored token — go straight to login
          return;
        }

        const res = await apiClient.get<ApiResponse<CourierMeResponse>>('/api/courier/me');
        const profile = unwrap(res);

        if (cancelled) return;

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
        // Token invalid or expired with no refresh possible — force re-login
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setIsRestoring(false);
      }
    }

    restore();

    return () => {
      cancelled = true;
    };
  }, [setSession, clearSession]);

  return { isRestoring };
}
