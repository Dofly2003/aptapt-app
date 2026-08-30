const { setGlobalOptions } = require("firebase-functions");
const { onSchedule }      = require("firebase-functions/v2/scheduler");
const admin               = require("firebase-admin");

setGlobalOptions({ maxInstances: 10 });

// admin.initializeApp() hanya boleh dipanggil sekali per proses.
// Codebase ini berjalan di container terpisah, jadi panggil di sini.
if (!admin.apps.length) admin.initializeApp();

// ─── Cleanup temp_files yang sudah expired (jalan tiap jam) ─────────────────
exports.cleanupTempFiles = onSchedule("every 1 hours", async () => {
  const db     = admin.firestore();
  const bucket = admin.storage().bucket();
  const now    = admin.firestore.Timestamp.now();

  const snap = await db
    .collection("temp_files")
    .where("expiresAt", "<=", now)
    .get();

  if (snap.empty) {
    console.log("cleanupTempFiles: tidak ada file expired");
    return;
  }

  let deleted = 0;
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    if (data.storagePath && typeof data.storagePath === "string") {
      // Validasi path sebelum delete — cegah path traversal
      const safePath = data.storagePath;
      const isValidPath = !safePath.includes("..") && !safePath.startsWith("/")
        && !safePath.includes("%") && safePath.startsWith("temp_files/");
      if (isValidPath) {
        try { await bucket.file(safePath).delete(); } catch {}
      }
    }
    try { await docSnap.ref.delete(); deleted++; } catch {}
  }
  console.log(`cleanupTempFiles: dihapus ${deleted} file`);
});
