import { useContext } from "react";
import { Menu, Smartphone } from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import { auth } from "../firebase/config";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const APK_URL =
  "https://firebasestorage.googleapis.com/v0/b/adytia-pt.firebasestorage.app/o/downloads%2Fapp-adytia-latest.apk?alt=media";

function Navbar({ openSidebar }) {

  const { role, profile } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);

      // 🔥 redirect tanpa reload
      navigate("/login");

    } catch (error) {
      console.log(error);
      alert("Gagal logout");
    }
  };

  return (

    <div className="flex justify-between items-center bg-white px-4 md:px-6 py-3 border-b">

      {/* LEFT AREA */}
      <div className="flex items-center gap-3">

        {/* HAMBURGER MENU MOBILE */}
        <button
          className="md:hidden"
          onClick={openSidebar}
        >
          <Menu size={22} />
        </button>

        <h1 className="font-semibold">
          Dashboard PT. Adytia
        </h1>

      </div>

      {/* RIGHT AREA */}
      <div className="flex items-center gap-3">

        {(role === "admin" || role === "superadmin") && (
          <a
            href={APK_URL}
            download="app-adytia-latest.apk"
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            title="Download Aplikasi Mobile"
          >
            <Smartphone size={14} />
            <span className="hidden sm:inline">Download App</span>
          </a>
        )}

        <div className="text-right">

          <p className="text-sm font-semibold">
            {profile?.username || "Loading..."}
          </p>

          <p className="text-xs text-gray-500 capitalize">
            {role || "user"}
          </p>

        </div>

        <img
          src={profile?.photoURL || "https://i.pravatar.cc/40"}
          className="w-8 h-8 rounded-full"
          alt="profile"
        />

        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
        >
          Logout
        </button>

      </div>

    </div>

  );

}

export default Navbar;