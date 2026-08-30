import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import {
  AdminPageHeader, Button, Modal, Field, Input, TextArea, Select, EmptyState, useToast,
} from "../../components/admin/AdminUI";
import {
  getAllInspeksi, createInspeksi, updateInspeksi, removeInspeksi,
  getAllWorkOrder,
} from "../../services/produksiService";

const EMPTY = {
  workOrderId: "",
  tanggal: "",
  hasil: "lulus",
  catatan: "",
  inspektor: "",
};

const HASIL_CONFIG = {
  lulus:          { label: "Lulus",          badge: "bg-emerald-100 text-emerald-700" },
  lulus_catatan:  { label: "Lulus (Catatan)",badge: "bg-amber-100 text-amber-700" },
  gagal:          { label: "Gagal",          badge: "bg-red-100 text-red-700" },
};

export default function InspeksiKualitas() {
  const [items, setItems]     = useState([]);
  const [woList, setWoList]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState(EMPTY);
  const [filterHasil, setFilterHasil] = useState("semua");
  const { show, Toast }       = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [inspeksi, wo] = await Promise.all([getAllInspeksi(), getAllWorkOrder()]);
      setItems(inspeksi);
      setWoList(wo);
    } catch {
      show("Gagal memuat data inspeksi kualitas", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (item) => { setEditing(item); setForm({ ...item }); setModal(true); };
  const set      = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.workOrderId) { show("Work Order wajib dipilih", "error"); return; }
    if (!form.tanggal) { show("Tanggal inspeksi wajib diisi", "error"); return; }
    if (!form.inspektor.trim()) { show("Nama inspektor wajib diisi", "error"); return; }
    try {
      if (editing?.id) await updateInspeksi(editing.id, form);
      else await createInspeksi(form);
      show("Data inspeksi berhasil disimpan");
      setModal(false);
      load();
    } catch {
      show("Gagal menyimpan data inspeksi", "error");
    }
  };

  const handleDelete = async (item) => {
    const label = getWoLabel(item.workOrderId);
    if (!confirm(`Hapus inspeksi untuk "${label}"?`)) return;
    try {
      await removeInspeksi(item.id);
      show("Data inspeksi berhasil dihapus");
      load();
    } catch {
      show("Gagal menghapus data inspeksi", "error");
    }
  };

  const getWoLabel = (id) => {
    const wo = woList.find(w => w.id === id);
    return wo ? (wo.nomorWO || wo.namaWO || id) : id || "—";
  };

  const displayed = filterHasil === "semua" ? items : items.filter(i => i.hasil === filterHasil);

  const countLulus = items.filter(i => i.hasil === "lulus" || i.hasil === "lulus_catatan").length;
  const countGagal = items.filter(i => i.hasil === "gagal").length;
  const pctLulus   = items.length > 0 ? Math.round((countLulus / items.length) * 100) : 0;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <Toast />
      <AdminPageHeader
        title="Inspeksi Kualitas"
        description="Catat dan lacak hasil inspeksi kualitas produksi berdasarkan Work Order."
        actions={
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4" /> Tambah Inspeksi
          </Button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Total Inspeksi</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{items.length}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4">
          <p className="text-sm text-emerald-600">Lulus</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{countLulus}</p>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-100 p-4">
          <p className="text-sm text-red-600">Gagal</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{countGagal}</p>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
          <p className="text-sm text-amber-600">Tingkat Kelulusan</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{pctLulus}%</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-sm text-slate-500 font-medium">Filter:</span>
        {["semua", "lulus", "lulus_catatan", "gagal"].map(h => (
          <button
            key={h}
            onClick={() => setFilterHasil(h)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
              filterHasil === h
                ? "bg-amber-500 text-white border-amber-500"
                : "bg-white text-slate-600 border-slate-200 hover:border-amber-300"
            }`}
          >
            {h === "semua" ? "Semua" : HASIL_CONFIG[h]?.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
          Memuat data...
        </div>
      ) : !displayed.length ? (
        <EmptyState
          title="Belum ada data inspeksi"
          description="Tambahkan hasil inspeksi kualitas untuk memantau mutu produksi."
          action={<Button onClick={openAdd}><Plus className="w-4 h-4" /> Tambah Inspeksi</Button>}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Work Order</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Tanggal</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Inspektor</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">Hasil</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Catatan</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayed.map(item => {
                  const hasilCfg = HASIL_CONFIG[item.hasil] || HASIL_CONFIG.lulus;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{getWoLabel(item.workOrderId)}</td>
                      <td className="px-4 py-3 text-slate-600">{item.tanggal || "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{item.inspektor || "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${hasilCfg.badge}`}>
                          {hasilCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 max-w-[240px] truncate">
                        {item.catatan || "—"}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModal(false)}
        title={editing?.id ? "Edit Inspeksi Kualitas" : "Tambah Inspeksi Kualitas"}
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Work Order" required>
            <Select value={form.workOrderId} onChange={e => set("workOrderId", e.target.value)}>
              <option value="">— Pilih Work Order —</option>
              {woList.map(wo => (
                <option key={wo.id} value={wo.id}>
                  {wo.nomorWO || wo.namaWO || wo.id}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tanggal Inspeksi" required>
            <Input
              type="date"
              value={form.tanggal}
              onChange={e => set("tanggal", e.target.value)}
            />
          </Field>
          <Field label="Inspektor" required>
            <Input
              value={form.inspektor}
              onChange={e => set("inspektor", e.target.value)}
              placeholder="Nama inspektor atau QC"
            />
          </Field>
          <Field label="Hasil Inspeksi">
            <Select value={form.hasil} onChange={e => set("hasil", e.target.value)}>
              <option value="lulus">Lulus</option>
              <option value="lulus_catatan">Lulus (dengan Catatan)</option>
              <option value="gagal">Gagal</option>
            </Select>
          </Field>
        </div>
        <Field label="Catatan / Temuan">
          <TextArea
            rows={3}
            value={form.catatan}
            onChange={e => set("catatan", e.target.value)}
            placeholder="Uraikan temuan inspeksi, ketidaksesuaian, atau rekomendasi perbaikan..."
          />
        </Field>
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-2">
          <Button variant="secondary" onClick={() => setModal(false)}>Batal</Button>
          <Button onClick={handleSave}>Simpan</Button>
        </div>
      </Modal>
    </div>
  );
}
