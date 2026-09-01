/**
 * Sekali pakai: hapus SELURUH node monitoring/kualitas-air di RTDB.
 * Dipakai untuk membersihkan sampah stasiun non-WQMS dari run bridge lama.
 * Setelah ini, bridge-wqms.js akan mengisi ulang hanya stasiun WQMS yang valid.
 *
 *   node wqms-purge.js
 */
const admin = require("firebase-admin");
const serviceAccount = require("./service-account.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:
    "https://adytia-pt-default-rtdb.asia-southeast1.firebasedatabase.app",
});

Promise.all([
  admin.database().ref("monitoring/kualitas-air").remove(),
  admin.database().ref("monitoring/telemetri").remove(),
])
  .then(() => {
    console.log("OK: monitoring/kualitas-air + monitoring/telemetri dihapus.");
    process.exit(0);
  })
  .catch((e) => {
    console.error("GAGAL:", e.message);
    process.exit(1);
  });
