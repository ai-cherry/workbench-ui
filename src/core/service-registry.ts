/**
 * Service Registry
 * Central registry for all MCP services in Sophia Intel AI
 * Manages service discovery, registration, health monitoring, and dependency resolution
 */

import { EventEmitter } from 'events';
import { IBaseService, ServiceConfig, ServiceHealth, ServiceMetrics } from './service-contracts/base.service';
import { IMemoryService } from './service-contracts/memory.service';
import { IFilesystemService } from './service-contracts/filesystem.service';
import { IGitService } from './service-contracts/git.service';
import { IVectorService } from './service-contracts/vector.service';

// Service Types
export enum ServiceType {
  MEMORY = 'memory',
  FILESYSTEM = 'filesystem',
  GIT = 'git',
  VECTOR = 'vector',
  REDIS = 'redis',
  CUSTOM = 'custom'
}

// Service Status
export enum ServiceStatus {
  UNREGISTERED = 'unregistered',
  REGISTERED = 'registered',
  INITIALIZING = 'initializing',
  CONNECTED = 'connected',
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
  SHUTTING_DOWN = 'shutting_down',
  SHUTDOWN = 'shutdown'
}

// Service Registration Entry
export interface ServiceRegistration {
  id: string;
  type: ServiceType;
  name: string;
  service: IBaseService;
  config: ServiceConfig;
  status: ServiceStatus;
  health?: ServiceHealth;
  metrics?: ServiceMetrics;
  dependencies: string[];
  dependents: string[];
  registeredAt: Date;
  lastHealthCheck?: Date;
  lastError?: Error;
  metadata?: Record<string, any>;
}

// Service Registry Events
export interface ServiceRegistryEvents {
  'service:registered': (registration: ServiceRegistration) => void;
  'service:unregistered': (id: string) => void;
  'service:connected': (id: string) => void;
  'service:disconnected': (id: string) => void;
  'service:healthy': (id: string, health: ServiceHealth) => void;
  'service:unhealthy': (id: string, health: ServiceHealth) => void;
  'service:error': (id: string, error: Error) => void;
  'registry:initialized': () => void;
  'registry:shutdown': () => void;
}

// Service Discovery Options
export interface ServiceDiscoveryOptions {
  type?: ServiceType;
  status?: ServiceStatus | ServiceStatus[];
  healthy?: boolean;
  tags?: string[];
}

// Service Dependency Graph
export interface DependencyGraph {
  nodes: Map<string, ServiceRegistration>;
  edges: Map<string, Set<string>>;
}

/**
 * ServiceRegistry - Central service management for Sophia Intel AI
 */
export class ServiceRegistry extends EventEmitter {
  private services: Map<string, ServiceRegistration>;
  private servicesByType: Map<ServiceType, Set<string>>;
  private dependencyGraph: DependencyGraph;
  private healthCheckIntervals: Map<string, NodeJS.Timeout>;
  private initialized: boolean = false;
  private shutdownInProgress: boolean = false;

  constructor() {
    super();
    this.services = new Map();
    this.servicesByType = new Map();
    this.dependencyGraph = {
      nodes: new Map(),
      edges: new Map()
    };
    this.healthCheckIntervals = new Map();
  }

  /**
   * Initialize the service registry
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      throw new Error('Service registry already initialized');
    }

    console.log('[ServiceRegistry] Initializing...');
    
    // Initialize service type maps
    for (const type of Object.values(ServiceType)) {
      this.servicesByType.set(type as ServiceType, new Set());
    }

    this.initialized = true;
    this.emit('registry:initialized');
    console.log('[ServiceRegistry] Initialized successfully');
  }

  /**
   * Register a service
   */
  async register(
    id: string,
    type: ServiceType,
    service: IBaseService,
    config: ServiceConfig,
    dependencies: string[] = []
  ): Promise<ServiceRegistration> {
    if (!this.initialized) {
      throw new Error('Service registry not initialized');
    }

    if (this.services.has(id)) {
      throw new Error(`Service ${id} already registered`);
    }

    console.log(`[ServiceRegistry] Registering service: ${id} (${type})`);

    // Validate dependencies exist
    for (const depId of dependencies) {
      if (!this.services.has(depId)) {
        throw new Error(`Dependency ${depId} not found for service ${id}`);
      }
    }

    // Create registration
    const registration: ServiceRegistration = {
      id,
      type,
      name: config.name,
      service,
      config,
      status: ServiceStatus.REGISTERED,
      dependencies,
      dependents: [],
      registeredAt: new Date(),
      metadata: {}
    };

    // Register service
    this.services.set(id, registration);
    this.servicesByType.get(type)?.add(id);
    
    // Update dependency graph
    this.dependencyGraph.nodes.set(id, registration);
    this.dependencyGraph.edges.set(id, new Set(dependencies));
    
    // Update dependents for dependencies
    for (const depId of dependencies) {
      const dep = this.services.get(depId);
      if (dep) {
        dep.dependents.push(id);
      }
    }

    // Emit registration event
    this.emit('service:registered', registration);
    
    console.log(`[ServiceRegistry] Service ${id} registered successfully`);
    return registration;
  }

  /**
   * Unregister a service
   */
  async unregister(id: string): Promise<void> {
    const registration = this.services.get(id);
    if (!registration) {
      throw new Error(`Service ${id} not found`);
    }

    // Check if service has dependents
    if (registration.dependents.length > 0) {
      throw new Error(
        `Cannot unregister ${id}: has dependents [${registration.dependents.join(', ')}]`
      );
    }

    console.log(`[ServiceRegistry] Unregistering service: ${id}`);

    // Stop health checks
    this.stopHealthCheck(id);

    // Disconnect service
    if (registration.status === ServiceStatus.CONNECTED) {
      await this.disconnect(id);
    }

    // Remove from registries
    this.services.delete(id);
    this.servicesByType.get(registration.type)?.delete(id);
    this.dependencyGraph.nodes.delete(id);
    this.dependencyGraph.edges.delete(id);

    // Remove from dependents lists
    for (const depId of registration.dependencies) {
      const dep = this.services.get(depId);
      if (dep) {
        dep.dependents = dep.dependents.filter(d => d !== id);
      }
    }

    this.emit('service:unregistered', id);
    console.log(`[ServiceRegistry] Service ${id} unregistered successfully`);
  }

  /**
   * Connect a service
   */
  async connect(id: string): Promise<void> {
    const registration = this.services.get(id);
    if (!registration) {
      throw new Error(`Service ${id} not found`);
    }

    if (registration.status === ServiceStatus.CONNECTED) {
      console.log(`[ServiceRegistry] Service ${id} already connected`);
      return;
    }

    console.log(`[ServiceRegistry] Connecting service: ${id}`);
    
    // Check dependencies are connected
    for (const depId of registration.dependencies) {
      const dep = this.services.get(depId);
      if (!dep || dep.status !== ServiceStatus.CONNECTED) {
        throw new Error(`Dependency ${depId} not connected for service ${id}`);
      }
    }

    registration.status = ServiceStatus.INITIALIZING;

    try {
      // Initialize service
      await registration.service.initialize(registration.config);
      
      // Connect service
      await registration.service.connect();
      
      registration.status = ServiceStatus.CONNECTED;
      this.emit('service:connected', id);
      
      // Start health monitoring
      this.startHealthCheck(id);
      
      console.log(`[ServiceRegistry] Service ${id} connected successfully`);
    } catch (error) {
      registration.status = ServiceStatus.ERROR;
      registration.lastError = error as Error;
      this.emit('service:error', id, error as Error);
      throw error;
    }
  }

  /**
   * Disconnect a service
   */
  async disconnect(id: string): Promise<void> {
    const registration = this.services.get(id);
    if (!registration) {
      throw new Error(`Service ${id} not found`);
    }

    if (registration.status === ServiceStatus.DISCONNECTED) {
      console.log(`[ServiceRegistry] Service ${id} already disconnected`);
      return;
    }

    console.log(`[ServiceRegistry] Disconnecting service: ${id}`);
    
    // Check if any dependents are still connected
    for (const depId of registration.dependents) {
      const dep = this.services.get(depId);
      if (dep && dep.status === ServiceStatus.CONNECTED) {
        throw new Error(`Cannot disconnect ${id}: dependent ${depId} still connected`);
      }
    }

    registration.status = ServiceStatus.SHUTTING_DOWN;
    
    // Stop health monitoring
    this.stopHealthCheck(id);

    try {
      await registration.service.disconnect();
      registration.status = ServiceStatus.DISCONNECTED;
      this.emit('service:disconnected', id);
      console.log(`[ServiceRegistry] Service ${id} disconnected successfully`);
    } catch (error) {
      registration.status = ServiceStatus.ERROR;
      registration.lastError = error as Error;
      this.emit('service:error', id, error as Error);
      throw error;
    }
  }

  /**
   * Get a service by ID
   */
  get<T extends IBaseService>(id: string): T | undefined {
    return this.services.get(id)?.service as T;
  }

  /**
   * Get a service by type
   */
  getByType<T extends IBaseService>(type: ServiceType): T[] {
    const ids = this.servicesByType.get(type) || new Set();
    return Array.from(ids)
      .map(id => this.services.get(id)?.service)
      .filter(Boolean) as T[];
  }

  /**
   * Get Memory service
   */
  getMemoryService(): IMemoryService | undefined {
    const services = this.getByType<IMemoryService>(ServiceType.MEMORY);
    return services[0];
  }

  /**
   * Get Filesystem service
   */
  getFilesystemService(): IFilesystemService | undefined {
    const services = this.getByType<IFilesystemService>(ServiceType.FILESYSTEM);
    return services[0];
  }

  /**
   * Get Git service
   */
  getGitService(): IGitService | undefined {
    const services = this.getByType<IGitService>(ServiceType.GIT);
    return services[0];
  }

  /**
   * Get Vector service
   */
  getVectorService(): IVectorService | undefined {
    const services = this.getByType<IVectorService>(ServiceType.VECTOR);
    return services[0];
  }

  /**
   * Discover services
   */
  discover(options?: ServiceDiscoveryOptions): ServiceRegistration[] {
    let results = Array.from(this.services.values());

    if (options?.type) {
      results = results.filter(r => r.type === options.type);
    }

    if (options?.status) {
      const statuses = Array.isArray(options.status) ? options.status : [options.status];
      results = results.filter(r => statuses.includes(r.status));
    }

    if (options?.healthy !== undefined) {
      results = results.filter(r => {
        const isHealthy = r.health?.status === 'healthy';
        return options.healthy ? isHealthy : !isHealthy;
      });
    }

    if (options?.tags) {
      results = results.filter(r => {
        const tags = r.metadata?.tags || [];
        return options.tags!.every(tag => tags.includes(tag));
      });
    }

    return results;
  }

  /**
   * Get service health
   */
  async getHealth(id: string): Promise<ServiceHealth | undefined> {
    const registration = this.services.get(id);
    if (!registration) {
      return undefined;
    }

    try {
      const health = await registration.service.health();
      registration.health = health;
      registration.lastHealthCheck = new Date();
      
      const wasHealthy = registration.status === ServiceStatus.HEALTHY;
      const isHealthy = health.status === 'healthy';
      
      if (isHealthy && !wasHealthy) {
        registration.status = ServiceStatus.HEALTHY;
        this.emit('service:healthy', id, health);
      } else if (!isHealthy && wasHealthy) {
        registration.status = health.status === 'degraded' 
          ? ServiceStatus.DEGRADED 
          : ServiceStatus.UNHEALTHY;
        this.emit('service:unhealthy', id, health);
      }
      
      return health;
    } catch (error) {
      registration.status = ServiceStatus.UNHEALTHY;
      registration.lastError = error as Error;
      this.emit('service:error', id, error as Error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: (error as Error).message
      };
    }
  }

  /**
   * Get service metrics
   */
  async getMetrics(id: string): Promise<ServiceMetrics | undefined> {
    const registration = this.services.get(id);
    if (!registration) {
      return undefined;
    }

    try {
      const metrics = await registration.service.getMetrics();
      registration.metrics = metrics;
      return metrics;
    } catch (error) {
      console.error(`[ServiceRegistry] Failed to get metrics for ${id}:`, error);
      return undefined;
    }
  }

  /**
   * Start health monitoring for a service
   */
  private startHealthCheck(id: string, interval: number = 10000): void {
    this.stopHealthCheck(id);
    
    const checkHealth = async () => {
      await this.getHealth(id);
    };

    // Initial health check
    checkHealth();
    
    // Schedule periodic health checks
    const intervalId = setInterval(checkHealth, interval);
    this.healthCheckIntervals.set(id, intervalId);
  }

  /**
   * Stop health monitoring for a service
   */
  private stopHealthCheck(id: string): void {
    const intervalId = this.healthCheckIntervals.get(id);
    if (intervalId) {
      clearInterval(intervalId);
      this.healthCheckIntervals.delete(id);
    }
  }

  /**
   * Get dependency order for startup
   */
  getStartupOrder(): string[] {
    const visited = new Set<string>();
    const order: string[] = [];

    const visit = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);
      
      const dependencies = this.dependencyGraph.edges.get(id) || new Set();
      for (const depId of dependencies) {
        visit(depId);
      }
      
      order.push(id);
    };

    for (const id of this.services.keys()) {
      visit(id);
    }

    return order;
  }

  /**
   * Get shutdown order (reverse of startup)
   */
  getShutdownOrder(): string[] {
    return this.getStartupOrder().reverse();
  }

  /**
   * Connect all services in dependency order
   */
  async connectAll(): Promise<void> {
    const order = this.getStartupOrder();
    console.log(`[ServiceRegistry] Connecting services in order: ${order.join(' -> ')}`);
    
    for (const id of order) {
      await this.connect(id);
    }
  }

  /**
   * Disconnect all services in reverse dependency order
   */
  async disconnectAll(): Promise<void> {
    const order = this.getShutdownOrder();
    console.log(`[ServiceRegistry] Disconnecting services in order: ${order.join(' -> ')}`);
    
    for (const id of order) {
      await this.disconnect(id);
    }
  }

  /**
   * Shutdown the registry
   */
  async shutdown(): Promise<void> {
    if (this.shutdownInProgress) {
      console.log('[ServiceRegistry] Shutdown already in progress');
      return;
    }

    this.shutdownInProgress = true;
    console.log('[ServiceRegistry] Shutting down...');

    // Stop all health checks
    for (const id of this.healthCheckIntervals.keys()) {
      this.stopHealthCheck(id);
    }

    // Disconnect all services
    await this.disconnectAll();

    // Clear registries
    this.services.clear();
    this.servicesByType.clear();
    this.dependencyGraph.nodes.clear();
    this.dependencyGraph.edges.clear();

    this.initialized = false;
    this.shutdownInProgress = false;
    
    this.emit('registry:shutdown');
    console.log('[ServiceRegistry] Shutdown complete');
  }

  /**
   * Get registry status
   */
  getStatus(): {
    initialized: boolean;
    serviceCount: number;
    services: {
      id: string;
      type: ServiceType;
      status: ServiceStatus;
      health?: string;
    }[];
    healthy: number;
    unhealthy: number;
    connected: number;
    disconnected: number;
  } {
    const services = Array.from(this.services.values());
    
    return {
      initialized: this.initialized,
      serviceCount: services.length,
      services: services.map(s => ({
        id: s.id,
        type: s.type,
        status: s.status,
        health: s.health?.status
      })),
      healthy: services.filter(s => s.status === ServiceStatus.HEALTHY).length,
      unhealthy: services.filter(s => 
        s.status === ServiceStatus.UNHEALTHY || 
        s.status === ServiceStatus.DEGRADED
      ).length,
      connected: services.filter(s => s.status === ServiceStatus.CONNECTED).length,
      disconnected: services.filter(s => s.status === ServiceStatus.DISCONNECTED).length
    };
  }
}

// Export singleton instance
export const serviceRegistry = new ServiceRegistry();