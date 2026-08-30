import { db } from "../firebase/config";
import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  serverTimestamp, query, orderBy,
} from "firebase/firestore";

export function formatRupiah(n) { return "Rp " + Number(n || 0).toLocaleString("id-ID"); }

const COL_PROYEK = "proyek";
const COL_SUMBER = "sumberDaya";
const COL_TUGAS = "tugasProyek";

export async function getAllProyek() {
  const snap = await getDocs(query(collection(db, COL_PROYEK), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function createProyek(data) {
  return addDoc(collection(db, COL_PROYEK), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
export async function updateProyek(id, data) {
  return updateDoc(doc(db, COL_PROYEK, id), { ...data, updatedAt: serverTimestamp() });
}
export async function removeProyek(id) {
  return deleteDoc(doc(db, COL_PROYEK, id));
}

export async function getAllSumber() {
  const snap = await getDocs(query(collection(db, COL_SUMBER), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function createSumber(data) {
  return addDoc(collection(db, COL_SUMBER), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
export async function updateSumber(id, data) {
  return updateDoc(doc(db, COL_SUMBER, id), { ...data, updatedAt: serverTimestamp() });
}
export async function removeSumber(id) {
  return deleteDoc(doc(db, COL_SUMBER, id));
}

export async function getAllTugas() {
  const snap = await getDocs(query(collection(db, COL_TUGAS), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function createTugas(data) {
  return addDoc(collection(db, COL_TUGAS), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
export async function updateTugas(id, data) {
  return updateDoc(doc(db, COL_TUGAS, id), { ...data, updatedAt: serverTimestamp() });
}
export async function removeTugas(id) {
  return deleteDoc(doc(db, COL_TUGAS, id));
}
