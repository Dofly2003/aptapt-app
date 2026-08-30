import { useEffect, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { AuthContext } from "../context/AuthContext";

const isNative = Capacitor.isNativePlatform();

function RedirectMobile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useContext(AuthContext);

  useEffect(() => {
    if (!isNative) return;
    if (loading) return;

    // belum login → arahkan ke login
    if (!user) {
      if (location.pathname !== "/login") navigate("/login", { replace: true });
      return;
    }

    // sudah login tapi bukan di app-mobile → redirect
    if (!location.pathname.startsWith("/app-mobile")) {
      navigate("/app-mobile", { replace: true });
    }
  }, [user, loading, location.pathname]);

  return null;
}

export default RedirectMobile;