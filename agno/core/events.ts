/**
 * Shared event types for orchestrator, backend SSE, and UI
 * Backward-compatible with existing SSE events emitted by backend/app/main.py
 */

export type EventType =
  | 'open'
  | 'thinking'
  | 'hb'
  | 'step_start'
  | 'llm_request'
  | 'tool_start'
  | 'tool_call'
  | 'tool_result'
  | 'step_end'
  | 'error'
  | 'done'
  | 'end';

// Step lifecycle
export interface StepStartData {
  // Generic workflow identity
  stepId?: string;
  name?: string;
  // Aligned with backend workflow executor (index/agent/action)
  index?: number;
  agent?: string;
  action?: string;
}

export interface StepEndData {
  stepId?: string;
  index?: number;
  status?: 'ok' | 'failed' | 'merged';
  elapsed_ms?: number;
  outputs?: any; // For merge results in parallel fan-out
}

// LLM request/metrics
export interface LlmRequestData {
  model: string;
  task?: string; // e.g., 'planning', 'coding', 'search', 'general'
  tokens_in?: number;
}

export interface LlmResultData {
  model: string;
  tokensIn?: number;
  tokensOut?: number;
  latency?: number;
  costUSD?: number;
}

// Tooling
export interface ToolCallData {
  tool: string; // e.g., 'mcp:github', 'memory_store'
  args?: any;
  endpoint?: string; // for HTTP-like calls
}

export interface ToolResultData {
  tool?: string;
  ok?: boolean;
  ms?: number;
  output?: any;
  // Optional LLM result metrics when tool returns model output
  model?: string;
  tokensIn?: number;
  tokensOut?: number;
  latency?: number;
  costUSD?: number;
}

// Errors
export interface ErrorData {
  message?: string;
  stepId?: string;
  index?: number;
  retryable?: boolean;
  statusCode?: number;
  details?: any;
}

// Heartbeat/done payloads (kept as empty objects for compatibility)
export interface HeartbeatData {}
export interface DoneData {}
export interface OpenData {}
export interface ThinkingData { text?: string }

// Union payload
export type EventPayload =
  | StepStartData
  | StepEndData
  | LlmRequestData
  | LlmResultData
  | ToolCallData
  | ToolResultData
  | ErrorData
  | HeartbeatData
  | DoneData
  | OpenData
  | ThinkingData
  | Record<string, any>;

export interface OrchestratorEvent {
  type: EventType;
  data?: EventPayload;
}

// Type guards (optional helpers)
export function isStepStart(e: OrchestratorEvent): e is OrchestratorEvent & { data: StepStartData } {
  return e.type === 'step_start';
}
export function isStepEnd(e: OrchestratorEvent): e is OrchestratorEvent & { data: StepEndData } {
  return e.type === 'step_end';
}
export function isToolCall(e: OrchestratorEvent): e is OrchestratorEvent & { data: ToolCallData } {
  return e.type === 'tool_call' || e.type === 'tool_start';
}
export function isToolResult(e: OrchestratorEvent): e is OrchestratorEvent & { data: ToolResultData } {
  return e.type === 'tool_result';
}
export function isLlmRequest(e: OrchestratorEvent): e is OrchestratorEvent & { data: LlmRequestData } {
  return e.type === 'llm_request';
}
export function isError(e: OrchestratorEvent): e is OrchestratorEvent & { data: ErrorData } {
  return e.type === 'error';
}
