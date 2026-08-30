/** getField(form, "part1.phb_tm.nameplate_outgoing.merk") */
export function getField(obj, path, fallback = "-") {
  if (!obj) return fallback;
  const v = path.split(".").reduce((cur, k) => (cur == null ? cur : cur[k]), obj);
  if (v === "" || v == null) return fallback;
  return v;
}

/**
 * getPhotos(photos, "part1", "phb_tm.nameplate_outgoing")
 * Fallback ke key format lama (underscore) untuk laporan lama.
 */
export function getPhotos(photos, part, key) {
  if (!photos?.[part]) return [];
  if (Array.isArray(photos[part][key])) return photos[part][key];
  const legacy = key.replace(/\./g, "_");
  if (Array.isArray(photos[part][legacy])) return photos[part][legacy];
  return [];
}

function toDate(v) {
  if (!v) return null;
  if (typeof v === "string") return new Date(v);
  if (v?.toDate) return v.toDate();
  return new Date(v);
}

export function formatDate(v) {
  const d = toDate(v); if (!d || isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export function formatHari(v) {
  const d = toDate(v); if (!d || isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", { weekday: "long" });
}