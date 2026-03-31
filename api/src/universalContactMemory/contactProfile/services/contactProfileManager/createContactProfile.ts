import { contactProfileManager } from '../contactProfileManager';

/**
 * Create a new contact profile
 */

export interface CreateContactProfileRequest {
  tenantId: string;
  contactId: string;
  profileId?: string;
  data?: Record<string, any>;
}

export interface CreateContactProfileResult {
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

export async function createContactProfile(
  request: CreateContactProfileRequest
): Promise<CreateContactProfileResult> {
  try {
    const result = await contactProfileManager.createProfile({
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
    console.error('Error creating contact profile:', error);
    return {
      success: false,
      error: `Failed to create contact profile: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
