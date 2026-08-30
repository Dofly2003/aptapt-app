import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import {
  AdminPageHeader, Button, Modal, Field, Input, Select, TextArea, EmptyState, useToast,
} from "../../components/admin/AdminUI";
import {
  getAllPergerakan, createPergerakan, updatePergerakan, removePergerakan,
} from "../../services/inventoriService";

const EMPTY = {
  tanggal: "", produkNama: "", kodeProduk: "", tipe: "masuk",
  jumlah: "", keterangan: "", referensi: "",
};

export default function PergerakanStok() {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState(EMPTY);
  const { show, Toast }       = useToast();

  const load = async () => {
    setLoading(true);
    try { setItems(await getAllPergerakan()); }
    catch { show("Gagal memuat data", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (item) => { setEditing(item); setForm({ ...item }); setModal(true); };
  const set      = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    try {
      if (editing?.id) await updatePergerakan(editing.id, form);
      else await createPergerakan(form);
      show("Tersimpan"); setModal(false); load();
    } catch { show("Gagal menyimpan", "error"); }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Hapus pergerakan stok ini?`)) return;
    try { await removePergerakan(item.id); show("Terhapus"); load(); }
    catch { show("Gagal menghapus", "error"); }
  };

  const totalMasuk  = items.filter(i => i.tipe === "masuk").reduce((s, i)  => s + (Number(i.jumlah) || 0), 0);
  const totalKeluar = items.filter(i => i.tipe === "keluar").reduce((s, i) => s + (Number(i.jumlah) || 0), 0);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <Toast />
      <AdminPageHeader
        title="Pergerakan Stok"
        description="Riwayat barang masuk dan keluar dari gudang."
        actions={<Button onClick={openAdd}><Plus className="w-4 h-4" /> Catat Pergerakan</Button>}
      />

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-emerald-50 rounded-xl p-4 flex items-center gap-3">
          <ArrowDown className="w-8 h-8 text-emerald-600" />
          <div>
            <div className="text-2xl font-bold text-emerald-700">{totalMasuk}</div>
            <div className="text-sm text-emerald-600">Total Masuk</div>
          </div>
        </div>
        <div className="bg-red-50 rounded-xl p-4 flex items-center gap-3">
          <ArrowUp className="w-8 h-8 text-red-600" />
          <div>
            <div className="text-2xl font-bold text-red-700">{totalKeluar}</div>
            <div className="text-sm text-red-600">Total Keluar</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Memuat...</div>
      ) : !items.length ? (
        <EmptyState
          title="Belum ada pergerakan stok"
          description="Catat transaksi barang masuk atau keluar dari gudang."
          action={<Button onClick={openAdd}><Plus className="w-4 h-4" /> Catat</Button>}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Tanggal</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Produk</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Tipe</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Jumlah</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Referensi</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Keterangan</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">{item.tanggal || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{item.produkNama || "-"}</div>
                      <div className="text-xs text-slate-400">{item.kodeProduk}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${item.tipe === "masuk" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {item.tipe === "masuk" ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />}
                        {item.tipe === "masuk" ? "Masuk" : "Keluar"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-900">{item.jumlah || 0}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{item.referensi || "-"}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">{item.keterangan || "-"}</td>
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
        title={editing?.id ? "Edit Pergerakan" : "Catat Pergerakan Stok"} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Tanggal"><Input type="date" value={form.tanggal} onChange={e => set("tanggal", e.target.value)} /></Field>
            <Field label="Tipe">
              <Select value={form.tipe} onChange={e => set("tipe", e.target.value)}>
                <option value="masuk">Barang Masuk</option>
                <option value="keluar">Barang Keluar</option>
              </Select>
            </Field>
            <Field label="Nama Produk"><Input value={form.produkNama} onChange={e => set("produkNama", e.target.value)} placeholder="Kabel NYY 4x10mm" /></Field>
            <Field label="Kode Produk"><Input value={form.kodeProduk} onChange={e => set("kodeProduk", e.target.value)} placeholder="PRD-001" /></Field>
            <Field label="Jumlah"><Input type="number" value={form.jumlah} onChange={e => set("jumlah", e.target.value)} placeholder="10" /></Field>
            <Field label="Referensi (No. PO/SO)"><Input value={form.referensi} onChange={e => set("referensi", e.target.value)} placeholder="PO-2026-001" /></Field>
          </div>
          <Field label="Keterangan">
            <TextArea rows={2} value={form.keterangan} onChange={e => set("keterangan", e.target.value)} placeholder="Keterangan pergerakan stok..." />
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
