import { db } from '../../../../config/firestore';
import { FieldValue } from 'firebase-admin/firestore';

export interface CreateSessionData {
  name: string;
  prompt?: string;
}

export interface ContentSession {
  id: string;
  tenantId: string;
  name: string;
  prompt?: string;
  imageCount: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  status: 'draft' | 'completed';
}

/**
 * Create a new content session
 */
export async function createSession(
  tenantId: string,
  data: CreateSessionData,
  userId?: string
): Promise<ContentSession> {
  try {
    const sessionRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('contentSessions')
      .doc();

    const now = FieldValue.serverTimestamp();

    const sessionData = {
      tenantId,
      name: data.name || 'Untitled Session',
      prompt: data.prompt || '',
      imageCount: 0,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      ...(userId && { createdBy: userId })
    };

    await sessionRef.set(sessionData);

    // Fetch the created document to return with actual timestamps
    const doc = await sessionRef.get();
    const docData = doc.data();

    return {
      id: doc.id,
      tenantId: docData?.tenantId,
      name: docData?.name,
      prompt: docData?.prompt,
      imageCount: docData?.imageCount || 0,
      status: docData?.status,
      createdAt: docData?.createdAt?.toDate() || new Date(),
      updatedAt: docData?.updatedAt?.toDate() || new Date(),
      createdBy: docData?.createdBy
    };
  } catch (error) {
    console.error('Error creating content session:', error);
    throw new Error('Failed to create content session');
  }
}
