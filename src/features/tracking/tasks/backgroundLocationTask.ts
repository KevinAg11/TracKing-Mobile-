import * as TaskManager from 'expo-task-manager';
import * as ExpoLocation from 'expo-location';
import { locationApi } from '../api/locationApi';

export const BACKGROUND_LOCATION_TASK = 'tracking-background-location';

/**
 * Background location task — must be defined at module level (outside any component).
 * Registered in index.ts so it's available before the React tree mounts.
 *
 * Rules:
 * - Uses sendFromBackground() which reads the token directly from SecureStore,
 *   avoiding dependency on the Zustand store (may be uninitialized in background).
 * - If backend responds 400 (courier not IN_SERVICE), stops the task.
 * - Network errors are swallowed silently to avoid crashing the background process.
 */
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: TaskManager.TaskManagerTaskBody<{ locations: ExpoLocation.LocationObject[] }>) => {
  if (error) {
    console.warn('[BackgroundTracking] Task error:', error.message);
    return;
  }

  if (!data?.locations?.length) return;

  const { latitude, longitude, accuracy } = data.locations[0].coords;

  try {
    await locationApi.sendFromBackground({
      latitude,
      longitude,
      // accuracy is in meters — omit if null/undefined (do NOT send 0)
      ...(accuracy != null && { accuracy }),
    });
  } catch (err: any) {
    // 400 = courier not IN_SERVICE — stop background tracking
    if (err?.response?.status === 400) {
      const isRunning = await ExpoLocation.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => false);
      if (isRunning) {
        await ExpoLocation.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => {});
      }
    }
    // All other errors (network, timeout) are silently swallowed
  }
});
