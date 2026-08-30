import { Filesystem, Directory } from "@capacitor/filesystem";
import { Capacitor } from "@capacitor/core";
import db from "./db";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const BASE_DIR = Directory.Data;

function isNative() {
  return Capacitor.isNativePlatform();
}

// Convert Firebase Storage URL → safe file path
// e.g. "pengujian/uid123/docAbc/part1/photo0" → "pengujian/uid123/docAbc/part1/photo0.jpg"
function urlToPath(url) {
  try {
    const u = new URL(url);
    // Extract path segment after /o/
    const match = u.pathname.match(/\/o\/(.+)/);
    if (match) {
      const decoded = decodeURIComponent(match[1]).replace(/\?.*$/, "");
      return "photo_cache/" + decoded;
    }
  } catch {}
  // fallback: hash the URL
  return "photo_cache/misc/" + btoa(url).replace(/[^a-zA-Z0-9]/g, "").slice(0, 40);
}

export async function getCachedPhotoUrl(firebaseUrl) {
  if (!isNative()) return firebaseUrl; // web: use URL directly

  const row = await db.photoCache.get(firebaseUrl);
  if (row) {
    // Check file actually exists
    try {
      await Filesystem.stat({ path: row.filePath, directory: BASE_DIR });
      const uri = await Filesystem.getUri({ path: row.filePath, directory: BASE_DIR });
      return Capacitor.convertFileSrc(uri.uri);
    } catch {
      await db.photoCache.delete(firebaseUrl);
    }
  }
  return null; // not cached
}

export async function cachePhoto(firebaseUrl, blob) {
  if (!isNative()) return;

  const filePath = urlToPath(firebaseUrl);
  const dir = filePath.substring(0, filePath.lastIndexOf("/"));

  try {
    await Filesystem.mkdir({ path: dir, directory: BASE_DIR, recursive: true });
  } catch {}

  const base64 = await blobToBase64(blob);
  await Filesystem.writeFile({ path: filePath, data: base64, directory: BASE_DIR });

  await db.photoCache.put({ url: firebaseUrl, cachedAt: Date.now(), filePath });
}

export async function saveLocalPhoto(localBlob, storagePath) {
  if (!isNative()) {
    return URL.createObjectURL(localBlob);
  }

  const filePath = "photo_local/" + storagePath;
  const dir = filePath.substring(0, filePath.lastIndexOf("/"));

  try {
    await Filesystem.mkdir({ path: dir, directory: BASE_DIR, recursive: true });
  } catch {}

  const base64 = await blobToBase64(localBlob);
  await Filesystem.writeFile({ path: filePath, data: base64, directory: BASE_DIR });

  const uri = await Filesystem.getUri({ path: filePath, directory: BASE_DIR });
  return Capacitor.convertFileSrc(uri.uri);
}

export async function readLocalPhotoAsBlob(localPath) {
  if (!isNative()) return null;
  try {
    const result = await Filesystem.readFile({ path: localPath, directory: BASE_DIR });
    const byteCharacters = atob(result.data);
    const byteArray = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteArray[i] = byteCharacters.charCodeAt(i);
    }
    return new Blob([byteArray], { type: "image/jpeg" });
  } catch {
    return null;
  }
}

export async function cleanExpiredCache() {
  const cutoff = Date.now() - SEVEN_DAYS_MS;
  const expired = await db.photoCache.where("cachedAt").below(cutoff).toArray();

  for (const row of expired) {
    try {
      await Filesystem.deleteFile({ path: row.filePath, directory: BASE_DIR });
    } catch {}
    await db.photoCache.delete(row.url);
  }

  return expired.length;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
