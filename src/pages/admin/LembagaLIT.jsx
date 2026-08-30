import { useState, useEffect } from "react";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../firebase/config";
import {
  AdminPageHeader, Button, Input, Field, Modal, useToast,
} from "../../components/admin/AdminUI";
import { Plus, Pencil, Trash2, Building2, Upload, X } from "lucide-react";

/* ─── upload helper ──────────────────────────────────────────────────────── */
async function uploadFile(file, path) {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

/* ─── small image preview / upload control ──────────────────────────────── */
function ImgUpload({ label, value, onChange }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-3">
        {value && (
          <div className="relative shrink-0">
            <img
              src={value}
              alt={label}
              className="w-16 h-16 object-contain rounded border border-slate-200 bg-slate-50"
            />
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        <label className="cursor-pointer flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-lg text-sm text-slate-600 hover:border-amber-400 hover:text-amber-600 transition">
          <Upload className="w-4 h-4" />
          {value ? "Ganti" : "Unggah"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onChange(f);
            }}
          />
        </label>
        {value instanceof File && (
          <span className="text-xs text-slate-500 truncate max-w-[120px]">{value.name}</span>
        )}
      </div>
    </Field>
  );
}

/* ─── blank LIT object ───────────────────────────────────────────────────── */
const blankLIT = () => ({
  nama: "",
  alamat: "",
  telepon: "",
  email: "",
  nomorPerizinan: "",
  tanggalPerizinan: "",
  nomorRegistrasi: "",
  tanggalRegistrasi: "",
  nomorKepmenESDM: "",
  logoUrl: "",
  stampUrl: "",
  direktur: { nama: "", ttdUrl: "" },
  pjt: { nama: "", nomorRegistrasi: "", ttdUrl: "" },
  tenagaTeknik: { nama: "", nomorRegistrasi: "", ttdUrl: "" },
});

export default function LembagaLIT() {
  const { show, Toast } = useToast();

  const [list, setList] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  // form state
  const [form, setForm] = useState(blankLIT());
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  // pending file uploads: { logo, stamp, dirTtd, pjtTtd, ttTtd }
  const [files, setFiles] = useState({});

  // delete confirm
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  /* ── fetch list ── */
  const fetchList = async () => {
    setLoadingList(true);
    try {
      const snap = await getDocs(collection(db, "lembaga_lit"));
      setList(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => { fetchList(); }, []);

  /* ── helpers ── */
  const setField = (key, val) => setForm((p) => ({ ...p, [key]: val }));
  const setNested = (parent, key, val) =>
    setForm((p) => ({ ...p, [parent]: { ...p[parent], [key]: val } }));

  const startEdit = (lit) => {
    setEditId(lit.id);
    setForm({
      nama: lit.nama || "",
      alamat: lit.alamat || "",
      telepon: lit.telepon || "",
      email: lit.email || "",
      nomorPerizinan: lit.nomorPerizinan || "",
      tanggalPerizinan: lit.tanggalPerizinan || "",
      nomorRegistrasi: lit.nomorRegistrasi || "",
      tanggalRegistrasi: lit.tanggalRegistrasi || "",
      nomorKepmenESDM: lit.nomorKepmenESDM || "",
      logoUrl: lit.logoUrl || "",
      stampUrl: lit.stampUrl || "",
      direktur: lit.direktur || { nama: "", ttdUrl: "" },
      pjt: lit.pjt || { nama: "", nomorRegistrasi: "", ttdUrl: "" },
      tenagaTeknik: lit.tenagaTeknik || { nama: "", nomorRegistrasi: "", ttdUrl: "" },
    });
    setFiles({});
    window.scrollTo({ top: document.getElementById("lit-form")?.offsetTop ?? 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm(blankLIT());
    setFiles({});
  };

  /* ── save ── */
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.nama.trim()) { show("Nama LIT wajib diisi", "error"); return; }
    setSaving(true);
    try {
      const docId = editId || `lit_${Date.now()}`;

      // resolve uploads
      let logoUrl = form.logoUrl;
      let stampUrl = form.stampUrl;
      let dirTtdUrl = form.direktur.ttdUrl;
      let pjtTtdUrl = form.pjt.ttdUrl;
      let ttTtdUrl = form.tenagaTeknik.ttdUrl;

      if (files.logo instanceof File)
        logoUrl = await uploadFile(files.logo, `lembaga_lit/${docId}/logo`);
      if (files.stamp instanceof File)
        stampUrl = await uploadFile(files.stamp, `lembaga_lit/${docId}/stamp`);
      if (files.dirTtd instanceof File)
        dirTtdUrl = await uploadFile(files.dirTtd, `lembaga_lit/${docId}/direktur_ttd`);
      if (files.pjtTtd instanceof File)
        pjtTtdUrl = await uploadFile(files.pjtTtd, `lembaga_lit/${docId}/pjt_ttd`);
      if (files.ttTtd instanceof File)
        ttTtdUrl = await uploadFile(files.ttTtd, `lembaga_lit/${docId}/tt_ttd`);

      const payload = {
        ...form,
        logoUrl,
        stampUrl,
        direktur: { ...form.direktur, ttdUrl: dirTtdUrl },
        pjt: { ...form.pjt, ttdUrl: pjtTtdUrl },
        tenagaTeknik: { ...form.tenagaTeknik, ttdUrl: ttTtdUrl },
        updatedAt: serverTimestamp(),
      };

      if (editId) {
        await updateDoc(doc(db, "lembaga_lit", editId), payload);
        show("Data LIT berhasil diperbarui");
      } else {
        await addDoc(collection(db, "lembaga_lit"), { ...payload, createdAt: serverTimestamp() });
        show("Data LIT berhasil ditambahkan");
      }

      cancelEdit();
      fetchList();
    } catch (err) {
      console.error(err);
      show("Gagal menyimpan: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  /* ── delete ── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "lembaga_lit", deleteTarget.id));
      show("Data LIT dihapus");
      setDeleteTarget(null);
      fetchList();
    } catch (err) {
      show("Gagal menghapus: " + err.message, "error");
    } finally {
      setDeleting(false);
    }
  };

  /* ─────────────────────────────────────────────── render ── */
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <Toast />

      <AdminPageHeader
        title="Lembaga Inspeksi Teknik (LIT)"
        description="Kelola data LIT untuk dokumen RLO & SKLO"
      />

      {/* ── List ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-500" />
            Daftar LIT
          </h2>
          <span className="text-xs text-slate-500">{list.length} data</span>
        </div>

        {loadingList ? (
          <div className="px-6 py-8 text-center text-slate-400 text-sm">Memuat data...</div>
        ) : list.length === 0 ? (
          <div className="px-6 py-8 text-center text-slate-400 text-sm">
            Belum ada data LIT. Gunakan form di bawah untuk menambah.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {list.map((lit) => (
              <div key={lit.id} className="px-6 py-4 flex items-center gap-4">
                {lit.logoUrl ? (
                  <img src={lit.logoUrl} alt="" className="w-10 h-10 object-contain rounded shrink-0" />
                ) : (
                  <div className="w-10 h-10 bg-amber-100 rounded flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-amber-600" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{lit.nama}</p>
                  <p className="text-xs text-slate-500 truncate">
                    Perizinan: {lit.nomorPerizinan || "-"}
                    {lit.nomorRegistrasi ? ` · Registrasi: ${lit.nomorRegistrasi}` : ""}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="ghost" className="!px-2 !py-1.5" onClick={() => startEdit(lit)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    className="!px-2 !py-1.5 text-red-500 hover:bg-red-50"
                    onClick={() => setDeleteTarget(lit)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Form ── */}
      <form id="lit-form" onSubmit={handleSave} className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">
            {editId ? "Edit Data LIT" : "Tambah LIT Baru"}
          </h2>
          {editId && (
            <Button type="button" variant="secondary" onClick={cancelEdit}>
              Batal
            </Button>
          )}
        </div>

        {/* Card: Identitas LIT */}
        <SectionCard title="Identitas LIT">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <Field label="Nama LIT" required>
              <Input value={form.nama} onChange={(e) => setField("nama", e.target.value)} placeholder="PT. Lembaga Inspeksi ..." />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} placeholder="lit@example.com" />
            </Field>
            <Field label="Telepon">
              <Input value={form.telepon} onChange={(e) => setField("telepon", e.target.value)} placeholder="021-..." />
            </Field>
            <Field label="Alamat">
              <Input value={form.alamat} onChange={(e) => setField("alamat", e.target.value)} placeholder="Jl. ..." />
            </Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <ImgUpload
              label="Logo LIT"
              value={files.logo instanceof File ? URL.createObjectURL(files.logo) : form.logoUrl}
              onChange={(f) => setFiles((p) => ({ ...p, logo: f }))}
            />
            <ImgUpload
              label="Stempel / Cap"
              value={files.stamp instanceof File ? URL.createObjectURL(files.stamp) : form.stampUrl}
              onChange={(f) => setFiles((p) => ({ ...p, stamp: f }))}
            />
          </div>
        </SectionCard>

        {/* Card: Perizinan & Registrasi */}
        <SectionCard title="Perizinan & Registrasi">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <Field label="Nomor Perizinan">
              <Input value={form.nomorPerizinan} onChange={(e) => setField("nomorPerizinan", e.target.value)} />
            </Field>
            <Field label="Tanggal Perizinan">
              <Input type="date" value={form.tanggalPerizinan} onChange={(e) => setField("tanggalPerizinan", e.target.value)} />
            </Field>
            <Field label="Nomor Registrasi">
              <Input value={form.nomorRegistrasi} onChange={(e) => setField("nomorRegistrasi", e.target.value)} />
            </Field>
            <Field label="Tanggal Registrasi">
              <Input type="date" value={form.tanggalRegistrasi} onChange={(e) => setField("tanggalRegistrasi", e.target.value)} />
            </Field>
            <Field label="Nomor Kepmen ESDM" className="md:col-span-2">
              <Input value={form.nomorKepmenESDM} onChange={(e) => setField("nomorKepmenESDM", e.target.value)} />
            </Field>
          </div>
        </SectionCard>

        {/* Card: Direktur */}
        <SectionCard title="Direktur">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <Field label="Nama Direktur">
              <Input
                value={form.direktur.nama}
                onChange={(e) => setNested("direktur", "nama", e.target.value)}
                placeholder="Nama lengkap direktur"
              />
            </Field>
            <ImgUpload
              label="Tanda Tangan Direktur"
              value={files.dirTtd instanceof File ? URL.createObjectURL(files.dirTtd) : form.direktur.ttdUrl}
              onChange={(f) => setFiles((p) => ({ ...p, dirTtd: f }))}
            />
          </div>
        </SectionCard>

        {/* Card: PJT */}
        <SectionCard title="Penanggung Jawab Teknik (PJT)">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <Field label="Nama PJT">
              <Input
                value={form.pjt.nama}
                onChange={(e) => setNested("pjt", "nama", e.target.value)}
              />
            </Field>
            <Field label="Nomor Registrasi PJT">
              <Input
                value={form.pjt.nomorRegistrasi}
                onChange={(e) => setNested("pjt", "nomorRegistrasi", e.target.value)}
              />
            </Field>
            <ImgUpload
              label="Tanda Tangan PJT"
              value={files.pjtTtd instanceof File ? URL.createObjectURL(files.pjtTtd) : form.pjt.ttdUrl}
              onChange={(f) => setFiles((p) => ({ ...p, pjtTtd: f }))}
            />
          </div>
        </SectionCard>

        {/* Card: Tenaga Teknik */}
        <SectionCard title="Tenaga Teknik">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <Field label="Nama Tenaga Teknik">
              <Input
                value={form.tenagaTeknik.nama}
                onChange={(e) => setNested("tenagaTeknik", "nama", e.target.value)}
              />
            </Field>
            <Field label="Nomor Registrasi">
              <Input
                value={form.tenagaTeknik.nomorRegistrasi}
                onChange={(e) => setNested("tenagaTeknik", "nomorRegistrasi", e.target.value)}
              />
            </Field>
            <ImgUpload
              label="Tanda Tangan Tenaga Teknik"
              value={files.ttTtd instanceof File ? URL.createObjectURL(files.ttTtd) : form.tenagaTeknik.ttdUrl}
              onChange={(f) => setFiles((p) => ({ ...p, ttTtd: f }))}
            />
          </div>
        </SectionCard>

        <div className="flex justify-end gap-3 pt-2">
          {editId && (
            <Button type="button" variant="secondary" onClick={cancelEdit}>
              Batal
            </Button>
          )}
          <Button type="submit" loading={saving}>
            <Plus className="w-4 h-4" />
            {editId ? "Simpan Perubahan" : "Tambah LIT"}
          </Button>
        </div>
      </form>

      {/* ── Delete confirm modal ── */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Hapus Data LIT"
        size="sm"
      >
        <p className="text-sm text-slate-700 mb-6">
          Yakin ingin menghapus <strong>{deleteTarget?.nama}</strong>? Tindakan ini tidak bisa dibatalkan.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Batal</Button>
          <Button variant="danger" loading={deleting} onClick={handleDelete}>Hapus</Button>
        </div>
      </Modal>
    </div>
  );
}

/* ─── helper component ─────────────────────────────────────────────────────── */
function SectionCard({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-3 border-b border-slate-100 bg-slate-50">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}
