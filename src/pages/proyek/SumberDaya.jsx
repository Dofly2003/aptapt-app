import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import {
  AdminPageHeader, Button, Modal, Field, Input, TextArea, Select, EmptyState, useToast,
} from "../../components/admin/AdminUI";
import {
  getAllSumber, createSumber, updateSumber, removeSumber,
  getAllProyek, formatRupiah,
} from "../../services/proyekService";

const EMPTY = {
  nama: "",
  tipe: "manusia",
  biaya: "",
  satuan: "",
  proyekId: "",
  catatan: "",
};

const TIPE_BADGE = {
  manusia:    "bg-blue-100 text-blue-700",
  material:   "bg-amber-100 text-amber-700",
  peralatan:  "bg-slate-100 text-slate-700",
};

const TIPE_LABEL = {
  manusia:   "Manusia",
  material:  "Material",
  peralatan: "Peralatan",
};

export default function SumberDaya() {
  const [items, setItems]       = useState([]);
  const [proyekList, setProyek] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modalOpen, setModal]   = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(EMPTY);
  const [filterTipe, setFilter] = useState("semua");
  const { show, Toast }         = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [sumber, proyek] = await Promise.all([getAllSumber(), getAllProyek()]);
      setItems(sumber);
      setProyek(proyek);
    } catch {
      show("Gagal memuat data sumber daya", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (item) => { setEditing(item); setForm({ ...item }); setModal(true); };
  const set      = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.nama.trim()) { show("Nama sumber daya wajib diisi", "error"); return; }
    try {
      if (editing?.id) await updateSumber(editing.id, form);
      else await createSumber(form);
      show("Data sumber daya berhasil disimpan");
      setModal(false);
      load();
    } catch {
      show("Gagal menyimpan data sumber daya", "error");
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Hapus sumber daya "${item.nama}"?`)) return;
    try {
      await removeSumber(item.id);
      show("Data berhasil dihapus");
      load();
    } catch {
      show("Gagal menghapus data", "error");
    }
  };

  const getProyekNama = (id) => proyekList.find(p => p.id === id)?.namaProyek || id || "—";

  const displayed = filterTipe === "semua" ? items : items.filter(i => i.tipe === filterTipe);

  const totalBiaya = items.reduce((s, i) => s + (Number(i.biaya) || 0), 0);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <Toast />
      <AdminPageHeader
        title="Sumber Daya Proyek"
        description="Kelola sumber daya yang digunakan dalam setiap proyek."
        actions={
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4" /> Tambah Sumber Daya
          </Button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Total Sumber Daya</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{items.length}</p>
        </div>
        {["manusia", "material", "peralatan"].map(tipe => (
          <div key={tipe} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">{TIPE_LABEL[tipe]}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {items.filter(i => i.tipe === tipe).length}
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm text-slate-500 font-medium">Filter:</span>
        {["semua", "manusia", "material", "peralatan"].map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
              filterTipe === t
                ? "bg-amber-500 text-white border-amber-500"
                : "bg-white text-slate-600 border-slate-200 hover:border-amber-300"
            }`}
          >
            {t === "semua" ? "Semua" : TIPE_LABEL[t]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
          Memuat data...
        </div>
      ) : !displayed.length ? (
        <EmptyState
          title="Belum ada sumber daya"
          description="Tambahkan sumber daya seperti tenaga kerja, material, atau peralatan proyek."
          action={<Button onClick={openAdd}><Plus className="w-4 h-4" /> Tambah Sumber Daya</Button>}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Nama</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Tipe</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Proyek</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Biaya / Satuan</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayed.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{item.nama}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${TIPE_BADGE[item.tipe] || "bg-slate-100 text-slate-600"}`}>
                        {TIPE_LABEL[item.tipe] || item.tipe}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{getProyekNama(item.proyekId)}</td>
                    <td className="px-4 py-3 text-slate-700">
                      <span className="font-semibold">{formatRupiah(item.biaya)}</span>
                      {item.satuan && <span className="text-slate-400 ml-1">/ {item.satuan}</span>}
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
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-sm text-slate-500">
                    {displayed.length} sumber daya ditampilkan
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">
                    {formatRupiah(totalBiaya)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModal(false)}
        title={editing?.id ? "Edit Sumber Daya" : "Tambah Sumber Daya"}
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nama Sumber Daya" required>
            <Input
              value={form.nama}
              onChange={e => set("nama", e.target.value)}
              placeholder="Contoh: Teknisi Listrik, Kabel, Genset"
            />
          </Field>
          <Field label="Tipe">
            <Select value={form.tipe} onChange={e => set("tipe", e.target.value)}>
              <option value="manusia">Manusia</option>
              <option value="material">Material</option>
              <option value="peralatan">Peralatan</option>
            </Select>
          </Field>
          <Field label="Biaya (Rp)">
            <Input
              type="number"
              min="0"
              value={form.biaya}
              onChange={e => set("biaya", e.target.value)}
              placeholder="0"
            />
          </Field>
          <Field label="Satuan">
            <Input
              value={form.satuan}
              onChange={e => set("satuan", e.target.value)}
              placeholder="hari / unit / meter / jam"
            />
          </Field>
          <Field label="Proyek">
            <Select value={form.proyekId} onChange={e => set("proyekId", e.target.value)}>
              <option value="">— Pilih Proyek —</option>
              {proyekList.map(p => (
                <option key={p.id} value={p.id}>{p.namaProyek || p.id}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Catatan">
          <TextArea
            rows={2}
            value={form.catatan}
            onChange={e => set("catatan", e.target.value)}
            placeholder="Keterangan tambahan..."
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
