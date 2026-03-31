import { db } from '../../../config/firestore';
import { CreateDomainData, MailgunDomain, DnsRecord } from './types';
import { validateDomainForConnection, connectDomainToMailgun } from '../../../domains/utils/syncDomainConnections';
import { verifyDomain } from './verifyDomain';
import axios from 'axios';
import FormData from 'form-data';

/**
 * Create a new Mailgun domain
 *
 * Flow:
 * 1. Call Mailgun API to create domain
 * 2. Store domain data + DNS records in Firestore
 * 3. Return domain with DNS instructions
 */
export async function addDomain(data: CreateDomainData): Promise<MailgunDomain> {
  const { tenantId, domainId, smtpPassword, spamAction, wildcard, useAutomaticSenderSecurity, requireTls, webScheme } = data;

  // Validate environment - use MAILGUN_API_KEY (Account API Key) for domain management
  // MAILGUN_SENDING_KEY is for sending emails only, not domain creation
  const apiKey = process.env.MAILGUN_API_KEY || process.env.MAILGUN_SENDING_KEY;
  if (!apiKey) {
    throw new Error('MAILGUN_API_KEY not configured. Domain management requires Account API Key.');
  }

  // Check if base domain exists and is verified
  await validateDomainForConnection(tenantId, domainId, true);

  // Check if Mailgun domain already exists
  const docRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('mailgun')
    .doc('config')
    .collection('domains')
    .doc(domainId);

  const existingDoc = await docRef.get();
  if (existingDoc.exists) {
    throw new Error(`Domain ${domainId} already connected to Mailgun for this tenant`);
  }

  try {
    // Prepare Mailgun API request
    const formData = new FormData();
    formData.append('name', domainId);

    if (smtpPassword) formData.append('smtp_password', smtpPassword);
    if (spamAction) formData.append('spam_action', spamAction);
    if (wildcard !== undefined) formData.append('wildcard', wildcard.toString());
    if (useAutomaticSenderSecurity !== undefined) {
      formData.append('use_automatic_sender_security', useAutomaticSenderSecurity.toString());
    }
    if (requireTls !== undefined) formData.append('require_tls', requireTls.toString());
    if (webScheme) formData.append('web_scheme', webScheme);

    // Call Mailgun API
    console.log(`[MAILGUN] Creating domain: ${domainId}`);
    const response = await axios.post(
      'https://api.mailgun.net/v4/domains',
      formData,
      {
        auth: {
          username: 'api',
          password: apiKey
        },
        headers: formData.getHeaders()
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

    // Create Firestore document
    const domainData: MailgunDomain = {
      domainId,
      tenantId,
      mailgunDomainId: mailgunDomain.id,
      state: mailgunDomain.state || 'unverified',
      type: mailgunDomain.type || 'custom',
      smtpLogin: mailgunDomain.smtp_login,
      smtpPassword: mailgunDomain.smtp_password,
      sendingDnsRecords,
      receivingDnsRecords,
      spamAction: mailgunDomain.spam_action || 'disabled',
      requireTls: mailgunDomain.require_tls || false,
      skipVerification: mailgunDomain.skip_verification || false,
      wildcard: mailgunDomain.wildcard || false,
      useAutomaticSenderSecurity: mailgunDomain.use_automatic_sender_security || false,
      webScheme: mailgunDomain.web_scheme || 'http',
      webPrefix: mailgunDomain.web_prefix || 'email',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await docRef.set(domainData);

    // Update base domain to mark Mailgun connection
    await connectDomainToMailgun(tenantId, domainId);

    // Immediately verify DNS records after creation
    try {
      console.log(`[MAILGUN] Running initial DNS verification for ${domainId}`);
      const verificationStatus = await verifyDomain(tenantId, domainId);
      domainData.verification = verificationStatus;
    } catch (verifyError) {
      console.warn(`[MAILGUN] Initial verification failed for ${domainId}:`, verifyError);
      // Don't fail domain creation if verification fails
    }

    console.log(`[MAILGUN] Domain ${domainId} created successfully and connected`);
    return domainData;

  } catch (error) {
    console.error('[MAILGUN] Error creating domain:', error);

    // Handle Mailgun API errors
    if (axios.isAxiosError(error) && error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || 'Unknown Mailgun error';

      if (status === 401) {
        throw new Error('Mailgun authentication failed. Check your API key.');
      } else if (status === 400) {
        throw new Error(`Mailgun request error: ${message}`);
      } else if (status === 409) {
        throw new Error(`Domain ${domainId} already exists in Mailgun`);
      }
    }

    throw new Error(`Failed to create domain: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
