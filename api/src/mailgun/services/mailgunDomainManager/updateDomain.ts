import { db } from '../../../config/firestore';
import { UpdateDomainData } from './types';
import axios from 'axios';
import FormData from 'form-data';

/**
 * Update a Mailgun domain's settings
 *
 * Updates both Mailgun API and Firestore
 *
 * @param tenantId - Tenant ID
 * @param domainId - Domain name (e.g., "mybusiness.com")
 * @param updateData - Fields to update
 */
export async function updateDomain(
  tenantId: string,
  domainId: string,
  updateData: UpdateDomainData
): Promise<void> {
  const docRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('mailgun')
    .doc('config')
    .collection('domains')
    .doc(domainId);

  // Verify domain exists
  const doc = await docRef.get();
  if (!doc.exists) {
    throw new Error(`Domain ${domainId} not found`);
  }

  // Separate Mailgun API updates from local status updates
  const mailgunUpdates: any = {};
  const firestoreUpdates: any = {
    updatedAt: new Date()
  };

  // Fields that should be sent to Mailgun API
  if (updateData.smtpPassword !== undefined) {
    mailgunUpdates.smtp_password = updateData.smtpPassword;
    firestoreUpdates.smtpPassword = updateData.smtpPassword;
  }
  if (updateData.spamAction !== undefined) {
    mailgunUpdates.spam_action = updateData.spamAction;
    firestoreUpdates.spamAction = updateData.spamAction;
  }
  if (updateData.wildcard !== undefined) {
    mailgunUpdates.wildcard = updateData.wildcard;
    firestoreUpdates.wildcard = updateData.wildcard;
  }
  if (updateData.requireTls !== undefined) {
    mailgunUpdates.require_tls = updateData.requireTls;
    firestoreUpdates.requireTls = updateData.requireTls;
  }
  if (updateData.skipVerification !== undefined) {
    mailgunUpdates.skip_verification = updateData.skipVerification;
    firestoreUpdates.skipVerification = updateData.skipVerification;
  }
  if (updateData.webScheme !== undefined) {
    mailgunUpdates.web_scheme = updateData.webScheme;
    firestoreUpdates.webScheme = updateData.webScheme;
  }
  if (updateData.webPrefix !== undefined) {
    mailgunUpdates.web_prefix = updateData.webPrefix;
    firestoreUpdates.webPrefix = updateData.webPrefix;
  }

  // Fields that are local only (status tracking)
  if (updateData.status !== undefined) {
    firestoreUpdates.status = updateData.status;
  }
  if (updateData.errorMessage !== undefined) {
    firestoreUpdates.errorMessage = updateData.errorMessage;
  }

  try {
    // Update Mailgun API if there are changes
    if (Object.keys(mailgunUpdates).length > 0) {
      const apiKey = process.env.MAILGUN_API_KEY || process.env.MAILGUN_SENDING_KEY;
      if (!apiKey) {
        throw new Error('MAILGUN_API_KEY not configured. Domain management requires Account API Key.');
      }

      const formData = new FormData();
      Object.keys(mailgunUpdates).forEach(key => {
        formData.append(key, mailgunUpdates[key].toString());
      });

      console.log(`[MAILGUN] Updating domain ${domainId} in Mailgun API`);
      await axios.put(
        `https://api.mailgun.net/v4/domains/${domainId}`,
        formData,
        {
          auth: {
            username: 'api',
            password: apiKey
          },
          headers: formData.getHeaders()
        }
      );
    }

    // Update Firestore
    await docRef.update(firestoreUpdates);

    console.log(`[MAILGUN] Domain ${domainId} updated successfully`);

  } catch (error) {
    console.error('[MAILGUN] Error updating domain:', error);

    if (axios.isAxiosError(error) && error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || 'Unknown Mailgun error';

      if (status === 401) {
        throw new Error('Mailgun authentication failed. Check your API key.');
      } else if (status === 404) {
        throw new Error(`Domain ${domainId} not found in Mailgun`);
      } else if (status === 400) {
        throw new Error(`Mailgun request error: ${message}`);
      }
    }

    throw new Error(`Failed to update domain: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
