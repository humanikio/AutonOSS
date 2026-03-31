// Main orchestrator
export { 
  update11LabsKnowledgeBase,
  type Update11LabsKnowledgeBaseRequest,
  type Update11LabsKnowledgeBaseResult 
} from './update11LabsKnowledgeBase';

// Firestore operations
export {
  checkFirestoreForID,
  updateFirestoreWith11LabsId,
  updateFirestoreWith11LabsIdArray,
  type FirestoreDocumentCheck
} from './checkFirestoreForID';

// 11Labs API operations
export {
  create11LabsKBDocument,
  type Create11LabsKBDocumentRequest,
  type Create11LabsKBDocumentResponse
} from './create11LabsKbDocument';

export {
  deleteOld11LabsDoc,
  type Delete11LabsDocumentOptions
} from './editExisting/deleteOld11LabsDoc';

// Agent management operations
export {
  findConnectedAgents,
  getConnectedAgentsSummary,
  type ConnectedAgent,
  type FindConnectedAgentsResponse,
  type FindConnectedAgentsOptions
} from './editExisting/findConnectedAgents';

export {
  connectToExistingAgents,
  validateAgentUpdatePayload,
  type AgentKnowledgeBaseItem,
  type AgentUpdateRequest,
  type ConnectToExistingAgentsResult
} from './editExisting/connectToExistingAgents';