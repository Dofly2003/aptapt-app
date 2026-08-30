import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import {
  AdminPageHeader, Button, Modal, Field, Input, Select, EmptyState, useToast,
} from "../../components/admin/AdminUI";
import {
  getAllAnggaran, createAnggaran, updateAnggaran, removeAnggaran, formatRupiah,
} from "../../services/keuanganService";

const EMPTY = {
  departemen: "",
  periode: "",
  kategori: "",
  nominal: "",
  realisasi: "",
  keterangan: "",
};

function persen(nominal, realisasi) {
  const n = Number(nominal) || 0;
  const r = Number(realisasi) || 0;
  if (!n) return 0;
  return Math.round((r / n) * 100);
}

function ProgressBar({ pct }) {
  const color = pct > 95 ? "bg-red-500" : pct > 80 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="w-full bg-slate-100 rounded-full h-2 mt-1">
      <div
        className={`h-2 rounded-full transition-all ${color}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

export default function Anggaran() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const { show, Toast } = useToast();

  const load = async () => {
    setLoading(true);
    try { setItems(await getAllAnggaran()); }
    catch { show("Gagal memuat data", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setModalOpen(true); };
  const openEdit = (item) => { setEditing(item); setForm({ ...item }); setModalOpen(true); };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    try {
      if (editing?.id) await updateAnggaran(editing.id, form);
      else await createAnggaran(form);
      show("Tersimpan");
      setModalOpen(false);
      load();
    } catch { show("Gagal menyimpan", "error"); }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Hapus anggaran "${item.departemen} - ${item.periode}"?`)) return;
    try { await removeAnggaran(item.id); show("Terhapus"); load(); }
    catch { show("Gagal menghapus", "error"); }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <Toast />
      <AdminPageHeader
        title="Anggaran"
        description="Kelola anggaran departemen dan pantau realisasi pengeluaran."
        actions={
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4" /> Tambah Anggaran
          </Button>
        }
      />

      {loading ? (
        <div className="text-center py-12 text-slate-500">Memuat...</div>
      ) : !items.length ? (
        <EmptyState
          title="Belum ada data anggaran"
          description="Tambahkan anggaran departemen untuk mulai memantau realisasi."
          action={<Button onClick={openAdd}><Plus className="w-4 h-4" /> Tambah</Button>}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Departemen</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Periode</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Kategori</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Anggaran</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Realisasi</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Sisa</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 min-w-[140px]">% Terpakai</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map(item => {
                  const pct = persen(item.nominal, item.realisasi);
                  const sisa = (Number(item.nominal) || 0) - (Number(item.realisasi) || 0);
                  const pctColor = pct > 95 ? "text-red-700" : pct > 80 ? "text-amber-700" : "text-emerald-700";
                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{item.departemen || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{item.periode || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{item.kategori || "-"}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatRupiah(item.nominal)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatRupiah(item.realisasi)}</td>
                      <td className={`px-4 py-3 text-right font-medium ${sisa < 0 ? "text-red-600" : "text-slate-700"}`}>
                        {formatRupiah(sisa)}
                      </td>
                      <td className="px-4 py-3 min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold ${pctColor} w-10 shrink-0`}>{pct}%</span>
                          <div className="flex-1">
                            <ProgressBar pct={pct} />
                          </div>
                        </div>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing?.id ? "Edit Anggaran" : "Tambah Anggaran"}
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Departemen">
              <Input
                value={form.departemen}
                onChange={e => set("departemen", e.target.value)}
                placeholder="Teknik, Keuangan, dll."
              />
            </Field>
            <Field label="Periode">
              <Input
                value={form.periode}
                onChange={e => set("periode", e.target.value)}
                placeholder="2026-Q1"
              />
            </Field>
          </div>
          <Field label="Kategori">
            <Input
              value={form.kategori}
              onChange={e => set("kategori", e.target.value)}
              placeholder="Operasional, Pemeliharaan, dll."
            />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Anggaran / Nominal (Rp)">
              <Input
                type="number"
                value={form.nominal}
                onChange={e => set("nominal", e.target.value)}
                placeholder="0"
              />
            </Field>
            <Field label="Realisasi (Rp)">
              <Input
                type="number"
                value={form.realisasi}
                onChange={e => set("realisasi", e.target.value)}
                placeholder="0"
              />
            </Field>
          </div>
          <Field label="Keterangan">
            <Input
              value={form.keterangan}
              onChange={e => set("keterangan", e.target.value)}
              placeholder="Catatan tambahan"
            />
          </Field>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button onClick={handleSave}>Simpan</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
