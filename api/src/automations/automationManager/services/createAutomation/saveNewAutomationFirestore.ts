import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../../config/firestore';
import { AutomationData } from '../createAutomation';

export const saveNewAutomationFirestore = async (tenantId: string, customName?: string): Promise<AutomationData> => {
  try {
    // Generate unique ID for the automation
    const automationId = uuidv4();
    
    // Create timestamp
    const timestamp = new Date().toISOString();
    const readableTimestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    // Generate name (use custom name or default to "New Workflow-{timestamp}")
    const name = customName || `New Workflow-${readableTimestamp}`;

    // Create automation data
    const automationData: AutomationData = {
      id: automationId,
      name,
      status: 'draft',
      totalEnrolled: 0,
      activeEnrolled: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
      tenantId
    };

    // Save to Firestore at tenants/{tenantId}/automations/{automationId}
    const docRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('automations')
      .doc(automationId);

    await docRef.set(automationData);

    console.log(` Created automation ${automationId} for tenant ${tenantId}`);
    
    return automationData;
  } catch (error) {
    console.error('Error saving automation to Firestore:', error);
    throw new Error(`Failed to save automation: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};