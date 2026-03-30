import { apiClient, unwrap, type ApiResponse } from '@/core/api/apiClient';
import type { Service, ServiceStatus } from '../types/services.types';

export const servicesApi = {
  /** GET /api/courier/services — servicios asignados al mensajero autenticado */
  getAll: (): Promise<Service[]> =>
    apiClient
      .get<ApiResponse<Service[]>>('/api/courier/services')
      .then(unwrap),

  /** POST /api/courier/services/:id/status — cambia el estado del servicio */
  updateStatus: (id: string, status: ServiceStatus): Promise<Service> =>
    apiClient
      .post<ApiResponse<Service>>(`/api/courier/services/${id}/status`, { status })
      .then(unwrap),
};
