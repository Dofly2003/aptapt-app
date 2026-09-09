import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, Cell, AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { subscribe, todayStr, logToRows } from "../lib/rtdb";
import { useDevices } from "../hooks/useDevices";

/* ── util tanggal ──────────────────────────────────────────────── */
const pad = (n) => String(n).padStart(2, "0");
function addDays(str, n) {
  const d = new Date(str + "T00:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
const DOW = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MON = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const dow = (str) => DOW[new Date(str + "T00:00:00").getDay()];
const fmt = (n, d = 1) =>
  Number(n || 0).toLocaleString("id-ID", { maximumFractionDigits: d, minimumFractionDigits: d });

/* kWh terpakai per jam hari ini (meter kumulatif → max−min per jam). */
function hourly(rows) {
  const byH = {};
  for (const r of rows) {
    if (r.kWh == null) continue;
    (byH[r.time.slice(0, 2)] ||= []).push(r.kWh);
  }
  return Array.from({ length: 24 }, (_, h) => {
    const a = byH[pad(h)];
    return { label: pad(h), kWh: a ? Math.max(0, +(Math.max(...a) - Math.min(...a)).toFixed(2)) : 0 };
  });
}

/* ── komponen kecil ────────────────────────────────────────────── */
function Segmented({ value, onChange, options }) {
  return (
    <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-slate-900 border border-slate-800">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`py-2 rounded-xl text-sm font-semibold transition ${
            value === o.v ? "bg-amber-400 text-slate-950" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Chip({ label, value, unit }) {
  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 px-3 py-3 text-center">
      <p className="text-[11px] text-slate-500 leading-tight">{label}</p>
      <p className="mt-1 font-bold text-lg text-slate-100 tabular-nums leading-none">{value}</p>
      {unit && <p className="text-[10px] text-slate-500 mt-0.5">{unit}</p>}
    </div>
  );
}

function Delta({ from, to }) {
  if (!from) return null;
  const pct = ((to - from) / from) * 100;
  const up = pct >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
        up ? "bg-amber-400/15 text-amber-300" : "bg-emerald-400/15 text-emerald-300"
      }`}
    >
      {up ? "▲" : "▼"} {fmt(Math.abs(pct), 0)}%
    </span>
  );
}

const tipStyle = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 10,
  fontSize: 12,
  color: "#e2e8f0",
};

/* ── halaman ───────────────────────────────────────────────────── */
export default function PanelDayaApp() {
  const { devices, loading } = useDevices("panel-daya");
  const [deviceId, setDeviceId] = useState("");
  const [view, setView] = useState("harian");
  const [daily, setDaily] = useState({});
  const [todayRows, setTodayRows] = useState([]);
  const [live, setLive] = useState(null);

  const device = devices.find((d) => d.id === deviceId) || devices[0];
  const base = device
    ? (device.dataPath ? device.dataPath.replace(/\/log\/?$/, "") : `monitoring/panel-daya/${device.id}`)
    : null;

  useEffect(() => {
    if (!deviceId && devices.length) setDeviceId(devices[0].id);
  }, [devices, deviceId]);

  useEffect(() => {
    if (!base) return;
    const today = todayStr();
    const unsubs = [
      subscribe(`${base}/daily`, (v) => setDaily(v || {})),
      subscribe(`${base}/live`, (v) => setLive(v || null)),
      subscribe(`${base}/log/${today}`, (v) =>
        setTodayRows(
          logToRows(v, (e, time) =>
            e?.energy ? { time, kWh: e.energy.kWh ?? null } : null
          )
        )
      ),
    ];
    return () => unsubs.forEach((u) => u && u());
  }, [base]);

  const today = todayStr();
  const yst = addDays(today, -1);

  const todayHourly = useMemo(() => hourly(todayRows), [todayRows]);
  const todayTotal = daily[today]?.kWh ?? todayHourly.reduce((s, x) => s + x.kWh, 0);
  const ystTotal = daily[yst]?.kWh ?? 0;

  // rangkai data per periode
  const period = useMemo(() => {
    if (view === "harian") {
      const hoursElapsed = new Date().getHours() + 1;
      const maxH = todayHourly.reduce((a, b) => (b.kWh > a.kWh ? b : a), todayHourly[0] || { kWh: 0 });
      return {
        title: "Pemakaian per jam — hari ini",
        range: `${today.slice(8)} ${MON[+today.slice(5, 7) - 1]}`,
        data: todayHourly,
        total: todayTotal,
        avgLabel: "Rata-rata / jam",
        avg: todayTotal / Math.max(1, hoursElapsed),
        peakKw: daily[today]?.peakKw ?? 0,
        highlightKey: maxH?.label,
        xInterval: 2,
        note: maxH?.kWh ? `Jam tersibuk ${maxH.label}:00 — ${fmt(maxH.kWh, 1)} kWh` : null,
      };
    }
    // mingguan / bulanan → dari rekap harian
    let dates;
    if (view === "mingguan") {
      dates = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
    } else {
      const first = today.slice(0, 8) + "01";
      const n = new Date().getDate();
      dates = Array.from({ length: n }, (_, i) => addDays(first, i));
    }
    const data = dates.map((d) => ({
      key: d,
      label: view === "mingguan" ? `${dow(d)}` : d.slice(8),
      sub: d.slice(8),
      kWh: +(daily[d]?.kWh ?? 0).toFixed(1),
      peakKw: daily[d]?.peakKw ?? 0,
    }));
    const total = data.reduce((s, x) => s + x.kWh, 0);
    const withUse = data.filter((x) => x.kWh > 0);
    const hi = withUse.reduce((a, b) => (b.kWh > a.kWh ? b : a), withUse[0] || null);
    const lo = withUse.reduce((a, b) => (b.kWh < a.kWh ? b : a), withUse[0] || null);
    return {
      title: view === "mingguan" ? "Pemakaian harian — 7 hari" : `Pemakaian harian — ${MON[+today.slice(5, 7) - 1]}`,
      range: view === "mingguan" ? `${dates[0].slice(8)}–${dates[6].slice(8)} ${MON[+today.slice(5, 7) - 1]}` : `1–${new Date().getDate()} ${MON[+today.slice(5, 7) - 1]}`,
      data,
      total,
      avgLabel: "Rata-rata / hari",
      avg: total / Math.max(1, withUse.length),
      peakKw: data.reduce((m, x) => Math.max(m, x.peakKw), 0),
      highlightKey: hi?.key,
      xInterval: view === "bulanan" ? 3 : 0,
      note:
        hi && lo
          ? `Tertinggi ${view === "mingguan" ? dow(hi.key) + " " + hi.sub : "tgl " + hi.sub} (${fmt(hi.kWh, 1)}) · terendah ${view === "mingguan" ? dow(lo.key) + " " + lo.sub : "tgl " + lo.sub} (${fmt(lo.kWh, 1)})`
          : null,
    };
  }, [view, todayHourly, todayTotal, daily, today]);

  const liveKw = live
    ? ((live.voltage?.R || 0) * (live.current?.R || 0) +
        (live.voltage?.S || 0) * (live.current?.S || 0) +
        (live.voltage?.T || 0) * (live.current?.T || 0)) *
      0.86 /
      1000
    : null;

  const noRollup = view !== "harian" && !Object.keys(daily).length;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* header */}
      <div className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur border-b border-slate-800/60">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-amber-400/80 font-semibold">
                PT. Adytia Putra Teknik
              </p>
              <h1 className="text-lg font-bold leading-tight">Monitoring Panel Daya</h1>
            </div>
            {liveKw != null && (
              <div className="text-right">
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {fmt(liveKw, 1)} kW
                </span>
              </div>
            )}
          </div>

          {/* pilih device */}
          {devices.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
              {devices.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDeviceId(d.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                    device?.id === d.id
                      ? "bg-amber-400 text-slate-950 border-amber-400"
                      : "border-slate-700 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  {d.name?.replace(/^Panel\s+/i, "") || d.id}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 pb-16 space-y-4">
        {loading ? (
          <p className="text-slate-500 text-sm text-center py-10">Memuat…</p>
        ) : !device ? (
          <p className="text-slate-500 text-sm text-center py-10">
            Belum ada device panel daya.
          </p>
        ) : (
          <>
            {/* HERO — pemakaian hari ini */}
            <div className="rounded-3xl p-5 bg-gradient-to-br from-amber-400/15 via-slate-900 to-slate-900 border border-amber-400/20">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-wider text-amber-300/80 font-semibold">
                  Pemakaian Hari Ini
                </p>
                <p className="text-[11px] text-slate-500">{device.location || device.name}</p>
              </div>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-5xl font-extrabold tabular-nums leading-none">
                  {fmt(todayTotal, 1)}
                </span>
                <span className="text-base text-slate-400 mb-1">kWh</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Delta from={ystTotal} to={todayTotal} />
                <span className="text-xs text-slate-500">
                  vs kemarin {fmt(ystTotal, 1)} kWh
                </span>
              </div>

              <div className="mt-3 -mx-1">
                <ResponsiveContainer width="100%" height={60}>
                  <AreaChart data={todayHourly} margin={{ top: 4, right: 6, left: 6, bottom: 0 }}>
                    <defs>
                      <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="kWh"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      fill="url(#spark)"
                      isAnimationActive={false}
                    />
                    <Tooltip
                      contentStyle={tipStyle}
                      labelFormatter={(l) => `Jam ${l}:00`}
                      formatter={(v) => [`${fmt(v, 2)} kWh`, "Pemakaian"]}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* segmented */}
            <Segmented
              value={view}
              onChange={setView}
              options={[
                { v: "harian", label: "Harian" },
                { v: "mingguan", label: "Mingguan" },
                { v: "bulanan", label: "Bulanan" },
              ]}
            />

            {/* chips */}
            <div className="grid grid-cols-3 gap-2">
              <Chip label={view === "harian" ? "Total hari ini" : view === "mingguan" ? "Total 7 hari" : "Total bulan ini"} value={fmt(period.total, 1)} unit="kWh" />
              <Chip label={period.avgLabel} value={fmt(period.avg, 1)} unit="kWh" />
              <Chip label="Puncak daya" value={fmt(period.peakKw, 1)} unit="kW" />
            </div>

            {/* chart utama */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="font-semibold text-slate-200 text-sm">{period.title}</h2>
                <span className="text-[11px] text-slate-500">{period.range}</span>
              </div>

              {noRollup ? (
                <p className="text-slate-500 text-xs py-10 text-center">
                  Rekap harian belum tersedia.<br />
                  Jalankan ulang simulator di VPS (git pull lalu <code>--backfill=30</code>).
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={period.data} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      interval={period.xInterval}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={44}
                      tickFormatter={(v) => fmt(v, 0)}
                    />
                    <Tooltip
                      cursor={{ fill: "#1e293b55" }}
                      contentStyle={tipStyle}
                      labelFormatter={(l, p) =>
                        view === "harian"
                          ? `Jam ${l}:00`
                          : p?.[0]?.payload
                          ? `${view === "mingguan" ? dow(p[0].payload.key) + " " : "Tgl "}${p[0].payload.sub}`
                          : l
                      }
                      formatter={(v) => [`${fmt(v, 2)} kWh`, "Pemakaian"]}
                    />
                    <Bar dataKey="kWh" radius={[6, 6, 0, 0]} maxBarSize={44} isAnimationActive={false}>
                      {period.data.map((d) => (
                        <Cell
                          key={d.key || d.label}
                          fill="#f59e0b"
                          fillOpacity={(d.key || d.label) === period.highlightKey ? 1 : 0.32}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}

              {period.note && !noRollup && (
                <p className="text-[11px] text-slate-500 mt-2 text-center">{period.note}</p>
              )}
            </div>

            <p className="text-[10px] text-slate-600 text-center pt-2">
              Data diperbarui otomatis · {device.name}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
