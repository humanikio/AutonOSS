import { Request, Response } from 'express';
import {
  createSession,
  getSessions,
  readSession,
  updateSession,
  deleteSession,
  CreateSessionData,
  UpdateSessionData
} from '../services/sessionManager';
import { generateImageAsset } from '../services/imageGeneration';
import { getSessionAssets } from '../services/imageGeneration/genImage';
import { saveGeneratedImageToLibrary } from '../services/saveToLibrary';

class ContentStudioController {
  /**
   * GET /api/content-sessions
   * List all content sessions for a tenant
   */
  async listSessions(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.query;

      if (!tenantId || typeof tenantId !== 'string') {
        res.status(400).json({ error: 'tenantId is required' });
        return;
      }

      const sessions = await getSessions(tenantId);

      // Transform for frontend
      const formattedSessions = sessions.map(session => ({
        id: session.id,
        name: session.name,
        prompt: session.prompt,
        imageCount: session.imageCount,
        status: session.status,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
        createdBy: session.createdBy
      }));

      res.json(formattedSessions);
    } catch (error) {
      console.error('Error listing content sessions:', error);
      res.status(500).json({ error: 'Failed to list content sessions' });
    }
  }

  /**
   * GET /api/content-sessions/:sessionId
   * Get a specific content session
   */
  async getSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { tenantId } = req.query;

      if (!tenantId || typeof tenantId !== 'string') {
        res.status(400).json({ error: 'tenantId is required' });
        return;
      }

      const session = await readSession(tenantId, sessionId);

      if (!session) {
        res.status(404).json({ error: 'Content session not found' });
        return;
      }

      // Transform for frontend
      const formattedSession = {
        id: session.id,
        name: session.name,
        prompt: session.prompt,
        imageCount: session.imageCount,
        status: session.status,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
        createdBy: session.createdBy
      };

      res.json(formattedSession);
    } catch (error) {
      console.error('Error getting content session:', error);
      res.status(500).json({ error: 'Failed to get content session' });
    }
  }

  /**
   * POST /api/content-sessions
   * Create a new content session
   */
  async createSession(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, name, prompt } = req.body;

      if (!tenantId) {
        res.status(400).json({ error: 'tenantId is required' });
        return;
      }

      // Get userId from authenticated request (if available)
      const userId = (req as any).user?.uid;

      const sessionData: CreateSessionData = {
        name: name || 'Untitled Session',
        prompt: prompt || ''
      };

      const session = await createSession(tenantId, sessionData, userId);

      // Transform for frontend
      const formattedSession = {
        id: session.id,
        name: session.name,
        prompt: session.prompt,
        imageCount: session.imageCount,
        status: session.status,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
        createdBy: session.createdBy
      };

      res.status(201).json({
        success: true,
        session: formattedSession
      });
    } catch (error) {
      console.error('Error creating content session:', error);
      res.status(500).json({ error: 'Failed to create content session' });
    }
  }

  /**
   * PATCH /api/content-sessions/:sessionId
   * Update a content session
   */
  async updateSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { tenantId, name, prompt, imageCount, status } = req.body;

      if (!tenantId) {
        res.status(400).json({ error: 'tenantId is required' });
        return;
      }

      const updateData: UpdateSessionData = {};
      if (name !== undefined) updateData.name = name;
      if (prompt !== undefined) updateData.prompt = prompt;
      if (imageCount !== undefined) updateData.imageCount = imageCount;
      if (status !== undefined) updateData.status = status;

      const session = await updateSession(tenantId, sessionId, updateData);

      // Transform for frontend
      const formattedSession = {
        id: session.id,
        name: session.name,
        prompt: session.prompt,
        imageCount: session.imageCount,
        status: session.status,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
        createdBy: session.createdBy
      };

      res.json({
        success: true,
        session: formattedSession
      });
    } catch (error) {
      console.error('Error updating content session:', error);
      if (error instanceof Error && error.message === 'Content session not found') {
        res.status(404).json({ error: 'Content session not found' });
      } else {
        res.status(500).json({ error: 'Failed to update content session' });
      }
    }
  }

  /**
   * DELETE /api/content-sessions/:sessionId
   * Delete a content session
   */
  async deleteSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { tenantId } = req.body;

      if (!tenantId) {
        res.status(400).json({ error: 'tenantId is required' });
        return;
      }

      await deleteSession(tenantId, sessionId);

      res.json({
        success: true,
        message: 'Content session deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting content session:', error);
      if (error instanceof Error && error.message === 'Content session not found') {
        res.status(404).json({ error: 'Content session not found' });
      } else {
        res.status(500).json({ error: 'Failed to delete content session' });
      }
    }
  }

  /**
   * GET /api/content-sessions/:sessionId/assets
   * Get all assets for a session
   */
  async getAssets(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { tenantId } = req.query;

      if (!tenantId || typeof tenantId !== 'string') {
        res.status(400).json({ error: 'tenantId is required' });
        return;
      }

      const assets = await getSessionAssets(tenantId, sessionId);

      // Transform for frontend
      const formattedAssets = assets.map(asset => ({
        id: asset.id,
        url: asset.url,
        prompt: asset.prompt,
        createdAt: asset.createdAt.toISOString(),
        complimentaryColor: asset.complimentaryColor,
        isSavedToLibrary: asset.isSavedToLibrary || false,
        libraryFileId: asset.libraryFileId,
        libraryUrl: asset.libraryUrl
      }));

      res.json(formattedAssets);
    } catch (error) {
      console.error('Error getting session assets:', error);
      res.status(500).json({ error: 'Failed to get session assets' });
    }
  }

  /**
   * POST /api/content-sessions/:sessionId/generate
   * Generate an image for a session
   */
  async generateImage(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { tenantId, prompt, aspectRatio, style, quality } = req.body;

      if (!tenantId) {
        res.status(400).json({ error: 'tenantId is required' });
        return;
      }

      if (!sessionId) {
        res.status(400).json({ error: 'sessionId is required' });
        return;
      }

      // Verify session exists
      const session = await readSession(tenantId, sessionId);
      if (!session) {
        res.status(404).json({ error: 'Content session not found' });
        return;
      }

      // Generate image asset
      const asset = await generateImageAsset(tenantId, sessionId, {
        prompt,
        aspectRatio,
        style,
        quality
      });

      res.status(201).json({
        success: true,
        asset: {
          id: asset.id,
          url: asset.url,
          prompt: asset.prompt,
          createdAt: asset.createdAt.toISOString(),
          complimentaryColor: asset.complimentaryColor,
          isSavedToLibrary: asset.isSavedToLibrary || false
        }
      });
    } catch (error) {
      console.error('Error generating image:', error);
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to generate image' });
      }
    }
  }

  /**
   * POST /api/content-sessions/:sessionId/assets/:assetId/save-to-library
   * Save a generated image to the central image library
   */
  async saveToLibrary(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId, assetId } = req.params;
      const { tenantId, tags, purpose } = req.body;

      if (!tenantId) {
        res.status(400).json({ error: 'tenantId is required' });
        return;
      }

      const result = await saveGeneratedImageToLibrary({
        tenantId,
        sessionId,
        assetId,
        tags,
        purpose
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          libraryFileId: result.libraryFileId,
          libraryUrl: result.libraryUrl
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to save to library'
        });
      }
    } catch (error) {
      console.error('Error saving to library:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save to library'
      });
    }
  }
}

export const contentStudioController = new ContentStudioController();
