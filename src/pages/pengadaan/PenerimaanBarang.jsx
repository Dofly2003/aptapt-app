import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import {
  AdminPageHeader, Button, Modal, Field, Input, TextArea, Select, EmptyState, useToast,
} from "../../components/admin/AdminUI";
import {
  getAllPenerimaan, createPenerimaan, updatePenerimaan, removePenerimaan,
  getAllPurchaseOrder,
} from "../../services/pengadaanService";

const EMPTY = {
  noPO: "",
  namaBarang: "",
  jumlah: "",
  satuan: "",
  kondisi: "baik",
  tanggalTerima: "",
  catatan: "",
};

const KONDISI_BADGE = {
  baik:   "bg-emerald-100 text-emerald-700",
  rusak:  "bg-red-100 text-red-700",
  cacat:  "bg-amber-100 text-amber-700",
};

const KONDISI_LABEL = {
  baik:  "Baik",
  rusak: "Rusak",
  cacat: "Cacat",
};

export default function PenerimaanBarang() {
  const [items, setItems]     = useState([]);
  const [poList, setPoList]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState(EMPTY);
  const { show, Toast }       = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [penerimaan, po] = await Promise.all([getAllPenerimaan(), getAllPurchaseOrder()]);
      setItems(penerimaan);
      setPoList(po);
    } catch {
      show("Gagal memuat data penerimaan barang", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (item) => { setEditing(item); setForm({ ...item }); setModal(true); };
  const set      = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.namaBarang.trim()) { show("Nama barang wajib diisi", "error"); return; }
    if (!form.jumlah || Number(form.jumlah) <= 0) { show("Jumlah harus lebih dari 0", "error"); return; }
    if (!form.tanggalTerima) { show("Tanggal terima wajib diisi", "error"); return; }
    try {
      if (editing?.id) await updatePenerimaan(editing.id, form);
      else await createPenerimaan(form);
      show("Data penerimaan berhasil disimpan");
      setModal(false);
      load();
    } catch {
      show("Gagal menyimpan data penerimaan", "error");
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Hapus penerimaan barang "${item.namaBarang}"?`)) return;
    try {
      await removePenerimaan(item.id);
      show("Data berhasil dihapus");
      load();
    } catch {
      show("Gagal menghapus data", "error");
    }
  };

  const totalItem  = items.length;
  const totalBaik  = items.filter(i => i.kondisi === "baik").length;
  const totalRusak = items.filter(i => i.kondisi === "rusak" || i.kondisi === "cacat").length;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <Toast />
      <AdminPageHeader
        title="Penerimaan Barang"
        description="Catat dan kelola barang yang diterima dari vendor sesuai Purchase Order."
        actions={
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4" /> Tambah Penerimaan
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Total Penerimaan</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalItem}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4">
          <p className="text-sm text-emerald-600">Kondisi Baik</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{totalBaik}</p>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-100 p-4">
          <p className="text-sm text-red-600">Rusak / Cacat</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{totalRusak}</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
          Memuat data...
        </div>
      ) : !items.length ? (
        <EmptyState
          title="Belum ada penerimaan barang"
          description="Catat penerimaan barang dari vendor untuk melacak stok masuk."
          action={<Button onClick={openAdd}><Plus className="w-4 h-4" /> Tambah Penerimaan</Button>}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">No. PO</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Nama Barang</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Jumlah</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Satuan</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Tgl Terima</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">Kondisi</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{item.noPO || "—"}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{item.namaBarang || "—"}</td>
                    <td className="px-4 py-3 text-slate-700">{item.jumlah || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{item.satuan || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{item.tanggalTerima || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${KONDISI_BADGE[item.kondisi] || "bg-slate-100 text-slate-600"}`}>
                        {KONDISI_LABEL[item.kondisi] || item.kondisi}
                      </span>
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
            </table>
          </div>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModal(false)}
        title={editing?.id ? "Edit Penerimaan Barang" : "Tambah Penerimaan Barang"}
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nomor PO (Referensi)">
            <Select value={form.noPO} onChange={e => set("noPO", e.target.value)}>
              <option value="">— Pilih PO —</option>
              {poList.map(po => (
                <option key={po.id} value={po.nomorPO}>{po.nomorPO} — {po.vendorNama}</option>
              ))}
            </Select>
          </Field>
          <Field label="Nama Barang" required>
            <Input
              value={form.namaBarang}
              onChange={e => set("namaBarang", e.target.value)}
              placeholder="Contoh: Kabel NYY 4x10mm"
            />
          </Field>
          <Field label="Jumlah" required>
            <Input
              type="number"
              min="0"
              value={form.jumlah}
              onChange={e => set("jumlah", e.target.value)}
              placeholder="0"
            />
          </Field>
          <Field label="Satuan">
            <Input
              value={form.satuan}
              onChange={e => set("satuan", e.target.value)}
              placeholder="pcs / meter / kg / roll"
            />
          </Field>
          <Field label="Tanggal Terima" required>
            <Input
              type="date"
              value={form.tanggalTerima}
              onChange={e => set("tanggalTerima", e.target.value)}
            />
          </Field>
          <Field label="Kondisi Barang">
            <Select value={form.kondisi} onChange={e => set("kondisi", e.target.value)}>
              <option value="baik">Baik</option>
              <option value="cacat">Cacat</option>
              <option value="rusak">Rusak</option>
            </Select>
          </Field>
        </div>
        <Field label="Catatan">
          <TextArea
            rows={3}
            value={form.catatan}
            onChange={e => set("catatan", e.target.value)}
            placeholder="Catatan tambahan mengenai kondisi atau jumlah barang..."
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
