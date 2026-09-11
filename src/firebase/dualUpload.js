import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./config";
import { uploadViaPresign, publicUrl } from "./secureStorage";

// Upload satu blob ke DUA tempat: MinIO di VPS (via presigned URL) DAN Firebase Storage.
// - VPS wajib sukses — bila gagal, fungsi ini melempar (sama seperti uploadViaPresign lama).
// - Firebase best-effort — bila gagal, hanya di-log, fbUrl = null, tidak melempar.
// Return { vpsUrl, fbUrl }. `path` dipakai identik untuk kedua storage.
export async function uploadDual(path, blob, contentType = "image/jpeg") {
  await uploadViaPresign(path, blob, contentType);
  const vpsUrl = publicUrl(path);

  let fbUrl = null;
  try {
    const r = ref(storage, path);
    await uploadBytes(r, blob, { contentType });
    fbUrl = await getDownloadURL(r);
  } catch (err) {
    console.warn("[dualUpload] salinan Firebase gagal:", path, err?.code || err);
  }

  return { vpsUrl, fbUrl };
}

// Upload HANYA ke Firebase Storage (VPS sudah ditangani di tempat lain, mis. syncEngine).
// Best-effort: gagal → null, tidak melempar.
export async function uploadFirebaseOnly(path, blob, contentType = "image/jpeg") {
  try {
    const r = ref(storage, path);
    await uploadBytes(r, blob, { contentType });
    return await getDownloadURL(r);
  } catch (err) {
    console.warn("[dualUpload] salinan Firebase gagal:", path, err?.code || err);
    return null;
  }
}

// Bentuk pohon foto: { part1: { "eq.grp": [url, ...] }, part2: {...} }.
// Bangun pohon `photos_fb` sejajar `photosTree`: tiap URL VPS dipetakan ke URL Firebase
// lewat `lookup(url)`; slot tanpa salinan Firebase → null (indeks tetap sejajar `photos`).
export function mapPhotosTree(photosTree, lookup) {
  const out = {};
  for (const part in (photosTree || {})) {
    out[part] = {};
    for (const key in (photosTree[part] || {})) {
      out[part][key] = (photosTree[part][key] || []).map((url) =>
        typeof url === "string" ? (lookup(url) ?? null) : null
      );
    }
  }
  return out;
}

// Kebalikannya: dari pohon `photos` + pohon `photos_fb` tersimpan, bangun map { vpsUrl: fbUrl }.
export function flattenFbMap(photosTree, photosFbTree) {
  const m = {};
  for (const part in (photosTree || {})) {
    for (const key in (photosTree[part] || {})) {
      const a = photosTree[part][key] || [];
      const b = photosFbTree?.[part]?.[key] || [];
      a.forEach((url, i) => {
        if (typeof url === "string" && typeof b[i] === "string" && b[i]) m[url] = b[i];
      });
    }
  }
  return m;
}
