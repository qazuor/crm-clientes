/**
 * Concurrency Control Utilities
 *
 * Simple concurrency limiter for processing items in batches
 * without overwhelming external services.
 */

/**
 * Process an array of items with limited concurrency.
 *
 * @param items - Array of items to process
 * @param concurrency - Maximum number of items to process at the same time
 * @param fn - Async function to apply to each item
 * @returns Array of results in the same order as the input items
 */
export async function pMap<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await fn(items[index], index);
    }
  }

  // Create `concurrency` number of workers
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker()
  );

  await Promise.all(workers);
  return results;
}
