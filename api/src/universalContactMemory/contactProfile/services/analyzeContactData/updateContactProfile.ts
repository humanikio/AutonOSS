import { updateContactProfile as updateProfileManager } from '../contactProfileManager/updateContactProfile';

/**
 * Update contact profile with new text
 */

export interface UpdateContactProfileServiceRequest {
  tenantId: string;
  contactId: string;
  profileId: string;
  updatedProfileText: string;
}

export interface UpdateContactProfileServiceResult {
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

export async function updateContactProfileService(
  request: UpdateContactProfileServiceRequest
): Promise<UpdateContactProfileServiceResult> {
  try {
    const { tenantId, contactId, profileId, updatedProfileText } = request;

    console.log(` Updating contact profile: ${profileId}`);
    console.log(`  - New profile text length: ${updatedProfileText.length} chars`);

    // Update the profile with new text
    const result = await updateProfileManager({
      tenantId,
      contactId,
      profileId,
      data: {
        text: updatedProfileText
      }
    });

    if (!result.success) {
      console.error('L Failed to update profile:', result.error);
      return {
        success: false,
        error: result.error
      };
    }

    console.log(' Profile updated successfully');

    return {
      success: true,
      profile: result.profile
    };

  } catch (error) {
    console.error('L Error updating contact profile:', error);
    return {
      success: false,
      error: `Failed to update contact profile: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
