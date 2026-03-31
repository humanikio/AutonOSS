import { db } from '../../../config/firestore';

export interface UpdateUserProfileRequest {
  userId: string;
  name?: string;
  timezone?: string;
  phone?: string;
  avatarUrl?: string;
}

export interface UpdateUserProfileResponse {
  userId: string;
  updatedAt: string;
}

export class UpdateUserProfileService {
  async updateUserProfile(request: UpdateUserProfileRequest): Promise<UpdateUserProfileResponse> {
    try {
      const { userId, name, timezone, phone, avatarUrl } = request;

      console.log(`📝 Updating user profile: ${userId}`);

      // Validate timezone if provided
      if (timezone) {
        try {
          // Use Intl API to validate IANA timezone
          Intl.DateTimeFormat(undefined, { timeZone: timezone });
        } catch (error) {
          throw new Error(`Invalid timezone: ${timezone}`);
        }
      }

      const timestamp = new Date().toISOString();
      const updateData: any = {
        updatedAt: timestamp
      };

      if (name !== undefined) updateData.name = name;
      if (timezone !== undefined) updateData.timezone = timezone;
      if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

      // Phone is stored in nested profile object
      if (phone !== undefined) {
        updateData['profile.phone'] = phone;
      }

      await db.doc(`users/${userId}`).update(updateData);

      console.log(`✅ User profile updated successfully: ${userId}`);

      return {
        userId,
        updatedAt: timestamp
      };

    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new Error(`Failed to update user profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const updateUserProfileService = new UpdateUserProfileService();
