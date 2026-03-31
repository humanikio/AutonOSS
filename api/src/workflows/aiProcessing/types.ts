import { Timestamp } from 'firebase-admin/firestore';

/**
 * Case status types
 */
export type CaseStatus = 'pending' | 'complete' | 'failed';

/**
 * AI Processing Case - Firestore document structure
 * Path: tenants/{tenantId}/workflows/{workflowId}/AiProcessingCases/{caseId}
 */
export interface AIProcessingCase {
  id: string;
  workflowId: string;
  nodeId: string;                    // Required - node.id from ReactFlow (e.g., "action-1736688123456")
  nodeName?: string;                 // Optional - node type for filtering (e.g., "aiProcessing")
  prompt: string;                    // User's input prompt
  systemPrompt?: string;             // Optional system instructions
  status: CaseStatus;
  response?: string;                 // Claude's output
  error?: string;                    // Error message if failed
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  completedAt?: Timestamp | Date;    // When processing finished
  // Optional metadata for analytics
  tokensUsed?: number;
  processingTimeMs?: number;
  modelUsed?: string;
}

/**
 * Request to process AI prompt
 * POST /api/workflows/ai-processing/process
 */
export interface ProcessAIRequest {
  workflowId: string;      // Required - which workflow this belongs to
  nodeId: string;          // Required - which node instance made the request
  nodeName?: string;       // Optional - node type (for filtering)
  contactId: string;       // Required - contact ID for variable injection
  prompt: string;          // Required - user's prompt
  systemPrompt?: string;   // Optional - system instructions for Claude
}

/**
 * Response from process endpoint
 */
export interface ProcessAIResponse {
  caseId: string;          // Generated case ID for tracking
  response: string;        // Claude's response
}

/**
 * Request to create a case (internal use)
 */
export interface CreateCaseRequest {
  workflowId: string;
  nodeId: string;
  nodeName?: string;
  prompt: string;
  systemPrompt?: string;
}

/**
 * Request to update a case (internal use)
 */
export interface UpdateCaseRequest {
  status?: CaseStatus;
  response?: string;
  error?: string;
  tokensUsed?: number;
  processingTimeMs?: number;
  modelUsed?: string;
}

/**
 * Query parameters for getting cases
 */
export interface GetCasesQuery {
  workflowId: string;      // Required
  nodeId: string;          // Required
  nodeName?: string;       // Optional filter
}

/**
 * Service response wrapper
 */
export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
