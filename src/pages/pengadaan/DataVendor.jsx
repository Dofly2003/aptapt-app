import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Star } from "lucide-react";
import { AdminPageHeader, Button, Modal, Field, Input, TextArea, Select, EmptyState, useToast } from "../../components/admin/AdminUI";
import { getAllVendor, createVendor, updateVendor, removeVendor } from "../../services/pengadaanService";

const EMPTY = {
  nama: "",
  kategori: "Barang",
  kontak: "",
  email: "",
  telepon: "",
  alamat: "",
  npwp: "",
  status: "aktif",
  catatan: "",
  rating: "5",
};

const STATUS_COLORS = {
  aktif: "bg-emerald-100 text-emerald-700",
  nonaktif: "bg-red-100 text-red-700",
};

function StarRating({ value }) {
  const n = Number(value) || 0;
  return (
    <span className="text-amber-400">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i}>{i < n ? "★" : "☆"}</span>
      ))}
    </span>
  );
}

export default function DataVendor() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [filterStatus, setFilterStatus] = useState("semua");
  const { show, Toast } = useToast();

  const load = async () => {
    setLoading(true);
    try { setItems(await getAllVendor()); }
    catch { show("Gagal memuat", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setModalOpen(true); };
  const openEdit = (item) => { setEditing(item); setForm({ ...item }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.nama.trim()) { show("Nama wajib diisi", "error"); return; }
    try {
      if (editing?.id) await updateVendor(editing.id, form);
      else await createVendor(form);
      show("Tersimpan");
      setModalOpen(false);
      load();
    } catch { show("Gagal menyimpan", "error"); }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Hapus vendor "${item.nama}"?`)) return;
    try { await removeVendor(item.id); show("Terhapus"); load(); }
    catch { show("Gagal menghapus", "error"); }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const filtered = filterStatus === "semua" ? items : items.filter(i => i.status === filterStatus);
  const totalAktif = items.filter(i => i.status === "aktif").length;
  const avgRating = items.length
    ? (items.reduce((s, i) => s + (Number(i.rating) || 0), 0) / items.length).toFixed(1)
    : "0.0";

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <Toast />
      <AdminPageHeader
        title="Data Vendor"
        description="Kelola daftar vendor dan supplier pengadaan barang dan jasa."
        actions={
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4" /> Tambah Vendor
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Total Vendor</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{items.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Vendor Aktif</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{totalAktif}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Rata-rata Rating</p>
          <p className="text-2xl font-bold text-amber-500 mt-1">{avgRating} <span className="text-base">★</span></p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {["semua", "aktif", "nonaktif"].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${filterStatus === s ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">Memuat data...</div>
      ) : !filtered.length ? (
        <EmptyState
          title="Belum ada vendor"
          description="Tambahkan vendor baru untuk mulai mencatat data supplier."
          action={<Button onClick={openAdd}><Plus className="w-4 h-4" /> Tambah Vendor</Button>}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Nama</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Kategori</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Kontak</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Telepon</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Rating</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{item.nama}</td>
                    <td className="px-4 py-3 text-slate-600">{item.kategori}</td>
                    <td className="px-4 py-3 text-slate-600">{item.kontak || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{item.telepon || "—"}</td>
                    <td className="px-4 py-3"><StarRating value={item.rating} /></td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[item.status] || "bg-slate-100 text-slate-600"}`}>
                        {item.status === "aktif" ? "Aktif" : "Non-aktif"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
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

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing?.id ? "Edit Vendor" : "Tambah Vendor"}
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nama Vendor" required>
            <Input value={form.nama} onChange={e => set("nama", e.target.value)} />
          </Field>
          <Field label="Kategori">
            <Select value={form.kategori} onChange={e => set("kategori", e.target.value)}>
              <option value="Barang">Barang</option>
              <option value="Jasa">Jasa</option>
              <option value="Keduanya">Keduanya</option>
            </Select>
          </Field>
          <Field label="Kontak">
            <Input value={form.kontak} onChange={e => set("kontak", e.target.value)} />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} />
          </Field>
          <Field label="Telepon">
            <Input value={form.telepon} onChange={e => set("telepon", e.target.value)} />
          </Field>
          <Field label="NPWP">
            <Input value={form.npwp} onChange={e => set("npwp", e.target.value)} />
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={e => set("status", e.target.value)}>
              <option value="aktif">Aktif</option>
              <option value="nonaktif">Non-aktif</option>
            </Select>
          </Field>
          <Field label="Rating">
            <Select value={form.rating} onChange={e => set("rating", e.target.value)}>
              <option value="1">1 ★</option>
              <option value="2">2 ★★</option>
              <option value="3">3 ★★★</option>
              <option value="4">4 ★★★★</option>
              <option value="5">5 ★★★★★</option>
            </Select>
          </Field>
        </div>
        <Field label="Alamat">
          <TextArea rows={3} value={form.alamat} onChange={e => set("alamat", e.target.value)} />
        </Field>
        <Field label="Catatan">
          <TextArea rows={2} value={form.catatan} onChange={e => set("catatan", e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-2">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Batal</Button>
          <Button onClick={handleSave}>Simpan</Button>
        </div>
      </Modal>
    </div>
  );
}
