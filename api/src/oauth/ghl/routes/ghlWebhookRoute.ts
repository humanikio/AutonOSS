import express from 'express';
import { ghlWebhookController } from '../controllers/ghlWebhookController';

const router = express.Router();

router.post('/webhooks', ghlWebhookController.handleWebhook);

export default router;
