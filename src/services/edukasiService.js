import { db } from "../firebase/config";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const SETTINGS_DOC = "edukasi";

export async function getEdukasi() {
  const snap = await getDoc(doc(db, "settings", SETTINGS_DOC));
  return snap.exists() ? snap.data() : null;
}

export async function saveEdukasi(data) {
  await setDoc(
    doc(db, "settings", SETTINGS_DOC),
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}