# TODOs: CRM Quality & UX Improvements

Spec: SPEC-001 | Status: pending | Progress: 0/63

## Setup (Phase 1: Cleanup & Infrastructure)

- [ ] T-001: Delete 7 empty directories (complexity: 1)
- [ ] T-002: Remove test page from production (complexity: 1)
- [ ] T-003: Improve logger and remove Sentry TODOs (complexity: 3)
- [ ] T-004: Replace console.log with centralized logger in components (complexity: 2) [blocked by T-003]
- [ ] T-005: Convert .then() chains to async/await (complexity: 2)
- [ ] T-006: Fix import type across all files (complexity: 3)
- [ ] T-007: Convert avoidable default exports to named exports (complexity: 2)
- [ ] T-008: Update CLAUDE.md with Next.js default export exception (complexity: 1) [blocked by T-007]
- [ ] T-009: Fix email validation in cliente schema (complexity: 2)
- [ ] T-010: Set up Vitest + React Testing Library + MSW test infrastructure (complexity: 4)
- [ ] T-011: Install new UI dependencies (complexity: 1)

## Core (Phase 2: Infrastructure + Phase 3: Refactoring + Phase 4: UI Components)

- [ ] T-012: Add rate limiting to expensive endpoints (complexity: 3)
- [ ] T-013: Add DB composite indexes via Prisma migration (complexity: 2)
- [ ] T-014: Wrap enrichment POST in database transaction (complexity: 3)
- [ ] T-015: Add timeout to AI operations via Promise.race (complexity: 2)
- [ ] T-016: Create shared SocialIcons component and update 6 files (complexity: 3)
- [ ] T-017: Centralize getBadgeColor to utils (complexity: 2)
- [ ] T-018: Split TablaClientes.tsx - 986 lines (complexity: 4)
- [ ] T-019: Split EnrichmentModal.tsx - 915 lines (complexity: 4)
- [ ] T-020: Split bulk-enrichment-service.ts - 814 lines (complexity: 4)
- [ ] T-021: Split enrich/route.ts - 721 lines (complexity: 4) [blocked by T-014]
- [ ] T-022: Split website-analysis-service.ts - 652 lines (complexity: 3)
- [ ] T-023: Split quota-manager.ts - 588 lines (complexity: 3)
- [ ] T-024: Split clientes/[id]/page.tsx - 568 lines (complexity: 3)
- [ ] T-025: Split enrichment-post-processor.ts - 528 lines (complexity: 3)
- [ ] T-026: Split EditarClienteForm.tsx - 525 lines (complexity: 4)
- [ ] T-027: Split QuotaDashboard.tsx - 519 lines (complexity: 3)
- [ ] T-028: Split useEnrichment.ts - 515 lines (complexity: 3)
- [ ] T-029: Split ai-sdk-service.ts - 511 lines (complexity: 3)
- [ ] T-030: Split consensus-service.ts - 504 lines (complexity: 3)
- [ ] T-031: Add lazy loading for heavy modals (complexity: 2) [blocked by T-019]
- [ ] T-032: Create ConfirmationDialog component (complexity: 3) [blocked by T-011]
- [ ] T-033: Create Skeleton component with variants (complexity: 3) [blocked by T-011]
- [ ] T-034: Create Tooltip component (complexity: 2) [blocked by T-011]
- [ ] T-035: Create DatePicker component (complexity: 3) [blocked by T-011]
- [ ] T-036: Create Breadcrumbs component (complexity: 2)
- [ ] T-037: Create FilterBadge component (complexity: 2)
- [ ] T-038: Create PageJumpInput component (complexity: 2)

## Integration (Phase 5: UX Integration)

- [ ] T-039: Replace all window.confirm() with ConfirmationDialog (complexity: 3) [blocked by T-032]
- [ ] T-040: Add mobile hamburger navigation to AuthenticatedLayout (complexity: 4)
- [ ] T-041: Add real-time validation to create client form (complexity: 4) [blocked by T-009]
- [ ] T-042: Add real-time validation to edit client form (complexity: 4) [blocked by T-009, T-026]
- [ ] T-043: Add unsaved changes warning to edit form (complexity: 3) [blocked by T-042]
- [ ] T-044: Add skeleton loaders to client list page (complexity: 2) [blocked by T-033]
- [ ] T-045: Add skeleton loaders to client detail page (complexity: 2) [blocked by T-033, T-024]
- [ ] T-046: Improve empty states with descriptive messages and CTAs (complexity: 2)
- [ ] T-047: Add breadcrumbs to all deep pages (complexity: 2) [blocked by T-036]
- [ ] T-048: Add autofocus to primary inputs in modals and forms (complexity: 1)
- [ ] T-049: Integrate FilterBadge into FiltrosAvanzados (complexity: 2) [blocked by T-037]
- [ ] T-050: Integrate PageJumpInput into Pagination (complexity: 2) [blocked by T-038]
- [ ] T-051: Replace native date inputs with DatePicker (complexity: 2) [blocked by T-035]
- [ ] T-052: Add tooltips to complex settings (complexity: 2) [blocked by T-034]
- [ ] T-053: Improve table accessibility with ARIA roles and labels (complexity: 3) [blocked by T-018]
- [ ] T-054: Add loading states (spinner buttons) to async form submissions (complexity: 3)
- [ ] T-055: Add barrel exports to all directories (complexity: 3) [blocked by T-016..T-030]

## Testing (Phase 6)

- [ ] T-056: Write tests for Zod validation schemas (complexity: 4) [blocked by T-010, T-009]
- [ ] T-057: Write tests for service layer (complexity: 4) [blocked by T-010]
- [ ] T-058: Write tests for API routes (complexity: 4) [blocked by T-010, T-012, T-014, T-015]
- [ ] T-059: Write tests for custom hooks (complexity: 3) [blocked by T-010, T-028]
- [ ] T-060: Write tests for new UI components (complexity: 3) [blocked by T-010, T-032..T-038]
- [ ] T-061: Write tests for refactored components (complexity: 4) [blocked by T-010, T-018, T-019]
- [ ] T-062: Write tests for utilities (complexity: 2) [blocked by T-010, T-016, T-017]
- [ ] T-063: Verify 75% coverage target (complexity: 2) [blocked by T-056..T-062]
