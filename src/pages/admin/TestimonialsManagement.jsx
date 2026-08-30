// src/pages/admin/TestimonialsManagement.jsx
import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Eye, EyeOff, Star } from 'lucide-react';

import {
  getAllTestimonials, createTestimonial, updateTestimonial, deleteTestimonial,
  uploadImage, deleteImage,
} from '../../services/contentService';
import { invalidateContent } from '../../hooks/useContent';
import {
  AdminPageHeader, Button, Modal, Field, Input, TextArea,
  Toggle, ImageUploader, EmptyState, useToast,
} from '../../components/admin/AdminUI';

const EMPTY = {
  name: '', role: '', company: '', review: '', rating: 5,
  photo: '', photoPath: '', isActive: true,
};

export default function TestimonialsManagement() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const { show, Toast } = useToast();

  const load = async () => {
    setLoading(true);
    try { setItems(await getAllTestimonials()); }
    catch { show('Gagal memuat data', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (form, file) => {
    let photoData = { url: form.photo, path: form.photoPath };
    if (file) {
      if (editing?.id && editing.photoPath) await deleteImage(editing.photoPath);
      photoData = await uploadImage(file, 'testimonials');
    }
    const payload = { ...form, photo: photoData.url || '', photoPath: photoData.path || '' };
    if (editing?.id) await updateTestimonial(editing.id, payload);
    else await createTestimonial({ ...payload, order: items.length });
    invalidateContent('testimonials');
    show('Tersimpan');
    setModalOpen(false);
    load();
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Hapus testimoni dari "${item.name}"?`)) return;
    await deleteTestimonial(item.id, item.photoPath);
    invalidateContent('testimonials');
    show('Dihapus');
    load();
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <Toast />
      <AdminPageHeader
        title="Testimoni"
        description="Kelola testimoni klien yang ditampilkan di landing page."
        actions={<Button onClick={() => { setEditing(EMPTY); setModalOpen(true); }}><Plus className="w-4 h-4" /> Tambah</Button>}
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-40 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : !items.length ? (
        <EmptyState
          title="Belum ada testimoni"
          description="Tambahkan testimoni pertama untuk membangun trust."
          action={<Button onClick={() => { setEditing(EMPTY); setModalOpen(true); }}><Plus className="w-4 h-4" /> Tambah</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {items.map((t) => (
            <div key={t.id} className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-start gap-4">
                {t.photo ? (
                  <img src={t.photo} alt={t.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold flex-shrink-0">
                    {t.name?.charAt(0)?.toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="font-semibold text-slate-900 truncate">{t.name}</p>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i < (t.rating || 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">{t.role}{t.company && ` · ${t.company}`}</p>
                  <p className="text-sm text-slate-600 line-clamp-3 mb-3">{t.review}</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => { await updateTestimonial(t.id, { isActive: !t.isActive }); invalidateContent('testimonials'); load(); }}
                      className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${t.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                    >
                      {t.isActive ? <><Eye className="w-3 h-3" /> Aktif</> : <><EyeOff className="w-3 h-3" /> Non-aktif</>}
                    </button>
                    <Button variant="outline" onClick={() => { setEditing(t); setModalOpen(true); }} className="!px-2 !py-1 ml-auto">
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" onClick={() => handleDelete(t)} className="!px-2 !py-1 hover:!bg-red-50 hover:!text-red-600">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing?.id ? 'Edit Testimoni' : 'Tambah Testimoni'}>
        {editing && <TestimonialForm initial={editing} onCancel={() => setModalOpen(false)} onSave={handleSave} />}
      </Modal>
    </div>
  );
}

function TestimonialForm({ initial, onCancel, onSave }) {
  const [form, setForm] = useState(initial);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.review) return alert('Nama dan testimoni wajib diisi');
    setSaving(true);
    await onSave(form, file);
    setSaving(false);
  };

  return (
    <form onSubmit={submit}>
      <ImageUploader value={form.photo} onChange={setFile} label="Foto klien" aspect="aspect-square" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Nama" required><Input value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Jabatan / Role"><Input value={form.role} onChange={(e) => set('role', e.target.value)} placeholder="Direktur Utama" /></Field>
      </div>
      <Field label="Perusahaan"><Input value={form.company} onChange={(e) => set('company', e.target.value)} placeholder="PT Abadi Sentosa" /></Field>
      <Field label="Testimoni" required>
        <TextArea rows={4} value={form.review} onChange={(e) => set('review', e.target.value)} placeholder="Tulis testimoni klien..." />
      </Field>
      <Field label={`Rating: ${form.rating} ★`}>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => set('rating', n)} className="p-1">
              <Star className={`w-7 h-7 ${n <= form.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
            </button>
          ))}
        </div>
      </Field>
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