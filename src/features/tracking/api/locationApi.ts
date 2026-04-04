import { apiClient, unwrap, type ApiResponse } from '@/core/api/apiClient';

export interface LocationPayload {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export const locationApi = {
  send: (payload: LocationPayload): Promise<unknown> =>
    apiClient
      .post<ApiResponse<unknown>>('/api/courier/location', payload)
      .then(unwrap),
};
