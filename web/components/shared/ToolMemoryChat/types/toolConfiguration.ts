export interface ToolConfiguration {
  toolId: string;
  elevenLabsToolId?: string;
  tool_config: ToolConfig;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ToolConfig {
  type: 'webhook' | 'client' | 'system';
  name: string;
  description: string;

  // Webhook-specific fields
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  request_body_schema?: JSONSchema;
  timeout_ms?: number;

  // Client-specific fields
  client_tool_params?: Record<string, any>;

  // System-specific fields
  system_tool_id?: string;
}

export interface JSONSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  description?: string;
  items?: JSONSchemaProperty;
}

export interface JSONSchemaProperty {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  description?: string;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  items?: JSONSchemaProperty;
  enum?: any[];
  default?: any;
}

export interface ToolConfigDraftUpdate {
  proposedToolConfig: ToolConfig;
  understanding: {
    summary: string;
    toolPurpose: string;
    endpoint: string;
    parameters: string[];
    confidence: number;
  };
  clarifyingQuestion?: string;
  suggestions?: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: {
    tokens?: number;
    model?: string;
    toolCalls?: any[];
  };
}

export interface ChatSession {
  sessionId: string;
  toolId: string;
  agentId: string;
  tenantId: string;
  messages: ChatMessage[];
  messageCount: number;
  createdAt: string;
  lastMessageAt: string;
  isActive: boolean;
  currentToolConfig?: ToolConfigDraftUpdate;
}
