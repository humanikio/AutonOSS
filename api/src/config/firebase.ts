import admin from 'firebase-admin';
import path from 'path';

// Initialize Firebase Admin SDK
const initializeFirebase = (): admin.app.App => {
  if (admin.apps.length === 0) {
    // Check if we should use service account file or environment variables
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
    
    if (!projectId) {
      throw new Error('FIREBASE_PROJECT_ID environment variable is required');
    }

    let credential;
    
    if (privateKey && clientEmail) {
      // Use environment variables (preferred method)
      credential = admin.credential.cert({
        projectId,
        privateKey: privateKey.replace(/\\n/g, '\n'),
        clientEmail,
      });
    } else if (serviceAccountPath) {
      // Use service account file (fallback for local development)
      const absolutePath = path.resolve(serviceAccountPath);
      credential = admin.credential.cert(absolutePath);
    } else {
      throw new Error(
        'Either (FIREBASE_PRIVATE_KEY and FIREBASE_CLIENT_EMAIL) or FIREBASE_SERVICE_ACCOUNT_PATH must be provided'
      );
    }
    
    return admin.initializeApp({
      credential,
      projectId,
      storageBucket,
    });
  }
  
  return admin.apps[0] as admin.app.App;
};

// Initialize Firebase
const firebaseApp = initializeFirebase();

// Export Firebase services
export const adminAuth = admin.auth(firebaseApp);
export const firestore = admin.firestore(firebaseApp);
export const storage = admin.storage(firebaseApp);

// Firestore settings
firestore.settings({
  timestampsInSnapshots: true,
  ignoreUndefinedProperties: true,
});

export default firebaseApp;