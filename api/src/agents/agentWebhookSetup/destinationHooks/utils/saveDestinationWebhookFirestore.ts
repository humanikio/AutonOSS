import { firestore } from '../../../../config/firebase';

interface DestinationWebhookData {
  destinationKey: string;
  tenantId: string;
  agentId: string;
  category: 'sms' | 'email' | 'phone';
  name: string;
  description?: string;
  endpoint: {
    url: string;
    method: 'POST';
    headers?: Record<string, string>;
    authType: 'none' | 'bearer' | 'basic' | 'api_key' | 'signing_secret';
    authConfig: Record<string, any>;
  };
  payloadTemplate: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt: Date;
}

export async function saveDestinationWebhookFirestore(webhookData: DestinationWebhookData): Promise<void> {
  try {
    const { destinationKey, tenantId, agentId } = webhookData;

    // Create the document path: tenants/{tenantId}/agents/{agentId}/destinationWebhooks/{destinationKey}
    const webhookDocRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('agents')
      .doc(agentId)
      .collection('destinationWebhooks')
      .doc(destinationKey);

    // Check if this is an update (no createdAt) or new document
    const isUpdate = !webhookData.createdAt;
    
    // Prepare the document data
    const documentData: any = {
      ...webhookData,
      updatedAt: webhookData.updatedAt
    };
    
    // Only include createdAt for new documents
    if (webhookData.createdAt) {
      documentData.createdAt = webhookData.createdAt;
    }

    // Save to Firestore - use merge for updates, set for new documents
    if (isUpdate) {
      await webhookDocRef.set(documentData, { merge: true });
      console.log(`Destination webhook updated in Firestore with key: ${destinationKey}`);
    } else {
      await webhookDocRef.set(documentData);
      console.log(`Destination webhook created in Firestore with key: ${destinationKey}`);
    }
  } catch (error) {
    console.error('Error saving destination webhook to Firestore:', error);
    throw new Error(`Failed to save destination webhook to database: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getDestinationWebhooks(tenantId: string, agentId: string): Promise<DestinationWebhookData[]> {
  try {
    const webhooksRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('agents')
      .doc(agentId)
      .collection('destinationWebhooks');

    const snapshot = await webhooksRef.get();
    
    if (snapshot.empty) {
      return [];
    }

    const webhooks: DestinationWebhookData[] = [];
    snapshot.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const data = doc.data();
      webhooks.push({
        ...data,
        destinationKey: doc.id, // Add the document ID as destinationKey
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as DestinationWebhookData);
    });

    return webhooks;
  } catch (error) {
    console.error('Error getting destination webhooks:', error);
    throw new Error(`Failed to get destination webhooks: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function deleteDestinationWebhookFirestore(tenantId: string, agentId: string, destinationKey: string): Promise<void> {
  try {
    const webhookDocRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('agents')
      .doc(agentId)
      .collection('destinationWebhooks')
      .doc(destinationKey);

    await webhookDocRef.delete();

    console.log(`Destination webhook deleted: ${destinationKey}`);
  } catch (error) {
    console.error('Error deleting destination webhook:', error);
    throw new Error(`Failed to delete destination webhook: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function updateDestinationWebhookFirestore(
  tenantId: string, 
  agentId: string, 
  destinationKey: string, 
  updateData: Partial<DestinationWebhookData>
): Promise<void> {
  try {
    const webhookDocRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('agents')
      .doc(agentId)
      .collection('destinationWebhooks')
      .doc(destinationKey);

    await webhookDocRef.update(updateData);

    console.log(`Destination webhook updated: ${destinationKey}`);
  } catch (error) {
    console.error('Error updating destination webhook:', error);
    throw new Error(`Failed to update destination webhook: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getDestinationWebhookByKey(tenantId: string, agentId: string, destinationKey: string): Promise<DestinationWebhookData | null> {
  try {
    const webhookDocRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('agents')
      .doc(agentId)
      .collection('destinationWebhooks')
      .doc(destinationKey);

    const doc = await webhookDocRef.get();
    
    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    return {
      ...data,
      destinationKey: doc.id, // Add the document ID as destinationKey
      createdAt: data?.createdAt?.toDate() || new Date(),
      updatedAt: data?.updatedAt?.toDate() || new Date()
    } as DestinationWebhookData;
  } catch (error) {
    console.error('Error getting destination webhook by key:', error);
    throw new Error(`Failed to get destination webhook: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}