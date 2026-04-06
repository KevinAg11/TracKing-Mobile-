import { useCallback, useEffect, useRef, useState } from 'react';
import { servicesApi } from '../api/servicesApi';
import { useServicesStore } from '../store/servicesStore';
import type { Service, ServiceStatus } from '../types/services.types';

const NEXT_STATUS: Partial<Record<ServiceStatus, ServiceStatus>> = {
  ASSIGNED: 'ACCEPTED',
  ACCEPTED: 'IN_TRANSIT',
  IN_TRANSIT: 'DELIVERED',
};

export function canTransition(current: ServiceStatus): boolean {
  return current in NEXT_STATUS;
}

export function nextStatus(current: ServiceStatus): ServiceStatus | null {
  return NEXT_STATUS[current] ?? null;
}

/**
 * Full hook: fetches services from backend and exposes performAction.
 * Use ONLY in ServicesScreen (list). ServiceDetailScreen uses useServiceDetail.
 * BUG-04/11 FIX: prevents double-fetch from mounting in multiple screens.
 */
export function useServices() {
  const { services, setServices, updateService } = useServicesStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const isFirstLoad = useRef(true);

  const fetchData = useCallback(
    async (isRefresh: boolean) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const data = await servicesApi.getAll();
        setServices(data);
      } catch (err: any) {
        setError(err?.userMessage ?? 'Error al cargar servicios');
      } finally {
        setLoading(false);
        setRefreshing(false);
        isFirstLoad.current = false;
      }
    },
    [setServices],
  );

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  const refresh = useCallback(() => fetchData(true), [fetchData]);

  const performAction = useCallback(
    async (service: Service): Promise<{ ok: boolean; error?: string }> => {
      const next = nextStatus(service.status);
      if (!next) return { ok: false, error: 'Accion no disponible' };

      setActionLoading(service.id);
      try {
        const updated = await servicesApi.updateStatus(service.id, next);
        updateService(updated);
        return { ok: true };
      } catch (err: any) {
        return { ok: false, error: err?.userMessage ?? 'Error al actualizar servicio' };
      } finally {
        setActionLoading(null);
      }
    },
    [updateService],
  );

  return { services, loading, refreshing, error, actionLoading, refresh, performAction };
}

/**
 * Lightweight hook for ServiceDetailScreen.
 * BUG-04/11 FIX: reads from store only — no fetch, no duplicate requests.
 */
export function useServiceDetail() {
  const { updateService } = useServicesStore();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const performAction = useCallback(
    async (service: Service): Promise<{ ok: boolean; error?: string }> => {
      const next = nextStatus(service.status);
      if (!next) return { ok: false, error: 'Accion no disponible' };

      setActionLoading(service.id);
      try {
        const updated = await servicesApi.updateStatus(service.id, next);
        updateService(updated);
        return { ok: true };
      } catch (err: any) {
        return { ok: false, error: err?.userMessage ?? 'Error al actualizar servicio' };
      } finally {
        setActionLoading(null);
      }
    },
    [updateService],
  );

  const performPaymentAction = useCallback(
    async (
      serviceId: string,
      payment_status: import('../types/services.types').PaymentStatus,
    ): Promise<{ ok: boolean; error?: string }> => {
      setPaymentLoading(true);
      try {
        const updated = await servicesApi.updatePayment(serviceId, payment_status);
        updateService(updated);
        return { ok: true };
      } catch (err: any) {
        return { ok: false, error: err?.userMessage ?? 'Error al actualizar pago' };
      } finally {
        setPaymentLoading(false);
      }
    },
    [updateService],
  );

  return { actionLoading, performAction, paymentLoading, performPaymentAction };
}
