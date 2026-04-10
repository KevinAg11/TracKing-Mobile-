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


---

## 9. Implementación completa del sistema de tracking en tiempo real (Abril 2026)

### Contexto

Se implementó el punto 5 de la guía `TRACKING_MOBILE_GUIDE.md` — reporte de ubicación en tiempo real. El sistema envía la posición del mensajero al backend cada 15 segundos mientras tiene un servicio en estado `IN_TRANSIT`, tanto en foreground como en background.

---

### Análisis del flujo backend (solo lectura — sin modificaciones)

El backend maneja el estado del mensajero así:

| Evento | Estado mensajero |
|---|---|
| Admin asigna servicio | `AVAILABLE` → `IN_SERVICE` |
| Mensajero acepta (`ACCEPTED`) | sigue `IN_SERVICE` |
| Mensajero sale a ruta (`IN_TRANSIT`) | sigue `IN_SERVICE` |
| Mensajero entrega (`DELIVERED`) | `IN_SERVICE` → `AVAILABLE` |

El endpoint `POST /api/courier/location` solo acepta ubicaciones cuando el mensajero está `IN_SERVICE`. Cuando el servicio llega a `DELIVERED`, el backend responde `400` a los siguientes envíos de ubicación.

El mobile activa el tracking cuando el servicio está `IN_TRANSIT` — en ese momento el mensajero ya está `IN_SERVICE` desde la asignación. El flujo es correcto sin modificar el backend.

---

### CAMBIO-22 — Instalación de `expo-task-manager`

**Problema:** El background tracking requiere `expo-task-manager` pero no estaba instalado en el proyecto.

**Solución:** Instalado con `npx expo install expo-task-manager` (versión compatible con SDK 55).

**Archivos modificados:**
- `package.json` — dependencia agregada

---

### CAMBIO-23 — Permisos de background location en `app.json`

**Problema:** `app.json` no tenía habilitado el background location para Android, lo que impedía que la task de background se registrara correctamente.

**Solución:** Agregados `isAndroidBackgroundLocationEnabled: true` e `isAndroidForegroundServiceEnabled: true` al plugin de `expo-location`.

```json
["expo-location", {
  "isAndroidBackgroundLocationEnabled": true,
  "isAndroidForegroundServiceEnabled": true
}]
```

**Archivos modificados:**
- `app.json`

---

### CAMBIO-24 — Creación de la task de background location

**Problema:** No existía ninguna task de background para tracking. Sin esto, cuando el mensajero minimiza la app, el tracking se detiene.

**Solución:** Creado `src/features/tracking/tasks/backgroundLocationTask.ts` con la task global definida a nivel de módulo (requisito de `expo-task-manager`).

Comportamiento de la task:
- Se ejecuta cada 15 segundos o cada 10 metros (lo que ocurra primero)
- Envía `{ latitude, longitude, accuracy }` al backend
- Si el backend responde `400`, detiene la task automáticamente
- Errores de red se swallean silenciosamente

**Archivos creados:**
- `src/features/tracking/tasks/backgroundLocationTask.ts`

---

### CAMBIO-25 — Registro de la task en `index.ts`

**Problema:** La task de background debe estar definida antes de que el árbol React se monte. Sin el import en el entry point, la task no se registra y el background tracking falla silenciosamente.

**Solución:** Agregado el import de la task en `index.ts` antes de `registerRootComponent`.

```typescript
import './src/features/tracking/tasks/backgroundLocationTask';
```

**Archivos modificados:**
- `index.ts`

---

### CAMBIO-26 — Reescritura de `useLocation` con foreground + background + stop en 400

**Problema:** El hook anterior solo tenía foreground tracking con `setInterval`. No tenía:
- Background tracking con `expo-task-manager`
- Detención automática cuando el backend responde `400`
- Gestión correcta del ciclo de vida (start/stop de la task de background)

**Solución:** Reescrito completamente con:

- `requestForegroundPermission` — solicita permiso de foreground (cacheado en ref)
- `requestBackgroundPermission` — solicita permiso de background (cacheado en ref)
- `startBackground` — inicia la task con `timeInterval: 15000` y `distanceInterval: 10`
- `stopForeground` / `stopBackground` / `stopAll` — limpieza correcta
- `sendLocation` — detecta `err.response.status === 400` y detiene todo
- `stoppedByBackend` ref — evita envíos adicionales después de un 400
- Reset del flag `stoppedByBackend` al desactivar (permite reactivación limpia)

**Ciclo de vida:**
```
active=true  → startBackground() + sendLocation() + setInterval(15s)
active=false → clearInterval + stopLocationUpdatesAsync
400 recibido → stoppedByBackend=true + clearInterval + stopLocationUpdatesAsync
```

**Archivos modificados:**
- `src/features/tracking/hooks/useLocation.ts`

---

### CAMBIO-27 — Corrección de `locationApi.ts` (versión en disco desactualizada)

**Problema:** El archivo en disco tenía la versión anterior con `unwrap` importado y retorno `Promise<unknown>`. Aunque el error 400 se propagaba correctamente (el interceptor rechaza antes de llegar a `unwrap`), el código era incorrecto y confuso.

**Causa raíz:** Una escritura anterior no se persistió correctamente en disco.

**Solución:** Reescrito con `async/await` limpio, sin `unwrap`, retornando `Promise<void>`. El error axios original se propaga para que `useLocation` pueda inspeccionar `err.response.status`.

**Archivos modificados:**
- `src/features/tracking/api/locationApi.ts`

---

### CAMBIO-28 — Corrección del loop duplicado en `TrackingMap`

**Problema:** `TrackingMap.tsx` tenía su propio `setInterval` de 15 segundos llamando a `ExpoLocation.getCurrentPositionAsync`, duplicando exactamente el loop de `useLocation`. Esto creaba dos procesos de GPS simultáneos y era la causa de la advertencia de "múltiples hosts" en el debugger.

**Solución:** Eliminado el `setInterval` de `TrackingMap`. El componente ahora hace una sola lectura de ubicación al activarse (para mostrar coordenadas en pantalla). El tracking periódico queda exclusivamente en `useLocation`.

**Archivos modificados:**
- `src/features/tracking/components/TrackingMap.tsx`

---

### CAMBIO-29 — Desactivación del reachability check de NetInfo

**Problema:** `@react-native-community/netinfo` hace ping por defecto a `clients3.google.com` para verificar conectividad a internet. Esto introducía un segundo host externo en la app, causando la advertencia del debugger de React Native sobre "múltiples hosts".

**Solución:** Configurado NetInfo con `reachabilityShouldRun: () => false` para deshabilitar el ping externo. La detección de conectividad sigue funcionando basándose en el estado de la interfaz de red del dispositivo.

**Archivos modificados:**
- `src/core/hooks/useNetworkStatus.ts`

---

### CAMBIO-30 — Suite de tests completa para `useLocation`

**Problema:** El test existente tenía cobertura parcial — no cubría background tracking, stop en 400, ni reactivación después de errores.

**Solución:** Reescrita la suite completa con 18 tests organizados en 5 grupos:

| Grupo | Tests |
|---|---|
| inactive | No envía, no pide permisos |
| foreground tracking | Envío inmediato, intervalo 15s/30s, permiso denegado, detención |
| error handling | Errores de red silenciosos, stop en 400 (foreground + background), no stop en otros errores |
| background tracking | Permiso, inicio con config correcta, no duplica, no inicia sin permiso, detiene al desactivar |
| reactivación | Reanuda después de desactivar, resetea flag de stop-por-400 |

Resultado: **18/18 tests pasan**.

**Archivos modificados:**
- `src/__tests__/tracking/useLocation.test.ts`

---

### CAMBIO-31 — Corrección del spinner infinito al iniciar la app

**Problema:** Si el backend no estaba disponible al iniciar la app, `useSessionRestore` nunca terminaba y la app quedaba en el spinner de carga indefinidamente.

**Causa raíz:** `apiClient` no tenía timeout configurado. Una request a `/api/courier/me` podía colgar indefinidamente si el backend no respondía.

**Solución:**
- Agregado `timeout: 10_000` al `apiClient` (10 segundos máximo por request)
- Reescrito `useSessionRestore` con un `safetyTimer` de 8 segundos que desbloquea la app si la restauración no termina a tiempo
- Variable `done` para evitar doble setState y proteger contra componente desmontado

**Archivos modificados:**
- `src/core/api/apiClient.ts`
- `src/core/hooks/useSessionRestore.ts`

---

### Resumen de bugs corregidos en esta sesión

| ID | Problema | Impacto | Resolución |
|---|---|---|---|
| BUG-22 | `expo-task-manager` no instalado | Background tracking imposible | Instalado con expo install |
| BUG-23 | Background location no habilitado en app.json | Task de background no se registraba en Android | Flags agregados al plugin |
| BUG-24 | Task de background no definida | Sin tracking al minimizar la app | `backgroundLocationTask.ts` creado |
| BUG-25 | Task no importada en entry point | Task no disponible antes del mount de React | Import en `index.ts` |
| BUG-26 | `useLocation` sin background ni stop en 400 | Tracking solo en foreground, sin detención automática | Hook reescrito completo |
| BUG-27 | `locationApi.ts` con versión desactualizada en disco | Código incorrecto, import innecesario | Reescrito con async/await limpio |
| BUG-28 | `TrackingMap` con loop de GPS duplicado | Dos procesos GPS simultáneos, advertencia de múltiples hosts | Loop eliminado del componente |
| BUG-29 | NetInfo hacía ping a Google | Segundo host externo, advertencia del debugger | `reachabilityShouldRun: false` |
| BUG-30 | Tests de tracking con cobertura parcial | Casos críticos sin validar | Suite completa de 18 tests |
| BUG-31 | App quedaba cargando si backend no respondía | UX bloqueada indefinidamente | Timeout en apiClient + safetyTimer |

---

*Actualización: 3 de abril de 2026 — Sistema de tracking v1.2*

---

## 10. Alineación del módulo de tracking con el backend + mapa WebView (Abril 2026)

### Contexto

Se realizó un análisis completo del módulo de tracking comparando la implementación del mobile contra lo que espera el backend. Se encontraron y corrigieron 5 problemas, y se implementó el mapa interactivo usando WebView + Leaflet.

---

### CAMBIO-32 — `sendFromBackground()` en `locationApi` para background task

**Problema:** El background task llamaba `locationApi.send()` que usa `apiClient` (Axios con interceptores). Cuando la app está en background profundo, el proceso JS puede reiniciarse y el store de Zustand queda vacío — sin token, todas las peticiones fallaban silenciosamente con 401.

**Causa raíz:** `apiClient` obtiene el token desde `useAuthStore.getState().accessToken`. Si Zustand no está inicializado, el token es `null`.

**Solución:** Se agregó `locationApi.sendFromBackground()` que lee el token directamente desde `SecureStore` (persiste en el keychain del dispositivo) y usa `axios` crudo sin pasar por el store.

```typescript
// sendFromBackground — usado por backgroundLocationTask
const token = await secureStorage.getToken();
if (!token) return; // sin sesión — skip silencioso
await axios.post(`${BASE_URL}/api/courier/location`, payload, {
  headers: { Authorization: `Bearer ${token}` }
});
```

**Archivos modificados:**
- `src/features/tracking/api/locationApi.ts`
- `src/features/tracking/tasks/backgroundLocationTask.ts`

---

### CAMBIO-33 — `accuracy ?? 0` reemplazado por spread condicional

**Problema:** El mobile enviaba `accuracy: 0` cuando el GPS no reportaba precisión. En el sistema de medición GPS, `0` significa "precisión perfecta de 0 metros" — semánticamente incorrecto. El backend tiene el campo como `@IsOptional()` precisamente para este caso.

**Causa raíz:** Uso de `?? 0` como fallback en lugar de omitir el campo.

**Solución:** Reemplazado por spread condicional en foreground y background:

```typescript
// Antes
accuracy: loc.coords.accuracy ?? 0

// Después
...(loc.coords.accuracy != null && { accuracy: loc.coords.accuracy })
```

**Archivos modificados:**
- `src/features/tracking/hooks/useLocation.ts`
- `src/features/tracking/tasks/backgroundLocationTask.ts`

---

### CAMBIO-34 — `useLocation` ahora retorna coordenadas para display

**Problema:** `useLocation` no retornaba nada. `TrackingMap` hacía su propia lectura GPS independiente, creando dos lecturas simultáneas cuando el tracking estaba activo.

**Solución:** El hook ahora retorna `{ latitude, longitude, permissionDenied }`. Las coordenadas se actualizan en cada ciclo de 15 segundos (mismo momento en que se envían al backend). `TrackingMap` consume estas coords como props — sin segunda lectura GPS.

```typescript
// useLocation ahora retorna:
return {
  latitude: coords?.latitude ?? null,
  longitude: coords?.longitude ?? null,
  permissionDenied,
};
```

**Archivos modificados:**
- `src/features/tracking/hooks/useLocation.ts`
- `src/features/services/screens/ServiceDetailScreen.tsx`

---

### CAMBIO-35 — `TrackingMap` refactorizado: WebView + Leaflet

**Problema:** `TrackingMap` mostraba solo coordenadas en texto plano. No había mapa visual, y el componente hacía su propia lectura GPS duplicando el trabajo de `useLocation`.

**Solución:** Reescrito completamente con:

- **WebView + Leaflet 1.9.4** — mismo tile provider (OpenStreetMap) que el frontend web
- **Sin lectura GPS propia** — recibe `latitude`, `longitude`, `permissionDenied` como props
- **`buildLeafletHtml(lat, lng)`** — genera HTML con mapa centrado en la posición del mensajero
- **`useMemo`** — reconstruye el HTML solo cuando las coords cambian (cada ~15s)
- **Marcador personalizado** — círculo azul con borde blanco y anillo de glow (mismo estilo que el frontend)
- **Estados de UI** — sin servicio activo / permiso denegado / esperando GPS / mapa activo

```
TrackingMap states:
  !active          → "Sin servicio activo"
  permissionDenied → "Permiso de ubicación denegado"
  coords null      → ActivityIndicator "Obteniendo ubicación..."
  coords available → WebView con mapa Leaflet
```

**Dependencia instalada:** `react-native-webview` (compatible con Expo SDK 55)

**Archivos modificados/creados:**
- `src/features/tracking/components/TrackingMap.tsx`
- `package.json` — `react-native-webview` agregado

---

### CAMBIO-36 — Documentación de fase 06 actualizada

**Problema:** `docs/phase-06-tracking.md` estaba desactualizado — describía una implementación anterior con intervalos de 10s, archivos que no existen y criterios de completitud incorrectos.

**Solución:** Reescrito completamente con:
- Diagrama de arquitectura actualizado
- Tabla de endpoint con auth y notas de validación
- Sección dedicada a la implementación WebView + Leaflet con tabla comparativa vs react-native-maps
- Estrategia del background task y token desde SecureStore
- Criterios de completitud actualizados (todos marcados excepto upgrade a react-native-maps)

**Archivos modificados:**
- `docs/phase-06-tracking.md`

---

### Resumen de cambios en esta sesión

| ID | Cambio | Impacto |
|---|---|---|
| CAMBIO-32 | `sendFromBackground()` con token desde SecureStore | Background tracking funciona aunque Zustand esté vacío |
| CAMBIO-33 | `accuracy ?? 0` → spread condicional | Datos de precisión semánticamente correctos |
| CAMBIO-34 | `useLocation` retorna coords para display | Elimina doble lectura GPS |
| CAMBIO-35 | `TrackingMap` con WebView + Leaflet | Mapa interactivo real en lugar de texto de coordenadas |
| CAMBIO-36 | Documentación fase 06 actualizada | Refleja la implementación real |

---

*Actualización: 6 de abril de 2026 — Tracking map WebView v1.0*

---

## 11. Tracking por estado del mensajero + flujo de pago al finalizar (Abril 2026)

### Contexto

Dos cambios técnicos en el módulo de servicios y tracking:
1. El trigger del tracking GPS se mueve del estado del servicio (`IN_TRANSIT`) al estado operacional del mensajero (`IN_SERVICE`), alineándose con la regla del backend.
2. Al finalizar un servicio (`DELIVERED`), se muestra un modal preguntando si el cliente pagó, usando el nuevo endpoint `POST /api/courier/services/:id/payment`.

---

### CAMBIO-37 — Tracking activado por `operationalStatus === 'IN_SERVICE'`

**Problema:** El tracking se activaba cuando `service.status === 'IN_TRANSIT'`. El backend valida que el mensajero esté en estado `IN_SERVICE` para aceptar ubicaciones — no el estado del servicio. Esto podía causar que el tracking se activara antes de que el backend lo permitiera.

**Decisión técnica:** El estado del mensajero (`IN_SERVICE`) es el marcador correcto. El mensajero entra en `IN_SERVICE` cuando se le asigna un servicio, y sale cuando lo entrega. El estado del servicio (`IN_TRANSIT`) es un subestado dentro de ese período.

**Solución:**
- `OperationalStatus` ahora incluye `'IN_SERVICE'` (antes solo `'AVAILABLE' | 'UNAVAILABLE'`)
- `ServiceDetailScreen` lee `operationalStatus` del `useAuthStore` y lo pasa a `useLocation`
- `useLocation({ active: operationalStatus === 'IN_SERVICE' })`

```typescript
// Antes
useLocation({ active: service?.status === 'IN_TRANSIT' })

// Después
const operationalStatus = useAuthStore((s) => s.user?.operationalStatus);
useLocation({ active: operationalStatus === 'IN_SERVICE' })
```

**Archivos modificados:**
- `src/features/auth/types/auth.types.ts` — `IN_SERVICE` agregado al tipo
- `src/features/services/screens/ServiceDetailScreen.tsx` — trigger actualizado

---

### CAMBIO-38 — Tipos de pago en `services.types.ts`

**Problema:** `Service` tenía `payment_method: string` genérico. Los nuevos campos `payment_status`, `is_settled_courier`, `is_settled_customer` no existían en el tipo.

**Solución:** Tipos actualizados con enums estrictos según `PAYMENT_CHANGES.md`:

```typescript
export type PaymentMethod = 'CASH' | 'TRANSFER' | 'CREDIT';
export type PaymentStatus = 'PAID' | 'UNPAID';

export interface Service {
  // ...
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  is_settled_courier: boolean;
  is_settled_customer: boolean;
}
```

**Archivos modificados:**
- `src/features/services/types/services.types.ts`

---

### CAMBIO-39 — `servicesApi.updatePayment()`

**Problema:** No existía ningún método para llamar al endpoint de cambio de pago.

**Solución:** Agregado `updatePayment(id, payment_status)` que llama a `POST /api/courier/services/:id/payment`.

```typescript
updatePayment: (id: string, payment_status: PaymentStatus): Promise<Service> =>
  apiClient
    .post<ApiResponse<Service>>(`/api/courier/services/${id}/payment`, { payment_status })
    .then(unwrap),
```

**Archivos modificados:**
- `src/features/services/api/servicesApi.ts`

---

### CAMBIO-40 — `performPaymentAction` en `useServiceDetail`

**Problema:** `useServiceDetail` no tenía forma de actualizar el estado de pago.

**Solución:** Agregado `performPaymentAction(serviceId, payment_status)` con su propio estado `paymentLoading`. Actualiza el store con el servicio retornado por el backend.

**Archivos modificados:**
- `src/features/services/hooks/useServices.ts`

---

### CAMBIO-41 — Modal de pago al finalizar entrega

**Problema:** Al marcar un servicio como `DELIVERED`, no había forma de registrar si el cliente pagó o no.

**Flujo implementado:**
1. Mensajero presiona "Finalizar entrega"
2. Backend transiciona el servicio a `DELIVERED`
3. Se muestra un bottom sheet modal: "¿Te pagaron el servicio?"
4. Opciones:
   - **"Sí, me pagaron"** → `POST /api/courier/services/:id/payment { payment_status: "PAID" }`
   - **"No me pagaron"** → `POST /api/courier/services/:id/payment { payment_status: "UNPAID" }`
   - **"Mantener estado actual"** → cierra el modal sin llamar al backend

El modal muestra el total del servicio para referencia. Si la llamada al backend falla, muestra un `Alert` no bloqueante.

La pantalla también muestra `payment_method` y `payment_status` en la sección de paquete, con el estado `UNPAID` resaltado en rojo.

**Archivos modificados:**
- `src/features/services/screens/ServiceDetailScreen.tsx`

---

### Resumen de cambios

| ID | Cambio | Impacto |
|---|---|---|
| CAMBIO-37 | Tracking por `IN_SERVICE` del mensajero | Alineado con regla del backend |
| CAMBIO-38 | Tipos `PaymentMethod`, `PaymentStatus`, `is_settled_*` | Tipos correctos para los nuevos campos |
| CAMBIO-39 | `servicesApi.updatePayment()` | Endpoint de pago disponible |
| CAMBIO-40 | `performPaymentAction` en `useServiceDetail` | Lógica de pago encapsulada en el hook |
| CAMBIO-41 | Modal de pago al finalizar entrega | Mensajero puede registrar cobro en campo |

---

*Actualización: 6 de abril de 2026 — Payment flow v1.0*

---

## 9. Refactor visual — Design System & UI Evolution (Abril 2026)

### Contexto

Se realizó una evolución visual progresiva de la app basada en imágenes de referencia de diseño. El objetivo fue modernizar la UI sin romper ninguna lógica existente. Todos los cambios son puramente de presentación.

> Ver documentación completa en `docs/phase-09-design-system-refactor.md`

---

### CAMBIO-42 — Expansión del Design System

**Problema:** `colors.ts` tenía 7 tokens sin semántica de estados. No existían `spacing.ts`, `shadows.ts` ni componentes UI base reutilizables.

**Solución:** Se crearon/expandieron los siguientes archivos:

- `colors.ts` → 24 tokens con colores semánticos (`successBg`, `warningText`, `infoBg`, `background`, etc.)
- `typography.ts` → escala ampliada (`xxxl: 36`, `display: 44`), peso `extrabold: '800'`, presets `textStyles`
- `spacing.ts` → escala base-4 (`xs` a `huge`) + `borderRadius` (`sm` a `full`)
- `shadows.ts` → sombras cross-platform iOS/Android con preset `primary` (sombra azul para cards hero)
- `shared/ui/index.ts` → barrel export del design system

**Archivos creados/modificados:**
- `src/shared/ui/colors.ts`
- `src/shared/ui/typography.ts`
- `src/shared/ui/spacing.ts` ← nuevo
- `src/shared/ui/shadows.ts` ← nuevo
- `src/shared/ui/index.ts` ← nuevo

---

### CAMBIO-43 — Componentes UI base reutilizables

**Problema:** No existían componentes UI atómicos. Cada pantalla definía sus propios estilos de botones, inputs y badges de forma inconsistente.

**Solución:** Se creó `src/shared/ui/components/` con:

- `Button` — variantes `primary/outline/ghost/success/danger`, tamaños `sm/md/lg`, soporte de ícono y loading
- `Input` — label, ícono izquierdo/derecho, mensaje de error, toggle de contraseña
- `StatusBadge` — badge centralizado con variantes semánticas (`success/warning/danger/info/primary/neutral`) y punto indicador
- `Card` — contenedor base con sombra configurable
- `index.ts` — barrel export

El `StatusBadge` de `src/features/services/components/StatusBadge.tsx` fue refactorizado como wrapper del centralizado, manteniendo compatibilidad con el tipo `ServiceStatus`.

**Archivos creados:**
- `src/shared/ui/components/Button.tsx`
- `src/shared/ui/components/Input.tsx`
- `src/shared/ui/components/StatusBadge.tsx`
- `src/shared/ui/components/Card.tsx`
- `src/shared/ui/components/index.ts`

**Archivos modificados:**
- `src/features/services/components/StatusBadge.tsx`

---

### CAMBIO-44 — Refactor visual LoginScreen

**Problema:** Login en inglés, sin hero visual, inputs sin íconos, sin toggle de contraseña, sin link de recuperación, sin botón biométrico.

**Solución:** Rediseño visual completo manteniendo toda la lógica de `useLogin`, `react-hook-form` y validaciones:

- Hero con ícono en círculo `primaryBg`
- Título "Bienvenido, Mensajero" + subtítulo descriptivo
- Inputs usando el componente `Input` con íconos y toggle de contraseña
- Link "¿Olvidaste tu contraseña?"
- Botón "Iniciar Sesión →" con sombra de color primario
- Botón biométrico circular
- Footer de versión

**Archivos modificados:**
- `src/features/auth/screens/LoginScreen.tsx`

---

### CAMBIO-45 — Refactor visual Header del dashboard

**Problema:** Header mostraba nombre pequeño + badge de estado online/offline. Sin fecha, sin avatar, sin notificaciones.

**Solución:**
- Greeting grande con `fontWeight.extrabold` (`Hola, {nombre}`)
- Fecha actual formateada en español
- Botón de notificación con punto rojo indicador
- Avatar circular con inicial del nombre, borde azul si está online

**Archivos modificados:**
- `src/features/dashboard/components/Header.tsx`

---

### CAMBIO-46 — Refactor visual KPIBox + nuevo DailyProgress

**Problema:** KPIs sin ícono, alineados al centro, sin diferenciación visual clara. Sin barra de progreso diario.

**Solución:**
- `KPIBox` ahora acepta prop `icon` (emoji), alineación a la izquierda, layout más compacto
- Nuevo componente `DailyProgress`: barra de progreso con porcentaje calculado y contador `X/Y Completados`

**Archivos modificados/creados:**
- `src/features/dashboard/components/KPIBox.tsx`
- `src/features/dashboard/components/DailyProgress.tsx` ← nuevo

---

### CAMBIO-47 — Refactor visual ActiveServiceCard

**Problema:** Card simple sin jerarquía visual clara. Sin conector de ruta, sin acciones rápidas, sin información del cliente.

**Solución:**
- Borde azul primario en la card activa
- Fila superior: badge + ID de orden + hora
- Conector visual recogida→entrega con línea vertical y puntos de color
- Footer: avatar con inicial, nombre del cliente, método de pago
- Botones de acción: llamar (circular) + Navegar (azul sólido)

**Archivos modificados:**
- `src/features/dashboard/components/ActiveServiceCard.tsx`

---

### CAMBIO-48 — Refactor visual HomeScreen

**Problema:** Home sin tabs de filtro, sin progreso diario, KPIs sin ícono "En Ruta".

**Solución:**
- Integración de `DailyProgress` entre KPIs y tabs
- Tabs de filtro Todos/Pendientes/Completados con pill activo
- KPI "En Ruta" usando el nuevo campo `kpis.inTransit`
- Fondo `colors.background` (`#F4F6FA`) en lugar de `neutral50`
- Estado vacío con ícono y subtexto

**Archivos modificados:**
- `src/features/dashboard/screens/HomeScreen.tsx`

---

### CAMBIO-49 — Campo `inTransit` en KPISummary

**Problema:** `KPISummary` no tenía campo para servicios en tránsito. El KPI "En Ruta" no podía mostrarse.

**Solución:**
- Agregado `inTransit: number` a la interfaz `KPISummary`
- `computeKPIs` actualizado: `pending` ahora solo cuenta `ASSIGNED`, `inTransit` cuenta `ACCEPTED + IN_TRANSIT`
- `DEFAULT_KPIS` actualizado con `inTransit: 0`

**Archivos modificados:**
- `src/features/dashboard/types/dashboard.types.ts`
- `src/features/dashboard/api/dashboardApi.ts`
- `src/features/dashboard/hooks/useDashboard.ts`

---

### CAMBIO-50 — Refactor visual EarningsScreen

**Problema:** Pantalla de ganancias sin estructura de liquidación del día, sin stats de pedidos/tiempo/distancia, sin secciones de ingresos y deducciones, sin CTA fijo.

**Solución:**
- Header con título "Liquidación del Día" + botón calendario
- Hero card azul con sombra `shadows.primary`, monto en `fontSize.xxxl`, badge de variación
- Stats row: 3 chips blancos (Pedidos / Tiempo / Distancia)
- Secciones "Ingresos" y "Deducciones" con `IncomeRow` (ícono en cuadro, título, subtítulo, monto)
- CTA fijo "Transferir a mi Cuenta →" con `position: absolute` en la parte inferior

**Archivos modificados:**
- `src/features/earnings/screens/EarningsScreen.tsx`

---

### Resumen de cambios

| ID | Cambio | Archivos |
|---|---|---|
| CAMBIO-42 | Design system expandido | `colors.ts`, `typography.ts`, `spacing.ts`, `shadows.ts`, `index.ts` |
| CAMBIO-43 | Componentes UI base | `Button`, `Input`, `StatusBadge`, `Card` en `shared/ui/components/` |
| CAMBIO-44 | LoginScreen rediseñado | `LoginScreen.tsx` |
| CAMBIO-45 | Header con greeting, fecha, avatar | `Header.tsx` |
| CAMBIO-46 | KPIBox con ícono + DailyProgress | `KPIBox.tsx`, `DailyProgress.tsx` |
| CAMBIO-47 | ActiveServiceCard con ruta y acciones | `ActiveServiceCard.tsx` |
| CAMBIO-48 | HomeScreen con tabs y progreso | `HomeScreen.tsx` |
| CAMBIO-49 | `inTransit` en KPISummary | `dashboard.types.ts`, `dashboardApi.ts`, `useDashboard.ts` |
| CAMBIO-50 | EarningsScreen con hero, stats, CTA | `EarningsScreen.tsx` |

---

*Actualización: 10 de abril de 2026 — Design System Refactor v1.0*

---

## 10. Dashboard funcional — Conexión real de UI a datos (Abril 2026)

### Contexto

Tras el refactor visual (sección 9), se detectó que el módulo de dashboard tenía la UI completa pero con lógica incompleta o simulada. Se realizó una segunda pasada para conectar cada elemento visual a datos reales y eliminar todo valor hardcodeado.

---

### CAMBIO-51 — Corrección del interceptor de refresh para rutas de auth

**Problema:** Al fallar el login con credenciales incorrectas (401), el interceptor de respuesta intentaba hacer `POST /api/auth/refresh`. Ese refresh también fallaba con 401, lo que volvía a disparar el interceptor, generando un loop hasta que el timeout de 10s cortaba la ejecución. La app se quedaba cargando indefinidamente.

**Causa raíz:** El interceptor de 401 no excluía las rutas de autenticación. Un 401 en `/api/auth/login` no significa sesión expirada — significa credenciales incorrectas.

**Solución:** Se agregó la condición `!isAuthEndpoint` al guard del interceptor:

```ts
const isAuthEndpoint =
  originalRequest.url?.includes('/api/auth/login') ||
  originalRequest.url?.includes('/api/auth/refresh');

if (status === 401 && !originalRequest._retry && !isAuthEndpoint) {
  // refresh logic
}
```

Adicionalmente, se corrigió el orden de lectura del mensaje de error: NestJS pone el mensaje útil en `message` (no en `error`), por lo que se invirtió la prioridad: `responseData?.message ?? responseData?.error`.

**Archivos modificados:**
- `src/core/api/apiClient.ts`

---

### CAMBIO-52 — Tabs del dashboard sin funcionalidad real

**Problema:** `HomeScreen` tenía tres tabs (Todos / Pendientes / Completados) con estado `activeTab` local, pero ese estado nunca se usaba para filtrar servicios. Los tabs eran puramente decorativos.

**Causa raíz:** La lógica de filtrado no estaba implementada ni en el componente ni en el hook.

**Solución:** La lógica de filtrado se centralizó en `useDashboard` mediante `TAB_STATUSES`:

```ts
const TAB_STATUSES: Record<DashboardTab, ServiceStatus[]> = {
  all:       ['ASSIGNED', 'ACCEPTED', 'IN_TRANSIT', 'DELIVERED'],
  pending:   ['ASSIGNED', 'ACCEPTED'],
  completed: ['DELIVERED'],
};
```

El hook ahora expone `filteredServices`, `activeTab` y `setActiveTab`. `HomeScreen` consume estos valores directamente.

**Archivos modificados:**
- `src/features/dashboard/hooks/useDashboard.ts`
- `src/features/dashboard/screens/HomeScreen.tsx`

---

### CAMBIO-53 — HomeScreen: ScrollView reemplazado por FlatList

**Problema:** `HomeScreen` usaba `ScrollView` para mostrar la lista de servicios, lo que no es eficiente para listas variables y no permite `renderItem` tipado.

**Solución:** Reemplazado por `FlatList` con `ListHeaderComponent` para los KPIs, progreso y tabs. La lista de servicios se renderiza con `ServiceCard` existente, reutilizando el componente sin duplicar código.

**Archivos modificados:**
- `src/features/dashboard/screens/HomeScreen.tsx`

---

### CAMBIO-54 — Fallback hardcodeado `|| 10` en DailyProgress

**Problema:** `HomeScreen` pasaba `total={totalOrders || 10}` a `DailyProgress`. Cuando no había servicios, la barra mostraba `0/10` en lugar de `0/0`.

**Causa raíz:** Fallback defensivo incorrecto — `DailyProgress` ya maneja `total=0` correctamente (`pct = 0`).

**Solución:** Eliminado el fallback. `totalOrders` se calcula como la suma real de los tres KPIs:

```ts
const totalOrders = kpis.pending + kpis.inTransit + kpis.completed;
```

**Archivos modificados:**
- `src/features/dashboard/screens/HomeScreen.tsx`

---

### CAMBIO-55 — ActiveServiceCard sin navegación funcional

**Problema:** `ActiveServiceCard` recibía props `onPress` y `onNavigate` pero `HomeScreen` no las implementaba. Tocar la card o el botón "Navegar" no hacía nada.

**Causa raíz:** Las props estaban definidas pero sin handler en el componente padre.

**Solución:** `HomeScreen` implementa `handleServicePress` que navega a la tab `Orders` usando `useNavigation<BottomTabNavigationProp>`. El `ServicesNavigator` dentro de esa tab maneja el stack de detalle.

```ts
function handleServicePress(_service: Service) {
  navigation.navigate('Orders');
}
```

La `ActiveServiceCard` solo se muestra en el tab "Todos" para evitar duplicación con la lista filtrada.

**Archivos modificados:**
- `src/features/dashboard/screens/HomeScreen.tsx`

---

### CAMBIO-56 — Tiempo hardcodeado en ActiveServiceCard

**Problema:** La card mostraba `new Date().toLocaleTimeString(...)` como si fuera la hora del servicio. Era la hora actual del dispositivo, no un dato real del servicio.

**Causa raíz:** El tipo `Service` no tiene campo de fecha/hora. El dato era inventado.

**Solución:** Eliminado el elemento de tiempo y su estilo asociado (`time`).

**Archivos modificados:**
- `src/features/dashboard/components/ActiveServiceCard.tsx`

---

### CAMBIO-57 — Estado vacío genérico para todos los tabs

**Problema:** El estado vacío mostraba siempre "Sin servicio activo / Tus pedidos aparecerán aquí" independientemente del tab activo.

**Solución:** Mensaje contextual según el tab:

```ts
activeTab === 'completed' ? 'Sin entregas completadas'
: activeTab === 'pending'  ? 'Sin pedidos pendientes'
: 'Sin servicios asignados'
```

**Archivos modificados:**
- `src/features/dashboard/screens/HomeScreen.tsx`

---

### CAMBIO-58 — Import `useRef` sin usar en useDashboard

**Problema:** `useDashboard` importaba `useRef` de React pero no lo usaba.

**Solución:** Eliminado del import.

**Archivos modificados:**
- `src/features/dashboard/hooks/useDashboard.ts`

---

### Resumen de cambios

| ID | Cambio | Archivos |
|---|---|---|
| CAMBIO-51 | Interceptor de refresh excluye rutas de auth | `apiClient.ts` |
| CAMBIO-52 | Tabs del dashboard conectados a filtrado real | `useDashboard.ts`, `HomeScreen.tsx` |
| CAMBIO-53 | ScrollView → FlatList con ServiceCard | `HomeScreen.tsx` |
| CAMBIO-54 | Eliminado fallback `\|\| 10` en DailyProgress | `HomeScreen.tsx` |
| CAMBIO-55 | Navegación real desde ActiveServiceCard | `HomeScreen.tsx` |
| CAMBIO-56 | Eliminado `new Date()` hardcodeado en card | `ActiveServiceCard.tsx` |
| CAMBIO-57 | Empty state contextual por tab | `HomeScreen.tsx` |
| CAMBIO-58 | `useRef` sin usar eliminado | `useDashboard.ts` |

---

*Actualización: 10 de abril de 2026 — Dashboard funcional v1.0*
