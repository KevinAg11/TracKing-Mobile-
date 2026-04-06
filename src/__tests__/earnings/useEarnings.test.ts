import * as fc from 'fast-check';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useEarnings } from '@/features/earnings/hooks/useEarnings';
import { earningsApi } from '@/features/earnings/api/earningsApi';

jest.mock('@/features/earnings/api/earningsApi');

// ─── Factories ────────────────────────────────────────────────────────────────

function makeSummary(overrides = {}) {
  return {
    total_earned: 150000,
    total_services: 18,
    period_start: '2026-01-01',
    period_end: '2026-01-31',
    ...overrides,
  };
}

function makeLiquidation(overrides = {}) {
  return {
    id: 'liq-1',
    courier_id: 'c1',
    total_earned: 80000,
    total_services: 10,
    start_date: '2026-01-01',
    end_date: '2026-01-15',
    created_at: '2026-01-16T00:00:00Z',
    ...overrides,
  };
}

// ─── Carga inicial ────────────────────────────────────────────────────────────

describe('useEarnings — carga inicial', () => {
  beforeEach(() => jest.clearAllMocks());

  it('inicia en estado loading', () => {
    (earningsApi.getSummary as jest.Mock).mockResolvedValue(makeSummary());
    (earningsApi.getLiquidations as jest.Mock).mockResolvedValue([]);
    const { result } = renderHook(() => useEarnings());
    expect(result.current.loading).toBe(true);
  });

  it('carga summary y liquidaciones correctamente', async () => {
    (earningsApi.getSummary as jest.Mock).mockResolvedValue(makeSummary());
    (earningsApi.getLiquidations as jest.Mock).mockResolvedValue([makeLiquidation()]);
    const { result } = renderHook(() => useEarnings());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.summary?.total_earned).toBe(150000);
    expect(result.current.liquidations).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it('establece error solo cuando ambos endpoints fallan', async () => {
    (earningsApi.getSummary as jest.Mock).mockRejectedValue({ userMessage: 'Sin conexión' });
    (earningsApi.getLiquidations as jest.Mock).mockRejectedValue({ userMessage: 'Sin conexión' });
    const { result } = renderHook(() => useEarnings());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Sin conexión');
    expect(result.current.summary).toBeNull();
  });

  it('no establece error cuando solo getLiquidations falla (403 COURIER)', async () => {
    (earningsApi.getSummary as jest.Mock).mockResolvedValue(makeSummary());
    (earningsApi.getLiquidations as jest.Mock).mockRejectedValue({ status: 403 });
    const { result } = renderHook(() => useEarnings());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.summary?.total_earned).toBe(150000);
  });

  it('no establece error cuando solo getSummary falla', async () => {
    (earningsApi.getSummary as jest.Mock).mockRejectedValue({ status: 403 });
    (earningsApi.getLiquidations as jest.Mock).mockResolvedValue([makeLiquidation()]);
    const { result } = renderHook(() => useEarnings());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.liquidations).toHaveLength(1);
  });
});

// ─── refresh ──────────────────────────────────────────────────────────────────

describe('useEarnings — refresh', () => {
  beforeEach(() => jest.clearAllMocks());

  it('refresh recarga los datos', async () => {
    (earningsApi.getSummary as jest.Mock).mockResolvedValue(makeSummary());
    (earningsApi.getLiquidations as jest.Mock).mockResolvedValue([]);
    const { result } = renderHook(() => useEarnings());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { result.current.refresh(); });
    await waitFor(() => expect(result.current.refreshing).toBe(false));
    expect(earningsApi.getSummary).toHaveBeenCalledTimes(2);
  });

  it('refresh activa refreshing=true (no loading)', async () => {
    let resolveSummary: (v: any) => void;
    (earningsApi.getSummary as jest.Mock)
      .mockResolvedValueOnce(makeSummary())
      .mockImplementationOnce(() => new Promise((r) => { resolveSummary = r; }));
    (earningsApi.getLiquidations as jest.Mock).mockResolvedValue([]);

    const { result } = renderHook(() => useEarnings());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => { result.current.refresh(); });
    expect(result.current.refreshing).toBe(true);
    expect(result.current.loading).toBe(false);

    await act(async () => { resolveSummary!(makeSummary()); });
  });
});

// ─── PBT: total_earned siempre es número ─────────────────────────────────────

describe('P-1: total_earned del summary siempre es número (PBT)', () => {
  it('P-1: para cualquier valor numérico, summary.total_earned se preserva', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: 0, max: 1e9, noNaN: true }),
        fc.integer({ min: 0, max: 1000 }),
        async (earned, services) => {
          jest.clearAllMocks();
          (earningsApi.getSummary as jest.Mock).mockResolvedValue(
            makeSummary({ total_earned: earned, total_services: services }),
          );
          (earningsApi.getLiquidations as jest.Mock).mockResolvedValue([]);

          const { result } = renderHook(() => useEarnings());
          await waitFor(() => expect(result.current.loading).toBe(false));

          expect(typeof result.current.summary?.total_earned).toBe('number');
          expect(result.current.summary?.total_earned).toBe(earned);
        },
      ),
      { numRuns: 50 },
    );
  });
});
