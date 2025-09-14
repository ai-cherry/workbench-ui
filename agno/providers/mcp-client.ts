/**
 * MCP Client Pool for Agno AI
 * Manages connections to MCP servers with retry logic and pooling
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import pino from 'pino';
import pRetry from 'p-retry';
import PQueue from 'p-queue';
import { EventEmitter } from 'eventemitter3';

// Initialize logger
const logger = pino({
  name: 'mcp-client',
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname'
    }
  }
});

// MCP Server configuration
export interface MCPServerConfig {
  name: string;
  url: string;
  port: number;
  protocol: 'http' | 'https';
  healthCheckEndpoint?: string;
  healthCheckInterval?: number;
  timeout?: number;
  maxRetries?: number;
}

// Default MCP servers
export const MCP_SERVERS: Record<string, MCPServerConfig> = {
  memory: {
    name: 'Memory Server',
    url: 'http://localhost',
    port: 8081,
    protocol: 'http',
    healthCheckEndpoint: '/health',
    healthCheckInterval: 30000,
    timeout: 30000,
    maxRetries: 3
  },
  filesystem: {
    name: 'Filesystem Server',
    url: 'http://localhost',
    port: 8082,
    protocol: 'http',
    healthCheckEndpoint: '/health',
    healthCheckInterval: 30000,
    timeout: 30000,
    maxRetries: 3
  },
  git: {
    name: 'Git Server',
    url: 'http://localhost',
    port: 8084,
    protocol: 'http',
    healthCheckEndpoint: '/health',
    healthCheckInterval: 30000,
    timeout: 30000,
    maxRetries: 3
  },
  vector: {
    name: 'Vector Server',
    url: 'http://localhost',
    port: 8085,
    protocol: 'http',
    healthCheckEndpoint: '/health',
    healthCheckInterval: 30000,
    timeout: 30000,
    maxRetries: 3
  }
};

// MCP Client connection pool
export class MCPClientPool extends EventEmitter {
  private pools: Map<string, AxiosInstance[]> = new Map();
  private currentIndex: Map<string, number> = new Map();
  private healthStatus: Map<string, boolean> = new Map();
  private healthCheckIntervals: Map<string, NodeJS.Timer> = new Map();
  private queue: PQueue;
  
  constructor(private poolSize: number = 3) {
    super();
    this.queue = new PQueue({ concurrency: 10 });
    this.initializePools();
    this.startHealthChecks();
  }
  
  /**
   * Initialize connection pools for each MCP server
   */
  private initializePools() {
    Object.entries(MCP_SERVERS).forEach(([key, config]) => {
      const pool: AxiosInstance[] = [];
      const baseURL = `${config.url}:${config.port}`;
      
      for (let i = 0; i < this.poolSize; i++) {
        const client = axios.create({
          baseURL,
          timeout: config.timeout || 30000,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          validateStatus: (status) => status < 500
        });
        
        // Add request interceptor for logging
        client.interceptors.request.use((request) => {
          logger.debug({
            server: key,
            method: request.method,
            url: request.url,
            poolIndex: i
          }, 'MCP request');
          return request;
        });
        
        // Add response interceptor for logging
        client.interceptors.response.use(
          (response) => {
            logger.debug({
              server: key,
              status: response.status,
              url: response.config.url,
              poolIndex: i
            }, 'MCP response');
            return response;
          },
          (error: AxiosError) => {
            logger.error({
              server: key,
              error: error.message,
              status: error.response?.status,
              url: error.config?.url,
              poolIndex: i
            }, 'MCP error');
            throw error;
          }
        );
        
        pool.push(client);
      }
      
      this.pools.set(key, pool);
      this.currentIndex.set(key, 0);
      this.healthStatus.set(key, false);
      
      logger.info({
        server: key,
        poolSize: this.poolSize,
        baseURL
      }, 'MCP pool initialized');
    });
  }
  
  /**
   * Start health checks for all MCP servers
   */
  private startHealthChecks() {
    Object.entries(MCP_SERVERS).forEach(([key, config]) => {
      // Initial health check
      this.checkHealth(key);
      
      // Set up periodic health checks
      const interval = setInterval(() => {
        this.checkHealth(key);
      }, config.healthCheckInterval || 30000);
      
      this.healthCheckIntervals.set(key, interval);
    });
  }
  
  /**
   * Check health of a specific MCP server
   */
  private async checkHealth(serverKey: string) {
    const config = MCP_SERVERS[serverKey];
    const pool = this.pools.get(serverKey);
    
    if (!pool || pool.length === 0) return;
    
    try {
      const client = pool[0];
      const response = await client.get(config.healthCheckEndpoint || '/health');
      
      const isHealthy = response.status === 200;
      const previousStatus = this.healthStatus.get(serverKey);
      
      this.healthStatus.set(serverKey, isHealthy);
      
      if (isHealthy !== previousStatus) {
        this.emit('health-change', {
          server: serverKey,
          healthy: isHealthy,
          timestamp: new Date().toISOString()
        });
        
        logger.info({
          server: serverKey,
          healthy: isHealthy
        }, 'MCP server health status changed');
      }
    } catch (error) {
      this.healthStatus.set(serverKey, false);
      
      logger.warn({
        server: serverKey,
        error: error instanceof Error ? error.message : String(error)
      }, 'MCP health check failed');
    }
  }
  
  /**
   * Get next available client from pool (round-robin)
   */
  private getClient(serverKey: string): AxiosInstance {
    const pool = this.pools.get(serverKey);
    if (!pool || pool.length === 0) {
      throw new Error(`No pool available for server: ${serverKey}`);
    }
    
    const index = this.currentIndex.get(serverKey) || 0;
    const client = pool[index];
    
    // Update index for round-robin
    this.currentIndex.set(serverKey, (index + 1) % pool.length);
    
    return client;
  }
  
  /**
   * Execute request with retry logic
   */
  async execute<T = any>(
    serverKey: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    options?: {
      retries?: number;
      timeout?: number;
      priority?: number;
    }
  ): Promise<T> {
    const config = MCP_SERVERS[serverKey];
    if (!config) {
      throw new Error(`Unknown MCP server: ${serverKey}`);
    }
    
    // Check if server is healthy
    if (!this.healthStatus.get(serverKey)) {
      logger.warn({
        server: serverKey,
        endpoint
      }, 'Attempting request to unhealthy server');
    }
    
    const retries = options?.retries ?? config.maxRetries ?? 3;
    
    return this.queue.add(
      async () => {
        return pRetry(
          async () => {
            const client = this.getClient(serverKey);
            
            const requestConfig = {
              timeout: options?.timeout ?? config.timeout
            };
            
            let response;
            
            switch (method) {
              case 'GET':
                response = await client.get(endpoint, requestConfig);
                break;
              case 'POST':
                response = await client.post(endpoint, data, requestConfig);
                break;
              case 'PUT':
                response = await client.put(endpoint, data, requestConfig);
                break;
              case 'DELETE':
                response = await client.delete(endpoint, requestConfig);
                break;
              default:
                throw new Error(`Unsupported method: ${method}`);
            }
            
            if (response.status >= 400) {
              throw new Error(`MCP request failed: ${response.status} ${response.statusText}`);
            }
            
            return response.data;
          },
          {
            retries,
            onFailedAttempt: (error) => {
              logger.warn({
                server: serverKey,
                endpoint,
                attempt: error.attemptNumber,
                retriesLeft: error.retriesLeft,
                error: error.message
              }, 'MCP request retry');
            }
          }
        );
      },
      { priority: options?.priority ?? 0 }
    );
  }
  
  /**
   * Memory Server operations
   */
  async memoryStore(key: string, value: any): Promise<void> {
    await this.execute('memory', 'POST', '/store', { key, value });
  }
  
  async memoryRetrieve(key: string): Promise<any> {
    return this.execute('memory', 'GET', `/retrieve?key=${encodeURIComponent(key)}`);
  }
  
  async memorySearch(query: string): Promise<any[]> {
    return this.execute('memory', 'GET', `/search?query=${encodeURIComponent(query)}`);
  }
  
  async memoryDelete(key: string): Promise<void> {
    await this.execute('memory', 'DELETE', `/delete?key=${encodeURIComponent(key)}`);
  }
  
  /**
   * Filesystem Server operations
   */
  async filesystemRead(path: string): Promise<string> {
    return this.execute('filesystem', 'POST', '/read', { path });
  }
  
  async filesystemWrite(path: string, content: string, backup: boolean = true): Promise<void> {
    await this.execute('filesystem', 'POST', '/write', { path, content, backup });
  }
  
  async filesystemList(path: string, pattern?: string): Promise<string[]> {
    const params = new URLSearchParams({ path });
    if (pattern) params.append('pattern', pattern);
    return this.execute('filesystem', 'GET', `/list?${params.toString()}`);
  }
  
  async filesystemDelete(path: string): Promise<void> {
    await this.execute('filesystem', 'DELETE', `/delete`, { path });
  }
  
  /**
   * Git Server operations
   */
  async gitStatus(): Promise<any> {
    return this.execute('git', 'GET', '/status');
  }
  
  async gitCommit(message: string, files: string[]): Promise<void> {
    await this.execute('git', 'POST', '/commit', { message, files });
  }
  
  async gitDiff(file?: string): Promise<string> {
    const params = file ? `?file=${encodeURIComponent(file)}` : '';
    return this.execute('git', 'GET', `/diff${params}`);
  }
  
  async gitLog(limit: number = 10): Promise<any[]> {
    return this.execute('git', 'GET', `/log?limit=${limit}`);
  }
  
  async gitSymbols(query: string): Promise<any[]> {
    return this.execute('git', 'GET', `/symbols?query=${encodeURIComponent(query)}`);
  }
  
  /**
   * Vector Server operations
   */
  async vectorEmbed(text: string): Promise<number[]> {
    return this.execute('vector', 'POST', '/embed', { text });
  }
  
  async vectorSearch(query: string, limit: number = 10): Promise<any[]> {
    return this.execute('vector', 'POST', '/search', { query, limit });
  }
  
  async vectorStore(id: string, text: string, metadata?: any): Promise<void> {
    await this.execute('vector', 'POST', '/store', { id, text, metadata });
  }
  
  async vectorDelete(id: string): Promise<void> {
    await this.execute('vector', 'DELETE', `/delete/${encodeURIComponent(id)}`);
  }
  
  /**
   * Get health status of all servers
   */
  getHealthStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    this.healthStatus.forEach((value, key) => {
      status[key] = value;
    });
    return status;
  }
  
  /**
   * Wait for all servers to be healthy
   */
  async waitForHealth(timeout: number = 30000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const allHealthy = Array.from(this.healthStatus.values()).every(status => status);
      
      if (allHealthy) {
        logger.info('All MCP servers are healthy');
        return true;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    logger.warn({
      healthStatus: this.getHealthStatus()
    }, 'Timeout waiting for MCP servers to be healthy');
    
    return false;
  }
  
  /**
   * Clean up resources
   */
  destroy() {
    // Clear health check intervals
    this.healthCheckIntervals.forEach(interval => clearInterval(interval));
    this.healthCheckIntervals.clear();
    
    // Clear pools
    this.pools.clear();
    this.currentIndex.clear();
    this.healthStatus.clear();
    
    // Clear queue
    this.queue.clear();
    
    // Remove all event listeners
    this.removeAllListeners();
    
    logger.info('MCP client pool destroyed');
  }
}

// Export singleton instance
export const mcpClientPool = new MCPClientPool();

// Export for testing
export default MCPClientPool;