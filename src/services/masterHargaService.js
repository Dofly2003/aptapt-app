// src/services/masterHargaService.js
// Master harga barang — sumber referensi harga untuk RAB.
// Auto-learn dari RAB: setiap kali RAB tersimpan, item barunya masuk ke sini
// dan item lama diupdate historinya.

import { db } from "../firebase/config";
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp, Timestamp,
} from "firebase/firestore";
import { normalizeItemName, findBestMatch } from "../utils/normalizeItemName";

const COL = "master_harga";
const HISTORY_LIMIT = 30; // max entries in history array per item

// ============ CRUD ============
export async function getAllMasterHarga() {
  const q = query(collection(db, COL), orderBy("nama", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getMasterHarga(id) {
  const snap = await getDoc(doc(db, COL, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createMasterHarga(data, userId) {
  const nama = (data.nama || "").trim();
  const harga = Number(data.harga) || 0;
  return addDoc(collection(db, COL), {
    ...data,
    nama,
    normalizedName: normalizeItemName(nama),
    harga,
    history: [],
    usageCount: 0,
    avgPrice: harga,
    minPrice: harga,
    maxPrice: harga,
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateMasterHarga(id, data) {
  const patch = { ...data, updatedAt: serverTimestamp() };
  if (data.nama) patch.normalizedName = normalizeItemName(data.nama);
  if (data.harga != null) patch.harga = Number(data.harga) || 0;
  await updateDoc(doc(db, COL, id), patch);
}

export async function deleteMasterHarga(id) {
  await deleteDoc(doc(db, COL, id));
}

// ============ AUTO-LEARN FROM RAB ============

/**
 * Update master_harga dari 1 item RAB.
 * - Cari item di list existing (fuzzy match by normalizedName).
 * - Kalau ketemu → append history, update lastPrice/stats (kalau tanggal >= lastUsedAt).
 * - Kalau tidak → create baru.
 *
 * @param {Object} rabItem { nama, satuan, hargaSatuan }
 * @param {Object} rabInfo { rabId, rabNomor, tanggal (string YYYY-MM-DD atau Date) }
 * @param {Array}  existingList Optional — cached list untuk hindari re-query
 * @param {string} userId
 * @returns {Promise<{action: 'created'|'updated'|'skipped', id: string}>}
 */
export async function upsertFromRabItem(rabItem, rabInfo, existingList = null, userId = null) {
  const nama = (rabItem.nama || "").trim();
  const harga = Number(rabItem.hargaSatuan) || 0;
  if (!nama || harga <= 0) return { action: "skipped", id: null };

  const tanggal = normalizeDate(rabInfo.tanggal);
  const normalized = normalizeItemName(nama);

  // Load list kalau belum di-cache
  const list = existingList || (await getAllMasterHarga());
  const match = findBestMatch(nama, list, 0.7);

  const historyEntry = {
    price: harga,
    date: Timestamp.fromDate(tanggal),
    rabId: rabInfo.rabId || null,
    rabNomor: rabInfo.rabNomor || null,
  };

  if (match) {
    // UPDATE existing
    const target = match.item;
    const history = [historyEntry, ...(target.history || [])].slice(0, HISTORY_LIMIT);
    const prices = history.map((h) => h.price).filter((p) => p > 0);
    const isNewest = !target.lastUsedAt || tanggal.getTime() >= toDate(target.lastUsedAt).getTime();

    const patch = {
      history,
      usageCount: (target.usageCount || 0) + 1,
      avgPrice: Math.round(prices.reduce((s, p) => s + p, 0) / prices.length),
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      updatedAt: serverTimestamp(),
    };

    // Update harga terkini hanya kalau entry ini lebih baru dari lastUsedAt
    if (isNewest) {
      patch.harga = harga;
      patch.lastUsedAt = Timestamp.fromDate(tanggal);
      if (rabItem.satuan && !target.satuan) patch.satuan = rabItem.satuan;
    }

    await updateDoc(doc(db, COL, target.id), patch);
    return { action: "updated", id: target.id };
  }

  // CREATE baru
  const ref = await addDoc(collection(db, COL), {
    nama,
    normalizedName: normalized,
    merek: "",
    harga,
    satuan: rabItem.satuan || "pcs",
    history: [historyEntry],
    usageCount: 1,
    avgPrice: harga,
    minPrice: harga,
    maxPrice: harga,
    lastUsedAt: Timestamp.fromDate(tanggal),
    createdBy: userId,
    createdFrom: "rab_auto_learn",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { action: "created", id: ref.id };
}

/**
 * Bulk upsert semua item dari 1 RAB. Ambil list sekali, lalu proses semua item
 * secara sequential (agar findBestMatch bisa hindari duplikat dalam RAB yang sama).
 *
 * @param {Array} items Flat array of RAB items
 * @param {Object} rabInfo { rabId, rabNomor, tanggal }
 * @param {string} userId
 * @returns {Promise<{created: number, updated: number, skipped: number}>}
 */
export async function bulkUpsertFromRab(items, rabInfo, userId = null) {
  const stats = { created: 0, updated: 0, skipped: 0 };
  if (!items?.length) return stats;

  // Cache list — akan di-update secara in-memory setiap kali create baru
  const list = await getAllMasterHarga();

  for (const item of items) {
    try {
      const result = await upsertFromRabItem(item, rabInfo, list, userId);
      stats[result.action]++;

      // Kalau baru dibuat, tambahkan ke cache list agar item selanjutnya
      // dengan nama serupa tidak duplikat
      if (result.action === "created" && result.id) {
        list.push({
          id: result.id,
          nama: item.nama,
          normalizedName: normalizeItemName(item.nama),
          harga: Number(item.hargaSatuan) || 0,
          satuan: item.satuan,
          usageCount: 1,
          history: [],
        });
      }
    } catch (err) {
      console.warn("upsertFromRabItem failed:", item.nama, err);
      stats.skipped++;
    }
  }

  return stats;
}

// ============ SEARCH / SUGGESTION ============

/**
 * Hitung price trend dari history: bandingkan avg 3 harga terakhir vs 3 sebelumnya.
 * Return: { direction: 'up'|'down'|'stable', percent: number }
 */
export function getPriceTrend(history) {
  if (!history?.length || history.length < 2) return { direction: "stable", percent: 0 };
  const recent = history.slice(0, 3).map((h) => h.price);
  const older = history.slice(3, 6).map((h) => h.price);
  if (!older.length) {
    // Fallback: pertama vs terakhir
    const first = history[history.length - 1].price;
    const last = history[0].price;
    const percent = ((last - first) / first) * 100;
    return {
      direction: Math.abs(percent) < 1 ? "stable" : percent > 0 ? "up" : "down",
      percent: Number(percent.toFixed(1)),
    };
  }
  const avgRecent = recent.reduce((s, p) => s + p, 0) / recent.length;
  const avgOlder = older.reduce((s, p) => s + p, 0) / older.length;
  const percent = ((avgRecent - avgOlder) / avgOlder) * 100;
  return {
    direction: Math.abs(percent) < 1 ? "stable" : percent > 0 ? "up" : "down",
    percent: Number(percent.toFixed(1)),
  };
}

// ============ HELPERS ============
function normalizeDate(input) {
  if (!input) return new Date();
  if (input instanceof Date) return input;
  if (typeof input === "string") {
    const d = new Date(input);
    return isNaN(d.getTime()) ? new Date() : d;
  }
  if (input?.toDate) return input.toDate();
  return new Date();
}

function toDate(ts) {
  if (ts?.toDate) return ts.toDate();
  if (ts instanceof Date) return ts;
  return new Date(ts);
}
