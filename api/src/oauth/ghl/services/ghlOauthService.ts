import axios from 'axios';
import { ghlAccountService } from './ghlAccountService';

const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const GHL_CHOOSELOCATION_URL = 'https://marketplace.gohighlevel.com/oauth/chooselocation';

export const ghlOauthService = {
  async generateAuthUrl(tenantId: string): Promise<string> {
    // Validate required environment variables
    const { GHL_CLIENT_ID, GHL_REDIRECT_URI } = process.env;
    if (!GHL_CLIENT_ID || !GHL_REDIRECT_URI) {
      throw new Error(
        `Missing OAuth env: GHL_CLIENT_ID=${!!GHL_CLIENT_ID}, GHL_REDIRECT_URI=${!!GHL_REDIRECT_URI}`
      );
    }

    // Scopes enabled in GHL app
    const scopes = [
      // Contacts (now enabled in GHL)
      'contacts.readonly',
      'contacts.write',

      // Conversations
      'conversations.readonly',
      'conversations.write',
      'conversations/message.readonly',
      'conversations/message.write',
      'conversations/livechat.write',
      'conversations/reports.readonly',

      // Locations
      'locations.readonly',
      'locations/customFields.readonly',
      'locations/tags.readonly',
      'locations/customValues.readonly',

      // Users
      'users.readonly',

      // OAuth (for agency-to-location token exchange)
      'oauth.readonly',
      'oauth.write'
    ];

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: GHL_CLIENT_ID,
      redirect_uri: GHL_REDIRECT_URI,
      scope: scopes.join(' '),
      state: tenantId,
    });

    return `${GHL_CHOOSELOCATION_URL}?${params.toString()}`;
  },

  async handleCallback(code: string, state: string) {
    const tenantId = state; // tenantId passed as state

    // Validate required environment variables
    const { GHL_CLIENT_ID, GHL_CLIENT_SECRET, GHL_REDIRECT_URI } = process.env;
    if (!GHL_CLIENT_ID || !GHL_CLIENT_SECRET || !GHL_REDIRECT_URI) {
      throw new Error(
        `Missing OAuth env: GHL_CLIENT_ID=${!!GHL_CLIENT_ID}, GHL_CLIENT_SECRET=${!!GHL_CLIENT_SECRET}, GHL_REDIRECT_URI=${!!GHL_REDIRECT_URI}`
      );
    }

    try {
      // Exchange authorization code for tokens (server-side with client secret)
      // Try Location type first (most common case - sub-account user installing)
      let tokenResponse;
      try {
        tokenResponse = await axios.post(
          `${GHL_BASE_URL}/oauth/token`,
          {
            grant_type: 'authorization_code',
            client_id: GHL_CLIENT_ID,
            client_secret: GHL_CLIENT_SECRET,
            code,
            user_type: 'Location',
            redirect_uri: GHL_REDIRECT_URI,
          },
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        );
      } catch (error: any) {
        // If Location fails, try Company type (agency admin installing)
        console.log('Location token exchange failed, trying Company type...');
        tokenResponse = await axios.post(
          `${GHL_BASE_URL}/oauth/token`,
          {
            grant_type: 'authorization_code',
            client_id: GHL_CLIENT_ID,
            client_secret: GHL_CLIENT_SECRET,
            code,
            user_type: 'Company',
            redirect_uri: GHL_REDIRECT_URI,
          },
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        );
      }

      const {
        access_token,
        refresh_token,
        expires_in,
        scope,
        userType,
        locationId: responseLocationId,
        companyId: responseCompanyId
      } = tokenResponse.data;

      let locationId = responseLocationId;
      let companyId = responseCompanyId;
      let locationName = 'Unknown Location';

      // If we got a Company token, we need to exchange it for Location token
      // OR handle it as an agency-level connection
      if (userType === 'Company') {
        console.log('⚠️  Received Company-level token. Need to handle agency installation.');
        // For now, we'll store the company token and require manual location selection later
        // TODO: Implement agency token → location token exchange flow
        throw new Error('Agency-level installations require location selection. Please install from a specific sub-account instead.');
      }

      // Fetch location info using locationInfo endpoint (works for Location tokens)
      try {
        const locationInfoResponse = await axios.get(
          `${GHL_BASE_URL}/oauth/locationInfo`,
          {
            headers: {
              Authorization: `Bearer ${access_token}`,
              Version: '2021-07-28',
            },
          }
        );

        locationId = locationInfoResponse.data.locationId || locationId;
        companyId = locationInfoResponse.data.companyId || companyId;
        locationName = locationInfoResponse.data.name || locationInfoResponse.data.locationId;
      } catch (infoError) {
        console.warn('Could not fetch location info, using token response data');
        locationName = locationId;
      }

      // Calculate token expiration
      const tokenExpiresAt = new Date(Date.now() + expires_in * 1000);

      // Store account data
      const accountData = {
        id: locationId,
        locationId,
        locationName,
        companyId,
        tenantId,
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiresAt,
        scopes: scope.split(' '),
        status: 'active' as const,
        connectedAt: new Date(),
        userType,
        syncEnabled: true,
      };

      await ghlAccountService.createOrUpdateAccount(accountData);

      return { success: true, locationId };
    } catch (error: any) {
      console.error('Error handling GHL OAuth callback:', error.response?.data || error.message);
      throw new Error('Failed to complete OAuth flow');
    }
  },

  async revokeAccess(tenantId: string, locationId: string) {
    const account = await ghlAccountService.getAccount(tenantId, locationId);

    if (!account || !account.accessToken) {
      throw new Error('Account not found or no access token');
    }

    // GHL doesn't have a standardized revoke endpoint
    // We'll just remove from our database
    // The user can revoke from GHL dashboard if needed
    await ghlAccountService.removeAccount(tenantId, locationId);
  },

  async generateReconnectUrl(tenantId: string, locationId: string): Promise<string> {
    const { GHL_CLIENT_ID, GHL_REDIRECT_URI } = process.env;
    if (!GHL_CLIENT_ID || !GHL_REDIRECT_URI) {
      throw new Error('Missing OAuth env vars');
    }

    // Use same scopes as initial connection
    const scopes = [
      'contacts.readonly',
      'contacts.write',
      'conversations.readonly',
      'conversations.write',
      'conversations/message.readonly',
      'conversations/message.write',
      'conversations/livechat.write',
      'conversations/reports.readonly',
      'locations.readonly',
      'locations/customFields.readonly',
      'locations/tags.readonly',
      'locations/customValues.readonly',
      'users.readonly',
      'oauth.readonly',
      'oauth.write'
    ];

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: GHL_CLIENT_ID,
      redirect_uri: GHL_REDIRECT_URI,
      scope: scopes.join(' '),
      state: tenantId,
    });

    return `${GHL_CHOOSELOCATION_URL}?${params.toString()}`;
  },

  async validateToken(tenantId: string, locationId: string): Promise<boolean> {
    try {
      const account = await ghlAccountService.getAccount(tenantId, locationId);

      if (!account || !account.accessToken) {
        return false;
      }

      // Check if token is expired
      if (account.tokenExpiresAt && account.tokenExpiresAt < new Date()) {
        // Token is expired, will need refresh
        return false;
      }

      // Optionally validate with GHL API
      try {
        await axios.get(`${GHL_BASE_URL}/locations/${locationId}`, {
          headers: {
            Authorization: `Bearer ${account.accessToken}`,
            Version: '2021-07-28',
          },
        });
        return true;
      } catch (error) {
        console.error('Token validation failed:', error);
        return false;
      }
    } catch (error) {
      console.error('Error validating token:', error);
      return false;
    }
  },

  async getLocationInfo(locationId: string, accessToken: string) {
    try {
      const response = await axios.get(
        `${GHL_BASE_URL}/locations/${locationId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Version: '2021-07-28',
          },
        }
      );
      return response.data.location;
    } catch (error) {
      console.error('Error fetching location info:', error);
      throw error;
    }
  },

  async refreshToken(tenantId: string, locationId: string) {
    const account = await ghlAccountService.getAccount(tenantId, locationId);

    if (!account || !account.refreshToken) {
      throw new Error('Account not found or no refresh token available');
    }

    // Validate required environment variables
    const { GHL_CLIENT_ID, GHL_CLIENT_SECRET } = process.env;
    if (!GHL_CLIENT_ID || !GHL_CLIENT_SECRET) {
      throw new Error(
        `Missing OAuth env: GHL_CLIENT_ID=${!!GHL_CLIENT_ID}, GHL_CLIENT_SECRET=${!!GHL_CLIENT_SECRET}`
      );
    }

    try {
      const tokenResponse = await axios.post(
        `${GHL_BASE_URL}/oauth/token`,
        {
          client_id: GHL_CLIENT_ID,
          client_secret: GHL_CLIENT_SECRET,
          grant_type: 'refresh_token',
          refresh_token: account.refreshToken,
          user_type: 'Location',
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const { access_token, refresh_token, expires_in, scope } = tokenResponse.data;
      const tokenExpiresAt = new Date(Date.now() + expires_in * 1000);

      const updatedAccount = {
        ...account,
        accessToken: access_token,
        refreshToken: refresh_token || account.refreshToken,
        tokenExpiresAt,
        scopes: scope ? scope.split(' ') : account.scopes,
        updatedAt: new Date(),
      };

      await ghlAccountService.updateAccount(tenantId, locationId, updatedAccount);

      return { accessToken: access_token, expiresAt: tokenExpiresAt };
    } catch (error: any) {
      console.error('Error refreshing GHL token:', error.response?.data || error.message);
      await ghlAccountService.updateAccount(tenantId, locationId, {
        ...account,
        status: 'error',
        updatedAt: new Date(),
      });
      throw new Error('Failed to refresh token');
    }
  },

  async isTokenExpired(tenantId: string, locationId: string): Promise<boolean> {
    const account = await ghlAccountService.getAccount(tenantId, locationId);

    if (!account || !account.tokenExpiresAt) {
      return true;
    }

    const bufferTime = 5 * 60 * 1000;
    const expirationWithBuffer = new Date(account.tokenExpiresAt.getTime() - bufferTime);

    return new Date() > expirationWithBuffer;
  },

  async getValidAccessToken(tenantId: string, locationId: string): Promise<string> {
    const isExpired = await this.isTokenExpired(tenantId, locationId);

    if (isExpired) {
      const tokens = await this.refreshToken(tenantId, locationId);
      return tokens.accessToken!;
    }

    const account = await ghlAccountService.getAccount(tenantId, locationId);
    if (!account || !account.accessToken) {
      throw new Error('No valid access token available');
    }

    return account.accessToken;
  }
};
