import express from 'express';
import multer from 'multer';
import { mailgunInboundController } from '../controllers/mailgunInboundController';

const router = express.Router();

/**
 * Configure multer to handle file uploads in memory
 * Mailgun sends attachments as multipart form-data
 */
const upload = multer({
  storage: multer.memoryStorage(), // Store files in memory as Buffer
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max file size (Mailgun limit)
    files: 10 // Max 10 files per request
  }
});

/**
 * POST /webhook/email/inbound
 * Mailgun global inbound email webhook endpoint
 *
 * This endpoint receives all inbound emails for verified domains
 * Mailgun will POST email data here when a route matches
 *
 * Uses multer to handle file attachments from multipart form-data
 * No authentication middleware - authentication is done via webhook signature
 */
router.post(
  '/inbound',
  upload.any(), // Accept any number of files with any field names
  mailgunInboundController.handleIncomingEmail.bind(mailgunInboundController)
);

export default router;
