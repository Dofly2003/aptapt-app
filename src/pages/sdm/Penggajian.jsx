import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import {
  AdminPageHeader, Button, Modal, Field, Input, Select, EmptyState, useToast,
} from "../../components/admin/AdminUI";
import {
  getAllPenggajian, createPenggajian, updatePenggajian, removePenggajian, hitungGajiBersih,
} from "../../services/sdmService";
import { formatRupiah } from "../../services/keuanganService";

const EMPTY = {
  karyawanNama: "", nik: "", periode: "", gajiBruto: "",
  potonganPersen: "0", tunjanganTransport: "0", tunjanganMakan: "0",
  keterangan: "", status: "draft",
};

const STATUS_BADGE = {
  draft:   "bg-amber-100 text-amber-700",
  dibayar: "bg-emerald-100 text-emerald-700",
};

export default function Penggajian() {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState(EMPTY);
  const { show, Toast }       = useToast();

  const load = async () => {
    setLoading(true);
    try { setItems(await getAllPenggajian()); }
    catch { show("Gagal memuat data", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (item) => { setEditing(item); setForm({ ...item }); setModal(true); };
  const set      = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const totalGaji = (f) => {
    const bersih = hitungGajiBersih(Number(f.gajiBruto) || 0, Number(f.potonganPersen) || 0);
    return bersih + (Number(f.tunjanganTransport) || 0) + (Number(f.tunjanganMakan) || 0);
  };

  const handleSave = async () => {
    const payload = { ...form, totalGaji: totalGaji(form) };
    try {
      if (editing?.id) await updatePenggajian(editing.id, payload);
      else await createPenggajian(payload);
      show("Tersimpan"); setModal(false); load();
    } catch { show("Gagal menyimpan", "error"); }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Hapus data penggajian "${item.karyawanNama} - ${item.periode}"?`)) return;
    try { await removePenggajian(item.id); show("Terhapus"); load(); }
    catch { show("Gagal menghapus", "error"); }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <Toast />
      <AdminPageHeader
        title="Penggajian"
        description="Kelola data penggajian dan tunjangan karyawan."
        actions={<Button onClick={openAdd}><Plus className="w-4 h-4" /> Tambah Slip Gaji</Button>}
      />

      {loading ? (
        <div className="text-center py-12 text-slate-500">Memuat...</div>
      ) : !items.length ? (
        <EmptyState
          title="Belum ada data penggajian"
          description="Tambahkan slip gaji karyawan untuk periode ini."
          action={<Button onClick={openAdd}><Plus className="w-4 h-4" /> Tambah</Button>}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Karyawan</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Periode</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Gaji Bruto</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Tunjangan</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Total Bersih</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Status</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{item.karyawanNama || "-"}</div>
                      <div className="text-xs text-slate-400">{item.nik}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.periode || "-"}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatRupiah(item.gajiBruto)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {formatRupiah((Number(item.tunjanganTransport) || 0) + (Number(item.tunjanganMakan) || 0))}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatRupiah(item.totalGaji)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[item.status] || "bg-slate-100 text-slate-600"}`}>
                        {item.status === "dibayar" ? "Dibayar" : "Draft"}
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
        title={editing?.id ? "Edit Penggajian" : "Tambah Penggajian"} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nama Karyawan"><Input value={form.karyawanNama} onChange={e => set("karyawanNama", e.target.value)} placeholder="Ahmad Fajar" /></Field>
            <Field label="NIK"><Input value={form.nik} onChange={e => set("nik", e.target.value)} placeholder="K-001" /></Field>
            <Field label="Periode (Bulan/Tahun)"><Input value={form.periode} onChange={e => set("periode", e.target.value)} placeholder="Mei 2026" /></Field>
            <Field label="Gaji Bruto (Rp)"><Input type="number" value={form.gajiBruto} onChange={e => set("gajiBruto", e.target.value)} placeholder="5000000" /></Field>
            <Field label="Potongan (%)"><Input type="number" value={form.potonganPersen} onChange={e => set("potonganPersen", e.target.value)} placeholder="5" /></Field>
            <Field label="Tunjangan Transport (Rp)"><Input type="number" value={form.tunjanganTransport} onChange={e => set("tunjanganTransport", e.target.value)} placeholder="300000" /></Field>
            <Field label="Tunjangan Makan (Rp)"><Input type="number" value={form.tunjanganMakan} onChange={e => set("tunjanganMakan", e.target.value)} placeholder="200000" /></Field>
            <Field label="Status">
              <Select value={form.status} onChange={e => set("status", e.target.value)}>
                <option value="draft">Draft</option>
                <option value="dibayar">Dibayar</option>
              </Select>
            </Field>
          </div>
          <div className="bg-emerald-50 rounded-lg px-4 py-3 text-sm text-emerald-800">
            Total Bersih: <span className="font-bold">{formatRupiah(totalGaji(form))}</span>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setModal(false)}>Batal</Button>
            <Button onClick={handleSave}>Simpan</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
