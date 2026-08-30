// src/pages/admin/SlidesManagement.jsx
// Admin page for managing the hero slider. Supports CRUD, image upload,
// drag-and-drop reordering, and active/inactive toggling.

import { useEffect, useState } from 'react';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Edit2, Trash2, GripVertical, Eye, EyeOff, Smartphone, Monitor, X } from 'lucide-react';

import {
    getAllSlides,
    createSlide,
    updateSlide,
    deleteSlide,
    reorderSlides,
    uploadImage,
    deleteImage,
} from '../../services/contentService';
import { invalidateContent } from '../../hooks/useContent';
import {
    AdminPageHeader,
    Button,
    Modal,
    Field,
    Input,
    TextArea,
    Select,
    Toggle,
    ImageUploader,
    EmptyState,
    useToast,
} from '../../components/admin/AdminUI';

const EMPTY_SLIDE = {
    title: '', eyebrow: '', subtitle: '', chips: [],
    type: 'image', mockupType: 'dashboard',
    ctaText: 'Hubungi Kami', ctaLink: '#contact',
    isActive: true, image: '', imagePath: '',
};

const MOCKUP_LABELS = { dashboard: 'Dashboard', mobile: 'Mobile & ERP', integration: 'Integrasi API' };

const DEFAULT_PROMO_SLIDES = [
    {
        type: 'promo', mockupType: 'dashboard',
        eyebrow: 'PT Adytia Putra Teknik',
        title: 'Sistem Manajemen Web untuk Operasional yang Lebih Efisien',
        subtitle: 'Dashboard dan admin panel terpusat untuk mengelola data, proses, dan tim perusahaan dalam satu platform terintegrasi.',
        chips: ['Web Dashboard', 'Admin Panel', 'Laporan Real-time'],
        isActive: true, image: '', imagePath: '', ctaText: 'Konsultasi Gratis', ctaLink: '#contact',
    },
    {
        type: 'promo', mockupType: 'mobile',
        eyebrow: 'PT Adytia Putra Teknik',
        title: 'Aplikasi Mobile & Custom Software / ERP',
        subtitle: 'Solusi terukur — dari aplikasi mobile hingga sistem ERP yang dirancang mengikuti alur kerja bisnis Anda.',
        chips: ['Aplikasi Mobile', 'Custom ERP', 'Otomasi Proses'],
        isActive: true, image: '', imagePath: '', ctaText: 'Konsultasi Gratis', ctaLink: '#contact',
    },
    {
        type: 'promo', mockupType: 'integration',
        eyebrow: 'PT Adytia Putra Teknik',
        title: 'Desain UI/UX & Integrasi API yang Mulus',
        subtitle: 'Pengalaman pengguna yang elegan dipadukan integrasi sistem yang andal, siap untuk skala perusahaan.',
        chips: ['UI/UX Design', 'Integrasi API', 'Company Profile'],
        isActive: true, image: '', imagePath: '', ctaText: 'Konsultasi Gratis', ctaLink: '#contact',
    },
];

export default function SlidesManagement() {
    const [slides, setSlides] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const { show, Toast } = useToast();

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

    const load = async () => {
        setLoading(true);
        try {
            setSlides(await getAllSlides());
        } catch (err) {
            show('Gagal memuat slides', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const openCreate = () => { setEditing({ ...EMPTY_SLIDE, order: slides.length }); setModalOpen(true); };
    const openEdit = (slide) => { setEditing(slide); setModalOpen(true); };

    const handleSave = async (form, file) => {
        try {
            let imageData = { url: form.image, path: form.imagePath };
            if (file) {
                // If updating and there was an old image, remove it
                if (editing?.id && editing.imagePath) await deleteImage(editing.imagePath);
                const uploaded = await uploadImage(file, 'slides');
                imageData = uploaded;
            }
            const payload = {
                ...form,
                image: imageData.url,
                imagePath: imageData.path,
            };
            if (editing?.id) {
                await updateSlide(editing.id, payload);
                show('Slide berhasil diperbarui');
            } else {
                await createSlide(payload);
                show('Slide berhasil ditambahkan');
            }
            setModalOpen(false);
            invalidateContent('slides');
            load();
        } catch (err) {
            console.error(err);
            show('Gagal menyimpan slide', 'error');
        }
    };

    const handleDelete = async (slide) => {
        if (!window.confirm(`Hapus slide "${slide.title}"?`)) return;
        try {
            await deleteSlide(slide.id, slide.imagePath);
            show('Slide dihapus');
            invalidateContent('slides');
            load();
        } catch {
            show('Gagal menghapus', 'error');
        }
    };

    const toggleActive = async (slide) => {
        await updateSlide(slide.id, { isActive: !slide.isActive });
        invalidateContent('slides');
        load();
    };

    const handleSeedPromo = async () => {
        if (!window.confirm('Tambahkan 3 promo slide (Dashboard, Mobile & ERP, Integrasi API) ke slider?')) return;
        try {
            const baseOrder = slides.length;
            for (let i = 0; i < DEFAULT_PROMO_SLIDES.length; i++) {
                await createSlide({ ...DEFAULT_PROMO_SLIDES[i], order: baseOrder + i });
            }
            show('3 promo slide berhasil ditambahkan');
            invalidateContent('slides');
            load();
        } catch {
            show('Gagal membuat promo slide', 'error');
        }
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIdx = slides.findIndex((s) => s.id === active.id);
        const newIdx = slides.findIndex((s) => s.id === over.id);
        const next = arrayMove(slides, oldIdx, newIdx);
        setSlides(next);
        try {
            await reorderSlides(next.map((s) => s.id));
            invalidateContent('slides');
            show('Urutan disimpan');
        } catch {
            show('Gagal menyimpan urutan', 'error');
            load(); // rollback
        }
    };

    return (
        <div className="p-6 lg:p-8 max-w-6xl mx-auto">
            <Toast />
            <AdminPageHeader
                title="Hero Slider"
                description="Kelola slide yang tampil di bagian atas halaman utama. Seret untuk mengubah urutan."
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleSeedPromo} title="Buat 3 slide promosi (dashboard, mobile, API)">
                            <Plus className="w-4 h-4" /> Buat Promo Slide
                        </Button>
                        <Button onClick={openCreate}>
                            <Plus className="w-4 h-4" /> Tambah Slide
                        </Button>
                    </div>
                }
            />

            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : !slides.length ? (
                <EmptyState
                    title="Belum ada slide"
                    description="Tambahkan slide pertama untuk menampilkan hero slider di landing page."
                    action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> Tambah Slide</Button>}
                />
            ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={slides.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-3">
                            {slides.map((slide) => (
                                <SlideRow
                                    key={slide.id}
                                    slide={slide}
                                    onEdit={openEdit}
                                    onDelete={handleDelete}
                                    onToggle={toggleActive}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}

            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editing?.id ? 'Edit Slide' : 'Tambah Slide Baru'}
                size="lg"
            >
                {editing && <SlideForm initial={editing} onCancel={() => setModalOpen(false)} onSave={handleSave} />}
            </Modal>
        </div>
    );
}

function SlideRow({ slide, onEdit, onDelete, onToggle }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slide.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 hover:border-amber-300 transition"
        >
            <button
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600"
                aria-label="Geser"
            >
                <GripVertical className="w-5 h-5" />
            </button>

            <div className="w-24 h-16 rounded-lg flex-shrink-0 overflow-hidden">
                {slide.type === 'promo' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1 rounded-lg" style={{ background: '#221d19' }}>
                        <span className="text-[10px] font-semibold" style={{ color: '#ee7a3c' }}>PROMO</span>
                        <span className="text-[9px]" style={{ color: '#9a8c7f' }}>{MOCKUP_LABELS[slide.mockupType] || slide.mockupType}</span>
                    </div>
                ) : slide.image ? (
                    <img src={slide.image} alt="" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 bg-slate-100 rounded-lg">
                        Tidak ada gambar
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-slate-900 truncate">{slide.title || '—'}</p>
                    {slide.type === 'promo' && (
                        <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Promo</span>
                    )}
                </div>
                <p className="text-sm text-slate-500 truncate">{slide.subtitle}</p>
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={() => onToggle(slide)}
                    className={`p-2 rounded-lg ${slide.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                    title={slide.isActive ? 'Aktif' : 'Tidak aktif'}
                >
                    {slide.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <Button variant="outline" onClick={() => onEdit(slide)}>
                    <Edit2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" onClick={() => onDelete(slide)} className="hover:!bg-red-50 hover:!text-red-600">
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}

function SlideForm({ initial, onCancel, onSave }) {
    const [form, setForm] = useState({
        ...initial,
        buttons: initial.buttons || [],
        chips: initial.chips || [],
    });
    const [file, setFile] = useState(null);
    const [saving, setSaving] = useState(false);
    const [chipInput, setChipInput] = useState('');
    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    const addChip = () => {
        const val = chipInput.trim();
        if (!val) return;
        if (form.chips.length >= 6) return;
        if (form.chips.includes(val)) { setChipInput(''); return; }
        setForm((f) => ({ ...f, chips: [...f.chips, val] }));
        setChipInput('');
    };

    const removeChip = (idx) => setForm((f) => ({ ...f, chips: f.chips.filter((_, i) => i !== idx) }));

    const addButton = () => {
        if (form.buttons.length >= 3) return alert("Maksimal 3 tombol per slide");
        setForm((f) => ({
            ...f,
            buttons: [...f.buttons, { label: "", url: "", style: "primary" }],
        }));
    };

    const updateButton = (idx, patch) => {
        setForm((f) => ({
            ...f,
            buttons: f.buttons.map((b, i) => (i === idx ? { ...b, ...patch } : b)),
        }));
    };

    const removeButton = (idx) => {
        setForm((f) => ({
            ...f,
            buttons: f.buttons.filter((_, i) => i !== idx),
        }));
    };

    const submit = async (e) => {
        e.preventDefault();
        if (!form.title) return alert('Judul wajib diisi');

        const cleanButtons = form.buttons.filter(b => b.label?.trim() && b.url?.trim());
        const cleanChips = form.chips.filter(c => c.trim());

        setSaving(true);
        await onSave({ ...form, buttons: cleanButtons, chips: cleanChips }, file);
        setSaving(false);
    };

    const isPromo = form.type === 'promo';

    return (
        <form onSubmit={submit}>
            {/* Tipe slide */}
            <Field label="Tipe Slide">
                <Select value={form.type || 'image'} onChange={(e) => set('type', e.target.value)}>
                    <option value="image">Slide Foto — background gambar + teks overlay</option>
                    <option value="promo">Slide Promo — latar gelap + mockup visual</option>
                </Select>
            </Field>

            {/* Mockup type — hanya untuk promo */}
            {isPromo && (
                <Field label="Mockup Visual" hint="Visual yang tampil di sisi kanan slide.">
                    <Select value={form.mockupType || 'dashboard'} onChange={(e) => set('mockupType', e.target.value)}>
                        <option value="dashboard">Dashboard Operasional</option>
                        <option value="mobile">Mobile & ERP (tabel karyawan + phone)</option>
                        <option value="integration">Integrasi API (form card + floating chips)</option>
                    </Select>
                </Field>
            )}

            {/* Background gambar — hanya untuk slide foto */}
            {!isPromo && (
                <ImageUploader value={form.image} onChange={setFile} label="Background Slide" aspect="aspect-[16/7]" />
            )}

            <Field label="Judul" required>
                <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Contoh: Solusi Listrik Industri Terpercaya" />
            </Field>

            <Field label="Eyebrow" hint="Tampil kecil di atas title — uppercase amber, tracking-widest. Opsional.">
                <Input value={form.eyebrow || ''} onChange={(e) => set('eyebrow', e.target.value)} placeholder="APT SERVICE VEHICLE" />
            </Field>

            <Field label="Subjudul">
                <TextArea rows={2} value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)} placeholder="Deskripsi singkat..." />
            </Field>

            {/* ============ CHIPS ============ */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Chips <span className="text-slate-400 font-normal">({form.chips.length}/6)</span>
                </label>
                <p className="text-xs text-slate-500 mb-2">
                    Label kecil yang tampil di bawah deskripsi — khusus untuk slide promosi (tanpa foto). Opsional.
                </p>

                {/* Tag yang sudah ditambahkan */}
                {form.chips.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                        {form.chips.map((chip, i) => (
                            <span
                                key={i}
                                className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-full"
                            >
                                {chip}
                                <button
                                    type="button"
                                    onClick={() => removeChip(i)}
                                    className="text-amber-500 hover:text-red-500 transition-colors"
                                    aria-label={`Hapus chip ${chip}`}
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </span>
                        ))}
                    </div>
                )}

                {/* Input tambah chip */}
                {form.chips.length < 6 && (
                    <div className="flex gap-2">
                        <Input
                            value={chipInput}
                            onChange={(e) => setChipInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addChip(); } }}
                            placeholder="mis. Web Dashboard, Admin Panel…"
                            className="flex-1"
                        />
                        <Button type="button" variant="outline" onClick={addChip} className="!px-3 shrink-0">
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                )}
            </div>

            {/* ============ TOMBOL CTA — array baru ============ */}
            <div className="mb-4 border border-slate-200 rounded-lg p-4 bg-slate-50">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <p className="text-sm font-medium text-slate-700">Tombol CTA ({form.buttons.length}/3)</p>
                        <p className="text-xs text-slate-500">
                            Kalau diisi, akan menggantikan tombol Legacy di bawah.
                        </p>
                    </div>
                    <Button type="button" variant="outline" onClick={addButton} className="!px-2 !py-1">
                        <Plus className="w-3.5 h-3.5" /> Tambah
                    </Button>
                </div>

                {form.buttons.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-4">
                        Belum ada tombol. Tambah untuk override CTA legacy.
                    </p>
                ) : (
                    <div className="space-y-2">
                        {form.buttons.map((btn, i) => (
                            <ButtonRow
                                key={i}
                                button={btn}
                                onChange={(patch) => updateButton(i, patch)}
                                onRemove={() => removeButton(i)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* ============ LEGACY CTA (warning ditandai) ============ */}
            <details className="mb-4">
                <summary className="text-xs text-slate-500 cursor-pointer select-none mb-2">
                    ⚠️ Pengaturan CTA Legacy (single button) — diabaikan jika array tombol di atas berisi
                </summary>
                <div className="grid grid-cols-2 gap-4 mt-2 pl-3 border-l-2 border-slate-200">
                    <Field label="Teks Tombol CTA">
                        <Input value={form.ctaText} onChange={(e) => set('ctaText', e.target.value)} placeholder="Hubungi Kami" />
                    </Field>
                    <Field label="Link CTA">
                        <Input value={form.ctaLink} onChange={(e) => set('ctaLink', e.target.value)} placeholder="#contact atau https://..." />
                    </Field>
                </div>
            </details>

            {!isPromo && (
                <>
                    <FocalPointPicker
                        label="Posisi Fokus Mobile"
                        hint="Geser titik untuk menentukan bagian gambar yang harus tetap terlihat di layar HP."
                        icon={<Smartphone className="w-4 h-4" />}
                        imageSrc={file ? URL.createObjectURL(file) : form.image}
                        value={form.focalPointMobile || '30% center'}
                        onChange={(v) => set('focalPointMobile', v)}
                        aspect="aspect-[9/16]"
                    />
                    <FocalPointPicker
                        label="Posisi Fokus Desktop"
                        hint="Untuk layar lebar — biasanya 'center' sudah cukup."
                        icon={<Monitor className="w-4 h-4" />}
                        imageSrc={file ? URL.createObjectURL(file) : form.image}
                        value={form.focalPointDesktop || 'center'}
                        onChange={(v) => set('focalPointDesktop', v)}
                        aspect="aspect-[16/7]"
                    />
                </>
            )}

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

function ButtonRow({ button, onChange, onRemove }) {
    return (
        <div className="bg-white border border-slate-200 rounded-lg p-3 grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
            <div className="md:col-span-4">
                <Input
                    value={button.label || ""}
                    onChange={(e) => onChange({ label: e.target.value })}
                    placeholder="Label (mis. Daftar NIDI)"
                />
            </div>
            <div className="md:col-span-5">
                <Input
                    value={button.url || ""}
                    onChange={(e) => onChange({ url: e.target.value })}
                    placeholder="/path, #anchor, atau https://..."
                />
            </div>
            <div className="md:col-span-2">
                <Select
                    value={button.style || "primary"}
                    onChange={(e) => onChange({ style: e.target.value })}
                >
                    <option value="primary">Primary (kuning)</option>
                    <option value="outline">Outline (kuning border)</option>
                    <option value="glass">Glass (transparan)</option>
                    <option value="secondary">Secondary (gelap)</option>
                </Select>
            </div>
            <div className="md:col-span-1 flex justify-end">
                <button
                    type="button"
                    onClick={onRemove}
                    className="text-red-500 hover:bg-red-50 rounded p-2"
                    title="Hapus tombol"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
function FocalPointPicker({ label, hint, icon, imageSrc, value, onChange, aspect = 'aspect-video' }) {
    const parsePos = (str) => {
        if (!str) return { x: 50, y: 50 };
        const parts = String(str).trim().split(/\s+/);
        const toPct = (s) => {
            if (s === 'center') return 50;
            if (s === 'left' || s === 'top') return 0;
            if (s === 'right' || s === 'bottom') return 100;
            const n = parseFloat(s);
            return isNaN(n) ? 50 : n;
        };
        return {
            x: toPct(parts[0] ?? '50%'),
            y: toPct(parts[1] ?? '50%'),
        };
    };

    const { x, y } = parsePos(value);

    const handleClick = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const px = ((e.clientX - rect.left) / rect.width) * 100;
        const py = ((e.clientY - rect.top) / rect.height) * 100;
        onChange(`${px.toFixed(0)}% ${py.toFixed(0)}%`);
    };

    return (
        <div className="mb-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                {icon} {label}
            </label>

            {imageSrc ? (
                <div
                    onClick={handleClick}
                    className={`relative ${aspect} bg-slate-100 rounded-lg overflow-hidden cursor-crosshair border`}
                >
                    <img
                        src={imageSrc}
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ objectPosition: value }}
                    />

                    <div
                        className="absolute pointer-events-none"
                        style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)' }}
                    >
                        <div className="w-6 h-6 rounded-full border-2 border-amber-400 bg-amber-400/20" />
                    </div>
                </div>
            ) : (
                <div className={`${aspect} bg-slate-100 flex items-center justify-center text-xs`}>
                    Upload gambar dulu
                </div>
            )}
        </div>
    );
}