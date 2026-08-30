import { db, storage } from "../firebase/config";
import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  serverTimestamp, query, orderBy,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import imageCompression from "browser-image-compression";

export function formatRupiah(n) {
  if (!n && n !== 0) return "Rp 0";
  return "Rp " + Number(n).toLocaleString("id-ID");
}

const COL_STOK = "stokBarang";
const COL_PERGERAKAN = "pergerakanStok";
const COL_GUDANG = "gudang";

export async function getAllStok() {
  const snap = await getDocs(query(collection(db, COL_STOK), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function createStok(data) {
  return addDoc(collection(db, COL_STOK), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
export async function updateStok(id, data) {
  return updateDoc(doc(db, COL_STOK, id), { ...data, updatedAt: serverTimestamp() });
}
export async function removeStok(id) {
  return deleteDoc(doc(db, COL_STOK, id));
}

export async function getAllPergerakan() {
  const snap = await getDocs(query(collection(db, COL_PERGERAKAN), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function createPergerakan(data) {
  return addDoc(collection(db, COL_PERGERAKAN), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
export async function updatePergerakan(id, data) {
  return updateDoc(doc(db, COL_PERGERAKAN, id), { ...data, updatedAt: serverTimestamp() });
}
export async function removePergerakan(id) {
  return deleteDoc(doc(db, COL_PERGERAKAN, id));
}

export async function getAllGudang() {
  const snap = await getDocs(query(collection(db, COL_GUDANG), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function createGudang(data) {
  return addDoc(collection(db, COL_GUDANG), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
export async function updateGudang(id, data) {
  return updateDoc(doc(db, COL_GUDANG, id), { ...data, updatedAt: serverTimestamp() });
}
export async function removeGudang(id) {
  return deleteDoc(doc(db, COL_GUDANG, id));
}

// ── Foto barang ──────────────────────────────────────────────────────────────
export async function uploadBarangPhoto(file, docId) {
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1200,
    useWebWorker: false,
  });
  const path = `inventori/${docId}/foto_${Date.now()}.jpg`;
  const r = ref(storage, path);
  await uploadBytes(r, compressed);
  const url = await getDownloadURL(r);
  return { url, path };
}

export async function deleteBarangPhoto(path) {
  if (!path) return;
  try { await deleteObject(ref(storage, path)); } catch {}
}
