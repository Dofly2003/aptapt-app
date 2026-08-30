import { db, storage } from "../firebase/config";
import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  serverTimestamp, query, orderBy,
} from "firebase/firestore";
import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject,
} from "firebase/storage";

const COL = "dokumen_keuangan";

export async function getAllDokumen() {
  const snap = await getDocs(query(collection(db, COL), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getDokumenById(id) {
  const snap = await getDoc(doc(db, COL, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createDokumen(data) {
  return addDoc(collection(db, COL), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export async function updateDokumen(id, data) {
  return updateDoc(doc(db, COL, id), { ...data, updatedAt: serverTimestamp() });
}

export async function removeDokumen(id, storagePath) {
  if (storagePath) {
    try { await deleteObject(ref(storage, storagePath)); } catch (_) {}
  }
  return deleteDoc(doc(db, COL, id));
}

export async function uploadFileDokumen(docId, file, onProgress) {
  const allowedTypes = ['application/pdf'];
  const isImage = file.type.startsWith('image/');
  if (!allowedTypes.includes(file.type) && !isImage) {
    throw new Error('Format file tidak diizinkan. Hanya PDF dan gambar yang diperbolehkan.');
  }
  const maxSize = 10 * 1024 * 1024; // 10 MB
  if (file.size > maxSize) {
    throw new Error('Ukuran file melebihi batas maksimal 10 MB.');
  }
  const ext = file.name.split(".").pop().toLowerCase();
  const path = `dokumen/${docId}/${Date.now()}.${ext}`;
  const storageRef = ref(storage, path);
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file);
    task.on(
      "state_changed",
      snap => onProgress && onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve({ url, path });
      }
    );
  });
}

export async function deleteFileDokumen(path) {
  if (!path) return;
  try { await deleteObject(ref(storage, path)); } catch (_) {}
}
