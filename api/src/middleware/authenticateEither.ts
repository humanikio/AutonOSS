/**
 * Dual Authentication Middleware
 * Accepts EITHER Firebase JWT OR API Key authentication
 *
 * Priority:
 * 1. Try API Key validation (accessKeyId.apiSecret format)
 * 2. Fall back to Firebase JWT validation
 * 3. If both fail, return 401
 *
 * Both methods set req.tenantId for consistent tenant scoping
 */

import { Request, Response, NextFunction } from 'express';
import { validateApiKey } from '../apiKeys/services/apiKeysCrudManager';
import { adminAuth, firestore } from '../config/firebase';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      apiKeyId?: string;
      user?: {
        uid: string;
        email?: string;
        tenantId?: string;
        role?: string;
        permissions?: string[];
      };
      userId?: string;
      authMethod?: 'api_key' | 'firebase_jwt';
    }
  }
}

/**
 * Middleware that accepts both Firebase JWT and API Key authentication
 * Tries API key first, then falls back to Firebase JWT
 */
export async function authenticateEither(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing Authorization header',
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid Authorization header format. Expected: Bearer <token_or_api_key>',
      timestamp: new Date().toISOString()
    });
    return;
  }

  const token = authHeader.replace('Bearer ', '').trim();

  if (!token) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Token or API key is required',
      timestamp: new Date().toISOString()
    });
    return;
  }

  // Try API Key authentication first (if it contains a dot, it's likely an API key)
  if (token.includes('.') && token.startsWith('plkey_')) {
    try {
      const { valid, tenantId, apiKeyId } = await validateApiKey(token);

      if (valid && tenantId) {
        // API Key validation successful
        req.tenantId = tenantId;
        req.apiKeyId = apiKeyId;
        req.authMethod = 'api_key';

        console.log(`🔑 API Key authentication successful for tenant ${tenantId}`);
        next();
        return;
      }
    } catch (error) {
      console.error('API Key validation error:', error);
      // Fall through to try Firebase JWT
    }
  }

  // Try Firebase JWT authentication
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);

    // Get user info from Firestore
    try {
      const userDoc = await firestore.collection('users').doc(decodedToken.uid).get();

      if (!userDoc.exists) {
        res.status(401).json({
          success: false,
          error: 'User not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const userData = userDoc.data();

      // Determine which tenant to use - prioritize selectedTenant for multi-tenant support
      const currentTenantId = userData?.selectedTenant || userData?.tenantId;

      console.log(`🔐 Firebase JWT authentication successful - User: ${decodedToken.uid}, Tenant: ${currentTenantId}`);

      // Add user info to request
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        tenantId: currentTenantId,
        role: userData?.role,
        permissions: userData?.permissions || []
      };
      req.tenantId = currentTenantId;
      req.userId = decodedToken.uid;
      req.authMethod = 'firebase_jwt';

      next();
      return;
    } catch (firestoreError) {
      console.error('Error fetching user data:', firestoreError);
      res.status(401).json({
        success: false,
        error: 'User data not found',
        timestamp: new Date().toISOString()
      });
      return;
    }

  } catch (error: any) {
    console.error('Authentication error:', error);

    // Provide specific error messages
    if (error.code === 'auth/id-token-expired') {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Token expired',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (error.code === 'auth/argument-error' || error.code === 'auth/id-token-revoked') {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token or API key',
        timestamp: new Date().toISOString()
      });
      return;
    }

    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication failed - invalid token or API key',
      timestamp: new Date().toISOString()
    });
  }
}
