import { useState, useEffect, useContext } from "react";
import { subscribeApprovals, reviewApproval } from "../../services/guestService";
import { AuthContext } from "../../context/AuthContext";
import { AdminPageHeader, Button, Modal, Field, useToast } from "../../components/admin/AdminUI";
import { CheckCircle, XCircle, Clock, AlertCircle, Radio } from "lucide-react";

function formatDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function operationLabel(op) {
  if (op === "create") return <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">Buat Baru</span>;
  if (op === "update") return <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">Edit</span>;
  if (op === "delete") return <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-700">Hapus</span>;
  return op;
}

function statusBadge(s) {
  if (s === "pending")  return <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700 flex items-center gap-1"><Clock size={10} /> Menunggu</span>;
  if (s === "approved") return <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 flex items-center gap-1"><CheckCircle size={10} /> Disetujui</span>;
  if (s === "rejected") return <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-600 flex items-center gap-1"><XCircle size={10} /> Ditolak</span>;
  return s;
}

function DataPreview({ label, data }) {
  if (!data) return null;
  return (
    <div className="flex-1 min-w-0">
      <p className="text-xs font-semibold text-slate-500 mb-1">{label}</p>
      <div className="bg-slate-50 rounded-lg p-3 text-xs font-mono text-slate-700 overflow-auto max-h-48 border border-slate-200">
        <pre className="whitespace-pre-wrap break-all">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );
}

export default function GuestApprovals() {
  const { user, profile } = useContext(AuthContext);
  const { show, Toast } = useToast();

  const [tab, setTab] = useState("pending");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeApprovals(tab, (data) => {
      setItems(data);
      setLoading(false);
    });
    return unsub;
  }, [tab]);

  async function handleReview(approved) {
    if (!selected) return;
    setReviewing(true);
    try {
      await reviewApproval(selected.id, {
        approved,
        note: reviewNote,
        reviewedBy: profile?.name || user?.uid || "admin",
      });
      show(approved ? "Perubahan disetujui dan diterapkan" : "Perubahan ditolak");
      setSelected(null);
      setReviewNote("");
    } catch (e) {
      show(e.message || "Gagal memproses", "error");
    } finally {
      setReviewing(false);
    }
  }

  const tabs = [
    { key: "pending",  label: "Menunggu" },
    { key: "approved", label: "Disetujui" },
    { key: "rejected", label: "Ditolak" },
  ];

  return (
    <div className="p-6">
      <Toast />
      <AdminPageHeader
        title="Persetujuan Perubahan Tamu"
        description="Review dan setujui perubahan data yang diajukan oleh akun tamu."
        actions={
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <Radio size={12} className="animate-pulse" /> Realtime
          </span>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition -mb-px ${
              tab === t.key
                ? "border-amber-500 text-amber-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Memuat...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <AlertCircle className="mx-auto mb-2 text-slate-300" size={32} />
          <p>Tidak ada permintaan {tabs.find((t) => t.key === tab)?.label.toLowerCase()}.</p>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Tamu</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Modul</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Operasi</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Waktu</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3 font-mono text-slate-700 text-xs">{item.guestUsername}</td>
                  <td className="px-4 py-3 text-slate-700 capitalize">{item.module}</td>
                  <td className="px-4 py-3">{operationLabel(item.operation)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(item.createdAt)}</td>
                  <td className="px-4 py-3">{statusBadge(item.status)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => { setSelected(item); setReviewNote(""); }}
                      className="text-xs px-3 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium"
                    >
                      Lihat Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Review Modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Detail Permintaan Perubahan"
        size="lg"
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-sm bg-slate-50 rounded-lg p-3">
              <div><span className="text-slate-500 text-xs">Tamu</span><br /><strong>{selected.guestUsername}</strong></div>
              <div><span className="text-slate-500 text-xs">Modul</span><br /><strong className="capitalize">{selected.module}</strong></div>
              <div><span className="text-slate-500 text-xs">Operasi</span><br />{operationLabel(selected.operation)}</div>
            </div>

            {selected.docId && (
              <p className="text-xs text-slate-500">ID Dokumen: <code className="bg-slate-100 px-1 rounded">{selected.docId}</code></p>
            )}

            <div className="flex gap-4">
              {selected.currentData && <DataPreview label="Data Sebelumnya" data={selected.currentData} />}
              <DataPreview label={selected.operation === "delete" ? "Data yang Dihapus" : "Data yang Diajukan"} data={selected.proposedData} />
            </div>

            {selected.status === "pending" && (
              <>
                <Field label="Catatan Review (opsional)">
                  <textarea
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
                    rows={2}
                    placeholder="Tambahkan catatan jika perlu..."
                  />
                </Field>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button variant="secondary" onClick={() => setSelected(null)}>Tutup</Button>
                  <Button variant="danger" loading={reviewing} onClick={() => handleReview(false)}>
                    <XCircle size={14} /> Tolak
                  </Button>
                  <Button loading={reviewing} onClick={() => handleReview(true)}>
                    <CheckCircle size={14} /> Setujui & Terapkan
                  </Button>
                </div>
              </>
            )}

            {selected.status !== "pending" && (
              <div className="border-t border-slate-100 pt-3 text-sm">
                <p className="text-slate-500">
                  Di-review oleh <strong>{selected.reviewedBy}</strong> pada {formatDate(selected.reviewedAt)}
                </p>
                {selected.reviewNote && (
                  <p className="mt-1 text-slate-600 italic">"{selected.reviewNote}"</p>
                )}
                <div className="flex justify-end mt-3">
                  <Button variant="secondary" onClick={() => setSelected(null)}>Tutup</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
