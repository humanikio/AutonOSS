/**
 * Require Firebase JWT Middleware
 * Ensures the request was authenticated with Firebase JWT, not API key
 *
 * Use this for routes that should ONLY accept Firebase authentication:
 * - API key management (users shouldn't manage keys with keys)
 * - Sensitive admin operations
 * - User profile management
 */

import { Request, Response, NextFunction } from 'express';

export function requireFirebaseAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Check if request was authenticated (should be if authenticateEither ran)
  if (!req.tenantId || !req.authMethod) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required',
      timestamp: new Date().toISOString()
    });
    return;
  }

  // Ensure it was Firebase JWT, not API key
  if (req.authMethod !== 'firebase_jwt') {
    res.status(403).json({
      error: 'Forbidden',
      message: 'This endpoint requires Firebase authentication. API keys are not allowed.',
      timestamp: new Date().toISOString()
    });
    return;
  }

  next();
}
