import { Link, useLocation } from "react-router-dom";
import { useContext, useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AuthContext } from "../context/AuthContext";
import { usePendingApprovalsCount } from "../hooks/usePendingApprovalsCount";
import {
  LayoutDashboard, Receipt, Users, LayoutTemplate, ChevronDown, ChevronRight, X,
  Building2, Wallet, UserSquare2, ShoppingCart, Package, Factory,
  ShoppingBag, FolderKanban, Wrench, FileText, ClipboardList, ShieldCheck, ClipboardCheck,
  Award, FolderUp, CalendarDays, Bell, FileOutput,
} from "lucide-react";

function NavSection({ label, children }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase mb-2 px-1">{label}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function CollapseMenu({ icon, label, basePath, open, onToggle, children }) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-300 hover:bg-slate-800 rounded-lg"
      >
        <div className="flex items-center gap-3">
          {icon}
          {label}
        </div>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {open && (
        <div className="ml-6 mt-1 space-y-0.5">{children}</div>
      )}
    </div>
  );
}

function Sidebar({ closeSidebar }) {
  const location = useLocation();
  const { role, guestPermissions } = useContext(AuthContext);
  const BASE = "/dashboard";

  const [openNidi,    setOpenNidi]    = useState(false);
  const [openLanding, setOpenLanding] = useState(false);
  const [openKeuangan, setOpenKeuangan] = useState(false);
  const [openSdm,     setOpenSdm]     = useState(false);
  const [openPengadaan, setOpenPengadaan] = useState(false);
  const [openInventori, setOpenInventori] = useState(false);
  const [openProduksi,  setOpenProduksi]  = useState(false);
  const [openPenjualan, setOpenPenjualan] = useState(false);
  const [openAset,    setOpenAset]    = useState(false);
  const [openProyek,  setOpenProyek]  = useState(false);
  const navRef = useRef(null);

  // Restore scroll on mount (sidebar remounts on every navigation due to AnimatedRoutes key)
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const saved = sessionStorage.getItem("sidebar-scroll");
    if (saved) nav.scrollTop = parseInt(saved, 10);
  }, []);

  // Persist scroll position on scroll
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const onScroll = () => sessionStorage.setItem("sidebar-scroll", nav.scrollTop);
    nav.addEventListener("scroll", onScroll, { passive: true });
    return () => nav.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const p = location.pathname;
    setOpenNidi(p.includes("/nidi") || p.includes("/landing/edukasi") || p.includes("/settings/payment") || p.includes("/settings/company"));
    setOpenLanding(p.includes("/landing") || p.includes("/landing/settings"));
    setOpenKeuangan(p.includes("/keuangan"));
    setOpenSdm(p.includes("/sdm"));
    setOpenPengadaan(p.includes("/pengadaan"));
    setOpenInventori(p.includes("/inventori"));
    setOpenProduksi(p.includes("/produksi"));
    setOpenPenjualan(p.includes("/penjualan"));
    setOpenAset(p.includes("/aset"));
    setOpenProyek(p.includes("/proyek"));
  }, [location.pathname]);

  const isActive = (path) => location.pathname === path;
  const link = (path) => `${BASE}${path}`;

  const menuClass = (path) =>
    `flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition ${
      isActive(path) ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-slate-800"
    }`;

  const subClass = (path) =>
    `flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition ${
      isActive(path) ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-slate-800 hover:text-gray-200"
    }`;

  const isAdmin = role === "admin" || role === "superadmin";
  const isSuperadmin = role === "superadmin";
  const isGuest = role === "guest";
  const guestCan = (module) =>
    isGuest ? (guestPermissions?.web?.[module] ?? "none") !== "none" : false;

  const { count: pendingCount, hasNew, clearNew } = usePendingApprovalsCount();
  const [notifVisible, setNotifVisible] = useState(false);
  const isOnApprovalPage = location.pathname === "/dashboard/guest-approvals";

  useEffect(() => {
    if (!hasNew || isOnApprovalPage) { clearNew(); return; }
    setNotifVisible(true);
    clearNew();
    const t = setTimeout(() => setNotifVisible(false), 5000);
    return () => clearTimeout(t);
  }, [hasNew]);

  return (
    <>
    <AnimatePresence>
      {notifVisible && (
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 50 }}
          className="fixed top-4 right-4 z-50 flex items-center gap-2.5 bg-amber-500 text-white px-4 py-3 rounded-xl shadow-xl text-sm font-medium cursor-pointer"
          onClick={() => { setNotifVisible(false); }}
        >
          <Bell size={15} className="shrink-0" />
          <span>Ada permintaan persetujuan tamu baru</span>
        </motion.div>
      )}
    </AnimatePresence>
    <aside className="h-full w-64 bg-slate-900 text-gray-200 flex flex-col">
      {/* HEADER */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700">
        <div>
          <h2 className="font-semibold text-white text-sm">PT. Adytia Putra Tehnik</h2>
          <p className="text-xs text-slate-400 mt-0.5">ERP System</p>
        </div>
        <button className="md:hidden" onClick={closeSidebar}>
          <X size={18} />
        </button>
      </div>

      {/* MENU */}
      <nav ref={navRef} className="flex-1 overflow-y-auto p-3 space-y-4">

        {/* DASHBOARD */}
        <Link
          to={BASE}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
            location.pathname === BASE ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-slate-800"
          }`}
        >
          <LayoutDashboard size={16} />
          Dashboard   
        </Link>

        {/* ── DOKUMEN ── */}
        {(isAdmin || (isGuest && (guestCan("rab") || guestCan("instansi") || guestCan("pengujian") || guestCan("invoice")))) && (
          <NavSection label="Dokumen">
            {(isAdmin || guestCan("rab")) && (
              <Link to={link("/rab")} className={menuClass(link("/rab"))}>
                <Receipt size={16} /> RAB / Penawaran
              </Link>
            )}
            {(isAdmin || guestCan("instansi")) && (
              <Link to={link("/instansi")} className={menuClass(link("/instansi"))}>
                <Building2 size={16} /> Instansi
              </Link>
            )}
            {(isAdmin || guestCan("pengujian")) && (
              <Link to={link("/pengujian")} className={menuClass(link("/pengujian"))}>
                <ClipboardList size={16} /> Data Pengujian
              </Link>
            )}
            {(isAdmin || guestCan("invoice")) && (
              <Link to="/dashboard/invoice" className={menuClass("/dashboard/invoice")}>
                <FileText size={16} /> Invoice Builder
              </Link>
            )}
            {isAdmin && (
              <Link to={link("/dokumen/pdf-to-word")} className={menuClass(link("/dokumen/pdf-to-word"))}>
                <FileOutput size={16} /> PDF ke Word
              </Link>
            )}
          </NavSection>
        )}

        {/* ── KEUANGAN ── */}
        {(isSuperadmin || role === "finance" || (isGuest && guestCan("keuangan"))) && (
          <NavSection label="Keuangan">
            <CollapseMenu
              icon={<Wallet size={16} />} label="Keuangan"
              open={openKeuangan} onToggle={() => setOpenKeuangan(v => !v)}
            >
              <Link to={link("/keuangan/kwitansi")}  className={subClass(link("/keuangan/kwitansi"))}>Kwitansi</Link>
              <Link to={link("/keuangan/ledger")}    className={subClass(link("/keuangan/ledger"))}>Ledger Umum</Link>
              <Link to={link("/keuangan/hutang")}    className={subClass(link("/keuangan/hutang"))}>Akun Dibayar (AP)</Link>
              <Link to={link("/keuangan/piutang")}   className={subClass(link("/keuangan/piutang"))}>Akun Diterima (AR)</Link>
              <Link to={link("/keuangan/anggaran")}  className={subClass(link("/keuangan/anggaran"))}>Anggaran</Link>
              <Link to={link("/keuangan/arus-kas")}  className={subClass(link("/keuangan/arus-kas"))}>Arus Kas</Link>
            </CollapseMenu>
          </NavSection>
        )}

        {/* ── SDM ── */}
        {(isAdmin || (isGuest && guestCan("sdm"))) && (
          <NavSection label="SDM">
            <CollapseMenu
              icon={<UserSquare2 size={16} />} label="Human Resources"
              open={openSdm} onToggle={() => setOpenSdm(v => !v)}
            >
              <Link to={link("/sdm/karyawan")}          className={subClass(link("/sdm/karyawan"))}>Data Karyawan</Link>
              <Link to={link("/sdm/penggajian")}        className={subClass(link("/sdm/penggajian"))}>Penggajian</Link>
              <Link to={link("/sdm/absensi")}           className={subClass(link("/sdm/absensi"))}>Absensi</Link>
              <Link to={link("/sdm/rekrutmen")}         className={subClass(link("/sdm/rekrutmen"))}>Rekrutmen</Link>
              <Link to={link("/sdm/kinerja")}           className={subClass(link("/sdm/kinerja"))}>Penilaian Kinerja</Link>
              <Link to={link("/sdm/sertifikat-magang")} className={subClass(link("/sdm/sertifikat-magang"))}>
                <Award size={12} /> Sertifikat Magang
              </Link>
            </CollapseMenu>
          </NavSection>
        )}

        {/* ── PENGADAAN ── */}
        {(isAdmin || (isGuest && guestCan("pengadaan"))) && (
          <NavSection label="Pengadaan">
            <CollapseMenu
              icon={<ShoppingCart size={16} />} label="Procurement"
              open={openPengadaan} onToggle={() => setOpenPengadaan(v => !v)}
            >
              <Link to={link("/pengadaan/purchase-order")} className={subClass(link("/pengadaan/purchase-order"))}>Purchase Order</Link>
              <Link to={link("/pengadaan/vendor")}         className={subClass(link("/pengadaan/vendor"))}>Data Vendor</Link>
              <Link to={link("/pengadaan/approval")}       className={subClass(link("/pengadaan/approval"))}>Approval Pembelian</Link>
            </CollapseMenu>
          </NavSection>
        )}

        {/* ── INVENTORI ── */}
        {(isAdmin || (isGuest && guestCan("inventori"))) && (
          <NavSection label="Inventori">
            <CollapseMenu
              icon={<Package size={16} />} label="Inventori & Gudang"
              open={openInventori} onToggle={() => setOpenInventori(v => !v)}
            >
              <Link to={link("/inventori/stok")}        className={subClass(link("/inventori/stok"))}>Stok Barang</Link>
              <Link to={link("/inventori/pergerakan")}  className={subClass(link("/inventori/pergerakan"))}>Pergerakan Stok</Link>
              <Link to={link("/aset/alat-kerja")}  className={subClass(link("/aset/alat-kerja"))}>Alat Kerja</Link>
              <Link to={link("/inventori/gudang")}      className={subClass(link("/inventori/gudang"))}>Master Gudang</Link>
            </CollapseMenu>
          </NavSection>
        )}

        {/* ── PRODUKSI ── */}
        {(isAdmin || (isGuest && guestCan("produksi"))) && (
          <NavSection label="Produksi">
            <CollapseMenu 
              icon={<Factory size={16} />} label="Manufacturing"
              open={openProduksi} onToggle={() => setOpenProduksi(v => !v)}
            >
              <Link to={link("/produksi/bom")}         className={subClass(link("/produksi/bom"))}>Bill of Material</Link>
              <Link to={link("/produksi/work-order")}  className={subClass(link("/produksi/work-order"))}>Work Order</Link>
            </CollapseMenu>
          </NavSection>
        )}

        {/* ── PENJUALAN / CRM ── */}
        {(isAdmin || (isGuest && guestCan("penjualan"))) && (
          <NavSection label="Penjualan">
            <CollapseMenu
              icon={<ShoppingBag size={16} />} label="Penjualan & CRM"
              open={openPenjualan} onToggle={() => setOpenPenjualan(v => !v)}
            >
              <Link to={link("/penjualan/pelanggan")}   className={subClass(link("/penjualan/pelanggan"))}>Data Pelanggan</Link>
              <Link to={link("/penjualan/sales-order")} className={subClass(link("/penjualan/sales-order"))}>Sales Order</Link>
              <Link to={link("/penjualan/invoice")}     className={subClass(link("/penjualan/invoice"))}>Invoice</Link>
            </CollapseMenu>
          </NavSection>
        )}

        {/* ── PROYEK ── */}
        {(isAdmin || (isGuest && guestCan("proyek"))) && (
          <NavSection label="Proyek">
            <CollapseMenu
              icon={<FolderKanban size={16} />} label="Proyek"
              open={openProyek} onToggle={() => setOpenProyek(v => !v)}
            >
              <Link to={link("/proyek/daftar")}  className={subClass(link("/proyek/daftar"))}>Manajemen Proyek</Link>
              <Link to={link("/proyek/jadwal")}  className={subClass(link("/proyek/jadwal"))}>
                <CalendarDays size={12} /> Jadwal Tim
              </Link>
            </CollapseMenu>
          </NavSection>
        )}

        {/* ── ASET & MAINTENANCE ── */}
        {(isAdmin || (isGuest && guestCan("aset"))) && (
          <NavSection label="Aset">
            <CollapseMenu
              icon={<Wrench size={16} />} label="Aset & Maintenance"
              open={openAset} onToggle={() => setOpenAset(v => !v)}
            >
              <Link to={link("/aset/daftar")}      className={subClass(link("/aset/daftar"))}>Daftar Aset</Link>
              <Link to={link("/aset/maintenance")} className={subClass(link("/aset/maintenance"))}>Jadwal Maintenance</Link>
              <Link to={link("/aset/work-order")}  className={subClass(link("/aset/work-order"))}>Work Order Aset</Link>
              
            </CollapseMenu>
          </NavSection>
        )}

        {/* ── NIDI & SLO ── */}
        {isAdmin && (
          <NavSection label="NIDI & SLO">
            <CollapseMenu
              icon={<span className="text-base">📁</span>} label="NIDI & SLO"
              open={openNidi} onToggle={() => setOpenNidi(v => !v)}
            >
              <Link to={link("/landing/edukasi")}    className={subClass(link("/landing/edukasi"))}>Edukasi NIDI/SLO</Link>
              <Link to={link("/settings/payment")}   className={subClass(link("/settings/payment"))}>💳 Pembayaran</Link>
              <Link to={link("/settings/company")}  className={subClass(link("/settings/company"))}>🏢 Profil Perusahaan</Link>
              <Link to={link("/nidi/data-entry")}    className={subClass(link("/nidi/data-entry"))}>Data Entry</Link>
              <Link to={link("/nidi/data")}          className={subClass(link("/nidi/data"))}>Data NIDI</Link>
              <Link to={link("/nidi/akun")}          className={subClass(link("/nidi/akun"))}>Data Akun</Link>
            </CollapseMenu>
          </NavSection>
        )}

        {/* ── LANDING CMS ── */}
        {isAdmin && (
          <NavSection label="Landing Page">
            <CollapseMenu
              icon={<LayoutTemplate size={16} />} label="Landing CMS"
              open={openLanding} onToggle={() => setOpenLanding(v => !v)}
            >
              <Link to={link("/landing/slides")}        className={subClass(link("/landing/slides"))}>Hero Slider</Link>
              <Link to={link("/landing/services")}      className={subClass(link("/landing/services"))}>Services</Link>
              <Link to={link("/landing/projects")}      className={subClass(link("/landing/projects"))}>Projects</Link>
              <Link to={link("/landing/testimonials")}  className={subClass(link("/landing/testimonials"))}>Testimonials</Link>
              <Link to={link("/landing/settings")}      className={subClass(link("/landing/settings"))}>Settings</Link>
            </CollapseMenu>
          </NavSection>
        )}

        {/* ── SYSTEM ── */}
        {(isSuperadmin || isAdmin) && (
          <NavSection label="System">
            {isSuperadmin && (
              <Link to={link("/users")} className={menuClass(link("/users"))}>
                <Users size={16} /> User Management
              </Link>
            )}
            {isSuperadmin && (
              <Link to={link("/guest-accounts")} className={menuClass(link("/guest-accounts"))}>
                <ShieldCheck size={16} /> Akun Tamu
              </Link>
            )}
            <Link to={link("/guest-approvals")} className={`${menuClass(link("/guest-approvals"))} justify-between`}>
              <span className="flex items-center gap-3">
                <ClipboardCheck size={16} /> Persetujuan Tamu
              </span>
              {pendingCount > 0 && (
                <span className="bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none">
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              )}
            </Link>
            {isSuperadmin && (
              <Link to="/app-mobile/file-share" className={menuClass("/app-mobile/file-share")}>
                <FolderUp size={16} /> Berbagi File
              </Link>
            )}
          </NavSection>
        )}

      </nav>
    </aside>
    </>
  );
}

export default Sidebar;
