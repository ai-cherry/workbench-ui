/**
 * Base Service Contract
 * Common interface for all MCP services in Sophia Intel AI
 */

import { EventEmitter } from 'events';

// Service Configuration
export interface ServiceConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol?: 'http' | 'https' | 'ws' | 'wss';
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  healthCheckInterval?: number;
  metadata?: Record<string, any>;
}

// Service Health Status
export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime?: number;
  responseTime?: number;
  error?: string;
  details?: Record<string, any>;
}

// Service Metrics
export interface ServiceMetrics {
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number;
  activeConnections: number;
  memoryUsage: number;
  cpuUsage: number;
  timestamp: string;
}

// Service Events
export interface ServiceEvents {
  'connected': () => void;
  'disconnected': () => void;
  'error': (error: Error) => void;
  'health': (health: ServiceHealth) => void;
  'metrics': (metrics: ServiceMetrics) => void;
  'request': (request: any) => void;
  'response': (response: any) => void;
}

// Pagination Support
export interface PaginationOptions {
  limit?: number;
  offset?: number;
  cursor?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  nextCursor?: string;
}

// Search Options
export interface SearchOptions extends PaginationOptions {
  query?: string;
  filters?: Record<string, any>;
  fields?: string[];
  includeDeleted?: boolean;
}

// Batch Operation Result
export interface BatchResult<T> {
  successful: T[];
  failed: Array<{
    item: any;
    error: Error;
  }>;
  total: number;
  successCount: number;
  failureCount: number;
}

// Service Capabilities
export interface ServiceCapabilities {
  supportsStreaming: boolean;
  supportsBatch: boolean;
  supportsTransactions: boolean;
  supportsWebSockets: boolean;
  supportsNotifications: boolean;
  maxBatchSize?: number;
  maxConnections?: number;
  features: string[];
}

// Main Service Interface
export interface IBaseService extends EventEmitter {
  // Service Lifecycle
  initialize(config: ServiceConfig): Promise<void>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  shutdown(): Promise<void>;
  
  // Health & Status
  health(): Promise<ServiceHealth>;
  ping(): Promise<boolean>;
  getStatus(): string;
  isConnected(): boolean;
  
  // Metrics & Monitoring
  getMetrics(): Promise<ServiceMetrics>;
  resetMetrics(): Promise<void>;
  
  // Configuration
  getConfig(): ServiceConfig;
  updateConfig(config: Partial<ServiceConfig>): Promise<void>;
  
  // Capabilities
  getCapabilities(): ServiceCapabilities;
  
  // Error Handling
  getLastError(): Error | null;
  clearError(): void;
  
  // Events
  on<K extends keyof ServiceEvents>(event: K, listener: ServiceEvents[K]): this;
  emit<K extends keyof ServiceEvents>(event: K, ...args: Parameters<ServiceEvents[K]>): boolean;
}

// Abstract Base Implementation
export abstract class BaseService extends EventEmitter implements IBaseService {
  protected config!: ServiceConfig;
  protected connected: boolean = false;
  protected lastError: Error | null = null;
  protected startTime: Date = new Date();
  protected metrics: ServiceMetrics = {
    requestCount: 0,
    errorCount: 0,
    averageResponseTime: 0,
    p95ResponseTime: 0,
    p99ResponseTime: 0,
    throughput: 0,
    activeConnections: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    timestamp: new Date().toISOString()
  };

  // Lifecycle Methods
  abstract initialize(config: ServiceConfig): Promise<void>;
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  
  async shutdown(): Promise<void> {
    await this.disconnect();
    this.removeAllListeners();
  }

  // Health & Status
  async health(): Promise<ServiceHealth> {
    if (!this.connected) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Service not connected'
      };
    }

    try {
      const pingSuccess = await this.ping();
      const uptime = Date.now() - this.startTime.getTime();
      
      return {
        status: pingSuccess ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime,
        responseTime: this.metrics.averageResponseTime,
        details: {
          requestCount: this.metrics.requestCount,
          errorCount: this.metrics.errorCount,
          activeConnections: this.metrics.activeConnections
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: (error as Error).message
      };
    }
  }

  abstract ping(): Promise<boolean>;

  getStatus(): string {
    if (!this.connected) return 'disconnected';
    if (this.lastError) return 'error';
    return 'connected';
  }

  isConnected(): boolean {
    return this.connected;
  }

  // Metrics & Monitoring
  async getMetrics(): Promise<ServiceMetrics> {
    this.metrics.timestamp = new Date().toISOString();
    this.metrics.memoryUsage = process.memoryUsage().heapUsed;
    return { ...this.metrics };
  }

  async resetMetrics(): Promise<void> {
    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      throughput: 0,
      activeConnections: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      timestamp: new Date().toISOString()
    };
  }

  // Configuration
  getConfig(): ServiceConfig {
    return { ...this.config };
  }

  async updateConfig(config: Partial<ServiceConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    // Optionally reconnect with new config
    if (this.connected) {
      await this.disconnect();
      await this.connect();
    }
  }

  // Capabilities
  abstract getCapabilities(): ServiceCapabilities;

  // Error Handling
  getLastError(): Error | null {
    return this.lastError;
  }

  clearError(): void {
    this.lastError = null;
  }

  // Helper Methods
  protected recordRequest(): void {
    this.metrics.requestCount++;
    this.emit('request', { timestamp: new Date() });
  }

  protected recordError(error: Error): void {
    this.metrics.errorCount++;
    this.lastError = error;
    this.emit('error', error);
  }

  protected recordResponseTime(ms: number): void {
    // Update average (simple moving average)
    const count = this.metrics.requestCount || 1;
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (count - 1) + ms) / count;
  }
}