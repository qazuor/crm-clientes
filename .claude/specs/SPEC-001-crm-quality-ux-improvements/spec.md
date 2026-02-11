---
spec-id: "SPEC-001"
type: "improvement"
complexity: high
status: draft
created: "2026-02-07T17:30:00-03:00"
---

# CRM Quality & UX Improvements

## Part 1: Functional Specification

### Overview & Goals

Comprehensive quality, UX, and code health improvement epic for the CRM application. Covers 31 improvement items identified through a full codebase audit spanning UI/UX, API/data flow, code quality, and project structure.

- **Goal**: Bring the CRM to production-grade quality by fixing code standards violations, improving UX, adding tests, and eliminating technical debt.
- **Motivation**: The codebase has 0 tests, 13 files exceeding the 500-line limit, duplicated code, missing mobile navigation, inconsistent UX patterns, and missing security measures (rate limiting on expensive endpoints).
- **Success metrics**:
  - 75% test coverage minimum (Vitest)
  - 0 files exceeding 500 lines
  - All empty directories removed
  - All console.log replaced with centralized logger
  - Mobile navigation functional
  - Rate limiting on all expensive endpoints
  - Consistent UX patterns (loading states, empty states, breadcrumbs, validation feedback)
- **Target users**: Single user (project owner) who needs a polished, reliable CRM tool.

### User Stories & Acceptance Criteria

#### US-1: Test Infrastructure and Coverage

**As a** developer, **I want** automated tests covering validations, services, API routes, hooks, and components, **so that** I can refactor with confidence and catch regressions.

**Acceptance Criteria:**

- **Given** the project has no tests, **When** I run `pnpm test`, **Then** Vitest executes and reports coverage.
- **Given** Zod validation schemas exist, **When** tests run, **Then** all schemas have unit tests covering valid input, invalid input, edge cases, and transforms.
- **Given** API routes exist, **When** tests run, **Then** critical routes (clientes CRUD, enrich, bulk) have integration tests covering success, validation errors, and auth.
- **Given** custom hooks exist, **When** tests run, **Then** hooks have tests using renderHook with mocked API responses.
- **Given** React components exist, **When** tests run, **Then** key components have rendering tests, interaction tests, and accessibility checks.
- **Given** all tests pass, **When** coverage is measured, **Then** total coverage is >= 75%.

#### US-2: Code Standards Compliance

**As a** developer, **I want** all files to comply with project standards (max 500 lines, named exports, import type, no console.log, async/await), **so that** the codebase is consistent and maintainable.

**Acceptance Criteria:**

- **Given** 13 files exceed 500 lines, **When** refactoring is complete, **Then** no file exceeds 500 lines.
- **Given** 8 console.log instances exist in components, **When** cleanup is done, **Then** all use the centralized `logger` from `src/lib/logger.ts`.
- **Given** ~112 files miss `import type`, **When** cleanup is done, **Then** all type-only imports use `import type`.
- **Given** ~11 avoidable default exports exist, **When** cleanup is done, **Then** only Next.js-required files (pages, layouts) use default exports.
- **Given** 5 files use `.then()` chains, **When** cleanup is done, **Then** all use async/await.
- **Given** 7 empty directories exist, **When** cleanup is done, **Then** all are deleted.
- **Given** a test page exists at `src/app/test/page.tsx`, **When** cleanup is done, **Then** it is removed.

#### US-3: Mobile Navigation

**As a** user on a mobile device, **I want** a hamburger menu for navigation, **so that** I can access all sections of the CRM.

**Acceptance Criteria:**

- **Given** I'm on a mobile screen (< 768px), **When** I view any page, **Then** I see a hamburger icon in the header.
- **Given** the hamburger menu is closed, **When** I tap the icon, **Then** a sidebar slides in from the left with all navigation links.
- **Given** the sidebar is open, **When** I tap a link, **Then** I navigate to that page and the sidebar closes.
- **Given** the sidebar is open, **When** I tap outside or press ESC, **Then** the sidebar closes.
- **Given** I'm on desktop (>= 768px), **When** I view any page, **Then** the regular horizontal navigation is visible and no hamburger icon appears.

#### US-4: Rate Limiting on Expensive Endpoints

**As a** system operator, **I want** rate limiting on AI enrichment, bulk operations, and email endpoints, **so that** resources are protected from abuse.

**Acceptance Criteria:**

- **Given** the enrich endpoint exists, **When** more than 10 requests/minute are made, **Then** subsequent requests return 429 with retry-after header.
- **Given** the bulk-enrich endpoint exists, **When** more than 3 requests/minute are made, **Then** subsequent requests return 429.
- **Given** email send endpoints exist, **When** more than 20 requests/minute are made, **Then** subsequent requests return 429.
- **Given** admin endpoints exist, **When** more than 30 requests/minute are made, **Then** subsequent requests return 429.
- **Given** rate limiting is hit, **When** the user sees an error, **Then** the message is human-readable with retry guidance.

#### US-5: Data Consistency in Enrichment

**As a** user, **I want** enrichment operations to be atomic, **so that** data is never in an inconsistent state.

**Acceptance Criteria:**

- **Given** an enrichment is saved, **When** the client update fails, **Then** both operations are rolled back.
- **Given** the enrichment POST handler, **When** it creates an enrichment record and updates the client, **Then** both happen inside a `$transaction`.
- **Given** AI operations are called, **When** the call takes more than 120 seconds, **Then** it times out with an appropriate error message.

#### US-6: Real-time Form Validation

**As a** user filling out a client form, **I want** immediate feedback on field errors, **so that** I can correct mistakes as I type.

**Acceptance Criteria:**

- **Given** I'm editing a client field, **When** I type an invalid email, **Then** an error message appears below the field within 300ms of blur.
- **Given** a required field is empty, **When** I blur the field, **Then** a "required" error appears.
- **Given** all fields are valid, **When** I look at the form, **Then** no error messages are visible.
- **Given** I have unsaved changes, **When** I try to navigate away, **Then** a confirmation dialog appears asking if I want to discard changes.

#### US-7: Consistent Loading and Empty States

**As a** user, **I want** clear visual feedback during loading and when data is empty, **so that** I always know the system status.

**Acceptance Criteria:**

- **Given** data is loading, **When** I view a list or detail page, **Then** I see skeleton loaders matching the content layout.
- **Given** a list has no items, **When** I view it, **Then** I see a descriptive message with an icon and a CTA button (e.g., "Create your first client").
- **Given** an async action is in progress, **When** I look at the trigger button, **Then** it shows a spinner and is disabled.
- **Given** filters are applied, **When** I look at the filter bar, **Then** I see a badge showing the count of active filters.

#### US-8: Design System Consistency

**As a** user, **I want** consistent UI patterns across the application, **so that** the experience is predictable and comfortable.

**Acceptance Criteria:**

- **Given** I'm about to delete something, **When** a confirmation is needed, **Then** a styled modal appears (not native window.confirm).
- **Given** I'm on a deep page, **When** I look at the top, **Then** I see breadcrumbs showing my location.
- **Given** I open a modal or search, **When** it appears, **Then** the primary input has autofocus.
- **Given** I'm browsing a paginated list, **When** I want to go to page 15, **Then** I can type the page number directly.
- **Given** I'm selecting a date, **When** I click a date field, **Then** a consistent date picker (react-day-picker) opens.
- **Given** I see a complex setting, **When** I hover over its label, **Then** a tooltip explains what it does.
- **Given** I'm using a screen reader on the table, **When** I navigate, **Then** I hear proper role/aria announcements.

#### US-9: Code Deduplication and Organization

**As a** developer, **I want** shared utilities and components instead of duplicated code, **so that** changes propagate consistently.

**Acceptance Criteria:**

- **Given** social icons are duplicated in 6 files, **When** refactoring is done, **Then** a single `SocialIcons` component is imported everywhere.
- **Given** `getBadgeColor` is duplicated, **When** refactoring is done, **Then** a single function in utils is used.
- **Given** no barrel exports exist, **When** refactoring is done, **Then** every component/hook directory has an `index.ts`.
- **Given** email validation is weak, **When** the fix is applied, **Then** emails are trimmed, lowercased, and empty strings transform to null.

### UX Considerations

- **User flows**: All flows remain the same; improvements are additive (better feedback, validation, navigation).
- **Edge cases**:
  - Mobile viewport with sidebar open + orientation change
  - Form with very long validation error messages
  - Pagination with only 1 page (hide jump-to-page)
  - Empty state after filters applied vs truly empty data
- **Error states**: All errors should use the centralized logger and show user-friendly messages. Rate limit errors should show retry-after time.
- **Loading states**: Skeleton loaders for lists/tables/cards. Spinner buttons for actions. Progress bars for bulk operations.
- **Accessibility**: ARIA roles on tables, labels on all form inputs, focus management in modals, keyboard navigation in date picker.

### Out of Scope

- **E2E tests** (Playwright/Cypress) .. may be addressed in a future spec.
- **Role-based access control changes** .. single user, no RBAC modifications needed.
- **Sentry integration** .. decided to improve existing logger instead.
- **Dark mode** .. not requested.
- **Drag-and-drop** in card view .. not requested.
- **Keyboard shortcuts** (Ctrl+K search) .. not requested.
- **Notification grouping** .. not requested.
- **Undo/redo for destructive actions** .. not requested.

## Part 2: Technical Analysis

### Architecture

- **Pattern**: Incremental improvement. No architectural changes. All modifications follow existing patterns.
- **Components**:
  - New shared: `SocialIcons`, `ConfirmationDialog`, `Skeleton`, `Tooltip`, `DatePicker`, `Breadcrumbs`, `FilterBadge`, `PageJumpInput`
  - Split: 13 large files into smaller focused modules
  - Modified: Forms (validation), layouts (mobile nav), tables (accessibility)
- **Integration points**: All new components integrate into existing pages. No new API endpoints.
- **Data flow**: No changes to data flow. Rate limiting adds middleware-level interception. DB transactions wrap existing operations.

### Data Model Changes

| Table/Schema | Change | Description |
|-------------|--------|-------------|
| Actividad | add index | `@@index([deletedAt, fecha])`, `@@index([tipo, fecha])`, `@@index([clienteId, tipo, fecha])` |
| Mensaje | add index | `@@index([canal, estado, createdAt])` |
| ClienteEnrichment | add index | `@@index([status, enrichedAt])` |

**Migrations needed**: Yes. One migration for the 5 new composite indexes.

### API Design

No new API endpoints. Modifications:

#### Rate Limiting Additions

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /api/clientes/[id]/enrich | 10 req | 1 min |
| POST /api/admin/bulk-enrich | 3 req | 1 min |
| POST /api/mensajes/send | 20 req | 1 min |
| POST /api/mensajes/send-bulk | 5 req | 1 min |
| ALL /api/admin/* | 30 req | 1 min |

#### Transaction Wrapping

- `POST /api/clientes/[id]/enrich`: Wrap enrichment creation + client update in `prisma.$transaction()`

#### Timeout Addition

- `ConsensusService.enrichClient()`: Wrap in `Promise.race()` with 120s timeout

### Dependencies

**External packages:**

| Package | Version | Purpose |
|---------|---------|---------|
| vitest | latest | Test runner |
| @testing-library/react | latest | Component testing |
| @testing-library/jest-dom | latest | DOM assertions |
| @testing-library/user-event | latest | User interaction simulation |
| @vitejs/plugin-react | latest | React support for Vitest |
| msw | latest | API mocking for tests |
| react-day-picker | latest | Consistent date picker |
| @radix-ui/react-tooltip | latest | Tooltip component |
| @radix-ui/react-alert-dialog | latest | Confirmation dialog |

**Internal packages affected:**

- `src/lib/logger.ts` .. improve with structured logging, remove Sentry TODOs
- `src/lib/validations/cliente.ts` .. fix email validation
- `src/middleware.ts` .. add rate limiting rules
- `prisma/schema.prisma` .. add indexes

### Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| File splitting breaks imports | M | H | Do complete import updates. Run typecheck after each split. |
| Rate limiting too aggressive | L | M | Start with generous limits, tune based on real usage. |
| Test setup conflicts with Next.js 16 | M | M | Use Vitest with Next.js plugin. Test setup verified against docs. |
| DB migration on production | L | M | Test migration on dev first. Indexes are additive (no data loss). |
| Barrel exports cause circular imports | M | M | Analyze import graph before adding. Use explicit imports if circular. |

### Performance Considerations

- **DB indexes**: Adding 5 composite indexes will improve query performance for filtered lists.
- **Lazy loading**: Dynamic imports for EmailEditor, EnrichmentModal, BulkContactModal reduce initial bundle size.
- **Skeleton loaders**: Improve perceived performance without actual speed change.
- **import type**: Reduces bundle size by eliminating type-only imports from runtime bundles.
- **Monitoring**: After rate limiting, monitor 429 response rates to tune limits.

### Testing Strategy

**Framework**: Vitest + React Testing Library + MSW for API mocking

**Test categories and priority order:**

1. **Zod validation schemas** (unit) .. highest ROI, pure functions
   - All 7 schemas in `src/lib/validations/`
   - Test valid input, invalid input, edge cases, transforms

2. **Service layer** (unit) .. business logic
   - `consensus-service.ts`, `bulk-enrichment-service.ts`, `email-service.ts`
   - Mock external dependencies (Prisma, OpenAI, etc.)

3. **API routes** (integration) .. request/response cycle
   - All CRUD endpoints for clientes, actividades, mensajes
   - Auth checks, validation errors, success responses
   - Rate limiting behavior

4. **Custom hooks** (unit) .. React Query wrappers
   - All 5 hooks in `src/hooks/`
   - Use `renderHook` with QueryClient wrapper
   - Mock fetch responses

5. **React components** (component) .. UI behavior
   - Key components: TablaClientes, FiltrosAvanzados, EnrichmentModal
   - Render tests, interaction tests, accessibility checks
   - New components: ConfirmationDialog, Skeleton, Tooltip, DatePicker

**Coverage target**: 75% overall

## Implementation Approach

### Phase 1: Cleanup (quick wins, no risk)

1. [ ] Delete 7 empty directories
2. [ ] Remove test page (`src/app/test/page.tsx`)
3. [ ] Replace 8 console.log instances with centralized logger
4. [ ] Improve logger: remove Sentry TODOs, add structured logging
5. [ ] Convert 5 files from .then() to async/await
6. [ ] Fix `import type` across all files
7. [ ] Convert avoidable default exports to named exports
8. [ ] Update CLAUDE.md to document Next.js default export exception
9. [ ] Fix email validation (trim, lowercase, empty string handling)

### Phase 2: Infrastructure

10. [ ] Set up Vitest + React Testing Library + MSW
11. [ ] Add rate limiting to expensive endpoints
12. [ ] Add DB composite indexes (Prisma migration)
13. [ ] Wrap enrichment operations in $transaction
14. [ ] Add timeout to AI operations (Promise.race)
15. [ ] Install new UI dependencies (react-day-picker, radix-tooltip, radix-alert-dialog)

### Phase 3: Refactoring (file splits + deduplication)

16. [ ] Create shared SocialIcons component, update 6 files
17. [ ] Centralize getBadgeColor to utils, update 2 files
18. [ ] Split TablaClientes.tsx (986 lines)
19. [ ] Split EnrichmentModal.tsx (915 lines)
20. [ ] Split bulk-enrichment-service.ts (814 lines)
21. [ ] Split enrich/route.ts (721 lines)
22. [ ] Split website-analysis-service.ts (652 lines)
23. [ ] Split quota-manager.ts (588 lines)
24. [ ] Split clientes/[id]/page.tsx (568 lines)
25. [ ] Split enrichment-post-processor.ts (528 lines)
26. [ ] Split EditarClienteForm.tsx (525 lines)
27. [ ] Split QuotaDashboard.tsx (519 lines)
28. [ ] Split useEnrichment.ts (515 lines)
29. [ ] Split ai-sdk-service.ts (511 lines)
30. [ ] Split consensus-service.ts (504 lines)
31. [ ] Add barrel exports (index.ts) to all directories
32. [ ] Add lazy loading for EmailEditor, EnrichmentModal, BulkContactModal

### Phase 4: UI Components (new shared components)

33. [ ] Create ConfirmationDialog component (Radix AlertDialog)
34. [ ] Create Skeleton component (generic, reusable variants)
35. [ ] Create Tooltip component (Radix Tooltip)
36. [ ] Create DatePicker component (react-day-picker wrapper)
37. [ ] Create Breadcrumbs component
38. [ ] Create FilterBadge component (active filter counter)
39. [ ] Create PageJumpInput component (pagination enhancement)

### Phase 5: UX Integration

40. [ ] Replace all window.confirm() with ConfirmationDialog
41. [ ] Add mobile hamburger navigation to AuthenticatedLayout
42. [ ] Add real-time validation to create client form
43. [ ] Add real-time validation to edit client form
44. [ ] Add unsaved changes warning to edit form
45. [ ] Add skeleton loaders to client list page
46. [ ] Add skeleton loaders to client detail page
47. [ ] Improve empty states with descriptive messages and CTAs
48. [ ] Add breadcrumbs to all deep pages
49. [ ] Add autofocus to primary inputs in modals and forms
50. [ ] Integrate FilterBadge into FiltrosAvanzados
51. [ ] Integrate PageJumpInput into Pagination component
52. [ ] Replace native date inputs with DatePicker
53. [ ] Add tooltips to complex settings (API keys, enrichment, quotas)
54. [ ] Improve table accessibility (ARIA roles, labels, screen reader support)
55. [ ] Add loading states (spinner buttons) to all async form submissions

### Phase 6: Testing

56. [ ] Write tests for Zod validation schemas (7 files)
57. [ ] Write tests for service layer (consensus, bulk-enrichment, email, etc.)
58. [ ] Write tests for API routes (clientes, actividades, mensajes, admin)
59. [ ] Write tests for custom hooks (5 hooks)
60. [ ] Write tests for new UI components (ConfirmationDialog, Skeleton, Tooltip, DatePicker, Breadcrumbs)
61. [ ] Write tests for refactored components (TablaClientes, EnrichmentModal, forms)
62. [ ] Write tests for utilities (getBadgeColor, SocialIcons, logger)
63. [ ] Verify 75% coverage target is met
