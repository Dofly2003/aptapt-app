import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import {
  AdminPageHeader, Button, Modal, Field, Input, Select, TextArea, EmptyState, useToast,
} from "../../components/admin/AdminUI";
import {
  getAllSalesOrder, createSalesOrder, updateSalesOrder, removeSalesOrder, formatRupiah,
} from "../../services/penjualanService";

const EMPTY = {
  nomorSO: "", pelangganNama: "", tanggalSO: "", tanggalKirim: "",
  keterangan: "", totalNominal: "", status: "draft",
};

const STATUS_BADGE = {
  draft:      "bg-slate-100 text-slate-600",
  konfirmasi: "bg-blue-100 text-blue-700",
  diproses:   "bg-amber-100 text-amber-700",
  selesai:    "bg-emerald-100 text-emerald-700",
  dibatalkan: "bg-red-100 text-red-700",
};

const STATUS_LABEL = {
  draft: "Draft", konfirmasi: "Konfirmasi", diproses: "Diproses",
  selesai: "Selesai", dibatalkan: "Dibatalkan",
};

export default function SalesOrder() {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState(EMPTY);
  const { show, Toast }       = useToast();

  const load = async () => {
    setLoading(true);
    try { setItems(await getAllSalesOrder()); }
    catch { show("Gagal memuat data", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (item) => { setEditing(item); setForm({ ...item }); setModal(true); };
  const set      = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    try {
      if (editing?.id) await updateSalesOrder(editing.id, form);
      else await createSalesOrder(form);
      show("Tersimpan"); setModal(false); load();
    } catch { show("Gagal menyimpan", "error"); }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Hapus Sales Order "${item.nomorSO}"?`)) return;
    try { await removeSalesOrder(item.id); show("Terhapus"); load(); }
    catch { show("Gagal menghapus", "error"); }
  };

  const totalNilai = items.reduce((s, i) => s + (Number(i.totalNominal) || 0), 0);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <Toast />
      <AdminPageHeader
        title="Sales Order"
        description="Kelola pesanan penjualan dari pelanggan."
        actions={<Button onClick={openAdd}><Plus className="w-4 h-4" /> Buat SO Baru</Button>}
      />

      {loading ? (
        <div className="text-center py-12 text-slate-500">Memuat...</div>
      ) : !items.length ? (
        <EmptyState
          title="Belum ada Sales Order"
          description="Buat Sales Order baru untuk mencatat pesanan pelanggan."
          action={<Button onClick={openAdd}><Plus className="w-4 h-4" /> Buat SO</Button>}
        />
      ) : (
        <>
          <div className="bg-blue-50 rounded-xl p-4 mb-4 text-sm">
            <span className="text-slate-500">Total Nilai SO: </span>
            <span className="font-bold text-blue-700">{formatRupiah(totalNilai)}</span>
            <span className="text-slate-400 ml-4">({items.length} order)</span>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">No. SO</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Pelanggan</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Tgl SO</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Tgl Kirim</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Total</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">Status</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">{item.nomorSO || "-"}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{item.pelangganNama || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{item.tanggalSO || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{item.tanggalKirim || "-"}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatRupiah(item.totalNominal)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[item.status] || STATUS_BADGE.draft}`}>
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
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModal(false)}
        title={editing?.id ? "Edit Sales Order" : "Buat Sales Order Baru"} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nomor SO"><Input value={form.nomorSO} onChange={e => set("nomorSO", e.target.value)} placeholder="SO-2026-001" /></Field>
            <Field label="Nama Pelanggan"><Input value={form.pelangganNama} onChange={e => set("pelangganNama", e.target.value)} placeholder="PT. Maju Bersama" /></Field>
            <Field label="Tanggal SO"><Input type="date" value={form.tanggalSO} onChange={e => set("tanggalSO", e.target.value)} /></Field>
            <Field label="Estimasi Tanggal Kirim"><Input type="date" value={form.tanggalKirim} onChange={e => set("tanggalKirim", e.target.value)} /></Field>
            <Field label="Total Nominal (Rp)"><Input type="number" value={form.totalNominal} onChange={e => set("totalNominal", e.target.value)} placeholder="0" /></Field>
            <Field label="Status">
              <Select value={form.status} onChange={e => set("status", e.target.value)}>
                <option value="draft">Draft</option>
                <option value="konfirmasi">Konfirmasi</option>
                <option value="diproses">Diproses</option>
                <option value="selesai">Selesai</option>
                <option value="dibatalkan">Dibatalkan</option>
              </Select>
            </Field>
          </div>
          <Field label="Keterangan / Deskripsi Pesanan">
            <TextArea rows={3} value={form.keterangan} onChange={e => set("keterangan", e.target.value)} placeholder="Detail pesanan..." />
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
