import { db, storage } from "../firebase/config";
import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, serverTimestamp,
} from "firebase/firestore";

// Simpan data laik operasi langsung ke field nested di pengujian/{id}.laikOperasi
export async function saveLaikOperasiToPengujian(pengujianId, laikOperasiData) {
  await updateDoc(doc(db, "pengujian", pengujianId), {
    laikOperasi: laikOperasiData,
    updatedAt: new Date(),
  });
}

export async function getLaikOperasiFromPengujian(pengujianId) {
  const snap = await getDoc(doc(db, "pengujian", pengujianId));
  return snap.exists() ? (snap.data().laikOperasi ?? null) : null;
}
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import imageCompression from "browser-image-compression";

const COL = "laikOperasi";

export async function getAllLaikOperasi() {
  const snap = await getDocs(collection(db, COL));
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  list.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
  return list;
}

export async function getLaikOperasi(id) {
  const snap = await getDoc(doc(db, COL, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createLaikOperasi(data) {
  const r = await addDoc(collection(db, COL), {
    ...data,
    status: "draft",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return r.id;
}

export async function updateLaikOperasi(id, data) {
  await updateDoc(doc(db, COL, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteLaikOperasi(id) {
  await deleteDoc(doc(db, COL, id));
}

export async function uploadLoPhoto(file, docId, slotKey) {
  const compressed = await imageCompression(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1600,
    useWebWorker: false,
  });
  const path = `laikOperasi/${docId}/${slotKey}_${Date.now()}`;
  const r = ref(storage, path);
  await uploadBytes(r, compressed);
  const url = await getDownloadURL(r);
  return { url, path };
}

export async function deleteLoPhoto(path) {
  if (!path) return;
  try { await deleteObject(ref(storage, path)); } catch (e) { console.warn("delete photo:", e.code); }
}

