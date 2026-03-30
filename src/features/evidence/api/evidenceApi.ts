import { apiClient, unwrap, type ApiResponse } from '@/core/api/apiClient';

export interface EvidencePayload {
  image_url: string;
}

export interface EvidenceResponse {
  id: string;
  service_id: string;
  image_url: string;
  created_at: string;
}

export const evidenceApi = {
  /**
   * POST /api/courier/services/:id/evidence
   * Sube evidencia fotográfica. Solo cuando el servicio está IN_TRANSIT.
   */
  upload: (serviceId: string, payload: EvidencePayload): Promise<EvidenceResponse> =>
    apiClient
      .post<ApiResponse<EvidenceResponse>>(
        `/api/courier/services/${serviceId}/evidence`,
        payload,
      )
      .then(unwrap),

  /**
   * GET /api/services/:id/evidence
   * Consulta la evidencia registrada para el servicio.
   */
  get: (serviceId: string): Promise<EvidenceResponse> =>
    apiClient
      .get<ApiResponse<EvidenceResponse>>(`/api/services/${serviceId}/evidence`)
      .then(unwrap),
};
