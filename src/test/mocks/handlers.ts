import type { RequestHandler } from 'msw';

/**
 * Base MSW request handlers shared across all tests.
 * Add common API mocks here (e.g., auth session, common endpoints).
 */
export const handlers: RequestHandler[] = [];
