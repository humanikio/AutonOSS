import { Request, Response } from 'express';
import { phoneNumberSearchService } from '../services/phoneNumberSearch';
import { manageMessagingService } from '../services/ManageMessagingService';
import admin from 'firebase-admin';

export const searchAvailableNumbers = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      countryCode,
      numberType = 'local',
      areaCode,
      contains,
      inRegion,
      inLocality,
      limit = 20,
      excludeAllAddressRequired,
      excludeLocalAddressRequired,
      excludeForeignAddressRequired,
      beta,
      voiceEnabled,
      smsEnabled,
      mmsEnabled,
      faxEnabled
    } = req.body;

    // Validate required fields
    if (!countryCode) {
      res.status(400).json({ 
        error: 'Country code is required' 
      });
      return;
    }

    // Validate number type
    const validTypes = ['local', 'tollFree', 'mobile'];
    if (!validTypes.includes(numberType)) {
      res.status(400).json({ 
        error: 'Invalid number type. Must be: local, tollFree, or mobile' 
      });
      return;
    }

    console.log('=== PHONE NUMBER SEARCH DEBUG ===');
    console.log('Search request params:', {
      countryCode,
      numberType,
      smsEnabled,
      voiceEnabled,
      mmsEnabled,
      faxEnabled
    });

    const results = await phoneNumberSearchService.searchNumbers({
      countryCode,
      numberType,
      areaCode,
      contains,
      inRegion,
      inLocality,
      limit,
      excludeAllAddressRequired,
      excludeLocalAddressRequired,
      excludeForeignAddressRequired,
      beta,
      voiceEnabled,
      smsEnabled,
      mmsEnabled,
      faxEnabled
    });

    console.log('=== SEARCH RESULTS FROM SERVICE ===');
    console.log('Results count:', results.length);
    if (results.length > 0) {
      console.log('First result:', JSON.stringify(results[0], null, 2));
      console.log('All result capabilities:', results.map(r => ({ 
        phone: r.phoneNumber, 
        capabilities: r.capabilities 
      })));
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error searching available numbers:', error);
    res.status(500).json({ 
      error: 'Failed to search available numbers',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getAvailableCountries = async (_req: Request, res: Response): Promise<void> => {
  try {
    const countries = await phoneNumberSearchService.getAvailableCountries();
    
    res.json({
      success: true,
      data: countries
    });
  } catch (error) {
    console.error('Error fetching available countries:', error);
    res.status(500).json({ 
      error: 'Failed to fetch available countries',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getNumberCapabilities = async (req: Request, res: Response): Promise<void> => {
  try {
    const { countryCode } = req.params;
    
    if (!countryCode) {
      res.status(400).json({ 
        error: 'Country code is required' 
      });
      return;
    }

    const capabilities = await phoneNumberSearchService.getNumberCapabilities(countryCode);
    
    res.json({
      success: true,
      data: capabilities
    });
  } catch (error) {
    console.error('Error fetching number capabilities:', error);
    res.status(500).json({ 
      error: 'Failed to fetch number capabilities',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getAreaCodes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { countryCode } = req.params;
    const { state } = req.query;
    
    if (!countryCode) {
      res.status(400).json({ 
        error: 'Country code is required' 
      });
      return;
    }

    const areaCodes = await phoneNumberSearchService.getAreaCodes(
      countryCode, 
      state as string
    );
    
    res.json({
      success: true,
      data: areaCodes
    });
  } catch (error) {
    console.error('Error fetching area codes:', error);
    res.status(500).json({ 
      error: 'Failed to fetch area codes',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const initiatePurchase = async (_req: Request, res: Response): Promise<void> => {
  res.status(501).json({
    error: 'Not implemented',
    message: 'Phone number purchasing requires a payment integration (e.g. Stripe). See README for setup instructions.'
  });
};

export const getPhoneNumberPricing = async (_req: Request, res: Response): Promise<void> => {
  res.status(501).json({
    error: 'Not implemented',
    message: 'Phone number pricing requires a payment integration. See README for setup instructions.'
  });
};

export const getPurchasedNumbers = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get tenant ID from auth middleware (supports multi-tenant switching)
    const tenantId = req.tenantId;
    
    if (!tenantId) {
      res.status(400).json({ 
        error: 'Tenant ID is required' 
      });
      return;
    }

    console.log('Fetching purchased phone numbers for tenant:', tenantId);

    // Initialize Firebase Admin if not already initialized
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    }

    const db = admin.firestore();

    // Fetch phone numbers from Firestore: tenants/{tenantId}/phoneNumbers
    const phoneNumbersRef = db.collection(`tenants/${tenantId}/phoneNumbers`);
    const snapshot = await phoneNumbersRef.get();

    if (snapshot.empty) {
      console.log('No phone numbers found for tenant:', tenantId);
      res.json({
        success: true,
        data: []
      });
      return;
    }

    // Transform Firestore data to frontend format
    const purchasedNumbers = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        phoneNumber: data.phoneNumber,
        twilioSid: data.twilioSid,
        friendlyName: data.friendlyName,
        numberType: data.numberType,
        countryCode: data.countryCode,
        capabilities: data.capabilities,
        status: data.status,
        purchasedAt: data.purchasedAt?.toDate?.()?.toISOString() || data.purchasedAt,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
      };
    });

    console.log(`Found ${purchasedNumbers.length} phone numbers for tenant ${tenantId}`);

    res.json({
      success: true,
      data: purchasedNumbers
    });

  } catch (error) {
    console.error('Error fetching purchased phone numbers:', error);
    res.status(500).json({ 
      error: 'Failed to fetch purchased phone numbers',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const manageMessagingServiceController = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      tenantId,
      phoneNumberSid,
      phoneNumber,
      friendlyName
    } = req.body;

    // Validate required fields
    if (!tenantId || !phoneNumberSid || !phoneNumber) {
      res.status(400).json({ 
        error: 'tenantId, phoneNumberSid, and phoneNumber are required' 
      });
      return;
    }

    console.log(`Managing messaging service for tenant ${tenantId}, phone: ${phoneNumber}`);

    // Manage the messaging service
    const result = await manageMessagingService.manageService({
      tenantId,
      phoneNumberSid,
      phoneNumber,
      friendlyName
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error managing messaging service:', error);
    res.status(500).json({ 
      error: 'Failed to manage messaging service',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getTenantFromMessagingService = async (req: Request, res: Response): Promise<void> => {
  try {
    const { messagingServiceId } = req.params;

    if (!messagingServiceId) {
      res.status(400).json({ 
        error: 'messagingServiceId is required' 
      });
      return;
    }

    const tenantId = await manageMessagingService.getTenantFromMessagingService(messagingServiceId);

    if (!tenantId) {
      res.status(404).json({ 
        error: 'Tenant not found for messaging service' 
      });
      return;
    }

    res.json({
      success: true,
      data: { tenantId }
    });

  } catch (error) {
    console.error('Error getting tenant from messaging service:', error);
    res.status(500).json({ 
      error: 'Failed to get tenant from messaging service',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};