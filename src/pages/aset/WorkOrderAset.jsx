import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import {
  AdminPageHeader, Button, Modal, Field, Input, Select, TextArea, EmptyState, useToast,
} from "../../components/admin/AdminUI";
import {
  getAllWorkOrder, createWorkOrder, updateWorkOrder, removeWorkOrder, formatRupiah,
} from "../../services/asetService";

const EMPTY = {
  nomorWO: "", asetNama: "", kodeAset: "", tanggal: "",
  jenisWO: "preventif", teknisi: "", deskripsi: "", biaya: "", status: "open",
};

const STATUS_BADGE = {
  open:       "bg-blue-100 text-blue-700",
  inProgress: "bg-amber-100 text-amber-700",
  selesai:    "bg-emerald-100 text-emerald-700",
  dibatalkan: "bg-slate-100 text-slate-500",
};

const STATUS_LABEL = {
  open: "Open", inProgress: "In Progress", selesai: "Selesai", dibatalkan: "Dibatalkan",
};

export default function WorkOrderAset() {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState(EMPTY);
  const { show, Toast }       = useToast();

  const load = async () => {
    setLoading(true);
    try { setItems(await getAllWorkOrder()); }
    catch { show("Gagal memuat data", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (item) => { setEditing(item); setForm({ ...item }); setModal(true); };
  const set      = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    try {
      if (editing?.id) await updateWorkOrder(editing.id, form);
      else await createWorkOrder(form);
      show("Tersimpan"); setModal(false); load();
    } catch { show("Gagal menyimpan", "error"); }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Hapus Work Order "${item.nomorWO}"?`)) return;
    try { await removeWorkOrder(item.id); show("Terhapus"); load(); }
    catch { show("Gagal menghapus", "error"); }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <Toast />
      <AdminPageHeader
        title="Work Order Aset"
        description="Kelola perintah kerja perawatan dan perbaikan aset."
        actions={<Button onClick={openAdd}><Plus className="w-4 h-4" /> Buat Work Order</Button>}
      />

      {loading ? (
        <div className="text-center py-12 text-slate-500">Memuat...</div>
      ) : !items.length ? (
        <EmptyState
          title="Belum ada Work Order"
          description="Buat Work Order untuk mendokumentasikan pekerjaan maintenance aset."
          action={<Button onClick={openAdd}><Plus className="w-4 h-4" /> Buat WO</Button>}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">No. WO</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Aset</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Tanggal</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Jenis</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Teknisi</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Biaya</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Status</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{item.nomorWO || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{item.asetNama || "-"}</div>
                      <div className="text-xs text-slate-400">{item.kodeAset}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.tanggal || "-"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 capitalize">
                        {item.jenisWO}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.teknisi || "-"}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatRupiah(item.biaya)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[item.status] || STATUS_BADGE.open}`}>
                        {STATUS_LABEL[item.status] || item.status}
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
        title={editing?.id ? "Edit Work Order" : "Buat Work Order Baru"} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nomor WO"><Input value={form.nomorWO} onChange={e => set("nomorWO", e.target.value)} placeholder="WO-2026-001" /></Field>
            <Field label="Nama Aset"><Input value={form.asetNama} onChange={e => set("asetNama", e.target.value)} placeholder="Kendaraan Operasional" /></Field>
            <Field label="Kode Aset"><Input value={form.kodeAset} onChange={e => set("kodeAset", e.target.value)} placeholder="AST-001" /></Field>
            <Field label="Tanggal"><Input type="date" value={form.tanggal} onChange={e => set("tanggal", e.target.value)} /></Field>
            <Field label="Jenis WO">
              <Select value={form.jenisWO} onChange={e => set("jenisWO", e.target.value)}>
                <option value="preventif">Preventif</option>
                <option value="korektif">Korektif</option>
                <option value="darurat">Darurat</option>
              </Select>
            </Field>
            <Field label="Teknisi / PIC"><Input value={form.teknisi} onChange={e => set("teknisi", e.target.value)} placeholder="Ahmad Fajar" /></Field>
            <Field label="Biaya (Rp)"><Input type="number" value={form.biaya} onChange={e => set("biaya", e.target.value)} placeholder="0" /></Field>
            <Field label="Status">
              <Select value={form.status} onChange={e => set("status", e.target.value)}>
                <option value="open">Open</option>
                <option value="inProgress">In Progress</option>
                <option value="selesai">Selesai</option>
                <option value="dibatalkan">Dibatalkan</option>
              </Select>
            </Field>
          </div>
          <Field label="Deskripsi Pekerjaan">
            <TextArea rows={3} value={form.deskripsi} onChange={e => set("deskripsi", e.target.value)} placeholder="Detail pekerjaan yang dilakukan..." />
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
