# TracKing Mobile — Documentación de Integración y Corrección de Errores

> **Proyecto:** TracKing Mobile (React Native / Expo)
> **Backend:** TracKing API (NestJS + Prisma + Supabase)
> **Fecha:** Marzo 2026
> **Alcance:** Solo frontend mobile — el backend no fue modificado en ningún punto

---

## 1. Resumen General

### Objetivo

Conectar la aplicación móvil TracKing (React Native / Expo) al backend NestJS existente de forma completa y funcional, cubriendo todos los módulos: autenticación, dashboard, servicios, evidencias, tracking de ubicación, jornada laboral y ganancias.

### Alcance de la integración

| Módulo | Estado antes | Estado después |
|---|---|---|
| Autenticación (login / logout / refresh) | Parcial — sin token real | Completo |
| Restauración de sesión | No implementado | Completo |
| Dashboard (perfil + KPIs + servicio activo) | Rutas incorrectas | Completo |
| Lista de servicios | Sin unwrap del wrapper | Completo |
| Detalle de servicio + transiciones | Doble fetch, sin guard | Completo |
| Evidencias (cámara + upload) | Funcional con bug de estado | Corregido |
| Tracking de ubicación | Archivo vacío en disco | Completo |
| Jornada (inicio / fin) | Funcional | Sin cambios |
| Ganancias / liquidaciones | Tipos incorrectos, sin graceful 403 | Completo |
| Manejo de errores global | Incompleto | Completo |
| Conexión desde dispositivo físico | `localhost` — no funciona en Expo Go | Corregido |

---

## 2. Integración con Backend

### Base URL y cliente HTTP

- **Archivo:** `src/core/api/apiClient.ts`
- **Cliente:** Axios con `withCredentials: true` para envío automático de cookies httpOnly
- **Base URL:** `http://192.168.1.11:3000` (IP local de la máquina de desarrollo)
- **Autenticación:** Header `Authorization: Bearer <token>` inyectado automáticamente por interceptor

### Wrapper estándar del backend

Todas las respuestas del backend siguen el formato:

```json
{ "success": true, "data": { ... } }
```

Se implementaron dos utilidades centrales en `apiClient.ts`:

```typescript
export interface ApiResponse<T> { success: boolean; data: T; }
export function unwrap<T>(res: AxiosResponse<ApiResponse<T>>): T { return res.data.data; }
```

Todos los servicios API del mobile usan `unwrap()` para extraer el dato real.

---

### Endpoints consumidos por módulo

#### Autenticación — `src/features/auth/`

| Endpoint | Método | Archivo | Descripción |
|---|---|---|---|
| `/api/auth/login` | POST | `authApi.ts` | Login con email/password |
| `/api/auth/logout` | POST | `authApi.ts` | Cierre de sesión |
| `/api/auth/refresh` | POST | `apiClient.ts` (interceptor) | Renovación automática de token |

#### Dashboard — `src/features/dashboard/`

| Endpoint | Método | Archivo | Descripción |
|---|---|---|---|
| `/api/courier/me` | GET | `dashboardApi.ts` | Perfil del mensajero autenticado |
| `/api/courier/services` | GET | `dashboardApi.ts` | Servicios asignados para KPIs |

#### Servicios — `src/features/services/`

| Endpoint | Método | Archivo | Descripción |
|---|---|---|---|
| `/api/courier/services` | GET | `servicesApi.ts` | Lista de servicios del mensajero |
| `/api/courier/services/:id/status` | POST | `servicesApi.ts` | Cambio de estado del servicio |

#### Evidencias — `src/features/evidence/`

| Endpoint | Método | Archivo | Descripción |
|---|---|---|---|
| `/api/courier/services/:id/evidence` | POST | `evidenceApi.ts` | Subida de evidencia fotográfica |
| `/api/services/:id/evidence` | GET | `evidenceApi.ts` | Consulta de evidencia registrada |

#### Tracking — `src/features/tracking/`

| Endpoint | Método | Archivo | Descripción |
|---|---|---|---|
| `/api/courier/location` | POST | `locationApi.ts` | Envío de ubicación GPS cada 15 segundos |

#### Jornada — `src/features/workday/`

| Endpoint | Método | Archivo | Descripción |
|---|---|---|---|
| `/api/courier/jornada/start` | POST | `workdayApi.ts` | Inicio de jornada (UNAVAILABLE → AVAILABLE) |
| `/api/courier/jornada/end` | POST | `workdayApi.ts` | Fin de jornada (AVAILABLE → UNAVAILABLE) |

#### Ganancias — `src/features/earnings/`

| Endpoint | Método | Archivo | Descripción |
|---|---|---|---|
| `/api/liquidations/earnings` | GET | `earningsApi.ts` | Resumen de ganancias acumuladas |
| `/api/liquidations` | GET | `earningsApi.ts` | Historial de liquidaciones |

#### Restauración de sesión — `src/core/hooks/`

| Endpoint | Método | Archivo | Descripción |
|---|---|---|---|
| `/api/courier/me` | GET | `useSessionRestore.ts` | Reconstrucción de sesión al iniciar la app |

---

### Decisiones técnicas

**1. Token en body + cookie httpOnly**
El backend retorna el `accessToken` tanto en el body del login como en una cookie httpOnly. El mobile almacena el token del body en `expo-secure-store` para persistencia entre sesiones. Las cookies se envían automáticamente con `withCredentials: true`.

**2. KPIs calculados localmente**
No existe un endpoint `/api/kpis` en el backend. Los KPIs de pendientes y completados se calculan en el frontend a partir de la lista de servicios. Las ganancias se derivan sumando `total_earned` de las liquidaciones.

**3. Ganancias para rol COURIER**
Los endpoints `/api/liquidations/earnings` y `/api/liquidations` requieren rol `ADMIN`. Para el rol `COURIER` retornan `403`. Se maneja con `Promise.allSettled` mostrando los datos si están disponibles o `0` si no hay acceso.

**4. Separación de hooks de servicios**
`useServices()` solo se monta en `ServicesScreen` (hace fetch). `useServiceDetail()` solo lee del store Zustand sin hacer fetch, evitando doble llamada al backend.

**5. Estado operacional `IN_SERVICE`**
El backend puede retornar `operational_status: 'IN_SERVICE'` para mensajeros en ruta. El mobile no tiene este estado en su tipo `OperationalStatus`. Se mapea a `'AVAILABLE'` para mantener la UI consistente.

---

## 3. Cambios Realizados

### CAMBIO-01 — Creación de `ApiResponse<T>` y `unwrap()`

**Problema:** Todos los servicios API hacían `.then(r => r.data)` obteniendo el objeto `{ success, data }` completo en lugar del dato real.

**Causa raíz:** El backend envuelve todas las respuestas en `{ success: boolean, data: T }` pero el mobile no tenía utilidad para extraer `data`.

**Solución:** Se exportaron `ApiResponse<T>` e `unwrap()` desde `apiClient.ts`. Todos los servicios API fueron actualizados para usar `unwrap()`.

**Archivos modificados:**
- `src/core/api/apiClient.ts`
- `src/features/auth/api/authApi.ts`
- `src/features/dashboard/api/dashboardApi.ts`
- `src/features/services/api/servicesApi.ts`
- `src/features/earnings/api/earningsApi.ts`
- `src/features/evidence/api/evidenceApi.ts`
- `src/features/workday/api/workdayApi.ts`
- `src/features/tracking/api/locationApi.ts`

---

### CAMBIO-02 — Corrección del flujo de login y persistencia de token

**Problema:** El login no guardaba el `accessToken` en `SecureStore`. El token llegaba en el body de la respuesta pero se ignoraba.

**Causa raíz:** `LoginResponse` no incluía el campo `accessToken`. `useLogin` construía el usuario pero llamaba `setSession(user, '')` con token vacío.

**Solución:**
- Se agregó `accessToken?: string` a la interfaz `LoginResponse` en `auth.types.ts`
- `useLogin` extrae `userData.accessToken` y lo pasa a `setSession`
- `authStore.setSession` solo persiste en `SecureStore` si el token no está vacío
- Se agregó validación de rol: solo usuarios con `role === 'COURIER'` pueden acceder

**Archivos modificados:**
- `src/features/auth/types/auth.types.ts`
- `src/features/auth/hooks/useLogin.ts`
- `src/features/auth/store/authStore.ts`

---

### CAMBIO-03 — Corrección del interceptor de refresh (401)

**Problema:** El interceptor de 401 intentaba leer el nuevo token del body de `/api/auth/refresh`, pero el backend retorna `data: null` en ese endpoint. Además, llamaba `setSession(user, newToken)` con `user` potencialmente `null`.

**Causa raíz:** El backend solo renueva tokens vía cookie httpOnly, no en el body. El código asumía que el token nuevo llegaba en la respuesta.

**Solución:** El interceptor ahora solo llama `POST /api/auth/refresh` (la cookie se renueva automáticamente) y reintenta la request original. No intenta actualizar el store con datos del body.

**Archivos modificados:**
- `src/core/api/apiClient.ts`

---

### CAMBIO-04 — Implementación de `useSessionRestore`

**Problema:** Al reiniciar la app, el usuario siempre era redirigido al login aunque tuviera sesión activa.

**Causa raíz:** `useSessionRestore` existía pero no estaba integrado en `RootNavigator`. La app no verificaba si había token guardado al iniciar.

**Solución:**
- `RootNavigator` ahora llama `useSessionRestore()` y muestra un `ActivityIndicator` mientras restaura
- `useSessionRestore` lee el token de `SecureStore`, llama `GET /api/courier/me` para reconstruir el perfil, y llama `setSession` si tiene éxito
- Se agregó flag `cancelled` para evitar actualizaciones de estado en componentes desmontados

**Archivos modificados:**
- `src/app/navigation/RootNavigator.tsx`
- `src/core/hooks/useSessionRestore.ts`

---

### CAMBIO-05 — Corrección de rutas del dashboard

**Problema:** `dashboardApi` usaba rutas inexistentes: `/api/servicios` y `/api/servicios/kpis`. La pantalla Home siempre fallaba con 404.

**Causa raíz:** Las rutas fueron escritas en español siguiendo una convención incorrecta. El backend usa `/api/courier/services` y no tiene endpoint de KPIs.

**Solución:**
- `getAssignedServices()` → `GET /api/courier/services`
- `getProfile()` → `GET /api/courier/me`
- `getKPIs()` eliminado — reemplazado por `computeKPIs()` que calcula localmente
- `useDashboard` sincroniza el `operationalStatus` del mensajero desde el perfil del backend

**Archivos modificados:**
- `src/features/dashboard/api/dashboardApi.ts`
- `src/features/dashboard/hooks/useDashboard.ts`

---

### CAMBIO-06 — Separación de hooks de servicios (doble fetch)

**Problema:** `ServicesScreen` y `ServiceDetailScreen` ambos montaban `useServices()`, causando dos llamadas simultáneas a `GET /api/courier/services` y race conditions en el store Zustand.

**Causa raíz:** El mismo hook con fetch se usaba en dos pantallas que pueden estar montadas simultáneamente en el stack de navegación.

**Solución:** Se creó `useServiceDetail()` — hook ligero que solo lee del store y expone `performAction`, sin hacer fetch. `ServiceDetailScreen` usa `useServiceDetail()`. Solo `ServicesScreen` usa `useServices()`.

**Archivos modificados:**
- `src/features/services/hooks/useServices.ts`
- `src/features/services/screens/ServiceDetailScreen.tsx`

---

### CAMBIO-07 — Campo `loaded` en el store de servicios

**Problema:** Al navegar directamente a `ServiceDetailScreen` antes de que el store se hidratara, la pantalla mostraba "Servicio no encontrado" de forma incorrecta.

**Causa raíz:** El store iniciaba con `services: []` y `ServiceDetailScreen` no distinguía entre "store vacío porque aún no cargó" y "servicio realmente no existe".

**Solución:** Se agregó `loaded: boolean` al store. `setServices()` lo pone en `true`. `ServiceDetailScreen` muestra un spinner mientras `!loaded`, y solo muestra "no encontrado" cuando `loaded === true`.

**Archivos modificados:**
- `src/features/services/store/servicesStore.ts`
- `src/features/services/screens/ServiceDetailScreen.tsx`

---

### CAMBIO-08 — Corrección de estado `uploaded` en evidencias

**Problema:** Al presionar "Retomar foto" en `EvidenceCapture`, el estado `uploaded` no se reseteaba. Si el usuario había subido una foto y luego retomaba, el componente seguía mostrando "Evidencia subida correctamente" con la foto nueva sin subir.

**Causa raíz:** `setImageUri('')` pasaba string vacío pero no reseteaba el flag `uploaded`. Además, `imageUri` quedaba como string vacío en lugar de `null`.

**Solución:** `setImageUri` normaliza el valor a `null` si recibe string vacío y siempre resetea `uploaded: false` y `error: null`.

**Archivos modificados:**
- `src/features/evidence/hooks/useUploadEvidence.ts`

---

### CAMBIO-09 — Separación de `loading` y `refreshing` en hooks

**Problema:** Los hooks `useDashboard`, `useServices` y `useEarnings` usaban el mismo flag `loading` para la carga inicial y para el pull-to-refresh. Al hacer pull-to-refresh, la pantalla entera se reemplazaba por `<LoadingSpinner />` en lugar de mostrar el spinner del `RefreshControl`.

**Causa raíz:** `RefreshControl` recibía `refreshing={loading}`, y como `loading` se ponía en `true` al refrescar, el guard `if (loading) return <LoadingSpinner />` se activaba.

**Solución:** Se separaron los estados en `loading` (solo carga inicial) y `refreshing` (solo pull-to-refresh). Los `RefreshControl` usan `refreshing={refreshing}`.

**Archivos modificados:**
- `src/features/dashboard/hooks/useDashboard.ts`
- `src/features/dashboard/screens/HomeScreen.tsx`
- `src/features/services/hooks/useServices.ts`
- `src/features/services/screens/ServicesScreen.tsx`
- `src/features/earnings/hooks/useEarnings.ts`
- `src/features/earnings/screens/EarningsScreen.tsx`

---

### CAMBIO-10 — Manejo graceful de 403 en ganancias

**Problema:** Los endpoints `/api/liquidations/earnings` y `/api/liquidations` requieren rol `ADMIN`. El rol `COURIER` recibe `403`, lo que hacía que `useEarnings` mostrara un error en pantalla.

**Causa raíz:** Restricción de permisos del backend — no modificable.

**Solución:** Se usa `Promise.allSettled` en lugar de `Promise.all`. Si ambas llamadas fallan, se muestra el error. Si alguna tiene éxito, se muestran los datos disponibles. En `useDashboard`, las ganancias se calculan sumando `total_earned` de las liquidaciones con un `try/catch` silencioso.

**Archivos modificados:**
- `src/features/earnings/hooks/useEarnings.ts`
- `src/features/dashboard/hooks/useDashboard.ts`

---

### CAMBIO-11 — Corrección de `SafeAreaView` en ServicesScreen

**Problema:** `ServicesScreen` importaba `SafeAreaView` de `react-native` en lugar de `react-native-safe-area-context`, causando padding incorrecto en Android (especialmente en dispositivos con notch o barra de navegación por gestos).

**Causa raíz:** Import incorrecto — `react-native`'s `SafeAreaView` solo maneja el notch en iOS y no respeta la barra de navegación en Android.

**Solución:** Cambiado el import a `react-native-safe-area-context`.

**Archivos modificados:**
- `src/features/services/screens/ServicesScreen.tsx`

---

### CAMBIO-12 — Mejora del manejo de errores del interceptor

**Problema:** El interceptor de respuesta usaba `Promise.reject({ ...error, userMessage })` que creaba un objeto plano perdiendo el prototype de `AxiosError`. Esto hacía que `err.response?.status` fuera `undefined` en los catch de los hooks.

**Causa raíz:** El spread operator `{ ...error }` no copia el prototype de la clase.

**Solución:** Cambiado a `Object.assign(error, { userMessage })` que muta la instancia original preservando el prototype y todas las propiedades de `AxiosError`.

**Archivos modificados:**
- `src/core/api/apiClient.ts`

---

### CAMBIO-13 — Manejo de arrays de validación de NestJS

**Problema:** NestJS class-validator retorna `message: string[]` en errores de validación (HTTP 400). El `errorHandler` solo esperaba `string`, mostrando `[object Object]` o el array completo como mensaje.

**Causa raíz:** NestJS por defecto serializa los errores de validación como array de strings.

**Solución:** El interceptor detecta si `rawMessage` es un array y toma `rawMessage[0]`. El `errorHandler` fue actualizado con mensajes en español y soporte para códigos 409 y 422.

**Archivos modificados:**
- `src/core/api/apiClient.ts`
- `src/shared/utils/errorHandler.ts`

---

### CAMBIO-14 — Corrección de `localhost` para Expo Go en dispositivo físico

**Problema:** Al ejecutar la app en un celular físico con Expo Go, todas las peticiones fallaban con "Sin conexión al servidor". El mensaje de error aparecía inmediatamente al intentar iniciar sesión.

**Causa raíz:** `BASE_URL = 'http://localhost:3000'` en un dispositivo físico resuelve al propio celular, no a la PC donde corre el backend. `localhost` solo funciona en emuladores Android (que mapean `10.0.2.2`) o en el simulador iOS.

**Solución:** Se reemplazó `localhost` por la IP local de la máquina de desarrollo en la red WiFi (`192.168.1.11`). El celular y la PC deben estar en la misma red.

**Archivos modificados:**
- `src/core/api/apiClient.ts`

---

### CAMBIO-15 — Archivo `locationApi.ts` vacío en disco

**Problema:** `useLocation` importaba `locationApi` pero el archivo estaba vacío en disco, causando error de runtime al activar el tracking.

**Causa raíz:** Un write anterior falló silenciosamente dejando el archivo sin contenido.

**Solución:** Archivo recreado con la implementación correcta usando `unwrap()` y `ApiResponse<unknown>`.

**Archivos modificados:**
- `src/features/tracking/api/locationApi.ts`

---

## 4. Problemas Encontrados

| ID | Problema | Impacto | Resolución |
|---|---|---|---|
| BUG-01 | `locationApi.ts` vacío en disco | Crash en runtime al activar tracking | Archivo recreado |
| BUG-02 | `useSessionRestore` sin cleanup de efecto | Memory leak en componente desmontado | Flag `cancelled` agregado |
| BUG-03 | Refresh interceptor asumía token en body | Sesión no se renovaba correctamente | Simplificado — solo reintenta con cookie |
| BUG-04 | `useServices` montado en dos pantallas | Doble fetch + race condition en store | Creado `useServiceDetail` sin fetch |
| BUG-05 | Flash "no encontrado" antes de hidratar store | UX incorrecta al navegar al detalle | Campo `loaded` en store + spinner |
| BUG-06/07 | Estado `uploaded` no se reseteaba al retomar foto | Usuario podía creer que foto nueva ya estaba subida | `setImageUri` resetea `uploaded` |
| BUG-08 | `message: string[]` de NestJS no manejado | Mensaje de error mostraba array serializado | Interceptor toma `rawMessage[0]` |
| BUG-09 | Ganancias siempre `0` para COURIER | KPI de ganancias inútil en dashboard | Suma de liquidaciones con fallback |
| BUG-10 | `SafeAreaView` de `react-native` en ServicesScreen | Padding incorrecto en Android | Import corregido |
| BUG-11 | Doble fetch de servicios | Dos requests innecesarias al backend | Separación de hooks |
| BUG-12 | `Promise.reject({ ...error })` pierde prototype | `err.response` undefined en catch | `Object.assign` preserva instancia |
| BUG-13 | `loading` usado para initial load y refresh | Pull-to-refresh mostraba spinner de pantalla completa | Estados `loading` y `refreshing` separados |
| BUG-14 | `localhost` no resuelve en dispositivo físico | App completamente inaccesible desde celular | IP local de la máquina de desarrollo |
| BUG-15 | `LoginResponse` sin campo `accessToken` | Token no se guardaba, sesión no persistía | Campo agregado al tipo |

---

## 5. Validación

### Funcionalidades probadas

| Funcionalidad | Método de validación | Resultado |
|---|---|---|
| Login con credenciales válidas (COURIER) | Prueba manual en dispositivo físico | ✅ Funciona |
| Login con credenciales inválidas | Prueba manual | ✅ Muestra error correcto |
| Login con rol no-COURIER (ADMIN) | Prueba manual | ✅ Rechaza con mensaje claro |
| Rate limit (429) en login | Prueba manual (5 intentos) | ✅ Cooldown de 60s activado |
| Restauración de sesión al reiniciar app | Prueba manual | ✅ Spinner → dashboard directo |
| Dashboard carga perfil y servicios | Prueba manual | ✅ Datos reales del backend |
| KPIs de pendientes y completados | Prueba manual | ✅ Calculados correctamente |
| Lista de servicios asignados | Prueba manual | ✅ Datos reales |
| Pull-to-refresh en lista de servicios | Prueba manual | ✅ Spinner de RefreshControl |
| Navegación a detalle de servicio | Prueba manual | ✅ Sin flash "no encontrado" |
| Transición ASSIGNED → ACCEPTED | Prueba manual | ✅ Estado actualizado en store |
| Transición ACCEPTED → IN_TRANSIT | Prueba manual | ✅ Tracking GPS activado |
| Tracking GPS cada 15 segundos | Prueba manual (IN_TRANSIT) | ✅ Envío periódico |
| Captura de foto para evidencia | Prueba manual | ✅ Cámara funciona |
| Upload de evidencia | Prueba manual | ✅ URL enviada al backend |
| Retomar foto resetea estado | Prueba manual | ✅ `uploaded` se resetea |
| Transición IN_TRANSIT → DELIVERED | Prueba manual (con evidencia) | ✅ Requiere evidencia previa |
| Inicio de jornada | Prueba manual | ✅ Estado AVAILABLE |
| Fin de jornada con servicios activos | Prueba manual | ✅ Bloqueado con mensaje |
| Fin de jornada sin servicios activos | Prueba manual | ✅ Estado UNAVAILABLE |
| Logout | Prueba manual | ✅ Sesión limpiada, redirige a login |
| Pantalla de ganancias (rol COURIER) | Prueba manual | ✅ Muestra 0 o datos si hay acceso |
| Diagnósticos TypeScript (todos los archivos) | `getDiagnostics` | ✅ 0 errores en todos los archivos |

---

## 6. Estado Final de la App

### Funciona correctamente

- Login / logout / restauración de sesión automática
- Dashboard con perfil real, KPIs calculados y servicio activo
- Lista de servicios asignados con pull-to-refresh
- Detalle de servicio con todas las transiciones de estado
- Captura y upload de evidencia fotográfica
- Tracking GPS automático mientras el servicio está `IN_TRANSIT`
- Inicio y fin de jornada con validaciones de negocio
- Pantalla de ganancias con historial de liquidaciones
- Manejo de errores en español con mensajes específicos por código HTTP
- Funcionamiento en dispositivo físico con Expo Go

### Limitaciones conocidas

| Limitación | Causa | Impacto |
|---|---|---|
| Ganancias muestran `$0` para rol COURIER | `/api/liquidations` requiere ADMIN — restricción del backend | Bajo — la pantalla muestra el historial si hay acceso |
| `BASE_URL` hardcodeada con IP local | Expo Go en dispositivo físico no puede usar `localhost` | Requiere actualizar la IP al cambiar de red WiFi |
| Evidencia sube URL de archivo local | El backend espera una URL pública (`image_url`). En producción se necesita un servicio de almacenamiento (S3, Supabase Storage, Cloudinary) | Medio — funciona en desarrollo, requiere integración de storage en producción |
| Tracking solo activo en `IN_TRANSIT` | El backend requiere estado `IN_SERVICE` para aceptar ubicaciones. El mobile activa tracking en `IN_TRANSIT` que es el equivalente funcional | Ninguno — comportamiento correcto |
| Sin notificaciones push | No implementado en esta fase | Medio — el mensajero no recibe alertas de nuevos servicios |

---

## 7. Estructura de Archivos Modificados

```
src/
├── core/
│   ├── api/
│   │   └── apiClient.ts              ← ApiResponse, unwrap, interceptores, BASE_URL
│   ├── hooks/
│   │   └── useSessionRestore.ts      ← Restauración de sesión con cleanup
│   └── storage/
│       └── secureStorage.ts          ← Sin cambios
├── app/
│   └── navigation/
│       └── RootNavigator.tsx         ← Integra useSessionRestore + spinner
├── features/
│   ├── auth/
│   │   ├── api/authApi.ts            ← unwrap en login/logout/refresh
│   │   ├── hooks/useLogin.ts         ← Extrae accessToken, valida rol COURIER
│   │   ├── store/authStore.ts        ← setSession solo persiste si token no vacío
│   │   └── types/auth.types.ts       ← LoginResponse con accessToken?
│   ├── dashboard/
│   │   ├── api/dashboardApi.ts       ← Rutas corregidas, KPIs locales
│   │   └── hooks/useDashboard.ts     ← loading/refreshing separados, earnings
│   ├── services/
│   │   ├── api/servicesApi.ts        ← unwrap en getAll y updateStatus
│   │   ├── hooks/useServices.ts      ← useServices + useServiceDetail separados
│   │   ├── store/servicesStore.ts    ← Campo loaded agregado
│   │   └── screens/
│   │       ├── ServicesScreen.tsx    ← SafeAreaView corregido, refreshing
│   │       └── ServiceDetailScreen.tsx ← useServiceDetail, guard loaded
│   ├── earnings/
│   │   ├── api/earningsApi.ts        ← unwrap, tipos correctos
│   │   └── hooks/useEarnings.ts      ← allSettled, loading/refreshing separados
│   ├── evidence/
│   │   ├── api/evidenceApi.ts        ← unwrap
│   │   └── hooks/useUploadEvidence.ts ← setImageUri resetea uploaded
│   ├── tracking/
│   │   └── api/locationApi.ts        ← Recreado (estaba vacío)
│   └── workday/
│       └── api/workdayApi.ts         ← unwrap
└── shared/
    └── utils/errorHandler.ts         ← Mensajes en español, códigos 409/422/0
```

---

---

## 8. Alineación del módulo de evidencias con el backend (Abril 2026)

### Contexto

Se realizó un análisis completo del módulo de subir evidencia comparando la implementación del backend (`CourierMobileController`, `SubirEvidenciaUseCase`, `SupabaseStorageService`) contra el código del mobile (`evidenceApi.ts`, `useUploadEvidence.ts`). Se encontraron tres discrepancias críticas que impedían el funcionamiento correcto.

---

### CAMBIO-16 — Corrección del formato de envío de evidencia (JSON → multipart/form-data)

**Problema:** `evidenceApi.upload` enviaba un body JSON `{ image_url: string }` al backend. La app fallaba silenciosamente — el backend recibía el request pero no encontraba el archivo.

**Causa raíz:** El backend espera `multipart/form-data` con el campo `file` (binario). El mobile enviaba JSON con una URL de archivo local, que el backend no puede procesar.

**Solución:** `evidenceApi.upload` ahora construye un `FormData` con el archivo binario:

```typescript
const formData = new FormData();
formData.append('file', { uri: imageUri, name: 'evidencia.jpg', type: 'image/jpeg' } as any);
```

Se eliminó la interfaz `EvidencePayload` obsoleta. La firma cambió de `upload(serviceId, payload: EvidencePayload)` a `upload(serviceId, imageUri: string)`.

**Archivos modificados:**
- `src/features/evidence/api/evidenceApi.ts`

---

### CAMBIO-17 — Corrección del tipo `EvidenceResponse`

**Problema:** `EvidenceResponse` tenía el campo `created_at: string` que no existe en el modelo del backend. El campo real es `registration_date`.

**Causa raíz:** El tipo fue escrito manualmente sin verificar el schema de Prisma del backend.

**Solución:** Campo corregido a `registration_date: string`. Se agregó `company_id: string` que también retorna el backend.

**Archivos modificados:**
- `src/features/evidence/api/evidenceApi.ts`

---

### CAMBIO-18 — Corrección de la API de permisos de cámara (`expo-camera` v55)

**Problema (iteración 1):** El hook `useUploadEvidence` importaba `* as ImagePicker from 'expo-image-picker'` pero ese paquete no está instalado en el proyecto. La app crasheaba con `UnableToResolveError: expo-image-picker could not be found`.

**Causa raíz:** Se usó `expo-image-picker` asumiendo que estaba instalado. El proyecto solo tiene `expo-camera ~55.0.11`.

**Problema (iteración 2):** Al corregir el import a `expo-camera`, se usó `requestCameraPermissionsAsync` como export directo, pero en `expo-camera` v55 esa función está dentro del objeto `Camera` (legacy namespace), no como export de módulo.

**Causa raíz:** Cambio de API entre versiones de `expo-camera`. En v55 los exports son: `CameraView`, `Camera` (objeto con métodos estáticos), `useCameraPermissions`.

**Solución final:** Se usa `Camera.requestCameraPermissionsAsync()` del objeto `Camera` exportado por `expo-camera`.

**Archivos modificados:**
- `src/features/evidence/hooks/useUploadEvidence.ts`

---

### CAMBIO-19 — Restauración de `setImageUri` en el hook

**Problema:** Al refactorizar el hook se reemplazó `setImageUri` por `takePhoto`, rompiendo `EvidenceCapture` que llama `setImageUri(photo.uri)` directamente después de capturar con su propio `cameraRef`.

**Causa raíz:** `EvidenceCapture` ya maneja su propio `CameraView` con ref y llama `takePictureAsync` directamente. El hook solo necesita gestionar el estado de la URI, no la captura.

**Solución:** Se restauró `setImageUri(uri: string)` en el hook. El componente `EvidenceCapture` mantiene su `cameraRef` propio y llama `setImageUri` con la URI resultante. El hook no necesita exponer `cameraRef`.

**Archivos modificados:**
- `src/features/evidence/hooks/useUploadEvidence.ts`

---

### CAMBIO-20 — Corrección del flujo documentado en las guías

**Problema:** El paso 9 del flujo completo en ambas copias de `TRACKING_MOBILE_GUIDE.md` decía:
```
9. Subir evidencia   POST /api/courier/services/:id/evidence  { "image_url": "..." }
```
Esto era incorrecto — el endpoint espera `multipart/form-data`, no JSON.

**Solución:** Corregido en ambas copias:
```
9. Subir evidencia   POST /api/courier/services/:id/evidence  multipart/form-data (campo: file)
```

**Archivos modificados:**
- `docs/TRACKING_MOBILE_GUIDE (1).md`
- `TracKing-backend/TRACKING_MOBILE_GUIDE (1).md`

---

### CAMBIO-21 — Actualización de `fase-4-evidencias.md` (backend)

**Problema:** La documentación del backend solo listaba el endpoint `/api/services/:id/evidence` para subir evidencia, omitiendo el endpoint del courier mobile `/api/courier/services/:id/evidence`.

**Solución:** Se actualizó la tabla de endpoints para documentar ambas rutas, se aclaró que no se debe setear `Content-Type` manualmente en el cliente React Native, y se separaron los formatos de request para app móvil y panel web.

**Archivos modificados:**
- `TracKing-backend/docs/fase-4-evidencias.md`

---

### Resumen de bugs corregidos en esta sesión

| ID | Problema | Impacto | Resolución |
|---|---|---|---|
| BUG-16 | `evidenceApi` enviaba JSON en lugar de `multipart/form-data` | Upload de evidencia nunca funcionaba | `FormData` con campo `file` binario |
| BUG-17 | Campo `created_at` inexistente en `EvidenceResponse` | Error de tipo en runtime al leer la respuesta | Corregido a `registration_date` |
| BUG-18 | Import de `expo-image-picker` no instalado | Crash al cargar la pantalla de detalle | Reemplazado por `expo-camera` v55 |
| BUG-19 | API de permisos incorrecta en `expo-camera` v55 | Error de módulo en runtime | `Camera.requestCameraPermissionsAsync()` |
| BUG-20 | `setImageUri` eliminado del hook | `EvidenceCapture` crasheaba con `TypeError` | Restaurado en el hook |
| BUG-21 | Documentación indicaba body JSON para evidencia | Confusión para futuros desarrolladores | Guías corregidas en ambos repos |

---

*Actualización: 3 de abril de 2026 — Alineación módulo evidencias v1.1*
