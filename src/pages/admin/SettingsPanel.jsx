// src/pages/admin/SettingsPanel.jsx
// Global site settings: contact info, CTA texts, SEO meta, socials.

import { useEffect, useRef, useState } from 'react';
import { Save, Smartphone, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase/config';

import { getSettings, updateSettings, DEFAULT_SETTINGS } from '../../services/contentService';
import { invalidateContent } from '../../hooks/useContent';
import {
  AdminPageHeader, Button, Field, Input, TextArea, useToast,
} from '../../components/admin/AdminUI';

export default function SettingsPanel() {
  const [form, setForm] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { show, Toast } = useToast();

  useEffect(() => {
    (async () => {
      try { setForm(await getSettings()); }
      catch { show('Gagal memuat pengaturan', 'error'); }
      finally { setLoading(false); }
    })();
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setNested = (parent, k, v) => setForm((f) => ({ ...f, [parent]: { ...(f[parent] || {}), [k]: v } }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings(form);
      invalidateContent('settings');
      show('Pengaturan disimpan');
    } catch {
      show('Gagal menyimpan', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8"><div className="h-96 bg-slate-100 rounded-2xl animate-pulse" /></div>;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <Toast />
      <AdminPageHeader
        title="Pengaturan Umum"
        description="Informasi perusahaan, kontak, dan SEO yang dipakai di seluruh landing page."
        actions={<Button onClick={handleSubmit} loading={saving}><Save className="w-4 h-4" /> Simpan Perubahan</Button>}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card title="Informasi Perusahaan">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nama Perusahaan" required>
              <Input value={form.companyName || ''} onChange={(e) => set('companyName', e.target.value)} />
            </Field>
            <Field label="Tagline">
              <Input value={form.tagline || ''} onChange={(e) => set('tagline', e.target.value)} />
            </Field>
          </div>
          <Field label="Deskripsi Singkat">
            <TextArea rows={3} value={form.description || ''} onChange={(e) => set('description', e.target.value)} />
          </Field>
          <Field label="Hero Badge" hint="Teks kecil di atas judul hero (mis: 'Bersertifikat SLO & NIDI').">
            <Input value={form.heroBadge || ''} onChange={(e) => set('heroBadge', e.target.value)} />
          </Field>
        </Card>

        <Card title="Kontak">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nomor WhatsApp" required hint="Format: 6285100924911 (tanpa +, spasi, atau tanda hubung).">
              <Input value={form.whatsappNumber || ''} onChange={(e) => set('whatsappNumber', e.target.value)} placeholder="6285100924911" />
            </Field>
            <Field label="Pesan Default WhatsApp">
              <Input value={form.whatsappMessage || ''} onChange={(e) => set('whatsappMessage', e.target.value)} />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email || ''} onChange={(e) => set('email', e.target.value)} />
            </Field>
            <Field label="Nomor Telepon">
              <Input value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} />
            </Field>
          </div>
          <Field label="Alamat">
            <TextArea rows={2} value={form.address || ''} onChange={(e) => set('address', e.target.value)} />
          </Field>
          <Field label="Jam Operasional">
            <Input value={form.workingHours || ''} onChange={(e) => set('workingHours', e.target.value)} />
          </Field>
        </Card>

        <Card title="Call-to-Action">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="CTA Primer">
              <Input value={form.ctaPrimaryText || ''} onChange={(e) => set('ctaPrimaryText', e.target.value)} />
            </Field>
            <Field label="CTA Sekunder">
              <Input value={form.ctaSecondaryText || ''} onChange={(e) => set('ctaSecondaryText', e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card title="SEO">
          <Field label="Meta Title">
            <Input value={form.metaTitle || ''} onChange={(e) => set('metaTitle', e.target.value)} />
          </Field>
          <Field label="Meta Description" hint="Maksimal 160 karakter untuk hasil terbaik di Google.">
            <TextArea rows={3} value={form.metaDescription || ''} onChange={(e) => set('metaDescription', e.target.value)} />
          </Field>
          <Field label="Keywords" hint="Pisahkan dengan koma">
            <Input value={form.metaKeywords || ''} onChange={(e) => set('metaKeywords', e.target.value)} />
          </Field>
          <Field label="OG Image URL" hint="Gambar yang muncul saat link dibagikan (1200x630 px direkomendasikan).">
            <Input value={form.ogImage || ''} onChange={(e) => set('ogImage', e.target.value)} placeholder="https://..." />
          </Field>
        </Card>

        <Card title="Social Media">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Instagram URL">
              <Input value={form.socials?.instagram || ''} onChange={(e) => setNested('socials', 'instagram', e.target.value)} placeholder="https://instagram.com/..." />
            </Field>
            <Field label="Facebook URL">
              <Input value={form.socials?.facebook || ''} onChange={(e) => setNested('socials', 'facebook', e.target.value)} />
            </Field>
            <Field label="YouTube URL">
              <Input value={form.socials?.youtube || ''} onChange={(e) => setNested('socials', 'youtube', e.target.value)} />
            </Field>
            <Field label="TikTok URL">
              <Input value={form.socials?.tiktok || ''} onChange={(e) => setNested('socials', 'tiktok', e.target.value)} />
            </Field>
          </div>
        </Card>

        <div className="flex justify-end pt-4">
          <Button type="submit" loading={saving}><Save className="w-4 h-4" /> Simpan Perubahan</Button>
        </div>
      </form>

      <div className="mt-6">
        <ApkUploadCard />
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <h3 className="font-semibold text-slate-900 mb-4 pb-3 border-b border-slate-100">{title}</h3>
      {children}
    </div>
  );
}

const APK_STORAGE_PATH = 'downloads/app-adytia-latest.apk';
const APK_DOWNLOAD_URL =
  'https://firebasestorage.googleapis.com/v0/b/adytia-pt.firebasestorage.app/o/downloads%2Fapp-adytia-latest.apk?alt=media';

function ApkUploadCard() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle'); // idle | uploading | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const [dragging, setDragging] = useState(false);

  const handleFile = (f) => {
    if (!f) return;
    if (!f.name.endsWith('.apk')) {
      setErrorMsg('Hanya file .apk yang diizinkan');
      setStatus('error');
      return;
    }
    setFile(f);
    setStatus('idle');
    setErrorMsg('');
  };

  const handleUpload = () => {
    if (!file) return;
    const ref = storageRef(storage, APK_STORAGE_PATH);
    const task = uploadBytesResumable(ref, file, {
      contentType: 'application/vnd.android.package-archive',
      cacheControl: 'public, max-age=3600',
    });
    setStatus('uploading');
    setProgress(0);
    task.on(
      'state_changed',
      (snap) => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      () => { setStatus('error'); setErrorMsg('Upload gagal, coba lagi.'); },
      () => { setStatus('success'); setFile(null); },
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
        <Smartphone className="w-5 h-5 text-amber-500" />
        <h3 className="font-semibold text-slate-900">Aplikasi Mobile (APK)</h3>
      </div>

      <p className="text-sm text-slate-500 mb-4">
        Upload versi terbaru APK Android. File akan menggantikan versi sebelumnya dan tombol
        <span className="font-medium text-amber-600"> Download App </span>
        di navbar langsung mengarah ke file baru.
      </p>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
          ${dragging ? 'border-amber-400 bg-amber-50' : 'border-slate-200 hover:border-amber-300 hover:bg-slate-50'}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".apk"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />
        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        {file ? (
          <p className="text-sm font-medium text-slate-700">{file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</p>
        ) : (
          <>
            <p className="text-sm font-medium text-slate-700">Klik atau drag & drop file APK</p>
            <p className="text-xs text-slate-400 mt-1">Hanya .apk • Maks 200 MB</p>
          </>
        )}
      </div>

      {/* Progress bar */}
      {status === 'uploading' && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Mengupload...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div
              className="bg-amber-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Status messages */}
      {status === 'success' && (
        <div className="mt-4 flex items-center gap-2 text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5 text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>APK berhasil diupload! Tombol download di navbar sudah mengarah ke versi terbaru.</span>
        </div>
      )}
      {status === 'error' && (
        <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={handleUpload}
          disabled={!file || status === 'uploading'}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <Upload className="w-4 h-4" />
          {status === 'uploading' ? 'Mengupload...' : 'Upload APK'}
        </button>
        <a
          href={APK_DOWNLOAD_URL}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-slate-500 hover:text-amber-600 underline underline-offset-2 transition-colors"
        >
          Lihat versi saat ini
        </a>
      </div>
    </div>
  );
}