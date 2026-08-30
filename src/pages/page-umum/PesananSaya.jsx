import { useEffect, useState, useMemo } from "react";
import { db, auth, app } from "../../firebase/config";
import {
  collection, query, where, orderBy, onSnapshot,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Clock, Loader2, CheckCircle2, FileText, Download,
  MapPin, Zap, Copy, Check, X, MessageCircle, ArrowRight,
  Inbox, AlertCircle,
} from "lucide-react";
import LandingNav from "../../components/landing/LandingNav";
import { getPaymentSettings } from "../../services/paymentService";
import DownloadDocButton from "../../components/DownloadDocButton";

const STATUS_CONFIG = {
  pending: {
    label: "Belum Diproses",
    short: "Pending",
    color: "text-amber-700 bg-amber-100 border-amber-200",
    icon: Clock,
  },
  process: {
    label: "Dalam Proses",
    short: "Proses",
    color: "text-blue-700 bg-blue-100 border-blue-200",
    icon: Loader2,
  },
  done: {
    label: "Selesai",
    short: "Selesai",
    color: "text-emerald-700 bg-emerald-100 border-emerald-200",
    icon: CheckCircle2,
  },
};

const TABS = [
  { id: "all", label: "Semua" },
  { id: "pending", label: "Belum Diproses" },
  { id: "process", label: "Dalam Proses" },
  { id: "done", label: "Selesai" },
];

const formatRupiah = (n) => "Rp " + (n || 0).toLocaleString("id-ID");

const formatDate = (ts) => {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
};

const timeAgo = (ts) => {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - d.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "Baru saja";
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} hari lalu`;
  return formatDate(ts);
};

export default function PesananSaya() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [data, setData] = useState([]);
  const [hasFetched, setHasFetched] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [selected, setSelected] = useState(null);
  const [paymentSettings, setPaymentSettings] = useState(null);

  // ============ AUTH ============
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // ============ FETCH DATA ============
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "nidi_data"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      setData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setHasFetched(true);
    });
    return () => unsub();
  }, [user]);

  // ============ LOAD PAYMENT SETTINGS ============
  useEffect(() => {
    getPaymentSettings().then(setPaymentSettings).catch(console.error);
  }, []);

  // ============ DERIVED ============
  const counts = useMemo(() => ({
    all: data.length,
    pending: data.filter((d) => d.status === "pending").length,
    process: data.filter((d) => d.status === "process").length,
    done: data.filter((d) => d.status === "done").length,
  }), [data]);

  const filtered = useMemo(() => {
    if (activeTab === "all") return data;
    return data.filter((d) => d.status === activeTab);
  }, [data, activeTab]);

  // ============ DOWNLOAD ============
  const handleDownload = async (path) => {
    try {
      if (!auth.currentUser) {
        alert("Sesi login berakhir. Silakan login ulang.");
        return;
      }
      await auth.currentUser.getIdToken(true);
      const functions = getFunctions(app, "us-central1");
      const getUrl = httpsCallable(functions, "getSecureDownloadUrl");
      const res = await getUrl({ path });
      const a = document.createElement("a");
      a.href = res.data.url;
      a.download = path.split("/").pop();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Download error:", err);
      alert("Gagal mengunduh file. Coba lagi atau hubungi admin.");
    }
  };

  // ============ AUTH GUARD ============
  if (!authReady) {
    return (
      <>
        <LandingNav />
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <LandingNav />
        <div className="min-h-[70vh] flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
              <Package className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Login Diperlukan</h2>
            <p className="text-sm text-slate-500 mb-5">
              Silakan login untuk melihat pesanan dan status pengajuan NIDI/SLO Anda.
            </p>
            <a href="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg shadow-lg shadow-amber-500/30 transition">
              Masuk Sekarang <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <LandingNav />

      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-5xl mx-auto px-4 md:px-6 pt-20 pb-6 md:pt-24 md:pb-10">

          {/* HEADER */}
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Pesanan Saya</h1>
            <p className="text-sm text-slate-500 mt-1">
              Pantau status pengajuan NIDI & SLO Anda di sini
            </p>
          </div>

          {/* EMPTY STATE — user belum punya pesanan apapun */}
          {hasFetched && data.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white rounded-2xl border border-slate-200">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                <Inbox className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">Belum Ada Pesanan</h3>
              <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
                Anda belum mengajukan permohonan NIDI atau SLO. Mulai dari sekarang!
              </p>
              <a href="/daftar-nidi-slo"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg shadow-lg shadow-amber-500/30 transition">
                Buat Pengajuan <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          ) : (
            <>
              {/* TABS */}
              <div className="bg-white border border-slate-200 rounded-xl p-1 mb-5 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
                <div className="flex gap-1 min-w-max">
                  {TABS.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const count = counts[tab.id];
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                          flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition
                          ${isActive
                            ? "bg-amber-500 text-slate-900 shadow-sm"
                            : "text-slate-600 hover:bg-slate-50"}
                        `}
                      >
                        {tab.label}
                        {count > 0 && (
                          <span className={`
                            text-xs px-1.5 py-0.5 rounded
                            ${isActive ? "bg-slate-900/15" : "bg-slate-100 text-slate-500"}
                          `}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* LIST */}
              {!hasFetched ? (
                <SkeletonList />
              ) : filtered.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                  <p className="text-sm text-slate-400">📭 Tidak ada pesanan dalam kategori ini</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  {filtered.map((item) => (
                    <OrderCard key={item.id} item={item} onClick={() => setSelected(item)} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* BOTTOM SHEET / MODAL DETAIL */}
      <AnimatePresence>
        {selected && (
          <DetailSheet
            item={selected}
            onClose={() => setSelected(null)}
            onDownload={handleDownload}
            paymentSettings={paymentSettings}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ============ ORDER CARD ============ */
function OrderCard({ item, onClick }) {
  const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
  const StatusIcon = cfg.icon;
  const hasDoc = item.status === "done" && (item.sertifikatNidiUrl || item.sertifikatSloUrl);

  return (
    <div className="bg-white border border-slate-200 rounded-xl text-left hover:border-amber-300 hover:shadow-md transition group overflow-hidden">
      <button
        onClick={onClick}
        className="w-full p-4 text-left"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 truncate">{item.nama}</p>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{item.register}</p>
          </div>
          <span className={`
            inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border font-medium shrink-0
            ${cfg.color}
          `}>
            <StatusIcon className={`w-3 h-3 ${item.status === "process" ? "animate-spin" : ""}`} />
            {cfg.short}
          </span>
        </div>

        <p className="text-xs text-slate-500 mb-3 flex items-start gap-1">
          <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
          <span className="line-clamp-2">{item.alamat}{item.desa ? `, ${item.desa}` : ""}</span>
        </p>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <span className="text-xs text-slate-400">{timeAgo(item.createdAt)}</span>
          <span className="font-bold text-amber-600">{formatRupiah(item.total_harga)}</span>
        </div>
      </button>

      {hasDoc && (
        <div className="px-4 pb-3 pt-3 border-t border-slate-100">
          <p className="text-xs text-slate-500 mb-2 font-medium">Unduh Dokumen</p>
          <div className="flex gap-2">
            <DownloadDocButton label="NIDI" url={item.sertifikatNidiUrl} />
            <DownloadDocButton label="SLO"  url={item.sertifikatSloUrl} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ============ SKELETON ============ */
function SkeletonList() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 animate-pulse">
          <div className="flex justify-between gap-3 mb-3">
            <div className="flex-1">
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-slate-200 rounded w-1/2" />
            </div>
            <div className="h-6 bg-slate-200 rounded w-16" />
          </div>
          <div className="h-3 bg-slate-100 rounded w-full mb-2" />
          <div className="h-3 bg-slate-100 rounded w-2/3 mb-3" />
          <div className="flex justify-between">
            <div className="h-3 bg-slate-100 rounded w-20" />
            <div className="h-4 bg-slate-200 rounded w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============ DETAIL SHEET ============ */
function DetailSheet({ item, onClose, onDownload, paymentSettings }) {
  const [copied, setCopied] = useState(false);

  const copyRegister = async () => {
    try {
      await navigator.clipboard.writeText(item.register);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const handleWhatsApp = () => {
    const wa = paymentSettings?.whatsappNumber;
    if (!wa) {
      alert("Nomor WhatsApp admin belum tersedia");
      return;
    }
    const text = `Halo admin, saya mau menanyakan status pesanan saya.\n\n` +
                 `No Register: ${item.register}\n` +
                 `Atas nama: ${item.nama}\n` +
                 `Status saat ini: ${STATUS_CONFIG[item.status]?.label || item.status}`;
    window.open(
      `https://api.whatsapp.com/send?phone=${wa}&text=${encodeURIComponent(text)}`,
      "_blank"
    );
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 z-40"
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="
          fixed bottom-0 left-0 right-0 z-50 bg-white
          rounded-t-3xl md:rounded-2xl shadow-2xl
          max-h-[90vh] flex flex-col
          md:max-w-lg md:left-1/2 md:right-auto md:bottom-auto md:top-1/2
          md:-translate-x-1/2 md:-translate-y-1/2
        "
      >
        {/* Drag handle (mobile only) */}
        <div className="md:hidden pt-2 pb-1 flex justify-center shrink-0">
          <div className="w-10 h-1 bg-slate-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-3 pb-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="font-bold text-slate-900">Detail Pesanan</h2>
            <button
              onClick={copyRegister}
              className="font-mono text-xs text-slate-500 hover:text-amber-600 mt-0.5 inline-flex items-center gap-1.5 group"
            >
              {item.register}
              {copied
                ? <Check className="w-3 h-3 text-emerald-500" />
                : <Copy className="w-3 h-3 opacity-50 group-hover:opacity-100" />}
            </button>
          </div>
          <button onClick={onClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg p-1.5 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-5 py-5 space-y-5 flex-1">

          {/* Status & Timeline */}
          <StatusTimeline item={item} />

          {/* Identitas */}
          <DetailSection title="Identitas">
            <DetailRow label="Nama" value={item.nama} />
            <DetailRow label="NIK" value={item.nik || "—"} />
          </DetailSection>

          {/* Lokasi */}
          <DetailSection title="Lokasi">
            <DetailRow label="Alamat" value={item.alamat} />
            {item.desa && <DetailRow label="Desa" value={item.desa} />}
            {item.kecamatan && <DetailRow label="Kecamatan" value={item.kecamatan} />}
            {item.kota && <DetailRow label="Kota" value={item.kota} />}
          </DetailSection>

          {/* Instalasi */}
          <DetailSection title="Instalasi">
            <DetailRow label="Daya" value={item.daya} icon={<Zap className="w-3 h-3" />} />
            <DetailRow label="Peruntukan" value={item.peruntukan || "—"} />
            <DetailRow label="Paket" value={paketLabel(item.paket)} />
          </DetailSection>

          {/* Pembayaran */}
          <DetailSection title="Pembayaran">
            <DetailRow label="Total" value={formatRupiah(item.total_harga)} bold />
            <DetailRow label="Tanggal" value={formatDate(item.createdAt)} />
          </DetailSection>

          {/* Download (kalau done) */}
          {item.status === "done" && (item.sertifikatNidiUrl || item.sertifikatSloUrl) && (
            <div>
              <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
                Dokumen Selesai
              </p>
              <div className="space-y-2">
                {item.sertifikatNidiUrl && (
                  <a href={item.sertifikatNidiUrl} target="_blank" rel="noreferrer"
                    className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 transition shadow-md shadow-amber-500/30">
                    <Download className="w-4 h-4" />
                    Download NIDI
                  </a>
                )}
                {item.sertifikatSloUrl && (
                  <a href={item.sertifikatSloUrl} target="_blank" rel="noreferrer"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 transition">
                    <Download className="w-4 h-4" />
                    Download SLO
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Pending → tampilkan info bayar */}
          {item.status === "pending" && (
            <PendingPaymentInfo paymentSettings={paymentSettings} item={item} />
          )}

          {/* WhatsApp */}
          <button onClick={handleWhatsApp}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 transition">
            <MessageCircle className="w-4 h-4" />
            Hubungi Admin
          </button>
        </div>
      </motion.div>
    </>
  );
}

/* ============ STATUS TIMELINE ============ */
function StatusTimeline({ item }) {
  // Build steps berdasarkan paket
  const paket = item.paket || "paket";
  const steps = [
    { key: "submit",  label: "Pengajuan Diterima",  done: true },
    { key: "verify",  label: "Verifikasi Pembayaran", done: ["process", "done"].includes(item.status) },
    { key: "process", label: paket === "slo" ? "Proses Penerbitan SLO" :
                              paket === "nidi" ? "Proses Penerbitan NIDI" :
                                                  "Proses Penerbitan NIDI & SLO",
                       done: item.status === "done" },
    { key: "done",    label: "Dokumen Siap Diunduh", done: item.status === "done" },
  ];

  const currentStep = steps.findIndex((s) => !s.done);
  const activeIdx = currentStep === -1 ? steps.length - 1 : currentStep;

  return (
    <div className="bg-slate-50 rounded-xl p-4">
      <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-3">
        Progress Pengajuan
      </p>
      <div className="space-y-3">
        {steps.map((step, i) => {
          const isDone = step.done;
          const isCurrent = i === activeIdx && !isDone;
          return (
            <div key={step.key} className="flex items-start gap-3">
              <div className="flex flex-col items-center shrink-0">
                <div className={`
                  w-6 h-6 rounded-full flex items-center justify-center transition
                  ${isDone ? "bg-amber-500 text-slate-900" :
                    isCurrent ? "bg-blue-500 text-white" :
                    "bg-slate-200 text-slate-400"}
                `}>
                  {isDone ? <Check className="w-3.5 h-3.5" /> :
                   isCurrent ? <Loader2 className="w-3 h-3 animate-spin" /> :
                   <span className="text-[10px]">{i + 1}</span>}
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-0.5 h-6 mt-1 ${isDone ? "bg-amber-500" : "bg-slate-200"}`} />
                )}
              </div>
              <div className="flex-1 pt-0.5 pb-3">
                <p className={`text-sm ${
                  isDone ? "text-slate-900 font-medium" :
                  isCurrent ? "text-blue-700 font-medium" :
                  "text-slate-400"
                }`}>
                  {step.label}
                </p>
                {isCurrent && (
                  <p className="text-xs text-slate-500 mt-0.5">Sedang dalam tahap ini</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============ DETAIL ROW & SECTION ============ */
function DetailSection({ title, children }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">{title}</p>
      <dl className="space-y-1.5">{children}</dl>
    </div>
  );
}

function DetailRow({ label, value, bold, icon }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <dt className="text-slate-500 w-24 shrink-0 flex items-center gap-1">
        {icon}{label}
      </dt>
      <dd className={`flex-1 break-words ${bold ? "font-bold text-amber-600" : "text-slate-900"}`}>
        {value || "—"}
      </dd>
    </div>
  );
}

/* ============ PENDING PAYMENT INFO ============ */
function PendingPaymentInfo({ paymentSettings, item }) {
  const banks = paymentSettings?.banks || [];
  if (!banks.length) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <div className="flex items-start gap-2 mb-3">
        <AlertCircle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-900">Menunggu Pembayaran</p>
          <p className="text-xs text-amber-800 mt-0.5">
            Transfer ke salah satu rekening berikut, lalu konfirmasi via WhatsApp dengan No. Register di atas.
          </p>
        </div>
      </div>
      <div className="space-y-2">
        {banks.map((b, i) => (
          <div key={i} className="bg-white border border-amber-200 rounded-lg p-2.5 text-xs">
            <p className="font-semibold text-slate-900">{b.bankName}</p>
            <p className="font-mono font-bold text-sm text-slate-900 my-0.5">{b.accountNumber}</p>
            <p className="text-slate-600">a.n {b.accountName}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ HELPERS ============ */
function paketLabel(p) {
  if (p === "paket") return "NIDI + SLO";
  if (p === "slo") return "SLO";
  if (p === "nidi") return "NIDI";
  return p || "—";
}