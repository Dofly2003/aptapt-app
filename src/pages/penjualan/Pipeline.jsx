import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import {
  AdminPageHeader, Button, Modal, Field, Input, TextArea, Select, EmptyState, useToast,
} from "../../components/admin/AdminUI";
import {
  getAllPipeline, createPipeline, updatePipeline, removePipeline, formatRupiah,
} from "../../services/penjualanService";

const EMPTY = {
  namaPelanggan: "",
  nilai: "",
  tahap: "prospek",
  tanggal: "",
  catatan: "",
};

const TAHAP_CONFIG = {
  prospek:    { label: "Prospek",    badge: "bg-blue-100 text-blue-700",    dot: "bg-blue-400" },
  negosiasi:  { label: "Negosiasi",  badge: "bg-amber-100 text-amber-700",  dot: "bg-amber-400" },
  deal:       { label: "Deal",       badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  gagal:      { label: "Gagal",      badge: "bg-red-100 text-red-700",      dot: "bg-red-400" },
};

const TAHAP_ORDER = ["prospek", "negosiasi", "deal", "gagal"];

export default function Pipeline() {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState(EMPTY);
  const [view, setView]       = useState("kanban"); // "kanban" | "list"
  const { show, Toast }       = useToast();

  const load = async () => {
    setLoading(true);
    try { setItems(await getAllPipeline()); }
    catch { show("Gagal memuat data pipeline", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (item) => { setEditing(item); setForm({ ...item }); setModal(true); };
  const set      = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.namaPelanggan.trim()) { show("Nama pelanggan wajib diisi", "error"); return; }
    if (!form.tanggal) { show("Tanggal wajib diisi", "error"); return; }
    try {
      if (editing?.id) await updatePipeline(editing.id, form);
      else await createPipeline(form);
      show("Data pipeline berhasil disimpan");
      setModal(false);
      load();
    } catch {
      show("Gagal menyimpan data pipeline", "error");
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Hapus pipeline "${item.namaPelanggan}"?`)) return;
    try {
      await removePipeline(item.id);
      show("Data berhasil dihapus");
      load();
    } catch {
      show("Gagal menghapus data", "error");
    }
  };

  const totalNilai = items.reduce((s, i) => s + (Number(i.nilai) || 0), 0);
  const totalDeal  = items.filter(i => i.tahap === "deal").reduce((s, i) => s + (Number(i.nilai) || 0), 0);
  const itemsByTahap = (tahap) => items.filter(i => i.tahap === tahap);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <Toast />
      <AdminPageHeader
        title="Pipeline Penjualan"
        description="Kelola dan pantau prospek penjualan dari tahap awal hingga deal."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
              <button
                onClick={() => setView("kanban")}
                className={`px-3 py-1.5 transition ${view === "kanban" ? "bg-amber-500 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
              >
                Kanban
              </button>
              <button
                onClick={() => setView("list")}
                className={`px-3 py-1.5 transition ${view === "list" ? "bg-amber-500 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
              >
                List
              </button>
            </div>
            <Button onClick={openAdd}>
              <Plus className="w-4 h-4" /> Tambah
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {TAHAP_ORDER.map(tahap => {
          const cfg = TAHAP_CONFIG[tahap];
          const count = itemsByTahap(tahap).length;
          const nilai = itemsByTahap(tahap).reduce((s, i) => s + (Number(i.nilai) || 0), 0);
          return (
            <div key={tahap} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                <p className="text-xs font-medium text-slate-500">{cfg.label}</p>
              </div>
              <p className="text-xl font-bold text-slate-900">{count}</p>
              <p className="text-xs text-slate-400 mt-0.5">{formatRupiah(nilai)}</p>
            </div>
          );
        })}
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
          Memuat data...
        </div>
      ) : !items.length ? (
        <EmptyState
          title="Belum ada data pipeline"
          description="Tambahkan prospek penjualan untuk mulai melacak pipeline Anda."
          action={<Button onClick={openAdd}><Plus className="w-4 h-4" /> Tambah Pipeline</Button>}
        />
      ) : view === "kanban" ? (
        /* ── Kanban View ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TAHAP_ORDER.map(tahap => {
            const cfg = TAHAP_CONFIG[tahap];
            const kolom = itemsByTahap(tahap);
            return (
              <div key={tahap} className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                <div className={`px-4 py-3 flex items-center justify-between border-b border-slate-200`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                    <span className="text-sm font-semibold text-slate-700">{cfg.label}</span>
                  </div>
                  <span className="text-xs bg-white border border-slate-200 text-slate-500 rounded-full px-2 py-0.5">
                    {kolom.length}
                  </span>
                </div>
                <div className="p-3 space-y-2 min-h-[160px]">
                  {kolom.map(item => (
                    <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
                      <p className="font-semibold text-slate-900 text-sm leading-snug">{item.namaPelanggan}</p>
                      {item.nilai && (
                        <p className="text-xs text-amber-600 font-medium mt-0.5">{formatRupiah(item.nilai)}</p>
                      )}
                      {item.tanggal && (
                        <p className="text-xs text-slate-400 mt-1">{item.tanggal}</p>
                      )}
                      {item.catatan && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.catatan}</p>
                      )}
                      <div className="flex justify-end gap-1 mt-2">
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1 rounded-md hover:bg-amber-50 text-amber-600 transition"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-1 rounded-md hover:bg-red-50 text-red-500 transition"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {!kolom.length && (
                    <p className="text-xs text-slate-400 text-center py-6">Kosong</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── List View ── */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Pelanggan</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Nilai</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Tahap</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Tanggal</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Catatan</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map(item => {
                  const cfg = TAHAP_CONFIG[item.tahap] || TAHAP_CONFIG.prospek;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{item.namaPelanggan}</td>
                      <td className="px-4 py-3 text-amber-600 font-semibold">{formatRupiah(item.nilai)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{item.tanggal || "—"}</td>
                      <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate">{item.catatan || "—"}</td>
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
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 text-sm text-slate-500 flex justify-between">
            <span>Total pipeline: <strong className="text-slate-700">{items.length}</strong> item</span>
            <span>Total nilai: <strong className="text-amber-600">{formatRupiah(totalNilai)}</strong> · Deal: <strong className="text-emerald-600">{formatRupiah(totalDeal)}</strong></span>
          </div>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModal(false)}
        title={editing?.id ? "Edit Pipeline" : "Tambah Pipeline Penjualan"}
        size="md"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nama Pelanggan" required>
            <Input
              value={form.namaPelanggan}
              onChange={e => set("namaPelanggan", e.target.value)}
              placeholder="PT. Maju Bersama"
            />
          </Field>
          <Field label="Nilai Potensi (Rp)">
            <Input
              type="number"
              min="0"
              value={form.nilai}
              onChange={e => set("nilai", e.target.value)}
              placeholder="0"
            />
          </Field>
          <Field label="Tahap">
            <Select value={form.tahap} onChange={e => set("tahap", e.target.value)}>
              <option value="prospek">Prospek</option>
              <option value="negosiasi">Negosiasi</option>
              <option value="deal">Deal</option>
              <option value="gagal">Gagal</option>
            </Select>
          </Field>
          <Field label="Tanggal" required>
            <Input
              type="date"
              value={form.tanggal}
              onChange={e => set("tanggal", e.target.value)}
            />
          </Field>
        </div>
        <Field label="Catatan">
          <TextArea
            rows={3}
            value={form.catatan}
            onChange={e => set("catatan", e.target.value)}
            placeholder="Detail prospek atau hasil diskusi..."
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
