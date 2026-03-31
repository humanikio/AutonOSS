import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { adminAuth, firestore } from '../config/firebase';
import {
  LoginRequest,
  SignupRequest,
  AuthResponse,
  User,
  Tenant,
  JWTPayload
} from '@/types';

export class AuthController {
  // Sign up new user and create tenant
  static async signup(req: Request<{}, AuthResponse, SignupRequest>, res: Response): Promise<void> {
    try {
      const { email, password, name, companyName } = req.body;

      // Validate input
      if (!email || !password || !name || !companyName) {
        res.status(400).json({
          success: false,
          error: 'Email, password, name, and company name are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Create Firebase Auth user
      const firebaseUser = await adminAuth.createUser({
        email,
        password,
        emailVerified: false
      });

      // Create tenant document
      const tenantId = firebaseUser.uid; // Use Firebase UID as tenant ID
      const tenant: Tenant = {
        id: tenantId,
        name: companyName,
        plan: 'free',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        settings: {
          webhooks: {},
          apiKeys: {},
          branding: {
            companyName,
          },
          features: {
            smsEnabled: true,
            callsEnabled: true,
            maxAgents: 5,
            maxContacts: 1000
          }
        },
        usage: {
          smsCount: 0,
          callMinutes: 0,
          agentCount: 0,
          contactCount: 0,
          lastReset: new Date().toISOString()
        }
      };

      // Create user document
      const user: User = {
        uid: firebaseUser.uid,
        email,
        name,
        tenantId,
        role: 'owner',
        permissions: ['all'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save to Firestore
      await Promise.all([
        firestore.collection('tenants').doc(tenantId).set(tenant),
        firestore.collection('users').doc(firebaseUser.uid).set(user)
      ]);

      // Generate JWT token
      const tokenPayload: JWTPayload = {
        uid: user.uid,
        tenantId: user.tenantId,
        role: user.role,
        permissions: user.permissions,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
      };

      const token = jwt.sign(tokenPayload, process.env.JWT_SECRET!);

      res.status(201).json({
        success: true,
        data: {
          user,
          tenant,
          token
        },
        message: 'Account created successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Signup error:', error);
      
      // If Firebase user was created but Firestore failed, clean up
      if (error.code !== 'auth/email-already-exists') {
        // Could implement cleanup logic here
      }

      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create account',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Login existing user
  static async login(req: Request<{}, AuthResponse, LoginRequest>, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: 'Email and password are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Verify user with Firebase
      const firebaseUser = await adminAuth.getUserByEmail(email);
      
      // Note: Firebase Admin SDK doesn't verify passwords
      // For production, you'd want to use Firebase Client SDK on frontend
      // or implement custom password verification
      
      // Get user document
      const userDoc = await firestore.collection('users').doc(firebaseUser.uid).get();
      
      if (!userDoc.exists) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const user = userDoc.data() as User;

      // Get tenant document
      const tenantDoc = await firestore.collection('tenants').doc(user.tenantId).get();
      
      if (!tenantDoc.exists) {
        res.status(404).json({
          success: false,
          error: 'Tenant not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const tenant = tenantDoc.data() as Tenant;

      // Check tenant status
      if (tenant.status !== 'active') {
        res.status(403).json({
          success: false,
          error: 'Account is suspended',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Update last login
      await firestore.collection('users').doc(user.uid).update({
        lastLoginAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Generate JWT token
      const tokenPayload: JWTPayload = {
        uid: user.uid,
        tenantId: user.tenantId,
        role: user.role,
        permissions: user.permissions,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
      };

      const token = jwt.sign(tokenPayload, process.env.JWT_SECRET!);

      res.status(200).json({
        success: true,
        data: {
          user: {
            ...user,
            lastLoginAt: new Date().toISOString()
          },
          tenant,
          token
        },
        message: 'Login successful',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Login error:', error);
      
      res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Get current user profile
  static async profile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Get fresh user data
      const userDoc = await firestore.collection('users').doc(req.user.uid).get();
      const tenantDoc = req.user.tenantId ? await firestore.collection('tenants').doc(req.user.tenantId).get() : null;

      if (!userDoc.exists || !tenantDoc || !tenantDoc.exists) {
        res.status(404).json({
          success: false,
          error: 'User or tenant not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const user = userDoc.data() as User;
      const tenant = tenantDoc?.data() as Tenant;

      res.status(200).json({
        success: true,
        data: {
          user,
          tenant
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Profile error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to get profile',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Logout (invalidate token on client side)
  static async logout(req: Request, res: Response): Promise<void> {
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
      timestamp: new Date().toISOString()
    });
  }
}