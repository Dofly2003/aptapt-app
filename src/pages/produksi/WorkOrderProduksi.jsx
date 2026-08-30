import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import {
  AdminPageHeader, Button, Modal, Field, Input, TextArea, Select, EmptyState, useToast,
} from "../../components/admin/AdminUI";
import {
  getAllWorkOrder, createWorkOrder, updateWorkOrder, removeWorkOrder,
} from "../../services/produksiService";

const EMPTY = {
  nomorWO: "",
  namaProdk: "",
  kodeBOM: "",
  kuantitas: "",
  tanggalMulai: "",
  tanggalSelesai: "",
  prioritas: "normal",
  status: "antrian",
  operator: "",
  catatan: "",
};

const PRIORITAS_BADGE = {
  rendah: "bg-slate-100 text-slate-600",
  normal: "bg-blue-100 text-blue-800",
  tinggi: "bg-amber-100 text-amber-800",
  urgent: "bg-red-100 text-red-800",
};

const STATUS_BADGE = {
  antrian: "bg-slate-100 text-slate-600",
  proses: "bg-blue-100 text-blue-800",
  selesai: "bg-emerald-100 text-emerald-800",
  dibatalkan: "bg-red-100 text-red-800",
};

const ALL_STATUSES = ["antrian", "proses", "selesai", "dibatalkan"];

export default function WorkOrderProduksi() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [filterStatus, setFilterStatus] = useState("semua");
  const { show, Toast } = useToast();

  const load = async () => {
    setLoading(true);
    try { setItems(await getAllWorkOrder()); }
    catch { show("Gagal memuat data", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setModalOpen(true); };
  const openEdit = (item) => { setEditing(item); setForm({ ...item }); setModalOpen(true); };
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.nomorWO || !form.namaProdk) return show("Nomor WO dan Nama Produk wajib diisi", "error");
    try {
      if (editing?.id) await updateWorkOrder(editing.id, form);
      else await createWorkOrder(form);
      show("Tersimpan");
      setModalOpen(false);
      load();
    } catch { show("Gagal menyimpan", "error"); }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Hapus Work Order "${item.nomorWO}"?`)) return;
    try { await removeWorkOrder(item.id); show("Terhapus"); load(); }
    catch { show("Gagal menghapus", "error"); }
  };

  const visible = filterStatus === "semua" ? items : items.filter(i => i.status === filterStatus);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <Toast />
      <AdminPageHeader
        title="Work Order Produksi"
        description="Kelola perintah kerja produksi, prioritas, dan status pengerjaan."
        actions={
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4" /> Tambah WO
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
        {["semua", ...ALL_STATUSES].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all capitalize ${
              filterStatus === s
                ? "bg-amber-500 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {s === "semua" ? "Semua" : s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Memuat...</div>
      ) : !visible.length ? (
        <EmptyState
          title="Belum ada Work Order"
          description="Tambahkan work order produksi untuk memulai penjadwalan produksi."
          action={<Button onClick={openAdd}><Plus className="w-4 h-4" /> Tambah</Button>}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">No. WO</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Produk</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Kuantitas</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Tgl Mulai</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Tgl Selesai</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Prioritas</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Operator</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{item.nomorWO || "-"}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{item.namaProdk || "-"}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{item.kuantitas || 0}</td>
                    <td className="px-4 py-3 text-slate-600">{item.tanggalMulai || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{item.tanggalSelesai || "-"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITAS_BADGE[item.prioritas] || PRIORITAS_BADGE.normal}`}>
                        {item.prioritas || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[item.status] || STATUS_BADGE.antrian}`}>
                        {item.status || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.operator || "-"}</td>
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
        title={editing?.id ? "Edit Work Order" : "Tambah Work Order"}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nomor WO" required>
              <Input value={form.nomorWO} onChange={e => set("nomorWO", e.target.value)} placeholder="WOP-2026-001" />
            </Field>
            <Field label="Nama Produk" required>
              <Input value={form.namaProdk} onChange={e => set("namaProdk", e.target.value)} placeholder="Nama produk" />
            </Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Kode BOM">
              <Input value={form.kodeBOM} onChange={e => set("kodeBOM", e.target.value)} placeholder="BOM-001" />
            </Field>
            <Field label="Kuantitas">
              <Input type="number" value={form.kuantitas} onChange={e => set("kuantitas", e.target.value)} placeholder="0" />
            </Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Tanggal Mulai">
              <Input type="date" value={form.tanggalMulai} onChange={e => set("tanggalMulai", e.target.value)} />
            </Field>
            <Field label="Tanggal Selesai">
              <Input type="date" value={form.tanggalSelesai} onChange={e => set("tanggalSelesai", e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Prioritas">
              <Select value={form.prioritas} onChange={e => set("prioritas", e.target.value)}>
                <option value="rendah">Rendah</option>
                <option value="normal">Normal</option>
                <option value="tinggi">Tinggi</option>
                <option value="urgent">Urgent</option>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={e => set("status", e.target.value)}>
                <option value="antrian">Antrian</option>
                <option value="proses">Proses</option>
                <option value="selesai">Selesai</option>
                <option value="dibatalkan">Dibatalkan</option>
              </Select>
            </Field>
            <Field label="Operator">
              <Input value={form.operator} onChange={e => set("operator", e.target.value)} placeholder="Nama operator" />
            </Field>
          </div>
          <Field label="Catatan">
            <TextArea rows={3} value={form.catatan} onChange={e => set("catatan", e.target.value)} placeholder="Catatan tambahan..." />
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
