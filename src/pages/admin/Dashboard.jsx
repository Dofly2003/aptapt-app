import { useState, useEffect, useContext } from "react";
import { db } from "../../firebase/config";
import { collection, onSnapshot, getDocs } from "firebase/firestore";
import { AuthContext } from "../../context/AuthContext";
import {
  Building2, CheckCircle2, Clock, Layers, Timer, Activity,
} from "lucide-react";

/* ── sub-components ── */
function StatCard({ icon, label, value, sub, accent = "blue" }) {
  const palette = {
    blue:   "bg-blue-50 text-blue-600",
    amber:  "bg-amber-50 text-amber-600",
    green:  "bg-emerald-50 text-emerald-600",
    red:    "bg-red-50 text-red-600",
    purple: "bg-purple-50 text-purple-600",
    cyan:   "bg-cyan-50 text-cyan-600",
    slate:  "bg-slate-100 text-slate-500",
  };
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-start gap-3 hover:shadow-md transition-shadow">
      <div className={`p-2.5 rounded-lg shrink-0 ${palette[accent]}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        <p className="text-lg font-bold text-slate-800 truncate leading-tight mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="w-1 h-4 bg-amber-500 rounded-full shrink-0" />
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{children}</h3>
    </div>
  );
}

/* ── main component ── */
function Dashboard() {
  const { profile, role } = useContext(AuthContext);

  const [woTotal,    setWoTotal]    = useState(0);
  const [woProgress, setWoProgress] = useState(0);
  const [woDone,     setWoDone]     = useState(0);
  const [woPending,  setWoPending]  = useState(0);

  const [instansiCount, setInstansiCount] = useState(0);

  /* greeting */
  const hour = new Date().getHours();
  const greeting =
    hour < 11 ? "Selamat Pagi" :
    hour < 15 ? "Selamat Siang" :
    hour < 18 ? "Selamat Sore"  : "Selamat Malam";
  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  /* WO realtime */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "nidi_data"), (snap) => {
      const docs = snap.docs.map(d => d.data());
      setWoTotal(docs.length);
      setWoProgress(docs.filter(d => d.status === "process").length);
      setWoDone(docs.filter(d => d.status === "done").length);
      setWoPending(docs.filter(d => !d.status || d.status === "pending").length);
    }, () => {});
    return () => unsub();
  }, []);

  /* instansi count */
  useEffect(() => {
    getDocs(collection(db, "instansi"))
      .then(s => setInstansiCount(s.size))
      .catch(() => {});
  }, []);

  const woProgressPct = woTotal > 0 ? Math.round((woDone / woTotal) * 100) : 0;

  const firstName = profile?.name?.split(" ")[0] ?? "Admin";
  const roleLabel = { superadmin: "Super Admin", admin: "Admin",
                      finance: "Finance", editor: "Editor" }[role] ?? role;

  return (
    <div className="p-4 md:p-6 space-y-8 max-w-7xl mx-auto">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {greeting}, {firstName}
          </h1>
          <p className="text-sm text-slate-400 mt-1">{today}</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700
                           text-xs font-semibold rounded-full uppercase tracking-wide">
            {roleLabel}
          </span>
          {instansiCount > 0 && (role === "admin" || role === "superadmin") && (
            <span className="px-3 py-1.5 bg-slate-100 text-slate-600
                             text-xs font-medium rounded-full flex items-center gap-1.5">
              <Building2 size={12} />
              {instansiCount} Instansi
            </span>
          )}
        </div>
      </div>

      {/* ── WORK ORDER ── */}
      <div>
        <SectionLabel>Work Order — NIDI &amp; SLO</SectionLabel>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={<Layers size={18} />}
            label="Total WO" value={woTotal}
            sub="Semua status" accent="blue"
          />
          <StatCard
            icon={<Clock size={18} />}
            label="Diproses" value={woProgress}
            sub="Sedang berjalan" accent="amber"
          />
          <StatCard
            icon={<CheckCircle2 size={18} />}
            label="Selesai" value={woDone}
            sub={`${woProgressPct}% dari total`} accent="green"
          />
          <StatCard
            icon={<Timer size={18} />}
            label="Menunggu" value={woPending}
            sub="Belum diproses" accent="slate"
          />
        </div>

        {woTotal > 0 && (
          <div className="mt-3 bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <div className="flex justify-between items-center text-xs text-slate-500 mb-2">
              <span className="font-medium">Progress Penyelesaian WO</span>
              <span className="font-bold text-slate-700">{woProgressPct}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-amber-400 to-emerald-500 transition-all duration-700"
                style={{ width: `${woProgressPct}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                {woProgress} Diproses
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                {woDone} Selesai
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
                {woPending} Menunggu
              </span>
              <span className="flex items-center gap-1.5 ml-auto">
                <Activity size={12} />
                Realtime
              </span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

export default Dashboard;
