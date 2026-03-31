import { smsTest } from './sendTest/smsTest';
import { emailTest } from './sendTest/emailTest';
import { phoneTest } from './sendTest/phoneTest';

interface TestWebhookRequest {
  destinationKey: string;
  category: 'sms' | 'email' | 'phone';
  webhookUrl: string;
  customPayload?: any;
  authType?: 'none' | 'signing_secret';
  signingSecret?: string;
}

interface TestWebhookResult {
  success: boolean;
  statusCode?: number;
  response?: any;
  error?: string;
  timeTaken?: number;
}

export class SendTest {
  /**
   * Send test webhook based on category
   */
  async sendTestWebhook(params: TestWebhookRequest): Promise<TestWebhookResult> {
    try {
      console.log(`>ê Sending test webhook for ${params.category} to ${params.webhookUrl}`);
      
      const startTime = Date.now();
      let result: TestWebhookResult;

      switch (params.category) {
        case 'sms':
          result = await smsTest.sendTest({
            destinationKey: params.destinationKey,
            webhookUrl: params.webhookUrl,
            customPayload: params.customPayload,
            authType: params.authType,
            signingSecret: params.signingSecret
          });
          break;
        
        case 'email':
          result = await emailTest.sendTest({
            destinationKey: params.destinationKey,
            webhookUrl: params.webhookUrl,
            customPayload: params.customPayload,
            authType: params.authType,
            signingSecret: params.signingSecret
          });
          break;
        
        case 'phone':
          result = await phoneTest.sendTest({
            destinationKey: params.destinationKey,
            webhookUrl: params.webhookUrl,
            customPayload: params.customPayload,
            authType: params.authType,
            signingSecret: params.signingSecret
          });
          break;
        
        default:
          throw new Error(`Unsupported category: ${params.category}`);
      }

      const timeTaken = Date.now() - startTime;
      result.timeTaken = timeTaken;

      console.log(` Test webhook completed in ${timeTaken}ms with status: ${result.statusCode}`);
      return result;

    } catch (error) {
      console.error('L Error sending test webhook:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}

export const sendTest = new SendTest();