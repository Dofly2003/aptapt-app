import { useEffect, useState, useCallback } from "react";
import {
  collection as fsCollection, onSnapshot,
  query, orderBy, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp,
} from "firebase/firestore";
import { db as firestore } from "../firebase/config";
import localDb from "./db";
import { isOnline, onNetworkChange } from "./networkWatcher";
import { queueCreate, queueSectionUpdate, queueDelete, getPendingCount, flushQueue } from "./syncEngine";

/**
 * Offline-first CRUD hook for simple list collections.
 *
 * @param {object} opts
 *   firestoreCollection  - Firestore collection name
 *   dexieTable           - Dexie table name on localDb
 *   orderByField         - Field to orderBy (default "createdAt")
 *   queryConstraints     - Extra Firestore where() constraints
 */
export function useOfflineCRUD({
  firestoreCollection,
  dexieTable,
  orderByField = "createdAt",
  queryConstraints = [],
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(isOnline());
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const table = localDb[dexieTable];

  // ─── Network state ────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onNetworkChange(async (up) => {
      setOnline(up);
      if (up) setPendingCount(await getPendingCount());
    });
    getPendingCount().then(setPendingCount);
    return unsub;
  }, []);

  // ─── Firestore + Dexie sync ───────────────────────────────────────
  useEffect(() => {
    if (!table) return;

    // Show cached data immediately
    table.toArray().then(cached => {
      if (cached.length > 0) {
        setItems(cached.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)));
        setLoading(false);
      }
    });

    const q = query(
      fsCollection(firestore, firestoreCollection),
      ...queryConstraints,
      orderBy(orderByField, "desc"),
    );

    const unsub = onSnapshot(q,
      async (snap) => {
        const rows = snap.docs.map(d => ({ id: d.id, docId: d.id, ...d.data() }));
        setItems(rows);
        setLoading(false);
        await table.bulkPut(rows.map(r => ({ ...r, syncedAt: Date.now() })));
      },
      async () => {
        const cached = await table.toArray();
        setItems(cached.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)));
        setLoading(false);
      }
    );
    return () => unsub();
  }, [firestoreCollection, dexieTable]);

  // ─── CRUD ─────────────────────────────────────────────────────────

  const create = useCallback(async (data) => {
    if (online) {
      const docRef = await addDoc(fsCollection(firestore, firestoreCollection), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    } else {
      const localId = `local_${Date.now()}`;
      const now = Date.now();
      if (table) {
        await table.put({ docId: localId, id: localId, ...data, createdAt: now, updatedAt: now, syncedAt: 0 });
      }
      await queueCreate(firestoreCollection, { ...data, createdAt: new Date() }, localId);
      setPendingCount(c => c + 1);
      return localId;
    }
  }, [online, firestoreCollection, dexieTable]);

  const update = useCallback(async (docId, data) => {
    if (online) {
      await updateDoc(doc(firestore, firestoreCollection, docId), {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } else {
      if (table) {
        await table.update(docId, { ...data, updatedAt: Date.now() });
      }
      await queueSectionUpdate(firestoreCollection, docId, data);
      setPendingCount(c => c + 1);
    }
  }, [online, firestoreCollection, dexieTable]);

  const remove = useCallback(async (docId) => {
    if (online) {
      await deleteDoc(doc(firestore, firestoreCollection, docId));
    } else {
      if (table) await table.delete(docId);
      await queueDelete(firestoreCollection, docId);
      setPendingCount(c => c + 1);
    }
  }, [online, firestoreCollection]);

  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      await flushQueue();
      setPendingCount(await getPendingCount());
    } finally {
      setSyncing(false);
    }
  }, []);

  return { items, loading, online, pendingCount, syncing, create, update, remove, sync };
}
