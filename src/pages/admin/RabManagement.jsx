import { useEffect, useState, useContext } from "react";
import { logAction } from "../../services/analyticsService";
import { Link, useNavigate } from "react-router-dom";
import { Plus, FileText, Edit2, Trash2, Eye } from "lucide-react";
import {
    AdminPageHeader, Button, EmptyState, useToast,
} from "../../components/admin/AdminUI";
import { getAllDokumen, deleteDokumen, formatRupiah, hitungTotalFromDoc } from "../../services/rabService";
import { AuthContext } from "../../context/AuthContext";
import { PermissionGate } from "../../components/PermissionGate";

const STATUS_COLOR = {
    draft: "bg-amber-100 text-amber-800",
    final: "bg-emerald-100 text-emerald-800",
};

export default function RabManagement() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all"); // all | draft | final
    const navigate = useNavigate();
    const { show, Toast } = useToast();
    const { user } = useContext(AuthContext);

    const load = async () => {
        setLoading(true);
        try {
            setItems(await getAllDokumen({ type: "rab" }));
        } catch (err) {
            console.error(err);
            show("Gagal memuat data", "error");
        } finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    const handleDelete = async (item) => {
        if (!confirm(`Hapus RAB "${item.perihal}" (${item.nomor})?`)) return;
        try {
            await deleteDokumen(item.id);
            logAction("delete_rab");
            show("Terhapus");
            load();
        } catch (err) { console.error(err); show("Gagal menghapus", "error"); }
    };

    const visible = items.filter((i) => filter === "all" || i.status === filter);

    return (
        <div className="p-3 sm:p-6 lg:p-8 max-w-6xl mx-auto">
            <Toast />
            <AdminPageHeader
                title="RAB / Surat Penawaran"
                description="Kelola dokumen RAB. Setiap dokumen terikat ke satu instansi (letterhead) dan satu penanggung jawab (TTD)."
                actions={
                    <PermissionGate module="rab" require="write_approval">
                        <Button onClick={() => { logAction("create_rab"); navigate("/Dashboard/rab/baru"); }}>
                            <Plus className="w-4 h-4" /> Buat RAB
                        </Button>
                    </PermissionGate>
                }
            />

            {/* Filter pills */}
            <div className="flex gap-2 mb-4">
                {["all", "draft", "final"].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 text-sm rounded-full border transition ${filter === f
                                ? "bg-amber-600 text-white border-amber-600"
                                : "bg-white text-slate-600 border-slate-200 hover:border-amber-400"
                            }`}
                    >
                        {f === "all" ? "Semua" : f === "draft" ? "Draft" : "Final"}
                        {f !== "all" && (
                            <span className="ml-1 text-xs opacity-70">
                                ({items.filter((i) => i.status === f).length})
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-20 bg-slate-100 rounded-lg animate-pulse" />
                    ))}
                </div>
            ) : !visible.length ? (
                <EmptyState
                    title="Belum ada RAB"
                    description="Buat RAB pertama untuk mulai mencatat penawaran."
                    action={
                        <PermissionGate module="rab" require="write_approval">
                            <Button onClick={() => navigate("/Dashboard/rab/baru")}>
                                <Plus className="w-4 h-4" /> Buat RAB
                            </Button>
                        </PermissionGate>
                    }
                />
            ) : (
                <div className="space-y-2">
                    {visible.map((item) => (
                        <RabRow
                            key={item.id}
                            item={item}
                            onEdit={() => navigate(`/Dashboard/rab/${item.id}`)}
                            onPreview={() => navigate(`/rab/${item.id}`)}
                            onDelete={() => handleDelete(item)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function RabRow({ item, onEdit, onPreview, onDelete }) {
  const totals = hitungTotalFromDoc(item);
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 hover:border-amber-300 transition">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5 text-amber-700" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-mono text-xs text-slate-500">{item.nomor || "(belum ada nomor)"}</span>
            <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[item.status] || ""}`}>
              {item.status}
            </span>
          </div>
          <p className="font-semibold text-slate-900 truncate text-sm sm:text-base">
            {item.perihal || "(tanpa perihal)"}
          </p>
          <p className="text-xs text-slate-500 truncate">
            Kepada {item.kepada?.perusahaan || item.kepada?.yth || "-"}
            {" · "}{item.items?.length ?? 0} item
          </p>
          <p className="text-xs mt-0.5">
            <span className="text-amber-700 font-semibold">{formatRupiah(totals.grandTotal)}</span>
          </p>
        </div>
      </div>

      {/* Action buttons — full-width pada mobile, di kanan pada desktop */}
      <div className="flex gap-2 mt-3 sm:mt-2 sm:justify-end">
        <Button variant="outline" onClick={onPreview}
          className="flex-1 sm:flex-none !px-3 !py-1.5 text-amber-700 border-amber-300 hover:bg-amber-50 justify-center"
          title="Preview">
          <Eye className="w-3.5 h-3.5" />
          <span className="text-xs ml-1">Preview</span>
        </Button>
        <PermissionGate module="rab" require="write_approval">
          <Button variant="outline" onClick={onEdit} className="flex-1 sm:flex-none !px-3 !py-1.5 justify-center" title="Edit">
            <Edit2 className="w-3.5 h-3.5" />
            <span className="text-xs ml-1 sm:hidden">Edit</span>
          </Button>
        </PermissionGate>
        <PermissionGate module="rab" require="write">
          <Button variant="ghost" onClick={onDelete}
            className="!px-2 !py-1.5 hover:!bg-red-50 hover:!text-red-600 shrink-0" title="Hapus">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </PermissionGate>
      </div>
    </div>
  );
}