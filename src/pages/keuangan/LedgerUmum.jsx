import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import {
  AdminPageHeader, Button, Modal, Field, Input, TextArea, Select, EmptyState, useToast,
} from "../../components/admin/AdminUI";
import {
  getAllJurnal, createJurnal, updateJurnal, removeJurnal, formatRupiah,
} from "../../services/keuanganService";

const EMPTY = {
  tanggal: "",
  nomorJurnal: "",
  keterangan: "",
  akun: "",
  debit: "",
  kredit: "",
  referensi: "",
  status: "draft",
};

const STATUS_BADGE = {
  draft: "bg-amber-100 text-amber-800",
  posted: "bg-emerald-100 text-emerald-800",
};

const STATUS_LABEL = {
  draft: "Draft",
  posted: "Posted",
};

export default function LedgerUmum() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const { show, Toast } = useToast();

  const load = async () => {
    setLoading(true);
    try { setItems(await getAllJurnal()); }
    catch { show("Gagal memuat data", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setModalOpen(true); };
  const openEdit = (item) => { setEditing(item); setForm({ ...item }); setModalOpen(true); };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    try {
      if (editing?.id) await updateJurnal(editing.id, form);
      else await createJurnal(form);
      show("Tersimpan");
      setModalOpen(false);
      load();
    } catch { show("Gagal menyimpan", "error"); }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Hapus jurnal "${item.nomorJurnal}"?`)) return;
    try { await removeJurnal(item.id); show("Terhapus"); load(); }
    catch { show("Gagal menghapus", "error"); }
  };

  const totalDebit = items.reduce((s, i) => s + (Number(i.debit) || 0), 0);
  const totalKredit = items.reduce((s, i) => s + (Number(i.kredit) || 0), 0);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <Toast />
      <AdminPageHeader
        title="Ledger Umum"
        description="Jurnal entri umum untuk pencatatan transaksi akuntansi."
        actions={
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4" /> Tambah Jurnal
          </Button>
        }
      />

      {loading ? (
        <div className="text-center py-12 text-slate-500">Memuat...</div>
      ) : !items.length ? (
        <EmptyState
          title="Belum ada jurnal"
          description="Tambahkan jurnal entri pertama untuk memulai pencatatan akuntansi."
          action={<Button onClick={openAdd}><Plus className="w-4 h-4" /> Tambah</Button>}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">No. Jurnal</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Tanggal</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Akun</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Keterangan</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Debit</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Kredit</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Status</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{item.nomorJurnal || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{item.tanggal || "-"}</td>
                    <td className="px-4 py-3 text-slate-700">{item.akun || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{item.keterangan || "-"}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatRupiah(item.debit)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatRupiah(item.kredit)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[item.status] || STATUS_BADGE.draft}`}>
                        {STATUS_LABEL[item.status] || item.status}
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
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-slate-700">Total</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">{formatRupiah(totalDebit)}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">{formatRupiah(totalKredit)}</td>
                  <td colSpan={2} className="px-4 py-3 text-right text-xs text-slate-500">
                    Selisih: {formatRupiah(Math.abs(totalDebit - totalKredit))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing?.id ? "Edit Jurnal" : "Tambah Jurnal"}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nomor Jurnal">
              <Input
                value={form.nomorJurnal}
                onChange={e => set("nomorJurnal", e.target.value)}
                placeholder="JRN-001"
              />
            </Field>
            <Field label="Tanggal">
              <Input
                type="date"
                value={form.tanggal}
                onChange={e => set("tanggal", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Akun">
            <Input
              value={form.akun}
              onChange={e => set("akun", e.target.value)}
              placeholder="Kas dan Setara Kas"
            />
          </Field>
          <Field label="Keterangan">
            <TextArea
              rows={2}
              value={form.keterangan}
              onChange={e => set("keterangan", e.target.value)}
              placeholder="Deskripsi transaksi..."
            />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Debit (Rp)">
              <Input
                type="number"
                value={form.debit}
                onChange={e => set("debit", e.target.value)}
                placeholder="0"
              />
            </Field>
            <Field label="Kredit (Rp)">
              <Input
                type="number"
                value={form.kredit}
                onChange={e => set("kredit", e.target.value)}
                placeholder="0"
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Referensi">
              <Input
                value={form.referensi}
                onChange={e => set("referensi", e.target.value)}
                placeholder="No. faktur / bukti"
              />
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={e => set("status", e.target.value)}>
                <option value="draft">Draft</option>
                <option value="posted">Posted</option>
              </Select>
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button onClick={handleSave}>Simpan</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
