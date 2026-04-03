# Guía de integración — Tracking en tiempo real (Mobile)

> Guía para el desarrollador de la app móvil del mensajero (React Native).
> Cubre autenticación, flujo de jornada, reporte de ubicación en background y manejo de estados de servicio.

---

## Stack recomendado

| Librería | Uso |
|----------|-----|
| `axios` o `fetch` | Llamadas HTTP al backend |
| `expo-location` | Obtener GPS del dispositivo |
| `expo-task-manager` | Ejecutar tracking en background |
| `@react-native-async-storage/async-storage` | Persistir el token JWT |

```bash
npx expo install expo-location expo-task-manager
npm install @react-native-async-storage/async-storage axios
```

---

## Base URL y autenticación

```ts
const BASE_URL = 'http://localhost:3000'; // cambiar por URL de producción

// Todas las llamadas requieren este header (excepto login)
const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
};
```

> El token se obtiene en el login y se guarda en AsyncStorage. El `courier_id` y `company_id` nunca se envían en el body — el backend los resuelve desde el JWT.

---

## 1. Autenticación

### Login

```ts
// POST /api/auth/login
const res = await fetch(`${BASE_URL}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});

const { data } = await res.json();
// data.role debe ser "COURIER"

await AsyncStorage.setItem('token', data.token);
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-usuario",
    "name": "Carlos Ruiz",
    "email": "carlos@empresa.com",
    "role": "COURIER",
    "company_id": "uuid-empresa"
  }
}
```

### Logout

```ts
// POST /api/auth/logout
await fetch(`${BASE_URL}/api/auth/logout`, { method: 'POST', headers });
await AsyncStorage.removeItem('token');
```

---

## 2. Perfil del mensajero

Llamar al abrir la app para conocer el estado operacional actual.

```ts
// GET /api/courier/me
const res = await fetch(`${BASE_URL}/api/courier/me`, { headers });
const { data } = await res.json();

// data.operational_status: "UNAVAILABLE" | "AVAILABLE" | "IN_SERVICE"
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-mensajero",
    "document_id": "1234567890",
    "phone": "3001234567",
    "operational_status": "UNAVAILABLE",
    "user": { "name": "Carlos Ruiz", "email": "carlos@empresa.com" }
  }
}
```

---

## 3. Gestión de jornada

### Iniciar jornada

Transición: `UNAVAILABLE → AVAILABLE`

```ts
// POST /api/courier/jornada/start
const res = await fetch(`${BASE_URL}/api/courier/jornada/start`, {
  method: 'POST',
  headers,
});
```

**Error 400:** Si el mensajero no está en `UNAVAILABLE`.

### Finalizar jornada

Transición: `AVAILABLE → UNAVAILABLE`

```ts
// POST /api/courier/jornada/end
const res = await fetch(`${BASE_URL}/api/courier/jornada/end`, {
  method: 'POST',
  headers,
});
```

**Error 400:** Si hay servicios activos (`ASSIGNED`, `ACCEPTED` o `IN_TRANSIT`), o si el estado no es `AVAILABLE`.

---

## 4. Servicios asignados

```ts
// GET /api/courier/services
const res = await fetch(`${BASE_URL}/api/courier/services`, { headers });
const { data } = await res.json(); // array de servicios
```

### Cambiar estado de un servicio

```ts
// POST /api/courier/services/:id/status
await fetch(`${BASE_URL}/api/courier/services/${serviceId}/status`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ status: 'ACCEPTED' }),
});
```

**Transiciones válidas:**

```
ASSIGNED   → ACCEPTED
ACCEPTED   → IN_TRANSIT
IN_TRANSIT → DELIVERED   ← requiere subir evidencia primero
```

**Error 400:** Transición inválida o falta evidencia para `DELIVERED`.

### Subir evidencia

Debe hacerse antes de marcar como `DELIVERED`. El servicio debe estar en `IN_TRANSIT`.
El endpoint acepta `multipart/form-data` con el campo `file`.

```ts
// POST /api/courier/services/:id/evidence
// Content-Type: multipart/form-data

import * as ImagePicker from 'expo-image-picker';

async function subirEvidencia(serviceId: string) {
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.7,
  });

  if (result.canceled) return;

  const asset = result.assets[0];
  const formData = new FormData();
  formData.append('file', {
    uri: asset.uri,
    name: 'evidencia.jpg',
    type: 'image/jpeg',
  } as any);

  await fetch(`${BASE_URL}/api/courier/services/${serviceId}/evidence`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      // NO agregar Content-Type manualmente
    },
    body: formData,
  });
}
```

Formatos permitidos: `jpg`, `png`, `webp`. Tamaño máximo: 5 MB.

> Re-subir reemplaza la evidencia anterior (upsert).

---

## 5. Reporte de ubicación (tracking)

Este es el núcleo del módulo. El mensajero envía su posición cada ~15 segundos mientras está en estado `IN_SERVICE`.

> El backend solo acepta ubicaciones cuando el mensajero está `IN_SERVICE`. Si el estado es otro, retorna `400`.

### Envío simple (foreground)

```ts
import * as Location from 'expo-location';

async function reportarUbicacion(token: string) {
  const { coords } = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  await fetch(`${BASE_URL}/api/courier/location`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy ?? undefined,
    }),
  });
}
```

### Loop de tracking (foreground)

```ts
let trackingInterval: ReturnType<typeof setInterval> | null = null;

function iniciarTracking(token: string) {
  trackingInterval = setInterval(() => reportarUbicacion(token), 15_000);
}

function detenerTracking() {
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
  }
}
```

### Tracking en background (recomendado para producción)

Con `expo-task-manager` el tracking sigue funcionando aunque la app esté minimizada.

```ts
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';

const TRACKING_TASK = 'background-location-task';

// Definir la tarea (fuera de cualquier componente, al nivel del módulo)
TaskManager.defineTask(TRACKING_TASK, async ({ data, error }: any) => {
  if (error) return;
  const { locations } = data;
  const { latitude, longitude, accuracy } = locations[0].coords;

  const token = await AsyncStorage.getItem('token');
  if (!token) return;

  await fetch(`${BASE_URL}/api/courier/location`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ latitude, longitude, accuracy }),
  }).catch(() => {}); // silenciar errores de red en background
});

// Iniciar tracking en background
async function iniciarTrackingBackground() {
  const { status } = await Location.requestBackgroundPermissionsAsync();
  if (status !== 'granted') return;

  await Location.startLocationUpdatesAsync(TRACKING_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 15_000,       // cada 15 segundos
    distanceInterval: 10,       // o cada 10 metros (lo que ocurra primero)
    showsBackgroundLocationIndicator: true, // iOS: muestra el indicador azul
    foregroundService: {        // Android: notificación persistente requerida
      notificationTitle: 'Tracking activo',
      notificationBody: 'Tu ubicación está siendo compartida',
    },
  });
}

// Detener tracking en background
async function detenerTrackingBackground() {
  const isRunning = await Location.hasStartedLocationUpdatesAsync(TRACKING_TASK);
  if (isRunning) {
    await Location.stopLocationUpdatesAsync(TRACKING_TASK);
  }
}
```

**Permisos requeridos en `app.json`:**

```json
{
  "expo": {
    "plugins": [
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "La app necesita tu ubicación para compartirla durante el servicio.",
          "isAndroidBackgroundLocationEnabled": true
        }
      ]
    ]
  }
}
```

---

## 6. Flujo completo de una jornada

```
1.  Login                          POST /api/auth/login
2.  Cargar perfil                  GET  /api/courier/me
3.  Iniciar jornada                POST /api/courier/jornada/start
                                        → estado: AVAILABLE
4.  Ver servicios asignados        GET  /api/courier/services
5.  Aceptar servicio               POST /api/courier/services/:id/status  { "status": "ACCEPTED" }
6.  Salir a recoger                POST /api/courier/services/:id/status  { "status": "IN_TRANSIT" }
                                        → estado mensajero: IN_SERVICE
7.  Iniciar tracking               iniciarTrackingBackground()
        └─ loop cada 15s           POST /api/courier/location  { lat, lng, accuracy }
8.  Llegar al destino
9.  Subir evidencia                POST /api/courier/services/:id/evidence  multipart/form-data (campo: file)
10. Marcar como entregado          POST /api/courier/services/:id/status  { "status": "DELIVERED" }
                                        → estado mensajero: AVAILABLE
11. Detener tracking               detenerTrackingBackground()
12. Finalizar jornada              POST /api/courier/jornada/end
                                        → estado: UNAVAILABLE
13. Logout                         POST /api/auth/logout
```

---

## 7. Manejo de errores comunes

| Código | Causa probable | Acción recomendada |
|--------|---------------|-------------------|
| `400` en `/location` | Mensajero no está `IN_SERVICE` | Detener el tracking loop |
| `400` en `/jornada/end` | Hay servicios activos | Mostrar aviso al mensajero |
| `400` en `/status DELIVERED` | Falta evidencia | Redirigir a pantalla de evidencia |
| `401` | Token expirado | Llamar `/api/auth/refresh` y reintentar |
| `404` en `/me` | Perfil de mensajero no existe | Mostrar error de configuración |

### Refresh automático del token

```ts
async function fetchWithRefresh(url: string, options: RequestInit): Promise<Response> {
  let res = await fetch(url, options);

  if (res.status === 401) {
    // Intentar renovar el token
    const refresh = await fetch(`${BASE_URL}/api/auth/refresh`, { method: 'POST' });
    if (!refresh.ok) {
      // Sesión expirada — redirigir al login
      await AsyncStorage.removeItem('token');
      throw new Error('SESSION_EXPIRED');
    }
    // Reintentar la llamada original con el nuevo token
    const newToken = await AsyncStorage.getItem('token');
    res = await fetch(url, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${newToken}` },
    });
  }

  return res;
}
```

---

## Referencia rápida de endpoints

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| POST | `/api/auth/login` | Público | Login |
| POST | `/api/auth/logout` | COURIER | Logout |
| POST | `/api/auth/refresh` | Público | Renovar token |
| GET | `/api/courier/me` | COURIER | Mi perfil |
| POST | `/api/courier/jornada/start` | COURIER | Iniciar jornada |
| POST | `/api/courier/jornada/end` | COURIER | Finalizar jornada |
| GET | `/api/courier/services` | COURIER | Mis servicios |
| POST | `/api/courier/services/:id/status` | COURIER | Cambiar estado |
| POST | `/api/courier/services/:id/evidence` | COURIER | Subir evidencia |
| POST | `/api/courier/location` | COURIER | Reportar ubicación |

---

## Notas importantes

- El mobile **no usa WebSocket**. Solo HTTP. El WebSocket es exclusivo del frontend web (admin).
- El `courier_id` nunca se envía en el body. El backend lo resuelve desde el JWT.
- El tracking solo funciona cuando el mensajero está en estado `IN_SERVICE` (tiene un servicio en `IN_TRANSIT`).
- En iOS, el background location requiere que el usuario otorgue permiso "Siempre". Mostrar una explicación clara antes de solicitarlo.
- En Android, la notificación persistente del `foregroundService` es obligatoria para background location en Android 8+.
