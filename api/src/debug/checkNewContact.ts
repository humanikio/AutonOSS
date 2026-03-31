import * as dotenv from 'dotenv';
dotenv.config();

import { firestore } from '../config/firebase';

async function checkContact() {
  const tenantId = 'sub-89bb0d70-bcb0-42ea-8dad-7c80daa60e5d';
  const contactId = 'a9d56bd1-00a5-4ffc-a043-0ccefa8ce86e';

  console.log('\n=== Checking contact:', contactId, '===\n');

  // Check contact document
  const contactDoc = await firestore
    .collection('tenants')
    .doc(tenantId)
    .collection('contacts')
    .doc(contactId)
    .get();

  if (contactDoc.exists) {
    const data = contactDoc.data();
    console.log('📋 Contact document fields:');
    console.log('  - firstName:', data?.firstName);
    console.log('  - lastName:', data?.lastName);
    console.log('  - email:', data?.email);
    console.log('  - phoneNumber:', data?.phoneNumber || 'NOT IN CONTACT DOC');
    console.log();
  } else {
    console.log('❌ Contact document not found!');
    return;
  }

  // Check addresses
  const addresses = await firestore
    .collection('tenants')
    .doc(tenantId)
    .collection('contact_addresses')
    .where('contact_id', '==', contactId)
    .get();

  console.log(`📱 Contact addresses (${addresses.size} total):`);
  if (addresses.empty) {
    console.log('  ❌ NO ADDRESSES FOUND!');
  } else {
    addresses.forEach(doc => {
      const data = doc.data();
      console.log(`  [${data.channel}] ${data.address_raw} → ${data.address_norm} (primary: ${data.is_primary})`);
    });
  }
  console.log();

  // Find primary SMS
  const primarySMS = addresses.docs.find(doc => {
    const data = doc.data();
    return data.channel === 'SMS' && data.is_primary === true;
  });

  if (primarySMS) {
    const data = primarySMS.data();
    console.log('✅ Primary SMS address:', data.address_raw, '→', data.address_norm);
  } else {
    console.log('❌ NO PRIMARY SMS ADDRESS FOUND!');
    console.log('   This contact cannot receive SMS messages.');
  }

  // Find primary EMAIL
  const primaryEmail = addresses.docs.find(doc => {
    const data = doc.data();
    return data.channel === 'EMAIL' && data.is_primary === true;
  });

  if (primaryEmail) {
    const data = primaryEmail.data();
    console.log('✅ Primary EMAIL address:', data.address_raw);
  }

  console.log('\n=== Analysis Complete ===\n');
}

checkContact()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
