import { db } from "../firebase/config";
import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  serverTimestamp, query, orderBy,
} from "firebase/firestore";

export function formatRupiah(n) {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}

const COL_BOM = "billOfMaterial";
const COL_WO = "workOrderProduksi";
const COL_JADWAL = "penjadwalanProduksi";
const COL_INSPEKSI = "inspeksiKualitas";

export async function getAllBOM() {
  const snap = await getDocs(query(collection(db, COL_BOM), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function createBOM(data) {
  return addDoc(collection(db, COL_BOM), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
export async function updateBOM(id, data) {
  return updateDoc(doc(db, COL_BOM, id), { ...data, updatedAt: serverTimestamp() });
}
export async function removeBOM(id) {
  return deleteDoc(doc(db, COL_BOM, id));
}

export async function getAllWorkOrder() {
  const snap = await getDocs(query(collection(db, COL_WO), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function createWorkOrder(data) {
  return addDoc(collection(db, COL_WO), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
export async function updateWorkOrder(id, data) {
  return updateDoc(doc(db, COL_WO, id), { ...data, updatedAt: serverTimestamp() });
}
export async function removeWorkOrder(id) {
  return deleteDoc(doc(db, COL_WO, id));
}

export async function getAllJadwal() {
  const snap = await getDocs(query(collection(db, COL_JADWAL), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function createJadwal(data) {
  return addDoc(collection(db, COL_JADWAL), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
export async function updateJadwal(id, data) {
  return updateDoc(doc(db, COL_JADWAL, id), { ...data, updatedAt: serverTimestamp() });
}
export async function removeJadwal(id) {
  return deleteDoc(doc(db, COL_JADWAL, id));
}

export async function getAllInspeksi() {
  const snap = await getDocs(query(collection(db, COL_INSPEKSI), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function createInspeksi(data) {
  return addDoc(collection(db, COL_INSPEKSI), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
export async function updateInspeksi(id, data) {
  return updateDoc(doc(db, COL_INSPEKSI, id), { ...data, updatedAt: serverTimestamp() });
}
export async function removeInspeksi(id) {
  return deleteDoc(doc(db, COL_INSPEKSI, id));
}
