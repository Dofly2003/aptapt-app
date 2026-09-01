import { db, storage } from "../firebase/config";
import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  serverTimestamp, query, orderBy,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import imageCompression from "browser-image-compression";

const COL = "maintenanceGardu";

export async function getAllMaintenanceGardu() {
  const snap = await getDocs(query(collection(db, COL), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getMaintenanceGarduById(id) {
  const snap = await getDoc(doc(db, COL, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createMaintenanceGardu(data) {
  const docRef = await addDoc(collection(db, COL), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateMaintenanceGardu(id, data) {
  return updateDoc(doc(db, COL, id), { ...data, updatedAt: serverTimestamp() });
}

export async function removeMaintenanceGardu(id) {
  return deleteDoc(doc(db, COL, id));
}

export async function uploadGarduPhoto(file, docId, section, type) {
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.8,
    maxWidthOrHeight: 1600,
    useWebWorker: false,
  });
  const path = `maintenanceGardu/${docId}/${section}/${type}_${Date.now()}.jpg`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, compressed);
  const url = await getDownloadURL(storageRef);
  return { url, path };
}

export async function deleteGarduPhoto(storagePath) {
  try { await deleteObject(ref(storage, storagePath)); } catch {}
}
