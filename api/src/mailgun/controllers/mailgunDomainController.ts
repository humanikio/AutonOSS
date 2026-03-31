import { Request, Response } from 'express';
import { mailgunDomainManager } from '../services/mailgunDomainManager';
import { syncMailgunDomainData } from '../utils/syncMailgunDomainData';

/**
 * Extract root domain from any subdomain
 *
 * Examples:
 * - www.example.com -> example.com
 * - app.example.com -> example.com
 * - mail.example.co.uk -> example.co.uk
 * - example.com -> example.com
 */
function extractRootDomain(domain: string): string {
  const parts = domain.split('.');

  if (parts.length <= 2) {
    return domain;
  }

  const knownSLDs = ['co', 'com', 'org', 'gov', 'edu', 'net', 'ac', 'mil'];
  const lastPart = parts[parts.length - 1];
  const secondLastPart = parts[parts.length - 2];

  if (lastPart.length <= 3 && knownSLDs.includes(secondLastPart)) {
    return parts.slice(-3).join('.');
  }

  return parts.slice(-2).join('.');
}

class MailgunDomainController {
  /**
   * POST /api/mailgun/domains
   * Create a new Mailgun domain
   */
  async createDomain(req: Request, res: Response): Promise<void> {
    try {
      let { tenantId, domainId, smtpPassword, spamAction, wildcard, useAutomaticSenderSecurity, requireTls, webScheme } = req.body;

      if (!tenantId || !domainId) {
        res.status(400).json({ error: 'tenantId and domainId are required' });
        return;
      }

      // Extract root domain (strip www and subdomains)
      const originalDomain = domainId;
      domainId = extractRootDomain(domainId);
      if (domainId !== originalDomain) {
        console.log(`[MAILGUN] Extracted root domain: ${originalDomain} -> ${domainId}`);
      }

      // Validate domain format (basic check)
      const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;
      if (!domainRegex.test(domainId)) {
        res.status(400).json({ error: 'Invalid domain format' });
        return;
      }

      const domain = await mailgunDomainManager.addDomain({
        tenantId,
        domainId,
        smtpPassword,
        spamAction,
        wildcard,
        useAutomaticSenderSecurity,
        requireTls,
        webScheme
      });

      res.json({
        success: true,
        domain
      });
    } catch (error) {
      console.error('Error creating Mailgun domain:', error);
      res.status(500).json({
        error: 'Failed to create Mailgun domain',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/mailgun/domains
   * List all domains for a tenant
   */
  async listDomains(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, state, status } = req.query;

      if (!tenantId || typeof tenantId !== 'string') {
        res.status(400).json({ error: 'tenantId is required' });
        return;
      }

      const filters: any = {};
      if (state) filters.state = state;
      if (status) filters.status = status;

      const domains = await mailgunDomainManager.getDomains(tenantId, filters);

      res.json({
        success: true,
        count: domains.length,
        domains
      });
    } catch (error) {
      console.error('Error listing Mailgun domains:', error);
      res.status(500).json({
        error: 'Failed to list Mailgun domains',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/mailgun/domains/:domainId
   * Get a specific domain
   */
  async getDomain(req: Request, res: Response): Promise<void> {
    try {
      let { domainId } = req.params;
      const { tenantId } = req.query;

      if (!tenantId || typeof tenantId !== 'string') {
        res.status(400).json({ error: 'tenantId is required' });
        return;
      }

      // Extract root domain
      domainId = extractRootDomain(domainId);

      const domain = await mailgunDomainManager.getDomain(tenantId, domainId);

      if (!domain) {
        res.status(404).json({ error: 'Domain not found' });
        return;
      }

      res.json({
        success: true,
        domain
      });
    } catch (error) {
      console.error('Error getting Mailgun domain:', error);
      res.status(500).json({
        error: 'Failed to get Mailgun domain',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * PUT /api/mailgun/domains/:domainId
   * Update domain settings
   */
  async updateDomain(req: Request, res: Response): Promise<void> {
    try {
      let { domainId } = req.params;
      const { tenantId, ...updateData } = req.body;

      if (!tenantId) {
        res.status(400).json({ error: 'tenantId is required' });
        return;
      }

      if (Object.keys(updateData).length === 0) {
        res.status(400).json({ error: 'No update data provided' });
        return;
      }

      // Extract root domain
      domainId = extractRootDomain(domainId);

      await mailgunDomainManager.updateDomain(tenantId, domainId, updateData);

      res.json({
        success: true,
        message: 'Domain updated successfully'
      });
    } catch (error) {
      console.error('Error updating Mailgun domain:', error);
      res.status(500).json({
        error: 'Failed to update Mailgun domain',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * DELETE /api/mailgun/domains/:domainId
   * Remove a domain
   */
  async deleteDomain(req: Request, res: Response): Promise<void> {
    try {
      const { domainId } = req.params;
      const tenantId = req.tenantId!; // Auth middleware sets this

      // Extract root domain but keep original for legacy support
      const originalDomainId = domainId;
      const rootDomain = extractRootDomain(domainId);

      if (rootDomain !== originalDomainId) {
        console.log(`[MAILGUN] Extracted root domain: ${originalDomainId} -> ${rootDomain}`);
      }

      // Pass both root and original domain for legacy support
      await mailgunDomainManager.removeDomain(tenantId, rootDomain, originalDomainId);

      res.json({
        success: true,
        message: 'Domain removed successfully'
      });
    } catch (error) {
      console.error('Error removing Mailgun domain:', error);
      res.status(500).json({
        error: 'Failed to remove Mailgun domain',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * POST /api/mailgun/domains/:domainId/verify
   * Verify domain DNS records via Mailgun API
   */
  async verifyDomain(req: Request, res: Response): Promise<void> {
    try {
      let { domainId } = req.params;
      const tenantId = req.tenantId!; // Auth middleware sets this

      console.log(`[CONTROLLER] Received verification request for domain: ${domainId}, tenantId: ${tenantId}`);

      // Extract root domain
      domainId = extractRootDomain(domainId);
      console.log(`[CONTROLLER] Using root domain: ${domainId}`);

      console.log('[CONTROLLER] Calling mailgunDomainManager.verifyDomain...');
      const verificationStatus = await mailgunDomainManager.verifyDomain(tenantId, domainId);
      console.log('[CONTROLLER] Verification completed successfully');

      res.json({
        success: true,
        verified: verificationStatus.allRecordsValid,
        sendingRecordsValid: verificationStatus.sendingRecordsValid,
        receivingRecordsValid: verificationStatus.receivingRecordsValid,
        state: verificationStatus.state,
        lastVerified: verificationStatus.lastVerified,
        sendingRecords: verificationStatus.sendingRecords,
        receivingRecords: verificationStatus.receivingRecords
      });
    } catch (error) {
      console.error('Error verifying Mailgun domain:', error);
      res.status(500).json({
        error: 'Failed to verify Mailgun domain',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * POST /api/mailgun/domains/:domainId/sync
   * Sync domain data from Mailgun API
   */
  async syncDomain(req: Request, res: Response): Promise<void> {
    try {
      let { domainId } = req.params;
      const tenantId = req.tenantId!; // Auth middleware sets this

      // Extract root domain
      domainId = extractRootDomain(domainId);

      const syncResult = await syncMailgunDomainData(tenantId, domainId);

      res.json({
        success: syncResult.success,
        state: syncResult.state,
        allRecordsValid: syncResult.allRecordsValid,
        sendingRecordsValid: syncResult.sendingRecordsValid,
        receivingRecordsValid: syncResult.receivingRecordsValid,
        message: syncResult.message
      });
    } catch (error) {
      console.error('Error syncing Mailgun domain:', error);
      res.status(500).json({
        error: 'Failed to sync Mailgun domain',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const mailgunDomainController = new MailgunDomainController();
