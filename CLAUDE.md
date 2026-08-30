# PT Adytia Putra Tehnik — Project Context

Stack: React 19 + Vite + Firebase (Auth + Firestore + Storage + Functions),
Tailwind CSS, Context API, react-to-print, html2canvas+jspdf, framer-motion,
@dnd-kit, react-select, browser-image-compression, chart.js, recharts,
tesseract.js, @react-google-maps/api, swiper, vite-plugin-pwa.

## Konvensi
- Bahasa: kode pakai Inggris, copywriting & error message Bahasa Indonesia
- Color: amber (#f59e0b) primary, slate untuk surfaces gelap, blue/emerald untuk semantic
- Font PDF: Times New Roman 11pt
- File naming: PascalCase untuk component, camelCase untuk service
- Route admin pakai prefix `/Dashboard/`, mobile pakai `/app-mobile/`, public route plain

## Struktur folder
```
src/
├── components/
│   ├── admin/AdminUI.jsx       — reusable: Button, Input, Select, Modal, dll
│   ├── landing/                — 13 komponen CMS publik (HeroSlider, ServicesSection, Footer, dll)
│   └── (root)                  — 20+ core: Table, Card, Navbar, dll
├── pages/
│   ├── admin/                  — 20 halaman CRUD admin (+ WoPenyelesaian.jsx)
│   ├── mobile/                 — 9 halaman teknisi field
│   ├── keuangan/               — 5 halaman (dokumen, saldo, harga daya, dll)
│   ├── sdm/                    — 5 halaman (karyawan, penggajian, absensi, rekrutmen, kinerja)
│   ├── pengadaan/              — 3 halaman (vendor, PO, penerimaan barang)
│   ├── inventori/              — 3 halaman (stok, pergerakan, gudang)
│   ├── produksi/               — 2 halaman (BOM, work order)
│   ├── penjualan/              — 3 halaman (pelanggan, SO, invoice)
│   ├── proyek/                 — 1 halaman manajemen proyek
│   └── aset/                   — 3 halaman (daftar aset, maintenance, work order aset)
├── services/                   — 16 file Firestore CRUD per domain (lihat bawah)
├── templates/
│   ├── laporan/                — TemplateAdytia + komponen blok (11 file)
│   └── rab/                    — TemplateRabAdytia.jsx
├── utils/                      — 10 utilitas (export PDF, seed, migration, dll)
├── context/                    — AuthContext.jsx, LoadingContext.jsx
├── hooks/                      — useContent.js
├── constants/                  — serviceCategories.js
├── layouts/                    — DashboardLayout.jsx, MobileLayout.jsx
├── firebase/                   — config.js
└── schema/                     — formSchema.js (dipindah dari utils/)
```

## Services (src/services/)
api.js, asetService.js, contentService.js, dppService.js, edukasiService.js,
instansiService.js, inventoriService.js, keuanganService.js, paymentService.js,
pengadaanService.js, penjualanService.js, produksiService.js, proyekService.js,
rabService.js, saldoService.js, sdmService.js

## Routes
- **Public**: `/`, `/about`, `/contact`, `/panel1`, `/daftar-nidi-slo`, `/login-phone`, `/setup-user`, `/login`, `/pesanan-saya`, `/laporan/:id`, `/rab/:id`
- **Dashboard** (`/dashboard/*`): nidi (3), landing CMS (7), keuangan (5), sdm (5), pengadaan (3), inventori (3), produksi (2), penjualan (3), proyek (1), aset (3), wo/penyelesaian/:id (detail WO nidi_data)
- **Mobile** (`/app-mobile/*`): 9 route teknisi field

## Pattern penting
- Snapshot pattern: penanggungJawab disnapshot ke ttd field saat assign
- ImageUploader callback: file===null = remove, File = upload
- Form schema-driven di src/schema/formSchema.js
- Service path Storage: instansi/{folder}/, pengujian/{uid}/{docId}/{partKey}/{photoKey}, dpp/{submId}/{checkId}/
- PDF laporan: pakai class `.laporan-form` + `.laporan-section` (src/utils/exportLaporanPdf.js)
- PDF RAB: TemplateRabAdytia.jsx via rabService.js
- Animated routes di AnimatedRoutes.jsx
- WoPenyelesaian: halaman detail work order nidi (`/dashboard/wo/penyelesaian/:id`), fetch `nidi_data/{id}`, tombol "Tandai Selesai" update status→done + selesaiAt, tampilkan pesan jika ID tidak ditemukan (tidak redirect ke 404)

## Capacitor Android — Safe Area / Status Bar
File: `src/index.css`, `src/layouts/DashboardLayout.jsx`, `capacitor.config.json`

Masalah: konten overlap dengan status bar Android (terutama Android 15+ yang memaksa edge-to-edge).

Fix yang sudah diterapkan:
- `capacitor.config.json` → `StatusBar.overlaysWebView: false` (handle pre-Android 15)
- `src/index.css` → `body { padding-top: env(safe-area-inset-top, 0px) }` (handle Android 15+ edge-to-edge)
- `src/index.css` → utility `.h-safe-screen { height: calc(100vh - env(safe-area-inset-top, 0px)) }`
- `DashboardLayout.jsx` → ganti `h-screen` → `h-safe-screen` agar tidak overflow 24px

**Jangan** tambahkan `pt-safe` per-halaman untuk status bar — sudah ditangani global di `body`.
`pt-safe` / `pb-safe` / `pb-safe-nav` / `pb-safe-sheet` tetap tersedia di index.css untuk kebutuhan lain.

## Capacitor Android — Offline Architecture (`src/offline/`)
App berjalan offline-first untuk teknisi di lapangan. Semua modul mobile harus mengikuti pattern ini.

### File-file offline
```
src/offline/
  db.js            — Dexie schema (IndexedDB): pendingQueue, pengujian, nidi_data, keuangan, inventori, rab, invoice, photoCache
  networkWatcher.js — isOnline(), onNetworkChange()
  photoStore.js    — saveLocalPhoto(), getCachedPhotoUrl(), cachePhoto(), cleanExpiredCache()
  syncEngine.js    — queue system + flush ke Firestore saat online
  useOfflineCRUD.js — hook CRUD sederhana (belum diwire ke semua modul)
  OfflineBanner.jsx — banner amber saat offline
  CachedImage.jsx  — <img> dengan fallback cache Filesystem 7 hari
```

### Dexie schema (db.js)
- `pendingQueue` — item antrian menunggu sync. Index: `collection, docId, type, createdAt`
- `pengujian` — snapshot lokal Firestore. Index: `docId, updatedAt, syncedAt`
- `syncedAt: 0` artinya item dibuat offline dan **belum ada di Firestore** (masih lokal)
- `syncedAt: Date.now()` artinya sudah tersync dari Firestore

### syncEngine.js — API publik
```js
queueCreate(collection, data, localId)       // buat dokumen baru (offline safe)
queueSectionUpdate(collection, docId, data)  // update sebagian field
queuePhotoUpload(collection, docId, localPath, storagePath, arrayField) // upload foto
queueDelete(collection, docId)               // hapus dokumen
flushQueue()                                 // paksa sync sekarang
getPendingCount()                            // jumlah item belum sync
onSyncProgress(cb)                           // listener progress sync
onIdRemap(cb)                                // listener saat local_xxx → realId
```

`flushQueue()` dipanggil otomatis saat `onNetworkChange(online === true)`.

### Pattern: Buat form offline (localId)
1. Buat `localId = "local_" + Date.now()`
2. Simpan ke Dexie: `localDb.pengujian.put({ docId: localId, ..., syncedAt: 0 })`
3. Queue: `queueCreate("pengujian", payload, localId)`
4. Navigate ke `/app-mobile/form-pengujian/${localId}`

Saat online, `queueCreate` → Firestore buat doc → dapat `realId` → `remapLocalId()` dipanggil otomatis:
- Entry Dexie `local_xxx` dihapus, dibuat ulang dengan `docId: realId`
- Semua item `pendingQueue` yang punya `docId: local_xxx` di-update ke `realId` (termasuk photoUpload!)
- localStorage key `pengujian_draft_local_xxx` → di-rename ke `pengujian_draft_realId`
- `onIdRemap` listener dipanggil → form navigate ke URL dengan realId

**JANGAN** biarkan `photoUpload` queue item memakai localId — kalau `remapLocalId` tidak dipanggil maka foto gagal masuk Firestore.

### Pattern: Foto offline
`CameraButton.jsx` pakai `Camera.getPhoto({ saveToGallery: true })` — foto otomatis tersimpan ke galeri HP.

Flow foto offline di `MobileFormPengujian.jsx`:
1. Ambil foto → `saveLocalPhoto(blob, storagePath)` → simpan ke `Directory.Data/photo_local/{storagePath}` → return `capacitor://` URI
2. State `photos` diupdate dengan URI lokal tersebut
3. Auto-save ke **localStorage** pakai `buildLocalPhotos(photos)` — menyimpan SEMUA string URL termasuk `capacitor://`
4. Auto-save ke **Firestore** pakai `buildSafePhotos(photos)` — hanya URL `https://firebasestorage...`
5. Queue: `queuePhotoUpload(...)` dengan `localPath = "photo_local/{storagePath}"`

**Dua fungsi berbeda untuk dua tujuan berbeda:**
- `buildSafePhotos()` → hanya Firebase Storage URL → untuk Firestore & handleSaveDraft & handleSubmit
- `buildLocalPhotos()` → semua string kecuali `blob:` → untuk localStorage saja

**JANGAN** simpan `capacitor://` URI ke Firestore — URL tersebut hanya valid di device yang sama.

### Pattern: Load form di MobileFormPengujian
Urutan load:
1. Coba `getDoc` dari Firestore
2. Jika berhasil → ambil data Firestore, lalu **merge** dengan foto lokal dari localStorage (`mergePhotos()`)
3. Jika gagal (offline) → fallback ke `localStorage.getItem(cacheKey)`

`mergePhotos(firestorePhotos, localPhotos)`:
- Per foto-key: kalau Firestore sudah punya `https://firebasestorage` URL → pakai itu, abaikan lokal
- Kalau Firestore belum punya (masih kosong / foto belum ter-upload) → tampilkan `capacitor://` URI dari localStorage sementara

### Pattern: List pengujian (MobilePengujianList)
`onSnapshot` handler **harus** preserve item `syncedAt: 0` dari Dexie:
```js
const pendingLocal = allLocal
  .filter(p => p.syncedAt === 0 && !firestoreIds.has(p.docId))
  .map(p => ({ ...p, id: p.docId }));
setList([...pendingLocal, ...firestoreItems]);
// bulkPut hanya untuk firestoreItems — jangan timpa syncedAt:0
```

Tanpa ini, form offline hilang dari list saat internet nyala karena onSnapshot menimpa data lokal.

### Validasi form create
Instansi & TTD di step 2 form create **tidak wajib** (opsional) — karena data instansi diambil dari Firestore dan tidak tersedia offline. User bisa mengisi di dalam form setelah online.

## Firestore collections
**Core**: users, instansi, pengujian, nidi_data, laporan, technician_notes, counters, akun_credentials

**DPP**: dpp_checklist, dpp_submissions

**Finance**: dokumen_keuangan, saldo_history, harga_daya, transactions

**Pengadaan**: vendor, purchaseOrder, approvalPembelian, penerimaanBarang

**Penjualan**: pelanggan, salesOrder, invoice, pipeline

**Produksi**: billOfMaterial, workOrderProduksi, penjadwalanProduksi, inspeksiKualitas

**Inventori**: stokBarang, pergerakanStok, gudang, items_global

**Proyek**: proyek, sumberDaya, tugasProyek, work_orders

**SDM**: karyawan, penggajian, absensi, rekrutmen, kinerja

**Aset**: daftarAset, jadwalMaintenance, workOrderAset

**CMS**: slides, services, projects, testimonials

**Settings**: settings/payment, settings/edukasi

## Role
admin, superadmin (full access), editor (landing CMS only), finance, user

## Domain
adytia-pt.web.app + pt-adytia.com (production)
Bucket: adytia-pt.firebasestorage.app
