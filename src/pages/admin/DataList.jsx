import { useEffect, useState, useMemo, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase/config";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  deleteDoc
} from "firebase/firestore";
import { AuthContext } from "../../context/AuthContext";
import {
  AdminPageHeader,
  Button,
  Input,
  Modal,
  useToast
} from "../../components/admin/AdminUI";

const STATUS_LABEL = {
  process: "Dalam Proses",
  done: "Selesai",
  pending: "Menunggu Pembayaran",
  new: "Baru",
  paid: "Siap Dikerjakan",
  approved: "Siap Dikerjakan"
};

const shortName = (email) => email?.split('@')[0] ?? email;

const toMonthKey = (ts) => {
  if (!ts) return null;
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  if (isNaN(d)) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const formatMonth = (key) => {
  if (!key) return "-";
  const [y, m] = key.split('-');
  const months = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Ags","Sep","Okt","Nov","Des"];
  return `${months[parseInt(m) - 1]} ${y}`;
};

function TableDataEntry() {
  const navigate = useNavigate();
  const { show, Toast } = useToast();
  const { role: authRole, user } = useContext(AuthContext);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [holdRow, setHoldRow] = useState(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const [holdInterval, setHoldInterval] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [search, setSearch] = useState("");
  const [rekapMonth, setRekapMonth] = useState("");

  // Gunakan role dari Firestore (via AuthContext) — bukan email hardcoded
  const isSuperAdmin = authRole === "superadmin";

  useEffect(() => {
    const q = query(collection(db, "nidi_data"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const result = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setData(result);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Rekap computation
  const doneData = useMemo(() => data.filter(d => d.status === "done"), [data]);

  const monthKeys = useMemo(() => {
    const keys = new Set();
    doneData.forEach(item => {
      const k = toMonthKey(item.selesaiAt);
      if (k) keys.add(k);
    });
    return Array.from(keys).sort().reverse();
  }, [doneData]);

  useEffect(() => {
    if (monthKeys.length > 0 && !rekapMonth) {
      setRekapMonth(monthKeys[0]);
    }
  }, [monthKeys]);

  const rekapFiltered = useMemo(() => {
    if (!rekapMonth) return doneData;
    return doneData.filter(item => toMonthKey(item.selesaiAt) === rekapMonth);
  }, [doneData, rekapMonth]);

  const rekapByAdmin = useMemo(() => {
    const map = {};
    rekapFiltered.forEach(item => {
      const name = item.assignedName ?? "Tidak Diketahui";
      if (!map[name]) map[name] = { nidi: 0, slo: 0, lainnya: 0, total: 0 };
      const type = (item.keperluan ?? "").toLowerCase();
      if (type.includes("nidi")) map[name].nidi++;
      else if (type.includes("slo")) map[name].slo++;
      else map[name].lainnya++;
      map[name].total++;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [rekapFiltered]);

  const handleAmbil = async (item) => {
    if (!user) { show("Silakan login terlebih dahulu", "error"); return; }
    if (item.assignedTo) { show("Data ini sudah diambil oleh admin lain", "error"); return; }
    try {
      await updateDoc(doc(db, "nidi_data", item.id), {
        assignedTo: user.uid,
        assignedName: user.email,
        assignedAt: serverTimestamp(),
        status: "process"
      });
      show("Berhasil mengambil data");
    } catch (err) {
      console.error(err);
      show("Gagal mengambil data. Coba lagi.", "error");
    }
  };

  const startHold = (item) => {
    if (!isSuperAdmin) return;
    setHoldRow(item.id);
    setHoldProgress(0);
    let count = 0;
    const interval = setInterval(() => {
      count += 10;
      setHoldProgress(count);
      if (count >= 100) {
        clearInterval(interval);
        setSelectedItem(item);
        setShowConfirm(true);
      }
    }, 200);
    setHoldInterval(interval);
  };

  const cancelHold = () => {
    if (holdInterval) clearInterval(holdInterval);
    setHoldRow(null);
    setHoldProgress(0);
  };

  const handleDelete = async (id) => {
    if (!id) return;
    try {
      await deleteDoc(doc(db, "nidi_data", id));
      show("Data berhasil dihapus");
      setShowConfirm(false);
      setSelectedItem(null);
    } catch (err) {
      console.error(err);
      show("Gagal menghapus data. Coba lagi.", "error");
    }
  };

  const handleApprove = async (id) => {
    try {
      await updateDoc(doc(db, "nidi_data", id), { status: "paid" });
      show("Pembayaran berhasil dikonfirmasi");
    } catch (err) {
      console.error(err);
      show("Gagal mengonfirmasi pembayaran. Coba lagi.", "error");
    }
  };

  const searchMatch = (item) =>
    `${item.register || ""} ${item.nama || ""}`.toLowerCase().includes(search.toLowerCase());

  if (loading) return <div className="p-4 text-slate-500">Memuat data...</div>;

  return (
    <div className="p-4 space-y-6">
      <Toast />

      <AdminPageHeader
        title="Data Entry NIDI / SLO"
        description="Monitoring & Pengelolaan Pesanan"
        actions={
          <div className="relative w-full md:max-w-sm">
            <Input
              type="text"
              placeholder="Cari Register / Nama..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
              🔍
            </span>
          </div>
        }
      />

      {/* ================== SUMMARY CARD ================== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl text-center">
          <p className="text-xs text-slate-500">Menunggu Pembayaran</p>
          <h3 className="text-lg font-bold text-yellow-700">
            {data.filter(d => d.status === "pending").length}
          </h3>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-center">
          <p className="text-xs text-slate-500">Siap Dikerjakan</p>
          <h3 className="text-lg font-bold text-emerald-700">
            {data.filter(d => ["paid", "approved"].includes(d.status)).length}
          </h3>
        </div>
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-center">
          <p className="text-xs text-slate-500">Dalam Proses</p>
          <h3 className="text-lg font-bold text-blue-700">
            {data.filter(d => d.status === "process").length}
          </h3>
        </div>
        <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl text-center">
          <p className="text-xs text-slate-500">Selesai</p>
          <h3 className="text-lg font-bold text-purple-700">
            {data.filter(d => d.status === "done").length}
          </h3>
        </div>
      </div>

      {/* ================== SIAP DIKERJAKAN ================== */}
      <div className="bg-white rounded-2xl shadow p-4">
        <h3 className="font-semibold mb-3 text-emerald-700">Siap Dikerjakan</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-emerald-50 text-slate-600">
              <tr>
                <th className="p-2 text-left">Nama</th>
                <th className="p-2 text-left">Daya</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data
                .filter(d => ["paid", "approved"].includes(d.status))
                .filter(searchMatch)
                .map(item => {
                  const isMine = item.assignedTo === user?.uid;
                  const isTaken = !!item.assignedTo;
                  return (
                    <tr
                      key={item.id}
                      className={`border-t transition ${
                        isMine
                          ? "bg-emerald-50 cursor-pointer hover:bg-emerald-100"
                          : isTaken
                          ? "opacity-60"
                          : "hover:bg-slate-50"
                      }`}
                      onClick={() => { if (isMine) navigate(`/dashboard/wo/penyelesaian/${item.id}`); }}
                    >
                      <td className="p-2 font-medium">{item.nama}</td>
                      <td className="p-2">{item.daya}</td>
                      <td className="p-2">
                        <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-medium">
                          {STATUS_LABEL[item.status] ?? item.status}
                        </span>
                      </td>
                      <td className="p-2">
                        {!isTaken ? (
                          <Button
                            variant="primary"
                            className="px-2 py-1 text-xs"
                            onClick={(e) => { e.stopPropagation(); handleAmbil(item); }}
                          >
                            Ambil
                          </Button>
                        ) : isMine ? (
                          <span className="text-emerald-600 text-xs font-semibold">Pekerjaan Anda</span>
                        ) : (
                          <span className="text-slate-500 text-xs">
                            Diambil: <span className="font-medium text-slate-700">{shortName(item.assignedName)}</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================== DALAM PROSES ================== */}
      <div className="bg-white rounded-2xl shadow p-4">
        <h3 className="font-semibold mb-3 text-blue-700">Dalam Proses</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {data
            .filter(d => d.status === "process")
            .filter(searchMatch)
            .map(item => {
              const isMine = item.assignedTo === user?.uid;
              return (
                <div
                  key={item.id}
                  className={`border rounded-xl p-4 shadow-sm hover:shadow-md transition cursor-pointer ${
                    isMine ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"
                  }`}
                  onClick={() => navigate(`/dashboard/wo/penyelesaian/${item.id}`)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-slate-800">{item.nama}</h4>
                      <p className="text-sm text-slate-500">{item.daya}</p>
                    </div>
                    {isMine ? (
                      <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                        Anda
                      </span>
                    ) : (
                      <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                        {shortName(item.assignedName)}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-blue-600 font-semibold">
                    {STATUS_LABEL.process}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* ================== SELESAI ================== */}
      <div className="bg-white rounded-2xl shadow p-4">
        <h3 className="font-semibold mb-3 text-purple-700">Selesai</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {data
            .filter(d => d.status === "done")
            .filter(searchMatch)
            .map(item => (
              <div
                key={item.id}
                className="border rounded-xl p-4 bg-purple-50 cursor-pointer hover:shadow-md transition"
                onClick={() => navigate(`/dashboard/wo/penyelesaian/${item.id}`)}
              >
                <h4 className="font-semibold text-slate-800">{item.nama}</h4>
                <p className="text-sm text-slate-500">{item.daya}</p>
                {item.assignedName && (
                  <p className="text-xs text-slate-400 mt-1">
                    oleh <span className="font-medium">{shortName(item.assignedName)}</span>
                  </p>
                )}
                <div className="mt-2 text-xs text-purple-600 font-semibold">
                  {STATUS_LABEL.done}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* ================== REKAP PER BULAN ================== */}
      <div className="bg-white rounded-2xl shadow p-4">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h3 className="font-semibold text-slate-700">Rekap Penyelesaian</h3>
            <p className="text-xs text-slate-400 mt-0.5">NIDI & SLO per admin</p>
          </div>
          <select
            value={rekapMonth}
            onChange={e => setRekapMonth(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="">Semua Waktu</option>
            {monthKeys.map(k => (
              <option key={k} value={k}>{formatMonth(k)}</option>
            ))}
          </select>
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500">Total Selesai</p>
            <p className="text-2xl font-bold text-slate-700">{rekapFiltered.length}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500">NIDI</p>
            <p className="text-2xl font-bold text-blue-700">
              {rekapFiltered.filter(d => (d.keperluan ?? "").toLowerCase().includes("nidi")).length}
            </p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500">SLO</p>
            <p className="text-2xl font-bold text-emerald-700">
              {rekapFiltered.filter(d => (d.keperluan ?? "").toLowerCase().includes("slo")).length}
            </p>
          </div>
        </div>

        {/* Per-admin breakdown */}
        {rekapByAdmin.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs">
                <tr>
                  <th className="p-2 text-left">Admin</th>
                  <th className="p-2 text-center">NIDI</th>
                  <th className="p-2 text-center">SLO</th>
                  <th className="p-2 text-center">Lainnya</th>
                  <th className="p-2 text-center font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {rekapByAdmin.map(([name, stats]) => (
                  <tr key={name} className="border-t hover:bg-slate-50">
                    <td className="p-2 font-medium text-slate-700">{shortName(name)}</td>
                    <td className="p-2 text-center text-blue-600">{stats.nidi}</td>
                    <td className="p-2 text-center text-emerald-600">{stats.slo}</td>
                    <td className="p-2 text-center text-slate-400">{stats.lainnya}</td>
                    <td className="p-2 text-center font-bold text-slate-800">{stats.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-6">
            Belum ada data selesai{rekapMonth ? ` pada ${formatMonth(rekapMonth)}` : ""}
          </p>
        )}
      </div>

      {/* ================== MENUNGGU PEMBAYARAN ================== */}
      <div className="bg-white rounded-2xl shadow p-4">
        <h3 className="font-semibold mb-3 text-yellow-600">Menunggu Pembayaran</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-yellow-50 text-slate-600">
              <tr>
                <th className="p-3 text-left">Register</th>
                <th className="p-3 text-left">Nama</th>
                <th className="p-3 text-left">Daya</th>
                <th className="p-3 text-left">Total</th>
                <th className="p-3 text-left">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data
                .filter(d => d.status === "pending")
                .filter(searchMatch)
                .map(item => (
                  <tr key={item.id} className="border-t">
                    <td className="p-3 text-blue-600 text-xs font-semibold">{item.register}</td>
                    <td className="p-3">{item.nama}</td>
                    <td className="p-3">{item.daya}</td>
                    <td className="p-3 text-emerald-600 font-semibold">
                      Rp {(item.total_harga || 0).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <Button
                          variant="primary"
                          className="px-2 py-1 text-xs"
                          onClick={() => handleApprove(item.id)}
                        >
                          Konfirmasi
                        </Button>
                        {isSuperAdmin && (
                          <Button
                            variant="danger"
                            className="px-2 py-1 text-xs"
                            onClick={() => { setSelectedItem(item); setShowConfirm(true); }}
                          >
                            Hapus
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================== KONFIRMASI HAPUS ================== */}
      <Modal
        open={showConfirm}
        onClose={() => { setShowConfirm(false); setSelectedItem(null); }}
        title="Konfirmasi Hapus"
        size="sm"
      >
        <p className="text-slate-700 mb-4">
          Apakah Anda yakin ingin menghapus data atas nama{" "}
          <span className="font-semibold">{selectedItem?.nama}</span>? Tindakan ini tidak dapat dibatalkan.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => { setShowConfirm(false); setSelectedItem(null); }}>
            Batal
          </Button>
          <Button variant="danger" onClick={() => handleDelete(selectedItem?.id)}>
            Hapus
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default TableDataEntry;
