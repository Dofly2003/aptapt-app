import { Fragment, useEffect, useMemo, useState } from "react";
import { ref, get } from "firebase/database";
import { rtdb } from "../lib/firebase";
import { subscribe, todayStr, logToRows } from "../lib/rtdb";
import DevicePicker from "../components/DevicePicker";
import TimeChart from "../components/TimeChart";

const ROOT = "monitoring/telemetri";
const TABLE_DAYS = 10;
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const COLORS = ["#22c55e", "#38bdf8", "#f59e0b", "#a855f7", "#ef4444", "#14b8a6", "#eab308", "#0ea5e9", "#6366f1", "#ec4899"];

/* Label & satuan untuk field yang dikenal. Field lain tampil apa adanya. */
const META = {
  ph: { label: "pH", unit: "", dp: 2 },
  do: { label: "DO", unit: "mg/L", dp: 2 },
  conductivity: { label: "Konduktivitas", unit: "µS/cm", dp: 3 },
  turbidity: { label: "Kekeruhan", unit: "NTU", dp: 2 },
  logTemp: { label: "Suhu", unit: "°C", dp: 1 },
  logHumid: { label: "Kelembapan", unit: "%", dp: 0 },
  vcc: { label: "Suplai", unit: "V", dp: 1 },
  level: { label: "Ketinggian", unit: "cm", dp: 1 },
  water_level: { label: "Ketinggian", unit: "cm", dp: 1 },
  wlevel: { label: "Ketinggian", unit: "cm", dp: 1 },
  level_cm: { label: "Ketinggian", unit: "cm", dp: 1 },
  elevation: { label: "Elevasi", unit: "m", dp: 2 },
  debit: { label: "Debit", unit: "m³/s", dp: 2 },
};
const metaFor = (key, i) => ({
  key,
  label: META[key]?.label || key,
  unit: META[key]?.unit ?? "",
  dp: META[key]?.dp ?? 2,
  color: COLORS[i % COLORS.length],
});

/* geser tanggal "YYYY-MM-DD" sebanyak n hari */
function shiftDate(str, n) {
  const [y, m, d] = str.split("-").map(Number);
  return todayStr(new Date(y, m - 1, d + n));
}

/* field angka pada sebuah objek /live (buang meta non-numerik) */
function numericKeys(obj) {
  if (!obj) return [];
  return Object.keys(obj).filter(
    (k) => k !== "ts" && typeof obj[k] === "number" && Number.isFinite(obj[k])
  );
}

export default function KualitasAir() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deviceId, setDeviceId] = useState("");
  const [date, setDate] = useState(todayStr());
  const [param, setParam] = useState("");
  const [live, setLive] = useState(null);
  const [rows, setRows] = useState([]);
  const [grid, setGrid] = useState({});

  const device = devices.find((d) => d.id === deviceId) || devices[0];

  // daftar stasiun = seluruh anak node monitoring/telemetri yang sudah punya /live
  useEffect(() => {
    return subscribe(ROOT, (val) => {
      const list = Object.entries(val || {})
        .filter(([, node]) => numericKeys(node?.live).length > 0)
        .map(([id, node]) => {
          const g = node.live.group || "";
          return { id, group: g, name: `${g ? g + " · " : ""}${id.slice(0, 12)}` };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
      setDevices(list);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!deviceId && devices.length) setDeviceId(devices[0].id);
  }, [devices, deviceId]);

  const basePath = device ? `${ROOT}/${device.id}` : null;

  // nilai realtime
  useEffect(() => {
    if (!basePath) return;
    return subscribe(`${basePath}/live`, setLive);
  }, [basePath]);

  // parameter yang tersedia pada stasiun ini (dari /live)
  const paramKeys = useMemo(() => numericKeys(live), [live]);
  useEffect(() => {
    if (paramKeys.length && !paramKeys.includes(param)) setParam(paramKeys[0]);
  }, [paramKeys, param]);

  const P = metaFor(param || paramKeys[0] || "", Math.max(0, paramKeys.indexOf(param)));
  const fmt = (v) => (v == null || Number.isNaN(v) ? "–" : Number(v).toFixed(P.dp));

  // sampel hari terpilih
  useEffect(() => {
    if (!basePath) return;
    return subscribe(`${basePath}/log/${date}`, (val) => {
      setRows(logToRows(val, (e, time) => ({ time: time.slice(0, 5), ...e })));
    });
  }, [basePath, date]);

  // 10 hari terakhir untuk tabel + rata-rata periode
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
      for (const [d, node] of pairs)
        g[d] = logToRows(node, (e, time) => ({ time: time.slice(0, 5), ...e }));
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

  const current = live?.[param] ?? null;
  const days = Array.from({ length: TABLE_DAYS }, (_, i) => shiftDate(date, -(TABLE_DAYS - 1 - i)));

  const cell = (d, hh) => {
    const list = (grid[d] || []).filter((r) => r.time.startsWith(hh));
    if (!list.length) return { t: "--:--", v: "-" };
    const last = list[list.length - 1];
    return { t: last.time, v: last[param] == null ? "-" : Number(last[param]).toFixed(P.dp) };
  };

  if (loading) return <p className="text-slate-400">Memuat stasiun…</p>;
  if (!device)
    return (
      <p className="text-slate-400">
        Belum ada data stasiun di <code>{ROOT}</code>. Pastikan bridge di server sudah mengirim data.
      </p>
    );

  return (
    <>
      <DevicePicker devices={devices} deviceId={device.id} onDevice={setDeviceId} date={date} onDate={setDate} />

      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setDate(shiftDate(date, -1))}
          className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-sm hover:bg-slate-700"
        >
          ◀ Prev
        </button>
        <button
          onClick={() => setDate(shiftDate(date, 1))}
          disabled={date >= todayStr()}
          className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-sm hover:bg-slate-700 disabled:opacity-40"
        >
          Next ▶
        </button>
        <span className="text-xs text-slate-500 ml-2">
          {device.name} · {devices.length} stasiun
        </span>
      </div>

      {/* pemilih parameter — dinamis per stasiun */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {paramKeys.map((k, i) => {
          const mp = metaFor(k, i);
          return (
            <button
              key={k}
              onClick={() => setParam(k)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition border ${
                param === k
                  ? "bg-yellow-400 text-slate-900 border-yellow-400"
                  : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
              }`}
            >
              {mp.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5 mb-6">
        <div className="rounded-2xl overflow-hidden border border-slate-700 bg-slate-900">
          <div className="bg-slate-950 text-center text-xs text-slate-400 py-1.5">
            Update terakhir: {live?.terminalTime || (live?.ts ? new Date(live.ts).toLocaleString("id-ID") : "—")}
          </div>
          <div className="bg-blue-600 text-white text-center font-semibold py-1.5 text-sm">
            Tertinggi: {fmt(high)} {P.unit}
          </div>
          <div className="bg-black text-center py-6">
            <span className="text-5xl font-bold text-green-400">{fmt(current)}</span>
            <span className="text-lg text-green-500 ml-2">{P.unit}</span>
          </div>
          <div className="bg-red-600 text-white text-center font-semibold py-1.5 text-sm">
            Terendah: {fmt(low)} {P.unit}
          </div>
          <div className="px-4 py-3 text-xs">
            <p className="text-emerald-400 font-semibold">STATISTIK PERIODE ({TABLE_DAYS} HARI)</p>
            <p className="text-slate-300 flex justify-between mt-1">
              <span>Rata-rata:</span>
              <span className="font-semibold">{fmt(periodAvg)} {P.unit}</span>
            </p>
            {live?.vcc != null && param !== "vcc" && (
              <p className="text-slate-400 flex justify-between mt-1">
                <span>Suplai:</span>
                <span>{Number(live.vcc).toFixed(1)} V</span>
              </p>
            )}
          </div>
        </div>

        <TimeChart
          title={`DATA ${P.label.toUpperCase()} — ${device.name} (${date})`}
          data={rows.filter((r) => r[param] != null)}
          series={[{ key: param, name: P.label, color: P.color }]}
        />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
        <table className="text-xs w-full border-collapse">
          <thead>
            <tr className="bg-slate-800 text-slate-300">
              <th rowSpan={2} className="px-2 py-1 sticky left-0 bg-slate-800 border border-slate-700">JAM</th>
              {days.map((d) => (
                <th key={d} colSpan={2} className="px-2 py-1 border border-slate-700 whitespace-nowrap">{d}</th>
              ))}
            </tr>
            <tr className="bg-slate-800/70 text-slate-400">
              {days.map((d) => (
                <Fragment key={`h-${d}`}>
                  <th className="px-2 py-0.5 border border-slate-700 font-medium">WAKTU</th>
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

      <p className="text-[11px] text-slate-600 mt-3">
        Parameter & satuan terdeteksi otomatis dari data tiap stasiun. Satuan untuk field yang belum dikenal ditampilkan kosong — lengkapi di <code>META</code> pada halaman ini.
      </p>
    </>
  );
}
