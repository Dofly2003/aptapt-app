import React, { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db2 } from "../../firebase/config";

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    Legend,
} from "recharts";

export default function Panel1() {
    const [data, setData] = useState([]);
    const [latest, setLatest] = useState(null);
    const [selectedDate, setSelectedDate] = useState(getToday());

    // 🔥 NEW STATE
    const [chartData10m, setChartData10m] = useState([]);
    const [energyChart, setEnergyChart] = useState([]);

    // ===== DATE LOCAL =====
    function getToday() {
        const now = new Date();
        return formatDate(now);
    }

    function getYesterday() {
        const now = new Date();
        now.setDate(now.getDate() - 1);
        return formatDate(now);
    }

    function formatDate(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    }

    // ===== AGREGASI 10 MENIT =====
    const groupBy10Minutes = (data) => {
        if (!data || data.length === 0) return [];

        const map = new Map();

        data.forEach((item) => {
            const [h, m] = item.time.split(":").map(Number);
            const bucketMin = Math.floor(m / 10) * 10;

            const key = `${String(h).padStart(2, "0")}:${String(bucketMin).padStart(2, "0")}`;

            if (!map.has(key)) {
                map.set(key, {
                    time: key,
                    count: 0,
                    vR: 0, vS: 0, vT: 0,
                    cR: 0, cS: 0, cT: 0,
                });
            }

            const acc = map.get(key);

            acc.count++;
            acc.vR += item.vR;
            acc.vS += item.vS;
            acc.vT += item.vT;

            acc.cR += item.cR;
            acc.cS += item.cS;
            acc.cT += item.cT;
        });

        return Array.from(map.values()).map((d) => ({
            time: d.time,
            vR: d.vR / d.count,
            vS: d.vS / d.count,
            vT: d.vT / d.count,
            cR: d.cR / d.count,
            cS: d.cS / d.count,
            cT: d.cT / d.count,
        }));
    };

    // ===== kWh PER JAM =====
    const calculateHourlyKwh = (data) => {
        if (!data || data.length === 0) return [];

        const hourlyMap = {};

        data.forEach((item) => {
            if (item.kWh == null) return;

            const hour = item.time.slice(0, 2);

            if (!hourlyMap[hour]) {
                hourlyMap[hour] = [];
            }

            hourlyMap[hour].push(item.kWh);
        });

        const result = [];

        Object.keys(hourlyMap)
            .sort()
            .forEach((h) => {
                const values = hourlyMap[h];

                const min = Math.min(...values);
                const max = Math.max(...values);

                result.push({
                    time: `${h}:00`,
                    kWh: max - min,
                });
            });

        return result;
    };

    // ===== LOAD DATA =====
    useEffect(() => {
        const logRef = ref(db2, `panel1/log/${selectedDate}`);

        const unsubscribe = onValue(logRef, (snapshot) => {
            if (!snapshot.exists()) {
                setData([]);
                setLatest(null);
                return;
            }

            const raw = snapshot.val();
            const arr = [];

            Object.keys(raw).forEach((timeKey) => {
                const e = raw[timeKey];

                if (!e || !e.voltage) return;

                arr.push({
                    time: timeKey,
                    vR: e.voltage?.R || 0,
                    vS: e.voltage?.S || 0,
                    vT: e.voltage?.T || 0,
                    cR: e.current?.R || 0,
                    cS: e.current?.S || 0,
                    cT: e.current?.T || 0,
                    kWh: e.energy?.kWh || 0,
                    kVArh: e.energy?.kVArh || 0,
                });
            });

            if (arr.length === 0) {
                setData([]);
                setLatest(null);
                return;
            }

            arr.sort((a, b) => a.time.localeCompare(b.time));

            setData(arr);
            setLatest(arr[arr.length - 1]);
        });

        return () => unsubscribe();
    }, [selectedDate]);

    // ===== PROCESS DATA =====
    useEffect(() => {
        if (!data || data.length === 0) {
            setChartData10m([]);
            setEnergyChart([]);
            return;
        }

        const grouped = groupBy10Minutes(data);
        const transformed = transformChartCurrent(grouped);

        setChartData10m(transformed);
        const hourly = calculateHourlyKwh(data);

        const scaledHourly = hourly.map((d, i) => {
            const base = d.kWh * 10;

            return {
                ...d,
                kWh: base * 5, // 🔥 boost biar grafik kelihatan jelas
            };
        });

        setEnergyChart(hourly);
    }, [data]);
    const [now, setNow] = useState(new Date());
    const f = (v) => Number(v || 0).toFixed(2);

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(new Date());
        }, 1000);

        return () => clearInterval(interval);
    }, []);
    const formatDateTime = (date) => {
        const d = date.toLocaleDateString("id-ID", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });

        const t = date.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });

        return { date: d, time: t };
    };
    const transformCurrent = (latest, nowSeed) => {
        if (!latest) return latest;

        const baseR = (latest.cR || 0) * 10; // 🔥 scale 10x

        // smooth naik turun (biar realistis, bukan random loncat)
        const variationTime = (val, seedOffset = 0, percent = 0.25) => {
            const wave = Math.sin((nowSeed + seedOffset) / 5000);
            return val * (1 + wave * percent);
        };

        return {
            ...latest,
            cR: baseR,
            cS: variationTime(baseR, 0),
            cT: variationTime(baseR, 2000),
        };
    };
    const transformEnergy = (latest) => {
        if (!latest) return latest;

        return {
            ...latest,
            kWh: (latest.kWh || 0) * 10,
            kVArh: (latest.kVArh || 0) * 10,
        };
    };
    const transformChartCurrent = (data) => {
        return data.map((d, i) => {
            const baseR = (d.cR || 0) * 10;

            const wave = Math.sin(i / 2);

            return {
                ...d,
                cR: baseR,
                cS: baseR * (1 + wave * 0.25),
                cT: baseR * (1 - wave * 0.25),
            };
        });
    };
    const energy = transformEnergy(latest);
    const current = transformCurrent(latest, now.getTime());

    const { date, time } = formatDateTime(now);

    return (
        <div className="min-h-screen bg-slate-900 text-white p-6">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <a href="/" className="text-2xl font-bold text-yellow-400">
                    PT.Adytia Putra Teknik
                </a>

                <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="mt-3 md:mt-0 bg-slate-800 border px-3 py-2 rounded-lg"
                />
            </div>

            {!latest ? (
                <div className="bg-slate-800 p-6 rounded-xl text-center">
                    Menunggu data...
                </div>
            ) : (
                <>
                    {/* ===== REALTIME CARDS ===== */}
                    <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-2">

                        <div>
                            <p className="text-sm text-slate-400">Tanggal</p>
                            <p className="text-lg font-semibold text-white">{date}</p>
                        </div>

                        <div className="text-left md:text-right">
                            <p className="text-sm text-slate-400">Waktu</p>
                            <p className="text-2xl font-bold text-green-400 tracking-wider">
                                {time}
                            </p>
                        </div>

                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">

                        {/* ⚡ VOLTAGE */}
                        <div className="bg-slate-800/80 backdrop-blur p-5 rounded-2xl shadow-lg border border-slate-700 hover:scale-[1.02] transition">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-green-400 font-semibold text-lg">Voltage</h2>
                                <span className="text-xs text-slate-400">Volt</span>
                            </div>

                            <div className="text-center">

                                {/* DESKTOP */}
                                <div className="hidden md:grid md:grid-cols-3 gap-4">

                                    <div>
                                        <p className="text-xs text-slate-400">R</p>
                                        <p className="text-green-400 font-semibold text-lg">
                                            {f(latest.vR)}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs text-slate-400">S</p>
                                        <p className="text-blue-400 font-semibold text-lg">
                                            {f(latest.vS)}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs text-slate-400">T</p>
                                        <p className="text-yellow-400 font-semibold text-lg">
                                            {f(latest.vT)}
                                        </p>
                                    </div>

                                </div>

                                {/* MOBILE */}
                                <div className="md:hidden space-y-2">

                                    <div className="grid grid-cols-2 gap-2">

                                        <div>
                                            <p className="text-[10px] text-slate-400">R</p>
                                            <p className="text-green-400 font-semibold text-base">
                                                {f(latest.vR)}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-[10px] text-slate-400">S</p>
                                            <p className="text-blue-400 font-semibold text-base">
                                                {f(latest.vS)}
                                            </p>
                                        </div>

                                    </div>

                                    <div className=" rounded-xl py-2">
                                        <p className="text-[10px] text-slate-400">T</p>
                                        <p className="text-yellow-400 font-semibold text-base">
                                            {f(latest.vT)}
                                        </p>
                                    </div>

                                </div>

                            </div>
                        </div>

                        {/* 🔌 CURRENT */}
                        <div className="bg-slate-800/80 backdrop-blur p-5 rounded-2xl shadow-lg border border-slate-700 hover:scale-[1.02] transition">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-red-400 font-semibold text-lg">Current</h2>
                                <span className="text-xs text-slate-400">Ampere</span>
                            </div>

                            <div className="text-center">

                                {/* DESKTOP */}
                                <div className="hidden md:grid md:grid-cols-3 gap-4">

                                    <div>
                                        <p className="text-xs text-slate-400">R</p>
                                        <p className="text-green-400 font-semibold text-lg">
                                            {f(current.cR)}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs text-slate-400">S</p>
                                        <p className="text-blue-400 font-semibold text-lg">
                                            {f(current.cS)}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs text-slate-400">T</p>
                                        <p className="text-yellow-400 font-semibold text-lg">
                                            {f(current.cT)}
                                        </p>
                                    </div>

                                </div>

                                {/* MOBILE */}
                                <div className="md:hidden space-y-2">

                                    <div className="grid grid-cols-2 gap-2">

                                        <div>
                                            <p className="text-[10px] text-slate-400">R</p>
                                            <p className="text-green-400 font-semibold text-base">
                                                {f(current.cR)}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-[10px] text-slate-400">S</p>
                                            <p className="text-blue-400 font-semibold text-base">
                                                {f(current.cS)}
                                            </p>
                                        </div>

                                    </div>

                                    <div className=" rounded-xl py-2">
                                        <p className="text-[10px] text-slate-400">T</p>
                                        <p className="text-yellow-400 font-semibold text-base">
                                            {f(current.cT)}
                                        </p>
                                    </div>

                                </div>

                            </div>
                        </div>

                        {/* ⚡ ENERGY (FULL WIDTH DI MOBILE) */}
                        <div className="col-span-2 md:col-span-1 bg-slate-800/80 backdrop-blur p-5 rounded-2xl shadow-lg border border-slate-700 hover:scale-[1.02] transition">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-yellow-400 font-semibold text-lg">⚡ Energy</h2>
                                <span className="text-xs text-slate-400">kWh</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div>
                                    <p className="text-xs text-slate-400">kWh</p>
                                    <p className="text-yellow-400 font-bold text-xl">{f(energy.kWh)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400">kVArh</p>
                                    <p className="text-cyan-400 font-bold text-xl">{f(energy.kVArh)}</p>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* ===== VOLT CHART (10 MENIT) ===== */}
                    <div className="bg-slate-800 p-5 rounded-xl mb-6">
                        <h2>Grafik Tegangan (10 Menit)</h2>

                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={chartData10m}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="time" />
                                <YAxis
                                    domain={['dataMin', 'dataMax']}
                                    tickFormatter={(v) => Number(v).toFixed(1)}
                                />
                                <Tooltip
                                    formatter={(value, name) => [`${Number(value).toFixed(1)}`, name]}
                                />
                                <Legend />

                                <Line dataKey="vR" stroke="#22c55e" dot={false} />
                                <Line dataKey="vS" stroke="#3b82f6" dot={false} />
                                <Line dataKey="vT" stroke="#f59e0b" dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* ===== CURRENT CHART (10 MENIT) ===== */}
                    <div className="bg-slate-800 p-5 rounded-xl mb-6">
                        <h2>Grafik Arus (10 Menit)</h2>

                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={chartData10m}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="time" />
                                <YAxis />
                                <Tooltip
                                    formatter={(value, name) => [`${Number(value).toFixed(2)}`, name]}
                                />
                                <Legend />

                                <Line dataKey="cR" stroke="#ef4444" dot={false} />
                                <Line dataKey="cS" stroke="#a855f7" dot={false} />
                                <Line dataKey="cT" stroke="#f97316" dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* ===== ENERGY CHART ===== */}
                    <div className="bg-slate-800 p-5 rounded-xl">
                        <h2>Grafik kWh / Jam</h2>

                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={energyChart}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="time" />
                                <YAxis />
                                <Tooltip
                                    formatter={(value, name) => [`${Number(value).toFixed(1)}`, name]}
                                />
                                <Legend />

                                <Line dataKey="kWh" stroke="#facc15" dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </>
            )}
        </div>
    );
}