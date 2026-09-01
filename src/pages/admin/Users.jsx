import { useEffect, useState, useMemo } from "react";
import { logAction } from "../../services/analyticsService";
import { db, firebaseConfig } from "../../firebase/config";
import {
  collection, getDocs, doc, deleteDoc, setDoc, updateDoc, query, where, getDoc,
} from "firebase/firestore";
import {
  getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail,
} from "firebase/auth";
import { initializeApp, getApps } from "firebase/app";
import {
  Search, Plus, Edit2, KeyRound, Trash2, RefreshCw, X,
  ShieldCheck, UserCheck, UserX, Users as UsersIcon, Eye, EyeOff,
  ArrowRightLeft, CheckCircle2, AlertCircle,
} from "lucide-react";
import { Modal, useToast } from "../../components/admin/AdminUI";

/* ── Secondary auth (create users without logging out) ── */
const secondaryApp =
  getApps().find(a => a.name === "secondary") ||
  initializeApp(firebaseConfig, "secondary");
const secondaryAuth = getAuth(secondaryApp);

/* ── Role config ── */
const ROLES = [
  { value: "superadmin", label: "Super Admin", bg: "bg-amber-100",   text: "text-amber-700",   dot: "bg-amber-500",   ring: "ring-amber-300"  },
  { value: "admin",      label: "Admin",       bg: "bg-blue-100",    text: "text-blue-700",    dot: "bg-blue-500",    ring: "ring-blue-300"   },
  { value: "finance",    label: "Finance",     bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500", ring: "ring-emerald-300"},
  { value: "editor",     label: "Editor",      bg: "bg-violet-100",  text: "text-violet-700",  dot: "bg-violet-500",  ring: "ring-violet-300" },
  { value: "user",       label: "User",        bg: "bg-slate-100",   text: "text-slate-600",   dot: "bg-slate-400",   ring: "ring-slate-300"  },
  { value: "guest",      label: "Guest",       bg: "bg-orange-100",  text: "text-orange-700",  dot: "bg-orange-500",  ring: "ring-orange-300" },
];
const roleMap = Object.fromEntries(ROLES.map(r => [r.value, r]));

const ROLE_ORDER = { superadmin: 0, admin: 1, finance: 2, editor: 3, user: 4, guest: 5 };

const FIREBASE_ERR = {
  "auth/email-already-in-use": "Email sudah terdaftar.",
  "auth/weak-password":        "Password minimal 6 karakter.",
  "auth/invalid-email":        "Format email tidak valid.",
  "auth/too-many-requests":    "Terlalu banyak percobaan, coba lagi nanti.",
  "auth/network-request-failed": "Koneksi bermasalah.",
};
const fbErr = e => FIREBASE_ERR[e?.code] || "Terjadi kesalahan, silakan coba lagi.";

/* ── Sub-components ─────────────────────────────────────── */

function Avatar({ name = "", role }) {
  const cfg = roleMap[role] || roleMap.user;
  const initials = name.trim().split(/\s+/).map(w => w[0]?.toUpperCase() || "").slice(0, 2).join("");
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${cfg.bg} ${cfg.text} ring-2 ${cfg.ring}`}>
      {initials || "?"}
    </div>
  );
}

function RoleBadge({ role }) {
  const cfg = roleMap[role] || roleMap.user;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function StatCard({ label, value, sub, color = "slate" }) {
  const colors = {
    amber:   "bg-amber-50 border-amber-200 text-amber-700",
    blue:    "bg-blue-50 border-blue-200 text-blue-700",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    violet:  "bg-violet-50 border-violet-200 text-violet-700",
    slate:   "bg-slate-50 border-slate-200 text-slate-600",
    red:     "bg-red-50 border-red-200 text-red-600",
  };
  return (
    <div className={`border rounded-xl px-4 py-3 ${colors[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-semibold mt-0.5">{label}</div>
      {sub && <div className="text-[11px] opacity-70 mt-0.5">{sub}</div>}
    </div>
  );
}

const inp = "w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 bg-white placeholder-slate-400";

/* ── Create / Edit Modal ── */
function UserFormModal({ open, onClose, onSaved, editUser = null, existingUsers }) {
  const { show, Toast } = useToast();
  const isEdit = !!editUser;

  const [name, setName]         = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [role, setRole]         = useState("user");
  const [disabled, setDisabled] = useState(false);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    if (open) {
      if (isEdit) {
        setName(editUser.name || "");
        setUsername(editUser.username || "");
        setEmail(editUser.email || "");
        setRole(editUser.role || "user");
        setDisabled(!!editUser.disabled);
      } else {
        setName(""); setUsername(""); setEmail(""); setPassword("");
        setRole("user"); setDisabled(false);
      }
      setShowPw(false);
    }
  }, [open, editUser, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Username uniqueness check (exclude self on edit)
      const q = query(collection(db, "users"), where("username", "==", username.trim()));
      const snap = await getDocs(q);
      const conflict = snap.docs.find(d => d.id !== editUser?.id);
      if (conflict) { show("Username sudah dipakai.", "error"); setSaving(false); return; }

      if (isEdit) {
        await updateDoc(doc(db, "users", editUser.id), {
          name: name.trim(), username: username.trim(), role, disabled,
        });
        // Perbarui username index jika username berubah
        if (username.trim() !== editUser.username) {
          if (editUser.username) await deleteDoc(doc(db, "usernames", editUser.username));
          await setDoc(doc(db, "usernames", username.trim()), { email: editUser.email, uid: editUser.id });
        }
        show("Data pengguna diperbarui.");
      } else {
        const cred = await createUserWithEmailAndPassword(secondaryAuth, email.trim(), password);
        await setDoc(doc(db, "users", cred.user.uid), {
          name: name.trim(), username: username.trim(),
          email: email.trim(), role, disabled: false, createdAt: new Date(),
        });
        // Tulis ke username index agar login dengan username bisa bekerja
        await setDoc(doc(db, "usernames", username.trim()), { email: email.trim(), uid: cred.user.uid });
        logAction("add_user", { role });
        show("Pengguna berhasil dibuat.");
      }
      onSaved();
      onClose();
    } catch (err) {
      show(fbErr(err), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Pengguna" : "Tambah Pengguna Baru"} size="sm">
      <Toast />
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nama Lengkap <span className="text-red-500">*</span></label>
          <input className={inp} placeholder="Nama lengkap" value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Username <span className="text-red-500">*</span></label>
          <input className={inp} placeholder="Username unik" value={username} onChange={e => setUsername(e.target.value)} required />
        </div>
        {!isEdit && (
          <>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email <span className="text-red-500">*</span></label>
              <input className={inp} type="email" placeholder="alamat@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Password <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  className={inp + " pr-10"}
                  type={showPw ? "text" : "password"}
                  placeholder="Minimal 6 karakter"
                  value={password} onChange={e => setPassword(e.target.value)} required
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </>
        )}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Peran</label>
          <select className={inp} value={role} onChange={e => setRole(e.target.value)}>
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        {isEdit && (
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-700">Status Akun</div>
              <div className="text-xs text-slate-500 mt-0.5">{disabled ? "Pengguna tidak dapat login" : "Pengguna dapat login"}</div>
            </div>
            <button
              type="button"
              onClick={() => setDisabled(v => !v)}
              className={`relative inline-flex h-6 w-11 rounded-full transition-colors focus:outline-none ${disabled ? "bg-slate-300" : "bg-emerald-500"}`}
            >
              <span className={`inline-block w-5 h-5 bg-white rounded-full shadow transition-transform mt-0.5 ${disabled ? "translate-x-0.5" : "translate-x-5"}`} />
            </button>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium">
            Batal
          </button>
          <button type="submit" disabled={saving}
            className="px-4 py-2 text-sm rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold disabled:opacity-50 flex items-center gap-2">
            {saving && <span className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />}
            {isEdit ? "Simpan Perubahan" : "Buat Pengguna"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ── Main component ──────────────────────────────────────── */
export default function Users() {
  const { show, Toast } = useToast();

  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [resettingPw, setResettingPw]   = useState(null);
  const [syncingUsernames, setSyncingUsernames] = useState(false);
  const [syncResult, setSyncResult]             = useState(null);

  /* ── Load ── */
  const loadUsers = async () => {
    try {
      const snap = await getDocs(collection(db, "users"));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => {
        const ra = ROLE_ORDER[a.role] ?? 99, rb = ROLE_ORDER[b.role] ?? 99;
        return ra !== rb ? ra - rb : (a.name || "").localeCompare(b.name || "");
      });
      setUsers(data);
    } catch (err) {
      show("Gagal memuat daftar pengguna.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const byRole = {};
    ROLES.forEach(r => { byRole[r.value] = 0; });
    let disabled = 0;
    users.forEach(u => {
      byRole[u.role] = (byRole[u.role] || 0) + 1;
      if (u.disabled) disabled++;
    });
    return { total: users.length, byRole, disabled };
  }, [users]);

  /* ── Filter ── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return users.filter(u => {
      if (filterRole !== "all" && u.role !== filterRole) return false;
      if (filterStatus === "active" && u.disabled) return false;
      if (filterStatus === "disabled" && !u.disabled) return false;
      if (q && !(
        (u.name || "").toLowerCase().includes(q) ||
        (u.username || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q)
      )) return false;
      return true;
    });
  }, [users, search, filterRole, filterStatus]);

  /* ── Actions ── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, "users", deleteTarget.id));
      if (deleteTarget.username) await deleteDoc(doc(db, "usernames", deleteTarget.username));
      logAction("delete_user", { role: deleteTarget.role });
      show("Pengguna dihapus. Catatan: akun Firebase Auth masih aktif — hapus manual di Firebase Console jika ingin mendaur ulang email ini.");
      setDeleteTarget(null);
      loadUsers();
    } catch { show("Gagal menghapus pengguna.", "error"); }
  };

  const handleResetPw = async () => {
    if (!resettingPw) return;
    try {
      await sendPasswordResetEmail(secondaryAuth, resettingPw.email);
      show(`Link reset password dikirim ke ${resettingPw.email}`);
      setResettingPw(null);
    } catch (err) { show(fbErr(err), "error"); }
  };

  const handleSyncUsernames = async () => {
    setSyncingUsernames(true);
    setSyncResult(null);
    let written = 0, skipped = 0, failed = 0;

    for (const u of users) {
      if (!u.username || !u.email) { skipped++; continue; }
      try {
        await setDoc(doc(db, "usernames", u.username), { email: u.email, uid: u.id });
        written++;
      } catch {
        failed++;
      }
    }

    setSyncingUsernames(false);
    setSyncResult({ written, skipped, failed, total: users.length });
  };

  const handleToggleDisable = async (user) => {
    try {
      await updateDoc(doc(db, "users", user.id), { disabled: !user.disabled });
      loadUsers();
    } catch { show("Gagal mengubah status.", "error"); }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-6xl mx-auto">
      <Toast />

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Manajemen Pengguna</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola akun dan hak akses pengguna sistem</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={loadUsers}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleSyncUsernames}
            disabled={syncingUsernames || loading}
            title="Sinkronkan koleksi 'usernames' agar semua akun lama bisa login dengan username"
            className="flex items-center gap-1.5 px-3 py-2 border border-violet-300 bg-violet-50 hover:bg-violet-100 disabled:opacity-50 text-violet-700 text-sm font-semibold rounded-lg transition-colors">
            <ArrowRightLeft className={`w-4 h-4 ${syncingUsernames ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{syncingUsernames ? "Menyinkronkan..." : "Sync Username"}</span>
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 text-sm font-semibold rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Tambah Pengguna</span>
            <span className="sm:hidden">Tambah</span>
          </button>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        <StatCard label="Total" value={stats.total} color="slate" />
        {ROLES.slice(0, 4).map(r => (
          <StatCard key={r.value} label={r.label} value={stats.byRole[r.value] || 0} color={
            r.value === "superadmin" ? "amber" :
            r.value === "admin"     ? "blue"  :
            r.value === "finance"   ? "emerald" : "violet"
          } />
        ))}
        <StatCard label="User"     value={stats.byRole.user  || 0} color="slate" />
        <StatCard label="Nonaktif" value={stats.disabled}         color="red" />
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            className="w-full h-10 pl-9 pr-4 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 bg-white placeholder-slate-400"
            placeholder="Cari nama, username, atau email..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <select
          className="h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400/40 bg-white text-slate-700"
          value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="all">Semua Peran</option>
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <select
          className="h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400/40 bg-white text-slate-700"
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="disabled">Nonaktif</option>
        </select>
      </div>

      {/* ── User table ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Result count */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {filtered.length} dari {users.length} pengguna
            {(search || filterRole !== "all" || filterStatus !== "all") && " (difilter)"}
          </span>
          {(search || filterRole !== "all" || filterStatus !== "all") && (
            <button onClick={() => { setSearch(""); setFilterRole("all"); setFilterStatus("all"); }}
              className="text-xs text-amber-600 hover:text-amber-700 font-medium">
              Reset filter
            </button>
          )}
        </div>

        {loading ? (
          <div className="divide-y divide-slate-100">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                <div className="w-9 h-9 rounded-full bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-slate-200 rounded w-36" />
                  <div className="h-3 bg-slate-100 rounded w-48" />
                </div>
                <div className="h-6 w-20 bg-slate-100 rounded-full" />
                <div className="h-6 w-14 bg-slate-100 rounded-full" />
                <div className="flex gap-1.5">
                  {[...Array(3)].map((_, j) => <div key={j} className="w-7 h-7 bg-slate-100 rounded-lg" />)}
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <UsersIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-medium">
              {search || filterRole !== "all" || filterStatus !== "all"
                ? "Tidak ada pengguna yang cocok dengan filter"
                : "Belum ada pengguna terdaftar"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Pengguna</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Peran</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(user => (
                  <tr key={user.id} className={`hover:bg-slate-50/80 transition-colors ${user.disabled ? "opacity-60" : ""}`}>
                    {/* Name + username */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={user.name} role={user.role} />
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-800 truncate">{user.name || "–"}</div>
                          <div className="text-xs text-slate-400 truncate">@{user.username || "–"}</div>
                        </div>
                      </div>
                    </td>
                    {/* Email */}
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell">
                      <span className="truncate max-w-[200px] block">{user.email}</span>
                    </td>
                    {/* Role */}
                    <td className="px-4 py-3">
                      <RoleBadge role={user.role} />
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <button
                        onClick={() => handleToggleDisable(user)}
                        title={user.disabled ? "Klik untuk aktifkan" : "Klik untuk nonaktifkan"}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all hover:opacity-80 ${
                          user.disabled
                            ? "bg-red-100 text-red-600"
                            : "bg-emerald-100 text-emerald-700"
                        }`}>
                        {user.disabled
                          ? <><UserX className="w-3 h-3" /> Nonaktif</>
                          : <><UserCheck className="w-3 h-3" /> Aktif</>}
                      </button>
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <ActionBtn
                          icon={<Edit2 className="w-3.5 h-3.5" />}
                          title="Edit pengguna"
                          color="blue"
                          onClick={() => setEditTarget(user)}
                        />
                        <ActionBtn
                          icon={<KeyRound className="w-3.5 h-3.5" />}
                          title="Reset password"
                          color="amber"
                          onClick={() => setResettingPw(user)}
                        />
                        <ActionBtn
                          icon={<Trash2 className="w-3.5 h-3.5" />}
                          title="Hapus pengguna"
                          color="red"
                          onClick={() => setDeleteTarget(user)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <UserFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSaved={loadUsers}
        existingUsers={users}
      />
      <UserFormModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={loadUsers}
        editUser={editTarget}
        existingUsers={users}
      />

      {/* Delete confirm */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Hapus Pengguna" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <Trash2 className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-red-800 font-semibold">Tindakan ini tidak dapat dibatalkan</p>
              <p className="text-sm text-red-700 mt-1">
                Data Firestore pengguna <strong>{deleteTarget?.name}</strong> ({deleteTarget?.email}) akan dihapus.
                Akun Firebase Auth tetap ada dan harus dihapus manual dari Firebase Console.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium">
              Batal
            </button>
            <button onClick={handleDelete}
              className="px-4 py-2 text-sm rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold">
              Hapus Pengguna
            </button>
          </div>
        </div>
      </Modal>

      {/* Sync username result */}
      <Modal open={!!syncResult} onClose={() => setSyncResult(null)} title="Hasil Sinkronisasi Username" size="sm">
        {syncResult && (
          <div className="space-y-4">
            <div className={`flex items-start gap-3 p-4 rounded-xl border ${
              syncResult.failed > 0
                ? "bg-red-50 border-red-200"
                : "bg-emerald-50 border-emerald-200"
            }`}>
              {syncResult.failed > 0
                ? <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                : <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />}
              <p className={`text-sm font-semibold ${syncResult.failed > 0 ? "text-red-800" : "text-emerald-800"}`}>
                {syncResult.failed > 0 ? "Sinkronisasi selesai dengan beberapa error" : "Sinkronisasi berhasil"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-emerald-700">{syncResult.written}</div>
                <div className="text-xs text-emerald-600 font-medium mt-0.5">Akun diperbarui</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-slate-500">{syncResult.skipped}</div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">Dilewati (tanpa username/email)</div>
              </div>
              {syncResult.failed > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center col-span-2">
                  <div className="text-2xl font-bold text-red-600">{syncResult.failed}</div>
                  <div className="text-xs text-red-500 font-medium mt-0.5">Gagal (cek koneksi / rules)</div>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Total {syncResult.total} pengguna diproses. Sekarang semua akun yang punya username dan email dapat login menggunakan username.
            </p>
            <div className="flex justify-end">
              <button onClick={() => setSyncResult(null)}
                className="px-4 py-2 text-sm rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold">
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reset password confirm */}
      <Modal open={!!resettingPw} onClose={() => setResettingPw(null)} title="Reset Password" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <KeyRound className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-amber-800 font-semibold">Kirim link reset password</p>
              <p className="text-sm text-amber-700 mt-1">
                Email berisi link reset password akan dikirim ke <strong>{resettingPw?.email}</strong>.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setResettingPw(null)}
              className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium">
              Batal
            </button>
            <button onClick={handleResetPw}
              className="px-4 py-2 text-sm rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold">
              Kirim Email Reset
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ── Tiny action button ── */
function ActionBtn({ icon, title, color, onClick }) {
  const colors = {
    blue:  "text-blue-500 hover:bg-blue-50 hover:text-blue-700",
    amber: "text-amber-500 hover:bg-amber-50 hover:text-amber-700",
    red:   "text-slate-400 hover:bg-red-50 hover:text-red-600",
  };
  return (
    <button
      title={title}
      onClick={onClick}
      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${colors[color]}`}
    >
      {icon}
    </button>
  );
}
