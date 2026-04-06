# Phase 06 — GPS Tracking

## Overview

Automatically reports the courier's GPS location to the backend while a service is `IN_TRANSIT`. Stops when the service transitions out of that state or the backend returns `400`. The courier's position is also displayed on an interactive map inside the service detail screen.

---

## Architecture

```
ServiceDetailScreen
  └── useLocation({ active: service.status === 'IN_TRANSIT' })
        ├── returns { latitude, longitude, permissionDenied }
        ├── foreground: getCurrentPositionAsync every 15s → locationApi.send()
        └── background: expo-task-manager task → locationApi.sendFromBackground()

TrackingMap
  └── receives coords from useLocation (no second GPS read)
  └── renders WebView + Leaflet (OpenStreetMap tiles)
```

---

## API Endpoint

| Method | Path | Auth | Body |
|--------|------|------|------|
| POST | `/api/courier/location` | Bearer JWT (COURIER role) | `{ latitude, longitude, accuracy? }` |

- `courier_id` is resolved from the JWT — never sent in the body
- Backend validates the mensajero is in `IN_SERVICE` state; returns `400` otherwise
- Trigger: mobile activates tracking when `operationalStatus === 'IN_SERVICE'` (mensajero state, not service state)

---

## Rules

- Location sent every **15 seconds** (foreground interval + background task)
- Only when service status is `IN_TRANSIT`
- On `400` response: stop all tracking (courier left `IN_SERVICE` state)
- Network errors are swallowed silently — must not interrupt courier flow
- `accuracy` field is **omitted** if `null` (never send `0` — means "perfect precision")
- Background task reads token directly from `SecureStore` (Zustand store may be uninitialized)

---

## Files

```
src/features/tracking/
├── api/
│   └── locationApi.ts          # send() for foreground, sendFromBackground() for background task
├── components/
│   └── TrackingMap.tsx         # WebView + Leaflet map, receives coords from useLocation
├── hooks/
│   └── useLocation.ts          # manages foreground interval + background task, returns coords
└── tasks/
    └── backgroundLocationTask.ts  # expo-task-manager task, uses sendFromBackground()
```

---

## Map Implementation — WebView + Leaflet

The map uses **react-native-webview** with **Leaflet 1.9.4** and **OpenStreetMap** tiles — the same tile provider as the web frontend. No API key required, works in Expo Go without a native dev build.

### Why WebView + Leaflet (not react-native-maps)

| | WebView + Leaflet | react-native-maps |
|---|---|---|
| API key required | No | Yes (Google Maps on Android) |
| Works in Expo Go | Yes | No (needs dev build) |
| Tile provider | OpenStreetMap (same as frontend) | Google Maps / Apple Maps |
| Setup complexity | Low | High (native config) |
| Production ready | Good enough for courier display | Better for complex interactions |

### How it works

1. `useLocation` returns `{ latitude, longitude, permissionDenied }` after each GPS read
2. `TrackingMap` receives those coords as props — **no second GPS call**
3. `buildLeafletHtml(lat, lng)` generates a self-contained HTML string with Leaflet
4. `WebView` renders the HTML; `useMemo` rebuilds it only when coords change
5. The courier's position is shown as a blue pulsing dot marker

### Map HTML structure

```html
<!-- Leaflet CSS + JS from unpkg CDN -->
<!-- MapContainer centered on courier coords, zoom 16 -->
<!-- Custom divIcon: blue circle with white border + glow ring -->
<!-- Popup: "Tu ubicación actual" -->
```

### Upgrade path to react-native-maps

When a native dev build is available, replace `TrackingMap.tsx` with:
```tsx
import MapView, { Marker } from 'react-native-maps';
// MapView with region centered on { latitude, longitude }
// Marker at courier position
```
The `useLocation` hook and `locationApi` remain unchanged.

---

## Background Task

The background task (`backgroundLocationTask.ts`) runs via `expo-task-manager` even when the app is minimized or the screen is off.

**Token strategy:** reads directly from `expo-secure-store` via `secureStorage.getToken()` instead of Zustand. This guarantees the token is available even if the JS process was restarted by the OS.

```ts
// locationApi.sendFromBackground() — used by background task
const token = await secureStorage.getToken();
await axios.post(`${BASE_URL}/api/courier/location`, payload, {
  headers: { Authorization: `Bearer ${token}` }
});
```

---

## Completion Criteria

- [x] Location permission requested before starting
- [x] Permission denial shows non-blocking warning in TrackingMap
- [x] Location sent every 15s when service is IN_TRANSIT
- [x] Background task sends location when app is minimized
- [x] Background task reads token from SecureStore (not Zustand)
- [x] `accuracy` omitted when null (not sent as 0)
- [x] 400 response stops foreground interval and background task
- [x] Network errors swallowed silently
- [x] TrackingMap shows interactive Leaflet map (WebView)
- [x] TrackingMap reads coords from useLocation (no double GPS read)
- [ ] Upgrade to react-native-maps when native dev build is available
