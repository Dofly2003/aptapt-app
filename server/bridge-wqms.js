/**
 * Bridge MQTT -> Firebase RTDB (adytia-pt) untuk stasiun WQMS
 * (Water Quality Monitoring System): pH, DO, konduktivitas, kekeruhan, suhu.
 *
 * Alur:
 *   Stasiun WQMS --publish--> Broker MQTT (36.66.205.254:8083, topik data/#)
 *     --> script ini (jalan terus di VPS, pakai firebase-admin, BYPASS rules)
 *     --> RTDB adytia-pt:
 *           monitoring/kualitas-air/{idStation}/live             -> nilai terakhir (DITIMPA)
 *           monitoring/kualitas-air/{idStation}/log/{tgl}/{jam}  -> riwayat (DI-APPEND)
 *
 * Contoh payload alat (semua string):
 *   { idStation, _groupName:"WQMS", _terminalTime:"2026-09-01 14:24:01",
 *     ph, do, conductivity, turbidity, logTemp, logHumid, vcc }
 *   topic: data/wqms/brantas/bt01
 *
 * Jalankan di VPS:
 *   cd server && npm install mqtt
 *   pm2 start bridge-wqms.js --name bridge-wqms && pm2 save
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
// Broker ini dipakai BANYAK stasiun (AWLR level air, dll). Ambil cabang WQMS saja.
const TOPIC = "data/wqms/#";

// ─── 3. Pemetaan idStation (dari alat) -> deviceId (di monitoring/devices)
// Biarkan kosong -> pakai idStation apa adanya. Isi kalau id di RTDB beda.
const STATION_MAP = {
  // "278e44482bc0cd4255e21ee1a4c4e6e5": "bt01",
};

// Hanya proses idStation yang terdaftar di sini. Kosongkan Set -> terima semua
// stasiun yang lolos filter topik + punya parameter kualitas air.
const STATION_ALLOW = new Set([
  // "278e44482bc0cd4255e21ee1a4c4e6e5",
  // "826fec99fead5991d924d3583fb46f86",
]);

// ─── 4. Petakan payload alat -> bentuk yang dibaca dashboard ─────────
// Field alat berupa string -> dikonversi ke angka.
function mapPayload(d) {
  return {
    ph: num(d.ph),
    do: num(d.do),                 // dissolved oxygen (mg/L)
    conductivity: num(d.conductivity),
    turbidity: num(d.turbidity),   // NTU
    temp: num(d.logTemp),          // suhu (deg C)
    humid: num(d.logHumid),        // kelembapan enclosure (%)
    vcc: num(d.vcc),               // tegangan suplai (V)
  };
}

// ─── util ────────────────────────────────────────────────────────────
const num = (v) => {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// RTDB key tidak boleh mengandung . $ # [ ] /
const sanitizeKey = (s) => String(s).replace(/[.$#[\]/]/g, "_");

// "2026-09-01 14:24:01" -> { date:"2026-09-01", time:"14:24:01" }
// fallback: waktu server zona WIB.
function resolveTime(terminalTime) {
  if (typeof terminalTime === "string" &&
      /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(terminalTime)) {
    return { date: terminalTime.slice(0, 10), time: terminalTime.slice(11, 19) };
  }
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    })
      .formatToParts(new Date())
      .map((x) => [x.type, x.value])
  );
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}:${p.second}` };
}

// Mode rekam MENTAH ke .../raw/{tgl}/{jam} — nyalakan kalau perlu debug payload.
const CAPTURE_RAW = false;

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
    console.error("[SKIP] idStation tidak ada:", raw.slice(0, 120));
    return;
  }

  if (STATION_ALLOW.size && !STATION_ALLOW.has(String(idStation))) {
    return; // stasiun tidak diizinkan — diam saja
  }

  // Hanya payload yang benar-benar dari stasiun kualitas air (broker dipakai
  // bareng AWLR/level air yg kadang kirim ph:"0" sebagai placeholder).
  if (String(d._groupName || "").toUpperCase() !== "WQMS") {
    return; // bukan stasiun WQMS — diam saja
  }

  const deviceId = sanitizeKey(STATION_MAP[idStation] || idStation);
  const ts = Date.now();
  const { date, time } = resolveTime(d._terminalTime);
  const base = `monitoring/kualitas-air/${deviceId}`;
  const m = mapPayload(d);

  // Backstop: minimal satu parameter kualitas air terisi.
  if ([m.ph, m.do, m.conductivity, m.turbidity].every((v) => v == null)) {
    console.log(`[SKIP] ${idStation}: tanpa parameter kualitas air`);
    return;
  }

  try {
    if (CAPTURE_RAW) {
      await db.ref(`${base}/raw/${date}/${time}`).set({ ...d, _ts: ts, _topic: topic });
    }

    // a) nilai realtime terakhir -> DITIMPA
    await db.ref(`${base}/live`).set({
      ...m,
      ts,
      terminalTime: d._terminalTime || null,
      group: d._groupName || null,
      topic,
    });

    // b) riwayat -> DI-APPEND (key = jam:menit:detik pembacaan)
    await db.ref(`${base}/log/${date}/${time}`).set({
      ph: m.ph, do: m.do, conductivity: m.conductivity,
      turbidity: m.turbidity, temp: m.temp, vcc: m.vcc,
    });

    console.log(
      `[OK] ${deviceId}  ${date} ${time}  pH=${m.ph} DO=${m.do} EC=${m.conductivity} NTU=${m.turbidity} T=${m.temp}`
    );
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
process.on("unhandledRejection", (e) => console.error("[unhandledRejection]", e));
