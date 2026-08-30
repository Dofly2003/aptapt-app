import { useContext, useEffect, useRef, useState } from "react";
import {
  AlertTriangle, ChevronLeft, ChevronRight, Download, Edit2, FileText,
  Plus, Search, Trash2, Upload, X,
} from "lucide-react";
import {
  AdminPageHeader, Button, Modal, Field, Input, Select, EmptyState, useToast,
} from "../../components/admin/AdminUI";
import {
  getAllArusKas, createArusKas, updateArusKas, removeArusKas, formatRupiah,
  importArusKasBatch, deleteArusKasByMonth, preCheckArusKasImport,
} from "../../services/keuanganService";
import { AuthContext } from "../../context/AuthContext";

const EMPTY = {
  tanggal: "",
  keterangan: "",
  kategori: "operasional",
  masuk: "",
  keluar: "",
  referensi: "",
};

const KATEGORI_LABEL = {
  operasional: "Operasional",
  investasi: "Investasi",
  pendanaan: "Pendanaan",
  saldo_awal: "Saldo Awal",
};

const BULAN = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember",
];

const PAGE_SIZE = 50;

function parseBcaCsv(text) {
  const withoutBom = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
  const clean = withoutBom.replace(/\r/g, "");
  const lines = clean.trim().split("\n");
  const dataLines = lines.filter((l, i) => {
    if (i === 0 && l.toLowerCase().startsWith("tanggal")) return false;
    return l.trim().length > 0;
  });
  return dataLines.map(line => {
    const parts = line.split("|");
    const tanggalRaw = (parts[0] || "").trim();
    const keterangan = (parts[1] || "").trim();
    const mutasi = parseFloat((parts[3] || "0").replace(/,/g, "")) || 0;
    const jenis = (parts[4] || "").trim().toUpperCase();
    const saldoSetelah = parseFloat((parts[5] || "0").replace(/,/g, "")) || 0;
    return {
      tanggalRaw, keterangan: keterangan || `Transaksi ${jenis}`,
      masuk: jenis === "CR" ? mutasi : 0,
      keluar: jenis === "DB" ? mutasi : 0,
      jenis, saldoSetelah,
    };
  }).filter(r => /^\d{2}\/\d{2}$/.test(r.tanggalRaw));
}

function sortByDate(rows) {
  return [...rows].sort((a, b) => {
    const [ada, amo] = a.tanggalRaw.split("/").map(Number);
    const [bda, bmo] = b.tanggalRaw.split("/").map(Number);
    if (amo !== bmo) return amo - bmo;
    return ada - bda;
  });
}

function calcSaldoAwal(rows) {
  if (!rows.length) return 0;
  const first = sortByDate(rows)[0];
  return first.saldoSetelah + first.keluar - first.masuk;
}

function prevMonth(y, m) {
  return m === 1 ? [y - 1, 12] : [y, m - 1];
}
function nextMonth(y, m) {
  return m === 12 ? [y + 1, 1] : [y, m + 1];
}

export default function ArusKas() {
  const { role } = useContext(AuthContext);
  const fileRef = useRef(null);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Month filter
  const now = new Date();
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [searchKet, setSearchKet] = useState("");
  const [page, setPage] = useState(1);

  // Add/Edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  // Import
  const [importModal, setImportModal] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importFileCount, setImportFileCount] = useState(0);
  const [importYear, setImportYear] = useState(now.getFullYear());
  const [importUseSaldoAwal, setImportUseSaldoAwal] = useState(true);
  const [importSaldoAwal, setImportSaldoAwal] = useState(0);
  const [importCsvLastSaldo, setImportCsvLastSaldo] = useState(0);
  const [importLoading, setImportLoading] = useState(false);
  const [importDupKeys, setImportDupKeys] = useState(new Set());
  const [importSaldoWillSkip, setImportSaldoWillSkip] = useState(false);
  const [importPreChecking, setImportPreChecking] = useState(false);

  // Delete by month
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteYear, setDeleteYear] = useState(now.getFullYear());
  const [deleteMonth, setDeleteMonth] = useState(now.getMonth() + 1);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { show, Toast } = useToast();

  const load = async () => {
    setLoading(true);
    try { setItems(await getAllArusKas()); }
    catch { show("Gagal memuat data", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Reset page when filter changes
  useEffect(() => { setPage(1); }, [filterYear, filterMonth, searchKet]);

  // Pre-check duplicates whenever import modal opens or year changes
  useEffect(() => {
    if (!importModal || !importRows.length) {
      setImportDupKeys(new Set());
      setImportSaldoWillSkip(false);
      return;
    }
    let cancelled = false;
    setImportPreChecking(true);
    preCheckArusKasImport(importRows, importYear).then(({ dupKeys, saldoWillSkip }) => {
      if (cancelled) return;
      setImportDupKeys(dupKeys);
      setImportSaldoWillSkip(saldoWillSkip);
    }).finally(() => { if (!cancelled) setImportPreChecking(false); });
    return () => { cancelled = true; };
  }, [importModal, importRows, importYear]);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setModalOpen(true); };
  const openEdit = (item) => { setEditing(item); setForm({ ...item }); setModalOpen(true); };
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    try {
      if (editing?.id) await updateArusKas(editing.id, form);
      else await createArusKas(form);
      show("Tersimpan");
      setModalOpen(false);
      load();
    } catch { show("Gagal menyimpan", "error"); }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Hapus entri "${item.keterangan}"?`)) return;
    try { await removeArusKas(item.id); show("Terhapus"); load(); }
    catch { show("Gagal menghapus", "error"); }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = "";
    const promises = files.map(
      file => new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = evt => resolve(parseBcaCsv(evt.target.result));
        reader.readAsText(file, "UTF-8");
      })
    );
    Promise.all(promises).then(results => {
      const seen = new Set();
      const combined = [];
      results.flat().forEach(r => {
        const key = `${r.tanggalRaw}|${r.jenis}|${r.masuk || r.keluar}|${r.saldoSetelah}`;
        if (!seen.has(key)) { seen.add(key); combined.push(r); }
      });
      if (!combined.length) { show("Tidak ada data valid di file CSV", "error"); return; }
      const sorted = sortByDate(combined);
      const saldoAwal = calcSaldoAwal(combined);
      const lastSaldo = sorted[sorted.length - 1]?.saldoSetelah || 0;
      setImportRows(sorted);
      setImportFileCount(files.length);
      setImportSaldoAwal(saldoAwal);
      setImportCsvLastSaldo(lastSaldo);
      setImportUseSaldoAwal(true);
      setImportModal(true);
    });
  };

  const handleImport = async () => {
    setImportLoading(true);
    try {
      const rows = importRows.map(r => {
        const [dd, mm] = r.tanggalRaw.split("/");
        return {
          tanggal: `${importYear}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`,
          keterangan: r.keterangan, kategori: "operasional",
          masuk: r.masuk, keluar: r.keluar, referensi: "Import BCA",
          saldoSetelah: r.saldoSetelah,
        };
      });
      if (importUseSaldoAwal && importSaldoAwal > 0) {
        const [, firstMm] = importRows[0].tanggalRaw.split("/");
        rows.unshift({
          tanggal: `${importYear}-${firstMm.padStart(2, "0")}-01`,
          keterangan: "Saldo Awal", kategori: "saldo_awal",
          masuk: importSaldoAwal, keluar: 0, referensi: "Import BCA",
          saldoSetelah: 0,
        });
      }
      const result = await importArusKasBatch(rows);
      const parts = [];
      if (result.imported > 0) parts.push(`${result.imported} entri diimpor`);
      if (result.skipped > 0) parts.push(`${result.skipped} duplikat dilewati`);
      if (result.saldoAwalSkipped) parts.push("saldo awal dilewati (data sudah ada)");
      show(parts.length ? parts.join(", ") : "Tidak ada data baru untuk diimpor");
      closeImport();
      load();
    } catch { show("Gagal mengimpor data", "error"); }
    finally { setImportLoading(false); }
  };

  const handleDeleteMonth = async () => {
    setDeleteLoading(true);
    try {
      const count = await deleteArusKasByMonth(deleteYear, deleteMonth);
      show(`${count} transaksi ${BULAN[deleteMonth - 1]} ${deleteYear} berhasil dihapus`);
      setDeleteModal(false);
      load();
    } catch { show("Gagal menghapus data", "error"); }
    finally { setDeleteLoading(false); }
  };

  const closeImport = () => {
    setImportModal(false);
    setImportRows([]);
    setImportDupKeys(new Set());
    setImportSaldoWillSkip(false);
    setImportPreChecking(false);
  };

  // ── Derived data ──
  const monthPrefix = `${filterYear}-${String(filterMonth).padStart(2, "0")}`;
  const monthItems = items.filter(i => (i.tanggal || "").startsWith(monthPrefix));

  // Sort month items: saldo_awal first, then by date
  const sortedMonth = [...monthItems].sort((a, b) => {
    const d = (a.tanggal || "").localeCompare(b.tanggal || "");
    if (d !== 0) return d;
    if (a.kategori === "saldo_awal") return -1;
    if (b.kategori === "saldo_awal") return 1;
    return 0;
  });

  // Running balance for the month
  let running = 0;
  const rowsWithSaldo = sortedMonth.map(item => {
    running += (Number(item.masuk) || 0) - (Number(item.keluar) || 0);
    return { ...item, saldo: running };
  });

  const handleDownloadCsv = () => {
    if (!rowsWithSaldo.length) { show("Tidak ada data untuk diunduh", "error"); return; }
    const header = ["Tanggal", "Keterangan", "Kategori", "Masuk", "Keluar", "Saldo"];
    const lines = [
      header.join(","),
      ...rowsWithSaldo.map(r => [
        r.tanggal || "",
        `"${(r.keterangan || "").replace(/"/g, '""')}"`,
        r.kategori || "",
        Number(r.masuk) || 0,
        Number(r.keluar) || 0,
        Number(r.saldo) || 0,
      ].join(",")),
    ];
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ArusKas_${BULAN[filterMonth - 1]}_${filterYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Search filter (keeps saldo values)
  const displayRows = searchKet
    ? rowsWithSaldo.filter(i =>
        (i.keterangan || "").toLowerCase().includes(searchKet.toLowerCase()) ||
        (i.tanggal || "").includes(searchKet)
      )
    : rowsWithSaldo;

  // Summary for filtered rows (only shown when search is active)
  const filteredMasuk = searchKet
    ? displayRows.filter(i => i.kategori !== "saldo_awal").reduce((s, i) => s + (Number(i.masuk) || 0), 0)
    : 0;
  const filteredKeluar = searchKet
    ? displayRows.reduce((s, i) => s + (Number(i.keluar) || 0), 0)
    : 0;

  // Pagination
  const totalPages = Math.max(1, Math.ceil(displayRows.length / PAGE_SIZE));
  const pageRows = displayRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Summary cards (from all month items, excluding saldo_awal from masuk)
  const saldoAwalEntry = monthItems.find(i => i.kategori === "saldo_awal");
  const saldoAwalVal = Number(saldoAwalEntry?.masuk) || 0;
  const totalPemasukan = monthItems
    .filter(i => i.kategori !== "saldo_awal")
    .reduce((s, i) => s + (Number(i.masuk) || 0), 0);
  const totalPengeluaran = monthItems.reduce((s, i) => s + (Number(i.keluar) || 0), 0);
  const saldoAkhir = saldoAwalVal + totalPemasukan - totalPengeluaran;

  // Import gap detection
  const csvTotalCr = importRows.reduce((s, r) => s + r.masuk, 0);
  const csvTotalDb = importRows.reduce((s, r) => s + r.keluar, 0);
  const importCalculatedEnd = (importUseSaldoAwal ? importSaldoAwal : 0) + csvTotalCr - csvTotalDb;
  const importGap = Math.round((importCsvLastSaldo - importCalculatedEnd) * 100) / 100;

  const isSuperadmin = role === "superadmin";

  const goMonth = (dir) => {
    if (dir < 0) {
      const [y, m] = prevMonth(filterYear, filterMonth);
      setFilterYear(y); setFilterMonth(m);
    } else {
      const [y, m] = nextMonth(filterYear, filterMonth);
      setFilterYear(y); setFilterMonth(m);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
      <Toast />
      <input ref={fileRef} type="file" accept=".csv,text/csv" multiple className="hidden" onChange={handleFileSelect} />

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Arus Kas</h1>
          <p className="text-sm text-slate-500">Pantau aliran masuk dan keluar kas perusahaan</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={openAdd} className="shrink-0">
            <Plus className="w-4 h-4" /> Tambah
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()} className="shrink-0">
            <Upload className="w-4 h-4" /> Import CSV BCA
          </Button>
          <Button variant="secondary" onClick={handleDownloadCsv} className="shrink-0" disabled={!monthItems.length}>
            <Download className="w-4 h-4" /> Unduh CSV
          </Button>
          {isSuperadmin && (
            <Button variant="secondary" onClick={() => { setDeleteYear(filterYear); setDeleteMonth(filterMonth); setDeleteModal(true); }} className="shrink-0">
              <Trash2 className="w-4 h-4 text-red-500" /> Hapus Bulan
            </Button>
          )}
        </div>
      </div>

      {/* ── Month navigator ── */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-1 py-1 shadow-sm">
          <button onClick={() => goMonth(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-slate-800 min-w-[120px] text-center">
            {BULAN[filterMonth - 1]} {filterYear}
          </span>
          <button onClick={() => goMonth(1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {monthItems.length > 0 && (
          <span className="text-xs text-slate-400 font-medium">
            {monthItems.length} entri
          </span>
        )}
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-medium mb-1">Saldo Awal</p>
          <p className="text-lg font-bold text-slate-800">{formatRupiah(saldoAwalVal)}</p>
          {!saldoAwalEntry && monthItems.length > 0 && (
            <p className="text-xs text-amber-500 mt-1">Belum diset</p>
          )}
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-emerald-600 font-medium mb-1">Total Pemasukan</p>
          <p className="text-lg font-bold text-emerald-800">{formatRupiah(totalPemasukan)}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-red-600 font-medium mb-1">Total Pengeluaran</p>
          <p className="text-lg font-bold text-red-800">{formatRupiah(totalPengeluaran)}</p>
        </div>
        <div className={`border rounded-xl p-4 shadow-sm ${saldoAkhir >= 0 ? "bg-blue-50 border-blue-200" : "bg-orange-50 border-orange-200"}`}>
          <p className={`text-xs font-medium mb-1 ${saldoAkhir >= 0 ? "text-blue-600" : "text-orange-600"}`}>Saldo Akhir</p>
          <p className={`text-lg font-bold ${saldoAkhir >= 0 ? "text-blue-800" : "text-orange-800"}`}>{formatRupiah(saldoAkhir)}</p>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={searchKet}
            onChange={e => setSearchKet(e.target.value)}
            placeholder="Cari keterangan transaksi..."
            className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
          />
          {searchKet && (
            <button onClick={() => setSearchKet("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-1 py-1 shrink-0 self-start">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 text-slate-500 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-600 min-w-[80px] text-center font-medium">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 text-slate-500 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── Search summary (only when filtering) ── */}
      {searchKet && displayRows.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm">
          <span className="text-amber-700 font-medium shrink-0">
            {displayRows.length} transaksi cocok "{searchKet}"
          </span>
          <span className="text-slate-300 shrink-0">|</span>
          {filteredMasuk > 0 && (
            <span className="text-emerald-700 shrink-0">
              Masuk: <span className="font-bold">{formatRupiah(filteredMasuk)}</span>
            </span>
          )}
          {filteredMasuk > 0 && filteredKeluar > 0 && (
            <span className="text-slate-300 shrink-0">·</span>
          )}
          {filteredKeluar > 0 && (
            <span className="text-red-700 shrink-0">
              Keluar: <span className="font-bold">{formatRupiah(filteredKeluar)}</span>
            </span>
          )}
          {filteredMasuk > 0 && filteredKeluar > 0 && (
            <>
              <span className="text-slate-300 shrink-0">·</span>
              <span className={`shrink-0 font-semibold ${filteredMasuk - filteredKeluar >= 0 ? "text-blue-700" : "text-orange-700"}`}>
                Net: {formatRupiah(filteredMasuk - filteredKeluar)}
              </span>
            </>
          )}
        </div>
      )}

      {/* ── Table ── */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
          <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">Memuat data...</p>
        </div>
      ) : monthItems.length === 0 ? (
        <EmptyState
          title={`Tidak ada data ${BULAN[filterMonth - 1]} ${filterYear}`}
          description="Impor mutasi BCA atau tambahkan entri manual untuk bulan ini."
          action={
            <div className="flex gap-2 justify-center flex-wrap">
              <Button variant="secondary" onClick={() => fileRef.current?.click()}>
                <Upload className="w-4 h-4" /> Import CSV BCA
              </Button>
              <Button onClick={openAdd}><Plus className="w-4 h-4" /> Tambah</Button>
            </div>
          }
        />
      ) : displayRows.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-12 text-center">
          <p className="text-slate-400 text-sm">Tidak ada transaksi yang cocok dengan pencarian</p>
          <button onClick={() => setSearchKet("")} className="mt-2 text-amber-500 text-sm hover:underline">Hapus filter</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wide w-28">Tanggal</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wide">Keterangan</th>
                  <th className="px-4 py-3 text-right font-semibold text-emerald-600 text-xs uppercase tracking-wide w-36">Masuk</th>
                  <th className="px-4 py-3 text-right font-semibold text-red-600 text-xs uppercase tracking-wide w-36">Keluar</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600 text-xs uppercase tracking-wide w-36">Saldo</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600 text-xs uppercase tracking-wide w-20">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageRows.map(item => {
                  const isSaldoAwal = item.kategori === "saldo_awal";
                  const isMasuk = !isSaldoAwal && Number(item.masuk) > 0;
                  const isKeluar = !isSaldoAwal && Number(item.keluar) > 0;
                  return (
                    <tr
                      key={item.id}
                      className={
                        isSaldoAwal
                          ? "bg-slate-100 hover:bg-slate-150"
                          : isMasuk
                          ? "bg-emerald-50/50 hover:bg-emerald-50"
                          : "bg-red-50/30 hover:bg-red-50/60"
                      }
                    >
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                        {item.tanggal || "-"}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="flex items-center gap-2">
                          {isSaldoAwal && (
                            <span className="shrink-0 text-xs bg-slate-300 text-slate-700 font-medium px-1.5 py-0.5 rounded">
                              AWAL
                            </span>
                          )}
                          <span
                            className={`text-xs leading-relaxed line-clamp-2 ${isSaldoAwal ? "text-slate-500 italic" : "text-slate-700"}`}
                            title={item.keterangan}
                          >
                            {item.keterangan || "-"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {item.masuk ? (
                          <span className={`font-semibold ${isSaldoAwal ? "text-slate-500" : "text-emerald-700"}`}>
                            {formatRupiah(item.masuk)}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {item.keluar ? (
                          <span className="font-semibold text-red-700">{formatRupiah(item.keluar)}</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold whitespace-nowrap ${item.saldo >= 0 ? "text-blue-700" : "text-orange-700"}`}>
                        {formatRupiah(item.saldo)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEdit(item)}
                            title="Edit"
                            className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            title="Hapus"
                            className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer table */}
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-slate-500">
              Menampilkan <span className="font-semibold text-slate-700">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, displayRows.length)}</span> dari <span className="font-semibold text-slate-700">{displayRows.length}</span> entri
            </p>
            {totalPages > 1 && (
              <div className="flex gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-7 h-7 text-xs rounded-lg font-medium transition-colors ${
                      p === page
                        ? "bg-amber-500 text-white"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                {totalPages > 7 && <span className="text-xs text-slate-400 self-center px-1">···</span>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Add/Edit Modal ── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing?.id ? "Edit Entri Arus Kas" : "Tambah Entri Arus Kas"}
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tanggal">
              <Input type="date" value={form.tanggal} onChange={e => set("tanggal", e.target.value)} />
            </Field>
            <Field label="Kategori">
              <Select value={form.kategori} onChange={e => set("kategori", e.target.value)}>
                <option value="operasional">Operasional</option>
                <option value="investasi">Investasi</option>
                <option value="pendanaan">Pendanaan</option>
              </Select>
            </Field>
          </div>
          <Field label="Keterangan">
            <Input value={form.keterangan} onChange={e => set("keterangan", e.target.value)} placeholder="Deskripsi transaksi kas" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Kas Masuk (Rp)">
              <Input type="number" value={form.masuk} onChange={e => set("masuk", e.target.value)} placeholder="0" />
            </Field>
            <Field label="Kas Keluar (Rp)">
              <Input type="number" value={form.keluar} onChange={e => set("keluar", e.target.value)} placeholder="0" />
            </Field>
          </div>
          <Field label="Referensi">
            <Input value={form.referensi} onChange={e => set("referensi", e.target.value)} placeholder="No. bukti / referensi" />
          </Field>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button onClick={handleSave}>Simpan</Button>
          </div>
        </div>
      </Modal>

      {/* ── Import CSV BCA Modal ── */}
      <Modal open={importModal} onClose={closeImport} title="Import Mutasi BCA" size="lg">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <FileText className="w-5 h-5 text-blue-600 shrink-0" />
            <p className="text-sm text-blue-700">
              <strong>{importRows.length} transaksi</strong> dari <strong>{importFileCount} file</strong> — duplikat dihapus otomatis.
            </p>
          </div>

          <Field label="Tahun">
            <Select value={importYear} onChange={e => setImportYear(Number(e.target.value))}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </Select>
          </Field>

          {/* Saldo Awal */}
          <div className="border border-amber-200 rounded-xl p-3 bg-amber-50 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={importUseSaldoAwal}
                onChange={e => setImportUseSaldoAwal(e.target.checked)}
                className="w-4 h-4 accent-amber-500 shrink-0"
              />
              <span className="text-sm font-medium text-amber-800">Tambahkan Saldo Awal</span>
            </label>
            {importUseSaldoAwal && (
              <>
                <p className="text-xs text-amber-700">Dihitung otomatis dari baris pertama CSV. Edit jika tidak sesuai.</p>
                <input
                  type="number"
                  value={importSaldoAwal}
                  onChange={e => setImportSaldoAwal(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-amber-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <p className="text-xs text-amber-600 font-semibold">= {formatRupiah(importSaldoAwal)}</p>
              </>
            )}
          </div>

          {/* Gap detection */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
              <p className="text-slate-500 mb-0.5">Saldo akhir dari CSV</p>
              <p className="font-bold text-slate-800">{formatRupiah(importCsvLastSaldo)}</p>
            </div>
            <div className={`border rounded-xl p-2.5 ${Math.abs(importGap) < 1 ? "bg-emerald-50 border-emerald-200" : "bg-orange-50 border-orange-200"}`}>
              <p className={`mb-0.5 ${Math.abs(importGap) < 1 ? "text-emerald-600" : "text-orange-600"}`}>Saldo hasil import</p>
              <p className={`font-bold ${Math.abs(importGap) < 1 ? "text-emerald-800" : "text-orange-800"}`}>{formatRupiah(importCalculatedEnd)}</p>
            </div>
          </div>
          {Math.abs(importGap) >= 1 && (
            <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-300 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
              <div className="text-xs text-orange-800">
                <p className="font-semibold mb-0.5">Selisih {formatRupiah(Math.abs(importGap))} — ada periode yang belum diimpor</p>
                <p>Download CSV untuk periode yang hilang dan import setelah ini.</p>
              </div>
            </div>
          )}

          {/* Preview tabel */}
          <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl">
            {importPreChecking ? (
              <p className="text-xs text-slate-500 text-center py-4">Memeriksa duplikat…</p>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-slate-500 font-medium">Tanggal</th>
                    <th className="px-3 py-2 text-left text-slate-500 font-medium">Keterangan</th>
                    <th className="px-3 py-2 text-right text-emerald-600 font-medium">Masuk</th>
                    <th className="px-3 py-2 text-right text-red-600 font-medium">Keluar</th>
                    <th className="px-3 py-2 text-right text-slate-400 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {importUseSaldoAwal && importSaldoAwal > 0 && (() => {
                    const mm = importRows[0]?.tanggalRaw?.split("/")[1]?.padStart(2, "0") || "01";
                    return (
                      <tr className={importSaldoWillSkip ? "opacity-40 line-through" : "bg-slate-100"}>
                        <td className="px-3 py-2 text-slate-500 whitespace-nowrap italic">
                          {mm}/01/{importYear}
                        </td>
                        <td className="px-3 py-2 text-slate-500 italic">Saldo Awal</td>
                        <td className="px-3 py-2 text-right text-slate-600 whitespace-nowrap">{formatRupiah(importSaldoAwal)}</td>
                        <td className="px-3 py-2 text-right text-slate-300">—</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          {importSaldoWillSkip
                            ? <span className="text-orange-500 font-medium">dilewati</span>
                            : <span className="text-emerald-600 font-medium">baru</span>}
                        </td>
                      </tr>
                    );
                  })()}
                  {importRows.map((r, i) => {
                    const [dd, mm] = r.tanggalRaw.split("/");
                    const tanggal = `${importYear}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
                    const rowKey = `${tanggal}|${r.masuk}|${r.keluar}|${r.keterangan}`;
                    const isDup = importDupKeys.has(rowKey);
                    return (
                      <tr key={i} className={isDup ? "opacity-40" : r.jenis === "CR" ? "bg-emerald-50/40" : "bg-red-50/30"}>
                        <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{r.tanggalRaw}/{importYear}</td>
                        <td className={`px-3 py-2 max-w-xs truncate ${isDup ? "text-slate-400 line-through" : "text-slate-700"}`} title={r.keterangan}>{r.keterangan || "-"}</td>
                        <td className="px-3 py-2 text-right text-emerald-700 whitespace-nowrap font-medium">
                          {r.masuk ? formatRupiah(r.masuk) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-2 text-right text-red-700 whitespace-nowrap font-medium">
                          {r.keluar ? formatRupiah(r.keluar) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          {isDup
                            ? <span className="text-orange-500 font-medium">duplikat</span>
                            : <span className="text-emerald-600 font-medium">baru</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {!importPreChecking && importDupKeys.size > 0 && (
            <p className="text-xs text-orange-600 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {importDupKeys.size} transaksi sudah ada di sistem dan akan dilewati saat import.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="secondary" onClick={closeImport}>Batal</Button>
            <Button onClick={handleImport} disabled={importLoading || importPreChecking}>
              {importLoading
                ? "Mengimpor..."
                : (() => {
                    const newCount = importRows.length - importDupKeys.size
                      + (importUseSaldoAwal && importSaldoAwal > 0 && !importSaldoWillSkip ? 1 : 0);
                    return `Import ${newCount} Entri Baru`;
                  })()}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Delete by month modal ── */}
      {isSuperadmin && (
        <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title="Hapus Transaksi Per Bulan" size="sm">
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">
                Semua transaksi arus kas pada bulan yang dipilih akan <strong>dihapus permanen</strong> termasuk entri Saldo Awal.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Bulan">
                <Select value={deleteMonth} onChange={e => setDeleteMonth(Number(e.target.value))}>
                  {BULAN.map((b, i) => <option key={i + 1} value={i + 1}>{b}</option>)}
                </Select>
              </Field>
              <Field label="Tahun">
                <Select value={deleteYear} onChange={e => setDeleteYear(Number(e.target.value))}>
                  {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </Select>
              </Field>
            </div>
            <p className="text-sm text-slate-600 text-center">
              Hapus semua transaksi bulan{" "}
              <strong className="text-red-700">{BULAN[deleteMonth - 1]} {deleteYear}</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setDeleteModal(false)}>Batal</Button>
              <button
                onClick={handleDeleteMonth}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {deleteLoading ? "Menghapus..." : "Hapus Permanen"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
