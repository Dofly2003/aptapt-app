import { useEffect, useState, useCallback } from "react";
import {
  Plus, Edit2, Trash2, ClipboardList, Users2,
  Copy, Check, ChevronUp, ChevronDown, Trash, ExternalLink, Printer,
} from "lucide-react";
import { openPosterWindow } from "../../utils/posterRekrutmen";
import {
  AdminPageHeader, Button, Modal, Field, Input, Select, TextArea, EmptyState, useToast,
} from "../../components/admin/AdminUI";
import {
  getAllRekrutmen, createRekrutmen, updateRekrutmen, removeRekrutmen,
  updateRekrutmenForm, getSubmissionsByRekrutmen, removeSubmission,
} from "../../services/sdmService";

/* ─── Constants ─── */
const EMPTY = {
  posisi: "", departemen: "", tanggalBuka: "", tanggalTutup: "",
  jumlahKebutuhan: "1", kualifikasi: "", keterangan: "", status: "dibuka",
};

const STATUS_BADGE = {
  dibuka:  "bg-emerald-100 text-emerald-700",
  proses:  "bg-blue-100 text-blue-700",
  ditutup: "bg-slate-100 text-slate-600",
};

const FIELD_TYPES = [
  { value: "text",     label: "Teks Singkat" },
  { value: "textarea", label: "Teks Panjang" },
  { value: "email",    label: "Email" },
  { value: "phone",    label: "Nomor Telepon" },
  { value: "file",     label: "Upload File" },
];

const FILE_OPTS = [
  { value: "pdf",   label: "PDF" },
  { value: "image", label: "Gambar (JPG/PNG)" },
  { value: "video", label: "Video (MP4)" },
];

const newField = () => ({
  id: Math.random().toString(36).slice(2),
  type: "text",
  label: "",
  placeholder: "",
  required: false,
  allowedTypes: ["pdf"],
  maxSizeMB: 10,
});

/* ─── FieldEditorRow ─── */
function FieldEditorRow({ field, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) {
  const [open, setOpen] = useState(field.label === "");

  const set = (k, v) => onChange({ ...field, [k]: v });

  const toggleFileType = (t) => {
    const cur = field.allowedTypes || [];
    set("allowedTypes", cur.includes(t) ? cur.filter(x => x !== t) : [...cur, t]);
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      {/* Row header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 cursor-pointer select-none"
        onClick={() => setOpen(o => !o)}
      >
        <span className="flex-1 text-sm font-medium text-slate-700 truncate">
          {field.label || <span className="text-slate-400 italic">Field baru…</span>}
        </span>
        <span className="text-xs bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded-full capitalize">
          {FIELD_TYPES.find(t => t.value === field.type)?.label || field.type}
        </span>
        <div className="flex items-center gap-1 ml-1" onClick={e => e.stopPropagation()}>
          <button
            type="button"
            disabled={isFirst}
            onClick={onMoveUp}
            className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={isLast}
            onClick={onMoveDown}
            className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1 rounded hover:bg-red-100 text-red-500"
          >
            <Trash className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded editor */}
      {open && (
        <div className="p-3 space-y-3 bg-white border-t border-slate-100">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Label / Pertanyaan">
              <Input
                value={field.label}
                onChange={e => set("label", e.target.value)}
                placeholder="contoh: Nama Lengkap"
              />
            </Field>
            <Field label="Tipe Field">
              <Select value={field.type} onChange={e => set("type", e.target.value)}>
                {FIELD_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </Select>
            </Field>
          </div>

          {field.type !== "file" && (
            <Field label="Placeholder">
              <Input
                value={field.placeholder}
                onChange={e => set("placeholder", e.target.value)}
                placeholder="Teks petunjuk untuk pelamar"
              />
            </Field>
          )}

          {field.type === "file" && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-600">Format file yang diizinkan</p>
              <div className="flex flex-wrap gap-2">
                {FILE_OPTS.map(opt => (
                  <label key={opt.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(field.allowedTypes || []).includes(opt.value)}
                      onChange={() => toggleFileType(opt.value)}
                      className="accent-amber-500"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
              <Field label="Ukuran maks (MB)">
                <Input
                  type="number"
                  min="1"
                  max="500"
                  value={field.maxSizeMB}
                  onChange={e => set("maxSizeMB", Number(e.target.value))}
                  className="w-28"
                />
              </Field>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={field.required}
              onChange={e => set("required", e.target.checked)}
              className="accent-amber-500"
            />
            <span className="text-slate-700">Wajib diisi</span>
          </label>
        </div>
      )}
    </div>
  );
}

/* ─── FormBuilderModal ─── */
function FormBuilderModal({ open, onClose, rekrutmen, onSaved, toast }) {
  const [fields, setFields] = useState([]);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) setFields(rekrutmen?.formFields || []);
  }, [open, rekrutmen]);

  const publicUrl = rekrutmen
    ? `${window.location.origin}/rekrutmen/${rekrutmen.id}`
    : "";

  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addField = () => setFields(f => [...f, newField()]);

  const updateField = useCallback((idx, updated) => {
    setFields(f => f.map((item, i) => (i === idx ? updated : item)));
  }, []);

  const deleteField = (idx) => setFields(f => f.filter((_, i) => i !== idx));

  const moveUp = (idx) => {
    if (idx === 0) return;
    setFields(f => {
      const arr = [...f];
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      return arr;
    });
  };

  const moveDown = (idx) => {
    setFields(f => {
      if (idx >= f.length - 1) return f;
      const arr = [...f];
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      return arr;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateRekrutmenForm(rekrutmen.id, fields);
      toast("Form tersimpan");
      onSaved();
      onClose();
    } catch {
      toast("Gagal menyimpan form", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Form Lamaran — ${rekrutmen?.posisi || ""}`} size="lg">
      <div className="space-y-4">
        {/* Link share */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
          <span className="text-xs text-slate-500 truncate flex-1 font-mono">{publicUrl}</span>
          <button
            type="button"
            onClick={copyLink}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700 transition-colors shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Tersalin!" : "Salin Link"}
          </button>
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Fields list */}
        <div className="space-y-2">
          {fields.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
              Belum ada field. Klik tombol di bawah untuk menambah.
            </div>
          )}
          {fields.map((field, idx) => (
            <FieldEditorRow
              key={field.id}
              field={field}
              onChange={(updated) => updateField(idx, updated)}
              onDelete={() => deleteField(idx)}
              onMoveUp={() => moveUp(idx)}
              onMoveDown={() => moveDown(idx)}
              isFirst={idx === 0}
              isLast={idx === fields.length - 1}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={addField}
          className="w-full py-2.5 border-2 border-dashed border-slate-300 hover:border-amber-400 hover:bg-amber-50 rounded-xl text-sm text-slate-500 hover:text-amber-600 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Tambah Field
        </button>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose}>Batal</Button>
          <Button loading={saving} onClick={handleSave}>Simpan Form</Button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── SubmissionsModal ─── */
function SubmissionsModal({ open, onClose, rekrutmen, toast }) {
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!open || !rekrutmen) return;
    setLoading(true);
    getSubmissionsByRekrutmen(rekrutmen.id)
      .then(setItems)
      .catch(() => toast("Gagal memuat lamaran", "error"))
      .finally(() => setLoading(false));
  }, [open, rekrutmen]);

  const handleDelete = async (sub) => {
    if (!confirm("Hapus lamaran ini?")) return;
    try {
      await removeSubmission(sub.id);
      setItems(p => p.filter(x => x.id !== sub.id));
      if (selected?.id === sub.id) setSelected(null);
      toast("Lamaran dihapus");
    } catch {
      toast("Gagal menghapus", "error");
    }
  };

  const fields = rekrutmen?.formFields || [];

  const fmtDate = (ts) => {
    if (!ts) return "-";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const firstTextLabel = fields.find(f => f.type !== "file")?.label || "Pelamar";

  return (
    <Modal open={open} onClose={() => { onClose(); setSelected(null); }}
      title={`Lamaran Masuk — ${rekrutmen?.posisi || ""}`} size="lg">
      {loading ? (
        <div className="text-center py-10 text-slate-500 text-sm">Memuat data lamaran…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-10 text-slate-400 text-sm">Belum ada lamaran masuk.</div>
      ) : selected ? (
        /* Detail view */
        <div className="space-y-4">
          <button onClick={() => setSelected(null)} className="text-sm text-amber-600 hover:text-amber-700 font-medium">
            ← Kembali ke daftar
          </button>
          <p className="text-xs text-slate-400">Diterima: {fmtDate(selected.createdAt)}</p>
          <div className="space-y-4">
            {fields.map(field => {
              const val = selected.values?.[field.id];
              return (
                <div key={field.id}>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{field.label}</p>
                  {field.type === "file" ? (
                    val?.url ? (
                      <a href={val.url} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 underline">
                        <ExternalLink className="w-3.5 h-3.5" />
                        {val.name || "Lihat file"}
                      </a>
                    ) : <span className="text-slate-400 text-sm">-</span>
                  ) : (
                    <p className="text-sm text-slate-800 whitespace-pre-wrap">{val || "-"}</p>
                  )}
                </div>
              );
            })}
          </div>
          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <Button variant="danger" onClick={() => handleDelete(selected)}>Hapus Lamaran</Button>
          </div>
        </div>
      ) : (
        /* List view */
        <div className="space-y-2">
          <p className="text-xs text-slate-500">{items.length} lamaran masuk</p>
          {items.map((sub, i) => {
            const nameField = fields.find(f => f.type !== "file");
            const name = nameField ? sub.values?.[nameField.id] : `Pelamar #${i + 1}`;
            return (
              <div key={sub.id}
                className="flex items-center gap-3 px-3 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer"
                onClick={() => setSelected(sub)}
              >
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-bold text-sm flex items-center justify-center shrink-0">
                  {String(name || "?")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{name || "—"}</p>
                  <p className="text-xs text-slate-400">{fmtDate(sub.createdAt)}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDelete(sub); }}
                  className="p-1.5 rounded-lg hover:bg-red-100 text-red-400 hover:text-red-600 shrink-0"
                >
                  <Trash className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

/* ─── Main Rekrutmen page ─── */
export default function Rekrutmen() {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState(EMPTY);
  const [formBuilder, setFormBuilder] = useState({ open: false, rekrutmen: null });
  const [submissionsModal, setSubmissionsModal] = useState({ open: false, rekrutmen: null });
  const { show, Toast } = useToast();

  const load = async () => {
    setLoading(true);
    try { setItems(await getAllRekrutmen()); }
    catch { show("Gagal memuat data", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (item) => { setEditing(item); setForm({ ...item }); setModal(true); };
  const set      = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    try {
      if (editing?.id) await updateRekrutmen(editing.id, form);
      else await createRekrutmen(form);
      show("Tersimpan"); setModal(false); load();
    } catch { show("Gagal menyimpan", "error"); }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Hapus lowongan "${item.posisi}"?`)) return;
    try { await removeRekrutmen(item.id); show("Terhapus"); load(); }
    catch { show("Gagal menghapus", "error"); }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <Toast />

      <AdminPageHeader
        title="Rekrutmen"
        description="Kelola lowongan kerja dan form lamaran online."
        actions={<Button onClick={openAdd}><Plus className="w-4 h-4" /> Buka Lowongan</Button>}
      />

      {loading ? (
        <div className="text-center py-12 text-slate-500">Memuat...</div>
      ) : !items.length ? (
        <EmptyState
          title="Belum ada lowongan aktif"
          description="Buka lowongan baru untuk memulai proses rekrutmen."
          action={<Button onClick={openAdd}><Plus className="w-4 h-4" /> Buka Lowongan</Button>}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Posisi</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Departemen</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Kebutuhan</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Tgl Tutup</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Status</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{item.posisi || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{item.departemen || "-"}</td>
                    <td className="px-4 py-3 text-center text-slate-700">{item.jumlahKebutuhan || 1} orang</td>
                    <td className="px-4 py-3 text-slate-600">{item.tanggalTutup || "-"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[item.status] || "bg-slate-100 text-slate-600"}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          title="Edit lowongan"
                          onClick={() => openEdit(item)}
                          className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title="Buat / edit form lamaran"
                          onClick={() => setFormBuilder({ open: true, rekrutmen: item })}
                          className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                        >
                          <ClipboardList className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title="Lihat lamaran masuk"
                          onClick={() => setSubmissionsModal({ open: true, rekrutmen: item })}
                          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                        >
                          <Users2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title="Cetak poster lowongan"
                          onClick={() => openPosterWindow(item, `${window.location.origin}/rekrutmen/${item.id}`)}
                          className="p-1.5 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title="Hapus lowongan"
                          onClick={() => handleDelete(item)}
                          className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lowongan CRUD modal */}
      <Modal open={modalOpen} onClose={() => setModal(false)}
        title={editing?.id ? "Edit Lowongan" : "Buka Lowongan Baru"} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Posisi / Jabatan">
              <Input value={form.posisi} onChange={e => set("posisi", e.target.value)} placeholder="Teknisi Listrik" />
            </Field>
            <Field label="Departemen">
              <Input value={form.departemen} onChange={e => set("departemen", e.target.value)} placeholder="Operasional" />
            </Field>
            <Field label="Jumlah Kebutuhan">
              <Input type="number" value={form.jumlahKebutuhan} onChange={e => set("jumlahKebutuhan", e.target.value)} placeholder="1" />
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={e => set("status", e.target.value)}>
                <option value="dibuka">Dibuka</option>
                <option value="proses">Proses Seleksi</option>
                <option value="ditutup">Ditutup</option>
              </Select>
            </Field>
            <Field label="Tanggal Buka">
              <Input type="date" value={form.tanggalBuka} onChange={e => set("tanggalBuka", e.target.value)} />
            </Field>
            <Field label="Tanggal Tutup">
              <Input type="date" value={form.tanggalTutup} onChange={e => set("tanggalTutup", e.target.value)} />
            </Field>
          </div>
          <Field label="Kualifikasi">
            <TextArea rows={3} value={form.kualifikasi} onChange={e => set("kualifikasi", e.target.value)} placeholder="Pendidikan minimal D3/S1, pengalaman 2 tahun..." />
          </Field>
          <Field label="Keterangan Tambahan">
            <TextArea rows={2} value={form.keterangan} onChange={e => set("keterangan", e.target.value)} placeholder="Informasi tambahan lowongan..." />
          </Field>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setModal(false)}>Batal</Button>
            <Button onClick={handleSave}>Simpan</Button>
          </div>
        </div>
      </Modal>

      {/* Form builder modal */}
      <FormBuilderModal
        open={formBuilder.open}
        onClose={() => setFormBuilder({ open: false, rekrutmen: null })}
        rekrutmen={formBuilder.rekrutmen}
        onSaved={load}
        toast={show}
      />

      {/* Submissions modal */}
      <SubmissionsModal
        open={submissionsModal.open}
        onClose={() => setSubmissionsModal({ open: false, rekrutmen: null })}
        rekrutmen={submissionsModal.rekrutmen}
        toast={show}
      />
    </div>
  );
}
