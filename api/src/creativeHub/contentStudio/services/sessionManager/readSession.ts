import { db } from '../../../../config/firestore';
import { ContentSession } from './createSession';

/**
 * Read a specific content session
 */
export async function readSession(
  tenantId: string,
  sessionId: string
): Promise<ContentSession | null> {
  try {
    const sessionDoc = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('contentSessions')
      .doc(sessionId)
      .get();

    if (!sessionDoc.exists) {
      return null;
    }

    const data = sessionDoc.data();

    return {
      id: sessionDoc.id,
      tenantId: data?.tenantId,
      name: data?.name,
      prompt: data?.prompt,
      imageCount: data?.imageCount || 0,
      status: data?.status,
      createdAt: data?.createdAt?.toDate() || new Date(),
      updatedAt: data?.updatedAt?.toDate() || new Date(),
      createdBy: data?.createdBy
    };
  } catch (error) {
    console.error('Error reading content session:', error);
    throw new Error('Failed to read content session');
  }
}
