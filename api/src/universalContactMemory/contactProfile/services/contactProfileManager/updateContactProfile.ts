import { contactProfileManager } from '../contactProfileManager';

/**
 * Update a contact profile
 */

export interface UpdateContactProfileRequest {
  tenantId: string;
  contactId: string;
  profileId: string;
  data: Record<string, any>;
}

export interface UpdateContactProfileResult {
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

export async function updateContactProfile(
  request: UpdateContactProfileRequest
): Promise<UpdateContactProfileResult> {
  try {
    const result = await contactProfileManager.updateProfile({
      tenantId: request.tenantId,
      contactId: request.contactId,
      profileId: request.profileId,
      data: request.data
    });

    return {
      success: result.success,
      profile: result.profile,
      error: result.error
    };
  } catch (error) {
    console.error('Error updating contact profile:', error);
    return {
      success: false,
      error: `Failed to update contact profile: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
