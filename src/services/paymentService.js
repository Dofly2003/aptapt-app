import { db } from "../firebase/config";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const PAYMENT_DOC = "payment";

export async function getPaymentSettings() {
  const snap = await getDoc(doc(db, "settings", PAYMENT_DOC));
  return snap.exists() ? snap.data() : null;
}

export async function savePaymentSettings(data) {
  await setDoc(
    doc(db, "settings", PAYMENT_DOC),
    { ...data, updatedAt: serverTimestamp() },
    { merge: true },
  );
}