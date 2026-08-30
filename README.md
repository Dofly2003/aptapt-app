<div align="center">

# ⚡ PT Adytia Putra Tehnik — Dashboard

**Platform manajemen inspeksi kelistrikan end-to-end**  
Dashboard admin · Aplikasi mobile teknisi lapangan · Laporan PDF otomatis

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![Firebase](https://img.shields.io/badge/Firebase-12-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com)
[![Capacitor](https://img.shields.io/badge/Capacitor-6-119EFF?style=flat-square&logo=capacitor&logoColor=white)](https://capacitorjs.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=flat-square&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

</div>

---

## Tentang Proyek

Platform digital untuk **PT Adytia Putra Tehnik** — konsultan & kontraktor listrik. Sistem ini menggantikan alur kerja berbasis kertas dengan solusi digital yang dapat digunakan **online maupun offline** di lapangan.

```
Admin Dashboard  ──▶  Kelola WO & laporan          (Web browser)
Mobile App       ──▶  Teknisi isi form di lapangan  (Android APK + PWA)
PDF Generator    ──▶  Laporan LHPP otomatis          (react-to-print + @react-pdf/renderer)
```

---

## Fitur Utama

### 🏗️ Dashboard Admin
- **Work Order Management** — buat, assign, pantau status pekerjaan
- **Laporan LHPP** — generate PDF laporan pengujian kelistrikan otomatis
- **CMS Landing Page** — kelola konten website publik (hero, services, projects, testimonials)
- **Manajemen Keuangan** — dokumen keuangan, saldo, harga daya, transaksi
- **SDM** — karyawan, penggajian, absensi, rekrutmen, penilaian kinerja
- **Pengadaan** — vendor, purchase order, penerimaan barang
- **Inventori** — stok barang, pergerakan stok, gudang
- **Penjualan** — pelanggan, sales order, invoice, pipeline
- **Aset** — daftar aset, jadwal maintenance, work order aset

### 📱 Mobile App (Teknisi Lapangan)
- **Form Pengujian** — pengisian data inspeksi kelistrikan langkah demi langkah
- **Kamera Terintegrasi** — foto dokumentasi langsung dari form
- **Offline-First** — bekerja tanpa internet, sinkronisasi otomatis saat online
- **OCR** — baca nilai nameplate peralatan via kamera (Tesseract.js)
- **Lokasi** — integrasi Google Maps untuk lokasi pekerjaan

### 📄 Laporan PDF
- Template LHPP lengkap (section A–E): identitas, spesifikasi, hasil uji, evaluasi, rekomendasi
- Tabel pengukuran tahanan isolasi (PHB TM · Trafo · PHB TR) layout 3-kolom kompak
- Foto dokumentasi megger per titik ukur dengan grid responsif
- Tanda tangan digital + stempel perusahaan
- Generate via `react-to-print` (HTML) dan `@react-pdf/renderer` (standalone PDF)

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| **Frontend** | React 19, Vite 7, React Router 7, Tailwind CSS 3 |
| **Backend / DB** | Firebase Firestore, Firebase Auth, Firebase Storage, Cloud Functions |
| **Mobile** | Capacitor 6 (Android APK + PWA), Dexie 4 (IndexedDB offline) |
| **PDF** | react-to-print, @react-pdf/renderer 4, jsPDF, html2canvas |
| **Charts** | Recharts 3, Chart.js 4 |
| **Editor** | Tiptap 3 (rich text) |
| **UI / Motion** | Framer Motion 12, Lucide React, @dnd-kit, react-select, Swiper |
| **Utils** | Tesseract.js 7 (OCR), browser-image-compression, xlsx, docx, jszip |

---

## Struktur Folder

```
src/
├── components/          # Komponen reusable
│   ├── admin/           # AdminUI: Button, Input, Modal, Select, dll
│   └── landing/         # 13 komponen CMS publik
├── pages/
│   ├── admin/           # 20+ halaman CRUD admin
│   ├── mobile/          # 9 halaman teknisi lapangan
│   ├── keuangan/        # Dokumen, saldo, transaksi
│   ├── sdm/             # HR management
│   ├── pengadaan/       # Procurement
│   ├── inventori/       # Inventory
│   ├── penjualan/       # Sales
│   ├── proyek/          # Project management
│   └── aset/            # Asset management
├── templates/
│   ├── laporan/         # TemplateAdytia + 10+ blok komponen laporan
│   └── rab/             # Template RAB
├── services/            # 16 service Firestore per domain
├── offline/             # Dexie schema, sync engine, photo store
├── schema/              # formSchema.js — form schema-driven
├── utils/               # PDF export, migration, helpers
├── context/             # AuthContext, LoadingContext
└── hooks/               # useContent, dll
```

---

## Arsitektur Offline (Mobile)

Aplikasi mobile dirancang **offline-first** untuk teknisi di area dengan sinyal lemah.

```
📷 Ambil foto  →  saveLocalPhoto()  →  capacitor:// URI  →  localStorage
📝 Isi form    →  setPath()         →  Dexie (IndexedDB) →  pendingQueue
🌐 Online      →  flushQueue()      →  Firestore + Firebase Storage
                   └─ remapLocalId() ──▶  local_xxx  →  realDocId
```

- **Dexie** menyimpan snapshot form lokal + antrian operasi (`pendingQueue`)
- **syncEngine** flush otomatis saat koneksi tersedia kembali
- **`buildSafePhotos()`** — hanya kirim `https://firebasestorage` URL ke Firestore
- **`buildLocalPhotos()`** — simpan semua URL (termasuk `capacitor://`) ke localStorage
- **`mergePhotos()`** — merge data Firestore + foto lokal saat load form

---

## Memulai

### Prasyarat

- Node.js 18+
- Firebase project (Firestore, Auth, Storage diaktifkan)
- Android Studio (untuk build APK)

### Instalasi

```bash
git clone https://github.com/your-org/aptaptweb-app-dashboard.git
cd dashboard
npm install
```

Buat file `.env` di root project:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_GOOGLE_MAPS_API_KEY=...
```

### Development

```bash
npm run dev        # Local dev server (http://localhost:5173)
npm run build      # Production build
npm run deploy     # Build + Firebase Hosting deploy
```

### Android (Capacitor)

```bash
npm run cap:android   # Build → sync → buka Android Studio
npm run cap:run       # Build → sync → run di device/emulator
```

---

## Scripts

| Script | Deskripsi |
|---|---|
| `npm run dev` | Development server dengan Vite HMR |
| `npm run build` | Production build |
| `npm run deploy` | Build + deploy ke Firebase Hosting |
| `npm run build:app` | Build khusus untuk Capacitor |
| `npm run cap:sync` | Build + `npx cap sync` |
| `npm run cap:android` | Build + buka Android Studio |
| `npm run cap:run` | Build + run langsung di device Android |

---

## Routes

| Prefix | Keterangan |
|---|---|
| `/` | Halaman publik (landing, about, contact, login) |
| `/dashboard/*` | Admin panel — butuh autentikasi |
| `/app-mobile/*` | Mobile teknisi — butuh autentikasi |
| `/laporan/:id` | Laporan publik via share link |
| `/rab/:id` | RAB publik via share link |

---

## Role & Akses

| Role | Akses |
|---|---|
| `superadmin` | Full access |
| `admin` | Full access |
| `editor` | Landing CMS only |
| `finance` | Modul keuangan |
| `user` | Mobile app (teknisi lapangan) |

---

## Deployment

| Target | URL |
|---|---|
| Web (production) | `adytia-pt.web.app` / `pt-adytia.com` |
| Firebase project | `adytia-pt` |
| Storage bucket | `adytia-pt.firebasestorage.app` |
| Android app ID | `com.ptadytia.flutter_app_mobile` |

---

<div align="center">

Made with ❤️ for **PT Adytia Putra Tehnik**  
Konsultan & Kontraktor Listrik

</div>
"# aptapt-app" 
