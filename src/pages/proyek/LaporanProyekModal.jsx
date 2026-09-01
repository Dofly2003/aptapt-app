import { useState, useMemo, useRef, useEffect } from "react";
import { X, Plus, Trash2, Download, FileText, Camera } from "lucide-react";
import HeaderLogo from "../../templates/laporan/shared/HeaderLogo";
import SignatureBlock from "../../templates/laporan/shared/SignatureBlock";
import { getSettings } from "../../services/contentService";
import { exportLaporanPdf } from "../../utils/exportLaporanPdf";

const ROWS_P1 = 2; // rows on first page (shares space with info table)
const ROWS_PN = 4; // rows on subsequent pages

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function A4Page({ children }) {
  return (
    <div
      className="laporan-page-sheet bg-white"
      style={{
        width: 794,
        minHeight: 1123,
        padding: "40px 56px",
        boxSizing: "border-box",
        fontFamily: "Times New Roman, serif",
        fontSize: "11pt",
        color: "#000",
        position: "relative",
        overflow: "hidden",
        pageBreakAfter: "always",
      }}
    >
      {children}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <tr>
      <td style={{ padding: "4px 8px", border: "1px solid #ccc", fontWeight: "bold", width: 160, whiteSpace: "nowrap" }}>
        {label}
      </td>
      <td style={{ padding: "4px 6px", border: "1px solid #ccc", width: 10, textAlign: "center" }}>:</td>
      <td style={{ padding: "4px 8px", border: "1px solid #ccc" }}>{value || "—"}</td>
    </tr>
  );
}

function PhotoRow({ no, fotoUrl, keterangan }) {
  return (
    <tr>
      <td style={{
        padding: "8px 6px", border: "1px solid #ccc",
        textAlign: "center", verticalAlign: "middle", width: 32, fontSize: "10pt",
      }}>
        {no}
      </td>
      <td style={{ padding: "8px 6px", border: "1px solid #ccc", verticalAlign: "middle", width: 280 }}>
        {fotoUrl ? (
          <img
            src={fotoUrl}
            alt={`Foto ${no}`}
            crossOrigin="anonymous"
            style={{ maxWidth: 260, maxHeight: 200, objectFit: "contain", display: "block", margin: "0 auto" }}
          />
        ) : (
          <div style={{
            width: 260, height: 180, border: "1px dashed #bbb",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto", color: "#aaa", fontSize: "9pt",
          }}>
            Foto Dokumentasi
          </div>
        )}
      </td>
      <td style={{ padding: "8px 10px", border: "1px solid #ccc", verticalAlign: "top" }}>
        <p style={{ margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap", fontSize: "11pt" }}>{keterangan || ""}</p>
      </td>
    </tr>
  );
}

export default function LaporanProyekModal({ proyek, open, onClose }) {
  const [judulLaporan, setJudulLaporan] = useState("Laporan Pekerjaan");
  const [rows, setRows]               = useState([{ id: 1, fotoUrl: null, keterangan: "" }]);
  const [ttdNama, setTtdNama]         = useState("");
  const [ttdJabatan, setTtdJabatan]   = useState("");
  const [ttdTanggal, setTtdTanggal]   = useState(new Date().toISOString().split("T")[0]);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [exporting, setExporting]     = useState(false);
  const [progress, setProgress]       = useState(null);
  const previewRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setJudulLaporan("Laporan Pekerjaan");
    setRows([{ id: 1, fotoUrl: null, keterangan: "" }]);
    setTtdNama(""); setTtdJabatan("");
    setTtdTanggal(new Date().toISOString().split("T")[0]);
    getSettings().then(s => {
      setCompanyInfo({
        logo: { url: s.logoUrl || "" },
        nama: s.companyName || "PT. Adytia Putra Teknik",
        tagline: s.tagline || "",
        alamat: s.address || "",
        web: s.website || "",
        telp: s.phone || "",
      });
    }).catch(() => {});
  }, [open]);

  const addRow    = () => setRows(r => [...r, { id: Date.now(), fotoUrl: null, keterangan: "" }]);
  const removeRow = (id) => setRows(r => r.filter(x => x.id !== id));
  const setField  = (id, field, val) => setRows(r => r.map(x => x.id === id ? { ...x, [field]: val } : x));

  const handleFoto = (id, file) => {
    if (!file) return;
    setField(id, "fotoUrl", URL.createObjectURL(file));
  };

  // Pagination
  const pages = useMemo(() => {
    const result = [];
    const firstBatch = rows.slice(0, ROWS_P1);
    result.push({ rows: firstBatch, isFirst: true, startIdx: 0, isLast: rows.length <= ROWS_P1 });
    let idx = ROWS_P1;
    while (idx < rows.length) {
      const batch = rows.slice(idx, idx + ROWS_PN);
      result.push({ rows: batch, isFirst: false, startIdx: idx, isLast: idx + ROWS_PN >= rows.length });
      idx += ROWS_PN;
    }
    return result;
  }, [rows]);

  const handleExport = async () => {
    if (!previewRef.current) return;
    setExporting(true);
    try {
      const name = proyek?.kodeProyek || proyek?.namaProyek || "proyek";
      await exportLaporanPdf(previewRef.current, `Laporan-${name}.pdf`, p => setProgress(p));
    } catch (e) {
      alert("Gagal export PDF: " + e.message);
    } finally {
      setExporting(false);
      setProgress(null);
    }
  };

  if (!open) return null;

  const ttd = { nama: ttdNama, jabatan: ttdJabatan, tanggal: ttdTanggal };

  return (
    <div className="fixed inset-0 z-50 flex bg-black/50">
      {/* ── Left: Form panel ───────────────────────────────────────────── */}
      <div className="w-96 shrink-0 bg-white flex flex-col h-full overflow-hidden border-r shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50 shrink-0">
          <div>
            <h2 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4 text-amber-500" /> Buat Laporan
            </h2>
            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[280px]">{proyek?.namaProyek}</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable form body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Judul */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Judul Laporan</label>
            <input
              value={judulLaporan}
              onChange={e => setJudulLaporan(e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40"
            />
          </div>

          {/* Rows */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dokumentasi</label>
              <span className="text-xs text-gray-400">{rows.length} baris</span>
            </div>

            <div className="space-y-3">
              {rows.map((row, idx) => (
                <div key={row.id} className="border border-gray-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-400">Baris {idx + 1}</span>
                    {rows.length > 1 && (
                      <button onClick={() => removeRow(row.id)} className="text-red-400 hover:text-red-600 p-0.5">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Foto */}
                  {row.fotoUrl ? (
                    <div className="relative">
                      <img src={row.fotoUrl} alt="" className="w-full h-28 object-cover rounded-lg border border-gray-200" />
                      <button
                        onClick={() => setField(row.id, "fotoUrl", null)}
                        className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-amber-400 hover:bg-amber-50/30 transition-colors">
                      <Camera className="w-5 h-5 text-gray-300 mb-1" />
                      <span className="text-xs text-gray-400">Pilih foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={e => handleFoto(row.id, e.target.files?.[0])}
                      />
                    </label>
                  )}

                  {/* Keterangan */}
                  <textarea
                    rows={3}
                    value={row.keterangan}
                    onChange={e => setField(row.id, "keterangan", e.target.value)}
                    placeholder="Keterangan pekerjaan..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 resize-none"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={addRow}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-amber-300 rounded-xl text-sm text-amber-600 hover:bg-amber-50 font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Tambah Baris
            </button>
          </div>

          {/* Penanda Tangan */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Penanda Tangan</label>
            <div className="space-y-2">
              <input
                value={ttdNama}
                onChange={e => setTtdNama(e.target.value)}
                placeholder="Nama lengkap"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40"
              />
              <input
                value={ttdJabatan}
                onChange={e => setTtdJabatan(e.target.value)}
                placeholder="Jabatan"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40"
              />
              <input
                type="date"
                value={ttdTanggal}
                onChange={e => setTtdTanggal(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40"
              />
            </div>
          </div>
        </div>

        {/* Export button */}
        <div className="p-4 border-t bg-slate-50 shrink-0">
          {progress && (
            <div className="mb-2">
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-amber-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${progress.current}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">{progress.label}</p>
            </div>
          )}
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-colors"
          >
            <Download className="w-4 h-4" />
            {exporting ? "Mengekspor..." : "Export PDF"}
          </button>
        </div>
      </div>

      {/* ── Right: A4 Preview panel ─────────────────────────────────────── */}
      <div className="flex-1 overflow-auto bg-slate-300 p-6">
        <div className="flex justify-center">
          <div ref={previewRef} className="space-y-4">
            {pages.map((page, pageIdx) => (
              <A4Page key={pageIdx}>
                {/* COP / Header */}
                <HeaderLogo instansi={companyInfo} hideFormNumber />

                {/* Page 1: Judul + Tabel Info */}
                {page.isFirst && (
                  <>
                    <div style={{ textAlign: "center", margin: "16px 0 14px" }}>
                      <p style={{ fontWeight: "bold", fontSize: "13pt", textDecoration: "underline", margin: 0 }}>
                        {judulLaporan || "Laporan Pekerjaan"}
                      </p>
                      {proyek?.namaProyek && (
                        <p style={{ fontSize: "11pt", margin: "4px 0 0", fontStyle: "italic" }}>
                          {proyek.namaProyek}
                        </p>
                      )}
                    </div>

                    {/* Info table */}
                    <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 14 }}>
                      <tbody>
                        <InfoRow label="No. PO"          value={proyek?.noPO} />
                        <InfoRow label="Kode Proyek"     value={proyek?.kodeProyek} />
                        <InfoRow label="Nama Pelanggan"  value={proyek?.namaPelanggan || proyek?.klien} />
                        <InfoRow label="Alamat"          value={proyek?.alamatPelanggan} />
                        <InfoRow label="Telepon"         value={proyek?.teleponPelanggan} />
                        <InfoRow label="Email"           value={proyek?.emailPelanggan} />
                        <InfoRow label="Tanggal Mulai"   value={fmtDate(proyek?.tanggalMulai)} />
                        <InfoRow label="Tanggal Selesai" value={fmtDate(proyek?.tanggalSelesai)} />
                      </tbody>
                    </table>
                  </>
                )}

                {/* Documentation table */}
                {page.rows.length > 0 && (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f3f4f6" }}>
                        <th style={{ padding: "6px", border: "1px solid #ccc", width: 32, fontSize: "10pt" }}>No</th>
                        <th style={{ padding: "6px", border: "1px solid #ccc", width: 280, fontSize: "10pt" }}>Foto Dokumentasi</th>
                        <th style={{ padding: "6px", border: "1px solid #ccc", fontSize: "10pt" }}>Keterangan Pekerjaan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {page.rows.map((row, rowIdx) => (
                        <PhotoRow
                          key={row.id}
                          no={page.startIdx + rowIdx + 1}
                          fotoUrl={row.fotoUrl}
                          keterangan={row.keterangan}
                        />
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Footer / SignatureBlock — last page only */}
                {page.isLast && (
                  <SignatureBlock ttd={ttd} instansi={companyInfo} />
                )}
              </A4Page>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
