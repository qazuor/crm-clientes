# Audit de Produccion - Items Pendientes

> Generado: 2026-02-02
> Auditoria completa del CRM Clientes. Los items marcados con ✅ ya fueron corregidos.
> Este documento lista todo lo que **queda pendiente** de resolver.

---

## 1. SEGURIDAD - ACCIONES MANUALES URGENTES

Estos items requieren accion manual, no pueden resolverse con cambios de codigo.

### 1.1 API Keys expuestas en historial de git
**Prioridad: CRITICA**

El archivo `.env.local` fue commiteado al repositorio con API keys reales:
- `OPENAI_API_KEY`
- `GOOGLE_PLACES_API_KEY`
- `GOOGLE_API_KEY`
- `GOOGLE_CSE_ID`
- `BETTER_AUTH_SECRET`

**Accion requerida:**
1. Revocar TODAS las API keys expuestas desde los dashboards de cada proveedor
2. Generar keys nuevas
3. Limpiar el historial de git con BFG Repo-Cleaner:
   ```bash
   # Instalar BFG
   brew install bfg  # o descarga desde https://rtyley.github.io/bfg-repo-cleaner/

   # Limpiar el archivo del historial
   bfg --delete-files .env.local
   git reflog expire --expire=now --all && git gc --prune=now --aggressive
   git push --force
   ```
4. Configurar las keys nuevas solo en el dashboard de Vercel (nunca en git)

### 1.2 Passwords de seed por defecto
**Prioridad: ALTA**

Los usuarios de seed usan password `123456`. Si la base de produccion se seedea con estos datos, cualquiera podria acceder.

**Accion requerida:**
- Cambiar passwords en `prisma/seed.ts` o asegurar que el seed solo corre en desarrollo
- Crear usuarios de produccion manualmente con passwords fuertes

### 1.3 Configurar `ENCRYPTION_SALT` en produccion
**Prioridad: ALTA**

Se agrego soporte para `ENCRYPTION_SALT` como variable de entorno (con fallback al valor anterior por compatibilidad). Para nuevos deployments, configurar un salt unico:
```
ENCRYPTION_SALT=<string-aleatorio-de-32-caracteres>
```

---

## 2. SEGURIDAD - CAMBIOS DE CODIGO

### 2.1 Rate limiting en endpoints de autenticacion
**Prioridad: ALTA**
**Archivos:** `src/app/api/auth/[...all]/route.ts`, todos los endpoints API

No hay rate limiting en ningun endpoint. Un atacante puede:
- Fuerza bruta en login
- Ataques de denegacion de servicio
- Enumeracion de emails

**Solucion recomendada:** Implementar `@upstash/ratelimit` (compatible con Vercel):
```bash
npm install @upstash/ratelimit @upstash/redis
```
Crear middleware de rate limiting con limites por IP y por usuario.

### 2.2 Proteccion CSRF
**Prioridad: ALTA**
**Archivos:** Todos los endpoints POST/PUT/DELETE

No hay validacion de token CSRF explicita. Better Auth maneja SameSite cookies pero no hay proteccion CSRF explícita.

**Solucion:** Verificar que Better Auth configure `SameSite: Strict` en cookies, o implementar tokens CSRF manuales.

### 2.3 Configuracion de cookies de sesion
**Prioridad: ALTA**
**Archivo:** `src/lib/auth.ts`

No se configuran explicitamente los flags de seguridad de la cookie de sesion:
- `httpOnly: true`
- `secure: true` (solo HTTPS)
- `sameSite: 'strict'`
- La sesion dura 30 dias (considerar reducir a 7)

**Solucion:** Agregar configuracion explicita en Better Auth:
```typescript
session: {
  expiresIn: 60 * 60 * 24 * 7, // 7 dias
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  }
}
```

### 2.4 Mecanismo de bloqueo de cuenta
**Prioridad: MEDIA**

No hay bloqueo de cuenta despues de N intentos fallidos de login.

**Solucion:** Implementar contador de intentos fallidos y bloqueo temporal (30 min despues de 5 intentos).

### 2.5 Validacion con Zod en endpoints de enrichment
**Prioridad: MEDIA**
**Archivo:** `src/app/api/clientes/[id]/enrich/route.ts` (lineas 58-82)

El POST de enrichment acepta `options` sin validacion Zod:
```typescript
let options = {};
try { options = await request.json(); } catch { }
```

Crear un schema Zod para validar `mode`, `fields`, `provider`, etc.

### 2.6 Validacion con Zod en PATCH de enrichment
**Prioridad: MEDIA**
**Archivo:** `src/app/api/clientes/[id]/enrich/route.ts` (lineas 410-441)

El PATCH usa validacion manual con `includes()` en lugar de Zod.

### 2.7 Validacion del parametro `days` en quotas/history
**Prioridad: BAJA**
**Archivo:** `src/app/api/quotas/history/route.ts` (linea 26)

El parametro `days` se parsea con `parseInt` sin validacion Zod.

### 2.8 Ampliar lista de keys sensibles en logger
**Prioridad: BAJA**
**Archivo:** `src/lib/logger.ts` (linea 12)

La lista `SENSITIVE_KEYS` no incluye: `email`, `telefono`, `whatsapp`, `Authorization` (capitalizado).

### 2.9 Audit log para operaciones de admin
**Prioridad: BAJA**

No hay audit trail para: creacion/eliminacion de API keys, cambios de settings, reset de quotas. Considerar agregar tabla `AuditLog` y registrar WHO/WHAT/WHEN/FROM WHERE.

---

## 3. PERFORMANCE Y OPTIMIZACION

### 3.1 N+1 queries en endpoint de stats
**Prioridad: ALTA**
**Archivo:** `src/app/api/stats/route.ts` (lineas 27-112)

Tres `groupBy` queries separadas (por estado, prioridad, fuente) en cada carga del dashboard.

**Solucion:** Combinar en una sola query SQL raw o usar Prisma raw queries.

### 3.2 Cache-Control headers faltantes
**Prioridad: ALTA**
**Archivos:** Todos los API routes

Ningun endpoint API setea headers de cache. Cada request del cliente va a la base de datos.

**Solucion:** Agregar headers segun tipo de datos:
- Datos estaticos (industrias, ciudades): `Cache-Control: public, max-age=3600`
- Listas de clientes: `Cache-Control: private, max-age=60`
- Stats: `Cache-Control: private, max-age=30`

### 3.3 Conteo en dashboard incluye clientes eliminados
**Prioridad: ALTA**
**Archivo:** `src/app/page.tsx` (linea 24)

```typescript
prisma.cliente.count() // Cuenta clientes soft-deleted
```

Falta el filtro `where: { deletedAt: null }`.

### 3.4 Indexes compuestos faltantes en base de datos
**Prioridad: MEDIA**
**Archivo:** `prisma/schema.prisma`

Indexes que mejorarian las queries frecuentes:
```prisma
// En modelo Cliente
@@index([deletedAt, estado, prioridad])  // Para dashboard filtrado
@@index([deletedAt])                      // Index simple para soft-delete

// En modelo Actividad
@@index([clienteId, deletedAt])           // Para listar actividades no eliminadas
```

### 3.5 AbortController faltante en fetch de hooks
**Prioridad: MEDIA**
**Archivos:** `src/hooks/useEnrichment.ts`, `src/hooks/useAIEnrichment.ts`, `src/hooks/useBulkEnrichment.ts`

Los fetch calls no usan AbortController. Si el componente se desmonta durante un request lento, el request sigue en vuelo.

**Solucion:** Agregar signal de abort en cada fetch:
```typescript
const controller = new AbortController();
const res = await fetch(url, { signal: controller.signal });
// cleanup: controller.abort()
```

### 3.6 Timeout faltante en llamadas a AI providers
**Prioridad: MEDIA**
**Archivo:** `src/lib/services/consensus-service.ts`

Las llamadas a AI providers (OpenAI, Gemini, Grok, DeepSeek) no tienen timeout configurable. Pueden colgar indefinidamente.

### 3.7 Sin control de concurrencia en bulk enrichment
**Prioridad: MEDIA**
**Archivo:** `src/app/api/admin/bulk-enrich/route.ts`

Acepta hasta 50 clientes pero lanza todas las llamadas a AI en paralelo sin limite de concurrencia. Puede agotar quotas o rate limits de providers.

**Solucion:** Implementar pool de concurrencia (3-5 llamadas en paralelo maximo).

### 3.8 Polling de notificaciones sin cleanup
**Prioridad: BAJA**
**Archivo:** `src/hooks/useNotifications.ts`

`refetchInterval: 60000` sigue polling incluso si el tab no esta visible.

**Solucion:** Usar `enabled` flag basado en visibilidad del tab o `refetchIntervalInBackground: false`.

### 3.9 React.memo faltante en componentes de tabla
**Prioridad: BAJA**
**Archivo:** `src/components/TablaClientes.tsx`

Filas de tabla no memorizadas. Re-renderizan en cada cambio de estado del padre.

### 3.10 Dynamic imports para componentes pesados
**Prioridad: BAJA**
**Archivo:** `src/app/clientes/[id]/page.tsx`

`ClientEnrichmentSection` se importa directamente. Usar `next/dynamic` para lazy loading.

### 3.11 Diferenciacion de staleTime en React Query
**Prioridad: BAJA**
**Archivo:** `src/components/Providers.tsx`

Todo usa `staleTime: 60 * 1000`. Datos estaticos podrian usar 1 hora, stats 30 segundos.

---

## 4. RESILIENCIA Y MANEJO DE ERRORES

### 4.1 Circuit breaker para servicios externos
**Prioridad: ALTA**

Si un servicio externo (OpenAI, PageSpeed, Screenshot) esta caido, la app sigue intentando y falla cada request. No hay mecanismo de fail-fast.

**Solucion:** Implementar circuit breaker pattern:
- Despues de N fallos consecutivos, dejar de llamar al servicio por M segundos
- Retornar error inmediato (cached response o degraded mode)

### 4.2 Retry logic con exponential backoff
**Prioridad: MEDIA**
**Archivos:** Todas las llamadas a APIs externas

No hay retry en llamadas a APIs externas. Errores transitorios (timeout, 503) causan fallo permanente.

**Solucion:**
```typescript
async function withRetry(fn, maxRetries = 3, baseDelay = 100) {
  for (let i = 0; i < maxRetries; i++) {
    try { return await fn(); }
    catch (e) {
      if (i === maxRetries - 1) throw e;
      await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, i)));
    }
  }
}
```

### 4.3 Quota manager fallback silencioso
**Prioridad: MEDIA**
**Archivo:** `src/lib/quota-manager.ts` (lineas 82-89)

Si la BD no esta disponible, el quota manager retorna `used: 0` (quota llena disponible). Puede causar sobre-uso masivo de APIs externas.

**Solucion:** En caso de error de BD, denegar quota (fail-closed en vez de fail-open).

### 4.4 Race condition en enrichment concurrente
**Prioridad: MEDIA**
**Archivo:** `src/app/api/clientes/[id]/enrich/route.ts`

Dos usuarios pueden iniciar enrichment del mismo cliente simultaneamente, creando registros duplicados.

**Solucion:** Agregar unique constraint o check de estado `IN_PROGRESS` antes de crear nuevo enrichment.

### 4.5 Activity logging fuera de transaccion en bulk
**Prioridad: BAJA**
**Archivo:** `src/app/api/clientes/bulk/route.ts` (lineas 85-91)

Despues del `$transaction`, el logging de actividades es secuencial y fuera de la transaccion. Si falla, se pierde el audit trail.

### 4.6 Esquema de errores de Prisma incompleto
**Prioridad: BAJA**

Solo se maneja P2002 (unique constraint). Otros errores frecuentes no manejados:
- `P2025` - Record not found (despues de soft delete)
- `P2003` - Foreign key constraint
- `P2014` - Required relation violation

---

## 5. CALIDAD DE CODIGO Y TIPOS

### 5.1 Type assertion insegura en auth
**Prioridad: MEDIA**
**Archivo:** `src/lib/auth.ts` (linea 70)

```typescript
role: (session.user as Record<string, unknown>).role as string || 'AGENT',
```

Doble type assertion sin type narrowing.

### 5.2 TipoActividad enum incompleto en types/index.ts
**Prioridad: MEDIA**
**Archivo:** `src/types/index.ts` (lineas 22-29)

El enum en `types/index.ts` no incluye: `CLIENTE_CREADO`, `CLIENTE_EDITADO`, `CLIENTE_ELIMINADO`, `IA_ENRIQUECIMIENTO`, `CONTACTO_AUTOMATICO` que si estan en el schema de Prisma.

### 5.3 Interfaces ApiResponse duplicadas
**Prioridad: BAJA**
**Archivos:** `src/app/api/admin/api-keys/route.ts`, `src/app/api/admin/api-keys/[id]/route.ts`, `src/app/api/admin/settings/enrichment/route.ts`

Cada archivo define su propia `interface ApiResponse<T>` en lugar de importar de `src/types/index.ts`.

### 5.4 Magic numbers dispersos
**Prioridad: BAJA**
**Archivos:** Multiples

Limites de paginacion (10, 20, 50, 100), cooldowns (24h), tamaños de bulk (50) estan hardcodeados en distintos archivos. Centralizar en constantes.

### 5.5 Return types faltantes en route handlers
**Prioridad: BAJA**

Muchos route handlers no tienen anotacion de tipo de retorno explícita (stats, quotas, actividades, etc). Solo api-keys las tiene.

### 5.6 Foreign key sin onDelete en Actividad → User
**Prioridad: BAJA**
**Archivo:** `prisma/schema.prisma` (linea 205)

La relacion `usuario User @relation(...)` no tiene `onDelete` clause. Si se elimina un user, las actividades quedan huerfanas.

### 5.7 Soft delete inconsistente entre modelos
**Prioridad: BAJA**
**Archivo:** `prisma/schema.prisma`

Cliente y Actividad tienen `deletedAt`, pero PlantillaContacto, Mensaje, ClienteEnrichment y WebsiteAnalysis no.

---

## 6. INFRAESTRUCTURA Y DEPLOYMENT

### 6.1 CI/CD pipeline
**Prioridad: ALTA**

No hay `.github/workflows/`. Crear pipelines para:

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx prisma generate
      - run: npm run lint
      - run: npx tsc --noEmit
```

### 6.2 Error monitoring (Sentry)
**Prioridad: ALTA**

No hay servicio de monitoreo de errores. `ErrorBoundary.tsx` tiene un TODO para Sentry.

**Solucion:**
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

### 6.3 Health check endpoint
**Prioridad: ALTA**

No existe endpoint `/api/health` para monitoreo.

**Solucion:** Crear endpoint que verifique:
- Conexion a BD (simple query)
- Estado de servicios externos (opcional)
- Version de la app

### 6.4 Backups de base de datos
**Prioridad: ALTA**

No hay estrategia de backups configurada.

**Solucion:** Si usas Vercel Postgres, habilitar backups automaticos. Si es self-hosted, configurar `pg_dump` diario.

### 6.5 Screenshots en almacenamiento local
**Prioridad: MEDIA**
**Directorio:** `public/screenshots/`

Screenshots guardados en el filesystem local. En Vercel (serverless), el filesystem es efimero.

**Solucion:** Migrar a Vercel Blob (ya configurado en env como `BLOB_READ_WRITE_TOKEN`).

### 6.6 Cron jobs para tareas programadas
**Prioridad: MEDIA**

No hay cron jobs para:
- Limpieza de notificaciones viejas
- Reset automatico de quotas (hoy depende de requests)
- Cleanup de sesiones expiradas

**Solucion:** Configurar Vercel Cron en `vercel.json`:
```json
{
  "crons": [
    { "path": "/api/cron/cleanup", "schedule": "0 0 * * *" }
  ]
}
```

### 6.7 Logging centralizado
**Prioridad: MEDIA**

Los logs van a stdout/console. En produccion, se pierden despues de que la funcion serverless termina.

**Solucion:** Integrar con Datadog, Papertrail, o LogDNA para persistencia de logs.

---

## 7. SEO Y ACCESIBILIDAD (si aplica como app publica)

### 7.1 Metadata incompleta
**Prioridad: BAJA**

Solo tiene titulo y descripcion basicos. Falta Open Graph, Twitter Cards, canonical URLs.

### 7.2 Accesibilidad
**Prioridad: BAJA**

- Verificar ARIA labels en todos los form inputs
- Testear navegacion por teclado
- Agregar skip links
- Verificar focus indicators

---

## Resumen de Prioridades

| Prioridad | Cantidad | Categorias |
|-----------|----------|------------|
| CRITICA   | 1        | API keys expuestas en git |
| ALTA      | 11       | Rate limiting, CI/CD, Sentry, health check, backups, cache headers, cookies, CSRF, stats N+1, dashboard count, circuit breaker |
| MEDIA     | 15       | DB indexes, abort controllers, AI timeout, concurrency, retry logic, quota fallback, race conditions, Zod validation, type safety, bloqueo cuenta, cron jobs, logging, screenshots |
| BAJA      | 13       | React.memo, dynamic imports, staleTime, polling, magic numbers, soft delete, foreign keys, SEO, a11y, audit log, enum types, etc |

---

## Items YA Corregidos (referencia)

Para contexto, estos items ya fueron aplicados durante la auditoria:

- ✅ Auth checks en GET endpoints (clientes, actividades)
- ✅ Credenciales de test ocultas en produccion (login page)
- ✅ JSON.parse con try-catch (enrich route)
- ✅ `console.error/warn` → `logger` (25+ llamadas en 15 archivos server-side)
- ✅ Sanitizacion de mensajes de error (no exponer internals al cliente)
- ✅ RBAC unificado con `isAdmin()` (14 checks en 8 archivos)
- ✅ CSP `unsafe-eval` solo en desarrollo (next.config.ts)
- ✅ Validacion de sortBy con enum (cliente validation)
- ✅ Transaccion atomica en actividades POST
- ✅ Manejo de Prisma P2002 en clientes POST
- ✅ Salt de crypto configurable via env var
- ✅ Placeholder de BETTER_AUTH_SECRET removido en env.ts
- ✅ Filtro soft-delete en bulk-enrichment-service y actividades GET
