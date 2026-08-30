import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import {
  AdminPageHeader, Button, Modal, Field, Input, Select, TextArea, EmptyState, useToast,
} from "../../components/admin/AdminUI";
import {
  getAllPelanggan, createPelanggan, updatePelanggan, removePelanggan,
} from "../../services/penjualanService";

const EMPTY = {
  kodePelanggan: "", namaPelanggan: "", email: "", noHP: "",
  alamat: "", kota: "", jenisUsaha: "", status: "aktif",
};

const STATUS_BADGE = {
  aktif:    "bg-emerald-100 text-emerald-700",
  nonaktif: "bg-slate-100 text-slate-500",
};

export default function DataPelanggan() {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState(EMPTY);
  const [search, setSearch]   = useState("");
  const { show, Toast }       = useToast();

  const load = async () => {
    setLoading(true);
    try { setItems(await getAllPelanggan()); }
    catch { show("Gagal memuat data", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (item) => { setEditing(item); setForm({ ...item }); setModal(true); };
  const set      = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    try {
      if (editing?.id) await updatePelanggan(editing.id, form);
      else await createPelanggan(form);
      show("Tersimpan"); setModal(false); load();
    } catch { show("Gagal menyimpan", "error"); }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Hapus pelanggan "${item.namaPelanggan}"?`)) return;
    try { await removePelanggan(item.id); show("Terhapus"); load(); }
    catch { show("Gagal menghapus", "error"); }
  };

  const filtered = items.filter(i =>
    !search || i.namaPelanggan?.toLowerCase().includes(search.toLowerCase()) ||
    i.kodePelanggan?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <Toast />
      <AdminPageHeader
        title="Data Pelanggan"
        description="Kelola database pelanggan dan informasi kontak."
        actions={<Button onClick={openAdd}><Plus className="w-4 h-4" /> Tambah Pelanggan</Button>}
      />

      <div className="mb-4">
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama / kode pelanggan..."
          className="w-full max-w-sm px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Memuat...</div>
      ) : !filtered.length ? (
        <EmptyState
          title="Belum ada data pelanggan"
          description="Tambahkan pelanggan pertama untuk memulai manajemen CRM."
          action={<Button onClick={openAdd}><Plus className="w-4 h-4" /> Tambah</Button>}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Kode</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Nama Pelanggan</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Kontak</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Kota</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Jenis Usaha</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Status</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{item.kodePelanggan || "-"}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{item.namaPelanggan || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="text-slate-700">{item.noHP || "-"}</div>
                      <div className="text-xs text-slate-400">{item.email}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.kota || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{item.jenisUsaha || "-"}</td>
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
        title={editing?.id ? "Edit Pelanggan" : "Tambah Pelanggan"} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Kode Pelanggan"><Input value={form.kodePelanggan} onChange={e => set("kodePelanggan", e.target.value)} placeholder="PLG-001" /></Field>
            <Field label="Nama Pelanggan"><Input value={form.namaPelanggan} onChange={e => set("namaPelanggan", e.target.value)} placeholder="PT. Maju Bersama" /></Field>
            <Field label="No. HP / WhatsApp"><Input value={form.noHP} onChange={e => set("noHP", e.target.value)} placeholder="08xxxxxxxxxx" /></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="info@perusahaan.com" /></Field>
            <Field label="Kota"><Input value={form.kota} onChange={e => set("kota", e.target.value)} placeholder="Jakarta" /></Field>
            <Field label="Jenis Usaha"><Input value={form.jenisUsaha} onChange={e => set("jenisUsaha", e.target.value)} placeholder="Industri Manufaktur" /></Field>
            <Field label="Status">
              <Select value={form.status} onChange={e => set("status", e.target.value)}>
                <option value="aktif">Aktif</option>
                <option value="nonaktif">Nonaktif</option>
              </Select>
            </Field>
          </div>
          <Field label="Alamat Lengkap">
            <TextArea rows={2} value={form.alamat} onChange={e => set("alamat", e.target.value)} placeholder="Jl. ..." />
          </Field>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setModal(false)}>Batal</Button>
            <Button onClick={handleSave}>Simpan</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
