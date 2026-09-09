/**
 * Simulator data PANEL DAYA -> Firebase RTDB (adytia-pt).
 *
 * Dipakai saat alat asli mati: mengisi 3 device dummy dengan data yang
 * "wajar" (bukan random murni) — kurva beban harian mulus + noise terbatas,
 * tegangan ~nominal mengikuti pola diurnal, kWh/kVArh sebagai meter kumulatif
 * yang terus naik. Kalibrasi tegangan & cadence dari export panel1 asli.
 *
 * Menulis ke (BYPASS rules, pakai service-account.json):
 *   monitoring/devices/{id}                       -> metadata (dibuat jika belum ada)
 *   monitoring/panel-daya/{id}/log/{tgl}/{jam}    -> riwayat (di-append) — dibaca dashboard
 *   monitoring/panel-daya/{id}/daily/{tgl}        -> rekap harian { kWh, kVArh, peakKw } — tampilan app
 *   monitoring/panel-daya/{id}/live               -> nilai terakhir (ditimpa)
 *   monitoring/panel-daya/{id}/current|energy     -> mirror nilai terakhir
 *
 * Jalankan di VPS (sama pola dengan bridge-wqms.js):
 *   cd server
 *   node sim-panel-daya.js --backfill=7      # sekali: isi 7 hari ke belakang
 *   pm2 start sim-panel-daya.js --name sim-panel-daya && pm2 save
 *
 * ENV opsional:
 *   SIM_INTERVAL_SEC   detik antar sampel live (default 60)
 *   SIM_BACKFILL_STEP  detik antar sampel saat backfill (default 300)
 */

const admin = require("firebase-admin");
const serviceAccount = require("./service-account.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:
    "https://adytia-pt-default-rtdb.asia-southeast1.firebasedatabase.app",
});
const db = admin.database();

// ─── CONFIG: 3 device dummy ──────────────────────────────────────────
// id acak & tetap (jangan diganti — dipakai sebagai key RTDB).
// kW = perkiraan puncak daya aktif; menentukan besar arus.
// pf = power factor; seed = benih PRNG biar tiap panel beda tapi konsisten.
const DEVICES = [
  { id: "pd_70290cdb11", name: "Panel Surabaya", location: "Surabaya", kW: 55, pf: 0.86, seed: 101 },
  { id: "pd_1a0311c8b3", name: "Panel Gresik",   location: "Gresik",   kW: 82, pf: 0.88, seed: 202 },
  { id: "pd_481ded0303", name: "Panel Malang",   location: "Malang",   kW: 34, pf: 0.84, seed: 303 },
];

const V_LL = 400;                 // tegangan antar-fasa nominal
const V_LN_BASE = 233;            // rata-rata line-to-neutral dari data asli
const INTERVAL_SEC = Number(process.env.SIM_INTERVAL_SEC || 60);
const BACKFILL_STEP = Number(process.env.SIM_BACKFILL_STEP || 300);

// ─── util PRNG deterministik (mulberry32) ────────────────────────────
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// noise seeded oleh (device, menit-epoch) -> restart tetap mulus & reproducible
function rngFor(dev, epochMin) {
  return mulberry32((dev.seed * 2654435761) ^ (epochMin | 0));
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const r2 = (v) => Math.round(v * 100) / 100;

// ─── waktu WIB -> { date:"YYYY-MM-DD", time:"HH:MM:SS", hourFloat, dow } ──
function wib(d = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false, weekday: "short",
    }).formatToParts(d).map((x) => [x.type, x.value])
  );
  const hh = p.hour === "24" ? "00" : p.hour;
  const hourFloat = Number(hh) + Number(p.minute) / 60 + Number(p.second) / 3600;
  const dow = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[p.weekday] ?? 1;
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${hh}:${p.minute}:${p.second}`, hourFloat, dow };
}

// ─── kurva beban harian 0..1 (mulus) ────────────────────────────────
// titik kendali per jam; interpolasi cosine + wobble pelan + noise kecil.
const LOAD_POINTS = [
  0.12, 0.11, 0.10, 0.10, 0.11, 0.16, // 00-05
  0.30, 0.48, 0.60, 0.68, 0.74, 0.77, // 06-11
  0.75, 0.73, 0.74, 0.70, 0.62, 0.60, // 12-17
  0.78, 0.90, 0.92, 0.85, 0.55, 0.28, // 18-23
];
function dailyLoad(hourFloat, dow, rand) {
  const h = ((hourFloat % 24) + 24) % 24;
  const i = Math.floor(h), f = h - i;
  const a = LOAD_POINTS[i], b = LOAD_POINTS[(i + 1) % 24];
  const s = (1 - Math.cos(f * Math.PI)) / 2;          // smoothstep
  let load = a + (b - a) * s;
  load += 0.04 * Math.sin(h * 1.7 + rand() * 6.28);  // wobble pelan
  load += (rand() - 0.5) * 0.05;                      // noise kecil
  if (dow === 0 || dow === 6) load *= 0.78;           // akhir pekan lebih sepi
  return clamp(load, 0.05, 1);
}

// ─── satu sampel (voltage/current/energy) untuk device pada waktu t ──
function sample(dev, t) {
  const epochMin = Math.floor(Date.parse(`${t.date}T${t.time}+07:00`) / 60000);
  const rand = rngFor(dev, epochMin);
  const load = dailyLoad(t.hourFloat, t.dow, rand);

  // tegangan: base + diurnal halus - sedikit sag saat beban tinggi + noise + offset per fasa
  const diurnal =
    2.2 * Math.sin((t.hourFloat - 7) * Math.PI / 12) -   // agak tinggi pagi
    1.6 * Math.max(0, Math.sin((t.hourFloat - 19) * Math.PI / 6)); // turun sore-malam
  const vBase = V_LN_BASE + diurnal - 3.0 * load;
  const off = [0.8, -0.4, -1.1];               // ketidakseimbangan fasa R/S/T
  const voltage = {};
  ["R", "S", "T"].forEach((ph, k) => {
    voltage[ph] = r2(clamp(vBase + off[k] + (rand() - 0.5) * 3.0, 218, 243));
  });

  // arus: dari daya aktif P = kW*load ; I_fasa = P / (sqrt3 * V_LL * pf)
  const P = dev.kW * load;                                    // kW
  const iNom = (P * 1000) / (Math.sqrt(3) * V_LL * dev.pf);   // A per fasa (seimbang)
  const imb = [1.0 + (rand() - 0.5) * 0.10, 1.0 + (rand() - 0.5) * 0.10, 1.0 + (rand() - 0.5) * 0.10];
  const current = {
    R: r2(Math.max(0, iNom * imb[0] + (rand() - 0.5) * 1.2)),
    S: r2(Math.max(0, iNom * imb[1] + (rand() - 0.5) * 1.2)),
    T: r2(Math.max(0, iNom * imb[2] + (rand() - 0.5) * 1.2)),
  };

  // daya sesaat -> untuk integrasi energi (dipakai pemanggil)
  const pInst = ((voltage.R * current.R + voltage.S * current.S + voltage.T * current.T) * dev.pf) / 1000; // kW
  const qInst = pInst * Math.tan(Math.acos(dev.pf)); // kVAr

  return { voltage, current, pInst, qInst };
}

// ─── ambil energi (kWh/kVArh) terakhir dari RTDB utk kontinuitas ─────
async function lastEnergy(dev) {
  const snap = await db
    .ref(`monitoring/panel-daya/${dev.id}/log`)
    .limitToLast(1)
    .get();
  const days = snap.val();
  if (days) {
    const day = Object.values(days)[0];
    const times = Object.keys(day).sort();
    const e = day[times[times.length - 1]]?.energy;
    if (e && e.kWh >= 0) return { kWh: e.kWh, kVArh: e.kVArh || 0 };
  }
  // belum ada histori: mulai dari angka acak-stabil biar meter tidak dari 0
  const rand = mulberry32(dev.seed);
  return { kWh: r2(20000 + rand() * 30000), kVArh: r2(6000 + rand() * 9000) };
}

// ─── pastikan device terdaftar di monitoring/devices ────────────────
async function ensureDevice(dev) {
  const ref = db.ref(`monitoring/devices/${dev.id}`);
  if ((await ref.get()).exists()) return;
  await ref.set({
    name: dev.name,
    type: "panel-daya",
    location: dev.location,
    active: true,
    dataPath: `monitoring/panel-daya/${dev.id}/log`,
    thresholds: { vMin: 200, vMax: 245 },
    simulated: true,
    createdAt: Date.now(),
  });
  console.log(`[device] dibuat: ${dev.id}  "${dev.name}"`);
}

// ─── tulis satu sampel ke RTDB ─────────────────────────────────────
async function writeSample(dev, t, energy, { live }) {
  const s = sample(dev, t);
  const dtH = (live ? INTERVAL_SEC : BACKFILL_STEP) / 3600;
  const dKWh = s.pInst * dtH;
  const dKVArh = s.qInst * dtH;
  energy.kWh = r2(energy.kWh + dKWh);
  energy.kVArh = r2(energy.kVArh + dKVArh);

  // rekap harian (dipakai tampilan app: mingguan/bulanan) — total per hari
  // = penjumlahan delta dalam hari itu. Reset saat tanggal berganti.
  if (!dev._day || dev._day.date !== t.date) {
    dev._day = { date: t.date, kWh: 0, kVArh: 0, peakKw: 0 };
  }
  dev._day.kWh += dKWh;
  dev._day.kVArh += dKVArh;
  dev._day.peakKw = Math.max(dev._day.peakKw, s.pInst);

  const entry = { voltage: s.voltage, current: s.current, energy: { kWh: energy.kWh, kVArh: energy.kVArh } };
  const base = `monitoring/panel-daya/${dev.id}`;
  const upd = {
    [`${base}/log/${t.date}/${t.time}`]: entry,
    [`${base}/daily/${t.date}`]: {
      kWh: r2(dev._day.kWh),
      kVArh: r2(dev._day.kVArh),
      peakKw: r2(dev._day.peakKw),
      updatedAt: Date.now(),
    },
  };
  if (live) {
    upd[`${base}/live`] = { ...entry, ts: Date.now() };
    upd[`${base}/current`] = s.current;
    upd[`${base}/energy`] = entry.energy;
  }
  await db.ref().update(upd);
  return entry;
}

// ─── isi rentang [startTs, nowTs] dgn step BACKFILL_STEP ────────────
async function fillRange(dev, energy, startTs, label) {
  const now = Date.now();
  let count = 0;
  for (let ts = startTs; ts <= now; ts += BACKFILL_STEP * 1000) {
    await writeSample(dev, wib(new Date(ts)), energy, { live: false });
    count++;
  }
  console.log(`[${label}] ${dev.id}  ${count} sampel  kWh=${energy.kWh}`);
}
const backfill = (dev, energy, days) =>
  fillRange(dev, energy, Date.now() - days * 86400000, `backfill ${days}h`);
const catchUpToday = (dev, energy) => {
  const t0 = wib();
  return fillRange(dev, energy, Date.parse(`${t0.date}T00:00:00+07:00`), "hari-ini");
};

// ─── main ──────────────────────────────────────────────────────────
async function main() {
  const arg = process.argv.find((a) => a.startsWith("--backfill="));
  const backfillDays = arg ? Math.max(0, parseInt(arg.split("=")[1], 10) || 0) : 0;

  const state = [];
  for (const dev of DEVICES) {
    await ensureDevice(dev);
    const energy = await lastEnergy(dev);
    state.push({ dev, energy });
    console.log(`[init] ${dev.id}  "${dev.name}"  mulai kWh=${energy.kWh}  kVArh=${energy.kVArh}`);
  }

  for (const { dev, energy } of state) {
    if (backfillDays > 0) await backfill(dev, energy, backfillDays);
    else await catchUpToday(dev, energy); // biar grafik hari ini tidak kosong
  }

  console.log(`[live] tick tiap ${INTERVAL_SEC}s — Ctrl+C untuk stop`);
  const tick = async () => {
    const t = wib();
    for (const { dev, energy } of state) {
      try {
        const e = await writeSample(dev, t, energy, { live: true });
        console.log(`[ok] ${t.time} ${dev.id}  V=${e.voltage.R}/${e.voltage.S}/${e.voltage.T}  I=${e.current.R}/${e.current.S}/${e.current.T}  kWh=${e.energy.kWh}`);
      } catch (err) {
        console.error(`[err] ${dev.id}:`, err.message);
      }
    }
  };
  await tick();
  setInterval(tick, INTERVAL_SEC * 1000);
}

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => { console.log(`\n[${sig}] stop`); process.exit(0); });
}
process.on("unhandledRejection", (e) => console.error("[unhandledRejection]", e));

main().catch((e) => { console.error(e); process.exit(1); });
