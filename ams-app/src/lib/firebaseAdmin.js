import admin from "firebase-admin";

if (!admin.apps.length) {
  // Initialize with service account credentials from environment variables
  // If no service account is provided, use the project ID from the Firebase config
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    : null;

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    // Fallback: initialize with project config (works with GOOGLE_APPLICATION_CREDENTIALS env var)
    admin.initializeApp({
      projectId: "a-m-s-27607",
    });
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export default admin;
