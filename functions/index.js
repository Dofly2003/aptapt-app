const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const crypto = require("crypto");
admin.initializeApp();

// Key disimpan di Firebase Secret Manager — TIDAK pernah masuk kode/git
// Setup sekali: firebase functions:secrets:set ENCRYPT_KEY
const ENCRYPT_KEY_SECRET    = defineSecret("ENCRYPT_KEY");
const CLOUDCONVERT_API_KEY  = defineSecret("CLOUDCONVERT_API_KEY");

// ─── Path validation helpers ──────────────────────────────────────────────────

const ALLOWED_PATH_RULES = [
  { prefix: "pengujian/",  ownerSegment: 1 },
  { prefix: "instansi/",   ownerSegment: null },
  { prefix: "dpp/",        ownerSegment: null },
  { prefix: "users/",      ownerSegment: 1 },
  { prefix: "nidi_data/",  ownerSegment: null },
];

function validatePath(filePath, uid) {
  if (!filePath || typeof filePath !== "string") return false;
  // Decode terlebih dahulu untuk menangkap semua encoding variant
  let decoded;
  try { decoded = decodeURIComponent(filePath); } catch { return false; }
  if (decoded.includes("..") || decoded.includes("\x00") || decoded.startsWith("/")) return false;
  // Tolak jika masih ada URL encoding setelah decode (double encoding)
  if (filePath.includes("%")) return false;
  const rule = ALLOWED_PATH_RULES.find(r => filePath.startsWith(r.prefix));
  if (!rule) return false;
  if (rule.ownerSegment !== null) {
    const segments = filePath.split("/");
    if (segments[rule.ownerSegment] !== uid) return false;
  }
  return true;
}

// ─── Rate limiter (per UID, per action, per jam) ─────────────────────────────
async function checkRateLimit(uid, action, maxPerHour = 20) {
  const ref = admin.firestore().doc(`rate_limits/${uid}_${action}`);
  const snap = await ref.get();
  const now = Date.now();
  const data = snap.exists ? snap.data() : { count: 0, windowStart: now };
  if (now - data.windowStart > 3600000) {
    await ref.set({ count: 1, windowStart: now });
    return;
  }
  if (data.count >= maxPerHour) {
    throw new HttpsError("resource-exhausted", "Terlalu banyak permintaan, coba lagi nanti");
  }
  await ref.update({ count: admin.firestore.FieldValue.increment(1) });
}

async function isAdmin(uid) {
  try {
    const snap = await admin.firestore().doc(`users/${uid}`).get();
    if (!snap.exists) return false;
    const d = snap.data();
    return (d.role === "admin" || d.role === "superadmin") && d.disabled !== true;
  } catch {
    return false;
  }
}

// ─── Secure Download URL ──────────────────────────────────────────────────────

exports.getSecureDownloadUrl = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Harus login");
  }

  const uid = request.auth.uid;
  await checkRateLimit(uid, "download", 60);
  const filePath = request.data.path;

  const pathOk = validatePath(filePath, uid);
  if (!pathOk) {
    const adminUser = await isAdmin(uid);
    if (!adminUser) throw new HttpsError("permission-denied", "Akses ditolak");
    // Admin fallback: apply same decode + encoding check as validatePath
    if (!filePath || typeof filePath !== "string") {
      throw new HttpsError("invalid-argument", "Path tidak valid");
    }
    let decodedPath;
    try { decodedPath = decodeURIComponent(filePath); } catch {
      throw new HttpsError("invalid-argument", "Path encoding tidak valid");
    }
    if (decodedPath.includes("..") || decodedPath.includes("\x00") ||
        decodedPath.startsWith("/") || filePath.includes("%")) {
      throw new HttpsError("invalid-argument", "Path tidak valid");
    }
  }

  try {
    const bucket = admin.storage().bucket();
    const file = bucket.file(filePath);
    const [exists] = await file.exists();
    if (!exists) throw new HttpsError("not-found", "File tidak ditemukan");

    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 30 * 1000,
    });
    return { url };
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    throw new HttpsError("internal", "Terjadi kesalahan server");
  }
});

// ─── Enkripsi/Dekripsi (key dari Secret Manager, TIDAK dari .env) ─────────────

exports.encryptData = onCall(
  { secrets: [ENCRYPT_KEY_SECRET] },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Harus login");

    const adminUser = await isAdmin(request.auth.uid);
    if (!adminUser) throw new HttpsError("permission-denied", "Akses ditolak");
    await checkRateLimit(request.auth.uid, "encrypt", 30);

    const { plaintext } = request.data;
    if (!plaintext || typeof plaintext !== "string") {
      throw new HttpsError("invalid-argument", "plaintext wajib diisi");
    }

    const keyHex = ENCRYPT_KEY_SECRET.value().trim();
    if (keyHex.length !== 64) throw new HttpsError("internal", "Konfigurasi enkripsi tidak valid");
    const key = Buffer.from(keyHex, "hex");
    if (key.length !== 32) throw new HttpsError("internal", "Kunci enkripsi tidak valid");
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    const combined = Buffer.concat([iv, tag, encrypted]);
    return { ciphertext: combined.toString("base64") };
  }
);

exports.decryptData = onCall(
  { secrets: [ENCRYPT_KEY_SECRET] },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Harus login");

    const adminUser = await isAdmin(request.auth.uid);
    if (!adminUser) throw new HttpsError("permission-denied", "Akses ditolak");
    await checkRateLimit(request.auth.uid, "decrypt", 30);

    const { ciphertext } = request.data;
    if (!ciphertext || typeof ciphertext !== "string") {
      throw new HttpsError("invalid-argument", "ciphertext wajib diisi");
    }

    try {
      const keyHex = ENCRYPT_KEY_SECRET.value().trim();
      if (keyHex.length !== 64) throw new HttpsError("internal", "Konfigurasi enkripsi tidak valid");
      const key = Buffer.from(keyHex, "hex");
      if (key.length !== 32) throw new HttpsError("internal", "Kunci enkripsi tidak valid");
      const buf = Buffer.from(ciphertext, "base64");
      const iv = buf.slice(0, 12);
      const tag = buf.slice(12, 28);
      const data = buf.slice(28);
      const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(tag);
      const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
      return { plaintext: decrypted.toString("utf8") };
    } catch {
      throw new HttpsError("internal", "Dekripsi gagal");
    }
  }
);

// ─── PDF to Word (iLovePDF API) ───────────────────────────────────────────────
// Setup: firebase functions:secrets:set CLOUDCONVERT_API_KEY
// Daftar gratis di cloudconvert.com (25 konversi/hari)
exports.convertPdfToWord = onCall(
  { secrets: [CLOUDCONVERT_API_KEY], timeoutSeconds: 300, memory: "1GiB" },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Harus login");

    const uid = request.auth.uid;
    await checkRateLimit(uid, "pdf_convert", 10);
    const { storagePath } = request.data;

    if (!storagePath || typeof storagePath !== "string") {
      throw new HttpsError("invalid-argument", "storagePath tidak valid");
    }
    if (!storagePath.startsWith(`pdf_temp/${uid}/`)) {
      throw new HttpsError("permission-denied", "Akses ditolak");
    }

    const bucket = admin.storage().bucket();
    const srcFile = bucket.file(storagePath);
    const [exists] = await srcFile.exists();
    if (!exists) throw new HttpsError("not-found", "File tidak ditemukan di storage");

    const [metadata] = await srcFile.getMetadata();
    const fileSizeBytes = parseInt(metadata.size, 10);
    const MAX_PDF_SIZE = 50 * 1024 * 1024; // 50 MB
    if (fileSizeBytes > MAX_PDF_SIZE) {
      throw new HttpsError("invalid-argument", "Ukuran file melebihi batas maksimum (50MB)");
    }
    if (metadata.contentType !== "application/pdf") {
      throw new HttpsError("invalid-argument", "File harus berformat PDF");
    }

    const [pdfBuffer] = await srcFile.download();
    const rawFilename = storagePath.split("/").pop();
    // Sanitasi filename: hanya alfanumerik, spasi, dash, underscore, titik
    const filename = rawFilename.replace(/^\d+_/, "").replace(/[^a-zA-Z0-9 ._-]/g, "_");
    const baseName = filename.replace(/\.pdf$/i, "");

    const apiKey = CLOUDCONVERT_API_KEY.value();
    const CC = "https://api.cloudconvert.com/v2";

    // 1. Buat job CloudConvert: upload → convert → export
    const jobRes = await fetch(`${CC}/jobs`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        tasks: {
          "upload-pdf":      { operation: "import/upload" },
          "convert-to-docx": { operation: "convert", input: "upload-pdf", output_format: "docx" },
          "export-docx":     { operation: "export/url", input: "convert-to-docx" },
        },
      }),
    });
    if (!jobRes.ok) {
      const body = await jobRes.text();
      console.error("[convertPdfToWord] CloudConvert job error:", jobRes.status, body);
      throw new HttpsError("internal", "Konversi gagal, coba lagi nanti");
    }
    const job = (await jobRes.json()).data;
    const jobId = job.id;
    const importTask = job.tasks.find(t => t.name === "upload-pdf");
    if (!importTask?.result?.form) {
      throw new HttpsError("internal", "CloudConvert tidak mengembalikan form upload");
    }

    // 2. Upload PDF ke CloudConvert (S3 presigned form)
    const { url: uploadUrl, parameters: uploadParams } = importTask.result.form;
    const uploadForm = new FormData();
    for (const [k, v] of Object.entries(uploadParams)) uploadForm.append(k, v);
    // file harus menjadi field TERAKHIR untuk S3
    uploadForm.append("file", new Blob([pdfBuffer], { type: "application/pdf" }), filename);

    const upRes = await fetch(uploadUrl, { method: "POST", body: uploadForm });
    if (!upRes.ok && upRes.status !== 204) {
      const body = await upRes.text();
      console.error("[convertPdfToWord] upload error:", upRes.status, body);
      throw new HttpsError("internal", "Upload file gagal, coba lagi nanti");
    }

    // 3. Polling sampai job selesai (maks 4 menit)
    let finalJob = null;
    for (let i = 0; i < 80; i++) {
      await new Promise(r => setTimeout(r, 3000));
      const statusRes = await fetch(`${CC}/jobs/${jobId}?include=tasks`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const statusData = (await statusRes.json()).data;
      if (statusData.status === "finished") { finalJob = statusData; break; }
      if (statusData.status === "error") {
        const errTask = statusData.tasks.find(t => t.status === "error");
        console.error("[convertPdfToWord] task error:", errTask?.message);
        throw new HttpsError("internal", "Konversi gagal, coba lagi nanti");
      }
    }
    if (!finalJob) throw new HttpsError("deadline-exceeded", "Konversi timeout, coba lagi");

    // 4. Ambil URL download dari export task
    const exportTask = finalJob.tasks.find(t => t.name === "export-docx");
    const downloadUrl = exportTask?.result?.files?.[0]?.url;
    if (!downloadUrl) throw new HttpsError("internal", "URL download tidak tersedia");

    // 5. Download DOCX
    const dlRes = await fetch(downloadUrl);
    if (!dlRes.ok) throw new HttpsError("internal", "Download hasil konversi gagal");
    const docxBuffer = Buffer.from(await dlRes.arrayBuffer());

    // Simpan ke Firebase Storage
    const ts = Date.now();
    const resultPath = `pdf_converted/${uid}/${ts}_${baseName}.docx`;
    const resultFile = bucket.file(resultPath);
    await resultFile.save(docxBuffer, {
      metadata: {
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        contentDisposition: `attachment; filename="${baseName}.docx"`,
      },
    });

    await srcFile.delete().catch(() => {});

    const [signedUrl] = await resultFile.getSignedUrl({
      action: "read",
      expires: Date.now() + 10 * 60 * 1000, // 10 menit — cukup untuk download
    });

    return { url: signedUrl, filename: `${baseName}.docx` };
  }
);
