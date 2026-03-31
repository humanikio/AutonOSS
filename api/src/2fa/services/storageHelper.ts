import { firestore } from '../../config/firebase';
import { DocumentReference } from 'firebase-admin/firestore';

/**
 * Get the appropriate Firestore reference for TOTP storage
 * - Root users (tenantId === userId): /tenants/{tenantId}/security/totp
 * - Sub users (tenantId !== userId): /tenants/{tenantId}/users/{userId}/security/totp
 */
export function getTotpSecurityRef(tenantId: string, userId: string): DocumentReference {
  const isRootUser = tenantId === userId;
  
  if (isRootUser) {
    // Root user: store directly under tenant
    return firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('security')
      .doc('totp');
  } else {
    // Sub user: store under users subcollection
    return firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('users')
      .doc(userId)
      .collection('security')
      .doc('totp');
  }
}