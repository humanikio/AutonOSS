import { db } from '../../../../config/firestore';

/**
 * Delete a content session
 */
export async function deleteSession(
  tenantId: string,
  sessionId: string
): Promise<void> {
  try {
    const sessionRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('contentSessions')
      .doc(sessionId);

    // Check if session exists
    const sessionDoc = await sessionRef.get();
    if (!sessionDoc.exists) {
      throw new Error('Content session not found');
    }

    // Delete the session
    await sessionRef.delete();
  } catch (error) {
    console.error('Error deleting content session:', error);
    if (error instanceof Error && error.message === 'Content session not found') {
      throw error;
    }
    throw new Error('Failed to delete content session');
  }
}
