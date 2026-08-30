import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Edit2, Trash2 } from "lucide-react";
import {
  AdminPageHeader, Button, EmptyState, useToast,
} from "../../components/admin/AdminUI";
import { getAllDokumen, deleteDokumen, formatRupiah } from "../../services/rabService";

function fmtDate(d) {
  if (!d) return "-";
  try { return new Date(d + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return d; }
}

export default function KwitansiManagement() {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const { show, Toast }       = useToast();
  const navigate              = useNavigate();

  const load = async () => {
    setLoading(true);
    try { setItems(await getAllDokumen({ type: "kwitansi" })); }
    catch { show("Gagal memuat data", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (item) => {
    if (!confirm(`Hapus kwitansi "${item.nomor}"?`)) return;
    try { await deleteDokumen(item.id); show("Terhapus"); load(); }
    catch { show("Gagal menghapus", "error"); }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <Toast />
      <AdminPageHeader
        title="Kwitansi"
        description="Buat dan kelola kwitansi pembayaran berdasarkan invoice."
        actions={
          <Button onClick={() => navigate("/dashboard/keuangan/kwitansi/baru")}>
            <Plus className="w-4 h-4" /> Buat Kwitansi
          </Button>
        }
      />

      {loading ? (
        <div className="text-center py-12 text-slate-500">Memuat...</div>
      ) : !items.length ? (
        <EmptyState
          title="Belum ada kwitansi"
          description="Buat kwitansi dari data invoice yang tersedia."
          action={
            <Button onClick={() => navigate("/dashboard/keuangan/kwitansi/baru")}>
              <Plus className="w-4 h-4" /> Buat Kwitansi
            </Button>
          }
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Nomor Kwitansi</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Pelanggan</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Tanggal</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Nominal</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{item.nomor || "-"}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{item.pelangganNama || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{fmtDate(item.tanggal)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatRupiah(item.nominal)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => navigate(`/dashboard/keuangan/kwitansi/${item.id}`)}
                          className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100"
                          title="Edit / Cetak"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                          title="Hapus"
                        >
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
    </div>
  );
}
