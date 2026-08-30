import { Link } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { auth } from "../firebase/config";
import { onAuthStateChanged, signOut } from "firebase/auth";

export default function NavPublic() {
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  // 🔥 CLOSE DROPDOWN KLIK LUAR
  useEffect(() => {
    const handleClick = (e) => {
      if (!dropdownRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  // 🔥 INISIAL
  const getInitial = (email) => {
    if (!email) return "?";
    return email.charAt(0).toUpperCase();
  };

  return (
    <nav className="flex justify-between items-center px-4 md:px-6 py-4 bg-white shadow">

      {/* LOGO */}
      <a href="/" className="flex items-center gap-2 shrink-0 min-w-0">
        <img src="/icon-512.png" alt="Logo PT Adytia Putra Teknik" className="h-9 w-auto object-contain flex-none" />
        <span className="font-bold text-lg whitespace-nowrap hidden sm:block">
          PT. Adytia Putra Teknik
        </span>
      </a>

      {/* MENU */}
      <div className="flex items-center gap-4 md:gap-6 shrink-0">

        <Link to="/" className="hover:text-blue-600 text-sm md:text-base">
          Home
        </Link>

        <Link to="/about" className="hover:text-blue-600 text-sm md:text-base">
          About
        </Link>

        <Link to="/contact" className="hover:text-blue-600 text-sm md:text-base">
          Contact
        </Link>

        {/* 🔥 USER PROFILE */}
        {user && (
          <div className="relative" ref={dropdownRef}>

            {/* AVATAR */}
            <div
              onClick={() => setOpen(!open)}
              className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center cursor-pointer overflow-hidden"
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-bold">
                  {getInitial(user.email)}
                </span>
              )}
            </div>

            {/* 🔥 DROPDOWN */}
            {open && (
              <div className="absolute right-0 mt-2 w-44 bg-white border rounded-xl shadow-lg z-50 overflow-hidden">

                <div className="px-4 py-2 text-xs text-gray-500 border-b">
                  {user.email}
                </div>

                <Link
                  to="/pesanan-saya"
                  onClick={() => setOpen(false)}
                  className="block px-4 py-2 hover:bg-gray-100 text-sm"
                >
                  📦 Pesanan Saya
                </Link>

                <button
                  onClick={() => {
                    signOut(auth);
                    setOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 text-sm"
                >
                  🚪 Logout
                </button>

              </div>
            )}

          </div>
        )}

      </div>
    </nav>
  );
}