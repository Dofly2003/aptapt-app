import { useEffect, useState, useCallback, useContext } from "react";
import { Plus, Pencil, Trash2, Search, Tag, X, Check, Sparkles, TrendingUp, TrendingDown, Minus, History } from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import {
  getAllMasterHarga,
  createMasterHarga,
  updateMasterHarga,
  deleteMasterHarga,
  getPriceTrend,
} from "../../services/masterHargaService";
import { SATUAN_OPTIONS, formatRupiah, MARKUP_PERCENT, applyMarkup } from "../../services/rabService";
import { migrateMasterHargaFromRab, estimateMigrationImpact } from "../../utils/migrateMasterHargaFromRab";

const EMPTY_FORM = { nama: "", merek: "", harga: "", satuan: "pcs" };

export default function MasterHarga() {
  const { user } = useContext(AuthContext);

  const [list, setList]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [modal, setModal]     = useState(null); // null | { mode: "add"|"edit", data }
  const [form, setForm]       = useState(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);
  const [delId, setDelId]     = useState(null);
  const [toast, setToast]     = useState({ msg: "", on: false, err: false });
  const [migrateModal, setMigrateModal] = useState(null); // null | { impact, running, progress }
  const [historyItem, setHistoryItem]   = useState(null); // item yang sedang dilihat history-nya

  const showToast = useCallback((msg, err = false) => {
    setToast({ msg, on: true, err });
    setTimeout(() => setToast(t => ({ ...t, on: false })), 2600);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try { setList(await getAllMasterHarga()); }
    catch { showToast("Gagal memuat data", true); }
    finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm(EMPTY_FORM); setModal({ mode: "add" }); };
  const openEdit = (item) => {
    setForm({ nama: item.nama, merek: item.merek || "", harga: String(item.harga || ""), satuan: item.satuan || "pcs" });
    setModal({ mode: "edit", id: item.id });
  };

  const handleSave = async () => {
    if (!form.nama.trim()) { showToast("Nama barang wajib diisi", true); return; }
    const harga = Number(form.harga);
    if (isNaN(harga) || harga < 0) { showToast("Harga tidak valid", true); return; }

    setSaving(true);
    try {
      const payload = { nama: form.nama.trim(), merek: form.merek.trim(), harga, satuan: form.satuan };
      if (modal.mode === "add") {
        await createMasterHarga(payload, user.uid);
        showToast("Harga ditambahkan");
      } else {
        await updateMasterHarga(modal.id, payload);
        showToast("Harga diperbarui");
      }
      setModal(null);
      load();
    } catch { showToast("Gagal menyimpan", true); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await deleteMasterHarga(id);
      setDelId(null);
      showToast("Dihapus");
      setList(l => l.filter(x => x.id !== id));
    } catch { showToast("Gagal menghapus", true); }
  };

  const filtered = list.filter(item => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [item.nama, item.merek, item.satuan].filter(Boolean).join(" ").toLowerCase().includes(q);
  });

  const inp = "w-full h-10 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 bg-white text-slate-900 placeholder-slate-400";

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Tag size={20} className="text-amber-500" /> Master Harga
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Referensi harga otomatis dari RAB. Markup <span className="font-semibold text-amber-600">+{MARKUP_PERCENT}%</span> saat dipakai di RAB baru.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              try {
                setMigrateModal({ impact: null, running: false, progress: null });
                const impact = await estimateMigrationImpact();
                setMigrateModal({ impact, running: false, progress: null });
              } catch {
                setMigrateModal(null);
                showToast("Gagal menghitung impact migrasi", true);
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors"
          >
            <Sparkles size={15} /> Belajar dari RAB Lama
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors"
            style={{ background: "#003087" }}
          >
            <Plus size={16} /> Tambah Harga
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          className={`${inp} pl-9`}
          placeholder="Cari nama, merek, atau satuan…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Memuat data…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            {search ? "Tidak ada hasil pencarian." : "Belum ada data harga. Klik \"Tambah Harga\" untuk mulai."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">#</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Nama Barang</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide hidden md:table-cell">Trend</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Harga Terakhir</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide hidden md:table-cell">Untuk RAB (+{MARKUP_PERCENT}%)</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide hidden sm:table-cell">Dipakai</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, idx) => {
                const trend = getPriceTrend(item.history || []);
                const marked = applyMarkup(item.harga);
                return (
                  <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-400 text-xs">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{item.nama}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {item.merek && <span>{item.merek} · </span>}
                        <span className="inline-block bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium text-[10px]">
                          {item.satuan}
                        </span>
                      </p>
                    </td>
                    <td className="px-4 py-3 text-center hidden md:table-cell">
                      <TrendCell trend={trend} />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatRupiah(item.harga)}</td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      <span className="font-bold text-amber-700">{formatRupiah(marked)}</span>
                    </td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      {item.usageCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-600 font-medium">
                          <History size={11} className="text-slate-400" />
                          {item.usageCount}×
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {item.history?.length > 0 && (
                          <button onClick={() => setHistoryItem(item)}
                            title="Lihat riwayat harga"
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                            <History size={14} />
                          </button>
                        )}
                        <button onClick={() => openEdit(item)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setDelId(item.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-slate-400 mt-3 text-right">{filtered.length} dari {list.length} item</p>

      {/* Add / Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <p className="font-semibold text-slate-900">
                {modal.mode === "add" ? "Tambah Harga Baru" : "Edit Harga"}
              </p>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nama Barang / Jasa <span className="text-red-500">*</span>
                </label>
                <input className={inp} placeholder="Contoh: Kabel NYY 4×4mm" autoFocus
                  value={form.nama} onChange={e => setForm(f => ({ ...f, nama: e.target.value }))} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Merek / Type</label>
                <input className={inp} placeholder="Contoh: Supreme, Eterna, dll."
                  value={form.merek} onChange={e => setForm(f => ({ ...f, merek: e.target.value }))} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Harga Satuan (Rp)</label>
                  <input type="number" min="0" step="1" className={inp} placeholder="0"
                    value={form.harga} onChange={e => setForm(f => ({ ...f, harga: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Satuan</label>
                  <select className={inp}
                    value={form.satuan} onChange={e => setForm(f => ({ ...f, satuan: e.target.value }))}>
                    {SATUAN_OPTIONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {form.harga && !isNaN(Number(form.harga)) && (
                <p className="text-xs text-slate-500 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  Preview: <span className="font-semibold text-amber-700">{formatRupiah(Number(form.harga))}</span> / {form.satuan}
                </p>
              )}
            </div>

            <div className="flex gap-3 px-5 py-4 border-t border-slate-100">
              <button onClick={() => setModal(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                Batal
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: "#003087" }}>
                {saving ? "Menyimpan…" : <><Check size={15} /> Simpan</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {delId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setDelId(null)}>
          <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl p-6 text-center"
            onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
              <Trash2 size={20} className="text-red-600" />
            </div>
            <p className="font-semibold text-slate-900 mb-1">Hapus harga ini?</p>
            <p className="text-sm text-slate-400 mb-5">Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex gap-3">
              <button onClick={() => setDelId(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                Batal
              </button>
              <button onClick={() => handleDelete(delId)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-colors">
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl text-sm font-medium text-white shadow-lg transition-all duration-300 pointer-events-none z-50 whitespace-nowrap ${
        toast.on ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      }`} style={{ background: toast.err ? "#C42B1C" : "#1C1C2E" }}>
        {toast.msg}
      </div>

      {/* Migration Modal */}
      {migrateModal && (
        <MigrateModal
          state={migrateModal}
          onClose={() => setMigrateModal(null)}
          onRun={async () => {
            setMigrateModal(m => ({ ...m, running: true, progress: null }));
            try {
              const totals = await migrateMasterHargaFromRab({
                userId: user?.uid,
                onProgress: (p) => setMigrateModal(m => ({ ...m, progress: p })),
              });
              setMigrateModal(m => ({ ...m, running: false, result: totals }));
              showToast(`Berhasil belajar dari ${totals.rabProcessed} RAB (+${totals.itemsCreated} item baru)`);
              load();
            } catch (e) {
              showToast("Migrasi gagal: " + e.message, true);
              setMigrateModal(m => ({ ...m, running: false }));
            }
          }}
        />
      )}

      {/* History Modal */}
      {historyItem && (
        <HistoryModal item={historyItem} onClose={() => setHistoryItem(null)} />
      )}
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────── */
function TrendCell({ trend }) {
  if (trend.direction === "stable") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
        <Minus size={12} /> stabil
      </span>
    );
  }
  if (trend.direction === "up") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
        <TrendingUp size={12} /> +{trend.percent}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
      <TrendingDown size={12} /> {trend.percent}%
    </span>
  );
}

/* ─── Migration Modal ──────────────────────────────────── */
function MigrateModal({ state, onClose, onRun }) {
  const { impact, running, progress, result } = state;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={running ? undefined : onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <p className="font-bold text-slate-900 flex items-center gap-2">
            <Sparkles size={16} className="text-amber-500" /> Belajar dari RAB Lama
          </p>
          {!running && (
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
              <X size={18} />
            </button>
          )}
        </div>

        <div className="px-5 py-4 text-sm">
          {!impact && (
            <div className="py-8 text-center text-slate-500">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin mx-auto mb-3" />
              Menghitung…
            </div>
          )}

          {impact && !running && !result && (
            <>
              <p className="text-slate-600 mb-4">
                Sistem akan membaca semua RAB tersimpan dan meng-agregasi item + harga historisnya ke master harga.
                Setiap kali dijalankan, data <strong>ditambah/diupdate</strong>, tidak diduplikasi.
              </p>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <StatBox label="RAB Tersimpan" value={impact.rabCount} />
                <StatBox label="Total Item" value={impact.totalItems} />
                <StatBox label="Item Unik" value={impact.uniqueItems} />
                <StatBox label="Item Baru" value={impact.newItems} highlight />
              </div>

              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                <strong>Estimasi:</strong> ~{Math.max(1, Math.round(impact.rabCount * 0.5))} detik.
                Item yang sudah ada di master harga akan diupdate dengan harga terkini + history entry.
              </p>
            </>
          )}

          {running && (
            <div className="py-6">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-center text-slate-600 font-medium">
                Memproses {progress?.current || 0} / {progress?.total || impact?.rabCount || 0}
              </p>
              {progress?.rabNomor && (
                <p className="text-center text-xs text-slate-400 mt-1 truncate">RAB {progress.rabNomor}</p>
              )}
              {progress?.stats && (
                <div className="mt-4 flex justify-center gap-3 text-xs text-slate-500">
                  <span>+{progress.stats.itemsCreated} baru</span>
                  <span>·</span>
                  <span>{progress.stats.itemsUpdated} update</span>
                </div>
              )}
            </div>
          )}

          {result && (
            <div className="py-2">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-100 flex items-center justify-center">
                <Check size={22} className="text-emerald-600" />
              </div>
              <p className="text-center font-semibold text-slate-900 mb-3">Selesai!</p>
              <div className="grid grid-cols-3 gap-2">
                <StatBox label="RAB" value={result.rabProcessed} />
                <StatBox label="Item Baru" value={result.itemsCreated} highlight />
                <StatBox label="Diupdate" value={result.itemsUpdated} />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-slate-100">
          <button onClick={onClose} disabled={running}
            className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">
            {result ? "Tutup" : "Batal"}
          </button>
          {impact && !result && (
            <button onClick={onRun} disabled={running}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 transition-colors disabled:opacity-50">
              {running ? "Memproses…" : "Mulai Belajar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, highlight = false }) {
  return (
    <div className={`rounded-xl px-3 py-2 text-center ${highlight ? "bg-amber-50 border border-amber-200" : "bg-slate-50 border border-slate-100"}`}>
      <div className={`text-lg font-bold ${highlight ? "text-amber-700" : "text-slate-800"}`}>{value}</div>
      <div className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">{label}</div>
    </div>
  );
}

/* ─── History Modal ───────────────────────────────────── */
function HistoryModal({ item, onClose }) {
  const history = item.history || [];
  const trend = getPriceTrend(history);
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Riwayat Harga</p>
            <p className="font-bold text-slate-900 truncate">{item.nama}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 ml-3">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-xs text-slate-500">Harga Terakhir</div>
              <div className="text-sm font-bold text-slate-800">{formatRupiah(item.harga)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Rata-rata</div>
              <div className="text-sm font-bold text-slate-800">{formatRupiah(item.avgPrice || item.harga)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Min - Max</div>
              <div className="text-[10px] font-medium text-slate-700">
                {formatRupiah(item.minPrice || item.harga)}<br/>{formatRupiah(item.maxPrice || item.harga)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Trend</div>
              <div className="mt-0.5"><TrendCell trend={trend} /></div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {history.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-8">Belum ada riwayat.</p>
          ) : (
            <ul className="space-y-1.5">
              {history.map((h, i) => {
                const date = h.date?.toDate ? h.date.toDate() : new Date(h.date);
                const prev = history[i + 1]?.price;
                const diff = prev ? ((h.price - prev) / prev) * 100 : 0;
                return (
                  <li key={i} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-700">
                        {date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">RAB {h.rabNomor || "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-800">{formatRupiah(h.price)}</p>
                      {prev && (
                        <p className={`text-[10px] font-semibold ${diff > 0 ? "text-red-600" : diff < 0 ? "text-emerald-600" : "text-slate-400"}`}>
                          {diff > 0 ? "+" : ""}{diff.toFixed(1)}%
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 bg-amber-50">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-600">Untuk RAB baru (markup +{MARKUP_PERCENT}%):</span>
            <span className="text-sm font-bold text-amber-700">{formatRupiah(applyMarkup(item.harga))}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
