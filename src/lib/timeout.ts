/**
 * Timeout utilities for wrapping long-running async operations.
 * Provides a typed TimeoutError and a generic withTimeout wrapper.
 */

/**
 * Error thrown when an async operation exceeds the allowed timeout duration.
 */
export class TimeoutError extends Error {
  /** Name of the operation that timed out */
  readonly operation: string;
  /** Timeout duration in milliseconds */
  readonly timeoutMs: number;

  constructor({ operation, timeoutMs }: { operation: string; timeoutMs: number }) {
    super(`Operation "${operation}" timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
    this.operation = operation;
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Wraps a promise with a timeout. Rejects with a TimeoutError if the promise
 * doesn't resolve within the specified duration.
 *
 * @example
 * ```ts
 * const result = await withTimeout({
 *   promise: someSlowOperation(),
 *   timeoutMs: 30_000,
 *   operation: 'fetchData',
 * });
 * ```
 */
export async function withTimeout<T>({
  promise,
  timeoutMs,
  operation,
}: {
  promise: Promise<T>;
  timeoutMs: number;
  operation: string;
}): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      reject(new TimeoutError({ operation, timeoutMs }));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    return result;
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}
