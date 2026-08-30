import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { useReactToPrint } from "react-to-print";
import { Printer, ArrowLeft, AlertCircle, Edit2, Download, Loader2 } from "lucide-react";
import { db } from "../../firebase/config";
import TemplateInvoiceAdytia from "../../templates/invoice/TemplateInvoiceAdytia";
import { exportLaporanPdf } from "../../utils/exportLaporanPdf";

const A4_WIDTH_PX = 794;

export default function InvoicePreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const printRef = useRef(null);

  const scrollWrapperRef = useRef(null);
  const innerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [innerHeight, setInnerHeight] = useState(null);

  const [data, setData]       = useState(null);
  const [instansi, setInstansi] = useState(null);
  const [error, setError]     = useState(null);
  const [pdfMargin, setPdfMarginState] = useState(() => Number(localStorage.getItem("pdf_margin") ?? 10));
  const [fontScale, setFontScaleState] = useState(() => Number(localStorage.getItem("pdf_fontscale") ?? 1));
  const [downloading, setDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState("");

  const setPdfMargin = (v) => {
    const n = Math.max(5, Math.min(25, v));
    setPdfMarginState(n);
    localStorage.setItem("pdf_margin", n);
  };

  const setFontScale = (v) => {
    const n = Math.round(Math.max(0.8, Math.min(1.4, v)) * 10) / 10;
    setFontScaleState(n);
    localStorage.setItem("pdf_fontscale", n);
  };

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(
      doc(db, "dokumen_keuangan", id),
      (snap) => {
        if (!snap.exists()) return setError("Dokumen tidak ditemukan.");
        setData({ id: snap.id, ...snap.data() });
      },
      (err) => { console.error(err); setError(err.message); }
    );
    return () => unsub();
  }, [id]);

  useEffect(() => {
    if (!data?.instansiId) { setInstansi(null); return; }
    const unsub = onSnapshot(
      doc(db, "instansi", data.instansiId),
      (snap) => setInstansi(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    );
    return () => unsub();
  }, [data?.instansiId]);

  useEffect(() => {
    const calc = () => {
      const wrapper = scrollWrapperRef.current;
      if (!wrapper) return;
      const available = wrapper.offsetWidth - 24;
      setScale(Math.min(available / A4_WIDTH_PX, 1));
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, [data]);

  useEffect(() => {
    if (!innerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setInnerHeight(entry.contentRect.height);
    });
    ro.observe(innerRef.current);
    return () => ro.disconnect();
  }, [data]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Invoice-${data?.nomor || data?.id || "dokumen"}`,
    pageStyle: `
  @page { size: A4 portrait; margin: 0; }
  @media print {
    body { background: #fff !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .laporan-form { page-break-after: always; margin: 0 !important; padding: 0 !important; }
    .laporan-form:last-child { page-break-after: auto; }
    .laporan-page { box-shadow: none !important; margin: 0 !important; }
    .laporan-section { page-break-inside: avoid; }
    table { page-break-inside: avoid; }
    img { max-width: 100% !important; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  }
`,
  });

  // ===== Download PDF (pixel-perfect via SVG → PNG → jsPDF) =====
  const handleDownload = async () => {
    if (!printRef.current || downloading) return;
    setDownloading(true);
    try {
      const filename = `Invoice-${data?.nomor || data?.perihal || data?.id || "dokumen"}.pdf`;
      await exportLaporanPdf(printRef.current, filename, ({ label }) => setDownloadStatus(label));
    } catch (err) {
      console.error("Export PDF gagal:", err);
      setDownloadStatus("Gagal mengekspor PDF");
      setTimeout(() => setDownloadStatus(""), 3000);
    } finally {
      setDownloading(false);
    }
  };

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <p>{error}</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-blue-600 underline">Kembali</button>
      </div>
    </div>
  );
  if (!data) return <div className="p-10 text-center text-slate-500">Memuat...</div>;

  return (
    <div className="bg-slate-200 min-h-screen pb-12">
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm print:hidden">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2 sm:gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-slate-600 hover:text-slate-900 text-sm shrink-0 px-1 sm:px-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Kembali</span>
          </button>

          <div className="flex-1 min-w-0 hidden sm:block">
            <p className="text-sm font-semibold truncate">{data.perihal}</p>
            <p className="text-xs text-slate-500 truncate">{data.nomor}</p>
          </div>

          <div className="flex-1 min-w-0 sm:hidden">
            <p className="text-xs font-semibold truncate text-slate-900">{data.perihal}</p>
          </div>

          <div className="flex gap-1.5 sm:gap-2 shrink-0 items-center">
            {/* Font scale control */}
            <div className="flex items-center gap-1 px-2 py-1.5 border border-slate-200 rounded-lg text-slate-600 text-xs">
              <span className="hidden sm:inline text-slate-400">Font</span>
              <button onClick={() => setFontScale(fontScale - 0.1)}
                className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold">−</button>
              <span className="w-10 text-center font-semibold text-slate-700">{Math.round(fontScale * 100)}%</span>
              <button onClick={() => setFontScale(fontScale + 0.1)}
                className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold">+</button>
            </div>
            {/* Margin control */}
            <div className="flex items-center gap-1 px-2 py-1.5 border border-slate-200 rounded-lg text-slate-600 text-xs">
              <span className="hidden sm:inline text-slate-400">Margin</span>
              <button onClick={() => setPdfMargin(pdfMargin - 1)}
                className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold">−</button>
              <span className="w-8 text-center font-semibold text-slate-700">{pdfMargin}mm</span>
              <button onClick={() => setPdfMargin(pdfMargin + 1)}
                className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold">+</button>
            </div>
            <button
              onClick={() => navigate(`/Dashboard/invoice/${id}`)}
              className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-white border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
              <span className="hidden md:inline">Edit</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-white border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
              title="Print"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden md:inline">Print</span>
            </button>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white rounded-lg text-sm font-medium"
              title="Download PDF"
            >
              {downloading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Download className="w-4 h-4" />}
              <span className="hidden md:inline">{downloading ? (downloadStatus || "Proses...") : "Download PDF"}</span>
            </button>
          </div>
        </div>
      </div>

      <div ref={scrollWrapperRef} className="py-4 sm:py-6 px-2 sm:px-0">
        <div
          style={{
            height: innerHeight ? innerHeight * scale : "auto",
            overflow: "hidden",
            margin: "0 auto",
            width: scale < 1 ? "100%" : "auto",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              transform: scale < 1 ? `scale(${scale})` : "none",
              transformOrigin: "top center",
              width: A4_WIDTH_PX,
              flexShrink: 0,
            }}
          >
            <div ref={innerRef}>
              <div ref={printRef}>
                <TemplateInvoiceAdytia data={data} instansi={instansi} pageMargin={pdfMargin} fontScale={fontScale} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {scale < 1 && (
        <div className="fixed bottom-3 right-3 bg-slate-900/80 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-sm sm:hidden">
          Zoom {Math.round(scale * 100)}%
        </div>
      )}

      <style>{`
        .laporan-page { box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body { background: #fff !important; }
          .print\\:hidden { display: none !important; }
          .laporan-form .laporan-page { box-shadow: none !important; margin: 0 !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          table { page-break-inside: avoid; }
          img { max-width: 100% !important; }
          .laporan-form { page-break-after: always; margin: 0 !important; }
          .laporan-form:last-child { page-break-after: auto; }
          .laporan-section { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
