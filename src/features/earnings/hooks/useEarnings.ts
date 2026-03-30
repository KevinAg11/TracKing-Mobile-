import { useCallback, useEffect, useRef, useState } from 'react';
import { earningsApi, type EarningsSummary, type Liquidation } from '../api/earningsApi';

interface EarningsState {
  summary: EarningsSummary | null;
  liquidations: Liquidation[];
  /** True only on the initial load — use for full-screen spinner */
  loading: boolean;
  /** True during pull-to-refresh — use for RefreshControl */
  refreshing: boolean;
  error: string | null;
  refresh: () => void;
}

export function useEarnings(): EarningsState {
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [liquidations, setLiquidations] = useState<Liquidation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFirstLoad = useRef(true);

  const fetchData = useCallback(async (isRefresh: boolean) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      /**
       * BUG-09 NOTE: Both endpoints require ADMIN role.
       * COURIER role will receive 403 — handled gracefully via allSettled.
       */
      const [summaryResult, liquidationsResult] = await Promise.allSettled([
        earningsApi.getSummary(),
        earningsApi.getLiquidations(),
      ]);

      if (summaryResult.status === 'fulfilled') {
        setSummary(summaryResult.value);
      }
      if (liquidationsResult.status === 'fulfilled') {
        setLiquidations(liquidationsResult.value);
      }

      // Only show error if both failed
      if (
        summaryResult.status === 'rejected' &&
        liquidationsResult.status === 'rejected'
      ) {
        const err = summaryResult.reason as { userMessage?: string };
        setError(err?.userMessage ?? 'Error al cargar ganancias');
      }
    } catch (err: any) {
      setError(err?.userMessage ?? 'Error al cargar ganancias');
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFirstLoad.current = false;
    }
  }, []);

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  const refresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  return { summary, liquidations, loading, refreshing, error, refresh };
}
