/**
 * API Key Validation Middleware
 * Validates API keys from Authorization header and attaches tenantId to request
 *
 * Flow:
 * 1. Extract API key from Authorization header (format: Bearer accessKeyId.apiSecret)
 * 2. Validate key by splitting on '.' and looking up accessKeyId in /autonApiKeys/{accessKeyId}
 * 3. Compare encrypted secrets
 * 4. Extract tenantId from the mapping document
 * 5. Attach req.tenantId and req.apiKeyId for use in endpoint handlers
 *
 * This allows endpoints to be tenant-scoped without passing tenantId in the URL.
 * The tenant scope is derived from the API key itself.
 */

import { Request, Response, NextFunction } from 'express';
import { validateApiKey as validateKey } from '../apiKeys/services/apiKeysCrudManager';

// Extend Express Request type to include tenantId and apiKeyId
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      apiKeyId?: string;
    }
  }
}

/**
 * Middleware to validate API key from Authorization header
 *
 * Usage: router.post('/endpoint', validateApiKeyMiddleware, handler)
 *
 * After validation, req.tenantId will be available in the endpoint handler
 */
export async function validateApiKeyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing Authorization header'
    });
    return;
  }

  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid Authorization header format. Expected: Bearer <accessKeyId.apiSecret>'
    });
    return;
  }

  const rawKey = authHeader.replace('Bearer ', '').trim();

  if (!rawKey) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'API key is required'
    });
    return;
  }

  const { valid, tenantId, apiKeyId } = await validateKey(rawKey);

  if (!valid || !tenantId) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired API key'
    });
    return;
  }

  // Attach to request for downstream use
  req.tenantId = tenantId;
  req.apiKeyId = apiKeyId;

  console.log(`🔐 Request authenticated for tenant ${tenantId}`);

  next();
}
