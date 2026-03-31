import { updateAgentPhoneNumber } from './manageAgent/updateAgentPhoneNumber';
import { updateEnabledChannels } from './manageAgent/updateEnabledChannels';
import { updateAgentEmail } from './manageAgent/updateAgentEmail';
import { updateAgentName } from './manageAgent/updateAgentName';
import { activateAgent } from './manageAgent/activateAgent';

interface ManageAgentParams {
  action: string;
  name?: string;
  phoneNumber?: string;
  twilioSid?: string;
  email?: string;
  emailId?: string;
  channelType?: 'voice' | 'sms' | 'email' | 'webhook';
  enabled?: boolean;
  status?: 'active' | 'draft' | 'paused';
}

export const manageAgentService = async (
  tenantId: string,
  agentId: string,
  params: ManageAgentParams
): Promise<void> => {
  const { action } = params;
  
  try {
    switch (action) {
      case 'updateName':
        if (!params.name) {
          throw new Error('Name is required for updateName action');
        }
        
        await updateAgentName(tenantId, agentId, {
          name: params.name
        });
        break;
        
      case 'updatePhoneNumber':
        if (!params.phoneNumber) {
          throw new Error('Phone number is required for updatePhoneNumber action');
        }
        
        await updateAgentPhoneNumber(tenantId, agentId, {
          phoneNumber: params.phoneNumber,
          twilioSid: params.twilioSid
        });
        break;
        
      case 'updateEmail':
        if (!params.email) {
          throw new Error('Email is required for updateEmail action');
        }
        
        await updateAgentEmail(tenantId, agentId, {
          email: params.email,
          emailId: params.emailId
        });
        break;
        
      case 'updateEnabledChannels':
        if (!params.channelType || params.enabled === undefined) {
          throw new Error('channelType and enabled are required for updateEnabledChannels action');
        }
        
        await updateEnabledChannels(tenantId, agentId, {
          channelType: params.channelType,
          enabled: params.enabled
        });
        break;
        
      case 'updateStatus':
        if (!params.status) {
          throw new Error('Status is required for updateStatus action');
        }
        
        await activateAgent(tenantId, agentId, {
          status: params.status
        });
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error(`Error managing agent (${action}):`, error);
    throw error; // Re-throw to be handled by the controller
  }
};