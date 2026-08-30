import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

/* ===== IMPORT PAGE ===== */
import Login from "./pages/auth/Login";
import LoginPhone from "./pages/auth/LoginPhone";

import PublicHome from "./pages/page-umum/PublicHome";
import About from "./pages/page-umum/About";
import Contact from "./pages/page-umum/Contact";
import PesananSaya from "./pages/page-umum/PesananSaya";
import NidiDataEntryUmum from "./pages/page-umum/DataEntryUmum";
import FormLamaran from "./pages/page-umum/FormLamaran";

import Panel1 from "./pages/page-panel/panel1";
import NotFound from "./pages/NotFound";

/* DASHBOARD */
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";

import Dashboard from "./pages/admin/Dashboard";
import NidiDataEntry from "./pages/admin/DataEntry";
import NidiData from "./pages/admin/DataList";
import NidiAkun from "./pages/admin/DataAkun";
import Users from "./pages/admin/Users";

/* ===== LANDING CMS ===== */
import SlidesManagement from "./pages/admin/SlidesManagement";
import ServicesManagement from "./pages/admin/ServicesManagement";
import ProjectsManagement from "./pages/admin/ProjectsManagement";
import TestimonialsManagement from "./pages/admin/TestimonialsManagement";
import SettingsPanel from "./pages/admin/SettingsPanel";
import InstansiManagement from "./pages/admin/InstansiManagement";
import LaporanPreview from "./pages/admin/LaporanPreview";
import EdukasiManagement from "./pages/admin/EdukasiManagement";
import PaymentSettings from "./pages/admin/PaymentSettings";
import CompanySettings from "./pages/admin/CompanySettings";
import RabManagement from "./pages/admin/RabManagement";
import RabEditor from "./pages/admin/RabEditor";
import RabPreview from "./pages/admin/RabPreview";
import InvoiceManagement from "./pages/admin/InvoiceManagement";
import InvoiceEditor from "./pages/admin/InvoiceEditor";
import InvoicePreview from "./pages/admin/InvoicePreview";
import PengujianManagement from "./pages/admin/PengujianManagement";
import PengujianAdminDetail from "./pages/admin/PengujianAdminDetail";
import GuestAccountManagement from "./pages/admin/GuestAccountManagement";
import GuestApprovals from "./pages/admin/GuestApprovals";

/* ===== KEUANGAN ===== */
import KwitansiManagement from "./pages/admin/KwitansiManagement";
import KwitansiBuilder from "./pages/admin/KwitansiBuilder";
import LedgerUmum from "./pages/keuangan/LedgerUmum";
import AkunDibayar from "./pages/keuangan/AkunDibayar";
import AkunDiterima from "./pages/keuangan/AkunDiterima";
import Anggaran from "./pages/keuangan/Anggaran";
import ArusKas from "./pages/keuangan/ArusKas";

/* ===== SDM ===== */
import DataKaryawan from "./pages/sdm/DataKaryawan";
import Penggajian from "./pages/sdm/Penggajian";
import Absensi from "./pages/sdm/Absensi";
import Rekrutmen from "./pages/sdm/Rekrutmen";
import Kinerja from "./pages/sdm/Kinerja";
import SertifikatMagang from "./pages/sdm/SertifikatMagang";

/* ===== PENGADAAN ===== */
import PurchaseOrder from "./pages/pengadaan/PurchaseOrder";
import DataVendor from "./pages/pengadaan/DataVendor";
import ApprovalPembelian from "./pages/pengadaan/ApprovalPembelian";
import PenerimaanBarang from "./pages/pengadaan/PenerimaanBarang";

/* ===== INVENTORI ===== */
import StokBarang from "./pages/inventori/StokBarang";
import PergerakanStok from "./pages/inventori/PergerakanStok";
import Gudang from "./pages/inventori/Gudang";

/* ===== PRODUKSI ===== */
import BillOfMaterial from "./pages/produksi/BillOfMaterial";
import WorkOrderProduksi from "./pages/produksi/WorkOrderProduksi";
import PenjadwalanProduksi from "./pages/produksi/PenjadwalanProduksi";
import InspeksiKualitas from "./pages/produksi/InspeksiKualitas";

/* ===== PENJUALAN ===== */
import DataPelanggan from "./pages/penjualan/DataPelanggan";
import SalesOrder from "./pages/penjualan/SalesOrder";
import Invoice from "./pages/penjualan/Invoice";
import Pipeline from "./pages/penjualan/Pipeline";

/* ===== PROYEK ===== */
import DaftarProyek from "./pages/proyek/DaftarProyek";
import SumberDaya from "./pages/proyek/SumberDaya";
import TugasProyek from "./pages/proyek/TugasProyek";
import JadwalProyek from "./pages/proyek/JadwalProyek";

/* ===== ASET ===== */
import DaftarAset from "./pages/aset/DaftarAset";
import JadwalMaintenance from "./pages/aset/JadwalMaintenance";
import WorkOrderAset from "./pages/aset/WorkOrderAset";
import AlatKerja from "./pages/aset/AlatKerja";

/* ===== WORK ORDER NIDI ===== */
import WoPenyelesaian from "./pages/admin/WoPenyelesaian";

/* ===== RLO / SKLO ===== */
import LembagaLIT from "./pages/admin/LembagaLIT";
import PekerjaanRLO from "./pages/admin/PekerjaanRLO";

/* ===== DOKUMEN EDITOR ===== */
import DokumenEditor from "./pages/dokumen/DokumenEditor";
import PdfToWord from "./pages/dokumen/PdfToWord";

/* MOBILE */
import MobileLayout from "./layouts/MobileLayout";
import MobileHome from "./pages/mobile/MobileHome";
import MobileProfile from "./pages/mobile/MobileProfile";
import MobileLaporanForm from "./pages/mobile/MobileLaporan";
import MobileNotes from "./pages/mobile/MobileNotes";
import MobileNoteDetail from "./pages/mobile/MobileNoteDetail";
import MobileTransaksiGlobal from "./pages/mobile/MobileTransaksiGlobal";
import MobileFormPengujian from "./pages/mobile/MobileFormPengujian";
import MobilePengujianList from "./pages/mobile/MobilePengujianList";
import MobileReportGenerate from "./pages/mobile/MobileReportGenerate";
import MobileUserManagement from "./pages/mobile/MobileUserManagement";
import MobileModul     from "./pages/mobile/MobileModul";
import MobileKeuangan  from "./pages/mobile/MobileKeuangan";
import MobileInventori from "./pages/mobile/MobileInventori";
import MobileRab          from "./pages/mobile/MobileRab";
import MobileRabEditor    from "./pages/mobile/MobileRabEditor";
import MobileInvoice      from "./pages/mobile/MobileInvoice";
import MobileInvoiceEditor from "./pages/mobile/MobileInvoiceEditor";
import MobileFileShare from "./pages/mobile/MobileFileShare";
import MobileAlatKerja from "./pages/mobile/MobileAlatKerja";

export default function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>

        {/* ===== PUBLIC ===== */}
        <Route path="/" element={<PublicHome />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/panel1" element={<Panel1 />} />
        <Route path="/daftar-nidi-slo" element={<NidiDataEntryUmum />} />
        <Route path="/login-phone" element={<LoginPhone />} />

        <Route path="/login" element={<Login />} />
        <Route path="/pesanan-saya" element={<PesananSaya />} />
        <Route path="/rekrutmen/:id" element={<FormLamaran />} />
        <Route path="*" element={<NotFound />} />
        <Route path="/laporan/:id" element={<LaporanPreview />} />
        <Route path="/rab/:id"     element={<ProtectedRoute><RabPreview /></ProtectedRoute>} />
        <Route path="/invoice/:id" element={<ProtectedRoute><InvoicePreview /></ProtectedRoute>} />

        {/* ===== DASHBOARD ===== */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />

          {/* NIDI */}
          <Route path="nidi/data-entry" element={<NidiDataEntry />} />
          <Route path="nidi/data" element={<NidiData />} />
          <Route path="nidi/akun" element={<NidiAkun />} />
          <Route path="users" element={<Users />} />

          {/* LANDING CMS */}
          <Route path="landing/edukasi" element={<EdukasiManagement />} />
          <Route path="settings/payment" element={<PaymentSettings />} />
          <Route path="settings/company" element={<CompanySettings />} />
          <Route path="landing/slides" element={<SlidesManagement />} />
          <Route path="landing/services" element={<ServicesManagement />} />
          <Route path="landing/projects" element={<ProjectsManagement />} />
          <Route path="landing/testimonials" element={<TestimonialsManagement />} />
          <Route path="landing/settings" element={<SettingsPanel />} />
          <Route path="instansi" element={<InstansiManagement />} />
          <Route path="rab" element={<RabManagement />} />
          <Route path="rab/baru" element={<RabEditor />} />
          <Route path="rab/:id" element={<RabEditor />} />
          <Route path="invoice" element={<InvoiceManagement />} />
          <Route path="invoice/baru" element={<InvoiceEditor />} />
          <Route path="invoice/:id" element={<InvoiceEditor />} />

          {/* ===== PENGUJIAN ===== */}
          <Route path="pengujian" element={<PengujianManagement />} />
          <Route path="pengujian/:id" element={<PengujianAdminDetail />} />

          {/* ===== AKUN TAMU ===== */}
          <Route path="guest-accounts" element={<GuestAccountManagement />} />
          <Route path="guest-approvals" element={<GuestApprovals />} />

          {/* ===== KEUANGAN ===== */}
          <Route path="keuangan/kwitansi" element={<KwitansiManagement />} />
          <Route path="keuangan/kwitansi/baru" element={<KwitansiBuilder />} />
          <Route path="keuangan/kwitansi/:id" element={<KwitansiBuilder />} />
          <Route path="keuangan/ledger" element={<LedgerUmum />} />
          <Route path="keuangan/hutang" element={<AkunDibayar />} />
          <Route path="keuangan/piutang" element={<AkunDiterima />} />
          <Route path="keuangan/anggaran" element={<Anggaran />} />
          <Route path="keuangan/arus-kas" element={<ArusKas />} />

          {/* ===== SDM ===== */}
          <Route path="sdm/karyawan" element={<DataKaryawan />} />
          <Route path="sdm/penggajian" element={<Penggajian />} />
          <Route path="sdm/absensi" element={<Absensi />} />
          <Route path="sdm/rekrutmen" element={<Rekrutmen />} />
          <Route path="sdm/kinerja" element={<Kinerja />} />
          <Route path="sdm/sertifikat-magang" element={<SertifikatMagang />} />

          {/* ===== PENGADAAN ===== */}
          <Route path="pengadaan/purchase-order" element={<PurchaseOrder />} />
          <Route path="pengadaan/vendor" element={<DataVendor />} />
          <Route path="pengadaan/approval" element={<ApprovalPembelian />} />
          <Route path="pengadaan/penerimaan" element={<PenerimaanBarang />} />

          {/* ===== INVENTORI ===== */}
          <Route path="inventori/stok" element={<StokBarang />} />
          <Route path="inventori/pergerakan" element={<PergerakanStok />} />
          <Route path="inventori/gudang" element={<Gudang />} />

          {/* ===== PRODUKSI ===== */}
          <Route path="produksi/bom" element={<BillOfMaterial />} />
          <Route path="produksi/work-order" element={<WorkOrderProduksi />} />
          <Route path="produksi/penjadwalan" element={<PenjadwalanProduksi />} />
          <Route path="produksi/inspeksi" element={<InspeksiKualitas />} />

          {/* ===== PENJUALAN / CRM ===== */}
          <Route path="penjualan/pelanggan" element={<DataPelanggan />} />
          <Route path="penjualan/sales-order" element={<SalesOrder />} />
          <Route path="penjualan/invoice" element={<Invoice />} />
          <Route path="penjualan/pipeline" element={<Pipeline />} />

          {/* ===== PROYEK ===== */}
          <Route path="proyek/daftar" element={<DaftarProyek />} />
          <Route path="proyek/sumber-daya" element={<SumberDaya />} />
          <Route path="proyek/tugas" element={<TugasProyek />} />
          <Route path="proyek/jadwal" element={<JadwalProyek />} />

          {/* ===== ASET & MAINTENANCE ===== */}
          <Route path="aset/daftar" element={<DaftarAset />} />
          <Route path="aset/maintenance" element={<JadwalMaintenance />} />
          <Route path="aset/work-order" element={<WorkOrderAset />} />
          <Route path="aset/alat-kerja" element={<AlatKerja />} />

          {/* ===== WORK ORDER NIDI ===== */}
          <Route path="wo/penyelesaian/:id" element={<WoPenyelesaian />} />

          {/* ===== RLO / SKLO ===== */}
          <Route path="lembaga-lit" element={<LembagaLIT />} />
          <Route path="pekerjaan/new" element={<PekerjaanRLO />} />
          <Route path="pekerjaan/:id" element={<PekerjaanRLO />} />

          {/* dokumen/editor — dipindah ke luar layout, lihat di bawah */}
        </Route>

        {/* ===== DOKUMEN TOOLS ===== */}
        <Route path="/dashboard/dokumen/editor"    element={<ProtectedRoute><DokumenEditor /></ProtectedRoute>} />
        <Route path="/dashboard/dokumen/pdf-to-word" element={<ProtectedRoute><PdfToWord /></ProtectedRoute>} />

        {/* ===== MOBILE ===== */}
        <Route
          path="/app-mobile"
          element={
            <ProtectedRoute>
              <MobileLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<MobileHome />} />
          <Route path="profile" element={<MobileProfile />} />
          <Route path="laporan/:projectId" element={<MobileLaporanForm />} />
          <Route path="notes" element={<MobileNotes />} />
          <Route path="notes/:noteId" element={<MobileNoteDetail />} />
          <Route path="transaksi" element={<MobileTransaksiGlobal />} />
          <Route path="form-pengujian" element={<MobilePengujianList />} />
          <Route path="form-pengujian/:id" element={<MobileFormPengujian />} />
          <Route path="MobileReportGenerate/:id" element={<MobileReportGenerate />} />
          <Route path="user-management" element={<MobileUserManagement />} />
          <Route path="modul"     element={<MobileModul />} />
          <Route path="keuangan"  element={<MobileKeuangan />} />
          <Route path="inventori" element={<MobileInventori />} />
          <Route path="rab"          element={<MobileRab />} />
          <Route path="rab/baru"    element={<MobileRabEditor />} />
          <Route path="rab/:id"     element={<MobileRabEditor />} />
          <Route path="invoice"      element={<MobileInvoice />} />
          <Route path="invoice/baru" element={<MobileInvoiceEditor />} />
          <Route path="invoice/:id"  element={<MobileInvoiceEditor />} />
          <Route path="file-share"   element={<MobileFileShare />} />
          <Route path="alat-kerja"   element={<MobileAlatKerja />} />
        </Route>

      </Routes>
    </AnimatePresence>
  );
}
