/**
 * Memory Service Contract
 * Interface for the Memory MCP server (Knowledge Graph)
 */

import { BaseService, IBaseService, SearchOptions, PaginatedResult } from './base.service';

// Entity Types
export interface Entity {
  name: string;
  entityType: string;
  observations: string[];
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface Relation {
  from: string;
  to: string;
  relationType: string;
  strength?: number;
  properties?: Record<string, any>;
  createdAt?: string;
}

// Request/Response Types
export interface StoreRequest {
  key: string;
  value: any;
  ttl?: number;
  tags?: string[];
  namespace?: string;
}

export interface RetrieveRequest {
  key: string;
  namespace?: string;
}

export interface SearchRequest extends SearchOptions {
  namespace?: string;
  tags?: string[];
  includeRelations?: boolean;
}

export interface MemorySearchResult {
  key: string;
  value: any;
  score: number;
  tags?: string[];
  metadata?: Record<string, any>;
  relations?: Relation[];
}

export interface GraphNode {
  entity: Entity;
  relations: Relation[];
  degree: number;
  centrality?: number;
}

export interface GraphPath {
  nodes: Entity[];
  edges: Relation[];
  cost: number;
}

export interface GraphQuery {
  startNode?: string;
  endNode?: string;
  maxDepth?: number;
  relationTypes?: string[];
  filters?: Record<string, any>;
}

export interface MemoryStats {
  totalEntities: number;
  totalRelations: number;
  namespaces: string[];
  storageSize: number;
  cacheHitRate: number;
  lastCompaction?: string;
}

// Main Interface
export interface IMemoryService extends IBaseService {
  // Basic Operations
  store(request: StoreRequest): Promise<void>;
  retrieve(request: RetrieveRequest): Promise<any>;
  delete(key: string, namespace?: string): Promise<boolean>;
  exists(key: string, namespace?: string): Promise<boolean>;
  
  // Search Operations
  search(request: SearchRequest): Promise<PaginatedResult<MemorySearchResult>>;
  searchByTags(tags: string[], options?: SearchOptions): Promise<PaginatedResult<MemorySearchResult>>;
  
  // Entity Operations
  createEntity(entity: Entity): Promise<Entity>;
  createEntities(entities: Entity[]): Promise<Entity[]>;
  getEntity(name: string): Promise<Entity | null>;
  updateEntity(name: string, updates: Partial<Entity>): Promise<Entity>;
  deleteEntity(name: string): Promise<boolean>;
  
  // Relation Operations
  createRelation(relation: Relation): Promise<Relation>;
  createRelations(relations: Relation[]): Promise<Relation[]>;
  getRelations(entityName: string, direction?: 'from' | 'to' | 'both'): Promise<Relation[]>;
  deleteRelation(from: string, to: string, relationType?: string): Promise<boolean>;
  
  // Graph Operations
  getGraph(query?: GraphQuery): Promise<GraphNode[]>;
  findPath(from: string, to: string, maxDepth?: number): Promise<GraphPath | null>;
  findPaths(from: string, to: string, limit?: number, maxDepth?: number): Promise<GraphPath[]>;
  getNeighbors(entityName: string, depth?: number): Promise<Entity[]>;
  
  // Observation Operations
  addObservations(entityName: string, observations: string[]): Promise<Entity>;
  removeObservations(entityName: string, observations: string[]): Promise<Entity>;
  
  // Pattern Matching
  findPattern(pattern: Partial<Entity>): Promise<Entity[]>;
  findRelationPattern(pattern: Partial<Relation>): Promise<Relation[]>;
  
  // Analytics
  getStats(): Promise<MemoryStats>;
  getCentrality(entityName: string): Promise<number>;
  getPageRank(damping?: number, iterations?: number): Promise<Map<string, number>>;
  getCommunities(): Promise<Entity[][]>;
  
  // Maintenance
  compact(): Promise<void>;
  backup(path?: string): Promise<string>;
  restore(path: string): Promise<void>;
  clear(namespace?: string): Promise<void>;
  
  // Namespace Operations
  listNamespaces(): Promise<string[]>;
  createNamespace(name: string): Promise<void>;
  deleteNamespace(name: string): Promise<void>;
  
  // Export/Import
  exportGraph(format: 'json' | 'graphml' | 'gexf'): Promise<string>;
  importGraph(data: string, format: 'json' | 'graphml' | 'gexf'): Promise<void>;
}

// Implementation helpers
export abstract class MemoryServiceBase extends BaseService implements IMemoryService {
  abstract store(request: StoreRequest): Promise<void>;
  abstract retrieve(request: RetrieveRequest): Promise<any>;
  abstract delete(key: string, namespace?: string): Promise<boolean>;
  abstract exists(key: string, namespace?: string): Promise<boolean>;
  abstract search(request: SearchRequest): Promise<PaginatedResult<MemorySearchResult>>;
  abstract searchByTags(tags: string[], options?: SearchOptions): Promise<PaginatedResult<MemorySearchResult>>;
  abstract createEntity(entity: Entity): Promise<Entity>;
  abstract createEntities(entities: Entity[]): Promise<Entity[]>;
  abstract getEntity(name: string): Promise<Entity | null>;
  abstract updateEntity(name: string, updates: Partial<Entity>): Promise<Entity>;
  abstract deleteEntity(name: string): Promise<boolean>;
  abstract createRelation(relation: Relation): Promise<Relation>;
  abstract createRelations(relations: Relation[]): Promise<Relation[]>;
  abstract getRelations(entityName: string, direction?: 'from' | 'to' | 'both'): Promise<Relation[]>;
  abstract deleteRelation(from: string, to: string, relationType?: string): Promise<boolean>;
  abstract getGraph(query?: GraphQuery): Promise<GraphNode[]>;
  abstract findPath(from: string, to: string, maxDepth?: number): Promise<GraphPath | null>;
  abstract findPaths(from: string, to: string, limit?: number, maxDepth?: number): Promise<GraphPath[]>;
  abstract getNeighbors(entityName: string, depth?: number): Promise<Entity[]>;
  abstract addObservations(entityName: string, observations: string[]): Promise<Entity>;
  abstract removeObservations(entityName: string, observations: string[]): Promise<Entity>;
  abstract findPattern(pattern: Partial<Entity>): Promise<Entity[]>;
  abstract findRelationPattern(pattern: Partial<Relation>): Promise<Relation[]>;
  abstract getStats(): Promise<MemoryStats>;
  abstract getCentrality(entityName: string): Promise<number>;
  abstract getPageRank(damping?: number, iterations?: number): Promise<Map<string, number>>;
  abstract getCommunities(): Promise<Entity[][]>;
  abstract compact(): Promise<void>;
  abstract backup(path?: string): Promise<string>;
  abstract restore(path: string): Promise<void>;
  abstract clear(namespace?: string): Promise<void>;
  abstract listNamespaces(): Promise<string[]>;
  abstract createNamespace(name: string): Promise<void>;
  abstract deleteNamespace(name: string): Promise<void>;
  abstract exportGraph(format: 'json' | 'graphml' | 'gexf'): Promise<string>;
  abstract importGraph(data: string, format: 'json' | 'graphml' | 'gexf'): Promise<void>;
}