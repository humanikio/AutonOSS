import * as dotenv from 'dotenv';
dotenv.config();

import { firestore } from '../config/firebase';

async function checkAddress() {
  const tenantId = 'sub-89bb0d70-bcb0-42ea-8dad-7c80daa60e5d';
  const contactId = '1e15e05a-9258-4f12-9681-2bf44c08b19e';

  console.log('Checking addresses for contact:', contactId);

  const addresses = await firestore
    .collection('tenants')
    .doc(tenantId)
    .collection('contact_addresses')
    .where('contact_id', '==', contactId)
    .get();

  console.log(`\nFound ${addresses.size} address(es):\n`);

  addresses.forEach(doc => {
    const data = doc.data();
    console.log('Address Record:', {
      id: doc.id,
      channel: data.channel,
      address_raw: data.address_raw,
      address_norm: data.address_norm,
      is_primary: data.is_primary,
      created_at: data.created_at?.toDate()
    });
    console.log('');
  });

  // Check if there's at least one primary address
  const hasPrimaryEmail = addresses.docs.some(doc => {
    const data = doc.data();
    return data.channel === 'EMAIL' && data.is_primary === true;
  });

  const hasPrimarySMS = addresses.docs.some(doc => {
    const data = doc.data();
    return data.channel === 'SMS' && data.is_primary === true;
  });

  console.log('Primary Status:');
  console.log('- Has primary EMAIL:', hasPrimaryEmail);
  console.log('- Has primary SMS:', hasPrimarySMS);
}

checkAddress()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
