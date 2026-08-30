# Changelog

---

## [2026-05-19] — Cleanup & Reorganisasi pages/

### File DIHAPUS (tidak dipakai di manapun)
| Folder/File | Keterangan |
|---|---|
| `pages/finance/` (7 file) | Seluruh folder finance dihapus |
| `pages/wo/` (6 file) | Seluruh folder work order dihapus |
| `pages/laporan-wo/` (2 file) | Folder laporan-wo orphan dihapus |
| `pages/laporan/CashFlow.jsx` | Tidak ada route aktif |
| `pages/laporan/LaporanKeuangan.jsx` | Tidak ada route aktif |
| `pages/laporan/LaporanUser.jsx` | Tidak ada route aktif |
| `pages/laporan/Pemasukan.jsx` | Tidak ada route aktif |
| `pages/laporan/Pengeluaran.jsx` | Tidak ada route aktif |
| `pages/admin/DppChecklistManagement.jsx` | Route dihapus sebelumnya |
| `pages/Landing.jsx` | Tidak ada import dimanapun |

### File DIPINDAH ke `pages/admin/`
| Dari | Ke |
|---|---|
| `pages/Dashboard.jsx` | `pages/admin/Dashboard.jsx` (import path diupdate) |
| `pages/data-entry/DataEntry.jsx` | `pages/admin/DataEntry.jsx` |
| `pages/data-entry/DataList.jsx` | `pages/admin/DataList.jsx` |
| `pages/data-entry/DataAkun.jsx` | `pages/admin/DataAkun.jsx` |
| `pages/data-entry/FormAkun.jsx` | `pages/admin/FormAkun.jsx` |
| `pages/data-entry/TableAkun.jsx` | `pages/admin/TableAkun.jsx` |
| `pages/users/Users.jsx` | `pages/admin/Users.jsx` |
| `pages/rab/RabPreview.jsx` | `pages/admin/RabPreview.jsx` |
| `pages/laporan/LaporanPreview.jsx` | `pages/admin/LaporanPreview.jsx` |

### File DIPINDAH ke `pages/page-umum/`
| Dari | Ke |
|---|---|
| `pages/data-entry/DataEntryUmum.jsx` | `pages/page-umum/DataEntryUmum.jsx` (public route) |

### Folder DIHAPUS (kosong setelah move)
- `pages/data-entry/`
- `pages/users/`
- `pages/rab/`
- `pages/laporan/`

### AnimatedRoutes.jsx
- Semua import diupdate ke path baru (`./pages/admin/` dan `./pages/page-umum/`)


---

## [2026-05-19]

### Sidebar.jsx
- **Fix bug**: `BASE` diubah dari `/Dashboard` (kapital) → `/dashboard` agar `isActive()` bekerja dengan benar
- **Hapus**: State `openTransaksi`, `openLaporan`, `openDpp` beserta setter-nya di `useEffect` (tidak digunakan setelah cleanup)
- **Hapus**: Import icon `ClipboardList`, `FileText` dari `lucide-react` (tidak lagi digunakan)
- **Pertahankan**: `Receipt` tetap dipakai untuk ikon RAB/Penawaran
- **Hapus**: Blok comment `WORK ORDER` (link ke `/dashboard/wo`)
- **Hapus**: Blok comment `FINANCE` (link ke transaksi, saldo, laporan, DPP/checklist)

### AnimatedRoutes.jsx
- **Hapus import**: `UangMasuk`, `UangKeluar`, `Transaksi`, `TransaksiUser`
- **Hapus import**: `ManageSaldo`, `SaldoHistory`, `CashMonitoring`
- **Hapus import**: `CashFlow`, `Pemasukan`, `Pengeluaran`, `FinanceReport`, `LaporanUser`
- **Hapus import**: `ListWO`, `CreateWO`, `BudgetHistory`, `ProjectLog`, `ProjectDetail`, `Penyelesaian`
- **Hapus import**: `DppChecklistManagement`
- **Hapus route**: Semua route finance (`transaksi/*`, `finance/*`, `laporan/*`)
- **Hapus route**: Semua route work order (`wo`, `wo/*`)
- **Hapus route**: `dpp/checklist`

### File page yang TIDAK dihapus otomatis (perlu keputusan manual):
| File | Path |
|---|---|
| FormUangMasuk.jsx | src/pages/finance/transaksi/FormUangMasuk.jsx |
| FormUangKeluar.jsx | src/pages/finance/transaksi/FormUangKeluar.jsx |
| transaksi.jsx | src/pages/finance/transaksi/transaksi.jsx |
| TransaksiUser.jsx | src/pages/finance/transaksi/TransaksiUser.jsx |
| ManageSaldo.jsx | src/pages/finance/ManageSaldo.jsx |
| SaldoHistory.jsx | src/pages/finance/SaldoHistory.jsx |
| CashMonitoring.jsx | src/pages/finance/CashMonitoring.jsx |
| CashFlow.jsx | src/pages/laporan/CashFlow.jsx |
| Pemasukan.jsx | src/pages/laporan/Pemasukan.jsx |
| Pengeluaran.jsx | src/pages/laporan/Pengeluaran.jsx |
| LaporanKeuangan.jsx | src/pages/laporan/LaporanKeuangan.jsx |
| LaporanUser.jsx | src/pages/laporan/LaporanUser.jsx |
| ListWO.jsx | src/pages/wo/ListWO.jsx |
| CreateWo.jsx | src/pages/wo/CreateWo.jsx |
| BudgetHistory.jsx | src/pages/wo/BudgetHistory.jsx |
| ProjectLog.jsx | src/pages/wo/ProjectLog.jsx |
| ProjectDetail.jsx | src/pages/wo/ProjectDetail.jsx |
| Penyelesaian.jsx | src/pages/wo/Penyelesaian.jsx |
| DppChecklistManagement.jsx | src/pages/admin/DppChecklistManagement.jsx |
