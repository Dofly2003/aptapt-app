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
app.use(express.json());
app.use(cors({
  origin(origin, cb) {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error("CORS ditolak"));
  },
}));

// ─── Prefix -> aturan tulis (role + tipe file yang diizinkan) ────────────────
// Baca selalu "user aktif" untuk semua prefix di sini (prefix publik-baca
// seperti instansi/ butuh desain terpisah, lihat catatan migrasi, belum masuk).
const PREFIX_RULES = {
  "inventori/": { writeRole: "admin", contentTypes: /^image\/(jpeg|png|webp)$/ },
  "pekerjaan/": { writeRole: "admin", contentTypes: /^image\/(jpeg|png|webp)$/ },
  "nidi_data/": { writeRole: "admin", contentTypes: /^(image\/(jpeg|png|webp)|application\/pdf)$/ },
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

async function hasWriteRole(uid, requiredRole) {
  const role = await getUserRole(uid);
  if (!role) return false;
  if (requiredRole === "admin") return role === "admin" || role === "superadmin";
  if (requiredRole === "editor") return ["admin", "superadmin", "editor"].includes(role);
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
  if (!(await hasWriteRole(req.uid, rule.writeRole))) {
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
  const entries = await Promise.all(paths.map(async (p) => {
    if (!getRule(p)) return [p, null];
    try { return [p, await presignGet(s3, p, 3600)]; } catch { return [p, null]; }
  }));
  res.json({ urls: Object.fromEntries(entries) });
});

app.post("/storage/file-url", requireAuth, requireActiveUser, async (req, res) => {
  if (!(await checkRateLimit(req.uid, "s3_get", 120))) {
    return res.status(429).json({ error: "Terlalu banyak permintaan, coba lagi nanti" });
  }
  const { path } = req.body || {};
  if (!getRule(path)) return res.status(400).json({ error: "Path tidak valid" });
  const url = await presignGet(s3, path, 60);
  res.json({ url });
});

app.post("/storage/delete", requireAuth, async (req, res) => {
  if (!(await checkRateLimit(req.uid, "s3_delete", 100))) {
    return res.status(429).json({ error: "Terlalu banyak permintaan, coba lagi nanti" });
  }
  const { path } = req.body || {};
  const rule = getRule(path);
  if (!rule) return res.status(400).json({ error: "Path tidak valid" });
  if (!(await hasWriteRole(req.uid, rule.writeRole))) {
    return res.status(403).json({ error: "Akses ditolak" });
  }
  await deleteObject(s3, path);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log(`secure-storage-api listening on :${PORT}`));
