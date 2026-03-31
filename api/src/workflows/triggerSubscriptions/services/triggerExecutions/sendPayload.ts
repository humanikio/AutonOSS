/**
 * Send Payload to Webhook
 * POSTs event payload to n8n workflow webhook URL
 */

import axios from 'axios';

export interface SendPayloadInput {
  webhookUrl: string;
  payload: Record<string, any>;
  workflowId: string;
  subscriptionId: string;
}

export interface SendPayloadResult {
  success: boolean;
  workflowId: string;
  subscriptionId: string;
  statusCode?: number;
  error?: string;
  responseData?: any;
}

/**
 * POST payload to n8n webhook URL
 */
export async function sendPayload(
  input: SendPayloadInput
): Promise<SendPayloadResult> {
  const { webhookUrl, payload, workflowId, subscriptionId } = input;

  console.log(`=ä Sending payload to workflow ${workflowId}`);
  console.log(`   URL: ${webhookUrl}`);

  try {
    const response = await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });

    console.log(` Payload sent successfully (HTTP ${response.status})`);

    return {
      success: true,
      workflowId,
      subscriptionId,
      statusCode: response.status,
      responseData: response.data
    };
  } catch (error: any) {
    console.error(`L Failed to send payload to workflow ${workflowId}:`, error.message);

    return {
      success: false,
      workflowId,
      subscriptionId,
      statusCode: error.response?.status,
      error: error.message,
      responseData: error.response?.data
    };
  }
}
