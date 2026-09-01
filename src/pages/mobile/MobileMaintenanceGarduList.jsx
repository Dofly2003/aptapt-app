import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Plus, Wrench, Search, X, Trash2, Calendar, User } from "lucide-react";
import {
  getAllMaintenanceGardu,
  removeMaintenanceGardu,
} from "../../services/maintenanceGarduService";

const STATUS_STYLE = {
  draft:   "bg-amber-100 text-amber-700",
  selesai: "bg-emerald-100 text-emerald-700",
};

function Toast({ msg, type }) {
  if (!msg) return null;
  return (
    <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[80] px-4 py-2 rounded-xl text-sm font-medium shadow-lg
      ${type === "error" ? "bg-red-600 text-white" : "bg-slate-800 text-white"}`}>
      {msg}
    </div>
  );
}

export default function MobileMaintenanceGarduList() {
  const navigate = useNavigate();
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toast, setToast]   = useState({ msg: "", type: "" });

  const show = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "" }), 2500);
  };

  const load = async () => {
    setLoading(true);
    try { setItems(await getAllMaintenanceGardu()); }
    catch { show("Gagal memuat data", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (e, item) => {
    e.stopPropagation();
    if (!confirm(`Hapus laporan "${item.namaGardu || "ini"}"?`)) return;
    try {
      await removeMaintenanceGardu(item.id);
      setItems(prev => prev.filter(i => i.id !== item.id));
      show("Laporan dihapus");
    } catch { show("Gagal menghapus", "error"); }
  };

  const filtered = items.filter(item =>
    !search || [item.namaGardu, item.namaPelanggan, item.noLaporan, item.teknisi, item.alamatGardu]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <Toast msg={toast.msg} type={toast.type} />

      {/* Header */}
      <div className="bg-white sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate("/app-mobile")} className="p-1.5 rounded-lg hover:bg-slate-100">
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-semibold text-slate-800">Maintenance Gardu</h1>
            <p className="text-xs text-slate-400">{items.length} laporan</p>
          </div>
          <button
            onClick={() => navigate("/app-mobile/maintenance-gardu/baru")}
            className="flex items-center gap-1.5 bg-amber-500 text-white px-3 py-2 rounded-xl text-sm font-semibold active:scale-95 transition-transform"
          >
            <Plus className="w-4 h-4" />
            Buat
          </button>
        </div>

        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari gardu, pelanggan, no. laporan..."
              className="flex-1 bg-transparent text-sm outline-none text-slate-700 placeholder:text-slate-400"
            />
            {search && (
              <button onClick={() => setSearch("")}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="px-4 pt-4 space-y-3">
        {loading ? (
          <div className="text-center py-14 text-slate-400 text-sm">Memuat...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14">
            <Wrench className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400 text-sm font-medium">
              {search ? "Tidak ada hasil" : "Belum ada laporan"}
            </p>
            {!search && (
              <button
                onClick={() => navigate("/app-mobile/maintenance-gardu/baru")}
                className="mt-4 bg-amber-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold"
              >
                Buat Laporan Pertama
              </button>
            )}
          </div>
        ) : (
          filtered.map(item => (
            <div
              key={item.id}
              onClick={() => navigate(`/app-mobile/maintenance-gardu/${item.id}`)}
              className="bg-white rounded-2xl shadow-sm p-4 active:scale-[0.98] transition-transform cursor-pointer"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLE[item.status] || "bg-slate-100 text-slate-500"}`}>
                      {item.status === "selesai" ? "Selesai" : "Draft"}
                    </span>
                    {item.noLaporan && (
                      <span className="text-xs text-slate-400 font-mono">{item.noLaporan}</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-slate-800 text-sm truncate">
                    {item.namaGardu || "Nama gardu belum diisi"}
                  </h3>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{item.namaPelanggan || "—"}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Calendar className="w-3 h-3" />
                      {item.tanggal || "—"}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <User className="w-3 h-3" />
                      {item.teknisi || "—"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={e => handleDelete(e, item)}
                  className="p-2 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
