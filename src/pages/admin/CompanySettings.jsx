import { useEffect, useRef, useState } from "react";
import { Save, Building2, Upload, X } from "lucide-react";
import {
  AdminPageHeader,
  Button,
  Field,
  Input,
  TextArea,
  useToast,
} from "../../components/admin/AdminUI";
import {
  getSettings,
  saveSettings,
  uploadCompanyLogo,
} from "../../services/contentService";

const EMPTY = {
  companyName: "",
  address: "",
  phone: "",
  email: "",
  npwp: "",
  logoUrl: "",
  website: "",
  direktur: "",
};

export default function CompanySettings() {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState("");
  const fileRef = useRef(null);
  const { show, Toast } = useToast();

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  /* Load existing settings on mount */
  useEffect(() => {
    (async () => {
      try {
        const s = await getSettings();
        setForm({
          companyName: s.companyName || "",
          address: s.address || "",
          phone: s.phone || "",
          email: s.email || "",
          npwp: s.npwp || "",
          logoUrl: s.logoUrl || "",
          website: s.website || "",
          direktur: s.direktur || "",
        });
        if (s.logoUrl) setLogoPreview(s.logoUrl);
      } catch (err) {
        console.error(err);
        show("Gagal memuat data pengaturan", "error");
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Handle logo file selection */
  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { show("Hanya file gambar yang diizinkan", "error"); return; }
    if (file.size > 5 * 1024 * 1024) { show("Ukuran logo maksimal 5 MB", "error"); return; }

    // Local preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target.result);
    reader.readAsDataURL(file);

    // Upload to Storage
    setUploading(true);
    try {
      const url = await uploadCompanyLogo(file);
      set("logoUrl", url);
      setLogoPreview(url);
      show("Logo berhasil diunggah");
    } catch (err) {
      console.error(err);
      show("Gagal mengunggah logo: " + err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = () => {
    setLogoPreview("");
    set("logoUrl", "");
    if (fileRef.current) fileRef.current.value = "";
  };

  /* Save to Firestore */
  const handleSave = async () => {
    if (!form.companyName.trim()) {
      show("Nama perusahaan tidak boleh kosong", "error");
      return;
    }
    setSaving(true);
    try {
      await saveSettings({
        companyName: form.companyName.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        npwp: form.npwp.trim(),
        logoUrl: form.logoUrl,
        website: form.website.trim(),
        direktur: form.direktur.trim(),
      });
      show("Pengaturan perusahaan berhasil disimpan");
    } catch (err) {
      console.error(err);
      show("Gagal menyimpan pengaturan", "error");
    } finally {
      setSaving(false);
    }
  };

  /* Loading skeleton */
  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse mb-6" />
        <div className="h-96 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <Toast />
      <AdminPageHeader
        title="Profil Perusahaan"
        description="Informasi perusahaan yang akan digunakan di invoice, laporan, dan dokumen lainnya."
        actions={
          <Button onClick={handleSave} loading={saving}>
            <Save className="w-4 h-4" /> Simpan
          </Button>
        }
      />

      {/* Logo section */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <p className="text-sm font-semibold text-slate-700 mb-4">Logo Perusahaan</p>
        <div className="flex items-start gap-6">
          {/* Preview */}
          <div className="relative shrink-0">
            {logoPreview ? (
              <div className="relative">
                <img
                  src={logoPreview}
                  alt="Logo perusahaan"
                  className="h-24 w-24 object-contain rounded-lg border border-slate-200 bg-slate-50 p-1"
                />
                <button
                  type="button"
                  onClick={removeLogo}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition"
                  title="Hapus logo"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="h-24 w-24 flex items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400">
                <Building2 className="w-8 h-8" />
              </div>
            )}
          </div>

          {/* Upload controls */}
          <div className="flex flex-col gap-2 justify-center">
            <p className="text-xs text-slate-500">
              Format: JPG, PNG, SVG, WebP. Maks. 1 MB (setelah kompresi).
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoChange}
            />
            <Button
              variant="outline"
              onClick={() => fileRef.current?.click()}
              loading={uploading}
              disabled={uploading}
            >
              <Upload className="w-4 h-4" />
              {uploading ? "Mengunggah…" : logoPreview ? "Ganti Logo" : "Unggah Logo"}
            </Button>
            {form.logoUrl && (
              <p className="text-xs text-emerald-600 break-all">
                Tersimpan di Storage
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Company info fields */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <p className="text-sm font-semibold text-slate-700">Informasi Perusahaan</p>

        <Field label="Nama Perusahaan" hint="Akan tampil di header invoice dan laporan.">
          <Input
            value={form.companyName}
            onChange={(e) => set("companyName", e.target.value)}
            placeholder="PT. Adytia Putra Teknik"
          />
        </Field>

        <Field label="Alamat">
          <TextArea
            rows={3}
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="Jl. Gading Watu, Menganti, Gresik, Jawa Timur"
          />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nomor Telepon">
            <Input
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+62-8510-0924-911"
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="info@adytiateknik.co.id"
            />
          </Field>
        </div>

        <Field label="NPWP" hint="Nomor Pokok Wajib Pajak perusahaan.">
          <Input
            value={form.npwp}
            onChange={(e) => set("npwp", e.target.value)}
            placeholder="00.000.000.0-000.000"
          />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Website" hint="Akan tampil di header kwitansi dan dokumen.">
            <Input
              value={form.website}
              onChange={(e) => set("website", e.target.value)}
              placeholder="https://pt-adytia.com/"
            />
          </Field>
          <Field label="Nama Direktur / Pimpinan" hint="Default nama penerima di kwitansi.">
            <Input
              value={form.direktur}
              onChange={(e) => set("direktur", e.target.value)}
              placeholder="Nama pimpinan perusahaan"
            />
          </Field>
        </div>
      </div>
    </div>
  );
}
