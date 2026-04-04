import { renderHook, act } from '@testing-library/react-native';
import { useLocation } from '@/features/tracking/hooks/useLocation';
import * as ExpoLocation from 'expo-location';
import { locationApi } from '@/features/tracking/api/locationApi';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  requestBackgroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  hasStartedLocationUpdatesAsync: jest.fn(),
  startLocationUpdatesAsync: jest.fn(),
  stopLocationUpdatesAsync: jest.fn(),
  Accuracy: { Balanced: 3, High: 4 },
}));

// backgroundLocationTask imports expo-task-manager — mock it to avoid side effects in tests
jest.mock('@/features/tracking/tasks/backgroundLocationTask', () => ({
  BACKGROUND_LOCATION_TASK: 'tracking-background-location',
}));

jest.mock('@/features/tracking/api/locationApi', () => ({
  locationApi: { send: jest.fn() },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

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
}: {
  foreground?: string;
  background?: string;
  bgRunning?: boolean;
} = {}) {
  (ExpoLocation.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: foreground });
  (ExpoLocation.requestBackgroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: background });
  (ExpoLocation.getCurrentPositionAsync as jest.Mock).mockResolvedValue({ coords: mockCoords });
  (ExpoLocation.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(bgRunning);
  (ExpoLocation.startLocationUpdatesAsync as jest.Mock).mockResolvedValue(undefined);
  (ExpoLocation.stopLocationUpdatesAsync as jest.Mock).mockResolvedValue(undefined);
  (locationApi.send as jest.Mock).mockResolvedValue(undefined);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  setupMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useLocation — inactive', () => {
  it('does not send location when active=false', async () => {
    renderHook(() => useLocation({ active: false }));
    await act(async () => { jest.runAllTimers(); });
    expect(locationApi.send).not.toHaveBeenCalled();
  });

  it('does not request permissions when inactive', async () => {
    renderHook(() => useLocation({ active: false }));
    await act(async () => { await Promise.resolve(); });
    expect(ExpoLocation.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });
});

describe('useLocation — foreground tracking', () => {
  it('sends location immediately on activation', async () => {
    renderHook(() => useLocation({ active: true }));
    await act(async () => { await Promise.resolve(); });
    expect(locationApi.send).toHaveBeenCalledTimes(1);
    expect(locationApi.send).toHaveBeenCalledWith({
      latitude: 4.71,
      longitude: -74.07,
      accuracy: 10,
    });
  });

  it('sends location again after 15 seconds', async () => {
    renderHook(() => useLocation({ active: true }));
    // initial send
    await act(async () => { await Promise.resolve(); });
    expect(locationApi.send).toHaveBeenCalledTimes(1);

    // advance 15s
    await act(async () => {
      jest.advanceTimersByTime(15_000);
      await Promise.resolve();
    });
    expect(locationApi.send).toHaveBeenCalledTimes(2);
  });

  it('sends location 3 times after 30 seconds (initial + 2 intervals)', async () => {
    renderHook(() => useLocation({ active: true }));
    await act(async () => { await Promise.resolve(); });
    await act(async () => {
      jest.advanceTimersByTime(30_000);
      await Promise.resolve();
    });
    expect(locationApi.send).toHaveBeenCalledTimes(3);
  });

  it('does not send when foreground permission is denied', async () => {
    setupMocks({ foreground: 'denied' });
    renderHook(() => useLocation({ active: true }));
    await act(async () => { await Promise.resolve(); });
    expect(locationApi.send).not.toHaveBeenCalled();
  });

  it('stops sending when deactivated', async () => {
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

describe('useLocation — error handling', () => {
  it('swallows network errors silently (does not throw)', async () => {
    (locationApi.send as jest.Mock).mockRejectedValue(new Error('Network error'));
    expect(() => renderHook(() => useLocation({ active: true }))).not.toThrow();
    await act(async () => { await Promise.resolve(); });
  });

  it('stops foreground tracking when backend responds 400', async () => {
    (locationApi.send as jest.Mock)
      .mockRejectedValueOnce(makeAxiosError(400));

    renderHook(() => useLocation({ active: true }));
    await act(async () => { await Promise.resolve(); });

    // After 400, interval should be cleared — no more sends
    await act(async () => {
      jest.advanceTimersByTime(30_000);
      await Promise.resolve();
    });

    // Only the initial call that returned 400
    expect(locationApi.send).toHaveBeenCalledTimes(1);
  });

  it('stops background task when backend responds 400', async () => {
    setupMocks({ bgRunning: true });
    (locationApi.send as jest.Mock).mockRejectedValueOnce(makeAxiosError(400));

    renderHook(() => useLocation({ active: true }));
    await act(async () => { await Promise.resolve(); });

    expect(ExpoLocation.stopLocationUpdatesAsync).toHaveBeenCalledWith('tracking-background-location');
  });

  it('does not stop tracking on non-400 errors', async () => {
    (locationApi.send as jest.Mock)
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValue(undefined);

    renderHook(() => useLocation({ active: true }));
    await act(async () => { await Promise.resolve(); });

    // Advance 15s — should still send (not stopped)
    await act(async () => {
      jest.advanceTimersByTime(15_000);
      await Promise.resolve();
    });

    expect(locationApi.send).toHaveBeenCalledTimes(2);
  });
});

describe('useLocation — background tracking', () => {
  it('requests background permission when active', async () => {
    renderHook(() => useLocation({ active: true }));
    await act(async () => { await Promise.resolve(); });
    expect(ExpoLocation.requestBackgroundPermissionsAsync).toHaveBeenCalled();
  });

  it('starts background location updates when permission granted', async () => {
    renderHook(() => useLocation({ active: true }));
    await act(async () => { await Promise.resolve(); });
    expect(ExpoLocation.startLocationUpdatesAsync).toHaveBeenCalledWith(
      'tracking-background-location',
      expect.objectContaining({
        timeInterval: 15_000,
        distanceInterval: 10,
      }),
    );
  });

  it('does not start background task if already running', async () => {
    setupMocks({ bgRunning: true });
    renderHook(() => useLocation({ active: true }));
    await act(async () => { await Promise.resolve(); });
    expect(ExpoLocation.startLocationUpdatesAsync).not.toHaveBeenCalled();
  });

  it('does not start background task if permission denied', async () => {
    setupMocks({ background: 'denied' });
    renderHook(() => useLocation({ active: true }));
    await act(async () => { await Promise.resolve(); });
    expect(ExpoLocation.startLocationUpdatesAsync).not.toHaveBeenCalled();
  });

  it('stops background task on deactivation', async () => {
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

describe('useLocation — reactivation', () => {
  it('resumes sending after being reactivated', async () => {
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

  it('resets stoppedByBackend flag on reactivation after 400', async () => {
    (locationApi.send as jest.Mock).mockRejectedValueOnce(makeAxiosError(400));

    const { rerender } = renderHook<void, { active: boolean }>(
      ({ active }) => useLocation({ active }),
      { initialProps: { active: true } },
    );
    await act(async () => { await Promise.resolve(); });

    // Deactivate then reactivate
    rerender({ active: false });
    await act(async () => { await Promise.resolve(); });

    jest.clearAllMocks();
    setupMocks();

    rerender({ active: true });
    await act(async () => { await Promise.resolve(); });

    // Should send again after reactivation
    expect(locationApi.send).toHaveBeenCalledTimes(1);
  });
});
