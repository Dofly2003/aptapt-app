import { useState, useRef, useCallback, useContext } from "react";
import { storage } from "../../firebase/config";
import { ref, uploadBytesResumable } from "firebase/storage";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../../firebase/config";
import { AuthContext } from "../../context/AuthContext";
import {
  FileText, Upload, Download, RefreshCw, X, CheckCircle, AlertCircle,
  ArrowRight, Loader2, FileOutput,
} from "lucide-react";

const MAX_SIZE_MB = 30;
const functions = getFunctions(app);
const convertFn = httpsCallable(functions, "convertPdfToWord", { timeout: 200000 });

const STEPS = ["Pilih PDF", "Konversi", "Unduh"];

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
                done ? "bg-amber-500 text-white" :
                active ? "bg-amber-100 border-2 border-amber-500 text-amber-600" :
                "bg-gray-100 text-gray-400"
              }`}>
                {done ? <CheckCircle size={16} /> : i + 1}
              </div>
              <span className={`text-xs mt-1 whitespace-nowrap ${active ? "text-amber-600 font-semibold" : done ? "text-amber-500" : "text-gray-400"}`}>
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

export default function PdfToWord() {
  const { user } = useContext(AuthContext);

  const [phase, setPhase] = useState("idle"); // idle | uploading | converting | done | error
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState(null); // { url, filename }
  const [errorMsg, setErrorMsg] = useState("");
  const [dragging, setDragging] = useState(false);

  const inputRef = useRef(null);

  const step = phase === "idle" ? 0 : phase === "uploading" || phase === "converting" ? 1 : phase === "done" ? 2 : 0;

  const validateFile = (f) => {
    if (!f) return "Pilih file terlebih dahulu";
    if (f.type !== "application/pdf") return "File harus berformat PDF";
    if (f.size > MAX_SIZE_MB * 1024 * 1024) return `Ukuran file maksimal ${MAX_SIZE_MB} MB`;
    return null;
  };

  const handleFileSelect = (f) => {
    const err = validateFile(f);
    if (err) { setErrorMsg(err); return; }
    setFile(f);
    setErrorMsg("");
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  }, []);

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);

  const reset = () => {
    setPhase("idle");
    setFile(null);
    setUploadProgress(0);
    setResult(null);
    setErrorMsg("");
  };

  const handleConvert = async () => {
    const err = validateFile(file);
    if (err) { setErrorMsg(err); return; }
    if (!user) { setErrorMsg("Harus login terlebih dahulu"); return; }

    setErrorMsg("");

    try {
      // ── 1. Upload PDF ke Firebase Storage ──────────────────────────────────
      setPhase("uploading");
      const ts = Date.now();
      const storagePath = `pdf_temp/${user.uid}/${ts}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, file);

      await new Promise((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snap) => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject,
          resolve,
        );
      });

      // ── 2. Panggil Firebase Function untuk konversi ──────────────────────
      setPhase("converting");
      const res = await convertFn({ storagePath });
      setResult(res.data);
      setPhase("done");

    } catch (e) {
      console.error(e);
      const msg = e?.message?.includes("iLovePDF") || e?.message?.includes("konversi")
        ? e.message
        : "Konversi gagal. Pastikan file PDF tidak terproteksi dan coba lagi.";
      setErrorMsg(msg);
      setPhase("error");
    }
  };

  const triggerDownload = () => {
    if (!result?.url) return;
    const a = document.createElement("a");
    a.href = result.url;
    a.download = result.filename;
    a.click();
  };

  const formatSize = (bytes) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 bg-white border border-amber-200 rounded-2xl px-5 py-3 mb-4 shadow-sm">
            <div className="bg-red-100 p-2 rounded-lg">
              <FileText size={22} className="text-red-500" />
            </div>
            <ArrowRight size={16} className="text-gray-400" />
            <div className="bg-blue-100 p-2 rounded-lg">
              <FileOutput size={22} className="text-blue-500" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">PDF ke Word</h1>
          <p className="text-gray-500 text-sm mt-1">Konversi PDF menjadi dokumen Word yang dapat diedit</p>
        </div>

        {/* Step bar */}
        <StepBar step={step} />

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          {/* ── IDLE: Drag & Drop ── */}
          {(phase === "idle" || phase === "error") && (
            <div className="p-8">
              {!file ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => inputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                    dragging ? "border-amber-400 bg-amber-50" : "border-gray-200 hover:border-amber-300 hover:bg-gray-50"
                  }`}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files?.[0])}
                  />
                  <div className="bg-amber-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Upload size={28} className="text-amber-500" />
                  </div>
                  <p className="text-gray-700 font-semibold mb-1">Seret & lepas file PDF di sini</p>
                  <p className="text-gray-400 text-sm mb-4">atau klik untuk memilih file</p>
                  <span className="inline-block bg-amber-500 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-amber-600 transition">
                    Pilih File PDF
                  </span>
                  <p className="text-gray-400 text-xs mt-4">Maks. {MAX_SIZE_MB} MB · Format: PDF</p>
                </div>
              ) : (
                <div>
                  {/* File preview card */}
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 mb-6">
                    <div className="bg-red-100 p-3 rounded-lg shrink-0">
                      <FileText size={24} className="text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{file.name}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{formatSize(file.size)}</p>
                    </div>
                    <button
                      onClick={reset}
                      className="text-gray-400 hover:text-red-500 transition p-1"
                      title="Hapus file"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <button
                    onClick={handleConvert}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
                  >
                    <FileOutput size={18} />
                    Konversi ke Word
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

          {/* ── UPLOADING ── */}
          {phase === "uploading" && (
            <div className="p-12 text-center">
              <div className="bg-amber-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-5">
                <Upload size={28} className="text-amber-500 animate-bounce" />
              </div>
              <p className="font-semibold text-gray-700 mb-1">Mengunggah PDF...</p>
              <p className="text-gray-400 text-sm mb-6">{uploadProgress}%</p>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* ── CONVERTING ── */}
          {phase === "converting" && (
            <div className="p-12 text-center">
              <div className="bg-blue-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-5">
                <Loader2 size={28} className="text-blue-500 animate-spin" />
              </div>
              <p className="font-semibold text-gray-700 mb-1">Mengonversi ke Word...</p>
              <p className="text-gray-400 text-sm">Proses ini bisa memakan waktu hingga 1 menit</p>
              <div className="mt-6 flex justify-center gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── DONE ── */}
          {phase === "done" && (
            <div className="p-8 text-center">
              <div className="bg-green-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-5">
                <CheckCircle size={36} className="text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-1">Konversi Berhasil!</h2>
              <p className="text-gray-500 text-sm mb-2">File Word siap diunduh</p>
              <p className="text-gray-400 text-xs mb-8">Link unduh berlaku selama 1 jam</p>

              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100 mb-6 text-left">
                <div className="bg-blue-100 p-2.5 rounded-lg shrink-0">
                  <FileOutput size={20} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm truncate">{result?.filename}</p>
                  <p className="text-gray-400 text-xs">Dokumen Word (.docx)</p>
                </div>
              </div>

              <button
                onClick={triggerDownload}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 mb-3"
              >
                <Download size={18} />
                Unduh File Word
              </button>
              <button
                onClick={reset}
                className="w-full border border-gray-200 text-gray-600 font-medium py-3 rounded-xl hover:bg-gray-50 transition flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} />
                Konversi File Lain
              </button>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          {[
            { icon: "🔒", title: "Aman", desc: "File otomatis dihapus setelah dikonversi" },
            { icon: "⚡", title: "Cepat", desc: "Konversi selesai dalam hitungan detik" },
            { icon: "📄", title: "Akurat", desc: "Teks, tabel, dan gambar tetap terjaga" },
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
