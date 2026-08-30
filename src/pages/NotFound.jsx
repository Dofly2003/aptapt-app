import { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function NotFound() {
  const { role } = useContext(AuthContext);
  const navigate = useNavigate();

  // 🔥 Redirect sesuai role
  const homePath =
    role === "admin" || role === "superadmin"
      ? "/dashboard"
      : "/";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white px-4">

      {/* CARD */}
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-8 text-center">

        {/* ICON */}
        <div className="text-6xl mb-4 animate-bounce">
          🚧
        </div>

        {/* TITLE */}
        <h1 className="text-5xl font-extrabold text-blue-400 mb-2">
          404
        </h1>

        <h2 className="text-lg font-semibold mb-2">
          Halaman tidak ditemukan
        </h2>

        <p className="text-sm text-gray-300 mb-6">
          Halaman yang kamu cari mungkin sudah dipindahkan atau tidak tersedia
        </p>

        {/* ACTION BUTTON */}
        <div className="flex flex-col sm:flex-row gap-3">

          {/* BACK */}
          <button
            onClick={() => navigate(-1)}
            className="flex-1 bg-gray-700 hover:bg-gray-600 transition px-4 py-2 rounded-xl"
          >
            ⬅ Kembali
          </button>

          {/* HOME */}
          <Link
            to={homePath}
            className="flex-1 bg-blue-600 hover:bg-blue-700 transition px-4 py-2 rounded-xl shadow"
          >
            🏠 Home
          </Link>

        </div>

      </div>

    </div>
  );
}