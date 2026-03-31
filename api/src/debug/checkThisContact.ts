import * as dotenv from 'dotenv';
dotenv.config();

import { firestore } from '../config/firebase';

async function checkContact() {
  const tenantId = 'sub-89bb0d70-bcb0-42ea-8dad-7c80daa60e5d';
  const contactId = '6087085b-069b-4617-9d1c-54c0f4cffdad';

  console.log('Checking contact:', contactId);
  console.log('');

  // Check contact document
  const contactDoc = await firestore
    .collection('tenants')
    .doc(tenantId)
    .collection('contacts')
    .doc(contactId)
    .get();

  if (contactDoc.exists) {
    const data = contactDoc.data();
    console.log('Contact document:');
    console.log('  - Email:', data?.email);
    console.log('  - PhoneNumber field:', data?.phoneNumber || 'NOT STORED IN CONTACT DOC');
    console.log('');
  }

  // Check addresses
  const addresses = await firestore
    .collection('tenants')
    .doc(tenantId)
    .collection('contact_addresses')
    .where('contact_id', '==', contactId)
    .get();

  console.log(`Contact addresses (${addresses.size} total):`);
  addresses.forEach(doc => {
    const data = doc.data();
    console.log(`  [${data.channel}] ${data.address_raw} → ${data.address_norm} (primary: ${data.is_primary})`);
  });

  // Find primary SMS
  const primarySMS = addresses.docs.find(doc => {
    const data = doc.data();
    return data.channel === 'SMS' && data.is_primary === true;
  });

  console.log('');
  if (primarySMS) {
    const data = primarySMS.data();
    console.log('✅ Primary SMS address:', data.address_raw, '→', data.address_norm);
  } else {
    console.log('❌ NO PRIMARY SMS ADDRESS!');
  }
}

checkContact()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
