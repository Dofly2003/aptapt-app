import { db, storage } from "../firebase/config";
import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  serverTimestamp, query, orderBy,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import imageCompression from "browser-image-compression";

export function formatRupiah(n) {
  if (!n && n !== 0) return "Rp 0";
  return "Rp " + Number(n).toLocaleString("id-ID");
}

const COL_ASET        = "daftarAset";
const COL_MAINTENANCE = "jadwalMaintenance";
const COL_WORK_ORDER  = "workOrderAset";
const COL_ALAT_KERJA  = "alatKerja";

// ── Daftar Aset ────────────────────────────────────────────────────────
export async function getAllAset() {
  const snap = await getDocs(query(collection(db, COL_ASET), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function getAsetById(id) {
  const snap = await getDoc(doc(db, COL_ASET, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
export async function createAset(data) {
  return addDoc(collection(db, COL_ASET), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
export async function updateAset(id, data) {
  return updateDoc(doc(db, COL_ASET, id), { ...data, updatedAt: serverTimestamp() });
}
export async function removeAset(id) {
  return deleteDoc(doc(db, COL_ASET, id));
}

// ── Jadwal Maintenance ─────────────────────────────────────────────────
export async function getAllMaintenance() {
  const snap = await getDocs(query(collection(db, COL_MAINTENANCE), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function getMaintenanceById(id) {
  const snap = await getDoc(doc(db, COL_MAINTENANCE, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
export async function createMaintenance(data) {
  return addDoc(collection(db, COL_MAINTENANCE), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
export async function updateMaintenance(id, data) {
  return updateDoc(doc(db, COL_MAINTENANCE, id), { ...data, updatedAt: serverTimestamp() });
}
export async function removeMaintenance(id) {
  return deleteDoc(doc(db, COL_MAINTENANCE, id));
}

// ── Alat Kerja ────────────────────────────────────────────────────────
export async function getAllAlatKerja() {
  const snap = await getDocs(query(collection(db, COL_ALAT_KERJA), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function createAlatKerja(data) {
  return addDoc(collection(db, COL_ALAT_KERJA), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
export async function updateAlatKerja(id, data) {
  return updateDoc(doc(db, COL_ALAT_KERJA, id), { ...data, updatedAt: serverTimestamp() });
}
export async function removeAlatKerja(id) {
  return deleteDoc(doc(db, COL_ALAT_KERJA, id));
}
export async function uploadAlatFoto(file, docId) {
  const compressed = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1200, useWebWorker: false });
  const path = `alatKerja/${docId}/foto_${Date.now()}.jpg`;
  const r = ref(storage, path);
  await uploadBytes(r, compressed);
  const url = await getDownloadURL(r);
  return { url, path };
}
export async function uploadSertifKalibrasi(file, docId) {
  const compressed = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1600, useWebWorker: false });
  const path = `alatKerja/${docId}/kalibrasi_${Date.now()}.jpg`;
  const r = ref(storage, path);
  await uploadBytes(r, compressed);
  const url = await getDownloadURL(r);
  return { url, path };
}
export async function deleteAlatFoto(path) {
  if (!path) return;
  try { await deleteObject(ref(storage, path)); } catch {}
}

// ── Work Order Aset ────────────────────────────────────────────────────
export async function getAllWorkOrder() {
  const snap = await getDocs(query(collection(db, COL_WORK_ORDER), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function getWorkOrderById(id) {
  const snap = await getDoc(doc(db, COL_WORK_ORDER, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
export async function createWorkOrder(data) {
  return addDoc(collection(db, COL_WORK_ORDER), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
export async function updateWorkOrder(id, data) {
  return updateDoc(doc(db, COL_WORK_ORDER, id), { ...data, updatedAt: serverTimestamp() });
}
export async function removeWorkOrder(id) {
  return deleteDoc(doc(db, COL_WORK_ORDER, id));
}
