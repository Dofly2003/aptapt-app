// src/utils/migrateMasterHargaFromRab.js
// One-time (idempotent) migration: baca semua RAB historis, aggregate item-nya
// ke master_harga collection. Digunakan untuk mem-seed database awal supaya
// autocomplete di RabEditor sudah punya data sejak awal.
//
// Bisa dijalankan berkali-kali — item existing akan di-update, tidak diduplikasi.

import { getAllDokumen } from "../services/rabService";
import { getDocs, collection } from "firebase/firestore";
import { db } from "../firebase/config";
import { bulkUpsertFromRab } from "../services/masterHargaService";

/**
 * Migrate semua RAB → master_harga.
 * @param {Object} opts
 * @param {(progress: {current, total, rabNomor, stats}) => void} opts.onProgress
 * @param {string} opts.userId
 * @returns {Promise<{
 *   rabProcessed: number,
 *   itemsCreated: number,
 *   itemsUpdated: number,
 *   itemsSkipped: number,
 * }>}
 */
export async function migrateMasterHargaFromRab({ onProgress, userId } = {}) {
  // Ambil semua dokumen RAB, sort by tanggal ASC (paling lama dulu),
  // supaya history urut kronologis dan harga terbaru menang di lastUsedAt.
  const allRab = await getAllDokumen({ type: "rab" });
  const sorted = [...allRab].sort((a, b) => {
    const da = toDate(a.tanggal || a.createdAt);
    const dbb = toDate(b.tanggal || b.createdAt);
    return da - dbb;
  });

  const totals = { rabProcessed: 0, itemsCreated: 0, itemsUpdated: 0, itemsSkipped: 0 };

  for (let i = 0; i < sorted.length; i++) {
    const rab = sorted[i];
    const items = extractItems(rab);
    if (!items.length) {
      totals.rabProcessed++;
      onProgress?.({ current: i + 1, total: sorted.length, rabNomor: rab.nomor, stats: totals });
      continue;
    }

    const stats = await bulkUpsertFromRab(
      items,
      { rabId: rab.id, rabNomor: rab.nomor, tanggal: rab.tanggal || rab.createdAt },
      userId,
    );

    totals.itemsCreated += stats.created;
    totals.itemsUpdated += stats.updated;
    totals.itemsSkipped += stats.skipped;
    totals.rabProcessed++;

    onProgress?.({ current: i + 1, total: sorted.length, rabNomor: rab.nomor, stats: totals });
  }

  return totals;
}

/**
 * Support format lama (items[]) dan baru (groups[].items[]).
 * Filter item tanpa nama atau harga invalid.
 */
function extractItems(rab) {
  const raw = rab?.groups?.length
    ? rab.groups.flatMap((g) => g.items || [])
    : rab?.items || [];
  return raw.filter((it) => {
    const nama = (it.nama || "").trim();
    const harga = Number(it.hargaSatuan) || 0;
    return nama.length > 0 && harga > 0;
  });
}

function toDate(v) {
  if (!v) return new Date(0);
  if (v?.toDate) return v.toDate();
  if (typeof v === "string") return new Date(v);
  if (v instanceof Date) return v;
  return new Date(0);
}

/**
 * Count berapa item yang belum ada di master_harga.
 * Digunakan untuk preview sebelum user pencet tombol migrasi.
 */
export async function estimateMigrationImpact() {
  const [allRab, masterSnap] = await Promise.all([
    getAllDokumen({ type: "rab" }),
    getDocs(collection(db, "master_harga")),
  ]);
  const existingNames = new Set(
    masterSnap.docs.map((d) => (d.data().normalizedName || "").trim()).filter(Boolean),
  );
  const seenInRab = new Set();
  let totalItems = 0;
  for (const rab of allRab) {
    for (const it of extractItems(rab)) {
      totalItems++;
      const key = (it.nama || "").toLowerCase().trim();
      seenInRab.add(key);
    }
  }
  const newItems = [...seenInRab].filter((n) => !existingNames.has(n)).length;
  return {
    rabCount: allRab.length,
    totalItems,
    uniqueItems: seenInRab.size,
    newItems,
    existingMaster: masterSnap.size,
  };
}
