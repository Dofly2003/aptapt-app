import { useState } from "react";
import { auth, db } from "../../firebase/config";
import { Capacitor } from "@capacitor/core";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";

import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithCredential,
  signOut,
  GoogleAuthProvider,
  sendPasswordResetEmail
} from "firebase/auth";

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc
} from "firebase/firestore";

import { useNavigate } from "react-router-dom";

const ERROR_MESSAGES = {
  "auth/invalid-credential": "Email atau password salah.",
  "auth/wrong-password": "Password salah.",
  "auth/user-not-found": "Email tidak terdaftar.",
  "auth/invalid-email": "Format email tidak valid.",
  "auth/user-disabled": "Akun ini telah dinonaktifkan.",
  "auth/too-many-requests": "Terlalu banyak percobaan. Coba lagi beberapa saat.",
  "auth/network-request-failed": "Gagal terhubung. Periksa koneksi internet Anda.",
};

function EyeIcon({ open }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.477 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}

function Login() {
  const navigate = useNavigate();
  const isNative = Capacitor.isNativePlatform();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState({ type: "", text: "" });

  /* =========================
     REDIRECT BERDASARKAN ROLE
  ========================= */

  const redirectAfterLogin = async (uid) => {
    try {
      const userRef = doc(db, "users", uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        setError("User tidak ditemukan di database.");
        return;
      }

      const userData = snap.data();

      if (userData.disabled) {
        setError("Akun ini telah dinonaktifkan.");
        return;
      }

      const redirectPath = localStorage.getItem("afterLoginRedirect");
      const isSafeRedirect = redirectPath
        && redirectPath.startsWith("/")
        && !redirectPath.startsWith("//")
        && redirectPath !== "/login"
        && redirectPath !== "/";
      if (isSafeRedirect) {
        localStorage.removeItem("afterLoginRedirect");
        navigate(redirectPath);
        return;
      }

      const lastProject = localStorage.getItem("lastProjectId");
      if (lastProject && /^[a-zA-Z0-9_-]+$/.test(lastProject)) {
        navigate(`/app-mobile/form-pengujian/${lastProject}`);
        return;
      }

      const isMobile = window.innerWidth < 768;
      if (userData.role === "superadmin") {
        navigate("/dashboard");
      } else if (userData.role === "admin") {
        navigate(isMobile ? "/app-mobile" : "/dashboard");
      } else if (userData.role === "user") {
        navigate("/app-mobile");
      } else if (userData.role === "guest") {
        navigate("/dashboard");
      } else {
        navigate("/");
      }
    } catch (err) {
      console.error("[redirectAfterLogin]", err.code);
      setError("Gagal mengambil data user.");
    }
  };

  /* =========================
     LOGIN USERNAME / EMAIL
  ========================= */

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      setLoading(true);
      let emailLogin = identifier;

      if (!identifier.includes("@")) {
        const guestEmail = `${identifier}@guest.adytia-pt.web.app`;
        try {
          const guestRes = await signInWithEmailAndPassword(auth, guestEmail, password);
          setTimeout(() => redirectAfterLogin(guestRes.user.uid), 100);
          setLoading(false);
          return;
        } catch (guestErr) {
          const guestNotFound = ["auth/user-not-found", "auth/invalid-email", "auth/invalid-credential"].includes(guestErr.code);
          if (!guestNotFound) {
            setError(ERROR_MESSAGES[guestErr.code] || "Login gagal. Silakan coba lagi.");
            setLoading(false);
            return;
          }
        }

        try {
          const q = query(collection(db, "users"), where("username", "==", identifier));
          const snap = await getDocs(q);
          if (snap.empty) {
            setError("Username tidak ditemukan.");
            setLoading(false);
            return;
          }
          emailLogin = snap.docs[0].data().email;
        } catch {
          setError("Username tidak ditemukan.");
          setLoading(false);
          return;
        }
      }

      const res = await signInWithEmailAndPassword(auth, emailLogin, password);
      setTimeout(() => redirectAfterLogin(res.user.uid), 100);
    } catch (err) {
      console.error("[handleLogin]", err.code);
      setError(ERROR_MESSAGES[err.code] || "Login gagal. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     LUPA PASSWORD
  ========================= */

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setResetMessage({ type: "", text: "" });

    if (!resetEmail.trim()) {
      setResetMessage({ type: "error", text: "Masukkan email terlebih dahulu." });
      return;
    }

    try {
      setResetLoading(true);
      await sendPasswordResetEmail(auth, resetEmail.trim());
      setResetMessage({ type: "success", text: "Link reset password telah dikirim ke email Anda. Periksa kotak masuk atau folder spam." });
    } catch (err) {
      const msg = {
        "auth/user-not-found": "Email tidak terdaftar.",
        "auth/invalid-email": "Format email tidak valid.",
        "auth/too-many-requests": "Terlalu banyak permintaan. Coba lagi nanti.",
      };
      setResetMessage({ type: "error", text: msg[err.code] || "Gagal mengirim email reset." });
    } finally {
      setResetLoading(false);
    }
  };

  /* =========================
     LOGIN GOOGLE
  ========================= */

  const loginGoogle = async () => {
    setError("");
    try {
      let user;
      if (isNative) {
        const result = await FirebaseAuthentication.signInWithGoogle();
        const idToken = result.credential?.idToken;
        const credential = GoogleAuthProvider.credential(idToken);
        const firebaseResult = await signInWithCredential(auth, credential);
        user = firebaseResult.user;
      } else {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        user = result.user;
      }

      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        const username = user.email.split("@")[0] + Math.floor(Math.random() * 1000);
        await setDoc(userRef, {
          name: user.displayName,
          email: user.email,
          username,
          role: "user",
          disabled: false,
          saldo: 0,
          createdAt: new Date()
        });
        await sendPasswordResetEmail(auth, user.email);
        setError("");
        alert("Akun berhasil dibuat.\nSilakan cek email untuk membuat password.");
      } else {
        const userData = snap.data();
        if (userData.disabled === true) {
          await signOut(auth);
          setError("Akun ini telah dinonaktifkan.");
          return;
        }
      }

      setTimeout(() => redirectAfterLogin(user.uid), 100);
    } catch (err) {
      console.error("[loginGoogle]", err);
      setError(ERROR_MESSAGES[err.code] || err.message || "Login Google gagal.");
    }
  };

  /* =========================
     UI
  ========================= */

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      <div className="w-full max-w-md">

        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="relative inline-flex items-center justify-center mb-5">
            {/* glow ring */}
            <div className="absolute w-24 h-24 rounded-full bg-amber-500 opacity-20 blur-xl" />
            {/* outer ring */}
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-xl flex items-center justify-center">
              {/* inner circle */}
              <div className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white drop-shadow" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
                </svg>
              </div>
            </div>
          </div>
          <h1 className="text-white text-2xl font-bold tracking-tight">PT Adytia Putra Tehnik</h1>
          <p className="text-slate-400 text-sm mt-1">Sistem Informasi Manajemen</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">

          {!showReset ? (
            <>
              <h2 className="text-xl font-bold text-slate-800 mb-6">Masuk ke Akun</h2>

              {/* Error Banner */}
              {error && (
                <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">

                {/* Identifier */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Username / Email
                  </label>
                  <input
                    type="text"
                    placeholder="Masukkan username atau email"
                    value={identifier}
                    onChange={(e) => { setIdentifier(e.target.value); setError(""); }}
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
                    required
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Masukkan password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(""); }}
                      className="w-full border border-slate-200 rounded-lg px-4 py-2.5 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                    >
                      <EyeIcon open={showPassword} />
                    </button>
                  </div>
                  <div className="flex justify-end mt-1.5">
                    <button
                      type="button"
                      onClick={() => { setShowReset(true); setResetEmail(identifier.includes("@") ? identifier : ""); setResetMessage({ type: "", text: "" }); }}
                      className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                    >
                      Lupa password?
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition text-sm"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Memproses...
                    </span>
                  ) : "Masuk"}
                </button>
              </form>

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-400">atau</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              <button
                onClick={loginGoogle}
                className="w-full flex items-center justify-center gap-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium py-2.5 rounded-lg transition text-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Masuk dengan Google
              </button>
            </>
          ) : (
            /* ===== FORM LUPA PASSWORD ===== */
            <>
              <button
                onClick={() => { setShowReset(false); setResetMessage({ type: "", text: "" }); }}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-5 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Kembali ke login
              </button>

              <h2 className="text-xl font-bold text-slate-800 mb-1">Lupa Password</h2>
              <p className="text-sm text-slate-500 mb-6">
                Masukkan email akun Anda. Kami akan mengirimkan link untuk mereset password.
              </p>

              {resetMessage.text && (
                <div className={`mb-4 flex items-start gap-2 text-sm rounded-lg px-4 py-3 ${
                  resetMessage.type === "success"
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                    : "bg-red-50 border border-red-200 text-red-700"
                }`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {resetMessage.type === "success" ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    )}
                  </svg>
                  {resetMessage.text}
                </div>
              )}

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="Masukkan email terdaftar"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={resetLoading || resetMessage.type === "success"}
                  className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition text-sm"
                >
                  {resetLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Mengirim...
                    </span>
                  ) : "Kirim Link Reset"}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          © {new Date().getFullYear()} PT Adytia Putra Tehnik
        </p>
      </div>
    </div>
  );
}

export default Login;
