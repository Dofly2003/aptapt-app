import { useState, useEffect, useRef, useContext, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import {
  getDokumen, createDokumen, updateDokumen, getAllDokumen,
  formatRupiah, formatRupiahPlain, hitungTotalGroups, hitungSubtotalGroup,
  newItem, newGroup, suggestNomor, applyMarkup, MARKUP_PERCENT,
  SATUAN_OPTIONS, DEFAULT_CLOSING, DEFAULT_PEMBUKAAN, DEFAULT_MASA_BERLAKU,
} from "../../services/rabService";
import { getAllInstansi } from "../../services/instansiService";
import { getAllMasterHarga } from "../../services/masterHargaService";
import { getRabItemsAggregated } from "../../utils/aggregateRabItems";
import { findTopMatches } from "../../utils/normalizeItemName";
import OfflineBanner from "../../offline/OfflineBanner";
import {
  ArrowLeft, Plus, Trash2, Check, Loader2, AlertCircle,
  ChevronDown, ChevronUp, Search, X, Tag, Copy, RefreshCw, Pencil,
} from "lucide-react";

const TODAY = () => new Date().toISOString().slice(0, 10);

const EMPTY = () => ({
  type: "rab",
  nomor: "",
  perihal: "",
  tanggal: TODAY(),
  status: "draft",
  lokasi: "",
  lampiran: "",
  instansiId: "",
  ttd: null,
  showTTD: false,
  kepada: { yth: "Bapak / Ibu Pimpinan", perusahaan: "", di: "di tempat" },
  groups: [newGroup("Daftar Pekerjaan")],
  ppnAktif: true,
  catatan: "",
  masaBerlaku: DEFAULT_MASA_BERLAKU,
  pembukaan: DEFAULT_PEMBUKAAN,
  closingMessage: DEFAULT_CLOSING.rab,
});

const inp = "w-full h-11 px-3 text-sm text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-colors placeholder-slate-300";

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left">
        <span className="text-sm font-semibold text-slate-700">{title}</span>
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>
      {open && <div className="px-4 pb-4 space-y-3 border-t border-slate-50">{children}</div>}
    </div>
  );
}

function normalizeDoc(data) {
  const base = { ...EMPTY(), ...data };
  if (data.items && !data.groups) {
    base.groups = [{ id: `grp_${Date.now()}`, nama: "Daftar Pekerjaan", items: data.items }];
  }
  delete base.items;
  return base;
}

export default function MobileRabEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const isNew = !id || id === "baru";
  const docIdRef = useRef(isNew ? null : id);
  const [docId, setDocId] = useState(isNew ? null : id);

  const [form, setForm] = useState(EMPTY());
  const [instansiList, setInstansiList] = useState([]);
  const [priceHistoryList, setPriceHistoryList] = useState([]);
  const [initialized, setInitialized] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle");
  const saveTimer = useRef(null);

  const [namaSheet, setNamaSheet] = useState(null);
  const [showCopyRab, setShowCopyRab] = useState(false);
  const [showMasterHarga, setShowMasterHarga] = useState(false);

  useEffect(() => {
    getAllInstansi({ aktifOnly: true }).then(setInstansiList).catch(() => {});
  }, []);

  useEffect(() => {
    getRabItemsAggregated({ excludeRabId: id || null })
      .then(setPriceHistoryList)
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (isNew) { setInitialized(true); return; }
    getDokumen(id)
      .then(data => { if (data) setForm(normalizeDoc(data)); })
      .catch(console.warn)
      .finally(() => setInitialized(true));
  }, [id]);

  useEffect(() => {
    if (!isNew || form.nomor) return;
    suggestNomor("rab", form.tanggal)
      .then(nomor => setForm(f => f.nomor ? f : { ...f, nomor }))
      .catch(() => {});
  }, [isNew, form.tanggal, form.nomor]);

  useEffect(() => {
    if (!initialized) return;
    clearTimeout(saveTimer.current);
    setSaveStatus("dirty");
    saveTimer.current = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        const payload = buildPayload(form);
        if (!docIdRef.current) {
          const newId = await createDokumen(payload, user?.uid);
          docIdRef.current = newId;
          setDocId(newId);
          navigate(`/app-mobile/rab/${newId}`, { replace: true });
        } else {
          await updateDokumen(docIdRef.current, payload);
        }
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (e) {
        console.error(e);
        setSaveStatus("error");
      }
    }, 1500);
    return () => clearTimeout(saveTimer.current);
  }, [form, initialized]);

  const selectedInstansi = instansiList.find(i => i.id === form.instansiId) ?? null;
  const pjList = selectedInstansi?.penanggungJawab ?? [];

  const totals = useMemo(
    () => hitungTotalGroups(form.groups, form.ppnAktif, 11),
    [form.groups, form.ppnAktif]
  );
  const totalItemCount = useMemo(
    () => (form.groups || []).reduce((n, g) => n + (g.items?.length || 0), 0),
    [form.groups]
  );

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setKepada = (k, v) => setForm(p => ({ ...p, kepada: { ...p.kepada, [k]: v } }));

  const handleInstansiChange = (instId) => {
    const inst = instansiList.find(i => i.id === instId);
    setForm(p => ({
      ...p, instansiId: instId,
      lokasi: deriveKota(inst?.alamat) || p.lokasi,
      ttd: null,
    }));
  };

  const handlePjChange = (pjId) => {
    const pj = pjList.find(p => p.id === pjId);
    setForm(p => ({
      ...p,
      ttd: pj ? { penanggungJawabId: pj.id, nama: pj.nama, jabatan: pj.jabatan, signature: pj.signature ?? null, stempel: pj.stempel ?? null } : null,
    }));
  };

  const addGroup = () => setForm(f => ({
    ...f,
    groups: f.groups.length < 26 ? [...f.groups, newGroup("Pekerjaan Baru")] : f.groups,
  }));

  const removeGroup = (gIdx) => setForm(f => ({
    ...f,
    groups: f.groups.length > 1 ? f.groups.filter((_, i) => i !== gIdx) : f.groups,
  }));

  const renameGroup = (gIdx, nama) => setForm(f => {
    const groups = [...f.groups];
    groups[gIdx] = { ...groups[gIdx], nama };
    return { ...f, groups };
  });

  const addItem = (gIdx) => setForm(f => {
    const groups = [...f.groups];
    groups[gIdx] = { ...groups[gIdx], items: [...groups[gIdx].items, newItem()] };
    return { ...f, groups };
  });

  const removeItem = (gIdx, iIdx) => setForm(f => {
    const groups = [...f.groups];
    groups[gIdx] = { ...groups[gIdx], items: groups[gIdx].items.filter((_, i) => i !== iIdx) };
    return { ...f, groups };
  });

  const updateItem = (gIdx, iIdx, patch) => setForm(f => {
    const groups = [...f.groups];
    const items = [...groups[gIdx].items];
    items[iIdx] = { ...items[iIdx], ...patch };
    groups[gIdx] = { ...groups[gIdx], items };
    return { ...f, groups };
  });

  const handleCopyRab = (items) => {
    const newGrp = {
      id: `grp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      nama: "Pekerjaan Disalin",
      items,
    };
    setForm(f => ({ ...f, groups: [...f.groups, newGrp] }));
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
      const last = groups[lastIdx];
      groups[lastIdx] = { ...last, items: [...last.items.filter(it => it.nama.trim()), ...newItems] };
      return { ...f, groups };
    });
  };

  const refreshNomor = async () => {
    try {
      const nomor = await suggestNomor("rab", form.tanggal);
      setForm(f => ({ ...f, nomor }));
    } catch { /* silent */ }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <OfflineBanner />

      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3 pt-safe sticky top-0 z-10">
        <button onClick={() => navigate("/app-mobile/rab")}
          className="text-slate-500 active:scale-90 transition-transform shrink-0">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-slate-800 text-sm truncate">
            {isNew && !docId ? "RAB Baru" : (form.perihal || "RAB")}
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            {saveStatus === "saving" && <><Loader2 size={11} className="animate-spin text-amber-500" /><span className="text-[10px] text-amber-500">Menyimpan...</span></>}
            {saveStatus === "saved"  && <><Check size={11} className="text-emerald-500" /><span className="text-[10px] text-emerald-500">Tersimpan</span></>}
            {saveStatus === "error"  && <><AlertCircle size={11} className="text-red-500" /><span className="text-[10px] text-red-500">Gagal simpan</span></>}
            {saveStatus === "dirty"  && <span className="text-[10px] text-slate-400">Mengetik...</span>}
            {saveStatus === "idle" && docId && <span className="text-[10px] text-slate-400 font-mono">{form.nomor || docId.slice(0, 8)}</span>}
          </div>
        </div>
        <select value={form.status} onChange={e => set("status", e.target.value)}
          className="text-xs font-semibold px-2 py-1 rounded-xl border border-slate-200 bg-white text-slate-600 focus:outline-none">
          <option value="draft">Draft</option>
          <option value="final">Final</option>
        </select>
      </div>

      <div className="p-4 space-y-3 pb-36">

        {/* Perihal */}
        <div className="bg-white rounded-2xl border border-slate-100 px-4 py-3.5">
          <label className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">Perihal / Judul RAB</label>
          <input type="text" value={form.perihal}
            onChange={e => set("perihal", e.target.value)}
            placeholder="Penawaran pekerjaan instalasi..."
            className="mt-1.5 w-full text-base font-semibold text-slate-900 bg-transparent border-none outline-none placeholder-slate-300" />
        </div>

        {/* Informasi Dokumen */}
        <Section title="Informasi Dokumen">
          <div className="pt-3">
            <label className="text-xs text-slate-500 mb-1 block">Nomor Surat</label>
            <div className="flex gap-2">
              <input type="text" value={form.nomor}
                onChange={e => set("nomor", e.target.value)}
                placeholder="001/APT/VI/2026"
                className={inp + " flex-1"} />
              <button onClick={refreshNomor}
                className="w-11 h-11 border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 active:bg-slate-50 shrink-0">
                <RefreshCw size={15} />
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Tanggal</label>
            <input type="date" value={form.tanggal}
              onChange={e => set("tanggal", e.target.value)}
              className={inp} />
          </div>
        </Section>

        {/* Perusahaan Penerbit */}
        <Section title="Perusahaan Penerbit">
          <div className="pt-3">
            <label className="text-xs text-slate-500 mb-1 block">Kop Surat (Instansi)</label>
            <select value={form.instansiId || ""}
              onChange={e => handleInstansiChange(e.target.value)}
              className={inp}>
              <option value="">— Pilih instansi —</option>
              {instansiList.map(i => <option key={i.id} value={i.id}>{i.nama}</option>)}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-slate-500">Penanggung Jawab (TTD)</label>
              <button
                type="button"
                onClick={() => set("showTTD", !form.showTTD)}
                className={`relative w-8 h-4 rounded-full transition-colors ${form.showTTD ? "bg-amber-500" : "bg-slate-200"}`}
                aria-pressed={form.showTTD}>
                <span className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${form.showTTD ? "translate-x-4" : "translate-x-0"}`} />
              </button>
            </div>
            {form.showTTD ? (
              <>
                <select value={form.ttd?.penanggungJawabId || ""}
                  onChange={e => handlePjChange(e.target.value)}
                  disabled={!form.instansiId || pjList.length === 0}
                  className={inp + " disabled:opacity-50"}>
                  <option value="">— Pilih penanggung jawab —</option>
                  {pjList.map(p => <option key={p.id} value={p.id}>{p.nama} — {p.jabatan}</option>)}
                </select>
                {form.ttd?.nama && (
                  <p className="text-[10px] text-emerald-600 mt-1">
                    ✓ {form.ttd.nama} · {form.ttd.jabatan}
                    {form.ttd.signature?.url ? " · TTD" : ""}
                    {form.ttd.stempel?.url ? " · Stempel" : ""}
                  </p>
                )}
              </>
            ) : (
              <p className="text-[10px] text-slate-400">Blok tanda tangan disembunyikan dari dokumen.</p>
            )}
          </div>
        </Section>

        {/* Kepada */}
        <Section title="Kepada / Ditujukan">
          <div className="pt-3">
            <label className="text-xs text-slate-500 mb-1 block">Kepada Yth.</label>
            <input type="text" value={form.kepada?.yth || ""}
              onChange={e => setKepada("yth", e.target.value)}
              placeholder="Bapak/Ibu Direktur"
              className={inp} />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Nama Perusahaan</label>
            <input type="text" value={form.kepada?.perusahaan || ""}
              onChange={e => setKepada("perusahaan", e.target.value)}
              placeholder="PT. Maju Bersama"
              className={inp} />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Di (kota)</label>
            <input type="text" value={form.kepada?.di || ""}
              onChange={e => setKepada("di", e.target.value)}
              placeholder="di tempat"
              className={inp} />
          </div>
        </Section>

        {/* Daftar Pekerjaan */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">
              Daftar Pekerjaan
              <span className="ml-2 text-xs font-normal text-slate-400">
                {totalItemCount} item · {form.groups.length} point
              </span>
            </span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={addGroup} disabled={form.groups.length >= 26}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-600 active:scale-95 transition-transform disabled:opacity-40">
              <Plus size={13} /> Tambah Point
            </button>
            <button onClick={() => setShowMasterHarga(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-amber-50 border border-amber-200 rounded-xl text-amber-700 active:scale-95 transition-transform">
              <Tag size={13} /> Master Harga
            </button>
            <button onClick={() => setShowCopyRab(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-600 active:scale-95 transition-transform">
              <Copy size={13} /> Salin RAB
            </button>
          </div>

          {form.groups.map((grp, gIdx) => (
            <GroupCard
              key={grp.id}
              group={grp}
              gIdx={gIdx}
              letter={String.fromCharCode(65 + gIdx)}
              canRemove={form.groups.length > 1}
              onRename={nama => renameGroup(gIdx, nama)}
              onRemove={() => removeGroup(gIdx)}
              onAddItem={() => addItem(gIdx)}
              onUpdateItem={(iIdx, patch) => updateItem(gIdx, iIdx, patch)}
              onRemoveItem={iIdx => removeItem(gIdx, iIdx)}
              onEditNama={(iIdx) => setNamaSheet({ gIdx, iIdx })}
            />
          ))}

          {/* Totals */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            {form.groups.length > 1 && form.groups.map((grp, gIdx) => {
              const sub = hitungSubtotalGroup(grp.items);
              return (
                <div key={grp.id} className="flex justify-between items-center px-4 py-2 border-b border-slate-50">
                  <span className="text-xs text-slate-500">{String.fromCharCode(65 + gIdx)} — {grp.nama}</span>
                  <span className="text-xs font-medium text-slate-600">{formatRupiah(sub)}</span>
                </div>
              );
            })}
            <div className="flex justify-between items-center px-4 py-2 border-b border-slate-100">
              <span className="text-xs text-slate-500">Subtotal</span>
              <span className="text-xs font-medium text-slate-600">{formatRupiah(totals.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
              <button onClick={() => set("ppnAktif", !form.ppnAktif)}
                className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors
                  ${form.ppnAktif ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
                <div className={`w-3 h-3 rounded-sm border flex items-center justify-center
                  ${form.ppnAktif ? "bg-amber-500 border-amber-500" : "border-slate-300"}`}>
                  {form.ppnAktif && <Check size={8} className="text-white" />}
                </div>
                PPN 11%
              </button>
              <span className="text-xs font-medium text-slate-500">
                {form.ppnAktif ? formatRupiah(totals.ppn) : "—"}
              </span>
            </div>
            <div className="flex justify-between items-center px-4 py-3 bg-[#003087]">
              <span className="text-sm font-bold text-white">Grand Total</span>
              <span className="text-base font-extrabold text-yellow-300">{formatRupiah(totals.grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Teks Surat */}
        <Section title="Teks Surat" defaultOpen={false}>
          <div className="pt-3 grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Lokasi</label>
              <input type="text" value={form.lokasi || ""}
                onChange={e => set("lokasi", e.target.value)}
                placeholder="Gresik" className={inp} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Lampiran</label>
              <input type="text" value={form.lampiran || ""}
                onChange={e => set("lampiran", e.target.value)}
                placeholder="-" className={inp} />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Paragraf Pembukaan</label>
            <textarea value={form.pembukaan || ""}
              onChange={e => set("pembukaan", e.target.value)}
              rows={4}
              className="w-full px-3 py-2.5 text-sm text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 resize-none" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Masa Berlaku Penawaran</label>
            <input type="text" value={form.masaBerlaku || ""}
              onChange={e => set("masaBerlaku", e.target.value)}
              placeholder="30 (tiga puluh) hari kerja sejak tanggal surat ini"
              className={inp} />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Paragraf Penutup</label>
            <textarea value={form.closingMessage || ""}
              onChange={e => set("closingMessage", e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 text-sm text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 resize-none" />
          </div>
        </Section>

        {/* Catatan */}
        <Section title="Catatan" defaultOpen={false}>
          <textarea value={form.catatan}
            onChange={e => set("catatan", e.target.value)}
            placeholder="Catatan tambahan (opsional)..."
            rows={3}
            className="mt-3 w-full px-3 py-2.5 text-sm text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 resize-none" />
        </Section>
      </div>

      {/* Fixed Bottom Total */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 pt-3 pb-safe-nav z-10">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">{totalItemCount} item · {form.groups.length} point</span>
          <div className="text-right">
            {form.ppnAktif && (
              <p className="text-[11px] text-slate-400">
                Subtotal {formatRupiah(totals.subtotal)} + PPN {formatRupiah(totals.ppn)}
              </p>
            )}
            <p className="text-base font-bold text-amber-700">{formatRupiah(totals.grandTotal)}</p>
          </div>
        </div>
      </div>

      {/* Nama Bottom Sheet */}
      {namaSheet && (
        <NamaBottomSheet
          value={form.groups[namaSheet.gIdx]?.items[namaSheet.iIdx]?.nama || ""}
          itemIndex={namaSheet.iIdx}
          priceHistoryList={priceHistoryList}
          onSave={patch => updateItem(namaSheet.gIdx, namaSheet.iIdx, patch)}
          onClose={() => setNamaSheet(null)}
        />
      )}

      {showCopyRab && (
        <CopyRabSheet
          onClose={() => setShowCopyRab(false)}
          onCopy={handleCopyRab}
        />
      )}

      {showMasterHarga && (
        <MasterHargaSheet
          onClose={() => setShowMasterHarga(false)}
          onPick={handlePickMasterHarga}
          lastGroupLetter={String.fromCharCode(65 + form.groups.length - 1)}
        />
      )}
    </div>
  );
}

/* ── GroupCard ─────────────────────────────────────────── */
function GroupCard({ group, gIdx, letter, canRemove, onRename, onRemove, onAddItem, onUpdateItem, onRemoveItem, onEditNama }) {
  const [open, setOpen] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(group.nama);
  const nameInputRef = useRef(null);
  const subtotal = hitungSubtotalGroup(group.items);

  useEffect(() => { if (editingName) nameInputRef.current?.focus(); }, [editingName]);

  const commitName = () => {
    const n = nameDraft.trim() || group.nama;
    onRename(n);
    setNameDraft(n);
    setEditingName(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-[#003087] text-white flex items-center justify-center font-bold text-sm shrink-0">
          {letter}
        </div>

        {editingName ? (
          <input
            ref={nameInputRef}
            value={nameDraft}
            onChange={e => setNameDraft(e.target.value)}
            onBlur={commitName}
            onKeyDown={e => { if (e.key === "Enter") commitName(); if (e.key === "Escape") setEditingName(false); }}
            className="flex-1 min-w-0 text-sm font-bold border-b-2 border-amber-400 bg-transparent focus:outline-none px-1 py-0.5"
          />
        ) : (
          <button
            onClick={() => { setNameDraft(group.nama); setEditingName(true); }}
            className="flex-1 min-w-0 flex items-center gap-1.5 text-left text-sm font-bold text-slate-800 truncate">
            <span className="truncate">POINT {letter}. {group.nama}</span>
            <Pencil size={11} className="text-slate-400 shrink-0" />
          </button>
        )}

        <span className="text-xs font-semibold text-amber-700 shrink-0">{formatRupiah(subtotal)}</span>

        {canRemove && (
          <button onClick={onRemove} className="p-1.5 text-red-400 active:scale-90 transition-transform shrink-0">
            <Trash2 size={14} />
          </button>
        )}
        <button onClick={() => setOpen(o => !o)} className="p-1.5 text-slate-400 active:scale-90 transition-transform shrink-0">
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {open && (
        <>
          <div className="divide-y divide-slate-50">
            {group.items.map((item, iIdx) => (
              <ItemRow
                key={item.id}
                item={item}
                index={iIdx}
                canRemove={group.items.length > 1}
                onChange={patch => onUpdateItem(iIdx, patch)}
                onRemove={() => onRemoveItem(iIdx)}
                onEditNama={() => onEditNama(iIdx)}
              />
            ))}
          </div>
          <div className="px-3 py-2.5 border-t border-slate-50">
            <button onClick={onAddItem}
              className="w-full py-2 border-2 border-dashed border-slate-200 rounded-xl text-xs font-medium text-slate-500 active:bg-slate-50 flex items-center justify-center gap-1.5">
              <Plus size={13} /> Tambah Item ke Point {letter}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ── ItemRow ───────────────────────────────────────────── */
function ItemRow({ item, index, canRemove, onChange, onRemove, onEditNama }) {
  const jml = (Number(item.volume) || 0) * (Number(item.hargaSatuan) || 0);
  return (
    <div className="px-3 py-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-slate-400 font-mono shrink-0 w-5">{index + 1}.</span>
        <button
          type="button"
          onClick={onEditNama}
          className="flex-1 min-w-0 h-10 text-left px-2.5 border border-slate-200 rounded-xl text-sm bg-white active:border-amber-400 transition-colors overflow-hidden">
          {item.nama
            ? <span className="block truncate text-slate-900 leading-10">{item.nama}</span>
            : <span className="block truncate text-slate-400 leading-10">Ketuk untuk isi nama...</span>
          }
        </button>
        <button onClick={onRemove} disabled={!canRemove}
          className="text-red-400 active:scale-90 transition-transform disabled:opacity-20 shrink-0">
          <Trash2 size={15} />
        </button>
      </div>
      <div className="flex gap-2 pl-7">
        <div className="w-20 shrink-0">
          <label className="text-[10px] text-slate-400">Vol</label>
          <input type="number" value={item.volume}
            onChange={e => onChange({ volume: e.target.value })}
            className="mt-0.5 w-full h-9 px-2 text-sm text-center bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400" />
        </div>
        <div className="w-24 shrink-0">
          <label className="text-[10px] text-slate-400">Satuan</label>
          <select value={item.satuan}
            onChange={e => onChange({ satuan: e.target.value })}
            className="mt-0.5 w-full h-9 px-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400">
            {SATUAN_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-0">
          <label className="text-[10px] text-slate-400">Harga Satuan</label>
          <input type="number" value={item.hargaSatuan}
            onChange={e => onChange({ hargaSatuan: e.target.value })}
            placeholder="0"
            className="mt-0.5 w-full h-9 px-2.5 text-sm text-right bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400" />
        </div>
      </div>
      {jml > 0 && (
        <p className="text-right text-xs font-bold text-amber-700 pl-7">= {formatRupiah(jml)}</p>
      )}
    </div>
  );
}

/* ── NamaBottomSheet ───────────────────────────────────── */
function NamaBottomSheet({ value, itemIndex, priceHistoryList, onSave, onClose }) {
  const [draft, setDraft] = useState(value);
  const taRef = useRef(null);

  useEffect(() => { setTimeout(() => taRef.current?.focus(), 150); }, []);

  const matches = useMemo(
    () => findTopMatches(draft || "", priceHistoryList, 7, 0.2),
    [draft, priceHistoryList]
  );

  const commit = (patch) => { onSave(patch); onClose(); };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[55]" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-3xl max-h-[80vh] flex flex-col">
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-1 shrink-0" />
        <div className="flex items-center justify-between px-4 py-2 shrink-0">
          <p className="text-sm font-semibold text-slate-700">Item #{itemIndex + 1} — Nama Barang / Jasa</p>
          <button onClick={onClose} className="text-slate-400 active:text-slate-600"><X size={18} /></button>
        </div>
        <div className="px-4 pb-2 shrink-0">
          <textarea
            ref={taRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={2}
            placeholder="Nama barang atau jasa…"
            className="w-full border border-slate-200 rounded-2xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 resize-none"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-2">
          {matches.length > 0 && (
            <>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Search size={10} /> Saran dari RAB sebelumnya
              </p>
              <div className="space-y-1.5">
                {matches.map(it => (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => commit({ nama: it.nama, satuan: it.satuan || "pcs", hargaSatuan: applyMarkup(it.harga) })}
                    className="w-full text-left flex items-center justify-between px-3 py-3 rounded-2xl bg-slate-50 active:bg-amber-50 active:border-amber-200 border border-transparent transition-colors">
                    <div className="flex-1 min-w-0 pr-3">
                      <p className="text-sm font-medium text-slate-800 leading-snug">{it.nama}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {it.satuan || "pcs"}
                        {it.usageCount > 0 && <span className="ml-1.5">· {it.usageCount}× dipakai</span>}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-amber-700">{formatRupiah(applyMarkup(it.harga))}</p>
                      <p className="text-[10px] text-amber-500 font-medium">+{MARKUP_PERCENT}%</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
          {!draft && matches.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-4">Ketik nama untuk melihat saran harga</p>
          )}
        </div>

        <div className="flex gap-3 px-4 py-3 border-t border-slate-100 shrink-0 pb-safe-sheet">
          <button onClick={onClose}
            className="flex-1 py-3 border border-slate-200 rounded-2xl text-sm font-medium text-slate-600 active:scale-95 transition-transform">
            Batal
          </button>
          <button onClick={() => commit({ nama: draft })}
            className="flex-1 py-3 rounded-2xl text-sm font-bold text-white bg-[#003087] active:scale-95 transition-transform">
            Simpan
          </button>
        </div>
      </div>
    </>
  );
}

/* ── CopyRabSheet ──────────────────────────────────────── */
function CopyRabSheet({ onClose, onCopy }) {
  const [rabList, setRabList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getAllDokumen({ type: "rab" })
      .then(list => setRabList(list))
      .catch(() => setError("Gagal memuat daftar RAB"))
      .finally(() => setLoading(false));
  }, []);

  const selectRab = async (rab) => {
    setSelected(rab); setError("");
    try {
      const detail = await getDokumen(rab.id).catch(() => rab);
      const srcItems = detail.groups
        ? detail.groups.flatMap(g => g.items || [])
        : (detail.items || []);
      setPreview(
        srcItems
          .map(it => ({ ...newItem(), nama: String(it.nama || "").trim(), satuan: String(it.satuan || "pcs"), volume: Number(it.volume) || 1, hargaSatuan: Number(it.hargaSatuan) || 0 }))
          .filter(it => it.nama)
      );
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
    <>
      <div className="fixed inset-0 bg-black/40 z-[55]" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-3xl max-h-[80vh] flex flex-col">
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-1 shrink-0" />
        <div className="flex items-center justify-between px-4 py-2 shrink-0">
          <div>
            <p className="font-semibold text-slate-900 text-sm">Salin Item dari RAB Lain</p>
            <p className="text-xs text-slate-400">Ditambahkan sebagai Point baru</p>
          </div>
          <button onClick={onClose} className="text-slate-400 active:text-slate-600"><X size={18} /></button>
        </div>

        <div className="px-4 pb-2 shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              className="w-full h-10 pl-9 pr-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400"
              placeholder="Cari nomor, perihal, atau klien…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-1.5">
          {loading ? (
            <p className="text-center py-6 text-slate-400 text-sm">Memuat daftar RAB…</p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-6 text-slate-400 text-sm">Tidak ada RAB ditemukan.</p>
          ) : (
            filtered.map(r => (
              <button key={r.id} onClick={() => selectRab(r)}
                className={`w-full text-left px-3 py-2.5 rounded-2xl border transition-all
                  ${selected?.id === r.id ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-slate-50 active:bg-slate-100"}`}>
                <div className="font-semibold text-slate-800 truncate text-sm">{r.nomor || "—"}</div>
                <div className="text-xs text-slate-400 truncate">
                  {r.kepada?.perusahaan || r.kepada?.yth || "—"}
                  {r.perihal && ` · ${r.perihal}`}
                  {getItemCount(r) > 0 && ` · ${getItemCount(r)} item`}
                </div>
              </button>
            ))
          )}

          {preview.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
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

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 rounded-xl px-3 py-2">
              <AlertCircle size={14} />{error}
            </div>
          )}
        </div>

        <div className="flex gap-3 px-4 py-3 border-t border-slate-100 shrink-0 pb-safe-sheet">
          <button onClick={onClose}
            className="flex-1 py-3 border border-slate-200 rounded-2xl text-sm font-medium text-slate-600 active:scale-95">
            Batal
          </button>
          <button
            onClick={() => { if (preview.length) { onCopy(preview); onClose(); } }}
            disabled={!selected || !preview.length}
            className="flex-1 py-3 rounded-2xl text-sm font-bold text-white bg-[#003087] active:scale-95 disabled:opacity-40">
            Salin {preview.length} Item
          </button>
        </div>
      </div>
    </>
  );
}

/* ── MasterHargaSheet ──────────────────────────────────── */
function MasterHargaSheet({ onClose, onPick, lastGroupLetter }) {
  const [masterList, setMasterList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [error, setError] = useState("");

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

  const toggle = (itemId) => setSelected(prev => {
    const next = new Set(prev);
    next.has(itemId) ? next.delete(itemId) : next.add(itemId);
    return next;
  });

  const handlePick = () => {
    const picked = masterList.filter(i => selected.has(i.id));
    if (!picked.length) return;
    onPick(picked);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[55]" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-3xl max-h-[80vh] flex flex-col">
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-1 shrink-0" />
        <div className="flex items-center justify-between px-4 py-2 shrink-0">
          <div>
            <p className="font-semibold text-slate-900 text-sm flex items-center gap-2">
              <Tag size={14} className="text-amber-500" /> Pilih dari Master Harga
            </p>
            <p className="text-xs text-slate-400">Item ditambahkan ke Point {lastGroupLetter}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 active:text-slate-600"><X size={18} /></button>
        </div>

        <div className="px-4 pb-2 shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              className="w-full h-10 pl-9 pr-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400"
              placeholder="Cari nama atau merek…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-1.5">
          {loading ? (
            <p className="text-center py-8 text-slate-400 text-sm">Memuat…</p>
          ) : error ? (
            <p className="text-center py-8 text-red-500 text-sm">{error}</p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-slate-400 text-sm">
              {search ? "Tidak ada hasil." : "Master harga masih kosong."}
            </p>
          ) : (
            filtered.map(item => {
              const isChecked = selected.has(item.id);
              return (
                <button key={item.id} onClick={() => toggle(item.id)}
                  className={`w-full text-left px-3.5 py-3 rounded-2xl border transition-all
                    ${isChecked ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-slate-50 active:bg-slate-100"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{item.nama}</p>
                      {item.merek && <p className="text-xs text-slate-400 truncate">{item.merek}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-amber-700">{formatRupiah(item.harga)}</p>
                      <p className="text-xs text-slate-400">/ {item.satuan}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                      ${isChecked ? "border-amber-500 bg-amber-500" : "border-slate-300"}`}>
                      {isChecked && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="flex gap-3 px-4 py-3 border-t border-slate-100 shrink-0 pb-safe-sheet">
          <button onClick={onClose}
            className="flex-1 py-3 border border-slate-200 rounded-2xl text-sm font-medium text-slate-600 active:scale-95">
            Batal
          </button>
          <button onClick={handlePick} disabled={selected.size === 0}
            className="flex-1 py-3 rounded-2xl text-sm font-bold text-white bg-[#003087] active:scale-95 disabled:opacity-40">
            Tambahkan {selected.size > 0 ? `(${selected.size})` : ""}
          </button>
        </div>
      </div>
    </>
  );
}

function buildPayload(form) {
  return {
    ...form,
    groups: (form.groups || []).map(grp => ({
      ...grp,
      items: (grp.items || []).map(it => ({
        ...it,
        volume: Number(it.volume) || 0,
        hargaSatuan: Number(it.hargaSatuan) || 0,
      })),
    })),
  };
}

function deriveKota(alamat = "") {
  if (!alamat) return "";
  const last = alamat.split(",").pop()?.trim() || "";
  return last.split(/[-–]/).pop()?.trim() || last;
}
