import { Request, Response } from 'express';
import {
  uploadImage,
  getImage,
  listImages,
  updateImageMetadata,
  deleteImage
} from '../services/libraryManager';

class ImageLibraryController {
  /**
   * POST /api/image-library/upload
   * Upload a new image to the central library
   */
  async uploadImage(req: Request, res: Response): Promise<void> {
    try {
      const file = req.file;
      const { tenantId, source, sourceId, purpose, tags } = req.body;

      // Validate required fields
      if (!file) {
        res.status(400).json({ error: 'No image file provided' });
        return;
      }

      if (!tenantId || typeof tenantId !== 'string') {
        res.status(400).json({ error: 'tenantId is required' });
        return;
      }

      if (!source || typeof source !== 'string') {
        res.status(400).json({ error: 'source is required' });
        return;
      }

      // Get user ID from authentication
      const userId = (req as any).user?.uid;

      // Parse tags if provided
      let parsedTags: string[] | undefined;
      if (tags) {
        try {
          parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
        } catch (e) {
          res.status(400).json({ error: 'Invalid tags format (must be JSON array)' });
          return;
        }
      }

      // Upload image
      const result = await uploadImage({
        tenantId,
        imageBuffer: file.buffer,
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        metadata: {
          source,
          sourceId,
          purpose,
          tags: parsedTags,
          createdBy: userId
        }
      });

      res.status(201).json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      res.status(500).json({
        error: 'Failed to upload image',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/image-library/:fileId
   * Get a single image from the library
   */
  async getImage(req: Request, res: Response): Promise<void> {
    try {
      const { fileId } = req.params;
      const { tenantId } = req.query;

      if (!tenantId || typeof tenantId !== 'string') {
        res.status(400).json({ error: 'tenantId is required' });
        return;
      }

      const image = await getImage(tenantId, fileId);

      if (!image) {
        res.status(404).json({ error: 'Image not found' });
        return;
      }

      res.status(200).json({
        success: true,
        image
      });
    } catch (error) {
      console.error('Error getting image:', error);
      res.status(500).json({
        error: 'Failed to get image',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/image-library
   * List images from the library with optional filtering
   */
  async listImages(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, source, sourceId, tags, limit } = req.query;

      if (!tenantId || typeof tenantId !== 'string') {
        res.status(400).json({ error: 'tenantId is required' });
        return;
      }

      // Parse filters
      const filters: any = {};
      if (source) filters.source = source as string;
      if (sourceId) filters.sourceId = sourceId as string;
      if (tags) {
        filters.tags = (tags as string).split(',').map(t => t.trim());
      }
      if (limit) {
        filters.limit = parseInt(limit as string, 10);
      }

      const result = await listImages(tenantId, filters);

      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error listing images:', error);
      res.status(500).json({
        error: 'Failed to list images',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * PATCH /api/image-library/:fileId
   * Update image metadata
   */
  async updateImageMetadata(req: Request, res: Response): Promise<void> {
    try {
      const { fileId } = req.params;
      const { tenantId, metadata } = req.body;

      if (!tenantId || typeof tenantId !== 'string') {
        res.status(400).json({ error: 'tenantId is required' });
        return;
      }

      if (!metadata || typeof metadata !== 'object') {
        res.status(400).json({ error: 'metadata is required' });
        return;
      }

      await updateImageMetadata(tenantId, fileId, metadata);

      res.status(200).json({
        success: true,
        message: 'Image metadata updated successfully'
      });
    } catch (error) {
      console.error('Error updating image metadata:', error);
      res.status(500).json({
        error: 'Failed to update image metadata',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * DELETE /api/image-library/:fileId
   * Delete an image from the library
   */
  async deleteImage(req: Request, res: Response): Promise<void> {
    try {
      const { fileId } = req.params;
      const { tenantId } = req.query;

      if (!tenantId || typeof tenantId !== 'string') {
        res.status(400).json({ error: 'tenantId is required' });
        return;
      }

      await deleteImage(tenantId, fileId);

      res.status(200).json({
        success: true,
        message: 'Image deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting image:', error);
      res.status(500).json({
        error: 'Failed to delete image',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const imageLibraryController = new ImageLibraryController();
