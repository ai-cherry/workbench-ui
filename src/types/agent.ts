import { z } from 'zod';

// Agent status enum
export enum AgentStatus {
  IDLE = 'idle',
  INITIALIZING = 'initializing',
  READY = 'ready',
  PROCESSING = 'processing',
  ERROR = 'error',
  STOPPED = 'stopped'
}

// Agent capability enum
export enum AgentCapability {
  FEATURE_PLANNING = 'feature_planning',
  ARCHITECTURE_DESIGN = 'architecture_design',
  CODE_GENERATION = 'code_generation',
  CODE_REVIEW = 'code_review',
  BUG_FIXING = 'bug_fixing',
  REFACTORING = 'refactoring',
  TEST_GENERATION = 'test_generation',
  TEST_EXECUTION = 'test_execution',
  SECURITY_AUDIT = 'security_audit',
  PERFORMANCE_ANALYSIS = 'performance_analysis',
  COVERAGE_ANALYSIS = 'coverage_analysis'
}

// Agent configuration schema
export const AgentConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  model: z.string(),
  description: z.string().optional(),
  capabilities: z.array(z.nativeEnum(AgentCapability)),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(1).max(32000).default(4096),
  systemPrompt: z.string().optional(),
  mcp_access: z.array(z.string()).default([]),
  memory: z.object({
    enabled: z.boolean().default(true),
    contextWindow: z.number().default(10),
    persistKey: z.string().optional()
  }).optional()
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;

// Agent runtime information
export interface AgentInfo extends AgentConfig {
  status: AgentStatus;
  lastActivity?: Date;
  messagesProcessed: number;
  tokensUsed: number;
  errors: number;
  uptime: number;
  currentTask?: string;
}

// Agent message
export interface AgentMessage {
  id: string;
  agentId: string;
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  functionCall?: {
    name: string;
    arguments: string;
  };
}

// Agent event
export interface AgentEvent {
  id: string;
  agentId: string;
  type: 'started' | 'stopped' | 'error' | 'message' | 'tool_executed' | 'status_changed';
  timestamp: Date;
  data: any;
}

// Agent statistics
export interface AgentStats {
  agentId: string;
  messagesProcessed: number;
  tokensUsed: number;
  toolsExecuted: number;
  averageResponseTime: number;
  errorRate: number;
  uptime: number;
  cost: number;
}

// Workflow definition
export interface WorkflowStep {
  id: string;
  agent: string;
  action: string;
  params?: Record<string, any>;
  dependsOn?: string[];
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  variables?: Record<string, any>;
  triggers?: string[];
}

// Workflow execution
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  currentStep?: string;
  results: Record<string, any>;
  errors?: string[];
}

// Pre-configured agents
export const AGENT_PRESETS: Record<string, Partial<AgentConfig>> = {
  architect: {
    name: 'Workspace Architect',
    model: 'claude-opus-4.1',
    description: 'Plans and designs workspace features',
    capabilities: [
      AgentCapability.FEATURE_PLANNING,
      AgentCapability.ARCHITECTURE_DESIGN,
      AgentCapability.CODE_REVIEW
    ],
    mcp_access: ['memory', 'filesystem', 'git'],
    temperature: 0.2,
    maxTokens: 4096
  },
  coder: {
    name: 'Implementation Agent',
    model: 'grok-5',
    description: 'Implements features and fixes bugs',
    capabilities: [
      AgentCapability.CODE_GENERATION,
      AgentCapability.BUG_FIXING,
      AgentCapability.REFACTORING
    ],
    mcp_access: ['filesystem', 'git', 'vector'],
    temperature: 0.3,
    maxTokens: 8192
  },
  reviewer: {
    name: 'Code Reviewer',
    model: 'deepseek-v3',
    description: 'Reviews code for quality and security',
    capabilities: [
      AgentCapability.CODE_REVIEW,
      AgentCapability.SECURITY_AUDIT,
      AgentCapability.PERFORMANCE_ANALYSIS
    ],
    mcp_access: ['filesystem', 'git'],
    temperature: 0.1,
    maxTokens: 4096
  },
  tester: {
    name: 'Test Engineer',
    model: 'llama-scout-4',
    description: 'Creates and runs tests',
    capabilities: [
      AgentCapability.TEST_GENERATION,
      AgentCapability.TEST_EXECUTION,
      AgentCapability.COVERAGE_ANALYSIS
    ],
    mcp_access: ['filesystem', 'git', 'memory'],
    temperature: 0.2,
    maxTokens: 4096
  }
};