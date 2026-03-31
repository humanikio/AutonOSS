interface StartCallParams {
  tenantId: string;
  agentId: string;
  contactId?: string;
  targetPhoneNumber?: string;
}

interface StartCallResponse {
  success: boolean;
  data?: {
    conversationId: string;
    callSid?: string;
    status: string;
  };
  error?: string;
}

export class CallService {
  /**
   * Initiate an agent phone call
   */
  static async startAgentCall(params: StartCallParams, token: string): Promise<StartCallResponse> {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      const response = await fetch(`${apiUrl}/api/agent-communication/phone/start-call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || 'Failed to start call'
        };
      }

      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      console.error('Error starting agent call:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }
}