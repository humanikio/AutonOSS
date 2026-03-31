import * as dotenv from 'dotenv';
dotenv.config();

import { firestore } from '../config/firebase';

async function checkEverything() {
  const tenantId = 'sub-89bb0d70-bcb0-42ea-8dad-7c80daa60e5d';
  const contactId = '1e15e05a-9258-4f12-9681-2bf44c08b19e';
  const conversationId = 'b4c87765-315d-4d7c-926d-e4d78892de17';

  console.log('='.repeat(60));
  console.log('CHECKING CONTACT VISIBILITY ISSUE');
  console.log('='.repeat(60));
  console.log('');

  // 1. Check contact document
  console.log('1. CONTACT DOCUMENT:');
  const contactDoc = await firestore
    .collection('tenants')
    .doc(tenantId)
    .collection('contacts')
    .doc(contactId)
    .get();

  if (contactDoc.exists) {
    const data = contactDoc.data();
    console.log('   ✓ Contact exists');
    console.log('   - Name:', data?.full_name || data?.first_name || 'No name');
    console.log('   - Email field:', data?.email || 'None');
    console.log('   - Phone field:', data?.phoneNumber || 'None');
  } else {
    console.log('   ✗ Contact does NOT exist');
  }
  console.log('');

  // 2. Check addresses
  console.log('2. CONTACT ADDRESSES:');
  const addresses = await firestore
    .collection('tenants')
    .doc(tenantId)
    .collection('contact_addresses')
    .where('contact_id', '==', contactId)
    .get();

  console.log(`   Found ${addresses.size} address(es):`);
  addresses.forEach(doc => {
    const data = doc.data();
    console.log('   -', {
      channel: data.channel,
      address: data.address_raw,
      is_primary: data.is_primary,
      created: data.created_at?.toDate()
    });
  });

  const hasPrimary = addresses.docs.some(d => d.data().is_primary === true);
  console.log(`   Primary address exists: ${hasPrimary ? '✓ YES' : '✗ NO'}`);
  console.log('');

  // 3. Check conversation (nested under contact)
  console.log('3. CONVERSATION:');
  const convDoc = await firestore
    .collection('tenants')
    .doc(tenantId)
    .collection('contacts')
    .doc(contactId)
    .collection('conversations')
    .doc(conversationId)
    .get();

  if (convDoc.exists) {
    const data = convDoc.data();
    console.log('   ✓ Conversation exists');
    console.log('   - ID:', conversationId);
    console.log('   - Contact ID:', data?.contact_id);
    console.log('   - Type:', data?.type);
    console.log('   - Status:', data?.status);
    console.log('   - Created:', data?.created_at?.toDate());
    console.log('   - Updated:', data?.updated_at?.toDate());
    console.log('   - Last message:', data?.last_message_at?.toDate());
  } else {
    console.log('   ✗ Conversation does NOT exist');
  }
  console.log('');

  // 4. Check messages
  console.log('4. MESSAGES:');
  const messages = await firestore
    .collection('tenants')
    .doc(tenantId)
    .collection('contacts')
    .doc(contactId)
    .collection('conversations')
    .doc(conversationId)
    .collection('messages')
    .orderBy('created_at', 'desc')
    .limit(5)
    .get();

  console.log(`   Found ${messages.size} message(s) (showing last 5):`);
  messages.forEach(doc => {
    const data = doc.data();
    console.log('   -', {
      id: doc.id,
      direction: data.direction,
      body: (data.body || '').substring(0, 50),
      created: data.created_at?.toDate()
    });
  });
  console.log('');

  // 5. Summary
  console.log('='.repeat(60));
  console.log('SUMMARY:');
  console.log('='.repeat(60));
  console.log('Contact exists:', contactDoc.exists ? '✓' : '✗');
  console.log('Has primary address:', hasPrimary ? '✓' : '✗');
  console.log('Conversation exists:', convDoc.exists ? '✓' : '✗');
  console.log('Has messages:', messages.size > 0 ? '✓' : '✗');
  console.log('');

  if (contactDoc.exists && hasPrimary && convDoc.exists && messages.size > 0) {
    console.log('✓ Everything looks good in the database!');
    console.log('Issue is likely with the FRONTEND query.');
  } else {
    console.log('✗ Found issues in the database.');
  }
}

checkEverything()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
