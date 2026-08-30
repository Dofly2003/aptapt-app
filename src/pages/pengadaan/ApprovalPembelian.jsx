import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, CheckCircle } from "lucide-react";
import { AdminPageHeader, Button, Modal, Field, Input, TextArea, Select, EmptyState, useToast } from "../../components/admin/AdminUI";
import { getAllApproval, createApproval, updateApproval, removeApproval, formatRupiah } from "../../services/pengadaanService";

const EMPTY = {
  nomorDokumen: "",
  judul: "",
  pemohon: "",
  departemen: "",
  tanggalPengajuan: "",
  totalNominal: "",
  status: "pending",
  catatanApprover: "",
  approver: "",
  tanggalApproval: "",
};

const STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-700",
  disetujui: "bg-emerald-100 text-emerald-700",
  ditolak: "bg-red-100 text-red-700",
};

const STATUS_LABELS = {
  pending: "Pending",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
};

export default function ApprovalPembelian() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [approvalForm, setApprovalForm] = useState({ status: "disetujui", catatanApprover: "", approver: "", tanggalApproval: "" });
  const { show, Toast } = useToast();

  const load = async () => {
    setLoading(true);
    try { setItems(await getAllApproval()); }
    catch { show("Gagal memuat", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setModalOpen(true); };
  const openEdit = (item) => { setEditing(item); setForm({ ...item }); setModalOpen(true); };
  const openApproval = (item) => {
    setEditing(item);
    setApprovalForm({
      status: item.status === "pending" ? "disetujui" : item.status,
      catatanApprover: item.catatanApprover || "",
      approver: item.approver || "",
      tanggalApproval: item.tanggalApproval || new Date().toISOString().split("T")[0],
    });
    setApprovalModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nomorDokumen.trim()) { show("Nomor dokumen wajib diisi", "error"); return; }
    if (!form.judul.trim()) { show("Judul wajib diisi", "error"); return; }
    try {
      if (editing?.id) await updateApproval(editing.id, form);
      else await createApproval(form);
      show("Tersimpan");
      setModalOpen(false);
      load();
    } catch { show("Gagal menyimpan", "error"); }
  };

  const handleApprovalSave = async () => {
    try {
      await updateApproval(editing.id, approvalForm);
      show("Status approval diperbarui");
      setApprovalModalOpen(false);
      load();
    } catch { show("Gagal memperbarui", "error"); }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Hapus dokumen "${item.nomorDokumen}"?`)) return;
    try { await removeApproval(item.id); show("Terhapus"); load(); }
    catch { show("Gagal menghapus", "error"); }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setAf = (k, v) => setApprovalForm(f => ({ ...f, [k]: v }));

  const pending = items.filter(i => i.status === "pending").length;
  const disetujui = items.filter(i => i.status === "disetujui").length;
  const totalNilai = items.filter(i => i.status === "disetujui").reduce((s, i) => s + (Number(i.totalNominal) || 0), 0);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <Toast />
      <AdminPageHeader
        title="Approval Pembelian"
        description="Kelola pengajuan dan persetujuan pembelian dari setiap departemen."
        actions={
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4" /> Buat Pengajuan
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Menunggu Approval</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{pending}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Disetujui</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{disetujui}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Total Nilai Disetujui</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{formatRupiah(totalNilai)}</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">Memuat data...</div>
      ) : !items.length ? (
        <EmptyState
          title="Belum ada pengajuan"
          description="Buat pengajuan pembelian baru untuk memulai proses approval."
          action={<Button onClick={openAdd}><Plus className="w-4 h-4" /> Buat Pengajuan</Button>}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">No. Dokumen</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Judul</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Pemohon</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Departemen</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Total</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Approver</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{item.nomorDokumen}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate">{item.judul}</td>
                    <td className="px-4 py-3 text-slate-600">{item.pemohon || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{item.departemen || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{formatRupiah(item.totalNominal)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[item.status] || "bg-slate-100 text-slate-600"}`}>
                        {STATUS_LABELS[item.status] || item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.approver || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {item.status === "pending" && (
                          <button
                            onClick={() => openApproval(item)}
                            className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition"
                            title="Proses Approval"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
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
        onClose={() => setModalOpen(false)}
        title={editing?.id ? "Edit Pengajuan" : "Buat Pengajuan Pembelian"}
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nomor Dokumen" required>
            <Input value={form.nomorDokumen} onChange={e => set("nomorDokumen", e.target.value)} />
          </Field>
          <Field label="Judul" required>
            <Input value={form.judul} onChange={e => set("judul", e.target.value)} />
          </Field>
          <Field label="Pemohon">
            <Input value={form.pemohon} onChange={e => set("pemohon", e.target.value)} />
          </Field>
          <Field label="Departemen">
            <Input value={form.departemen} onChange={e => set("departemen", e.target.value)} />
          </Field>
          <Field label="Tanggal Pengajuan">
            <Input type="date" value={form.tanggalPengajuan} onChange={e => set("tanggalPengajuan", e.target.value)} />
          </Field>
          <Field label="Total Nominal">
            <Input type="number" min="0" value={form.totalNominal} onChange={e => set("totalNominal", e.target.value)} />
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={e => set("status", e.target.value)}>
              <option value="pending">Pending</option>
              <option value="disetujui">Disetujui</option>
              <option value="ditolak">Ditolak</option>
            </Select>
          </Field>
          <Field label="Approver">
            <Input value={form.approver} onChange={e => set("approver", e.target.value)} />
          </Field>
          <Field label="Tanggal Approval">
            <Input type="date" value={form.tanggalApproval} onChange={e => set("tanggalApproval", e.target.value)} />
          </Field>
        </div>
        <Field label="Catatan Approver">
          <TextArea rows={3} value={form.catatanApprover} onChange={e => set("catatanApprover", e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-2">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Batal</Button>
          <Button onClick={handleSave}>Simpan</Button>
        </div>
      </Modal>

      <Modal
        open={approvalModalOpen}
        onClose={() => setApprovalModalOpen(false)}
        title="Proses Approval"
        size="md"
      >
        <p className="text-sm text-slate-500 mb-4">
          Dokumen: <span className="font-medium text-slate-800">{editing?.nomorDokumen} — {editing?.judul}</span>
        </p>
        <div className="space-y-4">
          <Field label="Keputusan">
            <Select value={approvalForm.status} onChange={e => setAf("status", e.target.value)}>
              <option value="disetujui">Disetujui</option>
              <option value="ditolak">Ditolak</option>
            </Select>
          </Field>
          <Field label="Approver">
            <Input value={approvalForm.approver} onChange={e => setAf("approver", e.target.value)} />
          </Field>
          <Field label="Tanggal Approval">
            <Input type="date" value={approvalForm.tanggalApproval} onChange={e => setAf("tanggalApproval", e.target.value)} />
          </Field>
          <Field label="Catatan Approver">
            <TextArea rows={3} value={approvalForm.catatanApprover} onChange={e => setAf("catatanApprover", e.target.value)} />
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-2">
          <Button variant="secondary" onClick={() => setApprovalModalOpen(false)}>Batal</Button>
          <Button onClick={handleApprovalSave}>Simpan Keputusan</Button>
        </div>
      </Modal>
    </div>
  );
}
