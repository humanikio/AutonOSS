import { resolveContactProfile } from '../../utils/resolveContactProfile';
import { reviewProvidedData } from './analyzeContactData/reviewProvidedData';
import { updateContactProfileService } from './analyzeContactData/updateContactProfile';

/**
 * Main service for analyzing contact data and updating profiles
 * Orchestrates the complete pipeline: resolve profile -> review data -> update if needed
 */

export interface AnalyzeContactDataRequest {
  tenantId: string;
  contactId: string;
  newData: string;
}

export interface AnalyzeContactDataResult {
  success: boolean;
  updatePerformed: boolean;
  profileId?: string;
  updatedProfile?: string;
  message?: string;
  error?: string;
}

export class AnalyzeContactDataService {
  /**
   * Analyze new contact data and update profile if necessary
   */
  async analyzeAndUpdate(request: AnalyzeContactDataRequest): Promise<AnalyzeContactDataResult> {
    try {
      const { tenantId, contactId, newData } = request;

      console.log('=, Starting contact data analysis pipeline');
      console.log(`  - Tenant ID: ${tenantId}`);
      console.log(`  - Contact ID: ${contactId}`);
      console.log(`  - New data length: ${newData.length} chars`);

      // Step 1: Resolve contact profile (find existing or create new)
      console.log('\n=Ë Step 1: Resolving contact profile');
      const resolveResult = await resolveContactProfile({
        tenantId,
        contactId
      });

      if (!resolveResult.success || !resolveResult.profileId) {
        console.error('L Failed to resolve contact profile:', resolveResult.error);
        return {
          success: false,
          updatePerformed: false,
          error: resolveResult.error || 'Failed to resolve contact profile'
        };
      }

      const { profileId, currentProfileText, isNew } = resolveResult;

      console.log(` Profile resolved: ${profileId}`);
      console.log(`  - Is new profile: ${isNew}`);
      console.log(`  - Current profile text: ${currentProfileText?.length || 0} chars`);

      // Step 2: Review provided data with Claude
      console.log('\n> Step 2: Reviewing data with AI');
      const reviewResult = await reviewProvidedData({
        currentProfileText: currentProfileText || '',
        newData
      });

      if (!reviewResult.success) {
        console.error('L Failed to review data:', reviewResult.error);
        return {
          success: false,
          updatePerformed: false,
          profileId,
          error: reviewResult.error || 'Failed to review data'
        };
      }

      console.log(` Review complete - Update needed: ${reviewResult.updateNeeded}`);

      // Step 3: Update profile if needed
      if (!reviewResult.updateNeeded) {
        console.log('9 No update needed - new data does not add meaningful information');
        return {
          success: true,
          updatePerformed: false,
          profileId,
          updatedProfile: currentProfileText || '',
          message: 'No update needed - new data does not add meaningful information to profile'
        };
      }

      if (!reviewResult.updatedContactProfile) {
        console.error('L Review indicated update needed but no updated profile provided');
        return {
          success: false,
          updatePerformed: false,
          profileId,
          error: 'AI review error - missing updated profile text'
        };
      }

      console.log('\n=¾ Step 3: Updating contact profile');
      const updateResult = await updateContactProfileService({
        tenantId,
        contactId,
        profileId,
        updatedProfileText: reviewResult.updatedContactProfile
      });

      if (!updateResult.success) {
        console.error('L Failed to update profile:', updateResult.error);
        return {
          success: false,
          updatePerformed: false,
          profileId,
          error: updateResult.error || 'Failed to update profile'
        };
      }

      console.log(' Contact data analysis pipeline completed successfully');
      console.log(`  - Update performed: true`);
      console.log(`  - Updated profile length: ${reviewResult.updatedContactProfile.length} chars`);

      return {
        success: true,
        updatePerformed: true,
        profileId,
        updatedProfile: reviewResult.updatedContactProfile,
        message: 'Profile updated successfully with new information'
      };

    } catch (error) {
      console.error('L Error in contact data analysis pipeline:', error);

      return {
        success: false,
        updatePerformed: false,
        error: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

export const analyzeContactDataService = new AnalyzeContactDataService();
