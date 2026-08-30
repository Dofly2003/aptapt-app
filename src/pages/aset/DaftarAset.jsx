import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import {
  AdminPageHeader, Button, Modal, Field, Input, Select, TextArea, EmptyState, useToast,
} from "../../components/admin/AdminUI";
import {
  getAllAset, createAset, updateAset, removeAset, formatRupiah,
} from "../../services/asetService";

const EMPTY = {
  kodeAset: "", namaAset: "", kategori: "", lokasi: "",
  tanggalBeli: "", nilaiPerolehan: "", nilaiBuku: "",
  kondisi: "baik", status: "aktif", keterangan: "",
};

const KONDISI_BADGE = {
  baik:      "bg-emerald-100 text-emerald-700",
  perbaikan: "bg-amber-100 text-amber-700",
  rusak:     "bg-red-100 text-red-700",
};

export default function DaftarAset() {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState(EMPTY);
  const { show, Toast }       = useToast();

  const load = async () => {
    setLoading(true);
    try { setItems(await getAllAset()); }
    catch { show("Gagal memuat data", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (item) => { setEditing(item); setForm({ ...item }); setModal(true); };
  const set      = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    try {
      if (editing?.id) await updateAset(editing.id, form);
      else await createAset(form);
      show("Tersimpan"); setModal(false); load();
    } catch { show("Gagal menyimpan", "error"); }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Hapus aset "${item.namaAset}"?`)) return;
    try { await removeAset(item.id); show("Terhapus"); load(); }
    catch { show("Gagal menghapus", "error"); }
  };

  const totalNilai = items.reduce((s, i) => s + (Number(i.nilaiBuku) || Number(i.nilaiPerolehan) || 0), 0);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <Toast />
      <AdminPageHeader
        title="Daftar Aset"
        description="Kelola inventaris aset perusahaan dan nilai depresiasinya."
        actions={<Button onClick={openAdd}><Plus className="w-4 h-4" /> Tambah Aset</Button>}
      />

      <div className="bg-slate-50 rounded-xl p-4 mb-4 text-sm">
        <span className="text-slate-500">Total Nilai Buku Aset: </span>
        <span className="font-bold text-slate-900">{formatRupiah(totalNilai)}</span>
        <span className="text-slate-400 ml-4">({items.length} aset terdaftar)</span>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Memuat...</div>
      ) : !items.length ? (
        <EmptyState
          title="Belum ada aset terdaftar"
          description="Daftarkan aset perusahaan untuk memudahkan pengelolaan dan maintenance."
          action={<Button onClick={openAdd}><Plus className="w-4 h-4" /> Tambah Aset</Button>}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Kode</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Nama Aset</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Kategori</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Lokasi</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Tgl Beli</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Nilai Perolehan</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Nilai Buku</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Kondisi</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{item.kodeAset || "-"}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{item.namaAset || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{item.kategori || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{item.lokasi || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{item.tanggalBeli || "-"}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatRupiah(item.nilaiPerolehan)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatRupiah(item.nilaiBuku || item.nilaiPerolehan)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${KONDISI_BADGE[item.kondisi] || "bg-slate-100 text-slate-600"}`}>
                        {item.kondisi}
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
        title={editing?.id ? "Edit Aset" : "Tambah Aset Baru"} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Kode Aset"><Input value={form.kodeAset} onChange={e => set("kodeAset", e.target.value)} placeholder="AST-001" /></Field>
            <Field label="Nama Aset"><Input value={form.namaAset} onChange={e => set("namaAset", e.target.value)} placeholder="Kendaraan Operasional" /></Field>
            <Field label="Kategori"><Input value={form.kategori} onChange={e => set("kategori", e.target.value)} placeholder="Kendaraan / Peralatan / Bangunan" /></Field>
            <Field label="Lokasi"><Input value={form.lokasi} onChange={e => set("lokasi", e.target.value)} placeholder="Kantor Pusat" /></Field>
            <Field label="Tanggal Pembelian"><Input type="date" value={form.tanggalBeli} onChange={e => set("tanggalBeli", e.target.value)} /></Field>
            <Field label="Kondisi">
              <Select value={form.kondisi} onChange={e => set("kondisi", e.target.value)}>
                <option value="baik">Baik</option>
                <option value="perbaikan">Dalam Perbaikan</option>
                <option value="rusak">Rusak</option>
              </Select>
            </Field>
            <Field label="Nilai Perolehan (Rp)"><Input type="number" value={form.nilaiPerolehan} onChange={e => set("nilaiPerolehan", e.target.value)} placeholder="0" /></Field>
            <Field label="Nilai Buku (Rp)"><Input type="number" value={form.nilaiBuku} onChange={e => set("nilaiBuku", e.target.value)} placeholder="0" /></Field>
            <Field label="Status">
              <Select value={form.status} onChange={e => set("status", e.target.value)}>
                <option value="aktif">Aktif</option>
                <option value="nonaktif">Nonaktif</option>
              </Select>
            </Field>
          </div>
          <Field label="Keterangan">
            <TextArea rows={2} value={form.keterangan} onChange={e => set("keterangan", e.target.value)} placeholder="Spesifikasi atau catatan tambahan..." />
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
