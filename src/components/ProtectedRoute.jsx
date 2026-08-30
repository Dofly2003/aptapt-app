import { useContext } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const DASHBOARD_ROLES = ["admin", "superadmin", "finance", "editor", "guest"];
const MOBILE_ROLES    = ["user", "admin", "superadmin", "finance", "editor", "guest"];

const WEB_MODULE_MAP = {
  "/dashboard/rab":       "rab",
  "/dashboard/instansi":  "instansi",
  "/dashboard/pengujian": "pengujian",
  "/dashboard/invoice":   "invoice",
  "/dashboard/keuangan":  "keuangan",
  "/dashboard/sdm":       "sdm",
  "/dashboard/pengadaan": "pengadaan",
  "/dashboard/inventori": "inventori",
  "/dashboard/produksi":  "produksi",
  "/dashboard/penjualan": "penjualan",
  "/dashboard/proyek":    "proyek",
  "/dashboard/aset":      "aset",
};

const MOBILE_MODULE_MAP = {
  "/app-mobile/form-pengujian": "pengujian",
  "/app-mobile/rab":            "rab",
  "/app-mobile/invoice":        "invoice",
  "/app-mobile/keuangan":       "keuangan",
  "/app-mobile/inventori":      "inventori",
};

function getGuestModule(path, map) {
  const match = Object.entries(map).find(([prefix]) => path.startsWith(prefix));
  return match ? match[1] : null;
}

function ProtectedRoute({ children }) {
  const { user, role, isReady, needsSetup, authError, guestPermissions, guestExpired } = useContext(AuthContext);
  const location = useLocation();
  const path = location.pathname.toLowerCase();

  if (!isReady) {
    return <div className="p-10 text-center">Memuat...</div>;
  }

  if (guestExpired) {
    return (
      <div className="p-10 text-center">
        <p className="text-red-600 font-semibold mb-2">Akun sementara Anda telah berakhir.</p>
        <p className="text-sm text-gray-500">Hubungi administrator untuk memperpanjang akses.</p>
        <button
          onClick={() => window.location.href = "/login"}
          className="mt-4 px-4 py-2 bg-amber-500 text-white rounded-lg"
        >
          Kembali ke Login
        </button>
      </div>
    );
  }

  if (!user) {
    const safePath = location.pathname;
    if (safePath.startsWith("/") && !safePath.startsWith("//")) {
      localStorage.setItem("afterLoginRedirect", safePath);
    }
    return <Navigate to="/login" replace />;
  }

  if (needsSetup) {
    return <Navigate to="/login" replace />;
  }

  if (authError) {
    return (
      <div className="p-10 text-center">
        <p className="text-red-600 font-semibold mb-2">Gagal memuat profil.</p>
        <p className="text-sm text-gray-500">Periksa koneksi internet lalu muat ulang halaman.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-amber-500 text-white rounded-lg"
        >
          Muat Ulang
        </button>
      </div>
    );
  }

  /* ─── GUEST ROUTE GUARDS ─── */
  if (role === "guest") {
    if (path.startsWith("/dashboard")) {
      if (!DASHBOARD_ROLES.includes(role)) return <Navigate to="/app-mobile" replace />;

      // Block pages guests should never access
      const blocked = ["/dashboard/users", "/dashboard/landing", "/dashboard/settings",
        "/dashboard/nidi", "/dashboard/guest-accounts", "/dashboard/guest-approvals"];
      if (blocked.some((b) => path.startsWith(b))) return <Navigate to="/dashboard" replace />;

      // Module-level permission check
      const module = getGuestModule(path, WEB_MODULE_MAP);
      if (module) {
        const perm = guestPermissions?.web?.[module] ?? "none";
        if (perm === "none") return <Navigate to="/dashboard" replace />;
      }
    }

    if (path.startsWith("/app-mobile")) {
      if (path === "/app-mobile/user-management") return <Navigate to="/app-mobile" replace />;
      if (path === "/app-mobile/modul") return <Navigate to="/app-mobile" replace />;

      const module = getGuestModule(path, MOBILE_MODULE_MAP);
      if (module) {
        const perm = guestPermissions?.mobile?.[module] ?? "none";
        if (perm === "none") return <Navigate to="/app-mobile" replace />;
      }
    }

    return children;
  }

  /* ─── DASHBOARD ─── */
  if (path.startsWith("/dashboard")) {
    if (!DASHBOARD_ROLES.includes(role)) {
      return <Navigate to="/app-mobile" replace />;
    }

    if (path === "/dashboard/users" && role !== "superadmin") {
      return <Navigate to="/dashboard" replace />;
    }

    if (path.startsWith("/dashboard/keuangan") && !["superadmin", "finance"].includes(role)) {
      return <Navigate to="/dashboard" replace />;
    }

    if (
      (path.startsWith("/dashboard/sdm") || path.startsWith("/dashboard/pengadaan")) &&
      !["admin", "superadmin"].includes(role)
    ) {
      return <Navigate to="/dashboard" replace />;
    }

    if (path.startsWith("/dashboard/guest-accounts") && role !== "superadmin") {
      return <Navigate to="/dashboard" replace />;
    }

    if (path.startsWith("/dashboard/guest-approvals") && !["admin", "superadmin"].includes(role)) {
      return <Navigate to="/dashboard" replace />;
    }

    // Editor hanya boleh akses landing CMS dan dashboard utama
    if (role === "editor") {
      const editorAllowed = [
        "/dashboard",
        "/dashboard/landing",
        "/dashboard/settings/company",
      ];
      const isAllowed = editorAllowed.some(p => path === p || path.startsWith(p + "/"));
      if (!isAllowed) return <Navigate to="/dashboard" replace />;
    }

    // Finance hanya boleh akses keuangan dan dashboard utama
    if (role === "finance") {
      const financeAllowed = [
        "/dashboard",
        "/dashboard/keuangan",
        "/dashboard/settings/company",
      ];
      const isAllowed = financeAllowed.some(p => path === p || path.startsWith(p + "/"));
      if (!isAllowed) return <Navigate to="/dashboard" replace />;
    }

    // Settings company hanya admin+
    if (path.startsWith("/dashboard/settings") && !["admin", "superadmin"].includes(role)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  /* ─── MOBILE ─── */
  if (path.startsWith("/app-mobile")) {
    if (!MOBILE_ROLES.includes(role)) {
      return <Navigate to="/" replace />;
    }

    if (path.startsWith("/app-mobile/keuangan") && !["superadmin", "finance"].includes(role)) {
      return <Navigate to="/app-mobile" replace />;
    }

    if (path.startsWith("/app-mobile/inventori") && !["admin", "superadmin", "finance"].includes(role)) {
      return <Navigate to="/app-mobile" replace />;
    }

    if (path.startsWith("/app-mobile/rab") && !["admin", "superadmin"].includes(role)) {
      return <Navigate to="/app-mobile" replace />;
    }

    if (path.startsWith("/app-mobile/invoice") && !["admin", "superadmin", "finance"].includes(role)) {
      return <Navigate to="/app-mobile" replace />;
    }
  }

  return children;
}

export default ProtectedRoute;
