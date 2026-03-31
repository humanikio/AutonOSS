/**
 * Case Number Manager
 * Manages CRUD operations for AI processing cases
 *
 * Firestore path: tenants/{tenantId}/workflows/{workflowId}/AiProcessingCases/{caseId}
 */

export { createCaseNumber } from './caseNumberManager/createCaseNumber';
export { updateCaseNumber } from './caseNumberManager/updateCaseNumber';
export { getCaseNumbers, getCaseNumber } from './caseNumberManager/getCaseNumbers';
export { deleteCaseNumber } from './caseNumberManager/deleteCaseNumber';
