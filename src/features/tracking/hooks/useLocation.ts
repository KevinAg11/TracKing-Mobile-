import { useEffect, useRef, useCallback } from 'react';
import * as ExpoLocation from 'expo-location';
import { locationApi } from '../api/locationApi';
import { BACKGROUND_LOCATION_TASK } from '../tasks/backgroundLocationTask';

const INTERVAL_MS = 15_000;

interface UseLocationOptions {
  /** Tracking only runs when this is true (service status === IN_TRANSIT) */
  active: boolean;
}

/**
 * Manages foreground + background location tracking.
 *
 * Lifecycle:
 *  active=true  → request permissions → start background task → start foreground interval
 *  active=false → stop background task → clear foreground interval
 *
 * Error handling:
 *  - Backend 400 → stop tracking (courier left IN_SERVICE state)
 *  - Network errors → swallowed silently (must not interrupt courier flow)
 *
 * Background task is defined in tasks/backgroundLocationTask.ts and registered
 * in index.ts before the React tree mounts.
 */
export function useLocation({ active }: UseLocationOptions) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const foregroundGranted = useRef(false);
  const backgroundGranted = useRef(false);
  const stoppedByBackend = useRef(false);

  // ── Permission helpers ────────────────────────────────────────────────────

  const requestForegroundPermission = useCallback(async (): Promise<boolean> => {
    if (foregroundGranted.current) return true;
    const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
    foregroundGranted.current = status === 'granted';
    return foregroundGranted.current;
  }, []);

  const requestBackgroundPermission = useCallback(async (): Promise<boolean> => {
    if (backgroundGranted.current) return true;
    const { status } = await ExpoLocation.requestBackgroundPermissionsAsync();
    backgroundGranted.current = status === 'granted';
    return backgroundGranted.current;
  }, []);

  // ── Stop helpers ──────────────────────────────────────────────────────────

  const stopForeground = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const stopBackground = useCallback(async () => {
    try {
      const isRunning = await ExpoLocation.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      if (isRunning) {
        await ExpoLocation.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      }
    } catch {
      // Ignore — task may not be registered in Expo Go dev mode
    }
  }, []);

  const stopAll = useCallback(async () => {
    stopForeground();
    await stopBackground();
  }, [stopForeground, stopBackground]);

  // ── Send location (foreground) ────────────────────────────────────────────

  const sendLocation = useCallback(async () => {
    if (stoppedByBackend.current) return;

    try {
      const granted = await requestForegroundPermission();
      if (!granted) return;

      const loc = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
      });

      await locationApi.send({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy ?? 0,
      });
    } catch (err: any) {
      if (err?.response?.status === 400) {
        // Backend says courier is not IN_SERVICE — stop tracking
        stoppedByBackend.current = true;
        stopForeground();
        await stopBackground();
      }
      // All other errors (network, GPS) are swallowed silently
    }
  }, [requestForegroundPermission, stopForeground, stopBackground]);

  // ── Start background task ─────────────────────────────────────────────────

  const startBackground = useCallback(async () => {
    try {
      const hasBackground = await requestBackgroundPermission();
      if (!hasBackground) return;

      const isRunning = await ExpoLocation.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      if (isRunning) return; // already running

      await ExpoLocation.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: ExpoLocation.Accuracy.Balanced,
        timeInterval: INTERVAL_MS,
        distanceInterval: 10,
        showsBackgroundLocationIndicator: true, // iOS: blue bar
        foregroundService: {
          // Android 8+: required persistent notification for background location
          notificationTitle: 'Tracking activo',
          notificationBody: 'Tu ubicación está siendo compartida durante el servicio.',
          notificationColor: '#2563EB',
        },
      });
    } catch {
      // expo-task-manager is not available in Expo Go — foreground-only fallback
    }
  }, [requestBackgroundPermission]);

  // ── Effect: start/stop based on active flag ───────────────────────────────

  useEffect(() => {
    if (!active) {
      stoppedByBackend.current = false; // reset for next activation
      stopAll();
      return;
    }

    stoppedByBackend.current = false;

    // Start background task first (persists when app is minimized)
    startBackground();

    // Foreground: send immediately, then every 15s
    sendLocation();
    intervalRef.current = setInterval(sendLocation, INTERVAL_MS);

    return () => {
      stopAll();
    };
  }, [active, sendLocation, startBackground, stopAll]);
}
