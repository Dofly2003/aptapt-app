import { useEffect, useState } from "react";
import {
  Plus, Edit2, Trash2, Check, X, ChevronLeft, ChevronRight, Calendar as CalIcon,
} from "lucide-react";
import {
  AdminPageHeader, Button, Field, Input, TextArea, Select, EmptyState, useToast,
} from "../../components/admin/AdminUI";
import {
  getAllProyek, createProyek, updateProyek, removeProyek, formatRupiah,
} from "../../services/proyekService";

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY = {
  kodeProyek: "", namaProyek: "", klien: "", manajerProyek: "",
  tanggalMulai: "", tanggalSelesai: "", anggaran: "", realisasi: "",
  progress: "0", status: "perencanaan", prioritas: "normal", deskripsi: "",
};

const PALETTE = [
  { bar: "bg-blue-100 text-blue-700",   dot: "bg-blue-500"   },
  { bar: "bg-violet-100 text-violet-700", dot: "bg-violet-500" },
  { bar: "bg-amber-100 text-amber-700",  dot: "bg-amber-500"  },
  { bar: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  { bar: "bg-rose-100 text-rose-700",   dot: "bg-rose-500"   },
  { bar: "bg-teal-100 text-teal-700",   dot: "bg-teal-500"   },
  { bar: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
  { bar: "bg-pink-100 text-pink-700",   dot: "bg-pink-500"   },
];

const MONTH_NAMES = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember",
];
const DAY_NAMES = ["Sn","Sl","Rb","Km","Jm","Sb","Mg"];

const STATUS_LABEL = {
  perencanaan: "Perencanaan", berjalan: "Berjalan",
  ditangguhkan: "Ditangguhkan", selesai: "Selesai", dibatalkan: "Dibatalkan",
};
const STATUS_COLORS = {
  perencanaan: "bg-slate-100 text-slate-700", berjalan: "bg-blue-100 text-blue-700",
  ditangguhkan: "bg-amber-100 text-amber-700", selesai: "bg-emerald-100 text-emerald-700",
  dibatalkan: "bg-red-100 text-red-700",
};

const WIZARD_STEPS = ["Info Dasar", "Jadwal & Tim", "Keuangan"];

// ─── Small helpers ─────────────────────────────────────────────────────────────

function fmt(d) {
  if (!d) return "?";
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function ProgressBar({ value, colorDot }) {
  const pct = Math.min(100, Math.max(0, Number(value) || 0));
  const color = colorDot || (pct >= 100 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-400" : "bg-blue-500");
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-7 text-right">{pct}%</span>
    </div>
  );
}

// ─── Wizard (step-by-step form) ────────────────────────────────────────────────

function StepIndicator({ step }) {
  return (
    <div className="flex items-center mb-6">
      {WIZARD_STEPS.map((label, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
              step > i+1 ? "bg-emerald-500 text-white" : step === i+1 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"
            }`}>
              {step > i+1 ? <Check className="w-4 h-4" /> : i+1}
            </div>
            <span className={`text-xs whitespace-nowrap transition-colors ${step === i+1 ? "text-blue-600 font-medium" : "text-gray-400"}`}>
              {label}
            </span>
          </div>
          {i < WIZARD_STEPS.length-1 && (
            <div className={`flex-1 h-0.5 mx-2 mb-4 transition-colors ${step > i+1 ? "bg-emerald-400" : "bg-gray-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function ProyekWizard({ open, onClose, onSave, editing, form, set, show }) {
  const [step, setStep] = useState(1);
  useEffect(() => { if (open) setStep(1); }, [open]);
  if (!open) return null;

  const next = () => {
    if (step === 1 && !form.namaProyek.trim()) { show("Nama proyek wajib diisi", "error"); return; }
    setStep(s => s+1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">{editing ? "Edit Proyek" : "Tambah Proyek Baru"}</h2>
              <p className="text-xs text-gray-400 mt-0.5">Langkah {step} dari {WIZARD_STEPS.length}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X className="w-5 h-5" /></button>
          </div>

          <StepIndicator step={step} />

          {step === 1 && (
            <div className="space-y-4">
              <Field label="Kode Proyek">
                <Input value={form.kodeProyek} onChange={e => set("kodeProyek", e.target.value)} placeholder="PRJ-2026-001" />
                <p className="text-xs text-gray-400 mt-1">Sudah di-generate otomatis, bisa diubah</p>
              </Field>
              <Field label="Nama Proyek *">
                <Input value={form.namaProyek} onChange={e => set("namaProyek", e.target.value)}
                  placeholder="Contoh: Instalasi Panel Listrik Gedung A" autoFocus />
              </Field>
              <Field label="Klien">
                <Input value={form.klien} onChange={e => set("klien", e.target.value)} placeholder="Nama perusahaan atau individu" />
              </Field>
              <Field label="Deskripsi">
                <TextArea value={form.deskripsi} onChange={e => set("deskripsi", e.target.value)}
                  placeholder="Ringkasan singkat tentang proyek ini..." rows={3} />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Tanggal Mulai">
                  <Input type="date" value={form.tanggalMulai} onChange={e => set("tanggalMulai", e.target.value)} />
                </Field>
                <Field label="Tanggal Selesai">
                  <Input type="date" value={form.tanggalSelesai} onChange={e => set("tanggalSelesai", e.target.value)} />
                </Field>
              </div>
              <Field label="Manajer Proyek">
                <Input value={form.manajerProyek} onChange={e => set("manajerProyek", e.target.value)} placeholder="Nama penanggung jawab" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Status">
                  <Select value={form.status} onChange={e => set("status", e.target.value)}>
                    <option value="perencanaan">Perencanaan</option>
                    <option value="berjalan">Berjalan</option>
                    <option value="ditangguhkan">Ditangguhkan</option>
                    <option value="selesai">Selesai</option>
                    <option value="dibatalkan">Dibatalkan</option>
                  </Select>
                </Field>
                <Field label="Prioritas">
                  <Select value={form.prioritas} onChange={e => set("prioritas", e.target.value)}>
                    <option value="rendah">Rendah</option>
                    <option value="normal">Normal</option>
                    <option value="tinggi">Tinggi</option>
                  </Select>
                </Field>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <Field label="Anggaran (Rp)">
                <Input type="number" value={form.anggaran} onChange={e => set("anggaran", e.target.value)} placeholder="0" />
                {Number(form.anggaran) > 0 && <p className="text-xs text-blue-600 mt-1 font-medium">{formatRupiah(form.anggaran)}</p>}
              </Field>
              <Field label="Realisasi (Rp)">
                <Input type="number" value={form.realisasi} onChange={e => set("realisasi", e.target.value)} placeholder="0" />
                {Number(form.realisasi) > 0 && <p className="text-xs text-emerald-600 mt-1 font-medium">{formatRupiah(form.realisasi)}</p>}
              </Field>
              <Field label={`Progress Pengerjaan: ${form.progress}%`}>
                <div className="space-y-2 pt-1">
                  <input type="range" min="0" max="100" value={form.progress}
                    onChange={e => set("progress", e.target.value)} className="w-full accent-blue-600" />
                  <ProgressBar value={form.progress} />
                </div>
              </Field>
            </div>
          )}

          <div className="flex justify-between mt-6 pt-4 border-t">
            <button onClick={step === 1 ? onClose : () => setStep(s => s-1)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium">
              {step === 1 ? "Batal" : "← Kembali"}
            </button>
            <button onClick={step === WIZARD_STEPS.length ? onSave : next}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
              {step === WIZARD_STEPS.length ? "Simpan Proyek" : "Lanjut →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Calendar View ─────────────────────────────────────────────────────────────

function CalendarView({ coloredItems, onEdit }) {
  const today = new Date();
  const [yr, setYr] = useState(today.getFullYear());
  const [mo, setMo] = useState(today.getMonth()); // 0-indexed

  const prevMonth = () => { if (mo === 0) { setYr(y => y-1); setMo(11); } else setMo(m => m-1); };
  const nextMonth = () => { if (mo === 11) { setYr(y => y+1); setMo(0); } else setMo(m => m+1); };
  const goToday  = () => { setYr(today.getFullYear()); setMo(today.getMonth()); };

  // Build flat cell array (Mon-first week)
  const firstDay = new Date(yr, mo, 1);
  const daysInMonth = new Date(yr, mo+1, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7; // Mon=0, Sun=6
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: totalCells }, (_, i) => {
    const d = i - startOffset + 1;
    return (d >= 1 && d <= daysInMonth) ? new Date(yr, mo, d) : null;
  });
  const weeks = Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w*7, w*7+7));

  // Assign stable slots within a week row so bars stay on the same horizontal lane
  function computeSlots(week) {
    const map = new Map();
    const slotEnds = [];
    const projs = coloredItems
      .filter(p => week.some(d => {
        if (!d) return false;
        const s = new Date(p.tanggalMulai+'T00:00:00'), e = new Date(p.tanggalSelesai+'T23:59:59');
        return d >= s && d <= e;
      }))
      .sort((a,b) => new Date(a.tanggalMulai)-new Date(b.tanggalMulai) || a.id.localeCompare(b.id));

    for (const p of projs) {
      const s = new Date(p.tanggalMulai+'T00:00:00'), e = new Date(p.tanggalSelesai+'T23:59:59');
      const first = week.findIndex(d => d && d>=s && d<=e);
      const last  = week.reduce((acc,d,i) => d && d>=s && d<=e ? i : acc, -1);
      let slot = slotEnds.findIndex(end => end < first);
      if (slot === -1) slot = slotEnds.length;
      slotEnds[slot] = last;
      map.set(p.id, slot);
    }
    return map;
  }

  const slotMaps = weeks.map(computeSlots);

  return (
    <div className="bg-white rounded-xl border overflow-hidden mb-6">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <CalIcon className="w-4 h-4 text-gray-400" />
          <span className="font-semibold text-gray-800">{MONTH_NAMES[mo]} {yr}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={goToday} className="px-2 py-1 text-xs rounded-md hover:bg-blue-50 text-blue-600 font-medium">Hari Ini</button>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Day name headers */}
      <div className="grid grid-cols-7 border-b bg-gray-50">
        {DAY_NAMES.map(d => (
          <div key={d} className="py-2 text-center text-xs font-medium text-gray-400">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {cells.map((date, cellIdx) => {
          const weekIdx = Math.floor(cellIdx / 7);
          const dayInWeek = cellIdx % 7;
          const slotMap = slotMaps[weekIdx];

          if (!date) return <div key={cellIdx} className="bg-white min-h-[80px]" />;

          const isToday = date.toDateString() === today.toDateString();

          // Projects active on this day
          const dayProjs = coloredItems.filter(p => {
            const s = new Date(p.tanggalMulai+'T00:00:00'), e = new Date(p.tanggalSelesai+'T23:59:59');
            return date >= s && date <= e;
          });

          // Max slot count for this week (cap display at 2)
          const maxSlot = slotMap.size > 0 ? Math.max(...slotMap.values()) : -1;
          const displayRows = Math.min(maxSlot+1, 2);
          const rows = Array.from({ length: displayRows }, (_, si) =>
            dayProjs.find(p => slotMap.get(p.id) === si) ?? null
          );
          const overflow = dayProjs.filter(p => (slotMap.get(p.id) ?? 99) >= 2).length;

          return (
            <div key={cellIdx} className="bg-white min-h-[80px] p-1">
              <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium mb-0.5 ${
                isToday ? "bg-blue-600 text-white" : "text-gray-700"
              }`}>
                {date.getDate()}
              </div>
              <div className="space-y-0.5">
                {rows.map((proj, si) => {
                  if (!proj) return <div key={si} className="h-4" />;
                  const c = PALETTE[proj.colorIdx];
                  const pStart = new Date(proj.tanggalMulai+'T00:00:00');
                  const pEnd   = new Date(proj.tanggalSelesai+'T00:00:00');
                  const isFirst = date.toDateString() === pStart.toDateString();
                  const isLast  = date.toDateString() === pEnd.toDateString();
                  const roundL = isFirst || dayInWeek === 0;
                  const roundR = isLast  || dayInWeek === 6;
                  const rx = roundL && roundR ? "rounded mx-0.5" : roundL ? "rounded-l" : roundR ? "rounded-r" : "";
                  return (
                    <button key={si}
                      onClick={() => onEdit(proj)}
                      className={`${c.bar} ${rx} h-4 w-full flex items-center overflow-hidden hover:opacity-75 transition-opacity`}
                      title={proj.namaProyek}
                    >
                      {(isFirst || dayInWeek === 0) && (
                        <span className="px-1.5 text-xs truncate leading-none font-medium">{proj.namaProyek}</span>
                      )}
                    </button>
                  );
                })}
                {overflow > 0 && <span className="text-xs text-gray-400 pl-1">+{overflow}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Color legend */}
      {coloredItems.length > 0 && (
        <div className="px-4 py-3 border-t flex flex-wrap gap-x-4 gap-y-1">
          {coloredItems.map(p => (
            <div key={p.id} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${PALETTE[p.colorIdx].dot}`} />
              <span className="text-xs text-gray-600 truncate max-w-[120px]">{p.namaProyek}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Active Projects List ──────────────────────────────────────────────────────

function ActiveProyekList({ coloredItems, onEdit, onDelete }) {
  const [showOther, setShowOther] = useState(false);
  const active = coloredItems.filter(p => p.status === "perencanaan" || p.status === "berjalan");
  const other  = coloredItems.filter(p => p.status === "ditangguhkan" || p.status === "selesai" || p.status === "dibatalkan");

  return (
    <div className="space-y-6">
      {active.length === 0 ? (
        <div className="bg-white rounded-xl border p-8 text-center text-gray-400 text-sm">
          Tidak ada proyek perencanaan atau berjalan.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {active.map(p => renderCard(p, onEdit, onDelete))}
        </div>
      )}

      {other.length > 0 && (
        <div>
          <button
            onClick={() => setShowOther(s => !s)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 font-medium mb-3"
          >
            <span className={`transition-transform ${showOther ? "rotate-90" : ""}`}>▶</span>
            Ditangguhkan / Selesai / Dibatalkan ({other.length})
          </button>
          {showOther && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {other.map(p => renderCard(p, onEdit, onDelete))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function renderCard(p, onEdit, onDelete) {
  return (
    <div key={p.id} className="bg-white rounded-xl border hover:shadow-md transition-shadow flex flex-col">
      {/* Color stripe */}
      <div className={`h-1.5 rounded-t-xl ${PALETTE[p.colorIdx].dot}`} />
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-800 text-sm leading-tight truncate">{p.namaProyek}</p>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{p.kodeProyek || "—"}</p>
          </div>
          <div className="flex gap-1 ml-2 shrink-0">
            <button onClick={() => onEdit(p)} className="text-blue-500 hover:text-blue-700 p-1">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDelete(p)} className="text-red-400 hover:text-red-600 p-1">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <span className={`self-start px-2 py-0.5 rounded-full text-xs font-medium mb-2 ${STATUS_COLORS[p.status] || "bg-gray-100 text-gray-600"}`}>
          {STATUS_LABEL[p.status] || p.status}
        </span>

        {p.klien && <p className="text-xs text-gray-500 mb-0.5">Klien: <span className="text-gray-700">{p.klien}</span></p>}
        {p.manajerProyek && <p className="text-xs text-gray-500 mb-2">PJ: <span className="text-gray-700">{p.manajerProyek}</span></p>}

        {(p.tanggalMulai || p.tanggalSelesai) && (
          <p className="text-xs text-gray-400 mb-3">{fmt(p.tanggalMulai)} — {fmt(p.tanggalSelesai)}</p>
        )}

        <div className="mt-auto">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">Progress</span>
            <span className="text-xs font-semibold text-gray-700">{Math.min(100,Math.max(0,Number(p.progress)||0))}%</span>
          </div>
          <ProgressBar value={p.progress} colorDot={PALETTE[p.colorIdx].dot} />
        </div>

        {Number(p.anggaran) > 0 && (
          <p className="text-xs text-gray-400 mt-2">Anggaran: {formatRupiah(p.anggaran)}</p>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function DaftarProyek() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const { show, Toast } = useToast();

  const load = async () => {
    setLoading(true);
    try { setItems(await getAllProyek()); }
    catch { show("Gagal memuat data", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Attach color index to every project (stable by creation order)
  const coloredItems = items
    .filter(p => p.tanggalMulai && p.tanggalSelesai)
    .map((p, i) => ({ ...p, colorIdx: i % PALETTE.length }));

  // All items with color (for the active list — projects without dates still shown)
  const allColored = items.map((p, i) => ({ ...p, colorIdx: i % PALETTE.length }));

  const openAdd = () => {
    setEditing(null);
    const year = new Date().getFullYear();
    setForm({ ...EMPTY, kodeProyek: `PRJ-${year}-${String(items.length+1).padStart(3,"0")}` });
    setWizardOpen(true);
  };

  const openEdit = (item) => { setEditing(item); setForm({ ...item }); setWizardOpen(true); };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.namaProyek.trim()) { show("Nama proyek wajib diisi", "error"); return; }
    const saveData = { ...form };
    if (!saveData.kodeProyek.trim()) {
      saveData.kodeProyek = `PRJ-${new Date().getFullYear()}-${String(items.length+1).padStart(3,"0")}`;
    }
    try {
      if (editing?.id) await updateProyek(editing.id, saveData);
      else await createProyek(saveData);
      show("Tersimpan");
      setWizardOpen(false);
      load();
    } catch { show("Gagal menyimpan", "error"); }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Hapus proyek "${item.namaProyek}"?`)) return;
    try { await removeProyek(item.id); show("Terhapus"); load(); }
    catch { show("Gagal menghapus", "error"); }
  };

  const totalAnggaran  = items.reduce((s,i) => s + (Number(i.anggaran)  || 0), 0);
  const totalRealisasi = items.reduce((s,i) => s + (Number(i.realisasi) || 0), 0);
  const totalAktif = items.filter(i => i.status === "perencanaan" || i.status === "berjalan").length;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <Toast />
      <AdminPageHeader
        title="Daftar Proyek"
        description="Kelola proyek, anggaran, dan progres pelaksanaan."
        actions={
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4" /> Tambah Proyek
          </Button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-500">Total Proyek</p>
          <p className="text-2xl font-bold text-gray-800">{items.length}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-500">Proyek Aktif</p>
          <p className="text-2xl font-bold text-blue-600">{totalAktif}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-500">Total Anggaran</p>
          <p className="text-lg font-bold text-gray-800">{formatRupiah(totalAnggaran)}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-500">Total Realisasi</p>
          <p className="text-lg font-bold text-emerald-600">{formatRupiah(totalRealisasi)}</p>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-400">Memuat...</div>
      ) : items.length === 0 ? (
        <EmptyState message="Belum ada data proyek. Klik 'Tambah Proyek' untuk mulai." />
      ) : (
        <>
          {/* Calendar */}
          <CalendarView coloredItems={coloredItems} onEdit={openEdit} />

          {/* Projects list */}
          <div className="mb-3 flex items-center gap-2">
            <h3 className="font-semibold text-gray-800">Proyek Aktif</h3>
            {totalAktif > 0 && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                {totalAktif}
              </span>
            )}
          </div>
          <ActiveProyekList coloredItems={allColored} onEdit={openEdit} onDelete={handleDelete} />
        </>
      )}

      <ProyekWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSave={handleSave}
        editing={editing}
        form={form}
        set={set}
        show={show}
      />
    </div>
  );
}
