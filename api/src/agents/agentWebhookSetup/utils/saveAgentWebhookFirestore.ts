import { firestore } from '../../../config/firebase';

interface WebhookData {
  webhookUrl: string;
  tenantId: string;
  agentId: string;
  actionId: string;
  channel: 'sms' | 'email' | 'phone';
  method: 'inbound' | 'outbound';
  name?: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  // Basic Auth credentials
  webhookId: string;      // Username for Basic Auth
  webhookPassword: string; // Password for Basic Auth
  basicAuthHeader?: string; // Pre-computed header for convenience
  metadata?: {
    [key: string]: any;
  };
}

export async function saveAgentWebhookFirestore(webhookData: WebhookData): Promise<void> {
  try {
    const { webhookId, tenantId, agentId } = webhookData;

    // Create the document path: tenants/{tenantId}/agents/{agentId}/webhooks/{webhookId}
    const webhookDocRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('agents')
      .doc(agentId)
      .collection('webhooks')
      .doc(webhookId);

    // Prepare the document data
    const documentData = {
      ...webhookData,
      createdAt: webhookData.createdAt,
      updatedAt: webhookData.updatedAt
    };

    // Save to Firestore
    await webhookDocRef.set(documentData);

    console.log(`Webhook saved to Firestore with ID: ${webhookId}`);
  } catch (error) {
    console.error('Error saving webhook to Firestore:', error);
    throw new Error(`Failed to save webhook to database: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getAgentWebhooks(tenantId: string, agentId: string): Promise<WebhookData[]> {
  try {
    const webhooksRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('agents')
      .doc(agentId)
      .collection('webhooks');

    const snapshot = await webhooksRef.get();
    
    if (snapshot.empty) {
      return [];
    }

    const webhooks: WebhookData[] = [];
    snapshot.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const data = doc.data();
      webhooks.push({
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as WebhookData);
    });

    return webhooks;
  } catch (error) {
    console.error('Error getting agent webhooks:', error);
    throw new Error(`Failed to get agent webhooks: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function deactivateWebhook(tenantId: string, agentId: string, webhookId: string): Promise<void> {
  try {
    const webhookDocRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('agents')
      .doc(agentId)
      .collection('webhooks')
      .doc(webhookId);

    await webhookDocRef.update({
      isActive: false,
      updatedAt: new Date()
    });

    console.log(`Webhook deactivated: ${webhookId}`);
  } catch (error) {
    console.error('Error deactivating webhook:', error);
    throw new Error(`Failed to deactivate webhook: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}