import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import {
  AdminPageHeader, Button, Modal, Field, Input, Select, EmptyState, useToast,
} from "../../components/admin/AdminUI";
import {
  getAllKaryawan, createKaryawan, updateKaryawan, removeKaryawan,
} from "../../services/sdmService";

const EMPTY = {
  nik: "", nama: "", jabatan: "", departemen: "",
  tanggalMasuk: "", noHP: "", email: "", status: "aktif",
};

const STATUS_BADGE = {
  aktif:  "bg-emerald-100 text-emerald-700",
  resign: "bg-red-100 text-red-700",
  cuti:   "bg-amber-100 text-amber-700",
};

export default function DataKaryawan() {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState(EMPTY);
  const { show, Toast }       = useToast();

  const load = async () => {
    setLoading(true);
    try { setItems(await getAllKaryawan()); }
    catch { show("Gagal memuat data", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (item) => { setEditing(item); setForm({ ...item }); setModal(true); };
  const set      = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    try {
      if (editing?.id) await updateKaryawan(editing.id, form);
      else await createKaryawan(form);
      show("Tersimpan"); setModal(false); load();
    } catch { show("Gagal menyimpan", "error"); }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Hapus karyawan "${item.nama}"?`)) return;
    try { await removeKaryawan(item.id); show("Terhapus"); load(); }
    catch { show("Gagal menghapus", "error"); }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <Toast />
      <AdminPageHeader
        title="Data Karyawan"
        description="Kelola data dan profil seluruh karyawan perusahaan."
        actions={<Button onClick={openAdd}><Plus className="w-4 h-4" /> Tambah Karyawan</Button>}
      />

      {loading ? (
        <div className="text-center py-12 text-slate-500">Memuat...</div>
      ) : !items.length ? (
        <EmptyState
          title="Belum ada data karyawan"
          description="Tambahkan karyawan pertama untuk memulai pengelolaan SDM."
          action={<Button onClick={openAdd}><Plus className="w-4 h-4" /> Tambah</Button>}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">NIK</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Nama</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Jabatan</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Departemen</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">No. HP</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Tgl Masuk</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Status</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{item.nik || "-"}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{item.nama || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{item.jabatan || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{item.departemen || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{item.noHP || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{item.tanggalMasuk || "-"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[item.status] || "bg-slate-100 text-slate-600"}`}>
                        {item.status || "aktif"}
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
        title={editing?.id ? "Edit Karyawan" : "Tambah Karyawan"} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="NIK"><Input value={form.nik} onChange={e => set("nik", e.target.value)} placeholder="K-001" /></Field>
            <Field label="Nama Lengkap"><Input value={form.nama} onChange={e => set("nama", e.target.value)} placeholder="Ahmad Fajar" /></Field>
            <Field label="Jabatan"><Input value={form.jabatan} onChange={e => set("jabatan", e.target.value)} placeholder="Teknisi Lapangan" /></Field>
            <Field label="Departemen"><Input value={form.departemen} onChange={e => set("departemen", e.target.value)} placeholder="Operasional" /></Field>
            <Field label="Tanggal Masuk"><Input type="date" value={form.tanggalMasuk} onChange={e => set("tanggalMasuk", e.target.value)} /></Field>
            <Field label="No. HP"><Input value={form.noHP} onChange={e => set("noHP", e.target.value)} placeholder="08xxxxxxxxxx" /></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="nama@email.com" /></Field>
            <Field label="Status">
              <Select value={form.status} onChange={e => set("status", e.target.value)}>
                <option value="aktif">Aktif</option>
                <option value="cuti">Cuti</option>
                <option value="resign">Resign</option>
              </Select>
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setModal(false)}>Batal</Button>
            <Button onClick={handleSave}>Simpan</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
