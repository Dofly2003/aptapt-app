import { useState, useEffect, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { AuthContext } from "../../context/AuthContext";
import {
  getAllDokumen, deleteDokumen, formatRupiah, hitungTotal,
} from "../../services/rabService";
import TemplateRabAdytia from "../../templates/rab/TemplateRabAdytia";
import OfflineBanner from "../../offline/OfflineBanner";
import {
  ArrowLeft, Printer, X, Eye, Plus, Trash2, FileText,
  ChevronRight, RefreshCw, Download, Loader2,
} from "lucide-react";
import { exportLaporanPdf } from "../../utils/exportLaporanPdf";
import { sanitizeFilename } from "../../utils/exportDocPdf";

/* Wrapper yang mengkoreksi layout space akibat CSS transform:scale */
function ScaledPreview({ scale, children }) {
  const innerRef = useRef(null);
  const [innerH, setInnerH] = useState(0);

  useEffect(() => {
    if (!innerRef.current) return;
    const ro = new ResizeObserver(([entry]) => setInnerH(entry.contentRect.height));
    ro.observe(innerRef.current);
    return () => ro.disconnect();
  }, []);

  const visualH = innerH * scale;

  return (
    <div style={{ width: 794 * scale, height: visualH || undefined, overflow: "hidden" }}>
      <div ref={innerRef} style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: 794 }}>
        {children}
      </div>
    </div>
  );
}

const STATUS_COLOR = {
  draft:    "bg-amber-100 text-amber-700",
  final:    "bg-emerald-100 text-emerald-700",
  sent:     "bg-blue-100 text-blue-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-600",
};
const STATUS_LABEL = {
  draft: "Draft", final: "Final", sent: "Terkirim",
  approved: "Disetujui", rejected: "Ditolak",
};

export default function MobileRab() {
  const { role } = useContext(AuthContext);
  const navigate = useNavigate();

  const [list, setList]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState("all");
  const [delTarget, setDelTarget] = useState(null);

  /* preview */
  const [previewDoc, setPreviewDoc]           = useState(null);
  const [previewInstansi, setPreviewInstansi] = useState(null);
  const [previewScale, setPreviewScale]       = useState(0.47);
  const [pdfMargin, setPdfMarginState]        = useState(() => Number(localStorage.getItem("pdf_margin") ?? 10));
  const [fontScale, setFontScaleState]        = useState(() => Number(localStorage.getItem("pdf_fontscale") ?? 1));
  const pdfRenderRef  = useRef(null);
  const previewDocRef = useRef(null);
  const [instansiLoading, setInstansiLoading]   = useState(false);
  const [downloading, setDownloading]           = useState(false);
  const [downloadStatus, setDownloadStatus]     = useState("");

  const setPdfMargin = (v) => {
    const n = Math.max(5, Math.min(25, v));
    setPdfMarginState(n);
    localStorage.setItem("pdf_margin", n);
  };

  const setFontScale = (v) => {
    const n = Math.max(0.8, Math.min(1.4, Math.round(v * 10) / 10));
    setFontScaleState(n);
    localStorage.setItem("pdf_fontscale", n);
  };

  const handleDownload = async () => {
    if (!pdfRenderRef.current || downloading) return;
    setDownloading(true);
    setDownloadStatus("");
    const el = pdfRenderRef.current;
    el.style.opacity = "1";
    try {
      const docData  = previewDocRef.current || previewDoc;
      const rawName  = `RAB-${docData?.nomor || docData?.perihal || "dokumen"}`;
      const filename = sanitizeFilename(rawName) + ".pdf";
      await exportLaporanPdf(el, filename, ({ label }) => setDownloadStatus(label || ""));
    } catch (err) {
      console.error("Export PDF gagal:", err);
      setDownloadStatus("Gagal export");
      setTimeout(() => setDownloadStatus(""), 2500);
    } finally {
      if (pdfRenderRef.current) pdfRenderRef.current.style.opacity = "0";
      setDownloading(false);
    }
  };

  const openPreview = (item) => {
    previewDocRef.current = item;
    setPreviewDoc(item);
    window.history.pushState(null, "");
  };
  const closePreview = () => {
    previewDocRef.current = null;
    setPreviewDoc(null);
    window.history.back();
  };

  const canAccess = ["admin", "superadmin", "finance"].includes(role);

  /* ── load list ── */
  const load = async () => {
    setLoading(true);
    try { setList(await getAllDokumen({ type: "rab" })); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (canAccess) load(); }, [canAccess]);

  /* ── responsive scale ── */
  useEffect(() => {
    const calc = () => setPreviewScale(Math.min((window.innerWidth - 16) / 794, 1));
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  /* ── Android back closes preview overlay ── */
  useEffect(() => {
    const onPop = () => {
      if (previewDocRef.current) {
        previewDocRef.current = null;
        setPreviewDoc(null);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  /* ── fetch instansi when preview opens ── */
  useEffect(() => {
    if (!previewDoc?.instansiId) { setPreviewInstansi(null); return; }
    setInstansiLoading(true);
    getDoc(doc(db, "instansi", previewDoc.instansiId))
      .then(snap => setPreviewInstansi(snap.exists() ? { id: snap.id, ...snap.data() } : null))
      .catch(() => setPreviewInstansi(null))
      .finally(() => setInstansiLoading(false));
  }, [previewDoc?.instansiId]);


  /* ── delete ── */
  const handleDelete = async () => {
    if (!delTarget) return;
    await deleteDokumen(delTarget.id);
    setDelTarget(null);
    load();
  };

  const visible = filter === "all" ? list : list.filter(i => i.status === filter);

  if (!canAccess) return (
    <div className="p-6 text-center text-slate-400">
      <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
      <p className="font-medium text-slate-600">Akses ditolak</p>
      <button onClick={() => navigate(-1)} className="mt-4 text-amber-600 text-sm font-medium">Kembali</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <OfflineBanner />

      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3 pt-safe sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-slate-500 active:scale-90 transition-transform">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-slate-800">RAB / Penawaran</h1>
          <p className="text-xs text-slate-400">{list.length} dokumen tersimpan</p>
        </div>
        <button
          onClick={() => navigate("/app-mobile/rab/baru")}
          className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 text-white text-xs font-semibold rounded-xl active:scale-95 transition-transform">
          <Plus size={15} /> Buat RAB
        </button>
      </div>

      <div className="p-4 space-y-3">

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {["all", "draft", "final"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors
                ${filter === f ? "bg-amber-500 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>
              {f === "all"
                ? `Semua (${list.length})`
                : `${STATUS_LABEL[f] || f} (${list.filter(i => i.status === f).length})`}
            </button>
          ))}
          <button onClick={load}
            className="shrink-0 w-8 h-8 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-400 active:scale-90 transition-transform">
            <RefreshCw size={13} />
          </button>
        </div>

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-white rounded-2xl border border-slate-100 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && visible.length === 0 && (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 mx-auto text-slate-200 mb-3" />
            <p className="text-slate-400 text-sm font-medium">Belum ada RAB</p>
            <button onClick={() => navigate("/app-mobile/rab/baru")}
              className="mt-4 px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-xl active:scale-95">
              Buat RAB Pertama
            </button>
          </div>
        )}

        {visible.map(item => {
          const totals = hitungTotal(item.items, item.ppnAktif !== false);
          return (
            <div key={item.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-amber-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-semibold
                        ${STATUS_COLOR[item.status] || STATUS_COLOR.draft}`}>
                        {STATUS_LABEL[item.status] || item.status}
                      </span>
                      {item.nomor && (
                        <span className="text-[10px] text-slate-400 font-mono">{item.nomor}</span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {item.perihal || "(tanpa perihal)"}
                    </p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {item.kepada?.perusahaan || item.kepada?.yth || item.namaPelanggan || "—"}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-sm font-bold text-amber-600">
                        {formatRupiah(totals.grandTotal)}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {item.items?.length ?? 0} item · {item.tanggal || item.tanggalDibuat || ""}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-100 flex">
                <button
                  onClick={() => openPreview(item)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-amber-700 active:bg-amber-50 transition-colors">
                  <Eye size={15} />
                  Preview & Cetak
                </button>
                <div className="w-px bg-slate-100" />
                <button
                  onClick={() => navigate(`/app-mobile/rab/${item.id}`)}
                  className="px-4 flex items-center justify-center text-slate-400 active:bg-slate-50 transition-colors">
                  <ChevronRight size={16} />
                </button>
                <div className="w-px bg-slate-100" />
                <button
                  onClick={() => setDelTarget(item)}
                  className="px-4 flex items-center justify-center text-red-400 active:bg-red-50 transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Hidden full-res render untuk export PDF ──────────────────────────
          opacity:0 + dalam viewport → browser WAJIB layout & paint elemen ini
          sehingga scrollHeight valid dan dom-to-image-more bisa capture-nya.
          zIndex di bawah overlay (z-80) agar tidak terlihat user. */}
      {previewDoc && (
        <div
          ref={pdfRenderRef}
          aria-hidden="true"
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            width: 794,
            background: "#fff",
            pointerEvents: "none",
            opacity: 0,
            zIndex: 79,
          }}
        >
          <TemplateRabAdytia data={previewDoc} instansi={previewInstansi} pageMargin={pdfMargin} fontScale={fontScale} />
        </div>
      )}

      {/* ══════════ PREVIEW OVERLAY ══════════ */}
      {previewDoc && (
        <div className="fixed inset-0 z-[80] flex flex-col bg-white">

          {/* Chrome header */}
          <div className="mobile-preview-chrome flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white shrink-0 pt-safe"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
            <button onClick={closePreview}
              className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 active:scale-90 transition-transform shrink-0">
              <X size={18} />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">
                {previewDoc.perihal || "(tanpa perihal)"}
              </p>
              <p className="text-xs text-slate-400 truncate">{previewDoc.nomor || "—"}</p>
            </div>
            <button onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold active:scale-95 transition-transform shrink-0 disabled:opacity-60"
              style={{ background: "#003087" }}>
              {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {downloading ? (downloadStatus || "Proses...") : "Download PDF"}
            </button>
          </div>

          {/* Scaled preview */}
          <div className="flex-1 overflow-auto" style={{ background: "#5a5a5a" }}>
            <div className="py-4 flex justify-center">
              {instansiLoading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-20 text-white/60">
                  <Loader2 size={28} className="animate-spin" />
                  <span className="text-xs">Memuat data instansi...</span>
                </div>
              ) : (
                <ScaledPreview scale={previewScale}>
                  <TemplateRabAdytia data={previewDoc} instansi={previewInstansi} pageMargin={pdfMargin} fontScale={fontScale} />
                </ScaledPreview>
              )}
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mobile-preview-chrome border-t border-slate-200 bg-white px-4 py-3 pb-safe-nav shrink-0">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Zoom {Math.round(previewScale * 100)}% · Pratinjau A4</span>
              <div className="flex items-center gap-1.5">
                <span>Margin:</span>
                <button onClick={() => setPdfMargin(pdfMargin - 1)}
                  className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-bold text-sm leading-none active:bg-slate-200 flex items-center justify-center">−</button>
                <span className="w-8 text-center font-semibold text-slate-700">{pdfMargin}mm</span>
                <button onClick={() => setPdfMargin(pdfMargin + 1)}
                  className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-bold text-sm leading-none active:bg-slate-200 flex items-center justify-center">+</button>
              </div>
              <div className="flex items-center gap-1.5">
                <span>Font:</span>
                <button onClick={() => setFontScale(fontScale - 0.1)}
                  className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-bold text-sm leading-none active:bg-slate-200 flex items-center justify-center">−</button>
                <span className="w-8 text-center font-semibold text-slate-700">{Math.round(10 * fontScale)}pt</span>
                <button onClick={() => setFontScale(fontScale + 0.1)}
                  className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-bold text-sm leading-none active:bg-slate-200 flex items-center justify-center">+</button>
              </div>
            </div>
            <button onClick={handleDownload}
              disabled={downloading}
              className="w-full py-3 rounded-2xl text-white font-bold text-sm active:scale-[0.98] transition-transform flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: "#003087" }}>
              {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {downloading ? (downloadStatus || "Membuat PDF...") : "Download PDF"}
            </button>
          </div>
        </div>
      )}

      {/* ══════════ DELETE CONFIRM ══════════ */}
      {delTarget && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[55]" onClick={() => setDelTarget(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-3xl px-4 pt-3 pb-safe-sheet">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
            <p className="text-sm font-semibold text-slate-800 mb-1">Hapus RAB ini?</p>
            <p className="text-xs text-slate-400 mb-5">{delTarget.perihal} — {delTarget.nomor}</p>
            <div className="flex gap-3">
              <button onClick={() => setDelTarget(null)}
                className="flex-1 py-3 border border-slate-200 rounded-2xl text-sm font-medium text-slate-600 active:scale-95">
                Batal
              </button>
              <button onClick={handleDelete}
                className="flex-1 py-3 bg-red-500 text-white rounded-2xl text-sm font-semibold active:scale-95">
                Hapus
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
