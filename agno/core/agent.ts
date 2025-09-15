/**
 * Base WorkspaceAgent class for Agno AI v2
 * Integrates Portkey LLM and MCP tools
 */

import { z } from 'zod';
import pino from 'pino';
import { EventEmitter } from 'eventemitter3';
import { PortkeyProvider } from '../providers/portkey';
import { MCPClientPool } from '../providers/mcp-client';
import fs from 'node:fs';
import yaml from 'yaml';
import { OrchestratorEvent } from './events';

// Initialize logger
const logger = pino({
  name: 'workspace-agent',
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

// Agent configuration schema
const AgentConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  model: z.string(),
  description: z.string().optional(),
  capabilities: z.array(z.string()),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(1).max(32000).default(4096),
  systemPrompt: z.string().optional(),
  tools: z.array(z.string()).default([]),
  memory: z.object({
    enabled: z.boolean().default(true),
    contextWindow: z.number().default(10),
    persistKey: z.string().optional()
  }).optional()
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;

// Message schema
const MessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'function']),
  content: z.string(),
  name: z.string().optional(),
  function_call: z.object({
    name: z.string(),
    arguments: z.string()
  }).optional()
});

export type Message = z.infer<typeof MessageSchema>;

// Tool definition
export interface Tool {
  name: string;
  description: string;
  parameters?: z.ZodSchema;
  execute: (params: any) => Promise<any>;
}

// Agent state
export interface AgentState {
  messages: Message[];
  context: Record<string, any>;
  memory: any[];
  tokensUsed: number;
  cost: number;
}

/**
 * Minimal workflow step definition parsed from YAML
 * - If tool is provided, executeTool(tool, input)
 * - Else, route through LLM using current agent model
 */
type Step = {
  id?: string;
  agent?: string;
  tool?: string;
  input?: any;
  parallel?: boolean;
  if?: { equals?: [string, string] };
};

/**
 * Base WorkspaceAgent class
 */
export class WorkspaceAgent extends EventEmitter {
  protected config: AgentConfig;
  protected state: AgentState;
  protected portkeyProvider: PortkeyProvider;
  protected mcpClient: MCPClientPool;
  protected tools: Map<string, Tool>;
  protected isInitialized: boolean = false;
  
  constructor(
    config: AgentConfig,
    portkeyProvider?: PortkeyProvider,
    mcpClient?: MCPClientPool
  ) {
    super();
    
    // Validate configuration
    this.config = AgentConfigSchema.parse(config);
    
    // Initialize providers
    this.portkeyProvider = portkeyProvider || new PortkeyProvider();
    this.mcpClient = mcpClient || new MCPClientPool();
    
    // Initialize state
    this.state = {
      messages: [],
      context: {},
      memory: [],
      tokensUsed: 0,
      cost: 0
    };
    
    // Initialize tools
    this.tools = new Map();
    this.registerDefaultTools();
    
    // Add system prompt if provided
    if (this.config.systemPrompt) {
      this.state.messages.push({
        role: 'system',
        content: this.config.systemPrompt
      });
    }
    
    logger.info({
      agentId: this.config.id,
      model: this.config.model,
      capabilities: this.config.capabilities
    }, 'WorkspaceAgent initialized');
  }
  
  /**
   * Initialize the agent (load memory, connect to services)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Wait for MCP servers to be healthy
      await this.mcpClient.waitForHealth(10000);
      
      // Load memory if enabled
      if (this.config.memory?.enabled && this.config.memory.persistKey) {
        await this.loadMemory();
      }
      
      this.isInitialized = true;
      this.emit('initialized', { agentId: this.config.id });
      
      logger.info({ agentId: this.config.id }, 'Agent initialized successfully');
    } catch (error) {
      logger.error({
        agentId: this.config.id,
        error: error instanceof Error ? error.message : String(error)
      }, 'Failed to initialize agent');
      throw error;
    }
  }
  
  /**
   * Register default MCP tools
   */
  protected registerDefaultTools(): void {
    // Memory tools
    this.registerTool({
      name: 'memory_store',
      description: 'Store information in memory',
      parameters: z.object({
        key: z.string(),
        value: z.any()
      }),
      execute: async (params) => {
        return this.mcpClient.memoryStore(params.key, params.value);
      }
    });
    
    this.registerTool({
      name: 'memory_retrieve',
      description: 'Retrieve information from memory',
      parameters: z.object({
        key: z.string()
      }),
      execute: async (params) => {
        return this.mcpClient.memoryRetrieve(params.key);
      }
    });
    
    this.registerTool({
      name: 'memory_search',
      description: 'Search memory for relevant information',
      parameters: z.object({
        query: z.string()
      }),
      execute: async (params) => {
        return this.mcpClient.memorySearch(params.query);
      }
    });
    
    // Filesystem tools
    this.registerTool({
      name: 'file_read',
      description: 'Read a file from the filesystem',
      parameters: z.object({
        path: z.string()
      }),
      execute: async (params) => {
        return this.mcpClient.filesystemRead(params.path);
      }
    });
    
    this.registerTool({
      name: 'file_write',
      description: 'Write content to a file',
      parameters: z.object({
        path: z.string(),
        content: z.string(),
        backup: z.boolean().optional()
      }),
      execute: async (params) => {
        return this.mcpClient.filesystemWrite(params.path, params.content, params.backup);
      }
    });
    
    this.registerTool({
      name: 'file_list',
      description: 'List files in a directory',
      parameters: z.object({
        path: z.string(),
        pattern: z.string().optional()
      }),
      execute: async (params) => {
        return this.mcpClient.filesystemList(params.path, params.pattern);
      }
    });
    
    // Git tools
    this.registerTool({
      name: 'git_status',
      description: 'Get git repository status',
      execute: async () => {
        return this.mcpClient.gitStatus();
      }
    });
    
    this.registerTool({
      name: 'git_diff',
      description: 'Get git diff',
      parameters: z.object({
        file: z.string().optional()
      }),
      execute: async (params) => {
        return this.mcpClient.gitDiff(params.file);
      }
    });
    
    this.registerTool({
      name: 'git_symbols',
      description: 'Search for code symbols',
      parameters: z.object({
        query: z.string()
      }),
      execute: async (params) => {
        return this.mcpClient.gitSymbols(params.query);
      }
    });
    
    // Vector tools
    this.registerTool({
      name: 'vector_search',
      description: 'Search for similar content using vector embeddings',
      parameters: z.object({
        query: z.string(),
        limit: z.number().optional()
      }),
      execute: async (params) => {
        return this.mcpClient.vectorSearch(params.query, params.limit);
      }
    });
    
    logger.debug({
      agentId: this.config.id,
      toolCount: this.tools.size
    }, 'Default tools registered');
  }
  
  /**
   * Register a custom tool
   */
  registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool);
    logger.debug({
      agentId: this.config.id,
      toolName: tool.name
    }, 'Tool registered');
  }
  
  /**
   * Execute a tool
   */
  async executeTool(toolName: string, params: any): Promise<any> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }
    
    // Validate parameters if schema is provided
    if (tool.parameters) {
      params = tool.parameters.parse(params);
    }
    
    logger.debug({
      agentId: this.config.id,
      toolName,
      params
    }, 'Executing tool');
    
    try {
      const result = await tool.execute(params);
      
      this.emit('tool-executed', {
        agentId: this.config.id,
        toolName,
        params,
        result
      });
      
      return result;
    } catch (error) {
      logger.error({
        agentId: this.config.id,
        toolName,
        error: error instanceof Error ? error.message : String(error)
      }, 'Tool execution failed');
      throw error;
    }
  }
  
  /**
   * Process a user message
   */
  async process(userMessage: string): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    // Add user message to history
    this.state.messages.push({
      role: 'user',
      content: userMessage
    });
    
    // Trim messages if needed
    this.trimMessages();
    
    logger.info({
      agentId: this.config.id,
      messageLength: userMessage.length
    }, 'Processing user message');
    
    try {
      // Get completion from LLM
      const response = await this.portkeyProvider.complete({
        messages: this.state.messages,
        model: this.config.model,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        metadata: {
          agentId: this.config.id,
          agentName: this.config.name
        }
      });
      
      // Extract assistant message safely and normalize content to string
      const assistantMessage = response.choices[0]?.message;
      const normalizedContent = typeof assistantMessage?.content === 'string'
        ? assistantMessage.content
        : Array.isArray(assistantMessage?.content)
          ? assistantMessage!.content.map((c: any) => (typeof c === 'string' ? c : c?.text ?? '')).join('')
          : '';

      // Add to message history
      this.state.messages.push({
        role: 'assistant',
        content: normalizedContent,
        function_call: assistantMessage?.function_call
      });
      
      // Update token usage
      if (response.usage?.total_tokens) {
        this.state.tokensUsed += response.usage.total_tokens;
      }
      
      // Handle function calls if present
      if (assistantMessage?.function_call) {
        const functionResult = await this.executeTool(
          assistantMessage.function_call.name,
          JSON.parse(assistantMessage.function_call.arguments)
        );
        
        // Add function result to messages
        this.state.messages.push({
          role: 'function',
          name: assistantMessage.function_call.name,
          content: JSON.stringify(functionResult)
        });
        
        // Get final response after function execution
        return this.process('Please provide the final response based on the function result.');
      }
      
      // Save memory if enabled
      if (this.config.memory?.enabled) {
        await this.saveMemory();
      }
      
      this.emit('message-processed', {
        agentId: this.config.id,
        userMessage,
        response: normalizedContent
      });
      
      return normalizedContent;
    } catch (error) {
      logger.error({
        agentId: this.config.id,
        error: error instanceof Error ? error.message : String(error)
      }, 'Failed to process message');
      throw error;
    }
  }
  
  /**
   * Process with streaming response
   */
  async *processStream(userMessage: string): AsyncGenerator<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    // Add user message to history
    this.state.messages.push({
      role: 'user',
      content: userMessage
    });
    
    // Trim messages if needed
    this.trimMessages();
    
    logger.info({
      agentId: this.config.id,
      messageLength: userMessage.length
    }, 'Processing streaming message');
    
    try {
      let fullResponse = '';
      
      // Get streaming completion from LLM
      const stream = this.portkeyProvider.streamComplete({
        messages: this.state.messages,
        model: this.config.model,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        metadata: {
          agentId: this.config.id,
          agentName: this.config.name
        }
      });
      
      for await (const chunk of stream) {
        const deltaContent = chunk.choices[0]?.delta?.content as any;
        const toAppend = typeof deltaContent === 'string'
          ? deltaContent
          : Array.isArray(deltaContent)
            ? deltaContent.map((c: any) => (typeof c === 'string' ? c : c?.text ?? '')).join('')
            : '';
        if (toAppend) {
          fullResponse += toAppend;
          yield toAppend;
        }
      }
      
      // Add complete response to message history
      this.state.messages.push({
        role: 'assistant',
        content: fullResponse
      });
      
      // Save memory if enabled
      if (this.config.memory?.enabled) {
        await this.saveMemory();
      }
      
      this.emit('stream-processed', {
        agentId: this.config.id,
        userMessage,
        response: fullResponse
      });
    } catch (error) {
      logger.error({
        agentId: this.config.id,
        error: error instanceof Error ? error.message : String(error)
      }, 'Failed to process streaming message');
      throw error;
    }
  }
  
  /**
   * Trim messages to stay within context window
   */
  protected trimMessages(): void {
    if (!this.config.memory?.contextWindow) return;
    
    const maxMessages = this.config.memory.contextWindow;
    
    // Keep system message and trim oldest messages
    if (this.state.messages.length > maxMessages) {
      const systemMessage = this.state.messages.find(m => m.role === 'system');
      const recentMessages = this.state.messages.slice(-maxMessages + (systemMessage ? 1 : 0));
      
      this.state.messages = systemMessage 
        ? [systemMessage, ...recentMessages.filter(m => m.role !== 'system')]
        : recentMessages;
    }
  }
  
  /**
   * Load memory from MCP server
   */
  protected async loadMemory(): Promise<void> {
    if (!this.config.memory?.persistKey) return;
    
    try {
      const memory = await this.mcpClient.memoryRetrieve(this.config.memory.persistKey);
      if (memory) {
        this.state.memory = memory.memory || [];
        this.state.context = memory.context || {};
        this.state.messages = memory.messages || this.state.messages;
        
        logger.info({
          agentId: this.config.id,
          memoryItems: this.state.memory.length
        }, 'Memory loaded');
      }
    } catch (error) {
      logger.warn({
        agentId: this.config.id,
        error: error instanceof Error ? error.message : String(error)
      }, 'Failed to load memory');
    }
  }
  
  /**
   * Save memory to MCP server
   */
  protected async saveMemory(): Promise<void> {
    if (!this.config.memory?.persistKey) return;
    
    try {
      await this.mcpClient.memoryStore(this.config.memory.persistKey, {
        memory: this.state.memory,
        context: this.state.context,
        messages: this.state.messages.slice(-10), // Save last 10 messages
        timestamp: new Date().toISOString()
      });
      
      logger.debug({
        agentId: this.config.id
      }, 'Memory saved');
    } catch (error) {
      logger.warn({
        agentId: this.config.id,
        error: error instanceof Error ? error.message : String(error)
      }, 'Failed to save memory');
    }
  }
  
  /**
   * Clear agent state
   */
  clearState(): void {
    this.state.messages = this.config.systemPrompt 
      ? [{ role: 'system', content: this.config.systemPrompt }]
      : [];
    this.state.context = {};
    this.state.memory = [];
    this.state.tokensUsed = 0;
    this.state.cost = 0;
    
    logger.info({ agentId: this.config.id }, 'Agent state cleared');
  }
  
  /**
   * Get agent statistics
   */
  getStats(): {
    messagesProcessed: number;
    tokensUsed: number;
    toolsExecuted: number;
    uptime: number;
  } {
    return {
      messagesProcessed: this.state.messages.filter(m => m.role === 'user').length,
      tokensUsed: this.state.tokensUsed,
      toolsExecuted: this.listenerCount('tool-executed'),
      uptime: process.uptime()
    };
  }
  
  /**
   * Execute a bounded set of tasks concurrently (promise pool)
   */
  protected async runPool<T>(tasks: Array<() => Promise<T>>, limit: number = 4): Promise<T[]> {
    const queue = tasks.slice();
    const inFlight = new Set<Promise<T>>();
    const results: T[] = [];

    const next = async (): Promise<void> => {
      if (!queue.length) return;
      // Start next task
      const task = queue.shift()!();
      // Keep the Promise<T> type by returning r in then; swallow errors to avoid breaking race()
      const p: Promise<T> = task
        .then((r) => {
          results.push(r);
          return r;
        })
        .catch(() => undefined as unknown as T);
      inFlight.add(p);
      // Remove from inFlight after settle, without affecting type
      p.finally(() => {
        inFlight.delete(p);
      });
      if (inFlight.size >= limit) {
        await Promise.race(inFlight);
      }
      return next();
    };

    await next();
    await Promise.allSettled([...inFlight]);
    return results;
  }

  /**
   * Run a single step, emitting standard events
   */
  protected async runSingleStep(step: Step, emit: (e: OrchestratorEvent) => void, ctx: Record<string, any>): Promise<any> {
    const stepName = step.tool || step.agent || 'step';
    const startedAt = Date.now();
    emit({ type: 'step_start', data: { stepId: step.id, name: stepName, agent: step.agent } });

    try {
      // If tool is specified, call tool; else use LLM completion with current agent model
      if (step.tool) {
        emit({ type: 'tool_call', data: { tool: step.tool, args: step.input } });
        const result = await this.executeTool(step.tool, step.input ?? {});
        const elapsed = Date.now() - startedAt;
        emit({ type: 'tool_result', data: { tool: step.tool, ok: true, ms: elapsed, output: result } });
        emit({ type: 'step_end', data: { stepId: step.id, status: 'ok', elapsed_ms: elapsed } });
        return result;
      } else {
        const userContent = typeof step.input?.prompt === 'string' ? step.input.prompt : 'Proceed with the requested action.';
        const messages = [{ role: 'user', content: userContent }];
        emit({ type: 'llm_request', data: { model: this.config.model, task: step.agent ?? 'general', tokens_in: userContent.length } });
        const resp = await this.portkeyProvider.complete({
          messages,
          model: this.config.model,
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens,
          metadata: { agentId: this.config.id, agentName: this.config.name, stepId: step.id }
        });
        const content = resp.choices?.[0]?.message?.content ?? '';
        const elapsed = Date.now() - startedAt;
        emit({ type: 'tool_result', data: { model: this.config.model, tokensOut: resp.usage?.completion_tokens ?? 0, latency: elapsed, costUSD: undefined } });
        emit({ type: 'step_end', data: { stepId: step.id, status: 'ok', elapsed_ms: elapsed } });
        return content;
      }
    } catch (err: any) {
      const elapsed = Date.now() - startedAt;
      emit({ type: 'error', data: { stepId: step.id, message: err?.message ?? String(err), retryable: false } });
      emit({ type: 'step_end', data: { stepId: step.id, status: 'failed', elapsed_ms: elapsed } });
      throw err;
    }
  }

  /**
   * Execute a config-defined workflow from YAML with serial steps and optional bounded parallel fan-out
   * This is opt-in; callers may continue to use process()/processStream() as before.
   */
  async runSwarm(
    workflowPath: string,
    emit: (e: OrchestratorEvent) => void,
    options?: {
      topology?: 'planner-worker' | 'manager-n' | 'critic';
      maxWorkers?: number;
      maxIterations?: number;
      thorough?: boolean;
    }
  ): Promise<void> {
    const topology = options?.topology ?? 'planner-worker';
    const maxWorkers = options?.maxWorkers ?? 4;

    // Load YAML
    const raw = fs.readFileSync(workflowPath, 'utf8');
    const cfg = yaml.parse(raw) || {};
    const wf = (cfg.workflows && (cfg.workflows[topology] || cfg.workflows)) || {};
    // Support two shapes: workflows: { name: { steps: [...] } } or a plain array under workflows[topology].steps
    const steps: Step[] = Array.isArray(wf.steps) ? wf.steps : (Array.isArray(wf) ? wf : []);

    // Emit open/thinking/hb for UI parity
    emit({ type: 'open', data: {} });
    emit({ type: 'thinking', data: { text: `Running workflow: ${topology}` } });
    emit({ type: 'hb', data: {} });

    const ctx: Record<string, any> = {};
    const serialSteps = steps.filter(s => !s.parallel);
    const parallelSteps = steps.filter(s => s.parallel);

    // Serial
    for (const step of serialSteps) {
      if (step.if?.equals) {
        const [k, v] = step.if.equals;
        if (ctx[k] !== v) continue;
      }
      try {
        const out = await this.runSingleStep(step, emit, ctx);
        if (step.id) ctx[step.id] = out;
      } catch {
        break; // stop on failure in serial path
      }
    }

    // Parallel (optional fan-out)
    if (topology === 'manager-n' && parallelSteps.length) {
      const tasks = parallelSteps.map((s) => () => this.runSingleStep(s, emit, ctx));
      const outputs = await this.runPool(tasks, maxWorkers);
      emit({ type: 'step_end', data: { stepId: 'merge', status: 'merged', outputs } });
    }

    emit({ type: 'done', data: {} });
    emit({ type: 'end', data: {} });
  }

  /**
   * Destroy the agent
   */
  destroy(): void {
    this.removeAllListeners();
    this.clearState();
    this.isInitialized = false;
    
    logger.info({ agentId: this.config.id }, 'Agent destroyed');
  }
}

// Export for testing
export default WorkspaceAgent;
