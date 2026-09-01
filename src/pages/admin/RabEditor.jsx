import { useEffect, useState, useContext, useMemo, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, RefreshCw, GripVertical, Trash2, Plus,
  Printer, CheckCircle, Save, ChevronDown, ChevronUp,
  FileText, User, MessageSquare, Building2,
  AlertCircle, Eye, Copy, Lock, Send, Tag, Search, X, Pencil,
} from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { AuthContext } from "../../context/AuthContext";
import { useGuestPermission } from "../../hooks/useGuestPermission";
import { submitForApproval } from "../../services/guestService";
import {
  createDokumen, updateDokumen, getDokumen, getAllDokumen, suggestNomor,
  hitungTotal, hitungSubtotalGroup, hitungTotalGroups,
  formatRupiah, formatRupiahPlain, applyMarkup, MARKUP_PERCENT,
  newItem, newGroup, SATUAN_OPTIONS, DEFAULT_CLOSING, DEFAULT_PEMBUKAAN, DEFAULT_MASA_BERLAKU,
} from "../../services/rabService";
import { getAllInstansi } from "../../services/instansiService";
import { getAllMasterHarga } from "../../services/masterHargaService";
import { getRabItemsAggregated } from "../../utils/aggregateRabItems";
import { findTopMatches } from "../../utils/normalizeItemName";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import TemplateRabAdytia from "../../templates/rab/TemplateRabAdytia";
import { inlineImgsForPrint } from "../../utils/inlineImgsForPrint";

const TODAY = () => new Date().toISOString().slice(0, 10);

const makeEmpty = () => ({
  type: "rab",
  nomor: "",
  lampiran: "-",
  perihal: "",
  kepada: { yth: "Bapak / Ibu Pimpinan", perusahaan: "", di: "di tempat" },
  tanggal: TODAY(),
  lokasi: "",
  instansiId: "",
  ttd: null,
  showTTD: false,
  groups: [newGroup("Daftar Pekerjaan")],
  ppnAktif: true,
  pembukaan: DEFAULT_PEMBUKAAN,
  closingMessage: DEFAULT_CLOSING.rab,
  masaBerlaku: DEFAULT_MASA_BERLAKU,
  catatan: "",
  status: "draft",
});

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

  const [form, setForm]               = useState(makeEmpty);
  const [instansiList, setInstansiList] = useState([]);
  const [priceHistoryList, setPriceHistoryList] = useState([]);
  const [loading, setLoading]         = useState(isEdit);
  const [saving, setSaving]           = useState(false);
  const [zoom, setZoom]               = useState(62);
  const [mTab, setMTab]               = useState("form");
  const [autoSaved, setAutoSaved]     = useState(false);
  const [toast, setToast]             = useState({ msg: "", on: false, err: false });
  const [showCopyRab, setShowCopyRab]         = useState(false);
  const [showMasterHarga, setShowMasterHarga] = useState(false);
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

  // Load harga historis langsung dari RAB-RAB sebelumnya (sumber kebenaran).
  // Re-load setiap kali `id` berubah supaya RAB yang lagi di-edit dikecualikan
  // dari agregasi (hindari self-reference).
  useEffect(() => {
    getRabItemsAggregated({ excludeRabId: id || null })
      .then(setPriceHistoryList)
      .catch(console.error);
  }, [id]);

  useEffect(() => {
    if (!id || loadedIdRef.current === id) return;
    setLoading(true);
    getDokumen(id)
      .then(data => {
        if (!data) { showToast("Dokumen tidak ditemukan", true); navigate("/Dashboard/rab"); return; }
        // Migrate old flat items → groups format
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

  /* ── simple setters ── */
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

  /* ── group management ── */
  const addGroup = () => setForm(f => ({
    ...f,
    groups: f.groups.length < 26
      ? [...f.groups, newGroup("Pekerjaan Baru")]
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

  /* ── item management (within group) ── */
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

  /* ── copy & master harga ── */
  const handleCopyRabItems = (items, append) => {
    const newGrp = {
      id: `grp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      nama: "Pekerjaan Disalin",
      items,
    };
    setForm(f => ({
      ...f,
      groups: append ? [...f.groups, newGrp] : [newGrp],
    }));
    showToast(`✓ ${items.length} item berhasil disalin sebagai Point baru`);
  };

  const handlePickMasterHarga = (picked) => {
    const newItems = picked.map(p => ({
      ...newItem(),
      nama: p.nama + (p.merek ? ` (${p.merek})` : ""),
      satuan: p.satuan || "pcs",
      hargaSatuan: Number(p.harga) || 0,
    }));
    setForm(f => {
      const groups = [...f.groups];
      const lastIdx = groups.length - 1;
      const lastGroup = groups[lastIdx];
      const existingItems = lastGroup.items.filter(it => it.nama.trim());
      groups[lastIdx] = { ...lastGroup, items: [...existingItems, ...newItems] };
      return { ...f, groups };
    });
    const lastLetter = String.fromCharCode(65 + form.groups.length - 1);
    showToast(`✓ ${newItems.length} item ditambahkan ke Point ${lastLetter}`);
  };

  /* ── auto-save (skip untuk guest) ── */
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
    if (!form.perihal.trim())              return "Perihal wajib diisi";
    if (!form.instansiId)                 return "Pilih instansi (letterhead)";
    if (form.showTTD && !form.ttd?.nama)  return "Pilih penanggung jawab (TTD)";
    const groups = form.groups || [];
    if (!groups.length)       return "Minimal 1 point pekerjaan";
    const allItems = groups.flatMap(g => g.items || []);
    if (!allItems.length)     return "Minimal 1 item";
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

      // Refresh price history — RAB baru yang disimpan sekarang bisa jadi referensi
      // untuk autocomplete di sesi berikutnya. Non-blocking.
      getRabItemsAggregated({ excludeRabId: id || null })
        .then(setPriceHistoryList)
        .catch(() => {});
    } catch (e) {
      showToast("Gagal: " + e.message, true);
    } finally { setSaving(false); }
  };

  const restoreImgs = useRef(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `RAB-${form.nomor || form.perihal || "dokumen"}`,
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
                <div className="flex items-center justify-between mb-1.5">
                  <Label required={form.showTTD}>Penanggung Jawab (TTD)</Label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <span className="text-xs text-slate-500">Tampilkan TTD</span>
                    <button
                      type="button"
                      onClick={() => set("showTTD", !form.showTTD)}
                      className={`relative w-9 h-5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${form.showTTD ? "bg-amber-500" : "bg-slate-200"}`}
                      aria-pressed={form.showTTD}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.showTTD ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                  </label>
                </div>
                {form.showTTD && (
                  <>
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
                  </>
                )}
                {!form.showTTD && (
                  <p className="text-xs text-slate-400 mt-1">Blok tanda tangan disembunyikan dari dokumen.</p>
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

          {/* ▸ Daftar Pekerjaan (Groups) */}
          <Section
            icon={<span className="text-lg leading-none">📦</span>}
            title={`Daftar Pekerjaan (${totalItemCount} item · ${form.groups.length} point)`}
            subtitle="Kelompokkan per POINT (A, B, C…). Klik nama Point untuk mengedit."
            color={gold}
            open={openSec.items}
            onToggle={() => toggleSec("items")}
            extra={
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={addGroup} disabled={form.groups.length >= 26}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40">
                  <Plus className="w-3.5 h-3.5" /> Tambah Point
                </button>
                <button onClick={() => setShowMasterHarga(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-amber-300 rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors">
                  <Tag className="w-3.5 h-3.5" /> Master Harga
                </button>
                <button onClick={() => setShowCopyRab(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                  <Copy className="w-3.5 h-3.5" /> Salin RAB
                </button>
              </div>
            }
          >
            <div className="space-y-3">
              {form.groups.map((grp, gIdx) => (
                <GroupCard
                  key={grp.id}
                  group={grp}
                  gIdx={gIdx}
                  letter={String.fromCharCode(65 + gIdx)}
                  totalGroups={form.groups.length}
                  priceHistoryList={priceHistoryList}
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

            {/* Grand Total */}
            <div className="mt-4 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
              {form.groups.map((grp, gIdx) => {
                const sub    = hitungSubtotalGroup(grp.items);
                const letter = String.fromCharCode(65 + gIdx);
                return (
                  <div key={grp.id} className="flex justify-between items-center px-4 py-2 border-b border-slate-100">
                    <span className="text-xs text-slate-500"> {letter} — {grp.nama}</span>
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
              <div className="text-lg font-bold text-slate-800">{totalItemCount}</div>
              <div className="text-[11px] text-slate-400 leading-tight">{form.groups.length} Point</div>
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

      {/* ══════════════ MASTER HARGA MODAL ══════════════ */}
      {showMasterHarga && (
        <MasterHargaPickerModal
          onClose={() => setShowMasterHarga(false)}
          onPick={handlePickMasterHarga}
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
    <div className="bg-white rounded-2xl border border-slate-200"
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      <div className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50 transition-colors cursor-pointer rounded-t-2xl"
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

/* ─── Group Card ───────────────────────────────────────── */
function GroupCard({
  group, gIdx, letter, totalGroups, priceHistoryList = [],
  onRename, onRemove, onMoveUp, onMoveDown,
  onAddItem, onUpdateItem, onRemoveItem, onDragEnd,
}) {
  const sensors    = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const subtotal   = hitungSubtotalGroup(group.items);
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
    <div className="border border-slate-200 rounded-2xl">
      {/* Group header bar */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border-b border-slate-200 rounded-t-2xl">
        <div className="w-8 h-8 rounded-lg text-white flex items-center justify-center font-bold text-sm shrink-0"
          style={{ background: "#003087" }}>
          {letter}
        </div>

        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setEditing(false); }}
            className="flex-1 min-w-0 text-sm font-bold border-b-2 border-amber-400 bg-transparent focus:outline-none px-1 py-0.5"
          />
        ) : (
          <button
            onClick={() => { setDraft(group.nama); setEditing(true); }}
            className="flex-1 min-w-0 flex items-center gap-1.5 text-left font-bold text-slate-800 hover:text-blue-600 transition-colors text-sm truncate">
            <span className="truncate">POINT {letter}. {group.nama}</span>
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
          <button onClick={onRemove} disabled={totalGroups <= 1} title="Hapus Point"
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
                  priceHistoryList={priceHistoryList}
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
          <Plus className="w-3 h-3" /> Tambah Item ke Point {letter}
        </button>

        <div className="mt-2 flex justify-end items-center gap-2 px-1">
          <span className="text-xs text-slate-500">Subtotal Point {letter}:</span>
          <span className="text-sm font-bold text-slate-700">{formatRupiah(subtotal)}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Modal edit nama item + saran harga ───────────────── */
function NamaModal({ value, itemIndex, priceHistoryList, onSave, onClose }) {
  const [draft, setDraft] = useState(value);
  const taRef = useRef(null);

  useEffect(() => { taRef.current?.focus(); }, []);

  const matches = useMemo(
    () => findTopMatches(draft || "", priceHistoryList, 7, 0.2),
    [draft, priceHistoryList]
  );

  const commit = (patch) => { onSave(patch); onClose(); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onMouseDown={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]"
        onMouseDown={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 shrink-0">
          <p className="text-sm font-semibold text-slate-700">
            Item #{itemIndex + 1} — Nama Barang / Jasa
          </p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Textarea */}
        <div className="px-5 pt-4 shrink-0">
          <textarea
            ref={taRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) commit({ nama: draft });
              if (e.key === "Escape") onClose();
            }}
            rows={3}
            placeholder="Nama barang atau jasa…"
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 resize-none"
          />
          <p className="text-[11px] text-slate-400 mt-1">Ctrl+Enter simpan · Esc batal</p>
        </div>

        {/* Suggestions */}
        {matches.length > 0 && (
          <div className="px-5 pt-3 flex-1 overflow-y-auto">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Search size={10} /> Saran dari RAB sebelumnya
            </p>
            <div className="space-y-1 pb-2">
              {matches.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => commit({
                    nama: item.nama,
                    satuan: item.satuan || "pcs",
                    hargaSatuan: applyMarkup(item.harga),
                  })}
                  className="w-full text-left flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-colors"
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <p className="text-sm font-medium text-slate-800 leading-snug">{item.nama}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {item.satuan || "pcs"}
                      {item.usageCount > 0 && <span className="ml-1.5 text-slate-400">· {item.usageCount}× dipakai</span>}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-amber-700">{formatRupiah(applyMarkup(item.harga))}</p>
                    <p className="text-[10px] text-amber-500 font-medium">+{MARKUP_PERCENT}%</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-slate-100 shrink-0">
          <button onClick={onClose}
            className="px-3 py-1.5 text-sm rounded-lg text-slate-600 hover:bg-slate-100 transition-colors">
            Batal
          </button>
          <button onClick={() => commit({ nama: draft })}
            className="px-4 py-1.5 text-sm rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium transition-colors">
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Item Row ─────────────────────────────────────────── */
function ItemRow({ item, index, priceHistoryList = [], onChange, onRemove, canRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const jml = (Number(item.volume) || 0) * (Number(item.hargaSatuan) || 0);
  const [editingNama, setEditingNama] = useState(false);

  return (
    <div ref={setNodeRef} style={style}
      className={`bg-white border rounded-xl transition-shadow ${isDragging ? "shadow-xl opacity-60 border-amber-300" : "border-slate-200 hover:border-slate-300"}`}>

      {editingNama && (
        <NamaModal
          value={item.nama}
          itemIndex={index}
          priceHistoryList={priceHistoryList}
          onSave={patch => onChange(patch)}
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
        <button
          type="button"
          onClick={() => setEditingNama(true)}
          className="w-full h-9 text-left px-2.5 border border-slate-200 rounded-lg text-sm bg-white hover:border-amber-400 transition-colors overflow-hidden"
        >
          {item.nama
            ? <span className="block truncate text-slate-900">{item.nama}</span>
            : <span className="block truncate text-slate-400">Nama barang atau jasa…</span>
          }
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
          <button
            type="button"
            onClick={() => setEditingNama(true)}
            className="flex-1 min-w-0 h-9 text-left px-2.5 border border-slate-200 rounded-lg text-sm bg-white hover:border-amber-400 transition-colors overflow-hidden"
          >
            {item.nama
              ? <span className="block truncate text-slate-900">{item.nama}</span>
              : <span className="block truncate text-slate-400">Nama barang…</span>
            }
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
  const [appendMode, setAppendMode] = useState(true);
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
      // Support both new (groups) and legacy (items) format
      const srcItems = detail.groups
        ? detail.groups.flatMap(g => g.items || [])
        : (detail.items || []);
      setPreview(srcItems
        .map(it => ({ ...newItem(), nama: String(it.nama || "").trim(), satuan: String(it.satuan || "pcs"), volume: Number(it.volume) || 1, hargaSatuan: Number(it.hargaSatuan) || 0 }))
        .filter(it => it.nama));
    } catch { setError("Gagal memuat detail RAB"); setPreview([]); }
  };

  const filtered = rabList.filter(r => {
    if (!search) return true;
    return [r.nomor, r.perihal, r.kepada?.perusahaan, r.kepada?.yth]
      .filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase());
  });

  const getItemCount = r => r.groups
    ? r.groups.reduce((n, g) => n + (g.items?.length || 0), 0)
    : (r.items?.length || 0);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <p className="font-semibold text-slate-900">Salin Item dari RAB Lain</p>
            <p className="text-xs text-slate-400 mt-0.5">Item akan ditambah sebagai Point baru</p>
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
                    {getItemCount(r) > 0 && ` · ${getItemCount(r)} item`}
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
              Tambahkan sebagai Point baru
              <span className="block text-xs text-slate-400">(tidak menghapus Point yang sudah ada)</span>
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

/* ─── Master Harga Picker Modal ─────────────────────────── */
function MasterHargaPickerModal({ onClose, onPick }) {
  const [masterList, setMasterList] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [selected, setSelected]     = useState(new Set());
  const [error, setError]           = useState("");

  useEffect(() => {
    getAllMasterHarga()
      .then(list => setMasterList(list))
      .catch(() => setError("Gagal memuat Master Harga"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = masterList.filter(item => {
    if (!search) return true;
    return [item.nama, item.merek, item.satuan]
      .filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase());
  });

  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const handlePick = () => {
    const picked = masterList.filter(i => selected.has(i.id));
    if (!picked.length) return;
    onPick(picked);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <p className="font-semibold text-slate-900 flex items-center gap-2">
              <Tag size={16} className="text-amber-500" /> Pilih dari Master Harga
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Item akan ditambahkan ke Point terakhir</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors text-lg">✕</button>
        </div>

        <div className="px-5 pt-4 pb-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              className={`${inp} pl-9 h-9`}
              placeholder="Cari nama atau merek…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-1.5">
          {loading ? (
            <div className="text-center py-10 text-slate-400 text-sm">Memuat…</div>
          ) : error ? (
            <div className="text-center py-10 text-red-500 text-sm">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              {search ? "Tidak ada hasil." : "Master harga masih kosong."}
            </div>
          ) : (
            filtered.map(item => {
              const isChecked = selected.has(item.id);
              return (
                <button key={item.id} onClick={() => toggle(item.id)}
                  className={`w-full text-left px-3.5 py-3 rounded-xl border transition-all ${
                    isChecked
                      ? "border-amber-400 bg-amber-50"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{item.nama}</p>
                      {item.merek && (
                        <p className="text-xs text-slate-400 truncate">{item.merek}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-amber-700">{formatRupiah(item.harga)}</p>
                      <p className="text-xs text-slate-400">/ {item.satuan}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isChecked ? "border-amber-500 bg-amber-500" : "border-slate-300"
                    }`}>
                      {isChecked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            Batal
          </button>
          <button onClick={handlePick} disabled={selected.size === 0}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-40"
            style={{ background: navy }}>
            Tambahkan {selected.size > 0 ? `(${selected.size})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
