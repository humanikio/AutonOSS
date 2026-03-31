import { Router, Request, Response, NextFunction } from 'express';
import { smsAgentController } from '../controllers/smsAgentController';

const router = Router();

// Debug middleware to log incoming requests
const debugInboundSms = (req: Request, res: Response, next: NextFunction) => {
  console.log('> Agent SMS Inbound - Request received:');
  console.log('=� Headers:', JSON.stringify(req.headers, null, 2));
  console.log('=� Body:', JSON.stringify(req.body, null, 2));
  console.log('< URL:', req.originalUrl);
  console.log('= Method:', req.method);
  console.log('� Timestamp:', new Date().toISOString());
  console.log('=====================================');
  next();
};

// Debug middleware to log outbound SMS requests
const debugOutboundSms = (req: Request, res: Response, next: NextFunction) => {
  console.log('> Agent SMS Outbound - Request received:');
  console.log('=📋 Headers:', JSON.stringify(req.headers, null, 2));
  console.log('=📋 Body:', JSON.stringify(req.body, null, 2));
  console.log('📤 URL:', req.originalUrl);
  console.log('📤 Method:', req.method);
  console.log('⏰ Timestamp:', new Date().toISOString());
  console.log('=====================================');
  next();
};

/**
 * POST /api/agent-communication/sms/inbound
 * Endpoint for receiving inbound SMS messages to be processed by agents
 * 
 * Expected payload:
 * {
 *   messageContent: string;      // The inbound SMS message content
 *   tenantId: string;           // Tenant identifier
 *   contactId: string;          // Contact who sent the message
 *   agentId: string;            // Agent to process the message
 *   action: string;             // Action type for routing
 *   destinationKey?: string;    // Optional destination webhook key for routing
 *   messageId?: string;         // Message identifier (e.g., Twilio MessageSid)
 *   from?: string;              // Sender phone number
 *   to?: string;                // Recipient phone number (agent's number)
 *   conversationId?: string;    // Existing conversation ID
 *   messagingServiceId?: string; // Twilio messaging service ID
 *   timestamp?: string;         // When message was received
 *   mediaUrls?: string[];       // Media attachments
 *   mediaTypes?: string[];      // Media content types
 *   messageStatus?: string;     // Message status
 *   agentPhoneNumber?: string;  // Agent's phone number
 *   agentPhoneNumberSid?: string; // Twilio SID for agent's number
 *   agentSettings?: {           // Agent configuration
 *     language?: string;
 *     processingMode?: string;
 *     responseDelay?: number;
 *   };
 * }
 */
router.post(
  '/inbound',
  debugInboundSms,
  smsAgentController.handleInboundAgentSms.bind(smsAgentController)
);

/**
 * POST /api/agent-communication/sms/outbound
 * Endpoint for processing outbound SMS messages initiated by agents
 * 
 * Expected payload:
 * {
 *   tenantId: string;           // Tenant identifier
 *   agentId: string;            // Agent initiating the message
 *   contactId?: string;         // Target contact ID (if known)
 *   targetPhoneNumber?: string; // Target phone number (if contactId unknown)
 *   action: string;             // Action type triggering the outbound message
 *   actionId?: string;          // Specific action ID for context
 *   destinationKey?: string;    // Optional destination webhook key for routing
 *   messageContent?: string;    // Optional custom message content
 *   conversationId?: string;    // Existing conversation ID
 *   agentSettings?: {           // Agent configuration
 *     language?: string;
 *     processingMode?: string;
 *     responseDelay?: number;
 *   };
 *   // Contact creation fields (for auto-creation if needed)
 *   full_name?: string;         // Full name for contact creation
 *   first_name?: string;        // First name for contact creation
 *   last_name?: string;         // Last name for contact creation
 *   email?: string;             // Email for contact creation
 *   customData?: any;           // Additional context data
 * }
 */
router.post(
  '/outbound',
  debugOutboundSms,
  smsAgentController.handleOutboundAgentSms.bind(smsAgentController)
);

/**
 * GET /api/agent-communication/sms/health
 * Health check endpoint
 */
router.get('/health', (_, res) => {
  res.json({
    status: 'OK',
    service: 'agent-communication-sms',
    timestamp: new Date().toISOString()
  });
});

export default router;