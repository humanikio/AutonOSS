interface DecodedWebhookData {
  tenantId: string;
  agentId: string;
  channel: 'sms' | 'email' | 'phone';
  method: 'inbound' | 'outbound';
}

interface DecodeResult {
  success: boolean;
  data?: DecodedWebhookData;
  error?: string;
  message?: string;
}

export class DecodeBase64Service {
  /**
   * Decode base64-encoded webhook data and extract agent context
   */
  async decodeWebhookData(encodedData: string): Promise<DecodeResult> {
    try {
      console.log('= DecodeBase64Service: Starting decode process');
      console.log('=� Raw Encoded Data:', encodedData);
      console.log('=� Encoded Data Length:', encodedData.length);
      console.log('=====================================');

      // Validate input
      if (!encodedData || typeof encodedData !== 'string') {
        console.error('L Invalid encoded data: must be a non-empty string');
        return {
          success: false,
          error: 'Invalid encoded data',
          message: 'Encoded data must be a non-empty string'
        };
      }

      // Decode base64
      let decodedString: string;
      try {
        decodedString = Buffer.from(encodedData, 'base64').toString('utf-8');
        console.log(' Base64 decode successful');
        console.log('=� Decoded String:', decodedString);
        console.log('=� Decoded String Length:', decodedString.length);
      } catch (decodeError) {
        console.error('L Base64 decode failed:', decodeError);
        return {
          success: false,
          error: 'Base64 decode failed',
          message: 'Invalid base64 format'
        };
      }

      // Parse JSON
      let parsedData: any;
      try {
        parsedData = JSON.parse(decodedString);
        console.log(' JSON parse successful');
        console.log('=� Parsed JSON Data:', JSON.stringify(parsedData, null, 2));
        console.log('= JSON Keys:', Object.keys(parsedData));
      } catch (parseError) {
        console.error('L JSON parse failed:', parseError);
        return {
          success: false,
          error: 'JSON parse failed',
          message: 'Decoded data is not valid JSON'
        };
      }

      // Extract and validate required fields
      console.log('Extracting and validating fields...');
      
      const tenantId = parsedData.tenantId;
      const agentId = parsedData.agentId;
      const channel = parsedData.channel;
      const method = parsedData.method;

      console.log('Extracted Fields:');
      console.log(`  - tenantId: "${tenantId}" (type: ${typeof tenantId})`);
      console.log(`  - agentId: "${agentId}" (type: ${typeof agentId})`);
      console.log(`  - channel: "${channel}" (type: ${typeof channel})`);
      console.log(`  - method: "${method}" (type: ${typeof method})`);

      // Validate required fields
      const missingFields: string[] = [];
      if (!tenantId || typeof tenantId !== 'string') missingFields.push('tenantId');
      if (!agentId || typeof agentId !== 'string') missingFields.push('agentId');
      if (!channel || typeof channel !== 'string') missingFields.push('channel');
      if (!method || typeof method !== 'string') missingFields.push('method');

      if (missingFields.length > 0) {
        console.error('L Missing required fields:', missingFields);
        return {
          success: false,
          error: 'Missing required fields',
          message: `Required fields missing or invalid: ${missingFields.join(', ')}`
        };
      }

      // Validate channel values
      const validChannels: Array<'sms' | 'email' | 'phone'> = ['sms', 'email', 'phone'];
      if (!validChannels.includes(channel as any)) {
        console.error('L Invalid channel:', channel);
        return {
          success: false,
          error: 'Invalid channel',
          message: `Channel must be one of: ${validChannels.join(', ')}`
        };
      }

      // Validate method values
      const validMethods: Array<'inbound' | 'outbound'> = ['inbound', 'outbound'];
      if (!validMethods.includes(method as any)) {
        console.error('L Invalid method:', method);
        return {
          success: false,
          error: 'Invalid method',
          message: `Method must be one of: ${validMethods.join(', ')}`
        };
      }

      // Create validated result
      const decodedWebhookData: DecodedWebhookData = {
        tenantId,
        agentId,
        channel: channel as 'sms' | 'email' | 'phone',
        method: method as 'inbound' | 'outbound'
      };

      console.log(' Decode and validation complete');
      console.log('<� Final Decoded Data:', JSON.stringify(decodedWebhookData, null, 2));
      console.log('=====================================');

      return {
        success: true,
        data: decodedWebhookData
      };

    } catch (error) {
      console.error('=� DecodeBase64Service: Unexpected error:', error);
      return {
        success: false,
        error: 'Decode service error',
        message: error instanceof Error ? error.message : 'Unknown decode error'
      };
    }
  }
}

export const decodeBase64Service = new DecodeBase64Service();