import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import {
  AdminPageHeader, Button, Modal, Field, Input, Select, TextArea, EmptyState, useToast,
} from "../../components/admin/AdminUI";
import {
  getAllInvoice, createInvoice, updateInvoice, removeInvoice, formatRupiah,
} from "../../services/penjualanService";

const EMPTY = {
  nomorInvoice: "", pelangganNama: "", tanggalInvoice: "", tanggalJatuhTempo: "",
  totalNominal: "", dibayar: "0", keterangan: "", status: "belum_dibayar",
};

const STATUS_BADGE = {
  belum_dibayar: "bg-red-100 text-red-700",
  sebagian:      "bg-amber-100 text-amber-700",
  lunas:         "bg-emerald-100 text-emerald-700",
};

const STATUS_LABEL = {
  belum_dibayar: "Belum Dibayar",
  sebagian: "Sebagian",
  lunas: "Lunas",
};

export default function Invoice() {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState(EMPTY);
  const { show, Toast }       = useToast();

  const load = async () => {
    setLoading(true);
    try { setItems(await getAllInvoice()); }
    catch { show("Gagal memuat data", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (item) => { setEditing(item); setForm({ ...item }); setModal(true); };
  const set      = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const sisa = (f) => Math.max(0, (Number(f.totalNominal) || 0) - (Number(f.dibayar) || 0));

  const handleSave = async () => {
    const sisaTagihan = sisa(form);
    let status = form.status;
    if (sisaTagihan <= 0) status = "lunas";
    else if (Number(form.dibayar) > 0) status = "sebagian";
    else status = "belum_dibayar";
    const payload = { ...form, sisaTagihan, status };
    try {
      if (editing?.id) await updateInvoice(editing.id, payload);
      else await createInvoice(payload);
      show("Tersimpan"); setModal(false); load();
    } catch { show("Gagal menyimpan", "error"); }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Hapus invoice "${item.nomorInvoice}"?`)) return;
    try { await removeInvoice(item.id); show("Terhapus"); load(); }
    catch { show("Gagal menghapus", "error"); }
  };

  const totalTagihan = items.reduce((s, i) => s + (Number(i.totalNominal) || 0), 0);
  const totalLunas   = items.filter(i => i.status === "lunas").reduce((s, i) => s + (Number(i.totalNominal) || 0), 0);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <Toast />
      <AdminPageHeader
        title="Invoice"
        description="Kelola tagihan dan pembayaran dari pelanggan."
        actions={<Button onClick={openAdd}><Plus className="w-4 h-4" /> Buat Invoice</Button>}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-slate-50 rounded-xl p-4">
          <div className="text-sm text-slate-500 mb-1">Total Tagihan</div>
          <div className="font-bold text-slate-900">{formatRupiah(totalTagihan)}</div>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4">
          <div className="text-sm text-emerald-600 mb-1">Sudah Lunas</div>
          <div className="font-bold text-emerald-700">{formatRupiah(totalLunas)}</div>
        </div>
        <div className="bg-red-50 rounded-xl p-4">
          <div className="text-sm text-red-600 mb-1">Sisa Piutang</div>
          <div className="font-bold text-red-700">{formatRupiah(totalTagihan - totalLunas)}</div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Memuat...</div>
      ) : !items.length ? (
        <EmptyState
          title="Belum ada invoice"
          description="Buat invoice untuk tagihan kepada pelanggan."
          action={<Button onClick={openAdd}><Plus className="w-4 h-4" /> Buat Invoice</Button>}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">No. Invoice</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Pelanggan</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Tgl Invoice</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Jatuh Tempo</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Total</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Sisa</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Status</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{item.nomorInvoice || "-"}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{item.pelangganNama || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{item.tanggalInvoice || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{item.tanggalJatuhTempo || "-"}</td>
                    <td className="px-4 py-3 text-right text-slate-900 font-semibold">{formatRupiah(item.totalNominal)}</td>
                    <td className="px-4 py-3 text-right text-red-600 font-semibold">{formatRupiah(item.sisaTagihan ?? item.totalNominal)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[item.status] || STATUS_BADGE.belum_dibayar}`}>
                        {STATUS_LABEL[item.status] || item.status}
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
        title={editing?.id ? "Edit Invoice" : "Buat Invoice Baru"} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nomor Invoice"><Input value={form.nomorInvoice} onChange={e => set("nomorInvoice", e.target.value)} placeholder="INV-2026-001" /></Field>
            <Field label="Nama Pelanggan"><Input value={form.pelangganNama} onChange={e => set("pelangganNama", e.target.value)} placeholder="PT. Maju Bersama" /></Field>
            <Field label="Tanggal Invoice"><Input type="date" value={form.tanggalInvoice} onChange={e => set("tanggalInvoice", e.target.value)} /></Field>
            <Field label="Tanggal Jatuh Tempo"><Input type="date" value={form.tanggalJatuhTempo} onChange={e => set("tanggalJatuhTempo", e.target.value)} /></Field>
            <Field label="Total Tagihan (Rp)"><Input type="number" value={form.totalNominal} onChange={e => set("totalNominal", e.target.value)} placeholder="0" /></Field>
            <Field label="Sudah Dibayar (Rp)"><Input type="number" value={form.dibayar} onChange={e => set("dibayar", e.target.value)} placeholder="0" /></Field>
          </div>
          {(form.totalNominal || form.dibayar) && (
            <div className="bg-slate-50 rounded-lg px-4 py-3 text-sm text-slate-700">
              Sisa tagihan: <span className="font-bold text-red-700">{formatRupiah(sisa(form))}</span>
            </div>
          )}
          <Field label="Keterangan">
            <TextArea rows={2} value={form.keterangan} onChange={e => set("keterangan", e.target.value)} placeholder="Detail tagihan..." />
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
