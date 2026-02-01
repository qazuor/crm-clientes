# SPEC: Refactor Global del Sistema de Enriquecimiento

**ID**: ENRICH-REFACTOR-001
**Estado**: APROBADO
**Fecha**: 2026-01-31
**Autor**: Claude (propuesta inicial) + revision colaborativa

---

## 1. Contexto y Motivacion

El sistema de enriquecimiento actual tiene dos subsistemas que crecieron de forma independiente:

1. **Enriquecimiento AI**: Usa multiples proveedores (OpenAI, Gemini, Grok, DeepSeek) con consenso para sugerir datos del cliente (industria, email, telefono, redes sociales, etc.)
2. **Analisis Web**: Captura screenshots, ejecuta PageSpeed, analiza SSL, SEO, tech stack, accesibilidad, seguridad.

Ambos subsistemas funcionan pero presentan problemas de UX, duplicacion de codigo y fragmentacion que dificultan su uso y mantenimiento.

---

## 2. Problemas Identificados

### 2.1 Duplicacion de componentes

- `ClientInfoSearch.tsx` (472 lineas) y `AIEnrichmentPanel.tsx` (547 lineas) hacen esencialmente lo mismo: lanzan enriquecimiento AI y muestran resultados con diff/confirm/reject.
- Ambos definen internamente subcomponentes duplicados: `DiffLine`, `ConfidenceBadge`.
- `AIEnrichmentPanel` tiene soporte dark mode; `ClientInfoSearch` no. Estilos inconsistentes entre ambos.

**Decision**: Eliminar toda duplicacion. Un unico componente para disparar enriquecimiento, un unico componente para revisar y aceptar/rechazar resultados.

### 2.2 Multiples puntos de entrada desconectados

| Punto de entrada | Componente | Que hace |
|-----------------|------------|----------|
| Tabla de clientes | `EnrichmentModal` (via TablaClientes) | Modal con enriquecimiento AI |
| Detalle de cliente | `ClientInfoSearch` | Seccion de enriquecimiento AI |
| Detalle de cliente | `WebsiteAnalysisPanel` | Seccion separada de analisis web |
| Admin settings | Pagina bulk-enrich | Enriquecimiento masivo |

**Decision**: Consolidar en un unico modal overlay reutilizable:

- **Bulk desaparece como pagina en settings**.
- **Desde la tabla**: cada cliente tiene boton individual que abre el modal. Si se seleccionan varios clientes, el boton "Enriquecer" aparece en la barra de bulk actions.
- **Desde detalle/edicion del cliente**: boton "Enriquecer" que abre el mismo modal.
- **El modal** incluye formulario para elegir modelo de IA, profundidad de busqueda, y opciones adicionales.

### 2.3 API fragmentada

| Endpoint | Sistema | Funcion |
|----------|---------|---------|
| `POST /api/clientes/[id]/enrich` | Nuevo | Enriquecimiento AI individual |
| `GET /api/clientes/[id]/enrich` | Nuevo | Obtener estado enrichment |
| `PATCH /api/clientes/[id]/enrich` | Nuevo | Confirmar/rechazar campos |
| `POST /api/enrichment` | Legacy | Screenshots + PageSpeed |
| `POST /api/openai-search` | Experimental | Busqueda web con OpenAI |
| `POST /api/admin/bulk-enrich` | Nuevo | Enriquecimiento masivo |

**Decision**: Consolidar, agrupar y estandarizar. Eliminar endpoints legacy.

### 2.4 Dos modelos de datos para lo mismo

- **Modelo nuevo**: `ClienteEnrichment` (tabla dedicada con campos individuales, confidence, status per-field)
- **Modelo viejo**: Campos JSON en tabla `Cliente` (`websiteMetrics`, `techStack`, `socialProfiles`, `enrichmentData`)
- `WebsiteAnalysis` esta en su propio modelo pero completamente desconectado del flujo AI.

**Decision**: Un modelo `ClienteEnrichment` para datos enriquecidos por IA, un modelo `WebsiteAnalysis` para datos de analisis web. Eliminar campos JSON legacy de `Cliente`.

### 2.5 UX confusa

- El usuario no entiende la diferencia entre "buscar info del cliente" y "analizar su sitio web".
- El flujo de confirmacion campo-por-campo es bueno conceptualmente pero la UI es una lista larga y densa.
- No hay flujo unificado ni historial de enriquecimientos.

**Decision**: Los procesos de enrichment AI y website analysis siguen siendo **separados** (son cosas distintas). Website analysis solo se habilita si el cliente tiene un sitio web en su informacion. Se agrega historial real de enriquecimientos (1:N).

---

## 3. Propuesta de Solucion

### 3.1 Modal Unificado de Enriquecimiento

Un unico `EnrichmentModal` (overlay) que funciona tanto para 1 cliente como para N clientes. Es el componente central de toda la interaccion de enriquecimiento.

```
┌─────────────────────────────────────────────────────┐
│  Enriquecimiento: [Nombre Cliente]                  │
│  (o "Enriquecimiento: 5 clientes seleccionados")    │
│                                                     │
│  ┌─ Formulario de opciones ──────────────────────┐  │
│  │  Modelo IA: [OpenAI ▼]  Profundidad: [Full ▼] │  │
│  │  [ ] Hunter.io   [ ] SerpAPI   [ ] BuiltWith  │  │
│  │  Umbral confianza: [70% ▼]                     │  │
│  │                                                │  │
│  │  [Enriquecer IA]  [Analizar Web*]              │  │
│  │  (* solo si el cliente tiene sitio web)        │  │
│  └────────────────────────────────────────────────┘  │
│                                                     │
│  ┌─ Resultados / Revision ───────────────────────┐  │
│  │  (aparece despues de lanzar enriquecimiento)   │  │
│  │                                                │  │
│  │  Modo: [Rapido ○] [Detallado ○]               │  │
│  │  (contenido de revision segun modo)            │  │
│  └────────────────────────────────────────────────┘  │
│                                                     │
│  ⚠ Ya se enriquecio hace 2 horas. Continuar?       │
│  [Si, continuar]  [Cancelar]                        │
└─────────────────────────────────────────────────────┘
```

**Puntos de acceso al modal**:
- Tabla de clientes: boton individual por fila
- Tabla de clientes: boton "Enriquecer" en bulk actions (multi-seleccion)
- Pagina de detalle del cliente: boton "Enriquecer"
- Pagina de edicion del cliente: boton "Enriquecer"

**Comportamiento para bulk (N clientes)**:
- El formulario de opciones es el mismo
- No hay revision campo-por-campo en bulk (se aplica auto-confirm segun umbral, o queda PENDING para revision individual posterior)
- Se muestra progreso: "Procesando cliente 3 de 5..."

### 3.2 Pagina de Detalle del Cliente: Secciones de Enriquecimiento

En la pagina de detalle del cliente, en lugar de un panel con tabs, se muestran **secciones separadas**:

```
┌─────────────────────────────────────────────────┐
│  Cliente: Acme Corp                             │
│  [Enriquecer]  ← abre EnrichmentModal           │
│                                                 │
│  ── Datos Enriquecidos IA ─────────────────── │
│  Industria: Tecnologia (87%)  ✓ Confirmado      │
│  Email: info@acme.com (92%)   ✓ Confirmado      │
│  LinkedIn: /company/acme (78%) ⏳ Pendiente     │
│  ...                                            │
│                                                 │
│  ── Analisis Web ──────────────────────────── │
│  (solo visible si tiene sitio web)              │
│  Screenshots | Performance | SSL | SEO | ...    │
│                                                 │
│  ── Historial de Enriquecimientos ───────── │
│  31/01/2026 14:30 - IA (OpenAI, Gemini)         │
│    → 5 campos encontrados, 3 confirmados         │
│  28/01/2026 10:15 - IA (Grok, DeepSeek)         │
│    → 3 campos encontrados, 1 confirmado          │
│  25/01/2026 09:00 - Web Analysis                 │
│    → PageSpeed: 85, SSL: OK                      │
└─────────────────────────────────────────────────┘
```

**Componentes**:
- `EnrichmentSummary`: Muestra datos enriquecidos confirmados y pendientes
- `WebsiteSummary`: Resumen de analisis web (solo si hay website)
- `EnrichmentHistory`: Timeline de enriquecimientos pasados

### 3.3 Componentes Compartidos

Extraer a `src/components/enrichment/shared/`:

| Componente | Funcion |
|-----------|---------|
| `DiffLine.tsx` | Muestra valor actual vs sugerido con colores |
| `ConfidenceBadge.tsx` | Badge con porcentaje de confianza y color segun umbral |
| `FieldReviewCard.tsx` | Card para un campo: valor actual, sugerido, confidence, acciones (aceptar/rechazar/editar) |
| `FieldEditInput.tsx` | Input inline para editar valor sugerido antes de aceptar |
| `EnrichmentProgress.tsx` | Barra de progreso durante el enriquecimiento |
| `ProviderBadges.tsx` | Badges de proveedores AI que contribuyeron al resultado |

### 3.4 Flujo de Revision de Campos

Dos modos disponibles dentro del modal, despues de que el enriquecimiento IA retorna resultados:

#### Modo Rapido (por defecto)

Lista compacta con checkboxes y botones bulk:

```
┌────────────────────────────────────────────┐
│  5 campos nuevos encontrados               │
│                                            │
│  [✓] Industria: "Otro" → "Tecnologia" 87% │
│  [✓] Email: (vacio) → "info@..." 92%      │
│  [ ] Telefono: (vacio) → "+54..." 65%     │
│  [✓] LinkedIn: (vacio) → "/company/..." 78%│
│  [ ] Instagram: (vacio) → "@..." 45%      │
│                                            │
│  [Aceptar Seleccionados (3)]  [Rechazar Resto]  │
└────────────────────────────────────────────┘
```

- Campos **pre-seleccionados** si confidence > umbral configurable (default 70%).
- El umbral se configura en EnrichmentSettings como valor por defecto, pero es **editable en cada busqueda** desde el formulario del modal.
- Toggle individual + aplicar en batch.

#### Modo Detallado

Vista campo por campo con navegacion tipo stepper:

```
┌────────────────────────────────────────────┐
│  Revision Detallada (campo 1 de 5)         │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │  Industria                           │  │
│  │                                      │  │
│  │  Valor actual:  "Otro"               │  │
│  │  Sugerido:      "Tecnologia"         │  │
│  │  Confianza:     87% (Alta)           │  │
│  │  Fuentes:       OpenAI, Gemini       │  │
│  │                                      │  │
│  │  [Aceptar]  [Rechazar]  [Editar]     │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  [← Anterior]  ● ○ ○ ○ ○  [Siguiente →]   │
└────────────────────────────────────────────┘
```

- Navegacion tipo stepper con indicadores de progreso.
- **Opcion "Editar"**: permite modificar el valor sugerido antes de aceptar. Al hacer click, el valor sugerido se convierte en un input editable. El usuario modifica y confirma con el valor editado.
- Al finalizar la revision: resumen con lo aceptado/rechazado/editado.

### 3.5 Consolidacion de API

| Endpoint | Metodo | Funcion |
|----------|--------|---------|
| `/api/clientes/[id]/enrich` | `POST` | Lanzar enriquecimiento. Body: `{ mode: "ai" \| "web", provider?, quick?, options? }` |
| `/api/clientes/[id]/enrich` | `GET` | Obtener estado actual: ultimo enrichment AI + website analysis + historial |
| `/api/clientes/[id]/enrich` | `PATCH` | Confirmar/rechazar/editar campos. Body: `{ action: "confirm" \| "reject" \| "edit", fields, editedValues? }` |
| `/api/admin/bulk-enrich` | `POST` | Enriquecimiento masivo (invocado desde bulk actions de tabla) |
| `/api/admin/bulk-enrich` | `PATCH` | Batch confirm/reject campos para multiples clientes |

**Eliminar**:
- `POST /api/enrichment` → migrar a `POST /api/clientes/[id]/enrich` con `mode: "web"`
- `POST /api/openai-search` → integrar como proveedor dentro del consensus service

**GET response incluye**:
```json
{
  "latestEnrichment": { ... },
  "websiteAnalysis": { ... },
  "history": [
    { "id": "...", "type": "ai", "enrichedAt": "...", "providers": [...], "fieldsFound": 5, "fieldsConfirmed": 3 },
    { "id": "...", "type": "web", "analyzedAt": "...", "pageSpeedScore": 85 }
  ],
  "enrichmentStatus": "PARTIAL"
}
```

### 3.6 Modelo de Datos

#### ClienteEnrichment: de 1:1 a 1:N (historial real)

Cada enriquecimiento AI genera un **nuevo registro** en lugar de sobreescribir el anterior. Esto permite:
- Historial completo de enriquecimientos
- Ver que encontro cada ejecucion
- Comparar resultados entre proveedores/fechas

La relacion en Prisma cambia de:
```prisma
// ANTES (1:1)
enrichment  ClienteEnrichment?

// DESPUES (1:N)
enrichments  ClienteEnrichment[]
```

Se agrega campo `enrichmentStatus` al modelo `Cliente`:
```prisma
enrichmentStatus  EnrichmentStatusEnum  @default(NONE)
// Valores: NONE, PENDING, PARTIAL, COMPLETE
```

#### Eliminar campos JSON legacy de Cliente:
- `websiteMetrics Json?`
- `techStack Json?`
- `socialProfiles Json?`
- `enrichmentData Json?`

Migracion de datos: los datos existentes en estos campos JSON se migran a `ClienteEnrichment` y/o `WebsiteAnalysis` segun corresponda antes de eliminar los campos.

#### WebsiteAnalysis: se mantiene como esta (1:1)

No necesita historial por ahora. Se sobreescribe en cada analisis.

### 3.7 Cooldown con Warning

Antes de lanzar un enriquecimiento, el sistema verifica si ya se enriquecio recientemente:
- Si el ultimo enriquecimiento fue hace menos de **24 horas** (configurable en settings), muestra un dialogo de confirmacion: "Ya se enriquecio hace X horas. ¿Continuar de todas formas?"
- El usuario puede confirmar y proceder, o cancelar.
- No es un bloqueo hard, solo un aviso para evitar consumo innecesario de APIs.

### 3.8 Eliminacion de Dark Mode

Se elimina todo el codigo dark mode existente en los componentes de enriquecimiento. La aplicacion trabaja exclusivamente en light mode. Esto incluye:
- Clases `dark:` en componentes de enrichment
- Logica condicional de tema en componentes de enrichment
- Cualquier referencia a dark mode en el sistema de enriquecimiento

### 3.9 Hook Unificado

Reemplazar `useAIEnrichment`, `useBulkEnrichment` y `useEnrichment` (legacy) con un unico hook `useEnrichment`:

```typescript
const {
  // Estado
  latestEnrichment,       // Ultimo enriquecimiento AI
  websiteAnalysis,        // Analisis web actual
  history,                // Array de enriquecimientos pasados
  enrichmentStatus,       // NONE | PENDING | PARTIAL | COMPLETE
  isEnriching,            // Mutacion en progreso
  pendingFields,          // Campos pendientes de revision

  // Acciones individuales
  enrichAI,               // (options) => Lanzar enriquecimiento AI
  enrichWeb,              // () => Lanzar analisis web
  confirmFields,          // (fields) => Confirmar campos
  rejectFields,           // (fields) => Rechazar campos
  editField,              // (field, newValue) => Aceptar con valor editado

  // Acciones bulk
  bulkEnrich,             // (clienteIds, options) => Enriquecimiento masivo
  confirmAll,             // () => Confirmar todos los pendientes
  rejectAll,              // () => Rechazar todos los pendientes

  // Utilidades
  shouldWarnCooldown,     // boolean - si mostrar warning de cooldown
  lastEnrichedAt,         // Date del ultimo enriquecimiento
  refetch,                // Refrescar datos
} = useEnrichment(clienteId | clienteIds[]);
```

Cache via React Query con stale time de 5 minutos. Invalidacion automatica tras mutaciones.

---

## 4. Inventario de Archivos

### 4.1 Archivos a Crear

| Archivo | Descripcion |
|---------|-------------|
| `src/components/enrichment/shared/DiffLine.tsx` | Componente diff reutilizable (valor actual vs sugerido) |
| `src/components/enrichment/shared/ConfidenceBadge.tsx` | Badge de confianza con color segun umbral |
| `src/components/enrichment/shared/FieldReviewCard.tsx` | Card por campo: valor, sugerido, confidence, acciones |
| `src/components/enrichment/shared/FieldEditInput.tsx` | Input para editar valor sugerido antes de aceptar |
| `src/components/enrichment/shared/EnrichmentProgress.tsx` | Barra de progreso durante enriquecimiento |
| `src/components/enrichment/shared/ProviderBadges.tsx` | Badges de proveedores AI con iconos |
| `src/components/enrichment/EnrichmentModal.tsx` | Modal overlay principal. Form opciones + resultados + revision. Para 1 o N clientes |
| `src/components/enrichment/EnrichmentForm.tsx` | Formulario: selector modelo IA, profundidad, APIs externas, umbral confianza |
| `src/components/enrichment/EnrichmentReview.tsx` | Componente de revision: modo rapido (checkboxes/bulk) + modo detallado (stepper) |
| `src/components/enrichment/EnrichmentSummary.tsx` | Resumen de datos enriquecidos confirmados (para pagina detalle) |
| `src/components/enrichment/EnrichmentHistory.tsx` | Timeline de enriquecimientos pasados (para pagina detalle) |
| `src/components/enrichment/WebsiteSummary.tsx` | Resumen de analisis web (para pagina detalle, solo si hay website) |
| `src/hooks/useEnrichment.ts` | Hook unificado de enriquecimiento (reemplaza 3 hooks) |

### 4.2 Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `prisma/schema.prisma` | ClienteEnrichment de 1:1 a 1:N. Agregar enrichmentStatus a Cliente. Eliminar campos JSON legacy |
| `src/types/enrichment.ts` | Tipos para modal, opciones de busqueda, historial, accion "edit" |
| `src/types/index.ts` | Actualizar interface Cliente (quitar JSON legacy, agregar enrichmentStatus) |
| `src/app/api/clientes/[id]/enrich/route.ts` | Agregar mode param, crear registro nuevo (1:N), soportar accion "edit", incluir historial en GET |
| `src/app/api/admin/bulk-enrich/route.ts` | Adaptar a modelo 1:N, ajustar para invocacion desde tabla |
| `src/app/clientes/[id]/page.tsx` | Reemplazar ClientInfoSearch + WebsiteAnalysisPanel por EnrichmentSummary + WebsiteSummary + EnrichmentHistory + boton EnrichmentModal |
| `src/components/TablaClientes.tsx` | Agregar "Enriquecer" en bulk actions + boton individual que abre EnrichmentModal |
| `src/components/enrichment/EnrichmentBadge.tsx` | Adaptar a modelo 1:N (leer ultimo enrichment de la lista) |
| `src/lib/services/bulk-enrichment-service.ts` | Adaptar a modelo 1:N |
| `src/lib/services/consensus-service.ts` | Integrar logica de /api/openai-search si aplica |

### 4.3 Archivos a Eliminar

| Archivo | Razon |
|---------|-------|
| `src/components/enrichment/ClientInfoSearch.tsx` | Reemplazado por EnrichmentModal + EnrichmentReview |
| `src/components/enrichment/AIEnrichmentPanel.tsx` | Reemplazado por EnrichmentModal + EnrichmentReview |
| `src/components/enrichment/EnrichmentPanel.tsx` | (actual, de website) Reemplazado por WebsiteSummary |
| `src/components/enrichment/WebsiteAnalysisPanel.tsx` | Reemplazado por WebsiteSummary + modal |
| `src/app/api/enrichment/route.ts` | Migrado a /api/clientes/[id]/enrich con mode:"web" |
| `src/app/api/openai-search/route.ts` | Integrado en consensus service |
| `src/hooks/useAIEnrichment.ts` | Reemplazado por useEnrichment unificado |
| `src/hooks/useEnrichment.ts` | (legacy de website) Reemplazado por useEnrichment unificado |
| `src/hooks/useBulkEnrichment.ts` | Reemplazado por useEnrichment unificado |
| `src/app/admin/settings/bulk-enrich/page.tsx` | Funcionalidad movida a bulk actions en tabla |

---

## 5. Orden de Ejecucion

### Fase 1: Migracion de datos y schema (PRIMERO - todo lo demas depende de esto)

1. Modificar `prisma/schema.prisma`: ClienteEnrichment de 1:1 a 1:N
2. Agregar `enrichmentStatus` enum y campo a modelo Cliente
3. Crear migracion Prisma para cambios de relacion y nuevo campo
4. Crear script de migracion de datos: mover JSON legacy a modelos dedicados
5. Eliminar campos JSON legacy del schema (`websiteMetrics`, `techStack`, `socialProfiles`, `enrichmentData`)
6. Aplicar migracion final y regenerar Prisma client

### Fase 2: Tipos y servicios

7. Actualizar `src/types/enrichment.ts` (nuevos tipos, accion "edit", historial)
8. Actualizar `src/types/index.ts` (interface Cliente sin JSON legacy, con enrichmentStatus)
9. Adaptar `consensus-service.ts` (integrar logica de openai-search si aplica)
10. Adaptar `bulk-enrichment-service.ts` al modelo 1:N
11. Modificar API route `POST /api/clientes/[id]/enrich` (mode param, crear nuevo registro, soportar edit)
12. Modificar API route `GET /api/clientes/[id]/enrich` (incluir historial y websiteAnalysis)
13. Modificar API route `PATCH /api/clientes/[id]/enrich` (soportar accion "edit" con editedValues)
14. Adaptar `POST/PATCH /api/admin/bulk-enrich` al modelo 1:N

### Fase 3: Hook unificado

15. Crear `src/hooks/useEnrichment.ts` unificado (reemplaza 3 hooks)

### Fase 4: Componentes compartidos

16. Crear `shared/DiffLine.tsx`
17. Crear `shared/ConfidenceBadge.tsx`
18. Crear `shared/FieldReviewCard.tsx`
19. Crear `shared/FieldEditInput.tsx`
20. Crear `shared/EnrichmentProgress.tsx`
21. Crear `shared/ProviderBadges.tsx`

### Fase 5: Modal y componentes del modal

22. Crear `EnrichmentForm.tsx` (selector modelo IA, profundidad, opciones, umbral)
23. Crear `EnrichmentReview.tsx` (modo rapido + detallado + editar)
24. Crear `EnrichmentModal.tsx` (combina form + review, funciona para 1 o N)

### Fase 6: Componentes de pagina de detalle

25. Crear `EnrichmentSummary.tsx` (datos confirmados/pendientes)
26. Crear `WebsiteSummary.tsx` (resumen analisis web, solo si hay website)
27. Crear `EnrichmentHistory.tsx` (timeline de enriquecimientos)

### Fase 7: Integracion

28. Integrar EnrichmentSummary + WebsiteSummary + EnrichmentHistory + boton modal en `clientes/[id]/page.tsx`
29. Integrar EnrichmentModal como boton individual en TablaClientes
30. Agregar "Enriquecer" como opcion en bulk actions de TablaClientes
31. Adaptar EnrichmentBadge al modelo 1:N

### Fase 8: Limpieza

32. Eliminar `ClientInfoSearch.tsx`
33. Eliminar `AIEnrichmentPanel.tsx`
34. Eliminar `EnrichmentPanel.tsx` (actual, de website)
35. Eliminar `WebsiteAnalysisPanel.tsx`
36. Eliminar `src/app/api/enrichment/route.ts`
37. Eliminar `src/app/api/openai-search/route.ts` (si existe)
38. Eliminar `useAIEnrichment.ts`
39. Eliminar `useEnrichment.ts` (legacy)
40. Eliminar `useBulkEnrichment.ts`
41. Eliminar `src/app/admin/settings/bulk-enrich/page.tsx`
42. Eliminar todo codigo dark mode de componentes de enrichment

### Fase 9: Verificacion

43. `npm run build` sin errores TypeScript
44. Verificar flujo individual: enriquecer desde detalle de cliente via modal
45. Verificar flujo tabla: modal individual por fila
46. Verificar flujo bulk: seleccionar multiples clientes + enriquecer desde bulk actions
47. Verificar historial: cada enriquecimiento genera nuevo registro
48. Verificar cooldown: warning al re-enriquecer dentro de 24h
49. Verificar editar valor: flujo completo en modo detallado
50. Verificar website analysis: solo habilitado si cliente tiene sitio web
51. Verificar EnrichmentBadge funciona con modelo 1:N

---

## 6. Criterios de Aceptacion

- [ ] Modal overlay unico de enriquecimiento funcionando desde tabla (individual), bulk actions (multiple), y detalle del cliente
- [ ] Modal incluye formulario con selector de modelo IA, profundidad, APIs externas, y umbral de confianza editable
- [ ] Modo rapido de revision con checkboxes, pre-seleccion por umbral configurable, y acciones bulk
- [ ] Modo detallado con navegacion stepper campo-por-campo
- [ ] Accion "Editar" permite modificar valor sugerido antes de aceptar
- [ ] Cooldown: warning con confirmacion si se re-enriquece dentro de 24h (configurable)
- [ ] Pagina de detalle muestra: EnrichmentSummary + WebsiteSummary + EnrichmentHistory
- [ ] Website analysis solo habilitado si el cliente tiene sitio web
- [ ] API consolidada: POST/GET/PATCH en `/api/clientes/[id]/enrich` con mode param
- [ ] Modelo ClienteEnrichment 1:N (historial real, no sobreescritura)
- [ ] Campo enrichmentStatus en Cliente (NONE/PENDING/PARTIAL/COMPLETE)
- [ ] Sin endpoints legacy (`/api/enrichment`, `/api/openai-search`)
- [ ] Sin componentes duplicados (ClientInfoSearch, AIEnrichmentPanel eliminados)
- [ ] Sin campos JSON legacy en modelo Cliente
- [ ] Sin codigo dark mode en componentes de enrichment
- [ ] Pagina bulk-enrich eliminada de admin settings
- [ ] Hook useEnrichment unificado reemplaza useAIEnrichment + useBulkEnrichment + useEnrichment legacy
- [ ] Umbral de confianza configurable en settings (default) y editable por busqueda
- [ ] Build exitoso sin errores TypeScript
- [ ] Bulk enrichment funciona desde bulk actions de la tabla

---

## 7. Decisiones Tomadas

| Decision | Resultado |
|----------|-----------|
| Dark mode | **No**. Eliminar todo dark mode. Solo light mode. |
| Umbral auto-seleccion | **70% default**, configurable en settings, editable por busqueda |
| Editar valor sugerido | **Si**. Tercera accion: Aceptar / Rechazar / Editar |
| Cooldown re-enriquecimiento | **Warning con confirm**. Avisa pero permite continuar |
| Historial | **Real (1:N)**. Cada enriquecimiento crea nuevo registro |
| Bulk enrich desde settings | **Eliminado**. Se mueve a bulk actions de la tabla |
| Modal vs drawer | **Modal overlay** |
| Procesos AI vs Web | **Separados**. Web solo si hay URL de sitio web |
| Datos JSON legacy | Migrar a modelos dedicados y eliminar campos |
