import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Edit2, Trash2, FileText, Building2 } from "lucide-react";
import {
  AdminPageHeader, Button, EmptyState, useToast,
} from "../../components/admin/AdminUI";
import { getAllLaikOperasi, deleteLaikOperasi } from "../../services/laikOperasiService";
import { getAllInstansi } from "../../services/instansiService";

const STATUS_COLOR = {
  draft: "bg-amber-100 text-amber-700",
  final: "bg-emerald-100 text-emerald-700",
};

export default function LaikOperasiManagement() {
  const [items, setItems]           = useState([]);
  const [instansiMap, setInstansiMap] = useState({});
  const [loading, setLoading]       = useState(true);
  const navigate = useNavigate();
  const { show, Toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [docs, instansiList] = await Promise.all([
        getAllLaikOperasi(),
        getAllInstansi(),
      ]);
      setItems(docs);
      setInstansiMap(Object.fromEntries(instansiList.map(i => [i.id, i])));
    } catch (err) {
      console.error(err);
      show("Gagal memuat data", "error");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (item) => {
    if (!confirm(`Hapus dokumen "${item.namaGardu || item.nomor || "ini"}"?`)) return;
    try {
      await deleteLaikOperasi(item.id);
      show("Terhapus");
      load();
    } catch (err) { console.error(err); show("Gagal menghapus", "error"); }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <Toast />
      <AdminPageHeader
        title="Rekomendasi Laik Operasi"
        description="Kelola dokumen Laporan Hasil Pemeriksaan & Pengujian (LHPP) Laik Operasi."
        actions={
          <Button onClick={() => navigate("/dashboard/laik-operasi/baru")}>
            <Plus className="w-4 h-4" /> Buat Dokumen
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : !items.length ? (
        <EmptyState
          title="Belum ada dokumen"
          description="Buat dokumen Laik Operasi pertama untuk mulai."
          action={
            <Button onClick={() => navigate("/dashboard/laik-operasi/baru")}>
              <Plus className="w-4 h-4" /> Buat Dokumen
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const inst = instansiMap[item.instansiId];
            return (
              <div key={item.id}
                className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-slate-800 truncate">
                      {item.namaGardu || item.nomor || "—"}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[item.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {item.status === "final" ? "Final" : "Draft"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    {item.nomor && <span>{item.nomor}</span>}
                    {inst && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" /> {inst.nama}
                      </span>
                    )}
                    {item.tanggal && <span>{item.tanggal}</span>}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline"
                    onClick={() => navigate(`/dashboard/laik-operasi/${item.id}`)}
                    className="!px-2 !py-1.5">
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost"
                    onClick={() => handleDelete(item)}
                    className="!px-2 !py-1.5 hover:!bg-red-50 hover:!text-red-600">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
