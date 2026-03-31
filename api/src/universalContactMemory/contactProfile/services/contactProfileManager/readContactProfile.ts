import { contactProfileManager } from '../contactProfileManager';

/**
 * Read a contact profile by ID
 */

export interface ReadContactProfileRequest {
  tenantId: string;
  contactId: string;
  profileId: string;
}

export interface ReadContactProfileResult {
  success: boolean;
  profile?: {
    profileId: string;
    tenantId: string;
    contactId: string;
    data?: Record<string, any>;
    createdAt: FirebaseFirestore.Timestamp;
    updatedAt: FirebaseFirestore.Timestamp;
  };
  error?: string;
}

export async function readContactProfile(
  request: ReadContactProfileRequest
): Promise<ReadContactProfileResult> {
  try {
    const result = await contactProfileManager.getProfile({
      tenantId: request.tenantId,
      contactId: request.contactId,
      profileId: request.profileId
    });

    return {
      success: result.success,
      profile: result.profile,
      error: result.error
    };
  } catch (error) {
    console.error('Error reading contact profile:', error);
    return {
      success: false,
      error: `Failed to read contact profile: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
