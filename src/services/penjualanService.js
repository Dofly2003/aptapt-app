import { db } from "../firebase/config";
import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  serverTimestamp, query, orderBy,
} from "firebase/firestore";

export function formatRupiah(n) {
  if (!n && n !== 0) return "Rp 0";
  return "Rp " + Number(n).toLocaleString("id-ID");
}

const COL_PELANGGAN = "pelanggan";
const COL_SO        = "salesOrder";
const COL_INVOICE   = "invoice";
const COL_PIPELINE  = "pipeline";

// ── Pelanggan ──────────────────────────────────────────────────────────
export async function getAllPelanggan() {
  const snap = await getDocs(query(collection(db, COL_PELANGGAN), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function getPelangganById(id) {
  const snap = await getDoc(doc(db, COL_PELANGGAN, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
export async function createPelanggan(data) {
  return addDoc(collection(db, COL_PELANGGAN), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
export async function updatePelanggan(id, data) {
  return updateDoc(doc(db, COL_PELANGGAN, id), { ...data, updatedAt: serverTimestamp() });
}
export async function removePelanggan(id) {
  return deleteDoc(doc(db, COL_PELANGGAN, id));
}

// ── Sales Order ────────────────────────────────────────────────────────
export async function getAllSalesOrder() {
  const snap = await getDocs(query(collection(db, COL_SO), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function getSalesOrderById(id) {
  const snap = await getDoc(doc(db, COL_SO, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
export async function createSalesOrder(data) {
  return addDoc(collection(db, COL_SO), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
export async function updateSalesOrder(id, data) {
  return updateDoc(doc(db, COL_SO, id), { ...data, updatedAt: serverTimestamp() });
}
export async function removeSalesOrder(id) {
  return deleteDoc(doc(db, COL_SO, id));
}

// ── Invoice ────────────────────────────────────────────────────────────
export async function getAllInvoice() {
  const snap = await getDocs(query(collection(db, COL_INVOICE), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function getInvoiceById(id) {
  const snap = await getDoc(doc(db, COL_INVOICE, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
export async function createInvoice(data) {
  return addDoc(collection(db, COL_INVOICE), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
export async function updateInvoice(id, data) {
  return updateDoc(doc(db, COL_INVOICE, id), { ...data, updatedAt: serverTimestamp() });
}
export async function removeInvoice(id) {
  return deleteDoc(doc(db, COL_INVOICE, id));
}

// ── Pipeline ───────────────────────────────────────────────────────────
export async function getAllPipeline() {
  const snap = await getDocs(query(collection(db, COL_PIPELINE), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function createPipeline(data) {
  return addDoc(collection(db, COL_PIPELINE), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
export async function updatePipeline(id, data) {
  return updateDoc(doc(db, COL_PIPELINE, id), { ...data, updatedAt: serverTimestamp() });
}
export async function removePipeline(id) {
  return deleteDoc(doc(db, COL_PIPELINE, id));
}
