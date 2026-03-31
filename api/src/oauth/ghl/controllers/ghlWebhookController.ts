import { Request, Response } from 'express';

export const ghlWebhookController = {
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { type, locationId, messageType, body } = req.body;

      console.log('[GHL Webhook]', { type, locationId, messageType, body });

      // TODO: Process webhooks (add logic later)

      res.status(200).json({ received: true });
    } catch (error) {
      console.error('[GHL Webhook] Error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  },
};
