import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Edit2, Trash2, Search, X, ChevronLeft, Wrench, Camera, FileCheck, Download } from "lucide-react";
import {
  getAllAlatKerja, createAlatKerja, updateAlatKerja, removeAlatKerja,
  uploadAlatFoto, uploadSertifKalibrasi, deleteAlatFoto,
} from "../../services/asetService";
import CameraButton from "../../components/CameraButton";

const EMPTY = {
  kodeAlat: "", namaAlat: "", tipeAlat: "", kategori: "", jumlah: "", satuan: "pcs",
  kondisi: "baik", lokasi: "", penanggungJawab: "", tanggalBeli: "",
  tanggalKalibrasi: "", sertifKalibrasiUrl: "", sertifKalibrasiPath: "",
  keterangan: "", fotoUrl: "", fotoPath: "",
};

const KONDISI_STYLE = {
  baik:      { badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  perbaikan: { badge: "bg-amber-100 text-amber-700",    dot: "bg-amber-500"   },
  rusak:     { badge: "bg-red-100 text-red-700",        dot: "bg-red-500"     },
  hilang:    { badge: "bg-slate-100 text-slate-500",    dot: "bg-slate-400"   },
};

const inp = "w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white";
const Label = ({ children }) => <label className="text-xs font-medium text-slate-600 mb-1 block">{children}</label>;

function ToastBanner({ msg, type }) {
  if (!msg) return null;
  return (
    <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[80] px-4 py-2 rounded-xl text-sm font-medium shadow-lg
      ${type === "error" ? "bg-red-600 text-white" : "bg-slate-800 text-white"}`}>
      {msg}
    </div>
  );
}

async function downloadFile(url, filename) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch { /* silent */ }
}

function autoKode(nama, existingItems) {
  if (!nama.trim()) return "";
  const prefix = nama.trim().split(/\s+/).map(w => w[0]?.toUpperCase() || "").join("").slice(0, 3);
  const num = String(existingItems.length + 1).padStart(3, "0");
  return `${prefix}-${num}`;
}

export default function MobileAlatKerja() {
  const navigate = useNavigate();
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [sheet, setSheet]     = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState(EMPTY);
  const [saving, setSaving]   = useState(false);

  const [fotoPreview, setFotoPreview]     = useState("");
  const [fotoFile, setFotoFile]           = useState(null);
  const [sertifPreview, setSertifPreview] = useState("");
  const [sertifFile, setSertifFile]       = useState(null);

  const [toast, setToast] = useState({ msg: "", type: "" });

  const show = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "" }), 2500);
  };

  const load = async () => {
    setLoading(true);
    try { setItems(await getAllAlatKerja()); }
    catch { show("Gagal memuat data", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null); setForm(EMPTY);
    setFotoPreview(""); setFotoFile(null);
    setSertifPreview(""); setSertifFile(null);
    setSheet(true);
  };
  const openEdit = (item) => {
    setEditing(item); setForm({ ...item });
    setFotoPreview(item.fotoUrl || ""); setFotoFile(null);
    setSertifPreview(item.sertifKalibrasiUrl || ""); setSertifFile(null);
    setSheet(true);
  };
  const closeSheet = () => {
    setSheet(false);
    setFotoFile(null); setFotoPreview("");
    setSertifFile(null); setSertifPreview("");
  };

  const set     = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setNama = (nama) => setForm(f => ({
    ...f, namaAlat: nama,
    kodeAlat: editing ? f.kodeAlat : autoKode(nama, items),
  }));

  const handleFoto   = (e) => { const f = e.target.files?.[0]; if (!f) return; setFotoFile(f); setFotoPreview(URL.createObjectURL(f)); };
  const handleSertif = (e) => { const f = e.target.files?.[0]; if (!f) return; setSertifFile(f); setSertifPreview(URL.createObjectURL(f)); };

  const handleSave = async () => {
    if (!form.namaAlat.trim()) { show("Nama alat wajib diisi", "error"); return; }
    setSaving(true);
    try {
      let payload = { ...form };
      const docId = editing?.id || `tmp_${Date.now()}`;

      if (fotoFile) {
        if (editing?.fotoPath) await deleteAlatFoto(editing.fotoPath);
        const { url, path } = await uploadAlatFoto(fotoFile, docId);
        payload = { ...payload, fotoUrl: url, fotoPath: path };
      } else if (!fotoPreview && editing?.fotoPath) {
        await deleteAlatFoto(editing.fotoPath);
        payload = { ...payload, fotoUrl: "", fotoPath: "" };
      }

      if (sertifFile) {
        if (editing?.sertifKalibrasiPath) await deleteAlatFoto(editing.sertifKalibrasiPath);
        const { url, path } = await uploadSertifKalibrasi(sertifFile, docId);
        payload = { ...payload, sertifKalibrasiUrl: url, sertifKalibrasiPath: path };
      } else if (!sertifPreview && editing?.sertifKalibrasiPath) {
        await deleteAlatFoto(editing.sertifKalibrasiPath);
        payload = { ...payload, sertifKalibrasiUrl: "", sertifKalibrasiPath: "" };
      }

      if (editing?.id) await updateAlatKerja(editing.id, payload);
      else await createAlatKerja(payload);
      show("Tersimpan"); closeSheet(); load();
    } catch { show("Gagal menyimpan", "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Hapus alat "${item.namaAlat}"?`)) return;
    try {
      if (item.fotoPath) await deleteAlatFoto(item.fotoPath);
      if (item.sertifKalibrasiPath) await deleteAlatFoto(item.sertifKalibrasiPath);
      await removeAlatKerja(item.id); show("Terhapus"); load();
    } catch { show("Gagal menghapus", "error"); }
  };

  const filtered = search
    ? items.filter(i =>
        (i.namaAlat || "").toLowerCase().includes(search.toLowerCase()) ||
        (i.kodeAlat || "").toLowerCase().includes(search.toLowerCase()) ||
        (i.tipeAlat || "").toLowerCase().includes(search.toLowerCase()) ||
        (i.kategori || "").toLowerCase().includes(search.toLowerCase())
      )
    : items;

  const countBaik  = items.filter(i => i.kondisi === "baik").length;
  const countPerlu = items.filter(i => i.kondisi === "perbaikan" || i.kondisi === "rusak").length;

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <ToastBanner {...toast} />

      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 pt-4 pb-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-slate-800">Alat Kerja</h1>
          <p className="text-xs text-slate-400">{items.length} alat terdaftar</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 text-white text-sm font-medium rounded-xl active:scale-95 transition-transform">
          <Plus className="w-4 h-4" /> Tambah
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-2xl p-3 border border-slate-100 text-center">
            <div className="text-xl font-bold text-slate-800">{items.length}</div>
            <div className="text-xs text-slate-400">Total</div>
          </div>
          <div className="bg-emerald-50 rounded-2xl p-3 border border-emerald-100 text-center">
            <div className="text-xl font-bold text-emerald-700">{countBaik}</div>
            <div className="text-xs text-emerald-600">Baik</div>
          </div>
          <div className="bg-amber-50 rounded-2xl p-3 border border-amber-100 text-center">
            <div className="text-xl font-bold text-amber-700">{countPerlu}</div>
            <div className="text-xs text-amber-600">Perlu Servis</div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama, kode, atau tipe alat..."
            className="w-full pl-9 pr-8 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-slate-400">Memuat...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Wrench className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">{search ? "Tidak ada alat yang cocok" : "Belum ada alat terdaftar"}</p>
            {!search && <button onClick={openAdd} className="mt-3 px-4 py-2 bg-amber-500 text-white text-sm rounded-xl">Tambah Alat</button>}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(item => {
              const st = KONDISI_STYLE[item.kondisi] || KONDISI_STYLE.baik;
              return (
                <div key={item.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  {item.fotoUrl && (
                    <div className="relative">
                      <img src={item.fotoUrl} alt={item.namaAlat} className="w-full h-32 object-cover" />
                      <button
                        onClick={() => downloadFile(item.fotoUrl, `foto_${item.kodeAlat || item.namaAlat}.jpg`)}
                        className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-xl active:scale-95 transition-transform"
                        title="Unduh foto"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <div className="p-4 flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${st.dot}`} />
                        <p className="font-semibold text-slate-800 text-sm truncate">{item.namaAlat}</p>
                      </div>
                      {item.kodeAlat && <p className="text-xs font-mono text-slate-400 mb-1.5">{item.kodeAlat}</p>}
                      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                        {item.tipeAlat && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg">{item.tipeAlat}</span>}
                        {item.kategori && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">{item.kategori}</span>}
                        <span className={`text-xs px-2 py-0.5 rounded-lg font-medium capitalize ${st.badge}`}>{item.kondisi}</span>
                        {item.jumlah && <span className="text-xs text-slate-500">{item.jumlah} {item.satuan}</span>}
                      </div>
                      {(item.lokasi || item.penanggungJawab) && (
                        <p className="text-xs text-slate-400">{[item.lokasi, item.penanggungJawab].filter(Boolean).join(" · ")}</p>
                      )}
                      {item.tanggalKalibrasi && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <FileCheck className="w-3 h-3 text-blue-500 shrink-0" />
                          <span className="text-xs text-blue-600">Kalibrasi: {item.tanggalKalibrasi}</span>
                          {item.sertifKalibrasiUrl && (
                            <>
                              <a href={item.sertifKalibrasiUrl} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-blue-500 underline">lihat</a>
                              <button
                                onClick={() => downloadFile(item.sertifKalibrasiUrl, `sertif_${item.kodeAlat || item.namaAlat}.jpg`)}
                                className="text-slate-400 active:text-blue-600"
                                title="Unduh sertifikat"
                              >
                                <Download className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => openEdit(item)} className="p-2 rounded-xl bg-amber-50 text-amber-600 active:scale-95 transition-transform">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(item)} className="p-2 rounded-xl bg-red-50 text-red-500 active:scale-95 transition-transform">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom sheet */}
      {sheet && (
        <div className="fixed inset-0 z-[70] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={closeSheet} />
          <div className="relative bg-white rounded-t-3xl max-h-[92vh] flex flex-col z-[71]">

            {/* Header */}
            <div className="shrink-0 px-4 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-800">{editing?.id ? "Edit Alat" : "Tambah Alat Kerja"}</h2>
              <button onClick={closeSheet} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body — scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">

              {/* Foto alat */}
              <div>
                <Label>Foto Alat</Label>
                {fotoPreview ? (
                  <div className="relative rounded-2xl overflow-hidden">
                    <img src={fotoPreview} alt="preview" className="w-full h-40 object-cover" />
                    <button onClick={() => { setFotoFile(null); setFotoPreview(""); setForm(f => ({ ...f, fotoUrl: "", fotoPath: "" })); }}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-xl"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <CameraButton onChange={handleFoto} className="block w-full">
                    <div className="w-full h-24 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 bg-slate-50 cursor-pointer">
                      <Camera className="w-6 h-6" />
                      <span className="text-xs">Ambil / pilih foto alat</span>
                    </div>
                  </CameraButton>
                )}
              </div>

              {/* Nama & Kode */}
              <div>
                <Label>Nama Alat *</Label>
                <input value={form.namaAlat} onChange={e => setNama(e.target.value)} placeholder="Tang Kombinasi" className={inp} />
              </div>
              <div>
                <Label>Kode Alat <span className="text-slate-400 font-normal">(otomatis)</span></Label>
                <input value={form.kodeAlat} onChange={e => set("kodeAlat", e.target.value)}
                  placeholder="Otomatis dari nama"
                  className={`${inp} ${!editing ? "bg-slate-50 text-slate-500" : ""}`} />
              </div>

              {/* Tipe & Kategori */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipe Alat</Label>
                  <input value={form.tipeAlat} onChange={e => set("tipeAlat", e.target.value)}
                    placeholder="Digital / Analog" className={inp} />
                </div>
                <div>
                  <Label>Kategori</Label>
                  <input value={form.kategori} onChange={e => set("kategori", e.target.value)}
                    placeholder="Listrik / Ukur" className={inp} />
                </div>
              </div>

              {/* Jumlah & Satuan */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Jumlah</Label>
                  <input type="number" value={form.jumlah} onChange={e => set("jumlah", e.target.value)} placeholder="1" className={inp} />
                </div>
                <div>
                  <Label>Satuan</Label>
                  <select value={form.satuan} onChange={e => set("satuan", e.target.value)} className={inp}>
                    <option value="pcs">pcs</option>
                    <option value="unit">unit</option>
                    <option value="set">set</option>
                    <option value="buah">buah</option>
                    <option value="pasang">pasang</option>
                  </select>
                </div>
              </div>

              {/* Kondisi */}
              <div>
                <Label>Kondisi</Label>
                <div className="grid grid-cols-4 gap-2">
                  {["baik", "perbaikan", "rusak", "hilang"].map(k => (
                    <button key={k} type="button" onClick={() => set("kondisi", k)}
                      className={`py-2 rounded-xl text-xs font-medium capitalize border transition-colors
                        ${form.kondisi === k ? "bg-amber-500 text-white border-amber-500" : "bg-slate-50 text-slate-600 border-slate-200"}`}>
                      {k}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lokasi & PIC */}
              <div>
                <Label>Lokasi Penyimpanan</Label>
                <input value={form.lokasi} onChange={e => set("lokasi", e.target.value)} placeholder="Gudang A / Mobil Operasional" className={inp} />
              </div>
              <div>
                <Label>Penanggung Jawab</Label>
                <input value={form.penanggungJawab} onChange={e => set("penanggungJawab", e.target.value)} placeholder="Nama teknisi" className={inp} />
              </div>
              <div>
                <Label>Tanggal Beli</Label>
                <input type="date" value={form.tanggalBeli} onChange={e => set("tanggalBeli", e.target.value)} className={inp} />
              </div>

              {/* Kalibrasi section */}
              <div className="border border-blue-100 rounded-2xl p-3 bg-blue-50/40 space-y-3">
                <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5" /> Kalibrasi
                </p>
                <div>
                  <Label>Tanggal Kalibrasi</Label>
                  <input type="date" value={form.tanggalKalibrasi} onChange={e => set("tanggalKalibrasi", e.target.value)} className={inp} />
                </div>
                <div>
                  <Label>Foto Sertifikat Kalibrasi</Label>
                  {sertifPreview ? (
                    <div className="relative rounded-xl overflow-hidden">
                      <img src={sertifPreview} alt="sertif" className="w-full h-32 object-cover" />
                      <button onClick={() => { setSertifFile(null); setSertifPreview(""); setForm(f => ({ ...f, sertifKalibrasiUrl: "", sertifKalibrasiPath: "" })); }}
                        className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-xl"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <CameraButton onChange={handleSertif} className="block w-full">
                      <div className="w-full h-20 border-2 border-dashed border-blue-200 rounded-xl flex flex-col items-center justify-center gap-1.5 text-blue-400 bg-white cursor-pointer">
                        <FileCheck className="w-5 h-5" />
                        <span className="text-xs">Ambil / pilih foto sertifikat</span>
                      </div>
                    </CameraButton>
                  )}
                </div>
              </div>

              {/* Keterangan */}
              <div>
                <Label>Keterangan</Label>
                <textarea value={form.keterangan} onChange={e => set("keterangan", e.target.value)}
                  placeholder="Merk, spesifikasi, atau catatan..." rows={2}
                  className={`${inp} resize-none`} />
              </div>
            </div>

            {/* Footer — sticky save button di atas nav */}
            <div className="shrink-0 px-4 pt-3 border-t border-slate-100 bg-white"
              style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px) + 12px, 16px)" }}>
              <button onClick={handleSave} disabled={saving}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-2xl transition-colors disabled:opacity-50 active:scale-[0.98]">
                {saving ? "Menyimpan..." : editing?.id ? "Perbarui Alat" : "Simpan Alat"}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
