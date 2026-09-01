import { ref, onValue, off } from "firebase/database";
import { rtdb } from "./firebase";

/**
 * Subscribe ke sebuah path RTDB. Return fungsi unsubscribe.
 * cb dipanggil dengan snapshot.val() (atau null kalau tidak ada).
 */
export function subscribe(path, cb) {
  const r = ref(rtdb, path);
  const handler = onValue(r, (snap) => cb(snap.exists() ? snap.val() : null));
  return () => off(r, "value", handler);
}

/* ===== Helper tanggal lokal (YYYY-MM-DD) ===== */
export function todayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/**
 * Ubah node log { "HH:MM:SS": {...}, ... } jadi array terurut waktu.
 * mapFn: (entry, timeKey) => objek baris chart.
 */
export function logToRows(logNode, mapFn) {
  if (!logNode) return [];
  const rows = Object.entries(logNode)
    .map(([time, e]) => (e ? mapFn(e, time) : null))
    .filter(Boolean);
  rows.sort((a, b) => a.time.localeCompare(b.time));
  return rows;
}
