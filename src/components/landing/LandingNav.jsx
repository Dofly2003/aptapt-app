// src/components/landing/LandingNav.jsx
import { useState, useEffect, useRef, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Phone, Package, LogIn, LogOut, ChevronDown, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSettings } from '../../hooks/useContent';
import { auth } from '../../firebase/config';
import { signOut } from 'firebase/auth';
import { AuthContext } from '../../context/AuthContext';

const APK_URL =
  'https://firebasestorage.googleapis.com/v0/b/adytia-pt.firebasestorage.app/o/downloads%2Fapp-adytia-latest.apk?alt=media';

const NAV_LINKS = [
  { label: 'Beranda', href: '#hero' },
  { label: 'Layanan', href: '#services' },
  { label: 'Proyek', href: '#projects' },
  { label: 'Testimoni', href: '#testimonials' },
  { label: 'Kontak', href: '#contact' },
];

export default function LandingNav() {
  const { data: settings } = useSettings();
  const { user, role, profile } = useContext(AuthContext);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24);
    handler();
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (!dropdownRef.current?.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isAdminUp = role === 'admin' || role === 'superadmin';
  const displayName = profile?.username || user?.displayName || user?.email?.split('@')[0] || 'Akun';
  const initial = (displayName[0] || 'U').toUpperCase();

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-30 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur shadow-sm' : 'bg-transparent'
          }`}
      >
        <div className="container mx-auto px-6 lg:px-12 h-18 py-4 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/40">
              <img
                src="/icon-512.png"
                alt="PT. Adytia Putra Teknik"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="leading-tight whitespace-nowrap">
              <p className={`font-bold text-base ${scrolled ? 'text-slate-900' : 'text-white'}`}>
                {settings?.companyName || 'PT. Adytia Putra Teknik'}
              </p>
              <p className={`text-[10px] uppercase tracking-wider ${scrolled ? 'text-slate-500' : 'text-amber-300'}`}>
                Electrical Services
              </p>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-8">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className={`text-sm font-medium transition-colors ${scrolled
                    ? 'text-slate-700 hover:text-amber-600'
                    : 'text-white/90 hover:text-amber-300'
                  }`}
              >
                {l.label}
              </a>
            ))}
          </nav>

          {/* CTA */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <a
              href="#contact"
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg text-sm transition-all shadow-lg shadow-amber-500/30"
            >
              {settings?.ctaPrimaryText || 'Konsultasi Gratis'}
            </a>

            {/* User menu */}
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen((v) => !v)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    scrolled ? 'text-slate-700 hover:bg-slate-100' : 'text-white hover:bg-white/10'
                  }`}
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={displayName} referrerPolicy="no-referrer"
                      className="w-7 h-7 rounded-full object-cover ring-2 ring-amber-400" />
                  ) : (
                    <span className="w-7 h-7 rounded-full bg-amber-500 text-slate-900 flex items-center justify-center font-bold text-xs">
                      {initial}
                    </span>
                  )}
                  <span className="max-w-[96px] truncate">{displayName}</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </button>
                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50"
                    >
                      <div className="px-4 py-2.5 border-b border-slate-100">
                        <p className="text-xs font-semibold text-slate-900 truncate">{displayName}</p>
                        {user.email && <p className="text-[11px] text-slate-500 truncate">{user.email}</p>}
                      </div>
                      <Link
                        to="/pesanan-saya"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition"
                      >
                        <Package className="w-4 h-4" />
                        Pesanan Saya
                      </Link>
                      <Link
                        to="/daftar-nidi-slo"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition"
                      >
                        <LogIn className="w-4 h-4" />
                        Daftar NIDI/SLO
                      </Link>
                      {isAdminUp && (
                        <a
                          href={APK_URL}
                          download="app-adytia-latest.apk"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-emerald-700 hover:bg-emerald-50 transition"
                        >
                          <Smartphone className="w-4 h-4" />
                          Download App Mobile
                        </a>
                      )}
                      <button
                        onClick={() => { signOut(auth); setDropdownOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition border-t border-slate-100"
                      >
                        <LogOut className="w-4 h-4" />
                        Keluar
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                to="/login"
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition ${
                  scrolled
                    ? 'border-slate-300 text-slate-700 hover:bg-slate-50'
                    : 'border-white/30 text-white hover:bg-white/10'
                }`}
              >
                <LogIn className="w-4 h-4" />
                Masuk
              </Link>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setOpen(true)}
            className={`lg:hidden p-2 rounded-lg ${scrolled ? 'text-slate-900' : 'text-white'}`}
            aria-label="Buka menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 lg:hidden"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white p-6 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <p className="font-bold text-slate-900">Menu</p>
                <button onClick={() => setOpen(false)} className="p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User info (mobile) */}
              {user ? (
                <div className="flex items-center gap-3 mb-5 p-3 bg-amber-50 rounded-xl">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={displayName} referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-400 shrink-0" />
                  ) : (
                    <span className="w-10 h-10 rounded-full bg-amber-500 text-slate-900 flex items-center justify-center font-bold shrink-0">
                      {initial}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate text-sm">{displayName}</p>
                    {user.email && <p className="text-xs text-slate-500 truncate">{user.email}</p>}
                  </div>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-2 mb-5 px-4 py-2.5 border border-amber-400 text-amber-700 font-semibold rounded-lg text-sm hover:bg-amber-50 transition"
                >
                  <LogIn className="w-4 h-4" />
                  Masuk / Daftar
                </Link>
              )}

              <nav className="flex flex-col gap-1">
                {user && (
                  <>
                    <Link
                      to="/pesanan-saya"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-3 rounded-lg text-slate-700 hover:bg-amber-50 hover:text-amber-700 font-medium"
                    >
                      <Package className="w-4 h-4" />
                      Pesanan Saya
                    </Link>
                    <Link
                      to="/daftar-nidi-slo"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-3 rounded-lg text-slate-700 hover:bg-amber-50 hover:text-amber-700 font-medium"
                    >
                      <LogIn className="w-4 h-4" />
                      Daftar NIDI/SLO
                    </Link>
                    {isAdminUp && (
                      <a
                        href={APK_URL}
                        download="app-adytia-latest.apk"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-3 rounded-lg text-emerald-700 hover:bg-emerald-50 font-medium"
                      >
                        <Smartphone className="w-4 h-4" />
                        Download App Mobile
                      </a>
                    )}
                  </>
                )}
              </nav>

              <a
                href="#contact"
                onClick={() => setOpen(false)}
                className="mt-6 block text-center px-5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg"
              >
                {settings?.ctaPrimaryText || 'Konsultasi Gratis'}
              </a>

              {user && (
                <button
                  onClick={() => { signOut(auth); setOpen(false); }}
                  className="mt-3 flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Keluar
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}