import { db } from '../../../../config/firestore';
import { ContentSession } from './createSession';

/**
 * Get all content sessions for a tenant
 */
export async function getSessions(tenantId: string): Promise<ContentSession[]> {
  try {
    const sessionsSnapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('contentSessions')
      .orderBy('updatedAt', 'desc')
      .get();

    const sessions: ContentSession[] = [];

    sessionsSnapshot.forEach(doc => {
      const data = doc.data();
      sessions.push({
        id: doc.id,
        tenantId: data.tenantId,
        name: data.name,
        prompt: data.prompt,
        imageCount: data.imageCount || 0,
        status: data.status,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        createdBy: data.createdBy
      });
    });

    return sessions;
  } catch (error) {
    console.error('Error getting content sessions:', error);
    throw new Error('Failed to get content sessions');
  }
}
