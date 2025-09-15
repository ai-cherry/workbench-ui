/**
 * Git Service Contract
 * Interface for the Git MCP server (Version Control Operations)
 */

import { BaseService, IBaseService, SearchOptions, PaginatedResult } from './base.service';

// Git Types
export interface GitRepository {
  path: string;
  name: string;
  remote?: string;
  branch: string;
  status: GitStatus;
  lastCommit?: GitCommit;
  isDirty: boolean;
  ahead: number;
  behind: number;
}

export interface GitStatus {
  branch: string;
  upstream?: string;
  ahead: number;
  behind: number;
  staged: GitFileStatus[];
  unstaged: GitFileStatus[];
  untracked: string[];
  conflicted: string[];
  clean: boolean;
}

export interface GitFileStatus {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied';
  oldPath?: string; // for renamed files
}

export interface GitCommit {
  hash: string;
  shortHash: string;
  author: GitAuthor;
  committer: GitAuthor;
  message: string;
  date: string;
  parents: string[];
  files?: GitFileChange[];
  stats?: GitStats;
}

export interface GitAuthor {
  name: string;
  email: string;
  date: string;
}

export interface GitFileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  oldPath?: string;
}

export interface GitStats {
  additions: number;
  deletions: number;
  files: number;
}

export interface GitBranch {
  name: string;
  current: boolean;
  remote?: string;
  upstream?: string;
  lastCommit: GitCommit;
  ahead: number;
  behind: number;
}

export interface GitTag {
  name: string;
  hash: string;
  tagger?: GitAuthor;
  message?: string;
  type: 'lightweight' | 'annotated';
}

export interface GitRemote {
  name: string;
  fetchUrl: string;
  pushUrl: string;
  branches: string[];
}

export interface GitDiff {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  chunks: GitDiffChunk[];
  oldPath?: string;
}

export interface GitDiffChunk {
  header: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: GitDiffLine[];
}

export interface GitDiffLine {
  type: 'add' | 'delete' | 'context';
  content: string;
  oldLine?: number;
  newLine?: number;
}

export interface GitBlame {
  path: string;
  lines: GitBlameLine[];
}

export interface GitBlameLine {
  line: number;
  content: string;
  commit: GitCommit;
}

export interface GitStash {
  index: number;
  message: string;
  branch: string;
  hash: string;
  date: string;
}

export interface GitConfig {
  key: string;
  value: string;
  scope: 'local' | 'global' | 'system';
}

export interface GitMergeConflict {
  path: string;
  content: string;
  ours: string;
  theirs: string;
  resolved: boolean;
}

// Request/Response Types
export interface CloneRequest {
  url: string;
  path?: string;
  branch?: string;
  depth?: number;
  recursive?: boolean;
  auth?: GitAuth;
}

export interface GitAuth {
  type: 'ssh' | 'https' | 'token';
  username?: string;
  password?: string;
  token?: string;
  sshKey?: string;
}

export interface CommitRequest {
  message: string;
  files?: string[];
  author?: GitAuthor;
  amend?: boolean;
  allowEmpty?: boolean;
}

export interface PushRequest {
  remote?: string;
  branch?: string;
  force?: boolean;
  tags?: boolean;
  auth?: GitAuth;
}

export interface PullRequest {
  remote?: string;
  branch?: string;
  rebase?: boolean;
  auth?: GitAuth;
}

export interface MergeRequest {
  branch: string;
  message?: string;
  strategy?: 'recursive' | 'octopus' | 'ours' | 'subtree';
  squash?: boolean;
  noCommit?: boolean;
}

export interface CherryPickRequest {
  commits: string[];
  mainline?: number;
  noCommit?: boolean;
}

export interface RebaseRequest {
  onto: string;
  branch?: string;
  interactive?: boolean;
  autosquash?: boolean;
  preserveMerges?: boolean;
}

// Main Interface
export interface IGitService extends IBaseService {
  // Repository Operations
  clone(request: CloneRequest): Promise<GitRepository>;
  init(path: string, bare?: boolean): Promise<GitRepository>;
  open(path: string): Promise<GitRepository>;
  getRepositoryStatus(): Promise<GitStatus>;
  
  // Staging & Committing
  add(files: string | string[]): Promise<void>;
  reset(files?: string | string[], mode?: 'soft' | 'mixed' | 'hard'): Promise<void>;
  commit(request: CommitRequest): Promise<GitCommit>;
  amend(message?: string): Promise<GitCommit>;
  
  // Branching
  getBranches(remote?: boolean): Promise<GitBranch[]>;
  getCurrentBranch(): Promise<GitBranch>;
  createBranch(name: string, startPoint?: string): Promise<GitBranch>;
  checkoutBranch(name: string, create?: boolean): Promise<void>;
  deleteBranch(name: string, force?: boolean): Promise<void>;
  renameBranch(oldName: string, newName: string): Promise<void>;
  
  // Merging & Rebasing
  merge(request: MergeRequest): Promise<GitCommit | null>;
  rebase(request: RebaseRequest): Promise<void>;
  cherryPick(request: CherryPickRequest): Promise<GitCommit[]>;
  abort(operation: 'merge' | 'rebase' | 'cherry-pick'): Promise<void>;
  continue(operation: 'merge' | 'rebase' | 'cherry-pick'): Promise<void>;
  
  // Remote Operations
  getRemotes(): Promise<GitRemote[]>;
  addRemote(name: string, url: string): Promise<GitRemote>;
  removeRemote(name: string): Promise<void>;
  fetch(remote?: string, branch?: string, auth?: GitAuth): Promise<void>;
  pull(request?: PullRequest): Promise<void>;
  push(request?: PushRequest): Promise<void>;
  
  // History & Logs
  getLog(options?: {
    branch?: string;
    limit?: number;
    skip?: number;
    since?: string;
    until?: string;
    author?: string;
    grep?: string;
    files?: string[];
  }): Promise<GitCommit[]>;
  getCommit(hash: string): Promise<GitCommit>;
  getDiff(from?: string, to?: string, files?: string[]): Promise<GitDiff[]>;
  getFileDiff(path: string, from?: string, to?: string): Promise<GitDiff>;
  
  // Tags
  getTags(): Promise<GitTag[]>;
  createTag(name: string, message?: string, hash?: string): Promise<GitTag>;
  deleteTag(name: string): Promise<void>;
  pushTags(remote?: string, auth?: GitAuth): Promise<void>;
  
  // Stash
  stash(message?: string, includeUntracked?: boolean): Promise<GitStash>;
  getStashes(): Promise<GitStash[]>;
  applyStash(index?: number, pop?: boolean): Promise<void>;
  dropStash(index?: number): Promise<void>;
  
  // File Operations
  blame(path: string): Promise<GitBlame>;
  show(path: string, revision?: string): Promise<string>;
  ls(path?: string, revision?: string): Promise<string[]>;
  mv(from: string, to: string): Promise<void>;
  rm(files: string | string[], cached?: boolean): Promise<void>;
  
  // Configuration
  getGitConfig(key?: string, scope?: 'local' | 'global' | 'system'): Promise<GitConfig | GitConfig[]>;
  setGitConfig(key: string, value: string, scope?: 'local' | 'global'): Promise<void>;
  unsetGitConfig(key: string, scope?: 'local' | 'global'): Promise<void>;
  
  // Conflict Resolution
  getConflicts(): Promise<GitMergeConflict[]>;
  resolveConflict(path: string, resolution: 'ours' | 'theirs' | 'manual', content?: string): Promise<void>;
  
  // Advanced Operations
  bisect(command: 'start' | 'bad' | 'good' | 'skip' | 'reset', commit?: string): Promise<void>;
  reflog(options?: { limit?: number; branch?: string }): Promise<GitCommit[]>;
  gc(aggressive?: boolean): Promise<void>;
  fsck(): Promise<{ errors: string[]; warnings: string[] }>;
  
  // Utilities
  revParse(revision: string): Promise<string>;
  isRepository(path: string): Promise<boolean>;
  getIgnored(): Promise<string[]>;
  checkIgnore(paths: string[]): Promise<string[]>;
}

// Implementation helpers
export abstract class GitServiceBase extends BaseService implements IGitService {
  abstract clone(request: CloneRequest): Promise<GitRepository>;
  abstract init(path: string, bare?: boolean): Promise<GitRepository>;
  abstract open(path: string): Promise<GitRepository>;
  abstract getRepositoryStatus(): Promise<GitStatus>;
  abstract add(files: string | string[]): Promise<void>;
  abstract reset(files?: string | string[], mode?: 'soft' | 'mixed' | 'hard'): Promise<void>;
  abstract commit(request: CommitRequest): Promise<GitCommit>;
  abstract amend(message?: string): Promise<GitCommit>;
  abstract getBranches(remote?: boolean): Promise<GitBranch[]>;
  abstract getCurrentBranch(): Promise<GitBranch>;
  abstract createBranch(name: string, startPoint?: string): Promise<GitBranch>;
  abstract checkoutBranch(name: string, create?: boolean): Promise<void>;
  abstract deleteBranch(name: string, force?: boolean): Promise<void>;
  abstract renameBranch(oldName: string, newName: string): Promise<void>;
  abstract merge(request: MergeRequest): Promise<GitCommit | null>;
  abstract rebase(request: RebaseRequest): Promise<void>;
  abstract cherryPick(request: CherryPickRequest): Promise<GitCommit[]>;
  abstract abort(operation: 'merge' | 'rebase' | 'cherry-pick'): Promise<void>;
  abstract continue(operation: 'merge' | 'rebase' | 'cherry-pick'): Promise<void>;
  abstract getRemotes(): Promise<GitRemote[]>;
  abstract addRemote(name: string, url: string): Promise<GitRemote>;
  abstract removeRemote(name: string): Promise<void>;
  abstract fetch(remote?: string, branch?: string, auth?: GitAuth): Promise<void>;
  abstract pull(request?: PullRequest): Promise<void>;
  abstract push(request?: PushRequest): Promise<void>;
  abstract getLog(options?: {
    branch?: string;
    limit?: number;
    skip?: number;
    since?: string;
    until?: string;
    author?: string;
    grep?: string;
    files?: string[];
  }): Promise<GitCommit[]>;
  abstract getCommit(hash: string): Promise<GitCommit>;
  abstract getDiff(from?: string, to?: string, files?: string[]): Promise<GitDiff[]>;
  abstract getFileDiff(path: string, from?: string, to?: string): Promise<GitDiff>;
  abstract getTags(): Promise<GitTag[]>;
  abstract createTag(name: string, message?: string, hash?: string): Promise<GitTag>;
  abstract deleteTag(name: string): Promise<void>;
  abstract pushTags(remote?: string, auth?: GitAuth): Promise<void>;
  abstract stash(message?: string, includeUntracked?: boolean): Promise<GitStash>;
  abstract getStashes(): Promise<GitStash[]>;
  abstract applyStash(index?: number, pop?: boolean): Promise<void>;
  abstract dropStash(index?: number): Promise<void>;
  abstract blame(path: string): Promise<GitBlame>;
  abstract show(path: string, revision?: string): Promise<string>;
  abstract ls(path?: string, revision?: string): Promise<string[]>;
  abstract mv(from: string, to: string): Promise<void>;
  abstract rm(files: string | string[], cached?: boolean): Promise<void>;
  abstract getGitConfig(key?: string, scope?: 'local' | 'global' | 'system'): Promise<GitConfig | GitConfig[]>;
  abstract setGitConfig(key: string, value: string, scope?: 'local' | 'global'): Promise<void>;
  abstract unsetGitConfig(key: string, scope?: 'local' | 'global'): Promise<void>;
  abstract getConflicts(): Promise<GitMergeConflict[]>;
  abstract resolveConflict(path: string, resolution: 'ours' | 'theirs' | 'manual', content?: string): Promise<void>;
  abstract bisect(command: 'start' | 'bad' | 'good' | 'skip' | 'reset', commit?: string): Promise<void>;
  abstract reflog(options?: { limit?: number; branch?: string }): Promise<GitCommit[]>;
  abstract gc(aggressive?: boolean): Promise<void>;
  abstract fsck(): Promise<{ errors: string[]; warnings: string[] }>;
  abstract revParse(revision: string): Promise<string>;
  abstract isRepository(path: string): Promise<boolean>;
  abstract getIgnored(): Promise<string[]>;
  abstract checkIgnore(paths: string[]): Promise<string[]>;
}