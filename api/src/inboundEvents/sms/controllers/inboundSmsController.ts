import { Request, Response } from 'express';
import twilio from 'twilio';
import { newRequestHandler } from '../services/newRequestHandler';

// Twilio SMS webhook payload interface
interface TwilioSmsWebhook {
  MessageSid: string;
  SmsSid: string;
  AccountSid: string;
  MessagingServiceSid?: string;
  From: string;
  To: string;
  Body: string;
  NumMedia?: string;
  MediaUrl0?: string;
  MediaUrl1?: string;
  MediaUrl2?: string;
  MediaUrl3?: string;
  MediaUrl4?: string;
  MediaUrl5?: string;
  MediaUrl6?: string;
  MediaUrl7?: string;
  MediaUrl8?: string;
  MediaUrl9?: string;
  MediaContentType0?: string;
  MediaContentType1?: string;
  MediaContentType2?: string;
  MediaContentType3?: string;
  MediaContentType4?: string;
  MediaContentType5?: string;
  MediaContentType6?: string;
  MediaContentType7?: string;
  MediaContentType8?: string;
  MediaContentType9?: string;
  FromCity?: string;
  FromState?: string;
  FromZip?: string;
  FromCountry?: string;
  ToCity?: string;
  ToState?: string;
  ToZip?: string;
  ToCountry?: string;
  SmsMessageSid?: string;
  SmsStatus?: string;
  NumSegments?: string;
  ReferralNumMedia?: string;
  OptOutType?: string;
  ApiVersion?: string;
}

export class InboundSmsController {
  /**
   * Handle incoming SMS webhook from Twilio
   */
  async handleIncomingSms(req: Request, res: Response) {
    try {
      const smsData: TwilioSmsWebhook = req.body;
      
      console.log('Controller: Incoming SMS received');
      
      // Map and debug the data structure
      await newRequestHandler.mapSmsData(smsData);
      
      // Process the complete SMS flow (tenant resolution, contact creation, conversation management)
      await newRequestHandler.handleCompleteSmsFlow(smsData);
      
      console.log('Controller: SMS processing completed successfully');

      // Respond with TwiML (Twilio Markup Language)
      // Empty response = no reply SMS sent back
      res.type('text/xml');
      res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>`);

    } catch (error) {
      console.error('Controller: Error processing incoming SMS:', error);
      
      // Even on error, return 200 to prevent Twilio retries
      // Log the error for monitoring
      res.type('text/xml');
      res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>`);
    }
  }

  /**
   * Validate Twilio webhook signature
   * This should be used as middleware before processing webhooks
   */
  validateTwilioSignature(req: Request, res: Response, next: Function) {
    // Skip validation in development/test environments
    if (process.env.NODE_ENV === 'development' || process.env.SKIP_TWILIO_VALIDATION === 'true') {
      return next();
    }

    const twilioSignature = req.headers['x-twilio-signature'] as string;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!authToken) {
      console.error('TWILIO_AUTH_TOKEN not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    if (!twilioSignature) {
      console.error('Missing Twilio signature header');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Construct the full URL
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['host'];
    const url = `${protocol}://${host}${req.originalUrl}`;

    // Validate the request came from Twilio
    const isValid = twilio.validateRequest(
      authToken,
      twilioSignature,
      url,
      req.body
    );

    if (!isValid) {
      console.error('Invalid Twilio signature');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    next();
  }
}

export const inboundSmsController = new InboundSmsController();