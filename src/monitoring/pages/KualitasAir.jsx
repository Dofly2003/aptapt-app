import { Fragment, useEffect, useMemo, useState } from "react";
import { ref, get } from "firebase/database";
import { rtdb } from "../lib/firebase";
import { subscribe, todayStr, logToRows } from "../lib/rtdb";
import DevicePicker from "../components/DevicePicker";
import TimeChart from "../components/TimeChart";

const ROOT = "monitoring/telemetri";
const TABLE_DAYS = 10;
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const COLORS = ["#38bdf8", "#22c55e", "#f59e0b", "#a855f7", "#ef4444", "#14b8a6", "#eab308", "#6366f1", "#ec4899", "#94a3b8"];
const FRESH_MS = 15 * 60 * 1000; // dianggap "online" jika update < 15 menit lalu

/* Label, satuan, deskripsi, dan urutan tampil parameter yang dikenal. */
const META = {
  wlevel: { label: "Tinggi Muka Air", unit: "cm", dp: 1, desc: "Ketinggian permukaan air terukur sensor" },
  water_level: { label: "Tinggi Muka Air", unit: "cm", dp: 1, desc: "Ketinggian permukaan air terukur sensor" },
  level: { label: "Tinggi Muka Air", unit: "cm", dp: 1, desc: "Ketinggian permukaan air terukur sensor" },
  level_cm: { label: "Tinggi Muka Air", unit: "cm", dp: 1, desc: "Ketinggian permukaan air terukur sensor" },
  tma: { label: "Tinggi Muka Air", unit: "cm", dp: 1, desc: "Ketinggian permukaan air terukur sensor" },
  elevation: { label: "Elevasi Muka Air", unit: "m", dp: 2, desc: "Ketinggian muka air terhadap titik acuan" },
  debit: { label: "Debit", unit: "m³/s", dp: 2, desc: "Laju aliran air" },
  ph: { label: "pH", unit: "", dp: 2, desc: "Tingkat keasaman air (7 = netral, <7 asam, >7 basa)" },
  do: { label: "Oksigen Terlarut", unit: "mg/L", dp: 2, desc: "Kadar oksigen dalam air — makin tinggi makin sehat untuk biota" },
  turbidity: { label: "Kekeruhan", unit: "NTU", dp: 2, desc: "Tingkat kekeruhan air; makin rendah makin jernih" },
  conductivity: { label: "Konduktivitas", unit: "µS/cm", dp: 3, desc: "Daya hantar listrik air — indikasi kadar mineral/garam terlarut" },
  logTemp: { label: "Suhu", unit: "°C", dp: 1, desc: "Suhu terukur alat" },
  logHumid: { label: "Kelembapan Panel", unit: "%", dp: 0, desc: "Kelembapan di dalam boks alat (diagnostik)" },
  vcc: { label: "Tegangan Alat", unit: "V", dp: 1, desc: "Tegangan catu daya alat (diagnostik)" },
};
const ORDER = ["wlevel", "water_level", "level", "level_cm", "tma", "elevation", "debit", "ph", "do", "turbidity", "conductivity", "logTemp", "logHumid", "vcc"];
const rank = (k) => { const i = ORDER.indexOf(k); return i < 0 ? 90 : i; };
const metaFor = (key, i) => ({
  key,
  label: META[key]?.label || key,
  unit: META[key]?.unit ?? "",
  dp: META[key]?.dp ?? 2,
  desc: META[key]?.desc || "",
  color: COLORS[i % COLORS.length],
});

function shiftDate(str, n) {
  const [y, m, d] = str.split("-").map(Number);
  return todayStr(new Date(y, m - 1, d + n));
}
function numericKeys(obj) {
  if (!obj) return [];
  return Object.keys(obj)
    .filter((k) => k !== "ts" && typeof obj[k] === "number" && Number.isFinite(obj[k]))
    .sort((a, b) => rank(a) - rank(b));
}
/* nama stasiun ramah dari topik MQTT: data/wqms/brantas/bt01 -> "WQMS · Brantas · BT01" */
function friendlyName(node, id) {
  const parts = String(node?.live?.topic || "").split("/").filter(Boolean);
  if (parts.length > 1) return parts.slice(1).map((s) => s.toUpperCase()).join(" · ");
  return node?.live?.group || id.slice(0, 10);
}
function agoText(ts) {
  if (!ts) return "—";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s} dtk lalu`;
  if (s < 3600) return `${Math.floor(s / 60)} mnt lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
  return `${Math.floor(s / 86400)} hari lalu`;
}

export default function Stasiun() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deviceId, setDeviceId] = useState("");
  const [date, setDate] = useState(todayStr());
  const [param, setParam] = useState("");
  const [live, setLive] = useState(null);
  const [rows, setRows] = useState([]);
  const [grid, setGrid] = useState({});
  const [showTable, setShowTable] = useState(false);

  const device = devices.find((d) => d.id === deviceId) || devices[0];

  useEffect(() => {
    return subscribe(ROOT, (val) => {
      const list = Object.entries(val || {})
        .filter(([, node]) => numericKeys(node?.live).length > 0)
        .map(([id, node]) => ({
          id,
          group: node.live.group || "",
          online: Date.now() - (node.live.ts || 0) < FRESH_MS,
          name: friendlyName(node, id),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setDevices(list);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!deviceId && devices.length) setDeviceId(devices[0].id);
  }, [devices, deviceId]);

  const basePath = device ? `${ROOT}/${device.id}` : null;

  useEffect(() => {
    if (!basePath) return;
    return subscribe(`${basePath}/live`, setLive);
  }, [basePath]);

  const paramKeys = useMemo(() => numericKeys(live), [live]);
  useEffect(() => {
    if (paramKeys.length && !paramKeys.includes(param)) setParam(paramKeys[0]);
  }, [paramKeys, param]);

  const P = metaFor(param || paramKeys[0] || "", Math.max(0, paramKeys.indexOf(param)));
  const fmt = (v) => (v == null || Number.isNaN(v) ? "–" : Number(v).toFixed(P.dp));

  useEffect(() => {
    if (!basePath) return;
    return subscribe(`${basePath}/log/${date}`, (val) => {
      setRows(logToRows(val, (e, time) => ({ time: time.slice(0, 5), ...e })));
    });
  }, [basePath, date]);

  useEffect(() => {
    if (!basePath) return;
    let cancelled = false;
    const days = Array.from({ length: TABLE_DAYS }, (_, i) => shiftDate(date, -(TABLE_DAYS - 1 - i)));
    Promise.all(
      days.map((d) =>
        get(ref(rtdb, `${basePath}/log/${d}`))
          .then((s) => [d, s.exists() ? s.val() : null])
          .catch(() => [d, null])
      )
    ).then((pairs) => {
      if (cancelled) return;
      const g = {};
      for (const [d, node] of pairs) g[d] = logToRows(node, (e, time) => ({ time: time.slice(0, 5), ...e }));
      setGrid(g);
    });
    return () => { cancelled = true; };
  }, [basePath, date]);

  const dayVals = useMemo(
    () => rows.map((r) => r[param]).filter((v) => v != null && !Number.isNaN(v)),
    [rows, param]
  );
  const high = dayVals.length ? Math.max(...dayVals) : null;
  const low = dayVals.length ? Math.min(...dayVals) : null;

  const periodAvg = useMemo(() => {
    const all = [];
    for (const d of Object.keys(grid))
      for (const r of grid[d]) if (r[param] != null && !Number.isNaN(r[param])) all.push(r[param]);
    return all.length ? all.reduce((a, b) => a + b, 0) / all.length : null;
  }, [grid, param]);

  const gridHasData = useMemo(
    () => Object.values(grid).some((arr) => arr.some((r) => r[param] != null)),
    [grid, param]
  );

  const current = live?.[param] ?? null;
  const days = Array.from({ length: TABLE_DAYS }, (_, i) => shiftDate(date, -(TABLE_DAYS - 1 - i)));
  const online = live && Date.now() - (live.ts || 0) < FRESH_MS;

  const cell = (d, hh) => {
    const list = (grid[d] || []).filter((r) => r.time.startsWith(hh));
    if (!list.length) return { t: "--:--", v: "-" };
    const last = list[list.length - 1];
    return { t: last.time, v: last[param] == null ? "-" : Number(last[param]).toFixed(P.dp) };
  };

  if (loading) return <p className="text-slate-400">Memuat daftar stasiun…</p>;
  if (!device)
    return (
      <div className="text-slate-400 text-sm">
        <p>Belum ada data stasiun.</p>
        <p className="mt-1 text-slate-500">Pastikan layanan pengumpul data (bridge) di server sudah berjalan.</p>
      </div>
    );

  return (
    <>
      {/* ── Pemilih stasiun + tanggal ───────────────────────────── */}
      <DevicePicker devices={devices} deviceId={device.id} onDevice={setDeviceId} date={date} onDate={setDate} />

      {/* ── Identitas stasiun ───────────────────────────────────── */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 mb-4 flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="text-lg font-bold text-white">{device.name}</span>
        {device.group && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-700 text-slate-200">{device.group}</span>
        )}
        <span className={`inline-flex items-center gap-1.5 text-xs ${online ? "text-emerald-400" : "text-slate-500"}`}>
          <span className={`w-2 h-2 rounded-full ${online ? "bg-emerald-400" : "bg-slate-500"}`} />
          {online ? "Online" : "Tidak aktif"}
        </span>
        <span className="text-xs text-slate-400">Pembacaan terakhir: {live?.terminalTime || "—"} ({agoText(live?.ts)})</span>
        <span className="text-xs text-slate-500 ml-auto">{devices.length} stasiun terhubung</span>
      </div>

      {/* ── Navigasi hari ───────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setDate(shiftDate(date, -1))} className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-sm hover:bg-slate-700">◀ Hari sebelumnya</button>
        <button onClick={() => setDate(shiftDate(date, 1))} disabled={date >= todayStr()} className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-sm hover:bg-slate-700 disabled:opacity-40">Hari berikutnya ▶</button>
        <span className="text-sm text-slate-300 ml-1">{date}</span>
      </div>

      {/* ── Pilih parameter ─────────────────────────────────────── */}
      <p className="text-xs text-slate-500 mb-1.5">Pilih parameter yang ingin ditampilkan:</p>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {paramKeys.map((k, i) => {
          const mp = metaFor(k, i);
          return (
            <button
              key={k}
              onClick={() => setParam(k)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition border ${
                param === k ? "bg-yellow-400 text-slate-900 border-yellow-400" : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
              }`}
            >
              {mp.label}
            </button>
          );
        })}
      </div>
      {P.desc && <p className="text-xs text-slate-400 mb-5">{P.label}: {P.desc}</p>}

      {/* ── Kartu nilai + grafik ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5 mb-6">
        <div className="rounded-2xl overflow-hidden border border-slate-700 bg-slate-900">
          <div className="bg-slate-950 text-center text-xs text-slate-400 py-1.5">
            {P.label} sekarang
          </div>
          <div className="bg-black text-center py-7">
            <span className="text-5xl font-bold text-green-400">{fmt(current)}</span>
            <span className="text-lg text-green-500 ml-2">{P.unit}</span>
          </div>
          <div className="grid grid-cols-2 text-center text-sm">
            <div className="bg-blue-600/90 text-white py-2">
              <p className="text-[11px] opacity-80">Tertinggi ({date.slice(5)})</p>
              <p className="font-semibold">{fmt(high)} {P.unit}</p>
            </div>
            <div className="bg-red-600/90 text-white py-2">
              <p className="text-[11px] opacity-80">Terendah ({date.slice(5)})</p>
              <p className="font-semibold">{fmt(low)} {P.unit}</p>
            </div>
          </div>
          <div className="px-4 py-3 text-xs border-t border-slate-800">
            <p className="text-slate-300 flex justify-between">
              <span>Rata-rata {TABLE_DAYS} hari</span>
              <span className="font-semibold">{fmt(periodAvg)} {P.unit}</span>
            </p>
            {live?.vcc != null && param !== "vcc" && (
              <p className="text-slate-500 flex justify-between mt-1">
                <span>Tegangan alat</span>
                <span>{Number(live.vcc).toFixed(1)} V</span>
              </p>
            )}
          </div>
        </div>

        <div>
          {rows.some((r) => r[param] != null) ? (
            <TimeChart
              title={`Grafik ${P.label} — ${date}`}
              data={rows.filter((r) => r[param] != null)}
              series={[{ key: param, name: P.label, color: P.color }]}
            />
          ) : (
            <div className="h-full min-h-[220px] bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 text-sm">
              Belum ada pembacaan untuk tanggal ini
            </div>
          )}
        </div>
      </div>

      {/* ── Tabel per jam (opsional) ────────────────────────────── */}
      <button
        onClick={() => setShowTable((s) => !s)}
        className="text-sm text-slate-300 hover:text-white underline underline-offset-2 mb-3"
      >
        {showTable ? "Sembunyikan" : "Tampilkan"} tabel rekap per jam ({TABLE_DAYS} hari)
      </button>

      {showTable && (
        !gridHasData ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-slate-500 text-sm">
            Belum ada riwayat pada rentang {days[0]} – {days[days.length - 1]}.<br />
            Tabel akan terisi otomatis seiring alat mengirim data.
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
            <table className="text-xs w-full border-collapse">
              <thead>
                <tr className="bg-slate-800 text-slate-300">
                  <th rowSpan={2} className="px-2 py-1 sticky left-0 bg-slate-800 border border-slate-700">JAM</th>
                  {days.map((d) => (
                    <th key={d} colSpan={2} className="px-2 py-1 border border-slate-700 whitespace-nowrap">{d.slice(5)}</th>
                  ))}
                </tr>
                <tr className="bg-slate-800/70 text-slate-400">
                  {days.map((d) => (
                    <Fragment key={`h-${d}`}>
                      <th className="px-2 py-0.5 border border-slate-700 font-medium">JAM</th>
                      <th className="px-2 py-0.5 border border-slate-700 font-medium">{P.label.toUpperCase()}</th>
                    </Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HOURS.map((hh) => (
                  <tr key={hh} className="odd:bg-slate-900 even:bg-slate-950/40">
                    <td className="px-2 py-0.5 text-center font-semibold sticky left-0 bg-inherit border border-slate-800">{hh}</td>
                    {days.map((d) => {
                      const c = cell(d, hh);
                      return (
                        <Fragment key={`${d}-${hh}`}>
                          <td className="px-2 py-0.5 text-center text-slate-400 border border-slate-800">{c.t}</td>
                          <td className="px-2 py-0.5 text-center border border-slate-800">{c.v}</td>
                        </Fragment>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      <p className="text-[11px] text-slate-600 mt-4">
        Parameter terdeteksi otomatis dari data tiap stasiun. Nilai & jam berasal dari alat di lapangan.
      </p>
    </>
  );
}
