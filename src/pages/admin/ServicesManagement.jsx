// src/pages/admin/ServicesManagement.jsx
//
// Grouped service management:
// - Items are grouped by `category` field (electrical / legal / material / iot)
// - Drag-and-drop reorder works WITHIN a category
// - Adding/editing requires picking a category from dropdown
// - Backward compatible: items without `category` show under "Lainnya"

import { useEffect, useMemo, useState } from 'react';
import { Plus, Edit2, Trash2, GripVertical, Eye, EyeOff, Smartphone, Monitor } from 'lucide-react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, arrayMove, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import {
  getAllServices, createService, updateService, deleteService,
  uploadImage, deleteImage,
} from '../../services/contentService';
import { invalidateContent } from '../../hooks/useContent';
import {
  AdminPageHeader, Button, Modal, Field, Input, TextArea, Select,
  Toggle, ImageUploader, EmptyState, useToast,
} from '../../components/admin/AdminUI';
import {
  SERVICE_CATEGORIES,
  getCategoryMeta,
} from '../../constants/serviceCategories';

const ICON_OPTIONS = [
  // Electrical
  { value: 'bolt',       label: 'Bolt (Petir)' },
  { value: 'zap',        label: 'Zap (Listrik)' },
  { value: 'lightbulb',  label: 'Lampu / PJU' },
  { value: 'plug',       label: 'Plug (Instalasi)' },
  { value: 'cable',      label: 'Kabel' },
  { value: 'cpu',        label: 'CPU/Panel/Cubicle' },
  { value: 'wrench',     label: 'Perawatan / Servis' },
  { value: 'shield',     label: 'Keamanan / Proteksi' },
  { value: 'activity',   label: 'Monitoring / Relay' },
  // Legal & Material
  { value: 'file-check', label: 'Sertifikat / Dokumen' },
  { value: 'factory',    label: 'Industri' },
  { value: 'home',       label: 'Rumah Tangga' },
  // Software & Digital
  { value: 'monitor',    label: 'Monitor / Aplikasi' },
  { value: 'globe',      label: 'Website / Web' },
  { value: 'smartphone', label: 'Mobile App' },
  { value: 'database',   label: 'Database / WMS' },
  { value: 'settings',   label: 'CMMS / Konfigurasi' },
  { value: 'code',       label: 'Kode / Custom Dev' },
  { value: 'layout',     label: 'Dashboard / ERP' },
  { value: 'server',     label: 'Server / Cloud' },
];

const EMPTY = {
  title: '',
  description: '',
  icon: 'bolt',
  image: '',
  imagePath: '',
  category: 'electrical',
  isActive: true,
};

const ACCENT_CLASSES = {
  emerald: { ring: 'ring-emerald-200', text: 'text-emerald-700', bg: 'bg-emerald-50',  dot: 'bg-emerald-500'  },
  sky:     { ring: 'ring-sky-200',     text: 'text-sky-700',     bg: 'bg-sky-50',      dot: 'bg-sky-500'      },
  amber:   { ring: 'ring-amber-200',   text: 'text-amber-700',   bg: 'bg-amber-50',    dot: 'bg-amber-500'    },
  violet:  { ring: 'ring-violet-200',  text: 'text-violet-700',  bg: 'bg-violet-50',   dot: 'bg-violet-500'   },
  indigo:  { ring: 'ring-indigo-200',  text: 'text-indigo-700',  bg: 'bg-indigo-50',   dot: 'bg-indigo-500'   },
  slate:   { ring: 'ring-slate-200',   text: 'text-slate-700',   bg: 'bg-slate-100',   dot: 'bg-slate-400'    },
};
const accent = (key) => ACCENT_CLASSES[key] || ACCENT_CLASSES.slate;

export default function ServicesManagement() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const { show, Toast } = useToast();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const load = async () => {
    setLoading(true);
    try { setItems(await getAllServices()); }
    catch { show('Gagal memuat data', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const grouped = useMemo(() => {
    const map = new Map();
    SERVICE_CATEGORIES.forEach((c) => map.set(c.key, []));
    items.forEach((it) => {
      const key = it.category || 'electrical';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(it);
    });
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    return map;
  }, [items]);

  const handleSave = async (form, file) => {
    let imageData = { url: form.image, path: form.imagePath };
    if (file) {
      if (editing?.id && editing.imagePath) await deleteImage(editing.imagePath);
      imageData = await uploadImage(file, 'services');
    }
    const meta = getCategoryMeta(form.category);
    const payload = {
      ...form,
      image: imageData.url || '',
      imagePath: imageData.path || '',
      category: form.category,
      categoryTitle: meta.title,
    };
    if (editing?.id) {
      await updateService(editing.id, payload);
    } else {
      const sameCat = items.filter((i) => (i.category || 'electrical') === form.category);
      await createService({ ...payload, order: sameCat.length });
    }
    show('Tersimpan');
    invalidateContent('services');
    setModalOpen(false);
    load();
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Hapus layanan "${item.title}"?`)) return;
    await deleteService(item.id, item.imagePath);
    invalidateContent('services');
    show('Layanan dihapus');
    load();
  };

  const handleToggle = async (item) => {
    await updateService(item.id, { isActive: !item.isActive });
    invalidateContent('services');
    load();
  };

  const handleDragEnd = (categoryKey) => async ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const list = grouped.get(categoryKey) || [];
    const oldIdx = list.findIndex((s) => s.id === active.id);
    const newIdx = list.findIndex((s) => s.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const next = arrayMove(list, oldIdx, newIdx);

    const map = new Map(grouped);
    map.set(categoryKey, next);
    const flat = [];
    SERVICE_CATEGORIES.forEach((c) => flat.push(...(map.get(c.key) || [])));
    [...map.entries()].forEach(([k, arr]) => {
      if (!SERVICE_CATEGORIES.find((c) => c.key === k)) flat.push(...arr);
    });
    setItems(flat);

    await Promise.all(next.map((s, i) => updateService(s.id, { order: i })));
    invalidateContent('services');
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <Toast />
      <AdminPageHeader
        title="Layanan"
        description="Kelola daftar layanan yang ditampilkan di landing page, dikelompokkan per kategori."
        actions={
          <Button onClick={() => { setEditing(EMPTY); setModalOpen(true); }}>
            <Plus className="w-4 h-4" /> Tambah Layanan
          </Button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : !items.length ? (
        <EmptyState
          title="Belum ada layanan"
          description="Tambahkan layanan pertama agar muncul di landing page."
          action={
            <Button onClick={() => { setEditing(EMPTY); setModalOpen(true); }}>
              <Plus className="w-4 h-4" /> Tambah
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {SERVICE_CATEGORIES.map((cat) => (
            <CategoryGroup
              key={cat.key}
              meta={cat}
              list={grouped.get(cat.key) || []}
              sensors={sensors}
              onDragEnd={handleDragEnd(cat.key)}
              onEdit={(it) => { setEditing(it); setModalOpen(true); }}
              onDelete={handleDelete}
              onToggle={handleToggle}
              onAdd={() => {
                setEditing({ ...EMPTY, category: cat.key });
                setModalOpen(true);
              }}
            />
          ))}

          {[...grouped.keys()]
            .filter((k) => !SERVICE_CATEGORIES.find((c) => c.key === k))
            .map((k) => (
              <CategoryGroup
                key={k}
                meta={getCategoryMeta(k)}
                list={grouped.get(k) || []}
                sensors={sensors}
                onDragEnd={handleDragEnd(k)}
                onEdit={(it) => { setEditing(it); setModalOpen(true); }}
                onDelete={handleDelete}
                onToggle={handleToggle}
                onAdd={() => {
                  setEditing({ ...EMPTY, category: k });
                  setModalOpen(true);
                }}
              />
            ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing?.id ? 'Edit Layanan' : 'Tambah Layanan'}
      >
        {editing && (
          <ServiceForm
            initial={editing}
            onCancel={() => setModalOpen(false)}
            onSave={handleSave}
          />
        )}
      </Modal>
    </div>
  );
}

function CategoryGroup({ meta, list, sensors, onDragEnd, onEdit, onDelete, onToggle, onAdd }) {
  const a = accent(meta.accent);
  return (
    <section className={`rounded-2xl bg-white ring-1 ${a.ring} p-5`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`w-2.5 h-2.5 rounded-full ${a.dot}`} />
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 truncate">{meta.title}</h3>
            {meta.subtitle && <p className="text-xs text-slate-500 truncate">{meta.subtitle}</p>}
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${a.bg} ${a.text} font-medium`}>
            {list.length}
          </span>
        </div>
        <Button variant="ghost" onClick={onAdd}>
          <Plus className="w-4 h-4" /> Tambah
        </Button>
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-slate-400 italic px-2 py-6 text-center bg-slate-50 rounded-lg">
          Belum ada item di kategori ini.
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={list.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {list.map((item) => (
                <ServiceRow
                  key={item.id}
                  item={item}
                  onEdit={() => onEdit(item)}
                  onDelete={() => onDelete(item)}
                  onToggle={() => onToggle(item)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}

function ServiceRow({ item, onEdit, onDelete, onToggle }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3 hover:border-amber-300 transition"
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-400">
        <GripVertical className="w-5 h-5" />
      </button>
      <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
        {item.image
          ? <img src={item.image} alt="" className="w-full h-full object-cover rounded-lg" />
          : <span className="text-[10px] font-mono">{item.icon}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-900 truncate text-sm">{item.title}</p>
        <p className="text-xs text-slate-500 truncate">{item.description}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={onToggle}
          className={`p-1.5 rounded-lg ${item.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
          title={item.isActive ? 'Aktif' : 'Tidak aktif'}
        >
          {item.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
        <Button variant="outline" onClick={onEdit}><Edit2 className="w-4 h-4" /></Button>
        <Button variant="ghost" onClick={onDelete} className="hover:!bg-red-50 hover:!text-red-600">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function ServiceForm({ initial, onCancel, onSave }) {
  const [form, setForm] = useState({ ...initial, category: initial.category || 'electrical' });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title) return alert('Judul wajib diisi');
    if (!form.category) return alert('Pilih kategori dulu');
    setSaving(true);
    await onSave(form, file);
    setSaving(false);
  };

  return (
    <form onSubmit={submit}>
      <Field label="Kategori" required hint="Akan menentukan kelompok mana layanan ini muncul di landing page.">
        <Select value={form.category} onChange={(e) => set('category', e.target.value)}>
          {SERVICE_CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>{c.title}</option>
          ))}
        </Select>
      </Field>

      <Field label="Judul Layanan" required>
        <Input
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Contoh: Pemasangan Lampu PJU"
        />
      </Field>

      <Field label="Deskripsi" required>
        <TextArea
          rows={4}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Jelaskan layanan dalam 2-3 kalimat..."
        />
      </Field>

      <Field label="Ikon" hint="Akan dipakai jika Anda tidak meng-upload gambar.">
        <Select value={form.icon} onChange={(e) => set('icon', e.target.value)}>
          {ICON_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      </Field>

      <ImageUploader
        value={form.image}
        onChange={setFile}
        label="Gambar (opsional, akan menggantikan ikon)"
        aspect="aspect-video"
      />

      <Field label="Status">
        <Toggle
          checked={form.isActive}
          onChange={(e) => set('isActive', e.target.checked)}
          label={form.isActive ? 'Aktif' : 'Tidak aktif'}
        />
      </Field>

      <div className="flex justify-end gap-2 mt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Batal</Button>
        <Button type="submit" loading={saving}>Simpan</Button>
      </div>
    </form>
  );
}