import axios from 'axios';
import { getDomain } from '../services/mailgunDomainManager/getDomain';
import { updateDomain } from '../services/mailgunDomainManager/updateDomain';
import { DnsRecord } from '../services/mailgunDomainManager/types';
import { db } from '../../config/firestore';

/**
 * Sync Mailgun domain data from API to Firestore
 *
 * This utility fetches the latest domain state and DNS records from Mailgun
 * and updates Firestore accordingly.
 *
 * Use cases:
 * - Verify domain DNS configuration
 * - Update verification status
 * - Sync DNS record states
 *
 * @param tenantId - Tenant ID
 * @param domainId - Domain name (e.g., "mybusiness.com")
 * @returns Updated domain data with sync status
 */
export async function syncMailgunDomainData(
  tenantId: string,
  domainId: string
): Promise<{
  success: boolean;
  state: string;
  allRecordsValid: boolean;
  sendingRecordsValid: boolean;
  receivingRecordsValid: boolean;
  message: string;
}> {
  console.log(`[MAILGUN SYNC] Starting sync for domain: ${domainId}`);

  try {
    // Get current domain from Firestore
    const currentDomain = await getDomain(tenantId, domainId);
    if (!currentDomain) {
      throw new Error(`Domain ${domainId} not found in Firestore`);
    }

    // Fetch latest data from Mailgun API - use Account API Key
    const apiKey = process.env.MAILGUN_API_KEY || process.env.MAILGUN_SENDING_KEY;
    if (!apiKey) {
      throw new Error('MAILGUN_API_KEY not configured. Domain management requires Account API Key.');
    }

    const response = await axios.get(
      `https://api.mailgun.net/v4/domains/${domainId}`,
      {
        auth: {
          username: 'api',
          password: apiKey
        },
        params: {
          'h:with_dns': true  // Include DNS records
        }
      }
    );

    const mailgunDomain = response.data.domain;
    const sendingRecords = response.data.sending_dns_records || [];
    const receivingRecords = response.data.receiving_dns_records || [];

    // Transform DNS records
    const sendingDnsRecords: DnsRecord[] = sendingRecords.map((record: any) => ({
      recordType: record.record_type,
      name: record.name || '',
      value: record.value || '',
      valid: record.valid || 'unknown',
      isActive: record.is_active || false,
      cached: record.cached || [],
      priority: record.priority
    }));

    const receivingDnsRecords: DnsRecord[] = receivingRecords.map((record: any) => ({
      recordType: record.record_type,
      name: record.name || '',
      value: record.value || '',
      valid: record.valid || 'unknown',
      isActive: record.is_active || false,
      cached: record.cached || [],
      priority: record.priority
    }));

    // Check if all records are valid
    const sendingValid = sendingDnsRecords.every(r => r.valid === 'valid' && r.isActive);
    const receivingValid = receivingDnsRecords.every(r => r.valid === 'valid' && r.isActive);
    const allValid = sendingValid && receivingValid;

    // Determine new status
    let newStatus: 'pending' | 'verifying' | 'active' | 'failed' | 'disabled';
    if (mailgunDomain.state === 'disabled') {
      newStatus = 'disabled';
    } else if (mailgunDomain.state === 'active' && allValid) {
      newStatus = 'active';
    } else if (mailgunDomain.state === 'unverified') {
      newStatus = sendingValid || receivingValid ? 'verifying' : 'pending';
    } else {
      newStatus = 'verifying';
    }

    // Update Firestore with synced data
    const docRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('mailgun')
      .doc('config')
      .collection('domains')
      .doc(domainId);

    await docRef.update({
      state: mailgunDomain.state,
      sendingDnsRecords,
      receivingDnsRecords,
      status: newStatus,
      verifiedAt: mailgunDomain.state === 'active' && allValid ? new Date() : currentDomain.verifiedAt,
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
      errorMessage: allValid ? null : 'Some DNS records are not yet valid or active'
    });

    console.log(`[MAILGUN SYNC] Domain ${domainId} synced successfully. State: ${mailgunDomain.state}, Status: ${newStatus}`);

    return {
      success: true,
      state: mailgunDomain.state,
      allRecordsValid: allValid,
      sendingRecordsValid: sendingValid,
      receivingRecordsValid: receivingValid,
      message: allValid
        ? 'All DNS records verified successfully'
        : 'Some DNS records are pending verification'
    };

  } catch (error) {
    console.error('[MAILGUN SYNC] Error syncing domain:', error);

    if (axios.isAxiosError(error) && error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || 'Unknown Mailgun error';

      if (status === 401) {
        throw new Error('Mailgun authentication failed. Check your API key.');
      } else if (status === 404) {
        // Update status to failed if domain not found in Mailgun
        await updateDomain(tenantId, domainId, {
          status: 'failed',
          errorMessage: 'Domain not found in Mailgun'
        });
        throw new Error(`Domain ${domainId} not found in Mailgun`);
      } else if (status === 429) {
        throw new Error('Mailgun rate limit exceeded. Please try again later.');
      } else if (status === 400) {
        throw new Error(`Mailgun request error: ${message}`);
      }
    }

    throw new Error(`Failed to sync domain: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
