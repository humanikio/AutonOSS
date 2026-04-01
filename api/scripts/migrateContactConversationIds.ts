import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

/**
 * Migration script to fix contacts that have conversations but missing conversationId field
 *
 * Problem: Conversations exist in subcollections but contact documents don't have conversationId field
 * Solution: Query each contact's conversations and update the contact with the open conversation ID
 *
 * Usage: npx tsx scripts/migrateContactConversationIds.ts
 */

const TENANT_ID = process.env.MIGRATION_TENANT_ID || 'your-tenant-id-here';

interface ConversationDoc {
  id: string;
  status: string;
  last_message_at: admin.firestore.Timestamp;
}

async function migrateContactConversationIds() {
  console.log('🚀 Starting contact conversationId migration...');
  console.log(`📍 Tenant: ${TENANT_ID}\n`);

  try {
    // Get all contacts for this tenant
    const contactsSnapshot = await db
      .collection('tenants')
      .doc(TENANT_ID)
      .collection('contacts')
      .get();

    console.log(`📊 Found ${contactsSnapshot.size} total contacts\n`);

    let processedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const contactDoc of contactsSnapshot.docs) {
      const contactId = contactDoc.id;
      const contactData = contactDoc.data();
      processedCount++;

      console.log(`\n[${processedCount}/${contactsSnapshot.size}] Processing contact: ${contactData.name || contactId}`);

      try {
        // Check if contact already has conversationId
        if (contactData.conversationId) {
          console.log(`  ✅ Already has conversationId: ${contactData.conversationId}`);
          skippedCount++;
          continue;
        }

        // Look for open conversation in subcollection
        const conversationsSnapshot = await db
          .collection('tenants')
          .doc(TENANT_ID)
          .collection('contacts')
          .doc(contactId)
          .collection('conversations')
          .where('status', '==', 'open')
          .orderBy('last_message_at', 'desc')
          .limit(1)
          .get();

        if (conversationsSnapshot.empty) {
          console.log(`  ⏭️  No open conversations found`);
          skippedCount++;
          continue;
        }

        const conversationDoc = conversationsSnapshot.docs[0];
        const conversationId = conversationDoc.id;
        const conversationData = conversationDoc.data() as ConversationDoc;

        console.log(`  🔍 Found open conversation: ${conversationId}`);
        console.log(`     Last message: ${conversationData.last_message_at.toDate().toISOString()}`);

        // Update contact document with conversationId
        await db
          .collection('tenants')
          .doc(TENANT_ID)
          .collection('contacts')
          .doc(contactId)
          .update({
            conversationId: conversationId,
            updated_at: admin.firestore.Timestamp.now()
          });

        console.log(`  ✅ Updated contact with conversationId`);
        updatedCount++;

      } catch (error) {
        console.error(`  ❌ Error processing contact ${contactId}:`, error);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total contacts processed: ${processedCount}`);
    console.log(`✅ Updated with conversationId: ${updatedCount}`);
    console.log(`⏭️  Skipped (already had conversationId or no conversations): ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateContactConversationIds()
  .then(() => {
    console.log('\n✅ Migration complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
