import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import {
  AdminPageHeader, Button, Modal, Field, Input, TextArea, Select, EmptyState, useToast,
} from "../../components/admin/AdminUI";
import {
  getAllJadwal, createJadwal, updateJadwal, removeJadwal,
  getAllWorkOrder,
} from "../../services/produksiService";

const EMPTY = {
  workOrderId: "",
  tanggalMulai: "",
  tanggalSelesai: "",
  mesin: "",
  operator: "",
  status: "terjadwal",
  catatan: "",
};

const STATUS_CONFIG = {
  terjadwal: { label: "Terjadwal",  badge: "bg-blue-100 text-blue-700" },
  berjalan:  { label: "Berjalan",   badge: "bg-amber-100 text-amber-700" },
  selesai:   { label: "Selesai",    badge: "bg-emerald-100 text-emerald-700" },
  ditunda:   { label: "Ditunda",    badge: "bg-slate-100 text-slate-600" },
  dibatalkan:{ label: "Dibatalkan", badge: "bg-red-100 text-red-700" },
};

export default function PenjadwalanProduksi() {
  const [items, setItems]     = useState([]);
  const [woList, setWoList]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState(EMPTY);
  const [filterStatus, setFilterStatus] = useState("semua");
  const { show, Toast }       = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [jadwal, wo] = await Promise.all([getAllJadwal(), getAllWorkOrder()]);
      setItems(jadwal);
      setWoList(wo);
    } catch {
      show("Gagal memuat data jadwal produksi", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (item) => { setEditing(item); setForm({ ...item }); setModal(true); };
  const set      = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.workOrderId) { show("Work Order wajib dipilih", "error"); return; }
    if (!form.tanggalMulai) { show("Tanggal mulai wajib diisi", "error"); return; }
    if (!form.tanggalSelesai) { show("Tanggal selesai wajib diisi", "error"); return; }
    if (form.tanggalSelesai < form.tanggalMulai) {
      show("Tanggal selesai tidak boleh sebelum tanggal mulai", "error");
      return;
    }
    try {
      if (editing?.id) await updateJadwal(editing.id, form);
      else await createJadwal(form);
      show("Jadwal produksi berhasil disimpan");
      setModal(false);
      load();
    } catch {
      show("Gagal menyimpan jadwal produksi", "error");
    }
  };

  const handleDelete = async (item) => {
    const label = getWoLabel(item.workOrderId);
    if (!confirm(`Hapus jadwal produksi untuk "${label}"?`)) return;
    try {
      await removeJadwal(item.id);
      show("Jadwal berhasil dihapus");
      load();
    } catch {
      show("Gagal menghapus jadwal", "error");
    }
  };

  const getWoLabel = (id) => {
    const wo = woList.find(w => w.id === id);
    return wo ? (wo.nomorWO || wo.namaWO || id) : id || "—";
  };

  const displayed = filterStatus === "semua" ? items : items.filter(i => i.status === filterStatus);

  const countByStatus = (s) => items.filter(i => i.status === s).length;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <Toast />
      <AdminPageHeader
        title="Penjadwalan Produksi"
        description="Rencanakan dan kelola jadwal produksi berdasarkan Work Order."
        actions={
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4" /> Tambah Jadwal
          </Button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Total Jadwal</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{items.length}</p>
        </div>
        {["terjadwal", "berjalan", "selesai", "ditunda"].map(s => {
          const cfg = STATUS_CONFIG[s];
          return (
            <div key={s} className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500">{cfg.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{countByStatus(s)}</p>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-sm text-slate-500 font-medium">Filter:</span>
        {["semua", ...Object.keys(STATUS_CONFIG)].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
              filterStatus === s
                ? "bg-amber-500 text-white border-amber-500"
                : "bg-white text-slate-600 border-slate-200 hover:border-amber-300"
            }`}
          >
            {s === "semua" ? "Semua" : STATUS_CONFIG[s].label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
          Memuat data...
        </div>
      ) : !displayed.length ? (
        <EmptyState
          title="Belum ada jadwal produksi"
          description="Buat jadwal produksi untuk mengatur alur kerja berdasarkan Work Order."
          action={<Button onClick={openAdd}><Plus className="w-4 h-4" /> Tambah Jadwal</Button>}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Work Order</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Mesin</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Operator</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Tgl Mulai</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Tgl Selesai</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayed.map(item => {
                  const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.terjadwal;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{getWoLabel(item.workOrderId)}</td>
                      <td className="px-4 py-3 text-slate-600">{item.mesin || "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{item.operator || "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{item.tanggalMulai || "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{item.tanggalSelesai || "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${cfg.badge}`}>
                          {cfg.label}
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
        title={editing?.id ? "Edit Jadwal Produksi" : "Tambah Jadwal Produksi"}
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Work Order" required>
            <Select value={form.workOrderId} onChange={e => set("workOrderId", e.target.value)}>
              <option value="">— Pilih Work Order —</option>
              {woList.map(wo => (
                <option key={wo.id} value={wo.id}>
                  {wo.nomorWO || wo.namaWO || wo.id}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={e => set("status", e.target.value)}>
              <option value="terjadwal">Terjadwal</option>
              <option value="berjalan">Berjalan</option>
              <option value="selesai">Selesai</option>
              <option value="ditunda">Ditunda</option>
              <option value="dibatalkan">Dibatalkan</option>
            </Select>
          </Field>
          <Field label="Tanggal Mulai" required>
            <Input
              type="date"
              value={form.tanggalMulai}
              onChange={e => set("tanggalMulai", e.target.value)}
            />
          </Field>
          <Field label="Tanggal Selesai" required>
            <Input
              type="date"
              value={form.tanggalSelesai}
              onChange={e => set("tanggalSelesai", e.target.value)}
            />
          </Field>
          <Field label="Mesin / Lini Produksi">
            <Input
              value={form.mesin}
              onChange={e => set("mesin", e.target.value)}
              placeholder="Contoh: Mesin Press A, Lini 1"
            />
          </Field>
          <Field label="Operator">
            <Input
              value={form.operator}
              onChange={e => set("operator", e.target.value)}
              placeholder="Nama operator atau tim"
            />
          </Field>
        </div>
        <Field label="Catatan">
          <TextArea
            rows={2}
            value={form.catatan}
            onChange={e => set("catatan", e.target.value)}
            placeholder="Instruksi khusus atau catatan produksi..."
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
