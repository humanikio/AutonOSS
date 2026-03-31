import { getContactProfiles } from '../contactProfile/services/contactProfileManager/getContactProfiles';
import { createContactProfile } from '../contactProfile/services/contactProfileManager/createContactProfile';
import { readContactProfile } from '../contactProfile/services/contactProfileManager/readContactProfile';

/**
 * Resolve contact profile - either finds most recent or creates new one
 * Returns profileId and current profile text
 */

export interface ResolveContactProfileRequest {
  tenantId: string;
  contactId: string;
}

export interface ResolveContactProfileResult {
  success: boolean;
  profileId?: string;
  currentProfileText?: string;
  isNew?: boolean;
  error?: string;
}

export async function resolveContactProfile(
  request: ResolveContactProfileRequest
): Promise<ResolveContactProfileResult> {
  try {
    const { tenantId, contactId } = request;

    console.log(`= Resolving contact profile for contact: ${contactId}`);

    // Step 1: Get all profiles for this contact
    const profilesResult = await getContactProfiles({ tenantId, contactId });

    if (!profilesResult.success) {
      console.error('L Failed to get contact profiles:', profilesResult.error);
      return {
        success: false,
        error: profilesResult.error
      };
    }

    // Step 2: Check if profiles exist
    const profiles = profilesResult.profiles || [];

    if (profiles.length === 0) {
      // No profiles exist - create a new one
      console.log('=Ý No profiles found - creating new profile');

      const createResult = await createContactProfile({
        tenantId,
        contactId,
        data: { text: '' } // Initialize with empty text
      });

      if (!createResult.success || !createResult.profile) {
        console.error('L Failed to create profile:', createResult.error);
        return {
          success: false,
          error: createResult.error
        };
      }

      console.log(` Created new profile: ${createResult.profile.profileId}`);

      return {
        success: true,
        profileId: createResult.profile.profileId,
        currentProfileText: '',
        isNew: true
      };
    }

    // Step 3: Get most recent profile (already sorted by getContactProfiles)
    const mostRecentProfile = profiles[0];
    console.log(`=Ë Found existing profile: ${mostRecentProfile.profileId}`);

    // Step 4: Read the full profile to get the text
    const readResult = await readContactProfile({
      tenantId,
      contactId,
      profileId: mostRecentProfile.profileId
    });

    if (!readResult.success || !readResult.profile) {
      console.error('L Failed to read profile:', readResult.error);
      return {
        success: false,
        error: readResult.error
      };
    }

    const currentProfileText = readResult.profile.data?.text || '';

    console.log(` Resolved profile: ${mostRecentProfile.profileId}`);
    console.log(`=Ä Current profile text length: ${currentProfileText.length} chars`);

    return {
      success: true,
      profileId: mostRecentProfile.profileId,
      currentProfileText,
      isNew: false
    };

  } catch (error) {
    console.error('L Error resolving contact profile:', error);
    return {
      success: false,
      error: `Failed to resolve contact profile: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
