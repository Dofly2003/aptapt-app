import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Init Firebase RAMPING khusus monitoring — HANYA Realtime Database.
// Tidak init Auth / Firestore / Storage supaya bundle subdomain tetap kecil.
// Env var sama persih dengan app utama (VITE_FIREBASE_*).
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const rtdb = getDatabase(app);
