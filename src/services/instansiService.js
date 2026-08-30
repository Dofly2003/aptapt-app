import { db, storage } from "../firebase/config";
import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import imageCompression from "browser-image-compression";

const COL = "instansi";

export async function getAllInstansi({ aktifOnly = false } = {}) {
  const snap = await getDocs(collection(db, COL));
  let list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (aktifOnly) list = list.filter(i => i.aktif !== false);
  list.sort((a, b) => (a.nama || "").localeCompare(b.nama || ""));
  return list;
}

export async function getInstansi(id) {
  const snap = await getDoc(doc(db, COL, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createInstansi(data) {
  const r = await addDoc(collection(db, COL), {
    ...data,
    aktif: data.aktif ?? true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return r.id;
}

export async function updateInstansi(id, data) {
  await updateDoc(doc(db, COL, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/** Soft delete — laporan lama tetap terbaca, tapi tidak muncul di dropdown form. */
export async function softDeleteInstansi(id) {
  await updateDoc(doc(db, COL, id), {
    aktif: false,
    updatedAt: serverTimestamp(),
  });
}

/** Hard delete — hapus dokumen + semua aset. Hati-hati. */
export async function hardDeleteInstansi(id) {
  const inst = await getInstansi(id);
  if (inst?.logo?.path) await safeDelete(inst.logo.path);
  for (const pj of inst?.penanggungJawab ?? []) {
    if (pj.signature?.path) await safeDelete(pj.signature.path);
    if (pj.stempel?.path) await safeDelete(pj.stempel.path);
  }
  await deleteDoc(doc(db, COL, id));
}

// ---------- Image helpers ----------
export async function uploadInstansiImage(file, folder, opts = {}) {
  if (!file.type.startsWith('image/')) {
    throw new Error('File yang diunggah harus berupa gambar.');
  }
  const compressed = opts.skipCompress ? file : await imageCompression(file, {
    maxSizeMB: opts.maxSizeMB ?? 0.4,
    maxWidthOrHeight: opts.maxWidthOrHeight ?? 800,
    useWebWorker: true,
  });
  const path = `instansi/${folder}/${Date.now()}_${file.name}`;
  const r = ref(storage, path);
  await uploadBytes(r, compressed);
  const url = await getDownloadURL(r);
  return { url, path };
}

export async function deleteInstansiImage(path) {
  if (!path) return;
  await safeDelete(path);
}

async function safeDelete(path) {
  try { await deleteObject(ref(storage, path)); }
  catch (e) { console.warn("delete failed:", path, e.code); }
}