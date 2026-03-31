import { contactProfileManager } from '../contactProfileManager';

/**
 * Get all contact profiles for a contact
 * Returns profiles sorted by most recent first
 */

export interface GetContactProfilesRequest {
  tenantId: string;
  contactId: string;
}

export interface GetContactProfilesResult {
  success: boolean;
  profiles?: Array<{
    profileId: string;
    tenantId: string;
    contactId: string;
    data?: Record<string, any>;
    createdAt: FirebaseFirestore.Timestamp;
    updatedAt: FirebaseFirestore.Timestamp;
  }>;
  error?: string;
}

export async function getContactProfiles(
  request: GetContactProfilesRequest
): Promise<GetContactProfilesResult> {
  try {
    const result = await contactProfileManager.listProfiles(
      request.tenantId,
      request.contactId
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error
      };
    }

    // Sort by updatedAt descending (most recent first)
    const sortedProfiles = (result.profiles || []).sort((a, b) => {
      const timeA = a.updatedAt?.toMillis() || 0;
      const timeB = b.updatedAt?.toMillis() || 0;
      return timeB - timeA;
    });

    return {
      success: true,
      profiles: sortedProfiles
    };
  } catch (error) {
    console.error('Error getting contact profiles:', error);
    return {
      success: false,
      error: `Failed to get contact profiles: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
