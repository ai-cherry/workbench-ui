/**
 * Vector Service Contract
 * Interface for the Vector MCP server (Embeddings & Semantic Search)
 */

import { BaseService, IBaseService, SearchOptions, PaginatedResult } from './base.service';

// Vector Types
export interface Embedding {
  id: string;
  vector: number[];
  dimensions: number;
  model: string;
  createdAt: string;
}

export interface VectorDocument {
  id: string;
  content: string;
  embedding?: number[];
  metadata?: VectorMetadata;
  namespace?: string;
  score?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface VectorMetadata {
  source?: string;
  title?: string;
  author?: string;
  tags?: string[];
  type?: string;
  language?: string;
  timestamp?: string;
  [key: string]: any;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  content: string;
  metadata?: VectorMetadata;
  embedding?: number[];
  highlights?: string[];
  explanation?: string;
}

export interface VectorIndex {
  name: string;
  dimensions: number;
  metric: 'cosine' | 'euclidean' | 'dot_product';
  totalVectors: number;
  namespace?: string;
  model?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VectorCluster {
  id: string;
  centroid: number[];
  documents: string[];
  label?: string;
  keywords?: string[];
  size: number;
}

// Request/Response Types
export interface EmbedRequest {
  text: string | string[];
  model?: string;
  dimensions?: number;
  normalize?: boolean;
}

export interface EmbedResponse {
  embeddings: number[][];
  model: string;
  dimensions: number;
  tokens?: number;
}

export interface IndexRequest {
  content: string | string[];
  metadata?: VectorMetadata | VectorMetadata[];
  id?: string | string[];
  namespace?: string;
  skipEmbedding?: boolean;
  embedding?: number[] | number[][];
}

export interface SearchRequest extends SearchOptions {
  query: string;
  namespace?: string;
  includeMetadata?: boolean;
  includeEmbedding?: boolean;
  includeExplanation?: boolean;
  threshold?: number;
  rerank?: boolean;
  hybridAlpha?: number; // for hybrid search (0 = keyword only, 1 = vector only)
}

export interface UpdateRequest {
  id: string;
  content?: string;
  metadata?: Partial<VectorMetadata>;
  embedding?: number[];
  namespace?: string;
}

export interface BatchOperation {
  operation: 'index' | 'update' | 'delete';
  documents: VectorDocument[];
}

export interface SimilarityRequest {
  vectors: number[][];
  metric?: 'cosine' | 'euclidean' | 'dot_product';
  k?: number;
}

export interface ClusteringRequest {
  namespace?: string;
  k: number; // number of clusters
  iterations?: number;
  seed?: number;
  algorithm?: 'kmeans' | 'dbscan' | 'hierarchical';
}

export interface VectorStats {
  totalVectors: number;
  totalNamespaces: number;
  dimensions: number[];
  models: string[];
  indexSize: number;
  avgQueryTime: number;
  cacheHitRate: number;
  lastUpdated: string;
}

// Main Interface
export interface IVectorService extends IBaseService {
  // Embedding Operations
  embed(request: EmbedRequest): Promise<EmbedResponse>;
  embedBatch(texts: string[], model?: string): Promise<number[][]>;
  
  // Indexing Operations
  index(request: IndexRequest): Promise<VectorDocument | VectorDocument[]>;
  indexBatch(documents: VectorDocument[]): Promise<void>;
  update(request: UpdateRequest): Promise<VectorDocument>;
  delete(id: string | string[], namespace?: string): Promise<boolean>;
  
  // Search Operations
  search(request: SearchRequest): Promise<PaginatedResult<VectorSearchResult>>;
  searchByVector(vector: number[], limit?: number, namespace?: string): Promise<VectorSearchResult[]>;
  hybridSearch(query: string, alpha?: number, limit?: number): Promise<VectorSearchResult[]>;
  
  // Similarity Operations
  findSimilar(id: string, limit?: number, namespace?: string): Promise<VectorSearchResult[]>;
  computeSimilarity(vector1: number[], vector2: number[], metric?: 'cosine' | 'euclidean' | 'dot_product'): Promise<number>;
  batchSimilarity(request: SimilarityRequest): Promise<number[][]>;
  
  // Document Operations
  getDocument(id: string, namespace?: string): Promise<VectorDocument | null>;
  getDocuments(ids: string[], namespace?: string): Promise<VectorDocument[]>;
  listDocuments(namespace?: string, limit?: number, offset?: number): Promise<PaginatedResult<VectorDocument>>;
  
  // Index Management
  createIndex(name: string, dimensions: number, metric?: 'cosine' | 'euclidean' | 'dot_product'): Promise<VectorIndex>;
  getIndex(name: string): Promise<VectorIndex | null>;
  listIndexes(): Promise<VectorIndex[]>;
  deleteIndex(name: string): Promise<boolean>;
  optimizeIndex(name?: string): Promise<void>;
  
  // Namespace Operations
  createNamespace(name: string): Promise<void>;
  listNamespaces(): Promise<string[]>;
  deleteNamespace(name: string): Promise<boolean>;
  getNamespaceStats(name: string): Promise<any>;
  
  // Clustering & Analysis
  cluster(request: ClusteringRequest): Promise<VectorCluster[]>;
  getCluster(clusterId: string): Promise<VectorCluster | null>;
  assignToCluster(documentId: string, clusterId: string): Promise<void>;
  
  // Batch Operations
  executeBatch(operations: BatchOperation[]): Promise<void>;
  importData(data: any, format: 'json' | 'csv' | 'parquet'): Promise<number>;
  exportData(namespace?: string, format?: 'json' | 'csv' | 'parquet'): Promise<any>;
  
  // Model Management
  listModels(): Promise<string[]>;
  getModelInfo(model: string): Promise<any>;
  loadModel(model: string): Promise<void>;
  unloadModel(model: string): Promise<void>;
  
  // Statistics & Monitoring
  getStats(): Promise<VectorStats>;
  getQueryPerformance(timeRange?: { start: string; end: string }): Promise<any>;
  getIndexMetrics(indexName?: string): Promise<any>;
  
  // Backup & Restore
  backup(path?: string): Promise<string>;
  restore(path: string): Promise<void>;
  snapshot(name: string): Promise<void>;
  listSnapshots(): Promise<string[]>;
  
  // Advanced Operations
  rerank(documentIds: string[], query: string): Promise<VectorSearchResult[]>;
  diversify(results: VectorSearchResult[], diversity: number): Promise<VectorSearchResult[]>;
  explain(documentId: string, query: string): Promise<any>;
  
  // Maintenance
  compact(): Promise<void>;
  reindex(namespace?: string): Promise<void>;
  clearCache(): Promise<void>;
  
  // Training & Fine-tuning
  trainModel(data: any[], modelName: string, config?: any): Promise<void>;
  evaluateModel(modelName: string, testData: any[]): Promise<any>;
  
  // Integration
  syncWithDatabase(connectionString: string, query: string): Promise<number>;
  syncWithFileSystem(path: string, pattern?: string): Promise<number>;
}

// Implementation helpers
export abstract class VectorServiceBase extends BaseService implements IVectorService {
  abstract embed(request: EmbedRequest): Promise<EmbedResponse>;
  abstract embedBatch(texts: string[], model?: string): Promise<number[][]>;
  abstract index(request: IndexRequest): Promise<VectorDocument | VectorDocument[]>;
  abstract indexBatch(documents: VectorDocument[]): Promise<void>;
  abstract update(request: UpdateRequest): Promise<VectorDocument>;
  abstract delete(id: string | string[], namespace?: string): Promise<boolean>;
  abstract search(request: SearchRequest): Promise<PaginatedResult<VectorSearchResult>>;
  abstract searchByVector(vector: number[], limit?: number, namespace?: string): Promise<VectorSearchResult[]>;
  abstract hybridSearch(query: string, alpha?: number, limit?: number): Promise<VectorSearchResult[]>;
  abstract findSimilar(id: string, limit?: number, namespace?: string): Promise<VectorSearchResult[]>;
  abstract computeSimilarity(vector1: number[], vector2: number[], metric?: 'cosine' | 'euclidean' | 'dot_product'): Promise<number>;
  abstract batchSimilarity(request: SimilarityRequest): Promise<number[][]>;
  abstract getDocument(id: string, namespace?: string): Promise<VectorDocument | null>;
  abstract getDocuments(ids: string[], namespace?: string): Promise<VectorDocument[]>;
  abstract listDocuments(namespace?: string, limit?: number, offset?: number): Promise<PaginatedResult<VectorDocument>>;
  abstract createIndex(name: string, dimensions: number, metric?: 'cosine' | 'euclidean' | 'dot_product'): Promise<VectorIndex>;
  abstract getIndex(name: string): Promise<VectorIndex | null>;
  abstract listIndexes(): Promise<VectorIndex[]>;
  abstract deleteIndex(name: string): Promise<boolean>;
  abstract optimizeIndex(name?: string): Promise<void>;
  abstract createNamespace(name: string): Promise<void>;
  abstract listNamespaces(): Promise<string[]>;
  abstract deleteNamespace(name: string): Promise<boolean>;
  abstract getNamespaceStats(name: string): Promise<any>;
  abstract cluster(request: ClusteringRequest): Promise<VectorCluster[]>;
  abstract getCluster(clusterId: string): Promise<VectorCluster | null>;
  abstract assignToCluster(documentId: string, clusterId: string): Promise<void>;
  abstract executeBatch(operations: BatchOperation[]): Promise<void>;
  abstract importData(data: any, format: 'json' | 'csv' | 'parquet'): Promise<number>;
  abstract exportData(namespace?: string, format?: 'json' | 'csv' | 'parquet'): Promise<any>;
  abstract listModels(): Promise<string[]>;
  abstract getModelInfo(model: string): Promise<any>;
  abstract loadModel(model: string): Promise<void>;
  abstract unloadModel(model: string): Promise<void>;
  abstract getStats(): Promise<VectorStats>;
  abstract getQueryPerformance(timeRange?: { start: string; end: string }): Promise<any>;
  abstract getIndexMetrics(indexName?: string): Promise<any>;
  abstract backup(path?: string): Promise<string>;
  abstract restore(path: string): Promise<void>;
  abstract snapshot(name: string): Promise<void>;
  abstract listSnapshots(): Promise<string[]>;
  abstract rerank(documentIds: string[], query: string): Promise<VectorSearchResult[]>;
  abstract diversify(results: VectorSearchResult[], diversity: number): Promise<VectorSearchResult[]>;
  abstract explain(documentId: string, query: string): Promise<any>;
  abstract compact(): Promise<void>;
  abstract reindex(namespace?: string): Promise<void>;
  abstract clearCache(): Promise<void>;
  abstract trainModel(data: any[], modelName: string, config?: any): Promise<void>;
  abstract evaluateModel(modelName: string, testData: any[]): Promise<any>;
  abstract syncWithDatabase(connectionString: string, query: string): Promise<number>;
  abstract syncWithFileSystem(path: string, pattern?: string): Promise<number>;
}