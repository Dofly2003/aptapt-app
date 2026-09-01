// src/utils/aggregateRabItems.js
// Ambil semua item dari RAB historis (dokumen_keuangan type=rab) dan aggregate
// jadi list yang bentuknya sama dengan master_harga list — supaya bisa langsung
// dipakai ItemAutocomplete tanpa perubahan.
//
// Sumber kebenaran = RAB itself. Tidak perlu migration/master_harga sync.

import { getAllDokumen } from "../services/rabService";
import { normalizeItemName } from "./normalizeItemName";

const HISTORY_LIMIT = 30;

/**
 * Load semua RAB, aggregate item-nya jadi list unique dengan history harga.
 * @param {Object} opts
 * @param {string} opts.excludeRabId  RAB yang tidak dimasukkan (biasanya RAB yang lagi di-edit)
 * @returns {Promise<Array>}
 */
export async function getRabItemsAggregated({ excludeRabId = null } = {}) {
  const allRab = await getAllDokumen({ type: "rab" });

  // Sort DESC by tanggal — supaya harga pertama yang di-set = harga terbaru
  const sorted = [...allRab]
    .filter((r) => !excludeRabId || r.id !== excludeRabId)
    .sort((a, b) => toDate(b.tanggal || b.createdAt) - toDate(a.tanggal || a.createdAt));

  const map = new Map(); // normalizedName -> aggregated item

  for (const rab of sorted) {
    const items = extractItems(rab);
    const tanggal = toDate(rab.tanggal || rab.createdAt);

    for (const it of items) {
      const nama = (it.nama || "").trim();
      const price = Number(it.hargaSatuan) || 0;
      if (!nama || price <= 0) continue;

      const key = normalizeItemName(nama);
      if (!key) continue;

      const entry = {
        price,
        date: tanggal,
        rabId: rab.id,
        rabNomor: rab.nomor,
      };

      if (map.has(key)) {
        const existing = map.get(key);
        existing.history.push(entry);
        existing.usageCount++;
      } else {
        map.set(key, {
          id: `agg_${key}`,       // synthetic ID (bukan Firestore doc)
          nama,                    // pakai casing dari RAB terbaru (karena sorted DESC)
          normalizedName: key,
          harga: price,            // harga terbaru
          satuan: it.satuan || "pcs",
          history: [entry],
          usageCount: 1,
          lastUsedAt: tanggal,
        });
      }
    }
  }

  // Compute stats + potong history
  const result = [];
  for (const item of map.values()) {
    const prices = item.history.map((h) => h.price);
    item.avgPrice = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length);
    item.minPrice = Math.min(...prices);
    item.maxPrice = Math.max(...prices);
    item.history = item.history.slice(0, HISTORY_LIMIT);
    result.push(item);
  }

  // Sort by usageCount desc (paling sering dipakai di atas)
  result.sort((a, b) => b.usageCount - a.usageCount);

  return result;
}

function extractItems(rab) {
  const raw = rab?.groups?.length
    ? rab.groups.flatMap((g) => g.items || [])
    : rab?.items || [];
  return raw;
}

function toDate(v) {
  if (!v) return new Date(0);
  if (v?.toDate) return v.toDate();
  if (typeof v === "string") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? new Date(0) : d;
  }
  if (v instanceof Date) return v;
  return new Date(0);
}
