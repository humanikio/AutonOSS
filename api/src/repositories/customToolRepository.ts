import { firestore } from '../config/firebase';

export interface CustomTool {
  id: string;
  tenantId: string;
  elevenlabsToolId: string; // ID from ElevenLabs API
  name: string;
  description: string;
  webhookUrl: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  pathParams?: Record<string, any>;
  queryParams?: Record<string, any>;
  requestBody?: Record<string, any>;
  requestHeaders?: Record<string, string>;
  responseTimeout?: number;
  disableInterruptions?: boolean;
  forcePreToolSpeech?: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export class CustomToolRepository {
  private static readonly COLLECTION = 'customTools';

  // Get all custom tools for a tenant
  static async getCustomTools(tenantId: string): Promise<CustomTool[]> {
    const toolsSnapshot = await firestore
      .collection('tenants')
      .doc(tenantId)
      .collection(this.COLLECTION)
      .orderBy('createdAt', 'desc')
      .get();

    return toolsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CustomTool[];
  }

  // Get a specific custom tool by ID
  static async getCustomTool(tenantId: string, toolId: string): Promise<CustomTool | null> {
    const toolDoc = await firestore
      .collection('tenants')
      .doc(tenantId)
      .collection(this.COLLECTION)
      .doc(toolId)
      .get();

    if (!toolDoc.exists) {
      return null;
    }

    return {
      id: toolDoc.id,
      ...toolDoc.data()
    } as CustomTool;
  }

  // Create a new custom tool
  static async createCustomTool(tenantId: string, toolData: CustomTool): Promise<CustomTool> {
    await firestore
      .collection('tenants')
      .doc(tenantId)
      .collection(this.COLLECTION)
      .doc(toolData.id)
      .set(toolData);

    return toolData;
  }

  // Update a custom tool
  static async updateCustomTool(tenantId: string, toolId: string, toolData: Partial<CustomTool>): Promise<void> {
    const toolRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection(this.COLLECTION)
      .doc(toolId);

    await toolRef.update({
      ...toolData,
      updatedAt: new Date().toISOString()
    });
  }

  // Delete a custom tool
  static async deleteCustomTool(tenantId: string, toolId: string): Promise<void> {
    await firestore
      .collection('tenants')
      .doc(tenantId)
      .collection(this.COLLECTION)
      .doc(toolId)
      .delete();
  }

  // Check if a custom tool exists
  static async toolExists(tenantId: string, toolId: string): Promise<boolean> {
    const toolDoc = await firestore
      .collection('tenants')
      .doc(tenantId)
      .collection(this.COLLECTION)
      .doc(toolId)
      .get();

    return toolDoc.exists;
  }

  // Get tools by ElevenLabs tool IDs
  static async getToolsByElevenLabsIds(tenantId: string, elevenlabsToolIds: string[]): Promise<CustomTool[]> {
    if (elevenlabsToolIds.length === 0) return [];

    const toolsSnapshot = await firestore
      .collection('tenants')
      .doc(tenantId)
      .collection(this.COLLECTION)
      .where('elevenlabsToolId', 'in', elevenlabsToolIds)
      .get();

    return toolsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CustomTool[];
  }

  // Generate new tool ID
  static generateToolId(): string {
    return firestore.collection('temp').doc().id;
  }
}