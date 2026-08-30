import { db } from "../firebase/config";
import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  serverTimestamp, query, orderBy,
} from "firebase/firestore";

export function formatRupiah(n) {
  if (!n && n !== 0) return "Rp 0";
  return "Rp " + Number(n).toLocaleString("id-ID");
}

const COL_VENDOR = "vendor";
const COL_PO = "purchaseOrder";
const COL_APPROVAL = "approvalPembelian";
const COL_PENERIMAAN = "penerimaanBarang";

export async function getAllVendor() {
  const snap = await getDocs(query(collection(db, COL_VENDOR), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function createVendor(data) {
  return addDoc(collection(db, COL_VENDOR), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
export async function updateVendor(id, data) {
  return updateDoc(doc(db, COL_VENDOR, id), { ...data, updatedAt: serverTimestamp() });
}
export async function removeVendor(id) {
  return deleteDoc(doc(db, COL_VENDOR, id));
}

export async function getAllPurchaseOrder() {
  const snap = await getDocs(query(collection(db, COL_PO), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function createPurchaseOrder(data) {
  return addDoc(collection(db, COL_PO), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
export async function updatePurchaseOrder(id, data) {
  return updateDoc(doc(db, COL_PO, id), { ...data, updatedAt: serverTimestamp() });
}
export async function removePurchaseOrder(id) {
  return deleteDoc(doc(db, COL_PO, id));
}

export async function getAllApproval() {
  const snap = await getDocs(query(collection(db, COL_APPROVAL), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function createApproval(data) {
  return addDoc(collection(db, COL_APPROVAL), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
export async function updateApproval(id, data) {
  return updateDoc(doc(db, COL_APPROVAL, id), { ...data, updatedAt: serverTimestamp() });
}
export async function removeApproval(id) {
  return deleteDoc(doc(db, COL_APPROVAL, id));
}

export async function getAllPenerimaan() {
  const snap = await getDocs(query(collection(db, COL_PENERIMAAN), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function createPenerimaan(data) {
  return addDoc(collection(db, COL_PENERIMAAN), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
export async function updatePenerimaan(id, data) {
  return updateDoc(doc(db, COL_PENERIMAAN, id), { ...data, updatedAt: serverTimestamp() });
}
export async function removePenerimaan(id) {
  return deleteDoc(doc(db, COL_PENERIMAAN, id));
}
