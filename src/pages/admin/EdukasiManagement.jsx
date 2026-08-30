import { useEffect, useState } from "react";
import { Plus, Save, X, FileText, ShieldCheck, HelpCircle } from "lucide-react";
import {
  AdminPageHeader, Button, Field, Input, TextArea, Select, useToast,
} from "../../components/admin/AdminUI";
import { getEdukasi, saveEdukasi } from "../../services/edukasiService";

const ICON_OPTIONS = [
  { value: "FileText", label: "📄 FileText" },
  { value: "ShieldCheck", label: "🛡️ ShieldCheck" },
  { value: "HelpCircle", label: "❓ HelpCircle" },
];

const EMPTY_ITEM = {
  icon: "FileText",
  title: "",
  summary: "",
  content: "",
};

const EMPTY = {
  badge: "Layanan Online",
  title: "Daftar NIDI & SLO Online",
  subtitle: "",
  ctaLabel: "Daftar Sekarang",
  ctaUrl: "/daftar-nidi-slo",
  items: [],
};

export default function EdukasiManagement() {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { show, Toast } = useToast();

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    (async () => {
      try {
        const d = await getEdukasi();
        if (d) setForm({ ...EMPTY, ...d, items: d.items || [] });
      } catch (err) {
        console.error(err);
        show("Gagal memuat data", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const addItem = () => {
    setForm((f) => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }));
  };

  const updateItem = (idx, patch) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    }));
  };

  const removeItem = (idx) => {
    if (!confirm("Hapus item ini?")) return;
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  };

  const moveItem = (idx, dir) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= form.items.length) return;
    const items = [...form.items];
    [items[idx], items[newIdx]] = [items[newIdx], items[idx]];
    setForm((f) => ({ ...f, items }));
  };

  const handleSave = async () => {
    if (!form.title?.trim()) return alert("Judul section wajib diisi");
    setSaving(true);
    try {
      await saveEdukasi(form);
      show("Tersimpan");
    } catch (err) {
      console.error(err);
      show("Gagal menyimpan", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse mb-6" />
        <div className="h-96 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <Toast />
      <AdminPageHeader
        title="Edukasi NIDI & SLO"
        description="Kelola section edukasi pelanggan di landing page (di bawah hero slider)."
        actions={
          <Button onClick={handleSave} loading={saving}>
            <Save className="w-4 h-4" /> Simpan
          </Button>
        }
      />

      {/* Header section */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4 space-y-3">
        <p className="text-sm font-semibold text-slate-700">Header Section</p>
        <Field label="Badge (label kecil)">
          <Input value={form.badge} onChange={(e) => set("badge", e.target.value)}
            placeholder="Layanan Online" />
        </Field>
        <Field label="Judul" required>
          <Input value={form.title} onChange={(e) => set("title", e.target.value)}
            placeholder="Daftar NIDI & SLO Online" />
        </Field>
        <Field label="Subjudul">
          <TextArea rows={2} value={form.subtitle}
            onChange={(e) => set("subtitle", e.target.value)}
            placeholder="Bingung mulai dari mana? Pelajari dasarnya dulu..." />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Label Tombol Utama">
            <Input value={form.ctaLabel} onChange={(e) => set("ctaLabel", e.target.value)}
              placeholder="Daftar Sekarang" />
          </Field>
          <Field label="Link Tombol Utama">
            <Input value={form.ctaUrl} onChange={(e) => set("ctaUrl", e.target.value)}
              placeholder="/daftar-nidi-slo" />
          </Field>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-slate-700">
            Accordion Items ({form.items.length})
          </p>
          <Button variant="outline" onClick={addItem}>
            <Plus className="w-4 h-4" /> Tambah Item
          </Button>
        </div>

        {form.items.length === 0 ? (
          <p className="text-sm text-slate-400 italic text-center py-8 border border-dashed border-slate-200 rounded-lg">
            Belum ada item. Tambahkan minimal 1 (mis. "Apa itu NIDI?").
          </p>
        ) : (
          <div className="space-y-3">
            {form.items.map((item, i) => (
              <ItemRow
                key={i}
                index={i}
                total={form.items.length}
                item={item}
                onChange={(patch) => updateItem(i, patch)}
                onRemove={() => removeItem(i)}
                onMoveUp={() => moveItem(i, -1)}
                onMoveDown={() => moveItem(i, 1)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ItemRow({ index, total, item, onChange, onRemove, onMoveUp, onMoveDown }) {
  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-3">
      <div className="flex items-start gap-2">
        <div className="flex flex-col gap-1">
          <button type="button" onClick={onMoveUp} disabled={index === 0}
            className="text-slate-400 hover:text-slate-700 disabled:opacity-30 text-xs px-1">▲</button>
          <button type="button" onClick={onMoveDown} disabled={index === total - 1}
            className="text-slate-400 hover:text-slate-700 disabled:opacity-30 text-xs px-1">▼</button>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Icon">
            <Select value={item.icon} onChange={(e) => onChange({ icon: e.target.value })}>
              {ICON_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </Field>
          <div className="md:col-span-2">
            <Field label="Judul">
              <Input value={item.title} onChange={(e) => onChange({ title: e.target.value })}
                placeholder="Apa itu NIDI?" />
            </Field>
          </div>
        </div>

        <button type="button" onClick={onRemove}
          className="text-red-500 hover:bg-red-50 rounded p-1.5 ml-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      <Field label="Ringkasan (1 baris)">
        <Input value={item.summary} onChange={(e) => onChange({ summary: e.target.value })}
          placeholder="Nomor Identitas Instalasi — wajib untuk..." />
      </Field>

      <Field label="Konten Lengkap" hint="Pakai baris baru untuk paragraf. Daftar pakai •, ✓, atau angka.">
        <TextArea rows={6} value={item.content} onChange={(e) => onChange({ content: e.target.value })}
          placeholder={"NIDI (Nomor Identifikasi Instalasi) adalah...\n\nKapan butuh NIDI?\n• Pasang baru\n• Tambah daya"} />
      </Field>
    </div>
  );
}