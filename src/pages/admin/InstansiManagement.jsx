import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, X, ImagePlus, Eye, EyeOff } from "lucide-react";
import { PermissionGate } from "../../components/PermissionGate";
import {
  AdminPageHeader, Button, Modal, Field, Input, TextArea, Select,
  Toggle, ImageUploader, EmptyState, useToast,
} from "../../components/admin/AdminUI";
import {
  getAllInstansi, createInstansi, updateInstansi, softDeleteInstansi,
  uploadInstansiImage, deleteInstansiImage,
} from "../../services/instansiService";
import { TEMPLATES } from "../../templates/laporan";

const EMPTY = {
  nama: "",
  tagline: "",
  alamat: "",
  web: "",
  telp: "",
  logo: null,
  templateId: "adytia",
  penanggungJawab: [],
  aktif: true,
};

export default function InstansiManagement() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const { show, Toast } = useToast();

  const load = async () => {
    setLoading(true);
    try { setItems(await getAllInstansi()); }
    catch (err) { console.error(err); show("Gagal memuat data", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (form) => {
    try {
      if (editing?.id) await updateInstansi(editing.id, form);
      else await createInstansi(form);
      show("Tersimpan");
      setModalOpen(false);
      load();
    } catch (err) {
      console.error(err);
      show("Gagal menyimpan", "error");
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(
      `Nonaktifkan instansi "${item.nama}"?\n\n` +
      `Laporan lama tetap aman, tapi instansi ini tidak akan muncul saat membuat laporan baru.`
    )) return;
    try {
      await softDeleteInstansi(item.id);
      show("Instansi dinonaktifkan");
      load();
    } catch (err) {
      console.error(err);
      show("Gagal", "error");
    }
  };

  const handleReactivate = async (item) => {
    try {
      await updateInstansi(item.id, { aktif: true });
      show("Diaktifkan kembali");
      load();
    } catch (err) { console.error(err); }
  };

  const visible = items.filter(i => showInactive || i.aktif !== false);

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <Toast />
      <AdminPageHeader
        title="Instansi"
        description="Kelola instansi pelanggan, template laporan, dan daftar penanggung jawab (TTD)."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowInactive(v => !v)}>
              {showInactive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showInactive ? "Sembunyikan non-aktif" : "Tampilkan non-aktif"}
            </Button>
            <PermissionGate module="instansi" require="write_approval">
              <Button onClick={() => { setEditing(EMPTY); setModalOpen(true); }}>
                <Plus className="w-4 h-4" /> Tambah Instansi
              </Button>
            </PermissionGate>
          </div>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : !visible.length ? (
        <EmptyState
          title="Belum ada instansi"
          description="Tambahkan instansi pertama (mis. Adytia Putra Tehnik) untuk mulai membuat laporan."
          action={
            <PermissionGate module="instansi" require="write_approval">
              <Button onClick={() => { setEditing(EMPTY); setModalOpen(true); }}>
                <Plus className="w-4 h-4" /> Tambah
              </Button>
            </PermissionGate>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visible.map((inst) => (
            <InstansiCard
              key={inst.id}
              inst={inst}
              onEdit={() => { setEditing(inst); setModalOpen(true); }}
              onDelete={() => handleDelete(inst)}
              onReactivate={() => handleReactivate(inst)}
            />
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing?.id ? "Edit Instansi" : "Tambah Instansi"}
        size="lg"
      >
        {editing && (
          <InstansiForm
            initial={editing}
            onCancel={() => setModalOpen(false)}
            onSave={handleSave}
          />
        )}
      </Modal>
    </div>
  );
}

function InstansiCard({ inst, onEdit, onDelete, onReactivate }) {
  const isActive = inst.aktif !== false;
  return (
    <div className={`bg-white border rounded-xl p-4 ${isActive ? "border-slate-200" : "border-slate-200 opacity-60"}`}>
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
          {inst.logo?.url
            ? <img src={inst.logo.url} alt="" className="w-full h-full object-contain" />
            : <ImagePlus className="w-6 h-6 text-slate-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-slate-900 truncate">{inst.nama}</p>
            {!isActive && (
              <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full">
                Non-aktif
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 line-clamp-2 mb-2">{inst.alamat || "—"}</p>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>📄 {TEMPLATES[inst.templateId]?.label ?? TEMPLATES["adytia"].label}</span>
            <span>👤 {inst.penanggungJawab?.length ?? 0} TTD</span>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-slate-100">
        <PermissionGate module="instansi" require="write_approval">
          <Button variant="outline" onClick={onEdit} className="!px-2 !py-1.5">
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
        </PermissionGate>
        <PermissionGate module="instansi" require="write">
          {isActive ? (
            <Button variant="ghost" onClick={onDelete}
              className="!px-2 !py-1.5 hover:!bg-red-50 hover:!text-red-600">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button variant="ghost" onClick={onReactivate}
              className="!px-2 !py-1.5 hover:!bg-emerald-50 hover:!text-emerald-600">
              <Eye className="w-3.5 h-3.5" />
            </Button>
          )}
        </PermissionGate>
      </div>
    </div>
  );
}

function InstansiForm({ initial, onCancel, onSave }) {
  const [form, setForm] = useState({ templateId: "adytia", ...initial });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleLogo = async (file) => {
    if (!file) {
      if (form.logo?.path) await deleteInstansiImage(form.logo.path);
      set("logo", null);
      return;
    }
    if (form.logo?.path) await deleteInstansiImage(form.logo.path);
    const uploaded = await uploadInstansiImage(file, "logo");
    set("logo", uploaded);
  };

  const addPj = () => {
    const newPj = {
      id: `pj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      nama: "", jabatan: "",
      signature: null, stempel: null,
    };
    set("penanggungJawab", [...(form.penanggungJawab || []), newPj]);
  };

  const updatePj = (idx, patch) => {
    setForm((prev) => {
      const list = [...(prev.penanggungJawab || [])];
      list[idx] = { ...list[idx], ...patch };
      return { ...prev, penanggungJawab: list };
    });
  };

  const removePj = async (idx) => {
    const pj = form.penanggungJawab[idx];
    if (!window.confirm(`Hapus penanggung jawab "${pj.nama || "(tanpa nama)"}"?`)) return;
    if (pj.signature?.path) await deleteInstansiImage(pj.signature.path);
    if (pj.stempel?.path) await deleteInstansiImage(pj.stempel.path);
    set("penanggungJawab", form.penanggungJawab.filter((_, i) => i !== idx));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.nama) return alert('Judul wajib diisi');
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Nama Instansi" required>
          <Input value={form.nama} onChange={(e) => set("nama", e.target.value)}
            placeholder="PT. ADYTIA PUTRA TEHNIK" />
        </Field>
        <Field label="Template Laporan" hint="Format yang dipakai saat preview & export PDF.">
          <Select value={form.templateId} onChange={(e) => set("templateId", e.target.value)}>
            {Object.entries(TEMPLATES).map(([key, t]) => (
              <option key={key} value={key}>{t.label}</option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Tagline / Bidang Usaha" hint="Ditampilkan di bawah nama pada kop laporan.">
        <Input
          value={form.tagline || ""}
          onChange={(e) => set("tagline", e.target.value)}
          placeholder="ELECTRICAL CONTRACTOR & TECHNICAL ENGINEERING"
        />
      </Field>

      <Field label="Alamat">
        <TextArea
          rows={2}
          value={form.alamat}
          onChange={(e) => set("alamat", e.target.value)}
          placeholder="Desa Gading Watu RT.04 RW.04, Menganti - Gresik"
        />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Website" hint="Ditampilkan di kop laporan.">
          <Input
            type="url"
            value={form.web || ""}
            onChange={(e) => set("web", e.target.value)}
            placeholder="www.perusahaan.com"
          />
        </Field>
        <Field label="No. Telepon" hint="Ditampilkan di kop laporan.">
          <Input
            value={form.telp || ""}
            onChange={(e) => set("telp", e.target.value)}
            placeholder="031-1234567"
          />
        </Field>
      </div>

      <ImageUploader
        value={form.logo?.url}
        onChange={handleLogo}
        label="Logo Instansi"
      />

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-slate-700">
            Penanggung Jawab / TTD ({form.penanggungJawab?.length ?? 0})
          </p>
          <Button type="button" variant="outline" onClick={addPj} className="!px-2 !py-1">
            <Plus className="w-3.5 h-3.5" /> Tambah
          </Button>
        </div>

        {!form.penanggungJawab?.length ? (
          <p className="text-xs text-slate-400 italic border border-dashed border-slate-200 rounded-lg py-6 text-center">
            Belum ada penanggung jawab. Tambahkan minimal satu agar bisa dipilih saat membuat laporan.
          </p>
        ) : (
          <div className="space-y-3">
            {form.penanggungJawab.map((pj, i) => (
              <PjRow
                key={pj.id}
                pj={pj}
                onChange={(patch) => updatePj(i, patch)}
                onRemove={() => removePj(i)}
              />
            ))}
          </div>
        )}
      </div>

      <Field label="Status">
        <Toggle
          checked={form.aktif !== false}
          onChange={(e) => set("aktif", e.target.checked)}
          label={form.aktif !== false ? "Aktif" : "Non-aktif"}
        />
      </Field>

      <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
        <Button type="button" variant="secondary" onClick={onCancel}>Batal</Button>
        <Button type="submit" loading={saving}>Simpan</Button>
      </div>
    </form>
  );
}

function PjRow({ pj, onChange, onRemove }) {
  const handleSig = async (file) => {


    // Defensive: kalau file bukan File/Blob, abort (jangan delete!)
    if (file && !(file instanceof File) && !(file instanceof Blob)) {
      console.error("[handleSig] received non-File:", file);
      alert("Format file tidak valid");
      return;
    }

    if (!file) {
      if (pj.signature?.path) await deleteInstansiImage(pj.signature.path);
      onChange({ signature: null });
      return;
    }
    try {
      if (pj.signature?.path) await deleteInstansiImage(pj.signature.path);
      const u = await uploadInstansiImage(file, "signature");
      onChange({ signature: u });
    } catch (err) {
      console.error("[handleSig] upload failed:", err);
      alert("Gagal upload TTD: " + err.message);
    }
  };

  const handleStempel = async (file) => {
    if (file && !(file instanceof File) && !(file instanceof Blob)) {
      console.error("[handleStempel] received non-File:", file);
      return;
    }
    if (!file) {
      if (pj.stempel?.path) await deleteInstansiImage(pj.stempel.path);
      onChange({ stempel: null });
      return;
    }
    try {
      if (pj.stempel?.path) await deleteInstansiImage(pj.stempel.path);
      const u = await uploadInstansiImage(file, "stempel");
      onChange({ stempel: u });
    } catch (err) {
      console.error("[handleStempel] upload failed:", err);
      alert("Gagal upload stempel: " + err.message);
    }
  };

  return (
    <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 relative">
      <button type="button" onClick={onRemove}
        className="absolute top-2 right-2 text-red-500 hover:bg-red-50 rounded p-1">
        <X className="w-3.5 h-3.5" />
      </button>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
        <Field label="Nama">
          <Input value={pj.nama} onChange={(e) => onChange({ nama: e.target.value })}
            placeholder="Budi Santoso" />
        </Field>
        <Field label="Jabatan">
          <Input value={pj.jabatan} onChange={(e) => onChange({ jabatan: e.target.value })}
            placeholder="Teknisi Senior" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-3">
        <ImageUploader
          value={pj.signature?.url}
          onChange={handleSig}
          label="Tanda Tangan (opsional)"
        />
        <ImageUploader
          value={pj.stempel?.url}
          onChange={handleStempel}
          label="Stempel (opsional)"
        />
      </div>
      <p className="text-xs text-slate-400 mt-2">
        Kosongkan keduanya jika TTD/stempel akan diisi manual setelah print.
      </p>
    </div>
  );
}