import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import {
  AdminPageHeader, Button, Modal, Field, Input, TextArea, Select, EmptyState, useToast,
} from "../../components/admin/AdminUI";
import {
  getAllTugas, createTugas, updateTugas, removeTugas,
  getAllProyek,
} from "../../services/proyekService";

const EMPTY = {
  namaTugas: "",
  proyekId: "",
  assignee: "",
  deadline: "",
  status: "belum",
  prioritas: "sedang",
  catatan: "",
};

const STATUS_CONFIG = {
  belum:   { label: "Belum Mulai", badge: "bg-slate-100 text-slate-600" },
  proses:  { label: "Proses",      badge: "bg-blue-100 text-blue-700" },
  selesai: { label: "Selesai",     badge: "bg-emerald-100 text-emerald-700" },
};

const PRIORITAS_CONFIG = {
  rendah:  { label: "Rendah",  badge: "bg-slate-100 text-slate-500" },
  sedang:  { label: "Sedang",  badge: "bg-amber-100 text-amber-700" },
  tinggi:  { label: "Tinggi",  badge: "bg-red-100 text-red-700" },
};

export default function TugasProyek() {
  const [items, setItems]       = useState([]);
  const [proyekList, setProyek] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modalOpen, setModal]   = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(EMPTY);
  const [filterStatus, setFilterStatus]   = useState("semua");
  const { show, Toast }         = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [tugas, proyek] = await Promise.all([getAllTugas(), getAllProyek()]);
      setItems(tugas);
      setProyek(proyek);
    } catch {
      show("Gagal memuat data tugas proyek", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (item) => { setEditing(item); setForm({ ...item }); setModal(true); };
  const set      = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.namaTugas.trim()) { show("Nama tugas wajib diisi", "error"); return; }
    if (!form.proyekId) { show("Pilih proyek terlebih dahulu", "error"); return; }
    try {
      if (editing?.id) await updateTugas(editing.id, form);
      else await createTugas(form);
      show("Tugas berhasil disimpan");
      setModal(false);
      load();
    } catch {
      show("Gagal menyimpan tugas", "error");
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Hapus tugas "${item.namaTugas}"?`)) return;
    try {
      await removeTugas(item.id);
      show("Tugas berhasil dihapus");
      load();
    } catch {
      show("Gagal menghapus tugas", "error");
    }
  };

  const getProyekNama = (id) => proyekList.find(p => p.id === id)?.namaProyek || id || "—";

  const isOverdue = (item) => {
    if (!item.deadline || item.status === "selesai") return false;
    return new Date(item.deadline) < new Date();
  };

  const displayed = filterStatus === "semua" ? items : items.filter(i => i.status === filterStatus);

  const countByStatus = (s) => items.filter(i => i.status === s).length;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <Toast />
      <AdminPageHeader
        title="Tugas Proyek"
        description="Kelola dan pantau tugas-tugas dalam setiap proyek."
        actions={
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4" /> Tambah Tugas
          </Button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Total Tugas</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{items.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Belum Mulai</p>
          <p className="text-2xl font-bold text-slate-600 mt-1">{countByStatus("belum")}</p>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
          <p className="text-sm text-blue-600">Sedang Proses</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{countByStatus("proses")}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4">
          <p className="text-sm text-emerald-600">Selesai</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{countByStatus("selesai")}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm text-slate-500 font-medium">Filter:</span>
        {["semua", "belum", "proses", "selesai"].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
              filterStatus === s
                ? "bg-amber-500 text-white border-amber-500"
                : "bg-white text-slate-600 border-slate-200 hover:border-amber-300"
            }`}
          >
            {s === "semua" ? "Semua" : STATUS_CONFIG[s]?.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
          Memuat data...
        </div>
      ) : !displayed.length ? (
        <EmptyState
          title="Belum ada tugas"
          description="Tambahkan tugas untuk mengatur pekerjaan dalam proyek Anda."
          action={<Button onClick={openAdd}><Plus className="w-4 h-4" /> Tambah Tugas</Button>}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Nama Tugas</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Proyek</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Assignee</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Deadline</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">Prioritas</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayed.map(item => {
                  const overdue = isOverdue(item);
                  const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.belum;
                  const priosCfg = PRIORITAS_CONFIG[item.prioritas] || PRIORITAS_CONFIG.sedang;
                  return (
                    <tr key={item.id} className={`hover:bg-slate-50 ${overdue ? "bg-red-50/30" : ""}`}>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {item.namaTugas}
                        {overdue && (
                          <span className="ml-2 text-xs text-red-500 font-normal">(terlambat)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{getProyekNama(item.proyekId)}</td>
                      <td className="px-4 py-3 text-slate-600">{item.assignee || "—"}</td>
                      <td className={`px-4 py-3 ${overdue ? "text-red-600 font-semibold" : "text-slate-600"}`}>
                        {item.deadline || "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${priosCfg.badge}`}>
                          {priosCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusCfg.badge}`}>
                          {statusCfg.label}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModal(false)}
        title={editing?.id ? "Edit Tugas" : "Tambah Tugas Proyek"}
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nama Tugas" required>
            <Input
              value={form.namaTugas}
              onChange={e => set("namaTugas", e.target.value)}
              placeholder="Contoh: Instalasi panel listrik"
            />
          </Field>
          <Field label="Proyek" required>
            <Select value={form.proyekId} onChange={e => set("proyekId", e.target.value)}>
              <option value="">— Pilih Proyek —</option>
              {proyekList.map(p => (
                <option key={p.id} value={p.id}>{p.namaProyek || p.id}</option>
              ))}
            </Select>
          </Field>
          <Field label="Assignee (Penanggung Jawab)">
            <Input
              value={form.assignee}
              onChange={e => set("assignee", e.target.value)}
              placeholder="Nama teknisi atau tim"
            />
          </Field>
          <Field label="Deadline">
            <Input
              type="date"
              value={form.deadline}
              onChange={e => set("deadline", e.target.value)}
            />
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={e => set("status", e.target.value)}>
              <option value="belum">Belum Mulai</option>
              <option value="proses">Proses</option>
              <option value="selesai">Selesai</option>
            </Select>
          </Field>
          <Field label="Prioritas">
            <Select value={form.prioritas} onChange={e => set("prioritas", e.target.value)}>
              <option value="rendah">Rendah</option>
              <option value="sedang">Sedang</option>
              <option value="tinggi">Tinggi</option>
            </Select>
          </Field>
        </div>
        <Field label="Catatan">
          <TextArea
            rows={2}
            value={form.catatan}
            onChange={e => set("catatan", e.target.value)}
            placeholder="Detail pekerjaan atau instruksi tambahan..."
          />
        </Field>
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-2">
          <Button variant="secondary" onClick={() => setModal(false)}>Batal</Button>
          <Button onClick={handleSave}>Simpan</Button>
        </div>
      </Modal>
    </div>
  );
}
