import * as fc from 'fast-check';
import { renderHook, waitFor } from '@testing-library/react-native';
import { useDashboard } from '@/features/dashboard/hooks/useDashboard';
import { dashboardApi } from '@/features/dashboard/api/dashboardApi';
import { earningsApi } from '@/features/earnings/api/earningsApi';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useServicesStore } from '@/features/services/store/servicesStore';
import type { Service, ServiceStatus } from '@/features/services/types/services.types';
import type { CourierMeRaw } from '@/features/dashboard/api/dashboardApi';
import type { CourierUser } from '@/features/auth/types/auth.types';

// dashboardApi se mockea parcialmente: getProfile y getAssignedServices son mocks,
// computeKPIs se preserva de la implementación real.
jest.mock('@/features/dashboard/api/dashboardApi', () => {
  const actual = jest.requireActual('@/features/dashboard/api/dashboardApi');
  return {
    ...actual,
    dashboardApi: {
      ...actual.dashboardApi,
      getProfile: jest.fn(),
      getAssignedServices: jest.fn(),
    },
  };
});
jest.mock('@/features/earnings/api/earningsApi');
jest.mock('@/core/storage/secureStorage', () => ({
  secureStorage: { setToken: jest.fn(), clearToken: jest.fn(), getToken: jest.fn() },
}));

// ─── Factories ────────────────────────────────────────────────────────────────

function makeProfile(
  operational_status: CourierMeRaw['operational_status'] = 'AVAILABLE',
): CourierMeRaw {
  return {
    id: 'courier-1',
    user_id: 'user-1',
    company_id: 'co-1',
    operational_status,
    user: { id: 'user-1', name: 'Carlos', email: 'carlos@test.com' },
  };
}

function makeService(id: string, status: ServiceStatus): Service {
  return {
    id, status,
    origin_address: 'A', destination_address: 'B', destination_name: 'C',
    package_details: 'pkg', payment_method: 'CASH', payment_status: 'UNPAID',
    is_settled_courier: false, is_settled_customer: false,
    total_price: 10000, delivery_price: 8000, product_price: 2000,
  };
}

function makeUser(overrides: Partial<CourierUser> = {}): CourierUser {
  return {
    id: 'user-1', name: 'Carlos', email: 'carlos@test.com',
    role: 'COURIER', company_id: 'co-1', operationalStatus: 'UNAVAILABLE',
    ...overrides,
  };
}

function setupMocks(
  services: Service[] = [],
  operational_status: CourierMeRaw['operational_status'] = 'AVAILABLE',
) {
  (dashboardApi.getProfile as jest.Mock).mockResolvedValue(makeProfile(operational_status));
  (dashboardApi.getAssignedServices as jest.Mock).mockResolvedValue(services);
  (earningsApi.getLiquidations as jest.Mock).mockResolvedValue([]);
}

// ─── Carga inicial ────────────────────────────────────────────────────────────

describe('useDashboard — carga inicial', () => {
  beforeEach(() => {
    useServicesStore.setState({ services: [], loaded: false });
    useAuthStore.setState({ user: makeUser(), accessToken: 'tok', isAuthenticated: true });
    jest.clearAllMocks();
  });

  it('carga servicios y KPIs correctamente', async () => {
    setupMocks([makeService('s1', 'ASSIGNED'), makeService('s2', 'DELIVERED')]);
    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.kpis.pending).toBe(1);
    expect(result.current.kpis.completed).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it('establece error cuando la API falla', async () => {
    (dashboardApi.getProfile as jest.Mock).mockRejectedValue({ userMessage: 'Sin conexión' });
    (dashboardApi.getAssignedServices as jest.Mock).mockRejectedValue({ userMessage: 'Sin conexión' });
    (earningsApi.getLiquidations as jest.Mock).mockRejectedValue({});
    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Sin conexión');
  });
});

// ─── activeService ────────────────────────────────────────────────────────────

describe('useDashboard — activeService', () => {
  beforeEach(() => {
    useServicesStore.setState({ services: [], loaded: false });
    useAuthStore.setState({ user: makeUser(), accessToken: 'tok', isAuthenticated: true });
    jest.clearAllMocks();
  });

  it('detecta activeService con status ACCEPTED', async () => {
    setupMocks([makeService('s1', 'ASSIGNED'), makeService('s2', 'ACCEPTED')]);
    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.activeService?.id).toBe('s2');
  });

  it('detecta activeService con status IN_TRANSIT', async () => {
    setupMocks([makeService('s1', 'IN_TRANSIT')]);
    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.activeService?.id).toBe('s1');
  });

  it('activeService es null cuando todos son ASSIGNED o DELIVERED', async () => {
    setupMocks([makeService('s1', 'ASSIGNED'), makeService('s2', 'DELIVERED')]);
    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.activeService).toBeNull();
  });

  it('activeService es null cuando no hay servicios', async () => {
    setupMocks([]);
    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.activeService).toBeNull();
  });
});

// ─── operationalStatus — fix BUG-tracking ────────────────────────────────────

describe('useDashboard — operationalStatus (fix BUG-tracking)', () => {
  beforeEach(() => {
    useServicesStore.setState({ services: [], loaded: false });
    useAuthStore.setState({ user: makeUser(), accessToken: 'tok', isAuthenticated: true });
    jest.clearAllMocks();
  });

  it('IN_SERVICE del backend se guarda como IN_SERVICE en el store (no se convierte)', async () => {
    setupMocks([], 'IN_SERVICE');
    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(useAuthStore.getState().user?.operationalStatus).toBe('IN_SERVICE');
  });

  it('AVAILABLE del backend se guarda como AVAILABLE', async () => {
    setupMocks([], 'AVAILABLE');
    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(useAuthStore.getState().user?.operationalStatus).toBe('AVAILABLE');
  });

  it('UNAVAILABLE del backend se guarda como UNAVAILABLE', async () => {
    setupMocks([], 'UNAVAILABLE');
    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(useAuthStore.getState().user?.operationalStatus).toBe('UNAVAILABLE');
  });
});

// ─── computeKPIs (regla de dominio pura — sin mock) ──────────────────────────

describe('dashboardApi.computeKPIs — regla de dominio', () => {
  // Usamos la implementación real directamente (no el mock)
  const { dashboardApi: realApi } = jest.requireActual('@/features/dashboard/api/dashboardApi');

  it('pending = ASSIGNED + ACCEPTED', () => {
    const svcs = [
      makeService('a', 'ASSIGNED'),
      makeService('b', 'ACCEPTED'),
      makeService('c', 'DELIVERED'),
    ];
    const kpis = realApi.computeKPIs(svcs);
    expect(kpis.pending).toBe(2);
    expect(kpis.completed).toBe(1);
  });

  it('lista vacía → todos los KPIs en 0', () => {
    const kpis = realApi.computeKPIs([]);
    expect(kpis.pending).toBe(0);
    expect(kpis.completed).toBe(0);
  });

  it('IN_TRANSIT no cuenta como pending ni completed', () => {
    const svcs = [makeService('a', 'IN_TRANSIT')];
    const kpis = realApi.computeKPIs(svcs);
    expect(kpis.pending).toBe(0);
    expect(kpis.completed).toBe(0);
  });
});

// ─── PBT: computeKPIs — pending + completed ≤ total ─────────────────────────

describe('P-1: pending + completed ≤ total de servicios (PBT)', () => {
  const { dashboardApi: realApi } = jest.requireActual('@/features/dashboard/api/dashboardApi');

  it('P-1: para cualquier lista de servicios, pending + completed nunca supera el total', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom<ServiceStatus>('ASSIGNED', 'ACCEPTED', 'IN_TRANSIT', 'DELIVERED'),
          { minLength: 0, maxLength: 30 },
        ),
        (statuses) => {
          const svcs = statuses.map((s, i) => makeService(`s${i}`, s));
          const kpis = realApi.computeKPIs(svcs);
          expect(kpis.pending + kpis.completed).toBeLessThanOrEqual(svcs.length);
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ─── PBT: computeKPIs — valores nunca negativos ──────────────────────────────

describe('P-2: KPIs nunca son negativos (PBT)', () => {
  const { dashboardApi: realApi } = jest.requireActual('@/features/dashboard/api/dashboardApi');

  it('P-2: pending y completed siempre son ≥ 0', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom<ServiceStatus>('ASSIGNED', 'ACCEPTED', 'IN_TRANSIT', 'DELIVERED'),
          { minLength: 0, maxLength: 20 },
        ),
        (statuses) => {
          const svcs = statuses.map((s, i) => makeService(`s${i}`, s));
          const kpis = realApi.computeKPIs(svcs);
          expect(kpis.pending).toBeGreaterThanOrEqual(0);
          expect(kpis.completed).toBeGreaterThanOrEqual(0);
        },
      ),
      { numRuns: 200 },
    );
  });
});
