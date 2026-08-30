import { useEffect, useState, useContext, useMemo, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, RefreshCw, GripVertical, Trash2, Plus,
  Printer, CheckCircle, Save, ChevronDown, ChevronUp,
  FileText, User, MessageSquare, Building2,
  AlertCircle, Eye, Copy, Lock, Send,
} from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { AuthContext } from "../../context/AuthContext";
import { useGuestPermission } from "../../hooks/useGuestPermission";
import { submitForApproval } from "../../services/guestService";
import {
  createDokumen, updateDokumen, getDokumen, getAllDokumen, suggestNomor,
  hitungTotal, formatRupiah, formatRupiahPlain,
  newItem, SATUAN_OPTIONS, DEFAULT_CLOSING, DEFAULT_PEMBUKAAN, DEFAULT_MASA_BERLAKU,
} from "../../services/rabService";
import { getAllInstansi } from "../../services/instansiService";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import TemplateRabAdytia from "../../templates/rab/TemplateRabAdytia";

const TODAY = () => new Date().toISOString().slice(0, 10);

const EMPTY = {
  type: "rab",
  nomor: "",
  lampiran: "-",
  perihal: "",
  kepada: { yth: "Bapak / Ibu Pimpinan", perusahaan: "", di: "di tempat" },
  tanggal: TODAY(),
  lokasi: "",
  instansiId: "",
  ttd: null,
  items: [newItem()],
  ppnAktif: true,
  pembukaan: DEFAULT_PEMBUKAAN,
  closingMessage: DEFAULT_CLOSING.rab,
  masaBerlaku: DEFAULT_MASA_BERLAKU,
  catatan: "",
  status: "draft",
};

const navy = "#003087";
const gold = "#F59E0B";

export default function RabEditor() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { user, role, profile } = useContext(AuthContext);

  const rabPermission  = useGuestPermission("rab");
  const isReadOnly     = role === "guest" && rabPermission === "read";
  const needsApproval  = role === "guest" && rabPermission === "write_approval";

  const [form, setForm]               = useState(EMPTY);
  const [instansiList, setInstansiList] = useState([]);
  const [loading, setLoading]         = useState(isEdit);
  const [saving, setSaving]           = useState(false);
  const [zoom, setZoom]               = useState(62);
  const [mTab, setMTab]               = useState("form");
  const [autoSaved, setAutoSaved]     = useState(false);
  const [toast, setToast]             = useState({ msg: "", on: false, err: false });
  const [showCopyRab, setShowCopyRab] = useState(false);
  const [openSec, setOpenSec]         = useState({
    surat: true, letterhead: true, kepada: true, items: true, closing: false,
  });

  const loadedIdRef = useRef(null);
  const printRef    = useRef(null);
  const autoTimer   = useRef(null);

  const showToast = useCallback((msg, err = false) => {
    setToast({ msg, on: true, err });
    setTimeout(() => setToast(t => ({ ...t, on: false })), 2800);
  }, []);

  /* ── data load ── */
  useEffect(() => {
    getAllInstansi({ aktifOnly: true })
      .then(list => {
        setInstansiList(list);
        if (!isEdit && list[0])
          setForm(f => ({ ...f, instansiId: list[0].id, lokasi: deriveKota(list[0].alamat) }));
      })
      .catch(console.error);
  }, [isEdit]);

  useEffect(() => {
    if (!id || loadedIdRef.current === id) return;
    setLoading(true);
    getDokumen(id)
      .then(data => {
        if (!data) { showToast("Dokumen tidak ditemukan", true); navigate("/Dashboard/rab"); return; }
        setForm({ ...EMPTY, ...data });
        loadedIdRef.current = id;
      })
      .catch(() => showToast("Gagal memuat", true))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (isEdit || form.nomor) return;
    suggestNomor("rab", form.tanggal)
      .then(nomor => setForm(f => f.nomor ? f : { ...f, nomor }))
      .catch(console.error);
  }, [isEdit, form.tanggal, form.nomor]);

  const refreshNomor = async () => {
    const nomor = await suggestNomor("rab", form.tanggal);
    setForm(f => ({ ...f, nomor }));
    showToast("Nomor diperbarui");
  };

  /* ── derived ── */
  const totals           = useMemo(() => hitungTotal(form.items, form.ppnAktif, 11), [form.items, form.ppnAktif]);
  const selectedInstansi  = instansiList.find(i => i.id === form.instansiId) ?? null;
  const pjList           = selectedInstansi?.penanggungJawab ?? [];

  /* ── setters ── */
  const set       = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setKepada = (k, v) => setForm(f => ({ ...f, kepada: { ...f.kepada, [k]: v } }));
  const toggleSec = k => setOpenSec(s => ({ ...s, [k]: !s[k] }));

  const handleInstansiChange = instId => {
    const inst = instansiList.find(i => i.id === instId);
    setForm(f => ({ ...f, instansiId: instId, lokasi: deriveKota(inst?.alamat) || f.lokasi, ttd: null }));
  };

  const handlePjChange = pjId => {
    const pj = pjList.find(p => p.id === pjId);
    setForm(f => ({
      ...f,
      ttd: pj ? { penanggungJawabId: pj.id, nama: pj.nama, jabatan: pj.jabatan, signature: pj.signature ?? null, stempel: pj.stempel ?? null } : null,
    }));
  };

  const updateItem = (idx, patch) => setForm(f => {
    const items = [...f.items];
    items[idx] = { ...items[idx], ...patch };
    return { ...f, items };
  });
  const addItem    = () => setForm(f => ({ ...f, items: [...f.items, newItem()] }));
  const removeItem = idx => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const handleCopyRabItems = (items, append) => {
    setForm(f => ({ ...f, items: append ? [...f.items, ...items] : items }));
    showToast(`✓ ${items.length} item berhasil disalin`);
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    setForm(f => {
      const o = f.items.findIndex(i => i.id === active.id);
      const n = f.items.findIndex(i => i.id === over.id);
      return { ...f, items: arrayMove(f.items, o, n) };
    });
  };

  /* ── auto-save (skip untuk guest — simpan harus eksplisit) ── */
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    clearTimeout(autoTimer.current);
    autoTimer.current = setTimeout(async () => {
      if (!id) return;
      if (role === "guest") return;
      try { await updateDokumen(id, form); setAutoSaved(true); setTimeout(() => setAutoSaved(false), 2000); }
      catch { /* silent */ }
    }, 3000);
    return () => clearTimeout(autoTimer.current);
  }, [form]);

  /* ── validate + save ── */
  const validate = () => {
    if (!form.perihal.trim()) return "Perihal wajib diisi";
    if (!form.instansiId)     return "Pilih instansi (letterhead)";
    if (!form.ttd?.nama)      return "Pilih penanggung jawab (TTD)";
    if (!form.items.length)   return "Minimal 1 item";
    if (form.items.find(it => !it.nama.trim())) return "Ada item tanpa nama";
    return null;
  };

  const save = async statusNext => {
    const err = validate();
    if (err) { showToast(err, true); return; }
    setSaving(true);
    try {
      const payload = { ...form, status: statusNext };

      if (needsApproval) {
        await submitForApproval({
          guestUid: user.uid,
          guestUsername: profile?.username || user.uid,
          module: "rab",
          targetCollection: "dokumen_keuangan",
          docId: id || null,
          operation: id ? "update" : "create",
          proposedData: payload,
        });
        showToast("Perubahan diajukan ✓ Menunggu persetujuan admin");
        setTimeout(() => navigate("/Dashboard/rab"), 1500);
        return;
      }

      if (isEdit) {
        await updateDokumen(id, payload);
        showToast("Tersimpan ✓");
        if (statusNext === "final") navigate(`/rab/${id}`);
      } else {
        const newId = await createDokumen(payload, user.uid);
        loadedIdRef.current = newId;
        showToast("RAB dibuat ✓");
        if (statusNext === "final") navigate(`/rab/${newId}`);
        else navigate(`/Dashboard/rab/${newId}`, { replace: true });
      }
    } catch (e) {
      showToast("Gagal: " + e.message, true);
    } finally { setSaving(false); }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `RAB-${form.nomor || form.perihal || "dokumen"}`,
    pageStyle: `@page{size:A4 portrait;margin:0}@media print{body{background:#fff!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}.laporan-form{page-break-after:always;margin:0!important}.laporan-form:last-child{page-break-after:auto}.laporan-page{box-shadow:none!important;margin:0!important}.laporan-section{page-break-inside:avoid}table{page-break-inside:avoid}img{max-width:100%!important}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}`,
  });

  const triggerPrint = () => {
    const err = validate();
    if (err) { showToast(err, true); return; }
    handlePrint();
  };

  /* ── loading splash ── */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 text-sm">Memuat data RAB…</p>
      </div>
    </div>
  );

  const statusLabel = form.status === "final" ? "Final" : "Draft";
  const statusClass = form.status === "final" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700";

  return (
    <div className="min-h-screen bg-slate-100">

      {/* ══════════════ STICKY HEADER ══════════════ */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
        <div className="flex items-center gap-3 px-4 py-3 max-w-screen-2xl mx-auto">

          <button onClick={() => navigate("/Dashboard/rab")}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium shrink-0">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Kembali</span>
          </button>

          <div className="w-px h-5 bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
              style={{ background: "#92400E" }}>
              R
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 leading-tight truncate">
                {isEdit ? "Edit RAB" : "Buat RAB Baru"}
              </p>
              <p className="text-xs text-slate-400 truncate leading-tight">
                {form.nomor || "Nomor belum diisi"}
              </p>
            </div>
            <span className={`hidden sm:inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusClass}`}>
              {statusLabel}
            </span>
            {autoSaved && (
              <span className="hidden sm:inline text-xs text-emerald-600 font-medium animate-pulse">
                ✓ Tersimpan otomatis
              </span>
            )}
          </div>

          {/* Mobile tab toggle */}
          <div className="flex xl:hidden rounded-lg border border-slate-200 overflow-hidden text-xs font-medium">
            <button onClick={() => setMTab("form")}
              className={`px-3 py-1.5 transition-colors ${mTab === "form" ? "text-white" : "text-slate-600 bg-white"}`}
              style={mTab === "form" ? { background: "#92400E" } : {}}>
              Form
            </button>
            <button onClick={() => setMTab("preview")}
              className={`px-3 py-1.5 transition-colors ${mTab === "preview" ? "text-white" : "text-slate-600 bg-white"}`}
              style={mTab === "preview" ? { background: "#92400E" } : {}}>
              Preview
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {isReadOnly && (
              <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-lg">
                <Lock className="w-3 h-3" /> Mode Baca Saja
              </span>
            )}
            <button onClick={triggerPrint}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
              <Printer className="w-4 h-4" />
              <span className="hidden md:inline">Cetak</span>
            </button>
            {!isReadOnly && (needsApproval ? (
              <button onClick={() => save("draft")} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-opacity disabled:opacity-50">
                <Send className="w-4 h-4" />
                <span>{saving ? "…" : "Ajukan Perubahan"}</span>
              </button>
            ) : (
              <>
                <button onClick={() => save("draft")} disabled={saving}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">
                  <Save className="w-4 h-4" />
                  <span className="hidden md:inline">{saving ? "Menyimpan…" : "Simpan Draft"}</span>
                </button>
                <button onClick={() => save("final")} disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg text-white transition-opacity disabled:opacity-50"
                  style={{ background: navy }}>
                  <CheckCircle className="w-4 h-4" />
                  <span>{saving ? "…" : "Simpan Final"}</span>
                </button>
              </>
            ))}
          </div>
        </div>
      </header>

      {/* ══════════════ READ-ONLY BANNER ══════════════ */}
      {isReadOnly && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-2 text-sm text-amber-800">
          <Lock className="w-4 h-4 shrink-0" />
          <span>Anda hanya memiliki akses <strong>baca saja</strong> untuk RAB. Perubahan tidak akan tersimpan.</span>
        </div>
      )}
      {needsApproval && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2.5 flex items-center gap-2 text-sm text-blue-800">
          <Send className="w-4 h-4 shrink-0" />
          <span>Perubahan yang Anda buat akan <strong>diajukan untuk persetujuan admin</strong> sebelum diterapkan.</span>
        </div>
      )}

      {/* ══════════════ MAIN BODY ══════════════ */}
      <div className="max-w-screen-2xl mx-auto px-3 sm:px-4 py-5 flex gap-5 items-start">

        {/* ── FORM COLUMN ── */}
        <div className={`flex-1 min-w-0 space-y-4 ${mTab === "preview" ? "hidden xl:block" : ""}`}>

          {/* ▸ Informasi Surat */}
          <Section
            icon={<FileText className="w-5 h-5" style={{ color: "#3B82F6" }} />}
            title="Informasi Surat"
            subtitle="Nomor, perihal, tanggal, dan lampiran dokumen"
            color="#3B82F6"
            open={openSec.surat}
            onToggle={() => toggleSec("surat")}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Nomor Surat</Label>
                <div className="flex gap-2">
                  <input className={inp} value={form.nomor}
                    onChange={e => set("nomor", e.target.value)}
                    placeholder="001/APT/VI/2026" />
                  <button onClick={refreshNomor} title="Generate ulang nomor"
                    className="px-3 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors shrink-0">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                <Hint>Klik ↻ untuk nomor urut otomatis.</Hint>
              </div>

              <div>
                <Label>Lampiran</Label>
                <input className={inp} value={form.lampiran}
                  onChange={e => set("lampiran", e.target.value)}
                  placeholder="-" />
              </div>

              <div className="sm:col-span-2">
                <Label required>Perihal</Label>
                <input className={inp} value={form.perihal}
                  onChange={e => set("perihal", e.target.value)}
                  placeholder="Contoh: Penawaran Harga Pekerjaan Instalasi Listrik" />
                <Hint>Topik atau pekerjaan yang ditawarkan dalam RAB ini.</Hint>
              </div>

              <div>
                <Label>Tanggal Surat</Label>
                <input type="date" className={inp} value={form.tanggal}
                  onChange={e => set("tanggal", e.target.value)} />
              </div>

              <div>
                <Label>Status</Label>
                <select className={inp} value={form.status} onChange={e => set("status", e.target.value)}>
                  <option value="draft">Draft</option>
                  <option value="final">Final</option>
                </select>
              </div>
            </div>
          </Section>

          {/* ▸ Letterhead & TTD */}
          <Section
            icon={<Building2 className="w-5 h-5" style={{ color: "#8B5CF6" }} />}
            title="Letterhead & Penanggung Jawab"
            subtitle="Pilih instansi penerbit dan siapa yang menandatangani"
            color="#8B5CF6"
            open={openSec.letterhead}
            onToggle={() => toggleSec("letterhead")}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label required>Instansi / Perusahaan Penerbit</Label>
                <select className={inp} value={form.instansiId}
                  onChange={e => handleInstansiChange(e.target.value)}>
                  <option value="">— Pilih instansi —</option>
                  {instansiList.map(i => <option key={i.id} value={i.id}>{i.nama}</option>)}
                </select>
                {selectedInstansi && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                    <div className="w-5 h-5 rounded bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                      {selectedInstansi.nama?.[0] || "?"}
                    </div>
                    <span>{selectedInstansi.nama}</span>
                    {selectedInstansi.alamat && <span className="truncate text-slate-400">· {selectedInstansi.alamat}</span>}
                  </div>
                )}
              </div>

              <div>
                <Label>Kota / Lokasi</Label>
                <input className={inp} value={form.lokasi}
                  onChange={e => set("lokasi", e.target.value)}
                  placeholder="Contoh: Gresik" />
                <Hint>Tampil di header: "Gresik, 22 Juni 2026"</Hint>
              </div>

              <div>
                <Label required>Penanggung Jawab (TTD)</Label>
                <select className={inp}
                  value={form.ttd?.penanggungJawabId || ""}
                  onChange={e => handlePjChange(e.target.value)}>
                  <option value="">— Pilih penanggung jawab —</option>
                  {pjList.map(p => <option key={p.id} value={p.id}>{p.nama} — {p.jabatan}</option>)}
                </select>
                {!pjList.length && form.instansiId && (
                  <div className="mt-2 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>Instansi belum punya penanggung jawab. Tambah di <strong>Master Data → Instansi</strong>.</span>
                  </div>
                )}
                {form.ttd?.nama && (
                  <div className="mt-2 flex items-center gap-2 text-xs bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-emerald-700">
                      <strong>{form.ttd.nama}</strong> · {form.ttd.jabatan}
                      {form.ttd.signature?.url && " · ✓ TTD"}
                      {form.ttd.stempel?.url   && " · ✓ Stempel"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Section>

          {/* ▸ Kepada Yth */}
          <Section
            icon={<User className="w-5 h-5" style={{ color: "#10B981" }} />}
            title="Kepada Yth"
            subtitle="Pihak penerima surat penawaran ini"
            color="#10B981"
            open={openSec.kepada}
            onToggle={() => toggleSec("kepada")}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Ditujukan kepada</Label>
                <input className={inp} value={form.kepada.yth}
                  onChange={e => setKepada("yth", e.target.value)}
                  placeholder="Bapak / Ibu Pimpinan" />
              </div>
              <div>
                <Label>Perusahaan / Instansi</Label>
                <input className={inp} value={form.kepada.perusahaan}
                  onChange={e => setKepada("perusahaan", e.target.value)}
                  placeholder="Nama perusahaan klien" />
              </div>
              <div className="sm:col-span-2">
                <Label>Lokasi Penerima</Label>
                <input className={inp} value={form.kepada.di}
                  onChange={e => setKepada("di", e.target.value)}
                  placeholder="di tempat" />
              </div>
            </div>
          </Section>

          {/* ▸ Daftar Item */}
          <Section
            icon={<span className="text-lg leading-none">📦</span>}
            title={`Daftar Barang / Jasa (${form.items.length} item)`}
            subtitle="Klik + untuk menambah item. Seret untuk mengubah urutan."
            color={gold}
            open={openSec.items}
            onToggle={() => toggleSec("items")}
            extra={
              <button onClick={() => setShowCopyRab(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                <Copy className="w-3.5 h-3.5" /> Salin dari RAB lain
              </button>
            }
          >
            {/* Column headers (desktop) */}
            <div className="hidden sm:grid text-xs font-semibold text-slate-400 uppercase tracking-wide px-1 mb-1"
              style={{ gridTemplateColumns: "28px 28px 1fr 80px 72px 120px 96px 32px" }}>
              <div /><div className="text-center">#</div>
              <div>Nama Barang / Jasa</div>
              <div className="text-center">Satuan</div>
              <div className="text-center">Vol</div>
              <div className="text-right">Harga Satuan</div>
              <div className="text-right">Jumlah</div>
              <div />
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={form.items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {form.items.map((it, idx) => (
                    <ItemRow
                      key={it.id} item={it} index={idx}
                      onChange={patch => updateItem(idx, patch)}
                      onRemove={() => removeItem(idx)}
                      canRemove={form.items.length > 1}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <button onClick={addItem}
              className="mt-3 w-full py-2.5 border-2 border-dashed border-amber-300 rounded-xl text-sm font-medium text-amber-700 hover:bg-amber-50 hover:border-amber-400 transition-colors flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Tambah Item
            </button>

            {/* Totals */}
            <div className="mt-4 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
              <div className="flex justify-between items-center px-4 py-2.5 border-b border-slate-200 text-sm text-slate-600">
                <span>Subtotal</span>
                <span className="font-medium">{formatRupiah(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between items-center px-4 py-2.5 border-b border-slate-200">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input type="checkbox" checked={form.ppnAktif}
                    onChange={e => set("ppnAktif", e.target.checked)}
                    className="w-4 h-4 rounded accent-amber-500" />
                  <span className="text-sm text-slate-600">Tambahkan PPN 11%</span>
                </label>
                <span className="text-sm font-medium text-slate-600">
                  {form.ppnAktif ? formatRupiah(totals.ppn) : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center px-4 py-3" style={{ background: navy }}>
                <span className="text-sm font-bold text-white">Grand Total</span>
                <span className="text-base font-extrabold" style={{ color: "#FFD700" }}>
                  {formatRupiah(totals.grandTotal)}
                </span>
              </div>
            </div>
          </Section>

          {/* ▸ Teks Surat */}
          <Section
            icon={<MessageSquare className="w-5 h-5" style={{ color: "#6B7280" }} />}
            title="Teks Surat"
            subtitle="Paragraf pembukaan, penutup, masa berlaku, dan catatan tambahan"
            color="#6B7280"
            open={openSec.closing}
            onToggle={() => toggleSec("closing")}
          >
            <div className="space-y-4">
              <div>
                <Label>Paragraf Pembukaan</Label>
                <textarea className={`${inp} !h-auto`} rows={4} value={form.pembukaan}
                  onChange={e => set("pembukaan", e.target.value)} />
                <Hint>Tampil di atas tabel, setelah "Kepada Yth".</Hint>
              </div>
              <div>
                <Label>Pesan Penutup</Label>
                <textarea className={`${inp} !h-auto`} rows={3} value={form.closingMessage}
                  onChange={e => set("closingMessage", e.target.value)} />
              </div>
              <div>
                <Label>Masa Berlaku Penawaran <span className="text-slate-400 font-normal">(opsional)</span></Label>
                <input className={inp} value={form.masaBerlaku}
                  onChange={e => set("masaBerlaku", e.target.value)}
                  placeholder="30 (tiga puluh) hari kerja sejak tanggal surat ini" />
                <Hint>Kosongkan jika tidak perlu ditampilkan.</Hint>
              </div>
              <div>
                <Label>Catatan Tambahan <span className="text-slate-400 font-normal">(opsional)</span></Label>
                <textarea className={`${inp} !h-auto`} rows={3} value={form.catatan}
                  onChange={e => set("catatan", e.target.value)}
                  placeholder="Contoh: Harga belum termasuk biaya survey. Pembayaran DP 50% di muka." />
                <Hint>Ditampilkan di bawah tabel, sebelum pesan penutup.</Hint>
              </div>
            </div>
          </Section>

          {/* Mobile bottom padding */}
          <div className="h-24 sm:hidden" />
        </div>

        {/* ── PREVIEW COLUMN ── */}
        <div className={`w-[460px] xl:w-[520px] flex-shrink-0 sticky top-[72px] ${mTab === "form" ? "hidden xl:block" : "block"}`}>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
            style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-700">Preview RAB</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">{zoom}%</span>
                <input type="range" min={40} max={100} value={zoom}
                  onChange={e => setZoom(+e.target.value)}
                  className="w-20 accent-amber-500" />
                <button onClick={triggerPrint}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                  <Printer className="w-3.5 h-3.5" /> Cetak
                </button>
              </div>
            </div>
            <div className="overflow-auto" style={{ maxHeight: "calc(100vh - 180px)", background: "#6b6b6b" }}>
              <div className="py-4 px-2 flex justify-center">
                <div style={{
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: "top center",
                  width: 794,
                  flexShrink: 0,
                  marginBottom: zoom < 100 ? `${(zoom - 100) * 7.94}px` : 0,
                }}>
                  <div ref={printRef}>
                    <TemplateRabAdytia data={form} instansi={selectedInstansi} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="bg-white rounded-xl border border-slate-200 px-3 py-2.5">
              <div className="text-lg font-bold text-slate-800">{form.items.length}</div>
              <div className="text-[11px] text-slate-400 leading-tight">Item</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 px-3 py-2.5">
              <div className="text-[13px] font-bold text-amber-600 leading-tight truncate">
                {formatRupiah(totals.grandTotal)}
              </div>
              <div className="text-[11px] text-slate-400 leading-tight">Total</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 px-3 py-2.5">
              <div className={`text-[13px] font-bold leading-tight ${form.status === "final" ? "text-emerald-600" : "text-amber-600"}`}>
                {statusLabel}
              </div>
              <div className="text-[11px] text-slate-400 leading-tight">Status</div>
            </div>
          </div>
        </div>

      </div>

      {/* ══════════════ MOBILE BOTTOM BAR ══════════════ */}
      <div className="xl:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 px-4 py-3 flex gap-3"
        style={{ boxShadow: "0 -2px 12px rgba(0,0,0,0.08)" }}>
        <button onClick={triggerPrint}
          className="p-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 shrink-0">
          <Printer className="w-5 h-5" />
        </button>
        <button onClick={() => save("draft")} disabled={saving}
          className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors">
          {saving ? "Menyimpan…" : "Simpan Draft"}
        </button>
        <button onClick={() => save("final")} disabled={saving}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-opacity"
          style={{ background: navy }}>
          {saving ? "…" : "✓ Simpan Final"}
        </button>
      </div>

      {/* ══════════════ SAVING OVERLAY ══════════════ */}
      {saving && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl px-8 py-6 flex flex-col items-center gap-3 shadow-2xl">
            <div className="w-10 h-10 border-4 border-slate-200 rounded-full animate-spin"
              style={{ borderTopColor: "#92400E" }} />
            <p className="text-sm font-medium text-slate-700">Menyimpan RAB…</p>
          </div>
        </div>
      )}

      {/* ══════════════ TOAST ══════════════ */}
      <div className={`fixed bottom-20 xl:bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl text-sm font-medium text-white shadow-lg transition-all duration-300 pointer-events-none z-50 whitespace-nowrap ${
        toast.on ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      }`} style={{ background: toast.err ? "#C42B1C" : "#1C1C2E" }}>
        {toast.msg}
      </div>

      {/* ══════════════ COPY RAB MODAL ══════════════ */}
      {showCopyRab && (
        <CopyRabModal
          onClose={() => setShowCopyRab(false)}
          onCopy={handleCopyRabItems}
        />
      )}

    </div>
  );
}

/* ─── Reusable primitives ──────────────────────────────── */
const inp = "w-full h-11 px-3 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-colors placeholder-slate-400";

function Label({ children, required }) {
  return (
    <label className="block text-sm font-medium text-slate-700 mb-1.5">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function Hint({ children }) {
  return <p className="mt-1 text-xs text-slate-400">{children}</p>;
}

/* ─── Section Card ─────────────────────────────────────── */
function Section({ icon, title, subtitle, color, open, onToggle, children, extra }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      <div className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50 transition-colors cursor-pointer"
        onClick={onToggle} role="button" tabIndex={0}
        onKeyDown={e => (e.key === "Enter" || e.key === " ") && onToggle()}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: color + "18" }}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="text-xs text-slate-400 leading-tight truncate">{subtitle}</p>
        </div>
        {extra && <div onClick={e => e.stopPropagation()}>{extra}</div>}
        <div className="text-slate-400 ml-1 shrink-0">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>
      {open && <div className="h-0.5 mx-5 rounded-full" style={{ background: color + "40" }} />}
      {open && <div className="px-5 pb-5 pt-4">{children}</div>}
    </div>
  );
}

/* ─── Modal edit nama item ──────────────────────────────── */
function NamaEditModal({ value, itemIndex, onSave, onClose }) {
  const [draft, setDraft] = useState(value);
  const taRef = useRef(null);
  useEffect(() => { taRef.current?.focus(); taRef.current?.select(); }, []);
  const save = () => { onSave(draft); onClose(); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onMouseDown={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-md mx-4"
        onMouseDown={e => e.stopPropagation()}>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
          Item #{itemIndex + 1} — Nama Barang / Jasa
        </p>
        <textarea
          ref={taRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) save(); if (e.key === "Escape") onClose(); }}
          rows={4}
          placeholder="Nama barang atau jasa…"
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 resize-none mt-1"
        />
        <p className="text-xs text-slate-400 mt-1 mb-3">Ctrl+Enter untuk simpan · Esc untuk batal</p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose}
            className="px-3 py-1.5 text-sm rounded-lg text-slate-600 hover:bg-slate-100 transition-colors">
            Batal
          </button>
          <button onClick={save}
            className="px-4 py-1.5 text-sm rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium transition-colors">
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Item Row ─────────────────────────────────────────── */
function ItemRow({ item, index, onChange, onRemove, canRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const jml = (Number(item.volume) || 0) * (Number(item.hargaSatuan) || 0);
  const [editingNama, setEditingNama] = useState(false);

  return (
    <div ref={setNodeRef} style={style}
      className={`bg-white border rounded-xl transition-shadow ${isDragging ? "shadow-xl opacity-60 border-amber-300" : "border-slate-200 hover:border-slate-300"}`}>

      {editingNama && (
        <NamaEditModal
          value={item.nama}
          itemIndex={index}
          onSave={v => onChange({ nama: v })}
          onClose={() => setEditingNama(false)}
        />
      )}

      {/* Desktop */}
      <div className="hidden sm:grid items-center gap-2 px-3 py-2.5"
        style={{ gridTemplateColumns: "28px 28px 1fr 80px 72px 120px 96px 32px" }}>
        <button className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing flex justify-center"
          {...attributes} {...listeners}>
          <GripVertical size={14} />
        </button>
        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs flex items-center justify-center font-semibold">
          {index + 1}
        </span>
        <button type="button" onClick={() => setEditingNama(true)}
          className="text-left text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 w-full truncate hover:border-amber-400 hover:bg-amber-50/40 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/30">
          {item.nama
            ? <span className="text-slate-900">{item.nama}</span>
            : <span className="text-slate-300">Nama barang atau jasa…</span>}
        </button>
        <select value={item.satuan} onChange={e => onChange({ satuan: e.target.value })}
          className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500/30 bg-white text-center">
          {SATUAN_OPTIONS.map(s => <option key={s}>{s}</option>)}
        </select>
        <input type="number" min="0" step="0.01" value={item.volume}
          onChange={e => onChange({ volume: e.target.value })}
          className="text-sm text-center border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500/30 w-full" />
        <input type="number" min="0" step="1" value={item.hargaSatuan}
          onChange={e => onChange({ hargaSatuan: e.target.value })} placeholder="0"
          className="text-sm text-right border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500/30 w-full" />
        <span className="text-sm font-bold text-amber-700 text-right">{formatRupiahPlain(jml)}</span>
        <button onClick={onRemove} disabled={!canRemove}
          className="flex justify-center text-slate-300 hover:text-red-500 transition-colors disabled:opacity-30">
          <Trash2 size={14} />
        </button>
      </div>

      {/* Mobile */}
      <div className="sm:hidden p-3 space-y-2">
        <div className="flex items-center gap-2">
          <button className="text-slate-300 cursor-grab shrink-0" {...attributes} {...listeners}>
            <GripVertical size={16} />
          </button>
          <span className="text-xs font-semibold text-slate-400 shrink-0">#{index + 1}</span>
          <button type="button" onClick={() => setEditingNama(true)}
            className="flex-1 text-left text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 truncate hover:border-amber-400 hover:bg-amber-50/40 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/30 min-w-0">
            {item.nama
              ? <span className="text-slate-900">{item.nama}</span>
              : <span className="text-slate-300">Nama barang…</span>}
          </button>
          <button onClick={onRemove} disabled={!canRemove}
            className="text-slate-300 hover:text-red-500 transition-colors disabled:opacity-30 shrink-0">
            <Trash2 size={14} />
          </button>
        </div>
        <div className="flex items-center gap-2 pl-8">
          <input type="number" min="0" value={item.volume}
            onChange={e => onChange({ volume: e.target.value })}
            className="w-16 text-sm text-center border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
          <select value={item.satuan} onChange={e => onChange({ satuan: e.target.value })}
            className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30">
            {SATUAN_OPTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
          <span className="text-slate-400 text-xs">×</span>
          <input type="number" min="0" value={item.hargaSatuan}
            onChange={e => onChange({ hargaSatuan: e.target.value })} placeholder="Harga"
            className="flex-1 text-sm text-right border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
          <span className="text-xs font-bold text-amber-700 shrink-0">{formatRupiahPlain(jml)}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Copy RAB Modal ───────────────────────────────────── */
function CopyRabModal({ onClose, onCopy }) {
  const [rabList,    setRabList]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [selected,   setSelected]   = useState(null);
  const [preview,    setPreview]    = useState([]);
  const [appendMode, setAppendMode] = useState(false);
  const [error,      setError]      = useState("");

  useEffect(() => {
    getAllDokumen({ type: "rab" })
      .then(list => setRabList(list))
      .catch(() => setError("Gagal memuat daftar RAB"))
      .finally(() => setLoading(false));
  }, []);

  const selectRab = async rab => {
    setSelected(rab); setError("");
    try {
      const detail = await getDokumen(rab.id).catch(() => rab);
      setPreview((detail?.items || [])
        .map(it => ({ ...newItem(), nama: String(it.nama || "").trim(), satuan: String(it.satuan || "pcs"), volume: Number(it.volume) || 1, hargaSatuan: Number(it.hargaSatuan) || 0 }))
        .filter(it => it.nama));
    } catch { setError("Gagal memuat detail RAB"); setPreview([]); }
  };

  const filtered = rabList.filter(r => {
    if (!search) return true;
    return [r.nomor, r.perihal, r.kepada?.perusahaan, r.kepada?.yth]
      .filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <p className="font-semibold text-slate-900">Salin Item dari RAB Lain</p>
            <p className="text-xs text-slate-400 mt-0.5">Ambil daftar item dari RAB yang sudah tersimpan</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors text-lg">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <input className={inp} placeholder="🔍 Cari nomor, perihal, atau nama klien…"
            value={search} onChange={e => setSearch(e.target.value)} autoFocus />

          {loading ? (
            <div className="text-center py-8 text-slate-400 text-sm">Memuat daftar RAB…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">Tidak ada RAB ditemukan.</div>
          ) : (
            <div className="space-y-1.5 max-h-44 overflow-y-auto">
              {filtered.map(r => (
                <button key={r.id} onClick={() => selectRab(r)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all text-sm ${
                    selected?.id === r.id
                      ? "border-amber-400 bg-amber-50"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}>
                  <div className="font-semibold text-slate-800 truncate mb-0.5">{r.nomor || "—"}</div>
                  <div className="text-xs text-slate-400 truncate">
                    {r.kepada?.perusahaan || r.kepada?.yth || "—"}
                    {r.perihal && ` · ${r.perihal}`}
                    {r.items?.length && ` · ${r.items.length} item`}
                  </div>
                </button>
              ))}
            </div>
          )}

          {preview.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-amber-800 mb-2">
                Preview — {preview.length} item dari "{selected?.nomor || selected?.perihal || "—"}"
              </p>
              <div className="space-y-1">
                {preview.slice(0, 5).map((it, i) => (
                  <div key={i} className="text-xs text-slate-600 flex justify-between">
                    <span className="truncate flex-1">{i + 1}. {it.nama}</span>
                    <span className="text-amber-700 font-medium ml-2 shrink-0">{formatRupiahPlain(it.volume * it.hargaSatuan)}</span>
                  </div>
                ))}
                {preview.length > 5 && <p className="text-xs text-slate-400">…dan {preview.length - 5} item lainnya</p>}
              </div>
            </div>
          )}

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" checked={appendMode} onChange={e => setAppendMode(e.target.checked)}
              className="mt-0.5 rounded accent-amber-500" />
            <span className="text-sm text-slate-600">
              Tambahkan ke item yang sudah ada
              <span className="block text-xs text-slate-400">(tidak menghapus item yang sudah diinput)</span>
            </span>
          </label>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            Batal
          </button>
          <button
            onClick={() => { if (preview.length) { onCopy(preview, appendMode); onClose(); } }}
            disabled={!selected || !preview.length}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-40"
            style={{ background: navy }}>
            Salin {preview.length} Item
          </button>
        </div>
      </div>
    </div>
  );
}

function deriveKota(alamat = "") {
  if (!alamat) return "";
  const last = alamat.split(",").pop()?.trim() || "";
  return last.split(/[-–]/).pop()?.trim() || last;
}
