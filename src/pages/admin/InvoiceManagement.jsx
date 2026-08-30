import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    Plus, FileText, Edit2, Trash2, Eye, Search, X,
    TrendingDown, CheckCircle, AlertCircle, Clock, AlertTriangle, ArrowUpDown, Download,
} from "lucide-react";
import {
    AdminPageHeader, Button, EmptyState, useToast, Modal,
} from "../../components/admin/AdminUI";
import { getAllDokumen, deleteDokumen, formatRupiah, hitungTotal } from "../../services/rabService";
import { PermissionGate } from "../../components/PermissionGate";

const STATUS_COLOR = {
    draft:   "bg-amber-100 text-amber-800 border border-amber-200",
    final:   "bg-emerald-100 text-emerald-800 border border-emerald-200",
    lunas:   "bg-emerald-100 text-emerald-800 border border-emerald-200",
    sent:    "bg-blue-100 text-blue-800 border border-blue-200",
    overdue: "bg-red-100 text-red-800 border border-red-200",
};

const STATUS_LABEL = {
    draft:   "Draft",
    final:   "Lunas",
    lunas:   "Lunas",
    sent:    "Terkirim",
    overdue: "Terlambat",
};

const LUNAS = new Set(["final", "lunas"]);

function isOverdue(jatuhTempo, status) {
    if (!jatuhTempo) return false;
    if (LUNAS.has(status)) return false;
    return new Date(jatuhTempo + "T00:00:00") < new Date();
}

function fmtDate(d) {
    if (!d) return null;
    try { return new Date(d + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }); }
    catch { return d; }
}

function SummaryCard({ icon: Icon, label, value, subtext, colorCls, onClick, active }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`bg-white rounded-xl border p-4 flex items-start gap-3 shadow-sm text-left w-full transition-all duration-150 ${colorCls.border} ${
                onClick ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5" : "cursor-default"
            } ${active ? "ring-2 ring-offset-1 " + colorCls.ring : ""}`}
        >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorCls.bg}`}>
                <Icon className={`w-5 h-5 ${colorCls.icon}`} />
            </div>
            <div className="min-w-0">
                <p className="text-xs text-slate-500 font-medium">{label}</p>
                <p className={`text-base font-bold mt-0.5 ${colorCls.text} truncate`}>{value}</p>
                {subtext && <p className="text-xs text-slate-400 mt-0.5 truncate">{subtext}</p>}
            </div>
        </button>
    );
}

export default function InvoiceManagement() {
    const [items,        setItems]        = useState([]);
    const [loading,      setLoading]      = useState(true);
    const [filter,       setFilter]       = useState("all");
    const [search,       setSearch]       = useState("");
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting,     setDeleting]     = useState(false);
    const [sort,         setSort]         = useState("terbaru");
    const navigate = useNavigate();
    const { show, Toast } = useToast();

    const load = async () => {
        setLoading(true);
        try {
            setItems(await getAllDokumen({ type: "invoice" }));
        } catch (err) {
            console.error(err);
            show("Gagal memuat data", "error");
        } finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    const exportCSV = () => {
        const rows = [
            ["Nomor", "Perihal", "Pelanggan", "Tanggal", "Jatuh Tempo", "Status", "Total (Rp)"],
            ...visible.map(i => {
                const tot = hitungTotal(i.items, i.ppnAktif !== false).grandTotal || 0;
                return [
                    i.nomor || "",
                    i.perihal || "",
                    i.tagihan?.perusahaan || i.tagihan?.nama || "",
                    i.tanggal || "",
                    i.jatuhTempo || "",
                    STATUS_LABEL[i.status] || i.status || "",
                    tot,
                ];
            }),
        ];
        const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `invoice-${new Date().toISOString().slice(0,10)}.csv`; a.click();
        URL.revokeObjectURL(url);
        show("CSV berhasil diunduh");
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await deleteDokumen(deleteTarget.id);
            show("Invoice berhasil dihapus");
            setDeleteTarget(null);
            load();
        } catch (err) {
            console.error(err);
            show("Gagal menghapus", "error");
        } finally { setDeleting(false); }
    };

    const stats = useMemo(() => {
        const total      = items.reduce((s, i) => s + (hitungTotal(i.items, i.ppnAktif !== false).grandTotal || 0), 0);
        const lunasItems = items.filter(i => LUNAS.has(i.status));
        const totalLunas = lunasItems.reduce((s, i) => s + (hitungTotal(i.items, i.ppnAktif !== false).grandTotal || 0), 0);
        const overdueCount = items.filter(i => isOverdue(i.jatuhTempo, i.status)).length;
        return { total, totalLunas, piutang: total - totalLunas, overdueCount, count: items.length, lunasCount: lunasItems.length };
    }, [items]);

    const visible = useMemo(() => {
        const filtered = items.filter(i => {
            if (filter === "overdue") {
                if (!isOverdue(i.jatuhTempo, i.status)) return false;
            } else if (filter === "lunas") {
                if (!LUNAS.has(i.status)) return false;
            } else if (filter !== "all") {
                if (i.status !== filter) return false;
            }
            if (search) {
                const hay = [i.nomor, i.perihal, i.tagihan?.perusahaan, i.tagihan?.nama].filter(Boolean).join(" ").toLowerCase();
                if (!hay.includes(search.toLowerCase())) return false;
            }
            return true;
        });
        return [...filtered].sort((a, b) => {
            if (sort === "terbaru")  return (b.tanggal || b.createdAt || "") > (a.tanggal || a.createdAt || "") ? 1 : -1;
            if (sort === "terlama")  return (a.tanggal || a.createdAt || "") > (b.tanggal || b.createdAt || "") ? 1 : -1;
            if (sort === "tertinggi") return (hitungTotal(b.items, b.ppnAktif !== false).grandTotal || 0) - (hitungTotal(a.items, a.ppnAktif !== false).grandTotal || 0);
            if (sort === "terendah")  return (hitungTotal(a.items, a.ppnAktif !== false).grandTotal || 0) - (hitungTotal(b.items, b.ppnAktif !== false).grandTotal || 0);
            return 0;
        });
    }, [items, filter, search, sort]);

    const FILTERS = [
        { key: "all",     label: "Semua" },
        { key: "draft",   label: "Draft" },
        { key: "sent",    label: "Terkirim" },
        { key: "lunas",   label: "Lunas" },
        { key: "overdue", label: "Terlambat" },
    ];

    return (
        <div className="p-3 sm:p-6 lg:p-8 max-w-6xl mx-auto">
            <Toast />

            <AdminPageHeader
                title="Invoice"
                description="Kelola invoice tagihan. Setiap invoice terikat ke satu instansi dan satu penanggung jawab."
                actions={
                    <div className="flex gap-2">
                        {items.length > 0 && (
                            <Button variant="outline" onClick={exportCSV} title="Unduh daftar sebagai CSV">
                                <Download className="w-4 h-4" /> Export CSV
                            </Button>
                        )}
                        <PermissionGate module="invoice" require="write_approval">
                            <Button onClick={() => navigate("/Dashboard/invoice/baru")}>
                                <Plus className="w-4 h-4" /> Buat Invoice
                            </Button>
                        </PermissionGate>
                    </div>
                }
            />

            {/* Summary cards */}
            {!loading && items.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    <SummaryCard
                        icon={FileText} label="Total Invoice"
                        value={stats.count} subtext={formatRupiah(stats.total)}
                        onClick={() => setFilter("all")} active={filter === "all"}
                        colorCls={{ border:"border-slate-200", bg:"bg-slate-100", icon:"text-slate-600", text:"text-slate-800", ring:"ring-slate-400" }}
                    />
                    <SummaryCard
                        icon={CheckCircle} label="Sudah Lunas"
                        value={stats.lunasCount} subtext={formatRupiah(stats.totalLunas)}
                        onClick={() => setFilter("lunas")} active={filter === "lunas"}
                        colorCls={{ border:"border-emerald-200", bg:"bg-emerald-50", icon:"text-emerald-600", text:"text-emerald-700", ring:"ring-emerald-400" }}
                    />
                    <SummaryCard
                        icon={TrendingDown} label="Sisa Piutang"
                        value={formatRupiah(stats.piutang)}
                        colorCls={{ border:"border-amber-200", bg:"bg-amber-50", icon:"text-amber-600", text:"text-amber-700", ring:"" }}
                    />
                    <SummaryCard
                        icon={AlertCircle} label="Terlambat"
                        value={stats.overdueCount}
                        subtext={stats.overdueCount > 0 ? "Klik untuk lihat detail" : "Semua tepat waktu"}
                        onClick={stats.overdueCount > 0 ? () => setFilter("overdue") : undefined}
                        active={filter === "overdue"}
                        colorCls={stats.overdueCount > 0
                            ? { border:"border-red-200", bg:"bg-red-50", icon:"text-red-600", text:"text-red-700", ring:"ring-red-400" }
                            : { border:"border-slate-200", bg:"bg-slate-100", icon:"text-slate-400", text:"text-slate-600", ring:"" }
                        }
                    />
                </div>
            )}

            {/* Search + sort + filter */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Cari nomor, perihal, atau nama pelanggan..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-9 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-white"
                    />
                    {search && (
                        <button onClick={() => setSearch("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0 border border-slate-200 rounded-lg bg-white px-2.5 py-1.5">
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <select
                        value={sort}
                        onChange={e => setSort(e.target.value)}
                        className="text-sm text-slate-600 bg-transparent focus:outline-none cursor-pointer"
                    >
                        <option value="terbaru">Terbaru</option>
                        <option value="terlama">Terlama</option>
                        <option value="tertinggi">Nilai Tertinggi</option>
                        <option value="terendah">Nilai Terendah</option>
                    </select>
                </div>
                <div className="flex gap-2 shrink-0 overflow-x-auto pb-0.5 scrollbar-none">
                    {FILTERS.map(f => {
                        const cnt = f.key === "all"     ? items.length
                            : f.key === "overdue" ? stats.overdueCount
                            : f.key === "lunas"   ? stats.lunasCount
                            : items.filter(i => i.status === f.key).length;
                        return (
                            <button key={f.key} onClick={() => setFilter(f.key)}
                                className={`px-3 py-2 text-sm rounded-lg border transition font-medium whitespace-nowrap ${filter === f.key
                                    ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                                    : "bg-white text-slate-600 border-slate-200 hover:border-amber-400"
                                }`}
                            >
                                {f.label}
                                <span className="ml-1.5 text-xs opacity-70">{cnt}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <p className="text-xs text-slate-500 mb-3">
                {search
                    ? <>{visible.length} hasil untuk "<strong>{search}</strong>"</>
                    : <>Menampilkan <strong>{visible.length}</strong> dari {items.length} invoice</>
                }
            </p>

            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : !visible.length ? (
                <EmptyState
                    title={search ? "Tidak ditemukan" : "Belum ada Invoice"}
                    description={search
                        ? `Tidak ada invoice yang cocok dengan "${search}".`
                        : "Buat invoice pertama untuk mulai mencatat tagihan."}
                    action={!search && (
                        <PermissionGate module="invoice" require="write_approval">
                            <Button onClick={() => navigate("/Dashboard/invoice/baru")}>
                                <Plus className="w-4 h-4" /> Buat Invoice
                            </Button>
                        </PermissionGate>
                    )}
                />
            ) : (
                <div className="space-y-3">
                    {visible.map(item => (
                        <InvoiceRow
                            key={item.id}
                            item={item}
                            onEdit={() => navigate(`/Dashboard/invoice/${item.id}`)}
                            onPreview={() => navigate(`/invoice/${item.id}`)}
                            onDelete={() => setDeleteTarget(item)}
                        />
                    ))}
                </div>
            )}

            {/* Delete confirmation modal */}
            {deleteTarget && (
                <Modal title="Hapus Invoice" onClose={() => !deleting && setDeleteTarget(null)}>
                    <div className="p-4 space-y-4">
                        <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-red-800">Konfirmasi Penghapusan</p>
                                <p className="text-sm text-red-700 mt-1">
                                    Invoice <strong>{deleteTarget.nomor || "(tanpa nomor)"}</strong>
                                    {deleteTarget.perihal ? ` — ${deleteTarget.perihal}` : ""} akan dihapus permanen dan tidak dapat dikembalikan.
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                                Batal
                            </Button>
                            <Button onClick={confirmDelete} disabled={deleting}
                                className="!bg-red-600 hover:!bg-red-700 !border-red-600 !text-white">
                                {deleting ? "Menghapus..." : "Ya, Hapus"}
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

function InvoiceRow({ item, onEdit, onPreview, onDelete }) {
    const totals  = hitungTotal(item.items, item.ppnAktif !== false);
    const tagihan = item.tagihan || {};
    const overdue = isOverdue(item.jatuhTempo, item.status);
    const statusKey = overdue ? "overdue" : (item.status || "draft");

    return (
        <div className={`bg-white border rounded-xl p-4 hover:shadow-md transition-all duration-200 ${
            overdue ? "border-red-200 hover:border-red-300" : "border-slate-200 hover:border-amber-300"
        }`}>
            <div className="flex items-start gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    overdue ? "bg-red-100" : "bg-blue-50"
                }`}>
                    <FileText className={`w-5 h-5 ${overdue ? "text-red-600" : "text-blue-600"}`} />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {item.nomor || "(belum ada nomor)"}
                        </span>
                        <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-semibold ${STATUS_COLOR[statusKey] || STATUS_COLOR.draft}`}>
                            {STATUS_LABEL[statusKey] || item.status}
                        </span>
                        {overdue && (
                            <span className="flex items-center gap-0.5 text-[10px] text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                                <Clock className="w-3 h-3" /> Terlambat
                            </span>
                        )}
                    </div>

                    <p className="font-semibold text-slate-900 text-sm truncate">
                        {item.perihal || "(tanpa perihal)"}
                    </p>

                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 flex-wrap">
                        <span className="truncate">{tagihan.perusahaan || tagihan.nama || "—"}</span>
                        {item.items?.length > 0 && <span>· {item.items.length} item</span>}
                        {item.tanggal    && <span>· {fmtDate(item.tanggal)}</span>}
                        {item.jatuhTempo && (
                            <span className={overdue ? "text-red-600 font-medium" : ""}>
                                · Tempo: {fmtDate(item.jatuhTempo)}
                            </span>
                        )}
                    </div>

                    <p className={`text-sm font-bold mt-1.5 ${overdue ? "text-red-700" : "text-amber-700"}`}>
                        {formatRupiah(totals.grandTotal)}
                    </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    <Button variant="outline" onClick={onPreview}
                        className="!px-2.5 !py-1.5 text-amber-700 border-amber-200 hover:bg-amber-50"
                        title="Preview Invoice" aria-label="Preview Invoice">
                        <Eye className="w-4 h-4" aria-hidden="true" />
                    </Button>
                    <PermissionGate module="invoice" require="write_approval">
                        <Button variant="outline" onClick={onEdit}
                            className="!px-2.5 !py-1.5 hover:border-blue-300 hover:text-blue-700"
                            title="Edit Invoice" aria-label="Edit Invoice">
                            <Edit2 className="w-4 h-4" aria-hidden="true" />
                        </Button>
                    </PermissionGate>
                    <PermissionGate module="invoice" require="write">
                        <Button variant="ghost" onClick={onDelete}
                            className="!px-2 !py-1.5 hover:!bg-red-50 hover:!text-red-600"
                            title="Hapus Invoice" aria-label="Hapus Invoice">
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </Button>
                    </PermissionGate>
                </div>
            </div>
        </div>
    );
}
