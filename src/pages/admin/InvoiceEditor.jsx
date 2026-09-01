import { useEffect, useState, useContext, useMemo, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, RefreshCw, GripVertical, Trash2, Plus,
  Printer, CheckCircle, Save, ChevronDown, ChevronUp,
  FileText, User, CreditCard, MessageSquare, Building2,
  AlertCircle, Eye, Copy, Lock, Send, ClipboardList, Pencil,
} from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { AuthContext } from "../../context/AuthContext";
import { useGuestPermission } from "../../hooks/useGuestPermission";
import { submitForApproval } from "../../services/guestService";
import {
  createDokumen, updateDokumen, getDokumen, getAllDokumen, suggestNomor,
  hitungTotalGroups, hitungSubtotalGroup, hitungTotalFromDoc,
  formatRupiah, formatRupiahPlain,
  newItem, newGroup, SATUAN_OPTIONS, DEFAULT_CLOSING,
} from "../../services/rabService";
import { getAllInstansi } from "../../services/instansiService";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import TemplateInvoiceAdytia from "../../templates/invoice/TemplateInvoiceAdytia";
import { inlineImgsForPrint } from "../../utils/inlineImgsForPrint";

const TODAY = () => new Date().toISOString().slice(0, 10);

const makeEmpty = () => ({
  type: "invoice",
  nomor: "",
  perihal: "",
  tagihan: { nama: "", perusahaan: "", alamat: "", telp: "", email: "" },
  tanggal: TODAY(),
  jatuhTempo: "",
  lokasi: "",
  instansiId: "",
  ttd: null,
  tampilTtd: true,
  groups: [newGroup("Daftar Pekerjaan")],
  ppnAktif: true,
  pembayaran: { bank: "", noRek: "", atasNama: "" },
  catatan: "",
  closingMessage: DEFAULT_CLOSING.invoice,
  status: "draft",
});

const navy  = "#003087";
const gold  = "#F59E0B";

export default function InvoiceEditor() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { user, role, profile } = useContext(AuthContext);

  const invPermission = useGuestPermission("invoice");
  const isReadOnly    = role === "guest" && invPermission === "read";
  const needsApproval = role === "guest" && invPermission === "write_approval";

  const [form, setForm]               = useState(makeEmpty);
  const [instansiList, setInstansiList] = useState([]);
  const [loading, setLoading]         = useState(isEdit);
  const [saving, setSaving]           = useState(false);
  const [zoom, setZoom]               = useState(62);
  const [mTab, setMTab]               = useState("form");
  const [autoSaved, setAutoSaved]     = useState(false);
  const [toast, setToast]             = useState({ msg: "", on: false, err: false });
  const [showCopy, setShowCopy]       = useState(false);
  const [showRabPicker, setShowRabPicker] = useState(false);
  const [openSec, setOpenSec]         = useState({
    info: true, letterhead: true, tagihan: true,
    items: true, pembayaran: true, closing: false,
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
        if (!data) { showToast("Dokumen tidak ditemukan", true); navigate("/Dashboard/invoice"); return; }
        // Migrate old flat items → groups
        let normalized = { ...makeEmpty(), ...data };
        if (data.items && !data.groups) {
          normalized.groups = [{
            id: `grp_${Date.now()}`,
            nama: "Daftar Pekerjaan",
            items: data.items,
          }];
        }
        delete normalized.items;
        setForm(normalized);
        loadedIdRef.current = id;
      })
      .catch(() => showToast("Gagal memuat", true))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (isEdit || form.nomor) return;
    suggestNomor("invoice", form.tanggal)
      .then(nomor => setForm(f => f.nomor ? f : { ...f, nomor }))
      .catch(console.error);
  }, [isEdit, form.tanggal, form.nomor]);

  const refreshNomor = async () => {
    const nomor = await suggestNomor("invoice", form.tanggal);
    setForm(f => ({ ...f, nomor }));
    showToast("Nomor diperbarui");
  };

  /* ── derived ── */
  const totals = useMemo(
    () => hitungTotalGroups(form.groups, form.ppnAktif, 11),
    [form.groups, form.ppnAktif]
  );
  const totalItemCount   = useMemo(
    () => (form.groups || []).reduce((n, g) => n + (g.items?.length || 0), 0),
    [form.groups]
  );
  const selectedInstansi = instansiList.find(i => i.id === form.instansiId) ?? null;
  const pjList           = selectedInstansi?.penanggungJawab ?? [];

  /* ── setters ── */
  const set           = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setTagihan    = (k, v) => setForm(f => ({ ...f, tagihan:    { ...f.tagihan,    [k]: v } }));
  const setPembayaran = (k, v) => setForm(f => ({ ...f, pembayaran: { ...f.pembayaran, [k]: v } }));
  const toggleSec     = k => setOpenSec(s => ({ ...s, [k]: !s[k] }));

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

  /* ── group management ── */
  const addGroup = () => setForm(f => ({
    ...f,
    groups: f.groups.length < 26
      ? [...f.groups, newGroup("Kategori Baru")]
      : f.groups,
  }));

  const removeGroup = gIdx => setForm(f => ({
    ...f,
    groups: f.groups.length > 1 ? f.groups.filter((_, i) => i !== gIdx) : f.groups,
  }));

  const renameGroup = (gIdx, nama) => setForm(f => {
    const groups = [...f.groups];
    groups[gIdx] = { ...groups[gIdx], nama };
    return { ...f, groups };
  });

  const moveGroupUp = gIdx => setForm(f => {
    if (gIdx === 0) return f;
    const groups = [...f.groups];
    [groups[gIdx - 1], groups[gIdx]] = [groups[gIdx], groups[gIdx - 1]];
    return { ...f, groups };
  });

  const moveGroupDown = gIdx => setForm(f => {
    if (gIdx >= f.groups.length - 1) return f;
    const groups = [...f.groups];
    [groups[gIdx], groups[gIdx + 1]] = [groups[gIdx + 1], groups[gIdx]];
    return { ...f, groups };
  });

  /* ── item management ── */
  const addItemToGroup = gIdx => setForm(f => {
    const groups = [...f.groups];
    groups[gIdx] = { ...groups[gIdx], items: [...groups[gIdx].items, newItem()] };
    return { ...f, groups };
  });

  const updateGroupItem = (gIdx, iIdx, patch) => setForm(f => {
    const groups = [...f.groups];
    const items = [...groups[gIdx].items];
    items[iIdx] = { ...items[iIdx], ...patch };
    groups[gIdx] = { ...groups[gIdx], items };
    return { ...f, groups };
  });

  const removeGroupItem = (gIdx, iIdx) => setForm(f => {
    const groups = [...f.groups];
    groups[gIdx] = { ...groups[gIdx], items: groups[gIdx].items.filter((_, i) => i !== iIdx) };
    return { ...f, groups };
  });

  const handleGroupDragEnd = (gIdx, { active, over }) => {
    if (!over || active.id === over.id) return;
    setForm(f => {
      const groups = [...f.groups];
      const items = [...groups[gIdx].items];
      const o = items.findIndex(i => i.id === active.id);
      const n = items.findIndex(i => i.id === over.id);
      groups[gIdx] = { ...groups[gIdx], items: arrayMove(items, o, n) };
      return { ...f, groups };
    });
  };

  /* ── copy items ── */
  const handleCopyItems = (items, append) => {
    const newGrp = {
      id: `grp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      nama: "Disalin",
      items,
    };
    setForm(f => ({
      ...f,
      groups: append ? [...f.groups, newGrp] : [newGrp],
    }));
    showToast(`✓ ${items.length} item berhasil disalin sebagai kategori baru`);
  };

  /* ── auto-save ── */
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
    if (!form.perihal.trim())               return "Perihal wajib diisi";
    if (!form.instansiId)                   return "Pilih instansi (letterhead)";
    if (form.tampilTtd && !form.ttd?.nama)  return "Pilih penanggung jawab (TTD)";
    const groups = form.groups || [];
    if (!groups.length)                     return "Minimal 1 kategori";
    const allItems = groups.flatMap(g => g.items || []);
    if (!allItems.length)                   return "Minimal 1 item";
    if (allItems.find(it => !it.nama.trim())) return "Ada item tanpa nama";
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
          module: "invoice",
          targetCollection: "dokumen_keuangan",
          docId: id || null,
          operation: id ? "update" : "create",
          proposedData: payload,
        });
        showToast("Perubahan diajukan ✓ Menunggu persetujuan admin");
        setTimeout(() => navigate("/Dashboard/invoice"), 1500);
        return;
      }

      if (isEdit) {
        await updateDokumen(id, payload);
        showToast("Tersimpan ✓");
        if (statusNext === "final") navigate(`/invoice/${id}`);
      } else {
        const newId = await createDokumen(payload, user.uid);
        loadedIdRef.current = newId;
        showToast("Invoice dibuat ✓");
        if (statusNext === "final") navigate(`/invoice/${newId}`);
        else navigate(`/Dashboard/invoice/${newId}`, { replace: true });
      }
    } catch (e) {
      showToast("Gagal: " + e.message, true);
    } finally { setSaving(false); }
  };

  const restoreImgs = useRef(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Invoice-${form.nomor || form.perihal || "dokumen"}`,
    onBeforePrint: async () => {
      if (!printRef.current) return;
      restoreImgs.current = await inlineImgsForPrint(printRef.current);
    },
    onAfterPrint: () => {
      restoreImgs.current?.();
      restoreImgs.current = null;
    },
    pageStyle: `@page{size:A4 portrait;margin:0}@media print{body{background:#fff!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}.laporan-form{page-break-after:always;margin:0!important}.laporan-form:last-child{page-break-after:auto}.laporan-page{box-shadow:none!important;margin:0!important}.laporan-section{page-break-inside:avoid}table{page-break-inside:avoid}img{max-width:100%!important}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}`,
  });

  const triggerPrint = () => {
    const err = validate();
    if (err) { showToast(err, true); return; }
    handlePrint();
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 text-sm">Memuat data invoice…</p>
      </div>
    </div>
  );

  const statusLabel = form.status === "final" ? "Lunas" : "Draft";
  const statusClass = form.status === "final" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700";

  return (
    <div className="min-h-screen bg-slate-100">

      {/* ══ STICKY HEADER ══ */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
        <div className="flex items-center gap-3 px-4 py-3 max-w-screen-2xl mx-auto">
          <button onClick={() => navigate("/Dashboard/invoice")}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium shrink-0">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Kembali</span>
          </button>
          <div className="w-px h-5 bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ background: navy }}>I</div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 leading-tight truncate">{isEdit ? "Edit Invoice" : "Buat Invoice Baru"}</p>
              <p className="text-xs text-slate-400 truncate leading-tight">{form.nomor || "Nomor belum diisi"}</p>
            </div>
            <span className={`hidden sm:inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusClass}`}>{statusLabel}</span>
            {autoSaved && <span className="hidden sm:inline text-xs text-emerald-600 font-medium animate-pulse">✓ Tersimpan otomatis</span>}
          </div>
          <div className="flex xl:hidden rounded-lg border border-slate-200 overflow-hidden text-xs font-medium">
            <button onClick={() => setMTab("form")}
              className={`px-3 py-1.5 transition-colors ${mTab === "form" ? "text-white" : "text-slate-600 bg-white"}`}
              style={mTab === "form" ? { background: navy } : {}}>Form</button>
            <button onClick={() => setMTab("preview")}
              className={`px-3 py-1.5 transition-colors ${mTab === "preview" ? "text-white" : "text-slate-600 bg-white"}`}
              style={mTab === "preview" ? { background: navy } : {}}>Preview</button>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isReadOnly && (
              <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-lg">
                <Lock className="w-3 h-3" /> Mode Baca Saja
              </span>
            )}
            <button onClick={triggerPrint}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
              <Printer className="w-4 h-4" /><span className="hidden md:inline">Cetak</span>
            </button>
            {!isReadOnly && (needsApproval ? (
              <button onClick={() => save("draft")} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-opacity disabled:opacity-50">
                <Send className="w-4 h-4" /><span>{saving ? "…" : "Ajukan Perubahan"}</span>
              </button>
            ) : (
              <>
                <button onClick={() => save("draft")} disabled={saving}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">
                  <Save className="w-4 h-4" /><span className="hidden md:inline">{saving ? "Menyimpan…" : "Simpan Draft"}</span>
                </button>
                <button onClick={() => save("final")} disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg text-white transition-opacity disabled:opacity-50"
                  style={{ background: navy }}>
                  <CheckCircle className="w-4 h-4" /><span>{saving ? "…" : "Simpan Final"}</span>
                </button>
              </>
            ))}
          </div>
        </div>
      </header>

      {isReadOnly && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-2 text-sm text-amber-800">
          <Lock className="w-4 h-4 shrink-0" />
          <span>Anda hanya memiliki akses <strong>baca saja</strong> untuk Invoice.</span>
        </div>
      )}
      {needsApproval && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2.5 flex items-center gap-2 text-sm text-blue-800">
          <Send className="w-4 h-4 shrink-0" />
          <span>Perubahan akan <strong>diajukan untuk persetujuan admin</strong> sebelum diterapkan.</span>
        </div>
      )}

      {/* ══ MAIN BODY ══ */}
      <div className="max-w-screen-2xl mx-auto px-3 sm:px-4 py-5 flex gap-5 items-start">

        <div className={`flex-1 min-w-0 space-y-4 ${mTab === "preview" ? "hidden xl:block" : ""}`}>

          {/* ▸ Buat dari RAB */}
          {!isEdit && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-amber-900">Buat invoice dari RAB?</p>
                <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">Isi otomatis perihal, item, instansi, dan data penerima dari RAB.</p>
                {form.sourceRabNomor && (
                  <p className="mt-1.5 text-xs font-medium text-amber-800 bg-amber-100 rounded-lg px-2.5 py-1 inline-flex items-center gap-1.5">
                    <ClipboardList className="w-3 h-3 shrink-0" /> Diisi dari RAB {form.sourceRabNomor}
                  </p>
                )}
              </div>
              <button onClick={() => setShowRabPicker(true)}
                className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 transition-colors">
                <ClipboardList className="w-4 h-4" />
                {form.sourceRabNomor ? "Ganti RAB" : "Pilih RAB"}
              </button>
            </div>
          )}
          {isEdit && form.sourceRabNomor && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800">
              <ClipboardList className="w-3.5 h-3.5 shrink-0" />
              Invoice ini dibuat dari RAB <strong>{form.sourceRabNomor}</strong>
            </div>
          )}

          {/* ▸ Informasi Invoice */}
          <Section
            icon={<FileText className="w-5 h-5" style={{ color: "#3B82F6" }} />}
            title="Informasi Invoice"
            subtitle="Nomor, perihal, dan tanggal dokumen"
            color="#3B82F6" open={openSec.info} onToggle={() => toggleSec("info")}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>Nomor Invoice</Label>
                <div className="flex gap-2">
                  <input className={inp} value={form.nomor} onChange={e => set("nomor", e.target.value)} placeholder="001/APT/VI/2026" />
                  <button onClick={refreshNomor} title="Generate ulang" className="px-3 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors shrink-0">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                <Hint>Nomor urut otomatis. Klik ↻ untuk generate ulang.</Hint>
              </div>
              <div className="sm:col-span-2">
                <Label required>Perihal / Keterangan</Label>
                <input className={inp} value={form.perihal} onChange={e => set("perihal", e.target.value)} placeholder="Pembayaran Jasa Instalasi Listrik" />
              </div>
              <div>
                <Label>Tanggal Invoice</Label>
                <input type="date" className={inp} value={form.tanggal} onChange={e => set("tanggal", e.target.value)} />
              </div>
              <div>
                <Label>Jatuh Tempo <span className="text-slate-400 font-normal">(opsional)</span></Label>
                <input type="date" className={inp} value={form.jatuhTempo} onChange={e => set("jatuhTempo", e.target.value)} />
              </div>
              <div>
                <Label>Status</Label>
                <select className={inp} value={form.status} onChange={e => set("status", e.target.value)}>
                  <option value="draft">Draft — Belum Dibayar</option>
                  <option value="final">Final — Lunas</option>
                </select>
              </div>
            </div>
          </Section>

          {/* ▸ Dari (Penerbit) */}
          <Section
            icon={<Building2 className="w-5 h-5" style={{ color: "#8B5CF6" }} />}
            title="Dari (Penerbit Invoice)"
            subtitle="Pilih instansi, lokasi, dan penanggung jawab"
            color="#8B5CF6" open={openSec.letterhead} onToggle={() => toggleSec("letterhead")}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label required>Instansi / Perusahaan</Label>
                <select className={inp} value={form.instansiId} onChange={e => handleInstansiChange(e.target.value)}>
                  <option value="">— Pilih instansi —</option>
                  {instansiList.map(i => <option key={i.id} value={i.id}>{i.nama}</option>)}
                </select>
                {selectedInstansi && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                    <div className="w-5 h-5 rounded bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">{selectedInstansi.nama?.[0] || "?"}</div>
                    <span>{selectedInstansi.nama}</span>
                    {selectedInstansi.alamat && <span className="truncate text-slate-400">· {selectedInstansi.alamat}</span>}
                  </div>
                )}
              </div>
              <div>
                <Label>Kota / Lokasi</Label>
                <input className={inp} value={form.lokasi} onChange={e => set("lokasi", e.target.value)} placeholder="Gresik" />
                <Hint>Tampil di header: "Gresik, 22 Juni 2026"</Hint>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label required={form.tampilTtd}>Penanggung Jawab (TTD)</Label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <span className="text-xs text-slate-500">Tampilkan TTD</span>
                    <button type="button" onClick={() => set("tampilTtd", !form.tampilTtd)}
                      className={`relative w-9 h-5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${form.tampilTtd ? "bg-blue-500" : "bg-slate-200"}`}>
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.tampilTtd ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                  </label>
                </div>
                {form.tampilTtd ? (
                  <>
                    <select className={inp} value={form.ttd?.penanggungJawabId || ""} onChange={e => handlePjChange(e.target.value)}>
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
                  </>
                ) : (
                  <p className="text-xs text-slate-400 mt-1">Blok tanda tangan disembunyikan dari dokumen.</p>
                )}
              </div>
            </div>
          </Section>

          {/* ▸ Tagihan Kepada */}
          <Section
            icon={<User className="w-5 h-5" style={{ color: "#10B981" }} />}
            title="Tagihan Kepada"
            subtitle="Data pelanggan atau klien"
            color="#10B981" open={openSec.tagihan} onToggle={() => toggleSec("tagihan")}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Label>Nama Kontak</Label><input className={inp} value={form.tagihan.nama} onChange={e => setTagihan("nama", e.target.value)} placeholder="Bapak / Ibu Andi" /></div>
              <div><Label>Nama Perusahaan</Label><input className={inp} value={form.tagihan.perusahaan} onChange={e => setTagihan("perusahaan", e.target.value)} placeholder="PT. Pelanggan Jaya" /></div>
              <div className="sm:col-span-2">
                <Label>Alamat</Label>
                <textarea className={`${inp} !h-auto`} rows={2} value={form.tagihan.alamat} onChange={e => setTagihan("alamat", e.target.value)} placeholder="Jl. Contoh No. 1, Gresik" />
              </div>
              <div><Label>Telepon</Label><input className={inp} value={form.tagihan.telp} onChange={e => setTagihan("telp", e.target.value)} placeholder="08xx-xxxx-xxxx" /></div>
              <div><Label>Email</Label><input className={inp} value={form.tagihan.email} onChange={e => setTagihan("email", e.target.value)} placeholder="email@contoh.com" /></div>
            </div>
          </Section>

          {/* ▸ Daftar Item (Groups) */}
          <Section
            icon={<span className="text-lg leading-none">📦</span>}
            title={`Daftar Barang / Jasa (${totalItemCount} item · ${form.groups.length} kategori)`}
            subtitle="Kelompokkan per kategori. Klik nama untuk edit. Bisa satu atau banyak kategori."
            color={gold} open={openSec.items} onToggle={() => toggleSec("items")}
            extra={
              <div className="flex items-center gap-2">
                <button onClick={addGroup} disabled={form.groups.length >= 26}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40">
                  <Plus className="w-3.5 h-3.5" /> Tambah Kategori
                </button>
                <button onClick={() => setShowCopy(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                  <Copy className="w-3.5 h-3.5" /> Salin Dokumen
                </button>
              </div>
            }
          >
            <div className="space-y-3">
              {form.groups.map((grp, gIdx) => (
                <InvGroupCard
                  key={grp.id}
                  group={grp}
                  gIdx={gIdx}
                  totalGroups={form.groups.length}
                  onRename={nama => renameGroup(gIdx, nama)}
                  onRemove={() => removeGroup(gIdx)}
                  onMoveUp={() => moveGroupUp(gIdx)}
                  onMoveDown={() => moveGroupDown(gIdx)}
                  onAddItem={() => addItemToGroup(gIdx)}
                  onUpdateItem={(iIdx, patch) => updateGroupItem(gIdx, iIdx, patch)}
                  onRemoveItem={iIdx => removeGroupItem(gIdx, iIdx)}
                  onDragEnd={evt => handleGroupDragEnd(gIdx, evt)}
                />
              ))}
            </div>

            {/* Totals */}
            <div className="mt-4 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
              {form.groups.length > 1 && form.groups.map((grp, gIdx) => {
                const sub = hitungSubtotalGroup(grp.items);
                return (
                  <div key={grp.id} className="flex justify-between items-center px-4 py-2 border-b border-slate-100">
                    <span className="text-xs text-slate-500">{grp.nama}</span>
                    <span className="text-xs font-medium text-slate-600">{formatRupiah(sub)}</span>
                  </div>
                );
              })}
              <div className="flex justify-between items-center px-4 py-2.5 border-b border-slate-200 text-sm text-slate-600">
                <span>Subtotal</span>
                <span className="font-medium">{formatRupiah(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between items-center px-4 py-2.5 border-b border-slate-200">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input type="checkbox" checked={form.ppnAktif} onChange={e => set("ppnAktif", e.target.checked)} className="w-4 h-4 rounded accent-amber-500" />
                  <span className="text-sm text-slate-600">Tambahkan PPN 11%</span>
                </label>
                <span className="text-sm font-medium text-slate-600">{form.ppnAktif ? formatRupiah(totals.ppn) : "—"}</span>
              </div>
              <div className="flex justify-between items-center px-4 py-3" style={{ background: navy }}>
                <span className="text-sm font-bold text-white">Total Tagihan</span>
                <span className="text-base font-extrabold" style={{ color: "#FFD700" }}>{formatRupiah(totals.grandTotal)}</span>
              </div>
            </div>
          </Section>

          {/* ▸ Pembayaran */}
          <Section
            icon={<CreditCard className="w-5 h-5" style={{ color: "#EC4899" }} />}
            title="Informasi Pembayaran"
            subtitle="Rekening tujuan untuk transfer pembayaran pelanggan"
            color="#EC4899" open={openSec.pembayaran} onToggle={() => toggleSec("pembayaran")}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Label>Nama Bank</Label><input className={inp} value={form.pembayaran.bank} onChange={e => setPembayaran("bank", e.target.value)} placeholder="BCA, Mandiri, BNI, BRI" /></div>
              <div><Label>Nomor Rekening</Label><input className={inp} value={form.pembayaran.noRek} onChange={e => setPembayaran("noRek", e.target.value)} placeholder="1234 5678 9012" /></div>
              <div className="sm:col-span-2"><Label>Atas Nama</Label><input className={inp} value={form.pembayaran.atasNama} onChange={e => setPembayaran("atasNama", e.target.value)} placeholder="Nama pemilik rekening" /></div>
              <div className="sm:col-span-2 text-xs text-slate-400 flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>Info pembayaran tampil di invoice di bawah tabel item.</span>
              </div>
            </div>
          </Section>

          {/* ▸ Catatan & Penutup */}
          <Section
            icon={<MessageSquare className="w-5 h-5" style={{ color: "#6B7280" }} />}
            title="Catatan & Pesan Penutup"
            subtitle="Opsional — pesan tambahan dan kalimat penutup"
            color="#6B7280" open={openSec.closing} onToggle={() => toggleSec("closing")}
          >
            <div className="space-y-4">
              <div>
                <Label>Pesan Penutup</Label>
                <textarea className={`${inp} !h-auto`} rows={3} value={form.closingMessage} onChange={e => set("closingMessage", e.target.value)} />
              </div>
              <div>
                <Label>Catatan Tambahan <span className="text-slate-400 font-normal">(opsional)</span></Label>
                <textarea className={`${inp} !h-auto`} rows={3} value={form.catatan} onChange={e => set("catatan", e.target.value)} placeholder="Harap menyertakan nomor invoice sebagai berita pembayaran." />
              </div>
            </div>
          </Section>

          <div className="h-24 sm:hidden" />
        </div>

        {/* ── PREVIEW COLUMN ── */}
        <div className={`w-[460px] xl:w-[520px] flex-shrink-0 sticky top-[72px] ${mTab === "form" ? "hidden xl:block" : "block"}`}>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden" style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-700">Preview Invoice</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">{zoom}%</span>
                <input type="range" min={40} max={100} value={zoom} onChange={e => setZoom(+e.target.value)} className="w-20 accent-blue-600" />
                <button onClick={triggerPrint} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                  <Printer className="w-3.5 h-3.5" /> Cetak
                </button>
              </div>
            </div>
            <div className="overflow-auto" style={{ maxHeight: "calc(100vh - 180px)", background: "#6b6b6b" }}>
              <div className="py-4 px-2 flex justify-center">
                <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center", width: 794, flexShrink: 0, marginBottom: zoom < 100 ? `${(zoom - 100) * 7.94}px` : 0 }}>
                  <div ref={printRef}>
                    <TemplateInvoiceAdytia data={form} instansi={selectedInstansi} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="bg-white rounded-xl border border-slate-200 px-3 py-2.5">
              <div className="text-lg font-bold text-slate-800">{totalItemCount}</div>
              <div className="text-[11px] text-slate-400 leading-tight">{form.groups.length} Kategori</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 px-3 py-2.5">
              <div className="text-[13px] font-bold text-amber-600 leading-tight truncate">{formatRupiah(totals.grandTotal)}</div>
              <div className="text-[11px] text-slate-400 leading-tight">Total</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 px-3 py-2.5">
              <div className={`text-[13px] font-bold leading-tight ${form.status === "final" ? "text-emerald-600" : "text-amber-600"}`}>{statusLabel}</div>
              <div className="text-[11px] text-slate-400 leading-tight">Status</div>
            </div>
          </div>
        </div>
      </div>

      {/* ══ MOBILE BOTTOM BAR ══ */}
      <div className="xl:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 px-4 py-3 flex gap-3" style={{ boxShadow: "0 -2px 12px rgba(0,0,0,0.08)" }}>
        <button onClick={triggerPrint} className="p-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 shrink-0"><Printer className="w-5 h-5" /></button>
        <button onClick={() => save("draft")} disabled={saving} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors">{saving ? "Menyimpan…" : "Simpan Draft"}</button>
        <button onClick={() => save("final")} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-opacity" style={{ background: navy }}>{saving ? "…" : "✓ Simpan Final"}</button>
      </div>

      {saving && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl px-8 py-6 flex flex-col items-center gap-3 shadow-2xl">
            <div className="w-10 h-10 border-4 border-slate-200 rounded-full animate-spin" style={{ borderTopColor: navy }} />
            <p className="text-sm font-medium text-slate-700">Menyimpan invoice…</p>
          </div>
        </div>
      )}

      <div className={`fixed bottom-20 xl:bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl text-sm font-medium text-white shadow-lg transition-all duration-300 pointer-events-none z-50 whitespace-nowrap ${toast.on ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}
        style={{ background: toast.err ? "#C42B1C" : "#1C1C2E" }}>
        {toast.msg}
      </div>

      {showCopy && (
        <CopyItemsModal onClose={() => setShowCopy(false)} onCopy={handleCopyItems} />
      )}
      {showRabPicker && (
        <RabPickerModal
          onClose={() => setShowRabPicker(false)}
          onSelect={rab => {
            const mapped = mapRabToInvoice(rab);
            setForm(f => ({ ...f, ...mapped }));
            suggestNomor("invoice", mapped.tanggal)
              .then(nomor => setForm(f => ({ ...f, nomor })))
              .catch(console.error);
            setShowRabPicker(false);
            showToast(`✓ Form diisi dari RAB "${rab.nomor || rab.perihal}"`);
          }}
        />
      )}
    </div>
  );
}

/* ─── Primitives ───────────────────────────────────────── */
const inp = "w-full h-11 px-3 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors placeholder-slate-400";

function Label({ children, required }) {
  return (
    <label className="block text-sm font-medium text-slate-700 mb-1.5">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}
function Hint({ children }) { return <p className="mt-1 text-xs text-slate-400">{children}</p>; }

function Section({ icon, title, subtitle, color, open, onToggle, children, extra }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      <button className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50 transition-colors" onClick={onToggle}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color + "18" }}>{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="text-xs text-slate-400 leading-tight truncate">{subtitle}</p>
        </div>
        {extra && <div onClick={e => e.stopPropagation()}>{extra}</div>}
        <div className="text-slate-400 ml-1 shrink-0">{open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</div>
      </button>
      {open && <div className="h-0.5 mx-5 rounded-full" style={{ background: color + "40" }} />}
      {open && <div className="px-5 pb-5 pt-4">{children}</div>}
    </div>
  );
}

/* ─── Invoice Group Card ───────────────────────────────── */
function InvGroupCard({
  group, gIdx, totalGroups,
  onRename, onRemove, onMoveUp, onMoveDown,
  onAddItem, onUpdateItem, onRemoveItem, onDragEnd,
}) {
  const sensors   = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const subtotal  = hitungSubtotalGroup(group.items);
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(group.nama);
  const inputRef  = useRef(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commitRename = () => {
    const name = draft.trim() || group.nama;
    onRename(name);
    setDraft(name);
    setEditing(false);
  };

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border-b border-slate-200">
        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
          {gIdx + 1}
        </div>
        {editing ? (
          <input ref={inputRef} value={draft} onChange={e => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setEditing(false); }}
            className="flex-1 min-w-0 text-sm font-bold border-b-2 border-blue-400 bg-transparent focus:outline-none px-1 py-0.5"
            placeholder="Nama kategori…"
          />
        ) : (
          <button onClick={() => { setDraft(group.nama); setEditing(true); }}
            className="flex-1 min-w-0 flex items-center gap-1.5 text-left font-bold text-slate-800 hover:text-blue-600 transition-colors text-sm truncate">
            <span className="truncate">{group.nama}</span>
            <Pencil size={11} className="text-slate-400 shrink-0" />
          </button>
        )}
        <div className="flex items-center gap-0.5 shrink-0 ml-auto">
          <button onClick={onMoveUp} disabled={gIdx === 0} title="Naik"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white disabled:opacity-25 transition-colors">
            <ChevronUp size={13} />
          </button>
          <button onClick={onMoveDown} disabled={gIdx === totalGroups - 1} title="Turun"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white disabled:opacity-25 transition-colors">
            <ChevronDown size={13} />
          </button>
          <button onClick={onRemove} disabled={totalGroups <= 1} title="Hapus Kategori"
            className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-25 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Column headers */}
      <div className="hidden sm:grid text-xs font-semibold text-slate-400 uppercase tracking-wide px-3 pt-3 pb-1"
        style={{ gridTemplateColumns: "28px 28px 1fr 80px 72px 120px 96px 32px" }}>
        <div /><div className="text-center">#</div>
        <div>Nama Barang / Jasa</div>
        <div className="text-center">Satuan</div>
        <div className="text-center">Vol</div>
        <div className="text-right">Harga Satuan</div>
        <div className="text-right">Jumlah</div>
        <div />
      </div>

      <div className="px-3 pb-3">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={group.items.map(i => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2 pt-1">
              {group.items.map((it, iIdx) => (
                <ItemRow
                  key={it.id} item={it} index={iIdx}
                  onChange={patch => onUpdateItem(iIdx, patch)}
                  onRemove={() => onRemoveItem(iIdx)}
                  canRemove={group.items.length > 1}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <button onClick={onAddItem}
          className="mt-2 w-full py-2 border-2 border-dashed border-slate-200 rounded-xl text-xs font-medium text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-colors flex items-center justify-center gap-1.5">
          <Plus className="w-3 h-3" /> Tambah Item ke {group.nama}
        </button>
        <div className="mt-2 flex justify-end items-center gap-2 px-1">
          <span className="text-xs text-slate-500">Subtotal {group.nama}:</span>
          <span className="text-sm font-bold text-slate-700">{formatRupiah(subtotal)}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── NamaEditModal ────────────────────────────────────── */
function NamaEditModal({ value, itemIndex, onSave, onClose }) {
  const [draft, setDraft] = useState(value);
  const taRef = useRef(null);
  useEffect(() => { taRef.current?.focus(); taRef.current?.select(); }, []);
  const save = () => { onSave(draft); onClose(); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onMouseDown={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-md mx-4" onMouseDown={e => e.stopPropagation()}>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Item #{itemIndex + 1} — Nama Barang / Jasa</p>
        <textarea ref={taRef} value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) save(); if (e.key === "Escape") onClose(); }}
          rows={4} placeholder="Nama barang atau jasa…"
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 resize-none mt-1" />
        <p className="text-xs text-slate-400 mt-1 mb-3">Ctrl+Enter untuk simpan · Esc untuk batal</p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-sm rounded-lg text-slate-600 hover:bg-slate-100 transition-colors">Batal</button>
          <button onClick={save} className="px-4 py-1.5 text-sm rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors">Simpan</button>
        </div>
      </div>
    </div>
  );
}

/* ─── ItemRow ──────────────────────────────────────────── */
function ItemRow({ item, index, onChange, onRemove, canRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const jml = (Number(item.volume) || 0) * (Number(item.hargaSatuan) || 0);
  const [editingNama, setEditingNama] = useState(false);

  return (
    <div ref={setNodeRef} style={style}
      className={`bg-white border rounded-xl transition-shadow ${isDragging ? "shadow-xl opacity-60 border-blue-300" : "border-slate-200 hover:border-slate-300"}`}>
      {editingNama && <NamaEditModal value={item.nama} itemIndex={index} onSave={v => onChange({ nama: v })} onClose={() => setEditingNama(false)} />}
      <div className="hidden sm:grid items-center gap-2 px-3 py-2.5" style={{ gridTemplateColumns: "28px 28px 1fr 80px 72px 120px 96px 32px" }}>
        <button className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing flex justify-center" {...attributes} {...listeners}><GripVertical size={14} /></button>
        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs flex items-center justify-center font-semibold">{index + 1}</span>
        <button type="button" onClick={() => setEditingNama(true)}
          className="text-left text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 w-full truncate hover:border-blue-400 hover:bg-blue-50/40 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30">
          {item.nama ? <span className="text-slate-900">{item.nama}</span> : <span className="text-slate-300">Nama barang atau jasa…</span>}
        </button>
        <select value={item.satuan} onChange={e => onChange({ satuan: e.target.value })} className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white text-center">
          {SATUAN_OPTIONS.map(s => <option key={s}>{s}</option>)}
        </select>
        <input type="number" min="0" step="0.01" value={item.volume} onChange={e => onChange({ volume: e.target.value })} className="text-sm text-center border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 w-full" />
        <input type="number" min="0" step="1" value={item.hargaSatuan} onChange={e => onChange({ hargaSatuan: e.target.value })} placeholder="0" className="text-sm text-right border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 w-full" />
        <span className="text-sm font-bold text-amber-700 text-right">{formatRupiahPlain(jml)}</span>
        <button onClick={onRemove} disabled={!canRemove} className="flex justify-center text-slate-300 hover:text-red-500 transition-colors disabled:opacity-30"><Trash2 size={14} /></button>
      </div>
      <div className="sm:hidden p-3 space-y-2">
        <div className="flex items-center gap-2">
          <button className="text-slate-300 cursor-grab shrink-0" {...attributes} {...listeners}><GripVertical size={16} /></button>
          <span className="text-xs font-semibold text-slate-400 shrink-0">#{index + 1}</span>
          <button type="button" onClick={() => setEditingNama(true)} className="flex-1 text-left text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 truncate hover:border-blue-400 hover:bg-blue-50/40 transition-colors focus:outline-none min-w-0">
            {item.nama ? <span className="text-slate-900">{item.nama}</span> : <span className="text-slate-300">Nama barang…</span>}
          </button>
          <button onClick={onRemove} disabled={!canRemove} className="text-slate-300 hover:text-red-500 transition-colors disabled:opacity-30 shrink-0"><Trash2 size={14} /></button>
        </div>
        <div className="flex items-center gap-2 pl-8">
          <input type="number" min="0" value={item.volume} onChange={e => onChange({ volume: e.target.value })} className="w-16 text-sm text-center border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          <select value={item.satuan} onChange={e => onChange({ satuan: e.target.value })} className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none">{SATUAN_OPTIONS.map(s => <option key={s}>{s}</option>)}</select>
          <span className="text-slate-400 text-xs">×</span>
          <input type="number" min="0" value={item.hargaSatuan} onChange={e => onChange({ hargaSatuan: e.target.value })} placeholder="Harga" className="flex-1 text-sm text-right border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          <span className="text-xs font-bold text-amber-700 shrink-0">{formatRupiahPlain(jml)}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── CopyItemsModal ───────────────────────────────────── */
function CopyItemsModal({ onClose, onCopy }) {
  const [list, setList]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [selected, setSelected]   = useState(null);
  const [preview, setPreview]     = useState([]);
  const [appendMode, setAppendMode] = useState(true);
  const [error, setError]         = useState("");

  useEffect(() => {
    Promise.all([getAllDokumen({ type: "invoice" }), getAllDokumen({ type: "rab" })])
      .then(([inv, rab]) => setList([
        ...inv.map(d => ({ ...d, _label: "Invoice" })),
        ...rab.map(d => ({ ...d, _label: "RAB" })),
      ]))
      .catch(() => setError("Gagal memuat daftar dokumen"))
      .finally(() => setLoading(false));
  }, []);

  const selectDoc = async doc => {
    setSelected(doc); setError("");
    try {
      const detail = await getDokumen(doc.id).catch(() => doc);
      // Support both groups and legacy items format
      const srcItems = detail.groups?.length
        ? detail.groups.flatMap(g => g.items || [])
        : (detail.items || []);
      setPreview(srcItems
        .map(it => ({ ...newItem(), nama: String(it.nama || "").trim(), satuan: String(it.satuan || "pcs"), volume: Number(it.volume) || 1, hargaSatuan: Number(it.hargaSatuan) || 0 }))
        .filter(it => it.nama));
    } catch { setError("Gagal memuat detail"); setPreview([]); }
  };

  const filtered = list.filter(r => {
    if (!search) return true;
    return [r.nomor, r.perihal, r.tagihan?.perusahaan, r.kepada?.perusahaan]
      .filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase());
  });

  const getItemCount = r => r.groups
    ? r.groups.reduce((n, g) => n + (g.items?.length || 0), 0)
    : (r.items?.length || 0);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <p className="font-semibold text-slate-900">Salin Item dari Dokumen Lain</p>
            <p className="text-xs text-slate-400 mt-0.5">Item akan ditambah sebagai kategori baru</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <input className={inp} placeholder="🔍 Cari nomor, perihal, atau nama pelanggan…" value={search} onChange={e => setSearch(e.target.value)} autoFocus />
          {loading ? <div className="text-center py-8 text-slate-400 text-sm">Memuat…</div>
            : filtered.length === 0 ? <div className="text-center py-8 text-slate-400 text-sm">Tidak ada dokumen ditemukan.</div>
            : (
            <div className="space-y-1.5 max-h-44 overflow-y-auto">
              {filtered.map(r => (
                <button key={r.id} onClick={() => selectDoc(r)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all text-sm ${selected?.id === r.id ? "border-amber-400 bg-amber-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700">{r._label}</span>
                    <span className="font-semibold text-slate-800 truncate">{r.nomor || "—"}</span>
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    {r.tagihan?.perusahaan || r.kepada?.perusahaan || "—"}
                    {r.perihal && ` · ${r.perihal}`}
                    {getItemCount(r) > 0 && ` · ${getItemCount(r)} item`}
                  </div>
                </button>
              ))}
            </div>
          )}
          {preview.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-amber-800 mb-2">Preview — {preview.length} item dari "{selected?.nomor || selected?.perihal || "—"}"</p>
              <div className="space-y-1">
                {preview.slice(0, 5).map((it, i) => (
                  <div key={i} className="text-xs text-slate-600 flex justify-between">
                    <span className="truncate flex-1">{i + 1}. {it.nama}</span>
                    <span className="text-amber-700 font-medium ml-2 shrink-0">{formatRupiahPlain(it.volume * it.hargaSatuan)}</span>
                  </div>
                ))}
                {preview.length > 5 && <p className="text-xs text-slate-400">…dan {preview.length - 5} lainnya</p>}
              </div>
            </div>
          )}
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" checked={appendMode} onChange={e => setAppendMode(e.target.checked)} className="mt-0.5 rounded accent-amber-500" />
            <span className="text-sm text-slate-600">Tambahkan sebagai kategori baru
              <span className="block text-xs text-slate-400">(tidak menghapus kategori yang sudah ada)</span>
            </span>
          </label>
          {error && <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
        </div>
        <div className="flex gap-3 px-5 py-4 border-t">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">Batal</button>
          <button onClick={() => { if (preview.length) { onCopy(preview, appendMode); onClose(); } }}
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
  return alamat.split(",").pop()?.trim().split(/[-–]/).pop()?.trim() || "";
}

/* ─── Map RAB → Invoice ────────────────────────────────── */
function mapRabToInvoice(rab) {
  // Copy groups structure from RAB (supporting both new groups and legacy items format)
  const groups = rab.groups?.length
    ? rab.groups.map(g => ({
        ...newGroup(g.nama),
        items: (g.items || [])
          .map(it => ({ ...newItem(), nama: String(it.nama || "").trim(), satuan: String(it.satuan || "pcs"), volume: Number(it.volume) || 1, hargaSatuan: Number(it.hargaSatuan) || 0 }))
          .filter(it => it.nama),
      })).filter(g => g.items.length)
    : [{
        ...newGroup("Daftar Pekerjaan"),
        items: (rab.items || [])
          .map(it => ({ ...newItem(), nama: String(it.nama || "").trim(), satuan: String(it.satuan || "pcs"), volume: Number(it.volume) || 1, hargaSatuan: Number(it.hargaSatuan) || 0 }))
          .filter(it => it.nama),
      }];

  const diTempat = rab.kepada?.di === "di tempat" ? "" : (rab.kepada?.di || "");
  return {
    type: "invoice",
    nomor: "",
    perihal: rab.perihal || "",
    tagihan: { nama: rab.kepada?.yth || "", perusahaan: rab.kepada?.perusahaan || "", alamat: diTempat, telp: "", email: "" },
    tanggal: TODAY(),
    jatuhTempo: "",
    lokasi: rab.lokasi || "",
    instansiId: rab.instansiId || "",
    ttd: rab.ttd || null,
    tampilTtd: true,
    groups: groups.length ? groups : [newGroup("Daftar Pekerjaan")],
    ppnAktif: rab.ppnAktif ?? true,
    pembayaran: { bank: "", noRek: "", atasNama: "" },
    catatan: rab.catatan || "",
    closingMessage: DEFAULT_CLOSING.invoice,
    status: "draft",
    sourceRabId: rab.id,
    sourceRabNomor: rab.nomor || rab.perihal || rab.id,
  };
}

/* ─── RabPickerModal ───────────────────────────────────── */
function RabPickerModal({ onClose, onSelect }) {
  const [list, setList]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [error, setError]     = useState("");

  useEffect(() => {
    getAllDokumen({ type: "rab" })
      .then(setList)
      .catch(() => setError("Gagal memuat daftar RAB"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = list.filter(r => {
    if (!search) return true;
    return [r.nomor, r.perihal, r.kepada?.perusahaan].filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <p className="font-semibold text-slate-900">Buat Invoice dari RAB</p>
            <p className="text-xs text-slate-400 mt-0.5">Kategori dan item akan disalin sesuai struktur RAB</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg leading-none">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <input className={inp} placeholder="🔍 Cari nomor atau perihal RAB…" value={search} onChange={e => setSearch(e.target.value)} autoFocus />
          {loading ? <div className="text-center py-10 text-slate-400 text-sm">Memuat daftar RAB…</div>
            : error ? <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>
            : filtered.length === 0 ? <div className="text-center py-10 text-slate-400 text-sm">{list.length === 0 ? "Belum ada RAB." : "Tidak ada yang sesuai."}</div>
            : (
            <div className="space-y-2">
              {filtered.map(r => {
                const total = hitungTotalFromDoc(r).grandTotal;
                const itemCount = r.groups ? r.groups.reduce((n, g) => n + (g.items?.length || 0), 0) : (r.items?.length || 0);
                return (
                  <button key={r.id} onClick={() => onSelect(r)}
                    className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50 transition-all group">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${r.status === "final" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {r.status === "final" ? "Final" : "Draft"}
                      </span>
                      <span className="text-sm font-semibold text-slate-800 group-hover:text-amber-800 transition-colors">{r.nomor || "—"}</span>
                    </div>
                    <p className="text-sm text-slate-700 truncate">{r.perihal || "—"}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <p className="text-xs text-slate-400 truncate flex-1">{r.kepada?.perusahaan || "—"}</p>
                      <p className="text-xs font-semibold text-amber-700 ml-2 shrink-0">{formatRupiah(total)}</p>
                    </div>
                    {itemCount > 0 && <p className="text-[11px] text-slate-400 mt-0.5">{itemCount} item</p>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="px-5 py-4 border-t border-slate-100">
          <button onClick={onClose} className="w-full py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">Batal</button>
        </div>
      </div>
    </div>
  );
}
