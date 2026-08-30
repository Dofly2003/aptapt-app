import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import {
  AdminPageHeader, Button, Modal, Field, Input, Select, TextArea, EmptyState, useToast,
} from "../../components/admin/AdminUI";
import {
  getAllAbsensi, createAbsensi, updateAbsensi, removeAbsensi,
} from "../../services/sdmService";

const EMPTY = {
  karyawanNama: "", nik: "", tanggal: "",
  jamMasuk: "", jamKeluar: "", keterangan: "", status: "hadir",
};

const STATUS_BADGE = {
  hadir: "bg-emerald-100 text-emerald-700",
  sakit: "bg-blue-100 text-blue-700",
  izin:  "bg-amber-100 text-amber-700",
  alfa:  "bg-red-100 text-red-700",
};

export default function Absensi() {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState(EMPTY);
  const { show, Toast }       = useToast();

  const load = async () => {
    setLoading(true);
    try { setItems(await getAllAbsensi()); }
    catch { show("Gagal memuat data", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (item) => { setEditing(item); setForm({ ...item }); setModal(true); };
  const set      = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    try {
      if (editing?.id) await updateAbsensi(editing.id, form);
      else await createAbsensi(form);
      show("Tersimpan"); setModal(false); load();
    } catch { show("Gagal menyimpan", "error"); }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Hapus absensi "${item.karyawanNama} - ${item.tanggal}"?`)) return;
    try { await removeAbsensi(item.id); show("Terhapus"); load(); }
    catch { show("Gagal menghapus", "error"); }
  };

  const summary = {
    hadir: items.filter(i => i.status === "hadir").length,
    sakit: items.filter(i => i.status === "sakit").length,
    izin:  items.filter(i => i.status === "izin").length,
    alfa:  items.filter(i => i.status === "alfa").length,
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <Toast />
      <AdminPageHeader
        title="Absensi Karyawan"
        description="Rekap kehadiran dan ketidakhadiran karyawan."
        actions={<Button onClick={openAdd}><Plus className="w-4 h-4" /> Catat Absensi</Button>}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Hadir", val: summary.hadir, color: "text-emerald-600 bg-emerald-50" },
          { label: "Sakit", val: summary.sakit, color: "text-blue-600 bg-blue-50" },
          { label: "Izin",  val: summary.izin,  color: "text-amber-600 bg-amber-50" },
          { label: "Alfa",  val: summary.alfa,  color: "text-red-600 bg-red-50" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-4 ${s.color}`}>
            <div className="text-2xl font-bold">{s.val}</div>
            <div className="text-sm font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Memuat...</div>
      ) : !items.length ? (
        <EmptyState
          title="Belum ada data absensi"
          description="Tambahkan catatan absensi harian karyawan."
          action={<Button onClick={openAdd}><Plus className="w-4 h-4" /> Catat</Button>}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Karyawan</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Tanggal</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Jam Masuk</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Jam Keluar</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Keterangan</th>
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
                    <td className="px-4 py-3 text-slate-600">{item.tanggal || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{item.jamMasuk || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{item.jamKeluar || "-"}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">{item.keterangan || "-"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[item.status] || "bg-slate-100 text-slate-600"}`}>
                        {item.status}
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
        title={editing?.id ? "Edit Absensi" : "Catat Absensi"} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nama Karyawan"><Input value={form.karyawanNama} onChange={e => set("karyawanNama", e.target.value)} placeholder="Ahmad Fajar" /></Field>
            <Field label="NIK"><Input value={form.nik} onChange={e => set("nik", e.target.value)} placeholder="K-001" /></Field>
            <Field label="Tanggal"><Input type="date" value={form.tanggal} onChange={e => set("tanggal", e.target.value)} /></Field>
            <Field label="Status">
              <Select value={form.status} onChange={e => set("status", e.target.value)}>
                <option value="hadir">Hadir</option>
                <option value="sakit">Sakit</option>
                <option value="izin">Izin</option>
                <option value="alfa">Alfa</option>
              </Select>
            </Field>
            <Field label="Jam Masuk"><Input type="time" value={form.jamMasuk} onChange={e => set("jamMasuk", e.target.value)} /></Field>
            <Field label="Jam Keluar"><Input type="time" value={form.jamKeluar} onChange={e => set("jamKeluar", e.target.value)} /></Field>
          </div>
          <Field label="Keterangan">
            <TextArea rows={2} value={form.keterangan} onChange={e => set("keterangan", e.target.value)} placeholder="Catatan tambahan..." />
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
