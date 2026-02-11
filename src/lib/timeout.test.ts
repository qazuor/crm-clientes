import { describe, expect, it, vi } from 'vitest';
import { TimeoutError, withTimeout } from './timeout';

describe('TimeoutError', () => {
  it('creates error with correct message', () => {
    const error = new TimeoutError({ operation: 'fetchData', timeoutMs: 5000 });

    expect(error.message).toBe('Operation "fetchData" timed out after 5000ms');
    expect(error.name).toBe('TimeoutError');
    expect(error.operation).toBe('fetchData');
    expect(error.timeoutMs).toBe(5000);
  });

  it('is an instance of Error', () => {
    const error = new TimeoutError({ operation: 'test', timeoutMs: 1000 });
    expect(error).toBeInstanceOf(Error);
  });
});

describe('withTimeout', () => {
  it('resolves when promise completes before timeout', async () => {
    const result = await withTimeout({
      promise: Promise.resolve('success'),
      timeoutMs: 5000,
      operation: 'test',
    });

    expect(result).toBe('success');
  });

  it('rejects with TimeoutError when promise exceeds timeout', async () => {
    vi.useFakeTimers();

    const slowPromise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('late'), 10_000);
    });

    const resultPromise = withTimeout({
      promise: slowPromise,
      timeoutMs: 100,
      operation: 'slowOp',
    });

    vi.advanceTimersByTime(101);

    await expect(resultPromise).rejects.toThrow(TimeoutError);
    await expect(resultPromise).rejects.toThrow('Operation "slowOp" timed out after 100ms');

    vi.useRealTimers();
  });

  it('clears timeout when promise resolves first', async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    await withTimeout({
      promise: Promise.resolve('fast'),
      timeoutMs: 5000,
      operation: 'fastOp',
    });

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it('propagates original error when promise rejects before timeout', async () => {
    const originalError = new Error('original failure');

    await expect(
      withTimeout({
        promise: Promise.reject(originalError),
        timeoutMs: 5000,
        operation: 'failOp',
      }),
    ).rejects.toThrow('original failure');
  });

  it('preserves the resolved type', async () => {
    const result = await withTimeout({
      promise: Promise.resolve({ id: 1, name: 'test' }),
      timeoutMs: 5000,
      operation: 'typed',
    });

    expect(result).toEqual({ id: 1, name: 'test' });
  });
});
