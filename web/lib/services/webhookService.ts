export interface WebhookData {
  webhookId: string;
  webhookUrl: string;
  webhookPassword?: string; // Only returned once during creation
  basicAuthHeader?: string; // Only returned once during creation
  channel: 'sms' | 'email' | 'phone';
  method: 'inbound' | 'outbound';
  name?: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  encodedData: string;
  metadata?: {
    [key: string]: any;
  };
}

export interface CreateWebhookRequest {
  agentId: string;
  tenantId: string;
  name?: string;
  description?: string;
  actionId?: string;
}

export interface CreateWebhookResponse {
  success: boolean;
  data: {
    webhookUrl: string;
    webhookId: string;
    webhookPassword: string; // Returned once during creation
    basicAuthHeader: string; // Returned once during creation
    channel: string;
    method: string;
    encodedData: string;
    createdAt: Date;
  };
}

export class WebhookService {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  async createSmsInboundWebhook(request: CreateWebhookRequest, token: string): Promise<CreateWebhookResponse> {
    const response = await fetch(`${this.baseUrl}/api/agents/webhook-setup/sms/inbound`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create SMS inbound webhook');
    }

    return response.json();
  }

  async createSmsOutboundWebhook(request: CreateWebhookRequest, token: string): Promise<CreateWebhookResponse> {
    const response = await fetch(`${this.baseUrl}/api/agents/webhook-setup/sms/outbound`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create SMS outbound webhook');
    }

    return response.json();
  }

  async createEmailInboundWebhook(request: CreateWebhookRequest, token: string): Promise<CreateWebhookResponse> {
    const response = await fetch(`${this.baseUrl}/api/agents/webhook-setup/email/inbound`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create email inbound webhook');
    }

    return response.json();
  }

  async createEmailOutboundWebhook(request: CreateWebhookRequest, token: string): Promise<CreateWebhookResponse> {
    const response = await fetch(`${this.baseUrl}/api/agents/webhook-setup/email/outbound`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create email outbound webhook');
    }

    return response.json();
  }

  async createPhoneInboundWebhook(request: CreateWebhookRequest, token: string): Promise<CreateWebhookResponse> {
    const response = await fetch(`${this.baseUrl}/api/agents/webhook-setup/phone/inbound`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create phone inbound webhook');
    }

    return response.json();
  }

  async createPhoneOutboundWebhook(request: CreateWebhookRequest, token: string): Promise<CreateWebhookResponse> {
    const response = await fetch(`${this.baseUrl}/api/agents/webhook-setup/phone/outbound`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create phone outbound webhook');
    }

    return response.json();
  }

  /**
   * Get webhooks for a specific agent from Firestore
   */
  async getAgentWebhooks(tenantId: string, agentId: string, token: string): Promise<WebhookData[]> {
    try {
      // For now, we'll call a backend endpoint that fetches from Firestore
      // In the future, this could be optimized with real-time subscriptions
      const response = await fetch(`${this.baseUrl}/api/agents/${agentId}/webhooks?tenantId=${tenantId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch agent webhooks');
      }

      const data = await response.json();
      return data.webhooks || [];
    } catch (error) {
      console.error('Error fetching agent webhooks:', error);
      return [];
    }
  }

  /**
   * Helper method to create webhook based on channel and method
   */
  async createWebhook(
    channel: 'sms' | 'email' | 'phone',
    method: 'inbound' | 'outbound',
    request: CreateWebhookRequest,
    token: string
  ): Promise<CreateWebhookResponse> {
    switch (`${channel}-${method}`) {
      case 'sms-inbound':
        return this.createSmsInboundWebhook(request, token);
      case 'sms-outbound':
        return this.createSmsOutboundWebhook(request, token);
      case 'email-inbound':
        return this.createEmailInboundWebhook(request, token);
      case 'email-outbound':
        return this.createEmailOutboundWebhook(request, token);
      case 'phone-inbound':
        return this.createPhoneInboundWebhook(request, token);
      case 'phone-outbound':
        return this.createPhoneOutboundWebhook(request, token);
      default:
        throw new Error(`Unsupported webhook type: ${channel}-${method}`);
    }
  }

  /**
   * Delete a specific webhook
   */
  async deleteWebhook(tenantId: string, agentId: string, webhookId: string, token: string): Promise<{
    success: boolean;
    message: string;
    deletedWebhook?: any;
  }> {
    const response = await fetch(`${this.baseUrl}/api/agents/webhook-setup/${tenantId}/${agentId}/${webhookId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete webhook');
    }

    return response.json();
  }

  /**
   * Deactivate a specific webhook (soft delete)
   */
  async deactivateWebhook(tenantId: string, agentId: string, webhookId: string, token: string): Promise<{
    success: boolean;
    message: string;
    deletedWebhook?: any;
  }> {
    const response = await fetch(`${this.baseUrl}/api/agents/webhook-setup/${tenantId}/${agentId}/${webhookId}/deactivate`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to deactivate webhook');
    }

    return response.json();
  }

  /**
   * Bulk delete multiple webhooks
   */
  async bulkDeleteWebhooks(tenantId: string, agentId: string, webhookIds: string[], token: string): Promise<{
    success: boolean;
    message: string;
    data: {
      successCount: number;
      failureCount: number;
      results: any[];
    };
  }> {
    const response = await fetch(`${this.baseUrl}/api/agents/webhook-setup/${tenantId}/${agentId}/bulk`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ webhookIds }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to bulk delete webhooks');
    }

    return response.json();
  }
}

export const webhookService = new WebhookService();