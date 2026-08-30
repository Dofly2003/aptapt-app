import { auth } from "./config";

// API presigned-URL jalan di VPS sendiri (server/), bukan Cloud Functions —
// project ini masih di Firebase Spark plan, Cloud Functions v2 + panggilan
// keluar ke MinIO butuh Blaze. Auth tetap verifikasi Firebase ID Token.
const API_BASE = import.meta.env.VITE_SECURE_STORAGE_API_URL || "https://api.pt-adytia.com";

// Base URL objek publik (bucket policy MinIO public-read per-prefix, mis. instansi/).
// Beda dari API_BASE di atas — ini langsung ke storage, bukan lewat server/.
const PUBLIC_STORAGE_BASE = import.meta.env.VITE_STORAGE_PUBLIC_BASE_URL
  || "https://storage.pt-adytia.com/adytia-app";

// Untuk prefix yang public-read di bucket (instansi/) — URL permanen, tidak expire,
// tidak butuh token. JANGAN dipakai untuk prefix privat (inventori/, pekerjaan/, dst).
export function publicUrl(path) {
  return `${PUBLIC_STORAGE_BASE}/${path}`;
}

async function authedFetch(path, body) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Belum login");
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request gagal (${res.status})`);
  return data;
}

export async function uploadViaPresign(path, blob, contentType) {
  const data = await authedFetch("/storage/upload-url", { path, contentType });
  const res = await fetch(data.url, {
    method: "PUT", body: blob, headers: { "Content-Type": contentType },
  });
  if (!res.ok) throw new Error(`Upload MinIO gagal (${res.status})`);
  return path;
}

// cache in-memory: path -> { url, exp }
const _cache = new Map();
const SKEW_MS = 5 * 60 * 1000;

export async function presignGetMany(paths) {
  const now = Date.now();
  const clean = [...new Set(paths.filter(Boolean))];
  const need = clean.filter((p) => {
    const c = _cache.get(p);
    return !c || c.exp - SKEW_MS < now;
  });
  if (need.length) {
    const data = await authedFetch("/storage/list-urls", { paths: need });
    for (const [p, url] of Object.entries(data.urls || {})) {
      if (url) _cache.set(p, { url, exp: now + 3600 * 1000 });
    }
  }
  const out = {};
  for (const p of clean) if (_cache.has(p)) out[p] = _cache.get(p).url;
  return out;
}

export async function presignGetOne(path) {
  const data = await authedFetch("/storage/file-url", { path });
  return data.url;
}

export async function deleteRemote(path) {
  if (path) await authedFetch("/storage/delete", { path });
}
