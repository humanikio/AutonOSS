import { firestore } from '../../../config/firebase';
import { v4 as uuidv4 } from 'uuid';
import admin from 'firebase-admin';

export interface GenerateCaseRequest {
  tenantId: string;
  agentId: string;
  contactId: string;
  messageContent: string;
  messageId?: string;
  conversationId?: string;
  from?: string;
  to?: string;
  isOutbound?: boolean; // NEW: Flag to mark outbound cases
  actionId?: string; // NEW: Action ID for outbound context
}

export interface CaseInfo {
  caseId: string;
  caseNumber: string;
  tenantId: string;
  agentId: string;
  contactId: string;
  timestamp: string;
  status: 'active' | 'completed' | 'failed';
}

export class GenerateCaseNumberService {
  /**
   * Generate a new case for SMS processing
   */
  async generateCase(request: GenerateCaseRequest): Promise<CaseInfo> {
    try {
      const caseId = uuidv4();
      const timestamp = new Date().toISOString();
      
      // Generate human-readable case number (format: CASE-YYYYMMDD-XXXX)
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const caseNumber = `CASE-${dateStr}-${randomSuffix}`;

      console.log(`= Creating new case: ${caseNumber}`);
      console.log(`  - Case ID: ${caseId}`);
      console.log(`  - Agent ID: ${request.agentId}`);
      console.log(`  - Contact ID: ${request.contactId}`);

      // Prepare case data
      const caseData = {
        caseId,
        caseNumber,
        tenantId: request.tenantId,
        agentId: request.agentId,
        contactId: request.contactId,
        conversationId: request.conversationId,
        
        // Message details
        initialMessageId: request.messageId,
        initialMessageContent: request.messageContent,
        from: request.from,
        to: request.to,
        
        // Case metadata
        status: 'active' as const,
        createdAt: admin.firestore.Timestamp.now(),
        createdAtIso: timestamp,
        updatedAt: admin.firestore.Timestamp.now(),
        updatedAtIso: timestamp,
        
        // Processing steps tracking
        stepsCompleted: [],
        currentStep: 'analysis',
        
        // Results placeholders (to be filled by subsequent services)
        analysis: null,
        agentPromptAnalysis: null,
        ragAnalysis: null,
        response: null,
        
        version: '1.0'
      };

      // Save case to Firestore
      const caseRef = firestore
        .collection('tenants').doc(request.tenantId)
        .collection('agents').doc(request.agentId)
        .collection('cases').doc(caseId);

      await caseRef.set(caseData);

      console.log(` Case created successfully: ${caseNumber}`);

      return {
        caseId,
        caseNumber,
        tenantId: request.tenantId,
        agentId: request.agentId,
        contactId: request.contactId,
        timestamp,
        status: 'active'
      };

    } catch (error) {
      console.error('Error generating case:', error);
      throw new Error(`Failed to generate case: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update case status and current step
   */
  async updateCaseStatus(
    tenantId: string,
    agentId: string,
    caseId: string,
    status: 'active' | 'completed' | 'failed',
    currentStep?: string,
    completedStep?: string
  ): Promise<void> {
    try {
      const caseRef = firestore
        .collection('tenants').doc(tenantId)
        .collection('agents').doc(agentId)
        .collection('cases').doc(caseId);

      const updateData: any = {
        status,
        updatedAt: admin.firestore.Timestamp.now(),
        updatedAtIso: new Date().toISOString()
      };

      if (currentStep) {
        updateData.currentStep = currentStep;
      }

      if (completedStep) {
        updateData.stepsCompleted = admin.firestore.FieldValue.arrayUnion(completedStep);
      }

      await caseRef.update(updateData);

      console.log(`= Case ${caseId} status updated: ${status}${currentStep ? ` (step: ${currentStep})` : ''}`);

    } catch (error) {
      console.error('Error updating case status:', error);
      throw new Error(`Failed to update case status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get case information
   */
  async getCase(
    tenantId: string,
    agentId: string,
    caseId: string
  ): Promise<any | null> {
    try {
      const caseRef = firestore
        .collection('tenants').doc(tenantId)
        .collection('agents').doc(agentId)
        .collection('cases').doc(caseId);

      const caseSnapshot = await caseRef.get();

      if (!caseSnapshot.exists) {
        return null;
      }

      return caseSnapshot.data();

    } catch (error) {
      console.error('Error retrieving case:', error);
      return null;
    }
  }

  /**
   * Update case with analysis results
   */
  async updateCaseAnalysis(
    tenantId: string,
    agentId: string,
    caseId: string,
    analysisData: {
      analysis?: string;
      ragNeeded?: boolean;
      kbDocumentIds?: string[];
      ragAnalysis?: string;
      documentContexts?: any[];
      agentPromptAnalysis?: string;
      response?: string;
      sentMessageId?: string;
      sentAt?: string;
      sentTo?: string;
      sentFrom?: string;
      conversationHistory?: any; // Add conversation history support
      contactProfile?: any; // NEW: AI-learned contact profile
      promptContext?: any; // NEW: Pre-formatted prompt sections
      trainingMessageId?: string; // Training message ID
      trainingSessionId?: string; // Training session ID
      savedAt?: string; // Training save timestamp
    }
  ): Promise<void> {
    try {
      const caseRef = firestore
        .collection('tenants').doc(tenantId)
        .collection('agents').doc(agentId)
        .collection('cases').doc(caseId);

      const updateData: any = {
        ...analysisData,
        updatedAt: admin.firestore.Timestamp.now(),
        updatedAtIso: new Date().toISOString()
      };

      await caseRef.update(updateData);

      console.log(`= Case ${caseId} analysis updated`);

    } catch (error) {
      console.error('Error updating case analysis:', error);
      throw new Error(`Failed to update case analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const generateCaseNumberService = new GenerateCaseNumberService();