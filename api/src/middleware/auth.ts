import { Request, Response, NextFunction } from 'express';
import { adminAuth, firestore } from '../config/firebase';

// Firebase User info interface
interface FirebaseUser {
  uid: string;
  email?: string;
  tenantId?: string;
  role?: string;
  permissions?: string[];
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: FirebaseUser;
      tenantId?: string;
      userId?: string;
    }
  }
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access token required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Verify Firebase ID token
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
      
      console.log(`🔍 Auth middleware - User: ${decodedToken.uid}, Base tenantId: ${userData?.tenantId}, Selected tenant: ${userData?.selectedTenant}, Using: ${currentTenantId}`);
      
      // Add user info to request
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        tenantId: currentTenantId,
        role: userData?.role,
        permissions: userData?.permissions || []
      };
      req.tenantId = currentTenantId;
      req.userId = decodedToken.uid; // Add userId for easy access

      next();
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
    
    if (error.code === 'auth/id-token-expired') {
      res.status(401).json({
        success: false,
        error: 'Token expired',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (error.code === 'auth/argument-error' || error.code === 'auth/id-token-revoked') {
      res.status(401).json({
        success: false,
        error: 'Invalid token',
        timestamp: new Date().toISOString()
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Authentication error',
      timestamp: new Date().toISOString()
    });
  }
};

export const requirePermissions = (permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const userPermissions = req.user.permissions || [];
    const hasPermission = permissions.some(permission => 
      userPermissions.includes(permission) || userPermissions.includes('all')
    );

    if (!hasPermission) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        required: permissions,
        userPermissions,
        timestamp: new Date().toISOString()
      });
      return;
    }

    next();
  };
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (!req.user.role || !roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient role privileges',
        required: roles,
        userRole: req.user.role,
        timestamp: new Date().toISOString()
      });
      return;
    }

    next();
  };
};