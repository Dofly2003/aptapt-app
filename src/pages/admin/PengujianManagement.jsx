import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useNavigate } from "react-router-dom";
import { Eye, Pencil, Trash2, Search, FileText } from "lucide-react";
import { PermissionGate } from "../../components/PermissionGate";

const STATUS = {
  draft: { label: "Draft",   cls: "bg-gray-100 text-gray-600" },
  done:  { label: "Selesai", cls: "bg-green-100 text-green-700" },
};

export default function PengujianManagement() {
  const [list, setList]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(collection(db, "pengujian"), orderBy("createdAt", "desc"));
    return onSnapshot(q, snap => {
      setList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  const filtered = list.filter(item => {
    const q = search.toLowerCase();
    const matchSearch =
      (item.nama   || "").toLowerCase().includes(q) ||
      (item.alamat || "").toLowerCase().includes(q) ||
      (item.idpel  || "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || (item.status || "draft") === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await deleteDoc(doc(db, "pengujian", confirmDelete.id));
    setConfirmDelete(null);
  };

  const fmtDate = (ts) => {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  };

  const counts = {
    total: list.length,
    draft: list.filter(d => (d.status || "draft") === "draft").length,
    done:  list.filter(d => d.status === "done").length,
  };

  if (loading) return <div className="p-10 text-center text-slate-400">Memuat data...</div>;

  return (
    <div className="p-5 space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-800">Data Hasil Pengujian</h1>
          <p className="text-xs text-slate-400 mt-0.5">Kelola & pantau form pengujian lapangan</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total",   value: counts.total, color: "bg-blue-50 text-blue-700" },
          { label: "Draft",   value: counts.draft, color: "bg-gray-50 text-gray-600" },
          { label: "Selesai", value: counts.done,  color: "bg-green-50 text-green-700" },
        ].map(c => (
          <div key={c.label} className={`rounded-xl p-4 ${c.color}`}>
            <p className="text-xs font-medium opacity-75">{c.label}</p>
            <p className="text-2xl font-bold mt-0.5">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama / alamat / idpel..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg w-72
              focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2
            focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
        >
          <option value="all">Semua Status</option>
          <option value="draft">Draft</option>
          <option value="done">Selesai</option>
        </select>
        <span className="ml-auto text-xs text-slate-400 self-center">
          {filtered.length} dari {list.length} dokumen
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Pelanggan</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Daya / Tarif</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">No LHPP</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Tanggal</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-slate-400">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    {search || statusFilter !== "all"
                      ? "Tidak ada hasil yang cocok"
                      : "Belum ada data pengujian"}
                  </td>
                </tr>
              )}
              {filtered.map(item => {
                const st = STATUS[item.status] ?? STATUS.draft;
                return (
                  <tr key={item.id}
                    className="border-b border-slate-50 hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">
                        {item.nama || "(Tanpa nama)"}
                      </div>
                      <div className="text-xs text-slate-400 truncate max-w-[200px]">
                        {item.alamat || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{item.daya || "—"}</div>
                      <div className="text-xs text-slate-400">{item.tarif || "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs font-mono">
                      {item.noLhpp || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${st.cls}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {fmtDate(item.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => navigate(`/laporan/${item.id}`)}
                          title="Lihat Laporan"
                          className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/dashboard/pengujian/${item.id}`)}
                          title="Edit Data Form"
                          className="p-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <PermissionGate module="pengujian" require="write">
                          <button
                            onClick={() => setConfirmDelete(item)}
                            title="Hapus"
                            className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </PermissionGate>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-slate-800 mb-2">Hapus Data Pengujian?</h3>
            <p className="text-sm text-slate-500 mb-5">
              Data <strong>{confirmDelete.nama || "ini"}</strong> akan dihapus permanen
              dan tidak bisa dikembalikan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200
                  text-slate-600 text-sm hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white
                  text-sm hover:bg-red-700 transition"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
