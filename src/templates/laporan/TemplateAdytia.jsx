import React, { useState } from "react";
import HeaderLogo from "./shared/HeaderLogo";
import IsolasiBlock from "./shared/IsolasiBlock";
import SignatureBlock from "./shared/SignatureBlock";
import { getField, getPhotos, formatDate } from "./shared/helpers";
import { formSchema } from "../../schema/formSchema";
import TemplateLaikOperasi from "../laikoperasi/TemplateLaikOperasi";
import { deriveLaikOperasiFromPengujian, mergeLaikOperasiData } from "../../utils/deriveLaikOperasi";
import { getKopStyle } from "./kopStyles";

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
  // For labeled photo arrays: filter by photo slot visibility
  const filterLabeledPhotos = (baseKey, idx, groupKey, labeledArr) => {
    const hidden = getInstSettings(baseKey, idx).hiddenPhotoSlots?.[groupKey] ?? [];
    return labeledArr.filter((_, i) => !hidden.includes(i));
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
        const incomingPhotos = filterLabeledPhotos("phb_tm", idx, "incoming", [
          { label: "Foto Nameplate PHB TM", url: gp(photos,"part1",`${instKey}.incoming`)[1] },
          { label: "Foto Full PHB TM",      url: gp(photos,"part1",`${instKey}.foto_full_phbtm`)[0] || gp(photos,"part1",`${instKey}.incoming`)[3] || gp(photos,"part1",`${instKey}.spesifikasi`)[0] },
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

      <LhppPage {...fp} code="A.2" title="SPESIFIKASI TEKNIK SALURAN TM"
        docs={<LabeledPhotoRow photos={[
          { label: "Foto Nameplate Kabel TM", url: gp(photos,"part1","phb_tm.kabel_incoming")[0] || gp(photos,"part1","phb_tm.kabel_sktm")[0] },
          { label: "Foto Jalur Kabel TM",     url: gp(photos,"part1","phb_tm.kabel_incoming")[1] || gp(photos,"part1","phb_tm.kabel_sktm")[1] },
        ]} />}
      >
        <NameplateTable rows={[
          ["Merk",        gf(form, "part1.phb_tm.kabel_incoming.merk")        || gf(form, "part1.phb_tm.kabel_sktm.merk")],
          ["Tipe / Jenis",gf(form, "part1.phb_tm.kabel_incoming.tipe")        || gf(form, "part1.phb_tm.kabel_sktm.tipe")],
          ["Ukuran",      gf(form, "part1.phb_tm.kabel_incoming.ukuran")      || gf(form, "part1.phb_tm.kabel_sktm.ukuran")],
          ["Panjang (m)", gf(form, "part1.phb_tm.kabel_incoming.panjang")     || gf(form, "part1.phb_tm.kabel_sktm.panjang")],
        ].filter(([, v]) => v && v !== "-")} />
      </LhppPage>

      {getInstKeys("trafo").map((instKey, idx) => {
        if (!isInstVisible("trafo", idx)) return null;
        const isMulti = (instanceCounts.trafo ?? 1) > 1;
        const npPhotos = gp(photos, "part1", `${instKey}.nameplate`);
        const nameplatePhotos = filterLabeledPhotos("trafo", idx, "nameplate", [
          { label: "Foto Nameplate Trafo", url: npPhotos[1] },
          { label: "Foto Full Trafo",      url: npPhotos[0] },
        ]);
        return (
          <LhppPage key={instKey} {...fp} code="A.3"
            title={isMulti ? `SPESIFIKASI TEKNIK TRAFO ${idx + 1}` : "SPESIFIKASI TEKNIK TRAFO"}
            docs={<LabeledPhotoRow photos={nameplatePhotos} />}
          >
            <NameplateTable rows={filterTableRows("trafo", idx, "nameplate", [
              ["Merk",                         gf(form, `part1.${instKey}.nameplate.merk`),            "merk"],
              ["Type / Vector Group",          gf(form, `part1.${instKey}.nameplate.typeVector`),       "typeVector"],
              ["No Seri",                      gf(form, `part1.${instKey}.nameplate.noSeri`),           "noSeri"],
              ["Kapasitas (kVA)",              gf(form, `part1.${instKey}.nameplate.kapasitas`),        "kapasitas"],
              ["Tahun Pembuatan",              gf(form, `part1.${instKey}.nameplate.tahun`),            "tahun"],
              ["Tegangan Primer/Sekunder (V)", gf(form, `part1.${instKey}.nameplate.teganganPS`),      "teganganPS"],
              ["Arus Primer/Sekunder (A)",     gf(form, `part1.${instKey}.nameplate.arusPS`),          "arusPS"],
              ["Impedensi (%)",                gf(form, `part1.${instKey}.nameplate.impedensi`),       "impedensi"],
              ["Sistem Pendingin",             gf(form, `part1.${instKey}.nameplate.sistemPendingin`), "sistemPendingin"],
              ["Berat (kg)",                   gf(form, `part1.${instKey}.nameplate.berat`),           "berat"],
            ])} />
          </LhppPage>
        );
      })}

      <LhppPage {...fp} code="A.4" title="SPESIFIKASI TEKNIK KABEL TR"
        docs={<LabeledPhotoRow photos={[
          { label: "Foto Nameplate Kabel TR", url: gp(photos,"part1","phb_tr.kabel_tr")[0] },
          { label: "Foto Jalur Kabel TR",     url: gp(photos,"part1","phb_tr.kabel_tr")[1] },
        ]} />}
      >
        <NameplateTable rows={[
          ["Merk",        gf(form, "part1.phb_tr.kabel_tr.merk")],
          ["Tipe / Jenis",gf(form, "part1.phb_tr.kabel_tr.tipe")],
          ["Ukuran",      gf(form, "part1.phb_tr.kabel_tr.ukuran")],
          ["Panjang (m)", gf(form, "part1.phb_tr.kabel_tr.panjang")],
        ]} />
      </LhppPage>

      {getInstKeys("phb_tr").map((instKey, idx) => {
        if (!isInstVisible("phb_tr", idx)) return null;
        const isMulti = (instanceCounts.phb_tr ?? 1) > 1;
        const specKey = instKey === "phb_tr" ? "phb_tr_spec" : `phb_tr_spec${instKey.slice("phb_tr".length)}`;
        const phbTrPhotos = filterLabeledPhotos("phb_tr", idx, "phb_tr_full", [
          { label: "Foto Full PHB TR",   url: gp(photos,"part1",`${instKey}.phb_tr_full`)[0] },
          { label: "Foto ACB Utama",     url: gp(photos,"part1",`${instKey}.acb_utama`)[0] },
          { label: "Foto Nameplate ACB", url: gp(photos,"part1",`${instKey}.nameplate_acb`)[0] },
        ]);
        return (
          <LhppPage key={instKey} {...fp} code="A.5"
            title={isMulti ? `SPESIFIKASI TEKNIK PHB TR ${idx + 1}` : "SPESIFIKASI TEKNIK PHB TR"}
            docs={<LabeledPhotoRow photos={phbTrPhotos} />}
          >
            <PhbTrSpekA5
              specRows={form.part1?.[specKey]?.rows ?? []}
              konstruksi={form.part1?.[instKey]?.konstruksi ?? {}}
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
        <AllEquipmentPhotos photos={photos} />
      </LhppPage>

      <LhppPage {...fp} code="B.2" title="SISTEM PEMBUMIAN"
        docs={<DerivedGroundingPhotos photos={photos} />}
      >
        <DerivedPembumianTable form={form} />
      </LhppPage>

      <LhppPage {...fp} code="B.3" title="PENGAMAN ELEKTRIK">
        <PengamanElektrikNarasi form={form} photos={photos} />
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
        <ClearanceTable label="PHB TM" data={form.part1?.phb_tm?.jarak ?? {}} eqKey="phb_tm" photos={photos} />
        <ClearanceTable label="Trafo"  data={form.part1?.trafo?.jarak  ?? {}} eqKey="trafo"  photos={photos} />
        <ClearanceTable label="PHB TR" data={form.part1?.phb_tr?.jarak ?? {}} eqKey="phb_tr" photos={photos} />
      </LhppPage>

      <LhppPage {...fp} code="B.6" title="GAMBAR DIAGRAM SATU GARIS (SINGLE LINE DIAGRAM)">
        <FullPhoto photos={gp(photos,"part1","gambar.diagram")} label="Diagram Satu Garis" />
      </LhppPage>

      <LhppPage {...fp} code="B.7" title="GAMBAR TATA LETAK PERALATAN UTAMA">
        <FullPhoto photos={gp(photos,"part1","gambar.tata_letak")} label="Tata Letak Peralatan" />
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
        <DerivedPembumianTable form={form} />
        <GroundingMeasurementTable form={form} photos={photos} />
      </LhppPage>

      <LhppPage {...fp} code="C.3" title="EVALUASI HASIL UJI PERALATAN">
        <DerivedEvaluasiTable form={form} photos={photos} />
      </LhppPage>

      <LhppPage {...fp} code="C.4" title="PENGUJIAN SISTEM — FOTO PELAKSANAAN UJI">
        <PengujianSistemBlock form={form} photos={photos} />
      </LhppPage>

      {/* ── C.5 Pemberian Tegangan ── */}
      <LhppPage {...fp} code="C.5" title="PEMBERIAN TEGANGAN">
        <PemberianTeganganTable form={form} />
      </LhppPage>
      <LhppPage {...fp} code="C.5" title="DOKUMENTASI FOTO — PEMBERIAN TEGANGAN">
        <LabeledPhotoRow photos={[
          ...["RN","SN","TN","RS","ST","RT"].map(k => ({
            label: `Tegangan ${k.replace(/([A-Z])/g,"-$1").replace(/^-/,"")}`,
            url: gp(photos,"part1",`phb_tr.tegangan.${k}`)[1] || gp(photos,"part1",`phb_tr.tegangan.${k}`)[0],
          })),
          ...["R","S","T","N"].map(k => ({
            label: `Beban Fasa ${k}`,
            url: gp(photos,"part1",`phb_tr.beban.${k}`)[1] || gp(photos,"part1",`phb_tr.beban.${k}`)[0],
          })),
        ]} />
      </LhppPage>

      {/* ── C.6 Pengujian Beban ── */}
      <LhppPage {...fp} code="C.6" title="PENGUJIAN BEBAN"
        docs={<LabeledPhotoRow photos={[
          { label: "Suhu Terminal Trafo",  url: gp(photos,"part1","phb_tr.suhu_sambungan.trafo")[1]    || gp(photos,"part1","phb_tr.suhu_sambungan.trafo")[0] },
          { label: "Suhu Terminal PHB TM", url: gp(photos,"part1","phb_tr.suhu_sambungan.phb_tm")[1]   || gp(photos,"part1","phb_tr.suhu_sambungan.phb_tm")[0] },
          { label: "Suhu Terminal PHB TR", url: gp(photos,"part1","phb_tr.suhu_sambungan.phb_tr_term")[1] || gp(photos,"part1","phb_tr.suhu_sambungan.phb_tr_term")[0] },
          { label: "Foto Beban Fasa R",    url: gp(photos,"part1","phb_tr.beban.R")[1]                 || gp(photos,"part1","phb_tr.beban.R")[0] },
        ]} />}
      >
        <PengujianBebanTable form={form} />
      </LhppPage>

      {/* ── C.7 Pengujian Fungsi PHB TM ── */}
      <LhppPage {...fp} code="C.7" title="PENGUJIAN FUNGSI PHB TM"
        docs={<LabeledPhotoRow photos={[
          isGroupVisible("phb_tm", 0, "putaran_fasa") && { label: "Putaran Fasa", url: gp(photos,"part1","phb_tm.putaran_fasa.0")[1] || gp(photos,"part1","phb_tm.putaran_fasa.0")[0] || gp(photos,"part1","phb_tm.putaran_fasa_tm")[0] },
        ].filter(Boolean)} />}
      >
        <PengujianFungsiTmTable form={form} />
      </LhppPage>

      {/* ── C.8 Pengujian Fungsi PHB TR ── */}
      <LhppPage {...fp} code="C.8" title="PENGUJIAN FUNGSI PHB TR"
        docs={<LabeledPhotoRow photos={[
          isGroupVisible("phb_tr", 0, "acb_utama")      && { label: "Foto ACB",           url: gp(photos,"part1","phb_tr.acb_utama")[0] },
          isGroupVisible("phb_tr", 0, "nameplate_acb")  && { label: "Foto Nameplate ACB", url: gp(photos,"part1","phb_tr.nameplate_acb")[0] },
          isGroupVisible("phb_tr", 0, "putaran_fasa")   && { label: "Putaran Fasa",       url: gp(photos,"part1","phb_tr.putaran_fasa")[1] || gp(photos,"part1","phb_tr.putaran_fasa")[0] },
        ].filter(Boolean)} />}
      >
        <PengujianFungsiTrTable form={form} />
      </LhppPage>

      <LhppPage {...fp} code="D" title="DATA HASIL UJI">
        <DataHasilUjiBlock form={form} />
      </LhppPage>

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
  if (sectionCode && sectionCode !== code) return null;
  const Frame = getKopStyle(instansi?.kopStyle);
  return (
    <div className="laporan-form" style={FORM_STYLE} data-section={code}>
      <Frame
        instansi={instansi}
        data={data}
        ttd={ttd}
        ttd_client={ttd_client}
        code={code}
        title={title}
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

const KONSTRUKSI_ROWS = [
  { label: "Rating tegangan operasi (Ue)",           key: "ue" },
  { label: "Rating tegangan isolasi (Ui)",            key: "ui" },
  { label: "Tegangan lebih Sampai (Uimp)",            key: "uimp" },
  { label: "Frekuensi",                              key: "frekuensi" },
  { label: "Tipe busbar",                            key: "tipe_busbar" },
  { label: "Rating arus busbardistribusi utama (In)", key: "rating_arus_busbar" },
  { label: "Rating short time withstand current",     key: "short_time_withstand" },
  { label: "Distribution feeders",                   key: "distribution_feeders" },
  { label: "Prospective short circuit current",       key: "prospective_sc" },
  { label: "Perlindungan terhadap kontak listrik",    key: "perlindungan_kontak" },
  { label: "Ketahanan terhadap geteran",              key: "ketahanan_geteran" },
  { label: "Tingkat proteksi eksternal",              key: "tingkat_proteksi" },
  { label: "Ketebalan rangka",                        key: "ketebalan_rangka" },
];

function PhbTrSpekA5({ specRows = [], konstruksi = {} }) {
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

          {/* Section header: Data Konstruksi */}
          <tr>
            <td colSpan={3} style={{ ...secHdr }}>Data Konstruksi :</td>
          </tr>
          <tr>
            <td style={thBase}>NO</td>
            <td style={{ ...thBase, textAlign: "left" }}>URAIAN</td>
            <td style={thBase}>BESARAN AKTUAL</td>
          </tr>
          {KONSTRUKSI_ROWS.map((r, i) => (
            <tr key={r.key}>
              <td style={tdNo}>{i + 1}.</td>
              <td style={tdUr}>{r.label}</td>
              <td style={tdKet}>{konstruksi[r.key] || "—"}</td>
            </tr>
          ))}
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
function ClearanceTable({ label, data = {}, eqKey, photos }) {
  const fields = [
    { dir: "Depan",    name: "depan",    val: data.depan },
    { dir: "Kiri",     name: "kiri",     val: data.kiri },
    { dir: "Kanan",    name: "kanan",    val: data.kanan },
    { dir: "Belakang", name: "belakang", val: data.belakang },
  ];
  const hasPhotos = eqKey && photos && fields.some(f => {
    const arr = gp(photos, "part1", `${eqKey}.jarak.${f.name}`);
    return arr[0] || arr[1];
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

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10, fontSize: "10pt", tableLayout: "fixed" }}>
      <colgroup>
        <col style={{ width: "18%" }} />
        <col style={{ width: "12%" }} />
        {hasPhotos && <><col style={{ width: "35%" }} /><col style={{ width: "35%" }} /></>}
      </colgroup>
      <thead>
        <tr style={{ background: "#fef3c7" }}>
          <td colSpan={hasPhotos ? 4 : 2} style={{ ...TH_L, padding: "3px 8px" }}>Jarak Bebas {label} (cm)</td>
        </tr>
        {hasPhotos && (
          <tr style={{ background: "#fef3c7" }}>
            <td style={{ ...TH_L, padding: "3px 6px" }}>Arah</td>
            <td style={{ ...TH_C, padding: "3px 6px" }}>Nilai (cm)</td>
            <td style={{ ...TH_C, padding: "3px 6px" }}>Foto Jauh</td>
            <td style={{ ...TH_C, padding: "3px 6px" }}>Foto Hasil Pengukuran</td>
          </tr>
        )}
      </thead>
      <tbody>
        {fields.map(({ dir, name, val }) => {
          const arr = hasPhotos ? gp(photos, "part1", `${eqKey}.jarak.${name}`) : [];
          return (
            <tr key={dir} style={{ height: hasPhotos ? PHOTO_H + 6 : "auto" }}>
              <td style={{ ...TD_L, padding: "3px 6px", verticalAlign: "middle" }}>{dir}</td>
              <td style={{ ...TD_C, padding: "3px 6px", verticalAlign: "middle" }}>{val || "-"}</td>
              {hasPhotos && (
                <>
                  <td style={TD_FIX}><PhotoBox src={arr[0]} alt={`Jarak jauh ${dir} ${label}`} /></td>
                  <td style={TD_FIX}><PhotoBox src={arr[1]} alt={`Jarak ukur ${dir} ${label}`} /></td>
                </>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ─── GroundingMeasurementTable ────────────────────────────────────────────────
function GroundingMeasurementTable({ form, photos }) {
  const entries = [
    { label: "Grounding PHB TM",      nilai: gf(form,"part1.phb_tm.grounding_phbtm.nilai"),          photoKey: "phb_tm.grounding_phbtm",     photoIdx: 0 },
    { label: "Grounding Arester TM",  nilai: gf(form,"part1.phb_tm.grounding_arester.nilai"),         photoKey: "phb_tm.grounding_arester",    photoIdx: 0 },
    { label: "Grounding Netral Trafo",nilai: gf(form,"part1.trafo.grounding_pengukuran.nilaiNetral"), photoKey: "trafo.grounding_pengukuran",  photoIdx: 0 },
    { label: "Grounding Body Trafo",  nilai: gf(form,"part1.trafo.grounding_pengukuran.nilaiBody"),   photoKey: "trafo.grounding_pengukuran",  photoIdx: 1 },
    { label: "Grounding PHB TR",      nilai: gf(form,"part1.phb_tr.grounding_phbtr.nilai"),           photoKey: "phb_tr.grounding_phbtr",      photoIdx: 0 },
  ];
  return (
    <>
      <SectionHeading>Hasil Pengukuran Grounding</SectionHeading>
      <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:12, fontSize:"11pt" }}>
        <thead>
          <tr style={{ background:"#fef3c7" }}>
            <td style={{ ...TH_C, width:"6%" }}>No</td>
            <td style={TH_L}>Titik Grounding</td>
            <td style={{ ...TH_C, width:"20%" }}>Nilai (Ω)</td>
            <td style={{ ...TH_C, width:"25%" }}>Foto Pengukuran</td>
          </tr>
        </thead>
        <tbody>
          {entries.map(({ label, nilai, photoKey, photoIdx }, i) => {
            const pic = gp(photos,"part1", photoKey)[photoIdx];
            return (
              <tr key={i}>
                <td style={TD_C}>{i+1}</td>
                <td style={TD_L}>{label}</td>
                <td style={{ ...TD_C, fontWeight:"bold" }}>{nilai || "-"}</td>
                <td style={TD_PHOTO}>
                  {pic
                    ? <img src={pic} alt={label} style={{ maxHeight:80, maxWidth:120, objectFit:"contain" }} />
                    : <span style={{ color:"#999", fontSize:"9pt", fontStyle:"italic" }}>(tidak ada foto)</span>
                  }
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

// ─── PengujianSistemBlock ─────────────────────────────────────────────────────
function PengujianSistemBlock({ form, photos }) {
  const teg = form.part1?.phb_tr?.tegangan ?? {};
  const beb = form.part1?.phb_tr?.beban ?? {};

  const tegRows = [["R-S",teg.RS],["S-T",teg.ST],["R-T",teg.RT],["R-N",teg.RN],["S-N",teg.SN],["T-N",teg.TN]];
  const bebRows = [["Phasa R",beb.R],["Phasa S",beb.S],["Phasa T",beb.T],["Netral N",beb.N]];

  const tegPhotos  = ["RS","ST","RT","RN","SN","TN"].flatMap(k => gp(photos,"part1",`phb_tr.tegangan.${k}`));
  const bebPhotos  = ["R","S","T","N"].flatMap(k => gp(photos,"part1",`phb_tr.beban.${k}`));

  return (
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

      <SectionHeading>Hasil Pengukuran Beban</SectionHeading>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
        {bebRows.map(([label,val]) => (
          <div key={label} style={{ display:"flex", gap:8 }}>
            <span style={{ width:70 }}>{label}</span>
            <span>: <b>{val || "-"}</b> Ampere</span>
          </div>
        ))}
      </div>

      <SectionHeading>Foto Pemeriksaan</SectionHeading>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        <div>
          <p style={{ fontWeight:"bold", fontSize:"10pt", marginBottom:4 }}>Pengukuran Beban</p>
          {bebPhotos.slice(0,2).map((url,i) => (
            <img key={i} src={url} alt="beban" style={{ maxWidth:"100%", maxHeight:130, objectFit:"contain", marginBottom:4, border:"1px solid #ddd" }} />
          ))}
        </div>
        <div>
          <p style={{ fontWeight:"bold", fontSize:"10pt", marginBottom:4 }}>Pengukuran Tegangan</p>
          {tegPhotos.slice(0,2).map((url,i) => (
            <img key={i} src={url} alt="tegangan" style={{ maxWidth:"100%", maxHeight:130, objectFit:"contain", marginBottom:4, border:"1px solid #ddd" }} />
          ))}
        </div>
      </div>
    </>
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
function AllEquipmentPhotos({ photos }) {
  const items = [
    { label:"PHB TM",     urls: (gp(photos,"part1","phb_tm.foto_full_phbtm").slice(0,1).filter(Boolean).length ? gp(photos,"part1","phb_tm.foto_full_phbtm").slice(0,1) : gp(photos,"part1","phb_tm.incoming").slice(3,4).filter(Boolean).length ? gp(photos,"part1","phb_tm.incoming").slice(3,4) : gp(photos,"part1","phb_tm.spesifikasi").slice(0,1)) },
    { label:"Saluran TM", urls: (gp(photos,"part1","phb_tm.kabel_incoming").slice(0,1).filter(Boolean).length ? gp(photos,"part1","phb_tm.kabel_incoming").slice(0,1) : gp(photos,"part1","phb_tm.kabel_sktm").slice(0,1)) },
    { label:"Trafo",      urls: gp(photos,"part1","trafo.nameplate").slice(0,1) },
    { label:"Kabel TR",   urls: gp(photos,"part1","phb_tr.kabel_tr").slice(0,1) },
    { label:"PHB TR",     urls: gp(photos,"part1","phb_tr.phb_tr_full").slice(0,1) },
    { label:"Sertifikat", urls: gp(photos,"part1","lain_lain.sertifikat").slice(0,1) },
  ];
  return <LabeledPhotoGrid photos={items} />;
}

// ─── DerivedGroundingPhotos (B.2) ────────────────────────────────────────────
function DerivedGroundingPhotos({ photos }) {
  const items = [
    { label:"Grounding PHB TM",     urls: gp(photos,"part1","phb_tm.grounding_cubicle").slice(0,1) },
    { label:"Grounding Body Trafo", urls: gp(photos,"part1","trafo.grounding_body").slice(0,1) },
    { label:"Grounding PHB TR",     urls: gp(photos,"part1","phb_tr.grounding_cubicle").slice(0,1) },
  ];
  return <LabeledPhotoGrid photos={items} />;
}

// ─── DerivedPembumianTable (B.2, C.2) ────────────────────────────────────────
function DerivedPembumianTable({ form }) {
  const f1 = form.part1 ?? {};
  const rows = [
    {
      nama: "Grounding PHB TM",
      tipe: f1.phb_tm?.grounding_cubicle?.tipe || "-",
      ukuran: f1.phb_tm?.grounding_cubicle?.ukuran || "-",
      nilai: f1.phb_tm?.grounding_phbtm?.nilai || "-",
    },
    {
      nama: "Grounding Body Trafo",
      tipe: f1.trafo?.grounding_body?.tipe || "-",
      ukuran: f1.trafo?.grounding_body?.ukuran || "-",
      nilai: f1.trafo?.grounding_pengukuran?.nilaiBody || "-",
    },
    {
      nama: "Grounding PHB TR",
      tipe: f1.phb_tr?.grounding_cubicle?.tipe || "-",
      ukuran: f1.phb_tr?.grounding_cubicle?.ukuran || "-",
      nilai: f1.phb_tr?.grounding_phbtr?.nilai || "-",
    },
  ];
  return (
    <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:12, fontSize:"10pt" }}>
      <thead>
        <tr style={{ background:"#fef3c7" }}>
          <td style={{ ...TH_C, padding:"4px 6px" }}>No</td>
          <td style={{ ...TH_L, padding:"4px 6px" }}>Nama Grounding</td>
          <td style={{ ...TH_C, padding:"4px 6px" }}>Tipe (Al/Cu)</td>
          <td style={{ ...TH_C, padding:"4px 6px" }}>Ukuran (mm²)</td>
          <td style={{ ...TH_C, padding:"4px 6px" }}>Nilai (Ω)</td>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            <td style={{ ...TD_C, padding:"4px 6px" }}>{i+1}</td>
            <td style={{ ...TD_L, padding:"4px 6px" }}>{row.nama}</td>
            <td style={{ ...TD_C, padding:"4px 6px" }}>{row.tipe}</td>
            <td style={{ ...TD_C, padding:"4px 6px" }}>{row.ukuran}</td>
            <td style={{ ...TD_C, padding:"4px 6px", fontWeight:"bold" }}>{row.nilai}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── PemberianTeganganTable (C.5) — Image #12 format ─────────────────────────
function PemberianTeganganTable({ form }) {
  const teg = form.part1?.phb_tr?.tegangan ?? {};
  const beb = form.part1?.phb_tr?.beban ?? {};
  const BD  = "1px solid #000";
  const th  = { border: BD, padding: "3px 8px", fontWeight: "bold", fontSize: "10pt", background: "#d9d9d9", textAlign: "center", verticalAlign: "middle" };
  const td  = { border: BD, padding: "4px 8px", fontSize: "10pt", textAlign: "center", verticalAlign: "middle" };
  const secHdr = { border: BD, padding: "4px 8px", fontWeight: "bold", fontSize: "10pt", background: "#404040", color: "#fff", textAlign: "center" };

  const tegRows = [
    { label: "R – N", acuan: "220 – 240 Volt", val: teg.RN },
    { label: "S – N", acuan: "220 – 240 Volt", val: teg.SN },
    { label: "T – N", acuan: "220 – 240 Volt", val: teg.TN },
    { label: "R – S", acuan: "380 – 400 Volt", val: teg.RS },
    { label: "S – T", acuan: "380 – 400 Volt", val: teg.ST },
    { label: "T – R", acuan: "380 – 400 Volt", val: teg.RT },
    { label: "Frekuensi", acuan: "50 Hz", val: teg.frekuensi, unit: " Hz" },
  ];
  const bebRows = [
    { label: "R", val: beb.R },
    { label: "S", val: beb.S },
    { label: "T", val: beb.T },
  ];

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
          <tr><td colSpan={4} style={secHdr}>Pemeriksaan Beban</td></tr>
          {bebRows.map((r, i) => (
            <tr key={i}>
              <td style={{ ...td, textAlign: "left" }}>{r.label}</td>
              <td style={td}>—</td>
              <td style={td}>{r.val ? `${r.val} A` : "—"}</td>
              <td style={{ ...td, textAlign: "left" }}>sesuai standart Operasi</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

// ─── PengujianBebanTable (C.6) — Image #13 format ────────────────────────────
function PengujianBebanTable({ form }) {
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
            { no: 4, label: "Phasa R", val: beb.R },
            { no: 5, label: "Phasa S", val: beb.S },
            { no: 6, label: "Phasa T", val: beb.T },
          ].map(r => (
            <tr key={r.no}>
              <td style={td}>{r.no}</td>
              <td style={{ ...td, textAlign: "left" }}>{r.label}</td>
              <td style={td}>—</td>
              <td style={td}>{r.val ? `${r.val} A` : "—"}</td>
              <td style={td}>Normal</td>
            </tr>
          ))}
          {/* Suhu Titik Sambungan */}
          <tr><td colSpan={5} style={subHdr}>Uraian Parameter Suhu titik sambungan pada saat berbeban</td></tr>
          {[
            { no: 8,  label: "Titik Sambungan Terminal Trafo", val: suhu.trafo },
            { no: 9,  label: "Terminal PHB TM",                val: suhu.phb_tm },
            { no: 10, label: "Terminal PHB TR",                val: suhu.phb_tr_term },
          ].map(r => (
            <tr key={r.no}>
              <td style={td}>{r.no}</td>
              <td style={{ ...td, textAlign: "left" }}>{r.label}</td>
              <td style={td}>≤ 60°C</td>
              <td style={td}>{r.val ? `${r.val}°C` : "—"}</td>
              <td style={td}>Normal</td>
            </tr>
          ))}
        </tbody>
      </table>
      {beb.persentase && (
        <p style={{ fontSize: "10pt", marginTop: 4 }}>
          Persentase Pembebanan : <strong>{beb.persentase}%</strong>
        </p>
      )}
    </>
  );
}

// ─── PengujianFungsiTmTable (C.7) ────────────────────────────────────────────
function PengujianFungsiTmTable({ form }) {
  const f1  = form.part1 ?? {};
  const rel = f1.phb_tm?.relay_proteksi ?? {};
  const inc = f1.phb_tm?.incoming ?? {};
  const BD  = "1px solid #000";
  const th  = { border: BD, padding: "3px 6px", fontWeight: "bold", fontSize: "10pt", background: "#d9d9d9", textAlign: "center", verticalAlign: "middle" };
  const td  = { border: BD, padding: "3px 6px", fontSize: "10pt", verticalAlign: "top" };
  const tdc = { ...td, textAlign: "center" };
  const thn = { border: BD, padding: "2px 4px", fontWeight: "bold", fontSize: "9pt", background: "#f2f2f2", textAlign: "center" };
  const tdn = { border: BD, padding: "2px 4px", fontSize: "9pt", textAlign: "center" };

  const tipeCubicle = inc.tipe || rel.tipe || "—";

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10pt", marginBottom: 12 }}>
      <thead>
        <tr>
          <td style={{ ...th, width: "5%" }}>No</td>
          <td style={{ ...th, width: "28%" }}>Butir Isian Mata Uji</td>
          <td style={{ ...th, width: "18%" }}>Hasil Evaluasi</td>
          <td style={th}>Keterangan</td>
        </tr>
      </thead>
      <tbody>
        {/* Row 1: Catu Daya */}
        <tr>
          <td style={tdc}>1</td>
          <td style={td}>Pengujian Fungsi Catu Daya</td>
          <td style={tdc}>ada</td>
          <td style={td}>
            Jika dalam keadaan listrik padam relay tetap berfungsi yang di backup oleh CATU DAYA,
            Dan Tetap Bisa Melakukan Open Close VCB
          </td>
        </tr>
        {/* Row 2: Interlock */}
        <tr>
          <td style={tdc}>2</td>
          <td style={td}>Silih kunci (Interlock)</td>
          <td style={tdc}>(ada) dan dilakukan</td>
          <td style={td}>
            Sistem interlock pengaman untuk mencegah kemungkinan kesalahan atau kelalaian operasi
            dari peralatan dan untuk menjamin keselamatan operator. Ditandai dengan pintu kubikel
            tidak dapat dibuka jika sakelar utama (sakelar tegangan menengah) dalam keadaan
            tertutup, dan sebaliknya pintu kubikel tidak dapat ditutup jika sakelar pembumian
            dalam keadaan on.
          </td>
        </tr>
        {/* Row 3: Proteksi & Kontrol */}
        <tr>
          <td style={tdc}>3</td>
          <td style={td}>Proteksi dan kontrol</td>
          <td style={tdc}>Sesuai Namplate</td>
          <td style={{ ...td, padding: 0 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <tr>
                  <td colSpan={4} style={{ ...thn, background: "#fef3c7" }}>{tipeCubicle}</td>
                </tr>
                <tr>
                  <td style={thn}>Ur (kV)</td>
                  <td style={thn}>Ik (kA)</td>
                  <td style={thn}>Ir ( A )</td>
                  <td style={thn}>Tk (s)</td>
                </tr>
                <tr>
                  <td style={tdn}>{rel.ur || "—"}</td>
                  <td style={tdn}>{rel.ik || "—"}</td>
                  <td style={tdn}>{rel.ir || inc.ratingI || "—"}</td>
                  <td style={tdn}>{rel.tk || "—"}</td>
                </tr>
                <tr>
                  <td colSpan={4} style={{ ...tdn, textAlign: "left", padding: "2px 4px" }}>
                    sesuai namplate : {rel.settingOCR || ""}
                  </td>
                </tr>
                <tr>
                  <td colSpan={4} style={{ ...tdn, textAlign: "left", padding: "2px 4px" }}>
                    sesuai setting : {rel.settingDGR || ""}
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
        {/* Row 4: Urutan Fasa */}
        <tr>
          <td style={tdc}>4</td>
          <td style={td}>Pengujian urutan fasa</td>
          <td style={tdc}>dilakukan</td>
          <td style={{ ...td, padding: 0 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {["L1","L2","L3"].map(l => (
                  <tr key={l}>
                    <td style={{ ...tdn, width: "30%", textAlign: "left", padding: "2px 6px" }}>{l}</td>
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
function PengamanElektrikNarasi({ form, photos }) {
  const f1 = form.part1 ?? {};

  // PHB TM — maks 2: incoming CB + relay proteksi
  const tmItems = [];
  const cbTm = f1.phb_tm?.incoming;
  if (cbTm?.jenisPemutus || cbTm?.tipe || cbTm?.merk) {
    const jenis  = cbTm.jenisPemutus || cbTm.tipe || "CB";
    const merk   = cbTm.merk    ? ` ${cbTm.merk}`          : "";
    const rating = cbTm.ratingI ? ` In ${cbTm.ratingI} A`  : "";
    tmItems.push({ label: `${jenis}${merk}${rating}`, photoKey: "phb_tm.incoming" });
  }
  const relay = f1.phb_tm?.relay_proteksi;
  if (relay?.merk || relay?.tipe) {
    tmItems.push({ label: `Relay Proteksi ${[relay.merk, relay.tipe].filter(Boolean).join(" ")}`, photoKey: "phb_tm.relay_proteksi" });
  }

  // PHB TR — maks 2: ACB utama + CB cabang
  const trItems = [];
  const acb = f1.phb_tr?.acb_utama;
  if (acb?.merk || acb?.tipe) {
    const merkTipe = [acb.merk, acb.tipe].filter(Boolean).join(" ");
    const rating   = acb.ratingI ? ` In ${acb.ratingI} A` : "";
    trItems.push({ label: `ACB ${merkTipe}${rating}`, photoKey: "phb_tr.acb_utama" });
  }
  const cbCabang = f1.phb_tr?.cb_cabang;
  if (cbCabang?.ratingI) {
    trItems.push({ label: `CB Cabang In ${cbCabang.ratingI} A`, photoKey: "phb_tr.cb_cabang" });
  }

  // Trafo — DGPT saja
  const trafoItems = [{ label: "DGPT2 (proteksi termal & tekanan)", photoKey: "trafo.dgpt" }];

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
function DerivedEvaluasiTable({ form, photos }) {
  const f1 = form.part1 ?? {};
  const ada = (val) => (val && String(val).trim() ? "Baik" : "-");
  const items = [
    {
      label: "Name Plate",
      hasil: ada(f1.trafo?.nameplate?.merk),
      ket: f1.trafo?.nameplate?.merk ? `Trafo: ${f1.trafo.nameplate.merk}` : "-",
      photoKey: "trafo.nameplate",
    },
    {
      label: "Busbar",
      hasil: ada(f1.phb_tm?.suhu_incoming?.R),
      ket: f1.phb_tm?.suhu_incoming?.R ? `Suhu R: ${f1.phb_tm.suhu_incoming.R}°C` : "-",
      photoKey: "phb_tm.suhu_incoming.R",
    },
    {
      label: "Arrester / LA",
      hasil: ada(f1.phb_tm?.la1?.tipe),
      ket: f1.phb_tm?.la1?.tipe || "-",
      photoKey: "phb_tm.la1",
    },
    {
      label: "LBS",
      hasil: ada(f1.phb_tm?.lbs1?.merk),
      ket: `${f1.phb_tm?.lbs1?.merk || ""} ${f1.phb_tm?.lbs1?.tipe || ""}`.trim() || "-",
      photoKey: "phb_tm.lbs1",
    },
    {
      label: "Fuse Cut Out",
      hasil: ada(f1.phb_tm?.fuse?.rating),
      ket: f1.phb_tm?.fuse?.rating || "-",
      photoKey: "phb_tm.fuse",
    },
    {
      label: "PT (Potential Transformer)",
      hasil: ada(f1.phb_tm?.pt_incoming?.ratingPT),
      ket: f1.phb_tm?.pt_incoming?.ratingPT || "-",
      photoKey: "phb_tm.pt_incoming",
    },
    {
      label: "Pengukur Suhu Oil (DGPT)",
      hasil: ada(gp(photos,"part1","trafo.dgpt")[0]),
      ket: "-",
      photoKey: "trafo.dgpt",
    },
    {
      label: "Grounding",
      hasil: ada(f1.phb_tm?.grounding_cubicle?.tipe),
      ket: f1.phb_tm?.grounding_cubicle?.tipe ? `Tipe: ${f1.phb_tm.grounding_cubicle.tipe}` : "-",
      photoKey: "phb_tm.grounding_cubicle",
    },
    {
      label: "Kran Minyak",
      hasil: ada(gp(photos,"part1","trafo.kran_atas")[0]),
      ket: "-",
      photoKey: "trafo.kran_atas",
    },
  ];
  return (
    <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:12, fontSize:"10pt" }}>
      <thead>
        <tr style={{ background:"#fef3c7" }}>
          <td style={{ ...TH_C, padding:"4px 6px", width:"5%" }}>No</td>
          <td style={{ ...TH_L, padding:"4px 6px" }}>Komponen</td>
          <td style={{ ...TH_C, padding:"4px 6px", width:"16%" }}>Kondisi</td>
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

// ─── PhotoCell — sel foto tunggal dengan header label ────────────────────────
function PhotoCell({ label, url, no, width = "auto" }) {
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
      <div style={{ padding: 4, background: "#f8fafc", minHeight: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {url
          ? <img src={url} alt={label} style={{ maxWidth: "100%", maxHeight: 160, objectFit: "contain", display: "block" }} />
          : <span style={{ color: "#bbb", fontSize: "8pt", fontStyle: "italic" }}>tidak ada foto</span>
        }
      </div>
    </td>
  );
}

// ─── LabeledPhotoGrid — 2 kolom grid dengan header label ─────────────────────
function LabeledPhotoGrid({ photos = [] }) {
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
                <PhotoCell key={ci} label={label} url={urls?.[0]} no={++seq} width="50%" />
              ))}
              {pair.length === 1 && <td style={{ border: B, background: "#f8fafc", width: "50%" }} />}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

// ─── LabeledPhotoRow — baris horizontal foto (max 3 per baris) ───────────────
function LabeledPhotoRow({ photos = [] }) {
  const valid = photos.filter(p => p && (p.url || p.label));
  if (!valid.length) return null;
  // Pecah ke baris maks 3 foto
  return (
    <>
      <DocsHeading>Dokumentasi :</DocsHeading>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8, tableLayout: "fixed" }}>
        <tbody>
          {chunk(valid, 3).map((row, ri) => (
            <tr key={ri}>
              {row.map(({ label, url }, ci) => (
                <PhotoCell key={ci} label={label} url={url} no={ri * 3 + ci + 1} width={`${100 / Math.min(valid.length, 3)}%`} />
              ))}
              {row.length < 3 && Array.from({ length: 3 - row.length }).map((_, xi) => (
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
              <PhotoCell key={ci} label={label} url={url} no={ci + 1} width={colW} />
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

// ─── PendahuluanContent (section F) ──────────────────────────────────────────
function PendahuluanContent({ form, data, instansi, ttd }) {
  const [copiedLabel, setCopiedLabel] = useState(null);
  const f1 = form.part1 ?? {};

  const nama           = data.nama    || "—";
  const alamat         = data.alamat  || "—";
  const instansiNama   = instansi?.nama || "—";
  const tanggal        = formatDate(data.ttd?.tanggal) || data.ttd?.tanggal || "—";
  // TT: person selected from instansi (via ttd)
  const pjId      = ttd?.penanggungJawabId;
  const livePj    = pjId ? (instansi?.penanggungJawab ?? []).find(p => p.id === pjId) : null;
  const ttNama    = ttd?.nama || livePj?.nama || "—";
  const PJT_NAMA  = "Kadek Agus Parwata";

  // Trafo spec (dari data pengujian — nameplate form)
  const trafoKapasitas = gf(form, "part1.trafo.nameplate.kapasitas");
  const trafoMerk      = gf(form, "part1.trafo.nameplate.merk");

  // Kabel TM
  const kmTipe   = gf(form, "part1.phb_tm.kabel_incoming.tipe")   || gf(form, "part1.phb_tm.kabel_sktm.tipe");
  const kmUkuran = gf(form, "part1.phb_tm.kabel_incoming.ukuran") || gf(form, "part1.phb_tm.kabel_sktm.ukuran");
  const kmPanjang= gf(form, "part1.phb_tm.kabel_incoming.panjang")|| gf(form, "part1.phb_tm.kabel_sktm.panjang");

  // Kabel TR
  const krTipe   = gf(form, "part1.phb_tr.kabel_tr.tipe");
  const krUkuran = gf(form, "part1.phb_tr.kabel_tr.ukuran");
  const krPanjang= gf(form, "part1.phb_tr.kabel_tr.panjang");

  // ── Spec instalasi ───────────────────────────────────────────────────────────
  // PHB TM: ambil dari spesifikasi form
  const phbTmSpek = gf(form, "part1.phb_tm.incoming.spesifikasi");
  const phbTmMerk = gf(form, "part1.phb_tm.incoming.merk");
  const phbTmTipe = gf(form, "part1.phb_tm.incoming.tipe");
  const phbTmDesc = phbTmSpek
    ? phbTmSpek
    : [phbTmMerk, phbTmTipe].filter(Boolean).length
      ? `Satu Set Panel PHB TM (${[phbTmMerk, phbTmTipe].filter(Boolean).join(" ")})`
      : "Satu Set Panel PHB TM";

  // PHB TR: cari ACB di rows spec
  const phbTrSpecRows = f1.phb_tr_spec?.rows ?? [];
  const acbRow = phbTrSpecRows.find(r =>
    (r.nama || r.jenis || "").toLowerCase().includes("acb")
  );
  const phbTrDesc = acbRow
    ? `1 set PHB TR (${acbRow.jumlah || "1"} buah ACB ${[acbRow.besaranProteksi, acbRow.satuan].filter(Boolean).join(" ")})`
    : phbTrSpecRows.length > 0
      ? `1 set PHB TR (${phbTrSpecRows[0].nama || phbTrSpecRows[0].jenis || ""})`
      : "1 set PHB TR";

  // Kapasitas trafo (dari data pengujian)
  const kapasitasText = trafoKapasitas ? `${trafoKapasitas} kVA` : "—";

  // Panjang saluran (gabungan TM + TR)
  const panjangParts = [];
  if (kmPanjang) panjangParts.push(`${kmPanjang} ms, saluran Kabel Tegangan Menengah`);
  if (krPanjang) panjangParts.push(`${krPanjang} ms, saluran Kabel Tegangan Rendah`);
  const panjangSaluranText = panjangParts.length ? panjangParts.join(", dan ") : "—";

  // Penyedia tenaga listrik: gabungkan data pelanggan + data pengujian
  const penyediaText = `PT. PLN, daya tersambung ${data.daya || "—"}, kapasitas trafo ${kapasitasText}`;

  // Spec rows (nilai tunggal, tampil di atas narrative rows)
  const specRows = [
    { label: "Jenis Instalasi",   value: "Tegangan Menengah" },
    { label: "Daya tersambung",   value: data.daya || "—" },
    { label: "Perlengkapan hubung bagi tegangan menengah", value: phbTmDesc },
    { label: "Perlengkapan hubung bagi tegangan rendah",   value: phbTrDesc },
    { label: "Kapasitas trafo",   value: kapasitasText },
    { label: "Panjang saluran",   value: panjangSaluranText },
    { label: "Penyedia tenaga listrik", value: penyediaText },
  ];

  // Build instalasi bullet list (untuk Ringkasan Eksekutif)
  const instalasiItems = [];
  if (trafoKapasitas) {
    instalasiItems.push(`TRAFO ${trafoKapasitas} kVA${trafoMerk ? ` MERK ${trafoMerk}` : ""}`);
  }
  if (kmPanjang || kmTipe) {
    instalasiItems.push([
      kmPanjang && `${kmPanjang} m`,
      "Saluran Kabel TM",
      kmTipe && `= ${kmTipe}`,
      kmUkuran && `uk ${kmUkuran}`,
    ].filter(Boolean).join(" "));
  }
  if (krPanjang || krTipe) {
    instalasiItems.push([
      krPanjang && `${krPanjang} m`,
      "Saluran Kabel TR",
      krTipe && `= ${krTipe}`,
      krUkuran && `UK. ${krUkuran}`,
    ].filter(Boolean).join(" "));
  }
  instalasiItems.push("PHB TR");
  instalasiItems.push("Pembumian");

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
          <ul style={{ paddingLeft: 20, marginBottom: 8 }}>
            {instalasiItems.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
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

  const sectionTextMap = {
    // spec rows
    ...Object.fromEntries(specRows.map(r => [r.label, r.value])),
    // narrative rows
    "Ringkasan Eksekutif": [
      `Pelaksanaan Pemeriksaan dan Pengujian Laik Operasi Dilaksanakan berdasarkan Peraturan ` +
      `Menteri Energi Sumber Daya Mineral No. 12 Tahun 2021 tentang Klasifikasi, Kualifikasi, ` +
      `Akreditasi, dan Sertifikasi Usaha Jasa Penunjang Tenaga Listrik. Pemeriksaan dan ` +
      `Pengujian Instalasi Tenaga Listrik Tegangan Menengah dan Distribusi Tenaga Listrik ` +
      `Milik ${nama}, dilaksanakan mulai tanggal ${tanggal}, terhadap Instalasi yang meliputi:`,
      ...instalasiItems.map(i => `- ${i}`),
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
          {/* ── Spec rows ── */}
          {specRows.map(({ label, value }) => {
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
                <td style={{ ...CELL_TOP, textAlign: "left" }}>{value}</td>
              </tr>
            );
          })}
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
