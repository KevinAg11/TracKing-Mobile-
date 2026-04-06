import axios from 'axios';
import { apiClient, unwrap, type ApiResponse } from '@/core/api/apiClient';
import { secureStorage } from '@/core/storage/secureStorage';

const BASE_URL = (apiClient.defaults.baseURL as string) ?? '';

export interface LocationPayload {
  latitude: number;
  longitude: number;
  /** Precision in meters — omit if unknown (do NOT send 0) */
  accuracy?: number;
}

export const locationApi = {
  /** Foreground: uses apiClient (token from Zustand store + interceptors) */
  send: (payload: LocationPayload): Promise<unknown> =>
    apiClient
      .post<ApiResponse<unknown>>('/api/courier/location', payload)
      .then(unwrap),

  /**
   * Background: reads token directly from SecureStore.
   * Used by backgroundLocationTask where the Zustand store may not be initialized.
   */
  sendFromBackground: async (payload: LocationPayload): Promise<void> => {
    const token = await secureStorage.getToken();
    if (!token) return; // no session — skip silently

    await axios.post(`${BASE_URL}/api/courier/location`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 10_000,
    });
  },
};
