import { firestore } from '../../config/firebase';

export interface DeleteContactsResult {
  deleted: number;
  failed: number;
  errors: string[];
}

export class ContactDeletionService {
  async deleteContact(tenantId: string, contactId: string): Promise<void> {
    console.log(`=Ñ  Deleting contact ${contactId} for tenant ${tenantId}`);

    try {
      // Use a batch to ensure all related documents are deleted atomically
      const batch = firestore.batch();

      // Delete the contact document
      const contactRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('contacts')
        .doc(contactId);

      batch.delete(contactRef);

      // Delete all contact addresses for this contact
      const addressesQuery = await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('contact_addresses')
        .where('contact_id', '==', contactId)
        .get();

      addressesQuery.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Delete all conversations for this contact
      const conversationsQuery = await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('contacts')
        .doc(contactId)
        .collection('conversations')
        .get();

      // For each conversation, delete all messages first
      for (const conversationDoc of conversationsQuery.docs) {
        const messagesQuery = await firestore
          .collection('tenants')
          .doc(tenantId)
          .collection('contacts')
          .doc(contactId)
          .collection('conversations')
          .doc(conversationDoc.id)
          .collection('messages')
          .get();

        messagesQuery.docs.forEach(messageDoc => {
          batch.delete(messageDoc.ref);
        });

        // Delete the conversation itself
        batch.delete(conversationDoc.ref);
      }

      // Commit the batch
      await batch.commit();

      console.log(` Successfully deleted contact ${contactId} and all related data`);
    } catch (error) {
      console.error(`L Error deleting contact ${contactId}:`, error);
      throw new Error(`Failed to delete contact: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async bulkDeleteContacts(tenantId: string, contactIds: string[]): Promise<DeleteContactsResult> {
    console.log(`=Ñ  Starting bulk delete of ${contactIds.length} contacts for tenant ${tenantId}`);

    const result: DeleteContactsResult = {
      deleted: 0,
      failed: 0,
      errors: []
    };

    // Process each contact deletion
    for (const contactId of contactIds) {
      try {
        await this.deleteContact(tenantId, contactId);
        result.deleted++;
        console.log(` Contact ${contactId} deleted successfully`);
      } catch (error) {
        result.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Contact ${contactId}: ${errorMessage}`);
        console.error(`L Failed to delete contact ${contactId}:`, error);
      }
    }

    console.log(`<‰ Bulk deletion complete: ${result.deleted} deleted, ${result.failed} failed`);
    return result;
  }
}

export const contactDeletionService = new ContactDeletionService();