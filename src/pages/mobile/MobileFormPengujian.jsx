import { useState, useContext, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, storage } from "../../firebase/config";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { AuthContext } from "../../context/AuthContext";
import imageCompression from "browser-image-compression";
import { Camera, X, WifiOff, RefreshCw } from "lucide-react";
import CameraButton from "../../components/CameraButton";
import CachedImage from "../../offline/CachedImage";
import { isOnline as getOnlineStatus, onNetworkChange } from "../../offline/networkWatcher";
import { saveLocalPhoto, getCachedPhotoUrl, cachePhoto } from "../../offline/photoStore";
import { queuePhotoUpload, queueSectionUpdate, getPendingCount, flushQueue, onSyncProgress, onIdRemap } from "../../offline/syncEngine";

import { formSchema, buildDefaultForm } from "../../schema/formSchema";
import { setPath, mergeDeep } from "../../utils/nestedPath";
import { migrateFormData } from "../../utils/migrateFormData";
import EquipmentSection from "../../components/EquipmentSection";
import PembumianSection from "../../components/PembumianSection";
import LaporanInfoSection from "../../components/LaporanInfoSection";
import IsolasiTransformatorSection from "../../components/IsolasiTransformatorSection";

const PHB_TR_SPEC = formSchema.part1.find(eq => eq.key === "phb_tr_spec");

// Tab list = equipment di part1 yang tidak hidden
const EQ_TABS = formSchema.part1.filter(eq => !eq.hiddenTab).map(eq => ({ key: eq.key, label: eq.label }));

export default function MobileFormPengujian() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [activeEq, setActiveEq] = useState(EQ_TABS[0].key);
  const [form, setForm] = useState(() => buildDefaultForm(formSchema));
  const [photos, setPhotos] = useState({ part1: {}, part2: {} });
  const [laporanInfo, setLaporanInfo] = useState({ instansiId: null, ttd: null, ttd_client: null, noLhpp: "" });
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [clientTtdUploading, setClientTtdUploading] = useState(false);
  const [isOnline, setIsOnline] = useState(getOnlineStatus());
  const [offlineSaved, setOfflineSaved] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const cacheKey = id ? `pengujian_draft_${id}` : null;

  // ── Redirect local_xxx → real Firestore ID after create syncs ───
  useEffect(() => {
    if (!id?.startsWith("local_")) return;
    const unsub = onIdRemap(({ collection, localId, realId }) => {
      if (collection === "pengujian" && localId === id) {
        navigate(`/app-mobile/form-pengujian/${realId}`, { replace: true });
      }
    });
    return unsub;
  }, [id]);

  // ── Network + sync listeners ─────────────────────────────────────
  useEffect(() => {
    const unsubNet = onNetworkChange(async (online) => {
      setIsOnline(online);
      if (online) setPendingCount(await getPendingCount());
    });
    const unsubSync = onSyncProgress(({ syncing, remaining }) => {
      setSyncing(syncing);
      if (remaining !== undefined) setPendingCount(remaining);
    });
    getPendingCount().then(setPendingCount);
    return () => { unsubNet(); unsubSync(); };
  }, []);

  // ── LOAD ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        // Firestore — returns cache when offline (IndexedDB persistence enabled)
        const snap = await getDoc(doc(db, "pengujian", id));
        if (snap.exists()) {
          const data = snap.data();
          const { formData, photos: migratedPhotos } = migrateFormData(
            data.formData,
            data.photos
          );

          // Merge Firebase photos with any pending local URIs from localStorage
          let mergedPhotos = migratedPhotos ?? { part1: {}, part2: {} };
          if (cacheKey) {
            try {
              const raw = localStorage.getItem(cacheKey);
              if (raw) mergedPhotos = mergePhotos(mergedPhotos, JSON.parse(raw).photos);
            } catch {}
          }

          setForm(prev => mergeDeep(prev, formData ?? {}));
          setPhotos(mergedPhotos);
          setLaporanInfo({
            instansiId: data.instansiId ?? null,
            ttd: data.ttd ?? null,
            ttd_client: data.ttd_client ?? null,
            noLhpp: data.noLhpp ?? "",
          });
          // Update localStorage — keep local URIs so they survive next open
          if (cacheKey) {
            localStorage.setItem(cacheKey, JSON.stringify({
              formData, photos: buildLocalPhotos(mergedPhotos),
              instansiId: data.instansiId ?? null,
              ttd: data.ttd ?? null,
              ttd_client: data.ttd_client ?? null,
              noLhpp: data.noLhpp ?? "",
              savedAt: Date.now(),
            }));
          }
        }
      } catch (err) {
        // Firestore unavailable — fallback to localStorage
        console.warn("Firestore load failed, using localStorage cache", err);
        if (cacheKey) {
          try {
            const raw = localStorage.getItem(cacheKey);
            if (raw) {
              const cached = JSON.parse(raw);
              const { formData, photos: migratedPhotos } = migrateFormData(
                cached.formData,
                cached.photos
              );
              setForm(prev => mergeDeep(prev, formData ?? {}));
              setPhotos(migratedPhotos ?? { part1: {}, part2: {} });
              setLaporanInfo({
                instansiId: cached.instansiId ?? null,
                ttd: cached.ttd ?? null,
                ttd_client: cached.ttd_client ?? null,
                noLhpp: cached.noLhpp ?? "",
              });
              setOfflineSaved(true);
            }
          } catch (cacheErr) {
            console.error("Cache read failed", cacheErr);
          }
        }
      } finally {
        setHydrated(true);
      }
    })();
  }, [id]);

  // ── AUTO SAVE ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!id || !hydrated) return;

    // localStorage: simpan semua URL termasuk local URI (capacitor://)
    if (cacheKey) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          formData: form,
          photos: buildLocalPhotos(photos),
          instansiId: laporanInfo.instansiId,
          ttd: laporanInfo.ttd,
          ttd_client: laporanInfo.ttd_client,
          noLhpp: laporanInfo.noLhpp || "",
          savedAt: Date.now(),
        }));
      } catch (_) { /* storage full — skip */ }
    }

    // Firestore: hanya kirim Firebase Storage URL (bukan local URI)
    const t = setTimeout(() => {
      updateDoc(doc(db, "pengujian", id), {
        formData: form,
        photos: buildSafePhotos(photos),
        instansiId: laporanInfo.instansiId,
        ttd: laporanInfo.ttd,
        ttd_client: laporanInfo.ttd_client,
        noLhpp: laporanInfo.noLhpp || "",
        updatedAt: new Date(),
      }).catch(console.error);
    }, 1000);
    return () => clearTimeout(t);
  }, [form, photos, laporanInfo, hydrated, id]);

  // ── HANDLERS ─────────────────────────────────────────────────────
  const handleChange = (partKey, path, value) => {
    setForm(prev => ({
      ...prev,
      [partKey]: setPath(prev[partKey] || {}, path, value),
    }));
  };

  const handlePhoto = async (partKey, photoKey, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Hanya file gambar yang diizinkan");
      e.target.value = "";
      return;
    }
    e.target.value = "";

    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.5, maxWidthOrHeight: 1280, useWebWorker: true,
      });

      const storagePath = `pengujian/${user.uid}/${id}/${partKey}/${photoKey}/${Date.now()}`;

      if (isOnline) {
        // Online: upload immediately
        const preview = URL.createObjectURL(compressed);
        setPhotos(prev => ({
          ...prev,
          [partKey]: { ...prev[partKey], [photoKey]: [...(prev[partKey]?.[photoKey] ?? []), preview] },
        }));

        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, compressed);
        const url = await getDownloadURL(storageRef);

        setPhotos(prev => {
          const arr = [...(prev[partKey]?.[photoKey] ?? [])];
          const idx = arr.indexOf(preview);
          if (idx !== -1) arr[idx] = url;
          return { ...prev, [partKey]: { ...prev[partKey], [photoKey]: arr } };
        });
        URL.revokeObjectURL(preview);
      } else {
        // Offline: save to Filesystem, queue upload
        const localUri = await saveLocalPhoto(compressed, storagePath);
        setPhotos(prev => ({
          ...prev,
          [partKey]: { ...prev[partKey], [photoKey]: [...(prev[partKey]?.[photoKey] ?? []), localUri] },
        }));
        // Queue photo upload (will merge via arrayUnion when online)
        const arrayField = `photos.${partKey}.${photoKey}`;
        await queuePhotoUpload("pengujian", id, `photo_local/${storagePath}`, storagePath, arrayField);
        setPendingCount(c => c + 1);
      }
    } catch (err) {
      console.error(err);
      alert("Upload gagal");
    }
  };

  const removePhoto = (partKey, photoKey, index) => {
    setPhotos(prev => ({
      ...prev,
      [partKey]: {
        ...prev[partKey],
        [photoKey]: (prev[partKey]?.[photoKey] ?? []).filter((_, i) => i !== index),
      },
    }));
  };

  // ── CLIENT TTD UPLOAD ─────────────────────────────────────────────
  const handleClientTtdUpload = async (field, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Hanya file gambar yang diizinkan");
      e.target.value = "";
      return;
    }
    e.target.value = "";
    setClientTtdUploading(true);
    try {
      const compressed = await imageCompression(file, { maxSizeMB: 0.3, maxWidthOrHeight: 800, useWebWorker: true });
      const storageRef = ref(storage, `pengujian/${user.uid}/${id}/ttd_client/${field}`);
      await uploadBytes(storageRef, compressed);
      const url = await getDownloadURL(storageRef);
      setLaporanInfo(prev => ({
        ...prev,
        ttd_client: { ...(prev.ttd_client || {}), [field]: { url } },
      }));
    } catch (err) {
      console.error(err);
      alert("Upload TTD gagal");
    } finally {
      setClientTtdUploading(false);
    }
  };

  const removeClientTtd = (field) => {
    setLaporanInfo(prev => ({
      ...prev,
      ttd_client: { ...(prev.ttd_client || {}), [field]: null },
    }));
  };

  // ── VALIDATION ───────────────────────────────────────────────────
  const eqProgress = (eqKey) => {
    const eq = formSchema.part1.find(e => e.key === eqKey);
    if (!eq) return { done: 0, total: 0 };
    let done = 0, total = 0;
    for (const grp of eq.groups) {
      if (grp.kind === "dynamic") continue;
      if (grp.perFieldPhotos) {
        for (const f of grp.fields) {
          total++;
          const arr = photos.part1?.[`${eqKey}.${grp.key}.${f.name}`] ?? [];
          if (arr.length >= grp.perFieldPhotos) done++;
        }
      } else if (grp.photo) {
        total++;
        const arr = photos.part1?.[`${eqKey}.${grp.key}`] ?? [];
        if (arr.length >= (grp.minPhotos ?? 1)) done++;
      }
    }
    return { done, total };
  };

  const isAllValid = () =>
    formSchema.part1.every(eq =>
      eq.groups.every(grp => {
        if (grp.kind === "dynamic") return true;
        if (grp.perFieldPhotos) {
          return grp.fields.every(f => {
            const arr = photos.part1?.[`${eq.key}.${grp.key}.${f.name}`] ?? [];
            return arr.length >= grp.perFieldPhotos;
          });
        }
        if (!grp.photo) return true;
        const arr = photos.part1?.[`${eq.key}.${grp.key}`] ?? [];
        return arr.length >= (grp.minPhotos ?? 1);
      })
    );

  // ── SAVE / SUBMIT ─────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    try {
      await updateDoc(doc(db, "pengujian", id), {
        formData: form,
        photos: buildSafePhotos(photos),
        instansiId: laporanInfo.instansiId,
        ttd: laporanInfo.ttd,
        ttd_client: laporanInfo.ttd_client,
        noLhpp: laporanInfo.noLhpp || "",
        status: "draft",
        updatedAt: new Date(),
      });
      alert("Draft tersimpan");
    } catch (err) {
      console.error(err);
      alert("Gagal simpan draft");
    }
  };

  const handleSubmit = async () => {
    if (!laporanInfo.instansiId)    return alert("Pilih instansi dulu di bagian Informasi Laporan.");
    if (!laporanInfo.ttd?.nama)     return alert("Pilih penanggung jawab (TTD) dulu.");
    if (!isAllValid())              return alert("Ada bagian foto yang belum lengkap. Periksa setiap tab.");
    try {
      setLoading(true);
      await updateDoc(doc(db, "pengujian", id), {
        formData: form,
        photos: buildSafePhotos(photos),
        instansiId: laporanInfo.instansiId,
        ttd: laporanInfo.ttd,
        ttd_client: laporanInfo.ttd_client,
        noLhpp: laporanInfo.noLhpp || "",
        status: "done",
        updatedAt: new Date(),
      });
      alert("Berhasil disimpan");
    } catch (err) {
      console.error(err);
      alert("Gagal submit");
    } finally {
      setLoading(false);
    }
  };

  // ── RENDER ────────────────────────────────────────────────────────
  const activeEquipment = formSchema.part1.find(eq => eq.key === activeEq);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-40">

      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-amber-500 text-white text-xs px-4 py-2 flex items-center gap-2">
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span>
            Tidak ada koneksi — data tersimpan lokal dan akan otomatis tersinkron saat online.
          </span>
        </div>
      )}
      {isOnline && offlineSaved && (
        <div className="bg-green-600 text-white text-xs px-4 py-2 flex items-center gap-2">
          <span>Koneksi pulih — data sedang disinkronkan ke server.</span>
        </div>
      )}
      {isOnline && pendingCount > 0 && (
        <div className="bg-blue-600 text-white text-xs px-4 py-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <RefreshCw size={12} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Menyinkronkan..." : `${pendingCount} item belum tersinkron`}
          </span>
          {!syncing && (
            <button onClick={() => flushQueue()} className="underline">Sync sekarang</button>
          )}
        </div>
      )}

      <div className="max-w-md mx-auto p-3">

        {/* Header */}
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-800">Form Pengujian</h2>
          <p className="text-xs text-gray-500">Survey & Pengukuran Lapangan</p>
        </div>

        {/* Info Laporan */}
        <LaporanInfoSection value={laporanInfo} onChange={setLaporanInfo} />

        {/* TTD Pihak Client */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-3">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">✍️</span>
            <h3 className="font-semibold text-sm text-slate-700">TTD Pihak Client</h3>
            {clientTtdUploading && <span className="text-xs text-blue-500">Uploading...</span>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {["signature", "stempel"].map((field) => {
              const url = laporanInfo.ttd_client?.[field]?.url;
              return (
                <div key={field}>
                  <p className="text-[11px] text-gray-500 mb-1 capitalize">
                    {field === "signature" ? "Foto TTD Client" : "Foto Stempel Client"}
                  </p>
                  {url ? (
                    <div className="relative rounded-lg overflow-hidden bg-gray-100 aspect-square">
                      <CachedImage src={url} alt={field} className="w-full h-full object-contain" fallback={<div className="w-full h-full bg-slate-100 animate-pulse" />} />
                      <button
                        type="button"
                        onClick={() => removeClientTtd(field)}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <CameraButton
                      onChange={(e) => handleClientTtdUpload(field, e)}
                      className="flex flex-col items-center justify-center aspect-square
                        border-2 border-dashed border-gray-300 rounded-lg cursor-pointer
                        text-gray-400 active:bg-gray-50 transition"
                    >
                      <Camera size={20} />
                      <span className="text-[10px] mt-1">Upload</span>
                    </CameraButton>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tab navigasi equipment */}
        <div className="bg-white rounded-2xl shadow-sm p-1 mb-4 flex gap-1 overflow-x-auto">
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
                    ? "bg-green-50 text-green-700"
                    : "text-gray-500"
                }`}
              >
                <span>{tab.label}</span>
                {total > 0 && (
                  <span className={`text-[9px] mt-0.5 ${
                    isActive ? "text-blue-100" : isDone ? "text-green-500" : "text-gray-400"
                  }`}>
                    {done}/{total}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Konten equipment aktif — flat (tanpa outer accordion) */}
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


        {/* C.1 Isolasi Transformator — compact UI + hasilEvaluasi, tampil di bawah tab Trafo */}
        {activeEquipment?.hasIsolasiTransformator && (
          <IsolasiTransformatorSection
            partKey="part1"
            form={form}
            photos={photos}
            onChange={handleChange}
            onAddPhoto={handlePhoto}
            onRemovePhoto={removePhoto}
          />
        )}

        {/* PHB TR Spec — tabel proteksi dinamis, tampil di bawah PHB TR */}
        {activeEq === "phb_tr" && PHB_TR_SPEC && (
          <div className="mt-3">
            <div className="bg-white rounded-2xl shadow-sm p-3 mb-2">
              <p className="text-xs font-semibold text-slate-600 mb-2">Tabel Proteksi PHB TR</p>
            </div>
            <PembumianSection
              eqKey="phb_tr_spec"
              rowSchema={PHB_TR_SPEC.rowSchema ?? []}
              hasRowPhoto={false}
              addLabel="Tambah Komponen Proteksi"
              rows={form.part1?.phb_tr_spec?.rows ?? []}
              photos={photos.part1 ?? {}}
              onRowsChange={(newRows) => handleChange("part1", "phb_tr_spec.rows", newRows)}
              onAddPhoto={(photoKey, e) => handlePhoto("part1", `phb_tr_spec.${photoKey}`, e)}
              onRemovePhoto={(photoKey, i) => removePhoto("part1", `phb_tr_spec.${photoKey}`, i)}
            />
          </div>
        )}
      </div>

      {/* Sticky action bar */}
      <div
        className="fixed left-0 right-0 bg-white/95 backdrop-blur-sm border-t p-3 shadow-xl"
        style={{ bottom: "70px" }}
      >
        <div className="max-w-md mx-auto flex gap-2">
          <button
            onClick={handleSaveDraft}
            className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-xl active:scale-95 transition"
          >
            Simpan Draft
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-2 rounded-xl shadow active:scale-95 transition disabled:bg-gray-400"
          >
            {loading ? "Uploading..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Hanya Firebase Storage URL — untuk disimpan ke Firestore
function buildSafePhotos(photos) {
  const clean = { part1: {}, part2: {} };
  for (const p of ["part1", "part2"]) {
    for (const k in (photos[p] ?? {})) {
      clean[p][k] = (photos[p][k] ?? []).filter(
        v => typeof v === "string" && v.startsWith("https://firebasestorage")
      );
    }
  }
  return clean;
}

// Semua URL string (termasuk capacitor://) — untuk disimpan ke localStorage
function buildLocalPhotos(photos) {
  const clean = { part1: {}, part2: {} };
  for (const p of ["part1", "part2"]) {
    for (const k in (photos[p] ?? {})) {
      clean[p][k] = (photos[p][k] ?? []).filter(
        v => typeof v === "string" && !v.startsWith("blob:")
      );
    }
  }
  return clean;
}

// Merge foto Firestore dengan local URI yang masih pending upload
function mergePhotos(firestorePhotos, localPhotos) {
  const merged = {
    part1: { ...(firestorePhotos?.part1 ?? {}) },
    part2: { ...(firestorePhotos?.part2 ?? {}) },
  };
  for (const p of ["part1", "part2"]) {
    for (const k in (localPhotos?.[p] ?? {})) {
      const existing = merged[p][k] ?? [];
      const hasFirebase = existing.some(
        v => typeof v === "string" && v.startsWith("https://firebasestorage")
      );
      if (!hasFirebase) {
        // Belum ada URL Firebase untuk slot ini — tampilkan local URI sementara
        const localArr = (localPhotos[p][k] ?? []).filter(
          v => typeof v === "string" &&
            (v.startsWith("capacitor://") || v.startsWith("file://") || v.startsWith("content://"))
        );
        if (localArr.length > 0) merged[p][k] = localArr;
      }
    }
  }
  return merged;
}
