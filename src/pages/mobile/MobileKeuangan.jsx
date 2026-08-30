import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import {
  getAllJurnal, createJurnal, updateJurnal, removeJurnal,
  getAllHutang, createHutang, updateHutang, removeHutang,
  getAllPiutang, createPiutang, updatePiutang, removePiutang,
  getAllAnggaran, createAnggaran, updateAnggaran, removeAnggaran,
  getAllArusKas, createArusKas, updateArusKas, removeArusKas,
  formatRupiah,
} from "../../services/keuanganService";
import { ArrowLeft, Plus, Pencil, Trash2, X, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import OfflineBanner from "../../offline/OfflineBanner";

/* ── constants ── */
const TABS = [
  { key: "jurnal",   label: "Ledger"   },
  { key: "hutang",   label: "AP"       },
  { key: "piutang",  label: "AR"       },
  { key: "anggaran", label: "Anggaran" },
  { key: "aruskas",  label: "Arus Kas" },
];

const PAY_STATUS_COLOR = {
  belum_bayar: "bg-red-100 text-red-700",
  sebagian:    "bg-amber-100 text-amber-700",
  lunas:       "bg-emerald-100 text-emerald-700",
};
const PAY_STATUS_LABEL = { belum_bayar: "Belum Bayar", sebagian: "Sebagian", lunas: "Lunas" };
const J_STATUS_COLOR   = { draft: "bg-amber-100 text-amber-700", posted: "bg-emerald-100 text-emerald-700" };

const EMPTY_JURNAL   = { nomorJurnal:"", tanggal:"", akun:"", keterangan:"", debit:"", kredit:"", referensi:"", status:"draft" };
const EMPTY_HUTANG   = { nomorDokumen:"", vendor:"", tanggalFaktur:"", tanggalJatuhTempo:"", keterangan:"", nominal:"", status:"belum_bayar" };
const EMPTY_PIUTANG  = { nomorFaktur:"", pelanggan:"", tanggalFaktur:"", tanggalJatuhTempo:"", keterangan:"", nominal:"", status:"belum_bayar" };
const EMPTY_ANGGARAN = { departemen:"", periode:"", kategori:"", nominal:"", realisasi:"", keterangan:"" };
const EMPTY_ARUSKAS  = { tanggal:"", keterangan:"", kategori:"operasional", masuk:"", keluar:"", referensi:"" };

/* ── shared sub-components ── */
function SheetHandle() {
  return <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />;
}
function FieldRow({ label, children }) {
  return (
    <div>
      <label className="text-xs text-slate-500 mb-1 block">{label}</label>
      {children}
    </div>
  );
}
const inp = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white";
function Inp({ value, onChange, type = "text", placeholder = "" }) {
  return <input type={type} value={value} onChange={onChange} placeholder={placeholder} className={inp} />;
}
function Sel({ value, onChange, children }) {
  return <select value={value} onChange={onChange} className={inp}>{children}</select>;
}

function DelSheet({ target, label, onConfirm, onClose }) {
  if (!target) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[55]" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-3xl px-4 pt-3 pb-safe-sheet">
        <SheetHandle />
        <p className="text-sm text-slate-700 mb-1">Hapus data ini?</p>
        <p className="text-xs text-slate-400 mb-5 truncate">{label}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-slate-200 rounded-2xl text-sm font-medium text-slate-600 active:scale-95">Batal</button>
          <button onClick={onConfirm} className="flex-1 py-3 bg-red-500 text-white rounded-2xl text-sm font-semibold active:scale-95">Hapus</button>
        </div>
      </div>
    </>
  );
}

/* ── hook for generic tab CRUD ── */
function useTabCrud(getFn, createFn, updateFn, removeFn) {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [sheet,   setSheet]   = useState(null);    // null | "add" | item
  const [form,    setForm]    = useState({});
  const [saving,  setSaving]  = useState(false);
  const [del,     setDel]     = useState(null);

  const load = async () => { setLoading(true); try { setItems(await getFn()); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const openAdd  = (empty) => { setForm({ ...empty }); setSheet("add"); };
  const openEdit = (item)  => { setForm({ ...item });  setSheet(item); };
  const setF     = (k, v)  => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      if (sheet === "add") await createFn(form);
      else await updateFn(sheet.id, form);
      setSheet(null);
      await load();
    } finally { setSaving(false); }
  };

  const confirmDel = async () => {
    if (!del) return;
    await removeFn(del.id);
    setDel(null);
    await load();
  };

  return { items, loading, sheet, form, saving, del,
           openAdd, openEdit, setF, save, setSheet, setDel, confirmDel };
}

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
export default function MobileKeuangan() {
  const { role } = useContext(AuthContext);
  const navigate = useNavigate();
  const [tab, setTab] = useState("jurnal");

  const canAccess = role === "superadmin" || role === "finance";

  const jurnal   = useTabCrud(getAllJurnal,   createJurnal,   updateJurnal,   removeJurnal);
  const hutang   = useTabCrud(getAllHutang,   createHutang,   updateHutang,   removeHutang);
  const piutang  = useTabCrud(getAllPiutang,  createPiutang,  updatePiutang,  removePiutang);
  const anggaran = useTabCrud(getAllAnggaran, createAnggaran, updateAnggaran, removeAnggaran);
  const aruskas  = useTabCrud(getAllArusKas,  createArusKas,  updateArusKas,  removeArusKas);

  const crud = { jurnal, hutang, piutang, anggaran, aruskas };
  const c    = crud[tab];

  if (!canAccess) {
    return (
      <div className="p-6 text-center text-slate-400">
        <p className="font-medium">Akses ditolak</p>
        <p className="text-sm mt-1">Hanya superadmin dan finance.</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-amber-600 text-sm font-medium">Kembali</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <OfflineBanner />
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10 pt-safe">
        <button onClick={() => navigate(-1)} className="text-slate-500"><ArrowLeft size={20} /></button>
        <div className="flex-1">
          <h1 className="font-bold text-slate-800">Keuangan</h1>
        </div>
        <button
          onClick={() => c.openAdd(
            tab === "jurnal"   ? EMPTY_JURNAL   :
            tab === "hutang"   ? EMPTY_HUTANG   :
            tab === "piutang"  ? EMPTY_PIUTANG  :
            tab === "anggaran" ? EMPTY_ANGGARAN :
                                 EMPTY_ARUSKAS
          )}
          className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center text-white active:scale-95">
          <Plus size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-100 px-4">
        <div className="flex gap-1 overflow-x-auto py-2">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`shrink-0 px-4 py-1.5 rounded-xl text-xs font-semibold transition
                ${tab === t.key ? "bg-amber-500 text-white" : "text-slate-500 hover:bg-slate-100"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 pb-8 space-y-2">
        {c.loading && <p className="text-center text-slate-400 py-10 text-sm">Memuat...</p>}
        {!c.loading && c.items.length === 0 && (
          <p className="text-center text-slate-400 py-12 text-sm">Belum ada data.</p>
        )}

        {/* ── JURNAL ── */}
        {tab === "jurnal" && c.items.map(item => (
          <ItemCard key={item.id} onEdit={() => c.openEdit(item)} onDel={() => c.setDel(item)}>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-mono text-xs text-slate-500">{item.nomorJurnal || "—"}</span>
              <Badge cls={J_STATUS_COLOR[item.status] || J_STATUS_COLOR.draft}>{item.status}</Badge>
            </div>
            <p className="text-sm font-semibold text-slate-800 truncate">{item.keterangan || item.akun || "—"}</p>
            <p className="text-xs text-slate-400">{item.tanggal} · {item.akun}</p>
            <div className="flex gap-3 mt-1.5">
              {item.debit  > 0 && <span className="text-xs text-emerald-600 font-medium">D: {formatRupiah(item.debit)}</span>}
              {item.kredit > 0 && <span className="text-xs text-red-500 font-medium">K: {formatRupiah(item.kredit)}</span>}
            </div>
          </ItemCard>
        ))}

        {/* ── HUTANG (AP) ── */}
        {tab === "hutang" && c.items.map(item => (
          <ItemCard key={item.id} onEdit={() => c.openEdit(item)} onDel={() => c.setDel(item)}>
            <div className="flex items-center gap-2 mb-1">
              <Badge cls={PAY_STATUS_COLOR[item.status] || PAY_STATUS_COLOR.belum_bayar}>
                {PAY_STATUS_LABEL[item.status] || item.status}
              </Badge>
              <span className="text-xs text-slate-400 font-mono">{item.nomorDokumen}</span>
            </div>
            <p className="text-sm font-semibold text-slate-800">{item.vendor || "—"}</p>
            <p className="text-xs text-slate-400">{item.tanggalFaktur} → jatuh tempo {item.tanggalJatuhTempo || "—"}</p>
            <p className="text-sm font-bold text-red-600 mt-1">{formatRupiah(item.nominal)}</p>
          </ItemCard>
        ))}

        {/* ── PIUTANG (AR) ── */}
        {tab === "piutang" && c.items.map(item => (
          <ItemCard key={item.id} onEdit={() => c.openEdit(item)} onDel={() => c.setDel(item)}>
            <div className="flex items-center gap-2 mb-1">
              <Badge cls={PAY_STATUS_COLOR[item.status] || PAY_STATUS_COLOR.belum_bayar}>
                {PAY_STATUS_LABEL[item.status] || item.status}
              </Badge>
              <span className="text-xs text-slate-400 font-mono">{item.nomorFaktur}</span>
            </div>
            <p className="text-sm font-semibold text-slate-800">{item.pelanggan || "—"}</p>
            <p className="text-xs text-slate-400">{item.tanggalFaktur} → jatuh tempo {item.tanggalJatuhTempo || "—"}</p>
            <p className="text-sm font-bold text-emerald-600 mt-1">{formatRupiah(item.nominal)}</p>
          </ItemCard>
        ))}

        {/* ── ANGGARAN ── */}
        {tab === "anggaran" && c.items.map(item => {
          const real = Number(item.realisasi) || 0;
          const nom  = Number(item.nominal)   || 0;
          const pct  = nom > 0 ? Math.min(100, Math.round((real / nom) * 100)) : 0;
          return (
            <ItemCard key={item.id} onEdit={() => c.openEdit(item)} onDel={() => c.setDel(item)}>
              <p className="text-sm font-semibold text-slate-800">{item.departemen || "—"}</p>
              <p className="text-xs text-slate-400">{item.periode} · {item.kategori}</p>
              <div className="mt-2">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Realisasi {pct}%</span>
                  <span>{formatRupiah(real)} / {formatRupiah(nom)}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full">
                  <div className={`h-1.5 rounded-full ${pct > 100 ? "bg-red-400" : "bg-amber-400"}`}
                    style={{ width: `${pct}%` }} />
                </div>
              </div>
            </ItemCard>
          );
        })}

        {/* ── ARUS KAS ── */}
        {tab === "aruskas" && c.items.map(item => (
          <ItemCard key={item.id} onEdit={() => c.openEdit(item)} onDel={() => c.setDel(item)}>
            <p className="text-xs text-slate-400 mb-1">{item.tanggal} · {item.kategori}</p>
            <p className="text-sm font-semibold text-slate-800 truncate">{item.keterangan || "—"}</p>
            <div className="flex gap-4 mt-1.5">
              {item.masuk  > 0 && (
                <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                  <ArrowDownLeft size={12} />{formatRupiah(item.masuk)}
                </span>
              )}
              {item.keluar > 0 && (
                <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
                  <ArrowUpRight size={12} />{formatRupiah(item.keluar)}
                </span>
              )}
            </div>
          </ItemCard>
        ))}
      </div>

      {/* ── BOTTOM SHEETS (form add/edit) ── */}
      {c.sheet !== null && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[55]" onClick={() => c.setSheet(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-3xl px-4 pt-3 pb-safe-sheet
                          max-h-[92vh] overflow-y-auto">
            <SheetHandle />
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-800">
                {c.sheet === "add" ? "Tambah" : "Edit"} {TABS.find(t => t.key === tab)?.label}
              </h2>
              <button onClick={() => c.setSheet(null)} className="text-slate-400"><X size={20} /></button>
            </div>

            {/* JURNAL FORM */}
            {tab === "jurnal" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <FieldRow label="No. Jurnal"><Inp value={c.form.nomorJurnal} onChange={e => c.setF("nomorJurnal", e.target.value)} placeholder="JRN-001" /></FieldRow>
                  <FieldRow label="Tanggal"><Inp type="date" value={c.form.tanggal} onChange={e => c.setF("tanggal", e.target.value)} /></FieldRow>
                </div>
                <FieldRow label="Akun"><Inp value={c.form.akun} onChange={e => c.setF("akun", e.target.value)} placeholder="Kas dan Setara Kas" /></FieldRow>
                <FieldRow label="Keterangan"><Inp value={c.form.keterangan} onChange={e => c.setF("keterangan", e.target.value)} placeholder="Deskripsi transaksi..." /></FieldRow>
                <div className="grid grid-cols-2 gap-3">
                  <FieldRow label="Debit (Rp)"><Inp type="number" value={c.form.debit} onChange={e => c.setF("debit", e.target.value)} placeholder="0" /></FieldRow>
                  <FieldRow label="Kredit (Rp)"><Inp type="number" value={c.form.kredit} onChange={e => c.setF("kredit", e.target.value)} placeholder="0" /></FieldRow>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FieldRow label="Referensi"><Inp value={c.form.referensi} onChange={e => c.setF("referensi", e.target.value)} placeholder="No. faktur" /></FieldRow>
                  <FieldRow label="Status">
                    <Sel value={c.form.status} onChange={e => c.setF("status", e.target.value)}>
                      <option value="draft">Draft</option>
                      <option value="posted">Posted</option>
                    </Sel>
                  </FieldRow>
                </div>
              </div>
            )}

            {/* HUTANG FORM */}
            {tab === "hutang" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <FieldRow label="No. Dokumen"><Inp value={c.form.nomorDokumen} onChange={e => c.setF("nomorDokumen", e.target.value)} placeholder="INV-001" /></FieldRow>
                  <FieldRow label="Status">
                    <Sel value={c.form.status} onChange={e => c.setF("status", e.target.value)}>
                      <option value="belum_bayar">Belum Bayar</option>
                      <option value="sebagian">Sebagian</option>
                      <option value="lunas">Lunas</option>
                    </Sel>
                  </FieldRow>
                </div>
                <FieldRow label="Vendor / Supplier"><Inp value={c.form.vendor} onChange={e => c.setF("vendor", e.target.value)} placeholder="PT. Supplier..." /></FieldRow>
                <div className="grid grid-cols-2 gap-3">
                  <FieldRow label="Tgl Faktur"><Inp type="date" value={c.form.tanggalFaktur} onChange={e => c.setF("tanggalFaktur", e.target.value)} /></FieldRow>
                  <FieldRow label="Jatuh Tempo"><Inp type="date" value={c.form.tanggalJatuhTempo} onChange={e => c.setF("tanggalJatuhTempo", e.target.value)} /></FieldRow>
                </div>
                <FieldRow label="Nominal (Rp)"><Inp type="number" value={c.form.nominal} onChange={e => c.setF("nominal", e.target.value)} placeholder="0" /></FieldRow>
                <FieldRow label="Keterangan"><Inp value={c.form.keterangan} onChange={e => c.setF("keterangan", e.target.value)} placeholder="Opsional..." /></FieldRow>
              </div>
            )}

            {/* PIUTANG FORM */}
            {tab === "piutang" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <FieldRow label="No. Faktur"><Inp value={c.form.nomorFaktur} onChange={e => c.setF("nomorFaktur", e.target.value)} placeholder="FAK-001" /></FieldRow>
                  <FieldRow label="Status">
                    <Sel value={c.form.status} onChange={e => c.setF("status", e.target.value)}>
                      <option value="belum_bayar">Belum Bayar</option>
                      <option value="sebagian">Sebagian</option>
                      <option value="lunas">Lunas</option>
                    </Sel>
                  </FieldRow>
                </div>
                <FieldRow label="Pelanggan"><Inp value={c.form.pelanggan} onChange={e => c.setF("pelanggan", e.target.value)} placeholder="PT. Pelanggan..." /></FieldRow>
                <div className="grid grid-cols-2 gap-3">
                  <FieldRow label="Tgl Faktur"><Inp type="date" value={c.form.tanggalFaktur} onChange={e => c.setF("tanggalFaktur", e.target.value)} /></FieldRow>
                  <FieldRow label="Jatuh Tempo"><Inp type="date" value={c.form.tanggalJatuhTempo} onChange={e => c.setF("tanggalJatuhTempo", e.target.value)} /></FieldRow>
                </div>
                <FieldRow label="Nominal (Rp)"><Inp type="number" value={c.form.nominal} onChange={e => c.setF("nominal", e.target.value)} placeholder="0" /></FieldRow>
                <FieldRow label="Keterangan"><Inp value={c.form.keterangan} onChange={e => c.setF("keterangan", e.target.value)} placeholder="Opsional..." /></FieldRow>
              </div>
            )}

            {/* ANGGARAN FORM */}
            {tab === "anggaran" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <FieldRow label="Departemen"><Inp value={c.form.departemen} onChange={e => c.setF("departemen", e.target.value)} placeholder="Engineering" /></FieldRow>
                  <FieldRow label="Periode"><Inp value={c.form.periode} onChange={e => c.setF("periode", e.target.value)} placeholder="Q1 2026" /></FieldRow>
                </div>
                <FieldRow label="Kategori"><Inp value={c.form.kategori} onChange={e => c.setF("kategori", e.target.value)} placeholder="Operasional, Proyek..." /></FieldRow>
                <div className="grid grid-cols-2 gap-3">
                  <FieldRow label="Nominal (Rp)"><Inp type="number" value={c.form.nominal} onChange={e => c.setF("nominal", e.target.value)} placeholder="0" /></FieldRow>
                  <FieldRow label="Realisasi (Rp)"><Inp type="number" value={c.form.realisasi} onChange={e => c.setF("realisasi", e.target.value)} placeholder="0" /></FieldRow>
                </div>
                <FieldRow label="Keterangan"><Inp value={c.form.keterangan} onChange={e => c.setF("keterangan", e.target.value)} placeholder="Opsional..." /></FieldRow>
              </div>
            )}

            {/* ARUS KAS FORM */}
            {tab === "aruskas" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <FieldRow label="Tanggal"><Inp type="date" value={c.form.tanggal} onChange={e => c.setF("tanggal", e.target.value)} /></FieldRow>
                  <FieldRow label="Kategori">
                    <Sel value={c.form.kategori} onChange={e => c.setF("kategori", e.target.value)}>
                      <option value="operasional">Operasional</option>
                      <option value="investasi">Investasi</option>
                      <option value="pendanaan">Pendanaan</option>
                    </Sel>
                  </FieldRow>
                </div>
                <FieldRow label="Keterangan"><Inp value={c.form.keterangan} onChange={e => c.setF("keterangan", e.target.value)} placeholder="Deskripsi..." /></FieldRow>
                <div className="grid grid-cols-2 gap-3">
                  <FieldRow label="Masuk (Rp)"><Inp type="number" value={c.form.masuk} onChange={e => c.setF("masuk", e.target.value)} placeholder="0" /></FieldRow>
                  <FieldRow label="Keluar (Rp)"><Inp type="number" value={c.form.keluar} onChange={e => c.setF("keluar", e.target.value)} placeholder="0" /></FieldRow>
                </div>
                <FieldRow label="Referensi"><Inp value={c.form.referensi} onChange={e => c.setF("referensi", e.target.value)} placeholder="No. bukti..." /></FieldRow>
              </div>
            )}

            <button onClick={c.save} disabled={c.saving}
              className="w-full mt-5 bg-amber-500 text-white font-semibold py-3 rounded-2xl
                         active:scale-95 disabled:opacity-50 transition">
              {c.saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </>
      )}

      <DelSheet
        target={c.del}
        label={
          tab === "jurnal"   ? (c.del?.keterangan || c.del?.nomorJurnal)  :
          tab === "hutang"   ? (c.del?.vendor || c.del?.nomorDokumen)     :
          tab === "piutang"  ? (c.del?.pelanggan || c.del?.nomorFaktur)   :
          tab === "anggaran" ? (c.del?.departemen || c.del?.periode)      :
                               (c.del?.keterangan || c.del?.tanggal)
        }
        onConfirm={c.confirmDel}
        onClose={() => c.setDel(null)}
      />
    </div>
  );
}

function ItemCard({ children, onEdit, onDel }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex gap-2">
      <div className="flex-1 min-w-0">{children}</div>
      <div className="flex flex-col gap-1.5 shrink-0">
        <button onClick={onEdit} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 active:scale-95">
          <Pencil size={14} />
        </button>
        <button onClick={onDel} className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500 active:scale-95">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function Badge({ cls, children }) {
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cls}`}>{children}</span>;
}
