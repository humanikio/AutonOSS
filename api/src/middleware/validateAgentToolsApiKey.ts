/**
 * Agent Tools API Key Validation Middleware
 *
 * Simple shared secret validation for 11Labs -> Auton backend communication.
 * This middleware protects the agent tools webhook endpoint.
 *
 * The API key is stored in:
 * - Backend .env as ELEVENLABS_AGENT_TOOLS_API_KEY
 * - 11Labs tool config as Authorization header (Bearer token)
 *
 * Additionally extracts routing headers:
 * - X-Tenant-Id
 * - X-Agent-Id
 * - X-Tool-Id
 */

import { Request, Response, NextFunction } from 'express';

// Extend Express Request interface for agent tools
declare global {
  namespace Express {
    interface Request {
      agentId?: string;
      toolId?: string;
    }
  }
}

const AGENT_TOOLS_API_KEY = process.env.ELEVENLABS_AGENT_TOOLS_API_KEY;

/**
 * Validates the Authorization header (Bearer token) against the stored secret.
 * Extracts tenantId, agentId, toolId from custom headers.
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Next middleware function
 */
export function validateAgentToolsApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'] as string;
  const tenantId = req.headers['x-tenant-id'] as string;
  const agentId = req.headers['x-agent-id'] as string;
  const toolId = req.headers['x-tool-id'] as string;

  // Check if API key is configured
  if (!AGENT_TOOLS_API_KEY) {
    console.error('ELEVENLABS_AGENT_TOOLS_API_KEY not configured in environment');
    res.status(500).json({
      success: false,
      error: 'Service configuration error'
    });
    return;
  }

  // Check if Authorization header is provided
  if (!authHeader) {
    console.warn('Missing Authorization header');
    res.status(401).json({
      success: false,
      error: 'Unauthorized - Missing authorization'
    });
    return;
  }

  // Extract Bearer token
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    console.warn('Invalid Authorization header format (expected: Bearer <token>)');
    res.status(401).json({
      success: false,
      error: 'Unauthorized - Invalid authorization format'
    });
    return;
  }

  // Validate API key
  if (token !== AGENT_TOOLS_API_KEY) {
    console.warn('Invalid agent tools API key provided');
    res.status(401).json({
      success: false,
      error: 'Unauthorized - Invalid API key'
    });
    return;
  }

  // Validate required routing headers
  if (!tenantId || !agentId || !toolId) {
    console.warn('Missing required routing headers:', { tenantId, agentId, toolId });
    res.status(400).json({
      success: false,
      error: 'Bad Request - Missing routing headers (X-Tenant-Id, X-Agent-Id, X-Tool-Id)'
    });
    return;
  }

  // API key valid - attach routing info to request
  req.tenantId = tenantId;
  req.agentId = agentId;
  req.toolId = toolId;

  console.log('Agent tools API key validated successfully', { tenantId, agentId, toolId });
  next();
}
