import { Request, Response } from 'express';
import { processRequest } from '../services/generalRequestProcessor';
import {
  getCaseNumbers,
  getCaseNumber,
  updateCaseNumber,
  deleteCaseNumber,
} from '../services/caseNumberManager';
import { ProcessAIRequest } from '../types';

// ==================== AI Processing Controller ====================

export const processRequestController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const { workflowId, nodeId, nodeName, contactId, prompt, systemPrompt } = req.body as ProcessAIRequest;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'User authentication required'
      });
      return;
    }

    // Validate required fields
    if (!workflowId) {
      res.status(400).json({
        success: false,
        error: 'workflowId is required'
      });
      return;
    }

    if (!nodeId) {
      res.status(400).json({
        success: false,
        error: 'nodeId is required'
      });
      return;
    }

    if (!contactId) {
      res.status(400).json({
        success: false,
        error: 'contactId is required'
      });
      return;
    }

    if (!prompt) {
      res.status(400).json({
        success: false,
        error: 'prompt is required'
      });
      return;
    }

    console.log(`> AI Processing request: workflow=${workflowId}, node=${nodeId}, contact=${contactId}`);

    // Process the request
    const result = await processRequest({
      tenantId,
      workflowId,
      nodeId,
      nodeName,
      contactId,
      prompt,
      systemPrompt,
    });

    // Return response directly at root level for n8n compatibility
    // n8n expects fields to be accessible as $json.caseId and $json.response
    res.status(200).json({
      ...result,  // Spread caseId and response to root level
      success: true,
    });
  } catch (error: any) {
    console.error('Error processing AI request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process AI request',
      message: error.message,
    });
  }
};

// ==================== Case Management Controllers ====================

export const getCasesController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const { workflowId, nodeId, nodeName } = req.query;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'User authentication required'
      });
      return;
    }

    if (!workflowId || typeof workflowId !== 'string') {
      res.status(400).json({
        success: false,
        error: 'workflowId is required in query parameters'
      });
      return;
    }

    if (!nodeId || typeof nodeId !== 'string') {
      res.status(400).json({
        success: false,
        error: 'nodeId is required in query parameters'
      });
      return;
    }

    console.log(`=📋 Getting cases: tenant=${tenantId}, workflow=${workflowId}, node=${nodeId}`);

    const cases = await getCaseNumbers(
      tenantId,
      workflowId,
      nodeId,
      nodeName as string | undefined
    );

    res.status(200).json({
      success: true,
      data: cases,
    });
  } catch (error) {
    console.error('Error getting cases:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cases',
    });
  }
};

export const getSingleCaseController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const { caseId } = req.params;
    const { workflowId, nodeId } = req.query;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'User authentication required'
      });
      return;
    }

    if (!workflowId || typeof workflowId !== 'string') {
      res.status(400).json({
        success: false,
        error: 'workflowId is required in query parameters'
      });
      return;
    }

    if (!nodeId || typeof nodeId !== 'string') {
      res.status(400).json({
        success: false,
        error: 'nodeId is required in query parameters'
      });
      return;
    }

    const caseData = await getCaseNumber(tenantId, workflowId, nodeId, caseId);

    if (!caseData) {
      res.status(404).json({
        success: false,
        error: 'Case not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: caseData,
    });
  } catch (error) {
    console.error('Error getting case:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get case',
    });
  }
};

export const updateCaseController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const { caseId } = req.params;
    const { workflowId, nodeId } = req.query;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'User authentication required'
      });
      return;
    }

    if (!workflowId || typeof workflowId !== 'string') {
      res.status(400).json({
        success: false,
        error: 'workflowId is required in query parameters'
      });
      return;
    }

    if (!nodeId || typeof nodeId !== 'string') {
      res.status(400).json({
        success: false,
        error: 'nodeId is required in query parameters'
      });
      return;
    }

    const updatedCase = await updateCaseNumber(
      tenantId,
      workflowId,
      nodeId,
      caseId,
      req.body
    );

    if (!updatedCase) {
      res.status(404).json({
        success: false,
        error: 'Case not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: updatedCase,
    });
  } catch (error) {
    console.error('Error updating case:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update case',
    });
  }
};

export const deleteCaseController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const { caseId } = req.params;
    const { workflowId, nodeId } = req.query;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'User authentication required'
      });
      return;
    }

    if (!workflowId || typeof workflowId !== 'string') {
      res.status(400).json({
        success: false,
        error: 'workflowId is required in query parameters'
      });
      return;
    }

    if (!nodeId || typeof nodeId !== 'string') {
      res.status(400).json({
        success: false,
        error: 'nodeId is required in query parameters'
      });
      return;
    }

    const deleted = await deleteCaseNumber(tenantId, workflowId, nodeId, caseId);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Case not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Case deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting case:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete case',
    });
  }
};
