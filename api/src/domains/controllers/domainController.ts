import { Request, Response } from 'express';
import { domainManager } from '../services/domainManager';

class DomainController {
  /**
   * POST /api/domains
   * Create a new domain
   */
  async createDomain(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, domainId, displayName, description, isPrimary, verificationMethod } = req.body;

      if (!tenantId || !domainId) {
        res.status(400).json({ error: 'tenantId and domainId are required' });
        return;
      }

      const domain = await domainManager.createDomain({
        tenantId,
        domainId,
        displayName,
        description,
        isPrimary,
        verificationMethod
      });

      res.json({
        success: true,
        domain
      });
    } catch (error) {
      console.error('Error creating domain:', error);
      res.status(500).json({
        error: 'Failed to create domain',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/domains
   * List all domains for a tenant
   */
  async listDomains(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, verified, isPrimary, hasConnection } = req.query;

      if (!tenantId || typeof tenantId !== 'string') {
        res.status(400).json({ error: 'tenantId is required' });
        return;
      }

      const filters: any = {};
      if (verified !== undefined) filters.verified = verified === 'true';
      if (isPrimary !== undefined) filters.isPrimary = isPrimary === 'true';
      if (hasConnection) filters.hasConnection = hasConnection as 'mailgun';

      const domains = await domainManager.getDomains(tenantId, filters);

      res.json({
        success: true,
        count: domains.length,
        domains
      });
    } catch (error) {
      console.error('Error listing domains:', error);
      res.status(500).json({
        error: 'Failed to list domains',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/domains/:domainId
   * Get a specific domain
   */
  async getDomain(req: Request, res: Response): Promise<void> {
    try {
      const { domainId } = req.params;
      const { tenantId } = req.query;

      if (!tenantId || typeof tenantId !== 'string') {
        res.status(400).json({ error: 'tenantId is required' });
        return;
      }

      const domain = await domainManager.getDomain(tenantId, domainId);

      if (!domain) {
        res.status(404).json({ error: 'Domain not found' });
        return;
      }

      res.json({
        success: true,
        domain
      });
    } catch (error) {
      console.error('Error getting domain:', error);
      res.status(500).json({
        error: 'Failed to get domain',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * PATCH /api/domains/:domainId
   * Update domain metadata
   */
  async updateDomain(req: Request, res: Response): Promise<void> {
    try {
      const { domainId } = req.params;
      const { tenantId, ...updateData } = req.body;

      if (!tenantId) {
        res.status(400).json({ error: 'tenantId is required' });
        return;
      }

      if (Object.keys(updateData).length === 0) {
        res.status(400).json({ error: 'No update data provided' });
        return;
      }

      await domainManager.updateDomain(tenantId, domainId, updateData);

      res.json({
        success: true,
        message: 'Domain updated successfully'
      });
    } catch (error) {
      console.error('Error updating domain:', error);
      res.status(500).json({
        error: 'Failed to update domain',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * DELETE /api/domains/:domainId
   * Remove a domain
   */
  async deleteDomain(req: Request, res: Response): Promise<void> {
    try {
      const { domainId } = req.params;
      const tenantId = req.tenantId!; // Auth middleware sets this

      await domainManager.removeDomain(tenantId, domainId);

      res.json({
        success: true,
        message: 'Domain removed successfully'
      });
    } catch (error) {
      console.error('Error removing domain:', error);

      // Check if error is about active connections
      if (error instanceof Error && error.message.includes('active connections')) {
        res.status(409).json({
          error: 'Domain has active connections',
          details: error.message,
          code: 'ACTIVE_CONNECTIONS'
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to remove domain',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * POST /api/domains/:domainId/verify
   * Verify domain ownership
   */
  async verifyDomain(req: Request, res: Response): Promise<void> {
    try {
      const { domainId } = req.params;
      const tenantId = req.tenantId!; // Auth middleware sets this

      const result = await domainManager.verifyDomain(tenantId, domainId);

      res.json({
        success: result.success,
        verified: result.verified,
        method: result.method,
        message: result.message,
        verifiedAt: result.verifiedAt
      });
    } catch (error) {
      console.error('Error verifying domain:', error);
      res.status(500).json({
        error: 'Failed to verify domain',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const domainController = new DomainController();
