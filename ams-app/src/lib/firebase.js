import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// TODO: Replace with your actual Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyDEMO_PLACEHOLDER_KEY_REPLACE_ME",
  authDomain: "ams-qrcode-demo.firebaseapp.com",
  projectId: "ams-qrcode-demo",
  storageBucket: "ams-qrcode-demo.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890abcdef",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
