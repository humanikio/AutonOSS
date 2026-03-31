import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a unique conversation ID for inbound calls
 * This ID will be used to track the call through the post-call webhook
 * and resolve back to the correct tenant/contact mapping
 */
export function generateInboundConversationId(): string {
  // Use a prefix to distinguish from ElevenLabs conversation IDs
  const prefix = 'inbound';
  const uuid = uuidv4();
  
  // Format: inbound_<uuid>
  const conversationId = `${prefix}_${uuid}`;
  
  console.log(`🆔 Generated inbound conversation ID: ${conversationId}`);
  
  return conversationId;
}