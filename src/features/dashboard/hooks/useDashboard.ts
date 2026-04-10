import { useEffect, useState, useCallback } from 'react';
import { dashboardApi } from '../api/dashboardApi';
import { earningsApi } from '@/features/earnings/api/earningsApi';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useServicesStore } from '@/features/services/store/servicesStore';
import type { KPISummary } from '../types/dashboard.types';
import type { Service, ServiceStatus } from '@/features/services/types/services.types';

export type DashboardTab = 'all' | 'pending' | 'completed';

interface DashboardState {
  kpis: KPISummary;
  activeService: Service | null;
  filteredServices: Service[];
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => void;
}

const DEFAULT_KPIS: KPISummary = { pending: 0, inTransit: 0, completed: 0, earnings: 0 };

const TAB_STATUSES: Record<DashboardTab, ServiceStatus[]> = {
  all: ['ASSIGNED', 'ACCEPTED', 'IN_TRANSIT', 'DELIVERED'],
  pending: ['ASSIGNED', 'ACCEPTED'],
  completed: ['DELIVERED'],
};

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
  const [activeTab, setActiveTab] = useState<DashboardTab>('all');

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

        setOperationalStatus(profile.operational_status);
        setServices(svcs);

        const computed = dashboardApi.computeKPIs(svcs);

        // Earnings from liquidations — 403 is expected for COURIER role
        let earnings = 0;
        try {
          const liquidations = await earningsApi.getLiquidations();
          earnings = sumLiquidations(liquidations);
        } catch {
          // silently ignored — COURIER role gets 403
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

  // The active service is the one currently being worked on
  const activeService =
    services.find((s) => s.status === 'ACCEPTED' || s.status === 'IN_TRANSIT') ?? null;

  // Filtered list for the tab — excludes IN_TRANSIT/ACCEPTED from "pending" since
  // those are shown as the active card; "all" shows everything
  const filteredServices = services.filter((s) =>
    TAB_STATUSES[activeTab].includes(s.status),
  );

  return {
    kpis,
    activeService,
    filteredServices,
    activeTab,
    setActiveTab,
    loading,
    refreshing,
    error,
    refresh,
  };
}
