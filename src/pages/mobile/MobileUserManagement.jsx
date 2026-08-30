import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { db, firebaseConfig } from "../../firebase/config";
import {
  collection, getDocs, doc, updateDoc, deleteDoc,
  query, where, setDoc,
} from "firebase/firestore";
import {
  getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail,
} from "firebase/auth";
import { initializeApp, getApps } from "firebase/app";
import { AuthContext } from "../../context/AuthContext";
import {
  ArrowLeft, Plus, X, ShieldCheck, Search, RefreshCw,
  ChevronDown, Trash2, KeyRound, Power, UserCog,
} from "lucide-react";

const secondaryApp =
  getApps().find(a => a.name === "secondary") ||
  initializeApp(firebaseConfig, "secondary");
const secondaryAuth = getAuth(secondaryApp);

const ROLES = ["user", "admin", "finance", "superadmin"];
const ROLE_LABEL  = { user: "User", admin: "Admin", finance: "Finance", superadmin: "Super Admin" };
const ROLE_COLOR  = {
  user:       "bg-slate-100 text-slate-600",
  admin:      "bg-blue-100 text-blue-700",
  finance:    "bg-emerald-100 text-emerald-700",
  superadmin: "bg-amber-100 text-amber-700",
};
const ROLE_AVATAR = {
  user:       "bg-slate-200 text-slate-600",
  admin:      "bg-blue-100 text-blue-700",
  finance:    "bg-emerald-100 text-emerald-700",
  superadmin: "bg-amber-100 text-amber-700",
};

const inp = "w-full h-11 px-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-colors placeholder-slate-300";

function Avatar({ name, role }) {
  const initials = (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-bold shrink-0 ${ROLE_AVATAR[role] || ROLE_AVATAR.user}`}>
      {initials}
    </div>
  );
}

function Toast({ msg, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white text-sm font-medium px-5 py-2.5 rounded-2xl shadow-lg animate-in fade-in slide-in-from-bottom-2 whitespace-nowrap">
      {msg}
    </div>
  );
}

export default function MobileUserManagement() {
  const navigate  = useNavigate();
  const { role }  = useContext(AuthContext);

  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [toast, setToast]       = useState(null);

  /* sheets */
  const [addSheet, setAddSheet]       = useState(false);
  const [roleSheet, setRoleSheet]     = useState(null); // user obj
  const [deleteSheet, setDeleteSheet] = useState(null); // user obj

  const [form, setForm]   = useState({ name: "", email: "", password: "", role: "user" });
  const [saving, setSaving] = useState(false);

  const notify = (msg) => setToast(msg);

  useEffect(() => {
    if (role && role !== "superadmin") navigate("/app-mobile/profile", { replace: true });
  }, [role]);

  const load = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "users"));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setUsers(list);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  /* ── CREATE ── */
  const handleCreate = async () => {
    const { name, email, password, role: r } = form;
    if (!name.trim() || !email.trim() || !password.trim()) {
      notify("Semua field wajib diisi"); return;
    }
    setSaving(true);
    try {
      const check = await getDocs(query(collection(db, "users"), where("email", "==", email)));
      if (!check.empty) { notify("Email sudah terdaftar"); return; }
      const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      await setDoc(doc(db, "users", cred.user.uid), {
        name, email, role: r, disabled: false, createdAt: new Date(),
      });
      setForm({ name: "", email: "", password: "", role: "user" });
      setAddSheet(false);
      notify("User berhasil dibuat");
      load();
    } catch {
      notify("Gagal membuat user, coba lagi");
    } finally { setSaving(false); }
  };

  /* ── UPDATE ROLE ── */
  const handleUpdateRole = async (id, newRole) => {
    try {
      await updateDoc(doc(db, "users", id), { role: newRole });
      setRoleSheet(null);
      notify("Role berhasil diubah");
      load();
    } catch { notify("Gagal mengubah role"); }
  };

  /* ── TOGGLE DISABLE ── */
  const handleToggle = async (u) => {
    try {
      await updateDoc(doc(db, "users", u.id), { disabled: !u.disabled });
      notify(u.disabled ? "User diaktifkan" : "User dinonaktifkan");
      load();
    } catch { notify("Gagal mengubah status"); }
  };

  /* ── RESET PASSWORD ── */
  const handleReset = async (email) => {
    try {
      await sendPasswordResetEmail(secondaryAuth, email);
      notify("Link reset dikirim ke " + email);
    } catch { notify("Gagal mengirim link reset"); }
  };

  /* ── DELETE ── */
  const handleDelete = async () => {
    if (!deleteSheet) return;
    try {
      await deleteDoc(doc(db, "users", deleteSheet.id));
      setDeleteSheet(null);
      notify("User dihapus");
      load();
    } catch { notify("Gagal menghapus user"); }
  };

  /* ── FILTER ── */
  const visible = users.filter(u => {
    const matchRole   = filterRole === "all" || u.role === filterRole;
    const matchSearch = !search || (u.name || "").toLowerCase().includes(search.toLowerCase())
      || (u.email || "").toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── HEADER ── */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3 pt-safe sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-slate-500 active:scale-90 transition-transform">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-slate-800">User Management</h1>
          <p className="text-xs text-slate-400">{users.length} pengguna terdaftar</p>
        </div>
        <button onClick={load}
          className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 active:scale-90 transition-transform mr-1">
          <RefreshCw size={14} />
        </button>
        <button onClick={() => setAddSheet(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 text-white text-xs font-semibold rounded-xl active:scale-95 transition-transform">
          <Plus size={15} /> Tambah
        </button>
      </div>

      <div className="p-4 space-y-3">

        {/* ── SEARCH ── */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama atau email..."
            className="w-full h-10 pl-9 pr-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-colors placeholder-slate-300" />
        </div>

        {/* ── FILTER TABS ── */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {["all", ...ROLES].map(r => (
            <button key={r} onClick={() => setFilterRole(r)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors
                ${filterRole === r ? "bg-amber-500 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>
              {r === "all" ? `Semua (${users.length})` : `${ROLE_LABEL[r]} (${users.filter(u => u.role === r).length})`}
            </button>
          ))}
        </div>

        {/* ── LOADING ── */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-white rounded-2xl border border-slate-100 animate-pulse" />
            ))}
          </div>
        )}

        {/* ── EMPTY ── */}
        {!loading && visible.length === 0 && (
          <div className="text-center py-16">
            <ShieldCheck className="w-12 h-12 mx-auto text-slate-200 mb-3" />
            <p className="text-slate-400 text-sm">Tidak ada user ditemukan</p>
          </div>
        )}

        {/* ── USER LIST ── */}
        {!loading && visible.map(u => (
          <div key={u.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-4 flex items-center gap-3">
              <Avatar name={u.name} role={u.role} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-semibold text-slate-800 truncate">{u.name || "—"}</p>
                  {u.disabled && (
                    <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-500 font-medium">Nonaktif</span>
                  )}
                </div>
                <p className="text-xs text-slate-400 truncate">{u.email}</p>
                <span className={`inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full font-semibold ${ROLE_COLOR[u.role] || ROLE_COLOR.user}`}>
                  {ROLE_LABEL[u.role] || u.role}
                </span>
              </div>
            </div>

            {/* Action row */}
            <div className="border-t border-slate-50 grid grid-cols-4">
              <button onClick={() => setRoleSheet(u)}
                className="flex flex-col items-center gap-1 py-2.5 text-blue-600 active:bg-blue-50 transition-colors">
                <UserCog size={15} />
                <span className="text-[10px] font-medium">Role</span>
              </button>
              <button onClick={() => handleToggle(u)}
                className={`flex flex-col items-center gap-1 py-2.5 transition-colors active:bg-slate-50
                  ${u.disabled ? "text-emerald-600" : "text-amber-600"}`}>
                <Power size={15} />
                <span className="text-[10px] font-medium">{u.disabled ? "Aktifkan" : "Nonaktif"}</span>
              </button>
              <button onClick={() => handleReset(u.email)}
                className="flex flex-col items-center gap-1 py-2.5 text-slate-500 active:bg-slate-50 transition-colors">
                <KeyRound size={15} />
                <span className="text-[10px] font-medium">Reset</span>
              </button>
              <button onClick={() => setDeleteSheet(u)}
                className="flex flex-col items-center gap-1 py-2.5 text-red-500 active:bg-red-50 transition-colors">
                <Trash2 size={15} />
                <span className="text-[10px] font-medium">Hapus</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ══ SHEET: TAMBAH USER ══ */}
      {addSheet && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[55]" onClick={() => setAddSheet(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-3xl px-4 pt-3 pb-safe-sheet max-h-[90vh] overflow-y-auto">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-slate-800">Tambah User Baru</h2>
              <button onClick={() => setAddSheet(false)} className="text-slate-400 active:scale-90">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Nama Lengkap *</label>
                <input type="text" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Budi Santoso"
                  className={inp} />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Email *</label>
                <input type="email" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="budi@perusahaan.com"
                  className={inp} />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Password *</label>
                <input type="password" value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Min. 6 karakter"
                  className={inp} />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-2 block">Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map(r => (
                    <button key={r} onClick={() => setForm(f => ({ ...f, role: r }))}
                      className={`py-2.5 rounded-xl text-sm font-medium border transition-colors
                        ${form.role === r ? "bg-amber-500 border-amber-500 text-white" : "bg-white border-slate-200 text-slate-600"}`}>
                      {ROLE_LABEL[r]}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={handleCreate} disabled={saving}
                className="w-full mt-2 py-3 bg-amber-500 text-white font-bold text-sm rounded-2xl active:scale-[0.98] transition-transform disabled:opacity-50">
                {saving ? "Membuat..." : "Buat User"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ══ SHEET: GANTI ROLE ══ */}
      {roleSheet && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[55]" onClick={() => setRoleSheet(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-3xl px-4 pt-3 pb-safe-sheet">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
            <div className="flex items-center gap-3 mb-5">
              <Avatar name={roleSheet.name} role={roleSheet.role} />
              <div>
                <p className="font-bold text-slate-800 text-sm">{roleSheet.name}</p>
                <p className="text-xs text-slate-400">{roleSheet.email}</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-3">Pilih Role Baru</p>
            <div className="space-y-2">
              {ROLES.map(r => (
                <button key={r} onClick={() => handleUpdateRole(roleSheet.id, r)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border text-sm font-medium transition-colors
                    ${roleSheet.role === r
                      ? "bg-amber-500 border-amber-500 text-white"
                      : "bg-white border-slate-200 text-slate-700 active:bg-slate-50"}`}>
                  <span>{ROLE_LABEL[r]}</span>
                  {roleSheet.role === r && <span className="text-xs opacity-80">Aktif</span>}
                </button>
              ))}
            </div>
            <button onClick={() => setRoleSheet(null)}
              className="w-full mt-3 py-3 text-slate-500 text-sm font-medium active:opacity-70">
              Batal
            </button>
          </div>
        </>
      )}

      {/* ══ SHEET: KONFIRMASI HAPUS ══ */}
      {deleteSheet && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[55]" onClick={() => setDeleteSheet(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-3xl px-4 pt-3 pb-safe-sheet">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
            <p className="text-sm font-semibold text-slate-800 mb-1">Hapus user ini?</p>
            <p className="text-xs text-slate-400 mb-5">{deleteSheet.name} · {deleteSheet.email}</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteSheet(null)}
                className="flex-1 py-3 border border-slate-200 rounded-2xl text-sm font-medium text-slate-600 active:scale-95">
                Batal
              </button>
              <button onClick={handleDelete}
                className="flex-1 py-3 bg-red-500 text-white rounded-2xl text-sm font-semibold active:scale-95">
                Hapus
              </button>
            </div>
          </div>
        </>
      )}

      {/* ══ TOAST ══ */}
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
