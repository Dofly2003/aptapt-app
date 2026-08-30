import { useState, useEffect, useRef, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import {
  getDokumen, createDokumen, updateDokumen, getAllDokumen,
  formatRupiah, hitungTotal, newItem, SATUAN_OPTIONS,
  DEFAULT_CLOSING,
} from "../../services/rabService";
import { getAllInstansi } from "../../services/instansiService";
import OfflineBanner from "../../offline/OfflineBanner";
import {
  ArrowLeft, Plus, Trash2, Check, Loader2, AlertCircle, ChevronDown, ChevronUp,
  ClipboardList, Search, X,
} from "lucide-react";

const TODAY = () => new Date().toISOString().slice(0, 10);

const EMPTY = () => ({
  type: "invoice",
  nomor: "",
  perihal: "",
  tanggal: TODAY(),
  jatuhTempo: "",
  status: "draft",
  lokasi: "",
  instansiId: "",
  ttd: null,
  tampilTtd: false,
  tagihan: { nama: "", perusahaan: "", alamat: "", telp: "" },
  items: [newItem()],
  ppnAktif: true,
  pembayaran: { bank: "", noRek: "", atasNama: "" },
  catatan: "",
  closingMessage: DEFAULT_CLOSING.invoice,
});

const inp = "w-full h-11 px-3 text-sm text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400 transition-colors placeholder-slate-300";
const inpSm = "w-full h-9 px-2.5 text-sm text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400 transition-colors placeholder-slate-300";

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

export default function MobileInvoiceEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const isNew = !id || id === "baru";
  const docIdRef = useRef(isNew ? null : id);
  const [docId, setDocId] = useState(isNew ? null : id);

  const [form, setForm]         = useState(EMPTY());
  const [instansiList, setInstansiList] = useState([]);
  const [initialized, setInitialized] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [showRabPicker, setShowRabPicker] = useState(false);
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
      try {
        const payload = buildPayload(form);
        if (!docIdRef.current) {
          const hasContent = form.perihal?.trim() || (form.items || []).some(it => it.nama?.trim());
          if (!hasContent) { setSaveStatus("idle"); return; }
          setSaveStatus("saving");
          const newId = await createDokumen(payload, user?.uid);
          docIdRef.current = newId;
          setDocId(newId);
          navigate(`/app-mobile/invoice/${newId}`, { replace: true });
        } else {
          setSaveStatus("saving");
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
  const setTagihan = (k, v) => setForm(p => ({ ...p, tagihan: { ...p.tagihan, [k]: v } }));
  const setPembayaran = (k, v) => setForm(p => ({ ...p, pembayaran: { ...p.pembayaran, [k]: v } }));

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
        <button onClick={() => navigate("/app-mobile/invoice")}
          className="text-slate-500 active:scale-90 transition-transform shrink-0">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-slate-800 text-sm truncate">
            {isNew && !docId ? "Invoice Baru" : (form.perihal || "Invoice")}
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            {saveStatus === "saving" && (
              <><Loader2 size={11} className="animate-spin text-blue-500" /><span className="text-[10px] text-blue-500">Menyimpan...</span></>
            )}
            {saveStatus === "saved" && (
              <><Check size={11} className="text-emerald-500" /><span className="text-[10px] text-emerald-500">Tersimpan</span></>
            )}
            {saveStatus === "error" && (
              <><AlertCircle size={11} className="text-red-500" /><span className="text-[10px] text-red-500">Gagal simpan</span></>
            )}
            {saveStatus === "dirty" && docIdRef.current && (
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

        {/* Isi dari RAB — tersedia di buat baru maupun edit */}
        <button onClick={() => setShowRabPicker(true)}
          className="w-full flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3.5 active:scale-[0.98] transition-transform">
          <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center shrink-0">
            <ClipboardList size={18} className="text-white" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-amber-900">
              {form.sourceRabNomor ? `Diisi dari RAB ${form.sourceRabNomor}` : "Isi dari RAB"}
            </p>
            <p className="text-[11px] text-amber-700 mt-0.5">
              {form.sourceRabNomor ? "Ketuk untuk ganti RAB" : "Pilih RAB untuk isi otomatis item & penerima"}
            </p>
          </div>
          <ChevronDown size={16} className="text-amber-500 shrink-0" />
        </button>

        {/* Perihal */}
        <div className="bg-white rounded-2xl border border-slate-100 px-4 py-3.5">
          <label className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">Perihal / Judul Invoice</label>
          <input type="text" value={form.perihal}
            onChange={e => set("perihal", e.target.value)}
            placeholder="Tagihan jasa instalasi panel..."
            className="mt-1.5 w-full text-base font-semibold text-slate-900 bg-transparent border-none outline-none placeholder-slate-300" />
        </div>

        {/* Informasi */}
        <Section title="Informasi Invoice">
          <div className="pt-3">
            <label className="text-xs text-slate-500 mb-1 block">Nomor Invoice</label>
            <input type="text" value={form.nomor}
              onChange={e => set("nomor", e.target.value)}
              placeholder="001/APT/VI/2026"
              className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Tanggal</label>
              <input type="date" value={form.tanggal}
                onChange={e => set("tanggal", e.target.value)}
                className={inp} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Jatuh Tempo</label>
              <input type="date" value={form.jatuhTempo || ""}
                onChange={e => set("jatuhTempo", e.target.value)}
                className={inp} />
            </div>
          </div>
        </Section>

        {/* Perusahaan & TTD */}
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
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-slate-700">Tampilkan Tanda Tangan</p>
              <p className="text-[10px] text-slate-400">TTD + stempel di bagian bawah invoice</p>
            </div>
            <button
              onClick={() => set("tampilTtd", !form.tampilTtd)}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0
                ${form.tampilTtd ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
                ${form.tampilTtd ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
        </Section>

        {/* Tagihan Kepada */}
        <Section title="Tagihan Kepada">
          <div className="pt-3">
            <label className="text-xs text-slate-500 mb-1 block">Nama</label>
            <input type="text" value={form.tagihan?.nama || ""}
              onChange={e => setTagihan("nama", e.target.value)}
              placeholder="Bapak / Ibu ..."
              className={inp} />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Nama Perusahaan</label>
            <input type="text" value={form.tagihan?.perusahaan || ""}
              onChange={e => setTagihan("perusahaan", e.target.value)}
              placeholder="PT. Maju Bersama"
              className={inp} />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Alamat</label>
            <input type="text" value={form.tagihan?.alamat || ""}
              onChange={e => setTagihan("alamat", e.target.value)}
              placeholder="Jl. ..."
              className={inp} />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">No. Telp</label>
            <input type="tel" value={form.tagihan?.telp || ""}
              onChange={e => setTagihan("telp", e.target.value)}
              placeholder="08xxxxxxxx"
              className={inp} />
          </div>
        </Section>

        {/* Items */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-sm font-semibold text-slate-700">Daftar Item ({form.items.length})</span>
            <button onClick={addItem}
              className="flex items-center gap-1 text-xs font-semibold text-blue-600 active:scale-90 transition-transform">
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
                    placeholder="Deskripsi item / jasa"
                    className="flex-1 text-sm text-slate-900 bg-transparent border-b border-slate-200 pb-1 outline-none placeholder-slate-300 focus:border-blue-400 transition-colors" />
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
                  <p className="text-right text-xs font-semibold text-blue-600 pl-7">
                    = {formatRupiah(Number(item.volume) * Number(item.hargaSatuan))}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Pembayaran */}
        <Section title="Info Pembayaran" defaultOpen={false}>
          <div className="pt-3">
            <label className="text-xs text-slate-500 mb-1 block">Nama Bank</label>
            <input type="text" value={form.pembayaran?.bank || ""}
              onChange={e => setPembayaran("bank", e.target.value)}
              placeholder="BCA / BRI / Mandiri..."
              className={inp} />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">No. Rekening</label>
            <input type="text" value={form.pembayaran?.noRek || ""}
              onChange={e => setPembayaran("noRek", e.target.value)}
              placeholder="1234567890"
              className={inp} />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Atas Nama</label>
            <input type="text" value={form.pembayaran?.atasNama || ""}
              onChange={e => setPembayaran("atasNama", e.target.value)}
              placeholder="PT. Adytia Putra Tehnik"
              className={inp} />
          </div>
        </Section>

        {/* Teks Surat */}
        <Section title="Teks Surat" defaultOpen={false}>
          <div className="pt-3">
            <label className="text-xs text-slate-500 mb-1 block">Lokasi</label>
            <input type="text" value={form.lokasi || ""}
              onChange={e => set("lokasi", e.target.value)}
              placeholder="Gresik"
              className={inp} />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Paragraf Penutup</label>
            <textarea value={form.closingMessage || ""}
              onChange={e => set("closingMessage", e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 text-sm text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400 transition-colors placeholder-slate-300 resize-none" />
          </div>
        </Section>

        {/* Catatan */}
        <Section title="Catatan" defaultOpen={false}>
          <textarea value={form.catatan}
            onChange={e => set("catatan", e.target.value)}
            placeholder="Catatan tambahan (opsional)..."
            rows={3}
            className="mt-3 w-full px-3 py-2.5 text-sm text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400 transition-colors placeholder-slate-300 resize-none" />
        </Section>
      </div>

      {/* ── Fixed Total Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 pt-3 pb-safe-nav z-10">
        <div className="flex items-center justify-between mb-1.5">
          <button onClick={() => set("ppnAktif", !form.ppnAktif)}
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors
              ${form.ppnAktif ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
            <div className={`w-3 h-3 rounded-sm border flex items-center justify-center
              ${form.ppnAktif ? "bg-blue-500 border-blue-500" : "border-slate-300"}`}>
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
            <p className="text-base font-bold text-blue-700">{formatRupiah(totals.grandTotal)}</p>
          </div>
        </div>
      </div>

      {/* ══ RAB Picker (mobile bottom sheet) ══ */}
      {showRabPicker && (
        <MobileRabPickerSheet
          onClose={() => setShowRabPicker(false)}
          onSelect={rab => {
            const mapped = mapRabToInvoice(rab);
            setForm(p => ({ ...p, ...mapped }));
            setShowRabPicker(false);
          }}
        />
      )}
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

/* ─── Map RAB → Invoice ────────────────────────────────── */
function mapRabToInvoice(rab) {
  const diTempat = rab.kepada?.di === "di tempat" ? "" : (rab.kepada?.di || "");
  return {
    type: "invoice",
    nomor: "",
    perihal: rab.perihal || "",
    tagihan: {
      nama: rab.kepada?.yth || "",
      perusahaan: rab.kepada?.perusahaan || "",
      alamat: diTempat,
      telp: "",
    },
    tanggal: new Date().toISOString().slice(0, 10),
    jatuhTempo: "",
    lokasi: rab.lokasi || "",
    instansiId: rab.instansiId || "",
    ttd: rab.ttd || null,
    tampilTtd: false,
    items: (rab.items || [])
      .map(it => ({
        ...newItem(),
        nama: String(it.nama || "").trim(),
        satuan: String(it.satuan || "pcs"),
        volume: Number(it.volume) || 1,
        hargaSatuan: Number(it.hargaSatuan) || 0,
      }))
      .filter(it => it.nama),
    ppnAktif: rab.ppnAktif ?? true,
    pembayaran: { bank: "", noRek: "", atasNama: "" },
    catatan: rab.catatan || "",
    closingMessage: DEFAULT_CLOSING.invoice,
    status: "draft",
    sourceRabId: rab.id,
    sourceRabNomor: rab.nomor || rab.perihal || rab.id,
  };
}

/* ─── Mobile RAB Picker (bottom sheet) ─────────────────── */
function MobileRabPickerSheet({ onClose, onSelect }) {
  const [list,    setList]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [error,   setError]   = useState("");

  useEffect(() => {
    getAllDokumen({ type: "rab" })
      .then(setList)
      .catch(() => setError("Gagal memuat daftar RAB"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = list.filter(r => {
    if (!search) return true;
    return [r.nomor, r.perihal, r.kepada?.perusahaan]
      .filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl flex flex-col max-h-[85vh]">

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0">
          <div>
            <p className="font-bold text-slate-900 text-base">Pilih RAB</p>
            <p className="text-xs text-slate-400 mt-0.5">Item & data penerima akan diisi otomatis</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center active:scale-90 transition-transform">
            <X size={16} className="text-slate-500" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pb-3 shrink-0">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 h-10">
            <Search size={15} className="text-slate-400 shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari nomor atau perihal RAB…"
              className="flex-1 text-sm bg-transparent outline-none placeholder-slate-400 text-slate-900" />
            {search && (
              <button onClick={() => setSearch("")}>
                <X size={13} className="text-slate-400" />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 pb-safe">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-amber-500" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-3 mt-2">
              <AlertCircle size={16} className="shrink-0" />{error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">
              {list.length === 0 ? "Belum ada RAB yang tersimpan." : "Tidak ada RAB yang sesuai."}
            </div>
          ) : (
            <div className="space-y-2 pb-6">
              {filtered.map(r => {
                const total = hitungTotal(r.items || [], r.ppnAktif).grandTotal;
                return (
                  <button key={r.id} onClick={() => onSelect(r)}
                    className="w-full text-left bg-white border border-slate-200 rounded-2xl px-4 py-3.5 active:scale-[0.98] transition-transform active:bg-amber-50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${r.status === "final" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                            {r.status === "final" ? "Final" : "Draft"}
                          </span>
                          <span className="text-sm font-semibold text-slate-800 truncate">{r.nomor || "—"}</span>
                        </div>
                        <p className="text-sm text-slate-700 truncate">{r.perihal || "—"}</p>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{r.kepada?.perusahaan || "—"}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-amber-700">{formatRupiah(total)}</p>
                        <p className="text-[11px] text-slate-400">{r.items?.length || 0} item</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
