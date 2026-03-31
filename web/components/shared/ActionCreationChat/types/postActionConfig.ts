// Post-Action Configuration Types

export interface PostActionWebhookConfig {
  enabled: boolean;
  url: string;
  method: 'POST' | 'GET' | 'PUT';
  headers?: Record<string, string>;
  authentication?: {
    type: 'none' | 'basic' | 'bearer' | 'api_key';
    credentials?: {
      username?: string;
      password?: string;
      token?: string;
      apiKey?: string;
      apiKeyHeader?: string;
    };
  };
}

export interface PostActionPayloadMapping {
  // What data to include in the webhook
  includeAgentResponse: boolean;
  includeUserInput: boolean;
  includeTimestamp: boolean;
  includeSessionId: boolean;
  includeAgentId: boolean;
  includeActionId: boolean;
  includeCustomData: boolean;
  customDataFields?: Record<string, any>;
}

export interface PostActionConfiguration {
  // Webhook configuration
  webhook: PostActionWebhookConfig;
  
  // Data mapping
  payloadMapping: PostActionPayloadMapping;
  
  // Response handling
  responseHandling: {
    expectResponse: boolean;
    timeoutMs: number;
    retryOnFailure: boolean;
    maxRetries: number;
  };
  
  // Conditional triggers
  conditions?: {
    onlyOnSuccess?: boolean;
    onlyOnKeywords?: string[];
    onlyOnIntentMatch?: string[];
  };
}

// Example payload that would be sent
export interface PostActionWebhookPayload {
  timestamp: string;
  sessionId?: string;
  agentId?: string;
  actionId?: string;
  interaction: {
    userInput?: string;
    agentResponse?: string;
    duration?: number;
  };
  customData?: Record<string, any>;
}