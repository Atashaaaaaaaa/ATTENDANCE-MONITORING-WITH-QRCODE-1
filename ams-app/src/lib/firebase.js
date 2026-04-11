import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

export const firebaseConfig = {
  apiKey: "AIzaSyA1indZCIm_VfhJpdL0pPS_DNXA5mgoWOg",
  authDomain: "a-m-s-27607.firebaseapp.com",
  projectId: "a-m-s-27607",
  storageBucket: "a-m-s-27607.firebasestorage.app",
  messagingSenderId: "1033675043994",
  appId: "1:1033675043994:web:aadd00a2d18dcd880f1b23",
  measurementId: "G-VC12THY8SJ"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
