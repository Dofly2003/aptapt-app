import Dexie from "dexie";

export const db = new Dexie("AdytiaOffline");

db.version(1).stores({
  // Pending writes waiting to sync
  pendingQueue: "++id, collection, docId, type, createdAt",

  // Local snapshots of Firestore collections
  pengujian:   "docId, updatedAt, syncedAt",
  nidi_data:   "docId, updatedAt, syncedAt",
  keuangan:    "docId, collection, updatedAt, syncedAt",
  inventori:   "docId, collection, updatedAt, syncedAt",
  rab:         "docId, updatedAt, syncedAt",
  invoice:     "docId, updatedAt, syncedAt",

  // Photo cache (offline-first photos)
  photoCache:  "url, cachedAt, filePath",
});

export default db;
