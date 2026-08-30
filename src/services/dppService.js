import { db, storage } from "../firebase/config";
import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  query, orderBy, where, serverTimestamp, writeBatch,
} from "firebase/firestore";
import {
  ref, uploadBytes, getDownloadURL, deleteObject,
} from "firebase/storage";

const CHECKLIST_COL = "dpp_checklist";
const SUBMISSIONS_COL = "dpp_submissions";

// ============ CHECKLIST (master) ============

export async function getChecklist({ activeOnly = false } = {}) {
  const snap = await getDocs(
    query(collection(db, CHECKLIST_COL), orderBy("order", "asc"))
  );
  let list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (activeOnly) list = list.filter(c => c.active !== false);
  return list;
}

export async function getChecklistItem(id) {
  const snap = await getDoc(doc(db, CHECKLIST_COL, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createChecklistItem(data) {
  const r = await addDoc(collection(db, CHECKLIST_COL), {
    ...data,
    active: data.active ?? true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return r.id;
}

export async function updateChecklistItem(id, data) {
  await updateDoc(doc(db, CHECKLIST_COL, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteChecklistItem(id) {
  await deleteDoc(doc(db, CHECKLIST_COL, id));
}

/** Reorder — pakai batch write supaya atomik */
export async function reorderChecklist(orderedIds) {
  const batch = writeBatch(db);
  orderedIds.forEach((id, idx) => {
    batch.update(doc(db, CHECKLIST_COL, id), { order: idx });
  });
  await batch.commit();
}

// ============ SUBMISSIONS ============

export async function getAllSubmissions() {
  const snap = await getDocs(
    query(collection(db, SUBMISSIONS_COL), orderBy("createdAt", "desc"))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getSubmission(id) {
  const snap = await getDoc(doc(db, SUBMISSIONS_COL, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createSubmission(data, user) {
  const r = await addDoc(collection(db, SUBMISSIONS_COL), {
    ...data,
    documents: {},
    status: "draft",
    createdBy: user
      ? { uid: user.uid, email: user.email || null }
      : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return r.id;
}

export async function updateSubmission(id, patch) {
  await updateDoc(doc(db, SUBMISSIONS_COL, id), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteSubmission(id) {
  // Hapus semua file di Storage dulu
  const sub = await getSubmission(id);
  if (sub?.documents) {
    for (const docKey of Object.keys(sub.documents)) {
      const meta = sub.documents[docKey];
      if (meta?.path) await safeDelete(meta.path);
    }
  }
  await deleteDoc(doc(db, SUBMISSIONS_COL, id));
}

// ============ FILE UPLOAD ============

/**
 * @param submissionId    string
 * @param checklistDocId  string
 * @param file            File
 * @param checklistMeta   { name, allowedTypes, maxSizeMB }  (untuk validasi)
 * @returns               { url, path, filename, size, type }
 */
export async function uploadDppFile(submissionId, checklistDocId, file, checklistMeta) {
  // ============ VALIDASI ============
  const maxBytes = (checklistMeta?.maxSizeMB ?? 5) * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(
      `File terlalu besar. Maksimal ${checklistMeta.maxSizeMB} MB, file Anda ${(file.size / 1024 / 1024).toFixed(1)} MB.`
    );
  }

  const allowed = checklistMeta?.allowedTypes ?? ["pdf", "image"];
  const isPdf = file.type === "application/pdf";
  const isImage = file.type?.startsWith("image/");
  const ok =
    (allowed.includes("pdf") && isPdf) ||
    (allowed.includes("image") && isImage);
  if (!ok) {
    const labels = allowed.map(t => t === "pdf" ? "PDF" : "Foto/Gambar").join(" atau ");
    throw new Error(`Tipe file harus: ${labels}. File Anda: ${file.type || "tidak dikenali"}`);
  }

  // ============ UPLOAD ============
  const path = `dpp/${submissionId}/${checklistDocId}/${Date.now()}_${file.name}`;
  const r = ref(storage, path);
  await uploadBytes(r, file);
  const url = await getDownloadURL(r);

  return {
    url, path,
    filename: file.name,
    size: file.size,
    type: file.type,
  };
}

/** Pasang metadata file ke documents map di submission doc */
export async function attachFileToSubmission(submissionId, checklistDocId, fileMeta, user) {
  const path = `documents.${checklistDocId}`;
  await updateDoc(doc(db, SUBMISSIONS_COL, submissionId), {
    [path]: {
      ...fileMeta,
      uploadedAt: new Date(),  // serverTimestamp tidak boleh di nested object
      uploadedBy: user ? { uid: user.uid, email: user.email || null } : null,
    },
    updatedAt: serverTimestamp(),
  });
}

/** Hapus file: delete di Storage + set null di Firestore */
export async function removeFileFromSubmission(submissionId, checklistDocId, currentMeta) {
  if (currentMeta?.path) await safeDelete(currentMeta.path);
  const path = `documents.${checklistDocId}`;
  await updateDoc(doc(db, SUBMISSIONS_COL, submissionId), {
    [path]: null,
    updatedAt: serverTimestamp(),
  });
}

async function safeDelete(path) {
  try { await deleteObject(ref(storage, path)); }
  catch (e) { console.warn("delete failed:", path, e.code); }
}

// ============ STATS HELPER ============

/**
 * Hitung progress submission: berapa yang wajib + berapa terisi.
 * Dipanggil di list & detail page.
 */
export function computeProgress(submission, checklist) {
  if (!checklist?.length) return { total: 0, filled: 0, requiredFilled: 0, requiredTotal: 0 };
  const docs = submission?.documents || {};
  let total = 0, filled = 0, requiredTotal = 0, requiredFilled = 0;
  for (const c of checklist) {
    if (c.active === false) continue;
    total += 1;
    const meta = docs[c.id];
    const isFilled = meta && meta.url;
    if (isFilled) filled += 1;
    if (c.required) {
      requiredTotal += 1;
      if (isFilled) requiredFilled += 1;
    }
  }
  return { total, filled, requiredTotal, requiredFilled };
}