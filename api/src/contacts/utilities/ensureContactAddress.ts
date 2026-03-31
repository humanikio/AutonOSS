import { firestore } from '../../config/firebase';
import admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';

/**
 * Ensures a contact has an address record for the given channel.
 * Supports phone numbers (SMS), email addresses (EMAIL), and WhatsApp numbers.
 *
 * CRITICAL: This is required for contacts to appear in the conversations list!
 * The frontend requires is_primary: true addresses to display contacts.
 *
 * How it works:
 * 1. Normalizes the address (lowercase for emails, digits-only for phones)
 * 2. Checks if the exact address already exists for this contact+channel
 * 3. If not, checks if a primary address exists for this channel
 * 4. Creates new address with is_primary: true if it's the first for this channel
 *
 * @param tenantId - The tenant ID
 * @param contactId - The contact ID
 * @param channel - 'SMS' for phone numbers, 'EMAIL' for emails, 'WHATSAPP' for WhatsApp
 * @param address - The phone number or email address (will be normalized)
 *
 * @example
 * // Ensure email address exists
 * await ensureContactAddress(tenantId, contactId, 'EMAIL', 'John@Example.COM');
 * // Creates: { channel: 'EMAIL', address_norm: 'john@example.com', is_primary: true }
 *
 * @example
 * // Ensure phone number exists
 * await ensureContactAddress(tenantId, contactId, 'SMS', '+1 (555) 123-4567');
 * // Creates: { channel: 'SMS', address_norm: '15551234567', is_primary: true }
 */
export async function ensureContactAddress(
  tenantId: string,
  contactId: string,
  channel: 'SMS' | 'EMAIL' | 'WHATSAPP',
  address: string
): Promise<void> {
  try {
    // 1. Validate input
    if (!address || address.trim().length === 0) {
      console.warn(`⚠️ Empty address provided for ${channel}, skipping`);
      return;
    }

    // Validate email vs phone mismatch
    const looksLikeEmail = address.includes('@');
    if (channel !== 'EMAIL' && looksLikeEmail) {
      console.error(`❌ Email address "${address}" provided for ${channel} channel - rejecting!`);
      return;
    }
    if (channel === 'EMAIL' && !looksLikeEmail) {
      console.warn(`⚠️ Non-email "${address}" provided for EMAIL channel - may be invalid`);
    }

    // 2. Normalize address based on channel
    let normalizedAddress: string;

    if (channel === 'EMAIL') {
      // Email: lowercase and trim whitespace
      normalizedAddress = address.toLowerCase().trim();
    } else {
      // SMS/WHATSAPP: strip all non-digit characters
      normalizedAddress = address.replace(/\D/g, '');
    }

    // Validate normalized result
    if (normalizedAddress.length === 0) {
      console.error(`❌ Normalized address is empty for ${channel} address "${address}" - rejecting!`);
      return;
    }

    console.log(`🔍 Ensuring ${channel} address for contact ${contactId}: ${address} → ${normalizedAddress}`);

    // 2. Check if this exact address already exists for this contact+channel
    const existingQuery = await firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('contact_addresses')
      .where('contact_id', '==', contactId)
      .where('channel', '==', channel)
      .where('address_norm', '==', normalizedAddress)
      .limit(1)
      .get();

    if (!existingQuery.empty) {
      const existingDoc = existingQuery.docs[0];
      const existingData = existingDoc.data();

      // Check if existing address has is_primary set
      if (existingData.is_primary === true) {
        console.log(`✅ ${channel} address already exists for contact ${contactId}: ${normalizedAddress} (is_primary: true)`);
        return; // Already exists with primary flag - nothing to do
      }

      // Address exists but doesn't have is_primary: true
      // Check if there's another primary address for this channel
      const otherPrimaryQuery = await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('contact_addresses')
        .where('contact_id', '==', contactId)
        .where('channel', '==', channel)
        .where('is_primary', '==', true)
        .limit(1)
        .get();

      if (otherPrimaryQuery.empty) {
        // No primary exists, so update this address to be primary
        await existingDoc.ref.update({
          is_primary: true
        });
        console.log(`✅ Updated existing ${channel} address to primary for contact ${contactId}: ${normalizedAddress}`);
        return;
      } else {
        // Another address is already primary, this one stays non-primary
        console.log(`✅ ${channel} address exists for contact ${contactId}: ${normalizedAddress} (is_primary: false, another address is primary)`);
        return;
      }
    }

    // 3. Check if any primary address exists for this channel
    const primaryQuery = await firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('contact_addresses')
      .where('contact_id', '==', contactId)
      .where('channel', '==', channel)
      .where('is_primary', '==', true)
      .get();

    // 4. If there's an existing primary address, demote it to non-primary
    // The address we're messaging NOW should be the primary one
    if (!primaryQuery.empty) {
      console.log(`🔄 Found ${primaryQuery.size} existing primary ${channel} address(es), demoting to non-primary`);
      const batch = firestore.batch();
      primaryQuery.docs.forEach(doc => {
        batch.update(doc.ref, { is_primary: false });
      });
      await batch.commit();
      console.log(`✅ Demoted old primary ${channel} address(es) to non-primary`);
    }

    // 5. Create the NEW address record as PRIMARY
    // This is the address we're actively messaging, so it should be primary
    const addressId = uuidv4();

    await firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('contact_addresses')
      .doc(addressId)
      .set({
        id: addressId,
        tenant_id: tenantId,
        contact_id: contactId,
        channel,
        address_norm: normalizedAddress,
        address_raw: address, // Store original format
        is_primary: true, // ALWAYS primary - this is the address we're actively using
        created_at: admin.firestore.Timestamp.now()
      });

    console.log(`✅ Created ${channel} address for contact ${contactId}: ${normalizedAddress} (primary: true)`);

  } catch (error) {
    console.error(`❌ Error ensuring ${channel} address for contact ${contactId}:`, error);
    // Don't throw - we don't want to block message sending if address creation fails
    // The message will still send, contact just won't appear in list until address is fixed
    console.warn(`⚠️ Continuing without address creation - contact may not appear in conversations list`);
  }
}
