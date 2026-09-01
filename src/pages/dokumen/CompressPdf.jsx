import { useState, useRef, useCallback } from "react";
import { jsPDF } from "jspdf";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;
import {
  FileText, Upload, Download, RefreshCw, X, CheckCircle, AlertCircle,
  Loader2, ZoomOut, Sliders,
} from "lucide-react";

const MAX_SIZE_MB = 50;
const STEPS = ["Pilih PDF", "Proses", "Unduh"];

const QUALITY_PRESETS = [
  { label: "Sangat Kecil",   desc: "~50 DPI — hanya untuk web / email",     imgQ: 0.38, scale: 0.5  },
  { label: "Kecil",          desc: "~72 DPI — kualitas rendah",             imgQ: 0.52, scale: 0.72 },
  { label: "Seimbang",       desc: "~96 DPI — standar layar, ukuran sedang", imgQ: 0.68, scale: 0.95 },
  { label: "Tinggi",         desc: "~120 DPI — kualitas cetak ringan",      imgQ: 0.82, scale: 1.2  },
];

function StepBar({ step }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((label, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                done   ? "bg-amber-500 text-white" :
                active ? "bg-amber-100 border-2 border-amber-500 text-amber-600" :
                         "bg-gray-100 text-gray-400"
              }`}>
                {done ? <CheckCircle size={16} /> : i + 1}
              </div>
              <span className={`text-xs mt-1 whitespace-nowrap ${
                active ? "text-amber-600 font-semibold" : done ? "text-amber-500" : "text-gray-400"
              }`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-16 h-0.5 mb-4 mx-1 ${i < step ? "bg-amber-500" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function CompressPdf() {
  const [phase, setPhase]           = useState("idle"); // idle | processing | done | error
  const [file, setFile]             = useState(null);
  const [preset, setPreset]         = useState(2); // index QUALITY_PRESETS
  const [progress, setProgress]     = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [result, setResult]         = useState(null); // { blob, filename, origSize, newSize }
  const [errorMsg, setErrorMsg]     = useState("");
  const [dragging, setDragging]     = useState(false);
  const inputRef = useRef(null);

  const step = phase === "idle" ? 0 : phase === "processing" ? 1 : phase === "done" ? 2 : 0;

  const validate = (f) => {
    if (!f) return "Pilih file PDF terlebih dahulu";
    if (f.type !== "application/pdf") return "File harus berformat PDF";
    if (f.size > MAX_SIZE_MB * 1024 * 1024) return `Ukuran maksimal ${MAX_SIZE_MB} MB`;
    return null;
  };

  const handleFileSelect = (f) => {
    const err = validate(f);
    if (err) { setErrorMsg(err); return; }
    setFile(f);
    setErrorMsg("");
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    handleFileSelect(e.dataTransfer.files[0]);
  }, []);

  const reset = () => {
    setPhase("idle");
    setFile(null);
    setProgress(0);
    setProgressMsg("");
    setResult(null);
    setErrorMsg("");
    if (result?.blobUrl) URL.revokeObjectURL(result.blobUrl);
  };

  const handleCompress = async () => {
    const err = validate(file);
    if (err) { setErrorMsg(err); return; }
    setErrorMsg("");
    setPhase("processing");
    setProgress(0);

    try {
      const { imgQ, scale } = QUALITY_PRESETS[preset];

      const arrayBuf = await file.arrayBuffer();
      const pdfDoc   = await pdfjsLib.getDocument({ data: arrayBuf }).promise;
      const totalPages = pdfDoc.numPages;

      // Tentukan orientasi berdasarkan halaman pertama
      const firstPage  = await pdfDoc.getPage(1);
      const firstVP    = firstPage.getViewport({ scale });
      const isPortrait = firstVP.height >= firstVP.width;

      const jspdfDoc = new jsPDF({
        orientation: isPortrait ? "portrait" : "landscape",
        unit: "pt",
        format: "a4",
        compress: true,
      });

      const canvas = document.createElement("canvas");
      const ctx    = canvas.getContext("2d");

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        setProgressMsg(`Memproses halaman ${pageNum} / ${totalPages}…`);
        setProgress(Math.round(((pageNum - 1) / totalPages) * 100));

        const page = await pdfDoc.getPage(pageNum);
        const vp   = page.getViewport({ scale });

        canvas.width  = vp.width;
        canvas.height = vp.height;

        await page.render({ canvasContext: ctx, viewport: vp }).promise;

        const imgData = canvas.toDataURL("image/jpeg", imgQ);

        // Ukuran halaman dalam pt (A4 = 595.28 x 841.89)
        const pdfW = isPortrait ? 595.28 : 841.89;
        const pdfH = isPortrait ? 841.89 : 595.28;

        if (pageNum > 1) {
          jspdfDoc.addPage([pdfW, pdfH], isPortrait ? "portrait" : "landscape");
        }

        jspdfDoc.addImage(imgData, "JPEG", 0, 0, pdfW, pdfH, undefined, "FAST");
      }

      setProgress(100);
      setProgressMsg("Menyimpan file…");

      const blob     = jspdfDoc.output("blob");
      const blobUrl  = URL.createObjectURL(blob);
      const baseName = file.name.replace(/\.pdf$/i, "");

      setResult({
        blobUrl,
        filename: `${baseName}_compressed.pdf`,
        origSize: file.size,
        newSize:  blob.size,
      });
      setPhase("done");
    } catch (e) {
      console.error(e);
      setErrorMsg("Kompresi gagal: " + (e?.message ?? "coba file lain"));
      setPhase("error");
    }
  };

  const triggerDownload = () => {
    if (!result?.blobUrl) return;
    const a  = document.createElement("a");
    a.href   = result.blobUrl;
    a.download = result.filename;
    a.click();
  };

  const fmt = (bytes) => {
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  const reduction = result
    ? Math.round((1 - result.newSize / result.origSize) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white border border-orange-200 rounded-2xl px-5 py-3 mb-4 shadow-sm">
            <div className="bg-orange-100 p-2 rounded-lg">
              <FileText size={22} className="text-orange-500" />
            </div>
            <ZoomOut size={18} className="text-gray-400" />
            <div className="bg-green-100 p-2 rounded-lg">
              <FileText size={22} className="text-green-500" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Kompres PDF</h1>
          <p className="text-gray-500 text-sm mt-1">Perkecil ukuran file PDF tanpa mengirim ke server</p>
        </div>

        <StepBar step={step} />

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          {/* ── IDLE / ERROR ── */}
          {(phase === "idle" || phase === "error") && (
            <div className="p-8">
              {/* Drop zone */}
              {!file ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onClick={() => inputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                    dragging
                      ? "border-amber-400 bg-amber-50"
                      : "border-gray-200 hover:border-amber-300 hover:bg-gray-50"
                  }`}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files?.[0])}
                  />
                  <div className="bg-orange-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Upload size={28} className="text-orange-500" />
                  </div>
                  <p className="text-gray-700 font-semibold mb-1">Seret &amp; lepas file PDF di sini</p>
                  <p className="text-gray-400 text-sm mb-4">atau klik untuk memilih file</p>
                  <span className="inline-block bg-amber-500 text-white text-sm font-medium px-5 py-2 rounded-lg">
                    Pilih File PDF
                  </span>
                  <p className="text-gray-400 text-xs mt-4">Maks. {MAX_SIZE_MB} MB · Format: PDF</p>
                </div>
              ) : (
                <div>
                  {/* File card */}
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 mb-6">
                    <div className="bg-red-100 p-3 rounded-lg shrink-0">
                      <FileText size={24} className="text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{file.name}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{fmt(file.size)}</p>
                    </div>
                    <button onClick={reset} className="text-gray-400 hover:text-red-500 p-1">
                      <X size={18} />
                    </button>
                  </div>

                  {/* Quality preset */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Sliders size={15} className="text-gray-500" />
                      <p className="text-sm font-semibold text-gray-700">Tingkat Kompresi</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {QUALITY_PRESETS.map((p, i) => (
                        <button
                          key={i}
                          onClick={() => setPreset(i)}
                          className={`text-left p-3 rounded-xl border-2 transition-all ${
                            preset === i
                              ? "border-amber-500 bg-amber-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <p className={`text-sm font-semibold ${preset === i ? "text-amber-700" : "text-gray-700"}`}>
                            {p.label}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{p.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleCompress}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
                  >
                    <ZoomOut size={18} />
                    Kompres PDF
                  </button>
                </div>
              )}

              {errorMsg && (
                <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  {errorMsg}
                </div>
              )}
            </div>
          )}

          {/* ── PROCESSING ── */}
          {phase === "processing" && (
            <div className="p-12 text-center">
              <div className="bg-orange-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-5">
                <Loader2 size={28} className="text-orange-500 animate-spin" />
              </div>
              <p className="font-semibold text-gray-700 mb-1">Mengompres PDF…</p>
              <p className="text-gray-400 text-sm mb-5">{progressMsg}</p>
              <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-400">{progress}%</p>
            </div>
          )}

          {/* ── DONE ── */}
          {phase === "done" && (
            <div className="p-8 text-center">
              <div className="bg-green-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-5">
                <CheckCircle size={36} className="text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-1">Kompresi Berhasil!</h2>

              {/* Size comparison */}
              <div className="flex items-center justify-center gap-4 my-5">
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-1">Sebelum</p>
                  <p className="text-lg font-bold text-gray-700">{fmt(result.origSize)}</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                    reduction > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                  }`}>
                    {reduction > 0 ? `-${reduction}%` : `+${Math.abs(reduction)}%`}
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-1">Sesudah</p>
                  <p className={`text-lg font-bold ${reduction > 0 ? "text-green-600" : "text-red-500"}`}>
                    {fmt(result.newSize)}
                  </p>
                </div>
              </div>

              {reduction <= 0 && (
                <div className="mb-4 flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-xs">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>PDF ini mayoritas berisi teks/vektor yang sudah sangat efisien. Coba preset <strong>Sangat Kecil</strong> untuk hasil lebih kecil, atau gunakan PDF To Word untuk mengedit isi.</span>
                </div>
              )}

              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-100 mb-6 text-left">
                <div className="bg-green-100 p-2.5 rounded-lg shrink-0">
                  <FileText size={20} className="text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm truncate">{result.filename}</p>
                  <p className="text-gray-400 text-xs">PDF Terkompresi</p>
                </div>
              </div>

              <button
                onClick={triggerDownload}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 mb-3"
              >
                <Download size={18} />
                Unduh PDF
              </button>
              <button
                onClick={reset}
                className="w-full border border-gray-200 text-gray-600 font-medium py-3 rounded-xl hover:bg-gray-50 transition flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} />
                Kompres File Lain
              </button>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          {[
            { icon: "🔒", title: "Privat",  desc: "File diproses langsung di browser, tidak dikirim ke server" },
            { icon: "⚡", title: "Cepat",   desc: "Kompresi tanpa koneksi internet" },
            { icon: "🖼️", title: "Gambar", desc: "Efektif untuk PDF berisi foto & scan" },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="text-2xl mb-1">{icon}</div>
              <p className="font-semibold text-gray-700 text-xs">{title}</p>
              <p className="text-gray-400 text-xs mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
