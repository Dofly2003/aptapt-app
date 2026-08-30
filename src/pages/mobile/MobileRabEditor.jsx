import { useState, useEffect, useRef, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import {
  getDokumen, createDokumen, updateDokumen,
  formatRupiah, hitungTotal, newItem, SATUAN_OPTIONS,
  DEFAULT_CLOSING, DEFAULT_PEMBUKAAN, DEFAULT_MASA_BERLAKU,
} from "../../services/rabService";
import { getAllInstansi } from "../../services/instansiService";
import OfflineBanner from "../../offline/OfflineBanner";
import {
  ArrowLeft, Plus, Trash2, Check, Loader2, AlertCircle, ChevronDown, ChevronUp,
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
  kepada: { yth: "", perusahaan: "", di: "" },
  items: [newItem()],
  ppnAktif: true,
  catatan: "",
  masaBerlaku: DEFAULT_MASA_BERLAKU,
  pembukaan: DEFAULT_PEMBUKAAN,
  closingMessage: DEFAULT_CLOSING.rab,
});

const inp = "w-full h-11 px-3 text-sm text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-colors placeholder-slate-300";
const inpSm = "w-full h-9 px-2.5 text-sm text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-colors placeholder-slate-300";

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

export default function MobileRabEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const isNew = !id || id === "baru";
  const docIdRef = useRef(isNew ? null : id);
  const [docId, setDocId] = useState(isNew ? null : id);

  const [form, setForm]               = useState(EMPTY());
  const [instansiList, setInstansiList] = useState([]);
  const [initialized, setInitialized] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | saved | error
  const saveTimer = useRef(null);

  /* ── load instansi list ── */
  useEffect(() => {
    getAllInstansi({ aktifOnly: true }).then(setInstansiList).catch(() => {});
  }, []);

  /* ── load existing doc ── */
  useEffect(() => {
    if (isNew) { setInitialized(true); return; }
    getDokumen(id)
      .then(data => { if (data) setForm(data); })
      .catch(console.warn)
      .finally(() => setInitialized(true));
  }, [id]);

  /* ── auto-save ── */
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

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setKepada = (k, v) => setForm(p => ({ ...p, kepada: { ...p.kepada, [k]: v } }));

  const handleInstansiChange = (instId) => {
    setForm(p => ({ ...p, instansiId: instId, ttd: null }));
  };

  const handlePjChange = (pjId) => {
    const pj = pjList.find(p => p.id === pjId);
    setForm(p => ({
      ...p,
      ttd: pj ? { penanggungJawabId: pj.id, nama: pj.nama, jabatan: pj.jabatan, signature: pj.signature ?? null, stempel: pj.stempel ?? null } : null,
    }));
  };

  const addItem = () => setForm(p => ({ ...p, items: [...p.items, newItem()] }));
  const removeItem = (idx) => setForm(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));
  const setItem = (idx, k, v) => setForm(p => ({
    ...p,
    items: p.items.map((it, i) => i === idx ? { ...it, [k]: v } : it),
  }));

  const totals = hitungTotal(form.items, form.ppnAktif);

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
            {saveStatus === "saving" && (
              <><Loader2 size={11} className="animate-spin text-amber-500" /><span className="text-[10px] text-amber-500">Menyimpan...</span></>
            )}
            {saveStatus === "saved" && (
              <><Check size={11} className="text-emerald-500" /><span className="text-[10px] text-emerald-500">Tersimpan</span></>
            )}
            {saveStatus === "error" && (
              <><AlertCircle size={11} className="text-red-500" /><span className="text-[10px] text-red-500">Gagal simpan</span></>
            )}
            {saveStatus === "dirty" && (
              <span className="text-[10px] text-slate-400">Mengetik...</span>
            )}
            {saveStatus === "idle" && docId && (
              <span className="text-[10px] text-slate-400 font-mono">{form.nomor || docId.slice(0, 8)}</span>
            )}
          </div>
        </div>
        <select value={form.status} onChange={e => set("status", e.target.value)}
          className="text-xs font-semibold px-2 py-1 rounded-xl border border-slate-200 bg-white text-slate-600 focus:outline-none">
          <option value="draft">Draft</option>
          <option value="final">Final</option>
        </select>
      </div>

      <div className="p-4 space-y-3 pb-32">

        {/* Perihal */}
        <div className="bg-white rounded-2xl border border-slate-100 px-4 py-3.5">
          <label className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">Perihal / Judul RAB</label>
          <input type="text" value={form.perihal}
            onChange={e => set("perihal", e.target.value)}
            placeholder="Penawaran pekerjaan instalasi..."
            className="mt-1.5 w-full text-base font-semibold text-slate-900 bg-transparent border-none outline-none placeholder-slate-300" />
        </div>

        {/* Informasi */}
        <Section title="Informasi Dokumen">
          <div className="pt-3">
            <label className="text-xs text-slate-500 mb-1 block">Nomor Surat</label>
            <input type="text" value={form.nomor}
              onChange={e => set("nomor", e.target.value)}
              placeholder="001/APT/VI/2026"
              className={inp} />
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
              {instansiList.map(i => (
                <option key={i.id} value={i.id}>{i.nama}</option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-1">
              Menentukan logo, nama, dan alamat di header PDF
            </p>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Penanggung Jawab (TTD)</label>
            <select value={form.ttd?.penanggungJawabId || ""}
              onChange={e => handlePjChange(e.target.value)}
              disabled={!form.instansiId || pjList.length === 0}
              className={inp + " disabled:opacity-50"}>
              <option value="">— Pilih penanggung jawab —</option>
              {pjList.map(p => (
                <option key={p.id} value={p.id}>{p.nama} — {p.jabatan}</option>
              ))}
            </select>
            {form.instansiId && pjList.length === 0 && (
              <p className="text-[10px] text-amber-600 mt-1">
                Instansi belum punya penanggung jawab. Tambah di Master Data → Instansi.
              </p>
            )}
            {form.ttd?.nama && (
              <p className="text-[10px] text-emerald-600 mt-1">
                ✓ {form.ttd.nama} · {form.ttd.jabatan}
                {form.ttd.signature?.url ? " · TTD" : ""}
                {form.ttd.stempel?.url ? " · Stempel" : ""}
              </p>
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
              placeholder="Surabaya"
              className={inp} />
          </div>
        </Section>

        {/* Items */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-sm font-semibold text-slate-700">Daftar Item ({form.items.length})</span>
            <button onClick={addItem}
              className="flex items-center gap-1 text-xs font-semibold text-amber-600 active:scale-90 transition-transform">
              <Plus size={14} /> Tambah
            </button>
          </div>

          <div className="border-t border-slate-50 divide-y divide-slate-50">
            {form.items.map((item, idx) => (
              <div key={item.id} className="px-4 py-3 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-[11px] text-slate-400 font-mono mt-2 shrink-0 w-5">{idx + 1}.</span>
                  <input type="text" value={item.nama}
                    onChange={e => setItem(idx, "nama", e.target.value)}
                    placeholder="Deskripsi pekerjaan / material"
                    className="flex-1 text-sm text-slate-900 bg-transparent border-b border-slate-200 pb-1 outline-none placeholder-slate-300 focus:border-amber-400 transition-colors" />
                  <button onClick={() => removeItem(idx)} disabled={form.items.length === 1}
                    className="mt-1.5 text-red-400 active:scale-90 transition-transform disabled:opacity-20 shrink-0">
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="flex gap-2 pl-7">
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-400">Vol</label>
                    <input type="number" value={item.volume}
                      onChange={e => setItem(idx, "volume", e.target.value)}
                      className={inpSm + " mt-0.5"} />
                  </div>
                  <div className="w-24">
                    <label className="text-[10px] text-slate-400">Satuan</label>
                    <select value={item.satuan}
                      onChange={e => setItem(idx, "satuan", e.target.value)}
                      className={inpSm + " mt-0.5"}>
                      {SATUAN_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="flex-[2]">
                    <label className="text-[10px] text-slate-400">Harga Satuan</label>
                    <input type="number" value={item.hargaSatuan}
                      onChange={e => setItem(idx, "hargaSatuan", e.target.value)}
                      placeholder="0"
                      className={inpSm + " mt-0.5"} />
                  </div>
                </div>
                {(Number(item.volume) > 0 && Number(item.hargaSatuan) > 0) && (
                  <p className="text-right text-xs font-semibold text-amber-700 pl-7">
                    = {formatRupiah(Number(item.volume) * Number(item.hargaSatuan))}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Teks Surat */}
        <Section title="Teks Surat" defaultOpen={false}>
          <div className="pt-3 grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Lokasi</label>
              <input type="text" value={form.lokasi || ""}
                onChange={e => set("lokasi", e.target.value)}
                placeholder="Gresik"
                className={inp} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Lampiran</label>
              <input type="text" value={form.lampiran || ""}
                onChange={e => set("lampiran", e.target.value)}
                placeholder="-"
                className={inp} />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Paragraf Pembukaan</label>
            <textarea value={form.pembukaan || ""}
              onChange={e => set("pembukaan", e.target.value)}
              rows={4}
              className="w-full px-3 py-2.5 text-sm text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-colors placeholder-slate-300 resize-none" />
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
              className="w-full px-3 py-2.5 text-sm text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-colors placeholder-slate-300 resize-none" />
          </div>
        </Section>

        {/* Catatan */}
        <Section title="Catatan" defaultOpen={false}>
          <textarea value={form.catatan}
            onChange={e => set("catatan", e.target.value)}
            placeholder="Catatan tambahan (opsional)..."
            rows={3}
            className="mt-3 w-full px-3 py-2.5 text-sm text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-colors placeholder-slate-300 resize-none" />
        </Section>
      </div>

      {/* ── Fixed Total Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 pt-3 pb-safe-nav z-10">
        <div className="flex items-center justify-between mb-1.5">
          <button onClick={() => set("ppnAktif", !form.ppnAktif)}
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors
              ${form.ppnAktif ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
            <div className={`w-3 h-3 rounded-sm border flex items-center justify-center
              ${form.ppnAktif ? "bg-amber-500 border-amber-500" : "border-slate-300"}`}>
              {form.ppnAktif && <Check size={8} className="text-white" />}
            </div>
            PPN 11%
          </button>
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
    </div>
  );
}

function buildPayload(form) {
  return {
    ...form,
    items: (form.items || []).map(it => ({
      ...it,
      volume: Number(it.volume) || 0,
      hargaSatuan: Number(it.hargaSatuan) || 0,
    })),
  };
}
