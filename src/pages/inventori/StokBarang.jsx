import { useEffect, useState, useRef } from "react";
import { Plus, Edit2, Trash2, ImageIcon, X } from "lucide-react";
import {
  AdminPageHeader, Button, Modal, Field, Input, Select, EmptyState, useToast,
} from "../../components/admin/AdminUI";
import {
  getAllStok, createStok, updateStok, removeStok, formatRupiah,
  getAllGudang, uploadBarangPhoto, deleteBarangPhoto,
} from "../../services/inventoriService";

const EMPTY = {
  kodeProduk: "", namaProduk: "", kategori: "", satuan: "pcs",
  stokAwal: "0", stokAkhir: "0", hargaBeli: "", hargaJual: "",
  gudangId: "", gudangNama: "", status: "aktif",
  fotoUrl: "", fotoPath: "",
};

const STATUS_BADGE = {
  aktif:    "bg-emerald-100 text-emerald-700",
  nonaktif: "bg-slate-100 text-slate-500",
};

function FotoUploader({ value, onChange }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(value || null);

  useEffect(() => { setPreview(value || null); }, [value]);

  const handle = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return alert("File harus berupa gambar");
    setPreview(URL.createObjectURL(file));
    onChange(file);
  };

  const clear = (e) => {
    e.stopPropagation();
    setPreview(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div
      onClick={() => !preview && inputRef.current?.click()}
      className={`relative w-full aspect-square max-w-[160px] rounded-xl border-2 border-dashed
        overflow-hidden cursor-pointer transition
        ${preview ? "border-slate-200" : "border-slate-300 hover:border-amber-400 bg-slate-50"}`}
    >
      {preview ? (
        <>
          <img src={preview} alt="Foto barang" className="w-full h-full object-cover" />
          <button
            type="button" onClick={clear}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2">
          <ImageIcon className="w-8 h-8" />
          <p className="text-xs text-center px-2">Klik untuk unggah foto</p>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={handle} className="hidden" />
    </div>
  );
}

export default function StokBarang() {
  const [items, setItems]       = useState([]);
  const [gudangList, setGudang] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modalOpen, setModal]   = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(EMPTY);
  const [fotoFile, setFotoFile] = useState(null);  // new File to upload
  const [fotoRemoved, setFotoRemoved] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [search, setSearch]     = useState("");
  const { show, Toast }         = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [s, g] = await Promise.all([getAllStok(), getAllGudang()]);
      setItems(s);
      setGudang(g);
    } catch { show("Gagal memuat data", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY);
    setFotoFile(null);
    setFotoRemoved(false);
    setModal(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({ ...EMPTY, ...item });
    setFotoFile(null);
    setFotoRemoved(false);
    setModal(true);
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleGudangChange = (gudangId) => {
    const g = gudangList.find(x => x.id === gudangId);
    setForm(f => ({ ...f, gudangId, gudangNama: g?.namaGudang || "" }));
  };

  const handleFotoChange = (file) => {
    if (file === null) {
      setFotoFile(null);
      setFotoRemoved(true);
    } else {
      setFotoFile(file);
      setFotoRemoved(false);
    }
  };

  const handleSave = async () => {
    if (!form.namaProduk.trim()) { show("Nama produk wajib diisi", "error"); return; }
    setSaving(true);
    try {
      let data = { ...form };

      if (editing?.id) {
        // Edit: handle foto changes
        if (fotoRemoved && editing.fotoPath) {
          await deleteBarangPhoto(editing.fotoPath);
          data.fotoUrl = "";
          data.fotoPath = "";
        }
        if (fotoFile) {
          if (editing.fotoPath) await deleteBarangPhoto(editing.fotoPath);
          const { url, path } = await uploadBarangPhoto(fotoFile, editing.id);
          data.fotoUrl = url;
          data.fotoPath = path;
        }
        await updateStok(editing.id, data);
      } else {
        // Create: insert first to get ID, then upload foto
        const docRef = await createStok(data);
        if (fotoFile) {
          const { url, path } = await uploadBarangPhoto(fotoFile, docRef.id);
          await updateStok(docRef.id, { fotoUrl: url, fotoPath: path });
        }
      }

      show("Tersimpan");
      setModal(false);
      load();
    } catch (e) {
      console.error(e);
      show("Gagal menyimpan", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Hapus produk "${item.namaProduk}"?`)) return;
    try {
      if (item.fotoPath) await deleteBarangPhoto(item.fotoPath);
      await removeStok(item.id);
      show("Terhapus");
      load();
    } catch { show("Gagal menghapus", "error"); }
  };

  const filtered = items.filter(i =>
    !search ||
    i.namaProduk?.toLowerCase().includes(search.toLowerCase()) ||
    i.kodeProduk?.toLowerCase().includes(search.toLowerCase())
  );

  const totalNilai = items.reduce(
    (s, i) => s + ((Number(i.stokAkhir) || 0) * (Number(i.hargaBeli) || 0)), 0
  );

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <Toast />
      <AdminPageHeader
        title="Stok Barang"
        description="Kelola inventori produk dan bahan baku perusahaan."
        actions={<Button onClick={openAdd}><Plus className="w-4 h-4" /> Tambah Produk</Button>}
      />

      <div className="flex items-center gap-3 mb-4">
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama / kode produk..."
          className="flex-1 max-w-sm px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="text-sm text-slate-500">
          Nilai Stok: <span className="font-semibold text-slate-900">{formatRupiah(totalNilai)}</span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Memuat...</div>
      ) : !filtered.length ? (
        <EmptyState
          title="Belum ada data stok"
          description="Tambahkan produk pertama untuk memulai pengelolaan inventori."
          action={<Button onClick={openAdd}><Plus className="w-4 h-4" /> Tambah</Button>}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-3 text-left font-medium text-slate-600 w-14">Foto</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Kode</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Nama Produk</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Kategori</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 hidden md:table-cell">Gudang</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Stok</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 hidden sm:table-cell">Satuan</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600 hidden lg:table-cell">Harga Beli</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600 hidden lg:table-cell">Harga Jual</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Status</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2">
                      {item.fotoUrl ? (
                        <img
                          src={item.fotoUrl} alt={item.namaProduk}
                          className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                          <ImageIcon className="w-4 h-4 text-slate-300" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{item.kodeProduk || "-"}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{item.namaProduk || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{item.kategori || "-"}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs hidden md:table-cell">
                      {item.gudangNama || item.gudang || "-"}
                    </td>
                    <td className={`px-4 py-3 text-center font-bold ${
                      Number(item.stokAkhir) <= 0 ? "text-red-600"
                        : Number(item.stokAkhir) < 10 ? "text-amber-600"
                        : "text-emerald-600"
                    }`}>
                      {item.stokAkhir ?? 0}
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">{item.satuan || "-"}</td>
                    <td className="px-4 py-3 text-right text-slate-700 hidden lg:table-cell">{formatRupiah(item.hargaBeli)}</td>
                    <td className="px-4 py-3 text-right text-slate-700 hidden lg:table-cell">{formatRupiah(item.hargaJual)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[item.status] || STATUS_BADGE.aktif}`}>
                        {item.status === "nonaktif" ? "Nonaktif" : "Aktif"}
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
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModal(false)}
        title={editing?.id ? "Edit Produk" : "Tambah Produk"} size="lg">
        <div className="space-y-4">
          {/* Foto barang */}
          <Field label="Foto Barang">
            <FotoUploader
              value={form.fotoUrl}
              onChange={handleFotoChange}
            />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Kode Produk">
              <Input value={form.kodeProduk} onChange={e => set("kodeProduk", e.target.value)} placeholder="PRD-001" />
            </Field>
            <Field label="Nama Produk" required>
              <Input value={form.namaProduk} onChange={e => set("namaProduk", e.target.value)} placeholder="Kabel NYY 4x10mm" />
            </Field>
            <Field label="Kategori">
              <Input value={form.kategori} onChange={e => set("kategori", e.target.value)} placeholder="Kabel Listrik" />
            </Field>
            <Field label="Satuan">
              <Select value={form.satuan} onChange={e => set("satuan", e.target.value)}>
                {["pcs","meter","roll","unit","kg","box","ltr","set","pack","btg","rol"].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </Field>
            <Field label="Stok Awal">
              <Input type="number" value={form.stokAwal} onChange={e => set("stokAwal", e.target.value)} placeholder="0" />
            </Field>
            <Field label="Stok Akhir">
              <Input type="number" value={form.stokAkhir} onChange={e => set("stokAkhir", e.target.value)} placeholder="0" />
            </Field>
            <Field label="Harga Beli (Rp)">
              <Input type="number" value={form.hargaBeli} onChange={e => set("hargaBeli", e.target.value)} placeholder="0" />
            </Field>
            <Field label="Harga Jual (Rp)">
              <Input type="number" value={form.hargaJual} onChange={e => set("hargaJual", e.target.value)} placeholder="0" />
            </Field>
            <Field label="Gudang">
              <Select value={form.gudangId} onChange={e => handleGudangChange(e.target.value)}>
                <option value="">— Pilih Gudang —</option>
                {gudangList.filter(g => g.status === "aktif").map(g => (
                  <option key={g.id} value={g.id}>{g.namaGudang} {g.kodeGudang ? `(${g.kodeGudang})` : ""}</option>
                ))}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={e => set("status", e.target.value)}>
                <option value="aktif">Aktif</option>
                <option value="nonaktif">Nonaktif</option>
              </Select>
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setModal(false)}>Batal</Button>
            <Button onClick={handleSave} loading={saving}>Simpan</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
