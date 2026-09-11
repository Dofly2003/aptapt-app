// =====================================================================
// Import ZIP paket laporan ke satu dokumen `pengujian/{id}`.
//
// Struktur ZIP (dihasilkan oleh tools/build_import.py di repo data lapangan):
//   manifest.json
//   photos/<folder>/NN.jpg ...
//
// manifest.json:
//   {
//     "docFields": { nama, kota, alamat, noLhpp, saksiNama, ... },   // top-level doc
//     "formData":  { part1: { <eq>.<grup>.<field> ... }, part2: {} }, // schema form
//     "photos":    { part1: { "<photoKey>": ["photos/.../01.jpg", ...] }, part2: {} }
//   }
//
// Perilaku merge (non-destruktif):
//   • formData  → deep-merge ke formData lama (nilai manifest menang per-field).
//   • photos    → URL hasil upload DITAMBAHKAN ke array photoKey yang sudah ada.
//   • docFields → hanya mengisi field yang saat ini kosong/undefined.
// =====================================================================
import JSZip from "jszip";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { uploadDual, uploadFirebaseOnly, mapPhotosTree, flattenFbMap } from "../firebase/dualUpload";
import { mergeDeep } from "./nestedPath";
import { formSchema } from "../schema/formSchema";

// ── daftar photoKey valid dari schema (aturan sama dgn downloadPhotosZip) ──
function buildValidKeys() {
  const exact = new Set();
  const dynamicBases = new Set();
  for (const eq of formSchema.part1) {
    if (!Array.isArray(eq.groups)) continue;
    for (const grp of eq.groups) {
      if (grp.kind === "dynamic") {
        dynamicBases.add(`${eq.key}.${grp.key}`);
        continue;
      }
      if (grp.perFieldPhotos) {
        for (const f of grp.fields) exact.add(`${eq.key}.${grp.key}.${f.name}`);
      } else {
        // grp.photo === true ATAU grp.photoOnly
        exact.add(`${eq.key}.${grp.key}`);
      }
    }
  }
  return { exact, dynamicBases };
}

// "trafo_2.grounding_body" → "trafo.grounding_body" (multi-instance → base)
function normalizeInstanceKey(key) {
  return key.replace(/^([a-z_]+?)_(\d+)\./, "$1.");
}

function isKnownKey(key, vk) {
  const k = normalizeInstanceKey(key);
  if (vk.exact.has(k)) return true;
  const i = k.lastIndexOf(".");
  if (i > 0 && /^\d+$/.test(k.slice(i + 1)) && vk.dynamicBases.has(k.slice(0, i))) {
    return true;
  }
  return false;
}

function zipFind(zip, relPath) {
  const clean = relPath.replace(/^\.?\//, "");
  const direct =
    zip.file(relPath) ||
    zip.file(clean) ||
    zip.file(`photos/${clean.replace(/^photos\//, "")}`);
  if (direct) return direct;
  // fallback: cocokkan berdasarkan akhiran path (mis. ZIP dibungkus folder induk)
  const suffix = clean.toLowerCase();
  const hit = zip.file(new RegExp(`(^|/)${suffix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"));
  return hit && hit.length ? hit[0] : null;
}

function contentTypeFor(path) {
  const ext = (String(path).match(/\.[a-z0-9]+$/i) || [".jpg"])[0].toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}

/**
 * @param {Object}   opts
 * @param {Blob|File} opts.file           file ZIP
 * @param {string}   opts.pengujianId
 * @param {string}   opts.uid             user.uid (untuk path storage)
 * @param {(pct:number, done:number, total:number)=>void} [opts.onProgress]
 * @param {(msg:string)=>void} [opts.onLog]
 * @returns {Promise<{photoCount:number,keyCount:number,fieldsFilled:string[],warnings:string[]}>}
 */
export async function importPengujianZip({
  file,
  pengujianId,
  uid,
  onProgress,
  onLog,
}) {
  if (!file) throw new Error("File ZIP belum dipilih.");
  if (!pengujianId) throw new Error("ID pengujian tidak ada.");
  if (!uid) throw new Error("Sesi login tidak valid.");

  onLog?.("Membuka ZIP…");
  const zip = await JSZip.loadAsync(file);

  const manifestEntry =
    zip.file("manifest.json") ||
    (zip.file(/(^|\/)manifest\.json$/i) || [])[0];
  if (!manifestEntry) throw new Error("manifest.json tidak ditemukan di dalam ZIP.");

  let manifest;
  try {
    manifest = JSON.parse(await manifestEntry.async("string"));
  } catch {
    throw new Error("manifest.json rusak / bukan JSON valid.");
  }

  const vk = buildValidKeys();
  const warnings = [];

  // ── kumpulkan tugas upload foto ────────────────────────────────────
  const photoMap = manifest?.photos?.part1 || {};
  const tasks = [];
  for (const [key, list] of Object.entries(photoMap)) {
    if (!Array.isArray(list) || list.length === 0) continue;
    if (!isKnownKey(key, vk)) {
      warnings.push(`photoKey tak dikenal di schema: "${key}" — tetap diimpor apa adanya.`);
    }
    list.forEach((relPath, idx) => {
      const entry = zipFind(zip, relPath);
      if (!entry) {
        warnings.push(`file foto hilang di ZIP: ${relPath}`);
        return;
      }
      tasks.push({ key, idx, relPath, entry });
    });
  }
  if (tasks.length === 0 && !manifest.formData && !manifest.docFields) {
    throw new Error("Manifest tidak berisi foto maupun data untuk diimpor.");
  }

  // ── upload foto ke storage ────────────────────────────────────────
  // Utama: uploadDual (MinIO via presign + salinan Firebase).
  // Fallback: kalau server presign tidak jalan (dev tanpa `server/`),
  //           pakai Firebase Storage saja — URL-nya tetap valid untuk laporan.
  const uploadedByKey = {}; // photoKey -> [primaryUrl, ...]
  const fbByUrl = {}; // primaryUrl -> firebaseUrl (untuk photos_fb)
  let done = 0;
  let nDual = 0;
  let nFbOnly = 0;
  const failed = [];
  for (const t of tasks) {
    const blob = await t.entry.async("blob");
    const ct = contentTypeFor(t.relPath);
    const path = `pengujian/${uid}/${pengujianId}/part1/${t.key}/${Date.now()}-${t.idx}`;
    let primary = null;
    try {
      const { vpsUrl, fbUrl } = await uploadDual(path, blob, ct);
      primary = vpsUrl;
      if (fbUrl) fbByUrl[vpsUrl] = fbUrl;
      nDual += 1;
    } catch (errDual) {
      const fbUrl = await uploadFirebaseOnly(path, blob, ct);
      if (fbUrl) {
        primary = fbUrl;
        fbByUrl[fbUrl] = fbUrl;
        nFbOnly += 1;
      } else {
        failed.push(t.relPath);
        console.warn("[importZip] upload gagal (VPS & Firebase):", t.relPath, errDual);
      }
    }
    if (primary) (uploadedByKey[t.key] ||= []).push(primary);
    done += 1;
    onProgress?.(Math.round((done / tasks.length) * 100), done, tasks.length);
    onLog?.(`Upload ${done}/${tasks.length} — ${t.key}`);
  }
  if (nFbOnly > 0) {
    warnings.push(`${nFbOnly} foto diunggah ke Firebase Storage saja `
      + `(server presign :8787 tidak aktif). URL tetap valid.`);
  }
  if (failed.length > 0) {
    warnings.push(`${failed.length} foto GAGAL diunggah: ${failed.slice(0, 5).join(", ")}`
      + (failed.length > 5 ? " …" : ""));
  }
  if (nDual === 0 && nFbOnly === 0 && tasks.length > 0) {
    throw new Error("Semua upload foto gagal — cek koneksi / login / Storage rules.");
  }

  // ── baca doc terkini + merge ──────────────────────────────────────
  onLog?.("Menyimpan ke dokumen…");
  const ref = doc(db, "pengujian", pengujianId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error(`Dokumen pengujian "${pengujianId}" tidak ditemukan. Buat lewat form dulu.`);
  }
  const cur = snap.data();

  // formData: deep-merge
  const curFormData = cur.formData && typeof cur.formData === "object"
    ? cur.formData
    : { part1: {}, part2: {} };
  const newFormData = mergeDeep(curFormData, manifest.formData || {});

  // photos: append + dedupe per key
  const curPhotos = cur.photos && typeof cur.photos === "object"
    ? cur.photos
    : { part1: {}, part2: {} };
  const newPart1 = { ...(curPhotos.part1 || {}) };
  for (const [key, urls] of Object.entries(uploadedByKey)) {
    const existing = Array.isArray(newPart1[key]) ? newPart1[key] : [];
    const merged = [...existing];
    for (const u of urls) if (!merged.includes(u)) merged.push(u);
    newPart1[key] = merged;
  }
  const newPhotos = { ...curPhotos, part1: newPart1 };

  // photos_fb: bangun ulang paralel (existing map + yang baru)
  const fbLookup = { ...flattenFbMap(curPhotos, cur.photos_fb), ...fbByUrl };
  const newPhotosFb = mapPhotosTree(newPhotos, (u) => fbLookup[u] ?? null);

  // docFields: isi hanya yang kosong
  const patch = {
    formData: newFormData,
    photos: newPhotos,
    photos_fb: newPhotosFb,
    updatedAt: new Date(),
  };
  const fieldsFilled = [];
  const df = manifest.docFields || {};
  for (const [k, v] of Object.entries(df)) {
    if (v === "" || v == null) continue;
    const existing = cur[k];
    if (existing === undefined || existing === null || existing === "") {
      patch[k] = v;
      fieldsFilled.push(k);
    } else if (String(existing).trim() !== String(v).trim()) {
      warnings.push(`Field "${k}" sudah terisi ("${existing}") — nilai manifest ("${v}") dilewati.`);
    }
  }

  await updateDoc(ref, patch);
  onLog?.("Selesai.");

  return {
    photoCount: tasks.length,
    keyCount: Object.keys(uploadedByKey).length,
    fieldsFilled,
    warnings,
  };
}
