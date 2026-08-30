import { useEffect, useState, useRef, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Save, Printer, RotateCw, ZoomIn, ZoomOut,
  FileText, User, AlignLeft, Banknote, MapPin, PenLine,
} from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { AuthContext } from "../../context/AuthContext";
import {
  getAllDokumen, getDokumen, createDokumen, updateDokumen,
  formatRupiah, hitungTotal, suggestNomorKwitansi,
} from "../../services/rabService";
import { getSettings } from "../../services/contentService";
import { getAllInstansi } from "../../services/instansiService";
import TemplateKwitansiAdytia from "../../templates/kwitansi/TemplateKwitansiAdytia";

const TODAY = () => new Date().toISOString().slice(0, 10);

const EMPTY = {
  type: "kwitansi",
  nomor: "",
  invoiceId: "",
  invoiceNomor: "",
  pelangganNama: "",
  pelangganAlamat: "",
  keteranganPembayaran: "",
  nominal: "",
  tanggal: TODAY(),
  lokasi: "Gresik",
  // penandatangan
  instansiId: "",
  pjId: "",
  penerima: "",
  jabatanPenerima: "",
  ttdUrl: "",
  stempelUrl: "",
  logoInstansiUrl: "",
};

/* ── tiny reusable field components ── */
function SectionCard({ icon: Icon, title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
        {Icon && <Icon className="w-4 h-4 text-amber-500" />}
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{title}</span>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}

function FormField({ label, hint, children }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-slate-600">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function StyledInput({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={`w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition ${className}`}
    />
  );
}

export default function KwitansiBuilder() {
  const { id }          = useParams();
  const isEdit          = !!id;
  const navigate        = useNavigate();
  const { user }        = useContext(AuthContext);
  const printRef        = useRef(null);

  const [form, setForm]             = useState(EMPTY);
  const [company, setCompany]       = useState({});
  const [invoices, setInvoices]     = useState([]);
  const [instansiList, setInstansiList] = useState([]);
  const [pjList, setPjList]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState({ msg: "", on: false, err: false });
  const [mTab, setMTab]             = useState("form");
  const [zoom, setZoom]             = useState(58);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const show = (msg, type = "ok") => {
    setToast({ msg, on: true, err: type === "error" });
    setTimeout(() => setToast(t => ({ ...t, on: false })), 3000);
  };

  useEffect(() => {
    const init = async () => {
      try {
        const [settings, invList, instList] = await Promise.all([
          getSettings(),
          getAllDokumen({ type: "invoice" }),
          getAllInstansi(),
        ]);
        setCompany(settings);
        setInvoices(invList);
        setInstansiList(instList);

        if (isEdit) {
          const doc = await getDokumen(id);
          if (doc) {
            setForm({ ...EMPTY, ...doc });
            // restore pjList for the saved instansiId
            if (doc.instansiId) {
              const inst = instList.find(i => i.id === doc.instansiId);
              setPjList(inst?.penanggungJawab || []);
            }
          }
        } else {
          const suggested = await suggestNomorKwitansi(TODAY());
          setForm(f => ({
            ...f,
            nomor: suggested,
            lokasi: settings.address?.split(",").pop()?.trim() || "Gresik",
            penerima: settings.direktur || "",
          }));
        }
      } catch {
        show("Gagal memuat data", "error");
      } finally {
        setLoading(false);
      }
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const refreshNomor = async () => {
    try {
      const n = await suggestNomorKwitansi(form.tanggal || TODAY());
      set("nomor", n);
    } catch { show("Gagal mengambil nomor", "error"); }
  };

  const handleSelectInvoice = (invoiceId) => {
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv) { set("invoiceId", ""); return; }
    const total = hitungTotal(inv.items || [], inv.ppnAktif !== false).grandTotal;
    setForm(f => ({
      ...f,
      invoiceId: inv.id,
      invoiceNomor: inv.nomor || "",
      pelangganNama: inv.tagihan?.perusahaan || inv.tagihan?.nama || "",
      pelangganAlamat: inv.tagihan?.alamat || "",
      keteranganPembayaran: `Pembayaran Sesuai Dengan Invoice NO. ${inv.nomor || ""}`,
      nominal: total,
    }));
  };

  const handleSelectInstansi = (instansiId) => {
    const inst = instansiList.find(i => i.id === instansiId);
    setPjList(inst?.penanggungJawab || []);
    setForm(f => ({
      ...f,
      instansiId,
      pjId: "",
      ttdUrl: "",
      stempelUrl: "",
      logoInstansiUrl: inst?.logo?.url || "",
    }));
  };

  const handleSelectPj = (pjId) => {
    const pj = pjList.find(p => p.id === pjId);
    if (!pj) { setForm(f => ({ ...f, pjId: "" })); return; }
    setForm(f => ({
      ...f,
      pjId,
      penerima: pj.nama || "",
      jabatanPenerima: pj.jabatan || "",
      ttdUrl: pj.signature?.url || "",
      stempelUrl: pj.stempel?.url || "",
    }));
  };

  const handleSave = async () => {
    if (!form.nomor.trim()) return show("Nomor kwitansi wajib diisi", "error");
    if (!form.pelangganNama.trim()) return show("Nama pelanggan wajib diisi", "error");
    setSaving(true);
    try {
      const payload = { ...form, nominal: Number(form.nominal) || 0 };
      if (isEdit) {
        await updateDokumen(id, payload);
        show("Kwitansi diperbarui");
      } else {
        const newId = await createDokumen(payload, user?.uid);
        show("Kwitansi tersimpan");
        navigate(`/dashboard/keuangan/kwitansi/${newId}`, { replace: true });
      }
    } catch { show("Gagal menyimpan", "error"); }
    finally { setSaving(false); }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Kwitansi-${form.nomor || "dokumen"}`,
    pageStyle: `
      @page { size: A4 portrait; margin: 0; }
      @media print {
        body { background: #fff !important; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      }
    `,
  });

  const templateData = { ...form, nominal: Number(form.nominal) || 0 };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 64px)" }}>

      {/* ── Toast ── */}
      {toast.on && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium text-white transition-all ${toast.err ? "bg-red-500" : "bg-emerald-500"}`}>
          {toast.msg}
        </div>
      )}

      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-slate-200 shrink-0">
        <button
          onClick={() => navigate("/dashboard/keuangan/kwitansi")}
          className="p-2 rounded-xl hover:bg-slate-100 transition text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-slate-800 text-sm leading-tight">
            {isEdit ? "Edit Kwitansi" : "Buat Kwitansi Baru"}
          </h1>
          {form.nomor && (
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono truncate">{form.nomor}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 text-sm font-medium transition"
          >
            <Printer className="w-3.5 h-3.5" /> Cetak
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition disabled:opacity-60 shadow-sm"
          >
            {saving
              ? <RotateCw className="w-3.5 h-3.5 animate-spin" />
              : <Save className="w-3.5 h-3.5" />
            }
            Simpan
          </button>
        </div>
      </div>

      {/* ── Mobile tabs ── */}
      <div className="flex lg:hidden bg-white border-b border-slate-200 shrink-0">
        {[["form", "Formulir"], ["preview", "Preview"]].map(([key, label]) => (
          <button key={key} onClick={() => setMTab(key)}
            className={`flex-1 py-2.5 text-sm font-medium transition-all ${
              mTab === key
                ? "text-amber-600 border-b-2 border-amber-500 bg-amber-50/50"
                : "text-slate-500 hover:text-slate-700"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Main body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Form panel ── */}
        <div className={`w-full lg:w-[340px] xl:w-[380px] shrink-0 bg-slate-50 border-r border-slate-200 overflow-y-auto p-4 space-y-3 ${mTab === "preview" ? "hidden lg:block" : "block"}`}>

          {/* Invoice picker */}
          <SectionCard icon={FileText} title="Referensi Invoice">
            <FormField label="Pilih Invoice" hint="Auto-isi nama, alamat & nominal dari invoice">
              <select
                value={form.invoiceId}
                onChange={e => handleSelectInvoice(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition bg-white"
              >
                <option value="">— Pilih invoice (opsional) —</option>
                {invoices.map(inv => (
                  <option key={inv.id} value={inv.id}>
                    {inv.nomor || inv.id} – {inv.tagihan?.perusahaan || inv.tagihan?.nama || "?"}
                  </option>
                ))}
              </select>
            </FormField>
          </SectionCard>

          {/* Nomor & tanggal */}
          <SectionCard icon={AlignLeft} title="Identitas Kwitansi">
            <FormField label="Nomor Kwitansi">
              <div className="flex gap-1.5">
                <StyledInput
                  value={form.nomor}
                  onChange={e => set("nomor", e.target.value)}
                  placeholder="PT.APT/KWT/001/I/01/01/2026"
                  className="flex-1"
                />
                <button
                  onClick={refreshNomor}
                  title="Sarankan nomor baru"
                  className="px-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-amber-600 transition"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
            </FormField>

            <FormField label="Tanggal">
              <StyledInput type="date" value={form.tanggal} onChange={e => set("tanggal", e.target.value)} />
            </FormField>
          </SectionCard>

          {/* Pelanggan */}
          <SectionCard icon={User} title="Data Penerima Pembayaran">
            <FormField label="Nama / Perusahaan">
              <StyledInput
                value={form.pelangganNama}
                onChange={e => set("pelangganNama", e.target.value)}
                placeholder="PT. SANMAS"
              />
            </FormField>
            <FormField label="Alamat">
              <StyledInput
                value={form.pelangganAlamat}
                onChange={e => set("pelangganAlamat", e.target.value)}
                placeholder="Jl. Raya Babat Jerawat no 43, Surabaya"
              />
            </FormField>
          </SectionCard>

          {/* Pembayaran */}
          <SectionCard icon={Banknote} title="Detail Pembayaran">
            <FormField label="Keterangan Pembayaran">
              <StyledInput
                value={form.keteranganPembayaran}
                onChange={e => set("keteranganPembayaran", e.target.value)}
                placeholder="Pembayaran Sesuai Dengan Invoice NO. ..."
              />
            </FormField>
            <FormField label="Nominal (Rp)">
              <StyledInput
                type="number"
                value={form.nominal}
                onChange={e => set("nominal", e.target.value)}
                placeholder="0"
              />
              {Number(form.nominal) > 0 && (
                <p className="text-xs text-amber-600 font-semibold mt-1">{formatRupiah(form.nominal)}</p>
              )}
            </FormField>
          </SectionCard>

          {/* Lokasi */}
          <SectionCard icon={MapPin} title="Lokasi & Tanggal">
            <FormField label="Kota Penerbitan">
              <StyledInput
                value={form.lokasi}
                onChange={e => set("lokasi", e.target.value)}
                placeholder="Gresik"
              />
            </FormField>
          </SectionCard>

          {/* Penandatangan */}
          <SectionCard icon={PenLine} title="Penandatangan">
            <FormField label="Instansi">
              <select
                value={form.instansiId}
                onChange={e => handleSelectInstansi(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition bg-white"
              >
                <option value="">— Pilih instansi —</option>
                {instansiList.map(inst => (
                  <option key={inst.id} value={inst.id}>{inst.nama}</option>
                ))}
              </select>
            </FormField>

            {form.instansiId && (
              <FormField label="Penanggung Jawab / TTD">
                {pjList.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Instansi ini belum punya penanggung jawab.</p>
                ) : (
                  <select
                    value={form.pjId}
                    onChange={e => handleSelectPj(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition bg-white"
                  >
                    <option value="">— Pilih penanggung jawab —</option>
                    {pjList.map(pj => (
                      <option key={pj.id} value={pj.id}>
                        {pj.nama}{pj.jabatan ? ` — ${pj.jabatan}` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </FormField>
            )}

            {/* Preview TTD + stempel */}
            {(form.ttdUrl || form.stempelUrl) && (
              <div className="flex items-end gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 mt-1">
                {form.ttdUrl && (
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400 mb-1">TTD</p>
                    <img src={form.ttdUrl} alt="TTD" className="h-12 object-contain" />
                  </div>
                )}
                {form.stempelUrl && (
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400 mb-1">Stempel</p>
                    <img src={form.stempelUrl} alt="Stempel" className="h-12 object-contain" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {form.penerima && <p className="text-xs font-semibold text-slate-700 truncate">{form.penerima}</p>}
                  {form.jabatanPenerima && <p className="text-[10px] text-slate-400 truncate">{form.jabatanPenerima}</p>}
                </div>
              </div>
            )}

            {/* Manual override nama */}
            <FormField label="Override Nama (opsional)" hint="Kosongkan untuk pakai nama PJ terpilih">
              <StyledInput
                value={form.penerima}
                onChange={e => set("penerima", e.target.value)}
                placeholder={company.direktur || "Nama penerima"}
              />
            </FormField>
          </SectionCard>

        </div>

        {/* ── Preview panel ── */}
        <div className={`flex-1 flex-col items-center overflow-auto py-6 gap-4 bg-gradient-to-br from-slate-100 to-slate-200 ${mTab === "form" ? "hidden lg:flex" : "flex"}`}>

          {/* Zoom bar */}
          <div className="flex items-center gap-2 bg-white/90 backdrop-blur rounded-2xl px-3 py-1.5 shadow-md border border-white/80 text-sm shrink-0">
            <button onClick={() => setZoom(z => Math.max(30, z - 5))} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-slate-600 w-12 text-center tabular-nums font-medium text-xs">{zoom}%</span>
            <button onClick={() => setZoom(z => Math.min(120, z + 5))} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Shadow wrapper around template */}
          <div className="shrink-0" style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}>
            <div className="rounded-sm overflow-hidden shadow-2xl" ref={printRef}>
              <TemplateKwitansiAdytia data={templateData} company={company} />
            </div>
          </div>

          {/* Breathing room below template when zoomed out */}
          <div style={{ height: `${Math.max(0, 620 - 590 * zoom / 100)}px` }} />

        </div>
      </div>
    </div>
  );
}
