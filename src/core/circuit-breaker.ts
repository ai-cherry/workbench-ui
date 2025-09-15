/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by stopping requests to failing services
 */

import { EventEmitter } from 'events';

// Circuit Breaker States
export enum CircuitState {
  CLOSED = 'closed',    // Normal operation, requests allowed
  OPEN = 'open',        // Service failing, requests blocked
  HALF_OPEN = 'half-open' // Testing if service recovered
}

// Circuit Breaker Options
export interface CircuitBreakerOptions {
  errorThreshold?: number;      // Number of errors before opening circuit
  volumeThreshold?: number;     // Minimum requests before evaluating circuit
  timeout?: number;             // Time in ms before trying half-open state
  resetTimeout?: number;        // Time in ms to wait in half-open before closing
  errorPercentageThreshold?: number; // Error percentage to open circuit
  rollingWindowSize?: number;  // Time window for metrics (ms)
  fallback?: () => Promise<any>; // Fallback function when circuit is open
}

// Circuit Breaker Metrics
export interface CircuitMetrics {
  requests: number;
  failures: number;
  successes: number;
  rejections: number;
  fallbacks: number;
  timeouts: number;
  shortCircuits: number;
  errorPercentage: number;
  averageResponseTime: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
}

// Circuit Breaker Events
export interface CircuitBreakerEvents {
  'state-change': (from: CircuitState, to: CircuitState) => void;
  'open': () => void;
  'close': () => void;
  'half-open': () => void;
  'fallback': () => void;
  'success': (responseTime: number) => void;
  'failure': (error: Error) => void;
  'timeout': () => void;
  'reject': () => void;
}

/**
 * Circuit Breaker Implementation
 */
export class CircuitBreaker extends EventEmitter {
  private state: CircuitState = CircuitState.CLOSED;
  private options: Required<CircuitBreakerOptions>;
  private metrics: CircuitMetrics;
  private requestWindow: Array<{ timestamp: number; success: boolean; responseTime?: number }> = [];
  private halfOpenTestInProgress = false;
  private nextAttempt?: Date;
  private stateChangeTimer?: NodeJS.Timeout;

  constructor(
    private name: string,
    options: CircuitBreakerOptions = {}
  ) {
    super();
    
    // Set default options
    this.options = {
      errorThreshold: options.errorThreshold ?? 5,
      volumeThreshold: options.volumeThreshold ?? 10,
      timeout: options.timeout ?? 60000, // 1 minute
      resetTimeout: options.resetTimeout ?? 30000, // 30 seconds
      errorPercentageThreshold: options.errorPercentageThreshold ?? 50,
      rollingWindowSize: options.rollingWindowSize ?? 60000, // 1 minute
      fallback: options.fallback ?? (() => Promise.reject(new Error('Circuit breaker is OPEN')))
    };

    // Initialize metrics
    this.metrics = {
      requests: 0,
      failures: 0,
      successes: 0,
      rejections: 0,
      fallbacks: 0,
      timeouts: 0,
      shortCircuits: 0,
      errorPercentage: 0,
      averageResponseTime: 0
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      // Check if we should transition to half-open
      if (this.shouldAttemptReset()) {
        this.transitionToHalfOpen();
      } else {
        // Circuit is open, reject request
        this.metrics.rejections++;
        this.metrics.shortCircuits++;
        this.emit('reject');
        
        // Try fallback
        try {
          const result = await this.options.fallback();
          this.metrics.fallbacks++;
          this.emit('fallback');
          return result;
        } catch (error) {
          throw new Error(`Circuit breaker is OPEN for ${this.name}`);
        }
      }
    }

    // Check if we're in half-open state
    if (this.state === CircuitState.HALF_OPEN && this.halfOpenTestInProgress) {
      // Only allow one test request in half-open state
      this.metrics.rejections++;
      this.emit('reject');
      
      // Try fallback
      try {
        const result = await this.options.fallback();
        this.metrics.fallbacks++;
        this.emit('fallback');
        return result;
      } catch (error) {
        throw new Error(`Circuit breaker is testing recovery for ${this.name}`);
      }
    }

    // Execute the function
    const startTime = Date.now();
    this.metrics.requests++;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenTestInProgress = true;
    }

    try {
      // Set timeout for the request
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Request timeout for ${this.name}`));
        }, this.options.timeout);
      });

      // Race between function execution and timeout
      const result = await Promise.race([fn(), timeoutPromise]);
      
      // Request succeeded
      const responseTime = Date.now() - startTime;
      this.recordSuccess(responseTime);
      
      return result;
    } catch (error) {
      // Request failed
      this.recordFailure(error as Error);
      throw error;
    } finally {
      if (this.state === CircuitState.HALF_OPEN) {
        this.halfOpenTestInProgress = false;
      }
    }
  }

  /**
   * Record a successful request
   */
  private recordSuccess(responseTime: number): void {
    this.metrics.successes++;
    this.metrics.lastSuccessTime = new Date();
    
    // Update response time average
    const count = this.metrics.successes;
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (count - 1) + responseTime) / count;
    
    // Add to request window
    this.requestWindow.push({
      timestamp: Date.now(),
      success: true,
      responseTime
    });
    
    // Clean old entries from window
    this.cleanRequestWindow();
    
    // Update error percentage
    this.updateErrorPercentage();
    
    this.emit('success', responseTime);
    
    // Handle state transitions
    if (this.state === CircuitState.HALF_OPEN) {
      // Successful request in half-open state, close the circuit
      this.transitionToClosed();
    }
  }

  /**
   * Record a failed request
   */
  private recordFailure(error: Error): void {
    this.metrics.failures++;
    this.metrics.lastFailureTime = new Date();
    
    // Add to request window
    this.requestWindow.push({
      timestamp: Date.now(),
      success: false
    });
    
    // Clean old entries from window
    this.cleanRequestWindow();
    
    // Update error percentage
    this.updateErrorPercentage();
    
    this.emit('failure', error);
    
    // Handle state transitions
    if (this.state === CircuitState.HALF_OPEN) {
      // Failed request in half-open state, reopen the circuit
      this.transitionToOpen();
    } else if (this.state === CircuitState.CLOSED) {
      // Check if we should open the circuit
      if (this.shouldOpenCircuit()) {
        this.transitionToOpen();
      }
    }
  }

  /**
   * Clean old entries from request window
   */
  private cleanRequestWindow(): void {
    const cutoff = Date.now() - this.options.rollingWindowSize;
    this.requestWindow = this.requestWindow.filter(r => r.timestamp > cutoff);
  }

  /**
   * Update error percentage metric
   */
  private updateErrorPercentage(): void {
    if (this.requestWindow.length === 0) {
      this.metrics.errorPercentage = 0;
      return;
    }
    
    const failures = this.requestWindow.filter(r => !r.success).length;
    this.metrics.errorPercentage = (failures / this.requestWindow.length) * 100;
  }

  /**
   * Check if circuit should be opened
   */
  private shouldOpenCircuit(): boolean {
    // Need minimum volume to evaluate
    if (this.requestWindow.length < this.options.volumeThreshold) {
      return false;
    }
    
    // Check error threshold
    const recentFailures = this.requestWindow.filter(r => !r.success).length;
    if (recentFailures >= this.options.errorThreshold) {
      return true;
    }
    
    // Check error percentage
    if (this.metrics.errorPercentage >= this.options.errorPercentageThreshold) {
      return true;
    }
    
    return false;
  }

  /**
   * Check if we should attempt to reset the circuit
   */
  private shouldAttemptReset(): boolean {
    if (!this.nextAttempt) {
      return true;
    }
    
    return new Date() >= this.nextAttempt;
  }

  /**
   * Transition to OPEN state
   */
  private transitionToOpen(): void {
    const previousState = this.state;
    this.state = CircuitState.OPEN;
    this.nextAttempt = new Date(Date.now() + this.options.timeout);
    
    // Clear any existing timer
    if (this.stateChangeTimer) {
      clearTimeout(this.stateChangeTimer);
    }
    
    // Set timer to transition to half-open
    this.stateChangeTimer = setTimeout(() => {
      this.transitionToHalfOpen();
    }, this.options.timeout);
    
    this.emit('state-change', previousState, this.state);
    this.emit('open');
    
    console.log(`[CircuitBreaker] ${this.name} opened. Next attempt at ${this.nextAttempt.toISOString()}`);
  }

  /**
   * Transition to HALF_OPEN state
   */
  private transitionToHalfOpen(): void {
    const previousState = this.state;
    this.state = CircuitState.HALF_OPEN;
    this.halfOpenTestInProgress = false;
    
    // Clear any existing timer
    if (this.stateChangeTimer) {
      clearTimeout(this.stateChangeTimer);
    }
    
    this.emit('state-change', previousState, this.state);
    this.emit('half-open');
    
    console.log(`[CircuitBreaker] ${this.name} half-opened for testing`);
  }

  /**
   * Transition to CLOSED state
   */
  private transitionToClosed(): void {
    const previousState = this.state;
    this.state = CircuitState.CLOSED;
    this.nextAttempt = undefined;
    
    // Clear any existing timer
    if (this.stateChangeTimer) {
      clearTimeout(this.stateChangeTimer);
    }
    
    // Reset metrics
    this.requestWindow = [];
    this.metrics.errorPercentage = 0;
    
    this.emit('state-change', previousState, this.state);
    this.emit('close');
    
    console.log(`[CircuitBreaker] ${this.name} closed. Service recovered.`);
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get metrics
   */
  getMetrics(): CircuitMetrics {
    return { ...this.metrics };
  }

  /**
   * Force open the circuit
   */
  open(): void {
    this.transitionToOpen();
  }

  /**
   * Force close the circuit
   */
  close(): void {
    this.transitionToClosed();
  }

  /**
   * Reset the circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.metrics = {
      requests: 0,
      failures: 0,
      successes: 0,
      rejections: 0,
      fallbacks: 0,
      timeouts: 0,
      shortCircuits: 0,
      errorPercentage: 0,
      averageResponseTime: 0
    };
    this.requestWindow = [];
    this.halfOpenTestInProgress = false;
    this.nextAttempt = undefined;
    
    if (this.stateChangeTimer) {
      clearTimeout(this.stateChangeTimer);
      this.stateChangeTimer = undefined;
    }
    
    console.log(`[CircuitBreaker] ${this.name} reset`);
  }

  /**
   * Get status summary
   */
  getStatus(): {
    name: string;
    state: CircuitState;
    metrics: CircuitMetrics;
    nextAttempt?: Date;
    isHealthy: boolean;
  } {
    return {
      name: this.name,
      state: this.state,
      metrics: this.getMetrics(),
      nextAttempt: this.nextAttempt,
      isHealthy: this.state === CircuitState.CLOSED
    };
  }
}

/**
 * Circuit Breaker Factory
 */
export class CircuitBreakerFactory {
  private static breakers = new Map<string, CircuitBreaker>();

  /**
   * Get or create a circuit breaker
   */
  static getBreaker(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
    let breaker = this.breakers.get(name);
    
    if (!breaker) {
      breaker = new CircuitBreaker(name, options);
      this.breakers.set(name, breaker);
    }
    
    return breaker;
  }

  /**
   * Get all circuit breakers
   */
  static getAllBreakers(): Map<string, CircuitBreaker> {
    return new Map(this.breakers);
  }

  /**
   * Reset all circuit breakers
   */
  static resetAll(): void {
    this.breakers.forEach(breaker => breaker.reset());
  }

  /**
   * Get status of all circuit breakers
   */
  static getAllStatus(): Array<ReturnType<CircuitBreaker['getStatus']>> {
    return Array.from(this.breakers.values()).map(b => b.getStatus());
  }
}

/**
 * Exponential Backoff Helper
 */
export class ExponentialBackoff {
  private attempt = 0;
  
  constructor(
    private readonly initialDelay: number = 1000,
    private readonly maxDelay: number = 30000,
    private readonly multiplier: number = 2,
    private readonly jitter: boolean = true
  ) {}

  /**
   * Get next delay in milliseconds
   */
  getNextDelay(): number {
    const delay = Math.min(
      this.initialDelay * Math.pow(this.multiplier, this.attempt),
      this.maxDelay
    );
    
    this.attempt++;
    
    // Add jitter to prevent thundering herd
    if (this.jitter) {
      return delay * (0.5 + Math.random() * 0.5);
    }
    
    return delay;
  }

  /**
   * Reset the backoff
   */
  reset(): void {
    this.attempt = 0;
  }

  /**
   * Execute with retry and exponential backoff
   */
  async execute<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    shouldRetry: (error: Error) => boolean = () => true
  ): Promise<T> {
    let lastError: Error;
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const result = await fn();
        this.reset(); // Reset on success
        return result;
      } catch (error) {
        lastError = error as Error;
        
        // Check if we should retry
        if (!shouldRetry(lastError) || i === maxAttempts - 1) {
          throw lastError;
        }
        
        // Wait before next attempt
        const delay = this.getNextDelay();
        console.log(`[ExponentialBackoff] Retry attempt ${i + 1}/${maxAttempts} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }
}