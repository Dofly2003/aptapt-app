import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../../firebase/config";
import { collection, onSnapshot, doc } from "firebase/firestore";
import { AuthContext } from "../../context/AuthContext";
import {
  Wallet, Package, FileText, Receipt,
  StickyNote, ClipboardList, Layers, ChevronRight, WifiOff, RefreshCw, Wrench,
} from "lucide-react";
import { isOnline, onNetworkChange } from "../../offline/networkWatcher";
import { getPendingCount, flushQueue, onSyncProgress } from "../../offline/syncEngine";

const fmtRp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

const ALL_MODULES = [
  { id: "keuangan",  label: "Keuangan",      desc: "Ledger, AP, AR, Anggaran, Arus Kas", path: "/app-mobile/keuangan",  Icon: Wallet,       color: "bg-blue-50 text-blue-600",    roles: ["superadmin","finance"] },
  { id: "inventori", label: "Inventori",      desc: "Stok barang, pergerakan & gudang",   path: "/app-mobile/inventori", Icon: Package,      color: "bg-emerald-50 text-emerald-600", roles: ["admin","superadmin","finance"] },
  { id: "rab",       label: "RAB / Penawaran",desc: "Rencana anggaran biaya",             path: "/app-mobile/rab",       Icon: FileText,     color: "bg-amber-50 text-amber-600",  roles: ["admin","superadmin"] },
  { id: "invoice",   label: "Invoice",        desc: "Tagihan & pembayaran",               path: "/app-mobile/invoice",   Icon: Receipt,      color: "bg-purple-50 text-purple-600",roles: ["admin","superadmin","finance"] },
  { id: "pengujian", label: "Form Pengujian", desc: "NIDI & SLO field",                   path: "/app-mobile/form-pengujian", Icon: ClipboardList, color: "bg-cyan-50 text-cyan-600", roles: ["admin","superadmin","finance","editor","user"] },
  { id: "catatan",    label: "Catatan",        desc: "Catatan lapangan",                   path: "/app-mobile/notes",        Icon: StickyNote,    color: "bg-rose-50 text-rose-600",    roles: ["admin","superadmin","finance","editor","user"] },
  { id: "alat-kerja", label: "Alat Kerja",    desc: "Inventaris alat lapangan & bengkel", path: "/app-mobile/alat-kerja",   Icon: Wrench,        color: "bg-orange-50 text-orange-600", roles: ["admin","superadmin"] },
];

export default function MobileHome() {
  const navigate = useNavigate();
  const { profile, role } = useContext(AuthContext);

  const [woAktif, setWoAktif] = useState(0);
  const [saldo,   setSaldo]   = useState(0);
  const [online,  setOnline]  = useState(isOnline());
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  /* Network + sync */
  useEffect(() => {
    const unsubNet = onNetworkChange(async (up) => {
      setOnline(up);
      if (up) setPendingCount(await getPendingCount());
    });
    const unsubSync = onSyncProgress(({ syncing: s, remaining }) => {
      setSyncing(s);
      if (remaining !== undefined) setPendingCount(remaining);
    });
    getPendingCount().then(setPendingCount);
    return () => { unsubNet(); unsubSync(); };
  }, []);

  /* WO aktif */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "work_orders"), (snap) => {
      setWoAktif(snap.docs.filter(d => d.data().status !== "done").length);
    }, () => {});
    return () => unsub();
  }, []);

  /* Saldo user */
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      setSaldo(snap.exists() ? (snap.data().saldo || 0) : 0);
    }, () => {});
    return () => unsub();
  }, []);

  const hour = new Date().getHours();
  const greeting =
    hour < 11 ? "Selamat Pagi" :
    hour < 15 ? "Selamat Siang" :
    hour < 18 ? "Selamat Sore"  : "Selamat Malam";

  const modules = ALL_MODULES.filter(m => m.roles.includes(role));

  return (
    <div className="min-h-screen bg-slate-50 pb-24">

      {/* ── Offline / sync bar ── */}
      {!online && (
        <div className="bg-amber-500 text-white text-xs px-4 py-2 flex items-center gap-2">
          <WifiOff size={13} />
          <span>Offline — perubahan disimpan lokal</span>
        </div>
      )}
      {online && pendingCount > 0 && (
        <div className="bg-blue-600 text-white text-xs px-4 py-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <RefreshCw size={12} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Menyinkronkan..." : `${pendingCount} item belum tersinkron`}
          </span>
          {!syncing && (
            <button onClick={async () => { setSyncing(true); await flushQueue(); setSyncing(false); setPendingCount(await getPendingCount()); }} className="underline">
              Sync
            </button>
          )}
        </div>
      )}

      {/* ── Header ── */}
      <div className="bg-white px-4 pt-5 pb-4 border-b border-slate-100">
        <p className="text-xs text-slate-400">{greeting}</p>
        <h1 className="text-xl font-bold text-slate-800 mt-0.5">
          {profile?.name?.split(" ")[0] ?? "Halo"} 👋
        </h1>
      </div>

      <div className="p-4 space-y-5">

        {/* ── Quick stats ── */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate("/app-mobile/form-pengujian")}
            className="bg-blue-600 text-white rounded-2xl p-4 text-left active:scale-95 transition-transform"
          >
            <div className="flex items-center gap-2 mb-2">
              <Layers size={16} className="opacity-80" />
              <span className="text-xs opacity-80">Work Order Aktif</span>
            </div>
            <p className="text-3xl font-bold">{woAktif}</p>
            <p className="text-xs opacity-70 mt-1 flex items-center gap-1">
              Lihat semua <ChevronRight size={12} />
            </p>
          </button>

          <div className="bg-emerald-600 text-white rounded-2xl p-4 text-left">
            <div className="flex items-center gap-2 mb-2">
              <Wallet size={16} className="opacity-80" />
              <span className="text-xs opacity-80">Saldo Anda</span>
            </div>
            <p className="text-lg font-bold leading-tight">{fmtRp(saldo)}</p>
            <p className="text-xs opacity-70 mt-1">Saldo aktif</p>
          </div>
        </div>

        {/* ── Modul ── */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
            Modul
          </p>
          <div className="grid grid-cols-2 gap-3">
            {modules.map(({ id, label, desc, path, Icon, color }) => (
              <button
                key={id}
                onClick={() => navigate(path)}
                className="bg-white rounded-2xl p-4 text-left shadow-sm border border-slate-100
                           active:scale-95 transition-transform flex flex-col gap-3"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                  <Icon size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 leading-tight">{label}</p>
                  <p className="text-xs text-slate-400 mt-0.5 leading-snug">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
