import JSZip from "jszip";
import { formSchema } from "../schema/formSchema";

/* ── sanitize folder/file names ─────────────────────────────────── */
function san(s) {
  return String(s || "").replace(/[<>:"/\\|?*\n\r]/g, "-").replace(/\s+/g, " ").trim() || "Lainnya";
}

/* ── Build static map: photoKey → folder path ───────────────────── */
function buildKeyMap() {
  const map = {};          // exact key → folder string
  const dynMap = {};       // "eqKey.groupKey" → { eqLabel, groupLabel }

  for (const eq of formSchema.part1) {
    if (!Array.isArray(eq.groups)) continue;
    const eqLabel = san(eq.label);

    for (const grp of eq.groups) {
      const grpLabel = san(grp.label);

      if (grp.kind === "dynamic") {
        // Rows are indexed at runtime — handle below
        dynMap[`${eq.key}.${grp.key}`] = { eqLabel, groupLabel: grpLabel };
        continue;
      }

      if (grp.perFieldPhotos) {
        for (const f of grp.fields) {
          const photoKey = `${eq.key}.${grp.key}.${f.name}`;
          map[photoKey] = `${eqLabel}/${grpLabel}/${san(f.label)}`;
        }
      } else if (grp.photo) {
        const photoKey = `${eq.key}.${grp.key}`;
        map[photoKey] = `${eqLabel}/${grpLabel}`;
      }
    }
  }

  return { map, dynMap };
}

const { map: PHOTO_KEY_MAP, dynMap: DYN_MAP } = buildKeyMap();

/* ── Resolve any raw photoKey → folder path ─────────────────────── */
function resolveFolder(photoKey) {
  if (PHOTO_KEY_MAP[photoKey]) return PHOTO_KEY_MAP[photoKey];

  // Dynamic rows: "eqKey.groupKey.{number}"
  const dotIdx = photoKey.lastIndexOf(".");
  if (dotIdx !== -1) {
    const maybeIdx = photoKey.slice(dotIdx + 1);
    if (/^\d+$/.test(maybeIdx)) {
      const baseKey = photoKey.slice(0, dotIdx);
      const dyn = DYN_MAP[baseKey];
      if (dyn) {
        const rowNum = parseInt(maybeIdx, 10) + 1;
        return `${dyn.eqLabel}/${dyn.groupLabel}/${dyn.groupLabel} ${rowNum}`;
      }
    }
  }

  // Unknown key — dump to root of zip
  return `Lainnya/${san(photoKey)}`;
}

/* ── Fetch one URL as Blob ───────────────────────────────────────── */
async function fetchBlob(url) {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    return res.blob();
  } catch {
    return null;
  }
}

/* ── Guess extension from URL ────────────────────────────────────── */
function guessExt(url) {
  try {
    const path = new URL(url).pathname;
    const m = path.match(/\.(jpe?g|png|webp|gif)$/i);
    return m ? m[0].toLowerCase() : ".jpg";
  } catch {
    return ".jpg";
  }
}

/* ═══════════════════════════════════════════════════════════════════
   Main export
   photos    = { part1: { [photoKey]: [url,...] } }
   ttdClient = { signature: { url }, stempel: { url } }  (optional)
   name      = customer name for the zip filename
   onProgress(pct: 0-100) called periodically
═══════════════════════════════════════════════════════════════════ */
export async function downloadPhotosZip(photos, name = "pengujian", onProgress, ttdClient = null) {
  const part1 = photos?.part1 ?? {};

  // Collect form photos
  const items = [];
  for (const [photoKey, urls] of Object.entries(part1)) {
    if (!Array.isArray(urls) || urls.length === 0) continue;
    const folder = resolveFolder(photoKey);
    urls.forEach((url, i) => {
      if (url && typeof url === "string" && !url.startsWith("blob:")) {
        items.push({ folder, url, index: i });
      }
    });
  }

  // Collect TTD client photos
  if (ttdClient) {
    const TTD_LABELS = { signature: "TTD Client", stempel: "Stempel Client" };
    for (const [field, val] of Object.entries(ttdClient)) {
      const url = val?.url;
      if (url && typeof url === "string" && !url.startsWith("blob:")) {
        items.push({ folder: `TTD & Stempel/${TTD_LABELS[field] ?? san(field)}`, url, index: 0 });
      }
    }
  }

  if (items.length === 0) {
    throw new Error("Tidak ada foto untuk diunduh.");
  }

  const zip = new JSZip();
  const total = items.length;
  let done = 0;

  // Fetch in parallel (batches of 6 to avoid overwhelming the browser)
  const BATCH = 6;
  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async ({ folder, url, index }) => {
        const blob = await fetchBlob(url);
        done++;
        onProgress?.(Math.round((done / total) * 100));
        if (!blob) return;
        // Flat: semua foto di root ZIP, nama file = section path + nomor
        const label = folder.replace(/\//g, " - ");
        const fname = `${label}_${String(index + 1).padStart(2, "0")}${guessExt(url)}`;
        zip.file(fname, blob);
      })
    );
  }

  const zipBlob = await zip.generateAsync(
    { type: "blob", compression: "DEFLATE", compressionOptions: { level: 3 } },
    (meta) => onProgress?.(Math.round(meta.percent))
  );

  const a = document.createElement("a");
  a.href = URL.createObjectURL(zipBlob);
  a.download = `Foto-${san(name)}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}
