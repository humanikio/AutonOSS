import { Request, Response } from 'express';
import { sendSmsService } from '../services/sendSms';
import { findOrCreateConversation } from '../../../contacts/utilities/conversationUtil';
import { resolveContactPhone } from '../utils/resolveContactPhone';
import { ContactFinder } from '../../../contacts/utilities/findContact';

export interface SendSmsRequest {
  contactId?: string; // Optional - either contactId or to must be provided
  conversationId?: string; // Optional - will be auto-resolved from contactId if not provided
  phoneNumber: string; // The from phone number
  message: string;
  to?: string; // Optional - either contactId or to must be provided
  agentId?: string; // Optional agent ID for agent-sent messages
  userId?: string; // Optional user ID for user-sent messages
}

class SmsController {
  async sendSms(req: Request, res: Response): Promise<void> {
    try {
      // Get tenantId from middleware (injected from API key)
      const tenantId = (req as any).tenantId;
      const { contactId, conversationId, phoneNumber, message, to, agentId, userId }: SendSmsRequest = req.body;

      // Debug logging to see what's being received
      console.log('📨 SMS Send Request Body:', JSON.stringify(req.body, null, 2));
      console.log('📨 Authenticated User:', (req as any).user?.uid);
      console.log('📨 Provided userId:', userId);
      console.log('📨 TenantId from middleware:', tenantId);

      // Validate required fields
      if (!tenantId || !phoneNumber || !message) {
        res.status(400).json({
          error: 'Missing required fields',
          required: ['tenantId', 'phoneNumber', 'message']
        });
        return;
      }

      // Validate that to is provided
      if (!to) {
        res.status(400).json({
          error: 'Missing required field: to (phone number or contact ID)'
        });
        return;
      }

      // If no userId is provided in the request body, use the authenticated user's ID
      const senderUserId = userId || (req as any).user?.uid;
      console.log('📨 Final senderUserId:', senderUserId);

      // Detect if 'to' is a contact ID (UUID format) or phone number
      const isContactId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(to);

      // Resolve contactId and phone number based on what was provided
      let resolvedContactId = contactId;
      let resolvedTo = to;

      if (isContactId) {
        // Scenario 1: 'to' is a contact ID - resolve phone from contact
        console.log(`📞 'to' field contains contact ID: ${to} - resolving phone number...`);
        try {
          resolvedTo = await resolveContactPhone(tenantId, to);
          resolvedContactId = to;
          console.log(`📞 Resolved phone number from contact: ${resolvedTo}`);
        } catch (error) {
          res.status(400).json({
            error: 'Failed to resolve phone number',
            details: error instanceof Error ? error.message : `Contact ${to} has no phone number`
          });
          return;
        }
      } else {
        // Scenario 2: 'to' is a phone number
        // If contactId was provided in request, USE IT (don't do phone lookup that might find duplicates)
        if (contactId) {
          console.log(`📞 ContactId provided (${contactId}), using it with phone number ${to}`);
          resolvedContactId = contactId;
          resolvedTo = to;
        } else {
          // Only do phone lookup if no contactId was provided
          console.log(`📞 'to' field contains phone number: ${to} - finding or creating contact...`);
          try {
            const contactFinder = new ContactFinder();
            resolvedContactId = await contactFinder.findOrCreateContact({
              tenantId,
              channel: 'SMS',
              address: to
            });
            resolvedTo = to;
            console.log(`📞 Found/created contact: ${resolvedContactId}`);
          } catch (error) {
            res.status(400).json({
              error: 'Failed to find or create contact',
              details: error instanceof Error ? error.message : 'Unable to resolve contact from phone number'
            });
            return;
          }
        }
      }

      // Auto-resolve conversationId from contactId if not provided
      let resolvedConversationId = conversationId;
      if (!resolvedConversationId) {
        console.log('📍 No conversationId provided, auto-resolving from contactId...');
        resolvedConversationId = await findOrCreateConversation(tenantId, resolvedContactId!);
        console.log(`📍 Auto-resolved conversationId: ${resolvedConversationId}`);
      }

      // Send SMS via service
      const result = await sendSmsService.sendMessage({
        tenantId,
        contactId: resolvedContactId!,
        conversationId: resolvedConversationId,
        phoneNumber,
        message,
        to: resolvedTo!,
        agentId,
        userId: senderUserId
      });

      res.status(200).json({
        success: true,
        messageId: result.messageId,
        conversationId: result.conversationId,
        message: 'SMS sent successfully'
      });

    } catch (error) {
      console.error('Error sending SMS:', error);
      res.status(500).json({
        error: 'Failed to send SMS',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const smsController = new SmsController();