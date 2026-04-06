import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors } from '@/shared/ui/colors';
import { fontSize, fontWeight } from '@/shared/ui/typography';

interface TrackingMapProps {
  active: boolean;
  /** Latitude from useLocation — no second GPS read needed */
  latitude: number | null;
  /** Longitude from useLocation — no second GPS read needed */
  longitude: number | null;
  /** True when the user denied location permission */
  permissionDenied?: boolean;
}

/**
 * Displays the courier's current GPS position on an interactive map.
 *
 * Uses WebView + Leaflet (OpenStreetMap tiles) — same tile provider as the
 * web frontend. No API key required, works in Expo Go without a dev build.
 *
 * Coords come from useLocation (ServiceDetailScreen) — this component does NOT
 * make its own GPS call. That avoids a double read and keeps a single source of truth.
 *
 * The map HTML is rebuilt via useMemo whenever coords change (every ~15s).
 */
export function TrackingMap({ active, latitude, longitude, permissionDenied }: TrackingMapProps) {
  const mapHtml = useMemo(() => {
    if (latitude == null || longitude == null) return null;
    return buildLeafletHtml(latitude, longitude);
  }, [latitude, longitude]);

  // ── Not active ────────────────────────────────────────────────────────────
  if (!active) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Sin servicio activo</Text>
        <Text style={styles.placeholderSub}>El mapa se activa cuando inicias una ruta</Text>
      </View>
    );
  }

  // ── Permission denied ─────────────────────────────────────────────────────
  if (permissionDenied) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.errorText}>Permiso de ubicación denegado</Text>
        <Text style={styles.placeholderSub}>Actívalo en Ajustes para ver el mapa</Text>
      </View>
    );
  }

  // ── Waiting for first GPS fix ─────────────────────────────────────────────
  if (!mapHtml) {
    return (
      <View style={styles.placeholder}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.placeholderSub}>Obteniendo ubicación...</Text>
      </View>
    );
  }

  // ── Map ───────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Active badge */}
      <View style={styles.activeBadge}>
        <View style={styles.dot} />
        <Text style={styles.activeText}>Tracking activo</Text>
      </View>

      {/* Leaflet map via WebView */}
      <View style={styles.mapWrapper}>
        <WebView
          source={{ html: mapHtml }}
          style={styles.webview}
          scrollEnabled={false}
          bounces={false}
          // Allow loading remote Leaflet CDN assets
          mixedContentMode="always"
          originWhitelist={['*']}
          // Disable JS console errors bubbling to RN
          onError={() => {}}
        />
      </View>

      {/* Coords footer */}
      <View style={styles.coordsRow}>
        <Text style={styles.coordsText}>
          {latitude!.toFixed(6)}, {longitude!.toFixed(6)}
        </Text>
        <Text style={styles.intervalText}>Actualización cada 15 s</Text>
      </View>
    </View>
  );
}

// ── Leaflet HTML builder ──────────────────────────────────────────────────────

function buildLeafletHtml(lat: number, lng: number): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    /* Hide Leaflet attribution to save space on mobile */
    .leaflet-control-attribution { display: none; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: true, attributionControl: false })
               .setView([${lat}, ${lng}], 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    // Custom pulsing marker for the courier's own position
    var pulseIcon = L.divIcon({
      className: '',
      html: '<div style="width:18px;height:18px;border-radius:50%;background:#2563EB;border:3px solid #fff;box-shadow:0 0 0 4px rgba(37,99,235,0.3);"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });

    L.marker([${lat}, ${lng}], { icon: pulseIcon })
     .addTo(map)
     .bindPopup('Tu ubicación actual')
     .openPopup();
  </script>
</body>
</html>`;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
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
  errorText: {
    fontSize: fontSize.sm,
    color: colors.danger,
    textAlign: 'center',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
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
  mapWrapper: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 280,
    backgroundColor: '#E5E7EB',
  },
  webview: {
    flex: 1,
  },
  coordsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  coordsText: {
    fontSize: fontSize.xs,
    color: '#6B7280',
    fontVariant: ['tabular-nums'],
  },
  intervalText: {
    fontSize: fontSize.xs,
    color: '#9CA3AF',
  },
});
