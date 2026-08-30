import { db } from "../firebase/config";
import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  serverTimestamp, query, orderBy, where,
} from "firebase/firestore";

export function hitungGajiBersih(bruto, potonganPersen) {
  return bruto * (1 - potonganPersen / 100);
}

const COL_KARYAWAN = "karyawan";
const COL_PENGGAJIAN = "penggajian";
const COL_ABSENSI = "absensi";
const COL_REKRUTMEN = "rekrutmen";
const COL_KINERJA = "kinerja";

export async function getAllKaryawan() {
  const snap = await getDocs(query(collection(db, COL_KARYAWAN), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function getKaryawanById(id) {
  const snap = await getDoc(doc(db, COL_KARYAWAN, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
export async function createKaryawan(data) {
  return addDoc(collection(db, COL_KARYAWAN), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
export async function updateKaryawan(id, data) {
  return updateDoc(doc(db, COL_KARYAWAN, id), { ...data, updatedAt: serverTimestamp() });
}
export async function removeKaryawan(id) {
  return deleteDoc(doc(db, COL_KARYAWAN, id));
}

export async function getAllPenggajian() {
  const snap = await getDocs(query(collection(db, COL_PENGGAJIAN), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function getPenggajianById(id) {
  const snap = await getDoc(doc(db, COL_PENGGAJIAN, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
export async function createPenggajian(data) {
  return addDoc(collection(db, COL_PENGGAJIAN), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
export async function updatePenggajian(id, data) {
  return updateDoc(doc(db, COL_PENGGAJIAN, id), { ...data, updatedAt: serverTimestamp() });
}
export async function removePenggajian(id) {
  return deleteDoc(doc(db, COL_PENGGAJIAN, id));
}

export async function getAllAbsensi() {
  const snap = await getDocs(query(collection(db, COL_ABSENSI), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function getAbsensiById(id) {
  const snap = await getDoc(doc(db, COL_ABSENSI, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
export async function createAbsensi(data) {
  return addDoc(collection(db, COL_ABSENSI), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
export async function updateAbsensi(id, data) {
  return updateDoc(doc(db, COL_ABSENSI, id), { ...data, updatedAt: serverTimestamp() });
}
export async function removeAbsensi(id) {
  return deleteDoc(doc(db, COL_ABSENSI, id));
}

export async function getAllRekrutmen() {
  const snap = await getDocs(query(collection(db, COL_REKRUTMEN), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function getRekrutmenById(id) {
  const snap = await getDoc(doc(db, COL_REKRUTMEN, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
export async function createRekrutmen(data) {
  return addDoc(collection(db, COL_REKRUTMEN), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
export async function updateRekrutmen(id, data) {
  return updateDoc(doc(db, COL_REKRUTMEN, id), { ...data, updatedAt: serverTimestamp() });
}
export async function removeRekrutmen(id) {
  return deleteDoc(doc(db, COL_REKRUTMEN, id));
}

export async function updateRekrutmenForm(id, formFields) {
  return updateDoc(doc(db, COL_REKRUTMEN, id), { formFields, updatedAt: serverTimestamp() });
}

const COL_SUBMISSIONS = "rekrutmen_submissions";

export async function createSubmission(data) {
  return addDoc(collection(db, COL_SUBMISSIONS), { ...data, createdAt: serverTimestamp() });
}

export async function getSubmissionsByRekrutmen(rekrutmenId) {
  const snap = await getDocs(query(
    collection(db, COL_SUBMISSIONS),
    where("rekrutmenId", "==", rekrutmenId),
    orderBy("createdAt", "desc"),
  ));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function removeSubmission(id) {
  return deleteDoc(doc(db, COL_SUBMISSIONS, id));
}

export async function getAllKinerja() {
  const snap = await getDocs(query(collection(db, COL_KINERJA), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function getKinerjaById(id) {
  const snap = await getDoc(doc(db, COL_KINERJA, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
export async function createKinerja(data) {
  return addDoc(collection(db, COL_KINERJA), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
export async function updateKinerja(id, data) {
  return updateDoc(doc(db, COL_KINERJA, id), { ...data, updatedAt: serverTimestamp() });
}
export async function removeKinerja(id) {
  return deleteDoc(doc(db, COL_KINERJA, id));
}

const COL_SERTIFIKAT = "sertifikat_magang";

export async function getAllSertifikat() {
  const snap = await getDocs(query(collection(db, COL_SERTIFIKAT), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function createSertifikat(data) {
  return addDoc(collection(db, COL_SERTIFIKAT), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
export async function updateSertifikat(id, data) {
  return updateDoc(doc(db, COL_SERTIFIKAT, id), { ...data, updatedAt: serverTimestamp() });
}
export async function removeSertifikat(id) {
  return deleteDoc(doc(db, COL_SERTIFIKAT, id));
}
