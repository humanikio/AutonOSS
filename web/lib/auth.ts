import { auth } from '@/lib/firebase/firebase';

export const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  try {
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
      
      // Add tenant ID - using user's UID as tenant ID (as seen in AuthContext)
      headers['x-tenant-id'] = auth.currentUser.uid;
    }
  } catch (error) {
    console.error('Error getting auth headers:', error);
    // Don't throw here - let the API call fail naturally if no auth is available
  }

  return headers;
};

export const getToken = async (): Promise<string | null> => {
  try {
    if (auth.currentUser) {
      return await auth.currentUser.getIdToken();
    }
    return null;
  } catch (error) {
    console.error('Error getting Firebase token:', error);
    return null;
  }
};

export const getTenantId = (): string | null => {
  return auth.currentUser?.uid || null;
};