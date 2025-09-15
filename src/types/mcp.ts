/**
 * MCP (Model Context Protocol) Type Definitions
 * Core types for MCP server integration and client operations
 */

// ============================================
// Core MCP Types
// ============================================

// Define BufferEncoding type if Node types are not available
export type BufferEncoding =
  | 'ascii'
  | 'utf8'
  | 'utf-8'
  | 'utf16le'
  | 'ucs2'
  | 'ucs-2'
  | 'base64'
  | 'base64url'
  | 'latin1'
  | 'binary'
  | 'hex';

/**
 * MCP Server configuration
 */
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

/**
 * MCP Server health status
 */
export interface MCPHealthStatus {
  server: string;
  healthy: boolean;
  timestamp: string;
  lastError?: string;
  responseTime?: number;
}

/**
 * MCP Request options
 */
export interface MCPRequestOptions {
  retries?: number;
  timeout?: number;
  priority?: number;
  metadata?: Record<string, any>;
}

/**
 * MCP Response wrapper
 */
export interface MCPResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  server: string;
  duration?: number;
}

// ============================================
// Memory Server Types
// ============================================

export interface MemoryStoreRequest {
  key: string;
  value: any;
  ttl?: number;
  tags?: string[];
}

export interface MemoryRetrieveResponse {
  key: string;
  value: any;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

export interface MemorySearchResult {
  key: string;
  value: any;
  score: number;
  metadata?: Record<string, any>;
}

// ============================================
// Filesystem Server Types
// ============================================

export interface FileSystemReadRequest {
  path: string;
  encoding?: BufferEncoding;
}

export interface FileSystemWriteRequest {
  path: string;
  content: string;
  backup?: boolean;
  encoding?: BufferEncoding;
}

export interface FileSystemListRequest {
  path: string;
  pattern?: string;
  recursive?: boolean;
  includeHidden?: boolean;
}

export interface FileSystemEntry {
  name: string;
  path: string;
  type: 'file' | 'directory' | 'symlink';
  size?: number;
  modified?: string;
  permissions?: string;
}

// ============================================
// Git Server Types
// ============================================

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  modified: string[];
  untracked: string[];
  deleted: string[];
}

export interface GitCommitRequest {
  message: string;
  files: string[];
  author?: string;
  email?: string;
}

export interface GitCommitInfo {
  hash: string;
  message: string;
  author: string;
  email: string;
  date: string;
  files: string[];
}

export interface GitDiffResult {
  file: string;
  additions: number;
  deletions: number;
  changes: string;
}

export interface GitSymbol {
  name: string;
  type: 'function' | 'class' | 'interface' | 'variable' | 'constant';
  file: string;
  line: number;
  column?: number;
  description?: string;
}

// ============================================
// Vector Server Types
// ============================================

export interface VectorEmbedRequest {
  text: string;
  model?: string;
  dimensions?: number;
}

export interface VectorSearchRequest {
  query: string;
  limit?: number;
  threshold?: number;
  filters?: Record<string, any>;
  includeMetadata?: boolean;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  text: string;
  metadata?: Record<string, any>;
  embedding?: number[];
}

export interface VectorIndexRequest {
  content: string;
  metadata?: Record<string, any>;
  path?: string;
  id?: string;
  namespace?: string;
}

export interface VectorStoreRequest {
  id: string;
  text: string;
  metadata?: Record<string, any>;
  embedding?: number[];
  namespace?: string;
}

export interface VectorStats {
  totalVectors: number;
  dimensions: number;
  namespaces: string[];
  indexSize: number;
  lastUpdated: string;
}

// ============================================
// Analytics Server Types (for future expansion)
// ============================================

export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp?: string;
  userId?: string;
  sessionId?: string;
}

export interface AnalyticsMetric {
  name: string;
  value: number;
  unit?: string;
  tags?: Record<string, string>;
  timestamp?: string;
}

// ============================================
// MCP Client Pool Types
// ============================================

export interface MCPClientPoolConfig {
  poolSize?: number;
  servers?: Record<string, MCPServerConfig>;
  defaultTimeout?: number;
  maxRetries?: number;
  healthCheckInterval?: number;
  queueConcurrency?: number;
}

export interface MCPClientPoolStats {
  activeConnections: number;
  queuedRequests: number;
  totalRequests: number;
  totalErrors: number;
  averageResponseTime: number;
  healthStatus: Record<string, boolean>;
}

// ============================================
// Event Types
// ============================================

export type MCPEventType = 
  | 'health-change'
  | 'request-start'
  | 'request-success'
  | 'request-error'
  | 'retry'
  | 'pool-exhausted'
  | 'server-added'
  | 'server-removed';

export interface MCPEvent {
  type: MCPEventType;
  server?: string;
  data?: any;
  timestamp: string;
}

// ============================================
// Error Types
// ============================================

export class MCPError extends Error {
  constructor(
    message: string,
    public server: string,
    public code?: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'MCPError';
  }
}

export class MCPConnectionError extends MCPError {
  constructor(message: string, server: string, details?: any) {
    super(message, server, 'CONNECTION_ERROR', undefined, details);
    this.name = 'MCPConnectionError';
  }
}

export class MCPTimeoutError extends MCPError {
  constructor(message: string, server: string, timeout: number) {
    super(message, server, 'TIMEOUT_ERROR', undefined, { timeout });
    this.name = 'MCPTimeoutError';
  }
}

export class MCPValidationError extends MCPError {
  constructor(message: string, server: string, field: string, value?: any) {
    super(message, server, 'VALIDATION_ERROR', 400, { field, value });
    this.name = 'MCPValidationError';
  }
}

// ============================================
// Utility Types
// ============================================

export type MCPServerType = 'memory' | 'filesystem' | 'git' | 'vector' | 'analytics';

export type MCPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface MCPRequestConfig {
  server: MCPServerType;
  method: MCPMethod;
  endpoint: string;
  data?: any;
  params?: Record<string, string>;
  headers?: Record<string, string>;
  options?: MCPRequestOptions;
}

// ============================================
// API Response Types (for Next.js API routes)
// ============================================

export interface MCPApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  metadata?: {
    server: string;
    duration: number;
    timestamp: string;
    requestId?: string;
  };
}

export interface MCPHealthCheckResponse {
  healthy: boolean;
  servers: Record<string, {
    status: 'healthy' | 'unhealthy' | 'degraded';
    lastCheck: string;
    responseTime?: number;
    error?: string;
  }>;
  timestamp: string;
}

// ============================================
// Export aggregate types for convenience
// ============================================

export type MCPServerResponse = 
  | MemoryRetrieveResponse
  | MemorySearchResult[]
  | FileSystemEntry[]
  | GitStatus
  | GitCommitInfo
  | GitDiffResult
  | GitSymbol[]
  | VectorSearchResult[]
  | VectorStats;

export type MCPServerRequest =
  | MemoryStoreRequest
  | FileSystemReadRequest
  | FileSystemWriteRequest
  | FileSystemListRequest
  | GitCommitRequest
  | VectorEmbedRequest
  | VectorSearchRequest
  | VectorIndexRequest
  | VectorStoreRequest
  | AnalyticsEvent
  | AnalyticsMetric;