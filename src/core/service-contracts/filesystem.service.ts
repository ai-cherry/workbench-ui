/**
 * Filesystem Service Contract
 * Interface for the Filesystem MCP server
 */

import { BaseService, IBaseService, SearchOptions, PaginatedResult } from './base.service';

// File System Types
export interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory' | 'symlink';
  size: number;
  modified: string;
  created?: string;
  permissions?: string;
  owner?: string;
  group?: string;
  mimeType?: string;
  encoding?: string;
}

export interface FileContent {
  path: string;
  content: string;
  encoding: string;
  size: number;
  checksum?: string;
}

export interface FileMetadata {
  path: string;
  stats: FileEntry;
  attributes?: Record<string, any>;
  tags?: string[];
}

export interface DirectoryTree {
  path: string;
  name: string;
  type: 'directory';
  children: (DirectoryTree | FileEntry)[];
  totalFiles: number;
  totalSize: number;
}

// Request/Response Types
export interface ReadRequest {
  path: string;
  encoding?: BufferEncoding;
  range?: {
    start: number;
    end: number;
  };
}

export interface WriteRequest {
  path: string;
  content: string;
  encoding?: BufferEncoding;
  mode?: number;
  backup?: boolean;
  createDirectories?: boolean;
}

export interface ListRequest {
  path: string;
  pattern?: string;
  recursive?: boolean;
  includeHidden?: boolean;
  maxDepth?: number;
  filter?: {
    type?: 'file' | 'directory';
    minSize?: number;
    maxSize?: number;
    modifiedAfter?: string;
    modifiedBefore?: string;
  };
}

export interface CopyRequest {
  source: string;
  destination: string;
  overwrite?: boolean;
  preserveTimestamps?: boolean;
  preservePermissions?: boolean;
}

export interface MoveRequest {
  source: string;
  destination: string;
  overwrite?: boolean;
}

export interface SearchFileRequest extends SearchOptions {
  path: string;
  pattern?: string;
  contentPattern?: string;
  includeHidden?: boolean;
  maxDepth?: number;
  caseSensitive?: boolean;
}

export interface FileOperation {
  operation: 'create' | 'update' | 'delete' | 'rename' | 'move' | 'copy';
  path: string;
  timestamp: string;
  user?: string;
  details?: Record<string, any>;
}

export interface FileWatcher {
  id: string;
  path: string;
  pattern?: string;
  events: ('create' | 'update' | 'delete' | 'rename')[];
  recursive?: boolean;
  callback: (event: FileOperation) => void;
}

export interface FileSystemStats {
  totalSpace: number;
  freeSpace: number;
  usedSpace: number;
  fileCount: number;
  directoryCount: number;
  largestFile?: FileEntry;
  recentOperations: FileOperation[];
}

// Symbol/Code Types
export interface Symbol {
  name: string;
  type: 'function' | 'class' | 'interface' | 'variable' | 'constant' | 'method' | 'property';
  file: string;
  line: number;
  column?: number;
  description?: string;
  signature?: string;
  visibility?: 'public' | 'private' | 'protected';
  namespace?: string;
}

export interface SymbolSearchRequest {
  query: string;
  type?: Symbol['type'];
  file?: string;
  caseSensitive?: boolean;
  wholeWord?: boolean;
}

// Main Interface
export interface IFilesystemService extends IBaseService {
  // Basic File Operations
  read(request: ReadRequest): Promise<FileContent>;
  write(request: WriteRequest): Promise<FileMetadata>;
  delete(path: string, recursive?: boolean): Promise<boolean>;
  exists(path: string): Promise<boolean>;
  
  // File Management
  copy(request: CopyRequest): Promise<FileMetadata>;
  move(request: MoveRequest): Promise<FileMetadata>;
  rename(oldPath: string, newPath: string): Promise<FileMetadata>;
  
  // Directory Operations
  list(request: ListRequest): Promise<FileEntry[]>;
  createDirectory(path: string, recursive?: boolean): Promise<FileMetadata>;
  getTree(path: string, maxDepth?: number): Promise<DirectoryTree>;
  
  // Metadata Operations
  getMetadata(path: string): Promise<FileMetadata>;
  setMetadata(path: string, metadata: Partial<FileMetadata>): Promise<FileMetadata>;
  getPermissions(path: string): Promise<string>;
  setPermissions(path: string, permissions: string | number): Promise<void>;
  
  // Search Operations
  search(request: SearchFileRequest): Promise<PaginatedResult<FileEntry>>;
  searchContent(path: string, pattern: string | RegExp, options?: SearchOptions): Promise<PaginatedResult<FileContent>>;
  
  // Symbol/Code Operations
  indexSymbols(path: string, recursive?: boolean): Promise<Symbol[]>;
  searchSymbols(request: SymbolSearchRequest): Promise<Symbol[]>;
  getSymbolDefinition(symbolName: string, file?: string): Promise<Symbol | null>;
  getSymbolReferences(symbol: Symbol): Promise<Symbol[]>;
  
  // Backup Operations
  backup(path: string, backupPath?: string): Promise<string>;
  restore(backupPath: string, targetPath: string): Promise<void>;
  listBackups(path?: string): Promise<string[]>;
  
  // Watch Operations
  watch(path: string, options?: Partial<FileWatcher>): Promise<string>;
  unwatch(watcherId: string): Promise<void>;
  getWatchers(): Promise<FileWatcher[]>;
  
  // Archive Operations
  compress(paths: string[], outputPath: string, format?: 'zip' | 'tar' | 'gzip'): Promise<FileMetadata>;
  decompress(archivePath: string, outputPath: string): Promise<FileEntry[]>;
  
  // Checksum/Hash Operations
  checksum(path: string, algorithm?: 'md5' | 'sha1' | 'sha256'): Promise<string>;
  verify(path: string, expectedChecksum: string, algorithm?: 'md5' | 'sha1' | 'sha256'): Promise<boolean>;
  
  // Statistics
  getStats(): Promise<FileSystemStats>;
  getSize(path: string, recursive?: boolean): Promise<number>;
  
  // Temporary Files
  createTempFile(prefix?: string, extension?: string): Promise<string>;
  createTempDirectory(prefix?: string): Promise<string>;
  cleanTemp(): Promise<void>;
  
  // Stream Operations (for large files)
  createReadStream(path: string, options?: any): Promise<any>;
  createWriteStream(path: string, options?: any): Promise<any>;
}

// Implementation helpers
export abstract class FilesystemServiceBase extends BaseService implements IFilesystemService {
  abstract read(request: ReadRequest): Promise<FileContent>;
  abstract write(request: WriteRequest): Promise<FileMetadata>;
  abstract delete(path: string, recursive?: boolean): Promise<boolean>;
  abstract exists(path: string): Promise<boolean>;
  abstract copy(request: CopyRequest): Promise<FileMetadata>;
  abstract move(request: MoveRequest): Promise<FileMetadata>;
  abstract rename(oldPath: string, newPath: string): Promise<FileMetadata>;
  abstract list(request: ListRequest): Promise<FileEntry[]>;
  abstract createDirectory(path: string, recursive?: boolean): Promise<FileMetadata>;
  abstract getTree(path: string, maxDepth?: number): Promise<DirectoryTree>;
  abstract getMetadata(path: string): Promise<FileMetadata>;
  abstract setMetadata(path: string, metadata: Partial<FileMetadata>): Promise<FileMetadata>;
  abstract getPermissions(path: string): Promise<string>;
  abstract setPermissions(path: string, permissions: string | number): Promise<void>;
  abstract search(request: SearchFileRequest): Promise<PaginatedResult<FileEntry>>;
  abstract searchContent(path: string, pattern: string | RegExp, options?: SearchOptions): Promise<PaginatedResult<FileContent>>;
  abstract indexSymbols(path: string, recursive?: boolean): Promise<Symbol[]>;
  abstract searchSymbols(request: SymbolSearchRequest): Promise<Symbol[]>;
  abstract getSymbolDefinition(symbolName: string, file?: string): Promise<Symbol | null>;
  abstract getSymbolReferences(symbol: Symbol): Promise<Symbol[]>;
  abstract backup(path: string, backupPath?: string): Promise<string>;
  abstract restore(backupPath: string, targetPath: string): Promise<void>;
  abstract listBackups(path?: string): Promise<string[]>;
  abstract watch(path: string, options?: Partial<FileWatcher>): Promise<string>;
  abstract unwatch(watcherId: string): Promise<void>;
  abstract getWatchers(): Promise<FileWatcher[]>;
  abstract compress(paths: string[], outputPath: string, format?: 'zip' | 'tar' | 'gzip'): Promise<FileMetadata>;
  abstract decompress(archivePath: string, outputPath: string): Promise<FileEntry[]>;
  abstract checksum(path: string, algorithm?: 'md5' | 'sha1' | 'sha256'): Promise<string>;
  abstract verify(path: string, expectedChecksum: string, algorithm?: 'md5' | 'sha1' | 'sha256'): Promise<boolean>;
  abstract getStats(): Promise<FileSystemStats>;
  abstract getSize(path: string, recursive?: boolean): Promise<number>;
  abstract createTempFile(prefix?: string, extension?: string): Promise<string>;
  abstract createTempDirectory(prefix?: string): Promise<string>;
  abstract cleanTemp(): Promise<void>;
  abstract createReadStream(path: string, options?: any): Promise<any>;
  abstract createWriteStream(path: string, options?: any): Promise<any>;
}