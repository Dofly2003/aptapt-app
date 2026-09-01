import { useEffect, useMemo, useState } from "react";
import { subscribe, todayStr, logToRows } from "../lib/rtdb";
import { useDevices } from "../hooks/useDevices";
import DevicePicker from "../components/DevicePicker";
import StatCard from "../components/StatCard";
import TimeChart from "../components/TimeChart";

const f = (v) => Number(v || 0).toFixed(2);

/* Agregasi baris mentah -> rata-rata per bucket 10 menit (haluskan grafik). */
function groupBy10m(rows) {
  const map = new Map();
  for (const r of rows) {
    const [h, m] = r.time.split(":").map(Number);
    const key = `${String(h).padStart(2, "0")}:${String(Math.floor(m / 10) * 10).padStart(2, "0")}`;
    const acc = map.get(key) || { time: key, n: 0, vR: 0, vS: 0, vT: 0, cR: 0, cS: 0, cT: 0 };
    acc.n++;
    acc.vR += r.vR; acc.vS += r.vS; acc.vT += r.vT;
    acc.cR += r.cR; acc.cS += r.cS; acc.cT += r.cT;
    map.set(key, acc);
  }
  return [...map.values()].map((d) => ({
    time: d.time,
    vR: d.vR / d.n, vS: d.vS / d.n, vT: d.vT / d.n,
    cR: d.cR / d.n, cS: d.cS / d.n, cT: d.cT / d.n,
  }));
}

/* kWh terpakai per jam = max(kWh) - min(kWh) dalam jam itu (meter kumulatif). */
function hourlyKwh(rows) {
  const byHour = {};
  for (const r of rows) {
    if (r.kWh == null) continue;
    (byHour[r.time.slice(0, 2)] ||= []).push(r.kWh);
  }
  return Object.keys(byHour).sort().map((h) => ({
    time: `${h}:00`,
    kWh: Math.max(...byHour[h]) - Math.min(...byHour[h]),
  }));
}

export default function PanelDaya() {
  const { devices, loading } = useDevices("panel-daya");
  const [deviceId, setDeviceId] = useState("");
  const [date, setDate] = useState(todayStr());
  const [rows, setRows] = useState([]);

  const device = devices.find((d) => d.id === deviceId) || devices[0];

  // pilih device pertama begitu daftar termuat
  useEffect(() => {
    if (!deviceId && devices.length) setDeviceId(devices[0].id);
  }, [devices, deviceId]);

  // langganan log harian pada path device (default: "panel1/log" untuk device lama)
  useEffect(() => {
    if (!device) return;
    const base = device.dataPath || `monitoring/panel-daya/${device.id}/log`;
    const unsub = subscribe(`${base}/${date}`, (val) => {
      setRows(
        logToRows(val, (e, time) => {
          if (!e || !e.voltage) return null;
          return {
            time,
            vR: e.voltage?.R || 0, vS: e.voltage?.S || 0, vT: e.voltage?.T || 0,
            cR: e.current?.R || 0, cS: e.current?.S || 0, cT: e.current?.T || 0,
            kWh: e.energy?.kWh ?? null, kVArh: e.energy?.kVArh ?? null,
          };
        })
      );
    });
    return unsub;
  }, [device, date]);

  const chart10m = useMemo(() => groupBy10m(rows), [rows]);
  const kwhChart = useMemo(() => hourlyKwh(rows), [rows]);
  const latest = rows[rows.length - 1] || null;

  const th = device?.thresholds || {};
  const voltAlert =
    latest && (th.vMin || th.vMax)
      ? [latest.vR, latest.vS, latest.vT].some(
          (v) => (th.vMin && v < th.vMin) || (th.vMax && v > th.vMax)
        )
      : false;

  if (loading) return <p className="text-slate-400">Memuat device…</p>;
  if (!device) return <p className="text-slate-400">Belum ada device panel daya. Tambahkan di panel admin.</p>;

  return (
    <>
      <DevicePicker
        devices={devices}
        deviceId={device.id}
        onDevice={setDeviceId}
        date={date}
        onDate={setDate}
      />

      {!latest ? (
        <div className="bg-slate-800 p-6 rounded-xl text-center text-slate-400">
          Menunggu data untuk {date}…
        </div>
      ) : (
        <>
          <p className="text-xs text-slate-500 mb-3">
            Data terakhir: {latest.time} · {rows.length} sampel
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
            <StatCard
              title="Tegangan" unit="Volt" alert={voltAlert}
              items={[
                { label: "R", value: f(latest.vR), color: "#22c55e" },
                { label: "S", value: f(latest.vS), color: "#3b82f6" },
                { label: "T", value: f(latest.vT), color: "#f59e0b" },
              ]}
            />
            <StatCard
              title="Arus" unit="Ampere"
              items={[
                { label: "R", value: f(latest.cR), color: "#22c55e" },
                { label: "S", value: f(latest.cS), color: "#3b82f6" },
                { label: "T", value: f(latest.cT), color: "#f59e0b" },
              ]}
            />
            <StatCard
              title="Energi" unit="kWh / kVArh"
              items={[
                { label: "kWh", value: f(latest.kWh), color: "#facc15" },
                { label: "kVArh", value: f(latest.kVArh), color: "#22d3ee" },
              ]}
            />
          </div>

          <TimeChart
            title="Tegangan (rata-rata 10 menit)"
            data={chart10m}
            yDomain={["dataMin", "dataMax"]}
            series={[
              { key: "vR", name: "R", color: "#22c55e" },
              { key: "vS", name: "S", color: "#3b82f6" },
              { key: "vT", name: "T", color: "#f59e0b" },
            ]}
          />
          <TimeChart
            title="Arus (rata-rata 10 menit)"
            data={chart10m}
            series={[
              { key: "cR", name: "R", color: "#ef4444" },
              { key: "cS", name: "S", color: "#a855f7" },
              { key: "cT", name: "T", color: "#f97316" },
            ]}
          />
          <TimeChart
            title="Pemakaian kWh per jam"
            data={kwhChart}
            series={[{ key: "kWh", name: "kWh", color: "#facc15" }]}
          />
        </>
      )}
    </>
  );
}
