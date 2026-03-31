import { getDestinationWebhooks as getDestinationWebhooksFromFirestore, deleteDestinationWebhookFirestore, updateDestinationWebhookFirestore, getDestinationWebhookByKey } from '../utils/saveDestinationWebhookFirestore';
import { generateDestinationKey } from '../utils/generateDestinationKey';
import { saveBasicConfigs } from './destinationHookSetup/saveBasicConfigs';
import { authSetup } from './destinationHookSetup/authSetup';
import { smsHookVariations } from './destinationHookSetup/variations/smsHook';
import { emailHookVariations } from './destinationHookSetup/variations/emailHook';
import { phoneHookVariations } from './destinationHookSetup/variations/phoneHook';

interface DestinationWebhookConfig {
  name: string;
  description?: string;
  category: 'sms' | 'email' | 'phone';
  endpoint: {
    url: string;
    method: 'POST';
    headers?: Record<string, string>;
    authType: 'none' | 'bearer' | 'basic' | 'api_key' | 'signing_secret';
    authConfig?: {
      token?: string;
      username?: string;
      password?: string;
      apiKey?: string;
      apiKeyHeader?: string;
    };
  };
  payloadTemplate?: string;
  isActive?: boolean;
}

interface DestinationWebhookSetupParams extends DestinationWebhookConfig {
  tenantId: string;
  agentId: string;
  destinationKey?: string; // For updates - if provided, update existing webhook
}

interface DestinationWebhookSetupResult {
  success: boolean;
  destinationKey?: string;
  isActive?: boolean;
  createdAt?: Date;
  error?: string;
}

interface GetDestinationWebhooksResult {
  success: boolean;
  webhooks?: any[];
  error?: string;
}

interface GetDestinationWebhookResult {
  success: boolean;
  webhook?: any;
  error?: string;
}

export class DestinationHookSetup {
  /**
   * Setup SMS destination webhook
   */
  async setupSmsDestination(params: DestinationWebhookSetupParams): Promise<DestinationWebhookSetupResult> {
    try {
      console.log('🔧 Setting up SMS destination webhook...');
      
      // Use provided destinationKey for updates, or generate new one for creation
      const destinationKey = params.destinationKey || generateDestinationKey.generate('sms');
      const isUpdate = !!params.destinationKey;
      
      // Create timestamp
      const now = new Date();
      const createdAt = isUpdate ? undefined : now;
      
      // Setup authentication
      const authResult = await authSetup.setupAuth({
        authType: params.endpoint.authType,
        category: 'sms',
        authConfig: params.endpoint.authConfig
      });

      if (!authResult.success) {
        return {
          success: false,
          error: `Authentication setup failed: ${authResult.error}`
        };
      }

      // Get SMS-specific defaults
      const smsDefaults = smsHookVariations.getDefaultHeaders();
      const defaultPayload = params.payloadTemplate || smsHookVariations.getDefaultPayloadTemplate();

      // Prepare basic config data
      const basicConfigData = {
        destinationKey,
        tenantId: params.tenantId,
        agentId: params.agentId,
        category: 'sms' as const,
        name: params.name,
        description: params.description || 'SMS destination webhook',
        endpoint: {
          url: params.endpoint.url,
          method: params.endpoint.method,
          headers: { ...smsDefaults, ...(params.endpoint.headers || {}) }
        },
        payloadTemplate: defaultPayload,
        isActive: params.isActive !== undefined ? params.isActive : true,
        createdAt: isUpdate ? undefined : now,
        updatedAt: now
      };

      // Save configuration using modular service
      await saveBasicConfigs.saveConfiguration(basicConfigData, {
        authType: authResult.authType as any,
        authConfig: authResult.authConfig,
        signingSecret: authResult.signingSecret,
        basicAuthHeader: authResult.basicAuthHeader
      });

      console.log(`✅ SMS destination webhook ${isUpdate ? 'updated' : 'created'}: ${destinationKey}`);

      return {
        success: true,
        destinationKey,
        isActive: basicConfigData.isActive,
        createdAt: isUpdate ? undefined : now
      };

    } catch (error) {
      console.error('❌ Error setting up SMS destination webhook:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Setup Email destination webhook
   */
  async setupEmailDestination(params: DestinationWebhookSetupParams): Promise<DestinationWebhookSetupResult> {
    try {
      console.log('🔧 Setting up Email destination webhook...');
      
      // Use provided destinationKey for updates, or generate new one for creation
      const destinationKey = params.destinationKey || generateDestinationKey.generate('email');
      const isUpdate = !!params.destinationKey;
      
      // Create timestamp
      const now = new Date();
      const createdAt = isUpdate ? undefined : now;
      
      // Setup authentication
      const authResult = await authSetup.setupAuth({
        authType: params.endpoint.authType,
        category: 'email',
        authConfig: params.endpoint.authConfig
      });

      if (!authResult.success) {
        return {
          success: false,
          error: `Authentication setup failed: ${authResult.error}`
        };
      }

      // Get Email-specific defaults
      const emailDefaults = emailHookVariations.getDefaultHeaders();
      const defaultPayload = params.payloadTemplate || emailHookVariations.getDefaultPayloadTemplate();

      // Prepare basic config data
      const basicConfigData = {
        destinationKey,
        tenantId: params.tenantId,
        agentId: params.agentId,
        category: 'email' as const,
        name: params.name,
        description: params.description || 'Email destination webhook',
        endpoint: {
          url: params.endpoint.url,
          method: params.endpoint.method,
          headers: { ...emailDefaults, ...(params.endpoint.headers || {}) }
        },
        payloadTemplate: defaultPayload,
        isActive: params.isActive !== undefined ? params.isActive : true,
        createdAt: isUpdate ? undefined : now,
        updatedAt: now
      };

      // Save configuration using modular service
      await saveBasicConfigs.saveConfiguration(basicConfigData, {
        authType: authResult.authType as any,
        authConfig: authResult.authConfig,
        signingSecret: authResult.signingSecret,
        basicAuthHeader: authResult.basicAuthHeader
      });

      console.log(`✅ Email destination webhook ${isUpdate ? 'updated' : 'created'}: ${destinationKey}`);

      return {
        success: true,
        destinationKey,
        isActive: basicConfigData.isActive,
        createdAt: isUpdate ? undefined : now
      };

    } catch (error) {
      console.error('❌ Error setting up Email destination webhook:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Setup Phone destination webhook
   */
  async setupPhoneDestination(params: DestinationWebhookSetupParams): Promise<DestinationWebhookSetupResult> {
    try {
      console.log('🔧 Setting up Phone destination webhook...');
      
      // Use provided destinationKey for updates, or generate new one for creation
      const destinationKey = params.destinationKey || generateDestinationKey.generate('phone');
      const isUpdate = !!params.destinationKey;
      
      // Create timestamp
      const now = new Date();
      const createdAt = isUpdate ? undefined : now;
      
      // Setup authentication
      const authResult = await authSetup.setupAuth({
        authType: params.endpoint.authType,
        category: 'phone',
        authConfig: params.endpoint.authConfig
      });

      if (!authResult.success) {
        return {
          success: false,
          error: `Authentication setup failed: ${authResult.error}`
        };
      }

      // Get Phone-specific defaults
      const phoneDefaults = phoneHookVariations.getDefaultHeaders();
      const defaultPayload = params.payloadTemplate || phoneHookVariations.getDefaultPayloadTemplate();

      // Prepare basic config data
      const basicConfigData = {
        destinationKey,
        tenantId: params.tenantId,
        agentId: params.agentId,
        category: 'phone' as const,
        name: params.name,
        description: params.description || 'Phone destination webhook',
        endpoint: {
          url: params.endpoint.url,
          method: params.endpoint.method,
          headers: { ...phoneDefaults, ...(params.endpoint.headers || {}) }
        },
        payloadTemplate: defaultPayload,
        isActive: params.isActive !== undefined ? params.isActive : true,
        createdAt: isUpdate ? undefined : now,
        updatedAt: now
      };

      // Save configuration using modular service
      await saveBasicConfigs.saveConfiguration(basicConfigData, {
        authType: authResult.authType as any,
        authConfig: authResult.authConfig,
        signingSecret: authResult.signingSecret,
        basicAuthHeader: authResult.basicAuthHeader
      });

      console.log(`✅ Phone destination webhook ${isUpdate ? 'updated' : 'created'}: ${destinationKey}`);

      return {
        success: true,
        destinationKey,
        isActive: basicConfigData.isActive,
        createdAt: isUpdate ? undefined : now
      };

    } catch (error) {
      console.error('❌ Error setting up Phone destination webhook:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get a specific destination webhook by key
   */
  async getDestinationWebhook(tenantId: string, agentId: string, destinationKey: string): Promise<GetDestinationWebhookResult> {
    try {
      console.log(`📋 Getting destination webhook: ${destinationKey} for agent ${agentId}`);
      
      const webhook = await getDestinationWebhookByKey(tenantId, agentId, destinationKey);
      
      if (!webhook) {
        console.log(`📋 Destination webhook not found: ${destinationKey}`);
        return {
          success: true,
          webhook: null
        };
      }
      
      console.log(`✅ Retrieved destination webhook: ${destinationKey}`);
      
      return {
        success: true,
        webhook
      };

    } catch (error) {
      console.error('❌ Error getting destination webhook:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get all destination webhooks for an agent
   */
  async getDestinationWebhooks(tenantId: string, agentId: string): Promise<GetDestinationWebhooksResult> {
    try {
      console.log(`📋 Getting destination webhooks for agent ${agentId}`);
      
      const webhooks = await getDestinationWebhooksFromFirestore(tenantId, agentId);
      
      console.log(`✅ Retrieved ${webhooks.length} destination webhooks`);
      
      return {
        success: true,
        webhooks
      };

    } catch (error) {
      console.error('❌ Error getting destination webhooks:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Delete a destination webhook
   */
  async deleteDestination(tenantId: string, agentId: string, destinationKey: string): Promise<DestinationWebhookSetupResult> {
    try {
      console.log(`🗑️ Deleting destination webhook: ${destinationKey}`);
      
      await deleteDestinationWebhookFirestore(tenantId, agentId, destinationKey);
      
      console.log(`✅ Destination webhook deleted: ${destinationKey}`);
      
      return {
        success: true
      };

    } catch (error) {
      console.error('❌ Error deleting destination webhook:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Toggle destination webhook active state
   */
  async toggleDestinationActive(tenantId: string, agentId: string, destinationKey: string, isActive: boolean): Promise<DestinationWebhookSetupResult> {
    try {
      console.log(`🔄 Toggling destination webhook ${destinationKey} to ${isActive ? 'active' : 'inactive'}`);
      
      await updateDestinationWebhookFirestore(tenantId, agentId, destinationKey, {
        isActive,
        updatedAt: new Date()
      });
      
      console.log(`✅ Destination webhook ${destinationKey} is now ${isActive ? 'active' : 'inactive'}`);
      
      return {
        success: true,
        isActive
      };

    } catch (error) {
      console.error('❌ Error toggling destination webhook:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}

export const destinationHookSetup = new DestinationHookSetup();