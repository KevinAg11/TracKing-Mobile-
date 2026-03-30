import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { handleApiError } from '@/shared/utils/errorHandler';

/**
 * En desarrollo con Expo Go en dispositivo físico, 'localhost' apunta al propio
 * celular, no a la PC. Se usa la IP local de la máquina de desarrollo.
 * Si cambias de red, actualiza esta IP con la nueva dirección de tu PC.
 */
const BASE_URL = 'http://192.168.1.11:3000';

/** Wrapper estandar de todas las respuestas del backend */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

/** Extrae `data` de la respuesta estandar del backend */
export function unwrap<T>(res: AxiosResponse<ApiResponse<T>>): T {
  return res.data.data;
}

export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // send httpOnly cookies automatically
  headers: { 'Content-Type': 'application/json' },
});

// Lazy import to avoid circular dependency: apiClient <- authStore <- apiClient
function getAuthStore() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('@/features/auth/store/authStore').useAuthStore.getState();
}

// Request interceptor: attach Bearer token
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAuthStore().accessToken;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 refresh + error mapping
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  pendingQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  pendingQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;

    // 401: attempt token refresh once
    if (status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({
            resolve: (token) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(apiClient(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        /**
         * BUG-03 FIX: The backend /api/auth/refresh returns data: null (not a new token in body).
         * The new access_token arrives only via httpOnly cookie.
         * We call /api/courier/me after refresh to get the fresh token from the response
         * (the interceptor will attach the cookie automatically via withCredentials).
         * We keep the existing token in the store — the cookie handles auth for subsequent requests.
         */
        await apiClient.post('/api/auth/refresh');

        // Re-read current token from store (may have been updated by a concurrent setSession call)
        const currentToken = getAuthStore().accessToken ?? '';
        processQueue(null, currentToken);

        if (originalRequest.headers && currentToken) {
          originalRequest.headers.Authorization = `Bearer ${currentToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        getAuthStore().clearSession();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Map status codes to user-facing messages
    // BUG-12 FIX: backend error shape is { success: false, statusCode, error }
    // NestJS validation errors: { message: string[] | string, error, statusCode }
    const responseData = error.response?.data as
      | { error?: string; message?: string | string[] }
      | undefined;
    const rawMessage = responseData?.error ?? responseData?.message;
    const serverMessage = Array.isArray(rawMessage)
      ? rawMessage[0]
      : rawMessage;
    const userMessage = handleApiError(status ?? 0, serverMessage);

    return Promise.reject(Object.assign(error, { userMessage }));
  }
);
