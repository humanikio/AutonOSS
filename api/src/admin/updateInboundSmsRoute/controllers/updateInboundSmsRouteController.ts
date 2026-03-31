import { Request, Response } from 'express';
import { updateSingleUserService } from '../services/updateSingleUser';
import { updateBulkUserService } from '../services/updateBulkUser';

export const updateSingleTenantSmsRoute = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId, newSmsUrl } = req.body;

    if (!tenantId || !newSmsUrl) {
      res.status(400).json({
        success: false,
        error: 'tenantId and newSmsUrl are required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (!isValidUrl(newSmsUrl)) {
      res.status(400).json({
        success: false,
        error: 'newSmsUrl must be a valid HTTP/HTTPS URL',
        timestamp: new Date().toISOString()
      });
      return;
    }

    console.log(`Admin request to update SMS route for tenant ${tenantId} to ${newSmsUrl}`);

    const result = await updateSingleUserService.updateUserSmsRoute({
      tenantId,
      newSmsUrl
    });

    res.status(200).json({
      success: true,
      message: `SMS route update completed for tenant ${tenantId}`,
      data: {
        tenantId: result.tenantId,
        totalProcessed: result.totalProcessed,
        successful: result.updatedNumbers.length,
        failed: result.failedNumbers.length,
        updatedNumbers: result.updatedNumbers,
        failedNumbers: result.failedNumbers
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in updateSingleTenantSmsRoute controller:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to update SMS route',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
};

export const updateAllTenantsSmsRoute = async (req: Request, res: Response): Promise<void> => {
  try {
    const { newSmsUrl } = req.body;

    if (!newSmsUrl) {
      res.status(400).json({
        success: false,
        error: 'newSmsUrl is required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (!isValidUrl(newSmsUrl)) {
      res.status(400).json({
        success: false,
        error: 'newSmsUrl must be a valid HTTP/HTTPS URL',
        timestamp: new Date().toISOString()
      });
      return;
    }

    console.log(`Admin request to update SMS route for ALL tenants to ${newSmsUrl}`);

    const result = await updateBulkUserService.updateAllUsersSmsRoute({
      newSmsUrl
    });

    res.status(200).json({
      success: true,
      message: 'Bulk SMS route update completed',
      data: {
        totalTenantsProcessed: result.totalTenantsProcessed,
        totalNumbersProcessed: result.totalNumbersProcessed,
        successful: result.updatedNumbers.length,
        failed: result.failedNumbers.length,
        updatedNumbers: result.updatedNumbers,
        failedNumbers: result.failedNumbers,
        tenantResults: result.tenantResults
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in updateAllTenantsSmsRoute controller:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to update SMS routes',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
};

function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch (error) {
    return false;
  }
}