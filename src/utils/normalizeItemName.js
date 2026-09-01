// src/utils/normalizeItemName.js
// Utility untuk normalize nama barang dan fuzzy matching di master_harga.
// Digunakan supaya "Kabel NYA 2.5mm", "kabel nya 2,5 mm", "KABEL NYA2.5"
// dianggap item yang sama.

/**
 * Normalize nama barang untuk key/matching.
 * - lowercase
 * - koma jadi titik (2,5 → 2.5)
 * - hilangkan tanda baca umum (kecuali titik untuk desimal + × untuk ukuran)
 * - unify tanda perkalian (x, X, *, ×) → x
 * - hilangkan spasi berlebih
 */
export function normalizeItemName(name) {
  if (!name) return "";
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/,(\d)/g, ".$1")            // 2,5 → 2.5
    .replace(/[×*Xx](?=\d)/g, "x")       // 2×4, 2*4, 2X4 → 2x4
    .replace(/[×*X]/g, "x")              // any leftover
    .replace(/[^\w\s.x/-]/g, " ")        // buang tanda baca non-esensial
    .replace(/\s+/g, " ")                // multi-space → single
    .trim();
}

/**
 * Extract tokens dari nama untuk similarity scoring.
 * "kabel nya 2.5mm" → ["kabel", "nya", "2.5mm"]
 */
export function tokenize(normalized) {
  return normalized.split(/\s+/).filter(Boolean);
}

/**
 * Similarity score 0..1 antara 2 nama.
 * Kombinasi: exact match (1.0) > substring (0.9) > token overlap (0..0.85).
 */
export function similarity(a, b) {
  const na = normalizeItemName(a);
  const nb = normalizeItemName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.9;

  const ta = new Set(tokenize(na));
  const tb = new Set(tokenize(nb));
  if (ta.size === 0 || tb.size === 0) return 0;
  let overlap = 0;
  for (const t of ta) if (tb.has(t)) overlap++;
  const denom = Math.max(ta.size, tb.size);
  return (overlap / denom) * 0.85;
}

/**
 * Cari item paling mirip di list. Return null kalau di bawah threshold.
 * @param {string} query
 * @param {Array<{nama:string}>} list
 * @param {number} threshold 0..1, default 0.6
 */
export function findBestMatch(query, list, threshold = 0.6) {
  if (!query || !list?.length) return null;
  let best = null;
  let bestScore = 0;
  for (const item of list) {
    const s = similarity(query, item.nama);
    if (s > bestScore) {
      bestScore = s;
      best = item;
    }
  }
  return bestScore >= threshold ? { item: best, score: bestScore } : null;
}

/**
 * Return top-N item terurut dari similarity tertinggi.
 * Cocok untuk autocomplete suggestion.
 */
export function findTopMatches(query, list, limit = 8, minScore = 0.25) {
  if (!query) {
    // No query — return most-used items sorted by usageCount desc
    return [...(list || [])]
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
      .slice(0, limit);
  }
  const scored = (list || [])
    .map((item) => ({ item, score: similarity(query, item.nama) }))
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return scored.map((r) => r.item);
}
