import { useEffect, useRef, useState } from "react";
import { Plus, Edit2, Trash2, Search, X, Camera, FileCheck, Download } from "lucide-react";
import {
  AdminPageHeader, Button, Modal, Field, Input, Select, TextArea, EmptyState, useToast,
} from "../../components/admin/AdminUI";
import {
  getAllAlatKerja, createAlatKerja, updateAlatKerja, removeAlatKerja,
  uploadAlatFoto, uploadSertifKalibrasi, deleteAlatFoto,
} from "../../services/asetService";

const EMPTY = {
  kodeAlat: "", namaAlat: "", tipeAlat: "", kategori: "", jumlah: "", satuan: "pcs",
  kondisi: "baik", lokasi: "", penanggungJawab: "", tanggalBeli: "",
  tanggalKalibrasi: "", sertifKalibrasiUrl: "", sertifKalibrasiPath: "",
  keterangan: "", fotoUrl: "", fotoPath: "",
};

const KONDISI_BADGE = {
  baik:      "bg-emerald-100 text-emerald-700",
  perbaikan: "bg-amber-100 text-amber-700",
  rusak:     "bg-red-100 text-red-700",
  hilang:    "bg-slate-100 text-slate-500",
};

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

export default function AlatKerja() {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [modalOpen, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState(EMPTY);
  const [fotoPreview, setFotoPreview]         = useState("");
  const [fotoFile, setFotoFile]               = useState(null);
  const [sertifPreview, setSertifPreview]     = useState("");
  const [sertifFile, setSertifFile]           = useState(null);
  const fileRef       = useRef(null);
  const sertifRef     = useRef(null);
  const { show, Toast } = useToast();

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
    setModal(true);
  };
  const openEdit = (item) => {
    setEditing(item); setForm({ ...item });
    setFotoPreview(item.fotoUrl || ""); setFotoFile(null);
    setSertifPreview(item.sertifKalibrasiUrl || ""); setSertifFile(null);
    setModal(true);
  };
  const closeModal = () => {
    setModal(false);
    setFotoFile(null); setFotoPreview("");
    setSertifFile(null); setSertifPreview("");
  };

  const set     = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setNama = (nama) => setForm(f => ({
    ...f, namaAlat: nama,
    kodeAlat: editing ? f.kodeAlat : autoKode(nama, items),
  }));

  const handleFoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  };
  const handleSertif = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSertifFile(file);
    setSertifPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!form.namaAlat.trim()) { show("Nama alat wajib diisi", "error"); return; }
    try {
      let payload = { ...form };
      const docId = editing?.id || `tmp_${Date.now()}`;

      // foto alat
      if (fotoFile) {
        if (editing?.fotoPath) await deleteAlatFoto(editing.fotoPath);
        const { url, path } = await uploadAlatFoto(fotoFile, docId);
        payload = { ...payload, fotoUrl: url, fotoPath: path };
      } else if (!fotoPreview && editing?.fotoPath) {
        await deleteAlatFoto(editing.fotoPath);
        payload = { ...payload, fotoUrl: "", fotoPath: "" };
      }

      // sertifikat kalibrasi
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
      show("Tersimpan"); closeModal(); load();
    } catch { show("Gagal menyimpan", "error"); }
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

  const countBaik      = items.filter(i => i.kondisi === "baik").length;
  const countPerbaikan = items.filter(i => i.kondisi === "perbaikan").length;
  const countRusak     = items.filter(i => i.kondisi === "rusak").length;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <Toast />
      <AdminPageHeader
        title="Alat Kerja"
        description="Kelola inventaris alat kerja lapangan dan bengkel."
        actions={<Button onClick={openAdd}><Plus className="w-4 h-4" /> Tambah Alat</Button>}
      />

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-slate-50 rounded-xl p-4">
          <div className="text-2xl font-bold text-slate-800">{items.length}</div>
          <div className="text-sm text-slate-500">Total Alat</div>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4">
          <div className="text-2xl font-bold text-emerald-700">{countBaik}</div>
          <div className="text-sm text-emerald-600">Kondisi Baik</div>
        </div>
        <div className="bg-amber-50 rounded-xl p-4">
          <div className="text-2xl font-bold text-amber-700">{countPerbaikan}</div>
          <div className="text-sm text-amber-600">Dalam Perbaikan</div>
        </div>
        <div className="bg-red-50 rounded-xl p-4">
          <div className="text-2xl font-bold text-red-700">{countRusak}</div>
          <div className="text-sm text-red-600">Rusak</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama, kode, tipe, atau kategori..."
          className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Memuat...</div>
      ) : !items.length ? (
        <EmptyState
          title="Belum ada alat kerja terdaftar"
          description="Daftarkan alat kerja lapangan untuk memudahkan pengelolaan dan maintenance."
          action={<Button onClick={openAdd}><Plus className="w-4 h-4" /> Tambah Alat</Button>}
        />
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-12 text-center">
          <p className="text-slate-400 text-sm">Tidak ada alat yang cocok dengan pencarian</p>
          <button onClick={() => setSearch("")} className="mt-2 text-amber-500 text-sm hover:underline">Hapus filter</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 w-24">Kode</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Nama Alat</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Tipe</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Kategori</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Jumlah</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Lokasi</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Kalibrasi</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Kondisi</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{item.kodeAlat || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {item.fotoUrl ? (
                          <div className="relative group shrink-0">
                            <img src={item.fotoUrl} alt="" className="w-8 h-8 rounded-lg object-cover border border-slate-200" />
                            <button
                              onClick={() => downloadFile(item.fotoUrl, `foto_${item.kodeAlat || item.namaAlat}.jpg`)}
                              title="Unduh foto"
                              className="absolute inset-0 rounded-lg bg-black/50 text-white items-center justify-center hidden group-hover:flex"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0"><Camera className="w-3.5 h-3.5 text-slate-400" /></div>
                        )}
                        <span className="font-medium text-slate-900">{item.namaAlat || "-"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{item.tipeAlat || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{item.kategori || "-"}</td>
                    <td className="px-4 py-3 text-center text-slate-700">
                      {item.jumlah ? `${item.jumlah} ${item.satuan || ""}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.lokasi || "-"}</td>
                    <td className="px-4 py-3 text-center">
                      {item.tanggalKalibrasi ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs text-slate-600">{item.tanggalKalibrasi}</span>
                          {item.sertifKalibrasiUrl && (
                            <div className="flex items-center gap-1">
                              <a href={item.sertifKalibrasiUrl} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                                <FileCheck className="w-3 h-3" /> Lihat
                              </a>
                              <button
                                onClick={() => downloadFile(item.sertifKalibrasiUrl, `sertif_${item.kodeAlat || item.namaAlat}.jpg`)}
                                title="Unduh sertifikat"
                                className="p-0.5 text-slate-400 hover:text-blue-600 transition-colors"
                              >
                                <Download className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${KONDISI_BADGE[item.kondisi] || "bg-slate-100 text-slate-600"}`}>
                        {item.kondisi}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(item)} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {search && (
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-xs text-slate-400">
              Menampilkan {filtered.length} dari {items.length} alat
            </div>
          )}
        </div>
      )}

      <input ref={fileRef}   type="file" accept="image/*" className="hidden" onChange={handleFoto} />
      <input ref={sertifRef} type="file" accept="image/*" className="hidden" onChange={handleSertif} />

      <Modal open={modalOpen} onClose={closeModal}
        title={editing?.id ? "Edit Alat Kerja" : "Tambah Alat Kerja Baru"} size="lg">
        <div className="space-y-4">

          {/* Foto alat */}
          <Field label="Foto Alat">
            {fotoPreview ? (
              <div className="relative w-full h-40 rounded-xl overflow-hidden border border-slate-200">
                <img src={fotoPreview} alt="preview" className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2 flex gap-1.5">
                  {form.fotoUrl && (
                    <button type="button"
                      onClick={() => downloadFile(form.fotoUrl, `foto_${form.kodeAlat || form.namaAlat}.jpg`)}
                      title="Unduh foto"
                      className="p-1 bg-black/50 text-white rounded-lg hover:bg-black/70">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button type="button"
                    onClick={() => { setFotoFile(null); setFotoPreview(""); setForm(f => ({ ...f, fotoUrl: "", fotoPath: "" })); }}
                    className="p-1 bg-black/50 text-white rounded-lg hover:bg-black/70">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()}
                className="w-full h-24 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center gap-2 text-slate-400 hover:border-amber-400 hover:text-amber-500 transition-colors">
                <Camera className="w-5 h-5" />
                <span className="text-sm">Pilih foto alat</span>
              </button>
            )}
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nama Alat *">
              <Input value={form.namaAlat} onChange={e => setNama(e.target.value)} placeholder="Tang Kombinasi" />
            </Field>
            <Field label="Kode Alat">
              <Input value={form.kodeAlat} onChange={e => set("kodeAlat", e.target.value)}
                placeholder="Otomatis dari nama"
                className={!editing ? "bg-slate-50 text-slate-500" : ""} />
            </Field>
            <Field label="Tipe Alat">
              <Input value={form.tipeAlat} onChange={e => set("tipeAlat", e.target.value)} placeholder="Analog / Digital / Manual / Pneumatik" />
            </Field>
            <Field label="Kategori">
              <Input value={form.kategori} onChange={e => set("kategori", e.target.value)} placeholder="Listrik / Ukur / Keselamatan / Tangan" />
            </Field>
            <Field label="Kondisi">
              <Select value={form.kondisi} onChange={e => set("kondisi", e.target.value)}>
                <option value="baik">Baik</option>
                <option value="perbaikan">Dalam Perbaikan</option>
                <option value="rusak">Rusak</option>
                <option value="hilang">Hilang</option>
              </Select>
            </Field>
            <Field label="Jumlah">
              <Input type="number" value={form.jumlah} onChange={e => set("jumlah", e.target.value)} placeholder="1" />
            </Field>
            <Field label="Satuan">
              <Select value={form.satuan} onChange={e => set("satuan", e.target.value)}>
                <option value="pcs">pcs</option>
                <option value="unit">unit</option>
                <option value="set">set</option>
                <option value="buah">buah</option>
                <option value="pasang">pasang</option>
              </Select>
            </Field>
            <Field label="Lokasi Penyimpanan">
              <Input value={form.lokasi} onChange={e => set("lokasi", e.target.value)} placeholder="Gudang A / Mobil Operasional" />
            </Field>
            <Field label="Penanggung Jawab">
              <Input value={form.penanggungJawab} onChange={e => set("penanggungJawab", e.target.value)} placeholder="Nama teknisi / admin" />
            </Field>
            <Field label="Tanggal Pembelian">
              <Input type="date" value={form.tanggalBeli} onChange={e => set("tanggalBeli", e.target.value)} />
            </Field>
          </div>

          {/* Kalibrasi section */}
          <div className="border border-blue-100 rounded-xl p-4 bg-blue-50/40 space-y-3">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5" /> Kalibrasi
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Tanggal Kalibrasi">
                <Input type="date" value={form.tanggalKalibrasi} onChange={e => set("tanggalKalibrasi", e.target.value)} />
              </Field>
              <Field label="Foto Sertifikat Kalibrasi">
                {sertifPreview ? (
                  <div className="relative w-full h-24 rounded-xl overflow-hidden border border-slate-200">
                    <img src={sertifPreview} alt="sertif" className="w-full h-full object-cover" />
                    <div className="absolute top-1.5 right-1.5 flex gap-1">
                      {form.sertifKalibrasiUrl && (
                        <button type="button"
                          onClick={() => downloadFile(form.sertifKalibrasiUrl, `sertif_${form.kodeAlat || form.namaAlat}.jpg`)}
                          title="Unduh sertifikat"
                          className="p-1 bg-black/50 text-white rounded-lg hover:bg-black/70">
                          <Download className="w-3 h-3" />
                        </button>
                      )}
                      <button type="button"
                        onClick={() => { setSertifFile(null); setSertifPreview(""); setForm(f => ({ ...f, sertifKalibrasiUrl: "", sertifKalibrasiPath: "" })); }}
                        className="p-1 bg-black/50 text-white rounded-lg hover:bg-black/70">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => sertifRef.current?.click()}
                    className="w-full h-24 border-2 border-dashed border-blue-200 rounded-xl flex items-center justify-center gap-2 text-blue-400 hover:border-blue-400 hover:text-blue-500 transition-colors">
                    <FileCheck className="w-4 h-4" />
                    <span className="text-sm">Pilih foto sertifikat</span>
                  </button>
                )}
              </Field>
            </div>
          </div>

          <Field label="Keterangan">
            <TextArea rows={2} value={form.keterangan} onChange={e => set("keterangan", e.target.value)} placeholder="Spesifikasi, merk, atau catatan tambahan..." />
          </Field>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={closeModal}>Batal</Button>
            <Button onClick={handleSave}>Simpan</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
