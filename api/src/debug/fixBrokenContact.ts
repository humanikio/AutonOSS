import * as dotenv from 'dotenv';
dotenv.config();

import { firestore } from '../config/firebase';

async function fixBrokenContact() {
  const tenantId = 'sub-89bb0d70-bcb0-42ea-8dad-7c80daa60e5d';
  const contactId = '42a4d4fd-b309-4ed1-b699-1df2865c4867';

  console.log('Fixing broken contact:', contactId);
  console.log('');

  // Step 1: Find the broken SMS address (email stored as phone)
  const addresses = await firestore
    .collection('tenants')
    .doc(tenantId)
    .collection('contact_addresses')
    .where('contact_id', '==', contactId)
    .where('channel', '==', 'SMS')
    .get();

  let brokenAddressId: string | null = null;
  let realPhoneId: string | null = null;

  addresses.forEach(doc => {
    const data = doc.data();
    if (data.address_norm === '') {
      console.log(`🗑️  Found broken SMS address (empty norm):`, doc.id);
      brokenAddressId = doc.id;
    } else if (data.address_norm === '+14169848290' || data.address_norm === '14169848290') {
      console.log(`📱 Found real phone address:`, doc.id);
      realPhoneId = doc.id;
    }
  });

  // Step 2: Delete broken address
  if (brokenAddressId) {
    console.log(`\nDeleting broken address: ${brokenAddressId}`);
    await firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('contact_addresses')
      .doc(brokenAddressId)
      .delete();
    console.log('✅ Deleted broken address');
  } else {
    console.log('⚠️ No broken address found');
  }

  // Step 3: Make real phone primary
  if (realPhoneId) {
    console.log(`\nMaking real phone primary: ${realPhoneId}`);
    await firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('contact_addresses')
      .doc(realPhoneId)
      .update({ is_primary: true });
    console.log('✅ Set real phone as primary');
  } else {
    console.log('⚠️ No real phone address found');
  }

  console.log('\n✅ Contact fixed!');
}

fixBrokenContact()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
