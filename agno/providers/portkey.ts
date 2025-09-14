/**
 * Portkey Gateway Provider for Agno AI
 * Handles virtual key routing and model management
 */

import { Portkey } from 'portkey-ai';
import pino from 'pino';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Initialize logger
const logger = pino({
  name: 'portkey-provider',
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

// Virtual key mappings
export const virtualKeyMap = {
  'anthropic-vk-b': process.env.ANTHROPIC_VK_B || '@anthropic-vk-b',
  'openai-vk-c': process.env.OPENAI_VK_C || '@openai-vk-c',
  'google-vk-d': process.env.GOOGLE_VK_D || '@google-vk-d',
  'grok-vk-e': process.env.GROK_VK_E || '@grok-vk-e',
  'deepseek-vk-f': process.env.DEEPSEEK_VK_F || '@deepseek-vk-f',
  'llama-vk-g': process.env.LLAMA_VK_G || '@llama-vk-g'
} as const;

// Model to virtual key routing
export const modelRouter = {
  // Anthropic models
  'claude-3-opus-20240229': 'anthropic-vk-b',
  'claude-3-sonnet-20240229': 'anthropic-vk-b',
  'claude-3-haiku-20240307': 'anthropic-vk-b',
  'claude-opus-4.1': 'anthropic-vk-b',
  
  // OpenAI models
  'gpt-4-turbo': 'openai-vk-c',
  'gpt-4': 'openai-vk-c',
  'gpt-3.5-turbo': 'openai-vk-c',
  'chatgpt-5': 'openai-vk-c',
  
  // Google models
  'gemini-pro': 'google-vk-d',
  'gemini-ultra': 'google-vk-d',
  'google-flash-2.5': 'google-vk-d',
  
  // Grok models
  'grok-2': 'grok-vk-e',
  'grok-5': 'grok-vk-e',
  'grok-code-fast-1': 'grok-vk-e',
  
  // DeepSeek models
  'deepseek-v3': 'deepseek-vk-f',
  'deepseek-coder': 'deepseek-vk-f',
  
  // Llama models
  'llama-scout-4': 'llama-vk-g',
  'llama-maverick-4': 'llama-vk-g'
} as const;

// Portkey configuration
export interface PortkeyConfig {
  apiKey: string;
  virtualKey?: string;
  model?: string;
  retryAttempts?: number;
  cacheEnabled?: boolean;
  cacheTTL?: number;
  tracingEnabled?: boolean;
  tags?: Record<string, string>;
}

// Initialize Portkey instance
export class PortkeyProvider {
  private portkey: Portkey;
  private config: PortkeyConfig;
  
  constructor(config?: Partial<PortkeyConfig>) {
    const apiKey = config?.apiKey || process.env.PORTKEY_API_KEY;
    
    if (!apiKey) {
      throw new Error('PORTKEY_API_KEY is required');
    }
    
    this.config = {
      apiKey,
      retryAttempts: config?.retryAttempts || 3,
      cacheEnabled: config?.cacheEnabled !== false,
      cacheTTL: config?.cacheTTL || 300,
      tracingEnabled: config?.tracingEnabled !== false,
      tags: config?.tags || {
        environment: process.env.NODE_ENV || 'development',
        repository: 'workspace-ui',
        framework: 'agno-v2'
      }
    };
    
    this.portkey = new Portkey({
      apiKey: this.config.apiKey,
      config: {
        retry: {
          attempts: this.config.retryAttempts,
          onFailedAttempt: (error: any) => {
            logger.warn({
              attemptNumber: error.attemptNumber,
              retriesLeft: error.retriesLeft,
              error: error.message
            }, 'Portkey retry attempt');
          }
        },
        cache: {
          enabled: this.config.cacheEnabled,
          ttl: this.config.cacheTTL
        }
      }
    });
    
    logger.info('Portkey provider initialized');
  }
  
  /**
   * Get virtual key for a model
   */
  getVirtualKey(model: string): string {
    const virtualKeyName = modelRouter[model as keyof typeof modelRouter];
    if (!virtualKeyName) {
      throw new Error(`No virtual key mapping for model: ${model}`);
    }
    
    const virtualKey = virtualKeyMap[virtualKeyName as keyof typeof virtualKeyMap];
    if (!virtualKey) {
      throw new Error(`Virtual key not configured: ${virtualKeyName}`);
    }
    
    return virtualKey;
  }
  
  /**
   * Create a completion with automatic model routing
   */
  async complete(params: {
    messages: Array<{ role: string; content: string }>;
    model: string;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
    metadata?: Record<string, any>;
  }) {
    const virtualKey = this.getVirtualKey(params.model);
    
    logger.debug({
      model: params.model,
      virtualKey: virtualKey.substring(0, 10) + '...',
      messagesCount: params.messages.length
    }, 'Creating completion');
    
    try {
      const startTime = Date.now();
      
      const response = await this.portkey.completions.create({
        messages: params.messages,
        model: params.model,
        virtualKey,
        temperature: params.temperature || 0.7,
        max_tokens: params.maxTokens || 4096,
        stream: params.stream || false,
        metadata: {
          ...params.metadata,
          ...this.config.tags,
          timestamp: new Date().toISOString()
        }
      });
      
      const duration = Date.now() - startTime;
      
      logger.info({
        model: params.model,
        duration,
        tokensUsed: response.usage?.total_tokens
      }, 'Completion successful');
      
      return response;
    } catch (error) {
      logger.error({
        model: params.model,
        error: error instanceof Error ? error.message : String(error)
      }, 'Completion failed');
      throw error;
    }
  }
  
  /**
   * Stream a completion with automatic model routing
   */
  async *streamComplete(params: {
    messages: Array<{ role: string; content: string }>;
    model: string;
    temperature?: number;
    maxTokens?: number;
    metadata?: Record<string, any>;
  }) {
    const virtualKey = this.getVirtualKey(params.model);
    
    logger.debug({
      model: params.model,
      virtualKey: virtualKey.substring(0, 10) + '...',
      messagesCount: params.messages.length
    }, 'Creating streaming completion');
    
    try {
      const stream = await this.portkey.completions.create({
        messages: params.messages,
        model: params.model,
        virtualKey,
        temperature: params.temperature || 0.7,
        max_tokens: params.maxTokens || 4096,
        stream: true,
        metadata: {
          ...params.metadata,
          ...this.config.tags,
          timestamp: new Date().toISOString()
        }
      });
      
      for await (const chunk of stream) {
        yield chunk;
      }
      
      logger.info({
        model: params.model
      }, 'Streaming completion successful');
    } catch (error) {
      logger.error({
        model: params.model,
        error: error instanceof Error ? error.message : String(error)
      }, 'Streaming completion failed');
      throw error;
    }
  }
  
  /**
   * Cost-optimized completion with fallback
   */
  async completeWithFallback(params: {
    messages: Array<{ role: string; content: string }>;
    primaryModel: string;
    fallbackModel: string;
    maxCost?: number;
    maxLatency?: number;
    temperature?: number;
    maxTokens?: number;
  }) {
    const startTime = Date.now();
    
    try {
      // Try primary model first
      const response = await this.complete({
        messages: params.messages,
        model: params.primaryModel,
        temperature: params.temperature,
        maxTokens: params.maxTokens
      });
      
      const latency = Date.now() - startTime;
      
      // Check if we should fallback based on latency
      if (params.maxLatency && latency > params.maxLatency) {
        logger.warn({
          primaryModel: params.primaryModel,
          latency,
          maxLatency: params.maxLatency
        }, 'Primary model exceeded latency threshold');
      }
      
      return response;
    } catch (error) {
      logger.warn({
        primaryModel: params.primaryModel,
        fallbackModel: params.fallbackModel,
        error: error instanceof Error ? error.message : String(error)
      }, 'Primary model failed, trying fallback');
      
      // Try fallback model
      return await this.complete({
        messages: params.messages,
        model: params.fallbackModel,
        temperature: params.temperature,
        maxTokens: params.maxTokens
      });
    }
  }
  
  /**
   * Get analytics and metrics
   */
  async getAnalytics(timeRange?: { start: Date; end: Date }) {
    // This would integrate with Portkey's analytics API
    logger.info({ timeRange }, 'Fetching analytics');
    
    return {
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      modelDistribution: {},
      averageLatency: 0,
      errorRate: 0
    };
  }
  
  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Test with a simple completion
      await this.complete({
        messages: [{ role: 'user', content: 'ping' }],
        model: 'gpt-3.5-turbo',
        maxTokens: 5
      });
      return true;
    } catch (error) {
      logger.error({ error }, 'Health check failed');
      return false;
    }
  }
}

// Export singleton instance
export const portkeyProvider = new PortkeyProvider();

// Export for testing
export default PortkeyProvider;