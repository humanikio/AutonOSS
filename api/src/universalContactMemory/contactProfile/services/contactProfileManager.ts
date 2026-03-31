import { firestore } from '../../../config/firebase';
import admin from 'firebase-admin';

/**
 * Contact Profile Manager - CRUD operations for contact profiles
 * Manages contact profile documents at: tenants/{tenantId}/contacts/{contactId}/contactProfile/{profileId}
 */

export interface ContactProfile {
  profileId: string;
  tenantId: string;
  contactId: string;
  data?: Record<string, any>; // Flexible data storage for profile information
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

export interface CreateProfileRequest {
  tenantId: string;
  contactId: string;
  profileId?: string; // Optional - will generate if not provided
  data?: Record<string, any>;
}

export interface CreateProfileResult {
  success: boolean;
  profile?: ContactProfile;
  error?: string;
}

export interface UpdateProfileRequest {
  tenantId: string;
  contactId: string;
  profileId: string;
  data: Record<string, any>;
}

export interface UpdateProfileResult {
  success: boolean;
  profile?: ContactProfile;
  error?: string;
}

export interface GetProfileRequest {
  tenantId: string;
  contactId: string;
  profileId: string;
}

export interface GetProfileResult {
  success: boolean;
  profile?: ContactProfile;
  error?: string;
}

export interface DeleteProfileRequest {
  tenantId: string;
  contactId: string;
  profileId: string;
}

export interface DeleteProfileResult {
  success: boolean;
  error?: string;
}

export class ContactProfileManager {
  /**
   * Create a new contact profile
   */
  async createProfile(request: CreateProfileRequest): Promise<CreateProfileResult> {
    try {
      const { tenantId, contactId, data = {} } = request;
      const profileId = request.profileId || this.generateProfileId();

      console.log(`=Ý Creating contact profile: ${profileId}`);
      console.log(`  - Tenant ID: ${tenantId}`);
      console.log(`  - Contact ID: ${contactId}`);

      // Get profile reference
      const profileRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('contacts')
        .doc(contactId)
        .collection('contactProfile')
        .doc(profileId);

      // Check if profile already exists
      const existingProfile = await profileRef.get();
      if (existingProfile.exists) {
        console.error(`L Profile ${profileId} already exists`);
        return {
          success: false,
          error: 'Profile already exists'
        };
      }

      // Create profile document
      const now = admin.firestore.Timestamp.now();
      const profile: ContactProfile = {
        profileId,
        tenantId,
        contactId,
        data,
        createdAt: now,
        updatedAt: now
      };

      await profileRef.set(profile);

      console.log(` Contact profile created successfully`);
      console.log(`  - Profile ID: ${profileId}`);

      return {
        success: true,
        profile
      };

    } catch (error) {
      console.error('L Error creating contact profile:', error);

      return {
        success: false,
        error: `Failed to create profile: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get a contact profile by ID
   */
  async getProfile(request: GetProfileRequest): Promise<GetProfileResult> {
    try {
      const { tenantId, contactId, profileId } = request;

      console.log(`=Ö Fetching contact profile: ${profileId}`);

      // Get profile reference
      const profileRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('contacts')
        .doc(contactId)
        .collection('contactProfile')
        .doc(profileId);

      const profileDoc = await profileRef.get();

      if (!profileDoc.exists) {
        console.log(`  Profile ${profileId} not found`);
        return {
          success: false,
          error: 'Profile not found'
        };
      }

      const profile = profileDoc.data() as ContactProfile;

      console.log(` Contact profile retrieved successfully`);

      return {
        success: true,
        profile
      };

    } catch (error) {
      console.error('L Error getting contact profile:', error);

      return {
        success: false,
        error: `Failed to get profile: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Update an existing contact profile
   */
  async updateProfile(request: UpdateProfileRequest): Promise<UpdateProfileResult> {
    try {
      const { tenantId, contactId, profileId, data } = request;

      console.log(` Updating contact profile: ${profileId}`);
      console.log(`  - Tenant ID: ${tenantId}`);
      console.log(`  - Contact ID: ${contactId}`);

      // Get profile reference
      const profileRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('contacts')
        .doc(contactId)
        .collection('contactProfile')
        .doc(profileId);

      // Check if profile exists
      const existingProfile = await profileRef.get();
      if (!existingProfile.exists) {
        console.error(`L Profile ${profileId} not found`);
        return {
          success: false,
          error: 'Profile not found'
        };
      }

      // Update profile document
      const now = admin.firestore.Timestamp.now();
      await profileRef.update({
        data,
        updatedAt: now
      });

      // Fetch updated profile
      const updatedDoc = await profileRef.get();
      const profile = updatedDoc.data() as ContactProfile;

      console.log(` Contact profile updated successfully`);

      return {
        success: true,
        profile
      };

    } catch (error) {
      console.error('L Error updating contact profile:', error);

      return {
        success: false,
        error: `Failed to update profile: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Delete a contact profile
   */
  async deleteProfile(request: DeleteProfileRequest): Promise<DeleteProfileResult> {
    try {
      const { tenantId, contactId, profileId } = request;

      console.log(`=Ñ Deleting contact profile: ${profileId}`);
      console.log(`  - Tenant ID: ${tenantId}`);
      console.log(`  - Contact ID: ${contactId}`);

      // Get profile reference
      const profileRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('contacts')
        .doc(contactId)
        .collection('contactProfile')
        .doc(profileId);

      // Check if profile exists
      const existingProfile = await profileRef.get();
      if (!existingProfile.exists) {
        console.error(`L Profile ${profileId} not found`);
        return {
          success: false,
          error: 'Profile not found'
        };
      }

      // Delete profile document
      await profileRef.delete();

      console.log(` Contact profile deleted successfully`);

      return {
        success: true
      };

    } catch (error) {
      console.error('L Error deleting contact profile:', error);

      return {
        success: false,
        error: `Failed to delete profile: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * List all profiles for a contact
   */
  async listProfiles(tenantId: string, contactId: string): Promise<{
    success: boolean;
    profiles?: ContactProfile[];
    error?: string;
  }> {
    try {
      console.log(`=Ë Listing profiles for contact: ${contactId}`);

      const profilesRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('contacts')
        .doc(contactId)
        .collection('contactProfile');

      const snapshot = await profilesRef.get();

      const profiles: ContactProfile[] = snapshot.docs.map(doc => doc.data() as ContactProfile);

      console.log(` Found ${profiles.length} profiles`);

      return {
        success: true,
        profiles
      };

    } catch (error) {
      console.error('L Error listing contact profiles:', error);

      return {
        success: false,
        error: `Failed to list profiles: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Generate a unique profile ID
   */
  private generateProfileId(): string {
    return `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const contactProfileManager = new ContactProfileManager();
