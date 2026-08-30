import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Package } from "lucide-react";
import {
  AdminPageHeader, Button, Modal, Field, Input, TextArea, Select, EmptyState, useToast,
} from "../../components/admin/AdminUI";
import {
  getAllBOM, createBOM, updateBOM, removeBOM, formatRupiah,
} from "../../services/produksiService";

const EMPTY = {
  kodeBOM: "",
  namaProdk: "",
  versi: "1.0",
  satuan: "pcs",
  komponenCount: "",
  estimasiBiaya: "",
  status: "aktif",
  keterangan: "",
};

const STATUS_BADGE = {
  aktif: "bg-emerald-100 text-emerald-800",
  revisi: "bg-amber-100 text-amber-800",
  nonaktif: "bg-slate-100 text-slate-600",
};

export default function BillOfMaterial() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const { show, Toast } = useToast();

  const load = async () => {
    setLoading(true);
    try { setItems(await getAllBOM()); }
    catch { show("Gagal memuat data", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setModalOpen(true); };
  const openEdit = (item) => { setEditing(item); setForm({ ...item }); setModalOpen(true); };
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.kodeBOM || !form.namaProdk) return show("Kode BOM dan Nama Produk wajib diisi", "error");
    try {
      if (editing?.id) await updateBOM(editing.id, form);
      else await createBOM(form);
      show("Tersimpan");
      setModalOpen(false);
      load();
    } catch { show("Gagal menyimpan", "error"); }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Hapus BOM "${item.kodeBOM}"?`)) return;
    try { await removeBOM(item.id); show("Terhapus"); load(); }
    catch { show("Gagal menghapus", "error"); }
  };

  const totalBOM = items.length;
  const bomAktif = items.filter(i => i.status === "aktif").length;
  const totalBiaya = items.reduce((s, i) => s + (Number(i.estimasiBiaya) || 0), 0);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <Toast />
      <AdminPageHeader
        title="Bill of Material"
        description="Kelola daftar komponen dan estimasi biaya untuk setiap produk."
        actions={
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4" /> Tambah BOM
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Total BOM</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalBOM}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">BOM Aktif</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{bomAktif}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Total Est. Biaya</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatRupiah(totalBiaya)}</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Memuat...</div>
      ) : !items.length ? (
        <EmptyState
          title="Belum ada Bill of Material"
          description="Tambahkan BOM pertama untuk mulai mengelola struktur produk."
          action={<Button onClick={openAdd}><Plus className="w-4 h-4" /> Tambah</Button>}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Kode BOM</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Nama Produk</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Versi</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Satuan</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Jml Komponen</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Est. Biaya</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Status</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{item.kodeBOM || "-"}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{item.namaProdk || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{item.versi || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{item.satuan || "-"}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{item.komponenCount || 0}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatRupiah(item.estimasiBiaya)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[item.status] || STATUS_BADGE.nonaktif}`}>
                        {item.status || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openEdit(item)}
                          className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(item)}
                          className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100">
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

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing?.id ? "Edit BOM" : "Tambah BOM"}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Kode BOM" required>
              <Input value={form.kodeBOM} onChange={e => set("kodeBOM", e.target.value)} placeholder="BOM-001" />
            </Field>
            <Field label="Nama Produk" required>
              <Input value={form.namaProdk} onChange={e => set("namaProdk", e.target.value)} placeholder="Nama produk" />
            </Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Versi">
              <Input value={form.versi} onChange={e => set("versi", e.target.value)} placeholder="1.0" />
            </Field>
            <Field label="Satuan">
              <Select value={form.satuan} onChange={e => set("satuan", e.target.value)}>
                <option value="pcs">pcs</option>
                <option value="unit">unit</option>
                <option value="kg">kg</option>
                <option value="liter">liter</option>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={e => set("status", e.target.value)}>
                <option value="aktif">Aktif</option>
                <option value="revisi">Revisi</option>
                <option value="nonaktif">Nonaktif</option>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Jumlah Komponen">
              <Input type="number" value={form.komponenCount} onChange={e => set("komponenCount", e.target.value)} placeholder="0" />
            </Field>
            <Field label="Estimasi Biaya (Rp)">
              <Input type="number" value={form.estimasiBiaya} onChange={e => set("estimasiBiaya", e.target.value)} placeholder="0" />
            </Field>
          </div>
          <Field label="Keterangan">
            <TextArea rows={3} value={form.keterangan} onChange={e => set("keterangan", e.target.value)} placeholder="Catatan atau keterangan tambahan..." />
          </Field>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button onClick={handleSave}>Simpan</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
