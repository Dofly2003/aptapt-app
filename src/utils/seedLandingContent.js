// src/utils/seedLandingContent.js
// Run from a small admin-only "dev" page or once via the browser console
// to populate Firestore with starter content for the landing page.
//
// Usage in dev page:
//   import { seedLandingContent } from '../utils/seedLandingContent';
//   <button onClick={() => seedLandingContent()}>Seed</button>

import { collection, addDoc, doc, setDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { DEFAULT_SETTINGS } from '../services/contentService';

const SLIDES = [
  {
    title: 'Solusi Listrik Profesional & Bersertifikat',
    subtitle: 'Tim teknisi bersertifikat siap menangani kebutuhan kelistrikan industri, komersial, dan rumah tangga Anda.',
    image: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=1920',
    ctaText: 'Konsultasi Gratis',
    ctaLink: '#contact',
    order: 0,
    isActive: true,
  },
  {
    title: 'Pembuatan SLO & NIDI Resmi',
    subtitle: 'Sertifikasi instalasi listrik sesuai standar PUIL dan regulasi pemerintah, proses cepat dan transparan.',
    image: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1920',
    ctaText: 'Pelajari Lebih Lanjut',
    ctaLink: '#services',
    order: 1,
    isActive: true,
  },
  {
    title: 'Pemasangan Lampu PJU Hemat Energi',
    subtitle: 'Solusi penerangan jalan umum dengan teknologi LED dan smart-control untuk efisiensi maksimal.',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1920',
    ctaText: 'Lihat Portofolio',
    ctaLink: '#projects',
    order: 2,
    isActive: true,
  },
];

const SERVICES = [
  {
    title: 'Pembuatan NIDI & SLO',
    description:
      'Sertifikasi resmi instalasi listrik sesuai PUIL. Proses cepat, dokumen lengkap, dan dipandu tim ahli K3 kelistrikan dari awal hingga terbit.',
    icon: 'file-check',
    order: 0,
    isActive: true,
  },
  {
    title: 'Pemasangan Lampu PJU',
    description:
      'Penerangan jalan umum dengan lampu LED hemat energi, instalasi tiang, dan sistem kontrol otomatis yang andal untuk jangka panjang.',
    icon: 'lightbulb',
    order: 1,
    isActive: true,
  },
  {
    title: 'Instalasi Listrik Industri',
    description:
      'Pemasangan instalasi listrik pabrik, gudang, dan fasilitas industri dengan standar keamanan tinggi dan kapasitas daya besar.',
    icon: 'factory',
    order: 2,
    isActive: true,
  },
  {
    title: 'Instalasi Listrik Rumah',
    description:
      'Pemasangan listrik rumah tinggal yang rapi, aman, dan sesuai standar — termasuk panel, MCB, grounding, dan smart-home wiring.',
    icon: 'home',
    order: 3,
    isActive: true,
  },
  {
    title: 'Perawatan & Audit Listrik',
    description:
      'Pemeriksaan rutin, deteksi gangguan, dan perawatan preventif untuk memastikan instalasi listrik Anda selalu dalam kondisi optimal.',
    icon: 'wrench',
    order: 4,
    isActive: true,
  },
  {
    title: 'Panel & Distribusi Daya',
    description:
      'Perakitan panel kontrol, MDP/SDP, dan sistem distribusi daya custom sesuai kebutuhan industri dan komersial.',
    icon: 'cpu',
    order: 5,
    isActive: true,
  },
];

const PROJECTS = [
  {
    title: 'Instalasi Pabrik Tekstil 2.5 MVA',
    description:
      'Instalasi listrik tegangan menengah lengkap untuk pabrik tekstil seluas 8000 m². Mencakup gardu, panel utama, distribusi, dan sistem grounding.',
    location: 'Sidoarjo, Jawa Timur',
    category: 'Industri',
    images: [
      { url: 'https://images.unsplash.com/photo-1565514020179-026b92b84bb6?w=1200', path: '' },
      { url: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=1200', path: '' },
    ],
    order: 0,
    isActive: true,
  },
  {
    title: 'PJU Smart-LED Jl. Industri Raya',
    description:
      'Pemasangan 120 titik lampu PJU LED 150W dengan kontrol otomatis berbasis fotosel dan timer, sepanjang 4 km jalan industri.',
    location: 'Gresik, Jawa Timur',
    category: 'PJU',
    images: [{ url: 'https://images.unsplash.com/photo-1569337558131-cdc91c95eaad?w=1200', path: '' }],
    order: 1,
    isActive: true,
  },
  {
    title: 'SLO Apartemen 24 Lantai',
    description:
      'Sertifikasi laik operasi instalasi listrik untuk apartemen 24 lantai dengan total daya 1.8 MVA. Pengujian, dokumentasi, dan terbit dalam 14 hari kerja.',
    location: 'Surabaya, Jawa Timur',
    category: 'SLO/NIDI',
    images: [{ url: 'https://images.unsplash.com/photo-1545972154-9bb223aac798?w=1200', path: '' }],
    order: 2,
    isActive: true,
  },
  {
    title: 'Renovasi Panel Hotel Bintang 4',
    description:
      'Penggantian panel utama dan re-wiring pada hotel bintang 4 dengan kapasitas 800 kVA, dilakukan tanpa mengganggu operasional tamu.',
    location: 'Malang, Jawa Timur',
    category: 'Komersial',
    images: [{ url: 'https://images.unsplash.com/photo-1517497280462-c5ad24bc1bdd?w=1200', path: '' }],
    order: 3,
    isActive: true,
  },
];

const TESTIMONIALS = [
  {
    name: 'Budi Santoso',
    role: 'Direktur Operasional',
    company: 'PT Mitra Sentosa',
    review:
      'Tim sangat profesional dan tepat waktu. Proses SLO yang biasanya rumit, jadi sangat mudah dengan bantuan mereka. Sangat direkomendasikan untuk perusahaan industri.',
    rating: 5,
    order: 0,
    isActive: true,
  },
  {
    name: 'Siti Rahayu',
    role: 'Property Manager',
    company: 'Graha Permai Apartment',
    review:
      'Kualitas instalasi dan dokumentasinya sangat rapi. Setiap detail dijelaskan dengan jelas, dan tim teknisinya sangat sopan saat bekerja di area tenant.',
    rating: 5,
    order: 1,
    isActive: true,
  },
  {
    name: 'Pak Hartono',
    role: 'Kepala Desa',
    company: 'Desa Sumber Mulyo',
    review:
      'Pemasangan PJU di desa kami selesai lebih cepat dari jadwal. Lampu LED-nya terang dan hemat. Warga sangat puas dengan hasilnya.',
    rating: 5,
    order: 2,
    isActive: true,
  },
];

async function seedCollection(name, items) {
  const col = collection(db, name);
  const existing = await getDocs(col);
  if (!existing.empty) {
    console.log(`[seed] ${name}: skipped (${existing.size} docs already exist)`);
    return;
  }
  for (const item of items) {
    await addDoc(col, { ...item, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  }
  console.log(`[seed] ${name}: inserted ${items.length} docs`);
}

export async function seedLandingContent() {
  console.log('[seed] starting…');
  await seedCollection('slides', SLIDES);
  await seedCollection('services', SERVICES);
  await seedCollection('projects', PROJECTS);
  await seedCollection('testimonials', TESTIMONIALS);

  // Settings (single doc)
  await setDoc(
    doc(db, 'settings', 'global'),
    { ...DEFAULT_SETTINGS, updatedAt: serverTimestamp(), createdAt: serverTimestamp() },
    { merge: true }
  );
  console.log('[seed] settings: written');
  console.log('[seed] done ✅');
}