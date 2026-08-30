import {
  doc, updateDoc, setDoc, deleteDoc, addDoc,
  collection as fsCollection, arrayUnion, serverTimestamp,
} from "firebase/firestore";
import { uploadViaPresign, publicUrl } from "../firebase/secureStorage";
import { db as firestore } from "../firebase/config";
import db from "./db";
import { isOnline, onNetworkChange } from "./networkWatcher";
import { readLocalPhotoAsBlob } from "./photoStore";

let _syncing = false;
let _flushPromise = null;
const progressListeners = new Set();
const idRemapListeners = new Set();

const ALLOWED_SYNC_COLLECTIONS = new Set([
  "pengujian", "nidi_data", "dokumen_keuangan",
  "stokBarang", "pergerakanStok", "gudang",
  "rabDokumen", "invoice", "transaksi",
]);

const ALLOWED_ARRAY_FIELDS = new Set([
  "formData.part1.photos", "formData.part2.photos", "formData.part3.photos",
  "formData.part4.photos", "formData.part5.photos", "formData.part6.photos",
  "formData.part7.photos", "formData.part8.photos", "formData.part9.photos",
  "formData.part10.photos", "photos", "attachments", "lampiran",
]);

const SAFE_STORAGE_PATH_PREFIXES = [
  /^pengujian\/[^/]+\/[^/]+\//,
  /^nidi_data\/[^/]+\//,
  /^inventori\/[^/]+\//,
];

function isValidStoragePath(storagePath) {
  if (!storagePath || typeof storagePath !== "string") return false;
  if (storagePath.includes("..") || storagePath.startsWith("/") || storagePath.includes("%")) return false;
  return SAFE_STORAGE_PATH_PREFIXES.some(re => re.test(storagePath));
}

export function onSyncProgress(cb) {
  progressListeners.add(cb);
  return () => progressListeners.delete(cb);
}

export function onIdRemap(cb) {
  idRemapListeners.add(cb);
  return () => idRemapListeners.delete(cb);
}

function emit(state) {
  progressListeners.forEach(cb => cb(state));
}

// ─── Queue helpers ────────────────────────────────────────────────────────────

export async function enqueue(item) {
  await db.pendingQueue.add({ ...item, createdAt: Date.now() });
}

export async function getPendingCount() {
  return db.pendingQueue.count();
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Queue a section-level update.
 * `sectionData` is a flat { "formData.part1.phb_tr": value, ... } object.
 */
export async function queueSectionUpdate(collection, docId, sectionData) {
  await enqueue({ type: "sectionUpdate", collection, docId, data: sectionData });
  if (isOnline()) await flushQueue();
}

/**
 * Queue a full create.
 */
export async function queueCreate(collection, data, localId) {
  await enqueue({ type: "create", collection, localId, data });
  if (isOnline()) await flushQueue();
}

/**
 * Queue a photo to upload and merge via arrayUnion.
 * `localPath` — Capacitor Filesystem path for the photo blob.
 * `arrayField` — Firestore field path, e.g. "formData.part1.photos".
 */
export async function queuePhotoUpload(collection, docId, localPath, storagePath, arrayField) {
  await enqueue({
    type: "photoUpload",
    collection, docId, localPath, storagePath, arrayField,
  });
  if (isOnline()) await flushQueue();
}

/**
 * Queue a delete.
 */
export async function queueDelete(collection, docId) {
  await enqueue({ type: "delete", collection, docId });
  if (isOnline()) await flushQueue();
}

// ─── Flush ────────────────────────────────────────────────────────────────────

export function flushQueue() {
  if (_flushPromise) return _flushPromise;
  if (!isOnline()) return Promise.resolve();
  _flushPromise = _doFlush().finally(() => { _flushPromise = null; });
  return _flushPromise;
}

async function _doFlush() {
  if (_syncing || !isOnline()) return;
  _syncing = true;

  const total = await db.pendingQueue.count();
  let done = 0;
  emit({ syncing: true, done, total });

  try {
    // Process in insertion order
    const items = await db.pendingQueue.orderBy("createdAt").toArray();

    for (const item of items) {
      try {
        await processItem(item);
        await db.pendingQueue.delete(item.id);
        done++;
        emit({ syncing: true, done, total });
      } catch (err) {
        console.warn("[sync] failed item", item.id, err.code ?? "error");
        // Leave in queue for next attempt; stop here to preserve order
        break;
      }
    }
  } finally {
    _syncing = false;
    const remaining = await db.pendingQueue.count();
    emit({ syncing: false, done, total, remaining });
  }
}

async function processItem(item) {
  if (!ALLOWED_SYNC_COLLECTIONS.has(item.collection)) {
    throw new Error(`Koleksi tidak diizinkan untuk sync: ${item.collection}`);
  }

  const docRef = item.docId
    ? doc(firestore, item.collection, item.docId)
    : null;

  switch (item.type) {
    case "sectionUpdate": {
      await updateDoc(docRef, {
        ...item.data,
        updatedAt: serverTimestamp(),
      });
      break;
    }

    case "create": {
      const colRef = fsCollection(firestore, item.collection);
      const result = await addDoc(colRef, {
        ...item.data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      // Remap local cache entry to real Firestore ID
      if (item.localId && item.localId !== result.id) {
        await remapLocalId(item.collection, item.localId, result.id);
      }
      break;
    }

    case "photoUpload": {
      if (!ALLOWED_ARRAY_FIELDS.has(item.arrayField)) {
        throw new Error(`arrayField tidak diizinkan: ${item.arrayField}`);
      }
      if (!isValidStoragePath(item.storagePath)) {
        throw new Error(`storagePath tidak valid: ${item.storagePath}`);
      }

      const blob = await readLocalPhotoAsBlob(item.localPath);
      if (!blob) throw new Error("local photo blob not found");

      await uploadViaPresign(item.storagePath, blob, "image/jpeg");
      const url = publicUrl(item.storagePath);

      // Merge photo URL into the array field — safe for concurrent users
      await updateDoc(docRef, {
        [item.arrayField]: arrayUnion(url),
        updatedAt: serverTimestamp(),
      });
      break;
    }

    case "delete": {
      await deleteDoc(docRef);
      break;
    }
  }
}

// When a create resolves to a real ID, update the local cache and pending queue
async function remapLocalId(collection, localId, realId) {
  const tables = {
    pengujian: db.pengujian,
    nidi_data: db.nidi_data,
    dokumen_keuangan: db.keuangan,
    stokBarang: db.inventori,
    pergerakanStok: db.inventori,
    gudang: db.inventori,
    rabDokumen: db.rab,
    invoice: db.invoice,
  };
  const table = tables[collection];
  if (table) {
    const row = await table.get(localId);
    if (row) {
      await table.delete(localId);
      await table.put({ ...row, docId: realId });
    }
  }

  // Update any pending photoUpload / sectionUpdate items still targeting localId
  const related = await db.pendingQueue.where("docId").equals(localId).toArray();
  for (const item of related) {
    await db.pendingQueue.put({ ...item, docId: realId });
  }

  // Rename localStorage draft cache so form loads photos with the real ID
  if (collection === "pengujian") {
    try {
      const oldKey = `pengujian_draft_${localId}`;
      const newKey = `pengujian_draft_${realId}`;
      const cached = localStorage.getItem(oldKey);
      if (cached) {
        localStorage.setItem(newKey, cached);
        localStorage.removeItem(oldKey);
      }
    } catch {}
  }

  // Notify listeners (e.g. form page redirects to real URL)
  idRemapListeners.forEach(cb => cb({ collection, localId, realId }));
}

// ─── Auto-flush when coming online ───────────────────────────────────────────

onNetworkChange(online => {
  if (online) flushQueue();
});
