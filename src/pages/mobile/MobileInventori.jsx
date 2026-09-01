import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import {
  getAllStok,       createStok,       updateStok,       removeStok,
  getAllPergerakan, createPergerakan, updatePergerakan, removePergerakan,
  getAllGudang,     createGudang,     updateGudang,     removeGudang,
  formatRupiah,    uploadBarangPhoto, deleteBarangPhoto,
} from "../../services/inventoriService";
import { useSecurePhotoUrls } from "../../hooks/useSecurePhotoUrls";
import {
  ArrowLeft, Plus, Pencil, Trash2, X, ArrowDownLeft, ArrowUpRight,
  Search, Camera, ImageIcon, Wrench, ShoppingBag, CheckCircle, AlertCircle,
} from "lucide-react";
import OfflineBanner from "../../offline/OfflineBanner";
import CameraButton from "../../components/CameraButton";

/* ── tabs ── */
const TABS = [
  { key: "stok",       label: "Stok"        },
  { key: "pergerakan", label: "Pergerakan"  },
  { key: "gudang",     label: "Gudang"      },
];

/* ── categories ── */
const KATEGORI_ALAT   = ["Alat Ukur","Alat Keselamatan","Alat Listrik","Alat Mekanik","Perkakas","Kendaraan","Lainnya"];
const KATEGORI_BARANG = ["Kabel Listrik","Komponen Listrik","Material","Spare Part","Perlengkapan","Bahan Habis Pakai","Lainnya"];

/* ── empty forms ── */
const EMPTY_STOK = {
  kodeProduk:"", namaProduk:"", tipeItem:"barang", kategori:"", satuan:"pcs",
  stokAwal:"0", stokAkhir:"0", hargaBeli:"", hargaJual:"",
  gudangId:"", gudangNama:"", status:"aktif", fotoUrl:"", fotoPath:"",
};
const EMPTY_PERGERAKAN = {
  tanggal:"", produkNama:"", kodeProduk:"", tipe:"masuk",
  jumlah:"", keterangan:"", referensi:"",
};
const EMPTY_GUDANG = {
  kodeGudang:"", namaGudang:"", lokasi:"", kapasitas:"", keterangan:"", status:"aktif",
};

const SATUAN_LIST   = ["pcs","meter","roll","unit","kg","box","ltr","set","pack","btg","rol"];
const STATUS_STOK   = { aktif:"bg-emerald-100 text-emerald-700", nonaktif:"bg-slate-100 text-slate-500" };
const STATUS_GUDANG = { aktif:"bg-emerald-100 text-emerald-700", nonaktif:"bg-slate-100 text-slate-500" };
const TIPE_BADGE    = { alat:"bg-blue-100 text-blue-700", barang:"bg-amber-100 text-amber-700" };

/* ── shared helpers ── */
const inp = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400";
function FR({ label, children }) {
  return <div><label className="text-xs text-slate-500 mb-1 block">{label}</label>{children}</div>;
}
function In({ value, onChange, type = "text", placeholder = "" }) {
  return <input type={type} value={value} onChange={onChange} placeholder={placeholder} className={inp} />;
}
function Se({ value, onChange, children }) {
  return <select value={value} onChange={onChange} className={inp}>{children}</select>;
}

function useTabCrud(getFn, createFn, updateFn, removeFn, callbacks = {}) {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [sheet,   setSheet]   = useState(null);
  const [form,    setForm]    = useState({});
  const [saving,  setSaving]  = useState(false);
  const [del,     setDel]     = useState(null);

  const load = async () => {
    setLoading(true);
    try { setItems(await getFn()); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openAdd  = (empty) => { setForm({ ...empty }); setSheet("add"); };
  const openEdit = (item)  => { setForm({ ...item  }); setSheet(item); };
  const setF     = (k, v)  => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      if (sheet === "add") await createFn(form);
      else await updateFn(sheet.id, form);
      setSheet(null);
      await load();
      callbacks.onSuccess?.();
    } catch (e) {
      console.error(e);
      callbacks.onError?.();
    } finally { setSaving(false); }
  };

  const confirmDel = async () => {
    if (!del) return;
    try {
      await removeFn(del.id);
      setDel(null);
      await load();
      callbacks.onDelete?.();
    } catch {
      callbacks.onError?.();
    }
  };

  return { items, loading, sheet, form, saving, del,
           openAdd, openEdit, setF, save, setSheet, setDel, confirmDel, load };
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

function SheetHandle() {
  return <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />;
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

function MobileToast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`fixed bottom-24 left-4 right-4 z-[120] py-3 px-4 rounded-2xl text-sm font-semibold text-white shadow-xl flex items-center gap-2 transition-all
      ${toast.type === "error" ? "bg-red-500" : "bg-emerald-500"}`}>
      {toast.type === "error"
        ? <AlertCircle size={16} className="shrink-0" />
        : <CheckCircle size={16} className="shrink-0" />}
      {toast.msg}
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
export default function MobileInventori() {
  const { role } = useContext(AuthContext);
  const navigate = useNavigate();
  const [tab,    setTab]    = useState("stok");
  const [search, setSearch] = useState("");
  const [toast,  setToast]  = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const canAccess = ["admin", "superadmin", "finance"].includes(role);

  const stok = useTabCrud(getAllStok, createStok, updateStok, removeStok);
  const pergerakan = useTabCrud(
    getAllPergerakan, createPergerakan, updatePergerakan, removePergerakan,
    {
      onSuccess: () => showToast("Pergerakan berhasil disimpan"),
      onDelete:  () => showToast("Data berhasil dihapus"),
      onError:   () => showToast("Gagal menyimpan", "error"),
    }
  );
  const gudang = useTabCrud(
    getAllGudang, createGudang, updateGudang, removeGudang,
    {
      onSuccess: () => showToast("Gudang berhasil disimpan"),
      onDelete:  () => showToast("Gudang berhasil dihapus"),
      onError:   () => showToast("Gagal menyimpan", "error"),
    }
  );

  /* foto state untuk tab stok */
  const [fotoFile,    setFotoFile]    = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [savingStok,  setSavingStok]  = useState(false);

  const handleFotoCapture = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoPreview(URL.createObjectURL(file));
    setFotoFile(file);
  };

  const clearFoto = () => {
    setFotoFile(null);
    setFotoPreview(null);
    stok.setF("fotoUrl", "");
    stok.setF("fotoPath", "");
  };

  const handleSaveStok = async () => {
    if (!stok.form.namaProduk?.trim()) {
      showToast("Nama produk wajib diisi", "error");
      return;
    }
    setSavingStok(true);
    const isEdit = stok.sheet !== "add";
    try {
      const data = { ...stok.form };

      if (fotoFile) {
        const existing = isEdit ? stok.sheet.fotoPath : null;
        if (existing) await deleteBarangPhoto(existing);

        if (isEdit) {
          const { url, path } = await uploadBarangPhoto(fotoFile, stok.sheet.id);
          await updateStok(stok.sheet.id, { ...data, fotoUrl: url, fotoPath: path });
        } else {
          const docRef = await createStok(data);
          const { url, path } = await uploadBarangPhoto(fotoFile, docRef.id);
          await updateStok(docRef.id, { fotoUrl: url, fotoPath: path });
        }
      } else {
        if (isEdit) await updateStok(stok.sheet.id, data);
        else await createStok(data);
      }

      stok.setSheet(null);
      setFotoFile(null);
      setFotoPreview(null);
      await stok.load();
      showToast(isEdit ? "Barang berhasil diperbarui" : "Barang berhasil ditambahkan");
    } catch (e) {
      console.error(e);
      showToast("Gagal menyimpan, coba lagi", "error");
    } finally {
      setSavingStok(false);
    }
  };

  const openStokAdd = () => {
    setFotoFile(null);
    setFotoPreview(null);
    stok.openAdd(EMPTY_STOK);
  };

  const openStokEdit = (item) => {
    setFotoFile(null);
    setFotoPreview(item.fotoUrl || null);
    stok.openEdit(item);
  };

  const crud    = { stok, pergerakan, gudang };
  const c       = crud[tab];
  const emptyFor = tab === "stok" ? EMPTY_STOK : tab === "pergerakan" ? EMPTY_PERGERAKAN : EMPTY_GUDANG;

  if (!canAccess) {
    return (
      <div className="p-6 text-center text-slate-400">
        <p className="font-medium">Akses ditolak</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-amber-600 text-sm font-medium">Kembali</button>
      </div>
    );
  }

  const filteredStok = stok.items.filter(i =>
    !search ||
    i.namaProduk?.toLowerCase().includes(search.toLowerCase()) ||
    i.kodeProduk?.toLowerCase().includes(search.toLowerCase())
  );
  const photoUrls = useSecurePhotoUrls(stok.items.map(i => i.fotoPath));
  const totalNilaiStok = stok.items.reduce(
    (s, i) => s + (Number(i.stokAkhir) || 0) * (Number(i.hargaBeli) || 0), 0
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <MobileToast toast={toast} />
      <OfflineBanner />

      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10 pt-safe">
        <button onClick={() => navigate(-1)} className="text-slate-500"><ArrowLeft size={20} /></button>
        <h1 className="flex-1 font-bold text-slate-800">Inventori &amp; Gudang</h1>
        <button
          onClick={() => tab === "stok" ? openStokAdd() : c.openAdd(emptyFor)}
          className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center text-white active:scale-95">
          <Plus size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-100 px-4">
        <div className="flex gap-1 py-2">
          {TABS.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setSearch(""); }}
              className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition
                ${tab === t.key ? "bg-amber-500 text-white" : "text-slate-500 hover:bg-slate-100"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 pb-8 space-y-2">

        {/* ── STOK BARANG ── */}
        {tab === "stok" && (
          <>
            <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm flex items-center justify-between mb-1">
              <div>
                <p className="text-xs text-slate-400">Nilai Stok</p>
                <p className="text-sm font-bold text-slate-800">{formatRupiah(totalNilaiStok)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Jenis</p>
                <p className="text-sm font-bold text-slate-800">{stok.items.length}</p>
              </div>
            </div>
            <div className="relative mb-2">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Cari nama / kode..."
                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white
                           focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            {stok.loading && <p className="text-center text-slate-400 py-10 text-sm">Memuat...</p>}
            {!stok.loading && filteredStok.length === 0 && (
              <p className="text-center text-slate-400 py-12 text-sm">{search ? "Tidak ditemukan." : "Belum ada barang."}</p>
            )}
            {filteredStok.map(item => (
              <ItemCard key={item.id} onEdit={() => openStokEdit(item)} onDel={() => stok.setDel(item)}>
                <div className="flex gap-3">
                  <div className="shrink-0">
                    {(photoUrls[item.fotoPath] || item.fotoUrl) ? (
                      <img src={photoUrls[item.fotoPath] || item.fotoUrl} alt={item.namaProduk}
                        className="w-14 h-14 rounded-xl object-cover border border-slate-200" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center">
                        {item.tipeItem === "alat"
                          ? <Wrench size={20} className="text-blue-300" />
                          : <ShoppingBag size={20} className="text-amber-300" />}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      {item.kodeProduk && <span className="font-mono text-[10px] text-slate-400">{item.kodeProduk}</span>}
                      <Badge cls={TIPE_BADGE[item.tipeItem] || TIPE_BADGE.barang}>
                        {item.tipeItem === "alat" ? "Alat" : "Barang"}
                      </Badge>
                      <Badge cls={STATUS_STOK[item.status] || STATUS_STOK.aktif}>{item.status}</Badge>
                    </div>
                    <p className="text-sm font-semibold text-slate-800 truncate">{item.namaProduk || "—"}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {item.kategori}{(item.gudangNama || item.gudang) ? ` · ${item.gudangNama || item.gudang}` : ""}
                    </p>
                    <div className="flex gap-3 mt-1 flex-wrap">
                      <span className={`text-sm font-bold
                        ${Number(item.stokAkhir) <= 0 ? "text-red-600" : Number(item.stokAkhir) < 10 ? "text-amber-600" : "text-emerald-600"}`}>
                        {item.stokAkhir ?? 0} {item.satuan}
                      </span>
                      {item.hargaBeli > 0 && <span className="text-xs text-slate-400">{formatRupiah(item.hargaBeli)}/beli</span>}
                      {item.tipeItem !== "alat" && item.hargaJual > 0 && (
                        <span className="text-xs text-emerald-600 font-medium">{formatRupiah(item.hargaJual)}/jual</span>
                      )}
                    </div>
                  </div>
                </div>
              </ItemCard>
            ))}
          </>
        )}

        {/* ── PERGERAKAN STOK ── */}
        {tab === "pergerakan" && (
          <>
            {!pergerakan.loading && (
              <div className="grid grid-cols-2 gap-2 mb-1">
                <div className="bg-emerald-50 rounded-2xl p-3 flex items-center gap-2">
                  <ArrowDownLeft size={18} className="text-emerald-600" />
                  <div>
                    <p className="text-[10px] text-emerald-600">Total Masuk</p>
                    <p className="text-sm font-bold text-emerald-700">
                      {pergerakan.items.filter(i => i.tipe === "masuk").reduce((s, i) => s + (Number(i.jumlah) || 0), 0)}
                    </p>
                  </div>
                </div>
                <div className="bg-red-50 rounded-2xl p-3 flex items-center gap-2">
                  <ArrowUpRight size={18} className="text-red-500" />
                  <div>
                    <p className="text-[10px] text-red-500">Total Keluar</p>
                    <p className="text-sm font-bold text-red-600">
                      {pergerakan.items.filter(i => i.tipe === "keluar").reduce((s, i) => s + (Number(i.jumlah) || 0), 0)}
                    </p>
                  </div>
                </div>
              </div>
            )}
            {pergerakan.loading && <p className="text-center text-slate-400 py-10 text-sm">Memuat...</p>}
            {!pergerakan.loading && pergerakan.items.length === 0 && (
              <p className="text-center text-slate-400 py-12 text-sm">Belum ada pergerakan stok.</p>
            )}
            {pergerakan.items.map(item => (
              <ItemCard key={item.id} onEdit={() => pergerakan.openEdit(item)} onDel={() => pergerakan.setDel(item)}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium
                    ${item.tipe === "masuk" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                    {item.tipe === "masuk" ? <ArrowDownLeft size={10} /> : <ArrowUpRight size={10} />}
                    {item.tipe === "masuk" ? "Masuk" : "Keluar"}
                  </span>
                  <span className="text-xs text-slate-400">{item.tanggal}</span>
                </div>
                <p className="text-sm font-semibold text-slate-800">{item.produkNama || "—"}</p>
                {item.kodeProduk && <p className="text-xs text-slate-400">{item.kodeProduk}</p>}
                <div className="flex gap-3 mt-1">
                  <span className="text-sm font-bold text-slate-700">Qty: {item.jumlah || 0}</span>
                  {item.referensi && <span className="text-xs text-slate-400">{item.referensi}</span>}
                </div>
              </ItemCard>
            ))}
          </>
        )}

        {/* ── GUDANG ── */}
        {tab === "gudang" && (
          <>
            {gudang.loading && <p className="text-center text-slate-400 py-10 text-sm">Memuat...</p>}
            {!gudang.loading && gudang.items.length === 0 && (
              <p className="text-center text-slate-400 py-12 text-sm">Belum ada gudang.</p>
            )}
            {gudang.items.map(item => (
              <ItemCard key={item.id} onEdit={() => gudang.openEdit(item)} onDel={() => gudang.setDel(item)}>
                <div className="flex items-center gap-2 mb-1">
                  {item.kodeGudang && <span className="font-mono text-[10px] text-slate-400">{item.kodeGudang}</span>}
                  <Badge cls={STATUS_GUDANG[item.status] || STATUS_GUDANG.aktif}>{item.status}</Badge>
                </div>
                <p className="text-sm font-semibold text-slate-800">{item.namaGudang || "—"}</p>
                {item.lokasi && <p className="text-xs text-slate-400">{item.lokasi}</p>}
                {item.kapasitas && <p className="text-xs text-slate-500 mt-0.5">Kapasitas: {item.kapasitas}</p>}
              </ItemCard>
            ))}
          </>
        )}
      </div>

      {/* ── BOTTOM SHEET FORM ── */}
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

            {/* ══ STOK FORM ══ */}
            {tab === "stok" && (
              <div className="space-y-3">

                {/* Tipe Item toggle */}
                <FR label="Tipe Item *">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { c.setF("tipeItem", "barang"); c.setF("kategori", ""); }}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 flex items-center justify-center gap-1.5 transition
                        ${c.form.tipeItem !== "alat"
                          ? "bg-amber-500 text-white border-amber-500"
                          : "bg-white text-slate-500 border-slate-200"}`}
                    >
                      <ShoppingBag size={15} /> Barang
                    </button>
                    <button
                      type="button"
                      onClick={() => { c.setF("tipeItem", "alat"); c.setF("kategori", ""); }}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 flex items-center justify-center gap-1.5 transition
                        ${c.form.tipeItem === "alat"
                          ? "bg-blue-500 text-white border-blue-500"
                          : "bg-white text-slate-500 border-slate-200"}`}
                    >
                      <Wrench size={15} /> Alat
                    </button>
                  </div>
                  {c.form.tipeItem === "alat" && (
                    <p className="text-[10px] text-blue-500 mt-1.5 flex items-center gap-1">
                      <Wrench size={10} /> Alat tidak dijual — kolom harga jual disembunyikan
                    </p>
                  )}
                </FR>

                {/* Foto */}
                <FR label="Foto">
                  <div className="flex items-center gap-3">
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0 flex items-center justify-center">
                      {fotoPreview ? (
                        <>
                          <img src={fotoPreview} alt="foto" className="w-full h-full object-cover" />
                          <button type="button" onClick={clearFoto}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center">
                            <X size={10} />
                          </button>
                        </>
                      ) : (
                        <ImageIcon size={24} className="text-slate-300" />
                      )}
                    </div>
                    <CameraButton
                      onChange={handleFotoCapture}
                      captureEnv
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 text-amber-700 text-sm font-medium active:scale-95 transition cursor-pointer"
                    >
                      <Camera size={18} />
                      {fotoPreview ? "Ganti Foto" : "Ambil / Pilih Foto"}
                    </CameraButton>
                  </div>
                </FR>

                <div className="grid grid-cols-2 gap-3">
                  <FR label="Kode Produk">
                    <In value={c.form.kodeProduk} onChange={e => c.setF("kodeProduk", e.target.value)} placeholder="PRD-001" />
                  </FR>
                  <FR label="Satuan">
                    <Se value={c.form.satuan} onChange={e => c.setF("satuan", e.target.value)}>
                      {SATUAN_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                    </Se>
                  </FR>
                </div>

                <FR label={`Nama ${c.form.tipeItem === "alat" ? "Alat" : "Barang"} *`}>
                  <In
                    value={c.form.namaProduk}
                    onChange={e => c.setF("namaProduk", e.target.value)}
                    placeholder={c.form.tipeItem === "alat" ? "Tang Crimping, Multimeter..." : "Kabel NYY 4x10mm..."}
                  />
                </FR>

                <FR label="Kategori">
                  <Se value={c.form.kategori} onChange={e => c.setF("kategori", e.target.value)}>
                    <option value="">— Pilih Kategori —</option>
                    {(c.form.tipeItem === "alat" ? KATEGORI_ALAT : KATEGORI_BARANG).map(k => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </Se>
                </FR>

                <div className="grid grid-cols-2 gap-3">
                  <FR label="Stok Awal">
                    <In type="number" value={c.form.stokAwal} onChange={e => c.setF("stokAwal", e.target.value)} placeholder="0" />
                  </FR>
                  <FR label="Stok Akhir">
                    <In type="number" value={c.form.stokAkhir} onChange={e => c.setF("stokAkhir", e.target.value)} placeholder="0" />
                  </FR>
                </div>

                {/* Harga — alat hanya harga beli, barang keduanya */}
                <div className={`grid gap-3 ${c.form.tipeItem !== "alat" ? "grid-cols-2" : "grid-cols-1"}`}>
                  <FR label="Harga Beli">
                    <In type="number" value={c.form.hargaBeli} onChange={e => c.setF("hargaBeli", e.target.value)} placeholder="0" />
                  </FR>
                  {c.form.tipeItem !== "alat" && (
                    <FR label="Harga Jual">
                      <In type="number" value={c.form.hargaJual} onChange={e => c.setF("hargaJual", e.target.value)} placeholder="0" />
                    </FR>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FR label="Gudang">
                    <Se
                      value={c.form.gudangId}
                      onChange={e => {
                        const id = e.target.value;
                        const g  = gudang.items.find(x => x.id === id);
                        c.setF("gudangId", id);
                        c.setF("gudangNama", g?.namaGudang || "");
                      }}
                    >
                      <option value="">— Pilih —</option>
                      {gudang.items.filter(g => g.status === "aktif").map(g => (
                        <option key={g.id} value={g.id}>{g.namaGudang}</option>
                      ))}
                    </Se>
                  </FR>
                  <FR label="Status">
                    <Se value={c.form.status} onChange={e => c.setF("status", e.target.value)}>
                      <option value="aktif">Aktif</option>
                      <option value="nonaktif">Nonaktif</option>
                    </Se>
                  </FR>
                </div>
              </div>
            )}

            {/* ══ PERGERAKAN FORM ══ */}
            {tab === "pergerakan" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <FR label="Tanggal"><In type="date" value={c.form.tanggal} onChange={e => c.setF("tanggal", e.target.value)} /></FR>
                  <FR label="Tipe">
                    <Se value={c.form.tipe} onChange={e => c.setF("tipe", e.target.value)}>
                      <option value="masuk">Barang Masuk</option>
                      <option value="keluar">Barang Keluar</option>
                    </Se>
                  </FR>
                </div>
                <FR label="Nama Produk *"><In value={c.form.produkNama} onChange={e => c.setF("produkNama", e.target.value)} placeholder="Kabel NYY 4x10mm" /></FR>
                <div className="grid grid-cols-2 gap-3">
                  <FR label="Kode Produk"><In value={c.form.kodeProduk} onChange={e => c.setF("kodeProduk", e.target.value)} placeholder="PRD-001" /></FR>
                  <FR label="Jumlah"><In type="number" value={c.form.jumlah} onChange={e => c.setF("jumlah", e.target.value)} placeholder="10" /></FR>
                </div>
                <FR label="Referensi (No. PO/SO)"><In value={c.form.referensi} onChange={e => c.setF("referensi", e.target.value)} placeholder="PO-2026-001" /></FR>
                <FR label="Keterangan"><In value={c.form.keterangan} onChange={e => c.setF("keterangan", e.target.value)} placeholder="Opsional..." /></FR>
              </div>
            )}

            {/* ══ GUDANG FORM ══ */}
            {tab === "gudang" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <FR label="Kode Gudang"><In value={c.form.kodeGudang} onChange={e => c.setF("kodeGudang", e.target.value)} placeholder="GDG-001" /></FR>
                  <FR label="Status">
                    <Se value={c.form.status} onChange={e => c.setF("status", e.target.value)}>
                      <option value="aktif">Aktif</option>
                      <option value="nonaktif">Nonaktif</option>
                    </Se>
                  </FR>
                </div>
                <FR label="Nama Gudang *"><In value={c.form.namaGudang} onChange={e => c.setF("namaGudang", e.target.value)} placeholder="Gudang Utama" /></FR>
                <FR label="Lokasi"><In value={c.form.lokasi} onChange={e => c.setF("lokasi", e.target.value)} placeholder="Jl. Industri No. 1" /></FR>
                <FR label="Kapasitas"><In value={c.form.kapasitas} onChange={e => c.setF("kapasitas", e.target.value)} placeholder="500 m²" /></FR>
                <FR label="Keterangan"><In value={c.form.keterangan} onChange={e => c.setF("keterangan", e.target.value)} placeholder="Opsional..." /></FR>
              </div>
            )}

            <button
              onClick={tab === "stok" ? handleSaveStok : c.save}
              disabled={tab === "stok" ? savingStok : c.saving}
              className="w-full mt-5 bg-amber-500 text-white font-semibold py-3 rounded-2xl
                         active:scale-95 disabled:opacity-50 transition">
              {(tab === "stok" ? savingStok : c.saving) ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </>
      )}

      <DelSheet
        target={c.del}
        label={
          tab === "stok"       ? (c.del?.namaProduk || c.del?.kodeProduk) :
          tab === "pergerakan" ? (c.del?.produkNama || c.del?.tanggal) :
                                 (c.del?.namaGudang || c.del?.kodeGudang)
        }
        onConfirm={c.confirmDel}
        onClose={() => c.setDel(null)}
      />
    </div>
  );
}
