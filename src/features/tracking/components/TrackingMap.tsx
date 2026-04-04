import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import * as ExpoLocation from 'expo-location';
import { colors } from '@/shared/ui/colors';
import { fontSize, fontWeight } from '@/shared/ui/typography';

interface Coords {
  latitude: number;
  longitude: number;
}

interface TrackingMapProps {
  active: boolean;
}

/**
 * Displays the courier's current GPS coordinates while a service is active.
 * Uses a single location read on mount — the actual periodic tracking is
 * handled by useLocation (ServiceDetailScreen). This component only shows
 * the current position for display purposes, without creating a second loop.
 *
 * Replace the coordinate display with a MapView (react-native-maps) when
 * that dependency is added to the project.
 */
export function TrackingMap({ active }: TrackingMapProps) {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;

    const getLocation = async () => {
      setLoading(true);
      setError(null);
      try {
        const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (!cancelled) setError('Permiso de ubicación denegado');
          return;
        }
        const loc = await ExpoLocation.getCurrentPositionAsync({
          accuracy: ExpoLocation.Accuracy.Balanced,
        });
        if (!cancelled) {
          setCoords({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        }
      } catch {
        if (!cancelled) setError('No se pudo obtener la ubicación');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    // Single read on activation — useLocation in ServiceDetailScreen
    // handles the periodic 15s loop that sends data to the backend.
    getLocation();

    return () => {
      cancelled = true;
    };
  }, [active]);

  if (!active) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Sin servicio activo</Text>
        <Text style={styles.placeholderSub}>El tracking se activa cuando inicias una ruta</Text>
      </View>
    );
  }

  if (loading && !coords) {
    return (
      <View style={styles.placeholder}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.placeholderSub}>Obteniendo ubicación...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.activeBadge}>
        <View style={styles.dot} />
        <Text style={styles.activeText}>Tracking activo</Text>
      </View>

      {coords && (
        <View style={styles.coordsCard}>
          <Text style={styles.coordsLabel}>Ubicación actual</Text>
          <Text style={styles.coordsValue}>
            {coords.latitude.toFixed(6)}, {coords.longitude.toFixed(6)}
          </Text>
          <Text style={styles.interval}>Actualización cada 15 segundos</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
  },
  placeholderText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: '#6B7280',
  },
  placeholderSub: {
    fontSize: fontSize.sm,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  errorText: { fontSize: fontSize.sm, color: colors.danger, textAlign: 'center' },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  activeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: '#15803D',
  },
  coordsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  coordsLabel: {
    fontSize: fontSize.xs,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  coordsValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.neutral800,
    fontVariant: ['tabular-nums'],
  },
  interval: {
    fontSize: fontSize.xs,
    color: '#9CA3AF',
    marginTop: 6,
  },
});
