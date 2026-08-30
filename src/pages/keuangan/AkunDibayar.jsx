import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import {
  AdminPageHeader, Button, Modal, Field, Input, Select, EmptyState, useToast,
} from "../../components/admin/AdminUI";
import {
  getAllHutang, createHutang, updateHutang, removeHutang, formatRupiah,
} from "../../services/keuanganService";

const EMPTY = {
  nomorDokumen: "",
  vendor: "",
  tanggalFaktur: "",
  tanggalJatuhTempo: "",
  keterangan: "",
  nominal: "",
  status: "belum_bayar",
};

const STATUS_BADGE = {
  belum_bayar: "bg-red-100 text-red-800",
  sebagian: "bg-amber-100 text-amber-800",
  lunas: "bg-emerald-100 text-emerald-800",
};

const STATUS_LABEL = {
  belum_bayar: "Belum Bayar",
  sebagian: "Sebagian",
  lunas: "Lunas",
};

export default function AkunDibayar() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const { show, Toast } = useToast();

  const load = async () => {
    setLoading(true);
    try { setItems(await getAllHutang()); }
    catch { show("Gagal memuat data", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setModalOpen(true); };
  const openEdit = (item) => { setEditing(item); setForm({ ...item }); setModalOpen(true); };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    try {
      if (editing?.id) await updateHutang(editing.id, form);
      else await createHutang(form);
      show("Tersimpan");
      setModalOpen(false);
      load();
    } catch { show("Gagal menyimpan", "error"); }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Hapus dokumen "${item.nomorDokumen}"?`)) return;
    try { await removeHutang(item.id); show("Terhapus"); load(); }
    catch { show("Gagal menghapus", "error"); }
  };

  const totalBelumBayar = items
    .filter(i => i.status === "belum_bayar")
    .reduce((s, i) => s + (Number(i.nominal) || 0), 0);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <Toast />
      <AdminPageHeader
        title="Akun Dibayar (Hutang Usaha)"
        description="Kelola tagihan dari vendor yang belum atau sudah dibayar."
        actions={
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4" /> Tambah Hutang
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-xs text-red-600 font-medium uppercase tracking-wide mb-1">Total Hutang Belum Bayar</p>
          <p className="text-xl font-bold text-red-800">{formatRupiah(totalBelumBayar)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Total Dokumen</p>
          <p className="text-xl font-bold text-slate-800">{items.length}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide mb-1">Sudah Lunas</p>
          <p className="text-xl font-bold text-emerald-800">{items.filter(i => i.status === "lunas").length}</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Memuat...</div>
      ) : !items.length ? (
        <EmptyState
          title="Belum ada data hutang usaha"
          description="Tambahkan tagihan vendor untuk memulai pencatatan hutang usaha."
          action={<Button onClick={openAdd}><Plus className="w-4 h-4" /> Tambah</Button>}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">No. Dokumen</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Vendor</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Tgl Faktur</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Jatuh Tempo</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Nominal</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Status</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{item.nomorDokumen || "-"}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{item.vendor || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{item.tanggalFaktur || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{item.tanggalJatuhTempo || "-"}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatRupiah(item.nominal)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[item.status] || STATUS_BADGE.belum_bayar}`}>
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
            </table>
          </div>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing?.id ? "Edit Hutang Usaha" : "Tambah Hutang Usaha"}
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nomor Dokumen">
              <Input
                value={form.nomorDokumen}
                onChange={e => set("nomorDokumen", e.target.value)}
                placeholder="INV-2026-001"
              />
            </Field>
            <Field label="Vendor">
              <Input
                value={form.vendor}
                onChange={e => set("vendor", e.target.value)}
                placeholder="Nama vendor / pemasok"
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Tanggal Faktur">
              <Input
                type="date"
                value={form.tanggalFaktur}
                onChange={e => set("tanggalFaktur", e.target.value)}
              />
            </Field>
            <Field label="Tanggal Jatuh Tempo">
              <Input
                type="date"
                value={form.tanggalJatuhTempo}
                onChange={e => set("tanggalJatuhTempo", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Keterangan">
            <Input
              value={form.keterangan}
              onChange={e => set("keterangan", e.target.value)}
              placeholder="Deskripsi tagihan"
            />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nominal (Rp)">
              <Input
                type="number"
                value={form.nominal}
                onChange={e => set("nominal", e.target.value)}
                placeholder="0"
              />
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={e => set("status", e.target.value)}>
                <option value="belum_bayar">Belum Bayar</option>
                <option value="sebagian">Sebagian</option>
                <option value="lunas">Lunas</option>
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
