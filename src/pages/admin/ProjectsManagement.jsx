// src/pages/admin/ProjectsManagement.jsx
import { useEffect, useState, useRef } from 'react';
import { Plus, Edit2, Trash2, X, Eye, EyeOff, Upload, ImagePlus } from 'lucide-react';

import {
  getAllProjects, createProject, updateProject, deleteProject,
  uploadImage, deleteImage,
} from '../../services/contentService';
import { invalidateContent } from '../../hooks/useContent';
import {
  AdminPageHeader, Button, Modal, Field, Input, TextArea, Select,
  Toggle, ImageUploader, EmptyState, useToast,
} from '../../components/admin/AdminUI';

const CATEGORIES = ['Instalasi', 'PJU', 'SLO/NIDI', 'Perawatan', 'Industri', 'Komersial', 'Residensial'];

const EMPTY = {
  title: '', description: '', location: '', category: 'Instalasi',
  images: [], beforeImage: null, afterImage: null,
  isActive: true, completedAt: '',
};

export default function ProjectsManagement() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const { show, Toast } = useToast();

  const load = async () => {
    setLoading(true);
    try { setItems(await getAllProjects()); }
    catch { show('Gagal memuat data', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (form) => {
    try {
      if (editing?.id) await updateProject(editing.id, form);
      else await createProject({ ...form, order: items.length });
      invalidateContent('projects');
      show('Tersimpan');
      setModalOpen(false);
      load();
    } catch (err) {
      console.error(err);
      show('Gagal menyimpan', 'error');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Hapus proyek "${item.title}"?`)) return;
    const allImages = [
      ...(item.images || []),
      item.beforeImage,
      item.afterImage,
    ].filter(Boolean);
    await deleteProject(item.id, allImages);
    invalidateContent('projects');
    show('Proyek dihapus');
    load();
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <Toast />
      <AdminPageHeader
        title="Proyek / Portofolio"
        description="Kelola galeri proyek yang ditampilkan di landing page."
        actions={<Button onClick={() => { setEditing(EMPTY); setModalOpen(true); }}><Plus className="w-4 h-4" /> Tambah Proyek</Button>}
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-[4/3] bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : !items.length ? (
        <EmptyState
          title="Belum ada proyek"
          description="Tambahkan portofolio pertama Anda untuk membangun kepercayaan calon klien."
          action={<Button onClick={() => { setEditing(EMPTY); setModalOpen(true); }}><Plus className="w-4 h-4" /> Tambah</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((p) => (
            <div key={p.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden group">
              <div className="aspect-[4/3] bg-slate-100 relative">
                {p.images?.[0]?.url ? (
                  <img src={p.images[0].url} alt={p.title} className="w-full h-full object-cover" />
                ) : p.afterImage?.url ? (
                  <img src={p.afterImage.url} alt={p.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">Tidak ada gambar</div>
                )}
                <div className="absolute top-3 left-3 flex gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-900 text-xs font-semibold">{p.category}</span>
                  {p.isActive ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-xs flex items-center gap-1"><Eye className="w-3 h-3" /></span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-slate-500 text-white text-xs flex items-center gap-1"><EyeOff className="w-3 h-3" /></span>
                  )}
                </div>
              </div>
              <div className="p-4">
                <p className="font-semibold text-slate-900 mb-1 line-clamp-1">{p.title}</p>
                <p className="text-xs text-slate-500 mb-3 line-clamp-1">{p.location}</p>
                <div className="flex justify-between items-center">
                  <p className="text-xs text-slate-400">
                    {p.images?.length || 0} foto
                    {p.beforeImage && p.afterImage && ' · Before/After'}
                  </p>
                  <div className="flex gap-1">
                    <Button variant="outline" onClick={() => { setEditing(p); setModalOpen(true); }} className="!px-2 !py-1.5">
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" onClick={() => handleDelete(p)} className="!px-2 !py-1.5 hover:!bg-red-50 hover:!text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing?.id ? 'Edit Proyek' : 'Tambah Proyek'} size="lg">
        {editing && <ProjectForm initial={editing} onCancel={() => setModalOpen(false)} onSave={handleSave} />}
      </Modal>
    </div>
  );
}

function ProjectForm({ initial, onCancel, onSave }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [uploadingMain, setUploadingMain] = useState(false);
  const fileInput = useRef(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Multi-image upload (gallery)
  const handleAddImages = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingMain(true);
    try {
      const uploaded = await Promise.all(files.map((f) => uploadImage(f, 'projects')));
      set('images', [...(form.images || []), ...uploaded]);
    } catch (err) {
      alert('Gagal mengunggah gambar');
      console.error(err);
    } finally {
      setUploadingMain(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const removeImage = async (idx) => {
    const removed = form.images[idx];
    if (removed?.path) await deleteImage(removed.path);
    set('images', form.images.filter((_, i) => i !== idx));
  };

  // Single-image fields (before / after)
  const handleSingleUpload = async (key, file) => {
    if (!file) {
      // Remove
      const existing = form[key];
      if (existing?.path) await deleteImage(existing.path);
      set(key, null);
      return;
    }
    const old = form[key];
    if (old?.path) await deleteImage(old.path);
    const uploaded = await uploadImage(file, 'projects');
    set(key, uploaded);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title) return alert('Judul wajib diisi');
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <form onSubmit={submit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Judul Proyek" required>
          <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Pemasangan PJU Jl. Industri Raya" />
        </Field>
        <Field label="Lokasi">
          <Input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Surabaya, Jawa Timur" />
        </Field>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Kategori">
          <Select value={form.category} onChange={(e) => set('category', e.target.value)}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Tanggal Selesai">
          <Input type="date" value={form.completedAt || ''} onChange={(e) => set('completedAt', e.target.value)} />
        </Field>
      </div>
      <Field label="Deskripsi" required>
        <TextArea rows={4} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Detail proyek, lingkup pekerjaan, jumlah titik, dll." />
      </Field>

      {/* Gallery */}
      <Field label={`Galeri Foto (${form.images?.length || 0})`} hint="Tambahkan beberapa foto untuk ditampilkan di modal proyek.">
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {form.images?.map((img, i) => (
            <div key={i} className="relative aspect-square rounded-lg bg-slate-100 overflow-hidden group">
              <img src={img.url} alt="" className="w-full h-full object-cover" />
              <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button
            type="button"
            disabled={uploadingMain}
            onClick={() => fileInput.current?.click()}
            className="aspect-square rounded-lg border-2 border-dashed border-slate-300 hover:border-amber-400 flex flex-col items-center justify-center text-slate-400 hover:text-amber-600 transition disabled:opacity-50"
          >
            {uploadingMain ? <Upload className="w-5 h-5 animate-pulse" /> : <ImagePlus className="w-5 h-5" />}
            <span className="text-xs mt-1">{uploadingMain ? 'Mengunggah...' : 'Tambah'}</span>
          </button>
        </div>
        <input ref={fileInput} type="file" accept="image/*" multiple onChange={handleAddImages} className="hidden" />
      </Field>

      {/* Before/After */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ImageUploader
          value={form.beforeImage?.url}
          onChange={(file) => handleSingleUpload('beforeImage', file)}
          label="Foto Sebelum (opsional)"
        />
        <ImageUploader
          value={form.afterImage?.url}
          onChange={(file) => handleSingleUpload('afterImage', file)}
          label="Foto Sesudah (opsional)"
        />
      </div>

      <Field label="Status">
        <Toggle checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} label={form.isActive ? 'Aktif' : 'Tidak aktif'} />
      </Field>

      <div className="flex justify-end gap-2 mt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Batal</Button>
        <Button type="submit" loading={saving}>Simpan</Button>
      </div>
    </form>
  );
}