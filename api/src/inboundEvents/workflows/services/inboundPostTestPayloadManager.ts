import { generateTestUrl } from './inboundPostTestPayload/generateTestUrl';
import { getActiveTestUrl } from './inboundPostTestPayload/getActiveTestUrl';
import { processNewRequest } from './inboundPostTestPayload/processNewRequest';
import { getLatestTestPayload } from './inboundPostTestPayload/getLatestTestPayload';

/**
 * Manager service that orchestrates test webhook operations
 * Coordinates between individual services to handle test URL generation,
 * payload processing, and retrieval
 */
export const inboundPostTestPayloadManager = {
  /**
   * Generate a new test URL for a workflow
   * Overwrites any existing test URL
   */
  async generateTestUrl(tenantId: string, workflowId: string) {
    return await generateTestUrl(tenantId, workflowId);
  },

  /**
   * Get the active test URL for a workflow
   * Returns null if no test URL exists
   */
  async getActiveTestUrl(tenantId: string, workflowId: string) {
    return await getActiveTestUrl(tenantId, workflowId);
  },

  /**
   * Process a new test payload received at the public webhook
   * Stores the payload in Firestore for later retrieval
   */
  async processNewRequest(url: string, payload: any) {
    return await processNewRequest(url, payload);
  },

  /**
   * Get the most recent test payload received for a workflow
   * Returns null if no payloads have been received
   */
  async getLatestTestPayload(tenantId: string, workflowId: string) {
    return await getLatestTestPayload(tenantId, workflowId);
  },
};
