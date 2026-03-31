import { CustomTool, CustomToolRepository } from '../repositories/customToolRepository';

export interface CustomToolRequest {
  name: string;
  description: string;
  webhookUrl: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  pathParams?: Record<string, any>;
  queryParams?: Record<string, any>;
  requestBody?: Record<string, any>;
  requestHeaders?: Record<string, string>;
  responseTimeout?: number;
  disableInterruptions?: boolean;
  forcePreToolSpeech?: boolean;
}

export interface ElevenLabsToolConfig {
  tool_config: {
    type: 'webhook';
    name: string;
    description: string;
    response_timeout_secs?: number;
    disable_interruptions?: boolean;
    force_pre_tool_speech?: boolean;
    api_schema: {
      url: string;
      method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      path_params_schema?: Record<string, any>;
      query_params_schema?: {
        properties: Record<string, any>;
        required?: string[];
      };
      request_body_schema?: {
        type: 'object';
        required?: string[];
        description?: string;
        properties: Record<string, any>;
      };
      request_headers?: Record<string, string>;
    };
  };
}

export interface ElevenLabsToolResponse {
  id: string;
  tool_config: any;
  access_info: {
    is_creator: boolean;
    creator_name: string;
    creator_email: string;
    role: string;
  };
  usage_stats: {
    avg_latency_secs: number;
    total_calls: number;
  };
}

export class CustomToolService {
  // Get all custom tools for tenant
  static async getCustomTools(tenantId: string): Promise<CustomTool[]> {
    return await CustomToolRepository.getCustomTools(tenantId);
  }

  // Get specific custom tool
  static async getCustomTool(tenantId: string, toolId: string): Promise<CustomTool | null> {
    return await CustomToolRepository.getCustomTool(tenantId, toolId);
  }

  // Create a new custom tool
  static async createCustomTool(
    tenantId: string,
    userId: string,
    toolRequest: CustomToolRequest,
    elevenlabsService: any // Will inject the ElevenLabs service
  ): Promise<CustomTool> {
    // Generate tool ID
    const toolId = CustomToolRepository.generateToolId();

    // Convert to ElevenLabs format
    const elevenlabsConfig = this.convertToElevenLabsToolConfig(toolRequest);

    // Create tool in ElevenLabs first
    const elevenlabsResponse = await elevenlabsService.createCustomTool(elevenlabsConfig);

    // Create tool data for Firestore
    const toolData: CustomTool = {
      id: toolId,
      tenantId,
      elevenlabsToolId: elevenlabsResponse.id,
      name: toolRequest.name,
      description: toolRequest.description,
      webhookUrl: toolRequest.webhookUrl,
      method: toolRequest.method,
      pathParams: toolRequest.pathParams,
      queryParams: toolRequest.queryParams,
      requestBody: toolRequest.requestBody,
      requestHeaders: toolRequest.requestHeaders,
      responseTimeout: toolRequest.responseTimeout || 20,
      disableInterruptions: toolRequest.disableInterruptions || false,
      forcePreToolSpeech: toolRequest.forcePreToolSpeech || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: userId
    };

    // Save to Firestore
    await CustomToolRepository.createCustomTool(tenantId, toolData);

    return toolData;
  }

  // Update custom tool
  static async updateCustomTool(
    tenantId: string,
    toolId: string,
    userId: string,
    updateData: Partial<CustomToolRequest>,
    elevenlabsService: any
  ): Promise<CustomTool | null> {
    const currentTool = await CustomToolRepository.getCustomTool(tenantId, toolId);
    
    if (!currentTool) {
      return null;
    }

    // Update ElevenLabs tool if there are changes
    if (Object.keys(updateData).length > 0) {
      const updatedToolRequest = {
        name: updateData.name || currentTool.name,
        description: updateData.description || currentTool.description,
        webhookUrl: updateData.webhookUrl || currentTool.webhookUrl,
        method: updateData.method || currentTool.method,
        pathParams: updateData.pathParams || currentTool.pathParams,
        queryParams: updateData.queryParams || currentTool.queryParams,
        requestBody: updateData.requestBody || currentTool.requestBody,
        requestHeaders: updateData.requestHeaders || currentTool.requestHeaders,
        responseTimeout: updateData.responseTimeout || currentTool.responseTimeout,
        disableInterruptions: updateData.disableInterruptions !== undefined ? updateData.disableInterruptions : currentTool.disableInterruptions,
        forcePreToolSpeech: updateData.forcePreToolSpeech !== undefined ? updateData.forcePreToolSpeech : currentTool.forcePreToolSpeech
      };

      const elevenlabsConfig = this.convertToElevenLabsToolConfig(updatedToolRequest);
      await elevenlabsService.updateCustomTool(currentTool.elevenlabsToolId, elevenlabsConfig);
    }

    // Update in Firestore
    await CustomToolRepository.updateCustomTool(tenantId, toolId, {
      ...updateData,
      updatedAt: new Date().toISOString()
    });

    // Return updated tool
    return await CustomToolRepository.getCustomTool(tenantId, toolId);
  }

  // Delete custom tool
  static async deleteCustomTool(
    tenantId: string,
    toolId: string,
    elevenlabsService: any
  ): Promise<boolean> {
    const tool = await CustomToolRepository.getCustomTool(tenantId, toolId);
    
    if (!tool) {
      return false;
    }

    // Delete from ElevenLabs
    try {
      await elevenlabsService.deleteCustomTool(tool.elevenlabsToolId);
    } catch (elevenlabsError) {
      console.error('ElevenLabs tool deletion failed:', elevenlabsError);
      // Continue with Firestore deletion
    }

    // Delete from Firestore
    await CustomToolRepository.deleteCustomTool(tenantId, toolId);
    return true;
  }

  // Convert our tool request to ElevenLabs format
  private static convertToElevenLabsToolConfig(toolRequest: CustomToolRequest): ElevenLabsToolConfig {
    const config: ElevenLabsToolConfig = {
      tool_config: {
        type: 'webhook',
        name: toolRequest.name,
        description: toolRequest.description,
        response_timeout_secs: toolRequest.responseTimeout || 20,
        disable_interruptions: toolRequest.disableInterruptions || false,
        force_pre_tool_speech: toolRequest.forcePreToolSpeech || false,
        api_schema: {
          url: toolRequest.webhookUrl,
          method: toolRequest.method
        }
      }
    };

    // Add optional schema properties if they exist
    if (toolRequest.pathParams && Object.keys(toolRequest.pathParams).length > 0) {
      config.tool_config.api_schema.path_params_schema = toolRequest.pathParams;
    }

    if (toolRequest.queryParams && Object.keys(toolRequest.queryParams).length > 0) {
      config.tool_config.api_schema.query_params_schema = {
        properties: toolRequest.queryParams,
        required: Object.keys(toolRequest.queryParams).filter(key => 
          toolRequest.queryParams![key].required === true
        )
      };
    }

    if (toolRequest.requestBody && Object.keys(toolRequest.requestBody).length > 0) {
      config.tool_config.api_schema.request_body_schema = {
        type: 'object',
        properties: toolRequest.requestBody,
        required: Object.keys(toolRequest.requestBody).filter(key => 
          toolRequest.requestBody![key].required === true
        ),
        description: 'Request body parameters'
      };
    }

    if (toolRequest.requestHeaders && Object.keys(toolRequest.requestHeaders).length > 0) {
      config.tool_config.api_schema.request_headers = toolRequest.requestHeaders;
    }

    return config;
  }
}

export const customToolService = CustomToolService;