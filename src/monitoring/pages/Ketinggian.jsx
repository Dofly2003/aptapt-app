import { useEffect, useMemo, useState } from "react";
import { subscribe, todayStr, logToRows } from "../lib/rtdb";
import { useDevices } from "../hooks/useDevices";
import DevicePicker from "../components/DevicePicker";
import StatCard from "../components/StatCard";
import TimeChart from "../components/TimeChart";

const f1 = (v) => Number(v || 0).toFixed(1);

function statusFromThreshold(level, th) {
  if (th.levelMax != null && level >= th.levelMax) return { label: "SIAGA", color: "#ef4444" };
  if (th.levelWarn != null && level >= th.levelWarn) return { label: "WASPADA", color: "#f59e0b" };
  return { label: "AMAN", color: "#22c55e" };
}

export default function Ketinggian() {
  const { devices, loading } = useDevices("ketinggian");
  const [deviceId, setDeviceId] = useState("");
  const [date, setDate] = useState(todayStr());
  const [live, setLive] = useState(null);
  const [rows, setRows] = useState([]);

  const device = devices.find((d) => d.id === deviceId) || devices[0];

  useEffect(() => {
    if (!deviceId && devices.length) setDeviceId(devices[0].id);
  }, [devices, deviceId]);

  // nilai realtime terakhir
  useEffect(() => {
    if (!device) return;
    const base = device.dataPath || `monitoring/ketinggian/${device.id}`;
    return subscribe(`${base}/live`, setLive);
  }, [device]);

  // riwayat harian
  useEffect(() => {
    if (!device) return;
    const base = device.dataPath || `monitoring/ketinggian/${device.id}`;
    return subscribe(`${base}/log/${date}`, (val) => {
      setRows(
        logToRows(val, (e, time) => {
          const level = typeof e === "number" ? e : e?.level_cm;
          if (level == null) return null;
          return { time, level };
        })
      );
    });
  }, [device, date]);

  const th = device?.thresholds || {};
  const level = live?.level_cm ?? (typeof live === "number" ? live : null);
  const status = level != null ? statusFromThreshold(level, th) : null;

  const dayStats = useMemo(() => {
    if (!rows.length) return null;
    const vals = rows.map((r) => r.level);
    return { min: Math.min(...vals), max: Math.max(...vals), last: rows[rows.length - 1].time };
  }, [rows]);

  if (loading) return <p className="text-slate-400">Memuat device…</p>;
  if (!device) return <p className="text-slate-400">Belum ada device ketinggian. Tambahkan di panel admin.</p>;

  return (
    <>
      <DevicePicker
        devices={devices}
        deviceId={device.id}
        onDevice={setDeviceId}
        date={date}
        onDate={setDate}
      />

      {level == null ? (
        <div className="bg-slate-800 p-6 rounded-xl text-center text-slate-400">Menunggu data…</div>
      ) : (
        <>
          <div
            className="rounded-2xl p-6 mb-6 text-center border"
            style={{ borderColor: status.color, background: `${status.color}14` }}
          >
            <p className="text-sm text-slate-400">Ketinggian sekarang</p>
            <p className="text-5xl font-bold my-1" style={{ color: status.color }}>
              {f1(level)} <span className="text-2xl">cm</span>
            </p>
            <p className="text-sm font-semibold" style={{ color: status.color }}>
              Status: {status.label}
            </p>
            {live?.ts && (
              <p className="text-xs text-slate-500 mt-2">
                Update: {new Date(live.ts).toLocaleString("id-ID")}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard title="Min hari ini" items={[{ label: "cm", value: dayStats ? f1(dayStats.min) : "–" }]} />
            <StatCard title="Max hari ini" items={[{ label: "cm", value: dayStats ? f1(dayStats.max) : "–" }]} />
            <StatCard title="Ambang waspada" items={[{ label: "cm", value: th.levelWarn ?? "–" }]} />
            <StatCard
              title="Baterai"
              items={[{ label: "%", value: live?.battery != null ? f1(live.battery) : "–" }]}
            />
          </div>

          <TimeChart
            title={`Ketinggian ${date}`}
            data={rows}
            series={[{ key: "level", name: "cm", color: "#38bdf8" }]}
          />
        </>
      )}
    </>
  );
}
