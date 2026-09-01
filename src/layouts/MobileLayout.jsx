import { useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Home, ClipboardList, UserCircle, Wallet } from "lucide-react";

const NAV = [
  { label: "Home",   path: "/app-mobile",               exact: true,  Icon: Home         },
  { label: "Tugas",  path: "/app-mobile/form-pengujian", exact: false, Icon: ClipboardList },
  { label: "Kasbon", path: "/app-mobile/kasbon",         exact: false, Icon: Wallet       },
  { label: "Akun",   path: "/app-mobile/profile",        exact: false, Icon: UserCircle   },
];

function MobileLayout() {
  const { user, loading } = useContext(AuthContext);
  const navigate  = useNavigate();
  const location  = useLocation();

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading]);

  if (loading) return <div className="p-6 text-center text-slate-400">Memuat...</div>;

  return (
    <div className="w-full min-h-screen bg-slate-50 flex flex-col">
      <div className="flex-1 pb-safe-nav">
        <Outlet />
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 pb-safe">
        <div className="flex">
          {NAV.map(({ label, path, exact, Icon }) => {
            const active = exact
              ? location.pathname === path
              : location.pathname.startsWith(path);
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 active:scale-95 transition-transform"
              >
                <Icon
                  size={22}
                  className={active ? "text-amber-500" : "text-slate-400"}
                  strokeWidth={active ? 2.5 : 1.8}
                />
                <span className={`text-[10px] font-medium ${active ? "text-amber-500" : "text-slate-400"}`}>
                  {label}
                </span>
                {active && <span className="absolute bottom-0 w-8 h-0.5 bg-amber-500 rounded-full" />}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default MobileLayout;
