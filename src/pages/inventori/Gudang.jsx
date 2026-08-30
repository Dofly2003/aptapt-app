import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Package } from "lucide-react";
import {
  AdminPageHeader, Button, Modal, Field, Input, Select, TextArea, EmptyState, useToast,
} from "../../components/admin/AdminUI";
import {
  getAllGudang, createGudang, updateGudang, removeGudang, getAllStok,
} from "../../services/inventoriService";

const EMPTY = {
  kodeGudang: "", namaGudang: "", lokasi: "",
  kapasitas: "", keterangan: "", status: "aktif",
};

const STATUS_BADGE = {
  aktif:    "bg-emerald-100 text-emerald-700",
  nonaktif: "bg-slate-100 text-slate-500",
};

export default function Gudang() {
  const [items, setItems]         = useState([]);
  const [stokMap, setStokMap]     = useState({});  // gudangId → count
  const [loading, setLoading]     = useState(true);
  const [modalOpen, setModal]     = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState(EMPTY);
  const { show, Toast }           = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [g, s] = await Promise.all([getAllGudang(), getAllStok()]);
      setItems(g);
      // build count map: gudangId → number of products
      const map = {};
      for (const barang of s) {
        if (barang.gudangId) map[barang.gudangId] = (map[barang.gudangId] || 0) + 1;
      }
      setStokMap(map);
    }
    catch { show("Gagal memuat data", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (item) => { setEditing(item); setForm({ ...item }); setModal(true); };
  const set      = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    try {
      if (editing?.id) await updateGudang(editing.id, form);
      else await createGudang(form);
      show("Tersimpan"); setModal(false); load();
    } catch { show("Gagal menyimpan", "error"); }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Hapus gudang "${item.namaGudang}"?`)) return;
    try { await removeGudang(item.id); show("Terhapus"); load(); }
    catch { show("Gagal menghapus", "error"); }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <Toast />
      <AdminPageHeader
        title="Master Gudang"
        description="Kelola lokasi penyimpanan dan kapasitas gudang."
        actions={<Button onClick={openAdd}><Plus className="w-4 h-4" /> Tambah Gudang</Button>}
      />

      {loading ? (
        <div className="text-center py-12 text-slate-500">Memuat...</div>
      ) : !items.length ? (
        <EmptyState
          title="Belum ada data gudang"
          description="Tambahkan gudang untuk mengelola lokasi penyimpanan barang."
          action={<Button onClick={openAdd}><Plus className="w-4 h-4" /> Tambah</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-semibold text-slate-900">{item.namaGudang || "-"}</div>
                  <div className="text-xs font-mono text-slate-400 mt-0.5">{item.kodeGudang}</div>
                </div>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[item.status] || STATUS_BADGE.aktif}`}>
                  {item.status === "nonaktif" ? "Nonaktif" : "Aktif"}
                </span>
              </div>
              <div className="space-y-1.5 text-sm text-slate-600 mb-4">
                <div><span className="text-slate-400">Lokasi:</span> {item.lokasi || "-"}</div>
                <div><span className="text-slate-400">Kapasitas:</span> {item.kapasitas || "-"}</div>
                <div className="flex items-center gap-1.5 mt-2">
                  <Package className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs font-semibold text-amber-700">
                    {stokMap[item.id] ?? 0} jenis produk tersimpan
                  </span>
                </div>
                {item.keterangan && <div className="text-xs text-slate-400 mt-1">{item.keterangan}</div>}
              </div>
              <div className="flex gap-2 border-t border-slate-100 pt-3">
                <button onClick={() => openEdit(item)} className="flex-1 py-1.5 text-xs rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 flex items-center justify-center gap-1">
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
                <button onClick={() => handleDelete(item)} className="flex-1 py-1.5 text-xs rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center gap-1">
                  <Trash2 className="w-3 h-3" /> Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModal(false)}
        title={editing?.id ? "Edit Gudang" : "Tambah Gudang"} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Kode Gudang"><Input value={form.kodeGudang} onChange={e => set("kodeGudang", e.target.value)} placeholder="GDG-001" /></Field>
            <Field label="Nama Gudang"><Input value={form.namaGudang} onChange={e => set("namaGudang", e.target.value)} placeholder="Gudang Utama" /></Field>
            <Field label="Lokasi"><Input value={form.lokasi} onChange={e => set("lokasi", e.target.value)} placeholder="Jl. Industri No. 1" /></Field>
            <Field label="Kapasitas"><Input value={form.kapasitas} onChange={e => set("kapasitas", e.target.value)} placeholder="500 m²" /></Field>
            <Field label="Status">
              <Select value={form.status} onChange={e => set("status", e.target.value)}>
                <option value="aktif">Aktif</option>
                <option value="nonaktif">Nonaktif</option>
              </Select>
            </Field>
          </div>
          <Field label="Keterangan">
            <TextArea rows={2} value={form.keterangan} onChange={e => set("keterangan", e.target.value)} placeholder="Informasi tambahan gudang..." />
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
