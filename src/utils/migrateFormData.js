/**
 * One-time client-side migration when loading old pengujian documents.
 * Converts legacy flat-format groups to the new `{ rows: [] }` dynamic format.
 *
 * Groups migrated:
 *   outgoing  : flat object      → { rows: [flatObject] }
 *   lbs1+lbs2 : two flat objects → { lbs: { rows: [lbs1, lbs2] } }
 *   la1+la2   : two flat objects → { la:  { rows: [la1, la2] } }
 *   putaran_fasa photos: phb_tm.putaran_fasa[0,1,2…] → phb_tm.putaran_fasa.N each
 *   lbs1/lbs2 photos   → phb_tm.lbs.0 / phb_tm.lbs.1
 *   la1/la2   photos   → phb_tm.la.0  / phb_tm.la.1
 *   outgoing  photos   → phb_tm.outgoing.0
 */
export function migrateFormData(rawFormData, rawPhotos) {
  // Deep-clone to avoid mutating caller's state
  const fd = deepClone(rawFormData ?? {});
  const ph = { part1: { ...(rawPhotos?.part1 ?? {}) }, part2: { ...(rawPhotos?.part2 ?? {}) } };

  const phb = fd.part1?.phb_tm;
  if (!phb) return { formData: fd, photos: ph };

  // ── outgoing ────────────────────────────────────────────────────────
  // Old: { merk, tipe, jenisPemutus, ratingV, ratingI, tipePemutus }
  // New: { rows: [{ merk, tipe, … }] }
  if (phb.outgoing && !Array.isArray(phb.outgoing?.rows)) {
    const old = phb.outgoing;
    // If it looks like a flat data object (has merk/tipe/etc keys)
    const isFlat = "merk" in old || "tipe" in old || "ratingV" in old;
    if (isFlat) {
      const hasData = Object.values(old).some(v => v !== "" && v != null);
      phb.outgoing = { rows: hasData ? [old] : [] };
    } else {
      phb.outgoing = { rows: [] };
    }
  }

  // ── outgoing photos ──────────────────────────────────────────────────
  // Old key: "phb_tm.outgoing"  → New: "phb_tm.outgoing.0"
  migratePhotoGroupToRow(ph.part1, "phb_tm.outgoing", "phb_tm.outgoing", 0, false);

  // ── lbs ─────────────────────────────────────────────────────────────
  // Old: lbs1 + lbs2 flat objects → lbs.rows
  if (!Array.isArray(phb.lbs?.rows)) {
    const rows = [];
    if (phb.lbs1 && typeof phb.lbs1 === "object") {
      const hasData = Object.values(phb.lbs1).some(v => v !== "" && v != null);
      if (hasData) rows.push({ ...phb.lbs1 });
    }
    if (phb.lbs2 && typeof phb.lbs2 === "object") {
      const hasData = Object.values(phb.lbs2).some(v => v !== "" && v != null);
      if (hasData) rows.push({ ...phb.lbs2 });
    }
    phb.lbs = { rows };
  }

  // ── lbs photos ──────────────────────────────────────────────────────
  migratePhotoKeyRename(ph.part1, "phb_tm.lbs1", "phb_tm.lbs.0");
  migratePhotoKeyRename(ph.part1, "phb_tm.lbs2", "phb_tm.lbs.1");

  // ── la ──────────────────────────────────────────────────────────────
  // Old: la1 + la2 flat objects → la.rows
  if (!Array.isArray(phb.la?.rows)) {
    const rows = [];
    if (phb.la1 && typeof phb.la1 === "object") {
      const hasData = Object.values(phb.la1).some(v => v !== "" && v != null);
      if (hasData) rows.push({ ...phb.la1 });
    }
    if (phb.la2 && typeof phb.la2 === "object") {
      const hasData = Object.values(phb.la2).some(v => v !== "" && v != null);
      if (hasData) rows.push({ ...phb.la2 });
    }
    phb.la = { rows };
  }

  // ── la photos ───────────────────────────────────────────────────────
  migratePhotoKeyRename(ph.part1, "phb_tm.la1", "phb_tm.la.0");
  migratePhotoKeyRename(ph.part1, "phb_tm.la2", "phb_tm.la.1");

  // ── putaran_fasa ─────────────────────────────────────────────────────
  // Old: photoOnly group, photos stored at "phb_tm.putaran_fasa" (flat array)
  // New: dynamic, photos at "phb_tm.putaran_fasa.N" one per row
  if (!Array.isArray(phb.putaran_fasa?.rows)) {
    phb.putaran_fasa = { rows: [] };
  }

  // Old photos: "phb_tm.putaran_fasa" = [url1, url2, url3]
  // → "phb_tm.putaran_fasa.0" = [url1], ".1" = [url2], ".2" = [url3]
  const oldPutKey = "phb_tm.putaran_fasa";
  const oldPutPhotos = ph.part1[oldPutKey];
  if (Array.isArray(oldPutPhotos) && oldPutPhotos.length > 0) {
    const hasNewKeys = Object.keys(ph.part1).some(k =>
      k.startsWith("phb_tm.putaran_fasa.") && /\d+$/.test(k)
    );
    if (!hasNewKeys) {
      oldPutPhotos.forEach((url, i) => {
        ph.part1[`phb_tm.putaran_fasa.${i}`] = [url];
      });
      delete ph.part1[oldPutKey];
      // Ensure rows array matches photo count
      const needed = oldPutPhotos.length;
      const current = phb.putaran_fasa.rows.length;
      for (let i = current; i < needed; i++) phb.putaran_fasa.rows.push({});
    }
  }

  fd.part1 = { ...fd.part1, phb_tm: phb };

  return { formData: fd, photos: ph };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Move all photos from `oldKey` to `newKey.rowIndex` in a single flat photos object.
 * Used when a static group (e.g. "phb_tm.outgoing") becomes row 0 of a dynamic group.
 * Does nothing if `newKey.rowIndex` already exists.
 */
function migratePhotoGroupToRow(photosMap, oldKey, newKeyBase, rowIndex, removeOld = true) {
  const old = photosMap[oldKey];
  const rowKey = `${newKeyBase}.${rowIndex}`;
  if (Array.isArray(old) && old.length > 0 && !photosMap[rowKey]) {
    photosMap[rowKey] = [...old];
    if (removeOld) delete photosMap[oldKey];
  }
}

/**
 * Rename a photo key (e.g. "phb_tm.lbs1" → "phb_tm.lbs.0").
 * Does nothing if the new key already exists.
 */
function migratePhotoKeyRename(photosMap, oldKey, newKey) {
  const old = photosMap[oldKey];
  if (Array.isArray(old) && old.length > 0 && !photosMap[newKey]) {
    photosMap[newKey] = [...old];
    delete photosMap[oldKey];
  }
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
