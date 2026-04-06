import { apiClient, unwrap, type ApiResponse } from '@/core/api/apiClient';
import type { Service, ServiceStatus, PaymentStatus } from '../types/services.types';

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

  /** POST /api/courier/services/:id/payment — cambia el estado de pago */
  updatePayment: (id: string, payment_status: PaymentStatus): Promise<Service> =>
    apiClient
      .post<ApiResponse<Service>>(`/api/courier/services/${id}/payment`, { payment_status })
      .then(unwrap),
};
