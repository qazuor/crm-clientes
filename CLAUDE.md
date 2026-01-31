# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CRM Clientes is a full-stack Customer Relationship Management system built with Next.js 16 (App Router), TypeScript, Prisma ORM, and TailwindCSS 4. The application manages client data, tracks activities, and includes a unique client enrichment feature that captures website screenshots and PageSpeed metrics.

## Development Commands

```bash
# Start dev server (port 4500)
npm run dev

# Build for production
npm run build

# Linting
npm run lint

# Database operations
npm run db:seed          # Seed database with initial data
npm run db:studio        # Open Prisma Studio GUI
npm run db:reset         # Reset and reseed database

# Prisma commands
npx prisma migrate dev   # Create and apply migrations
npx prisma generate      # Regenerate Prisma client after schema changes
```

## Architecture

### Tech Stack
- **Framework**: Next.js 16 with App Router, React 19
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL (dev via Docker on port 5437, prod via Vercel)
- **ORM**: Prisma 5.22
- **Auth**: NextAuth v5 (beta) with credentials provider, JWT sessions
- **Styling**: TailwindCSS 4 with Headless UI and Radix primitives
- **Data Fetching**: TanStack React Query + React Table

### Directory Structure
```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth routes (login, error)
│   ├── api/               # API route handlers
│   │   ├── clientes/      # Client CRUD endpoints
│   │   ├── actividades/   # Activity logging
│   │   ├── enrichment/    # Client enrichment (screenshots, PageSpeed)
│   │   └── auth/          # NextAuth routes
│   ├── clientes/          # Client management pages
│   │   └── [id]/          # Dynamic client routes (detail, edit, activities)
│   └── admin/             # Admin section
├── components/            # React components
│   ├── ui/               # Base UI (Button, Toggle)
│   └── enrichment/       # Enrichment-specific components
├── lib/                   # Core utilities
│   ├── auth.ts           # NextAuth session helper
│   ├── auth.config.ts    # Auth configuration
│   ├── prisma.ts         # Prisma singleton
│   ├── screenshot-service.ts   # Website screenshot capture
│   ├── pagespeed-service.ts    # PageSpeed analysis
│   └── quota-manager.ts        # API quota tracking
├── hooks/                 # Custom React hooks
└── types/                 # TypeScript definitions (types/index.ts)
```

### Data Models (Prisma Schema)
- **User**: Authentication with roles (ADMIN, MANAGER, AGENT)
- **Cliente**: Core entity with contact info, social profiles, enrichment data (JSON fields for websiteMetrics, techStack, socialProfiles)
- **Actividad**: Activity tracking linked to clients and users
- **Account/Session**: NextAuth tables for auth

### Key Patterns
- Server Components by default, `'use client'` for interactive UI
- Prisma singleton pattern in `lib/prisma.ts`
- Service classes for external APIs (ScreenshotService, PageSpeedService)
- Quota management for rate-limited external services
- Path alias: `@/*` maps to `./src/*`

## Client Enrichment Feature

Unique feature that enriches client data by:
1. Capturing desktop/mobile screenshots via shot.screenshotapi.net
2. Running PageSpeed analysis
3. Storing results in Cliente JSON fields

Quota limits: ~33 screenshots/day (1000/month free tier). Screenshots stored in `/public/screenshots/`.

## Environment Variables

Required in `.env`:
```
DATABASE_URL="postgresql://user:password@localhost:5437/crm_clientes"
DIRECT_URL="postgresql://user:password@localhost:5437/crm_clientes"
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:4500"
OPENAI_API_KEY="sk-..."  # For AI features
```

## Type Definitions

All core types are in `src/types/index.ts`:
- Domain types: `UserRole`, `EstadoCliente`, `PrioridadCliente`, `FuenteCliente`, `TipoActividad`
- Interfaces: `User`, `Cliente`, `Actividad`
- DTOs: `CreateClienteDTO`, `UpdateClienteDTO`, `CreateActividadDTO`
- API types: `ApiResponse<T>`, `PaginatedResponse<T>`, `ClienteFilters`

## API Routes

- `GET/POST /api/clientes` - List/create clients with filtering and pagination
- `GET/PUT/DELETE /api/clientes/[id]` - Single client operations
- `GET/POST /api/actividades` - Activity management
- `POST /api/enrichment` - Trigger client enrichment
- `GET /api/stats` - CRM statistics
- `GET /api/quotas` - API quota status

## Authentication

- Login page: `/auth/login`
- Default dev users seeded with password "123456"
- JWT sessions valid for 30 days
- Protected routes via middleware
