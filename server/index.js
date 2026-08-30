// server/index.js — API presigned-URL untuk pilot Storage->MinIO (prefix inventori/)
// Jalan di VPS (bukan Firebase), auth tetap verifikasi Firebase ID Token via firebase-admin.
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const { makeClient, isPilotPath, presignGet, presignPut, deleteObject } = require("./s3");

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

// ─── Auth & role helpers (setara isActiveUser/isAdmin di storage.rules) ──────
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

async function isAdmin(uid) {
  try {
    const snap = await admin.firestore().doc(`users/${uid}`).get();
    if (!snap.exists) return false;
    const d = snap.data();
    return (d.role === "admin" || d.role === "superadmin") && d.disabled !== true;
  } catch { return false; }
}

async function isActiveUser(uid) {
  try {
    const snap = await admin.firestore().doc(`users/${uid}`).get();
    return snap.exists && snap.data().disabled !== true;
  } catch { return false; }
}

function requireAdmin(req, res, next) {
  isAdmin(req.uid).then((ok) => (ok ? next() : res.status(403).json({ error: "Akses ditolak" })));
}

function requireActiveUser(req, res, next) {
  isActiveUser(req.uid).then((ok) => (ok ? next() : res.status(403).json({ error: "Akses ditolak" })));
}

// ─── Rate limiter (per UID, per action, per jam) — sama pola dgn functions/index.js ──
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

// ─── Routes — pilot prefix inventori/ ────────────────────────────────────────
app.post("/inventori/upload-url", requireAuth, requireAdmin, async (req, res) => {
  if (!(await checkRateLimit(req.uid, "s3_upload", 100))) {
    return res.status(429).json({ error: "Terlalu banyak permintaan, coba lagi nanti" });
  }
  const { path, contentType } = req.body || {};
  if (!isPilotPath(path)) return res.status(400).json({ error: "Path tidak valid" });
  if (!/^image\/(jpeg|png|webp)$/.test(contentType || "")) {
    return res.status(400).json({ error: "Tipe file tidak valid" });
  }
  const url = await presignPut(s3, path, contentType, 120);
  res.json({ url });
});

app.post("/inventori/list-urls", requireAuth, requireActiveUser, async (req, res) => {
  if (!(await checkRateLimit(req.uid, "s3_list", 120))) {
    return res.status(429).json({ error: "Terlalu banyak permintaan, coba lagi nanti" });
  }
  const paths = Array.isArray(req.body?.paths) ? req.body.paths : [];
  if (paths.length === 0) return res.json({ urls: {} });
  if (paths.length > 200) return res.status(400).json({ error: "Maks 200 path" });
  const entries = await Promise.all(paths.map(async (p) => {
    if (!isPilotPath(p)) return [p, null];
    try { return [p, await presignGet(s3, p, 3600)]; } catch { return [p, null]; }
  }));
  res.json({ urls: Object.fromEntries(entries) });
});

app.post("/inventori/file-url", requireAuth, requireActiveUser, async (req, res) => {
  if (!(await checkRateLimit(req.uid, "s3_get", 120))) {
    return res.status(429).json({ error: "Terlalu banyak permintaan, coba lagi nanti" });
  }
  const { path } = req.body || {};
  if (!isPilotPath(path)) return res.status(400).json({ error: "Path tidak valid" });
  const url = await presignGet(s3, path, 60);
  res.json({ url });
});

app.post("/inventori/delete", requireAuth, requireAdmin, async (req, res) => {
  if (!(await checkRateLimit(req.uid, "s3_delete", 100))) {
    return res.status(429).json({ error: "Terlalu banyak permintaan, coba lagi nanti" });
  }
  const { path } = req.body || {};
  if (!isPilotPath(path)) return res.status(400).json({ error: "Path tidak valid" });
  await deleteObject(s3, path);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log(`secure-storage-api listening on :${PORT}`));
