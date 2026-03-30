import { apiClient, type ApiResponse } from '@/core/api/apiClient';

export const workdayApi = {
  /** POST /api/courier/jornada/start — UNAVAILABLE → AVAILABLE */
  start: (): Promise<void> =>
    apiClient
      .post<ApiResponse<unknown>>('/api/courier/jornada/start')
      .then(() => undefined),

  /** POST /api/courier/jornada/end — AVAILABLE → UNAVAILABLE */
  end: (): Promise<void> =>
    apiClient
      .post<ApiResponse<unknown>>('/api/courier/jornada/end')
      .then(() => undefined),
};
