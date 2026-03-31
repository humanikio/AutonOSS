import { aiEditDocumentTool } from '../tools/aiEditDocument';

export interface ToolExecutionResult {
  success: boolean;
  message: string;
  data?: any;
}

export class ToolController {
  
  async executeTool(toolId: string, params: any): Promise<ToolExecutionResult> {
    try {
      console.log(`Executing tool: ${toolId} with params:`, params);

      switch (toolId) {
        case 'aiDocEdit':
          return await this.executeAiDocEdit(params);
        
        default:
          throw new Error(`Unknown tool: ${toolId}`);
      }

    } catch (error) {
      console.error(`Error executing tool ${toolId}:`, error);
      return {
        success: false,
        message: `Failed to execute tool ${toolId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async executeAiDocEdit(params: any): Promise<ToolExecutionResult> {
    // Validate required parameters
    if (!params.tenantId || !params.docId || !params.content) {
      return {
        success: false,
        message: 'Missing required parameters: tenantId, docId, or content'
      };
    }

    try {
      const result = await aiEditDocumentTool.updateDocument({
        tenantId: params.tenantId,
        docId: params.docId,
        content: params.content,
        reason: params.reason || 'AI-assisted document update'
      });

      return {
        success: true,
        message: 'Document updated successfully',
        data: result
      };

    } catch (error) {
      console.error('Error in aiDocEdit tool:', error);
      return {
        success: false,
        message: `Failed to update document: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get list of available tools
   */
  getAvailableTools(): string[] {
    return ['aiDocEdit'];
  }

  /**
   * Get tool information
   */
  getToolInfo(toolId: string): any {
    switch (toolId) {
      case 'aiDocEdit':
        return {
          id: 'aiDocEdit',
          name: 'AI Document Editor',
          description: 'Updates knowledge base document content',
          parameters: {
            tenantId: 'string (required)',
            docId: 'string (required)', 
            content: 'string (required) - The updated document content',
            reason: 'string (optional) - Reason for the update'
          }
        };
      
      default:
        return null;
    }
  }
}

export const toolController = new ToolController();