import * as fc from 'fast-check';
import { renderHook, act } from '@testing-library/react-native';
import { useLocation } from '@/features/tracking/hooks/useLocation';
import * as ExpoLocation from 'expo-location';
import { locationApi } from '@/features/tracking/api/locationApi';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  requestBackgroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  hasStartedLocationUpdatesAsync: jest.fn(),
  startLocationUpdatesAsync: jest.fn(),
  stopLocationUpdatesAsync: jest.fn(),
  Accuracy: { Balanced: 3, High: 4 },
}));

jest.mock('@/features/tracking/tasks/backgroundLocationTask', () => ({
  BACKGROUND_LOCATION_TASK: 'tracking-background-location',
}));

jest.mock('@/features/tracking/api/locationApi', () => ({
  locationApi: { send: jest.fn() },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockCoords = { latitude: 4.71, longitude: -74.07, accuracy: 10 };

function makeAxiosError(status: number) {
  const err: any = new Error(`Request failed with status ${status}`);
  err.response = { status };
  return err;
}

function setupMocks({
  foreground = 'granted',
  background = 'granted',
  bgRunning = false,
}: { foreground?: string; background?: string; bgRunning?: boolean } = {}) {
  (ExpoLocation.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: foreground });
  (ExpoLocation.requestBackgroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: background });
  (ExpoLocation.getCurrentPositionAsync as jest.Mock).mockResolvedValue({ coords: mockCoords });
  (ExpoLocation.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(bgRunning);
  (ExpoLocation.startLocationUpdatesAsync as jest.Mock).mockResolvedValue(undefined);
  (ExpoLocation.stopLocationUpdatesAsync as jest.Mock).mockResolvedValue(undefined);
  (locationApi.send as jest.Mock).mockResolvedValue(undefined);
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  setupMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

// ─── Inactivo ─────────────────────────────────────────────────────────────────

describe('useLocation — inactivo', () => {
  it('no envía ubicación cuando active=false', async () => {
    renderHook(() => useLocation({ active: false }));
    await act(async () => { jest.runAllTimers(); });
    expect(locationApi.send).not.toHaveBeenCalled();
  });

  it('no solicita permisos cuando está inactivo', async () => {
    renderHook(() => useLocation({ active: false }));
    await act(async () => { await Promise.resolve(); });
    expect(ExpoLocation.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });
});

// ─── Tracking en primer plano ─────────────────────────────────────────────────

describe('useLocation — foreground tracking', () => {
  it('envía ubicación inmediatamente al activarse', async () => {
    renderHook(() => useLocation({ active: true }));
    await act(async () => { await Promise.resolve(); });
    expect(locationApi.send).toHaveBeenCalledTimes(1);
    expect(locationApi.send).toHaveBeenCalledWith({
      latitude: 4.71,
      longitude: -74.07,
      accuracy: 10,
    });
  });

  it('envía ubicación de nuevo a los 15 segundos', async () => {
    renderHook(() => useLocation({ active: true }));
    await act(async () => { await Promise.resolve(); });
    expect(locationApi.send).toHaveBeenCalledTimes(1);
    await act(async () => {
      jest.advanceTimersByTime(15_000);
      await Promise.resolve();
    });
    expect(locationApi.send).toHaveBeenCalledTimes(2);
  });

  it('envía 3 veces en 30 segundos (inicial + 2 intervalos)', async () => {
    renderHook(() => useLocation({ active: true }));
    await act(async () => { await Promise.resolve(); });
    await act(async () => {
      jest.advanceTimersByTime(30_000);
      await Promise.resolve();
    });
    expect(locationApi.send).toHaveBeenCalledTimes(3);
  });

  it('no envía cuando el permiso de primer plano es denegado', async () => {
    setupMocks({ foreground: 'denied' });
    renderHook(() => useLocation({ active: true }));
    await act(async () => { await Promise.resolve(); });
    expect(locationApi.send).not.toHaveBeenCalled();
  });

  it('deja de enviar al desactivarse', async () => {
    const { rerender } = renderHook<void, { active: boolean }>(
      ({ active }) => useLocation({ active }),
      { initialProps: { active: true } },
    );
    await act(async () => { await Promise.resolve(); });
    const callsBefore = (locationApi.send as jest.Mock).mock.calls.length;
    rerender({ active: false });
    await act(async () => {
      jest.advanceTimersByTime(30_000);
      await Promise.resolve();
    });
    expect((locationApi.send as jest.Mock).mock.calls.length).toBe(callsBefore);
  });
});

// ─── Manejo de errores ────────────────────────────────────────────────────────

describe('useLocation — manejo de errores', () => {
  it('errores de red se ignoran silenciosamente', async () => {
    (locationApi.send as jest.Mock).mockRejectedValue(new Error('Network error'));
    expect(() => renderHook(() => useLocation({ active: true }))).not.toThrow();
    await act(async () => { await Promise.resolve(); });
  });

  it('respuesta 400 del backend detiene el tracking en primer plano', async () => {
    (locationApi.send as jest.Mock).mockRejectedValueOnce(makeAxiosError(400));
    renderHook(() => useLocation({ active: true }));
    await act(async () => { await Promise.resolve(); });
    await act(async () => {
      jest.advanceTimersByTime(30_000);
      await Promise.resolve();
    });
    expect(locationApi.send).toHaveBeenCalledTimes(1);
  });

  it('respuesta 400 del backend detiene la tarea en segundo plano', async () => {
    setupMocks({ bgRunning: true });
    (locationApi.send as jest.Mock).mockRejectedValueOnce(makeAxiosError(400));
    renderHook(() => useLocation({ active: true }));
    await act(async () => { await Promise.resolve(); });
    expect(ExpoLocation.stopLocationUpdatesAsync).toHaveBeenCalledWith('tracking-background-location');
  });

  it('errores distintos de 400 no detienen el tracking', async () => {
    (locationApi.send as jest.Mock)
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValue(undefined);
    renderHook(() => useLocation({ active: true }));
    await act(async () => { await Promise.resolve(); });
    await act(async () => {
      jest.advanceTimersByTime(15_000);
      await Promise.resolve();
    });
    expect(locationApi.send).toHaveBeenCalledTimes(2);
  });
});

// ─── Tracking en segundo plano ────────────────────────────────────────────────

describe('useLocation — background tracking', () => {
  it('solicita permiso de segundo plano al activarse', async () => {
    renderHook(() => useLocation({ active: true }));
    await act(async () => { await Promise.resolve(); });
    expect(ExpoLocation.requestBackgroundPermissionsAsync).toHaveBeenCalled();
  });

  it('inicia la tarea de segundo plano con los parámetros correctos', async () => {
    renderHook(() => useLocation({ active: true }));
    await act(async () => { await Promise.resolve(); });
    expect(ExpoLocation.startLocationUpdatesAsync).toHaveBeenCalledWith(
      'tracking-background-location',
      expect.objectContaining({ timeInterval: 15_000, distanceInterval: 10 }),
    );
  });

  it('no inicia la tarea si ya está corriendo', async () => {
    setupMocks({ bgRunning: true });
    renderHook(() => useLocation({ active: true }));
    await act(async () => { await Promise.resolve(); });
    expect(ExpoLocation.startLocationUpdatesAsync).not.toHaveBeenCalled();
  });

  it('no inicia la tarea si el permiso es denegado', async () => {
    setupMocks({ background: 'denied' });
    renderHook(() => useLocation({ active: true }));
    await act(async () => { await Promise.resolve(); });
    expect(ExpoLocation.startLocationUpdatesAsync).not.toHaveBeenCalled();
  });

  it('detiene la tarea al desactivarse', async () => {
    setupMocks({ bgRunning: true });
    const { rerender } = renderHook<void, { active: boolean }>(
      ({ active }) => useLocation({ active }),
      { initialProps: { active: true } },
    );
    await act(async () => { await Promise.resolve(); });
    rerender({ active: false });
    await act(async () => { await Promise.resolve(); });
    expect(ExpoLocation.stopLocationUpdatesAsync).toHaveBeenCalledWith('tracking-background-location');
  });
});

// ─── Reactivación ─────────────────────────────────────────────────────────────

describe('useLocation — reactivación', () => {
  it('reanuda el envío tras reactivarse', async () => {
    const { rerender } = renderHook<void, { active: boolean }>(
      ({ active }) => useLocation({ active }),
      { initialProps: { active: true } },
    );
    await act(async () => { await Promise.resolve(); });
    rerender({ active: false });
    await act(async () => { await Promise.resolve(); });
    jest.clearAllMocks();
    setupMocks();
    rerender({ active: true });
    await act(async () => { await Promise.resolve(); });
    expect(locationApi.send).toHaveBeenCalledTimes(1);
  });

  it('resetea stoppedByBackend al reactivarse tras un 400', async () => {
    (locationApi.send as jest.Mock).mockRejectedValueOnce(makeAxiosError(400));
    const { rerender } = renderHook<void, { active: boolean }>(
      ({ active }) => useLocation({ active }),
      { initialProps: { active: true } },
    );
    await act(async () => { await Promise.resolve(); });
    rerender({ active: false });
    await act(async () => { await Promise.resolve(); });
    jest.clearAllMocks();
    setupMocks();
    rerender({ active: true });
    await act(async () => { await Promise.resolve(); });
    expect(locationApi.send).toHaveBeenCalledTimes(1);
  });
});

// ─── PBT: active=false nunca envía ubicación ─────────────────────────────────

describe('P-1: active=false nunca envía ubicación (PBT)', () => {
  it('P-1: sin importar el tiempo transcurrido, active=false → send nunca se llama', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 120_000 }),
        async (ms) => {
          jest.clearAllMocks();
          setupMocks();
          renderHook(() => useLocation({ active: false }));
          await act(async () => {
            jest.advanceTimersByTime(ms);
            await Promise.resolve();
          });
          expect(locationApi.send).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 50 },
    );
  });
});

// ─── PBT: coordenadas enviadas coinciden con las del GPS ─────────────────────

describe('P-2: las coordenadas enviadas al backend coinciden con las del GPS (PBT)', () => {
  it('P-2: para cualquier par lat/lng, locationApi.send recibe exactamente esos valores', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: -90, max: 90, noNaN: true }),
        fc.float({ min: -180, max: 180, noNaN: true }),
        async (lat, lng) => {
          jest.clearAllMocks();
          (ExpoLocation.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
          (ExpoLocation.requestBackgroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
          (ExpoLocation.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(false);
          (ExpoLocation.startLocationUpdatesAsync as jest.Mock).mockResolvedValue(undefined);
          (ExpoLocation.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
            coords: { latitude: lat, longitude: lng, accuracy: 5 },
          });
          (locationApi.send as jest.Mock).mockResolvedValue(undefined);

          renderHook(() => useLocation({ active: true }));
          await act(async () => { await Promise.resolve(); });

          expect(locationApi.send).toHaveBeenCalledWith(
            expect.objectContaining({ latitude: lat, longitude: lng }),
          );
        },
      ),
      { numRuns: 50 },
    );
  });
});
