/**
 * Bridge MQTT -> Firebase RTDB (adytia-pt) untuk sensor KETINGGIAN / level air.
 *
 * Alur:
 *   Sensor lapangan --publish--> Broker MQTT (36.66.205.254:8083)
 *     --> script ini (jalan terus-menerus di VPS, pakai firebase-admin)
 *     --> RTDB adytia-pt:
 *           monitoring/ketinggian/{deviceId}/live             -> nilai terakhir (DITIMPA)
 *           monitoring/ketinggian/{deviceId}/log/{tgl}/{jam}  -> riwayat (DI-APPEND)
 *
 * firebase-admin BYPASS rules RTDB, jadi tidak perlu melonggarkan database.rules.json.
 *
 * Jalankan di VPS:
 *   cd server && npm install         # pasang paket "mqtt"
 *   pm2 start bridge-ketinggian.js --name bridge-ketinggian
 *   pm2 save
 */

const mqtt = require("mqtt");
const admin = require("firebase-admin");
const serviceAccount = require("./service-account.json");

// ─── 1. Firebase Admin ───────────────────────────────────────────────
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:
    "https://adytia-pt-default-rtdb.asia-southeast1.firebasedatabase.app",
});
const db = admin.database();

// ─── 2. Broker MQTT ──────────────────────────────────────────────────
const BROKER_URL = "ws://36.66.205.254:8083/mqtt";
const OPTIONS = {
  username: "telemetri",
  password: "TelemetriGSM123",
  reconnectPeriod: 1000,
  keepalive: 60,
};
const TOPIC = "data/#";

// ─── 3. Pemetaan idStation (dari alat) -> deviceId (di monitoring/devices)
// Cara paling gampang: saat menambah device di panel admin, isi kolom
// "dataPath" = monitoring/ketinggian/<idStation>  --> biarkan map ini kosong.
// Kalau id RTDB terlanjur beda (mis. push-key), petakan di sini:
const STATION_MAP = {
  // "STATION-01": "-Nabc123pushKey",
};

// ─── 4. Ambil nilai dari payload alat -> bentuk yang dibaca dashboard ─
//  >>> SESUAIKAN nama field di bawah dengan payload ASLI sensor kamu <<<
function mapPayload(d) {
  const level_cm = num(
    d.level_cm ?? d.level ?? d.ketinggian ?? d.tinggi ?? d.distance ?? d.jarak
  );
  const battery = num(d.battery ?? d.batt ?? d.bat ?? d.vbat ?? d.soc);
  return { level_cm, battery };
}

// ─── util ────────────────────────────────────────────────────────────
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// tanggal (YYYY-MM-DD) & jam (HH:MM:SS) zona WIB — konsisten dgn dashboard
function nowWIB() {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false,
    })
      .formatToParts(new Date())
      .map((x) => [x.type, x.value])
  );
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    time: `${p.hour}:${p.minute}:${p.second}`,
  };
}

// RTDB key tidak boleh mengandung . $ # [ ] /
const sanitizeKey = (s) => String(s).replace(/[.$#[\]/]/g, "_");

// jeda minimum antar-tulis LOG per device (ms). 0 = tulis tiap pesan masuk.
const MIN_LOG_INTERVAL_MS = 0;
const lastLogAt = {};

// Mode rekam MENTAH: tulis SELURUH payload apa adanya + timestamp server ke
//   monitoring/ketinggian/{deviceId}/raw/{tgl}/{jam}
// Pakai ini untuk melihat nama field asli dari alat di Firebase, lalu sesuaikan
// mapPayload() dan matikan (set false) kalau sudah tidak perlu.
const CAPTURE_RAW = true;

// ─── 5. MQTT ─────────────────────────────────────────────────────────
const client = mqtt.connect(BROKER_URL, OPTIONS);

client.on("connect", () => {
  console.log("[MQTT] Terhubung ke broker");
  client.subscribe(TOPIC, (err) => {
    if (err) console.error("[MQTT] Gagal subscribe:", err.message);
    else console.log("[MQTT] Subscribe OK:", TOPIC);
  });
});

client.on("offline", () => console.log("[MQTT] Terputus dari broker"));
client.on("reconnect", () => console.log("[MQTT] Menghubungkan ulang..."));
client.on("error", (err) => console.error("[MQTT] Error:", err.message));

client.on("message", async (topic, message) => {
  const raw = message.toString();

  let d;
  try {
    d = JSON.parse(raw);
  } catch {
    console.error("[SKIP] Payload bukan JSON:", raw.slice(0, 120));
    return;
  }

  const idStation = d.idStation ?? d.id ?? d.station;
  if (!idStation) {
    console.error("[SKIP] idStation tidak ada di payload:", raw.slice(0, 120));
    return;
  }

  const deviceId = sanitizeKey(STATION_MAP[idStation] || idStation);
  const ts = Date.now();
  const { date, time } = nowWIB();
  const base = `monitoring/ketinggian/${deviceId}`;

  // rekam payload mentah + timestamp server (untuk inspeksi struktur asli)
  if (CAPTURE_RAW) {
    try {
      await db.ref(`${base}/raw/${date}/${time}`).set({ ...d, _ts: ts, _topic: topic });
    } catch (err) {
      console.error(`[RAW] gagal simpan ${deviceId}:`, err.message);
    }
  }

  const { level_cm, battery } = mapPayload(d);

  if (level_cm == null) {
    console.warn(
      `[RAW-ONLY] ${idStation}: level belum termapping — payload mentah tersimpan di ${base}/raw/${date}/${time}`
    );
    return;
  }

  try {
    // a) nilai realtime terakhir -> DITIMPA
    await db.ref(`${base}/live`).set({
      level_cm,
      ts,
      ...(battery != null ? { battery } : {}),
      topic,
    });

    // b) riwayat -> DI-APPEND (key = jam per detik)
    if (ts - (lastLogAt[deviceId] || 0) >= MIN_LOG_INTERVAL_MS) {
      await db.ref(`${base}/log/${date}/${time}`).set({ level_cm });
      lastLogAt[deviceId] = ts;
    }

    console.log(`[OK] ${deviceId}  ${level_cm} cm  ${date} ${time}`);
  } catch (err) {
    console.error(`[FIREBASE] Gagal tulis ${deviceId}:`, err.message);
  }
});

// ─── shutdown rapi ───────────────────────────────────────────────────
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    console.log(`\n[${sig}] menutup koneksi...`);
    client.end(true, () => process.exit(0));
  });
}
process.on("unhandledRejection", (e) =>
  console.error("[unhandledRejection]", e)
);
