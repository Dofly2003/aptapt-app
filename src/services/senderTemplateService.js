import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, getDoc, query, where, serverTimestamp,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../firebase/config";

const COL = "sender_templates";

export async function getSenderTemplates() {
  const uid = getAuth().currentUser?.uid;
  if (!uid) return [];
  const q = query(collection(db, COL), where("uid", "==", uid));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createSenderTemplate(data) {
  const uid = getAuth().currentUser?.uid;
  if (!uid) throw new Error("Tidak diizinkan");
  const ref = await addDoc(collection(db, COL), {
    ...data, uid, createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateSenderTemplate(id, data) {
  const uid = getAuth().currentUser?.uid;
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists() || snap.data().uid !== uid) {
    throw new Error("Tidak diizinkan");
  }
  await updateDoc(doc(db, COL, id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteSenderTemplate(id) {
  const uid = getAuth().currentUser?.uid;
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists() || snap.data().uid !== uid) {
    throw new Error("Tidak diizinkan");
  }
  await deleteDoc(doc(db, COL, id));
}
