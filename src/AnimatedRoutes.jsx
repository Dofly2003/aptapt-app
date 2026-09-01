import { lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router-dom";

/* ===== PAGE IMPORTS (lazy-loaded) ===== */
const Login = lazy(() => import("./pages/auth/Login"));
const LoginPhone = lazy(() => import("./pages/auth/LoginPhone"));

const PublicHome = lazy(() => import("./pages/page-umum/PublicHome"));
const About = lazy(() => import("./pages/page-umum/About"));
const Contact = lazy(() => import("./pages/page-umum/Contact"));
const PesananSaya = lazy(() => import("./pages/page-umum/PesananSaya"));
const NidiDataEntryUmum = lazy(() => import("./pages/page-umum/DataEntryUmum"));
const FormLamaran = lazy(() => import("./pages/page-umum/FormLamaran"));

const Panel1 = lazy(() => import("./pages/page-panel/panel1"));
const NotFound = lazy(() => import("./pages/NotFound"));

/* DASHBOARD */
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";

const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const NidiDataEntry = lazy(() => import("./pages/admin/DataEntry"));
const NidiData = lazy(() => import("./pages/admin/DataList"));
const NidiAkun = lazy(() => import("./pages/admin/DataAkun"));
const Users = lazy(() => import("./pages/admin/Users"));

/* ===== LANDING CMS ===== */
const SlidesManagement = lazy(() => import("./pages/admin/SlidesManagement"));
const ServicesManagement = lazy(() => import("./pages/admin/ServicesManagement"));
const ProjectsManagement = lazy(() => import("./pages/admin/ProjectsManagement"));
const TestimonialsManagement = lazy(() => import("./pages/admin/TestimonialsManagement"));
const SettingsPanel = lazy(() => import("./pages/admin/SettingsPanel"));
const InstansiManagement = lazy(() => import("./pages/admin/InstansiManagement"));
const LaporanPreview = lazy(() => import("./pages/admin/LaporanPreview"));
const EdukasiManagement = lazy(() => import("./pages/admin/EdukasiManagement"));
const PaymentSettings = lazy(() => import("./pages/admin/PaymentSettings"));
const CompanySettings = lazy(() => import("./pages/admin/CompanySettings"));
const RabManagement = lazy(() => import("./pages/admin/RabManagement"));
const RabEditor = lazy(() => import("./pages/admin/RabEditor"));
const RabPreview = lazy(() => import("./pages/admin/RabPreview"));
const LaikOperasiManagement = lazy(() => import("./pages/admin/LaikOperasiManagement"));
const LaikOperasiEditor = lazy(() => import("./pages/admin/LaikOperasiEditor"));
const MasterHarga = lazy(() => import("./pages/admin/MasterHarga"));
const InvoiceManagement = lazy(() => import("./pages/admin/InvoiceManagement"));
const InvoiceEditor = lazy(() => import("./pages/admin/InvoiceEditor"));
const InvoicePreview = lazy(() => import("./pages/admin/InvoicePreview"));
const PengujianManagement = lazy(() => import("./pages/admin/PengujianManagement"));
const PengujianAdminDetail = lazy(() => import("./pages/admin/PengujianAdminDetail"));
const GuestAccountManagement = lazy(() => import("./pages/admin/GuestAccountManagement"));
const GuestApprovals = lazy(() => import("./pages/admin/GuestApprovals"));

/* ===== KEUANGAN ===== */
const KwitansiManagement = lazy(() => import("./pages/admin/KwitansiManagement"));
const KwitansiBuilder = lazy(() => import("./pages/admin/KwitansiBuilder"));
const LedgerUmum = lazy(() => import("./pages/keuangan/LedgerUmum"));
const AkunDibayar = lazy(() => import("./pages/keuangan/AkunDibayar"));
const AkunDiterima = lazy(() => import("./pages/keuangan/AkunDiterima"));
const Anggaran = lazy(() => import("./pages/keuangan/Anggaran"));
const ArusKas = lazy(() => import("./pages/keuangan/ArusKas"));

/* ===== SDM ===== */
const DataKaryawan = lazy(() => import("./pages/sdm/DataKaryawan"));
const Penggajian = lazy(() => import("./pages/sdm/Penggajian"));
const Absensi = lazy(() => import("./pages/sdm/Absensi"));
const Rekrutmen = lazy(() => import("./pages/sdm/Rekrutmen"));
const Kinerja = lazy(() => import("./pages/sdm/Kinerja"));
const SertifikatMagang = lazy(() => import("./pages/sdm/SertifikatMagang"));

/* ===== PENGADAAN ===== */
const PurchaseOrder = lazy(() => import("./pages/pengadaan/PurchaseOrder"));
const DataVendor = lazy(() => import("./pages/pengadaan/DataVendor"));
const ApprovalPembelian = lazy(() => import("./pages/pengadaan/ApprovalPembelian"));
const PenerimaanBarang = lazy(() => import("./pages/pengadaan/PenerimaanBarang"));

/* ===== INVENTORI ===== */
const StokBarang = lazy(() => import("./pages/inventori/StokBarang"));
const PergerakanStok = lazy(() => import("./pages/inventori/PergerakanStok"));
const Gudang = lazy(() => import("./pages/inventori/Gudang"));

/* ===== PRODUKSI ===== */
const BillOfMaterial = lazy(() => import("./pages/produksi/BillOfMaterial"));
const WorkOrderProduksi = lazy(() => import("./pages/produksi/WorkOrderProduksi"));
const PenjadwalanProduksi = lazy(() => import("./pages/produksi/PenjadwalanProduksi"));
const InspeksiKualitas = lazy(() => import("./pages/produksi/InspeksiKualitas"));

/* ===== PENJUALAN ===== */
const DataPelanggan = lazy(() => import("./pages/penjualan/DataPelanggan"));
const SalesOrder = lazy(() => import("./pages/penjualan/SalesOrder"));
const Invoice = lazy(() => import("./pages/penjualan/Invoice"));
const Pipeline = lazy(() => import("./pages/penjualan/Pipeline"));

/* ===== PROYEK ===== */
const DaftarProyek = lazy(() => import("./pages/proyek/DaftarProyek"));
const SumberDaya = lazy(() => import("./pages/proyek/SumberDaya"));
const TugasProyek = lazy(() => import("./pages/proyek/TugasProyek"));
const JadwalProyek = lazy(() => import("./pages/proyek/JadwalProyek"));

/* ===== ASET ===== */
const DaftarAset = lazy(() => import("./pages/aset/DaftarAset"));
const JadwalMaintenance = lazy(() => import("./pages/aset/JadwalMaintenance"));
const WorkOrderAset = lazy(() => import("./pages/aset/WorkOrderAset"));
const AlatKerja = lazy(() => import("./pages/aset/AlatKerja"));

/* ===== ANALYTICS ===== */
const AnalyticsDashboard = lazy(() => import("./pages/admin/AnalyticsDashboard"));

/* ===== MONITORING ===== */
const MonitoringDevices = lazy(() => import("./pages/monitoring/MonitoringDevices"));

/* ===== WORK ORDER NIDI ===== */
const WoPenyelesaian = lazy(() => import("./pages/admin/WoPenyelesaian"));

/* ===== RLO / SKLO ===== */
const LembagaLIT = lazy(() => import("./pages/admin/LembagaLIT"));
const PekerjaanRLO = lazy(() => import("./pages/admin/PekerjaanRLO"));

/* ===== DOKUMEN EDITOR ===== */
const DokumenEditor = lazy(() => import("./pages/dokumen/DokumenEditor"));
const PdfToWord = lazy(() => import("./pages/dokumen/PdfToWord"));
const CompressPdf = lazy(() => import("./pages/dokumen/CompressPdf"));

/* MOBILE */
import MobileLayout from "./layouts/MobileLayout";
const MobileHome = lazy(() => import("./pages/mobile/MobileHome"));
const MobileProfile = lazy(() => import("./pages/mobile/MobileProfile"));
const MobileLaporanForm = lazy(() => import("./pages/mobile/MobileLaporan"));
const MobileNotes = lazy(() => import("./pages/mobile/MobileNotes"));
const MobileNoteDetail = lazy(() => import("./pages/mobile/MobileNoteDetail"));
const MobileTransaksiGlobal = lazy(() => import("./pages/mobile/MobileTransaksiGlobal"));
const MobileFormPengujian = lazy(() => import("./pages/mobile/MobileFormPengujian"));
const MobilePengujianList = lazy(() => import("./pages/mobile/MobilePengujianList"));
const MobileReportGenerate = lazy(() => import("./pages/mobile/MobileReportGenerate"));
const MobileUserManagement = lazy(() => import("./pages/mobile/MobileUserManagement"));
const MobileModul = lazy(() => import("./pages/mobile/MobileModul"));
const MobileKeuangan = lazy(() => import("./pages/mobile/MobileKeuangan"));
const MobileInventori = lazy(() => import("./pages/mobile/MobileInventori"));
const MobileRab = lazy(() => import("./pages/mobile/MobileRab"));
const MobileRabEditor = lazy(() => import("./pages/mobile/MobileRabEditor"));
const MobileInvoice = lazy(() => import("./pages/mobile/MobileInvoice"));
const MobileInvoiceEditor = lazy(() => import("./pages/mobile/MobileInvoiceEditor"));
const MobileFileShare = lazy(() => import("./pages/mobile/MobileFileShare"));
const MobileAlatKerja = lazy(() => import("./pages/mobile/MobileAlatKerja"));
const MobileAkomodasi = lazy(() => import("./pages/mobile/MobileAkomodasi"));
const MobileMaintenanceGarduList = lazy(() => import("./pages/mobile/MobileMaintenanceGarduList"));
const MobileMaintenanceGardu = lazy(() => import("./pages/mobile/MobileMaintenanceGardu"));

/* ===== KASBON ===== */
const AkomKasbon = lazy(() => import("./pages/admin/AkomKasbon"));

const PageSpinner = () => (
  <div className="flex items-center justify-center h-screen bg-slate-950">
    <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function AnimatedRoutes() {
  const location = useLocation();

  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes location={location}>

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
          <Route path="laik-operasi" element={<LaikOperasiManagement />} />
          <Route path="laik-operasi/baru" element={<LaikOperasiEditor />} />
          <Route path="laik-operasi/:id" element={<LaikOperasiEditor />} />
          <Route path="master-harga" element={<MasterHarga />} />
          <Route path="invoice" element={<InvoiceManagement />} />
          <Route path="invoice/baru" element={<InvoiceEditor />} />
          <Route path="invoice/:id" element={<InvoiceEditor />} />

          {/* ===== PENGUJIAN ===== */}
          <Route path="pengujian" element={<PengujianManagement />} />
          <Route path="pengujian/:id" element={<PengujianAdminDetail />} />

          {/* ===== AKUN TAMU ===== */}
          <Route path="guest-accounts" element={<GuestAccountManagement />} />
          <Route path="guest-approvals" element={<GuestApprovals />} />

          {/* ===== ANALYTICS ===== */}
          <Route path="analytics" element={<AnalyticsDashboard />} />
          <Route path="monitoring" element={<MonitoringDevices />} />

          {/* ===== KEUANGAN ===== */}
          <Route path="keuangan/kwitansi" element={<KwitansiManagement />} />
          <Route path="keuangan/kwitansi/baru" element={<KwitansiBuilder />} />
          <Route path="keuangan/kwitansi/:id" element={<KwitansiBuilder />} />
          <Route path="keuangan/ledger" element={<LedgerUmum />} />
          <Route path="keuangan/hutang" element={<AkunDibayar />} />
          <Route path="keuangan/piutang" element={<AkunDiterima />} />
          <Route path="keuangan/anggaran" element={<Anggaran />} />
          <Route path="keuangan/arus-kas" element={<ArusKas />} />
          <Route path="kasbon" element={<AkomKasbon />} />

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
        <Route path="/dashboard/dokumen/editor"       element={<ProtectedRoute><DokumenEditor /></ProtectedRoute>} />
        <Route path="/dashboard/dokumen/pdf-to-word"  element={<ProtectedRoute><PdfToWord /></ProtectedRoute>} />
        <Route path="/dashboard/dokumen/compress-pdf" element={<ProtectedRoute><CompressPdf /></ProtectedRoute>} />

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
          <Route path="kasbon"       element={<MobileAkomodasi />} />
          <Route path="maintenance-gardu"       element={<MobileMaintenanceGarduList />} />
          <Route path="maintenance-gardu/baru"  element={<MobileMaintenanceGardu />} />
          <Route path="maintenance-gardu/:id"   element={<MobileMaintenanceGardu />} />
        </Route>

      </Routes>
    </Suspense>
  );
}
