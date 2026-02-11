import { setupServer } from 'msw/node';

import { handlers } from './handlers';

/**
 * MSW server instance for intercepting network requests in tests.
 * Started in setup.ts beforeAll, reset after each test, closed in afterAll.
 */
export const server = setupServer(...handlers);
