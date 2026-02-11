# CRM Clientes

## Project Overview

Client Relationship Management (CRM) application for managing clients, activities, messages, and AI-powered data enrichment. Built with Next.js App Router, Prisma ORM, and PostgreSQL.

## Technology Stack

- **Runtime**: Node.js with TypeScript (strict mode)
- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL with Prisma ORM 5.22
- **Authentication**: better-auth
- **UI**: Tailwind CSS 4, Radix UI, Headless UI, Lucide/Heroicons/Phosphor icons
- **State Management**: TanStack React Query, TanStack React Table, TanStack React Form
- **Rich Text**: Tiptap editor
- **Validation**: Zod
- **Email**: Resend
- **Storage**: Vercel Blob
- **Rate Limiting**: Upstash Redis
- **AI**: OpenAI SDK
- **Package Manager**: pnpm

## Architecture

### Directory Structure

```
src/
  app/                  # Next.js App Router pages and API routes
    api/                # REST API endpoints
      clientes/         # Client CRUD + enrichment
      actividades/      # Activity tracking
      mensajes/         # Messaging
      admin/            # Admin endpoints (API keys, bulk enrich)
      auth/             # Authentication routes (better-auth)
      stats/            # Dashboard statistics
      quotas/           # Usage quotas
    clientes/           # Client pages (list, detail)
    actividades/        # Activity pages
    admin/              # Admin pages
    auth/               # Auth pages
  components/           # React components
    enrichment/         # AI enrichment UI (modal, review, history, summary)
      shared/           # Shared enrichment subcomponents
    shared/             # Shared components (icons, utilities)
    ui/                 # Base UI components
    admin/              # Admin panel components
  hooks/                # Custom React hooks
  lib/                  # Core utilities and services
    services/           # Business logic services
    validations/        # Zod validation schemas
  test/                 # Test setup, utilities, and mocks
  types/                # TypeScript type definitions
```

### Key Patterns

- **API Routes**: Next.js route handlers with Zod validation and typed responses
- **Path Alias**: `@/*` maps to `./src/*`
- **Auth**: better-auth with RBAC (role-based access control)
- **Data Fetching**: TanStack React Query for client-side, server components for SSR
- **Enrichment System**: AI-powered client data enrichment with multi-provider support, review workflow, and confidence scoring
- **Error Handling**: Typed API responses with circuit breaker and retry patterns

## Development

### Commands

```bash
pnpm dev              # Start dev server (port 4500)
pnpm build            # Build for production
pnpm lint             # Run ESLint
pnpm db:migrate       # Run Prisma migrations
pnpm db:push          # Push schema changes
pnpm db:studio        # Open Prisma Studio
pnpm db:seed          # Seed database
pnpm docker:up        # Start Docker services
pnpm docker:down      # Stop Docker services
pnpm test             # Run tests
pnpm test:watch       # Run tests in watch mode
pnpm test:coverage    # Run tests with coverage report
```

### Database

- PostgreSQL via Docker (see `docker/docker-compose.yml`)
- Prisma schema at `prisma/schema.prisma`
- Seed scripts at `prisma/seed.ts`, `prisma/seed-restore.ts`, `prisma/seed-plantillas.ts`

#### Migrations (Local)

```bash
pnpm db:migrate             # prisma migrate dev (generates + applies migration)
pnpm db:push                # prisma db push (direct sync, no migration file)
```

If `migrate dev` fails with shadow DB errors (P3006), create migrations manually:

```bash
# Generate diff SQL from live DB vs schema
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma --script

# Create migration dir and write SQL
mkdir -p prisma/migrations/YYYYMMDDHHMMSS_description/
# Write SQL to migration.sql in that directory

# Apply without shadow DB
npx prisma migrate deploy
```

If DB already has changes applied via `db push` but migration is not recorded:

```bash
npx prisma migrate resolve --applied MIGRATION_NAME
```

#### Migrations (Production)

```bash
pnpm db:migrate:prod        # prisma migrate deploy
```

Migrations are NOT automatic in Vercel. Run manually with production credentials:

```bash
# Option 1: Inline env vars
DATABASE_URL="<pooled-url>" DIRECT_URL="<direct-url>" npx prisma migrate deploy

# Option 2: Pull env vars from Vercel first
vercel env pull .env.production.local
npx dotenv -e .env.production.local -- prisma migrate deploy
```

Always use `DIRECT_URL` (direct connection) for migrations. Pooled connections can timeout during DDL.

## Deployment

- **Hosting**: Vercel (Git integration, push to `main` triggers deploy)
- **Region**: `iad1` (US East)
- **Build**: `prisma generate && next build` (see `vercel.json`)
- **API timeout**: 60s for all routes
- **Cron**: Daily cleanup at 2 AM UTC (`/api/cron/cleanup`)

### Env Vars (Vercel Dashboard)

Required: `DATABASE_URL` (pooled), `DIRECT_URL` (direct), `BETTER_AUTH_SECRET` (min 32 chars)

Optional: `BETTER_AUTH_URL`, `BLOB_READ_WRITE_TOKEN`, `CRON_SECRET`, `RESEND_API_KEY`

### CI/CD

GitHub Actions (`.github/workflows/ci.yml`): lint + typecheck on push/PR to `main`. No auto-deploy, no tests.

### First-time Setup

```bash
npx tsx scripts/create-admin.ts   # Create admin user
```

## Coding Standards

- TypeScript strict mode, no `any` types
- Named exports only (no default exports). Exception: Next.js App Router files (page.tsx, layout.tsx, loading.tsx, error.tsx, not-found.tsx) require default exports by framework convention
- RO-RO pattern (Receive Object, Return Object) for functions
- Maximum 500 lines per file
- JSDoc on all exported functions, classes, and types
- Zod for runtime validation of all inputs
- async/await instead of .then() chains
- Prefer immutability (readonly, as const)
- Use `import type` for type-only imports
- English only for code, comments, and variable names

## Git

- Conventional Commits: `type(scope): description`
- Stage files individually (never `git add .` or `git add -A`)
- Keep commits atomic and focused
