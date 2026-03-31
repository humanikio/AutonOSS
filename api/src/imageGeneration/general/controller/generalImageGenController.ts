import { Request, Response } from 'express';
import { generateGeneralImage } from '../services/generateGeneralImage';

/**
 * Generate stylized avatar from user selfie
 */
export const generateAvatarImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { selfieData } = req.body;
    
    // Validate required fields
    if (!selfieData) {
      res.status(400).json({
        success: false,
        error: 'Selfie data is required',
        message: 'Please provide selfie image data as base64 string'
      });
      return;
    }

    // Validate base64 image format
    if (!selfieData.startsWith('data:image/')) {
      res.status(400).json({
        success: false,
        error: 'Invalid image format',
        message: 'Selfie data must be a valid base64 image'
      });
      return;
    }

    // Get user ID from authenticated request
    const userId = (req as any).user?.uid;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'User ID not found in request'
      });
      return;
    }

    console.log(`<¨ Avatar generation request from user: ${userId}`);
    
    // Generate avatar using the general image service
    const result = await generateGeneralImage({
      type: 'avatar',
      selfieData,
      userId
    });

    if (result.success) {
      res.status(200).json({
        success: true,
        data: {
          avatarUrl: result.avatarUrl,
          message: 'Avatar generated successfully'
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Avatar generation failed',
        message: 'Failed to generate stylized avatar'
      });
    }

  } catch (error) {
    console.error('L Avatar generation controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred during avatar generation'
    });
  }
};