import React, { useState } from "react";
import HeaderLogo from "./shared/HeaderLogo";
import IsolasiBlock from "./shared/IsolasiBlock";
import SignatureBlock from "./shared/SignatureBlock";
import { getField, getPhotos, formatDate, formatHari } from "./shared/helpers";
import { formSchema } from "../../schema/formSchema";
import TemplateLaikOperasi from "../laikoperasi/TemplateLaikOperasi";
import { deriveLaikOperasiFromPengujian, mergeLaikOperasiData } from "../../utils/deriveLaikOperasi";
import { getKopStyle } from "./kopStyles";
import { detectUnitPln } from "./plnUnits";

const FORM_STYLE = {
  width: "210mm",
  height: "297mm",       // fixed A4 — sama seperti RAB
  margin: "0 auto 12px", // gap antar halaman di layar (di-reset 0 saat print)
  padding: "12mm 15mm",
  background: "#fff",
  fontFamily: "'Times New Roman', serif",
  fontSize: "11pt",
  color: "#000",
  lineHeight: 1.4,
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",    // konten yang melebihi halaman dikliping
};

// PHB TM sections & kabel TR — field names lowercase (sesuai ISOLASI_FIELDS di formSchema)
const ISOLASI_FIELDS_TM = [
  { name: "rGnd", label: "R-G" },
  { name: "sGnd", label: "S-G" },
  { name: "tGnd", label: "T-G" },
  { name: "rs",   label: "R-S", interphase: true },
  { name: "st",   label: "S-T", interphase: true },
  { name: "rt",   label: "R-T", interphase: true },
];

// Isolasi Primer Trafo — camelCase (rS, sT, tR) sesuai formSchema isolasi_primer
const ISOLASI_FIELDS_TRAFO_P = [
  { name: "rGnd", label: "R-G" },
  { name: "sGnd", label: "S-G" },
  { name: "tGnd", label: "T-G" },
  { name: "rS",   label: "R-S" },
  { name: "sT",   label: "S-T" },
  { name: "tR",   label: "T-R" },
];

// Isolasi Sekunder Trafo — camelCase sesuai formSchema isolasi_skunder
const ISOLASI_FIELDS_TRAFO_S = [
  { name: "rGnd", label: "R-G" },
  { name: "sGnd", label: "S-G" },
  { name: "tGnd", label: "T-G" },
  { name: "nGnd", label: "N-G" },
  { name: "rS",   label: "R-S" },
  { name: "sT",   label: "S-T" },
  { name: "tR",   label: "T-R" },
  { name: "rN",   label: "R-N" },
  { name: "sN",   label: "S-N" },
  { name: "tN",   label: "T-N" },
];

// Isolasi Primer–Sekunder Trafo — sesuai formSchema isolasi_primer_skunder
const ISOLASI_FIELDS_PRIMER_SKUNDER = [
  { name: "PR_SR", label: "P.R / S.R" },
  { name: "PR_SS", label: "P.R / S.S" },
  { name: "PR_ST", label: "P.R / S.T" },
  { name: "PR_SN", label: "P.R / S.N" },
  { name: "PS_SR", label: "P.S / S.R" },
  { name: "PS_SS", label: "P.S / S.S" },
  { name: "PS_ST", label: "P.S / S.T" },
  { name: "PS_SN", label: "P.S / S.N" },
  { name: "PT_SR", label: "P.T / S.R" },
  { name: "PT_SS", label: "P.T / S.S" },
  { name: "PT_ST", label: "P.T / S.T" },
  { name: "PT_SN", label: "P.T / S.N" },
];

// PHB TR isolasi_incoming — lowercase sesuai formSchema
const ISOLASI_FIELDS_TR = [
  { name: "rGnd", label: "R-G" },
  { name: "sGnd", label: "S-G" },
  { name: "tGnd", label: "T-G" },
  { name: "nGnd", label: "N-G", highlight: true },
  { name: "rs",   label: "R-S", interphase: true },
  { name: "st",   label: "S-T", interphase: true },
];

// Hanya pengukuran ke Ground (R-G, S-G, T-G) — tanpa interphase
const ISOLASI_GND_ONLY = [
  { name: "rGnd", label: "R-G" },
  { name: "sGnd", label: "S-G" },
  { name: "tGnd", label: "T-G" },
];

// Compact arrays with interphase/highlight flags — untuk IsolasiValueCol 3-kolom Trafo
const TRAFO_P_COMPACT = [
  { name: "rGnd", label: "R-G" },
  { name: "sGnd", label: "S-G" },
  { name: "tGnd", label: "T-G" },
];

const TRAFO_S_COMPACT = [
  { name: "rGnd", label: "R-G" },
  { name: "sGnd", label: "S-G" },
  { name: "tGnd", label: "T-G" },
  { name: "nGnd", label: "N-G", highlight: true },
];

// Primer–Sekunder 3 field dari isolasi_primer_skunder (PR_SR=R-R, PS_SS=S-S, PT_ST=T-T)
const PS3_FIELDS = [
  { name: "PR_SR", label: "R–R" },
  { name: "PS_SS", label: "S–S" },
  { name: "PT_ST", label: "T–T" },
];

// ─── label lengkap per field untuk format tabel PDF ──────────────────────────
const ISO_LABEL_FULL = {
  rGnd: "R – Ground", sGnd: "S – Ground", tGnd: "T – Ground", nGnd: "N – Ground",
  rs: "R – S", st: "S – T", rt: "T – R",
  rS: "R – S", sT: "S – T", tR: "T – R",
  rN: "R – N", sN: "S – N", tN: "T – N",
  PR_SR: "Primer R / Sekunder R", PR_SS: "Primer R / Sekunder S",
  PR_ST: "Primer R / Sekunder T", PR_SN: "Primer R / Sekunder N",
  PS_SR: "Primer S / Sekunder R", PS_SS: "Primer S / Sekunder S",
  PS_ST: "Primer S / Sekunder T", PS_SN: "Primer S / Sekunder N",
  PT_SR: "Primer T / Sekunder R", PT_SS: "Primer T / Sekunder S",
  PT_ST: "Primer T / Sekunder T", PT_SN: "Primer T / Sekunder N",
};

// ─── helpers ─────────────────────────────────────────────────────────────────
const gf = (form, path) => getField(form, path);
const gp = (photos, part, key) => getPhotos(photos, part, key);

function buildIsoGroup(label, fields, eqKey, groupKey, form, acuan) {
  return {
    label,
    fields: fields.map(f => ({
      label: ISO_LABEL_FULL[f.name] || f.label,
      value: gf(form, `part1.${eqKey}.${groupKey}.${f.name}`),
      acuan,
    })),
  };
}
const avgVals = (vals) => {
  const nums = vals.map(Number).filter(v => !isNaN(v) && v > 0);
  if (!nums.length) return null;
  return Math.round(nums.reduce((s, v) => s + v, 0) / nums.length);
};

// ─── shared cell styles — diterapkan eksplisit pada setiap cell tabel ────────
const B = "1px solid #000";
const TH_C = { border:B, padding:"4px 8px", fontWeight:"bold", textAlign:"center", verticalAlign:"middle" };
const TH_L = { border:B, padding:"4px 8px", fontWeight:"bold", textAlign:"left",   verticalAlign:"middle" };
const TD_C = { border:B, padding:"4px 8px", textAlign:"center", verticalAlign:"middle" };
const TD_L = { border:B, padding:"4px 8px", textAlign:"left",   verticalAlign:"middle" };
const TD_PHOTO = { border:B, padding:4, textAlign:"center", verticalAlign:"middle" };

export default function TemplateAdytia({ data, instansi, sectionCode }) {
  if (!data) return null;
  const form          = data.formData    ?? {};
  const photos        = data.photos      ?? {};
  const ttd           = data.ttd         ?? {};
  const ttd_client    = data.ttd_client  ?? {};
  const instanceCounts  = data.instanceCounts  ?? {};
  const laporanSettings = data.laporanSettings ?? {};

  // Returns ["trafo","trafo_2","trafo_3"…] for a given base key
  const getInstKeys = (baseKey) => {
    const count = Math.max(1, instanceCounts[baseKey] ?? 1);
    return Array.from({ length: count }, (_, i) => (i === 0 ? baseKey : `${baseKey}_${i + 1}`));
  };
  const getInstSettings = (baseKey, idx) => (laporanSettings[baseKey] ?? {})[String(idx)] ?? {};
  const isInstVisible = (baseKey, idx) => !getInstSettings(baseKey, idx).hidden;
  const isGroupVisible = (baseKey, idx, groupKey) =>
    !(getInstSettings(baseKey, idx).hiddenGroups ?? []).includes(groupKey);
  // rows = [[label, value, fieldKey], …]  →  [[label, value], …]  (hidden rows removed)
  const filterTableRows = (baseKey, idx, groupKey, rows) => {
    const hidden = getInstSettings(baseKey, idx).hiddenFields?.[groupKey] ?? [];
    return rows.filter(([, , fk]) => !hidden.includes(fk)).map(([l, v]) => [l, v]);
  };
  // Returns urls array with hidden slots removed
  const filterPhotoSlots = (baseKey, idx, groupKey, urls) => {
    const hidden = getInstSettings(baseKey, idx).hiddenPhotoSlots?.[groupKey] ?? [];
    return urls.filter((_, i) => !hidden.includes(i));
  };
  // For labeled photo arrays: filter by photo slot visibility.
  // Tiap item boleh punya `slot` eksplisit = indeks slot di schema photoLabels
  // (dipakai bila urutan/label di laporan beda dari schema). Default: posisi array.
  const filterLabeledPhotos = (baseKey, idx, groupKey, labeledArr) => {
    const hidden = getInstSettings(baseKey, idx).hiddenPhotoSlots?.[groupKey] ?? [];
    return labeledArr.filter((item, i) => !hidden.includes(item?.slot ?? i));
  };
  // Grup foto tunggal (mis. foto_full_phbtm, acb_utama, nameplate_acb): terlihat &
  // slot 0-nya tidak di-hide di Pengaturan Tampilan Laporan.
  const showGroupPhoto = (baseKey, idx, groupKey) =>
    isGroupVisible(baseKey, idx, groupKey)
    && !(getInstSettings(baseKey, idx).hiddenPhotoSlots?.[groupKey] ?? []).includes(0);
  // Field (kolom tabel) tertentu di-hide dari Pengaturan Tampilan Laporan?
  const isFieldHidden = (baseKey, idx, groupKey, fieldName) =>
    (getInstSettings(baseKey, idx).hiddenFields?.[groupKey] ?? []).includes(fieldName);
  // Slot foto tertentu (perFieldPhotos, key = "group.field") di-hide?
  const isPhotoSlotHidden = (baseKey, idx, photoFieldKey, slotIdx) =>
    (getInstSettings(baseKey, idx).hiddenPhotoSlots?.[photoFieldKey] ?? []).includes(slotIdx);
  // Gabungan: grup disembunyikan (semua slotnya ikut hilang) ATAU slot ini spesifik disembunyikan.
  const isSlotHidden = (baseKey, idx, groupKey, slotIdx) =>
    !isGroupVisible(baseKey, idx, groupKey) || isPhotoSlotHidden(baseKey, idx, groupKey, slotIdx);

  // ── Visibilitas unit "primer" (idx 0) — dipakai section B & C yang meringkas
  // ── data lintas-unit (belum multi-instance aware, sama seperti sebelumnya).
  const tmVisible    = isInstVisible("phb_tm", 0);
  const trafoVisible = isInstVisible("trafo", 0);
  const trVisible    = isInstVisible("phb_tr", 0);

  // ── C.2: baris pengukuran grounding — 1 baris per titik ukur, di-filter oleh
  // ── unit hidden + group hidden + field hidden (mengikuti Pengaturan Tampilan Laporan).
  const GROUNDING_ENTRY_DEFS = [
    { label: "Grounding PHB TM",       baseKey: "phb_tm", groupKey: "grounding_phbtm",      field: "nilai" },
    { label: "Grounding Arester TM",   baseKey: "phb_tm", groupKey: "grounding_arester",    field: "nilai" },
    { label: "Grounding Netral Trafo", baseKey: "trafo",  groupKey: "grounding_pengukuran", field: "nilaiNetral" },
    { label: "Grounding Body Trafo",   baseKey: "trafo",  groupKey: "grounding_pengukuran", field: "nilaiBody" },
    { label: "Grounding PHB TR",       baseKey: "phb_tr", groupKey: "grounding_phbtr",      field: "nilai" },
  ];
  const groundingEntries = GROUNDING_ENTRY_DEFS
    .filter(d => isInstVisible(d.baseKey, 0)
      && isGroupVisible(d.baseKey, 0, d.groupKey)
      && !isFieldHidden(d.baseKey, 0, d.groupKey, d.field))
    .map(d => {
      const nilai = gf(form, `part1.${d.baseKey}.${d.groupKey}.${d.field}`);
      const photoFieldKey = `${d.groupKey}.${d.field}`;
      const pf = gp(photos, "part1", `${d.baseKey}.${photoFieldKey}`);
      const legacyIdx = d.field === "nilaiBody" ? 1 : 0;
      const pic =
        (!isPhotoSlotHidden(d.baseKey, 0, photoFieldKey, 1) && pf[1]) ||
        (!isPhotoSlotHidden(d.baseKey, 0, photoFieldKey, 0) && pf[0]) ||
        gp(photos, "part1", `${d.baseKey}.${d.groupKey}`)[legacyIdx];
      return { label: d.label, nilai, pic };
    });

  // ── C.3: item evaluasi peralatan — tiap item terikat ke unit + grup tertentu.
  // Catatan: "ct_incoming"/"pt_incoming" adalah key lama yang sudah tidak punya
  // toggle di modal (form sekarang cuma isi Outgoing) — jangan di-OR ke sini,
  // karena isGroupVisible untuk key yang tidak pernah ada di hiddenGroups akan
  // selalu true dan bikin toggle Outgoing jadi tidak berpengaruh (no-op).
  const c3Vis = {
    lbs:    tmVisible    && isGroupVisible("phb_tm", 0, "lbs"),
    ct:     tmVisible    && isGroupVisible("phb_tm", 0, "ct_outgoing"),
    ptFuse: tmVisible    && (isGroupVisible("phb_tm", 0, "pt_outgoing") || isGroupVisible("phb_tm", 0, "fuse")),
    dgpt:   trafoVisible && isGroupVisible("trafo", 0, "dgpt"),
    acb:    trVisible    && isGroupVisible("phb_tr", 0, "acb_utama"),
    kran:   trafoVisible && (isGroupVisible("trafo", 0, "kran_atas") || isGroupVisible("trafo", 0, "kran_bawah")),
  };

  const fp = { form, photos, instansi, data, ttd, ttd_client, sectionCode };

  return (
    <div className="laporan-doc">
      {!sectionCode && <Cover data={data} instansi={instansi} />}

      {/* ── F. PENDAHULUAN & RINGKASAN ── */}
      <LhppPage {...fp} code="F" title="PENDAHULUAN &amp; RINGKASAN EKSEKUTIF">
        <PendahuluanContent form={form} data={data} instansi={instansi} ttd={ttd} />
      </LhppPage>

      {/* ── A. PEMERIKSAAN DOKUMEN ── */}
      {getInstKeys("phb_tm").map((instKey, idx) => {
        if (!isInstVisible("phb_tm", idx)) return null;
        const isMulti = (instanceCounts.phb_tm ?? 1) > 1;
        // "Foto Full PHB TM" berasal dari grup `foto_full_phbtm` (punya toggle sendiri di
        // pengaturan). "Foto Nameplate PHB TM" = slot 1 grup `incoming`.
        const fullPhbtmVisible = showGroupPhoto("phb_tm", idx, "foto_full_phbtm");
        const incomingPhotos = filterLabeledPhotos("phb_tm", idx, "incoming", [
          { label: "Foto Nameplate PHB TM", url: gp(photos,"part1",`${instKey}.incoming`)[1], slot: 1 },
          ...(fullPhbtmVisible ? [{
            label: "Foto Full PHB TM",
            url: gp(photos,"part1",`${instKey}.foto_full_phbtm`)[0] || gp(photos,"part1",`${instKey}.incoming`)[3] || gp(photos,"part1",`${instKey}.spesifikasi`)[0],
            slot: -1,
          }] : []),
        ]);
        return (
          <LhppPage key={instKey} {...fp} code="A.1"
            title={isMulti ? `SPESIFIKASI TEKNIK PHB TM ${idx + 1}` : "SPESIFIKASI TEKNIK PHB TM"}
            docs={<LabeledPhotoRow photos={incomingPhotos} />}
          >
            <NameplateTable rows={filterTableRows("phb_tm", idx, "incoming", [
              ["Spesifikasi",         gf(form, `part1.${instKey}.incoming.spesifikasi`) || gf(form, `part1.${instKey}.spesifikasi.spesifikasi`),  "spesifikasi"],
              ["Tahun Pembuatan",     gf(form, `part1.${instKey}.incoming.tahun`)        || gf(form, `part1.${instKey}.spesifikasi.tahun`),         "tahun"],
              ["Merk",                gf(form, `part1.${instKey}.incoming.merk`),          "merk"],
              ["Tipe",                gf(form, `part1.${instKey}.incoming.tipe`),          "tipe"],
              ["Jenis Pemutus",       gf(form, `part1.${instKey}.incoming.jenisPemutus`),  "jenisPemutus"],
              ["Rating Tegangan (V)", gf(form, `part1.${instKey}.incoming.ratingV`),       "ratingV"],
              ["Rating Arus (A)",     gf(form, `part1.${instKey}.incoming.ratingI`),       "ratingI"],
            ])} />
          </LhppPage>
        );
      })}

      {(() => {
        const idx = 0;
        if (!isInstVisible("phb_tm", idx)) return null;
        // Grup kabel yang dipakai: yang terlihat & ada isinya (outgoing dulu — itu yang diisi
        // di form), lalu incoming, lalu kabel_sktm (data lama). Fallback: incoming/outgoing
        // yang masih terlihat walau kosong, supaya section tidak hilang total.
        const candidates = ["kabel_outgoing", "kabel_incoming", "kabel_sktm"];
        const hasData = (g) =>
          gf(form, `part1.phb_tm.${g}.merk`) || gf(form, `part1.phb_tm.${g}.tipe`) ||
          gf(form, `part1.phb_tm.${g}.ukuran`) || gf(form, `part1.phb_tm.${g}.panjang`);
        const pick =
          candidates.find(g => isGroupVisible("phb_tm", idx, g) && hasData(g)) ||
          candidates.find(g => g !== "kabel_sktm" && isGroupVisible("phb_tm", idx, g)) ||
          null;
        if (!pick) return null;

        const rows = filterTableRows("phb_tm", idx, pick, [
          ["Merk",         gf(form, `part1.phb_tm.${pick}.merk`),    "merk"],
          ["Tipe / Jenis", gf(form, `part1.phb_tm.${pick}.tipe`),    "tipe"],
          ["Ukuran",       gf(form, `part1.phb_tm.${pick}.ukuran`),  "ukuran"],
          ["Panjang (m)",  gf(form, `part1.phb_tm.${pick}.panjang`), "panjang"],
        ]);
        const jalurHidden = (getInstSettings("phb_tm", idx).hiddenPhotoSlots?.[pick] ?? []).includes(1);
        const jalurUrl = gp(photos, "part1", `phb_tm.${pick}`)[1];

        return (
          <LhppPage {...fp} code="A.2" title="SPESIFIKASI TEKNIK SALURAN TM"
            docs={jalurHidden ? undefined : (
              <>
                <DocsHeading>Dokumentasi :</DocsHeading>
                <div style={{ border: B, marginBottom: 8 }}>
                  <div style={{ background: "#1a3a6b", color: "#fff", padding: "3px 8px", fontWeight: "bold", fontSize: "9pt" }}>
                    Foto Jalur Kabel TM
                  </div>
                  <div style={{ padding: 8, background: "#f8fafc", textAlign: "center" }}>
                    {jalurUrl ? (
                      <img src={jalurUrl} alt="Foto Jalur Kabel TM"
                        style={{ width: 320, height: 320, objectFit: "cover", display: "block", margin: "0 auto" }} />
                    ) : <span style={{ color: "#bbb", fontSize: "8pt", fontStyle: "italic" }}>tidak ada foto</span>}
                  </div>
                </div>
              </>
            )}
          >
            <NameplateTable rows={rows} />
          </LhppPage>
        );
      })()}

      {getInstKeys("trafo").map((instKey, idx) => {
        if (!isInstVisible("trafo", idx)) return null;
        const isMulti = (instanceCounts.trafo ?? 1) > 1;
        const npPhotos = gp(photos, "part1", `${instKey}.nameplate`);

        // Kontrol foto hardcode (setup sama seperti A.2): cek langsung hiddenPhotoSlots.nameplate.
        // schema photoLabels: 0 = "Foto Full Trafo", 1 = "Foto Nameplate Trafo".
        const npHidden = getInstSettings("trafo", idx).hiddenPhotoSlots?.nameplate ?? [];
        const trafoFotos = [
          { label: "Foto Full Trafo",      url: npPhotos[0], slot: 0 },
          { label: "Foto Nameplate Trafo", url: npPhotos[1], slot: 1 },
        ].filter(p => !npHidden.includes(p.slot));

        const rows = filterTableRows("trafo", idx, "nameplate", [
          ["Merk",                         gf(form, `part1.${instKey}.nameplate.merk`),            "merk"],
          ["Type / Vector Group",          gf(form, `part1.${instKey}.nameplate.typeVector`),      "typeVector"],
          ["No Seri",                      gf(form, `part1.${instKey}.nameplate.noSeri`),          "noSeri"],
          ["Kapasitas (kVA)",              gf(form, `part1.${instKey}.nameplate.kapasitas`),       "kapasitas"],
          ["Tahun Pembuatan",              gf(form, `part1.${instKey}.nameplate.tahun`),           "tahun"],
          ["Tegangan Primer/Sekunder (V)", gf(form, `part1.${instKey}.nameplate.teganganPS`),      "teganganPS"],
          ["Arus Primer/Sekunder (A)",     gf(form, `part1.${instKey}.nameplate.arusPS`),          "arusPS"],
          ["Impedensi (%)",                gf(form, `part1.${instKey}.nameplate.impedensi`),       "impedensi"],
          ["Sistem Pendingin",             gf(form, `part1.${instKey}.nameplate.sistemPendingin`), "sistemPendingin"],
          ["Berat (kg)",                   gf(form, `part1.${instKey}.nameplate.berat`),           "berat"],
        ]);

        return (
          <LhppPage key={instKey} {...fp} code="A.3"
            title={isMulti ? `SPESIFIKASI TEKNIK TRAFO ${idx + 1}` : "SPESIFIKASI TEKNIK TRAFO"}
            docs={trafoFotos.length ? (
              <>
                <DocsHeading>Dokumentasi :</DocsHeading>
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8, tableLayout: "fixed" }}>
                  <tbody><tr>
                    {trafoFotos.map((p, i) => (
                      <td key={i} style={{ border: B, padding: 0, verticalAlign: "top", textAlign: "center", width: `${100 / trafoFotos.length}%` }}>
                        <div style={{ background: "#1a3a6b", color: "#fff", padding: "3px 8px", fontWeight: "bold", fontSize: "9pt" }}>{p.label}</div>
                        <div style={{ padding: 6, background: "#f8fafc" }}>
                          {p.url
                            ? <img src={p.url} alt={p.label} style={{ width: "100%", height: 260, objectFit: "cover", display: "block" }} />
                            : <span style={{ color: "#bbb", fontSize: "8pt", fontStyle: "italic" }}>tidak ada foto</span>}
                        </div>
                      </td>
                    ))}
                  </tr></tbody>
                </table>
              </>
            ) : undefined}
          >
            <NameplateTable rows={rows} />
          </LhppPage>
        );
      })}

      {(() => {
        const idx = 0;
        if (!isInstVisible("phb_tr", idx)) return null;
        const G = "kabel_tr";
        if (!isGroupVisible("phb_tr", idx, G)) return null;

        // Setup persis A.2: tabel spec + 1 foto "Foto Jalur Kabel TR" (slot 1), hide-aware.
        const rows = filterTableRows("phb_tr", idx, G, [
          ["Merk",         gf(form, "part1.phb_tr.kabel_tr.merk"),    "merk"],
          ["Tipe / Jenis", gf(form, "part1.phb_tr.kabel_tr.tipe"),    "tipe"],
          ["Ukuran",       gf(form, "part1.phb_tr.kabel_tr.ukuran"),  "ukuran"],
          ["Panjang (m)",  gf(form, "part1.phb_tr.kabel_tr.panjang"), "panjang"],
        ]);
        const jalurHidden = (getInstSettings("phb_tr", idx).hiddenPhotoSlots?.[G] ?? []).includes(1);
        const jalurUrl = gp(photos, "part1", "phb_tr.kabel_tr")[1];

        return (
          <LhppPage {...fp} code="A.4" title="SPESIFIKASI TEKNIK KABEL TR"
            docs={jalurHidden ? undefined : (
              <>
                <DocsHeading>Dokumentasi :</DocsHeading>
                <div style={{ border: B, marginBottom: 8 }}>
                  <div style={{ background: "#1a3a6b", color: "#fff", padding: "3px 8px", fontWeight: "bold", fontSize: "9pt" }}>
                    Foto Jalur Kabel TR
                  </div>
                  <div style={{ padding: 8, background: "#f8fafc", textAlign: "center" }}>
                    {jalurUrl ? (
                      <img src={jalurUrl} alt="Foto Jalur Kabel TR"
                        style={{ width: 320, height: 320, objectFit: "cover", display: "block", margin: "0 auto" }} />
                    ) : <span style={{ color: "#bbb", fontSize: "8pt", fontStyle: "italic" }}>tidak ada foto</span>}
                  </div>
                </div>
              </>
            )}
          >
            <NameplateTable rows={rows} />
          </LhppPage>
        );
      })()}

      {getInstKeys("phb_tr").map((instKey, idx) => {
        if (!isInstVisible("phb_tr", idx)) return null;
        const isMulti = (instanceCounts.phb_tr ?? 1) > 1;
        const specKey = instKey === "phb_tr" ? "phb_tr_spec" : `phb_tr_spec${instKey.slice("phb_tr".length)}`;
        // 3 foto dari 3 grup berbeda — tiap grup punya toggle sendiri di pengaturan.
        const phbTrPhotos = filterLabeledPhotos("phb_tr", idx, "phb_tr_full", [
          ...(showGroupPhoto("phb_tr", idx, "phb_tr_full")   ? [{ label: "Foto Full PHB TR",   url: gp(photos,"part1",`${instKey}.phb_tr_full`)[0],   slot: 0  }] : []),
          ...(showGroupPhoto("phb_tr", idx, "acb_utama")     ? [{ label: "Foto ACB Utama",     url: gp(photos,"part1",`${instKey}.acb_utama`)[0],     slot: -1 }] : []),
          ...(showGroupPhoto("phb_tr", idx, "nameplate_acb") ? [{ label: "Foto Nameplate ACB", url: gp(photos,"part1",`${instKey}.nameplate_acb`)[0], slot: -1 }] : []),
        ]);
        return (
          <LhppPage key={instKey} {...fp} code="A.5"
            title={isMulti ? `SPESIFIKASI TEKNIK PHB TR ${idx + 1}` : "SPESIFIKASI TEKNIK PHB TR"}
            docs={<LabeledPhotoRow photos={phbTrPhotos} />}
          >
            <PhbTrSpekA5
              specRows={form.part1?.[specKey]?.rows ?? []}
              acb={form.part1?.[instKey]?.acb_utama ?? {}}
              acbAnalisa={form.part1?.[instKey]?.acb_analisa ?? {}}
            />
          </LhppPage>
        );
      })}

      <LhppPage {...fp} code="A.6" title="HASIL UJI PABRIK / SERTIFIKAT PRODUK PERALATAN UTAMA"
        docs={<LabeledPhotoRow photos={
          gp(photos,"part1","lain_lain.sertifikat").map((url,i)=>({ label: `Foto Sertifikat ${i+1}`, url }))
        } />}
      >
        <SuratPernyataan data={data} instansi={instansi} />
      </LhppPage>

      {/* ── B. PEMERIKSAAN KESESUAIAN DOKUMEN ── */}
      <LhppPage {...fp} code="B.1" title="KONSTRUKSI — DOKUMENTASI FOTO">
        <AllEquipmentPhotos photos={photos} hiddenUnits={{
          phb_tm: !tmVisible,
          trafo:  !trafoVisible,
          phb_tr: !trVisible,
        }} hidden={{
          fotoFullPhbtm:  isSlotHidden("phb_tm", 0, "foto_full_phbtm", 0),
          incomingSlot3:  isSlotHidden("phb_tm", 0, "incoming", 3),
          nameplateSlot0: isSlotHidden("trafo", 0, "nameplate", 0),
          phbTrFullSlot0: isSlotHidden("phb_tr", 0, "phb_tr_full", 0),
        }} />
      </LhppPage>

      {/* ── B.2 Sistem Pembumian — dipecah per alat, foto pembumian saja (tanpa nilai). */}
      {/*    Nilai tahanan pembumian tetap di C.2 (PENGUKURAN TAHANAN PEMBUMIAN). ── */}
      {tmVisible && isGroupVisible("phb_tm", 0, "grounding_cubicle") && (
        <LhppPage {...fp} code="B.2.1" title="SISTEM PEMBUMIAN — PHB TM">
          <LabeledPhotoGrid photos={[
            !isPhotoSlotHidden("phb_tm", 0, "grounding_cubicle", 0) && { label: "Grounding Body Cubicle (Dalam)", urls: gp(photos,"part1","phb_tm.grounding_cubicle").slice(0,1) },
            !isPhotoSlotHidden("phb_tm", 0, "grounding_cubicle", 1) && { label: "Ground Rod Cubicle (Luar)",      urls: gp(photos,"part1","phb_tm.grounding_cubicle").slice(1,2) },
          ].filter(Boolean)} />
        </LhppPage>
      )}

      {trVisible && isGroupVisible("phb_tr", 0, "grounding_cubicle") && (
        <LhppPage {...fp} code="B.2.2" title="SISTEM PEMBUMIAN — PHB TR">
          <LabeledPhotoGrid photos={[
            !isPhotoSlotHidden("phb_tr", 0, "grounding_cubicle", 0) && { label: "Grounding PHB TR", urls: gp(photos,"part1","phb_tr.grounding_cubicle").slice(0,1) },
          ].filter(Boolean)} />
        </LhppPage>
      )}

      {trafoVisible && (isGroupVisible("trafo", 0, "grounding_netral") || isGroupVisible("trafo", 0, "grounding_body")) && (
        <LhppPage {...fp} code="B.2.3" title="SISTEM PEMBUMIAN — TRAFO">
          <LabeledPhotoGrid photos={[
            isGroupVisible("trafo", 0, "grounding_netral") && { label: "Grounding Netral Trafo", urls: gp(photos,"part1","trafo.grounding_netral").slice(0,1) },
            isGroupVisible("trafo", 0, "grounding_body")   && { label: "Grounding Body Trafo",   urls: gp(photos,"part1","trafo.grounding_body").slice(0,1) },
          ].filter(Boolean)} />
        </LhppPage>
      )}

      <LhppPage {...fp} code="B.3" title="PENGAMAN ELEKTRIK">
        <PengamanElektrikNarasi form={form} photos={photos} vis={{
          cbTm:      tmVisible && isGroupVisible("phb_tm", 0, "incoming"),
          relayTm:   tmVisible && isGroupVisible("phb_tm", 0, "relay_proteksi"),
          acbTr:     trVisible && isGroupVisible("phb_tr", 0, "acb_utama"),
          cbCabangTr: trVisible && isGroupVisible("phb_tr", 0, "cb_cabang"),
          dgptTrafo: trafoVisible && isGroupVisible("trafo", 0, "dgpt"),
        }} />
      </LhppPage>

      {getInstKeys("trafo").map((instKey, idx) => {
        if (!isInstVisible("trafo", idx)) return null;
        const isMulti = (instanceCounts.trafo ?? 1) > 1;
        const label = isMulti ? `Trafo ${idx + 1}` : "Trafo";
        const dgptPhotos   = isGroupVisible("trafo", idx, "dgpt")          ? filterPhotoSlots("trafo", idx, "dgpt",          gp(photos,"part1",`${instKey}.dgpt`))                        : [];
        const pagarPhotos  = isGroupVisible("trafo", idx, "nameplate")     ? filterPhotoSlots("trafo", idx, "nameplate",     gp(photos,"part1",`${instKey}.nameplate`).slice(0,1))         : [];
        const kakiPhotos   = isGroupVisible("trafo", idx, "kaki_pengunci") ? filterPhotoSlots("trafo", idx, "kaki_pengunci", gp(photos,"part1",`${instKey}.kaki_pengunci`))                : [];
        const photoItems = [
          { label: `DGPT / Relay Buchholz${isMulti ? ` ${label}` : ""}`, urls: dgptPhotos },
          { label: `Pagar Pengaman ${label}`,                             urls: pagarPhotos },
          { label: `Pengaman Roda / Kaki ${label}`,                       urls: kakiPhotos },
        ].filter(item => item.urls.length > 0);
        return (
          <LhppPage key={instKey} {...fp} code="B.4" title={`PENGAMAN MEKANIK${isMulti ? ` — ${label}` : ""} — DOKUMENTASI FOTO`}>
            <LabeledPhotoGrid photos={photoItems} />
          </LhppPage>
        );
      })}

      <LhppPage {...fp} code="B.5" title="JARAK BEBAS (CLEARANCE DISTANCE)">
        {tmVisible && isGroupVisible("phb_tm", 0, "jarak") &&
          <ClearanceTable label="PHB TM" data={form.part1?.phb_tm?.jarak ?? {}} eqKey="phb_tm" photos={photos}
            hiddenFields={getInstSettings("phb_tm", 0).hiddenFields?.jarak ?? []}
            hiddenPhotoSlots={getInstSettings("phb_tm", 0).hiddenPhotoSlots ?? {}} />}
        {trafoVisible && isGroupVisible("trafo", 0, "jarak") &&
          <ClearanceTable label="Trafo"  data={form.part1?.trafo?.jarak  ?? {}} eqKey="trafo"  photos={photos}
            hiddenFields={getInstSettings("trafo", 0).hiddenFields?.jarak ?? []}
            hiddenPhotoSlots={getInstSettings("trafo", 0).hiddenPhotoSlots ?? {}} />}
        {trVisible && isGroupVisible("phb_tr", 0, "jarak") &&
          <ClearanceTable label="PHB TR" data={form.part1?.phb_tr?.jarak ?? {}} eqKey="phb_tr" photos={photos}
            hiddenFields={getInstSettings("phb_tr", 0).hiddenFields?.jarak ?? []}
            hiddenPhotoSlots={getInstSettings("phb_tr", 0).hiddenPhotoSlots ?? {}} />}
      </LhppPage>

      <LhppPage {...fp} code="B.6" title="GAMBAR DIAGRAM SATU GARIS (SINGLE LINE DIAGRAM)">
        <SingleLineDiagram form={form} fallbackPhotos={gp(photos,"part1","gambar.diagram")} />
      </LhppPage>

      <LhppPage {...fp} code="B.7" title="GAMBAR TATA LETAK PERALATAN UTAMA">
        <LayoutPeralatan
          template={form.part1?.gambar?.tata_letak?.layoutTemplate}
          phbTm={form.part1?.phb_tm?.jarak ?? {}}
          trafo={form.part1?.trafo?.jarak ?? {}}
          phbTr={form.part1?.phb_tr?.jarak ?? {}}
          fallbackPhotos={gp(photos,"part1","gambar.tata_letak")}
        />
      </LhppPage>

      {/* ── C. HASIL EVALUASI ── */}

      {/* C.1 PHB TM */}
      {getInstKeys("phb_tm").map((instKey, idx) => {
        if (!isInstVisible("phb_tm", idx)) return null;
        const isMulti = (instanceCounts.phb_tm ?? 1) > 1;
        const label = isMulti ? ` PHB TM ${idx + 1}` : "";
        const showCubOut = isGroupVisible("phb_tm", idx, "isolasi_cubicle_outgoing");
        const showKblIn  = isGroupVisible("phb_tm", idx, "isolasi_kabel_incoming");
        const groups = [
          showCubOut && buildIsoGroup(`Cubicle Outgoing PHB TM${label}`, ISOLASI_GND_ONLY, instKey, "isolasi_cubicle_outgoing", form, "1 M/kV"),
          showKblIn  && buildIsoGroup(`Kabel TM Incoming arah Trafo${label}`, ISOLASI_GND_ONLY, instKey, "isolasi_kabel_incoming", form, "1 M/kV"),
        ].filter(Boolean);
        if (!groups.length) return null;
        return (
          <React.Fragment key={instKey}>
            <LhppPage {...fp} code="C.1" title={`HASIL UJI PERALATAN — TAHANAN ISOLASI PHB TM${label}`}>
              <p style={{ fontSize: "10pt", marginBottom: 8 }}>
                Sesuai dengan hasil pemeriksaan Tahanan Isolasi sebagai berikut :
              </p>
              <IsolasiMeggerPDFTable groups={groups} />
            </LhppPage>
            <LhppPage {...fp} code="C.1" title={`DOKUMENTASI FOTO — ISOLASI PHB TM${label}`}>
              {showCubOut && <IsolasiDualPhotoGrid title={`Cubicle Outgoing PHB TM${label}`} fields={ISOLASI_GND_ONLY} groupKey="isolasi_cubicle_outgoing" eqKey={instKey} photos={photos} />}
              {showKblIn  && <IsolasiDualPhotoGrid title={`Kabel TM Incoming arah Trafo${label}`} fields={ISOLASI_GND_ONLY} groupKey="isolasi_kabel_incoming" eqKey={instKey} photos={photos} />}
            </LhppPage>
          </React.Fragment>
        );
      })}

      {/* C.1 Trafo */}
      {getInstKeys("trafo").map((instKey, idx) => {
        if (!isInstVisible("trafo", idx)) return null;
        const isMulti = (instanceCounts.trafo ?? 1) > 1;
        const label = isMulti ? ` Trafo ${idx + 1}` : "";
        const showP   = isGroupVisible("trafo", idx, "isolasi_primer");
        const showS   = isGroupVisible("trafo", idx, "isolasi_skunder");
        const showPS  = isGroupVisible("trafo", idx, "isolasi_primer_skunder");
        const hasilEval = form.part1?.[instKey]?.isolasiTransformator?.hasilEvaluasi;
        const groups = [
          showP  && buildIsoGroup(`Isolasi Primer${label}`, TRAFO_P_COMPACT, instKey, "isolasi_primer", form, "1 M/kV"),
          showS  && buildIsoGroup(`Isolasi Sekunder${label}`, TRAFO_S_COMPACT, instKey, "isolasi_skunder", form, "1 M/kV"),
          showPS && {
            label: `Primer – Sekunder${label}`,
            fields: PS3_FIELDS.map(f => ({
              label: ISO_LABEL_FULL[f.name] || f.label,
              value: gf(form, `part1.${instKey}.isolasi_primer_skunder.${f.name}`),
              acuan: "1 M/kV",
            })),
          },
        ].filter(Boolean);
        return (
          <React.Fragment key={instKey}>
            {groups.length > 0 && (
              <LhppPage {...fp} code="C.1" title={`HASIL UJI PERALATAN — TAHANAN ISOLASI TRANSFORMATOR${label}`}>
                <p style={{ fontSize: "10pt", marginBottom: 8 }}>
                  Sesuai dengan hasil pemeriksaan Tahanan Isolasi sebagai berikut :
                </p>
                <IsolasiMeggerPDFTable groups={groups} />
                {hasilEval && (
                  <div style={{ border: "0.5px solid #bbb", borderRadius: 4, padding: 8, marginBottom: 12 }}>
                    <div style={{ fontWeight: "bold", fontSize: "9pt", marginBottom: 3 }}>Hasil Evaluasi:</div>
                    <div style={{ fontSize: "10pt" }}>{hasilEval}</div>
                  </div>
                )}
              </LhppPage>
            )}
            {(showP || showS) && (
              <LhppPage {...fp} code="C.1" title={`DOKUMENTASI FOTO — ISOLASI TRANSFORMATOR${label}`}>
                {showP && <IsolasiDualPhotoGrid title={`Isolasi Primer${label}`} fields={TRAFO_P_COMPACT} groupKey="isolasi_primer" eqKey={instKey} photos={photos} />}
                {showS && <IsolasiDualPhotoGrid title={`Isolasi Sekunder${label}`} fields={TRAFO_S_COMPACT} groupKey="isolasi_skunder" eqKey={instKey} photos={photos} />}
              </LhppPage>
            )}
            {showPS && (
              <LhppPage {...fp} code="C.1" title={`DOKUMENTASI FOTO — ISOLASI TRANSFORMATOR${label}`}>
                <IsolasiDualPhotoGrid title={`Primer – Sekunder${label}`} fields={PS3_FIELDS} groupKey="isolasi_primer_skunder" eqKey={instKey} photos={photos} />
              </LhppPage>
            )}
          </React.Fragment>
        );
      })}

      {/* C.1 PHB TR */}
      {getInstKeys("phb_tr").map((instKey, idx) => {
        if (!isInstVisible("phb_tr", idx)) return null;
        const isMulti = (instanceCounts.phb_tr ?? 1) > 1;
        const label = isMulti ? ` PHB TR ${idx + 1}` : "";
        const showKblTr = isGroupVisible("phb_tr", idx, "isolasi_kabel_tr");
        if (!showKblTr) return null;
        return (
          <React.Fragment key={instKey}>
            <LhppPage {...fp} code="C.1" title={`HASIL UJI PERALATAN — TAHANAN ISOLASI PHB TR${label}`}>
              <p style={{ fontSize: "10pt", marginBottom: 8 }}>
                Sesuai dengan hasil pemeriksaan Tahanan Isolasi sebagai berikut :
              </p>
              <IsolasiMeggerPDFTable groups={[
                buildIsoGroup(`Kabel TR dari Trafo${label}`, ISOLASI_FIELDS_TM, instKey, "isolasi_kabel_tr", form, "≥ 1.000 MΩ"),
              ]} />
            </LhppPage>
            <LhppPage {...fp} code="C.1" title={`DOKUMENTASI FOTO — ISOLASI PHB TR${label}`}>
              <IsolasiDualPhotoGrid title={`Kabel TR dari Trafo${label}`} fields={ISOLASI_FIELDS_TM} groupKey="isolasi_kabel_tr" eqKey={instKey} photos={photos} />
            </LhppPage>
          </React.Fragment>
        );
      })}

      {/* ── C.1.1 Tahanan Isolasi PHB TM (Cubicle saja, tanpa kabel) ── */}
      {getInstKeys("phb_tm").map((instKey, idx) => {
        if (!isInstVisible("phb_tm", idx)) return null;
        const isMulti = (instanceCounts.phb_tm ?? 1) > 1;
        const label = isMulti ? ` PHB TM ${idx + 1}` : "";
        const showIn  = isGroupVisible("phb_tm", idx, "isolasi_cubicle_incoming");
        const showOut = isGroupVisible("phb_tm", idx, "isolasi_cubicle_outgoing");
        const groups = [
          showIn  && buildIsoGroup(`Cubicle Incoming PHB TM${label}`, ISOLASI_FIELDS_TM, instKey, "isolasi_cubicle_incoming", form, "1 M/kV"),
          showOut && buildIsoGroup(`Cubicle Outgoing PHB TM${label}`, ISOLASI_FIELDS_TM, instKey, "isolasi_cubicle_outgoing", form, "1 M/kV"),
        ].filter(Boolean);
        if (!groups.length) return null;
        return (
          <React.Fragment key={instKey}>
            <LhppPage {...fp} code="C.1.1" title={`PENGUJIAN SISTEM — TAHANAN ISOLASI PHB TM${label}`}>
              <p style={{ fontSize: "9pt", marginBottom: 6 }}>
                Hasil pengujian tahanan isolasi cubicle PHB TM sebagai berikut :
              </p>
              <IsolasiMeggerPDFTable compact groups={groups} />
            </LhppPage>
            <LhppPage {...fp} code="C.1.1" title={`DOKUMENTASI FOTO — ISOLASI PHB TM${label}`}>
              {showIn  && <IsolasiDualPhotoGrid title={`Cubicle Incoming PHB TM${label}`} fields={ISOLASI_FIELDS_TM} groupKey="isolasi_cubicle_incoming" eqKey={instKey} photos={photos} />}
              {showOut && <IsolasiDualPhotoGrid title={`Cubicle Outgoing PHB TM${label}`} fields={ISOLASI_FIELDS_TM} groupKey="isolasi_cubicle_outgoing" eqKey={instKey} photos={photos} />}
            </LhppPage>
          </React.Fragment>
        );
      })}

      {/* ── C.1.2 Tahanan Isolasi PHB TR (Incoming saja, tanpa kabel) ── */}
      {getInstKeys("phb_tr").map((instKey, idx) => {
        if (!isInstVisible("phb_tr", idx)) return null;
        const isMulti = (instanceCounts.phb_tr ?? 1) > 1;
        const label = isMulti ? ` PHB TR ${idx + 1}` : "";
        const showIn = isGroupVisible("phb_tr", idx, "isolasi_incoming");
        if (!showIn) return null;
        return (
          <React.Fragment key={instKey}>
            <LhppPage {...fp} code="C.1.2" title={`PENGUJIAN SISTEM — TAHANAN ISOLASI PHB TR${label}`}>
              <p style={{ fontSize: "10pt", marginBottom: 8 }}>
                Hasil pengujian tahanan isolasi PHB TR sebagai berikut :
              </p>
              <IsolasiMeggerPDFTable groups={[
                buildIsoGroup(`PHB TR Incoming (dari Trafo)${label}`, ISOLASI_FIELDS_TR, instKey, "isolasi_incoming", form, "≥ 1.000 MΩ"),
              ]} />
            </LhppPage>
            <LhppPage {...fp} code="C.1.2" title={`DOKUMENTASI FOTO — ISOLASI PHB TR${label}`}>
              <IsolasiDualPhotoGrid title={`PHB TR Incoming (dari Trafo)${label}`} fields={ISOLASI_FIELDS_TR} groupKey="isolasi_incoming" eqKey={instKey} photos={photos} />
            </LhppPage>
          </React.Fragment>
        );
      })}

      <LhppPage {...fp} code="C.2" title="PENGUKURAN TAHANAN PEMBUMIAN">
        <GroundingMeasurementTable entries={groundingEntries} />
      </LhppPage>

      <LhppPage {...fp} code="C.3" title="EVALUASI HASIL UJI PERALATAN">
        <DerivedEvaluasiTable form={form} photos={photos} vis={c3Vis} />
      </LhppPage>

      {trVisible && (isGroupVisible("phb_tr", 0, "tegangan") || isGroupVisible("phb_tr", 0, "beban")) && (
        <LhppPage {...fp} code="C.4" title="PENGUJIAN SISTEM — FOTO PELAKSANAAN UJI">
          <PengujianSistemBlock form={form} photos={photos}
            showTegangan={isGroupVisible("phb_tr", 0, "tegangan")}
            showBeban={isGroupVisible("phb_tr", 0, "beban")}
            hiddenTeganganFields={getInstSettings("phb_tr", 0).hiddenFields?.tegangan ?? []}
            hiddenBebanFields={getInstSettings("phb_tr", 0).hiddenFields?.beban ?? []} />
        </LhppPage>
      )}

      {/* ── C.5 Pemberian Tegangan ── */}
      {trVisible && isGroupVisible("phb_tr", 0, "tegangan") && (
        <>
          <LhppPage {...fp} code="C.5" title="PEMBERIAN TEGANGAN">
            <PemberianTeganganTable form={form} hiddenFields={getInstSettings("phb_tr", 0).hiddenFields?.tegangan ?? []} />
          </LhppPage>
          <LhppPage {...fp} code="C.5" title="DOKUMENTASI FOTO — PEMBERIAN TEGANGAN">
            <LabeledPhotoRow photos={
              ["RN","SN","TN","RS","ST","RT"]
                .filter(k => !isFieldHidden("phb_tr", 0, "tegangan", k))
                .map(k => {
                  const pf = gp(photos,"part1",`phb_tr.tegangan.${k}`);
                  const hidden = getInstSettings("phb_tr", 0).hiddenPhotoSlots?.[`tegangan.${k}`] ?? [];
                  return {
                    label: `Tegangan ${k.replace(/([A-Z])/g,"-$1").replace(/^-/,"")}`,
                    // slot 0 = Foto Jauh, slot 1 = Foto Nilai (2 foto dalam 1 sel).
                    urls: [hidden.includes(0) ? null : pf[0], hidden.includes(1) ? null : pf[1]],
                    subLabels: ["Foto Jauh", "Foto Nilai"],
                  };
                })
            } />
          </LhppPage>
        </>
      )}

      {/* ── C.6 Pengujian Beban ── */}
      {trVisible && isGroupVisible("phb_tr", 0, "beban") && (
        <>
          <LhppPage {...fp} code="C.6" title="PENGUJIAN BEBAN">
            <PengujianBebanTable form={form}
              hiddenBebanFields={getInstSettings("phb_tr", 0).hiddenFields?.beban ?? []}
              hiddenSuhuFields={getInstSettings("phb_tr", 0).hiddenFields?.suhu_sambungan ?? []}
              showSuhu={isGroupVisible("phb_tr", 0, "suhu_sambungan")} />
          </LhppPage>
          <LhppPage {...fp} code="C.6" title="DOKUMENTASI FOTO — PENGUJIAN BEBAN">
            <LabeledPhotoRow perRow={2} photos={[
              isGroupVisible("phb_tr", 0, "suhu_sambungan") && !isFieldHidden("phb_tr", 0, "suhu_sambungan", "trafo")      && ["phb_tr.suhu_sambungan.trafo",       "Suhu Terminal Trafo",  "suhu_sambungan.trafo"],
              isGroupVisible("phb_tr", 0, "suhu_sambungan") && !isFieldHidden("phb_tr", 0, "suhu_sambungan", "phb_tm")     && ["phb_tr.suhu_sambungan.phb_tm",      "Suhu Terminal PHB TM", "suhu_sambungan.phb_tm"],
              isGroupVisible("phb_tr", 0, "suhu_sambungan") && !isFieldHidden("phb_tr", 0, "suhu_sambungan", "phb_tr_term") && ["phb_tr.suhu_sambungan.phb_tr_term", "Suhu Terminal PHB TR", "suhu_sambungan.phb_tr_term"],
              !isFieldHidden("phb_tr", 0, "beban", "R") && ["phb_tr.beban.R", "Foto Beban Fasa R", "beban.R"],
            ].filter(Boolean).map(([key, label, photoFieldKey]) => {
              const pf = gp(photos,"part1",key);
              const hidden = getInstSettings("phb_tr", 0).hiddenPhotoSlots?.[photoFieldKey] ?? [];
              // slot 0 = Foto Jauh, slot 1 = Foto Nilai (2 foto dalam 1 sel, kanan-kiri).
              return {
                label,
                urls: [hidden.includes(0) ? null : pf[0], hidden.includes(1) ? null : pf[1]],
                subLabels: ["Foto Jauh", "Foto Nilai"],
              };
            })} />
          </LhppPage>
        </>
      )}

      {/* ── C.7 Pengujian Fungsi PHB TM ── */}
      {isInstVisible("phb_tm", 0) && (
      <LhppPage {...fp} code="C.7" title="PENGUJIAN FUNGSI PHB TM"
        docs={<LabeledPhotoGrid square photos={[
          { label: "CT",                url: gp(photos,"part1","phb_tm.ct_incoming")[1] || gp(photos,"part1","phb_tm.ct_incoming")[0] || gp(photos,"part1","phb_tm.ct_outgoing")[1] || gp(photos,"part1","phb_tm.ct_outgoing")[0] },
          { label: "PT / Fuse",         url: gp(photos,"part1","phb_tm.pt_outgoing")[0] || gp(photos,"part1","phb_tm.pt_incoming")[0] || gp(photos,"part1","phb_tm.fuse")[0] },
          { label: "Pengoperasian LBS", url: gp(photos,"part1","phb_tm.lbs.0")[2] || gp(photos,"part1","phb_tm.lbs.0")[0] },
          { label: "Putaran Fasa",      url: gp(photos,"part1","phb_tr.putaran_fasa")[1] || gp(photos,"part1","phb_tr.putaran_fasa")[0] || gp(photos,"part1","phb_tm.putaran_fasa.0")[1] || gp(photos,"part1","phb_tm.putaran_fasa.0")[0] },
        ].filter(p => p.url).map(p => ({ label: p.label, urls: [p.url] }))} />}
      >
        <PengujianFungsiTmTable />
      </LhppPage>
      )}

      {/* ── C.8 Pengujian Fungsi PHB TR ── */}
      {isInstVisible("phb_tr", 0) && (
      <LhppPage {...fp} code="C.8" title="PENGUJIAN FUNGSI PHB TR"
        docs={<LabeledPhotoRow square photos={[
          isGroupVisible("phb_tr", 0, "acb_utama")      && { label: "Foto ACB",           url: gp(photos,"part1","phb_tr.acb_utama")[0] },
          isGroupVisible("phb_tr", 0, "nameplate_acb")  && { label: "Foto Nameplate ACB", url: gp(photos,"part1","phb_tr.nameplate_acb")[0] },
          isGroupVisible("phb_tr", 0, "putaran_fasa")   && { label: "Putaran Fasa",       url: gp(photos,"part1","phb_tr.putaran_fasa")[1] || gp(photos,"part1","phb_tr.putaran_fasa")[0] },
        ].filter(Boolean)} />}
      >
        <PengujianFungsiTrTable form={form} />
      </LhppPage>
      )}

      <LhppPage {...fp} code="D" title="DATA HASIL UJI">
        <DataHasilUjiBlock form={form} />
      </LhppPage>

      <LhppPage {...fp} code="D.2" title="KESIMPULAN">
        <KesimpulanBlock data={data} />
      </LhppPage>

      {/* D.3 & D.4 — surat resmi: TANPA kop/footer LhppPage, kop & TTD di dalam dokumen */}
      {(!sectionCode || sectionCode === "D.3") && (
        <div className="laporan-form" data-section="D.3"
          style={{ ...FORM_STYLE, height: "auto", minHeight: "297mm", overflow: "visible", padding: "18mm 20mm" }}>
          <BeritaAcaraBlock data={data} instansi={instansi} form={form} ttd={ttd} />
        </div>
      )}
      {(!sectionCode || sectionCode === "D.4") && (
        <div className="laporan-form" data-section="D.4"
          style={{ ...FORM_STYLE, height: "auto", minHeight: "297mm", overflow: "visible", padding: "18mm 20mm" }}>
          <SuratKesesuaianBlock data={data} instansi={instansi} form={form} ttd={ttd} />
        </div>
      )}

      {/* ── E. REKOMENDASI LAIK OPERASI — template dual logo ── */}
      {(!sectionCode || sectionCode === "E") && (
        <TemplateLaikOperasi
          data={mergeLaikOperasiData(deriveLaikOperasiFromPengujian(data), data.laikOperasi ?? {})}
          instansi={instansi}
          pageMargin={12}
          fontScale={1}
        />
      )}
    </div>
  );
}

// ─── Cover ───────────────────────────────────────────────────────────────────
function Cover({ data, instansi }) {
  return (
    <div className="laporan-form laporan-cover" style={FORM_STYLE}>
      {/* flex: 1 agar isi cover mengisi seluruh tinggi halaman */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <HeaderLogo instansi={instansi} hideFormNumber />

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <h1 style={{ fontSize: "18pt", fontWeight: "bold", margin: 0 }}>LAPORAN HASIL</h1>
          <h1 style={{ fontSize: "18pt", fontWeight: "bold", margin: "4px 0 0" }}>PEMERIKSAAN DAN PENGUJIAN</h1>
          <h2 style={{ fontSize: "13pt", margin: "6px 0 0", letterSpacing: 1 }}>(LHPP)</h2>
          {data.noLhpp && (
            <div style={{ fontSize: "11pt", marginTop: 6, fontStyle: "italic" }}>
              No. {data.noLhpp}
            </div>
          )}
        </div>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <div style={{ fontSize: "13pt", fontWeight: "bold" }}>{data.nama || "(Nama Pelanggan)"}</div>
          <div style={{ fontSize: "11pt", marginTop: 4, whiteSpace: "pre-line" }}>{data.alamat || "-"}</div>
        </div>

        <div style={{ marginTop: "auto", textAlign: "center", paddingBottom: 20 }}>
          <div style={{ marginBottom: 8, fontStyle: "italic" }}>Di susun oleh,</div>
          <div style={{ border: "1px solid #000", padding: "10px 32px", display: "inline-block" }}>
            <div style={{ fontWeight: "bold" }}>{instansi?.nama ?? "—"}</div>
            <div style={{ fontSize: "10pt", whiteSpace: "pre-line" }}>{instansi?.alamat ?? ""}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── LhppPage: wrapper untuk setiap halaman dokumen ──────────────────────────
// Kop & footer diambil dari instansi.kopStyle → getKopStyle() (registry di ./kopStyles).
// Ganti kopStyle di admin instansi = ganti seluruh visual frame utk semua section A.1-F.
function LhppPage({ data, instansi, ttd, ttd_client, code, title, children, docs, sectionCode }) {
  if (sectionCode && sectionCode !== code) {
    // "B.2" (induk) tetap menampilkan sub-halaman B.2.1 / B.2.2 / B.2.3.
    const isB2Child = sectionCode === "B.2" && (code || "").startsWith("B.2.");
    if (!isB2Child) return null;
  }
  const Frame = getKopStyle(instansi?.kopStyle);
  // Section dengan konten panjang (F: narasi; B.5: 3 tabel jarak bebas; C.1/C.1.1/C.1.2:
  // tabel isolasi + grid foto) — biarkan mengalir multi-halaman, jangan dikliping ke 1 A4.
  const flow = code === "F" || code === "B.5" || code === "B.6" || code === "B.7"
    || (code || "").startsWith("C.1") || code === "C.3" || code === "C.5" || code === "C.6"
    || code === "C.7" || code === "C.8" || (code || "").startsWith("D.");
  const style = flow
    ? { ...FORM_STYLE, height: "auto", minHeight: "297mm", overflow: "visible" }
    : FORM_STYLE;
  return (
    <div className="laporan-form" style={style} data-section={code}>
      <Frame
        instansi={instansi}
        data={data}
        ttd={ttd}
        ttd_client={ttd_client}
        code={code}
        title={title}
        flow={flow}
      >
        {children}
        {docs && <div style={{ marginTop: 6 }}>{docs}</div>}
      </Frame>
    </div>
  );
}

// ─── NameplateTable — label | : | value (no No column, no header) ────────────
function NameplateTable({ rows = [] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12, fontSize: "10pt" }}>
      <tbody>
        {rows.map(([label, value], i) => (
          <tr key={i}>
            <td style={{ ...TD_L, width: "38%" }}>{label}</td>
            <td style={{ ...TD_C, width: "4%" }}>:</td>
            <td style={{ ...TD_C }}>{value || "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── PhbTrSpekA5 — tabel A.5 sesuai PDF Excel ────────────────────────────────
const DEFAULT_KOMPONEN_PHB_TR = [
  { nama: "ACB dan MCB",           keterangan: "Sesuai" },
  { nama: "Thermal Overload Relay", keterangan: "Sesuai" },
  { nama: "Pilot Lamp",            keterangan: "Sesuai" },
  { nama: "Ampere Meter",          keterangan: "Sesuai" },
  { nama: "CT",                    keterangan: "Sesuai" },
  { nama: "Volt Meter",            keterangan: "Sesuai" },
  { nama: "Magnetic Contactor",    keterangan: "Sesuai" },
  { nama: "Push Button",           keterangan: "Sesuai" },
  { nama: "Wiring",                keterangan: "Sesuai" },
];

const ACB_ROWS = [
  { label: "Merk",                           key: "merk" },
  { label: "Tipe",                           key: "tipe" },
  { label: "Rating Tegangan (Ue) — V",       key: "ratingV" },
  { label: "Rating Arus (In) — A",           key: "ratingI" },
  { label: "Setting I Overload (long-time)", key: "settingOverload" },
  { label: "Setting I Instantaneous",       key: "settingInstantenious" },
  { label: "Setting Tripping Delay",         key: "settingTrippingDelay" },
];

function PhbTrSpekA5({ specRows = [], acb = {}, acbAnalisa = {} }) {
  const rows = specRows.length > 0 ? specRows : DEFAULT_KOMPONEN_PHB_TR;
  const BDK = "1px solid #000";
  const thBase = { border: BDK, padding: "3px 6px", fontWeight: "bold", fontSize: "10pt", textAlign: "center", background: "#bfbfbf", verticalAlign: "middle" };
  const secHdr = { border: BDK, padding: "3px 6px", fontWeight: "bold", fontSize: "10pt", background: "#bfbfbf", colSpan: 3 };
  const tdNo   = { border: BDK, padding: "3px 4px", fontSize: "10pt", textAlign: "center", verticalAlign: "top", width: "6%" };
  const tdUr   = { border: BDK, padding: "3px 6px", fontSize: "10pt", verticalAlign: "top" };
  const tdKet  = { border: BDK, padding: "3px 6px", fontSize: "10pt", textAlign: "center", verticalAlign: "top", width: "32%" };

  return (
    <>
      <p style={{ fontSize: "10pt", marginBottom: 6 }}>
        Sesuai dengan hasil pemeriksaan visual pada PHB TR, Berikut spesifikasi :
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12, fontSize: "10pt" }}>
        <tbody>
          {/* Section header: Komponen Utama */}
          <tr>
            <td colSpan={3} style={{ ...secHdr }}>Komponen Utama PHB TR :</td>
          </tr>
          <tr>
            <td style={thBase}>NO</td>
            <td style={{ ...thBase, textAlign: "left" }}>URAIAN</td>
            <td style={thBase}>KETERANGAN</td>
          </tr>
          {rows.map((row, i) => (
            <tr key={i}>
              <td style={tdNo}>{i + 1}.</td>
              <td style={tdUr}>{row.nama || row.jenis || "-"}</td>
              <td style={tdKet}>{row.keterangan || "Sesuai"}</td>
            </tr>
          ))}

          {/* Section header: Spesifikasi ACB Utama */}
          <tr>
            <td colSpan={3} style={{ ...secHdr }}>Spesifikasi ACB Utama :</td>
          </tr>
          <tr>
            <td style={thBase}>NO</td>
            <td style={{ ...thBase, textAlign: "left" }}>URAIAN</td>
            <td style={thBase}>BESARAN AKTUAL</td>
          </tr>
          {ACB_ROWS.map((r, i) => (
            <tr key={r.key}>
              <td style={tdNo}>{i + 1}.</td>
              <td style={tdUr}>{r.label}</td>
              <td style={tdKet}>{acb[r.key] || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12, fontSize: "10pt" }}>
        <tbody>
          <tr>
            <td style={{ ...secHdr, width: "24%" }}>Tujuan Proteksi :</td>
            <td style={{ border: BDK, padding: "6px 8px", fontSize: "10pt", textAlign: "justify", lineHeight: 1.6 }}>
              {acbAnalisa.tujuanProteksi || "— (belum dianalisa; simpan laporan setelah data ACB terisi)"}
            </td>
          </tr>
          <tr>
            <td style={{ ...secHdr }}>Analisa :</td>
            <td style={{ border: BDK, padding: "6px 8px", fontSize: "10pt", textAlign: "justify", lineHeight: 1.6 }}>
              {acbAnalisa.analisa || "— (belum dianalisa; simpan laporan setelah data ACB terisi)"}
            </td>
          </tr>
        </tbody>
      </table>
    </>
  );
}

// ─── PhbTrProteksiTable ───────────────────────────────────────────────────────
function PhbTrProteksiTable({ rows = [] }) {
  const headers = ["Nama Panel/Komponen", "Merk", "Jenis", "Besaran Proteksi", "Satuan", "Jumlah", "Tujuan Proteksi"];
  const keys    = ["nama", "merk", "jenis", "besaranProteksi", "satuan", "jumlah", "tujuanProteksi"];
  // kolom angka/singkat di-center; kolom teks panjang kiri
  const colAlign = [TD_L, TD_L, TD_L, TD_C, TD_C, TD_C, TD_L];
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12, fontSize: "10pt" }}>
      <thead>
        <tr style={{ background: "#fef3c7" }}>
          <td style={{ ...TH_C, padding:"4px 6px" }}>No</td>
          {headers.map((h, hi) => (
            <td key={h} style={{ ...(hi === 0 || hi === 6 ? TH_L : TH_C), padding:"4px 6px" }}>{h}</td>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={headers.length + 1} style={{ ...TD_C, padding:8, color:"#999", fontStyle:"italic" }}>
              Belum ada data
            </td>
          </tr>
        ) : rows.map((row, i) => (
          <tr key={i}>
            <td style={{ ...TD_C, padding:"4px 6px" }}>{i + 1}</td>
            {keys.map((k, ki) => (
              <td key={k} style={{ ...colAlign[ki], padding:"4px 6px" }}>{row[k] || "-"}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── PembumianTable ───────────────────────────────────────────────────────────
function PembumianTable({ rows = [] }) {
  const headers = ["Nama Grounding", "Tipe Pembumian", "Bahan Pembumian", "Uraian", "Satuan", "Jumlah", "Tujuan"];
  const keys    = ["nama", "tipePembumian", "bahanPembumian", "uraian", "satuan", "jumlah", "tujuan"];
  const colAlign = [TD_L, TD_C, TD_C, TD_C, TD_C, TD_C, TD_L];
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12, fontSize: "10pt" }}>
      <thead>
        <tr style={{ background: "#fef3c7" }}>
          <td style={{ ...TH_C, padding:"4px 6px" }}>No</td>
          {headers.map((h, hi) => (
            <td key={h} style={{ ...(hi === 0 || hi === 6 ? TH_L : TH_C), padding:"4px 6px" }}>{h}</td>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={headers.length + 1} style={{ ...TD_C, padding:8, color:"#999", fontStyle:"italic" }}>
              Belum ada data
            </td>
          </tr>
        ) : rows.map((row, i) => (
          <tr key={i}>
            <td style={{ ...TD_C, padding:"4px 6px" }}>{i + 1}</td>
            {keys.map((k, ki) => (
              <td key={k} style={{ ...colAlign[ki], padding:"4px 6px" }}>{row[k] || "-"}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── ChecklistTable ───────────────────────────────────────────────────────────
function ChecklistTable({ items = [], data = {} }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12, fontSize: "11pt" }}>
      <thead>
        <tr style={{ background: "#fef3c7" }}>
          <td style={{ ...TH_C, width: "6%" }}>No</td>
          <td style={{ ...TH_L, width: "45%" }}>Nama Komponen</td>
          <td style={{ ...TH_C, width: "15%" }}>Hasil</td>
          <td style={TH_L}>Keterangan</td>
        </tr>
      </thead>
      <tbody>
        {items.map((item, i) => {
          const d = data[item.key] ?? {};
          return (
            <tr key={item.key}>
              <td style={TD_C}>{i + 1}</td>
              <td style={TD_L}>{item.label}</td>
              <td style={TD_C}>{d.ada || "-"}</td>
              <td style={TD_L}>{d.keterangan || "-"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

const PHOTO_H = 75; // tinggi fixed untuk semua sel foto clearance

// ─── ClearanceTable ───────────────────────────────────────────────────────────
function ClearanceTable({ label, data = {}, eqKey, photos, hiddenFields = [], hiddenPhotoSlots = {} }) {
  const fields = [
    { dir: "Depan",    name: "depan",    val: data.depan },
    { dir: "Kiri",     name: "kiri",     val: data.kiri },
    { dir: "Kanan",    name: "kanan",    val: data.kanan },
    { dir: "Belakang", name: "belakang", val: data.belakang },
  ].filter(f => !hiddenFields.includes(f.name));
  if (!fields.length) return null;
  // perFieldPhotos (jarak): key hiddenPhotoSlots = "jarak.<field>", slot 0 = Foto Jauh, slot 1 = Foto Pengukuran.
  const slotsFor = (name) => hiddenPhotoSlots[`jarak.${name}`] ?? [];
  const hasPhotos = eqKey && photos && fields.some(f => {
    const hidden = slotsFor(f.name);
    const arr = gp(photos, "part1", `${eqKey}.jarak.${f.name}`);
    return (!hidden.includes(0) && arr[0]) || (!hidden.includes(1) && arr[1]);
  });

  const TD_FIX = { ...TD_PHOTO, padding: 3, height: PHOTO_H + 6, verticalAlign: "middle" };

  const PhotoBox = ({ src, alt }) => (
    <div style={{ width: "100%", height: PHOTO_H, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      {src
        ? <img src={src} alt={alt} style={{ maxHeight: PHOTO_H, maxWidth: "100%", objectFit: "contain" }} />
        : <span style={{ color: "#ccc", fontSize: "8pt" }}>—</span>
      }
    </div>
  );

  const CaptionedPhoto = ({ src, alt, caption }) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <PhotoBox src={src} alt={alt} />
      <div style={{ textAlign: "center", fontSize: "7pt", color: "#555", marginTop: 2 }}>{caption}</div>
    </div>
  );

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10, fontSize: "10pt", tableLayout: "fixed" }}>
      <colgroup>
        <col style={{ width: "18%" }} />
        <col style={{ width: "12%" }} />
        {hasPhotos && <col style={{ width: "70%" }} />}
      </colgroup>
      <thead>
        <tr style={{ background: "#fef3c7" }}>
          <td colSpan={hasPhotos ? 3 : 2} style={{ ...TH_L, padding: "3px 8px" }}>Jarak Bebas {label} (cm)</td>
        </tr>
        {hasPhotos && (
          <tr style={{ background: "#fef3c7" }}>
            <td style={{ ...TH_L, padding: "3px 6px" }}>Arah</td>
            <td style={{ ...TH_C, padding: "3px 6px" }}>Nilai (cm)</td>
            <td style={{ ...TH_C, padding: "3px 6px" }}>Foto</td>
          </tr>
        )}
      </thead>
      <tbody>
        {fields.map(({ dir, name, val }) => {
          const hidden = slotsFor(name);
          const arr = hasPhotos ? gp(photos, "part1", `${eqKey}.jarak.${name}`) : [];
          return (
            <tr key={dir} style={{ height: hasPhotos ? PHOTO_H + 6 : "auto" }}>
              <td style={{ ...TD_L, padding: "3px 6px", verticalAlign: "middle" }}>{dir}</td>
              <td style={{ ...TD_C, padding: "3px 6px", verticalAlign: "middle" }}>{val || "-"}</td>
              {hasPhotos && (
                <td style={TD_FIX}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <CaptionedPhoto src={hidden.includes(0) ? null : arr[0]} alt={`Jarak jauh ${dir} ${label}`}  caption="Foto Jauh" />
                    <CaptionedPhoto src={hidden.includes(1) ? null : arr[1]} alt={`Jarak ukur ${dir} ${label}`} caption="Foto Pengukuran" />
                  </div>
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ─── GroundingMeasurementTable ────────────────────────────────────────────────
// `entries` = [{ label, nilai, pic }] — sudah difilter oleh caller sesuai
// Pengaturan Tampilan Laporan (unit hidden / grup hidden / field hidden).
function GroundingMeasurementTable({ entries = [] }) {
  const withPhoto = entries.filter((e) => e.pic);
  if (!entries.length) {
    return <p style={{ fontSize: "10pt", fontStyle: "italic", color: "#666" }}>Belum ada data pengukuran grounding.</p>;
  }

  return (
    <>
      <SectionHeading>Hasil Pengukuran Grounding</SectionHeading>
      <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:12, fontSize:"11pt" }}>
        <thead>
          <tr style={{ background:"#fef3c7" }}>
            <td style={{ ...TH_C, width:"6%" }}>No</td>
            <td style={TH_L}>Titik Grounding</td>
            <td style={{ ...TH_C, width:"22%" }}>Nilai (Ω)</td>
          </tr>
        </thead>
        <tbody>
          {entries.map(({ label, nilai }, i) => (
            <tr key={i}>
              <td style={TD_C}>{i+1}</td>
              <td style={TD_L}>{label}</td>
              <td style={{ ...TD_C, fontWeight:"bold" }}>{nilai || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {withPhoto.length > 0 && (
        <>
          <DocsHeading>Foto Pengukuran Grounding :</DocsHeading>
          <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:8, tableLayout:"fixed" }}>
            <tbody>
              {chunk(withPhoto, 3).map((row, ri) => (
                <tr key={ri}>
                  {row.map((e, ci) => (
                    <PhotoCell key={ci} label={e.label} url={e.pic} no={ri*3+ci+1} width={`${100/Math.min(withPhoto.length,3)}%`} square />
                  ))}
                  {row.length < 3 && Array.from({ length: 3 - row.length }).map((_, xi) => (
                    <td key={`e${xi}`} style={{ border: B, background:"#f8fafc" }} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </>
  );
}

// ─── PengujianSistemBlock ─────────────────────────────────────────────────────
function PengujianSistemBlock({ form, photos, showTegangan = true, showBeban = true, hiddenTeganganFields = [], hiddenBebanFields = [] }) {
  const teg = form.part1?.phb_tr?.tegangan ?? {};
  const beb = form.part1?.phb_tr?.beban ?? {};

  const tegRows = [["R-S","RS"],["S-T","ST"],["R-T","RT"],["R-N","RN"],["S-N","SN"],["T-N","TN"]]
    .filter(([, k]) => !hiddenTeganganFields.includes(k))
    .map(([label, k]) => [label, teg[k]]);
  const bebRows = [["Phasa R","R"],["Phasa S","S"],["Phasa T","T"],["Netral N","N"]]
    .filter(([, k]) => !hiddenBebanFields.includes(k))
    .map(([label, k]) => [label, beb[k]]);

  const tegPhotos  = ["RS","ST","RT","RN","SN","TN"].filter(k => !hiddenTeganganFields.includes(k)).flatMap(k => gp(photos,"part1",`phb_tr.tegangan.${k}`));
  const bebPhotos  = ["R","S","T","N"].filter(k => !hiddenBebanFields.includes(k)).flatMap(k => gp(photos,"part1",`phb_tr.beban.${k}`));

  return (
    <>
      {showTegangan && (
        <>
          <SectionHeading>Hasil Pengukuran Tegangan</SectionHeading>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
            {tegRows.map(([label,val]) => (
              <div key={label} style={{ display:"flex", gap:8 }}>
                <span style={{ width:50 }}>{label}</span>
                <span>: <b>{val || "-"}</b> Volt</span>
              </div>
            ))}
          </div>
        </>
      )}

      {showBeban && (
        <>
          <SectionHeading>Hasil Pengukuran Beban</SectionHeading>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
            {bebRows.map(([label,val]) => (
              <div key={label} style={{ display:"flex", gap:8 }}>
                <span style={{ width:70 }}>{label}</span>
                <span>: <b>{val || "-"}</b> Ampere</span>
              </div>
            ))}
          </div>
        </>
      )}

      <SectionHeading>Foto Pemeriksaan</SectionHeading>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        {showBeban && (
          <div>
            <p style={{ fontWeight:"bold", fontSize:"10pt", marginBottom:4 }}>Pengukuran Beban</p>
            {bebPhotos.slice(0,2).map((url,i) => (
              <img key={i} src={url} alt="beban" style={{ maxWidth:"100%", maxHeight:130, objectFit:"contain", marginBottom:4, border:"1px solid #ddd" }} />
            ))}
          </div>
        )}
        {showTegangan && (
          <div>
            <p style={{ fontWeight:"bold", fontSize:"10pt", marginBottom:4 }}>Pengukuran Tegangan</p>
            {tegPhotos.slice(0,2).map((url,i) => (
              <img key={i} src={url} alt="tegangan" style={{ maxWidth:"100%", maxHeight:130, objectFit:"contain", marginBottom:4, border:"1px solid #ddd" }} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Helper terbilang + instalasi ringkas (Berita Acara / Surat Pernyataan) ──
const _SATUAN = ["nol","satu","dua","tiga","empat","lima","enam","tujuh","delapan","sembilan","sepuluh","sebelas"];
function terbilang(n) {
  n = Math.floor(Math.abs(Number(n) || 0));
  if (n < 12) return _SATUAN[n];
  if (n < 20) return terbilang(n - 10) + " belas";
  if (n < 100) return terbilang(Math.floor(n / 10)) + " puluh" + (n % 10 ? " " + terbilang(n % 10) : "");
  if (n < 200) return "seratus" + (n % 100 ? " " + terbilang(n % 100) : "");
  if (n < 1000) return terbilang(Math.floor(n / 100)) + " ratus" + (n % 100 ? " " + terbilang(n % 100) : "");
  if (n < 2000) return "seribu" + (n % 1000 ? " " + terbilang(n % 1000) : "");
  return terbilang(Math.floor(n / 1000)) + " ribu" + (n % 1000 ? " " + terbilang(n % 1000) : "");
}
const _cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const _ROMAN = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];

// Item manual (data.instalasiRingkas) menang atas hasil turunan otomatis.
// Dipakai D.3 (Berita Acara) & D.4 (Surat Kesesuaian).
export function resolveInstalasiItems(form, data) {
  const manual = Array.isArray(data?.instalasiRingkas)
    ? data.instalasiRingkas.map(s => String(s ?? "").trim()).filter(Boolean)
    : [];
  return manual.length ? manual : deriveInstalasiRingkas(form, data);
}

export function deriveInstalasiRingkas(form, data) {
  const c = (p) => { const v = gf(form, `part1.${p}`); return (v == null || v === "-" || v === "") ? "" : String(v).trim(); };
  const ic = data?.instanceCounts ?? {};
  const cnt = (k, d = 1) => Math.max(1, ic[k] ?? d);
  const kva = c("trafo.nameplate.kapasitas");
  const teg = c("trafo.nameplate.teganganPS");
  const primV = parseFloat(teg.replace(/[.\s]/g, "").split(/[/xX-]/)[0]);
  const kv = Number.isFinite(primV) && primV > 0
    ? (primV >= 1000 ? `${+(primV / 1000).toFixed(primV % 1000 ? 1 : 0)} kV` : `${+primV.toFixed(1)} kV`)
    : "20 kV";
  const kmP = c("phb_tm.kabel_outgoing.panjang") || c("phb_tm.kabel_incoming.panjang");
  const krP = c("phb_tr.kabel_tr.panjang");
  return [
    `${cnt("trafo")} Unit Trafo Daya${kva ? ` ${kva} kVA` : ""}`,
    `${cnt("phb_tm")} Unit PHB TM`,
    `${cnt("phb_tr")} Unit PHB TR`,
    `${kmP || "…"} ms Kabel SKTM ${kv}`,
    `${krP || "…"} ms Kabel SKTR`,
    "1 Lot Pembumian",
  ];
}

function KopLIT({ instansi }) {
  const logo = instansi?.logo?.url || (typeof instansi?.logo === "string" ? instansi.logo : null);
  return (
    <div style={{ borderBottom: "3px double #000", paddingBottom: 6, marginBottom: 16, display: "flex", alignItems: "center", gap: 14 }}>
      {logo && <img src={logo} alt="logo" style={{ height: 64, width: "auto", objectFit: "contain", flexShrink: 0 }} />}
      <div style={{ flex: 1, textAlign: "center" }}>
        <div style={{ fontWeight: "bold", fontSize: "11pt", letterSpacing: 0.5 }}>LEMBAGA INSPEKSI TEKNIK</div>
        <div style={{ fontWeight: "bold", fontSize: "14pt" }}>{instansi?.nama || "PT. ASTRA JAYA SEJAHTERA"}</div>
        <div style={{ fontSize: "9pt" }}>{instansi?.alamat || "Ruko Grand Duta City, Jl. Bahagia, Babelan, Bekasi 17610"}</div>
        <div style={{ fontSize: "9pt" }}>
          Telp. {instansi?.telp || "021-38310017, 089680010507"} — Email: {instansi?.email || "astrajayasejahtera@gmail.com"}
        </div>
      </div>
      {logo && <div style={{ width: 64, flexShrink: 0 }} />}
    </div>
  );
}

function TtdLIT({ data, instansi, ttd = {}, ttNama }) {
  const clientSig   = data.ttd_client?.signature?.url;
  const clientStamp = data.ttd_client?.stempel?.url;
  const pjId   = ttd?.penanggungJawabId;
  const livePj = pjId ? (instansi?.penanggungJawab ?? []).find(p => p.id === pjId) : null;
  const litSig   = livePj?.signature?.url || ttd?.signature?.url;
  const litStamp = livePj?.stempel?.url   || ttd?.stempel?.url;

  const cell = { width: "48%", textAlign: "center", verticalAlign: "top", fontSize: "10.5pt" };
  const SigArea = ({ sig, stamp }) => (
    <div style={{ position: "relative", height: 78, margin: "4px auto" }}>
      {sig && <img src={sig} alt="ttd" style={{ position: "absolute", left: "50%", top: 0, transform: "translateX(-50%)", maxHeight: 78, maxWidth: 130, objectFit: "contain" }} />}
      {stamp && <img src={stamp} alt="stempel" style={{ position: "absolute", left: "50%", top: 2, transform: "translateX(-50%)", maxHeight: 78, maxWidth: 110, objectFit: "contain", opacity: 0.85 }} />}
    </div>
  );

  return (
    <table style={{ width: "100%", marginTop: 22, borderCollapse: "collapse" }}>
      <tbody>
        <tr>
          <td style={cell}>
            Saksi / Pemilik Instalasi<br />
            <b>{data.nama || "—"}</b>
            <SigArea sig={clientSig} stamp={clientStamp} />
            ( {data.saksiNama || "………………………"} )
          </td>
          <td style={cell}>
            Lembaga Inspeksi Teknik<br />
            <b>{instansi?.nama || "PT. ASTRA JAYA SEJAHTERA"}</b>
            <SigArea sig={litSig} stamp={litStamp} />
            ( {ttNama || "………………………"} )
          </td>
        </tr>
      </tbody>
    </table>
  );
}

// ─── BeritaAcaraBlock — section D.3 ──────────────────────────────────────────
function BeritaAcaraBlock({ data = {}, instansi, form = {}, ttd = {} }) {
  const d = toDateSafe(data.ttd?.tanggal);
  const hari = formatHari(data.ttd?.tanggal);
  const tglKata = d ? `${_cap(terbilang(d.getDate()))} bulan ${d.toLocaleDateString("id-ID", { month: "long" })} tahun ${terbilang(d.getFullYear())}` : "—";
  const nomor = `${data.noSurat || "…"}/BA/PT. AJS/${d ? _ROMAN[d.getMonth()] : "…"}/${d ? d.getFullYear() : "…"}`;
  const ttNama = ttd?.nama || data.pemeriksaNama || "Andi Akhmad Ansori";
  const items = resolveInstalasiItems(form, data);
  const p = { textAlign: "justify", lineHeight: 1.7, margin: "0 0 8px", fontSize: "10.5pt" };

  return (
    <div className="laporan-section" style={{ fontFamily: "'Times New Roman', serif" }}>
      <KopLIT instansi={instansi} />
      <div style={{ textAlign: "center", fontWeight: "bold", fontSize: "12pt", lineHeight: 1.4, marginBottom: 4 }}>
        BERITA ACARA<br />PEMERIKSAAN DAN PENGUJIAN
      </div>
      <div style={{ textAlign: "center", fontSize: "10.5pt", marginBottom: 14 }}>No : {nomor}</div>

      <p style={p}>
        Pada hari ini <b>{hari}</b> tanggal <b>{tglKata}</b>, yang bertanda tangan di bawah ini:
      </p>
      <table style={{ fontSize: "10.5pt", marginBottom: 8 }}>
        <tbody>
          <tr><td style={{ width: 130 }}>Nama</td><td style={{ width: 12 }}>:</td><td>{ttNama}</td></tr>
          <tr><td>Jabatan</td><td>:</td><td>TENAGA TEKNIK</td></tr>
        </tbody>
      </table>
      <p style={p}>Telah melaksanakan Uji Laik Operasi Instalasi:</p>
      <table style={{ fontSize: "10.5pt", marginBottom: 8 }}>
        <tbody>
          <tr><td style={{ width: 130, verticalAlign: "top" }}>Instalasi</td><td style={{ width: 12, verticalAlign: "top" }}>:</td><td>IPTL TM</td></tr>
          <tr><td style={{ verticalAlign: "top" }}>Pemilik Instalasi</td><td style={{ verticalAlign: "top" }}>:</td><td>{data.nama || "—"}</td></tr>
          <tr><td style={{ verticalAlign: "top" }}>Lokasi Pekerjaan</td><td style={{ verticalAlign: "top" }}>:</td><td>{data.alamat || "—"}</td></tr>
        </tbody>
      </table>
      <p style={p}>Pada perlengkapan Instalasi yang terdiri dari:</p>
      <ol style={{ margin: "0 0 8px", paddingLeft: 22, fontSize: "10.5pt", lineHeight: 1.7 }}>
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ol>
      <p style={p}>
        Dari hasil pemeriksaan dan pengujian, maka <b>GARDU DISTRIBUSI IPTL</b> tersebut di atas dinyatakan{" "}
        <b>BAIK, MEMENUHI STANDAR</b> dan direkomendasikan <b>LAIK OPERASI</b>.
      </p>
      <TtdLIT data={data} instansi={instansi} ttd={ttd} ttNama={ttNama} />
    </div>
  );
}

// ─── SuratKesesuaianBlock — section D.4 ──────────────────────────────────────
function SuratKesesuaianBlock({ data = {}, instansi, form = {}, ttd = {} }) {
  const d = toDateSafe(data.ttd?.tanggal);
  const nomor = `${data.noSurat || "…"}/SPKPP/PT. AJS/${d ? _ROMAN[d.getMonth()] : "…"}/${d ? d.getFullYear() : "…"}`;
  const ttNama = ttd?.nama || data.pemeriksaNama || "Andi Akhmad Ansori";
  const lembaga = instansi?.nama || "PT. ASTRA JAYA SEJAHTERA";
  const items = resolveInstalasiItems(form, data);
  const p = { textAlign: "justify", lineHeight: 1.7, margin: "0 0 8px", fontSize: "10.5pt" };

  return (
    <div className="laporan-section" style={{ fontFamily: "'Times New Roman', serif" }}>
      <KopLIT instansi={instansi} />
      <div style={{ textAlign: "center", fontWeight: "bold", fontSize: "12pt", lineHeight: 1.4, marginBottom: 4 }}>
        SURAT PERNYATAAN<br />KESESUAIAN HASIL PEMERIKSAAN DAN PENGUJIAN
      </div>
      <div style={{ textAlign: "center", fontSize: "10.5pt", marginBottom: 14 }}>Nomor : {nomor}</div>

      <p style={p}>
        Berdasarkan Surat Permohonan <b>{data.nama || "—"}</b>, Perihal Permohonan Pemeriksaan dan Pengujian
        Instalasi Tenaga Listrik untuk mendapatkan Sertifikat Laik Operasi (SLO). Dengan ini kami sampaikan
        bahwa <b>{lembaga}</b> telah melaksanakan Pemeriksaan dan Pengujian Instalasi Pemanfaatan Tenaga Listrik
        Tegangan Menengah Milik <b>{data.nama || "—"}</b> yang berlokasi di <b>{data.alamat || "—"}</b>, meliputi:
      </p>
      <ol style={{ margin: "0 0 8px", paddingLeft: 22, fontSize: "10.5pt", lineHeight: 1.7 }}>
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ol>
      <p style={p}>
        Berdasarkan hasil pemeriksaan dan pengujian yang dilaksanakan telah memenuhi kesesuaian dengan
        persyaratan pemeriksaan dan pengujian sesuai PERMEN ESDM No. 12 Tahun 2021.
      </p>
      <p style={p}>
        Demikian surat keterangan ini dibuat untuk digunakan sebagaimana mestinya sampai batas waktu terbitnya
        Sertifikat Laik Operasi (SLO).
      </p>
      <TtdLIT data={data} instansi={instansi} ttd={ttd} ttNama={ttNama} />
    </div>
  );
}

function toDateSafe(v) {
  if (!v) return null;
  const d = v?.toDate ? v.toDate() : new Date(v);
  return isNaN(d?.getTime?.()) ? null : d;
}

// ─── KesimpulanBlock — section D.2: Kesimpulan + Saran/Rekomendasi (auto) ─────
function KesimpulanBlock({ data = {} }) {
  const nama    = data.nama   || "—";
  const alamat  = data.alamat || "—";
  const tanggal = formatDate(data.ttd?.tanggal) || data.ttd?.tanggal || "—";
  const B = "1px solid #000";
  const LBL = { border: B, padding: "8px 10px", verticalAlign: "top", fontWeight: "bold", width: "24%", fontSize: "10.5pt", background: "#fafaf9" };
  const VAL = { border: B, padding: "8px 10px", verticalAlign: "top", textAlign: "justify", lineHeight: 1.7, fontSize: "10.5pt" };

  const saran = [
    "Melakukan pemeliharaan berkala terhadap seluruh peralatan instalasi (PHB TM, Transformator, dan PHB TR) sesuai jadwal yang dianjurkan pabrikan.",
    "Menjaga kebersihan dan kelengkapan sistem pembumian (grounding) serta melakukan pengukuran tahanan pembumian secara berkala.",
    "Memastikan Alat Pemadam Api Ringan (APAR) tersedia, mudah dijangkau, dan dalam kondisi siap pakai di ruang instalasi.",
    "Melengkapi dan memelihara rambu/tanda peringatan bahaya listrik serta Gambar Diagram Satu Garis di lokasi instalasi.",
    "Melakukan Sertifikasi Laik Operasi ulang sebelum masa berlaku Sertifikat Laik Operasi (SLO) berakhir.",
  ];

  return (
    <div className="laporan-section">
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10.5pt" }}>
        <thead>
          <tr style={{ background: "#fef3c7" }}>
            <td style={{ ...TH_L, width: "24%", padding: "6px 10px" }}>Butir Isian Mata Uji</td>
            <td style={{ ...TH_L, padding: "6px 10px" }}>Hasil Evaluasi</td>
          </tr>
        </thead>
        <tbody>
          <tr style={{ pageBreakInside: "avoid" }}>
            <td style={LBL}>Kesimpulan</td>
            <td style={VAL}>
              Berdasarkan hasil Pemeriksaan dan Pengujian yang telah dilaksanakan pada Instalasi Pemanfaatan
              Tenaga Listrik Tegangan Menengah milik <b>{nama}</b> yang berlokasi di <b>{alamat}</b>, pada tanggal{" "}
              <b>{tanggal}</b>, instalasi tersebut telah memenuhi persyaratan aspek{" "}
              <b>AMAN, ANDAL, dan AKRAB LINGKUNGAN</b> sesuai ketentuan peraturan yang berlaku di bidang
              Ketenagalistrikan, sehingga dinyatakan <b>LAIK OPERASI</b> dan dapat dioperasikan sebagaimana
              mestinya.
            </td>
          </tr>
          <tr style={{ pageBreakInside: "avoid" }}>
            <td style={LBL}>Saran dan Rekomendasi</td>
            <td style={VAL}>
              <ol style={{ margin: 0, paddingLeft: 20 }}>
                {saran.map((s, i) => <li key={i} style={{ marginBottom: 4 }}>{s}</li>)}
              </ol>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ─── DataHasilUjiBlock — section D: tabel data pengukuran saja (tanpa foto) ──
function DataHasilUjiBlock({ form }) {
  const teg = form.part1?.phb_tr?.tegangan ?? {};
  const beb = form.part1?.phb_tr?.beban ?? {};

  const tegRows = [["R-S",teg.RS],["S-T",teg.ST],["R-T",teg.RT],["R-N",teg.RN],["S-N",teg.SN],["T-N",teg.TN]];
  const bebRows = [["Phasa R",beb.R],["Phasa S",beb.S],["Phasa T",beb.T],["Netral N",beb.N]];

  return (
    <>
      <SectionHeading>Hasil Pengukuran Tegangan PHB TR</SectionHeading>
      <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:12, fontSize:"11pt" }}>
        <thead>
          <tr style={{ background:"#fef3c7" }}>
            <td style={{ ...TH_L, width:"50%" }}>Parameter</td>
            <td style={TH_C}>Nilai</td>
          </tr>
        </thead>
        <tbody>
          {tegRows.map(([label, val]) => (
            <tr key={label}>
              <td style={TD_L}>{label}</td>
              <td style={TD_C}><b>{val || "-"}</b>{val ? " Volt" : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <SectionHeading>Hasil Pengukuran Beban (Arus)</SectionHeading>
      <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:12, fontSize:"11pt" }}>
        <thead>
          <tr style={{ background:"#fef3c7" }}>
            <td style={{ ...TH_L, width:"50%" }}>Parameter</td>
            <td style={TH_C}>Nilai</td>
          </tr>
        </thead>
        <tbody>
          {bebRows.map(([label, val]) => (
            <tr key={label}>
              <td style={TD_L}>{label}</td>
              <td style={TD_C}><b>{val || "-"}</b>{val ? " Ampere" : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

// ─── SuratPernyataan ──────────────────────────────────────────────────────────
function SuratPernyataan({ data, instansi }) {
  return (
    <div style={{ border:"1px solid #000", padding:"12px 16px", marginBottom:12 }}>
      <p style={{ fontWeight:"bold", textAlign:"center", marginBottom:8 }}>SURAT PERNYATAAN</p>
      <p style={{ textAlign:"justify", lineHeight:1.8, marginBottom:8 }}>
        Yang bertanda tangan di bawah ini menyatakan bahwa peralatan utama pada instalasi{" "}
        <b>{data.nama || "—"}</b> yang berlokasi di <b>{data.alamat || "—"}</b> telah
        terpasang dengan baik sesuai dengan standar SNI yang berlaku dan telah dilakukan
        pemeriksaan serta pengujian sebagaimana mestinya.
      </p>
      <p style={{ textAlign:"justify", lineHeight:1.8 }}>
        Demikian surat pernyataan ini dibuat dengan sebenar-benarnya untuk dapat dipergunakan
        sebagaimana mestinya.
      </p>
    </div>
  );
}

// ─── AllEquipmentPhotos (B.1 Konstruksi) ─────────────────────────────────────
function AllEquipmentPhotos({ photos, hiddenUnits = {}, hidden = {} }) {
  // PHB TM: foto_full_phbtm[0] → incoming[3] → spesifikasi[0], tiap kandidat
  // dilewati kalau grup/slotnya di-hide dari Pengaturan Tampilan Laporan.
  const tmUrl =
    (!hidden.fotoFullPhbtm && gp(photos,"part1","phb_tm.foto_full_phbtm")[0]) ||
    (!hidden.incomingSlot3 && gp(photos,"part1","phb_tm.incoming")[3]) ||
    gp(photos,"part1","phb_tm.spesifikasi")[0] ||
    null;
  const items = [
    { key: "phb_tm", label:"PHB TM", urls: tmUrl ? [tmUrl] : [] },
    { key: "trafo",  label:"Trafo",  urls: hidden.nameplateSlot0  ? [] : gp(photos,"part1","trafo.nameplate").slice(0,1) },
    { key: "phb_tr", label:"PHB TR", urls: hidden.phbTrFullSlot0 ? [] : gp(photos,"part1","phb_tr.phb_tr_full").slice(0,1) },
  ].filter(it => !hiddenUnits[it.key]);
  return <LabeledPhotoGrid photos={items} />;
}

// ─── PemberianTeganganTable (C.5) — Image #12 format ─────────────────────────
function PemberianTeganganTable({ form, hiddenFields = [] }) {
  const teg = form.part1?.phb_tr?.tegangan ?? {};
  const BD  = "1px solid #000";
  const th  = { border: BD, padding: "3px 8px", fontWeight: "bold", fontSize: "10pt", background: "#d9d9d9", textAlign: "center", verticalAlign: "middle" };
  const td  = { border: BD, padding: "4px 8px", fontSize: "10pt", textAlign: "center", verticalAlign: "middle" };
  const secHdr = { border: BD, padding: "4px 8px", fontWeight: "bold", fontSize: "10pt", background: "#404040", color: "#fff", textAlign: "center" };

  const tegRows = [
    { name: "RN", label: "R – N", acuan: "220 – 240 Volt", val: teg.RN },
    { name: "SN", label: "S – N", acuan: "220 – 240 Volt", val: teg.SN },
    { name: "TN", label: "T – N", acuan: "220 – 240 Volt", val: teg.TN },
    { name: "RS", label: "R – S", acuan: "380 – 400 Volt", val: teg.RS },
    { name: "ST", label: "S – T", acuan: "380 – 400 Volt", val: teg.ST },
    { name: "RT", label: "T – R", acuan: "380 – 400 Volt", val: teg.RT },
    { name: "frekuensi", label: "Frekuensi", acuan: "50 Hz", val: teg.frekuensi, unit: " Hz" },
  ].filter(r => !hiddenFields.includes(r.name));
  return (
    <>
      <p style={{ fontSize: "10pt", marginBottom: 8 }}>
        Sesuai dengan hasil pemeriksaan Pengujian sistem sebagai berikut :
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10pt", marginBottom: 12 }}>
        <thead>
          <tr>
            <td style={{ ...th, width: "28%" }}>Mata Uji</td>
            <td style={{ ...th, width: "24%" }}>Acuan</td>
            <td style={{ ...th, width: "24%" }}>Hasil Uji</td>
            <td style={th}>Keterangan</td>
          </tr>
        </thead>
        <tbody>
          <tr><td colSpan={4} style={secHdr}>Pemeriksaan Tegangan</td></tr>
          {tegRows.map((r, i) => (
            <tr key={i}>
              <td style={{ ...td, textAlign: "left" }}>{r.label}</td>
              <td style={td}>{r.acuan}</td>
              <td style={td}>{r.val ? `${r.val}${r.unit || " V"}` : (r.unit === " Hz" ? "50 Hz" : "—")}</td>
              <td style={{ ...td, textAlign: "left" }}>sesuai standart Operasi</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

// ─── PengujianBebanTable (C.6) — Image #13 format ────────────────────────────
function PengujianBebanTable({ form, hiddenBebanFields = [], hiddenSuhuFields = [], showSuhu = true }) {
  const teg  = form.part1?.phb_tr?.tegangan ?? {};
  const beb  = form.part1?.phb_tr?.beban ?? {};
  const suhu = form.part1?.phb_tr?.suhu_sambungan ?? {};
  const BD   = "1px solid #000";
  const th   = { border: BD, padding: "3px 8px", fontWeight: "bold", fontSize: "10pt", background: "#d9d9d9", textAlign: "center", verticalAlign: "middle" };
  const td   = { border: BD, padding: "4px 8px", fontSize: "10pt", textAlign: "center", verticalAlign: "middle" };
  const subHdr = { border: BD, padding: "4px 8px", fontWeight: "bold", fontSize: "10pt", background: "#d9d9d9", textAlign: "center" };

  const avgPN = avgVals([teg.RN, teg.SN, teg.TN]);
  const avgPP = avgVals([teg.RS, teg.ST, teg.RT]);

  return (
    <>
      <p style={{ fontSize: "10pt", marginBottom: 8 }}>
        Sesuai dengan hasil pemeriksaan Pengujian Pembebanan sebagai berikut :
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10pt", marginBottom: 8 }}>
        <thead>
          <tr>
            <td style={{ ...th, width: "6%" }}>No</td>
            <td style={th}>Uraian Parameter</td>
            <td style={{ ...th, width: "22%" }}>Acuan</td>
            <td style={{ ...th, width: "18%" }}>Hasil Uji</td>
            <td style={{ ...th, width: "14%" }}>Keterangan</td>
          </tr>
        </thead>
        <tbody>
          {/* Tegangan */}
          <tr><td colSpan={5} style={subHdr}>Uraian Parameter Tegangan</td></tr>
          <tr>
            <td style={td}>1</td>
            <td style={{ ...td, textAlign: "left" }}>Tegangan Phasa Ke Netral</td>
            <td style={td}>220 – 240 Volt</td>
            <td style={td}>{avgPN ? `${avgPN} V` : "—"}</td>
            <td style={td}>Normal</td>
          </tr>
          <tr>
            <td style={td}>2</td>
            <td style={{ ...td, textAlign: "left" }}>Tegangan Phasa Ke Phasa</td>
            <td style={td}>380 – 420 Volt</td>
            <td style={td}>{avgPP ? `${avgPP} V` : "—"}</td>
            <td style={td}>Normal</td>
          </tr>
          <tr>
            <td style={td}>3</td>
            <td style={{ ...td, textAlign: "left" }}>Frekuensi</td>
            <td style={td}>50 Hz</td>
            <td style={td}>{teg.frekuensi ? `${teg.frekuensi} Hz` : "50 Hz"}</td>
            <td style={td}>Normal</td>
          </tr>
          {/* Beban */}
          <tr><td colSpan={5} style={subHdr}>Uraian Parameter Beban</td></tr>
          {[
            { no: 4, name: "R", label: "Phasa R", val: beb.R },
            { no: 5, name: "S", label: "Phasa S", val: beb.S },
            { no: 6, name: "T", label: "Phasa T", val: beb.T },
          ].filter(r => !hiddenBebanFields.includes(r.name)).map(r => (
            <tr key={r.no}>
              <td style={td}>{r.no}</td>
              <td style={{ ...td, textAlign: "left" }}>{r.label}</td>
              <td style={td}>—</td>
              <td style={td}>{r.val ? `${r.val} A` : "—"}</td>
              <td style={td}>Normal</td>
            </tr>
          ))}
          {/* Suhu Titik Sambungan */}
          {showSuhu && (
            <>
              <tr><td colSpan={5} style={subHdr}>Uraian Parameter Suhu titik sambungan pada saat berbeban</td></tr>
              {[
                { no: 8,  name: "trafo",       label: "Titik Sambungan Terminal Trafo", val: suhu.trafo },
                { no: 9,  name: "phb_tm",      label: "Terminal PHB TM",                val: suhu.phb_tm },
                { no: 10, name: "phb_tr_term", label: "Terminal PHB TR",                val: suhu.phb_tr_term },
              ].filter(r => !hiddenSuhuFields.includes(r.name)).map(r => (
                <tr key={r.no}>
                  <td style={td}>{r.no}</td>
                  <td style={{ ...td, textAlign: "left" }}>{r.label}</td>
                  <td style={td}>≤ 60°C</td>
                  <td style={td}>{r.val ? `${r.val}°C` : "—"}</td>
                  <td style={td}>Normal</td>
                </tr>
              ))}
            </>
          )}
        </tbody>
      </table>
      {beb.persentase && !hiddenBebanFields.includes("persentase") && (
        <p style={{ fontSize: "10pt", marginTop: 4 }}>
          Persentase Pembebanan : <strong>{beb.persentase}%</strong>
        </p>
      )}
    </>
  );
}

// ─── PengujianFungsiTmTable (C.7) ────────────────────────────────────────────
function PengujianFungsiTmTable() {
  const BD = "1px solid #000";
  const secHdr = { fontWeight: "bold", fontSize: "10pt", margin: "10px 0 4px" };
  const th = { border: BD, padding: "4px 6px", fontWeight: "bold", fontSize: "9.5pt", background: "#d9d9d9", textAlign: "center", verticalAlign: "middle" };
  const td = { border: BD, padding: "4px 6px", fontSize: "9.5pt", verticalAlign: "top", whiteSpace: "pre-line" };
  const tdc = { ...td, textAlign: "center", whiteSpace: "normal" };

  const proteksi = [
    ["Interlock Pintu Kubikel dengan Saklar Pembumian",
      "1. Pintu kubikel dapat dibuka pada saat saklar pembumian dalam posisi close.\n2. Pintu kubikel tidak dapat dibuka pada saat saklar pembumian dalam posisi open."],
    ["Interlock Disconnecting Switch (DS) dengan Saklar Pembumian",
      "DS tidak bisa di-close saat saklar pembumian dalam posisi tertutup."],
    ["Interlock Disconnecting Switch (DS) dengan Circuit Breaker (CB)",
      "1. Kunci B dapat dilepaskan saat DS open.\n2. Kunci A dapat dilepaskan saat DS tertutup.\n3. Tidak bisa open/close DS tanpa memasukkan kunci A dan B."],
    ["Circuit Breaker Manual Test",
      "1. Tuas Circuit Breaker dapat ditarik.\n2. CB tidak dapat di-open/close tanpa memasukkan kunci C.\n3. Push button CB bisa di-open/close secara manual."],
    ["CB/DS Electrical Test", "CB/DS dapat dibuka/ditutup secara elektrik."],
    ["Switch Function", "Tombol open/close dapat dioperasikan secara elektrik."],
    ["Protection Relay", "Relay pengaman berfungsi pada saat terjadi kesalahan (fault)."],
    ["Lampu Indikator",
      "1. Indikator \"Close\" CB/DS menyala dan terlihat jelas.\n2. Indikator \"Open\" CB/DS menyala dan terlihat jelas.\n3. Indikator Fault/Trip menyala dan terlihat jelas."],
    ["Heater / Thermostat", "Berfungsi pada saat suhu/kelembaban berada di atas/di bawah ambang batas."],
  ];
  return (
    <div style={{ fontSize: "10pt", lineHeight: 1.6 }}>
      <p style={secHdr}>1. Pemeriksaan Silih Kunci (Interlock) PHB TM</p>
      <p style={{ textAlign: "justify" }}>
        <b>Analisa :</b> Interlock berfungsi sebagai pengunci pintu pada PHB TM dan digunakan sebagai proteksi
        agar tidak terjadi kecelakaan kerja saat kondisi PHB TM bertegangan. Pintu PHB TM dapat dibuka ketika
        tegangan dan arus pada instalasi sudah dibumikan (grounding), sedangkan ketika bertegangan pintu PHB TM
        tidak dapat dibuka. Pada pemeriksaan ini disimpulkan bahwa interlock dapat bekerja dengan baik dengan
        indikator pintu PHB TM tidak dapat dibuka ketika bertegangan, dan dapat dibuka ketika sudah tidak
        bertegangan.
      </p>

      <p style={secHdr}>2. Pemeriksaan Fungsi Proteksi dan Kontrol</p>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
        <thead>
          <tr>
            <td style={{ ...th, width: "4%" }}>No</td>
            <td style={{ ...th, width: "34%" }}>Peralatan Proteksi</td>
            <td style={{ ...th, width: "16%" }}>Hasil Uji</td>
            <td style={th}>Keterangan</td>
          </tr>
        </thead>
        <tbody>
          {proteksi.map(([nama, ket], i) => (
            <tr key={i}>
              <td style={tdc}>{i + 1}</td>
              <td style={{ ...td, whiteSpace: "normal" }}>{nama}</td>
              <td style={tdc}>Baik / Berfungsi</td>
              <td style={td}>{ket}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={secHdr}>3. Pengujian Urutan Fasa PHB TM</p>
      <p style={{ textAlign: "justify" }}>
        <b>Analisa :</b> Pengujian urutan fasa bagian incoming; pada alat ukur terlihat lampu indikator menyala
        di sebelah kanan yang menandakan putaran fasa berputar ke arah kanan (searah jarum jam). Dari pemeriksaan
        tersebut dinyatakan putaran fasa <b>sesuai</b>.
      </p>
    </div>
  );
}

// ─── PengujianFungsiTrTable (C.6) ────────────────────────────────────────────
function PengujianFungsiTrTable({ form }) {
  const f1  = form.part1 ?? {};
  const acb = f1.phb_tr?.acb_utama ?? {};
  const BD  = "1px solid #000";
  const th  = { border: BD, padding: "3px 6px", fontWeight: "bold", fontSize: "10pt", background: "#d9d9d9", textAlign: "center", verticalAlign: "middle" };
  const td  = { border: BD, padding: "3px 6px", fontSize: "10pt", verticalAlign: "top" };
  const tdc = { ...td, textAlign: "center" };
  const thn = { border: BD, padding: "2px 4px", fontWeight: "bold", fontSize: "9pt", background: "#f2f2f2", textAlign: "center" };
  const tdn = { border: BD, padding: "2px 4px", fontSize: "9pt", textAlign: "center" };

  const acbLabel = [acb.merk, acb.tipe].filter(Boolean).join(" ") || "—";

  return (
    <>
      <p style={{ fontSize: "10pt", fontWeight: "bold", marginBottom: 6 }}>Pengujian Fungsi Peralatan :</p>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10pt", marginBottom: 12 }}>
        <thead>
          <tr>
            <td style={{ ...th, width: "5%" }}>No</td>
            <td style={{ ...th, width: "28%" }}>Butir Isian Mata Uji</td>
            <td style={th}>Hasil Evaluasi</td>
          </tr>
          <tr>
            <td style={{ ...thn, background: "#fef3c7" }} />
            <td style={{ ...thn, background: "#fef3c7" }} />
            <td style={{ ...thn, background: "#fef3c7" }}>{acbLabel}</td>
          </tr>
        </thead>
        <tbody>
          {/* Row 1: Proteksi & Kontrol */}
          <tr>
            <td style={tdc}>1</td>
            <td style={td}>Proteksi dan kontrol</td>
            <td style={{ ...td, padding: 0 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <tr><td colSpan={4} style={{ ...thn, textAlign: "left", padding: "2px 6px" }}>Data Sesuai Namplate</td></tr>
                  <tr>
                    <td style={thn}>In (A)</td>
                    <td style={thn}>I Over Load</td>
                    <td style={thn}>I Instantenious</td>
                    <td style={thn}>Tripping Delay</td>
                  </tr>
                  <tr>
                    <td style={tdn}>{acb.ratingI || "—"}</td>
                    <td style={tdn}>{acb.overload || "—"}</td>
                    <td style={tdn}>{acb.instantenious || "—"}</td>
                    <td style={tdn}>{acb.trippingDelay || "—"}</td>
                  </tr>
                  <tr><td colSpan={4} style={{ ...thn, textAlign: "left", padding: "2px 6px" }}>Data Sesuai Setting</td></tr>
                  <tr>
                    <td style={thn}>In (A)</td>
                    <td style={thn}>I Over Load</td>
                    <td style={thn}>I Instantenious</td>
                    <td style={thn}>Tripping Delay</td>
                  </tr>
                  <tr>
                    <td style={tdn}>{acb.ratingI || "—"}</td>
                    <td style={tdn}>{acb.settingOverload || "—"}</td>
                    <td style={tdn}>{acb.settingInstantenious || "—"}</td>
                    <td style={tdn}>{acb.settingTrippingDelay || "—"}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
          {/* Row 2: Urutan Fasa */}
          <tr>
            <td style={tdc}>2</td>
            <td style={td}>Pengujian urutan fasa</td>
            <td style={{ ...td, padding: 0 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {["fasa R","fasa S","fasa T"].map(f => (
                    <tr key={f}>
                      <td style={{ ...tdn, width: "30%", textAlign: "left", padding: "2px 6px" }}>{f}</td>
                      <td style={{ ...tdn, width: "8%" }}>:</td>
                      <td style={{ ...tdn, textAlign: "left", padding: "2px 6px" }}>sesuai Arah Jarum Jam</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </>
  );
}

// ─── PengamanElektrikNarasi (B.3) ────────────────────────────────────────────
function PengamanElektrikNarasi({ form, photos, vis = {} }) {
  const f1 = form.part1 ?? {};
  // Default true kalau caller tidak mengirim vis (aman untuk pemanggilan lama).
  const v = (key) => vis[key] !== false;

  // PHB TM — maks 2: incoming CB + relay proteksi
  const tmItems = [];
  const cbTm = f1.phb_tm?.incoming;
  if (v("cbTm") && (cbTm?.jenisPemutus || cbTm?.tipe || cbTm?.merk)) {
    const jenis  = cbTm.jenisPemutus || cbTm.tipe || "CB";
    const merk   = cbTm.merk    ? ` ${cbTm.merk}`          : "";
    const rating = cbTm.ratingI ? ` In ${cbTm.ratingI} A`  : "";
    tmItems.push({ label: `${jenis}${merk}${rating}`, photoKey: "phb_tm.incoming" });
  }
  const relay = f1.phb_tm?.relay_proteksi;
  if (v("relayTm") && (relay?.merk || relay?.tipe)) {
    tmItems.push({ label: `Relay Proteksi ${[relay.merk, relay.tipe].filter(Boolean).join(" ")}`, photoKey: "phb_tm.relay_proteksi" });
  }

  // PHB TR — maks 2: ACB utama + CB cabang
  const trItems = [];
  const acb = f1.phb_tr?.acb_utama;
  if (v("acbTr") && (acb?.merk || acb?.tipe)) {
    const merkTipe = [acb.merk, acb.tipe].filter(Boolean).join(" ");
    const rating   = acb.ratingI ? ` In ${acb.ratingI} A` : "";
    trItems.push({ label: `ACB ${merkTipe}${rating}`, photoKey: "phb_tr.acb_utama" });
  }
  const cbCabang = f1.phb_tr?.cb_cabang;
  if (v("cbCabangTr") && cbCabang?.ratingI) {
    trItems.push({ label: `CB Cabang In ${cbCabang.ratingI} A`, photoKey: "phb_tr.cb_cabang" });
  }

  // Trafo — DGPT saja
  const trafoItems = v("dgptTrafo") ? [{ label: "DGPT2 (proteksi termal & tekanan)", photoKey: "trafo.dgpt" }] : [];

  const sections = [
    { label: "PHB TM", items: tmItems.slice(0, 2) },
    { label: "PHB TR", items: trItems.slice(0, 2) },
    { label: "Trafo",  items: trafoItems.slice(0, 2) },
  ].filter(s => s.items.length > 0);

  const BD = "1px solid #000";
  const thStyle = { border: BD, padding: "3px 8px", fontWeight: "bold", fontSize: "10pt", background: "#d9d9d9", verticalAlign: "middle" };
  const tdStyle = { border: BD, padding: "4px 8px", fontSize: "10pt", verticalAlign: "middle" };

  return (
    <>
      <p style={{ fontSize: "10pt", marginBottom: 4 }}>
        Sesuai dengan hasil pemeriksaan Kesesuaian Desain Pengaman Elektrik Terpasang, Berikut spesifikasi :
      </p>
      <p style={{ fontSize: "10pt", fontWeight: "bold", marginBottom: 8 }}>
        Tipe Peralatan Pengaman Elektrik :
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10pt", marginBottom: 12 }}>
        <thead>
          <tr>
            <td style={{ ...thStyle, width: "5%" }}>No</td>
            <td style={{ ...thStyle, width: "16%" }}>Bagian</td>
            <td style={thStyle}>Pengaman Elektrik</td>
            <td style={{ ...thStyle, width: "22%", textAlign: "center" }}>Foto</td>
          </tr>
        </thead>
        <tbody>
          {sections.map((sec, si) =>
            sec.items.map((item, ii) => {
              const pic = item.photoKey ? gp(photos, "part1", item.photoKey)[0] : null;
              return (
                <tr key={`${si}-${ii}`}>
                  {ii === 0 && (
                    <>
                      <td style={{ ...tdStyle, textAlign: "center" }} rowSpan={sec.items.length}>{si + 1}</td>
                      <td style={{ ...tdStyle, fontWeight: "bold" }} rowSpan={sec.items.length}>{sec.label}</td>
                    </>
                  )}
                  <td style={tdStyle}>- {item.label}</td>
                  <td style={{ ...tdStyle, textAlign: "center", padding: "4px" }}>
                    {pic
                      ? <img src={pic} alt={item.label} style={{ maxHeight: 70, maxWidth: 100, objectFit: "contain" }} />
                      : <span style={{ color: "#999", fontSize: "9pt", fontStyle: "italic" }}>-</span>
                    }
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      <p style={{ fontSize: "10pt" }}>
        Sudah terdapat beberapa pengaman elektrik diantaranya seperti:{" "}
        {sections.map((sec, i) => {
          const txt = sec.items.map(it => it.label).join(" dan ");
          return `${i > 0 ? ", " : ""}- Pada ${sec.label} menggunakan ${txt}`;
        }).join("")}.
      </p>
    </>
  );
}

// ─── DerivedPengamanElektrikTable (B.3) ──────────────────────────────────────
function DerivedPengamanElektrikTable({ form, photos }) {
  const f1 = form.part1 ?? {};
  const ada = (val) => (val && String(val).trim() ? "Ada" : "Tidak Ada");
  const items = [
    {
      label: "Circuit Breaker (CB)",
      hasil: ada(f1.phb_tm?.incoming?.merk),
      ket: f1.phb_tm?.incoming?.tipe || "-",
      photoKey: "phb_tm.incoming",
    },
    {
      label: "Fuse",
      hasil: ada(f1.phb_tm?.fuse?.rating),
      ket: f1.phb_tm?.fuse?.rating || "-",
      photoKey: "phb_tm.fuse",
    },
    {
      label: "Relai Pengaman",
      hasil: ada(f1.phb_tm?.relay_proteksi?.merk),
      ket: `${f1.phb_tm?.relay_proteksi?.merk || ""} ${f1.phb_tm?.relay_proteksi?.tipe || ""}`.trim() || "-",
      photoKey: "phb_tm.relay_proteksi",
    },
    {
      label: "Air Circuit Breaker (ACB)",
      hasil: ada(f1.phb_tr?.acb_utama?.merk),
      ket: `${f1.phb_tr?.acb_utama?.merk || ""} ${f1.phb_tr?.acb_utama?.tipe || ""}`.trim() || "-",
      photoKey: "phb_tr.acb_utama",
    },
    {
      label: "Moulded Case Circuit Breaker (MCCB)",
      hasil: ada(f1.phb_tr?.cb_cabang?.ratingI),
      ket: f1.phb_tr?.cb_cabang?.ratingI ? `${f1.phb_tr.cb_cabang.ratingI} A` : "-",
      photoKey: "phb_tr.cb_cabang",
    },
    {
      label: "Miniature Circuit Breaker (MCB)",
      hasil: ada(f1.phb_tr?.nameplate_cb?.nameplate),
      ket: f1.phb_tr?.nameplate_cb?.nameplate || "-",
      photoKey: "phb_tr.nameplate_cb",
    },
    {
      label: "Fault Passage Indicator (FPI)",
      hasil: "-", ket: "-", photoKey: null,
    },
    {
      label: "Current Transformer (CT)",
      hasil: ada(f1.phb_tm?.ct_incoming?.ratingCT),
      ket: f1.phb_tm?.ct_incoming?.ratingCT || "-",
      photoKey: "phb_tm.ct_incoming",
    },
    {
      label: "Voltage Presence Indicating System (VPIS)",
      hasil: "-", ket: "-", photoKey: null,
    },
  ];
  return (
    <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:12, fontSize:"10pt" }}>
      <thead>
        <tr style={{ background:"#fef3c7" }}>
          <td style={{ ...TH_C, padding:"4px 6px", width:"5%" }}>No</td>
          <td style={{ ...TH_L, padding:"4px 6px" }}>Komponen Pengaman</td>
          <td style={{ ...TH_C, padding:"4px 6px", width:"16%" }}>Hasil</td>
          <td style={{ ...TH_L, padding:"4px 6px" }}>Keterangan</td>
          <td style={{ ...TH_C, padding:"4px 6px", width:"18%" }}>Foto</td>
        </tr>
      </thead>
      <tbody>
        {items.map((item, i) => {
          const pic = item.photoKey ? gp(photos,"part1",item.photoKey)[0] : null;
          return (
            <tr key={i}>
              <td style={{ ...TD_C, padding:"4px 6px" }}>{i+1}</td>
              <td style={{ ...TD_L, padding:"4px 6px" }}>{item.label}</td>
              <td style={{ ...TD_C, padding:"4px 6px" }}>{item.hasil}</td>
              <td style={{ ...TD_L, padding:"4px 6px" }}>{item.ket}</td>
              <td style={TD_PHOTO}>
                {pic
                  ? <img src={pic} alt={item.label} style={{ maxHeight:60, maxWidth:80, objectFit:"contain" }} />
                  : <span style={{ color:"#999", fontSize:"9pt", fontStyle:"italic" }}>-</span>
                }
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ─── DerivedEvaluasiTable (C.3) ──────────────────────────────────────────────
function DerivedEvaluasiTable({ form, photos, vis = {} }) {
  const v = (key) => vis[key] !== false;
  const c = (p) => {
    const v = gf(form, `part1.${p}`);
    return (v == null || v === "-" || v === "") ? "" : String(v).trim();
  };
  const pic = (...specs) => {
    for (const s of specs) {
      const [k, i = 0] = Array.isArray(s) ? s : [s];
      const u = gp(photos, "part1", k)[i];
      if (u) return u;
    }
    return null;
  };
  const lbs0 = form.part1?.phb_tm?.lbs?.rows?.[0] ?? {};

  // Pemutus utama PHB TR bisa ACB (default) atau MCCB pengganti — ikut field "jenis"
  const puMccb = (c("phb_tr.acb_utama.jenis") || "ACB").toUpperCase() === "MCCB";

  const items = [
    v("lbs") && {
      label: "LBS (Load Break Switch)",
      // dynamic group → photos di key "phb_tm.lbs.0"; slot 2 = "Foto Pengoperasian LBS"
      url: pic(["phb_tm.lbs.0", 2], ["phb_tm.lbs.0", 0], ["phb_tm.lbs.0", 1]),
      nilai: [lbs0.merk, lbs0.tipe].filter(Boolean).join(" "),
      fungsi: "Pemutus beban tegangan menengah — memutus dan menghubungkan arus beban dalam keadaan berbeban, namun tidak dirancang memutus arus hubung singkat.",
    },
    v("ct") && {
      label: "CT (Current Transformer)",
      url: pic("phb_tm.ct_incoming", "phb_tm.ct_outgoing"),
      nilai: c("phb_tm.ct_incoming.ratingCT") || c("phb_tm.ct_outgoing.ratingCT"),
      fungsi: "Trafo arus — menurunkan arus primer ke nilai standar (mis. 5 A) untuk pembacaan meter dan masukan relai proteksi.",
    },
    v("ptFuse") && {
      label: "PT / Fuse TM",
      // foto: PT Outgoing → Fuse
      url: pic("phb_tm.pt_outgoing", "phb_tm.fuse", "phb_tm.pt_incoming"),
      nilai: [c("phb_tm.pt_outgoing.ratingPT") || c("phb_tm.pt_incoming.ratingPT")
                ? `PT ${c("phb_tm.pt_outgoing.ratingPT") || c("phb_tm.pt_incoming.ratingPT")}` : "",
              c("phb_tm.fuse.rating") && `Fuse ${c("phb_tm.fuse.rating")}`].filter(Boolean).join(" · "),
      fungsi: "PT (Potential Transformer) menurunkan tegangan menengah ke nilai terukur untuk metering dan proteksi; Fuse TM mengamankan rangkaian PT terhadap hubung singkat.",
    },
    v("dgpt") && {
      label: "DGPT",
      url: pic("trafo.dgpt"),
      nilai: "",
      fungsi: "Detecteur Gaz Pression Température — relai pengaman transformator terhadap akumulasi gas, tekanan lebih, dan suhu minyak berlebih.",
    },
    v("acb") && {
      label: puMccb ? "MCCB (Moulded Case Circuit Breaker)" : "ACB (Air Circuit Breaker)",
      url: pic("phb_tr.acb_utama", "phb_tr.nameplate_acb"),
      nilai: [c("phb_tr.acb_utama.merk"), c("phb_tr.acb_utama.tipe"),
              c("phb_tr.acb_utama.ratingI") && `${c("phb_tr.acb_utama.ratingI")} A`].filter(Boolean).join(" "),
      fungsi: puMccb
        ? "Pemutus utama sisi tegangan rendah — proteksi terhadap beban lebih (thermal) dan hubung singkat (magnetic) pada busbar PHB TR, dengan konstruksi sarung casing cetak (moulded case)."
        : "Pemutus utama sisi tegangan rendah — proteksi terhadap beban lebih (long-time) dan hubung singkat (instantaneous) pada busbar PHB TR.",
    },
    v("kran") && {
      label: "Kran Trafo",
      url: pic("trafo.kran_atas", "trafo.kran_bawah"),
      nilai: "",
      fungsi: "Katup minyak isolasi transformator (atas & bawah) untuk pengisian, pengambilan sampel, dan pengurasan minyak saat perawatan.",
    },
  ].filter((it) => it && (it.url || it.nilai));   // C.3: sembunyikan item tanpa foto & tanpa nilai (atau di-hide dari Pengaturan)

  if (!items.length) {
    return <p style={{ fontSize: "10pt", fontStyle: "italic", color: "#666" }}>Belum ada data evaluasi peralatan.</p>;
  }

  return (
    <>
      <p style={{ fontSize: "10pt", marginBottom: 6 }}>
        Hasil evaluasi visual peralatan utama beserta fungsinya:
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8, tableLayout: "fixed" }}>
        <tbody>
          {chunk(items, 2).map((row, ri) => (
            <tr key={ri}>
              {row.map((it, ci) => (
                <td key={ci} style={{ border: B, padding: 0, verticalAlign: "top", width: "50%" }}>
                  <div style={{ background: "#1a3a6b", color: "#fff", padding: "3px 8px", fontWeight: "bold", fontSize: "9pt", display: "flex", gap: 4 }}>
                    <span style={{ background: "#f59e0b", color: "#000", borderRadius: 2, padding: "0 4px", fontSize: "8pt" }}>{ri * 2 + ci + 1}</span>
                    <span>{it.label}</span>
                  </div>
                  <div style={{ padding: 4, background: "#f8fafc", textAlign: "center" }}>
                    {it.url ? (
                      /* div background — bukan <img> — supaya tidak kena cap max-height print 75px */
                      <div role="img" aria-label={it.label} style={{
                        width: 200, height: 200, margin: "0 auto",
                        backgroundImage: `url("${it.url}")`,
                        backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat",
                        WebkitPrintColorAdjust: "exact", printColorAdjust: "exact",
                      }} />
                    ) : <span style={{ color: "#bbb", fontSize: "8pt", fontStyle: "italic" }}>tidak ada foto</span>}
                  </div>
                  <div style={{ padding: "5px 8px", fontSize: "9pt", textAlign: "justify", lineHeight: 1.5, borderTop: B }}>
                    {it.nilai && <div style={{ fontWeight: "bold", marginBottom: 2 }}>{it.nilai}</div>}
                    {it.fungsi}
                  </div>
                </td>
              ))}
              {row.length < 2 && <td style={{ border: B, background: "#f8fafc" }} />}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

// ─── PhotoCell — sel foto (1 atau 2 foto) dengan header label ────────────────
// `square` = foto dipotong rasio 1:1 (object-fit cover), sedikit lebih besar.
// `subLabels` = caption kecil di bawah tiap foto saat mode 2 foto (mis. Jauh/Nilai).
function PhotoCell({ label, url, urls, subLabels, no, width = "auto", square = false }) {
  const _list  = Array.isArray(urls) ? urls.slice(0, 2) : null;
  const _multi = _list && _list.length > 1;
  const _single = _list ? _list[0] : url;
  return (
    <td style={{ border: B, padding: 0, width, verticalAlign: "top", textAlign: "center" }}>
      {/* label header */}
      <div style={{
        background: "#1a3a6b", color: "#fff",
        padding: "3px 6px", fontWeight: "bold", fontSize: "9pt",
        display: "flex", alignItems: "center", gap: 4,
      }}>
        {no != null && (
          <span style={{
            background: "#f59e0b", color: "#000", borderRadius: 2,
            padding: "0 4px", fontSize: "8pt", fontWeight: "bold", flexShrink: 0,
          }}>{no}</span>
        )}
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      </div>
      {/* foto */}
      {_multi ? (
        <div style={{ padding: 4, background: "#f8fafc", display: "flex", gap: 4 }}>
          {_list.map((u, i) => (
            <div key={i} style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
              {u ? (
                /* div background — bukan <img> — supaya tidak kena cap max-height print 75px */
                <div role="img" aria-label={`${label} ${subLabels?.[i] || i + 1}`} style={{
                  width: "100%", height: 170,
                  backgroundImage: `url("${u}")`,
                  backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat",
                  WebkitPrintColorAdjust: "exact", printColorAdjust: "exact",
                }} />
              ) : <span style={{ color: "#bbb", fontSize: "8pt", fontStyle: "italic" }}>tidak ada foto</span>}
              {subLabels?.[i] && (
                <div style={{ fontSize: "7pt", color: "#555", marginTop: 2 }}>{subLabels[i]}</div>
              )}
            </div>
          ))}
        </div>
      ) : square ? (
        <div style={{ padding: 4, background: "#f8fafc", textAlign: "center" }}>
          {_single ? (
            /* div background 200×200 — bukan <img> — supaya tidak kena cap max-height print 75px */
            <div role="img" aria-label={label} style={{
              width: 200, height: 200, margin: "0 auto",
              backgroundImage: `url("${_single}")`,
              backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat",
              WebkitPrintColorAdjust: "exact", printColorAdjust: "exact",
            }} />
          ) : <span style={{ color: "#bbb", fontSize: "8pt", fontStyle: "italic" }}>tidak ada foto</span>}
        </div>
      ) : (
        <div style={{ padding: 4, background: "#f8fafc", minHeight: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {_single
            ? <img src={_single} alt={label} style={{ maxWidth: "100%", maxHeight: 160, objectFit: "contain", display: "block" }} />
            : <span style={{ color: "#bbb", fontSize: "8pt", fontStyle: "italic" }}>tidak ada foto</span>
          }
        </div>
      )}
    </td>
  );
}

// ─── LabeledPhotoGrid — 2 kolom grid dengan header label ─────────────────────
function LabeledPhotoGrid({ photos = [], square = false }) {
  if (!photos.length) return null;
  let seq = 0;
  return (
    <>
      <DocsHeading>Dokumentasi :</DocsHeading>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8, tableLayout: "fixed" }}>
        <tbody>
          {chunk(photos, 2).map((pair, ri) => (
            <tr key={ri}>
              {pair.map(({ label, urls }, ci) => (
                <PhotoCell key={ci} label={label} url={urls?.[0]} no={++seq} width="50%" square={square} />
              ))}
              {pair.length === 1 && <td style={{ border: B, background: "#f8fafc", width: "50%" }} />}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

// ─── LabeledPhotoRow — baris horizontal foto (default maks 3 per baris) ───────
// `square`: render via <div background> 200×200 — bukan <img> — supaya tidak
// kena cap `.laporan-section-breakable img { max-height: 75px }` saat download PDF.
// `perRow`: jumlah kolom per baris (mis. 2 → grid 2×2).
function LabeledPhotoRow({ photos = [], square = false, perRow = 3 }) {
  const valid = photos.filter(p => p && (p.url || p.urls || p.label));
  if (!valid.length) return null;
  const cols = Math.min(valid.length, perRow);
  return (
    <>
      <DocsHeading>Dokumentasi :</DocsHeading>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8, tableLayout: "fixed" }}>
        <tbody>
          {chunk(valid, perRow).map((row, ri) => (
            <tr key={ri}>
              {row.map(({ label, url, urls, subLabels }, ci) => (
                <PhotoCell key={ci} label={label} url={url} urls={urls} subLabels={subLabels} no={ri * perRow + ci + 1} width={`${100 / cols}%`} square={square} />
              ))}
              {row.length < perRow && Array.from({ length: perRow - row.length }).map((_, xi) => (
                <td key={`empty-${xi}`} style={{ border: B, background: "#f8fafc" }} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

// ─── FullPhoto — satu foto besar memenuhi lebar ───────────────────────────────
function FullPhoto({ photos = [], label }) {
  const url = photos[0];
  return (
    <>
      <DocsHeading>Dokumentasi :</DocsHeading>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8, tableLayout: "fixed" }}>
        <tbody>
          <tr>
            <PhotoCell label={label} url={url} no={1} width="100%" />
          </tr>
        </tbody>
      </table>
    </>
  );
}

// ─── LayoutPeralatan (B.7) — diagram tata letak otomatis dari data Jarak Bebas ──
function _jnum(v) {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
function _dimLabel(v) {
  const n = _jnum(v);
  return n != null ? `${n} cm` : "—";
}

function LayoutPeralatan({ template = "A", phbTm = {}, trafo = {}, phbTr = {}, fallbackPhotos = [] }) {
  const boxes = [phbTm, trafo, phbTr];
  const allEmpty = boxes.every(
    (o) => !o || ["depan", "kiri", "kanan", "belakang"].every((k) => _jnum(o[k]) == null)
  );
  if (allEmpty) return <FullPhoto photos={fallbackPhotos} label="Tata Letak Peralatan" />;

  const tpl = template === "B" ? "B" : "A";
  const WALL = "#111", TW = 6;

  const Arrow = ({ x1, y1, x2, y2, label, place }) => {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const o =
      place === "left"  ? { dx: -6, dy: 4,  a: "end" } :
      place === "right" ? { dx: 6,  dy: 4,  a: "start" } :
      place === "above" ? { dx: 0,  dy: -6, a: "middle" } :
                          { dx: 0,  dy: 14, a: "middle" };
    return (
      <g>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#111" strokeWidth="1.4"
          markerStart="url(#dimArw)" markerEnd="url(#dimArw)" />
        <text x={mx + o.dx} y={my + o.dy} textAnchor={o.a} fontSize="13" fill="#111">{label}</text>
      </g>
    );
  };
  const Box = ({ x, y, w, h, label }) => (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="#fff" stroke="#111" strokeWidth="2.5" />
      <text x={x + w / 2} y={y + h / 2 + 5} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#111">{label}</text>
    </g>
  );

  const R1 = { x: 120, y: 60, w: 380, h: 440 };
  const R2 = { x: 520, y: 60, w: 300, h: 440 };
  const kub = { x: 200, y: 120, w: 150, h: 56 };
  const tr  = { cx: 385, cy: 330, r: 42 };
  const ptr = { x: 600, y: 120, w: 150, h: 56 };

  return (
    <>
      <DocsHeading>Gambar Tata Letak Peralatan Utama :</DocsHeading>
      <div style={{ border: B, padding: 10, marginBottom: 8, textAlign: "center", background: "#fff" }}>
        <svg viewBox="0 0 900 560" width="100%" style={{ maxWidth: 760, fontFamily: "Arial, sans-serif" }}>
          <defs>
            <marker id="dimArw" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 1 L9 5 L0 9 z" fill="#111" />
            </marker>
          </defs>

          {tpl === "B" && (
            <text x="460" y="26" textAnchor="middle" fontSize="18" fontWeight="bold" fill="#111">LAYOUT PERALATAN</text>
          )}

          {/* Ruang 1 */}
          {tpl === "A" ? (
            <rect x={R1.x} y={R1.y} width={R1.w} height={R1.h} fill="none" stroke={WALL} strokeWidth={TW} />
          ) : (
            <path d={`M ${R1.x} ${R1.y} H ${R1.x + 240} V ${R1.y + 90} H ${R1.x + R1.w} V ${R1.y + R1.h} H ${R1.x} Z`}
              fill="none" stroke={WALL} strokeWidth={TW} />
          )}
          <rect x={R2.x} y={R2.y} width={R2.w} height={R2.h} fill="none" stroke={WALL} strokeWidth={TW} />
          {tpl === "B" && (
            <line x1={R1.x} y1={R1.y + R1.h - 100} x2={R1.x + R1.w} y2={R1.y + R1.h - 100}
              stroke="#111" strokeWidth="1" strokeDasharray="6 4" />
          )}

          {/* bukaan pintu bawah */}
          <path d={`M ${R1.x + 150} ${R1.y + R1.h} A 30 30 0 0 0 ${R1.x + 210} ${R1.y + R1.h}`} fill="none" stroke="#111" strokeWidth="1" strokeDasharray="4 3" />
          <path d={`M ${R2.x + 120} ${R2.y + R2.h} A 30 30 0 0 0 ${R2.x + 180} ${R2.y + R2.h}`} fill="none" stroke="#111" strokeWidth="1" strokeDasharray="4 3" />

          {/* KUBIKEL (PHB TM) */}
          <Box {...kub} label="KUBIKEL" />
          <Arrow x1={kub.x + kub.w / 2} y1={kub.y} x2={kub.x + kub.w / 2} y2={R1.y + TW / 2} label={_dimLabel(phbTm.belakang)} place="right" />
          <Arrow x1={kub.x + kub.w / 2} y1={kub.y + kub.h} x2={kub.x + kub.w / 2} y2={R1.y + R1.h - TW / 2} label={_dimLabel(phbTm.depan)} place="right" />
          <Arrow x1={kub.x} y1={kub.y + kub.h / 2} x2={R1.x + TW / 2} y2={kub.y + kub.h / 2} label={_dimLabel(phbTm.kiri)} place="above" />
          <Arrow x1={kub.x + kub.w} y1={kub.y + kub.h / 2} x2={R1.x + R1.w - TW / 2} y2={kub.y + kub.h / 2} label={_dimLabel(phbTm.kanan)} place="above" />

          {/* TRAFO */}
          <circle cx={tr.cx} cy={tr.cy - 22} r={tr.r} fill="#fff" stroke="#111" strokeWidth="2.5" />
          <circle cx={tr.cx} cy={tr.cy + 22} r={tr.r} fill="#fff" stroke="#111" strokeWidth="2.5" />
          <text x={tr.cx + tr.r + 8} y={tr.cy + 40} fontSize="13" fontWeight="bold" fill="#111">TRAFO</text>
          <Arrow x1={tr.cx + 60} y1={tr.cy - 22} x2={tr.cx + 60} y2={R1.y + TW / 2} label={_dimLabel(trafo.belakang)} place="right" />
          <Arrow x1={tr.cx} y1={tr.cy + 22 + tr.r} x2={tr.cx} y2={R1.y + R1.h - TW / 2} label={_dimLabel(trafo.depan)} place="right" />
          <Arrow x1={tr.cx - tr.r} y1={tr.cy} x2={R1.x + TW / 2} y2={tr.cy} label={_dimLabel(trafo.kiri)} place="above" />
          <Arrow x1={tr.cx + tr.r} y1={tr.cy} x2={R1.x + R1.w - TW / 2} y2={tr.cy} label={_dimLabel(trafo.kanan)} place="above" />

          {/* PHB TR */}
          <Box {...ptr} label="PHB TR" />
          <Arrow x1={ptr.x + ptr.w / 2} y1={ptr.y} x2={ptr.x + ptr.w / 2} y2={R2.y + TW / 2} label={_dimLabel(phbTr.belakang)} place="right" />
          <Arrow x1={ptr.x + ptr.w / 2} y1={ptr.y + ptr.h} x2={ptr.x + ptr.w / 2} y2={R2.y + R2.h - TW / 2} label={_dimLabel(phbTr.depan)} place="right" />
          <Arrow x1={ptr.x} y1={ptr.y + ptr.h / 2} x2={R2.x + TW / 2} y2={ptr.y + ptr.h / 2} label={_dimLabel(phbTr.kiri)} place="above" />
          <Arrow x1={ptr.x + ptr.w} y1={ptr.y + ptr.h / 2} x2={R2.x + R2.w - TW / 2} y2={ptr.y + ptr.h / 2} label={_dimLabel(phbTr.kanan)} place="above" />

          {/* Apar */}
          <circle cx={R1.x + 40} cy={R1.y + R1.h - 40} r="9" fill="#e11d1d" stroke="#7f1010" />
          <text x={R1.x + 40} y={R1.y + R1.h - 56} textAnchor="middle" fontSize="12" fill="#111">Apar</text>
        </svg>
      </div>
    </>
  );
}

// ─── SingleLineDiagram (B.6) — SLD otomatis dari data form ───────────────────
function SingleLineDiagram({ form = {}, fallbackPhotos = [] }) {
  const c = (p) => { const v = gf(form, `part1.${p}`); return v == null ? "" : String(v).trim(); };
  const f1 = form.part1 ?? {};
  const lbs = f1.phb_tm?.lbs?.rows?.[0] ?? f1.phb_tm?.lbs ?? {};
  const la  = f1.phb_tm?.la?.rows?.[0]  ?? f1.phb_tm?.la  ?? {};

  const trafoKva = c("trafo.nameplate.kapasitas");
  const acbMerk  = c("phb_tr.acb_utama.merk");
  const cbIncI   = c("phb_tm.incoming.ratingI");
  if (!trafoKva && !acbMerk && !cbIncI) {
    return <FullPhoto photos={fallbackPhotos} label="Diagram Satu Garis" />;
  }

  const teg   = c("trafo.nameplate.teganganPS") || "20000/400";
  const kblTm = [c("phb_tm.kabel_outgoing.tipe") || c("phb_tm.kabel_incoming.tipe"),
                 c("phb_tm.kabel_outgoing.ukuran") || c("phb_tm.kabel_incoming.ukuran")].filter(Boolean).join(" ");
  const kblTr = [c("phb_tr.kabel_tr.tipe"), c("phb_tr.kabel_tr.ukuran")].filter(Boolean).join(" ");
  const nF    = Math.max(0, Math.min(8, parseInt(c("phb_tr.cb_cabang.jumlah"), 10) || 0));
  const feederI = c("phb_tr.cb_cabang.ratingI") || "320";   // default MCCB 320 A
  const j = (arr) => arr.filter(Boolean).join(" ");

  const X1 = 180;   // trunk kolom kiri (sisi TM)
  const X2 = 460;   // trunk kolom kanan (sisi trafo → TR) — di-belok-kan biar tidak terlalu tinggi
  const stroke = "#111";
  const T = (x, y, s, opts = {}) => (s ? <text x={x} y={y} fontSize="11" fill="#111" {...opts}>{s}</text> : null);
  const Gnd = ({ x, y }) => (
    <g stroke={stroke} strokeWidth="1.4">
      <line x1={x} y1={y - 8} x2={x} y2={y} />
      <line x1={x - 13} y1={y} x2={x + 13} y2={y} />
      <line x1={x - 8} y1={y + 5} x2={x + 8} y2={y + 5} />
      <line x1={x - 3} y1={y + 10} x2={x + 3} y2={y + 10} />
    </g>
  );
  const Sq = ({ x, y }) => (
    <g stroke={stroke} strokeWidth="1.6" fill="#fff">
      <rect x={x - 10} y={y - 10} width="20" height="20" />
      <line x1={x - 10} y1={y + 10} x2={x + 10} y2={y - 10} />
    </g>
  );

  return (
    <>
      <DocsHeading>Gambar Diagram Satu Garis (Single Line Diagram) :</DocsHeading>
      <div style={{ border: B, padding: 10, marginBottom: 8, textAlign: "center", background: "#fff" }}>
        <svg viewBox="0 0 780 790" width="100%" style={{ maxWidth: 640, fontFamily: "Arial, sans-serif" }}>

          {/* ═══ KOLOM KIRI — Sumber PLN + PHB TM ═══ */}
          <line x1={X1} y1="40" x2={X1} y2="410" stroke={stroke} strokeWidth="1.8" />
          <circle cx={X1} cy="32" r="13" fill="#fff" stroke={stroke} strokeWidth="1.8" />
          <path d="M -6 0 L 6 0 M 2 -4 L 6 0 L 2 4" transform={`translate(${X1} 32)`} stroke={stroke} strokeWidth="1.3" fill="none" />
          {T(X1 + 24, 26, `SUMBER PLN — ${(teg.split("/")[0] || "20000")} V`)}
          {T(X1 + 24, 62, kblTm ? `SKTM: ${kblTm}` : "SKTM")}

          <rect x="55" y="86" width="255" height="322" fill="none" stroke={stroke} strokeWidth="1" strokeDasharray="5 3" />
          {T(58, 82, "PHB TM (Kubikel)", { fontWeight: "bold" })}

          {/* LA */}
          <line x1={X1} y1="112" x2={X1 - 40} y2="112" stroke={stroke} strokeWidth="1.3" />
          <rect x={X1 - 60} y="102" width="20" height="20" fill="#fff" stroke={stroke} strokeWidth="1.3" />
          <line x1={X1 - 60} y1="122" x2={X1 - 40} y2="102" stroke={stroke} strokeWidth="1.3" />
          <Gnd x={X1 - 50} y={142} />
          {T(X1 - 66, 108, j(["LA", la.tipe]), { textAnchor: "end" })}

          {/* LBS */}
          <circle cx={X1} cy="150" r="2.5" fill={stroke} />
          <line x1={X1} y1="150" x2={X1 + 13} y2="135" stroke={stroke} strokeWidth="1.6" />
          <circle cx={X1} cy="135" r="2.5" fill={stroke} />
          {T(X1 + 26, 146, j(["LBS", lbs.merk, lbs.tipe]))}

          {/* Fuse */}
          <rect x={X1 - 6} y="170" width="12" height="24" fill="#fff" stroke={stroke} strokeWidth="1.3" />
          {T(X1 + 26, 186, c("phb_tm.fuse.rating") ? `Fuse TM: ${c("phb_tm.fuse.rating")}` : "Fuse TM")}

          {/* CT */}
          <circle cx={X1 - 6} cy="218" r="6" fill="none" stroke={stroke} strokeWidth="1.3" />
          <circle cx={X1 + 6} cy="218" r="6" fill="none" stroke={stroke} strokeWidth="1.3" />
          {T(X1 + 26, 222, c("phb_tm.ct_incoming.ratingCT") ? `CT: ${c("phb_tm.ct_incoming.ratingCT")}` : "CT")}

          {/* PT */}
          <line x1={X1} y1="246" x2={X1 + 24} y2="246" stroke={stroke} strokeWidth="1.3" />
          <circle cx={X1 + 36} cy="246" r="10" fill="none" stroke={stroke} strokeWidth="1.3" />
          <Gnd x={X1 + 36} y={263} />
          {T(X1 + 50, 242, c("phb_tm.pt_incoming.ratingPT") ? `PT: ${c("phb_tm.pt_incoming.ratingPT")}` : "PT")}

          {/* CB Incoming */}
          <Sq x={X1} y={292} />
          {T(X1 + 26, 288, j(["CB Inc:", c("phb_tm.incoming.jenisPemutus"),
             c("phb_tm.incoming.ratingI") && `${c("phb_tm.incoming.ratingI")} A`]))}

          {/* Relay (tap CT) */}
          <line x1={X1 + 11} y1="218" x2={X1 + 70} y2="218" stroke={stroke} strokeWidth="0.9" strokeDasharray="3 2" />
          <line x1={X1 + 70} y1="218" x2={X1 + 70} y2="322" stroke={stroke} strokeWidth="0.9" strokeDasharray="3 2" />
          <rect x={X1 + 58} y="322" width="50" height="22" fill="#fff" stroke={stroke} strokeWidth="1.3" />
          <text x={X1 + 83} y="336" fontSize="8.5" textAnchor="middle" fill="#111">OCR / GFR</text>
          {T(X1 + 10, 358, j([c("phb_tm.relay_proteksi.merk"), c("phb_tm.relay_proteksi.tipe")]), { fontSize: "9" })}

          {/* Meter */}
          <line x1={X1} y1="368" x2={X1 + 22} y2="368" stroke={stroke} strokeWidth="1.3" />
          <circle cx={X1 + 34} cy="368" r="11" fill="#fff" stroke={stroke} strokeWidth="1.3" />
          <text x={X1 + 34} y="371" fontSize="7" textAnchor="middle" fill="#111">kWh</text>
          {T(X1 + 48, 372, "Meter")}

          {/* Pembumian PHB TM */}
          <line x1={X1} y1="394" x2={X1 - 62} y2="394" stroke={stroke} strokeWidth="0.9" />
          <Gnd x={X1 - 62} y={402} />
          {T(X1 - 78, 390, c("phb_tm.grounding_phbtm.nilai") ? `Pmb TM: ${c("phb_tm.grounding_phbtm.nilai")} Ω` : "Pmb PHB TM", { textAnchor: "end", fontSize: "9" })}

          {/* ═══ BELOKAN — Kabel TM ═══ */}
          <path d={`M ${X1} 410 L ${X1} 430 L ${X2} 430 L ${X2} 448`} fill="none" stroke={stroke} strokeWidth="1.8" />
          {T((X1 + X2) / 2, 424, kblTm ? `Kabel TM: ${kblTm}` : "Kabel TM", { textAnchor: "middle" })}

          {/* ═══ KOLOM KANAN — Trafo → PHB TR ═══ */}
          <line x1={X2} y1="448" x2={X2} y2="700" stroke={stroke} strokeWidth="1.8" />

          {/* TRAFO */}
          <circle cx={X2} cy="472" r="24" fill="none" stroke={stroke} strokeWidth="1.8" />
          <circle cx={X2} cy="506" r="24" fill="none" stroke={stroke} strokeWidth="1.8" />
          <path d={`M ${X2 - 8} 478 L ${X2 + 8} 478 L ${X2} 464 Z`} fill="none" stroke={stroke} strokeWidth="1.2" />
          <path d={`M ${X2} 500 L ${X2} 510 M ${X2} 510 L ${X2 - 8} 518 M ${X2} 510 L ${X2 + 8} 518`} fill="none" stroke={stroke} strokeWidth="1.2" />
          {T(X2 + 38, 470, j(["TRAFO", trafoKva && `${trafoKva} kVA`]), { fontWeight: "bold" })}
          {T(X2 + 38, 486, j([teg && `${teg} V`, c("trafo.nameplate.typeVector")]))}
          {T(X2 + 38, 502, c("trafo.nameplate.merk"))}
          <line x1={X2} y1="530" x2={X2 + 58} y2="530" stroke={stroke} strokeWidth="0.9" />
          <Gnd x={X2 + 58} y={538} />
          {T(X2 + 74, 534, c("trafo.grounding_pengukuran.nilaiNetral") ? `Netral: ${c("trafo.grounding_pengukuran.nilaiNetral")} Ω` : "Pmb Netral", { fontSize: "9" })}
          <line x1={X2} y1="472" x2={X2 - 58} y2="472" stroke={stroke} strokeWidth="0.9" strokeDasharray="3 2" />
          <Gnd x={X2 - 58} y={480} />
          {T(X2 - 74, 468, c("trafo.grounding_pengukuran.nilaiBody") ? `Body: ${c("trafo.grounding_pengukuran.nilaiBody")} Ω` : "Pmb Body", { textAnchor: "end", fontSize: "9" })}

          {T(X2 + 38, 566, kblTr ? `SKTR: ${kblTr}` : "SKTR")}

          {/* PHB TR */}
          <rect x="300" y="588" width="440" height="188" fill="none" stroke={stroke} strokeWidth="1" strokeDasharray="5 3" />
          {T(305, 584, "PHB TR", { fontWeight: "bold" })}
          <Sq x={X2} y={614} />
          {T(X2 + 26, 610, j(["ACB Utama", c("phb_tr.acb_utama.merk"), c("phb_tr.acb_utama.tipe"),
             c("phb_tr.acb_utama.ratingI") && `— ${c("phb_tr.acb_utama.ratingI")} A`]))}

          {/* Busbar */}
          <line x1={X2} y1="624" x2={X2} y2="648" stroke={stroke} strokeWidth="1.8" />
          <line x1="340" y1="648" x2="660" y2="648" stroke={stroke} strokeWidth="4" />
          <line x1="660" y1="648" x2="694" y2="648" stroke={stroke} strokeWidth="0.9" />
          <Gnd x={694} y={656} />
          {T(500, 642, c("phb_tr.grounding_phbtr.nilai") ? `Pmb PHB TR: ${c("phb_tr.grounding_phbtr.nilai")} Ω` : "Pmb PHB TR", { fontSize: "9" })}

          {/* Feeder — default MCCB 320 A */}
          {(() => {
            const n = nF > 0 ? nF : 3;
            const a = 375, b = 625, step = n > 1 ? (b - a) / (n - 1) : 0;
            return Array.from({ length: n }, (_, k) => {
              const fx = Math.round(a + step * k);
              return (
                <g key={k}>
                  <line x1={fx} y1="648" x2={fx} y2="670" stroke={stroke} strokeWidth="1.5" />
                  <Sq x={fx} y={682} />
                  <line x1={fx} y1="694" x2={fx} y2="714" stroke={stroke} strokeWidth="1.5" />
                  <path d={`M ${fx - 5} 714 L ${fx + 5} 714 L ${fx} 724 Z`} fill={stroke} />
                  <text x={fx} y="740" fontSize="9" textAnchor="middle" fill="#111">F{k + 1}</text>
                  <text x={fx} y="751" fontSize="8" textAnchor="middle" fill="#111">MCCB {feederI} A</text>
                </g>
              );
            });
          })()}
        </svg>
      </div>
    </>
  );
}

// ─── IsolasiValueCol — kolom nilai compact untuk layout 3-kolom Trafo ────────
function IsolasiValueCol({ title, fields, groupKey, eqKey, form, accessor }) {
  return (
    <div style={{ flex: 1, border: "0.5px solid #ccc", borderRadius: 4, overflow: "hidden", fontSize: "9pt" }}>
      <div style={{ background: "#e2e8f0", padding: "4px 6px", textAlign: "center", fontWeight: "bold", fontSize: "9pt" }}>
        {title}
      </div>
      <div style={{ display: "flex", background: "#f8fafc", borderBottom: "0.5px solid #ccc" }}>
        <div style={{ flex: 1, padding: "2px 4px", fontWeight: "bold", fontSize: "8pt", color: "#555" }}>Titik Ukur</div>
        <div style={{ width: 46, textAlign: "right", padding: "2px 4px", fontWeight: "bold", fontSize: "8pt", color: "#555", borderLeft: "0.5px solid #ccc" }}>MΩ</div>
      </div>
      {fields.map((f, idx) => {
        const prevInterphase = idx > 0 && fields[idx - 1].interphase;
        const nilai = accessor ? accessor(form, f) : gf(form, `part1.${eqKey}.${groupKey}.${f.name}`);
        const muted = f.interphase && (nilai === "0" || Number(nilai) === 0);
        return (
          <div key={f.name}>
            {f.interphase && !prevInterphase && (
              <div style={{ height: 0, borderTop: "0.5px solid #bbb" }} />
            )}
            <div style={{
              display: "flex",
              background: f.highlight ? "#dbeafe" : "transparent",
              borderBottom: idx < fields.length - 1 ? "0.5px solid #eee" : "none",
            }}>
              <div style={{ flex: 1, padding: "2px 4px" }}>{f.label}</div>
              <div style={{
                width: 46, textAlign: "right", padding: "2px 4px", fontWeight: "bold",
                borderLeft: "0.5px solid #ccc",
                color: muted ? "#bbb" : "inherit",
              }}>{nilai}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── IsolasiTrafoFotoGrid — grid foto megger per grup ─────────────────────────
function IsolasiTrafoFotoGrid({ title, fields, groupKey, eqKey, photos, photoAccessor }) {
  const items = fields.map(f => ({
    label: f.label,
    foto: photoAccessor
      ? photoAccessor(photos, f)
      : gp(photos, "part1", `${eqKey}.${groupKey}.${f.name}`)[1],
  }));
  if (!items.some(i => i.foto)) return null;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontStyle: "italic", fontSize: "9pt", marginBottom: 4, color: "#444" }}>{title}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
        {items.map((item, idx) => (
          <div key={idx} style={{ textAlign: "center" }}>
            {item.foto ? (
              <img src={item.foto} alt={item.label}
                style={{ width: "100%", height: 110, objectFit: "contain", borderRadius: 3, border: "0.5px solid #ddd", background: "#f8fafc" }} />
            ) : (
              <div style={{ height: 110, background: "#f1f5f9", borderRadius: 3, border: "0.5px solid #ddd",
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "7pt", color: "#aaa" }}>Tidak ada foto</span>
              </div>
            )}
            <div style={{ fontSize: "7.5pt", marginTop: 2, color: "#555" }}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── IsolasiMeggerPDFTable — tabel pengukuran format PDF referensi ───────────
function IsolasiMeggerPDFTable({ groups, compact = false }) {
  const BD = "1px solid #000";
  const fs  = compact ? "8pt"    : "9.5pt";
  const pad = compact ? "2px 4px" : "3px 6px";
  const thS = { border: BD, padding: pad, fontWeight: "bold", fontSize: fs, background: "#d9d9d9", textAlign: "center", verticalAlign: "middle" };
  const tdS = { border: BD, padding: pad, fontSize: fs, verticalAlign: "middle", textAlign: "left" };
  const tdC = { ...tdS, textAlign: "center" };

  function ketVal(val) {
    if (!val && val !== 0) return "—";
    const s = String(val).trim().toUpperCase();
    if (s === "OL") return "Memenuhi Standar PUIL";
    const n = parseFloat(s.replace(",", "."));
    if (isNaN(n)) return "—";
    return n > 0 ? "Memenuhi Standar PUIL" : "Tidak Memenuhi";
  }
  function dispVal(val) {
    if (val === null || val === undefined || val === "" || val === "-") return "—";
    const s = String(val).trim().toUpperCase();
    if (s === "OL") return "OL";
    const n = parseFloat(s.replace(",", "."));
    if (isNaN(n)) return String(val);
    if (n >= 1000) return `${(n / 1000).toFixed(2).replace(/\.?0+$/, "")} GΩ`;
    return `${val} MΩ`;
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: compact ? 6 : 12, fontSize: fs }}>
      <thead>
        <tr>
          <td style={{ ...thS, width: "5%" }}>No</td>
          <td style={{ ...thS, width: "26%" }}>Butir Isian Mata Uji</td>
          <td style={{ ...thS, width: "20%" }}>Mata Uji</td>
          <td style={{ ...thS, width: "15%" }}>Hasil Evaluasi Acuan</td>
          <td style={{ ...thS, width: "14%" }}>Hasil Uji</td>
          <td style={thS}>Keterangan</td>
        </tr>
      </thead>
      <tbody>
        {groups.map((group, gi) => {
          const fields = group.fields ?? [];
          return fields.map((field, fi) => (
            <tr key={`${gi}-${fi}`}>
              {fi === 0 && (
                <>
                  <td style={{ ...tdC, fontWeight: "bold" }} rowSpan={fields.length}>{gi + 1}</td>
                  <td style={tdS} rowSpan={fields.length}>{group.label}</td>
                </>
              )}
              <td style={tdS}>{field.label}</td>
              <td style={tdC}>{field.acuan}</td>
              <td style={{ ...tdC, fontWeight: "bold" }}>{dispVal(field.value)}</td>
              <td style={tdS}>{ketVal(field.value)}</td>
            </tr>
          ));
        })}
      </tbody>
    </table>
  );
}

// ─── IsolasiDualPhotoGrid — grid foto nilai dengan PhotoCell style ────────────
function IsolasiDualPhotoGrid({ title, fields, groupKey, eqKey, photos }) {
  const items = fields.slice(0, 3).map(f => ({
    label: ISO_LABEL_FULL[f.name] || f.label,
    url: gp(photos, "part1", `${eqKey}.${groupKey}.${f.name}`)[1],
  }));

  if (!items.length) return null;

  const colW = `${100 / items.length}%`;
  return (
    <>
      {title && <DocsHeading>{title}</DocsHeading>}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8, tableLayout: "fixed" }}>
        <tbody>
          <tr>
            {items.map(({ label, url }, ci) => (
              <PhotoCell key={ci} label={label} url={url} no={ci + 1} width={colW} square />
            ))}
          </tr>
        </tbody>
      </table>
    </>
  );
}

// ─── SectionHeading — gray header row (sesuai Excel) ─────────────────────────
function SectionHeading({ children }) {
  return (
    <div className="rlo-section-heading" style={{
      background: "#D4D4D4", color: "#000",
      padding: "4px 8px", fontWeight: "bold", fontSize: "10pt",
      marginTop: 8, marginBottom: 0,
    }}>
      {children}
    </div>
  );
}

// ─── DocsHeading — blue header for photo documentation sections ───────────────
function DocsHeading({ children }) {
  return (
    <div style={{
      background: "#1a3a6b", color: "#fff",
      padding: "4px 8px", fontWeight: "bold", fontSize: "10pt",
      marginTop: 8, marginBottom: 0,
    }}>
      {children || "Dokumentasi :"}
    </div>
  );
}

// ─── RLO helpers ─────────────────────────────────────────────────────────────
const MIN_ISO_TM = 1000; // MΩ – standar peralatan tegangan menengah
const MIN_ISO_TR = 100;  // MΩ – standar peralatan tegangan rendah

function parseV(v) {
  if (v === null || v === undefined || v === "" || v === "-") return null;
  const n = parseFloat(String(v).replace(",", "."));
  return isNaN(n) ? null : n;
}

function minGroup(g) {
  if (!g || typeof g !== "object") return null;
  const ns = Object.values(g).map(parseV).filter(n => n !== null);
  return ns.length ? Math.min(...ns) : null;
}

function isoStatus(val, std) {
  if (val === null) return { label: "—", pass: null };
  return val >= std
    ? { label: "Memenuhi", pass: true }
    : { label: "Tidak Memenuhi", pass: false };
}

function tegStatus(val, nom) {
  if (val === null) return { label: "—", dev: null, pass: null };
  const dev = ((val - nom) / nom) * 100;
  const pass = Math.abs(dev) <= 5;
  return {
    label: pass ? "Normal" : "Di Luar Toleransi",
    dev: (dev >= 0 ? "+" : "") + dev.toFixed(1) + "%",
    pass,
  };
}

// ─── RloContent ───────────────────────────────────────────────────────────────
function RloContent({ form, data, photos }) {
  const f1  = form.part1 ?? {};
  const teg = f1.phb_tr?.tegangan ?? {};
  const beb = f1.phb_tr?.beban    ?? {};
  const ph  = photos ?? {};

  // ── Insulasi evaluation ──
  const ip  = f1.trafo?.isolasi_primer         ?? {};
  const isk = f1.trafo?.isolasi_skunder        ?? {};
  const ips = f1.trafo?.isolasi_primer_skunder ?? {};

  const isoRows = [
    // ─── ISOLASI PRIMER ───────────────────────────────────────────
    { isHeader: true, label: "ISOLASI PRIMER" },
    { bagian:"Trafo", parameter:"R – G", val:parseV(ip.rGnd), std:MIN_ISO_TM, photoKey:"trafo.isolasi_primer.rGnd" },
    { bagian:"Trafo", parameter:"S – G", val:parseV(ip.sGnd), std:MIN_ISO_TM, photoKey:"trafo.isolasi_primer.sGnd" },
    { bagian:"Trafo", parameter:"T – G", val:parseV(ip.tGnd), std:MIN_ISO_TM, photoKey:"trafo.isolasi_primer.tGnd" },
    { bagian:"Trafo", parameter:"R – S", val:parseV(ip.rS),   std:MIN_ISO_TM, photoKey:"trafo.isolasi_primer.rS" },
    { bagian:"Trafo", parameter:"S – T", val:parseV(ip.sT),   std:MIN_ISO_TM, photoKey:"trafo.isolasi_primer.sT" },
    { bagian:"Trafo", parameter:"T – R", val:parseV(ip.tR),   std:MIN_ISO_TM, photoKey:"trafo.isolasi_primer.tR" },
    // ─── ISOLASI SEKUNDER ─────────────────────────────────────────
    { isHeader: true, label: "ISOLASI SEKUNDER" },
    { bagian:"Trafo", parameter:"R – G", val:parseV(isk.rGnd), std:MIN_ISO_TR, photoKey:"trafo.isolasi_skunder.rGnd" },
    { bagian:"Trafo", parameter:"S – G", val:parseV(isk.sGnd), std:MIN_ISO_TR, photoKey:"trafo.isolasi_skunder.sGnd" },
    { bagian:"Trafo", parameter:"T – G", val:parseV(isk.tGnd), std:MIN_ISO_TR, photoKey:"trafo.isolasi_skunder.tGnd" },
    { bagian:"Trafo", parameter:"N – G", val:parseV(isk.nGnd), std:MIN_ISO_TR, photoKey:"trafo.isolasi_skunder.nGnd" },
    { bagian:"Trafo", parameter:"R – S", val:parseV(isk.rS),   std:MIN_ISO_TR, photoKey:"trafo.isolasi_skunder.rS" },
    { bagian:"Trafo", parameter:"S – T", val:parseV(isk.sT),   std:MIN_ISO_TR, photoKey:"trafo.isolasi_skunder.sT" },
    { bagian:"Trafo", parameter:"T – R", val:parseV(isk.tR),   std:MIN_ISO_TR, photoKey:"trafo.isolasi_skunder.tR" },
    { bagian:"Trafo", parameter:"R – N", val:parseV(isk.rN),   std:MIN_ISO_TR, photoKey:"trafo.isolasi_skunder.rN" },
    { bagian:"Trafo", parameter:"S – N", val:parseV(isk.sN),   std:MIN_ISO_TR, photoKey:"trafo.isolasi_skunder.sN" },
    { bagian:"Trafo", parameter:"T – N", val:parseV(isk.tN),   std:MIN_ISO_TR, photoKey:"trafo.isolasi_skunder.tN" },
    // ─── ISOLASI PRIMER – SEKUNDER ────────────────────────────────
    { isHeader: true, label: "ISOLASI PRIMER – SEKUNDER" },
    { bagian:"Trafo", parameter:"Primer R / Sekunder R", val:parseV(ips.PR_SR), std:MIN_ISO_TM, photoKey:"trafo.isolasi_primer_skunder.PR_SR" },
    { bagian:"Trafo", parameter:"Primer R / Sekunder S", val:parseV(ips.PR_SS), std:MIN_ISO_TM, photoKey:"trafo.isolasi_primer_skunder.PR_SS" },
    { bagian:"Trafo", parameter:"Primer R / Sekunder T", val:parseV(ips.PR_ST), std:MIN_ISO_TM, photoKey:"trafo.isolasi_primer_skunder.PR_ST" },
    { bagian:"Trafo", parameter:"Primer R / Sekunder N", val:parseV(ips.PR_SN), std:MIN_ISO_TM, photoKey:"trafo.isolasi_primer_skunder.PR_SN" },
    { bagian:"Trafo", parameter:"Primer S / Sekunder R", val:parseV(ips.PS_SR), std:MIN_ISO_TM, photoKey:"trafo.isolasi_primer_skunder.PS_SR" },
    { bagian:"Trafo", parameter:"Primer S / Sekunder S", val:parseV(ips.PS_SS), std:MIN_ISO_TM, photoKey:"trafo.isolasi_primer_skunder.PS_SS" },
    { bagian:"Trafo", parameter:"Primer S / Sekunder T", val:parseV(ips.PS_ST), std:MIN_ISO_TM, photoKey:"trafo.isolasi_primer_skunder.PS_ST" },
    { bagian:"Trafo", parameter:"Primer S / Sekunder N", val:parseV(ips.PS_SN), std:MIN_ISO_TM, photoKey:"trafo.isolasi_primer_skunder.PS_SN" },
    { bagian:"Trafo", parameter:"Primer T / Sekunder R", val:parseV(ips.PT_SR), std:MIN_ISO_TM, photoKey:"trafo.isolasi_primer_skunder.PT_SR" },
    { bagian:"Trafo", parameter:"Primer T / Sekunder S", val:parseV(ips.PT_SS), std:MIN_ISO_TM, photoKey:"trafo.isolasi_primer_skunder.PT_SS" },
    { bagian:"Trafo", parameter:"Primer T / Sekunder T", val:parseV(ips.PT_ST), std:MIN_ISO_TM, photoKey:"trafo.isolasi_primer_skunder.PT_ST" },
    { bagian:"Trafo", parameter:"Primer T / Sekunder N", val:parseV(ips.PT_SN), std:MIN_ISO_TM, photoKey:"trafo.isolasi_primer_skunder.PT_SN" },
    // ─── PHB TR & KABEL TR ────────────────────────────────────────
    { isHeader: true, label: "PHB TR & KABEL TR" },
    { bagian:"PHB TR",   parameter:"Incoming (R-G, S-G, T-G, N-G)", val:minGroup(f1.phb_tr?.isolasi_incoming),  std:MIN_ISO_TR, photoKey:"phb_tr.isolasi_incoming.rGnd" },
    { bagian:"Kabel TR", parameter:"Kabel TR (R-G, S-G, T-G)",       val:minGroup(f1.phb_tr?.isolasi_kabel_tr), std:MIN_ISO_TR, photoKey:"phb_tr.isolasi_kabel_tr.rGnd" },
  ];

  let _num = 0;
  const isoEval = isoRows.map(r =>
    r.isHeader ? r : { ...r, num: ++_num, s: isoStatus(r.val, r.std) }
  );
  const isoAllPass = isoEval.filter(r => !r.isHeader).every(r => r.s.pass !== false);

  // ── Tegangan evaluation ──
  const tegRows = [
    { param:"R–S (L-L)", val:parseV(teg.RS), nom:380, photoKey:"phb_tr.tegangan.RS" },
    { param:"S–T (L-L)", val:parseV(teg.ST), nom:380, photoKey:"phb_tr.tegangan.ST" },
    { param:"R–T (L-L)", val:parseV(teg.RT), nom:380, photoKey:"phb_tr.tegangan.RT" },
    { param:"R–N (L-N)", val:parseV(teg.RN), nom:220, photoKey:"phb_tr.tegangan.RN" },
    { param:"S–N (L-N)", val:parseV(teg.SN), nom:220, photoKey:"phb_tr.tegangan.SN" },
    { param:"T–N (L-N)", val:parseV(teg.TN), nom:220, photoKey:"phb_tr.tegangan.TN" },
  ];
  const tegEval    = tegRows.map(r => ({ ...r, s: tegStatus(r.val, r.nom) }));
  const tegAllPass = tegEval.every(r => r.s.pass !== false);

  // ── Beban (arus) ──
  const kva       = parseV(f1.trafo?.nameplate?.kapasitas);
  const ratedAmps = kva ? Math.round((kva * 1000) / (Math.sqrt(3) * 400)) : null;
  const bebRows   = [
    { fasa:"R",          val:parseV(beb.R), photoKey:"phb_tr.beban.R" },
    { fasa:"S",          val:parseV(beb.S), photoKey:"phb_tr.beban.S" },
    { fasa:"T",          val:parseV(beb.T), photoKey:"phb_tr.beban.T" },
    { fasa:"N (Netral)", val:parseV(beb.N), photoKey:"phb_tr.beban.N" },
  ];
  const maxBeban  = Math.max(...bebRows.map(r => r.val ?? 0));
  const pctLoad   = ratedAmps && maxBeban > 0 ? Math.round((maxBeban / ratedAmps) * 100) : null;

  const hasAnyData = isoEval.some(r => r.val !== null)
    || tegRows.some(r => r.val !== null)
    || bebRows.some(r => r.val !== null);

  const allPass   = isoAllPass && tegAllPass;
  const nama      = data.nama   || "—";
  const alamat    = data.alamat || "—";
  const kvaLabel  = kva ? `${kva} kVA` : "—";
  const trafoMerk = f1.trafo?.nameplate?.merk ?? "";
  const statusBg  = !hasAnyData ? "#fffbeb" : allPass ? "#f0fdf4" : "#fef2f2";
  const statusClr = !hasAnyData ? "#92400e" : allPass ? "#166534" : "#991b1b";

  // helper foto: ambil foto pertama dari photoKey
  const foto1 = (key) => gp(ph, "part1", key)[0] ?? null;
  const foto2 = (key) => gp(ph, "part1", key)[1] ?? null;

  return (
    <>
      {/* Status utama */}
      <div className="rlo-status no-break" style={{ textAlign:"center", padding:"10px 16px", border:"2px solid #000",
        background:statusBg, marginBottom:14 }}>
        <div style={{ fontSize:"13pt", fontWeight:"bold", letterSpacing:1, color:statusClr }}>
          {!hasAnyData ? "DATA BELUM TERSEDIA" : "LAIK OPERASI"}
        </div>
        <div style={{ fontSize:"9pt", marginTop:4, fontStyle:"italic", color:"#555" }}>
          {!hasAnyData
            ? "Isi data pengujian pada form admin terlebih dahulu"
            : "Berdasarkan hasil pemeriksaan dan pengujian instalasi tenaga listrik"}
        </div>
      </div>

      {/* I. Tahanan Isolasi — selalu mulai halaman baru saat print */}
      <div className="rlo-pb">
        <SectionHeading>I. EVALUASI TAHANAN ISOLASI</SectionHeading>
        <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:6, fontSize:"10pt" }}>
          <thead>
            <tr className="rlo-tbl-hdr" style={{ background:"#fef3c7" }}>
              <td style={{ ...TH_C, width:"5%" }}>No</td>
              <td style={TH_L}>Bagian</td>
              <td style={TH_L}>Parameter</td>
              <td style={{ ...TH_C, width:"16%" }}>Nilai (MΩ)</td>
              <td style={{ ...TH_C, width:"25%" }}>Foto Jauh</td>
              <td style={{ ...TH_C, width:"25%" }}>Foto Nilai</td>
            </tr>
          </thead>
          <tbody>
            {isoEval.map((row, i) => {
              if (row.isHeader) {
                return (
                  <tr key={i} className="rlo-subhdr" style={{ background:"#e5e7eb" }}>
                    <td colSpan={6} style={{ ...TH_L, fontStyle:"italic", padding:"4px 8px", fontSize:"9pt" }}>
                      {row.label}
                    </td>
                  </tr>
                );
              }
              return (
                <tr key={i} className="rlo-row">
                  <td style={TD_C}>{row.num}</td>
                  <td style={TD_L}>{row.bagian}</td>
                  <td style={TD_L}>{row.parameter}</td>
                  <td style={TD_C}>{row.val !== null ? row.val.toLocaleString("id-ID") : "—"}</td>
                  <td style={TD_PHOTO}>
                    {foto1(row.photoKey)
                      ? <img className="rlo-foto" src={foto1(row.photoKey)} alt="jauh" style={{ maxHeight:60, maxWidth:"100%", objectFit:"contain", display:"block" }} />
                      : <span style={{ color:"#bbb", fontSize:"8pt" }}>—</span>}
                  </td>
                  <td style={TD_PHOTO}>
                    {foto2(row.photoKey)
                      ? <img className="rlo-foto" src={foto2(row.photoKey)} alt="nilai" style={{ maxHeight:60, maxWidth:"100%", objectFit:"contain", display:"block" }} />
                      : <span style={{ color:"#bbb", fontSize:"8pt" }}>—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ fontSize:"8pt", fontStyle:"italic", marginBottom:6, color:"#666" }}>
          * Standar minimum: TM ≥ 1.000 MΩ, TR ≥ 100 MΩ (PUIL 2011 / SNI).
        </div>
      </div>

      {/* II. Tegangan — halaman baru */}
      <div className="rlo-pb">
        <SectionHeading>II. EVALUASI PENGUKURAN TEGANGAN PHB TR</SectionHeading>
        <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:6, fontSize:"10pt" }}>
          <thead>
            <tr className="rlo-tbl-hdr" style={{ background:"#fef3c7" }}>
              <td style={{ ...TH_C, width:"5%" }}>No</td>
              <td style={TH_L}>Parameter</td>
              <td style={{ ...TH_C, width:"16%" }}>Terukur (V)</td>
              <td style={{ ...TH_C, width:"30%" }}>Foto Jauh</td>
              <td style={{ ...TH_C, width:"30%" }}>Foto Nilai</td>
            </tr>
          </thead>
          <tbody>
            {tegEval.map(({ param, val, photoKey }, i) => (
              <tr key={i} className="rlo-row">
                <td style={TD_C}>{i + 1}</td>
                <td style={TD_L}>{param}</td>
                <td style={TD_C}>{val !== null ? val : "—"}</td>
                <td style={TD_PHOTO}>
                  {foto1(photoKey)
                    ? <img className="rlo-foto" src={foto1(photoKey)} alt="jauh" style={{ maxHeight:60, maxWidth:"100%", objectFit:"contain", display:"block" }} />
                    : <span style={{ color:"#bbb", fontSize:"8pt" }}>—</span>}
                </td>
                <td style={TD_PHOTO}>
                  {foto2(photoKey)
                    ? <img className="rlo-foto" src={foto2(photoKey)} alt="nilai" style={{ maxHeight:60, maxWidth:"100%", objectFit:"contain", display:"block" }} />
                    : <span style={{ color:"#bbb", fontSize:"8pt" }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ fontSize:"8pt", fontStyle:"italic", marginBottom:6, color:"#666" }}>
          * Toleransi: ±5% dari nominal (L-L: 380 V, L-N: 220 V)
        </div>

        {/* III. Beban — lanjut di halaman yang sama */}
        <SectionHeading>III. PENGUKURAN BEBAN (ARUS)</SectionHeading>
        <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:6, fontSize:"10pt" }}>
          <thead>
            <tr className="rlo-tbl-hdr" style={{ background:"#fef3c7" }}>
              <td style={{ ...TH_C, width:"5%" }}>No</td>
              <td style={TH_L}>Fasa</td>
              <td style={{ ...TH_C, width:"14%" }}>Terukur (A)</td>
              {ratedAmps != null && <td style={{ ...TH_C, width:"14%" }}>Nominal (A)</td>}
              {ratedAmps != null && <td style={{ ...TH_C, width:"12%" }}>% Beban</td>}
              <td style={{ ...TH_C, width:"17%" }}>Foto Jauh</td>
              <td style={{ ...TH_C, width:"17%" }}>Foto Nilai</td>
            </tr>
          </thead>
          <tbody>
            {bebRows.map(({ fasa, val, photoKey }, i) => (
              <tr key={i} className="rlo-row">
                <td style={TD_C}>{i + 1}</td>
                <td style={TD_L}>Phasa {fasa}</td>
                <td style={TD_C}>{val !== null ? val : "—"}</td>
                {ratedAmps != null && <td style={TD_C}>{ratedAmps}</td>}
                {ratedAmps != null && (
                  <td style={TD_C}>{val !== null ? Math.round((val / ratedAmps) * 100) + "%" : "—"}</td>
                )}
                <td style={TD_PHOTO}>
                  {foto1(photoKey)
                    ? <img className="rlo-foto" src={foto1(photoKey)} alt="jauh" style={{ maxHeight:60, maxWidth:"100%", objectFit:"contain", display:"block" }} />
                    : <span style={{ color:"#bbb", fontSize:"8pt" }}>—</span>}
                </td>
                <td style={TD_PHOTO}>
                  {foto2(photoKey)
                    ? <img className="rlo-foto" src={foto2(photoKey)} alt="nilai" style={{ maxHeight:60, maxWidth:"100%", objectFit:"contain", display:"block" }} />
                    : <span style={{ color:"#bbb", fontSize:"8pt" }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pctLoad !== null && (
          <div style={{ fontSize:"8pt", fontStyle:"italic", marginBottom:6, color:"#666" }}>
            * Pembebanan maksimum {pctLoad}% dari kapasitas nominal trafo {kvaLabel}
            {trafoMerk ? ` (${trafoMerk})` : ""}
          </div>
        )}
      </div>

      {/* IV. Kesimpulan — halaman baru */}
      <div className="rlo-pb">
        <SectionHeading>IV. KESIMPULAN DAN REKOMENDASI</SectionHeading>
        <div className="no-break" style={{ border:"1px solid #000", padding:"10px 14px", marginBottom:12,
          lineHeight:1.8, fontSize:"10pt", textAlign:"justify" }}>
          {!hasAnyData ? (
            <p style={{ color:"#92400e", fontStyle:"italic" }}>
              Data hasil pengujian belum tersedia. Silakan isi form pengujian pada halaman admin
              dan pastikan data tahanan isolasi, tegangan, serta beban telah disimpan.
            </p>
          ) : (
            <>
              <p style={{ marginBottom:8 }}>
                Berdasarkan hasil pemeriksaan dan pengujian yang telah dilaksanakan pada instalasi
                tenaga listrik <b>{nama}</b> yang berlokasi di <b>{alamat}</b>
                {kva ? `, dengan Transformator${trafoMerk ? ` ${trafoMerk}` : ""} berkapasitas ${kvaLabel}` : ""},
                dapat disimpulkan sebagai berikut:
              </p>
              <ol style={{ paddingLeft:20, marginBottom:8 }}>
                <li style={{ marginBottom:4 }}>
                  Hasil pengujian tahanan isolasi pada seluruh peralatan{" "}
                  {isoAllPass
                    ? "menunjukkan nilai yang memenuhi standar minimum yang dipersyaratkan."
                    : "menunjukkan terdapat nilai yang belum memenuhi standar minimum yang dipersyaratkan dan perlu dilakukan tindak lanjut perbaikan."}
                </li>
                <li style={{ marginBottom:4 }}>
                  Hasil pengukuran tegangan pada PHB TR{" "}
                  {tegEval.every(r => r.s.pass === null)
                    ? "belum tersedia data pengukuran."
                    : tegAllPass
                      ? "berada dalam batas toleransi ±5% dari tegangan nominal."
                      : "terdapat nilai yang berada di luar batas toleransi ±5% dari tegangan nominal."}
                </li>
                {pctLoad !== null && (
                  <li style={{ marginBottom:4 }}>
                    Tingkat pembebanan transformator sebesar <b>{pctLoad}%</b>
                    {" "}dari kapasitas nominal{kva ? ` ${kvaLabel}` : ""}.
                  </li>
                )}
                <li>
                  Berdasarkan hasil evaluasi tersebut, instalasi tenaga listrik ini dinyatakan{" "}
                  <b>LAIK OPERASI</b>{" "}
                  dan dapat dioperasikan sesuai ketentuan peraturan yang berlaku.
                </li>
              </ol>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Deteksi provinsi (untuk "UID <PROVINSI>" PLN) dari kota/alamat ──────────
const PROVINSI_ALIASES = [
  [["jawa timur", "jatim"], "JAWA TIMUR"],
  [["jawa barat", "jabar"], "JAWA BARAT"],
  [["jawa tengah", "jateng"], "JAWA TENGAH"],
  [["dki jakarta", "jakarta"], "DKI JAKARTA"],
  [["yogyakarta", "jogja", "d.i.y", "diy"], "D.I. YOGYAKARTA"],
  [["banten"], "BANTEN"],
  [["bali"], "BALI"],
  [["kepulauan riau", "kepri"], "KEPULAUAN RIAU"],
  [["riau"], "RIAU"],
  [["aceh", "nanggroe"], "ACEH"],
  [["sumatera utara", "sumatra utara", "sumut"], "SUMATERA UTARA"],
  [["sumatera barat", "sumatra barat", "sumbar"], "SUMATERA BARAT"],
  [["sumatera selatan", "sumatra selatan", "sumsel"], "SUMATERA SELATAN"],
  [["lampung"], "LAMPUNG"],
  [["jambi"], "JAMBI"],
  [["bengkulu"], "BENGKULU"],
  [["bangka belitung", "babel"], "KEPULAUAN BANGKA BELITUNG"],
  [["kalimantan barat", "kalbar"], "KALIMANTAN BARAT"],
  [["kalimantan timur", "kaltim"], "KALIMANTAN TIMUR"],
  [["kalimantan selatan", "kalsel"], "KALIMANTAN SELATAN"],
  [["kalimantan tengah", "kalteng"], "KALIMANTAN TENGAH"],
  [["kalimantan utara", "kaltara"], "KALIMANTAN UTARA"],
  [["sulawesi selatan", "sulsel"], "SULAWESI SELATAN"],
  [["sulawesi utara", "sulut"], "SULAWESI UTARA"],
  [["sulawesi tengah", "sulteng"], "SULAWESI TENGAH"],
  [["sulawesi tenggara", "sultra"], "SULAWESI TENGGARA"],
  [["sulawesi barat", "sulbar"], "SULAWESI BARAT"],
  [["gorontalo"], "GORONTALO"],
  [["maluku utara", "malut"], "MALUKU UTARA"],
  [["maluku"], "MALUKU"],
  [["papua barat"], "PAPUA BARAT"],
  [["papua"], "PAPUA"],
  [["nusa tenggara barat", "ntb"], "NUSA TENGGARA BARAT"],
  [["nusa tenggara timur", "ntt"], "NUSA TENGGARA TIMUR"],
];
// Fallback: nama kabupaten/kota umum → provinsi (saat teks hanya menyebut kota)
const KOTA_PROVINSI = {
  "pasuruan": "JAWA TIMUR", "bangil": "JAWA TIMUR", "gresik": "JAWA TIMUR",
  "surabaya": "JAWA TIMUR", "sidoarjo": "JAWA TIMUR", "malang": "JAWA TIMUR",
  "mojokerto": "JAWA TIMUR", "pandaan": "JAWA TIMUR", "beji": "JAWA TIMUR",
  "panceng": "JAWA TIMUR", "lamongan": "JAWA TIMUR", "tuban": "JAWA TIMUR",
  "jombang": "JAWA TIMUR", "kediri": "JAWA TIMUR", "probolinggo": "JAWA TIMUR",
  "bojonegoro": "JAWA TIMUR", "nganjuk": "JAWA TIMUR", "madiun": "JAWA TIMUR",
  "bintan": "KEPULAUAN RIAU", "batam": "KEPULAUAN RIAU", "tanjungpinang": "KEPULAUAN RIAU",
};
function detectProvinsi(...parts) {
  const hay = parts.filter(Boolean).join(" ").toLowerCase();
  if (!hay) return "";
  for (const [aliases, canon] of PROVINSI_ALIASES) {
    if (aliases.some(a => hay.includes(a))) return canon;
  }
  for (const [kota, prov] of Object.entries(KOTA_PROVINSI)) {
    if (new RegExp(`\\b${kota}\\b`).test(hay)) return prov;
  }
  return "";
}

// ─── PendahuluanContent (section F) ──────────────────────────────────────────
function PendahuluanContent({ form, data, instansi, ttd }) {
  const [copiedLabel, setCopiedLabel] = useState(null);

  const nama           = data.nama    || "—";
  const alamat         = data.alamat  || "—";
  const instansiNama   = instansi?.nama || "—";
  const tanggal        = formatDate(data.ttd?.tanggal) || data.ttd?.tanggal || "—";
  // TT: person selected from instansi (via ttd)
  const pjId      = ttd?.penanggungJawabId;
  const livePj    = pjId ? (instansi?.penanggungJawab ?? []).find(p => p.id === pjId) : null;
  const ttNama    = ttd?.nama || livePj?.nama || "—";
  const PJT_NAMA  = "Kadek Agus Parwata";

  // Buang nilai placeholder ("-", "—", "n/a", kosong) supaya tidak muncul di narasi
  const clean = (v) => {
    const s = String(v ?? "").trim();
    return (s === "-" || s === "–" || s === "—" || s.toLowerCase() === "n/a") ? "" : s;
  };

  // Jumlah unit tiap peralatan (dari instanceCounts dokumen pengujian)
  const trafoCount = Math.max(1, data.instanceCounts?.trafo  ?? 1);
  const phbTmCount = Math.max(1, data.instanceCounts?.phb_tm ?? 1);
  const phbTrCount = Math.max(1, data.instanceCounts?.phb_tr ?? 1);

  // Trafo spec (dari data pengujian — nameplate form)
  const trafoKapasitas = clean(gf(form, "part1.trafo.nameplate.kapasitas"));
  const trafoMerk      = clean(gf(form, "part1.trafo.nameplate.merk"));

  // Tegangan sistem SKTM — diturunkan dari sisi primer trafo (mis. "20000/400" → "20 kV")
  const teganganPS   = clean(gf(form, "part1.trafo.nameplate.teganganPS"));
  const rawPrimer    = parseFloat(teganganPS.replace(/[.\s]/g, "").split(/[/xX-]/)[0]);
  const teganganKvTM = !Number.isFinite(rawPrimer) || rawPrimer <= 0
    ? ""
    : rawPrimer >= 1000
      ? `${+(rawPrimer / 1000).toFixed(rawPrimer % 1000 ? 1 : 0)} kV`
      : `${+rawPrimer.toFixed(1)} kV`;

  // Jumlah outgoing PHB TM — dari baris dinamis grup "outgoing" tiap instance
  const phbTmKeys = Array.from({ length: phbTmCount }, (_, i) => (i === 0 ? "phb_tm" : `phb_tm_${i + 1}`));
  const outgoingCount = phbTmKeys.reduce(
    (n, k) => n + (form.part1?.[k]?.outgoing?.rows?.length ?? 0), 0,
  );

  // Kabel TM — cek outgoing (yang diisi di form) → incoming → kabel_sktm (data lama)
  const kmMerk   = clean(gf(form, "part1.phb_tm.kabel_outgoing.merk")    || gf(form, "part1.phb_tm.kabel_incoming.merk")    || gf(form, "part1.phb_tm.kabel_sktm.merk"));
  const kmTipe   = clean(gf(form, "part1.phb_tm.kabel_outgoing.tipe")    || gf(form, "part1.phb_tm.kabel_incoming.tipe")    || gf(form, "part1.phb_tm.kabel_sktm.tipe"));
  const kmUkuran = clean(gf(form, "part1.phb_tm.kabel_outgoing.ukuran")  || gf(form, "part1.phb_tm.kabel_incoming.ukuran")  || gf(form, "part1.phb_tm.kabel_sktm.ukuran"));
  const kmPanjang= clean(gf(form, "part1.phb_tm.kabel_outgoing.panjang") || gf(form, "part1.phb_tm.kabel_incoming.panjang") || gf(form, "part1.phb_tm.kabel_sktm.panjang"));

  // Kabel TR
  const krMerk   = clean(gf(form, "part1.phb_tr.kabel_tr.merk"));
  const krTipe   = clean(gf(form, "part1.phb_tr.kabel_tr.tipe"));
  const krUkuran = clean(gf(form, "part1.phb_tr.kabel_tr.ukuran"));
  const krPanjang= clean(gf(form, "part1.phb_tr.kabel_tr.panjang"));

  // Build daftar instalasi bernomor (untuk Ringkasan Eksekutif)
  const instalasiItems = [];

  // 1. Trafo Daya
  instalasiItems.push(
    `${trafoCount} Unit Trafo Daya${trafoKapasitas ? ` ${trafoKapasitas} kVA` : ""}` +
    `${trafoMerk ? ` Merk ${trafoMerk}` : ""}`
  );

  // 2. PHB TM (+ rincian incoming/outgoing bila tersedia)
  instalasiItems.push(
    outgoingCount > 0
      ? `${phbTmCount} Unit PHB TM (1 In Coming ${outgoingCount} Out Going)`
      : `${phbTmCount} Unit PHB TM`
  );

  // 3. PHB TR
  instalasiItems.push(`${phbTrCount} Unit PHB TR`);

  // 4. Kabel SKTM
  instalasiItems.push(
    `${kmPanjang ? `${kmPanjang} ms` : "… ms"} Kabel SKTM` +
    `${teganganKvTM ? ` ${teganganKvTM}` : ""}` +
    `${kmMerk ? ` Merk ${kmMerk}` : ""}${kmTipe ? ` tipe ${kmTipe}` : ""}${kmUkuran ? ` (${kmUkuran})` : ""}`
  );

  // 5. Kabel SKTR
  instalasiItems.push(
    `${krPanjang ? `${krPanjang} ms` : "… ms"} Kabel SKTR` +
    `${krMerk ? ` Merk ${krMerk}` : ""}${krTipe ? ` tipe ${krTipe}` : ""}` +
    `${krUkuran ? ` (${krUkuran})` : ""}`
  );

  // 6. Pembumian
  instalasiItems.push("1 Lot Pembumian");

  const CELL_TOP = { border: B, padding: "8px 10px", verticalAlign: "top", textAlign: "justify", lineHeight: 1.7, fontSize: "10.5pt" };
  const CELL_LBL = { border: B, padding: "8px 10px", verticalAlign: "top", fontWeight: "bold", width: "24%", fontSize: "10.5pt", background: "#fafaf9" };

  const rows = [
    {
      label: "Ringkasan Eksekutif",
      content: (
        <>
          <p style={{ marginBottom: 6 }}>
            Pelaksanaan Pemeriksaan dan Pengujian Laik Operasi Dilaksanakan berdasarkan Peraturan
            Menteri Energi Sumber Daya Mineral No. 12 Tahun 2021 tentang Klasifikasi, Kualifikasi,
            Akreditasi, dan Sertifikasi Usaha Jasa Penunjang Tenaga Listrik. Pemeriksaan dan
            Pengujian Instalasi Tenaga Listrik Tegangan Menengah dan Distribusi Tenaga Listrik
            Milik <b>{nama}</b>, dilaksanakan mulai tanggal <b>{tanggal}</b>, terhadap Instalasi
            yang meliputi:
          </p>
          <ol style={{ paddingLeft: 20, marginBottom: 8 }}>
            {instalasiItems.map((item, i) => <li key={i}>{item}</li>)}
          </ol>
          <p>
            Dari Pemeriksaan dan Pengujian yang telah dilakukan dapat disimpulkan bahwa Instalasi
            Pemanfaatan Tenaga Listrik Tegangan Menengah dimaksud sudah memenuhi aspek{" "}
            <b>AMAN, ANDAL, dan AKRAB LINGKUNGAN</b>, sehingga dinyatakan <b>LAIK OPERASI</b>.
          </p>
        </>
      ),
    },
    {
      label: "Kata Pengantar",
      content: (
        <p>
          Pemeriksaan dan Pengujian Laik Operasi untuk Instalasi Pemanfaat Tegangan Menengah ini
          dilaksanakan <b>{instansiNama}</b> atas permintaan <b>{nama}</b> yang berlokasi di{" "}
          <b>{alamat}</b>. Melalui Aplikasi Si Ujang Gatrik, dan tetap berkoordinasi/komunikasi
          langsung melalui media untuk mendapatkan informasi/data, dan dokumen yang diperlukan
          untuk memenuhi kebutuhan pada setiap tahapan proses Pemeriksaan dan Pengujian Instalasi,
          dan dilaksanakan sesuai tahapan SOP yang telah diatur pada Si Ujang Gatrik, dan
          berpedoman pada standar dan peraturan yang berlaku di bidang Ketenagalistrikan. Dengan
          demikian <b>{instansiNama}</b> menugaskan PJT dan TT untuk melaksanakan Pemeriksaan
          dan Pengujian pada Instalasi tersebut.
        </p>
      ),
    },
    {
      label: "Pendahuluan",
      content: (
        <>
          <p style={{ marginBottom: 6 }}>
            Pelaksanaan Pemeriksaan dan Pengujian pada tanggal <b>{tanggal}</b> oleh Tenaga Teknik
            dan Penanggung Jawab Teknik dari <b>{instansiNama}</b>, dan melaksanakan seluruh
            kegiatan yang telah diatur pada PERMEN No. 12 Tahun 2021 – Lampiran VII – Butir AA
            yaitu mata uji sertifikasi IPTL Tegangan Menengah yang meliputi:
          </p>
          <ul style={{ paddingLeft: 20, marginBottom: 0 }}>
            <li>Pemeriksaan Dokumen</li>
            <li>Pemeriksaan Kesesuaian Desain</li>
            <li>Pemeriksaan Visual</li>
            <li>Evaluasi Hasil Uji Peralatan</li>
            <li>Pengujian Sistem</li>
          </ul>
          <p style={{ marginTop: 6 }}>
            Seluruh hasil kegiatan tersebut kemudian dituangkan dalam daftar isian kegiatan
            yang terdapat pada Aplikasi Si Ujang Gatrik.
          </p>
        </>
      ),
    },
    {
      label: "Riwayat Instalasi",
      content: (
        <p>
          Instalasi Distribusi Tenaga Listrik ini <b>{nama}</b> yang berlokasi di <b>{alamat}</b>.
        </p>
      ),
    },
    {
      label: "Pelaksanaan Sertifikasi Instalasi",
      content: (
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "10.5pt" }}>
          <tbody>
            {[
              ["Tanggal Pelaksanaan",            tanggal + " sampai selesai"],
              ["Pelaksana Tenaga Teknik (TT)",   ttNama],
              ["Penanggung Jawab Teknik (PJT)",  PJT_NAMA],
            ].map(([lbl, val]) => (
              <tr key={lbl}>
                <td style={{ padding: "3px 0", width: "50%", verticalAlign: "top" }}>{lbl}</td>
                <td style={{ padding: "3px 8px", verticalAlign: "top" }}>:</td>
                <td style={{ padding: "3px 0", fontWeight: "bold" }}>{val}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ),
    },
    {
      label: "Referensi",
      content: (
        <ul style={{ paddingLeft: 20, marginBottom: 0 }}>
          <li>Permen ESDM No. 12 Tahun 2021 tentang Klasifikasi, Kualifikasi, Akreditasi, dan Sertifikasi Usaha Jasa Penunjang Tenaga Listrik</li>
          <li>PUIL 2021 (Persyaratan Umum Instalasi Listrik)</li>
          <li>SPLN (Standar PLN yang Berlaku)</li>
          <li>Standar SNI yang Berlaku di Bidang Ketenagalistrikan</li>
        </ul>
      ),
    },
  ];

  // ── Spesifikasi ringkas (tampil DI BAWAH narasi) ─────────────────────────────
  // Diisi otomatis dari data form; yang belum ada field-nya → placeholder untuk diisi manual.
  const ISI_SATUAN = "diisi beserta satuannya";
  const panjangSpec = kmPanjang && krPanjang
    ? `${kmPanjang} ms + ${krPanjang} ms`
    : (kmPanjang || krPanjang)
      ? `${kmPanjang || krPanjang} ms`
      : ISI_SATUAN;

  // Penyedia: UID <provinsi> + UP3 <unit> otomatis dari kota/alamat (data Daftar UP3 PLN); ULP diisi manual
  const pln = detectUnitPln(data.kota, data.alamat, data.namaLokasi);
  const provinsi = pln.prov || detectProvinsi(data.kota, data.alamat, data.namaLokasi);
  const penyediaText = `PT. PLN (Persero) UID ${provinsi || "…"}, ${pln.up3 || "UP3 …"}, ULP …`;

  const specRows = [
    { label: "Jenis Instalasi",   value: "Tegangan Menengah" },
    { label: "Daya tersambung",   value: clean(data.daya) || ISI_SATUAN, hint: ISI_SATUAN },
    { label: "Perlengkapan hubung bagi tegangan menengah", value: `${phbTmCount} unit` },
    { label: "Perlengkapan hubung bagi tegangan rendah",   value: `${phbTrCount} unit` },
    { label: "Kapasitas trafo",   value: trafoKapasitas ? `${trafoKapasitas} kVA` : ISI_SATUAN, hint: ISI_SATUAN },
    { label: "Panjang saluran",   value: panjangSpec, hint: ISI_SATUAN },
    { label: "Penyedia tenaga listrik", value: penyediaText, hint: provinsi ? undefined : ISI_SATUAN },
  ];

  const sectionTextMap = {
    ...Object.fromEntries(specRows.map(r => [r.label, r.value])),
    "Ringkasan Eksekutif": [
      `Pelaksanaan Pemeriksaan dan Pengujian Laik Operasi Dilaksanakan berdasarkan Peraturan ` +
      `Menteri Energi Sumber Daya Mineral No. 12 Tahun 2021 tentang Klasifikasi, Kualifikasi, ` +
      `Akreditasi, dan Sertifikasi Usaha Jasa Penunjang Tenaga Listrik. Pemeriksaan dan ` +
      `Pengujian Instalasi Tenaga Listrik Tegangan Menengah dan Distribusi Tenaga Listrik ` +
      `Milik ${nama}, dilaksanakan mulai tanggal ${tanggal}, terhadap Instalasi yang meliputi:`,
      ...instalasiItems.map((it, idx) => `${idx + 1}. ${it}`),
      `Dari Pemeriksaan dan Pengujian yang telah dilakukan dapat disimpulkan bahwa Instalasi ` +
      `Pemanfaatan Tenaga Listrik Tegangan Menengah dimaksud sudah memenuhi aspek AMAN, ANDAL, ` +
      `dan AKRAB LINGKUNGAN, sehingga dinyatakan LAIK OPERASI.`,
    ].join("\n"),

    "Kata Pengantar":
      `Pemeriksaan dan Pengujian Laik Operasi untuk Instalasi Pemanfaat Tegangan Menengah ini ` +
      `dilaksanakan ${instansiNama} atas permintaan ${nama} yang berlokasi di ${alamat}. ` +
      `Melalui Aplikasi Si Ujang Gatrik, dan tetap berkoordinasi/komunikasi langsung melalui ` +
      `media untuk mendapatkan informasi/data, dan dokumen yang diperlukan untuk memenuhi ` +
      `kebutuhan pada setiap tahapan proses Pemeriksaan dan Pengujian Instalasi, dan dilaksanakan ` +
      `sesuai tahapan SOP yang telah diatur pada Si Ujang Gatrik, dan berpedoman pada standar ` +
      `dan peraturan yang berlaku di bidang Ketenagalistrikan. Dengan demikian ${instansiNama} ` +
      `menugaskan PJT dan TT untuk melaksanakan Pemeriksaan dan Pengujian pada Instalasi tersebut.`,

    "Pendahuluan": [
      `Pelaksanaan Pemeriksaan dan Pengujian pada tanggal ${tanggal} oleh Tenaga Teknik dan ` +
      `Penanggung Jawab Teknik dari ${instansiNama}, dan melaksanakan seluruh kegiatan yang ` +
      `telah diatur pada PERMEN No. 12 Tahun 2021 – Lampiran VII – Butir AA yaitu mata uji ` +
      `sertifikasi IPTL Tegangan Menengah yang meliputi:`,
      "- Pemeriksaan Dokumen",
      "- Pemeriksaan Kesesuaian Desain",
      "- Pemeriksaan Visual",
      "- Evaluasi Hasil Uji Peralatan",
      "- Pengujian Sistem",
      `Seluruh hasil kegiatan tersebut kemudian dituangkan dalam daftar isian kegiatan yang ` +
      `terdapat pada Aplikasi Si Ujang Gatrik.`,
    ].join("\n"),

    "Riwayat Instalasi":
      `Instalasi Distribusi Tenaga Listrik ini ${nama} yang berlokasi di ${alamat}.`,

    "Pelaksanaan Sertifikasi Instalasi": [
      `Tanggal Pelaksanaan      : ${tanggal} sampai selesai`,
      `Pelaksana Tenaga Teknik  : ${ttNama}`,
      `Penanggung Jawab Teknik  : ${PJT_NAMA}`,
    ].join("\n"),

    "Referensi": [
      "- Permen ESDM No. 12 Tahun 2021 tentang Klasifikasi, Kualifikasi, Akreditasi, dan Sertifikasi Usaha Jasa Penunjang Tenaga Listrik",
      "- PUIL 2021 (Persyaratan Umum Instalasi Listrik)",
      "- SPLN (Standar PLN yang Berlaku)",
      "- Standar SNI yang Berlaku di Bidang Ketenagalistrikan",
    ].join("\n"),
  };

  const handleCopySection = (label) => {
    const text = sectionTextMap[label] ?? "";
    navigator.clipboard.writeText(text).then(() => {
      setCopiedLabel(label);
      setTimeout(() => setCopiedLabel(null), 2000);
    });
  };

  return (
    <div className="laporan-section">
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10.5pt" }}>
        <thead>
          <tr style={{ background: "#fef3c7" }}>
            <td style={{ ...TH_L, width: "24%", padding: "6px 10px" }}>Butir Isian Mata Uji</td>
            <td style={{ ...TH_L, padding: "6px 10px" }}>Hasil Evaluasi</td>
          </tr>
        </thead>
        <tbody>
          {/* ── Narrative rows ── */}
          {rows.map(({ label, content }) => {
            const isCopied = copiedLabel === label;
            return (
              <tr key={label} style={{ pageBreakInside: "avoid" }}>
                <td style={CELL_LBL}>
                  <div>{label}</div>
                  <button
                    className="print:hidden"
                    onClick={() => handleCopySection(label)}
                    style={{
                      marginTop: 6,
                      padding: "2px 10px",
                      fontSize: "8.5pt",
                      fontFamily: "sans-serif",
                      background: isCopied ? "#059669" : "#e2e8f0",
                      color: isCopied ? "#fff" : "#334155",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer",
                      transition: "background 0.2s",
                    }}
                  >
                    {isCopied ? "✓ Tersalin" : "Salin"}
                  </button>
                </td>
                <td style={CELL_TOP}>{content}</td>
              </tr>
            );
          })}
          {/* ── Spesifikasi ringkas (di bawah narasi) ── */}
          {specRows.map(({ label, value, hint }) => {
            const isCopied = copiedLabel === label;
            return (
              <tr key={label} style={{ pageBreakInside: "avoid" }}>
                <td style={CELL_LBL}>
                  <div>{label}</div>
                  <button
                    className="print:hidden"
                    onClick={() => handleCopySection(label)}
                    style={{
                      marginTop: 6, padding: "2px 10px", fontSize: "8.5pt",
                      fontFamily: "sans-serif",
                      background: isCopied ? "#059669" : "#e2e8f0",
                      color: isCopied ? "#fff" : "#334155",
                      border: "none", borderRadius: 4, cursor: "pointer", transition: "background 0.2s",
                    }}
                  >
                    {isCopied ? "✓ Tersalin" : "Salin"}
                  </button>
                </td>
                <td style={{ ...CELL_TOP, textAlign: "left" }}>
                  {hint && (
                    <div style={{ fontSize: "9pt", fontStyle: "italic", color: "#78716c", marginBottom: 2 }}>
                      {hint}
                    </div>
                  )}
                  <div>{value}</div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── utility ──────────────────────────────────────────────────────────────────
function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}
