// src/utils/seedGroupedServices.js
//
// One-shot seeder for the new grouped-services structure.
// Run once from the dev console as an admin user:
//
//   import('/src/utils/seedGroupedServices.js').then(m => m.seedGroupedServices())
//
// Behavior:
//  - If `services` collection is EMPTY: seeds all defaults below.
//  - If it already has docs: skips entirely (use `force: true` to override).
//  - Each item gets: category, categoryTitle, order (per category), isActive: true.
//  - Existing data (e.g. already-uploaded items) is NOT touched unless `force` flag.
//
// To wipe + reseed from scratch:
//   import('/src/utils/seedGroupedServices.js').then(m => m.seedGroupedServices({ force: true }))

import {
  collection,
  getDocs,
  writeBatch,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  SERVICE_CATEGORIES,
  getCategoryMeta,
} from '../constants/serviceCategories';

const SEED_DATA = {
  electrical: [
    { title: 'Instalasi Baru',                     description: 'Pemasangan instalasi listrik baru untuk rumah, gedung komersial, dan fasilitas industri sesuai standar PUIL.',  icon: 'plug' },
    { title: 'Perawatan dan Perbaikan',            description: 'Pemeliharaan berkala dan perbaikan instalasi listrik untuk menjaga keandalan dan keselamatan operasional.',     icon: 'wrench' },
    { title: 'Setting dan Instalasi Cubicle',      description: 'Pemasangan, commissioning, dan setting cubicle tegangan menengah secara presisi sesuai spesifikasi pabrikan.',  icon: 'cpu' },
    { title: 'Konstruksi Tegangan Menengah',       description: 'Pembangunan jaringan distribusi tegangan menengah (20 kV) untuk perumahan, kawasan industri, dan komersial.',   icon: 'cable' },
    { title: 'Setting dan Uji Relay Proteksi',     description: 'Konfigurasi, pengujian, dan kalibrasi relay proteksi untuk memastikan sistem proteksi listrik bekerja optimal.', icon: 'shield' },
  ],
  legal: [
    { title: 'Pasang Baru dan Tambah Daya',        description: 'Pengurusan permohonan pasang baru atau penambahan daya listrik di PLN secara cepat dan transparan.',           icon: 'bolt' },
    { title: 'Electrical Consultant',              description: 'Konsultasi teknis kelistrikan menyeluruh — dari perencanaan beban, sistem proteksi, hingga audit energi.',     icon: 'activity' },
    { title: 'Penerbitan NIDI & SLO',              description: 'Pengurusan Nomor Identitas Instalasi (NIDI) dan Sertifikat Laik Operasi (SLO) dari lembaga terakreditasi.',     icon: 'file-check' },
    { title: 'Drawing dan Perencanaan',            description: 'Pembuatan gambar teknik (single line diagram, layout panel, wiring) dan dokumen perencanaan instalasi.',         icon: 'home' },
  ],
  material: [
    { title: 'Transformator',                      description: 'Penyediaan transformator distribusi dan tenaga dari merek ternama dengan garansi resmi.',                       icon: 'factory' },
    { title: 'Cubicle',                            description: 'Suplai cubicle tegangan menengah (incoming, outgoing, metering) custom sesuai kebutuhan proyek.',               icon: 'cpu' },
    { title: 'Relay Proteksi',                     description: 'Penyediaan relay proteksi numeric dari brand teruji untuk sistem proteksi feeder, motor, dan trafo.',          icon: 'shield' },
    { title: 'Circuit Breaker (ACB, VCB, MCCB)',   description: 'Suplai pemutus tenaga lengkap — Air, Vacuum, Molded Case — untuk berbagai kelas tegangan dan arus.',           icon: 'zap' },
    { title: 'Solar Panel (PLTS)',                 description: 'Penyediaan panel surya, inverter, dan sistem PLTS on-grid / off-grid lengkap untuk skala rumah hingga industri.', icon: 'lightbulb' },
  ],
  iot: [
    { title: 'Smart Energy Monitoring',            description: 'Sistem pemantauan konsumsi energi real-time berbasis IoT untuk efisiensi dan deteksi anomali konsumsi.',         icon: 'activity' },
    { title: 'Otomasi Panel Listrik',              description: 'Implementasi PLC, SCADA, dan HMI untuk otomatisasi panel distribusi dan kontrol motor industri.',              icon: 'cpu' },
    { title: 'Smart Lighting Control',             description: 'Kendali pencahayaan jalan dan gedung berbasis IoT — penjadwalan, dimming, dan deteksi kerusakan otomatis.',     icon: 'lightbulb' },
  ],
  software: [
    {
      title: 'CMMS — Manajemen Pemeliharaan Aset',
      description: 'Computerized Maintenance Management System (CMMS) berbasis web untuk penjadwalan perawatan aset, work order, histori perbaikan, dan laporan KPI pemeliharaan secara real-time.',
      icon: 'settings',
    },
    {
      title: 'WMS — Manajemen Gudang & Inventori',
      description: 'Warehouse Management System (WMS) untuk pengelolaan stok, penerimaan barang, pengeluaran, dan pelacakan pergerakan inventori secara akurat dan efisien.',
      icon: 'database',
    },
    {
      title: 'EHMS — K3 & Keselamatan Lingkungan',
      description: 'Environmental Health & Safety Management System (EHMS) untuk inspeksi K3, pelaporan insiden, manajemen risiko, dan kepatuhan regulasi keselamatan kerja di lingkungan industri.',
      icon: 'shield',
    },
    {
      title: 'Pengembangan Website Profesional',
      description: 'Desain dan pengembangan website company profile, landing page, hingga portal bisnis yang responsif, cepat, dan dioptimasi untuk mesin pencari (SEO).',
      icon: 'globe',
    },
    {
      title: 'Aplikasi Mobile Android & iOS',
      description: 'Pengembangan aplikasi mobile untuk operasional lapangan, monitoring aset, absensi, atau kebutuhan bisnis lainnya — tersedia untuk platform Android dan iOS.',
      icon: 'smartphone',
    },
    {
      title: 'Sistem ERP & Integrasi Bisnis',
      description: 'Pengembangan sistem ERP custom yang mengintegrasikan modul keuangan, SDM, pengadaan, penjualan, dan produksi dalam satu platform terintegrasi sesuai kebutuhan perusahaan.',
      icon: 'layout',
    },
  ],
};

export async function seedGroupedServices({ force = false } = {}) {
  console.log('🌱 seedGroupedServices: starting…');
  const col = collection(db, 'services');
  const existing = await getDocs(col);

  if (!existing.empty && !force) {
    console.log(
      `⏭️  Skip: services collection already has ${existing.size} docs. ` +
      `Pass { force: true } to wipe & reseed.`
    );
    return { skipped: true, count: existing.size };
  }

  // If forcing: delete all existing first
  if (existing.size > 0 && force) {
    console.log(`🗑  Force mode: deleting ${existing.size} existing docs…`);
    const delBatch = writeBatch(db);
    existing.docs.forEach((d) => delBatch.delete(d.ref));
    await delBatch.commit();
  }

  // Create batch with new data
  const batch = writeBatch(db);
  let total = 0;

  for (const cat of SERVICE_CATEGORIES) {
    const items = SEED_DATA[cat.key] || [];
    const meta = getCategoryMeta(cat.key);

    items.forEach((item, idx) => {
      const ref = doc(col);
      batch.set(ref, {
        title:         item.title,
        description:   item.description,
        icon:          item.icon,
        image:         '',
        imagePath:     '',
        category:      cat.key,
        categoryTitle: meta.title,
        order:         idx,
        isActive:      true,
        createdAt:     serverTimestamp(),
        updatedAt:     serverTimestamp(),
      });
      total++;
    });
  }

  await batch.commit();
  console.log(`✅ Seeded ${total} services across ${SERVICE_CATEGORIES.length} categories.`);
  return { skipped: false, count: total };
}

/**
 * Tambah layanan kategori software saja — aman dijalankan meski koleksi
 * sudah ada isinya. Tidak akan menghapus atau mengubah data lain.
 *
 * Jalankan dari browser console (halaman mana saja setelah login):
 *   import('/src/utils/seedGroupedServices.js').then(m => m.seedSoftwareServices())
 */
export async function seedSoftwareServices() {
  console.log('🌱 seedSoftwareServices: menambahkan layanan software…');
  const col = collection(db, 'services');
  const meta = getCategoryMeta('software');

  // Cek apakah layanan software sudah ada
  const existing = await getDocs(col);
  const alreadyHasSoftware = existing.docs.some(
    (d) => d.data().category === 'software'
  );

  if (alreadyHasSoftware) {
    console.log('⏭️  Layanan software sudah ada di Firestore. Batalkan atau hapus manual dulu jika ingin reseed.');
    return { skipped: true };
  }

  const items = SEED_DATA['software'] || [];
  const batch = writeBatch(db);

  items.forEach((item, idx) => {
    const ref = doc(col);
    batch.set(ref, {
      title:         item.title,
      description:   item.description,
      icon:          item.icon,
      image:         '',
      imagePath:     '',
      category:      'software',
      categoryTitle: meta.title,
      order:         idx,
      isActive:      true,
      createdAt:     serverTimestamp(),
      updatedAt:     serverTimestamp(),
    });
  });

  await batch.commit();
  console.log(`✅ Berhasil menambahkan ${items.length} layanan software ke Firestore.`);
  return { skipped: false, count: items.length };
}

// Expose on window for quick browser console access
if (typeof window !== 'undefined') {
  window.seedGroupedServices  = seedGroupedServices;
  window.seedSoftwareServices = seedSoftwareServices;
}