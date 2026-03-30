import { apiClient, unwrap, type ApiResponse } from '@/core/api/apiClient';

export interface EarningsSummary {
  total_earned: number;
  total_services: number;
  total_settlements: number;
  /** settlements array is also returned but we use the Liquidation[] separately */
}

export interface Liquidation {
  id: string;
  courier_id: string;
  total_earned: number;
  total_services: number;
  start_date: string;
  end_date: string;
  created_at: string;
}

export const earningsApi = {
  /**
   * GET /api/liquidations/earnings
   * Returns earnings summary for the authenticated courier's company.
   * The courier_id filter is resolved server-side via JWT for COURIER role.
   * Note: this endpoint requires ADMIN role — for COURIER we derive earnings
   * from the liquidations list instead.
   */
  getSummary: async (): Promise<EarningsSummary> => {
    const res = await apiClient.get<ApiResponse<EarningsSummary>>('/api/liquidations/earnings');
    return unwrap(res);
  },

  /**
   * GET /api/liquidations
   * Lists courier settlements. Backend scopes by company from JWT.
   */
  getLiquidations: async (): Promise<Liquidation[]> => {
    const res = await apiClient.get<ApiResponse<Liquidation[]>>('/api/liquidations');
    return unwrap(res);
  },
};
