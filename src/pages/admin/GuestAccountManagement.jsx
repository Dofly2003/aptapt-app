import { useState, useEffect, useContext } from "react";
import {
  createGuestAccount, updateGuestAccount, deleteGuestAccount,
  getGuestAccounts, DEFAULT_PERMISSIONS, GUEST_WEB_MODULES,
  GUEST_MOBILE_MODULES, PERMISSION_LEVELS,
} from "../../services/guestService";
import { AuthContext } from "../../context/AuthContext";
import {
  AdminPageHeader, Button, Input, Field, Modal, useToast,
} from "../../components/admin/AdminUI";
import {
  UserPlus, Pencil, Trash2, ToggleLeft, ToggleRight, Clock, ShieldCheck, Eye, RefreshCw,
} from "lucide-react";

const FIREBASE_ERR = {
  "auth/email-already-in-use": "Username sudah dipakai. Gunakan username lain.",
  "auth/weak-password": "Password minimal 6 karakter.",
  "auth/invalid-email": "Format username tidak valid.",
  "auth/too-many-requests": "Terlalu banyak percobaan. Coba lagi nanti.",
  "auth/network-request-failed": "Koneksi bermasalah. Periksa internet.",
};

function getErrMsg(e) {
  return FIREBASE_ERR[e?.code] || e?.message || "Terjadi kesalahan.";
}

function permColor(val) {
  if (val === "write")          return "bg-emerald-100 text-emerald-700";
  if (val === "write_approval") return "bg-blue-100 text-blue-700";
  if (val === "read")           return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-400";
}
function permLabel(val) {
  return PERMISSION_LEVELS.find((l) => l.value === val)?.label ?? val;
}

function statusBadge(account) {
  if (!account.isActive) return <span className="px-2 py-0.5 rounded-full text-xs bg-slate-200 text-slate-500">Nonaktif</span>;
  if (account.expiresAt) {
    const exp = account.expiresAt.toDate ? account.expiresAt.toDate() : new Date(account.expiresAt);
    if (exp < new Date()) return <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-600">Expired</span>;
    return <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">Aktif</span>;
  }
  return <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">Aktif</span>;
}

function formatDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

/* ─── Permission Grid ─── */
function PermissionGrid({ permissions, onChange }) {
  const set = (platform, key, value) => {
    onChange({
      ...permissions,
      [platform]: { ...permissions[platform], [key]: value },
    });
  };

  return (
    <div className="space-y-6">
      {[
        { platform: "web", label: "Web Dashboard", modules: GUEST_WEB_MODULES },
        { platform: "mobile", label: "App Mobile", modules: GUEST_MOBILE_MODULES },
      ].map(({ platform, label, modules }) => (
        <div key={platform}>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{label}</h4>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-3 py-2 text-xs font-medium text-slate-600 w-36">Modul</th>
                  {PERMISSION_LEVELS.map((l) => (
                    <th key={l.value} className="text-center px-2 py-2 text-xs font-medium text-slate-600">{l.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modules.map(({ key, label: modLabel }, i) => (
                  <tr key={key} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="px-3 py-2 text-slate-700 text-xs font-medium">{modLabel}</td>
                    {PERMISSION_LEVELS.map((l) => (
                      <td key={l.value} className="text-center px-2 py-2">
                        <input
                          type="radio"
                          name={`${platform}-${key}`}
                          value={l.value}
                          checked={(permissions[platform]?.[key] ?? "none") === l.value}
                          onChange={() => set(platform, key, l.value)}
                          className="accent-amber-500"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Summary Pills ─── */
function PermSummary({ permissions }) {
  const allModules = [
    ...GUEST_WEB_MODULES.map((m) => ({ ...m, platform: "web" })),
    ...GUEST_MOBILE_MODULES.map((m) => ({ ...m, platform: "mobile" })),
  ];
  const active = allModules.filter(
    (m) => (permissions?.[m.platform]?.[m.key] ?? "none") !== "none"
  );
  if (!active.length) return <span className="text-xs text-slate-400">Tidak ada akses</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {active.map((m) => {
        const val = permissions[m.platform][m.key];
        return (
          <span key={`${m.platform}-${m.key}`} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${permColor(val)}`}>
            {m.platform === "mobile" ? "📱" : "🌐"} {m.label}
          </span>
        );
      })}
    </div>
  );
}

/* ─── Main Component ─── */
export default function GuestAccountManagement() {
  const { user } = useContext(AuthContext);
  const { show, Toast } = useToast();

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailAccount, setDetailAccount] = useState(null);

  // form
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [note, setNote] = useState("");
  const [permissions, setPermissions] = useState(DEFAULT_PERMISSIONS);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getGuestAccounts();
      data.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setAccounts(data);
    } catch (e) {
      show("Gagal memuat daftar akun", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditTarget(null);
    setUsername("");
    setPassword("");
    setDisplayName("");
    setExpiresAt("");
    setNote("");
    setPermissions(DEFAULT_PERMISSIONS);
    setShowModal(true);
  }

  function openEdit(acc) {
    setEditTarget(acc);
    setUsername(acc.username);
    setPassword("");
    setDisplayName(acc.displayName);
    setExpiresAt(
      acc.expiresAt
        ? (acc.expiresAt.toDate ? acc.expiresAt.toDate() : new Date(acc.expiresAt))
            .toISOString().split("T")[0]
        : ""
    );
    setNote(acc.note ?? "");
    setPermissions(acc.permissions ?? DEFAULT_PERMISSIONS);
    setShowModal(true);
  }

  async function handleSave() {
    if (!username.trim() || !displayName.trim()) {
      show("Username dan nama lengkap wajib diisi", "error"); return;
    }
    if (/\s|@/.test(username)) {
      show("Username tidak boleh mengandung spasi atau @", "error"); return;
    }
    if (!editTarget && !password) {
      show("Password wajib diisi untuk akun baru", "error"); return;
    }

    setSaving(true);
    try {
      if (editTarget) {
        const update = { displayName, note, permissions, expiresAt: expiresAt || null };
        await updateGuestAccount(editTarget.uid, update);
        show("Akun berhasil diperbarui");
      } else {
        await createGuestAccount({ username, password, displayName, expiresAt: expiresAt || null, note, permissions });
        show("Akun tamu berhasil dibuat");
      }
      setShowModal(false);
      await load();
    } catch (e) {
      show(getErrMsg(e), "error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(acc) {
    try {
      await updateGuestAccount(acc.uid, { isActive: !acc.isActive });
      show(acc.isActive ? "Akun dinonaktifkan" : "Akun diaktifkan");
      await load();
    } catch (e) {
      show("Gagal mengubah status", "error");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteGuestAccount(deleteTarget.uid);
      show("Akun dihapus");
      setDeleteTarget(null);
      await load();
    } catch (e) {
      show("Gagal menghapus akun", "error");
    }
  }

  return (
    <div className="p-6">
      <Toast />
      <AdminPageHeader
        title="Akun Tamu Sementara"
        description="Kelola akun login temporary untuk pihak eksternal dengan akses terbatas."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={load}>
              <RefreshCw size={14} /> Refresh
            </Button>
            <Button onClick={openCreate}>
              <UserPlus size={14} /> Buat Akun Tamu
            </Button>
          </div>
        }
      />

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Memuat...</div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <ShieldCheck className="mx-auto mb-2 text-slate-300" size={32} />
          <p>Belum ada akun tamu. Klik "Buat Akun Tamu" untuk memulai.</p>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Username</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Nama</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Berlaku s/d</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Akses</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accounts.map((acc) => (
                <tr key={acc.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3 font-mono text-slate-800">{acc.username}</td>
                  <td className="px-4 py-3 text-slate-700">{acc.displayName}</td>
                  <td className="px-4 py-3">{statusBadge(acc)}</td>
                  <td className="px-4 py-3 text-slate-500 flex items-center gap-1">
                    {acc.expiresAt ? (
                      <><Clock size={12} />{formatDate(acc.expiresAt)}</>
                    ) : "Tidak terbatas"}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <PermSummary permissions={acc.permissions} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        title="Detail"
                        onClick={() => { setDetailAccount(acc); setShowDetailModal(true); }}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-500"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        title={acc.isActive ? "Nonaktifkan" : "Aktifkan"}
                        onClick={() => toggleActive(acc)}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-500"
                      >
                        {acc.isActive ? <ToggleRight size={16} className="text-green-600" /> : <ToggleLeft size={16} />}
                      </button>
                      <button
                        title="Edit"
                        onClick={() => openEdit(acc)}
                        className="p-1.5 rounded hover:bg-slate-100 text-blue-500"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        title="Hapus"
                        onClick={() => setDeleteTarget(acc)}
                        className="p-1.5 rounded hover:bg-red-50 text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editTarget ? `Edit Akun: ${editTarget.username}` : "Buat Akun Tamu"}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Username" required hint="Hanya huruf, angka, underscore. Dipakai untuk login.">
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s|@/g, ""))}
                placeholder="contoh: tamu_bpd"
                disabled={!!editTarget}
              />
            </Field>
            <Field label="Nama Lengkap" required>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Perwakilan BPD" />
            </Field>
          </div>

          {!editTarget && (
            <Field label="Password" required hint="Minimal 6 karakter. Berikan ke tamu secara aman.">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </Field>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Berlaku Sampai" hint="Kosongkan jika tidak ada batas waktu.">
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </Field>
            <Field label="Keterangan">
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Contoh: Audit BPD Juni 2026" />
            </Field>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Atur Izin Akses</h3>
            <PermissionGrid permissions={permissions} onChange={setPermissions} />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Batal</Button>
            <Button loading={saving} onClick={handleSave}>
              {editTarget ? "Simpan Perubahan" : "Buat Akun"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={`Detail: ${detailAccount?.username}`}
        size="lg"
      >
        {detailAccount && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-slate-500">Nama:</span> <span className="font-medium">{detailAccount.displayName}</span></div>
              <div><span className="text-slate-500">Status:</span> {statusBadge(detailAccount)}</div>
              <div><span className="text-slate-500">Dibuat:</span> {formatDate(detailAccount.createdAt)}</div>
              <div className="flex items-center gap-1"><span className="text-slate-500">Expired:</span> <Clock size={12} /> {formatDate(detailAccount.expiresAt)}</div>
              {detailAccount.note && (
                <div className="col-span-2"><span className="text-slate-500">Keterangan:</span> {detailAccount.note}</div>
              )}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Izin Akses (Read-only)</h4>
              <PermissionGrid
                permissions={detailAccount.permissions ?? DEFAULT_PERMISSIONS}
                onChange={() => {}}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirm */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Hapus Akun Tamu"
        size="sm"
      >
        <p className="text-slate-600 mb-4">
          Hapus akun <strong>{deleteTarget?.username}</strong>? Akun tidak bisa dipulihkan.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Batal</Button>
          <Button variant="danger" onClick={handleDelete}>Hapus</Button>
        </div>
      </Modal>
    </div>
  );
}
