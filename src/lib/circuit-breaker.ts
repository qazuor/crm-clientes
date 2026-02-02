/**
 * Circuit Breaker Pattern
 * Prevents cascading failures when external services are unavailable.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service is down, requests fail immediately
 * - HALF_OPEN: Testing if service recovered, allows limited requests
 */

import { logger } from './logger';

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  /** Number of consecutive failures before opening the circuit (default: 5) */
  failureThreshold?: number;
  /** Time in ms to wait before transitioning from OPEN to HALF_OPEN (default: 60000) */
  resetTimeout?: number;
  /** Number of consecutive successes in HALF_OPEN to close the circuit (default: 2) */
  successThreshold?: number;
  /** Optional name for logging */
  name?: string;
}

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;

  private readonly failureThreshold: number;
  private readonly resetTimeout: number;
  private readonly successThreshold: number;
  private readonly name: string;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeout = options.resetTimeout ?? 60000;
    this.successThreshold = options.successThreshold ?? 2;
    this.name = options.name ?? 'CircuitBreaker';
  }

  /**
   * Execute a function through the circuit breaker.
   * When OPEN, throws immediately without calling the function.
   * When HALF_OPEN, allows one request through to test recovery.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      // Check if enough time has passed to try again
      if (this.lastFailureTime && Date.now() - this.lastFailureTime >= this.resetTimeout) {
        this.transitionTo(CircuitBreakerState.HALF_OPEN);
      } else {
        throw new Error(`Service unavailable (circuit breaker ${this.name} is OPEN)`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Get the current state of the circuit breaker.
   */
  getState(): CircuitBreakerState {
    // Check for automatic OPEN -> HALF_OPEN transition on read
    if (
      this.state === CircuitBreakerState.OPEN &&
      this.lastFailureTime &&
      Date.now() - this.lastFailureTime >= this.resetTimeout
    ) {
      this.transitionTo(CircuitBreakerState.HALF_OPEN);
    }
    return this.state;
  }

  /**
   * Manually reset the circuit breaker to CLOSED state.
   */
  reset(): void {
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.transitionTo(CircuitBreakerState.CLOSED);
  }

  private onSuccess(): void {
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.reset();
        logger.info(`[CircuitBreaker:${this.name}] Circuit closed after successful recovery`);
      }
    } else {
      // In CLOSED state, reset failure count on success
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // Any failure in HALF_OPEN goes back to OPEN
      this.successCount = 0;
      this.transitionTo(CircuitBreakerState.OPEN);
      logger.warn(`[CircuitBreaker:${this.name}] Circuit re-opened after failure in HALF_OPEN`);
    } else if (this.failureCount >= this.failureThreshold) {
      this.transitionTo(CircuitBreakerState.OPEN);
      logger.warn(`[CircuitBreaker:${this.name}] Circuit opened after ${this.failureCount} failures`);
    }
  }

  private transitionTo(newState: CircuitBreakerState): void {
    if (this.state !== newState) {
      logger.debug(`[CircuitBreaker:${this.name}] State transition: ${this.state} -> ${newState}`);
      this.state = newState;
      if (newState === CircuitBreakerState.HALF_OPEN) {
        this.successCount = 0;
      }
    }
  }
}
