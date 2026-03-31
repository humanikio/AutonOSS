import { Request, Response } from 'express';
import { startSession } from '../services/startSession';
import { processPrompt } from '../services/processPrompt';
import { publishPipeline } from '../services/publishPipeline';
import { db } from '../../../config/firestore';
import { sessionManager } from '../services/memory/sessionManager';

interface StartSessionRequest {
  prompt: string;
  pipelineId?: string;
}

interface ProcessMessageRequest {
  message: string;
}

export const aiOpportunityAgentController = {
  // Start a new AI assistant session
  async startSession(req: Request, res: Response): Promise<void> {
    try {
      const { prompt, pipelineId } = req.body as StartSessionRequest;
      const tenantId = (req as any).tenantId;
      const userId = (req as any).user.uid;

      if (!prompt || !prompt.trim()) {
        res.status(400).json({ error: 'Prompt is required' });
        return;
      }

      console.log('> Starting AI assistant session for user:', userId);
      console.log('> Initial prompt:', prompt);
      console.log('> Pipeline ID:', pipelineId);

      const sessionData = await startSession(tenantId, userId, prompt, pipelineId);

      res.status(201).json({
        message: 'AI session started successfully',
        data: sessionData
      });
    } catch (error) {
      console.error('Error starting AI session:', error);
      const errorMessage = (error as Error).message;
      if (errorMessage.includes('not found')) {
        res.status(404).json({ error: errorMessage });
      } else {
        res.status(500).json({ error: 'Failed to start AI session' });
      }
    }
  },

  // Process a message in an existing session
  async processMessage(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { message } = req.body as ProcessMessageRequest;
      const tenantId = (req as any).tenantId;
      const userId = (req as any).user.uid;

      if (!message || !message.trim()) {
        res.status(400).json({ error: 'Message is required' });
        return;
      }

      console.log('> Processing message for session:', sessionId);
      console.log('> User message:', message);

      const response = await processPrompt(tenantId, sessionId, message);

      res.status(200).json({
        message: 'Message processed successfully',
        data: response
      });
    } catch (error) {
      console.error('Error processing message:', error);
      const errorMessage = (error as Error).message;
      if (errorMessage.includes('not found')) {
        res.status(404).json({ error: errorMessage });
      } else {
        res.status(500).json({ error: 'Failed to process message' });
      }
    }
  },

  // Get session data
  async getSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const tenantId = (req as any).tenantId;
      const userId = (req as any).user.uid;

      console.log('> Getting session data for:', sessionId);

      // Get session document from Firestore
      const sessionRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('pipelines')
        .doc('main')
        .collection('aiAssistant')
        .doc('main')
        .collection('sessions')
        .doc(sessionId);

      const sessionDoc = await sessionRef.get();
      
      if (!sessionDoc.exists) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      const sessionData = sessionDoc.data();
      console.log('> Found session data:', {
        pipeline: sessionData?.pipeline?.name,
        stageCount: sessionData?.stages?.length || 0
      });

      res.status(200).json({
        message: 'Session data retrieved successfully',
        data: sessionData
      });
    } catch (error) {
      console.error('Error getting session:', error);
      const errorMessage = (error as Error).message;
      res.status(500).json({ error: 'Failed to get session data' });
    }
  },

  // Get recent sessions for continuation
  async getRecentSessions(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).tenantId;
      const userId = (req as any).user.uid;
      const limit = parseInt(req.query.limit as string) || 5;

      console.log('> Getting recent sessions for user:', userId);

      const recentSessions = await sessionManager.getRecentSessions(tenantId, limit);

      res.status(200).json({
        message: 'Recent sessions retrieved successfully',
        data: recentSessions
      });
    } catch (error) {
      console.error('Error getting recent sessions:', error);
      res.status(500).json({ error: 'Failed to get recent sessions' });
    }
  },

  // Publish AI-generated pipeline to production
  async publishPipeline(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const tenantId = (req as any).tenantId;
      const userId = (req as any).user.uid;

      if (!sessionId) {
        res.status(400).json({ error: 'Session ID is required' });
        return;
      }

      console.log('> Publishing pipeline for session:', sessionId);
      console.log('> User ID:', userId);

      const result = await publishPipeline(tenantId, sessionId);

      res.status(200).json({
        message: 'Pipeline published successfully',
        data: result
      });
    } catch (error) {
      console.error('Error publishing pipeline:', error);
      const errorMessage = (error as Error).message;
      
      if (errorMessage.includes('not found')) {
        res.status(404).json({ error: errorMessage });
      } else if (errorMessage.includes('No stages') || errorMessage.includes('does not contain')) {
        res.status(400).json({ error: errorMessage });
      } else {
        res.status(500).json({ error: 'Failed to publish pipeline' });
      }
    }
  }
};