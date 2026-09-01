import { useState, useRef, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Document, Packer, Paragraph, TextRun, PageBreak, AlignmentType } from "docx";
import {
  FileText, Upload, Download, RefreshCw, X, CheckCircle, AlertCircle,
  ArrowRight, Loader2, FileOutput,
} from "lucide-react";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

const MAX_SIZE_MB = 30;
const STEPS = ["Pilih PDF", "Konversi", "Unduh"];

function StepBar({ step }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((label, i) => {
        const done   = i < step;
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

// ── PDF text extraction helpers ──────────────────────────────────────────────

function extractLines(items) {
  if (!items.length) return [];

  // Normalize Y to top-down (pdfjs Y is bottom-up)
  const maxY = Math.max(...items.map(i => i.y));
  const norm  = items.map(i => ({ ...i, yTop: maxY - i.y }));

  // Sort: top → bottom, then left → right
  norm.sort((a, b) => {
    const dy = a.yTop - b.yTop;
    return Math.abs(dy) < 3 ? a.x - b.x : dy;
  });

  // Group into lines by proximity on Y axis
  const lines = [];
  let current = [norm[0]];

  for (let k = 1; k < norm.length; k++) {
    const last = current[current.length - 1];
    if (Math.abs(norm[k].yTop - last.yTop) < 4) {
      current.push(norm[k]);
    } else {
      lines.push(current);
      current = [norm[k]];
    }
  }
  lines.push(current);

  return lines;
}

function groupIntoParagraphs(lines) {
  if (!lines.length) return [];

  const paras  = [];
  let block    = [lines[0]];
  const avgH   = lines.reduce((s, l) => s + (l[0]?.h ?? 12), 0) / lines.length;
  const gapThr = avgH * 1.6; // gap bigger than 1.6× line height = new paragraph

  for (let i = 1; i < lines.length; i++) {
    const prevY = block[block.length - 1][0]?.yTop ?? 0;
    const currY = lines[i][0]?.yTop ?? 0;
    if (currY - prevY > gapThr) {
      paras.push(block);
      block = [lines[i]];
    } else {
      block.push(lines[i]);
    }
  }
  paras.push(block);
  return paras;
}

function lineToString(line) {
  return line.map(item => item.str).join(" ").replace(/\s+/g, " ").trim();
}

function isHeading(line, pgWidth) {
  // Detect centered text & larger font → treat as heading
  if (!line.length) return false;
  const h = line[0]?.h ?? 0;
  if (h < 13) return false;
  const midX   = (line[0].x + (line[line.length - 1].x + (line[line.length - 1].w ?? 0))) / 2;
  const pageMid = pgWidth / 2;
  return Math.abs(midX - pageMid) < pgWidth * 0.15;
}

async function pdfToDocxBlob(file, onProgress) {
  const arrayBuf = await file.arrayBuffer();
  const pdfDoc   = await pdfjsLib.getDocument({ data: arrayBuf }).promise;
  const total    = pdfDoc.numPages;

  const sections = [];

  for (let pn = 1; pn <= total; pn++) {
    onProgress(Math.round(((pn - 1) / total) * 85), `Mengekstrak halaman ${pn}/${total}…`);

    const page     = await pdfDoc.getPage(pn);
    const vp       = page.getViewport({ scale: 1 });
    const pgWidth  = vp.width;
    const content  = await page.getTextContent();

    const rawItems = content.items
      .filter(i => i.str && i.str.trim())
      .map(i => ({
        str: i.str,
        x:   i.transform[4],
        y:   i.transform[5],
        w:   i.width,
        h:   i.height,
      }));

    if (!rawItems.length) {
      // Empty page — still add a break between pages
      if (pn > 1) sections.push(new Paragraph({ children: [new PageBreak()] }));
      continue;
    }

    const lines   = extractLines(rawItems);
    const paras   = groupIntoParagraphs(lines);

    const pageParas = [];

    // Page break before each page except first
    if (pn > 1) pageParas.push(new Paragraph({ children: [new PageBreak()] }));

    for (const block of paras) {
      const lineStrings = block.map(lineToString).filter(Boolean);
      if (!lineStrings.length) continue;

      const firstLine    = block[0];
      const heading      = isHeading(firstLine, pgWidth);
      const lineH        = firstLine[0]?.h ?? 11;
      const fontSize     = Math.min(Math.max(Math.round(lineH * 0.9), 8), 28);
      const isBold       = lineH > 13 || heading;
      const alignment    = heading ? AlignmentType.CENTER : AlignmentType.LEFT;

      const text = lineStrings.join("\n");

      pageParas.push(
        new Paragraph({
          alignment,
          spacing: { after: heading ? 120 : 60 },
          children: [
            new TextRun({
              text,
              bold:     isBold,
              size:     fontSize * 2, // half-points
              font:     "Times New Roman",
            }),
          ],
        })
      );
    }

    sections.push(...pageParas);
  }

  onProgress(90, "Membangun dokumen Word…");

  const doc = new Document({
    sections: [{
      properties: {},
      children: sections,
    }],
  });

  onProgress(98, "Menyimpan…");
  return Packer.toBlob(doc);
}

// ── Component ────────────────────────────────────────────────────────────────

export default function PdfToWord() {
  const [phase,       setPhase]       = useState("idle");
  const [file,        setFile]        = useState(null);
  const [progress,    setProgress]    = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [result,      setResult]      = useState(null);
  const [errorMsg,    setErrorMsg]    = useState("");
  const [dragging,    setDragging]    = useState(false);
  const inputRef = useRef(null);

  const step = phase === "idle" ? 0 : phase === "converting" ? 1 : phase === "done" ? 2 : 0;

  const validate = (f) => {
    if (!f) return "Pilih file terlebih dahulu";
    if (f.type !== "application/pdf") return "File harus berformat PDF";
    if (f.size > MAX_SIZE_MB * 1024 * 1024) return `Ukuran file maksimal ${MAX_SIZE_MB} MB`;
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
  };

  const handleConvert = async () => {
    const err = validate(file);
    if (err) { setErrorMsg(err); return; }
    setErrorMsg("");
    setPhase("converting");

    try {
      const blob = await pdfToDocxBlob(file, (pct, msg) => {
        setProgress(pct);
        setProgressMsg(msg);
      });
      const baseName = file.name.replace(/\.pdf$/i, "");
      setResult({ blob, filename: `${baseName}.docx` });
      setPhase("done");
    } catch (e) {
      console.error(e);
      setErrorMsg("Konversi gagal: " + (e?.message ?? "coba file lain"));
      setPhase("error");
    }
  };

  const triggerDownload = () => {
    if (!result?.blob) return;
    const url = URL.createObjectURL(result.blob);
    const a   = document.createElement("a");
    a.href    = url;
    a.download = result.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatSize = (bytes) => {
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
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
          <p className="text-gray-500 text-sm mt-1">
            Konversi PDF menjadi dokumen Word yang <strong>dapat diedit</strong> — diproses langsung di browser
          </p>
        </div>

        <StepBar step={step} />

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          {/* ── IDLE / ERROR ── */}
          {(phase === "idle" || phase === "error") && (
            <div className="p-8">
              {!file ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
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
                  <p className="text-gray-700 font-semibold mb-1">Seret &amp; lepas file PDF di sini</p>
                  <p className="text-gray-400 text-sm mb-4">atau klik untuk memilih file</p>
                  <span className="inline-block bg-amber-500 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-amber-600 transition">
                    Pilih File PDF
                  </span>
                  <p className="text-gray-400 text-xs mt-4">Maks. {MAX_SIZE_MB} MB · Format: PDF</p>
                </div>
              ) : (
                <div>
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
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="mb-5 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
                    <strong>Catatan:</strong> Konversi mengekstrak teks langsung dari PDF. Hasilnya paling baik untuk PDF berbasis teks (laporan, dokumen). PDF hasil scan/foto tidak dapat diekstrak teksnya.
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

          {/* ── CONVERTING ── */}
          {phase === "converting" && (
            <div className="p-12 text-center">
              <div className="bg-blue-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-5">
                <Loader2 size={28} className="text-blue-500 animate-spin" />
              </div>
              <p className="font-semibold text-gray-700 mb-1">Mengonversi…</p>
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
              <h2 className="text-xl font-bold text-gray-800 mb-1">Konversi Berhasil!</h2>
              <p className="text-gray-500 text-sm mb-6">File Word siap diunduh dan dapat langsung diedit</p>

              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100 mb-6 text-left">
                <div className="bg-blue-100 p-2.5 rounded-lg shrink-0">
                  <FileOutput size={20} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm truncate">{result?.filename}</p>
                  <p className="text-gray-400 text-xs">Dokumen Word (.docx) — teks dapat diedit</p>
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
            { icon: "🔒", title: "Privat",    desc: "File tidak dikirim ke server manapun" },
            { icon: "✏️",  title: "Editable",  desc: "Teks dapat diedit langsung di Word" },
            { icon: "⚡", title: "Cepat",     desc: "Tanpa upload, tanpa antrian" },
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
