/**
 * Milestone Service Key Validation Middleware
 *
 * Simple shared secret validation for internal n8n -> backend communication.
 * This middleware ONLY protects the event lifecycle milestone endpoint.
 *
 * The service key is stored in:
 * - Backend .env as MILESTONE_SERVICE_KEY
 * - n8n workflow as an environment variable or credential
 */

import { Request, Response, NextFunction } from 'express';

const MILESTONE_SERVICE_KEY = process.env.MILESTONE_SERVICE_KEY;

/**
 * Validates the X-Milestone-Service-Key header against the stored secret.
 * This is a simple shared secret for service-to-service authentication.
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Next middleware function
 */
export function validateMilestoneServiceKey(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const serviceKey = req.headers['x-milestone-service-key'] as string;

  // Check if service key is configured
  if (!MILESTONE_SERVICE_KEY) {
    console.error('MILESTONE_SERVICE_KEY not configured in environment');
    res.status(500).json({
      success: false,
      error: 'Service configuration error'
    });
    return;
  }

  // Check if service key is provided
  if (!serviceKey) {
    console.warn('Missing X-Milestone-Service-Key header');
    res.status(401).json({
      success: false,
      error: 'Unauthorized - Missing service key'
    });
    return;
  }

  // Validate service key (constant-time comparison would be ideal but not critical here)
  if (serviceKey !== MILESTONE_SERVICE_KEY) {
    console.warn('Invalid milestone service key provided');
    res.status(401).json({
      success: false,
      error: 'Unauthorized - Invalid service key'
    });
    return;
  }

  // Service key valid - proceed
  console.log('Milestone service key validated successfully');
  next();
}
