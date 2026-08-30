 1. [K-1] Pindahkan semua Firebase config ke .env dengan prefix VITE_, tambahkan .env ke .gitignore, restriksi API
   key di Google Cloud Console
  2. [K-3] Hapus penyimpanan plaintext password di akun_credentials — enkripsi atau pindah ke Secret Manager
  3. [T-1] Blokir self-topup saldo dari frontend, pindahkan ke approval flow atau Firebase Function//
  4. [T-5] Fix AuthContext — jangan fallback ke role user saat error fetch profil
  5. [T-2] Buat file storage.rules dengan validasi path dan auth//

  Minggu Ini (Keamanan Tinggi)

  6. [K-2] Tambahkan Firestore rules eksplisit untuk semua koleksi yang belum ada rule-nya//
  7. [T-3] Fix senderTemplateService — tambahkan ownership check di update/delete
  8. [T-4] Fix ProtectedRoute — tambahkan handling role finance dan editor
  9. [S-1] Install dompurify, sanitasi HTML di DokumenEditor.jsx sebelum di-assign ke innerHTML
  10. [S-2] Fix users collection rules agar user tidak bisa baca profil user lain//

  Dalam Sprint Berikutnya (Code Quality)

  11. [D-6] Ganti window.location.href di DataList.jsx dengan useNavigate()
  12. [D-4] Hapus semua console.log debug di InstansiManagement.jsx
  13. [D-5] Sambungkan totalWO, woProgress, woDone di Dashboard.jsx ke Firestore real-time
  14. [E-1–E-7] Tambahkan try/catch ke semua async handler di mobile pages, fix error message ke Bahasa Indonesia
  15. [S-3–S-6] Tambahkan validasi MIME type (file.type) di semua upload function
  16. [S-7] Terapkan browser-image-compression konsisten di contentService.js dan dokumenService.js

  Backlog (CRUD & Feature Completion)

  17. Buat halaman + route untuk 6 sub-modul yang servicenya sudah siap: PenerimaanBarang, Pipeline, SumberDaya,
  TugasProyek, PenjadwalanProduksi, InspeksiKualitas
  18. Daftarkan atau hapus LaporanTeknikPreview.jsx yang tidak punya route
  19. Refactor WoPenyelesaian.jsx ke pola AdminUI (Button, useToast)
  20. Refactor Users.jsx, DataEntry.jsx, DataList.jsx ke AdminUI components