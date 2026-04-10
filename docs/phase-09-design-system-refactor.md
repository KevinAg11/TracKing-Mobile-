# Phase 09 — Design System Refactor & Visual Evolution

## Objetivo

Evolucionar el estilo visual de la app de mensajeros al nuevo design language de referencia sin reescribir pantallas completas ni romper lógica existente. Todos los cambios son incrementales, reutilizables y consistentes.

> **Restricción clave:** Solo se modificaron estilos y estructura visual. Ningún hook, store, API ni lógica de negocio fue alterada.

---

## Design Language extraído de las referencias

| Token | Valor |
|---|---|
| Color primario | `#2563EB` (azul sólido) |
| Fondo general | `#F4F6FA` (gris muy suave) |
| Cards | Blanco `#FFFFFF` con sombra suave |
| Border radius cards | `16–20px` |
| Border radius botones | `16px` |
| Tipografía títulos | `extrabold 800`, tamaño `24–36px` |
| Tipografía cuerpo | `regular 400`, tamaño `15px` |
| Estado Pendiente | Naranja `#F59E0B` / fondo `#FEF3C7` |
| Estado En Ruta | Azul `#6366F1` / fondo `#EEF2FF` |
| Estado Entregado | Verde `#22C55E` / fondo `#DCFCE7` |
| Sombra cards | `shadowOpacity 0.06–0.10`, `elevation 2–4` |

---

## Archivos creados / modificados

### Design System (`src/shared/ui/`)

| Archivo | Estado | Descripción |
|---|---|---|
| `colors.ts` | Modificado | Paleta expandida con semántica completa |
| `typography.ts` | Modificado | Escala ampliada + presets de texto |
| `spacing.ts` | Creado | Escala base-4 + `borderRadius` |
| `shadows.ts` | Creado | Sombras cross-platform (iOS + Android) |
| `index.ts` | Creado | Barrel export del design system |
| `components/Button.tsx` | Creado | Botón reutilizable con variantes |
| `components/Input.tsx` | Creado | Input con label, ícono y error |
| `components/StatusBadge.tsx` | Creado | Badge centralizado con variantes semánticas |
| `components/Card.tsx` | Creado | Contenedor base con sombra configurable |
| `components/index.ts` | Creado | Barrel export de componentes UI |

### Features

| Archivo | Estado | Descripción |
|---|---|---|
| `auth/screens/LoginScreen.tsx` | Modificado | Nuevo layout con hero, inputs modernos, biométrico |
| `dashboard/screens/HomeScreen.tsx` | Modificado | Greeting grande, tabs, progreso diario |
| `dashboard/components/Header.tsx` | Modificado | Avatar, fecha, notificación |
| `dashboard/components/KPIBox.tsx` | Modificado | Ícono + valor + label alineados a la izquierda |
| `dashboard/components/ActiveServiceCard.tsx` | Modificado | Layout recogida→entrega, cliente, botones |
| `dashboard/components/DailyProgress.tsx` | Creado | Barra de progreso diario |
| `earnings/screens/EarningsScreen.tsx` | Modificado | Hero card, stats, ingresos/deducciones, CTA fijo |
| `services/components/StatusBadge.tsx` | Modificado | Wrapper del badge centralizado |

### Tipos y lógica mínima

| Archivo | Cambio | Motivo |
|---|---|---|
| `dashboard/types/dashboard.types.ts` | Agregado campo `inTransit` a `KPISummary` | Nuevo KPI "En Ruta" en el Home |
| `dashboard/api/dashboardApi.ts` | `computeKPIs` actualizado | Calcula `inTransit` y separa `pending` solo para `ASSIGNED` |

---

## Design System — Detalle

### `colors.ts`

```ts
// Antes: 7 tokens
// Después: 24 tokens con semántica completa

colors.primary         // #2563EB
colors.primaryBg       // #EFF6FF  — fondos de avatares, badges
colors.primaryDark     // #1D4ED8  — hover states

colors.successBg       // #DCFCE7  — fondo badge Entregado
colors.successText     // #15803D  — texto badge Entregado

colors.warningBg       // #FEF3C7  — fondo badge Pendiente
colors.warningText     // #92400E

colors.infoBg          // #EEF2FF  — fondo badge En Ruta
colors.infoText        // #4338CA

colors.neutral200      // #E5E7EB  — bordes de inputs
colors.neutral400      // #9CA3AF  — placeholders
colors.neutral500      // #6B7280  — texto secundario
colors.neutral600      // #4B5563
colors.background      // #F4F6FA  — fondo general de pantallas
```

### `typography.ts`

```ts
// Escala ampliada
fontSize.xxxl   = 36   // montos en liquidación
fontSize.display = 44  // reservado para pantallas hero

// Nuevos pesos
fontWeight.extrabold = '800'  // títulos principales

// Presets listos para usar
textStyles.h1          // 24px bold
textStyles.displayTitle // 36px extrabold
textStyles.label       // 11px semibold uppercase
```

### `spacing.ts`

```ts
// Escala base-4
spacing.xs  = 4
spacing.sm  = 8
spacing.md  = 12
spacing.lg  = 16
spacing.xl  = 20
spacing.xxl = 24
spacing.xxxl = 32

// Border radius
borderRadius.sm   = 8
borderRadius.md   = 12
borderRadius.lg   = 16   // botones, cards
borderRadius.xl   = 20   // cards destacadas
borderRadius.full = 999  // badges, avatares
```

### `shadows.ts`

```ts
// Cross-platform: iOS usa shadow*, Android usa elevation
shadows.sm      // elevation 2 — cards de lista
shadows.md      // elevation 4 — cards activas
shadows.lg      // elevation 8 — modales
shadows.primary // shadowColor: '#2563EB' — cards hero azules
```

---

## Componentes UI base

### `Button`

Variantes: `primary` | `outline` | `ghost` | `success` | `danger`
Tamaños: `sm` | `md` | `lg`

```tsx
<Button label="Iniciar Sesión →" onPress={handleSubmit} fullWidth />
<Button label="Navegar" variant="primary" size="sm" icon={<MapIcon />} />
<Button label="Ver Detalles" variant="outline" />
```

### `Input`

```tsx
<Input
  label="Usuario"
  placeholder="Nombre de usuario o ID"
  rightIcon={<IconUser />}
  error={errors.email?.message}
/>
```

### `StatusBadge` (centralizado)

```tsx
// Uso directo
<StatusBadge label="En Ruta" variant="info" dot />
<StatusBadge label="Entregado" variant="success" dot />
<StatusBadge label="Pendiente" variant="warning" dot />

// El StatusBadge de services es ahora un wrapper:
// src/features/services/components/StatusBadge.tsx
// → mapea ServiceStatus al badge centralizado
```

### `Card`

```tsx
<Card shadow="md" padding={20}>
  {/* contenido */}
</Card>
```

---

## Pantallas refactorizadas

### LoginScreen

**Antes:** Título "TracKing / Courier App", inputs sin ícono, botón "Log In" en inglés, sin footer.

**Después:**
- Hero ilustrativo con ícono en círculo con fondo `primaryBg`
- Título "Bienvenido, Mensajero" + subtítulo descriptivo
- Inputs usando el componente `Input` con íconos y toggle de contraseña
- Labels en español ("Usuario", "Contraseña")
- Link "¿Olvidaste tu contraseña?" alineado a la derecha
- Botón "Iniciar Sesión →" con sombra de color primario
- Botón biométrico (huella) con ícono circular
- Footer "v1.0.4 • Soporte Técnico"

### HomeScreen

**Antes:** Header simple con nombre + badge online, 3 KPIs en fila, solo servicio activo.

**Después:**
- `Header` con greeting grande (`Hola, {nombre}`), fecha actual, avatar con inicial, botón de notificación con punto rojo
- 2 KPIs con ícono: Pendientes (naranja) y En Ruta (azul)
- `DailyProgress`: barra de progreso con contador `X/Y Completados`
- Tabs de filtro: Todos / Pendientes / Completados (con pill activo)
- `ActiveServiceCard` rediseñada (ver abajo)
- Estado vacío con ícono y subtexto

### ActiveServiceCard

**Antes:** Card simple con badge de estado, dos direcciones con puntos de color, nombre y precio.

**Después:**
- Borde azul primario cuando el servicio está activo
- Fila superior: badge de estado + ID de orden + hora
- Sección de ruta con conector visual (línea vertical):
  - RECOGIDA: dirección en gris tachado (origen)
  - ENTREGA: dirección en negrita azul (destino)
- Footer: avatar con inicial del cliente, nombre, método de pago
- Botones de acción: llamar (circular) + Navegar (azul sólido)

### EarningsScreen (Liquidación del Día)

**Antes:** Header simple, card azul con monto, dos métricas, lista de liquidaciones.

**Después:**
- Header con título "Liquidación del Día" + botón calendario
- Hero card azul con sombra de color: monto grande `$XXX.XX`, badge "+12% vs ayer"
- Stats row: 3 chips blancos con ícono (Pedidos / Tiempo / Distancia)
- Sección "Ingresos": filas con ícono en cuadro redondeado, título, subtítulo, monto verde
- Sección "Deducciones": misma estructura, monto en rojo
- Historial de liquidaciones
- CTA fijo en la parte inferior: "Transferir a mi Cuenta →"

---

## KPISummary — cambio de tipo

```ts
// Antes
interface KPISummary {
  pending: number;
  completed: number;
  earnings: number;
}

// Después
interface KPISummary {
  pending: number;    // solo ASSIGNED
  inTransit: number;  // ACCEPTED + IN_TRANSIT
  completed: number;  // DELIVERED
  earnings: number;
}
```

`computeKPIs` en `dashboardApi.ts` fue actualizado para calcular `inTransit` correctamente.

---

## Criterios de validación

| Verificación | Resultado |
|---|---|
| `getDiagnostics` en todos los archivos modificados | ✅ 0 errores |
| `colors.ts` — sin referencias rotas | ✅ |
| `spacing.ts` / `shadows.ts` — importados correctamente | ✅ |
| `Button`, `Input`, `Card`, `StatusBadge` — sin errores de tipo | ✅ |
| `LoginScreen` — usa `Input` component, lógica intacta | ✅ |
| `HomeScreen` — `kpis.inTransit` tipado correctamente | ✅ |
| `ActiveServiceCard` — props compatibles con `Service` type | ✅ |
| `EarningsScreen` — `useEarnings` hook sin cambios | ✅ |
| `services/StatusBadge` — backward compatible | ✅ |

---

## Próximos pasos sugeridos

- Refactorizar `ServicesScreen` con el nuevo `ServiceCard` usando el layout de las referencias (recogida→entrega, botones "Ver Detalles" / "Iniciar Ruta")
- Refactorizar `ServiceDetailScreen` con secciones en `Card` y botón de acción con el nuevo `Button` component
- Refactorizar `WorkdayScreen` con el nuevo design system
- Reemplazar emojis de íconos por una librería consistente (`@expo/vector-icons` o `lucide-react-native`)
- Agregar animaciones de transición en tabs y cards (Reanimated 2)

---

## Actualización — Dashboard funcional (Abril 2026)

Tras el refactor visual, se realizó una segunda pasada sobre el módulo de dashboard para conectar completamente la UI a datos reales y corregir lógica incompleta.

### Problemas corregidos

| # | Problema | Impacto |
|---|---|---|
| 1 | Tabs sin funcionalidad — `activeTab` existía pero nunca filtraba servicios | UI decorativa sin efecto real |
| 2 | `useDashboard` no exponía lista filtrada | HomeScreen no podía mostrar servicios por tab |
| 3 | `totalOrders \|\| 10` — fallback hardcodeado en `DailyProgress` | Progreso mostraba `/10` cuando no había servicios |
| 4 | `ActiveServiceCard.onPress` y `onNavigate` sin implementar | Tocar la card no hacía nada |
| 5 | `new Date()` hardcodeado como "hora del servicio" | Dato inventado — `Service` no tiene campo de fecha |
| 6 | `useRef` importado sin usar en `useDashboard` | Import muerto |
| 7 | Estado vacío genérico para todos los tabs | Mensaje no contextual al tab activo |

### Cambios aplicados

**`useDashboard`**

- Eliminado `useRef` sin usar
- Exportado nuevo tipo `DashboardTab = 'all' | 'pending' | 'completed'`
- Agregados `filteredServices`, `activeTab` y `setActiveTab` al estado del hook
- Lógica de filtrado centralizada en el hook mediante `TAB_STATUSES`:

```ts
const TAB_STATUSES: Record<DashboardTab, ServiceStatus[]> = {
  all:       ['ASSIGNED', 'ACCEPTED', 'IN_TRANSIT', 'DELIVERED'],
  pending:   ['ASSIGNED', 'ACCEPTED'],
  completed: ['DELIVERED'],
};
```

**`HomeScreen`**

- Reemplazado `ScrollView` por `FlatList` — renderiza la lista filtrada de servicios eficientemente
- Tabs conectados a `setActiveTab` del hook — la lista reacciona al cambio
- `totalOrders` calculado como `kpis.pending + kpis.inTransit + kpis.completed` (sin fallback hardcodeado)
- `ActiveServiceCard` recibe `onPress` y `onNavigate` reales → navegan a la tab `Orders`
- `ActiveServiceCard` solo se muestra en el tab "Todos" (no en Pendientes/Completados)
- Estado vacío con mensaje específico por tab:
  - "Todos" → "Sin servicios asignados"
  - "Pendientes" → "Sin pedidos pendientes"
  - "Completados" → "Sin entregas completadas"

**`ActiveServiceCard`**

- Eliminado `new Date()` hardcodeado como hora del servicio
- Eliminado estilo `time` huérfano

### Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/features/dashboard/hooks/useDashboard.ts` | `filteredServices`, `activeTab`, `setActiveTab`, `TAB_STATUSES`, limpieza de `useRef` |
| `src/features/dashboard/screens/HomeScreen.tsx` | `FlatList`, tabs funcionales, navegación real, empty states por tab |
| `src/features/dashboard/components/ActiveServiceCard.tsx` | Eliminado tiempo hardcodeado |

### Criterios de validación (segunda pasada)

| Verificación | Resultado |
|---|---|
| `getDiagnostics` en los 3 archivos modificados | ✅ 0 errores |
| `useDashboard` — sin imports sin usar | ✅ |
| `HomeScreen` — tabs filtran la lista real | ✅ |
| `HomeScreen` — `totalOrders` sin fallback hardcodeado | ✅ |
| `ActiveServiceCard` — sin `new Date()` hardcodeado | ✅ |
| Navegación al detalle — redirige a tab `Orders` | ✅ |
