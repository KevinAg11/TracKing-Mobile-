import * as fc from 'fast-check';
import { renderHook, act } from '@testing-library/react-native';
import { useWorkday } from '@/features/workday/hooks/useWorkday';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useServicesStore } from '@/features/services/store/servicesStore';
import { workdayApi } from '@/features/workday/api/workdayApi';
import type { CourierUser } from '@/features/auth/types/auth.types';
import type { Service, ServiceStatus } from '@/features/services/types/services.types';

jest.mock('@/features/workday/api/workdayApi');
jest.mock('@/core/storage/secureStorage', () => ({
  secureStorage: { setToken: jest.fn(), clearToken: jest.fn(), getToken: jest.fn() },
}));

// ─── Factories ────────────────────────────────────────────────────────────────

function makeUser(overrides: Partial<CourierUser> = {}): CourierUser {
  return {
    id: 'u1', name: 'Test', email: 't@t.com', role: 'COURIER',
    company_id: 'c1', operationalStatus: 'UNAVAILABLE', ...overrides,
  };
}

function makeService(status: ServiceStatus): Service {
  return {
    id: 's1', status,
    origin_address: '', destination_address: '', destination_name: '',
    package_details: '', payment_method: 'CASH', payment_status: 'UNPAID',
    is_settled_courier: false, is_settled_customer: false,
    total_price: 0, delivery_price: 0, product_price: 0,
  };
}

// ─── startWorkday ─────────────────────────────────────────────────────────────

describe('useWorkday — startWorkday', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: makeUser(), accessToken: 'tok', isAuthenticated: true });
    useServicesStore.setState({ services: [], loaded: false });
    jest.clearAllMocks();
  });

  it('llama a workdayApi.start', async () => {
    (workdayApi.start as jest.Mock).mockResolvedValue(undefined);
    const { result } = renderHook(() => useWorkday());
    await act(async () => { await result.current.startWorkday(); });
    expect(workdayApi.start).toHaveBeenCalledTimes(1);
  });

  it('retorna ok:true y actualiza status a AVAILABLE', async () => {
    (workdayApi.start as jest.Mock).mockResolvedValue(undefined);
    const { result } = renderHook(() => useWorkday());
    let res: any;
    await act(async () => { res = await result.current.startWorkday(); });
    expect(res.ok).toBe(true);
    expect(useAuthStore.getState().user?.operationalStatus).toBe('AVAILABLE');
  });

  it('retorna ok:false con error cuando la API falla', async () => {
    (workdayApi.start as jest.Mock).mockRejectedValue({ userMessage: 'Error de red' });
    const { result } = renderHook(() => useWorkday());
    let res: any;
    await act(async () => { res = await result.current.startWorkday(); });
    expect(res.ok).toBe(false);
    expect(res.error).toBe('Error de red');
  });

  it('no modifica el status cuando la API falla', async () => {
    (workdayApi.start as jest.Mock).mockRejectedValue({ userMessage: 'Fallo' });
    const { result } = renderHook(() => useWorkday());
    await act(async () => { await result.current.startWorkday(); });
    expect(useAuthStore.getState().user?.operationalStatus).toBe('UNAVAILABLE');
  });
});

// ─── endWorkday ───────────────────────────────────────────────────────────────

describe('useWorkday — endWorkday', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: makeUser({ operationalStatus: 'AVAILABLE' }), accessToken: 'tok', isAuthenticated: true });
    useServicesStore.setState({ services: [], loaded: false });
    jest.clearAllMocks();
  });

  it('retorna ok:true y actualiza status a UNAVAILABLE cuando no hay servicios activos', async () => {
    useServicesStore.setState({ services: [makeService('DELIVERED')], loaded: true });
    (workdayApi.end as jest.Mock).mockResolvedValue(undefined);
    const { result } = renderHook(() => useWorkday());
    let res: any;
    await act(async () => { res = await result.current.endWorkday(); });
    expect(res.ok).toBe(true);
    expect(useAuthStore.getState().user?.operationalStatus).toBe('UNAVAILABLE');
  });

  it('retorna ok:false sin llamar API cuando hay servicios ASSIGNED', async () => {
    useServicesStore.setState({ services: [makeService('ASSIGNED')], loaded: true });
    const { result } = renderHook(() => useWorkday());
    let res: any;
    await act(async () => { res = await result.current.endWorkday(); });
    expect(res.ok).toBe(false);
    expect(res.error).toContain('servicios activos');
    expect(workdayApi.end).not.toHaveBeenCalled();
  });

  it('retorna ok:false sin llamar API cuando hay servicios IN_TRANSIT', async () => {
    useServicesStore.setState({ services: [makeService('IN_TRANSIT')], loaded: true });
    const { result } = renderHook(() => useWorkday());
    let res: any;
    await act(async () => { res = await result.current.endWorkday(); });
    expect(res.ok).toBe(false);
    expect(workdayApi.end).not.toHaveBeenCalled();
  });

  it('retorna ok:false sin llamar API cuando hay servicios ACCEPTED', async () => {
    useServicesStore.setState({ services: [makeService('ACCEPTED')], loaded: true });
    const { result } = renderHook(() => useWorkday());
    let res: any;
    await act(async () => { res = await result.current.endWorkday(); });
    expect(res.ok).toBe(false);
    expect(workdayApi.end).not.toHaveBeenCalled();
  });

  it('retorna ok:false con error cuando la API falla', async () => {
    useServicesStore.setState({ services: [], loaded: true });
    (workdayApi.end as jest.Mock).mockRejectedValue({ userMessage: 'Fallo del servidor' });
    const { result } = renderHook(() => useWorkday());
    let res: any;
    await act(async () => { res = await result.current.endWorkday(); });
    expect(res.ok).toBe(false);
  });
});

// ─── PBT: cualquier estado activo bloquea endWorkday ─────────────────────────

describe('P-1: estados activos siempre bloquean endWorkday (PBT)', () => {
  it('P-1: ASSIGNED, ACCEPTED, IN_TRANSIT → endWorkday siempre retorna ok:false', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<ServiceStatus>('ASSIGNED', 'ACCEPTED', 'IN_TRANSIT'),
        async (status) => {
          useAuthStore.setState({ user: makeUser({ operationalStatus: 'AVAILABLE' }), accessToken: 'tok', isAuthenticated: true });
          useServicesStore.setState({ services: [makeService(status)], loaded: true });
          jest.clearAllMocks();

          const { result } = renderHook(() => useWorkday());
          let res: any;
          await act(async () => { res = await result.current.endWorkday(); });

          expect(res.ok).toBe(false);
          expect(workdayApi.end).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 50 },
    );
  });
});

// ─── PBT: startWorkday exitoso siempre deja status AVAILABLE ─────────────────

describe('P-2: startWorkday exitoso siempre produce AVAILABLE (PBT)', () => {
  it('P-2: sin importar el status inicial, startWorkday exitoso → AVAILABLE', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('AVAILABLE', 'UNAVAILABLE', 'IN_SERVICE'),
        async (initialStatus: any) => {
          useAuthStore.setState({
            user: makeUser({ operationalStatus: initialStatus }),
            accessToken: 'tok',
            isAuthenticated: true,
          });
          useServicesStore.setState({ services: [], loaded: false });
          (workdayApi.start as jest.Mock).mockResolvedValue(undefined);

          const { result } = renderHook(() => useWorkday());
          await act(async () => { await result.current.startWorkday(); });

          expect(useAuthStore.getState().user?.operationalStatus).toBe('AVAILABLE');
        },
      ),
      { numRuns: 50 },
    );
  });
});
