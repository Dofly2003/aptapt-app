import { Fragment, useEffect, useMemo, useState } from "react";
import { ref, get } from "firebase/database";
import { rtdb } from "../lib/firebase";
import { subscribe, todayStr, logToRows } from "../lib/rtdb";
import DevicePicker from "../components/DevicePicker";
import TimeChart from "../components/TimeChart";

const ROOT = "monitoring/kualitas-air";

/* Parameter kualitas air. Satuan = asumsi, cocokkan dengan sensor terpasang. */
const PARAMS = [
  { key: "ph", label: "pH", unit: "", color: "#22c55e", dp: 2 },
  { key: "do", label: "DO", unit: "mg/L", color: "#38bdf8", dp: 2 },
  { key: "conductivity", label: "Konduktivitas", unit: "mS/cm", color: "#f59e0b", dp: 3 },
  { key: "turbidity", label: "Kekeruhan", unit: "NTU", color: "#a855f7", dp: 2 },
  { key: "temp", label: "Suhu", unit: "°C", color: "#ef4444", dp: 1 },
];

const TABLE_DAYS = 10; // kolom tabel + periode rata-rata
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));

/* geser tanggal "YYYY-MM-DD" sebanyak n hari */
function shiftDate(str, n) {
  const [y, m, d] = str.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return todayStr(dt);
}

export default function KualitasAir() {
  // Device diambil LANGSUNG dari node data (tanpa perlu daftar di monitoring/devices).
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deviceId, setDeviceId] = useState("");
  const [date, setDate] = useState(todayStr());
  const [param, setParam] = useState("ph");
  const [live, setLive] = useState(null);
  const [rows, setRows] = useState([]); // sampel hari terpilih
  const [grid, setGrid] = useState({}); // { "YYYY-MM-DD": [{time, <param>}], ... }

  const device = devices.find((d) => d.id === deviceId) || devices[0];
  const P = PARAMS.find((p) => p.key === param);
  const fmt = (v) => (v == null || Number.isNaN(v) ? "–" : Number(v).toFixed(P.dp));

  // daftar stasiun = anak-anak node monitoring/kualitas-air yang punya
  // minimal satu parameter kualitas air di /live (buang sisa node non-WQMS).
  useEffect(() => {
    return subscribe(ROOT, (val) => {
      const list = Object.entries(val || {})
        .filter(([, node]) => {
          const lv = node?.live || {};
          return ["ph", "do", "conductivity", "turbidity"].some((k) => lv[k] != null);
        })
        .map(([id, node]) => ({
          id,
          name: node?.live?.group
            ? `${node.live.group} · ${id.slice(0, 8)}`
            : id.slice(0, 16),
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

  // nilai realtime terakhir
  useEffect(() => {
    if (!basePath) return;
    return subscribe(`${basePath}/live`, setLive);
  }, [basePath]);

  // sampel hari terpilih (untuk grafik + tertinggi/terendah)
  useEffect(() => {
    if (!basePath) return;
    return subscribe(`${basePath}/log/${date}`, (val) => {
      setRows(
        logToRows(val, (e, time) => ({
          time: time.slice(0, 5),
          ph: e.ph ?? null,
          do: e.do ?? null,
          conductivity: e.conductivity ?? null,
          turbidity: e.turbidity ?? null,
          temp: e.temp ?? null,
        }))
      );
    });
  }, [basePath, date]);

  // TABLE_DAYS hari terakhir (sekali ambil, untuk tabel + rata-rata periode)
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
      for (const [d, node] of pairs) {
        g[d] = logToRows(node, (e, time) => ({
          time: time.slice(0, 5),
          ph: e.ph ?? null,
          do: e.do ?? null,
          conductivity: e.conductivity ?? null,
          turbidity: e.turbidity ?? null,
          temp: e.temp ?? null,
        }));
      }
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

  // tabel: per hari & jam -> sampel terakhir pada jam itu
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
        Belum ada data stasiun di <code>{ROOT}</code>. Pastikan bridge WQMS di server sudah mengirim data.
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
        <span className="text-xs text-slate-500 ml-2">{device.name}</span>
      </div>

      {/* pemilih parameter */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {PARAMS.map((p) => (
          <button
            key={p.key}
            onClick={() => setParam(p.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition border ${
              param === p.key
                ? "bg-yellow-400 text-slate-900 border-yellow-400"
                : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5 mb-6">
        {/* kartu angka besar ala referensi */}
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
            {live?.vcc != null && (
              <p className="text-slate-400 flex justify-between mt-1">
                <span>Suplai:</span>
                <span>{Number(live.vcc).toFixed(1)} V</span>
              </p>
            )}
          </div>
        </div>

        {/* grafik hari terpilih */}
        <TimeChart
          title={`DATA ${P.label.toUpperCase()} — ${device.name} (${date})`}
          data={rows.filter((r) => r[param] != null)}
          series={[{ key: param, name: P.label, color: P.color }]}
        />
      </div>

      {/* tabel per jam lintas hari */}
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
        Satuan parameter masih asumsi (pH tanpa satuan, DO mg/L, Konduktivitas mS/cm, Kekeruhan NTU, Suhu °C) — sesuaikan bila perlu.
      </p>
    </>
  );
}
