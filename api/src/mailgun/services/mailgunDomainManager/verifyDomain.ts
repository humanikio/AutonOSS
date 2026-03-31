import axios from 'axios';
import { db } from '../../../config/firestore';
import { MailgunVerifyDomainResponse, MailgunDomainVerificationStatus, DnsRecord } from './types';

/**
 * Verify Mailgun domain DNS records via Mailgun API
 *
 * Calls PUT /v4/domains/{name}/verify to check all DNS records
 * Then syncs full domain data from Mailgun to ensure everything is up-to-date
 *
 * @param tenantId - Tenant ID
 * @param domainId - Domain name (e.g., "mybusiness.com")
 * @returns Verification status with DNS record details
 */
export async function verifyDomain(
  tenantId: string,
  domainId: string
): Promise<MailgunDomainVerificationStatus> {
  console.log(`[MAILGUN] Verifying domain ${domainId} via Mailgun API`);

  try {
    // Get API key
    const apiKey = process.env.MAILGUN_API_KEY || process.env.MAILGUN_SENDING_KEY;
    if (!apiKey) {
      throw new Error('MAILGUN_API_KEY not configured');
    }

    // Step 1: Call Mailgun verify API to trigger DNS verification
    console.log(`[MAILGUN] Step 1: Calling verify API for ${domainId}`);
    const verifyResponse = await axios.put<MailgunVerifyDomainResponse>(
      `https://api.mailgun.net/v4/domains/${domainId}/verify`,
      {},
      {
        auth: {
          username: 'api',
          password: apiKey
        }
      }
    );

    const { domain, sending_dns_records, receiving_dns_records } = verifyResponse.data;

    console.log(`[MAILGUN] Verification response for ${domainId}:`, {
      state: domain.state,
      sendingRecords: sending_dns_records.length,
      receivingRecords: receiving_dns_records.length
    });

    // Log each DNS record for debugging
    console.log('[MAILGUN] Sending DNS Records from Mailgun API:');
    sending_dns_records.forEach((record: any, idx: number) => {
      console.log(`  ${idx + 1}. ${record.record_type} - ${record.name} - valid: ${record.valid}`);
      if (record.record_type === 'TXT' && record.name.includes('_domainkey')) {
        console.log(`     DKIM Key preview: ${record.value.substring(0, 50)}...`);
      }
    });

    console.log('[MAILGUN] Receiving DNS Records from Mailgun API:');
    receiving_dns_records.forEach((record: any, idx: number) => {
      console.log(`  ${idx + 1}. ${record.record_type} - ${record.name || '@'} - ${record.value} - valid: ${record.valid}`);
    });

    // Calculate validation status from verify response
    const sendingRecordsValid = sending_dns_records.every(record => record.valid === 'valid');
    const receivingRecordsValid = receiving_dns_records.every(record => record.valid === 'valid');
    const allRecordsValid = sendingRecordsValid && receivingRecordsValid;

    console.log(`[MAILGUN] Verification status:`, {
      sendingRecordsValid,
      receivingRecordsValid,
      allRecordsValid
    });

    // Step 2: Fetch full domain data from Mailgun to sync complete state
    console.log(`[MAILGUN] Step 2: Syncing full domain data for ${domainId}`);
    const syncResponse = await axios.get(
      `https://api.mailgun.net/v4/domains/${domainId}`,
      {
        auth: {
          username: 'api',
          password: apiKey
        },
        params: {
          'h:with_dns': true
        }
      }
    );

    const syncedDomain = syncResponse.data.domain;
    const syncedSendingRecords = syncResponse.data.sending_dns_records || [];
    const syncedReceivingRecords = syncResponse.data.receiving_dns_records || [];

    // Transform DNS records to our format
    const sendingDnsRecords: DnsRecord[] = syncedSendingRecords.map((record: any) => ({
      recordType: record.record_type,
      name: record.name || '',
      value: record.value || '',
      valid: record.valid || 'unknown',
      isActive: record.is_active || false,
      cached: record.cached || [],
      priority: record.priority
    }));

    const receivingDnsRecords: DnsRecord[] = syncedReceivingRecords.map((record: any) => ({
      recordType: record.record_type,
      name: record.name || '',
      value: record.value || '',
      valid: record.valid || 'unknown',
      isActive: record.is_active || false,
      cached: record.cached || [],
      priority: record.priority
    }));

    // Check if all records are valid AND active for sync
    const syncedSendingValid = sendingDnsRecords.every(r => r.valid === 'valid' && r.isActive);
    const syncedReceivingValid = receivingDnsRecords.every(r => r.valid === 'valid' && r.isActive);
    const syncedAllValid = syncedSendingValid && syncedReceivingValid;

    // Determine status based on domain state and record validity
    let status: 'pending' | 'verifying' | 'active' | 'failed' | 'disabled';
    if (syncedDomain.state === 'disabled') {
      status = 'disabled';
    } else if (syncedDomain.state === 'active' && syncedAllValid) {
      status = 'active';
    } else if (syncedDomain.state === 'unverified') {
      status = syncedSendingValid || syncedReceivingValid ? 'verifying' : 'pending';
    } else {
      status = 'verifying';
    }

    console.log(`[MAILGUN] Synced domain state:`, {
      state: syncedDomain.state,
      status,
      allValid: syncedAllValid
    });

    // Create verification status object (from verify response)
    const verificationStatus: MailgunDomainVerificationStatus = {
      lastVerified: new Date(),
      allRecordsValid,
      sendingRecordsValid,
      receivingRecordsValid,
      sendingRecords: sending_dns_records,
      receivingRecords: receiving_dns_records,
      state: syncedDomain.state
    };

    // Step 3: Update Firestore with both verification and synced data
    console.log(`[MAILGUN] Step 3: Updating Firestore with verification and synced data`);
    const docRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('mailgun')
      .doc('config')
      .collection('domains')
      .doc(domainId);

    await docRef.update({
      // Verification data from verify endpoint (detailed DNS record status)
      verification: {
        lastVerified: verificationStatus.lastVerified,
        allRecordsValid: verificationStatus.allRecordsValid,
        sendingRecordsValid: verificationStatus.sendingRecordsValid,
        receivingRecordsValid: verificationStatus.receivingRecordsValid,
        sendingRecords: verificationStatus.sendingRecords,
        receivingRecords: verificationStatus.receivingRecords,
        state: verificationStatus.state
      },
      // Synced domain state and DNS records (transformed format)
      state: syncedDomain.state,
      status,
      sendingDnsRecords,
      receivingDnsRecords,
      verifiedAt: syncedDomain.state === 'active' && syncedAllValid ? new Date() : undefined,
      lastSyncedAt: new Date(),
      errorMessage: syncedAllValid ? null : 'Some DNS records are not yet valid or active',
      updatedAt: new Date()
    });

    console.log(`[MAILGUN] ✓ Verification and sync completed for ${domainId}. State: ${syncedDomain.state}, Status: ${status}`);

    // Verify what was actually saved
    console.log('[MAILGUN] Saved verification.sendingRecords count:', verificationStatus.sendingRecords.length);
    console.log('[MAILGUN] Saved sendingDnsRecords count:', sendingDnsRecords.length);

    return verificationStatus;

  } catch (error) {
    console.error('[MAILGUN] Error verifying domain:', error);

    if (axios.isAxiosError(error) && error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || 'Unknown Mailgun error';

      if (status === 401) {
        throw new Error('Mailgun authentication failed. Check your API key.');
      } else if (status === 404) {
        throw new Error(`Domain ${domainId} not found in Mailgun.`);
      } else if (status === 429) {
        throw new Error('Mailgun rate limit exceeded. Please try again later.');
      }

      throw new Error(`Mailgun verification error: ${message}`);
    }

    throw new Error(`Failed to verify domain: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
