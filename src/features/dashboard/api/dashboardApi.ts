import { apiClient, unwrap, type ApiResponse } from '@/core/api/apiClient';
import type { Service } from '@/features/services/types/services.types';
import type { KPISummary } from '../types/dashboard.types';

/** Raw courier profile from GET /api/courier/me */
export interface CourierMeRaw {
  id: string;
  user_id: string;
  company_id: string;
  operational_status: 'AVAILABLE' | 'UNAVAILABLE' | 'IN_SERVICE';
  user: { id: string; name: string; email: string };
}

export const dashboardApi = {
  /** GET /api/courier/me — perfil completo del mensajero autenticado */
  getProfile: (): Promise<CourierMeRaw> =>
    apiClient
      .get<ApiResponse<CourierMeRaw>>('/api/courier/me')
      .then(unwrap),

  /** GET /api/courier/services — servicios asignados al mensajero */
  getAssignedServices: (): Promise<Service[]> =>
    apiClient
      .get<ApiResponse<Service[]>>('/api/courier/services')
      .then(unwrap),

  /**
   * KPIs se calculan localmente a partir de los servicios.
   * No existe un endpoint /kpis en el backend.
   */
  computeKPIs(services: Service[]): KPISummary {
    return {
      pending: services.filter((s) => s.status === 'ASSIGNED' || s.status === 'ACCEPTED').length,
      completed: services.filter((s) => s.status === 'DELIVERED').length,
      earnings: 0, // earnings come from /api/liquidations/earnings
    };
  },
};
