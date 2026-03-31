import { db } from '../../../../config/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { ContentSession } from './createSession';

export interface UpdateSessionData {
  name?: string;
  prompt?: string;
  imageCount?: number;
  status?: 'draft' | 'completed';
}

/**
 * Update a content session
 */
export async function updateSession(
  tenantId: string,
  sessionId: string,
  data: UpdateSessionData
): Promise<ContentSession> {
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

    // Prepare update data
    const updateData: any = {
      updatedAt: FieldValue.serverTimestamp()
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.prompt !== undefined) updateData.prompt = data.prompt;
    if (data.imageCount !== undefined) updateData.imageCount = data.imageCount;
    if (data.status !== undefined) updateData.status = data.status;

    await sessionRef.update(updateData);

    // Fetch the updated document
    const updatedDoc = await sessionRef.get();
    const updatedData = updatedDoc.data();

    return {
      id: updatedDoc.id,
      tenantId: updatedData?.tenantId,
      name: updatedData?.name,
      prompt: updatedData?.prompt,
      imageCount: updatedData?.imageCount || 0,
      status: updatedData?.status,
      createdAt: updatedData?.createdAt?.toDate() || new Date(),
      updatedAt: updatedData?.updatedAt?.toDate() || new Date(),
      createdBy: updatedData?.createdBy
    };
  } catch (error) {
    console.error('Error updating content session:', error);
    if (error instanceof Error && error.message === 'Content session not found') {
      throw error;
    }
    throw new Error('Failed to update content session');
  }
}
