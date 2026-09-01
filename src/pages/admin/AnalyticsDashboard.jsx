import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Eye, Zap, MapPin, Monitor, Smartphone, Tablet,
  Globe, Clock, TrendingUp, Activity, RefreshCw,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { AdminPageHeader, Button } from "../../components/admin/AdminUI";
import { AuthContext } from "../../context/AuthContext";
import {
  getStats, getTopPages, getTopActions,
  getDailyTimeline, getHourlyDistribution,
  getDeviceBreakdown, getTopCities, getRecentEvents,
} from "../../services/analyticsService";

// ── Date label formatter ───────────────────────────────────────────────────────
const DAYS_ID   = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function fmtDateLabel(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00");
  if (days <= 7) return DAYS_ID[d.getDay()];
  return `${d.getDate()} ${MONTHS_ID[d.getMonth()]}`;
}

function fmtTime(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
  return d.toLocaleString("id-ID", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function fmtAction(name) {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color }) {
  const colors = {
    blue:    { bg: "bg-blue-50",    icon: "text-blue-600",    val: "text-blue-700"    },
    emerald: { bg: "bg-emerald-50", icon: "text-emerald-600", val: "text-emerald-700" },
    amber:   { bg: "bg-amber-50",   icon: "text-amber-600",   val: "text-amber-700"   },
    violet:  { bg: "bg-violet-50",  icon: "text-violet-600",  val: "text-violet-700"  },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4 shadow-sm">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${c.bg}`}>
        <Icon className={`w-6 h-6 ${c.icon}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className={`text-2xl font-bold mt-0.5 ${c.val}`}>{value ?? "—"}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Device icon ────────────────────────────────────────────────────────────────
function DeviceIcon({ device }) {
  if (device === "mobile") return <Smartphone className="w-3.5 h-3.5 text-amber-500" />;
  if (device === "tablet") return <Tablet className="w-3.5 h-3.5 text-emerald-500" />;
  return <Monitor className="w-3.5 h-3.5 text-blue-500" />;
}

// ── Platform badge ─────────────────────────────────────────────────────────────
function PlatformBadge({ platform }) {
  const cls = {
    public: "bg-rose-100 text-rose-700",
    web:    "bg-blue-100 text-blue-700",
    mobile: "bg-amber-100 text-amber-700",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls[platform] || "bg-slate-100 text-slate-600"}`}>
      {platform}
    </span>
  );
}

const FILTER_OPTIONS = [
  { label: "Hari Ini", days: 1 },
  { label: "7 Hari",   days: 7 },
  { label: "30 Hari",  days: 30 },
];

// ── Main component ─────────────────────────────────────────────────────────────
export default function AnalyticsDashboard() {
  const navigate = useNavigate();
  const { role } = useContext(AuthContext);

  const [days, setDays]       = useState(7);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const [stats,    setStats]    = useState(null);
  const [pages,    setPages]    = useState([]);
  const [actions,  setActions]  = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [hourly,   setHourly]   = useState([]);
  const [devices,  setDevices]  = useState([]);
  const [cities,   setCities]   = useState([]);
  const [recent,   setRecent]   = useState([]);

  useEffect(() => {
    if (role && role !== "superadmin") navigate("/dashboard", { replace: true });
  }, [role, navigate]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, tp, ta, tl, hr, dv, ct, rc] = await Promise.all([
        getStats(days),
        getTopPages(days),
        getTopActions(days),
        getDailyTimeline(days),
        getHourlyDistribution(days),
        getDeviceBreakdown(days),
        getTopCities(days),
        getRecentEvents(50),
      ]);
      setStats(s);
      setPages(tp);
      setActions(ta);
      setTimeline(tl.map(d => ({ ...d, label: fmtDateLabel(d.date, days) })));
      setHourly(hr);
      setDevices(dv);
      setCities(ct);
      setRecent(rc);
    } catch (err) {
      console.error(err);
      setError("Gagal memuat data analytics. Pastikan Anda memiliki akses superadmin.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [days]);

  if (role && role !== "superadmin") return null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Analytics"
        description="Pantau aktivitas website publik dan dashboard secara real-time."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
              {FILTER_OPTIONS.map(opt => (
                <button
                  key={opt.days}
                  onClick={() => setDays(opt.days)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                    days === opt.days
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <Button variant="ghost" onClick={load} title="Muat ulang">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        }
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users} label="Sesi Unik"
          value={loading ? "…" : stats?.totalSessions ?? 0}
          sub="pengunjung unik" color="blue"
        />
        <StatCard
          icon={Eye} label="Page Views"
          value={loading ? "…" : stats?.pageViews ?? 0}
          sub="halaman dibuka" color="emerald"
        />
        <StatCard
          icon={Zap} label="Aksi"
          value={loading ? "…" : stats?.actions ?? 0}
          sub="klik, download, search" color="amber"
        />
        <StatCard
          icon={MapPin} label="Kota Terbanyak"
          value={loading ? "…" : (stats?.topCity || "—")}
          sub={`${stats?.uniqueUsers ?? 0} pengguna login`} color="violet"
        />
      </div>

      {/* ── Trend line chart ── */}
      <Section title={`Tren Aktivitas — ${FILTER_OPTIONS.find(o => o.days === days)?.label}`}>
        {loading ? (
          <div className="h-52 flex items-center justify-center text-slate-400 text-sm">Memuat...</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={timeline} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={35} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                formatter={(v, name) => [v, name === "sessions" ? "Sesi" : "Page Views"]}
              />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }}
                formatter={v => v === "sessions" ? "Sesi Unik" : "Page Views"}
              />
              <Line type="monotone" dataKey="sessions"  stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="sessions" />
              <Line type="monotone" dataKey="pageViews" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="pageViews" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Section>

      {/* ── Top pages + Top actions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Top 10 Halaman Dikunjungi">
          {loading ? (
            <div className="h-52 flex items-center justify-center text-slate-400 text-sm">Memuat...</div>
          ) : pages.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-10">Belum ada data</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, pages.length * 36)}>
              <BarChart data={pages} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="pageName" width={140} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                  formatter={v => [v, "Views"]} />
                <Bar dataKey="views" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Section>

        <Section title="Top 10 Aksi Dilakukan">
          {loading ? (
            <div className="h-52 flex items-center justify-center text-slate-400 text-sm">Memuat...</div>
          ) : actions.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-10">Belum ada data</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, actions.length * 36)}>
              <BarChart data={actions} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="eventName" width={160} tick={{ fontSize: 10 }}
                  tickFormatter={fmtAction} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                  formatter={(v, n, p) => [v, fmtAction(p.payload.eventName)]} />
                <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Section>
      </div>

      {/* ── Device breakdown + Hourly distribution ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Device Pengunjung">
          {loading ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Memuat...</div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="55%" height={180}>
                <PieChart>
                  <Pie
                    data={devices} cx="50%" cy="50%"
                    innerRadius={45} outerRadius={70}
                    dataKey="count" paddingAngle={3}
                  >
                    {devices.map((entry) => (
                      <Cell key={entry.device} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                    formatter={(v, n, p) => [v, p.payload.device]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-3">
                {devices.map(d => (
                  <div key={d.device} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: d.fill }} />
                    <span className="text-sm text-slate-600">{d.device}</span>
                    <span className="text-sm font-semibold text-slate-800 ml-auto pl-4">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>

        <Section title="Jam Aktif (Page Views)">
          {loading ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Memuat...</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={hourly} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="hour" tick={{ fontSize: 9 }}
                  tickFormatter={h => h % 3 === 0 ? `${h}:00` : ""} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                  formatter={(v) => [v, "Page Views"]}
                  labelFormatter={h => `Jam ${h}:00–${h}:59`}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Section>
      </div>

      {/* ── Top cities ── */}
      {(loading || cities.length > 0) && (
        <Section title="Kota Terbanyak (per sesi unik)">
          {loading ? (
            <p className="text-slate-400 text-sm text-center py-4">Memuat...</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {cities.map((c, i) => (
                <div key={c.city} className="flex items-center gap-2.5 bg-slate-50 rounded-lg px-3 py-2.5">
                  <span className="text-lg font-bold text-slate-300">#{i + 1}</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{c.city}</p>
                    <p className="text-xs text-slate-400">{c.sessions} sesi</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* ── Recent events table ── */}
      <Section title="Aktivitas Terbaru (50 terakhir)">
        {loading ? (
          <p className="text-slate-400 text-sm text-center py-6">Memuat...</p>
        ) : recent.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-10">Belum ada aktivitas yang tercatat.</p>
        ) : (
          <div className="overflow-x-auto -mx-5 -mb-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500">Waktu</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">Halaman / Aksi</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">User</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">Platform</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">Device</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500">Kota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recent.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                      {fmtTime(ev.timestamp)}
                    </td>
                    <td className="px-3 py-2.5 max-w-[200px]">
                      <p className="text-xs font-medium text-slate-700 truncate">
                        {ev.eventType === "page_view" ? ev.pageName : fmtAction(ev.eventName)}
                      </p>
                      {ev.eventType !== "page_view" && (
                        <p className="text-xs text-slate-400 truncate">{ev.pageName}</p>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-500">
                      {ev.userRole ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                          {ev.userRole}
                        </span>
                      ) : (
                        <span className="text-slate-300">pengunjung</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <PlatformBadge platform={ev.platform} />
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="flex items-center gap-1">
                        <DeviceIcon device={ev.device} />
                        <span className="text-xs text-slate-500">{ev.browser}</span>
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-xs text-slate-500">
                      {ev.city || <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}
