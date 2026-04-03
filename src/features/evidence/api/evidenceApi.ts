import { apiClient, unwrap, type ApiResponse } from '@/core/api/apiClient';

export interface EvidenceResponse {
  id: string;
  service_id: string;
  company_id: string;
  image_url: string;
  registration_date: string;
}

export const evidenceApi = {
  /**
   * POST /api/courier/services/:id/evidence
   * Sube evidencia fotográfica como multipart/form-data con campo "file".
   * Solo cuando el servicio está IN_TRANSIT.
   * Re-subir reemplaza la evidencia anterior (upsert).
   * Formatos permitidos: jpg, png, webp. Tamaño máximo: 5 MB.
   */
  upload: (serviceId: string, imageUri: string): Promise<EvidenceResponse> => {
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      name: 'evidencia.jpg',
      type: 'image/jpeg',
    } as any);

    return apiClient
      .post<ApiResponse<EvidenceResponse>>(
        `/api/courier/services/${serviceId}/evidence`,
        formData,
        {
          headers: {
            // No establecer Content-Type manualmente — axios lo setea con el boundary correcto
            'Content-Type': 'multipart/form-data',
          },
        },
      )
      .then(unwrap);
  },

  /**
   * GET /api/services/:id/evidence
   * Consulta la evidencia registrada para el servicio.
   */
  get: (serviceId: string): Promise<EvidenceResponse> =>
    apiClient
      .get<ApiResponse<EvidenceResponse>>(`/api/services/${serviceId}/evidence`)
      .then(unwrap),
};
