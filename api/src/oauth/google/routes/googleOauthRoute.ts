import express from 'express';
import { googleOauthController } from '../controllers/googleOauthController';

const router = express.Router();

// Initiate OAuth flow for a given tenant
router.post('/initiate', googleOauthController.initiateOAuth);

// Handle OAuth callback
router.get('/callback', googleOauthController.handleCallback);

// Refresh token for a tenant
router.post('/refresh', googleOauthController.refreshToken);

// Revoke OAuth access for a tenant
router.post('/revoke', googleOauthController.revokeAccess);

// Get OAuth status for a tenant
router.get('/status/:tenantId', googleOauthController.getOAuthStatus);

export default router;