import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { AdminPageHeader, Button, Modal, Field, Input, TextArea, Select, EmptyState, useToast } from "../../components/admin/AdminUI";
import { getAllPurchaseOrder, createPurchaseOrder, updatePurchaseOrder, removePurchaseOrder, formatRupiah } from "../../services/pengadaanService";

const EMPTY = {
  nomorPO: "",
  vendorNama: "",
  tanggalPO: "",
  tanggalKirim: "",
  keterangan: "",
  status: "draft",
  totalNominal: "",
};

const STATUS_COLORS = {
  draft: "bg-slate-100 text-slate-600",
  disetujui: "bg-blue-100 text-blue-700",
  dikirim: "bg-amber-100 text-amber-700",
  selesai: "bg-emerald-100 text-emerald-700",
  dibatalkan: "bg-red-100 text-red-700",
};

const STATUS_LABELS = {
  draft: "Draft",
  disetujui: "Disetujui",
  dikirim: "Dikirim",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

export default function PurchaseOrder() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const { show, Toast } = useToast();

  const load = async () => {
    setLoading(true);
    try { setItems(await getAllPurchaseOrder()); }
    catch { show("Gagal memuat", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setModalOpen(true); };
  const openEdit = (item) => { setEditing(item); setForm({ ...item }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.nomorPO.trim()) { show("Nomor PO wajib diisi", "error"); return; }
    if (!form.vendorNama.trim()) { show("Nama vendor wajib diisi", "error"); return; }
    try {
      if (editing?.id) await updatePurchaseOrder(editing.id, form);
      else await createPurchaseOrder(form);
      show("Tersimpan");
      setModalOpen(false);
      load();
    } catch { show("Gagal menyimpan", "error"); }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Hapus Purchase Order "${item.nomorPO}"?`)) return;
    try { await removePurchaseOrder(item.id); show("Terhapus"); load(); }
    catch { show("Gagal menghapus", "error"); }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const totalNilai = items.reduce((s, i) => s + (Number(i.totalNominal) || 0), 0);
  const poAktif = items.filter(i => ["disetujui", "dikirim"].includes(i.status)).length;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <Toast />
      <AdminPageHeader
        title="Purchase Order"
        description="Kelola Purchase Order kepada vendor dan supplier."
        actions={
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4" /> Buat PO
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Total PO</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{items.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">PO Aktif</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{poAktif}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Nilai Total PO</p>
          <p className="text-xl font-bold text-amber-600 mt-1">{formatRupiah(totalNilai)}</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">Memuat data...</div>
      ) : !items.length ? (
        <EmptyState
          title="Belum ada Purchase Order"
          description="Buat PO baru untuk memulai proses pengadaan."
          action={<Button onClick={openAdd}><Plus className="w-4 h-4" /> Buat PO</Button>}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">No. PO</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Vendor</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Tgl PO</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Tgl Kirim</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Total</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{item.nomorPO}</td>
                    <td className="px-4 py-3 text-slate-600">{item.vendorNama}</td>
                    <td className="px-4 py-3 text-slate-600">{item.tanggalPO || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{item.tanggalKirim || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{formatRupiah(item.totalNominal)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[item.status] || "bg-slate-100 text-slate-600"}`}>
                        {STATUS_LABELS[item.status] || item.status}
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
        title={editing?.id ? "Edit Purchase Order" : "Buat Purchase Order"}
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nomor PO" required>
            <Input value={form.nomorPO} onChange={e => set("nomorPO", e.target.value)} />
          </Field>
          <Field label="Nama Vendor" required>
            <Input value={form.vendorNama} onChange={e => set("vendorNama", e.target.value)} />
          </Field>
          <Field label="Tanggal PO">
            <Input type="date" value={form.tanggalPO} onChange={e => set("tanggalPO", e.target.value)} />
          </Field>
          <Field label="Tanggal Kirim">
            <Input type="date" value={form.tanggalKirim} onChange={e => set("tanggalKirim", e.target.value)} />
          </Field>
          <Field label="Total Nominal">
            <Input type="number" min="0" value={form.totalNominal} onChange={e => set("totalNominal", e.target.value)} />
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={e => set("status", e.target.value)}>
              <option value="draft">Draft</option>
              <option value="disetujui">Disetujui</option>
              <option value="dikirim">Dikirim</option>
              <option value="selesai">Selesai</option>
              <option value="dibatalkan">Dibatalkan</option>
            </Select>
          </Field>
        </div>
        <Field label="Keterangan">
          <TextArea rows={3} value={form.keterangan} onChange={e => set("keterangan", e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-2">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Batal</Button>
          <Button onClick={handleSave}>Simpan</Button>
        </div>
      </Modal>
    </div>
  );
}
