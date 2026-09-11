import { useState, useRef, useCallback } from "react";
import { X, UploadCloud, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { importPengujianZip } from "../utils/importPengujianZip";

/**
 * Modal import paket ZIP laporan ke satu dokumen pengujian.
 *
 * props:
 *   pengujianId : string
 *   uid         : string  (user.uid)
 *   onClose     : () => void
 *   onDone      : (summary) => void   // dipanggil setelah sukses
 */
export default function ImportZipModal({ pengujianId, uid, onClose, onDone }) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [log, setLog] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const pick = useCallback((f) => {
    if (!f) return;
    if (!/\.zip$/i.test(f.name)) {
      setError("File harus berformat .zip");
      return;
    }
    setError("");
    setResult(null);
    setFile(f);
  }, []);

  const run = async () => {
    if (!file || busy) return;
    setBusy(true);
    setError("");
    setPct(0);
    setLog("Memulai…");
    try {
      const summary = await importPengujianZip({
        file,
        pengujianId,
        uid,
        onProgress: (p) => setPct(p),
        onLog: (m) => setLog(m),
      });
      setResult(summary);
      onDone?.(summary);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Gagal mengimpor ZIP.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="text-sm font-bold text-slate-800">Import Paket ZIP Laporan</h3>
          <button onClick={onClose} disabled={busy} className="text-slate-400 hover:text-slate-700 disabled:opacity-40">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {!result && (
            <>
              <p className="text-xs text-slate-500 leading-relaxed">
                Pilih file <code className="bg-slate-100 px-1 rounded">POLTERA-import.zip</code>{" "}
                (berisi <code className="bg-slate-100 px-1 rounded">manifest.json</code> + folder{" "}
                <code className="bg-slate-100 px-1 rounded">photos/</code>). Data &amp; foto akan{" "}
                <b>ditambahkan/di-merge</b> ke dokumen ini — field yang sudah terisi tidak ditimpa.
              </p>

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  pick(e.dataTransfer.files?.[0]);
                }}
                onClick={() => inputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-xl px-4 py-8
                  text-center cursor-pointer hover:border-amber-400 hover:bg-amber-50/40 transition"
              >
                <UploadCloud className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <p className="text-sm text-slate-600">
                  {file ? file.name : "Klik atau seret file .zip ke sini"}
                </p>
                {file && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                )}
                <input
                  ref={inputRef}
                  type="file"
                  accept=".zip,application/zip"
                  className="hidden"
                  onChange={(e) => pick(e.target.files?.[0])}
                />
              </div>

              {busy && (
                <div>
                  <div className="h-2 bg-slate-100 rounded overflow-hidden">
                    <div className="h-full bg-amber-500 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> {log} ({pct}%)
                  </p>
                </div>
              )}

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                </p>
              )}
            </>
          )}

          {result && (
            <div className="space-y-3">
              <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex gap-1.5">
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Import selesai — <b>{result.photoCount}</b> foto pada{" "}
                  <b>{result.keyCount}</b> photoKey
                  {result.fieldsFilled.length > 0 && (
                    <>, mengisi field: {result.fieldsFilled.join(", ")}</>
                  )}
                  .
                </span>
              </p>
              {result.warnings.length > 0 && (
                <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 max-h-40 overflow-auto">
                  <p className="font-semibold mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> {result.warnings.length} peringatan
                  </p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}
              <p className="text-[11px] text-slate-500">
                Muat ulang halaman untuk melihat data terbaru di form.
              </p>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t flex justify-end gap-2 bg-slate-50">
          {!result ? (
            <>
              <button onClick={onClose} disabled={busy}
                className="px-3 py-2 text-sm rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40">
                Batal
              </button>
              <button onClick={run} disabled={!file || busy}
                className="px-4 py-2 text-sm rounded-lg text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-40 flex items-center gap-1.5">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                {busy ? "Mengimpor…" : "Import"}
              </button>
            </>
          ) : (
            <button onClick={() => { onClose(); window.location.reload(); }}
              className="px-4 py-2 text-sm rounded-lg text-white bg-blue-600 hover:bg-blue-700">
              Selesai &amp; Muat Ulang
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
