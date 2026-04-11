import admin from "firebase-admin";

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "a-m-s-27607";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Handle multiline private key from env var
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : null;

  if (clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    // Fallback exactly as before for existing keys
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
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
