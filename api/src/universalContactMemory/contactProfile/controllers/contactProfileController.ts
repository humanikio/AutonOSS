import { Request, Response } from 'express';
import { contactProfileManager } from '../services/contactProfileManager';
import { analyzeContactDataService } from '../services/analyzeContactData';

/**
 * Contact Profile Controller - Handles HTTP requests for contact profile CRUD operations
 */

export class ContactProfileController {
  /**
   * Create a new contact profile
   * POST /api/universal-contact-memory/contact-profile/:tenantId/:contactId
   */
  async createProfile(req: Request, res: Response) {
    try {
      const { tenantId, contactId } = req.params;
      const { profileId, data } = req.body;

      console.log('=� Contact Profile Controller: Create Profile');
      console.log(`  - Tenant ID: ${tenantId}`);
      console.log(`  - Contact ID: ${contactId}`);

      // Validate required parameters
      if (!tenantId || !contactId) {
        console.error('L Missing required parameters');
        res.status(400).json({
          success: false,
          error: 'Missing required parameters',
          message: 'tenantId and contactId are required'
        });
        return;
      }

      // Call service to create profile
      const result = await contactProfileManager.createProfile({
        tenantId,
        contactId,
        profileId,
        data
      });

      if (!result.success) {
        console.error('L Service returned error:', result.error);
        res.status(400).json({
          success: false,
          error: 'Failed to create profile',
          message: result.error
        });
        return;
      }

      console.log(' Contact profile created successfully');

      res.status(201).json({
        success: true,
        message: 'Contact profile created successfully',
        data: result.profile
      });

    } catch (error) {
      console.error('L Contact Profile Controller: Error creating profile:', error);

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }

  /**
   * Get a contact profile by ID
   * GET /api/universal-contact-memory/contact-profile/:tenantId/:contactId/:profileId
   */
  async getProfile(req: Request, res: Response) {
    try {
      const { tenantId, contactId, profileId } = req.params;

      console.log('=� Contact Profile Controller: Get Profile');
      console.log(`  - Tenant ID: ${tenantId}`);
      console.log(`  - Contact ID: ${contactId}`);
      console.log(`  - Profile ID: ${profileId}`);

      // Validate required parameters
      if (!tenantId || !contactId || !profileId) {
        console.error('L Missing required parameters');
        res.status(400).json({
          success: false,
          error: 'Missing required parameters',
          message: 'tenantId, contactId, and profileId are required'
        });
        return;
      }

      // Call service to get profile
      const result = await contactProfileManager.getProfile({
        tenantId,
        contactId,
        profileId
      });

      if (!result.success) {
        console.error('L Service returned error:', result.error);
        res.status(404).json({
          success: false,
          error: 'Profile not found',
          message: result.error
        });
        return;
      }

      console.log(' Contact profile retrieved successfully');

      res.status(200).json({
        success: true,
        message: 'Contact profile retrieved successfully',
        data: result.profile
      });

    } catch (error) {
      console.error('L Contact Profile Controller: Error getting profile:', error);

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }

  /**
   * Update a contact profile
   * PUT /api/universal-contact-memory/contact-profile/:tenantId/:contactId/:profileId
   */
  async updateProfile(req: Request, res: Response) {
    try {
      const { tenantId, contactId, profileId } = req.params;
      const { data } = req.body;

      console.log(' Contact Profile Controller: Update Profile');
      console.log(`  - Tenant ID: ${tenantId}`);
      console.log(`  - Contact ID: ${contactId}`);
      console.log(`  - Profile ID: ${profileId}`);

      // Validate required parameters
      if (!tenantId || !contactId || !profileId) {
        console.error('L Missing required parameters');
        res.status(400).json({
          success: false,
          error: 'Missing required parameters',
          message: 'tenantId, contactId, and profileId are required'
        });
        return;
      }

      if (!data || typeof data !== 'object') {
        console.error('L Invalid data parameter');
        res.status(400).json({
          success: false,
          error: 'Invalid data parameter',
          message: 'data must be an object'
        });
        return;
      }

      // Call service to update profile
      const result = await contactProfileManager.updateProfile({
        tenantId,
        contactId,
        profileId,
        data
      });

      if (!result.success) {
        console.error('L Service returned error:', result.error);
        res.status(404).json({
          success: false,
          error: 'Failed to update profile',
          message: result.error
        });
        return;
      }

      console.log(' Contact profile updated successfully');

      res.status(200).json({
        success: true,
        message: 'Contact profile updated successfully',
        data: result.profile
      });

    } catch (error) {
      console.error('L Contact Profile Controller: Error updating profile:', error);

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }

  /**
   * Delete a contact profile
   * DELETE /api/universal-contact-memory/contact-profile/:tenantId/:contactId/:profileId
   */
  async deleteProfile(req: Request, res: Response) {
    try {
      const { tenantId, contactId, profileId } = req.params;

      console.log('=� Contact Profile Controller: Delete Profile');
      console.log(`  - Tenant ID: ${tenantId}`);
      console.log(`  - Contact ID: ${contactId}`);
      console.log(`  - Profile ID: ${profileId}`);

      // Validate required parameters
      if (!tenantId || !contactId || !profileId) {
        console.error('L Missing required parameters');
        res.status(400).json({
          success: false,
          error: 'Missing required parameters',
          message: 'tenantId, contactId, and profileId are required'
        });
        return;
      }

      // Call service to delete profile
      const result = await contactProfileManager.deleteProfile({
        tenantId,
        contactId,
        profileId
      });

      if (!result.success) {
        console.error('L Service returned error:', result.error);
        res.status(404).json({
          success: false,
          error: 'Failed to delete profile',
          message: result.error
        });
        return;
      }

      console.log(' Contact profile deleted successfully');

      res.status(200).json({
        success: true,
        message: 'Contact profile deleted successfully'
      });

    } catch (error) {
      console.error('L Contact Profile Controller: Error deleting profile:', error);

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }

  /**
   * List all profiles for a contact
   * GET /api/universal-contact-memory/contact-profile/:tenantId/:contactId
   */
  async listProfiles(req: Request, res: Response) {
    try {
      const { tenantId, contactId } = req.params;

      console.log('=� Contact Profile Controller: List Profiles');
      console.log(`  - Tenant ID: ${tenantId}`);
      console.log(`  - Contact ID: ${contactId}`);

      // Validate required parameters
      if (!tenantId || !contactId) {
        console.error('L Missing required parameters');
        res.status(400).json({
          success: false,
          error: 'Missing required parameters',
          message: 'tenantId and contactId are required'
        });
        return;
      }

      // Call service to list profiles
      const result = await contactProfileManager.listProfiles(tenantId, contactId);

      if (!result.success) {
        console.error('L Service returned error:', result.error);
        res.status(500).json({
          success: false,
          error: 'Failed to list profiles',
          message: result.error
        });
        return;
      }

      console.log(` Contact profiles listed successfully (${result.profiles?.length || 0} profiles)`);

      res.status(200).json({
        success: true,
        message: 'Contact profiles listed successfully',
        data: {
          profiles: result.profiles,
          count: result.profiles?.length || 0
        }
      });

    } catch (error) {
      console.error('L Contact Profile Controller: Error listing profiles:', error);

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }

  /**
   * Analyze contact data and update profile if needed
   * POST /api/universal-contact-memory/contact-profile/:tenantId/:contactId/analyze
   */
  async analyzeContactData(req: Request, res: Response) {
    try {
      const { tenantId, contactId } = req.params;
      const { data } = req.body;

      console.log('🔬 Contact Profile Controller: Analyze Contact Data');
      console.log(`  - Tenant ID: ${tenantId}`);
      console.log(`  - Contact ID: ${contactId}`);

      // Validate required parameters
      if (!tenantId || !contactId) {
        console.error('❌ Missing required parameters');
        res.status(400).json({
          success: false,
          error: 'Missing required parameters',
          message: 'tenantId and contactId are required'
        });
        return;
      }

      if (!data || typeof data !== 'string') {
        console.error('❌ Invalid or missing data parameter');
        res.status(400).json({
          success: false,
          error: 'Invalid data parameter',
          message: 'data must be a string'
        });
        return;
      }

      // Call service to analyze and update contact data
      const result = await analyzeContactDataService.analyzeAndUpdate({
        tenantId,
        contactId,
        newData: data
      });

      if (!result.success) {
        console.error('❌ Service returned error:', result.error);
        res.status(500).json({
          success: false,
          error: 'Failed to analyze contact data',
          message: result.error
        });
        return;
      }

      console.log(`✅ Contact data analysis completed - Update performed: ${result.updatePerformed}`);

      res.status(200).json({
        success: true,
        message: result.message || 'Analysis completed successfully',
        data: {
          updatePerformed: result.updatePerformed,
          profileId: result.profileId,
          updatedProfile: result.updatedProfile
        }
      });

    } catch (error) {
      console.error('❌ Contact Profile Controller: Error analyzing contact data:', error);

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }
}

export const contactProfileController = new ContactProfileController();
