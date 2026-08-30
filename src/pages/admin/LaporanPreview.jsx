import { useEffect, useState, useRef, useContext } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { useReactToPrint } from "react-to-print";
import { Printer, Download, ArrowLeft, AlertCircle, ChevronRight, FileText } from "lucide-react";
import { db } from "../../firebase/config";
import { useLoading } from "../../context/LoadingContext";
import { AuthContext } from "../../context/AuthContext";
import { TEMPLATES, getTemplate } from "../../templates/laporan";
import { downloadLhppDocx } from "../../utils/exportLhppDocx";

// ─── Sections catalogue ───────────────────────────────────────────────────────
const SECTIONS = [
  { code: "A.1", label: "Spesifikasi Teknik PHB TM" },
  { code: "A.2", label: "Spesifikasi Teknik Saluran TM" },
  { code: "A.3", label: "Spesifikasi Teknik Trafo" },
  { code: "A.4", label: "Spesifikasi Teknik Kabel TR" },
  { code: "A.5", label: "Spesifikasi Teknik PHB TR" },
  { code: "A.6", label: "Hasil Uji Pabrik / Sertifikat Produk" },
  { code: "B.1", label: "Konstruksi" },
  { code: "B.2", label: "Sistem Pembumian" },
  { code: "B.3", label: "Pengaman Elektrik" },
  { code: "B.4", label: "Pengaman Mekanik" },
  { code: "B.5", label: "Jarak Bebas (Clearance Distance)" },
  { code: "B.6", label: "Gambar Diagram Satu Garis (Single Line Diagram)" },
  { code: "B.7", label: "Gambar Tata Letak Peralatan Utama" },
  { code: "C.1", label: "Hasil Uji Peralatan — Tahanan Isolasi" },
  { code: "C.2", label: "Pengukuran Tahanan Pembumian" },
  { code: "C.3", label: "Evaluasi Hasil Uji Peralatan" },
  { code: "C.4", label: "Pengujian Sistem — Foto Pelaksanaan Uji" },
  { code: "D",   label: "Data Hasil Uji" },
  { code: "E",   label: "Rekomendasi Laik Operasi" },
];

const GROUP_META = {
  A: { label: "A. Pemeriksaan Dokumen",             badge: "bg-amber-100 text-amber-700",   heading: "text-amber-600" },
  B: { label: "B. Kesesuaian Dokumen",              badge: "bg-blue-100 text-blue-700",     heading: "text-blue-600" },
  C: { label: "C. Hasil Evaluasi",                  badge: "bg-emerald-100 text-emerald-700", heading: "text-emerald-600" },
  D: { label: "D. Data Hasil Uji",                  badge: "bg-purple-100 text-purple-700", heading: "text-purple-600" },
  E: { label: "E. Rekomendasi & Sertifikasi",       badge: "bg-indigo-100 text-indigo-700", heading: "text-indigo-600" },
};

const A4_SCREEN_PX = 810; // 210mm + margins at 96 dpi, with small buffer

export default function LaporanPreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const sectionCode = searchParams.get("section"); // null = index page
  const { startLoading, stopLoading } = useLoading();
  const { loading: authLoading } = useContext(AuthContext);
  const printRef = useRef(null);

  // Kalau dibuka dari new tab (window.open), tidak ada history → tutup tab.
  // Kalau ada history (navigasi dalam SPA), mundur satu langkah.
  const handleBack = () => {
    if (window.history.length <= 1) {
      window.close();
    } else {
      navigate(-1);
    }
  };

  const [data, setData] = useState(null);
  const [instansi, setInstansi] = useState(null);
  const [error, setError] = useState(null);
  const [docZoom, setDocZoom] = useState(1);

  useEffect(() => {
    const recalc = () => {
      const vw = window.innerWidth;
      setDocZoom(vw < A4_SCREEN_PX ? (vw - 8) / A4_SCREEN_PX : 1);
    };
    recalc();
    window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, []);

  // realtime ke pengujian — langsung fire tanpa tunggu auth (route publik)
  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(
      doc(db, "pengujian", id),
      (snap) => {
        if (!snap.exists()) return setError("Dokumen pengujian tidak ditemukan.");
        setData({ id: snap.id, ...snap.data() });
      },
      (err) => { console.error(err); setError(err.message); }
    );
    return () => unsub();
  }, [id]);

  // realtime ke instansi (kalau ada)
  useEffect(() => {
    if (!data?.instansiId) { setInstansi(null); return; }
    const unsub = onSnapshot(
      doc(db, "instansi", data.instansiId),
      (snap) => setInstansi(snap.exists() ? { id: snap.id, ...snap.data() } : null)
    );
    return () => unsub();
  }, [data?.instansiId]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `laporan-${data?.nama || "pengujian"}`,
    pageStyle: `
      @page { size: A4 portrait; margin: 0; }
      @media print {
        body { background: #fff !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        .laporan-print { zoom: 1 !important; transform: none !important; }
        .laporan-form { page-break-after: always; margin: 0 !important; padding: 0 !important; box-shadow: none !important; }
        .laporan-form:last-child { page-break-after: auto; }
        .laporan-page { box-shadow: none !important; margin: 0 !important; width: 210mm !important; }
        .laporan-section { page-break-inside: avoid; }
        img { max-width: 100% !important; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      }
    `,
  });

  const [pdfLoading, setPdfLoading] = useState(false);

  const handleExport = async () => {
    if (!data) return;
    setPdfLoading(true);
    startLoading("Membuat Word…");
    try {
      const filename = `LHPP-${slug(instansi?.nama)}-${slug(data?.nama)}-${dateTag()}.docx`;
      await downloadLhppDocx(data, instansi, filename);
    } catch (err) {
      console.error(err);
      alert("Gagal export Word: " + (err.message || ""));
    } finally {
      stopLoading();
      setPdfLoading(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-slate-700">{error}</p>
          <button onClick={handleBack} className="mt-4 text-blue-600 underline">
            Kembali
          </button>
        </div>
      </div>
    );
  }
  if (!data) return <div className="p-10 text-center text-slate-500">Memuat laporan...</div>;

  const Template = getTemplate(instansi?.templateId);
  const missingInstansi = !data.instansiId || !instansi;
  const activeSection = SECTIONS.find(s => s.code === sectionCode);
  const groupKey = sectionCode ? sectionCode.split(".")[0] : null;
  const groupMeta = groupKey ? GROUP_META[groupKey] : null;

  // ── Index page (no section selected) ───────────────────────────────────────
  if (!sectionCode) {
    return (
      <div className="min-h-screen bg-slate-50 pb-16">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 text-slate-600 hover:text-slate-900 text-sm shrink-0"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{data.nama || "(Tanpa nama)"}</p>
              <p className="text-xs text-slate-500 truncate">
                {instansi?.nama ?? "Instansi belum dipilih"}
              </p>
            </div>
            <button
              onClick={handleExport}
              disabled={pdfLoading}
              title="Download Word lengkap (.docx)"
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 shadow disabled:opacity-60 shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              {pdfLoading ? "Membuat…" : "Word Lengkap"}
            </button>
          </div>
          {missingInstansi && (
            <div className="bg-amber-50 border-t border-amber-200 px-4 py-2 text-xs text-amber-800 text-center">
              ⚠ Instansi belum dipilih. Buka form & pilih instansi untuk hasil yang benar.
            </div>
          )}
        </div>

        {/* Body */}
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-7">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-800">Preview Bagian Laporan</h1>
              <p className="text-xs text-slate-500">Pilih bagian untuk melihat preview</p>
            </div>
          </div>

          {Object.entries(GROUP_META).map(([gKey, { label, badge, heading }]) => {
            const items = SECTIONS.filter(s => s.code.startsWith(gKey));
            if (!items.length) return null;
            return (
              <div key={gKey}>
                <p className={`text-[11px] font-bold uppercase tracking-widest mb-2 ${heading}`}>
                  {label}
                </p>
                <div className="space-y-2">
                  {items.map(section => (
                    <button
                      key={section.code}
                      onClick={() => setSearchParams({ section: section.code })}
                      className="w-full flex items-center gap-3 bg-white border border-slate-200
                        rounded-xl px-4 py-3 text-left hover:bg-slate-50 hover:border-slate-300
                        transition-all group shadow-sm"
                    >
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md shrink-0 ${badge}`}>
                        {section.code}
                      </span>
                      <span className="flex-1 text-sm text-slate-700 font-medium leading-snug">
                        {section.label}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

        </div>
      </div>
    );
  }

  // ── Single-section preview ──────────────────────────────────────────────────
  return (
    <div className="bg-slate-200 min-h-screen pb-20">
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm print:hidden">
        <div className="max-w-5xl mx-auto px-3 py-2 flex flex-wrap items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-slate-600 hover:text-slate-900 text-sm shrink-0"
          >
            <ArrowLeft className="w-4 h-4" /> Daftar Bagian
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              {groupMeta && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md shrink-0 ${groupMeta.badge}`}>
                  {sectionCode}
                </span>
              )}
              <p className="text-sm font-semibold truncate">
                {activeSection?.label || sectionCode}
              </p>
            </div>
            <p className="text-xs text-slate-500 truncate">{data.nama || "(Tanpa nama)"}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            {sectionCode === "E" && (
              <button
                onClick={() => window.open(`/dashboard/pekerjaan/new?pengujianId=${id}`, "_blank")}
                title="Buat dokumen RLO + SKLO resmi"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs sm:text-sm hover:bg-indigo-700 shadow"
              >
                <FileText className="w-4 h-4" /> Buat Dokumen RLO
              </button>
            )}
            <button
              onClick={handlePrint}
              title="Download PDF bagian ini"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs sm:text-sm hover:bg-amber-700 shadow"
            >
              <Download className="w-4 h-4" /> Download PDF
            </button>
          </div>
        </div>

        {missingInstansi && (
          <div className="bg-amber-50 border-t border-amber-200 px-4 py-2 text-xs text-amber-800 text-center">
            ⚠ Instansi belum dipilih. Laporan dirender dengan template default.
          </div>
        )}
      </div>

      <div className="py-4 overflow-x-hidden">
        <div
          ref={printRef}
          className="laporan-print"
          style={{ zoom: docZoom, transformOrigin: "top center" }}
        >
          <Template data={data} instansi={instansi} sectionCode={sectionCode} />
        </div>
      </div>

      <style>{`
        .laporan-page { box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
        body { overflow-x: hidden; max-width: 100vw; }

        @media print {
          /* ── Halaman A4 ── */
          @page { size: A4 portrait; margin: 15mm; }

          /* ── Reset browser ── */
          body {
            margin: 0; padding: 0;
            background: #fff !important;
            overflow-x: visible; max-width: none;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          /* ── Sembunyikan UI ── */
          .print\\:hidden { display: none !important; }

          /* ── Wrapper ── */
          .laporan-print { zoom: 1 !important; transform: none !important; }
          .laporan-form { page-break-after: always; margin: 0 !important; }
          .laporan-form:last-child { page-break-after: auto; }
          .laporan-page { box-shadow: none !important; margin: 0 !important; width: 100% !important; }
          .laporan-section { page-break-inside: avoid; }

          /* ── Heading jangan ditinggal sendirian di akhir halaman ── */
          h3 {
            break-after: avoid;
            page-break-after: avoid;
          }

          /* ── Tabel repeating header saat lintas halaman ── */
          thead { display: table-header-group; }

          /* ── Paksa halaman baru sebelum setiap section RLO ── */
          .rlo-pb {
            break-before: page;
            page-break-before: always;
          }

          /* ── Tabel RLO boleh lintas halaman; hanya baris yang dijaga ── */
          .rlo-pb table {
            page-break-inside: auto !important;
            break-inside: auto !important;
          }

          /* ── Jangan potong baris tabel di tengah ── */
          .rlo-row {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          /* ── Sub-header jangan tertinggal sendirian di bawah halaman ── */
          .rlo-subhdr {
            break-after: avoid;
            page-break-after: avoid;
          }

          /* ── Blok kesimpulan & status jangan terpotong ── */
          .no-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          /* ── Foto di baris tabel ── */
          .rlo-foto {
            max-height: 65px !important;
            max-width: 100% !important;
            object-fit: contain !important;
            display: block !important;
          }

          /* ── Paksa cetak background color ── */
          .rlo-status,
          .rlo-subhdr td,
          .rlo-tbl-hdr td {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* ── Font & shadow ── */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-shadow: none !important;
            text-shadow: none !important;
          }

          img { max-width: 100% !important; }
        }
      `}</style>
    </div>
  );
}

function slug(s = "") {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "").slice(0, 60) || "doc";
}
function dateTag() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}