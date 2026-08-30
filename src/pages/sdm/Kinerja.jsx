import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import {
  AdminPageHeader, Button, Modal, Field, Input, Select, TextArea, EmptyState, useToast,
} from "../../components/admin/AdminUI";
import {
  getAllKinerja, createKinerja, updateKinerja, removeKinerja,
} from "../../services/sdmService";

const EMPTY = {
  karyawanNama: "", nik: "", jabatan: "", periode: "",
  skorKerja: "", skorDisiplin: "", skorKomunikasi: "", keterangan: "", status: "draft",
};

const STATUS_BADGE = {
  draft: "bg-amber-100 text-amber-700",
  final: "bg-emerald-100 text-emerald-700",
};

function skorWarna(n) {
  const v = Number(n);
  if (v >= 80) return "text-emerald-600";
  if (v >= 60) return "text-amber-600";
  return "text-red-600";
}

export default function Kinerja() {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState(EMPTY);
  const { show, Toast }       = useToast();

  const load = async () => {
    setLoading(true);
    try { setItems(await getAllKinerja()); }
    catch { show("Gagal memuat data", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (item) => { setEditing(item); setForm({ ...item }); setModal(true); };
  const set      = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const rataRata = (f) => {
    const vals = [f.skorKerja, f.skorDisiplin, f.skorKomunikasi].map(Number).filter(v => !isNaN(v) && v > 0);
    if (!vals.length) return 0;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  };

  const handleSave = async () => {
    const payload = { ...form, skorRataRata: rataRata(form) };
    try {
      if (editing?.id) await updateKinerja(editing.id, payload);
      else await createKinerja(payload);
      show("Tersimpan"); setModal(false); load();
    } catch { show("Gagal menyimpan", "error"); }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Hapus penilaian kinerja "${item.karyawanNama} - ${item.periode}"?`)) return;
    try { await removeKinerja(item.id); show("Terhapus"); load(); }
    catch { show("Gagal menghapus", "error"); }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <Toast />
      <AdminPageHeader
        title="Penilaian Kinerja"
        description="Evaluasi performa karyawan per periode."
        actions={<Button onClick={openAdd}><Plus className="w-4 h-4" /> Tambah Penilaian</Button>}
      />

      {loading ? (
        <div className="text-center py-12 text-slate-500">Memuat...</div>
      ) : !items.length ? (
        <EmptyState
          title="Belum ada penilaian kinerja"
          description="Tambahkan penilaian untuk mengevaluasi performa karyawan."
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
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Kerja</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Disiplin</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Komunikasi</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Rata-rata</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Status</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{item.karyawanNama || "-"}</div>
                      <div className="text-xs text-slate-400">{item.jabatan}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.periode || "-"}</td>
                    <td className={`px-4 py-3 text-center font-medium ${skorWarna(item.skorKerja)}`}>{item.skorKerja || "-"}</td>
                    <td className={`px-4 py-3 text-center font-medium ${skorWarna(item.skorDisiplin)}`}>{item.skorDisiplin || "-"}</td>
                    <td className={`px-4 py-3 text-center font-medium ${skorWarna(item.skorKomunikasi)}`}>{item.skorKomunikasi || "-"}</td>
                    <td className={`px-4 py-3 text-center text-lg font-bold ${skorWarna(item.skorRataRata)}`}>{item.skorRataRata || "-"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[item.status] || "bg-slate-100 text-slate-600"}`}>
                        {item.status === "final" ? "Final" : "Draft"}
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
        title={editing?.id ? "Edit Penilaian" : "Tambah Penilaian Kinerja"} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nama Karyawan"><Input value={form.karyawanNama} onChange={e => set("karyawanNama", e.target.value)} placeholder="Ahmad Fajar" /></Field>
            <Field label="Jabatan"><Input value={form.jabatan} onChange={e => set("jabatan", e.target.value)} placeholder="Teknisi Lapangan" /></Field>
            <Field label="NIK"><Input value={form.nik} onChange={e => set("nik", e.target.value)} placeholder="K-001" /></Field>
            <Field label="Periode"><Input value={form.periode} onChange={e => set("periode", e.target.value)} placeholder="Q1 2026 / Jan-Mar 2026" /></Field>
            <Field label="Skor Kualitas Kerja (0-100)"><Input type="number" min="0" max="100" value={form.skorKerja} onChange={e => set("skorKerja", e.target.value)} placeholder="85" /></Field>
            <Field label="Skor Disiplin (0-100)"><Input type="number" min="0" max="100" value={form.skorDisiplin} onChange={e => set("skorDisiplin", e.target.value)} placeholder="90" /></Field>
            <Field label="Skor Komunikasi (0-100)"><Input type="number" min="0" max="100" value={form.skorKomunikasi} onChange={e => set("skorKomunikasi", e.target.value)} placeholder="80" /></Field>
            <Field label="Status">
              <Select value={form.status} onChange={e => set("status", e.target.value)}>
                <option value="draft">Draft</option>
                <option value="final">Final</option>
              </Select>
            </Field>
          </div>
          {(form.skorKerja || form.skorDisiplin || form.skorKomunikasi) && (
            <div className={`rounded-lg px-4 py-3 text-sm font-medium ${skorWarna(rataRata(form)) === "text-emerald-600" ? "bg-emerald-50 text-emerald-800" : skorWarna(rataRata(form)) === "text-amber-600" ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-800"}`}>
              Rata-rata Skor: <span className="font-bold text-lg">{rataRata(form)}</span>
            </div>
          )}
          <Field label="Keterangan / Catatan Evaluasi">
            <TextArea rows={3} value={form.keterangan} onChange={e => set("keterangan", e.target.value)} placeholder="Catatan evaluasi karyawan..." />
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
