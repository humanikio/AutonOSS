import { saveNewAutomationFirestore } from './createAutomation/saveNewAutomationFirestore';

export interface AutomationData {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'paused';
  totalEnrolled: number;
  activeEnrolled: number;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
}

export const createAutomationService = async (tenantId: string, customName?: string): Promise<AutomationData> => {
  try {
    // Create the automation with default values
    const automationData = await saveNewAutomationFirestore(tenantId, customName);
    
    return automationData;
  } catch (error) {
    console.error('Error in createAutomationService:', error);
    throw new Error(`Failed to create automation: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};