import { useState, useEffect, useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, Calendar } from "lucide-react";
import {
  AdminPageHeader, Button, Modal, Field, Input, TextArea, useToast,
} from "../../components/admin/AdminUI";
import {
  getJadwalByRange, createJadwal, updateJadwal, removeJadwal,
} from "../../services/jadwalService";

const HARI  = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const BULAN = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

const WARNA_OPTIONS = [
  { label: "Biru",  value: "blue" },
  { label: "Hijau", value: "emerald" },
  { label: "Amber", value: "amber" },
  { label: "Merah", value: "red" },
  { label: "Ungu",  value: "purple" },
  { label: "Abu",   value: "slate" },
];

const WARNA_CLASS = {
  blue:    { chip: "bg-blue-100 text-blue-800 border-blue-200",       dot: "bg-blue-500" },
  emerald: { chip: "bg-emerald-100 text-emerald-800 border-emerald-200", dot: "bg-emerald-500" },
  amber:   { chip: "bg-amber-100 text-amber-800 border-amber-200",    dot: "bg-amber-500" },
  red:     { chip: "bg-red-100 text-red-800 border-red-200",          dot: "bg-red-500" },
  purple:  { chip: "bg-purple-100 text-purple-800 border-purple-200", dot: "bg-purple-500" },
  slate:   { chip: "bg-slate-100 text-slate-800 border-slate-200",    dot: "bg-slate-500" },
};

function getMondayOf(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fmtShort(date) {
  return `${date.getDate()} ${BULAN[date.getMonth()]}`;
}

const EMPTY_FORM = { namaTim: "", tanggal: "", judul: "", keterangan: "", warna: "blue" };

export default function JadwalProyek() {
  const [weekStart, setWeekStart] = useState(() => getMondayOf(new Date()));
  const [events,    setEvents]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [reload,    setReload]    = useState(0);
  const [saving,    setSaving]    = useState(false);
  const [modal,     setModal]     = useState({ open: false, editing: null, form: EMPTY_FORM });
  const { show, Toast } = useToast();

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  // keep show stable for useEffect dep
  const showRef = useRef(show);
  showRef.current = show;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const sunday = addDays(weekStart, 6);
    getJadwalByRange(toStr(weekStart), toStr(sunday))
      .then(data => { if (!cancelled) setEvents(data); })
      .catch(() => { if (!cancelled) showRef.current("Gagal memuat jadwal", "error"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [weekStart, reload]);

  const teams = useMemo(() => [...new Set(events.map(e => e.namaTim))].sort(), [events]);

  function getCellEvents(namaTim, dateStr) {
    return events.filter(e => e.namaTim === namaTim && e.tanggal === dateStr);
  }

  function openNew(prefill = {}) {
    setModal({ open: true, editing: null, form: { ...EMPTY_FORM, ...prefill } });
  }

  function openEdit(ev) {
    setModal({
      open: true,
      editing: ev.id,
      form: {
        namaTim:    ev.namaTim,
        tanggal:    ev.tanggal,
        judul:      ev.judul,
        keterangan: ev.keterangan || "",
        warna:      ev.warna || "blue",
      },
    });
  }

  function closeModal() { setModal({ open: false, editing: null, form: EMPTY_FORM }); }

  const setField = (key) => (e) =>
    setModal(m => ({ ...m, form: { ...m.form, [key]: e.target.value } }));

  async function handleSave() {
    const { form, editing } = modal;
    if (!form.namaTim.trim() || !form.tanggal || !form.judul.trim()) {
      show("Nama tim, tanggal, dan judul wajib diisi", "error");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateJadwal(editing, form);
        show("Jadwal diperbarui");
      } else {
        await createJadwal(form);
        show("Jadwal ditambahkan");
      }
      closeModal();
      setReload(r => r + 1);
    } catch {
      show("Gagal menyimpan", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!modal.editing) return;
    setSaving(true);
    try {
      await removeJadwal(modal.editing);
      show("Jadwal dihapus");
      closeModal();
      setReload(r => r + 1);
    } catch {
      show("Gagal menghapus", "error");
    } finally {
      setSaving(false);
    }
  }

  const prevWeek = () => setWeekStart(d => addDays(d, -7));
  const nextWeek = () => setWeekStart(d => addDays(d, 7));
  const goToday  = () => setWeekStart(getMondayOf(new Date()));

  const todayStr  = toStr(new Date());
  const weekLabel = `${fmtShort(weekStart)} – ${fmtShort(weekDays[6])} ${weekDays[6].getFullYear()}`;

  return (
    <div className="p-6 max-w-full">
      <Toast />
      <AdminPageHeader
        title="Jadwal Tim"
        description="Atur dan pantau jadwal pekerjaan tim per minggu"
        actions={
          <Button onClick={() => openNew({ tanggal: todayStr })}>
            <Plus size={16} /> Tambah Jadwal
          </Button>
        }
      />

      {/* Week navigator */}
      <div className="flex items-center gap-2 mb-5">
        <button
          onClick={prevWeek}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="font-semibold text-slate-700 text-sm min-w-[210px] text-center">
          {weekLabel}
        </span>
        <button
          onClick={nextWeek}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition"
        >
          <ChevronRight size={18} />
        </button>
        <button
          onClick={goToday}
          className="ml-2 px-3 py-1.5 text-xs rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
        >
          Hari Ini
        </button>
      </div>

      {/* Calendar grid */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-32 border-r border-slate-200">
                Tim
              </th>
              {weekDays.map((d, i) => {
                const isToday = toStr(d) === todayStr;
                return (
                  <th
                    key={i}
                    className={`px-2 py-3 text-center text-xs font-semibold min-w-[130px] ${
                      isToday ? "bg-amber-50 text-amber-700" : "text-slate-600"
                    }`}
                  >
                    <div className="font-medium opacity-70">{HARI[i]}</div>
                    <div className={`text-xl font-bold mt-0.5 leading-none ${isToday ? "text-amber-600" : "text-slate-800"}`}>
                      {d.getDate()}
                    </div>
                    <div className="text-slate-400 font-normal mt-0.5">{BULAN[d.getMonth()]}</div>
                    {isToday && (
                      <div className="mt-1 mx-auto w-1.5 h-1.5 rounded-full bg-amber-500" />
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-20 text-slate-400">
                  <Calendar size={36} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Memuat jadwal...</p>
                </td>
              </tr>
            ) : teams.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-20 text-slate-400">
                  <Calendar size={36} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium text-slate-600">Belum ada jadwal minggu ini</p>
                  <button
                    onClick={() => openNew({ tanggal: todayStr })}
                    className="mt-3 text-amber-600 hover:underline text-sm font-medium"
                  >
                    + Tambah jadwal pertama
                  </button>
                </td>
              </tr>
            ) : (
              teams.map((team, ti) => (
                <tr
                  key={team}
                  className={`border-b border-slate-100 ${ti % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}
                >
                  {/* Team name */}
                  <td className="px-4 py-3 font-semibold text-slate-700 text-xs align-top border-r border-slate-100 whitespace-nowrap">
                    {team}
                  </td>

                  {/* Day cells */}
                  {weekDays.map((d, di) => {
                    const dateStr    = toStr(d);
                    const isToday    = dateStr === todayStr;
                    const cellEvents = getCellEvents(team, dateStr);
                    return (
                      <td
                        key={di}
                        className={`px-2 py-2 align-top border-l border-slate-100 ${
                          isToday ? "bg-amber-50/40" : ""
                        }`}
                      >
                        <div className="space-y-1 min-h-[36px]">
                          {cellEvents.map(ev => {
                            const cls = WARNA_CLASS[ev.warna] || WARNA_CLASS.blue;
                            return (
                              <button
                                key={ev.id}
                                onClick={() => openEdit(ev)}
                                title={ev.keterangan || ev.judul}
                                className={`w-full text-left px-2 py-1 rounded-md border text-xs font-medium leading-tight ${cls.chip} hover:opacity-75 transition`}
                              >
                                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle ${cls.dot}`} />
                                {ev.judul}
                              </button>
                            );
                          })}
                          <button
                            onClick={() => openNew({ namaTim: team, tanggal: dateStr })}
                            className="w-full text-xs text-slate-300 hover:text-amber-500 hover:bg-amber-50 rounded-md py-0.5 transition"
                          >
                            +
                          </button>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))
            )}

            {/* Add team footer row */}
            {!loading && (
              <tr className="border-t border-dashed border-slate-200">
                <td colSpan={8} className="px-4 py-2.5">
                  <button
                    onClick={() => openNew({ tanggal: todayStr })}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-600 transition"
                  >
                    <Plus size={13} /> Tambah tim baru
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal add/edit */}
      <Modal
        open={modal.open}
        onClose={closeModal}
        title={modal.editing ? "Edit Jadwal" : "Tambah Jadwal"}
        size="sm"
      >
        <datalist id="jadwal-team-list">
          {teams.map(n => <option key={n} value={n} />)}
        </datalist>

        <Field label="Nama Tim" required>
          <Input
            list="jadwal-team-list"
            placeholder="Contoh: Tim A, Tim Listrik..."
            value={modal.form.namaTim}
            onChange={setField("namaTim")}
          />
        </Field>

        <Field label="Tanggal" required>
          <Input
            type="date"
            value={modal.form.tanggal}
            onChange={setField("tanggal")}
          />
        </Field>

        <Field label="Judul Pekerjaan" required>
          <Input
            placeholder="Contoh: Survei lapangan Bekasi"
            value={modal.form.judul}
            onChange={setField("judul")}
          />
        </Field>

        <Field label="Keterangan">
          <TextArea
            rows={2}
            placeholder="Detail tambahan (opsional)"
            value={modal.form.keterangan}
            onChange={setField("keterangan")}
          />
        </Field>

        <Field label="Warna">
          <div className="flex gap-2 flex-wrap">
            {WARNA_OPTIONS.map(opt => {
              const cls        = WARNA_CLASS[opt.value];
              const isSelected = modal.form.warna === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setModal(m => ({ ...m, form: { ...m.form, warna: opt.value } }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition ${cls.chip} ${
                    isSelected ? "border-slate-700 scale-105 shadow-sm" : "border-transparent"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </Field>

        <div className="flex gap-2 mt-4 pt-2 border-t border-slate-100">
          <Button loading={saving} onClick={handleSave} className="flex-1">
            Simpan
          </Button>
          {modal.editing && (
            <Button variant="danger" loading={saving} onClick={handleDelete}>
              <Trash2 size={14} />
            </Button>
          )}
          <Button variant="secondary" onClick={closeModal} disabled={saving}>
            Batal
          </Button>
        </div>
      </Modal>
    </div>
  );
}
