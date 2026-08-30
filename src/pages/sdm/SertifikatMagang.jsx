import { useState, useEffect, useRef, useContext, useCallback } from "react";
import { AuthContext } from "../../context/AuthContext";
import {
  Plus, Eye, Download, Trash2, Edit2, Award, X, FileDown, ImageDown,
} from "lucide-react";
import {
  AdminPageHeader, Button, Modal, Field, Input, useToast,
} from "../../components/admin/AdminUI";
import {
  getAllSertifikat, createSertifikat, updateSertifikat, removeSertifikat,
} from "../../services/sdmService";
import { getSettings } from "../../services/contentService";
import domtoimage from "dom-to-image-more";
import { jsPDF } from "jspdf";
import TemplateSertifikatMagang from "../../templates/sertifikat/TemplateSertifikatMagang";

const ROMAN = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];

function genNomor(seq, month, year) {
  return `${String(seq).padStart(3,"0")}/APT-MGNG/${ROMAN[month-1]}/${year}`;
}

const today = new Date().toISOString().split("T")[0];
const thisYear = new Date().getFullYear().toString();

const EMPTY = {
  nomorSertifikat: "",
  nama: "",
  nim: "",
  institusi: "",
  divisi: "",
  periodeAwal: "",
  periodeAkhir: "",
  pembimbing: "Roshy Maulana",
  direktur: "Adytia Putra",
  tanggalTerbit: today,
  tahun: thisYear,
};

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export default function SertifikatMagang() {
  const { role } = useContext(AuthContext);
  const [items,       setItems]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [logoUrl,     setLogoUrl]     = useState("");
  const [modalOpen,   setModal]       = useState(false);
  const [previewOpen, setPreview]     = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [editing,     setEditing]     = useState(null);
  const [form,        setForm]        = useState(EMPTY);
  const [saving,      setSaving]      = useState(false);
  const [dlData,      setDlData]      = useState(null);   // drives hidden render
  const [dlBusy,      setDlBusy]      = useState(false);
  const { show, Toast } = useToast();
  const previewRef = useRef(null);
  const hiddenRef  = useRef(null);

  const isAdmin = role === "admin" || role === "superadmin";

  /* ── load ── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await getAllSertifikat());
    } catch {
      show("Gagal memuat data", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    getSettings().then(s => setLogoUrl(s.logoUrl || "")).catch(() => {});
  }, [load]);

  /* ── capture helpers ── */
  const captureEl = useCallback(async (el) => {
    const scale = 3;
    const blob = await domtoimage.toBlob(el, {
      width: el.offsetWidth * scale,
      height: el.offsetHeight * scale,
      style: { transform: `scale(${scale})`, transformOrigin: "top left" },
      bgcolor: "#faf7f0",
    });
    return blob;
  }, []);

  const blobToPdf = useCallback((blob, nama) => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
        const w = pdf.internal.pageSize.getWidth();
        const h = pdf.internal.pageSize.getHeight();
        pdf.addImage(img, "PNG", 0, 0, w, h);
        pdf.save(`Sertifikat_Magang_${nama.replace(/\s+/g, "_")}.pdf`);
        URL.revokeObjectURL(url);
        resolve();
      };
      img.src = url;
    });
  }, []);

  const captureSvg = useCallback(async (el) => {
    return domtoimage.toSvg(el, { bgcolor: "#faf7f0" });
  }, []);

  /* ── all downloads go through hidden render (avoids modal/scale issues) ── */
  const [dlMode, setDlMode] = useState("pdf"); // "pdf" | "svg"

  const handleDownloadDirect = useCallback((item, mode = "pdf") => {
    if (dlBusy) return;
    setDlMode(mode);
    setDlBusy(true);
    setDlData(item);
  }, [dlBusy]);

  /* preview buttons delegate to hidden render */
  const handleDownloadPreview = (mode = "pdf") => {
    if (!previewData) return;
    handleDownloadDirect(previewData, mode);
  };

  /* fires after hidden component mounts/updates */
  useEffect(() => {
    if (!dlData || !hiddenRef.current) return;
    const timer = setTimeout(async () => {
      try {
        const el = hiddenRef.current;
        if (dlMode === "svg") {
          const svgUrl = await captureSvg(el);
          const a = document.createElement("a");
          a.href = svgUrl;
          a.download = `Sertifikat_Magang_${(dlData.nama || "sertifikat").replace(/\s+/g, "_")}.svg`;
          a.click();
        } else {
          const blob = await captureEl(el);
          await blobToPdf(blob, dlData.nama || "sertifikat");
        }
      } catch {
        show("Gagal mengunduh", "error");
      } finally {
        setDlBusy(false);
        setDlData(null);
      }
    }, 220);
    return () => clearTimeout(timer);
  }, [dlData, dlMode, captureEl, blobToPdf, captureSvg]);

  /* ── form helpers ── */
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openAdd = () => {
    const now = new Date();
    setEditing(null);
    setForm({
      ...EMPTY,
      nomorSertifikat: genNomor(items.length + 1, now.getMonth() + 1, now.getFullYear()),
      tahun: now.getFullYear().toString(),
      tanggalTerbit: today,
    });
    setModal(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({ ...EMPTY, ...item });
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.nama.trim()) { show("Nama peserta wajib diisi", "error"); return; }
    if (!form.nomorSertifikat.trim()) { show("Nomor sertifikat wajib diisi", "error"); return; }
    setSaving(true);
    try {
      if (editing?.id) await updateSertifikat(editing.id, form);
      else             await createSertifikat(form);
      show("Tersimpan");
      setModal(false);
      load();
    } catch {
      show("Gagal menyimpan", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Hapus sertifikat "${item.nama}"?`)) return;
    try { await removeSertifikat(item.id); show("Terhapus"); load(); }
    catch { show("Gagal menghapus", "error"); }
  };

  const openPreview = (item) => {
    setPreviewData(item);
    setPreview(true);
  };

  /* ── RENDER ── */
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <Toast />

      <AdminPageHeader
        title="Sertifikat Magang"
        description="Buat dan kelola sertifikat kerja praktik & magang PT. Adytia Putra Tehnik."
        actions={
          isAdmin && (
            <Button onClick={openAdd}>
              <Plus className="w-4 h-4" /> Buat Sertifikat
            </Button>
          )
        }
      />

      {/* ── LIST ── */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">Memuat...</div>
      ) : !items.length ? (
        <div className="text-center py-16 text-slate-400">
          <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Belum ada sertifikat.</p>
          {isAdmin && (
            <button
              onClick={openAdd}
              className="mt-4 text-sm text-blue-600 hover:underline"
            >
              Buat sertifikat pertama
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 whitespace-nowrap">No. Sertifikat</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Nama Peserta</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 hidden md:table-cell">Institusi</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 hidden lg:table-cell">Divisi</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 hidden lg:table-cell">Periode</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 whitespace-nowrap">Tanggal Terbit</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-amber-700 whitespace-nowrap">
                      {item.nomorSertifikat}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{item.nama}</td>
                    <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{item.institusi || "—"}</td>
                    <td className="px-4 py-3 text-slate-600 hidden lg:table-cell">{item.divisi || "—"}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs hidden lg:table-cell whitespace-nowrap">
                      {item.periodeAwal && item.periodeAkhir
                        ? `${fmtDate(item.periodeAwal)} – ${fmtDate(item.periodeAkhir)}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {fmtDate(item.tanggalTerbit)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openPreview(item)}
                          title="Lihat Sertifikat"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => handleDownloadDirect(item, "pdf")}
                          disabled={dlBusy}
                          title="Unduh PDF"
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition disabled:opacity-40"
                        >
                          <Download size={15} />
                        </button>
                        <button
                          onClick={() => handleDownloadDirect(item, "svg")}
                          disabled={dlBusy}
                          title="Unduh SVG"
                          className="p-1.5 text-slate-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition disabled:opacity-40"
                        >
                          <ImageDown size={15} />
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => openEdit(item)}
                              title="Edit"
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              title="Hapus"
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-400">
            {items.length} sertifikat tersimpan
          </div>
        </div>
      )}

      {/* ── HIDDEN RENDER untuk download langsung dari list ── */}
      {dlData && (
        <div style={{ position: "fixed", top: -9999, left: -9999, pointerEvents: "none", zIndex: -1 }}>
          <TemplateSertifikatMagang ref={hiddenRef} data={dlData} logoUrl={logoUrl} />
        </div>
      )}

      {/* ── PREVIEW MODAL ── */}
      {previewOpen && previewData && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/70">
          {/* toolbar */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white shrink-0">
            <div>
              <p className="font-semibold text-sm">{previewData.nama}</p>
              <p className="text-xs text-slate-400">{previewData.nomorSertifikat}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownloadPreview("svg")}
                disabled={dlBusy}
                className="flex items-center gap-2 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg text-xs font-medium transition"
              >
                <ImageDown size={14} />
                {dlBusy ? "Memproses..." : "Unduh SVG"}
              </button>
              <button
                onClick={() => handleDownloadPreview("pdf")}
                disabled={dlBusy}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg text-xs font-medium transition"
              >
                <FileDown size={14} />
                {dlBusy ? "Memproses..." : "Unduh PDF"}
              </button>
              <button
                onClick={() => setPreview(false)}
                className="p-1.5 hover:bg-slate-700 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* scrollable preview area */}
          <div className="flex-1 overflow-auto flex items-start justify-center p-6">
            <div style={{ transform: "scale(0.82)", transformOrigin: "top center" }}>
              <TemplateSertifikatMagang
                ref={previewRef}
                data={previewData}
                logoUrl={logoUrl}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── FORM MODAL ── */}
      <Modal
        open={modalOpen}
        onClose={() => setModal(false)}
        title={editing ? "Edit Sertifikat" : "Buat Sertifikat Magang"}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="No. Sertifikat" required>
              <Input
                value={form.nomorSertifikat}
                onChange={e => set("nomorSertifikat", e.target.value)}
                placeholder="047/APT-MGNG/VI/2026"
              />
            </Field>
            <Field label="Tahun">
              <Input
                value={form.tahun}
                onChange={e => set("tahun", e.target.value)}
                placeholder="2026"
              />
            </Field>
          </div>

          <Field label="Nama Peserta Magang" required>
            <Input
              value={form.nama}
              onChange={e => set("nama", e.target.value)}
              placeholder="Thalita Nurhidayati Indarlik"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="NIM / NIP">
              <Input
                value={form.nim}
                onChange={e => set("nim", e.target.value)}
                placeholder="22050397052"
              />
            </Field>
            <Field label="Institusi / Universitas">
              <Input
                value={form.institusi}
                onChange={e => set("institusi", e.target.value)}
                placeholder="Universitas Negeri Surabaya"
              />
            </Field>
          </div>

          <Field label="Divisi / Posisi Magang">
            <Input
              value={form.divisi}
              onChange={e => set("divisi", e.target.value)}
              placeholder="Administrasi Teknik"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Periode Magang — Mulai">
              <Input
                type="date"
                value={form.periodeAwal}
                onChange={e => set("periodeAwal", e.target.value)}
              />
            </Field>
            <Field label="Periode Magang — Selesai">
              <Input
                type="date"
                value={form.periodeAkhir}
                onChange={e => set("periodeAkhir", e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Nama Pembimbing">
              <Input
                value={form.pembimbing}
                onChange={e => set("pembimbing", e.target.value)}
                placeholder="Roshy Maulana"
              />
            </Field>
            <Field label="Nama Direktur">
              <Input
                value={form.direktur}
                onChange={e => set("direktur", e.target.value)}
                placeholder="Adytia Putra"
              />
            </Field>
          </div>

          <Field label="Tanggal Terbit">
            <Input
              type="date"
              value={form.tanggalTerbit}
              onChange={e => set("tanggalTerbit", e.target.value)}
            />
          </Field>

          <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setModal(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
