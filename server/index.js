// server/index.js — API presigned-URL untuk Storage->MinIO
// Jalan di VPS (bukan Firebase), auth tetap verifikasi Firebase ID Token via firebase-admin.
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const { makeClient, isSafePath, presignGet, presignPut, deleteObject } = require("./s3");

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.applicationDefault() });
}

const s3 = makeClient(process.env.MINIO_ACCESS_KEY, process.env.MINIO_SECRET_KEY);

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",").map((s) => s.trim()).filter(Boolean);

const app = express();
// Di belakang Nginx reverse proxy — perlu ini supaya req.ip = IP klien asli
// (dipakai rate-limit per-IP untuk endpoint rekrutmen tanpa login).
app.set("trust proxy", 1);
app.use(express.json());
app.use(cors({
  origin(origin, cb) {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error("CORS ditolak"));
  },
}));

// Tipe file yang diizinkan untuk lamaran kerja (CV/foto/dokumen) — sama
// persis dengan whitelist storage.rules asli (TIDAK termasuk video, meski
// form builder rekrutmen menawarkan opsi tipe "video" — mismatch pre-existing
// dari storage.rules lama, dibiarkan sama supaya tidak berubah perilaku).
const REKRUTMEN_CONTENT_TYPES =
  /^(image\/(jpeg|png|webp)|application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/;
const REKRUTMEN_MAX_SIZE = 50 * 1024 * 1024;

// ─── Prefix -> aturan tulis (role + tipe file yang diizinkan) ────────────────
// Baca selalu "user aktif" untuk semua prefix di sini kecuali readRole diisi
// (mis. rekrutmen/ hanya admin yang boleh baca, setara isAdmin() di storage.rules).
const PREFIX_RULES = {
  "inventori/": { writeRole: "admin", contentTypes: /^image\/(jpeg|png|webp)$/ },
  "pekerjaan/": { writeRole: "admin", contentTypes: /^image\/(jpeg|png|webp)$/ },
  "nidi_data/": { writeRole: "admin", contentTypes: /^(image\/(jpeg|png|webp)|application\/pdf)$/ },
  "alatKerja/": { writeRole: "admin", contentTypes: /^image\/(jpeg|png|webp)$/ },
  // instansi/ publik-baca (bucket policy MinIO, bukan lewat endpoint ini) —
  // hanya jalur tulis yang lewat sini, role "editor" (admin/superadmin/editor).
  "instansi/":  { writeRole: "editor", contentTypes: /^image\/(jpeg|png|webp)$/, publicRead: true },
  // pengujian/{uid}/{docId}/... — publik-baca, tulis hanya pemilik (uid di
  // path) atau admin (setara isOwner(userId) || isAdmin() di storage.rules).
  "pengujian/": { writeRole: "owner", contentTypes: /^image\/(jpeg|png|webp)$/, publicRead: true },
  "lembaga_lit/": { writeRole: "admin", contentTypes: /^image\/(jpeg|png|webp)$/, publicRead: true },
  "downloads/": {
    writeRole: "admin",
    contentTypes: /^(application\/vnd\.android\.package-archive|application\/zip|application\/pdf)$/,
    publicRead: true,
  },
  // rekrutmen/ — pelamar upload TANPA login lewat endpoint terpisah
  // (/storage/rekrutmen-upload-url, di bawah), bukan lewat /storage/upload-url
  // di atas. Entry ini hanya dipakai untuk baca (admin-only) & jaga-jaga delete.
  "rekrutmen/": { writeRole: "admin", contentTypes: REKRUTMEN_CONTENT_TYPES, readRole: "admin" },
};

function getRule(path) {
  if (!isSafePath(path)) return null;
  const prefix = Object.keys(PREFIX_RULES).find((p) => path.startsWith(p));
  return prefix ? PREFIX_RULES[prefix] : null;
}

// ─── Auth & role helpers ──────────────────────────────────────────────────
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Harus login" });
  try {
    req.uid = (await admin.auth().verifyIdToken(token)).uid;
    next();
  } catch {
    res.status(401).json({ error: "Token tidak valid" });
  }
}

async function getUserRole(uid) {
  try {
    const snap = await admin.firestore().doc(`users/${uid}`).get();
    if (!snap.exists) return null;
    const d = snap.data();
    if (d.disabled === true) return null;
    return d.role || null;
  } catch { return null; }
}

async function isActiveUser(uid) {
  return (await getUserRole(uid)) !== null;
}

function isAdminRole(role) {
  return role === "admin" || role === "superadmin";
}

// requiredRole: "admin" | "editor" | "owner". Untuk "owner", path harus
// berbentuk "prefix/{uid}/..." — segmen ke-1 (index 1) dibandingkan ke uid,
// setara isOwner(userId) || isAdmin() di storage.rules lama.
async function canWrite(uid, path, requiredRole) {
  const role = await getUserRole(uid);
  if (!role) return false;
  if (requiredRole === "admin") return isAdminRole(role);
  if (requiredRole === "editor") return isAdminRole(role) || role === "editor";
  if (requiredRole === "owner") {
    if (path.split("/")[1] === uid) return true;
    return isAdminRole(role);
  }
  return false;
}

function requireActiveUser(req, res, next) {
  isActiveUser(req.uid).then((ok) => (ok ? next() : res.status(403).json({ error: "Akses ditolak" })));
}

// ─── Rate limiter (per UID, per action, per jam) ─────────────────────────────
async function checkRateLimit(uid, action, maxPerHour) {
  const ref = admin.firestore().doc(`rate_limits/${uid}_${action}`);
  const snap = await ref.get();
  const now = Date.now();
  const data = snap.exists ? snap.data() : { count: 0, windowStart: now };
  if (!snap.exists || now - data.windowStart > 3600000) {
    await ref.set({ count: 1, windowStart: now });
    return true;
  }
  if (data.count >= maxPerHour) return false;
  await ref.update({ count: admin.firestore.FieldValue.increment(1) });
  return true;
}

// ─── Routes ───────────────────────────────────────────────────────────────
app.post("/storage/upload-url", requireAuth, async (req, res) => {
  if (!(await checkRateLimit(req.uid, "s3_upload", 100))) {
    return res.status(429).json({ error: "Terlalu banyak permintaan, coba lagi nanti" });
  }
  const { path, contentType } = req.body || {};
  const rule = getRule(path);
  if (!rule) return res.status(400).json({ error: "Path tidak valid" });
  if (!(await canWrite(req.uid, path, rule.writeRole))) {
    return res.status(403).json({ error: "Akses ditolak" });
  }
  if (!rule.contentTypes.test(contentType || "")) {
    return res.status(400).json({ error: "Tipe file tidak valid" });
  }
  const url = await presignPut(s3, path, contentType, 120);
  res.json({ url });
});

app.post("/storage/list-urls", requireAuth, requireActiveUser, async (req, res) => {
  if (!(await checkRateLimit(req.uid, "s3_list", 120))) {
    return res.status(429).json({ error: "Terlalu banyak permintaan, coba lagi nanti" });
  }
  const paths = Array.isArray(req.body?.paths) ? req.body.paths : [];
  if (paths.length === 0) return res.json({ urls: {} });
  if (paths.length > 200) return res.status(400).json({ error: "Maks 200 path" });
  const role = await getUserRole(req.uid);
  const entries = await Promise.all(paths.map(async (p) => {
    const rule = getRule(p);
    if (!rule) return [p, null];
    if (rule.readRole === "admin" && !isAdminRole(role)) return [p, null];
    try { return [p, await presignGet(s3, p, 3600)]; } catch { return [p, null]; }
  }));
  res.json({ urls: Object.fromEntries(entries) });
});

app.post("/storage/file-url", requireAuth, requireActiveUser, async (req, res) => {
  if (!(await checkRateLimit(req.uid, "s3_get", 120))) {
    return res.status(429).json({ error: "Terlalu banyak permintaan, coba lagi nanti" });
  }
  const { path } = req.body || {};
  const rule = getRule(path);
  if (!rule) return res.status(400).json({ error: "Path tidak valid" });
  if (rule.readRole === "admin" && !isAdminRole(await getUserRole(req.uid))) {
    return res.status(403).json({ error: "Akses ditolak" });
  }
  const url = await presignGet(s3, path, 60);
  res.json({ url });
});

// ─── Upload lamaran kerja (rekrutmen/) — TANPA login ─────────────────────────
// Pelamar bukan user terdaftar, jadi tidak ada Firebase ID Token. Proteksi
// gantinya: rate-limit per-IP + validasi path/tipe/ukuran (setara Storage
// Rules `allow create` lama). Baca tetap admin-only lewat endpoint di atas.
app.post("/storage/rekrutmen-upload-url", async (req, res) => {
  const ip = req.ip || "unknown";
  if (!(await checkRateLimit(ip, "rekrutmen_upload", 20))) {
    return res.status(429).json({ error: "Terlalu banyak permintaan, coba lagi nanti" });
  }
  const { path, contentType, size } = req.body || {};
  if (!isSafePath(path) || typeof path !== "string" || !path.startsWith("rekrutmen/")) {
    return res.status(400).json({ error: "Path tidak valid" });
  }
  if (!REKRUTMEN_CONTENT_TYPES.test(contentType || "")) {
    return res.status(400).json({ error: "Tipe file tidak valid" });
  }
  if (typeof size === "number" && size > REKRUTMEN_MAX_SIZE) {
    return res.status(400).json({ error: "Ukuran file melebihi 50MB" });
  }
  const url = await presignPut(s3, path, contentType, 120);
  res.json({ url });
});

app.post("/storage/delete", requireAuth, async (req, res) => {
  if (!(await checkRateLimit(req.uid, "s3_delete", 100))) {
    return res.status(429).json({ error: "Terlalu banyak permintaan, coba lagi nanti" });
  }
  const { path } = req.body || {};
  const rule = getRule(path);
  if (!rule) return res.status(400).json({ error: "Path tidak valid" });
  if (!(await canWrite(req.uid, path, rule.writeRole))) {
    return res.status(403).json({ error: "Akses ditolak" });
  }
  await deleteObject(s3, path);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log(`secure-storage-api listening on :${PORT}`));
