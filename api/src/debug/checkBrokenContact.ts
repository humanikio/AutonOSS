import * as dotenv from 'dotenv';
dotenv.config();

import { firestore } from '../config/firebase';

async function checkBrokenContact() {
  const tenantId = 'sub-89bb0d70-bcb0-42ea-8dad-7c80daa60e5d';
  const contactId = '42a4d4fd-b309-4ed1-b699-1df2865c4867';

  console.log('Checking BROKEN contact addresses for:', contactId);
  console.log('');

  const addresses = await firestore
    .collection('tenants')
    .doc(tenantId)
    .collection('contact_addresses')
    .where('contact_id', '==', contactId)
    .get();

  console.log(`Found ${addresses.size} address(es):\n`);

  addresses.forEach(doc => {
    const data = doc.data();
    console.log('Address:', {
      id: doc.id,
      channel: data.channel,
      address_raw: data.address_raw,
      address_norm: data.address_norm,
      is_primary: data.is_primary,
      created: data.created_at?.toDate()
    });
  });

  // Check for the fucked up empty SMS address
  const brokenSMS = addresses.docs.find(doc => {
    const data = doc.data();
    return data.channel === 'SMS' && data.address_norm === '';
  });

  if (brokenSMS) {
    console.log('\n🚨 FOUND BROKEN SMS ADDRESS WITH EMPTY address_norm!');
    console.log('This is why email is showing as phone!');
  }
}

checkBrokenContact()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
