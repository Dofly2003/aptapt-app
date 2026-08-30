import { useState, useContext, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../firebase/config";
import { doc, getDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { uploadViaPresign, publicUrl } from "../../firebase/secureStorage";
import { AuthContext } from "../../context/AuthContext";
import { useLoading } from "../../context/LoadingContext";
import { useGuestPermission } from "../../hooks/useGuestPermission";
import { submitForApproval } from "../../services/guestService";
import imageCompression from "browser-image-compression";
import {
  ArrowLeft, Eye, Save, Camera, X, CheckCircle, AlertCircle, Download, FolderDown, Lock, Send, Globe, Copy, Link2,
  Sparkles, Loader2, ScanLine, Settings,
} from "lucide-react";
import { scanNameplate, scanMeasurement } from "../../services/geminiService";
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
const MULTI_INSTANCE_KEYS = ["trafo", "phb_tm", "phb_tr"];

// "phb_tr" â†’ "phb_tr_spec", "phb_tr_2" â†’ "phb_tr_spec_2"
const phbTrSpecKey = (instanceKey) =>
  instanceKey === "phb_tr" ? "phb_tr_spec" : `phb_tr_spec${instanceKey.slice("phb_tr".length)}`;

// â”€â”€â”€ Customer fields â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CUSTOMER_FIELDS = [
  { name: "nama",   label: "Nama Pelanggan", placeholder: "PT. â€¦" },
  { name: "kota",   label: "Kota",           placeholder: "KAB. BINTAN, KEPRI" },
  { name: "alamat", label: "Alamat",          placeholder: "Jl. â€¦", wide: true },
  { name: "daya",   label: "Daya (kVA)",      placeholder: "1.385 kVA" },
  { name: "tarif",  label: "Tarif",            placeholder: "INDUSTRI" },
  { name: "idpel",  label: "ID Pelanggan",    placeholder: "5412XXXXXXXXX" },
  { name: "noLhpp",   label: "No. LHPP",      placeholder: "001/LHPP/ADY/IV/2026" },
  { name: "noAgenda", label: "No. Agenda",    placeholder: "00WOT.05-06-2026.2" },
  { name: "noNidi",   label: "No. NIDI",      placeholder: "I.06.2026.Z650" },
];

export default function PengujianAdminDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role, profile } = useContext(AuthContext);
  const { startLoading, stopLoading } = useLoading();

  const pngPermission = useGuestPermission("pengujian");
  const isReadOnly    = role === "guest" && pngPermission === "read";
  const needsApproval = role === "guest" && pngPermission === "write_approval";

  // â”€â”€ Core state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [customer, setCustomer]       = useState({ nama: "", kota: "", alamat: "", daya: "", tarif: "", idpel: "", noLhpp: "", noAgenda: "", noNidi: "", saksiNama: "", saksiJabatan: "", pemeriksaNama: "", pemeriksaJabatan: "" });
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
  const [activeEq, setActiveEq]       = useState("phb_tm");
  const [instanceCounts, setInstanceCounts] = useState({ trafo: 1, phb_tm: 1 });
  const [laporanSettings, setLaporanSettings] = useState({});
  const [clientTtdUploading, setClientTtdUploading] = useState(false);
  const [ttdLightbox, setTtdLightbox] = useState(null); // { url, label }
  const [isPublic, setIsPublic]       = useState(false);
  const [copyDone, setCopyDone]       = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showLaporanSettings, setShowLaporanSettings] = useState(false);
  const [scanningGroup, setScanningGroup] = useState(null);
  const [scanResults, setScanResults]    = useState({});
  const [groupOrder, setGroupOrder]      = useState({});
  const [docNotFound, setDocNotFound]    = useState(false);

  // â”€â”€ Load pengujian document â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "pengujian", id));
        if (!snap.exists()) { setDocNotFound(true); return; }
        const data = snap.data();
        setCustomer({
          nama:             data.nama             || "",
          kota:             data.kota             || "",
          alamat:           data.alamat           || "",
          daya:             data.daya             || "",
          tarif:            data.tarif            || "",
          idpel:            data.idpel            || "",
          noLhpp:           data.noLhpp           || "",
          noAgenda:         data.noAgenda         || "",
          noNidi:           data.noNidi           || "",
          saksiNama:        data.saksiNama        || "",
          saksiJabatan:     data.saksiJabatan     || "",
          pemeriksaNama:    data.pemeriksaNama    || "",
          pemeriksaJabatan: data.pemeriksaJabatan || "",
        });
        setLaporanInfo({
          instansiId: data.instansiId  ?? null,
          ttd:        data.ttd         ?? null,
          ttd_client: data.ttd_client  ?? null,
          noLhpp:     data.noLhpp      ?? "",
        });
        setIsPublic(data.isPublic ?? false);
        setInstanceCounts(data.instanceCounts ?? { trafo: 1, phb_tm: 1 });
        setGroupOrder(data.groupOrder ?? {});
        setLaporanSettings(data.laporanSettings ?? {});
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

  // â”€â”€ Realtime instansi â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!laporanInfo.instansiId) { setInstansi(null); return; }
    const unsub = onSnapshot(
      doc(db, "instansi", laporanInfo.instansiId),
      snap => setInstansi(snap.exists() ? { id: snap.id, ...snap.data() } : null)
    );
    return () => unsub();
  }, [laporanInfo.instansiId]);

  // Auto-isi komponen utama PHB TR jika belum ada
  useEffect(() => {
    if (activeEq.replace(/_\d+$/, "") !== "phb_tr") return;
    const specKey = phbTrSpecKey(activeEq);
    if ((form.part1?.[specKey]?.rows ?? []).length > 0) return;
    handleChange("part1", `${specKey}.rows`, [
      { nama: "ACB dan MCB",           keterangan: "Sesuai" },
      { nama: "Thermal Overload Relay", keterangan: "Sesuai" },
      { nama: "Pilot Lamp",            keterangan: "Sesuai" },
      { nama: "Ampere Meter",          keterangan: "Sesuai" },
      { nama: "CT",                    keterangan: "Sesuai" },
      { nama: "Volt Meter",            keterangan: "Sesuai" },
      { nama: "Magnetic Contactor",    keterangan: "Sesuai" },
      { nama: "Push Button",           keterangan: "Sesuai" },
      { nama: "Wiring",                keterangan: "Sesuai" },
    ]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEq]);

  // â”€â”€ Form handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleChange = (partKey, path, value) => {
    setForm(prev => ({ ...prev, [partKey]: setPath(prev[partKey] || {}, path, value) }));
  };

  const handlePhoto = async (partKey, photoKey, e, slotIdx) => {
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

    if (slotIdx !== undefined) {
      // Mode per-slot: tulis ke index yang spesifik, jangan geser array
      setPhotos(prev => {
        const arr = [...(prev[partKey]?.[photoKey] ?? [])];
        while (arr.length <= slotIdx) arr.push("");
        arr[slotIdx] = preview;
        return { ...prev, [partKey]: { ...prev[partKey], [photoKey]: arr } };
      });
    } else {
      setPhotos(prev => ({
        ...prev,
        [partKey]: { ...prev[partKey], [photoKey]: [...(prev[partKey]?.[photoKey] ?? []), preview] },
      }));
    }

    try {
      const compressed = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1280, useWebWorker: false });
      const path = `pengujian/${user.uid}/${id}/${partKey}/${photoKey}/${Date.now()}`;
      await uploadViaPresign(path, compressed, "image/jpeg");
      const url = publicUrl(path);
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

  // Hapus foto di slot tertentu tanpa menggeser slot lain (untuk labeled-slot mode)
  const clearSlotPhoto = (partKey, photoKey, index) => {
    setPhotos(prev => {
      const arr = [...(prev[partKey]?.[photoKey] ?? [])];
      arr[index] = "";
      return { ...prev, [partKey]: { ...prev[partKey], [photoKey]: arr } };
    });
  };

  const swapPhotos = (partKey, photoKey, indexA, indexB) => {
    setPhotos(prev => {
      const arr = [...(prev[partKey]?.[photoKey] ?? [])];
      [arr[indexA], arr[indexB]] = [arr[indexB], arr[indexA]];
      return { ...prev, [partKey]: { ...prev[partKey], [photoKey]: arr } };
    });
  };

  const handleRotatePhoto = (partKey, photoKey, slotIdx) => new Promise(async (resolve) => {
    const url = photos[partKey]?.[photoKey]?.[slotIdx];
    if (!url || url.startsWith("blob:") || url.startsWith("capacitor:")) { resolve(); return; }
    try {
      const img = await new Promise((res, rej) => {
        const el = new Image();
        el.crossOrigin = "anonymous";
        el.onload = () => res(el);
        el.onerror = rej;
        el.src = url;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalHeight;
      canvas.height = img.naturalWidth;
      const ctx = canvas.getContext("2d");
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      const blob = await new Promise(res => canvas.toBlob(res, "image/jpeg", 0.85));
      const rotPath = `pengujian/${user.uid}/${id}/${partKey}/${photoKey}/${Date.now()}`;
      await uploadViaPresign(rotPath, blob, "image/jpeg");
      const newUrl = publicUrl(rotPath);
      setPhotos(prev => {
        const arr = [...(prev[partKey]?.[photoKey] ?? [])];
        arr[slotIdx] = newUrl;
        return { ...prev, [partKey]: { ...prev[partKey], [photoKey]: arr } };
      });
    } catch (err) {
      console.error("Rotate photo error:", err);
      showToast("err", "Gagal memutar foto");
    }
    resolve();
  });

  const handleCrossFieldMove = (partKey, srcPhotoKey, srcSlotIdx, dstPhotoKey, dstSlotIdx) => {
    setPhotos(prev => {
      const partPhotos = { ...(prev[partKey] ?? {}) };
      const srcArr = [...(partPhotos[srcPhotoKey] ?? [])];
      const dstArr = [...(partPhotos[dstPhotoKey] ?? [])];
      while (srcArr.length <= srcSlotIdx) srcArr.push("");
      while (dstArr.length <= dstSlotIdx) dstArr.push("");
      const temp = srcArr[srcSlotIdx];
      srcArr[srcSlotIdx] = dstArr[dstSlotIdx] ?? "";
      dstArr[dstSlotIdx] = temp;
      partPhotos[srcPhotoKey] = srcArr;
      partPhotos[dstPhotoKey] = dstArr;
      return { ...prev, [partKey]: partPhotos };
    });
  };

  const handleSwapGroupPhotos = (partKey, equipmentKey, groupKeyA, fieldsA, groupKeyB, fieldsB) => {
    const allFieldNames = new Set([
      ...fieldsA.map(f => f.name),
      ...fieldsB.map(f => f.name),
    ]);

    // Tukar foto
    setPhotos(prev => {
      const partPhotos = { ...(prev[partKey] ?? {}) };
      for (const fieldName of allFieldNames) {
        const keyA = `${equipmentKey}.${groupKeyA}.${fieldName}`;
        const keyB = `${equipmentKey}.${groupKeyB}.${fieldName}`;
        const temp = partPhotos[keyA] ?? [];
        partPhotos[keyA] = partPhotos[keyB] ?? [];
        partPhotos[keyB] = temp;
      }
      return { ...prev, [partKey]: partPhotos };
    });

    // Tukar nilai form
    setForm(prev => {
      const partForm = { ...(prev[partKey] ?? {}) };
      const eqA = { ...(partForm[equipmentKey]?.[groupKeyA] ?? {}) };
      const eqB = { ...(partForm[equipmentKey]?.[groupKeyB] ?? {}) };
      const swappedA = {};
      const swappedB = {};
      for (const fieldName of allFieldNames) {
        swappedA[fieldName] = eqB[fieldName] ?? "";
        swappedB[fieldName] = eqA[fieldName] ?? "";
      }
      return {
        ...prev,
        [partKey]: {
          ...partForm,
          [equipmentKey]: {
            ...partForm[equipmentKey],
            [groupKeyA]: { ...eqA, ...swappedA },
            [groupKeyB]: { ...eqB, ...swappedB },
          },
        },
      };
    });

    showToast("ok", "Foto dan nilai berhasil ditukar");
  };

  // â”€â”€ Client TTD upload â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      const compressed = await imageCompression(file, { maxSizeMB: 0.3, maxWidthOrHeight: 800, useWebWorker: false });
      const ttdPath = `pengujian/${user.uid}/${id}/ttd_client/${field}`;
      await uploadViaPresign(ttdPath, compressed, "image/jpeg");
      const url = publicUrl(ttdPath);
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

  // â”€â”€ Toggle public access (saves immediately) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleTogglePublic = async () => {
    const next = !isPublic;
    setIsPublic(next);
    try {
      await updateDoc(doc(db, "pengujian", id), { isPublic: next });
      showToast("ok", next ? "Laporan sekarang bisa diakses publik" : "Akses publik dimatikan");
    } catch (err) {
      setIsPublic(!next); // rollback
      showToast("err", "Gagal mengubah akses: " + (err.message || ""));
    }
  };

  // â”€â”€ Save â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleSave = async () => {
    if (!hydrated || docNotFound) return;
    setSaving(true);
    try {
      const payload = {
        nama:             customer.nama.trim(),
        kota:             customer.kota.trim(),
        alamat:           customer.alamat.trim(),
        daya:             customer.daya.trim(),
        tarif:            customer.tarif.trim(),
        idpel:            customer.idpel.trim(),
        noLhpp:           customer.noLhpp.trim(),
        noAgenda:         customer.noAgenda.trim(),
        noNidi:           customer.noNidi.trim(),
        saksiNama:        customer.saksiNama.trim(),
        saksiJabatan:     customer.saksiJabatan.trim(),
        pemeriksaNama:    customer.pemeriksaNama.trim(),
        pemeriksaJabatan: customer.pemeriksaJabatan.trim(),
        instansiId: laporanInfo.instansiId,
        ttd:        laporanInfo.ttd        ?? null,
        ttd_client: laporanInfo.ttd_client ?? null,
        isPublic:   isPublic,
        instanceCounts,
        groupOrder,
        laporanSettings,
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
        showToast("ok", "Perubahan diajukan â€” menunggu persetujuan admin");
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

  // â”€â”€ Word download â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleExportPDF = async () => {
    setPdfLoading(true);
    startLoading("Membuat Wordâ€¦");
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

  // â”€â”€ ZIP foto download â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Progress per tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const eqProgress = (eqKey) => {
    const baseKey = eqKey.replace(/_\d+$/, "");
    const eq = formSchema.part1.find(e => e.key === baseKey);
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
        const photoArr = photos.part1?.[`${eqKey}.${grp.key}`] ?? [];
        const filled = photoArr.filter(p => p && p !== "").length;
        if (filled >= (grp.minPhotos ?? 1)) done++;
      }
    }
    return { done, total };
  };

  const eqTabs = useMemo(() => {
    const tabs = [];
    for (const eq of formSchema.part1.filter(e => !e.hiddenTab)) {
      if (MULTI_INSTANCE_KEYS.includes(eq.key)) {
        const count = instanceCounts[eq.key] ?? 1;
        for (let i = 1; i <= count; i++) {
          const instanceKey = i === 1 ? eq.key : `${eq.key}_${i}`;
          const label = count === 1 ? eq.label : `${eq.label} ${i}`;
          tabs.push({ key: instanceKey, label, baseKey: eq.key });
        }
      } else {
        tabs.push({ key: eq.key, label: eq.label, baseKey: eq.key });
      }
    }
    return tabs;
  }, [instanceCounts]);

  const addInstance = (baseKey) => {
    const newCount = (instanceCounts[baseKey] ?? 1) + 1;
    const instanceKey = `${baseKey}_${newCount}`;
    const baseEq = formSchema.part1.find(e => e.key === baseKey);
    const defaultData = {};
    for (const grp of (baseEq?.groups ?? [])) {
      if (grp.kind === "dynamic") { defaultData[grp.key] = { rows: [] }; continue; }
      if (grp.photoOnly) continue;
      defaultData[grp.key] = {};
      for (const f of grp.fields) {
        defaultData[grp.key][f.name] = f.default ?? (f.type === "checkbox" ? false : "");
      }
    }
    setInstanceCounts(prev => ({ ...prev, [baseKey]: newCount }));
    setForm(prev => ({ ...prev, part1: { ...prev.part1, [instanceKey]: defaultData } }));
    setActiveEq(instanceKey);
  };

  const removeInstance = (baseKey) => {
    const currentCount = instanceCounts[baseKey] ?? 1;
    if (currentCount <= 1) return;
    const removeKey = currentCount === 2 ? `${baseKey}_2` : `${baseKey}_${currentCount}`;
    const prevKey = currentCount === 2 ? baseKey : `${baseKey}_${currentCount - 1}`;
    setInstanceCounts(prev => ({ ...prev, [baseKey]: currentCount - 1 }));
    setForm(prev => {
      const newPart1 = { ...prev.part1 };
      delete newPart1[removeKey];
      return { ...prev, part1: newPart1 };
    });
    if (activeEq === removeKey) setActiveEq(prevKey);
  };

  if (!hydrated) return <div className="p-10 text-center text-slate-400">Memuat data...</div>;
  if (docNotFound) return (
    <div className="p-10 text-center">
      <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
      <p className="text-slate-700 font-semibold">Dokumen tidak ditemukan</p>
      <p className="text-sm text-slate-400 mt-1">ID: {id}</p>
      <button onClick={() => navigate("/dashboard/pengujian")} className="mt-4 text-sm text-blue-600 hover:underline">
        â† Kembali ke daftar pengujian
      </button>
    </div>
  );

  const activeTab = eqTabs.find(t => t.key === activeEq);
  const activeEquipment = (() => {
    if (!activeTab) return null;
    const base = formSchema.part1.find(e => e.key === activeTab.baseKey);
    if (!base) return null;
    const order = groupOrder[activeTab.key];
    if (!order?.length) return { ...base, key: activeTab.key };
    const byKey = Object.fromEntries(base.groups.map(g => [g.key, g]));
    const sorted = order.map(k => byKey[k]).filter(Boolean);
    const inOrder = new Set(order);
    const missing = base.groups.filter(g => !inOrder.has(g.key));
    return { ...base, key: activeTab.key, groups: [...sorted, ...missing] };
  })();

  // Grup di tab aktif yang punya foto dan field isian (untuk AI panel)
  const scannableGroups = (activeEquipment?.groups ?? [])
    .filter(g => g.fields?.some(f => f.type !== "checkbox"))
    .map(g => {
      if (g.perFieldPhotos) {
        // Per-field photos: kumpulkan "Foto Nilai" (index terakhir) tiap field
        const fieldPhotos = {};
        const previewPhotos = [];
        for (const f of g.fields.filter(f2 => f2.type !== "checkbox")) {
          const fp = photos["part1"]?.[`${activeEquipment.key}.${g.key}.${f.name}`] ?? [];
          fieldPhotos[f.name] = fp;
          const nilaiPhoto = fp[g.perFieldPhotos - 1];
          if (nilaiPhoto) previewPhotos.push(nilaiPhoto);
        }
        return { ...g, photoArr: previewPhotos, fieldPhotos, equipmentKey: activeEquipment.key };
      }
      const photoArr = photos["part1"]?.[`${activeEquipment.key}.${g.key}`] ?? [];
      return { ...g, photoArr, equipmentKey: activeEquipment.key };
    })
    .filter(g => g.photoArr.length > 0);

  const handleAIScan = async (group) => {
    if (scanningGroup) return;
    const scanFields = group.fields.filter(f => f.type !== "checkbox");
    setScanningGroup(group.key);
    try {
      let filled = 0;
      if (group.perFieldPhotos) {
        // Scan tiap field secara individual dari "Foto Nilai"-nya
        for (const f of scanFields) {
          const fp = group.fieldPhotos?.[f.name] ?? [];
          const nilaiPhoto = fp[group.perFieldPhotos - 1];
          if (!nilaiPhoto) continue;
          const val = await scanMeasurement(nilaiPhoto, f.label);
          if (val !== null && val !== undefined && val !== "") {
            handleChange("part1", `${group.equipmentKey}.${group.key}.${f.name}`, String(val));
            filled++;
          }
        }
      } else {
        const result = await scanNameplate(group.photoArr, scanFields);
        scanFields.forEach(f => {
          const val = result[f.name];
          if (val !== null && val !== undefined && val !== "") {
            handleChange("part1", `${group.equipmentKey}.${group.key}.${f.name}`, String(val));
            filled++;
          }
        });
      }
      setScanResults(prev => ({ ...prev, [group.key]: filled > 0 ? "ok" : "empty" }));
    } catch (e) {
      console.error("AI scan error:", e);
      setScanResults(prev => ({ ...prev, [group.key]: "err" }));
    } finally {
      setScanningGroup(null);
      setTimeout(() => setScanResults(prev => {
        const n = { ...prev }; delete n[group.key]; return n;
      }), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">

      {/* â”€â”€ Sticky header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-none px-4 py-3 flex flex-wrap items-center gap-3">
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
            {/* AI Scan button â€” hanya tampil jika ada grup yang bisa di-scan */}
            {scannableGroups.length > 0 && !isReadOnly && role === "superadmin" && (
              <button
                onClick={() => setShowAIPanel(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-purple-50 text-purple-600
                  border border-purple-200 rounded-lg hover:bg-purple-100 transition"
                title="Scan AI â€” isi field dari foto nameplate"
              >
                <Sparkles className="w-4 h-4" />
                Scan AI
              </button>
            )}
            <button
              onClick={() => window.open(`/laporan/${id}`, "_blank")}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-200
                rounded-lg hover:bg-slate-50 transition"
            >
              <Eye className="w-4 h-4" /> Preview
            </button>
            {!isReadOnly && (
              <button
                onClick={() => setShowLaporanSettings(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition"
              >
                <Settings className="w-4 h-4" /> Pengaturan
              </button>
            )}
            <button
              onClick={handleExportPDF}
              disabled={pdfLoading}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-200
                rounded-lg hover:bg-slate-50 disabled:opacity-60 transition"
            >
              <Download className="w-4 h-4" />
              {pdfLoading ? "Membuatâ€¦" : "Word"}
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
                {saving ? "Menyimpanâ€¦" : needsApproval ? "Ajukan Perubahan" : "Simpan"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* â”€â”€ AI Scan Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {showAIPanel && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center pt-24"
          onClick={() => setShowAIPanel(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-[420px] max-h-[70vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header panel */}
            <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">Scan AI â€” {activeEquipment?.label}</p>
                <p className="text-[11px] text-slate-400">Pilih bagian yang ingin diisi otomatis dari foto</p>
              </div>
              <button onClick={() => setShowAIPanel(false)} className="text-gray-400 hover:text-gray-600 transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List grup */}
            <div className="overflow-y-auto flex-1 p-3 space-y-2">
              {scannableGroups.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Belum ada foto di tab ini</p>
              ) : (
                scannableGroups.map(g => {
                  const status = scanResults[g.key];
                  const isScanning = scanningGroup === g.key;
                  return (
                    <div key={g.key}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-100 hover:bg-gray-50 transition"
                    >
                      {/* Thumbnails */}
                      <div className="flex gap-1 shrink-0">
                        {g.photoArr.slice(0, 3).map((p, i) => (
                          <img key={i} src={p} className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
                        ))}
                        {g.photoArr.length > 3 && (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-[10px] text-gray-500">
                            +{g.photoArr.length - 3}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{g.label}</p>
                        <p className="text-[10px] text-slate-400">
                          {g.photoArr.length} foto Â· {g.fields.filter(f => f.type !== "checkbox").length} field
                        </p>
                      </div>

                      {/* Action */}
                      <div className="shrink-0 flex items-center gap-2">
                        {status === "ok" && <span className="text-[10px] text-green-600 font-medium">âœ“ Terisi</span>}
                        {status === "empty" && <span className="text-[10px] text-amber-500">Tidak terbaca</span>}
                        {status === "err" && <span className="text-[10px] text-red-500">Gagal</span>}
                        <button
                          onClick={() => handleAIScan(g)}
                          disabled={!!scanningGroup}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition
                            ${isScanning
                              ? "bg-purple-50 text-purple-400 cursor-not-allowed"
                              : "bg-purple-600 hover:bg-purple-700 text-white active:scale-95"
                            }`}
                        >
                          {isScanning
                            ? <Loader2 size={11} className="animate-spin" />
                            : <ScanLine size={11} />
                          }
                          {isScanning ? "Scanning..." : "Scan"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ Laporan Settings Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {showLaporanSettings && (
        <LaporanSettingsModal
          instanceCounts={instanceCounts}
          laporanSettings={laporanSettings}
          setLaporanSettings={setLaporanSettings}
          onClose={() => setShowLaporanSettings(false)}
        />
      )}

      {/* â”€â”€ Guest permission banner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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

      {/* â”€â”€ Toast â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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

      <div className="max-w-none px-4 py-5 space-y-5">

        {/* â”€â”€ Data Pelanggan â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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

        {/* â”€â”€ Informasi Laporan â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-4">Informasi Laporan</h2>
          <LaporanInfoSection value={laporanInfo} onChange={setLaporanInfo} />
        </section>

        {/* â”€â”€ TTD Pihak Client â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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

        {/* â”€â”€ Perwakilan Tanda Tangan â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-4">Perwakilan Tanda Tangan</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Nama Perwakilan Saksi</label>
              <input
                type="text"
                value={customer.saksiNama}
                placeholder="Nama perwakilan pelangganâ€¦"
                onChange={e => setCustomer(prev => ({ ...prev, saksiNama: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Jabatan Saksi</label>
              <input
                type="text"
                value={customer.saksiJabatan}
                placeholder="Jabatan / posisiâ€¦"
                onChange={e => setCustomer(prev => ({ ...prev, saksiJabatan: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Nama Pemeriksa &amp; Penguji</label>
              <input
                type="text"
                value={customer.pemeriksaNama}
                placeholder="Nama teknisi / pemeriksaâ€¦"
                onChange={e => setCustomer(prev => ({ ...prev, pemeriksaNama: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Jabatan Pemeriksa</label>
              <input
                type="text"
                value={customer.pemeriksaJabatan}
                placeholder="Jabatan / posisiâ€¦"
                onChange={e => setCustomer(prev => ({ ...prev, pemeriksaJabatan: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-3">
            Nama pemeriksa digunakan jika belum ada penanggung jawab yang dipilih di Informasi Laporan.
          </p>
        </section>

        {/* â”€â”€ Akses Publik â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${isPublic ? "bg-emerald-100" : "bg-slate-100"}`}>
                <Globe className={`w-5 h-5 ${isPublic ? "text-emerald-600" : "text-slate-400"}`} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-700">Akses Publik</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isPublic
                    ? "Laporan bisa diakses siapa saja melalui link di bawah"
                    : "Laporan hanya bisa diakses oleh pengguna yang login"}
                </p>
              </div>
            </div>
            <button
              onClick={handleTogglePublic}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent
                transition-colors duration-200 focus:outline-none
                ${isPublic ? "bg-emerald-500" : "bg-slate-300"}`}
              role="switch"
              aria-checked={isPublic}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow
                transform transition-transform duration-200
                ${isPublic ? "translate-x-5" : "translate-x-0"}`}
              />
            </button>
          </div>

          {isPublic && (
            <div className="mt-4 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
              <Link2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-xs text-emerald-800 truncate flex-1 font-mono">
                {window.location.origin}/laporan/{id}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/laporan/${id}`);
                  setCopyDone(true);
                  setTimeout(() => setCopyDone(false), 2000);
                }}
                className="flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 shrink-0 font-medium"
              >
                <Copy className="w-3.5 h-3.5" />
                {copyDone ? "Disalin!" : "Salin"}
              </button>
            </div>
          )}
          <p className="text-[11px] text-slate-400 mt-3">
            Perubahan akses publik langsung tersimpan saat toggle diubah.
          </p>
        </section>

        {/* â”€â”€ Equipment tabs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-4">Data Form Pengujian</h2>

          {/* Tab navigation */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4 items-start">
            {eqTabs.map((tab, idx) => {
              const { done, total } = eqProgress(tab.key);
              const isActive = activeEq === tab.key;
              const isDone   = total > 0 && done === total;
              const isLastOfGroup = idx === eqTabs.length - 1 || eqTabs[idx + 1].baseKey !== tab.baseKey;
              const isMulti  = MULTI_INSTANCE_KEYS.includes(tab.baseKey);
              const count    = instanceCounts[tab.baseKey] ?? 1;
              return (
                <div key={tab.key} className="flex items-start gap-1">
                  <button
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
                  {isMulti && isLastOfGroup && (
                    <div className="flex flex-col gap-0.5 pt-1 shrink-0">
                      <button
                        onClick={() => addInstance(tab.baseKey)}
                        title={`Tambah ${tab.label.replace(/\s\d+$/, "")}`}
                        className="w-6 h-6 flex items-center justify-center rounded-lg
                          bg-emerald-100 text-emerald-700 hover:bg-emerald-200 text-sm font-bold transition"
                      >+</button>
                      {count > 1 && (
                        <button
                          onClick={() => removeInstance(tab.baseKey)}
                          title="Hapus instance terakhir"
                          className="w-6 h-6 flex items-center justify-center rounded-lg
                            bg-red-100 text-red-600 hover:bg-red-200 text-sm font-bold transition"
                        >âˆ’</button>
                      )}
                    </div>
                  )}
                </div>
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
              onClearSlotPhoto={clearSlotPhoto}
              onSwapPhotos={swapPhotos}
              onSwapGroupPhotos={handleSwapGroupPhotos}
              onCrossFieldMove={handleCrossFieldMove}
              onRotatePhoto={handleRotatePhoto}
              flat
              sortable={role === "superadmin"}
              onGroupReorder={(newOrder) =>
                setGroupOrder(prev => ({ ...prev, [activeEquipment.key]: newOrder }))
              }
            />
          )}

          {/* PHB TR Spec dynamic table */}
          {activeTab?.baseKey === "phb_tr" && PHB_TR_SPEC && (() => {
            const specKey = phbTrSpecKey(activeEq);
            return (
              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-600 mb-2">Komponen Utama PHB TR</p>
                <PembumianSection
                  eqKey={specKey}
                  rowSchema={PHB_TR_SPEC.rowSchema ?? []}
                  hasRowPhoto={false}
                  addLabel="Tambah Komponen"
                  rows={form.part1?.[specKey]?.rows ?? []}
                  photos={photos.part1 ?? {}}
                  onRowsChange={newRows => handleChange("part1", `${specKey}.rows`, newRows)}
                  onAddPhoto={(photoKey, e) => handlePhoto("part1", `${specKey}.${photoKey}`, e)}
                  onRemovePhoto={(photoKey, i) => removePhoto("part1", `${specKey}.${photoKey}`, i)}
                />
              </div>
            );
          })()}

          {/* Data Konstruksi PHB TR */}
          {activeTab?.baseKey === "phb_tr" && (
            <div className="mt-4 border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-600 mb-3">Data Konstruksi PHB TR</p>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { key: "ue",                  label: "Rating tegangan operasi (Ue)",           placeholder: "Sampai 220/400-690 V" },
                  { key: "ui",                  label: "Rating tegangan isolasi (Ui)",            placeholder: "Sampai 1000 V" },
                  { key: "uimp",                label: "Tegangan lebih (Uimp)",                  placeholder: "Sampai 12 kV" },
                  { key: "frekuensi",            label: "Frekuensi",                               placeholder: "50 Hz" },
                  { key: "tipe_busbar",          label: "Tipe busbar",                             placeholder: "-" },
                  { key: "rating_arus_busbar",   label: "Rating arus busbar distribusi utama (In)", placeholder: "Sampai 2000 A" },
                  { key: "short_time_withstand", label: "Rating short time withstand current",     placeholder: "1sec" },
                  { key: "distribution_feeders", label: "Distribution feeders",                    placeholder: "Sampai 2000 A" },
                  { key: "prospective_sc",       label: "Prospective short circuit current",       placeholder: "50 kA" },
                  { key: "perlindungan_kontak",  label: "Perlindungan terhadap kontak listrik",   placeholder: "Sampai 65 kA @690ms" },
                  { key: "ketahanan_geteran",    label: "Ketahanan terhadap geteran",              placeholder: "Ada/Ya" },
                  { key: "tingkat_proteksi",     label: "Tingkat proteksi eksternal",              placeholder: "Normal" },
                  { key: "ketebalan_rangka",     label: "Ketebalan rangka",                        placeholder: "Sampai IP 55 - 3mm" },
                ].map(f => (
                  <div key={f.key} className="flex items-center gap-2">
                    <label className="text-xs text-slate-500 w-72 shrink-0">{f.label}</label>
                    <input
                      type="text"
                      placeholder={f.placeholder}
                      value={form.part1?.[activeEq]?.konstruksi?.[f.key] ?? ""}
                      onChange={e => handleChange("part1", `${activeEq}.konstruksi.${f.key}`, e.target.value)}
                      className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </div>
                ))}
              </div>
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

// â”€â”€â”€ Laporan Settings Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const EQ_LABELS = { trafo: "Trafo", phb_tm: "PHB TM", phb_tr: "PHB TR" };

function LaporanSettingsModal({ instanceCounts, laporanSettings, setLaporanSettings, onClose }) {
  // Build flat list of instances to show in sidebar
  const instances = [];
  for (const baseKey of MULTI_INSTANCE_KEYS) {
    const count = instanceCounts[baseKey] ?? 1;
    for (let i = 0; i < count; i++) {
      const label = `${EQ_LABELS[baseKey]} ${count > 1 ? i + 1 : ""}`.trim();
      instances.push({ baseKey, idx: i, label });
    }
  }

  const [activeIdx, setActiveIdx] = useState(0);
  const active = instances[activeIdx] ?? instances[0];

  // Get schema groups for the active equipment base key
  const activeEqSchema = active ? formSchema.part1.find(e => e.key === active.baseKey) : null;
  const activeGroups = activeEqSchema?.groups ?? [];

  // â”€â”€ Toggle helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const toggleHidden = (baseKey, idx) => {
    setLaporanSettings(prev => {
      const instKey = String(idx);
      const cur = prev[baseKey]?.[instKey] ?? {};
      return { ...prev, [baseKey]: { ...(prev[baseKey] ?? {}), [instKey]: { ...cur, hidden: !cur.hidden } } };
    });
  };

  const toggleGroup = (baseKey, idx, groupKey) => {
    setLaporanSettings(prev => {
      const instKey = String(idx);
      const cur = prev[baseKey]?.[instKey] ?? {};
      const hidden = cur.hiddenGroups ?? [];
      const next = hidden.includes(groupKey) ? hidden.filter(k => k !== groupKey) : [...hidden, groupKey];
      return { ...prev, [baseKey]: { ...(prev[baseKey] ?? {}), [instKey]: { ...cur, hiddenGroups: next } } };
    });
  };

  const togglePhotoSlot = (baseKey, idx, groupKey, slotIdx) => {
    setLaporanSettings(prev => {
      const instKey = String(idx);
      const cur = prev[baseKey]?.[instKey] ?? {};
      const slots = cur.hiddenPhotoSlots?.[groupKey] ?? [];
      const next = slots.includes(slotIdx) ? slots.filter(s => s !== slotIdx) : [...slots, slotIdx];
      return { ...prev, [baseKey]: { ...(prev[baseKey] ?? {}), [instKey]: { ...cur, hiddenPhotoSlots: { ...(cur.hiddenPhotoSlots ?? {}), [groupKey]: next } } } };
    });
  };

  const toggleField = (baseKey, idx, groupKey, fieldName) => {
    setLaporanSettings(prev => {
      const instKey = String(idx);
      const cur = prev[baseKey]?.[instKey] ?? {};
      const fields = cur.hiddenFields?.[groupKey] ?? [];
      const next = fields.includes(fieldName) ? fields.filter(f => f !== fieldName) : [...fields, fieldName];
      return { ...prev, [baseKey]: { ...(prev[baseKey] ?? {}), [instKey]: { ...cur, hiddenFields: { ...(cur.hiddenFields ?? {}), [groupKey]: next } } } };
    });
  };

  // â”€â”€ Sidebar grouping â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const sidebarGroups = [
    { header: "Trafo",  keys: instances.filter(i => i.baseKey === "trafo") },
    { header: "PHB TM", keys: instances.filter(i => i.baseKey === "phb_tm") },
    { header: "PHB TR", keys: instances.filter(i => i.baseKey === "phb_tr") },
  ].filter(g => g.keys.length > 0);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-stretch justify-center"
      onClick={onClose}
    >
      <div
        className="relative bg-white w-full max-w-5xl flex flex-col max-h-screen overflow-hidden my-0 md:my-6 md:rounded-2xl md:shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 shrink-0">
          <Settings className="w-5 h-5 text-slate-600" />
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-800">Pengaturan Tampilan Laporan</p>
            <p className="text-xs text-slate-400">Kontrol grup, foto, dan field yang muncul di laporan per unit peralatan</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal body: sidebar + right panel */}
        <div className="flex flex-1 overflow-hidden">

          {/* â”€â”€ Left sidebar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div className="w-[220px] md:w-[260px] shrink-0 border-r border-slate-100 overflow-y-auto py-3">
            {sidebarGroups.map(group => (
              <div key={group.header} className="mb-1">
                <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {group.header}
                </p>
                {group.keys.map((inst) => {
                  const globalIdx = instances.indexOf(inst);
                  const instKey = String(inst.idx);
                  const instSettings = laporanSettings[inst.baseKey]?.[instKey] ?? {};
                  const isHidden = instSettings.hidden ?? false;
                  const isActive = globalIdx === activeIdx;
                  return (
                    <div
                      key={`${inst.baseKey}-${inst.idx}`}
                      className={`mx-2 mb-0.5 rounded-xl px-3 py-2.5 cursor-pointer flex items-center gap-2 transition
                        ${isActive ? "bg-blue-600 text-white" : "hover:bg-slate-50 text-slate-700"}
                        ${isHidden && !isActive ? "opacity-60" : ""}`}
                      onClick={() => setActiveIdx(globalIdx)}
                    >
                      <span className="flex-1 text-sm font-medium truncate">{inst.label}</span>
                      {/* Hide toggle */}
                      <button
                        type="button"
                        title={isHidden ? "Tampilkan di laporan" : "Sembunyikan dari laporan"}
                        onClick={(e) => { e.stopPropagation(); toggleHidden(inst.baseKey, inst.idx); }}
                        className={`shrink-0 relative inline-flex h-5 w-9 rounded-full border-2 border-transparent
                          transition-colors duration-200 focus:outline-none
                          ${isHidden
                            ? (isActive ? "bg-red-400" : "bg-red-300")
                            : (isActive ? "bg-blue-400" : "bg-slate-300")
                          }`}
                        role="switch"
                        aria-checked={!isHidden}
                      >
                        <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow
                          transform transition-transform duration-200
                          ${isHidden ? "translate-x-0" : "translate-x-4"}`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* â”€â”€ Right panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {active && (() => {
              const instKey = String(active.idx);
              const instSettings = laporanSettings[active.baseKey]?.[instKey] ?? {};
              const isInstHidden = instSettings.hidden ?? false;
              const hiddenGroups = instSettings.hiddenGroups ?? [];
              const hiddenPhotoSlots = instSettings.hiddenPhotoSlots ?? {};
              const hiddenFields = instSettings.hiddenFields ?? {};

              return (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-base font-bold text-slate-800">{active.label}</h3>
                    {isInstHidden && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-600">
                        Disembunyikan dari laporan
                      </span>
                    )}
                  </div>

                  {isInstHidden && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-xs text-red-700">
                      Unit ini disembunyikan seluruhnya dari laporan. Aktifkan toggle di sidebar untuk menampilkan kembali.
                    </div>
                  )}

                  <div className="space-y-2">
                    {activeGroups.map(grp => {
                      const isGroupHidden = hiddenGroups.includes(grp.key);
                      const hasPhotos = (grp.photo === true || grp.perFieldPhotos) && !isGroupHidden;
                      const hasFields = (grp.fields ?? []).filter(f => f.type !== "checkbox").length > 0 && !grp.photoOnly && !isGroupHidden;
                      const isDynamic = grp.kind === "dynamic";

                      return (
                        <div
                          key={grp.key}
                          className={`border rounded-xl p-3 transition
                            ${isGroupHidden ? "border-slate-100 bg-slate-50 opacity-70" : "border-slate-200 bg-white"}`}
                        >
                          {/* Group header row */}
                          <div className="flex items-center gap-2">
                            <span className={`flex-1 text-xs font-semibold ${isGroupHidden ? "text-slate-400 line-through" : "text-slate-700"}`}>
                              {grp.label}
                            </span>
                            {isDynamic && (
                              <span className="text-[10px] text-slate-400 italic">Dynamic</span>
                            )}
                            {/* Group hide toggle */}
                            <button
                              type="button"
                              title={isGroupHidden ? "Tampilkan grup ini" : "Sembunyikan grup ini"}
                              onClick={() => toggleGroup(active.baseKey, active.idx, grp.key)}
                              className={`shrink-0 relative inline-flex h-5 w-9 rounded-full border-2 border-transparent
                                transition-colors duration-200 focus:outline-none
                                ${isGroupHidden ? "bg-slate-300" : "bg-blue-500"}`}
                              role="switch"
                              aria-checked={!isGroupHidden}
                            >
                              <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow
                                transform transition-transform duration-200
                                ${isGroupHidden ? "translate-x-0" : "translate-x-4"}`}
                              />
                            </button>
                          </div>

                          {/* Photo slots â€” only if group is visible and has photos */}
                          {!isDynamic && hasPhotos && (
                            <div className="mt-2.5 pt-2.5 border-t border-slate-100">
                              <p className="text-[10px] font-medium text-slate-500 mb-1.5">Foto</p>
                              {grp.perFieldPhotos ? (
                                // perFieldPhotos: one section per field, each with N photo slots
                                <div className="space-y-1.5">
                                  {(grp.fields ?? []).map(f => {
                                    const fieldPhotoKey = `${grp.key}.${f.name}`;
                                    const fieldSlots = hiddenPhotoSlots[fieldPhotoKey] ?? [];
                                    const photoLabels = grp.perFieldPhotoLabels ?? [];
                                    return (
                                      <div key={f.name} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                        <span className="text-[10px] text-slate-500 w-24 shrink-0">{f.label}:</span>
                                        {Array.from({ length: grp.perFieldPhotos }, (_, si) => (
                                          <label key={si} className="flex items-center gap-1 text-[10px] text-slate-600 cursor-pointer select-none">
                                            <input
                                              type="checkbox"
                                              checked={!fieldSlots.includes(si)}
                                              onChange={() => togglePhotoSlot(active.baseKey, active.idx, fieldPhotoKey, si)}
                                              className="rounded accent-blue-500 w-3 h-3"
                                            />
                                            {photoLabels[si] ?? `Foto ${si + 1}`}
                                          </label>
                                        ))}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                // Standard photoLabels slots
                                <div className="flex flex-wrap gap-x-4 gap-y-1">
                                  {(grp.photoLabels ?? [`Foto ${grp.label}`]).map((label, si) => {
                                    const slotArr = hiddenPhotoSlots[grp.key] ?? [];
                                    return (
                                      <label key={si} className="flex items-center gap-1.5 text-[10px] text-slate-600 cursor-pointer select-none">
                                        <input
                                          type="checkbox"
                                          checked={!slotArr.includes(si)}
                                          onChange={() => togglePhotoSlot(active.baseKey, active.idx, grp.key, si)}
                                          className="rounded accent-blue-500 w-3 h-3"
                                        />
                                        {label}
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Field toggles â€” only if group is visible, has fields, and not photoOnly or dynamic */}
                          {hasFields && (
                            <div className="mt-2.5 pt-2.5 border-t border-slate-100">
                              <p className="text-[10px] font-medium text-slate-500 mb-1.5">Kolom / Field</p>
                              <div className="flex flex-wrap gap-x-4 gap-y-1">
                                {(grp.fields ?? []).filter(f => f.type !== "checkbox").map(f => {
                                  const fieldArr = hiddenFields[grp.key] ?? [];
                                  return (
                                    <label key={f.name} className="flex items-center gap-1.5 text-[10px] text-slate-600 cursor-pointer select-none">
                                      <input
                                        type="checkbox"
                                        checked={!fieldArr.includes(f.name)}
                                        onChange={() => toggleField(active.baseKey, active.idx, grp.key, f.name)}
                                        className="rounded accent-blue-500 w-3 h-3"
                                      />
                                      {f.label}
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Modal footer */}
        <div className="shrink-0 border-t border-slate-100 px-5 py-3 flex items-center gap-3 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition"
          >
            Simpan &amp; Tutup
          </button>
          <p className="text-[11px] text-slate-400">
            Klik <strong>Simpan</strong> di header untuk menyimpan ke database
          </p>
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

