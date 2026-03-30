import { useEffect, useState, useCallback, useRef } from 'react';
import { dashboardApi } from '../api/dashboardApi';
import { earningsApi } from '@/features/earnings/api/earningsApi';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useServicesStore } from '@/features/services/store/servicesStore';
import type { KPISummary } from '../types/dashboard.types';
import type { Service } from '@/features/services/types/services.types';

interface DashboardState {
  kpis: KPISummary;
  activeService: Service | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => void;
}

const DEFAULT_KPIS: KPISummary = { pending: 0, completed: 0, earnings: 0 };

function sumLiquidations(liquidations: Array<{ total_earned: number }>): number {
  return liquidations.reduce((acc, l) => acc + (l.total_earned ?? 0), 0);
}

export function useDashboard(): DashboardState {
  const setOperationalStatus = useAuthStore((s) => s.setOperationalStatus);
  const { services, setServices } = useServicesStore();
  const [kpis, setKpis] = useState<KPISummary>(DEFAULT_KPIS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (isRefresh: boolean) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const [profile, svcs] = await Promise.all([
          dashboardApi.getProfile(),
          dashboardApi.getAssignedServices(),
        ]);

        const opStatus =
          profile.operational_status === 'IN_SERVICE' ? 'AVAILABLE' : profile.operational_status;
        setOperationalStatus(opStatus);
        setServices(svcs);

        const computed = dashboardApi.computeKPIs(svcs);

        // BUG-09 FIX: earnings from liquidations list (403 for COURIER is expected)
        let earnings = 0;
        try {
          const liquidations = await earningsApi.getLiquidations();
          earnings = sumLiquidations(liquidations);
        } catch {
          // COURIER role gets 403 — earnings stays 0
        }

        setKpis({ ...computed, earnings });
      } catch (err: any) {
        setError(err?.userMessage ?? 'Error al cargar el dashboard');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [setOperationalStatus, setServices],
  );

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  const refresh = useCallback(() => fetchData(true), [fetchData]);

  const activeService =
    services.find((s) => s.status === 'ACCEPTED' || s.status === 'IN_TRANSIT') ?? null;

  return { kpis, activeService, loading, refreshing, error, refresh };
}
