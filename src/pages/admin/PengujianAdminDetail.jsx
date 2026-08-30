import { useState, useContext, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, storage } from "../../firebase/config";
import { doc, getDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { AuthContext } from "../../context/AuthContext";
import { useLoading } from "../../context/LoadingContext";
import { useGuestPermission } from "../../hooks/useGuestPermission";
import { submitForApproval } from "../../services/guestService";
import imageCompression from "browser-image-compression";
import {
  ArrowLeft, Eye, Save, Camera, X, CheckCircle, AlertCircle, Download, FolderDown, Lock, Send,
} from "lucide-react";
import { downloadPhotosZip } from "../../utils/downloadPhotosZip";
import PhotoLightbox, { downloadPhoto } from "../../components/PhotoLightbox";

import { formSchema, buildDefaultForm } from "../../schema/formSchema";
import { setPath, mergeDeep } from "../../utils/nestedPath";
import { migrateFormData } from "../../utils/migrateFormData";
import EquipmentSection from "../../components/EquipmentSection";
import PembumianSection from "../../components/PembumianSection";
import LaporanInfoSection from "../../components/LaporanInfoSection";
import { downloadLhppDocx } from "../../utils/exportLhppDocx";
import { TEMPLATES } from "../../templates/laporan";

const PHB_TR_SPEC = formSchema.part1.find(eq => eq.key === "phb_tr_spec");
const EQ_TABS = formSchema.part1.filter(eq => !eq.hiddenTab).map(eq => ({ key: eq.key, label: eq.label }));

// ─── Customer fields ──────────────────────────────────────────────────────────
const CUSTOMER_FIELDS = [
  { name: "nama",   label: "Nama Pelanggan", placeholder: "PT. …" },
  { name: "alamat", label: "Alamat",          placeholder: "Jl. …", wide: true },
  { name: "daya",   label: "Daya (kVA)",      placeholder: "1.385 kVA" },
  { name: "tarif",  label: "Tarif",            placeholder: "INDUSTRI" },
  { name: "idpel",  label: "ID Pelanggan",    placeholder: "5412XXXXXXXXX" },
  { name: "noLhpp", label: "No. LHPP",        placeholder: "001/LHPP/ADY/IV/2026" },
];

export default function PengujianAdminDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role, profile } = useContext(AuthContext);
  const { startLoading, stopLoading } = useLoading();

  const pngPermission = useGuestPermission("pengujian");
  const isReadOnly    = role === "guest" && pngPermission === "read";
  const needsApproval = role === "guest" && pngPermission === "write_approval";

  // ── Core state ───────────────────────────────────────────────────────────────
  const [customer, setCustomer]       = useState({ nama: "", alamat: "", daya: "", tarif: "", idpel: "", noLhpp: "" });
  const [laporanInfo, setLaporanInfo] = useState({ instansiId: null, ttd: null, ttd_client: null, noLhpp: "" });
  const [instansi, setInstansi]       = useState(null);
  const [form, setForm]               = useState(() => buildDefaultForm(formSchema));
  const [photos, setPhotos]           = useState({ part1: {}, part2: {} });
  const [hydrated, setHydrated]       = useState(false);
  const [saving, setSaving]           = useState(false);
  const [pdfLoading, setPdfLoading]   = useState(false);
  const [zipLoading, setZipLoading]   = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [toast, setToast]             = useState(null);   // { type: "ok"|"err", msg }
  const [activeEq, setActiveEq]       = useState(EQ_TABS[0].key);
  const [clientTtdUploading, setClientTtdUploading] = useState(false);
  const [ttdLightbox, setTtdLightbox] = useState(null); // { url, label }

  // ── Load pengujian document ───────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "pengujian", id));
        if (!snap.exists()) return;
        const data = snap.data();
        setCustomer({
          nama:   data.nama   || "",
          alamat: data.alamat || "",
          daya:   data.daya   || "",
          tarif:  data.tarif  || "",
          idpel:  data.idpel  || "",
          noLhpp: data.noLhpp || "",
        });
        setLaporanInfo({
          instansiId: data.instansiId  ?? null,
          ttd:        data.ttd         ?? null,
          ttd_client: data.ttd_client  ?? null,
          noLhpp:     data.noLhpp      ?? "",
        });
        const { formData, photos: migratedPhotos } = migrateFormData(
          data.formData,
          data.photos
        );
        setForm(prev => mergeDeep(prev, formData ?? {}));
        setPhotos(migratedPhotos ?? { part1: {}, part2: {} });
      } catch (err) {
        console.error(err);
      } finally {
        setHydrated(true);
      }
    })();
  }, [id]);

  // ── Realtime instansi ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!laporanInfo.instansiId) { setInstansi(null); return; }
    const unsub = onSnapshot(
      doc(db, "instansi", laporanInfo.instansiId),
      snap => setInstansi(snap.exists() ? { id: snap.id, ...snap.data() } : null)
    );
    return () => unsub();
  }, [laporanInfo.instansiId]);

  // ── Form handlers ─────────────────────────────────────────────────────────────
  const handleChange = (partKey, path, value) => {
    setForm(prev => ({ ...prev, [partKey]: setPath(prev[partKey] || {}, path, value) }));
  };

  const handlePhoto = async (partKey, photoKey, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (!file.type.startsWith("image/")) {
      showToast("err", "Hanya file gambar yang diizinkan (JPG, PNG, WEBP)");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      showToast("err", "Ukuran file maksimal 20 MB");
      return;
    }
    const preview = URL.createObjectURL(file);
    setPhotos(prev => ({
      ...prev,
      [partKey]: { ...prev[partKey], [photoKey]: [...(prev[partKey]?.[photoKey] ?? []), preview] },
    }));
    try {
      const compressed = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1280, useWebWorker: true });
      const storageRef = ref(storage, `pengujian/${user.uid}/${id}/${partKey}/${photoKey}/${Date.now()}`);
      await uploadBytes(storageRef, compressed);
      const url = await getDownloadURL(storageRef);
      setPhotos(prev => {
        const arr = [...(prev[partKey]?.[photoKey] ?? [])];
        const idx = arr.indexOf(preview);
        if (idx !== -1) arr[idx] = url;
        return { ...prev, [partKey]: { ...prev[partKey], [photoKey]: arr } };
      });
      URL.revokeObjectURL(preview);
    } catch (err) {
      console.error(err);
    }
  };

  const removePhoto = (partKey, photoKey, index) => {
    setPhotos(prev => ({
      ...prev,
      [partKey]: { ...prev[partKey], [photoKey]: (prev[partKey]?.[photoKey] ?? []).filter((_, i) => i !== index) },
    }));
  };

  // ── Client TTD upload ─────────────────────────────────────────────────────────
  const handleClientTtdUpload = async (field, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (!file.type.startsWith("image/")) {
      showToast("err", "Hanya file gambar yang diizinkan");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("err", "Ukuran file TTD maksimal 5 MB");
      return;
    }
    setClientTtdUploading(true);
    try {
      const compressed = await imageCompression(file, { maxSizeMB: 0.3, maxWidthOrHeight: 800, useWebWorker: true });
      const storageRef = ref(storage, `pengujian/${user.uid}/${id}/ttd_client/${field}`);
      await uploadBytes(storageRef, compressed);
      const url = await getDownloadURL(storageRef);
      setLaporanInfo(prev => ({ ...prev, ttd_client: { ...(prev.ttd_client || {}), [field]: { url } } }));
    } catch (err) {
      console.error(err);
    } finally {
      setClientTtdUploading(false);
    }
  };

  const removeClientTtd = (field) => {
    setLaporanInfo(prev => ({ ...prev, ttd_client: { ...(prev.ttd_client || {}), [field]: null } }));
  };

  // ── Save ──────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        nama:       customer.nama.trim(),
        alamat:     customer.alamat.trim(),
        daya:       customer.daya.trim(),
        tarif:      customer.tarif.trim(),
        idpel:      customer.idpel.trim(),
        noLhpp:     customer.noLhpp.trim(),
        instansiId: laporanInfo.instansiId,
        ttd:        laporanInfo.ttd        ?? null,
        ttd_client: laporanInfo.ttd_client ?? null,
        formData:   form,
        photos:     buildSafePhotos(photos),
        updatedAt:  new Date(),
      };

      if (needsApproval) {
        await submitForApproval({
          guestUid: user.uid,
          guestUsername: profile?.username || user.uid,
          module: "pengujian",
          targetCollection: "pengujian",
          docId: id,
          operation: "update",
          proposedData: payload,
        });
        showToast("ok", "Perubahan diajukan — menunggu persetujuan admin");
        return;
      }

      await updateDoc(doc(db, "pengujian", id), payload);
      showToast("ok", "Perubahan berhasil disimpan");
    } catch (err) {
      console.error(err);
      showToast("err", "Gagal menyimpan: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  // ── Word download ─────────────────────────────────────────────────────────────
  const handleExportPDF = async () => {
    setPdfLoading(true);
    startLoading("Membuat Word…");
    try {
      const pengujianData = {
        ...customer,
        id,
        formData: form,
        photos,
        instansiId: laporanInfo.instansiId,
        ttd: laporanInfo.ttd,
        ttd_client: laporanInfo.ttd_client,
      };
      const filename = `LHPP-${slug(instansi?.nama)}-${slug(customer.nama)}-${dateTag()}.docx`;
      await downloadLhppDocx(pengujianData, instansi, filename);
    } catch (err) {
      console.error(err);
      showToast("err", "Gagal export Word: " + (err.message || ""));
    } finally {
      stopLoading();
      setPdfLoading(false);
    }
  };

  // ── ZIP foto download ─────────────────────────────────────────────────────────
  const handleDownloadZip = async () => {
    setZipLoading(true);
    setZipProgress(0);
    startLoading("Mengumpulkan foto...");
    try {
      await downloadPhotosZip(
        photos,
        customer.nama || id,
        (pct) => {
          setZipProgress(pct);
          startLoading(`Membuat ZIP... ${pct}%`);
        },
        laporanInfo.ttd_client
      );
    } catch (err) {
      console.error(err);
      showToast("err", err.message || "Gagal membuat ZIP");
    } finally {
      stopLoading();
      setZipLoading(false);
      setZipProgress(0);
    }
  };

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Progress per tab ──────────────────────────────────────────────────────────
  const eqProgress = (eqKey) => {
    const eq = formSchema.part1.find(e => e.key === eqKey);
    if (!eq) return { done: 0, total: 0 };
    let done = 0, total = 0;
    for (const grp of eq.groups) {
      if (grp.kind === "dynamic") continue;
      if (grp.perFieldPhotos) {
        for (const f of grp.fields) {
          total++;
          if ((photos.part1?.[`${eqKey}.${grp.key}.${f.name}`] ?? []).length >= grp.perFieldPhotos) done++;
        }
      } else if (grp.photo) {
        total++;
        if ((photos.part1?.[`${eqKey}.${grp.key}`] ?? []).length >= (grp.minPhotos ?? 1)) done++;
      }
    }
    return { done, total };
  };

  if (!hydrated) return <div className="p-10 text-center text-slate-400">Memuat data...</div>;

  const activeEquipment = formSchema.part1.find(eq => eq.key === activeEq);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">

      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate("/dashboard/pengujian")}
            className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 text-sm shrink-0"
          >
            <ArrowLeft className="w-4 h-4" /> Daftar
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">
              {customer.nama || "(Tanpa nama)"}
            </p>
            <p className="text-xs text-slate-400 truncate">
              {instansi?.nama
                ? `Format: ${TEMPLATES[instansi.templateId]?.label ?? TEMPLATES["adytia"].label}`
                : "Instansi belum dipilih"}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => window.open(`/laporan/${id}`, "_blank")}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-200
                rounded-lg hover:bg-slate-50 transition"
            >
              <Eye className="w-4 h-4" /> Preview
            </button>
            <button
              onClick={handleExportPDF}
              disabled={pdfLoading}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-200
                rounded-lg hover:bg-slate-50 disabled:opacity-60 transition"
            >
              <Download className="w-4 h-4" />
              {pdfLoading ? "Membuat…" : "Word"}
            </button>
            <button
              onClick={handleDownloadZip}
              disabled={zipLoading}
              title="Download semua foto dalam satu file ZIP terstruktur"
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-200
                rounded-lg hover:bg-slate-50 disabled:opacity-60 transition"
            >
              <FolderDown className="w-4 h-4" />
              {zipLoading ? `ZIP ${zipProgress}%` : "ZIP Foto"}
            </button>
            {isReadOnly ? (
              <span className="flex items-center gap-1.5 px-3 py-2 text-sm bg-amber-50 text-amber-700 border border-amber-200 rounded-lg">
                <Lock className="w-4 h-4" /> Hanya Baca
              </span>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm text-white
                  rounded-lg disabled:opacity-60 shadow transition
                  ${needsApproval ? "bg-blue-500 hover:bg-blue-600" : "bg-blue-600 hover:bg-blue-700"}`}
              >
                {needsApproval ? <Send className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {saving ? "Menyimpan…" : needsApproval ? "Ajukan Perubahan" : "Simpan"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Guest permission banner ──────────────────────────────────────── */}
      {isReadOnly && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-2 text-sm text-amber-800">
          <Lock className="w-4 h-4 shrink-0" />
          <span>Anda hanya memiliki akses <strong>baca saja</strong> untuk data pengujian.</span>
        </div>
      )}
      {needsApproval && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2.5 flex items-center gap-2 text-sm text-blue-800">
          <Send className="w-4 h-4 shrink-0" />
          <span>Perubahan Anda akan <strong>diajukan untuk persetujuan admin</strong> sebelum diterapkan.</span>
        </div>
      )}

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed top-16 right-4 z-50 flex items-center gap-2 px-4 py-3
          rounded-xl shadow-lg text-sm text-white transition
          ${toast.type === "ok" ? "bg-green-600" : "bg-red-600"}`}>
          {toast.type === "ok"
            ? <CheckCircle className="w-4 h-4" />
            : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-5 space-y-5">

        {/* ── Data Pelanggan ─────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-4">Data Pelanggan</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CUSTOMER_FIELDS.map(f => (
              <div key={f.name} className={f.wide ? "sm:col-span-2 lg:col-span-3" : ""}>
                <label className="block text-xs text-slate-500 mb-1">{f.label}</label>
                <input
                  type="text"
                  value={customer[f.name]}
                  placeholder={f.placeholder}
                  onChange={e => setCustomer(prev => ({ ...prev, [f.name]: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm
                    focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            ))}
          </div>
        </section>

        {/* ── Informasi Laporan ───────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-4">Informasi Laporan</h2>
          <LaporanInfoSection value={laporanInfo} onChange={setLaporanInfo} />
        </section>

        {/* ── TTD Pihak Client ────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-bold text-slate-700">TTD Pihak Client</h2>
            {clientTtdUploading && (
              <span className="text-xs text-blue-500">Uploading...</span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {["signature", "stempel"].map(field => {
              const url = laporanInfo.ttd_client?.[field]?.url;
              return (
                <div key={field}>
                  <p className="text-xs text-slate-500 mb-1">
                    {field === "signature" ? "Foto TTD Client" : "Foto Stempel Client"}
                  </p>
                  {url ? (
                    <div
                      className="relative rounded-xl overflow-hidden bg-slate-100 aspect-square group cursor-pointer"
                      onClick={() => setTtdLightbox({ url, label: field })}
                    >
                      <img src={url} alt={field} className="w-full h-full object-contain" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition" />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); downloadPhoto(url, `${field}.jpg`); }}
                        className="absolute bottom-1 left-1 opacity-0 group-hover:opacity-100 transition
                                   bg-black/60 text-white rounded-full p-0.5"
                        title="Unduh"
                      >
                        <Download size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeClientTtd(field); }}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center aspect-square
                      border-2 border-dashed border-slate-300 rounded-xl cursor-pointer
                      text-slate-400 hover:bg-slate-50 transition">
                      <Camera size={20} />
                      <span className="text-[10px] mt-1">Upload</span>
                      <input type="file" accept="image/*" className="hidden"
                        onChange={e => handleClientTtdUpload(field, e)} />
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Equipment tabs ─────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-4">Data Form Pengujian</h2>

          {/* Tab navigation */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4">
            {EQ_TABS.map(tab => {
              const { done, total } = eqProgress(tab.key);
              const isActive = activeEq === tab.key;
              const isDone   = total > 0 && done === total;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveEq(tab.key)}
                  className={`flex-shrink-0 flex flex-col items-center py-2 px-3 rounded-xl
                    transition text-xs font-medium ${
                    isActive
                      ? "bg-blue-600 text-white shadow"
                      : isDone
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "text-slate-500 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span>{tab.label}</span>
                  {total > 0 && (
                    <span className={`text-[9px] mt-0.5 ${
                      isActive ? "text-blue-100" : isDone ? "text-green-500" : "text-slate-400"
                    }`}>
                      {done}/{total}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Equipment form */}
          {activeEquipment && (
            <EquipmentSection
              key={activeEquipment.key}
              partKey="part1"
              equipment={activeEquipment}
              form={form}
              photos={photos}
              onChange={handleChange}
              onAddPhoto={handlePhoto}
              onRemovePhoto={removePhoto}
              flat
            />
          )}

          {/* PHB TR Spec dynamic table */}
          {activeEq === "phb_tr" && PHB_TR_SPEC && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-600 mb-2">Tabel Proteksi PHB TR</p>
              <PembumianSection
                eqKey="phb_tr_spec"
                rowSchema={PHB_TR_SPEC.rowSchema ?? []}
                hasRowPhoto={false}
                addLabel="Tambah Komponen Proteksi"
                rows={form.part1?.phb_tr_spec?.rows ?? []}
                photos={photos.part1 ?? {}}
                onRowsChange={newRows => handleChange("part1", "phb_tr_spec.rows", newRows)}
                onAddPhoto={(photoKey, e) => handlePhoto("part1", `phb_tr_spec.${photoKey}`, e)}
                onRemovePhoto={(photoKey, i) => removePhoto("part1", `phb_tr_spec.${photoKey}`, i)}
              />
            </div>
          )}
        </section>

      </div>

      {ttdLightbox && (
        <PhotoLightbox
          photos={[ttdLightbox.url]}
          index={0}
          onClose={() => setTtdLightbox(null)}
          onNav={() => {}}
        />
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildSafePhotos(photos) {
  const clean = { part1: {}, part2: {} };
  for (const p of ["part1", "part2"]) {
    for (const k in (photos[p] ?? {})) {
      const arr = photos[p][k] ?? [];
      clean[p][k] = arr.filter(v => typeof v === "string");
    }
  }
  return clean;
}

function slug(s = "") {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "").slice(0, 40) || "doc";
}

function dateTag() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}
