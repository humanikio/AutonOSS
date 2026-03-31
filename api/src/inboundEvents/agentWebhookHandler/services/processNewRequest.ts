import { decodeBase64Service } from './processNewRequest/decodeBase64';
import { validateHmacBasicAuthService } from './processNewRequest/validateHmacBasicAuth';
import { handleChannelDesignationService } from './processNewRequest/handleChannelDesingation';

interface ProcessRequestParams {
  encodedData: string;
  requestBody: any;
  headers: any;
  method: string;
  originalUrl: string;
}

interface ProcessResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  statusCode?: number;
}

export class ProcessNewRequestService {
  /**
   * Main orchestrator for processing universal webhook requests
   */
  async processRequest(params: ProcessRequestParams): Promise<ProcessResult> {
    try {
      const { encodedData, requestBody, headers, method, originalUrl } = params;
      
      console.log('🔧 ProcessNewRequestService: Starting webhook processing');
      console.log('=📋 Processing Parameters:');
      console.log(`  - Encoded Data: ${encodedData?.substring(0, 20)}...`);
      console.log(`  - Request Method: ${method}`);
      console.log(`  - Original URL: ${originalUrl}`);
      console.log(`  - Body Keys: ${Object.keys(requestBody || {})}`);
      console.log(`  - Header Count: ${Object.keys(headers || {}).length}`);
      console.log('=====================================');

      // Step 1: Decode the base64 webhook data
      console.log('📋 Step 1: Decoding webhook data...');
      const decodeResult = await decodeBase64Service.decodeWebhookData(encodedData);
      
      if (!decodeResult.success) {
        console.error('❌ Step 1 failed: Decode error');
        return {
          success: false,
          error: decodeResult.error,
          message: decodeResult.message,
          statusCode: 400
        };
      }

      const webhookContext = decodeResult.data!;
      console.log('✅ Step 1 complete: Webhook data decoded successfully');
      console.log('🔍 Webhook Context:', JSON.stringify(webhookContext, null, 2));

      // Step 2: Validate Basic Auth credentials
      console.log('📋 Step 2: Validating Basic Auth credentials...');
      const authHeader = headers.authorization || headers.Authorization;
      const authResult = await validateHmacBasicAuthService.validateBasicAuth(authHeader, webhookContext, headers);
      
      if (!authResult.success) {
        console.error('❌ Step 2 failed: Basic Auth validation error');
        return {
          success: false,
          error: authResult.error,
          message: authResult.message,
          statusCode: 401
        };
      }

      console.log('✅ Step 2 complete: Basic Auth validated successfully');
      console.log(`🔐 Authenticated webhook ID: ${authResult.webhookId}`);
      
      // Step 3: Handle channel designation and routing
      console.log('📋 Step 3: Processing channel designation...');
      const channelResult = await handleChannelDesignationService.handleChannelDesignation({
        webhookContext,
        requestBody,
        headers,
        webhookId: authResult.webhookId!
      });
      
      if (!channelResult.success) {
        console.error('❌ Step 3 failed: Channel designation error');
        return {
          success: false,
          error: channelResult.error,
          message: channelResult.message,
          statusCode: channelResult.statusCode || 500
        };
      }

      console.log('✅ Step 3 complete: Channel processing successful');
      console.log('✅ ProcessNewRequestService: Complete webhook processing successful');
      console.log('=📋 Final Processing Summary:');
      console.log(`  - Tenant ID: ${webhookContext.tenantId}`);
      console.log(`  - Agent ID: ${webhookContext.agentId}`);
      console.log(`  - Channel: ${webhookContext.channel}`);
      console.log(`  - Method: ${webhookContext.method}`);
      console.log(`  - Webhook ID: ${authResult.webhookId}`);
      console.log(`  - Processing Result: ${channelResult.success ? 'SUCCESS' : 'FAILED'}`);
      console.log('=====================================');

      return {
        success: true,
        data: {
          webhookContext,
          authentication: {
            webhookId: authResult.webhookId,
            validated: true
          },
          processing: channelResult.data,
          originalRequest: {
            method,
            originalUrl,
            bodyKeys: Object.keys(requestBody || {}),
            headerCount: Object.keys(headers || {}).length
          },
          processingSteps: {
            decode: 'completed',
            validateBasicAuth: 'completed',
            channelDesignation: 'completed'
          }
        }
      };

    } catch (error) {
      console.error('=❌ ProcessNewRequestService: Unexpected error:', error);
      return {
        success: false,
        error: 'Processing service error',
        message: error instanceof Error ? error.message : 'Unknown processing error',
        statusCode: 500
      };
    }
  }
}

export const processNewRequestService = new ProcessNewRequestService();