// =====================================================================
// FORM SCHEMA — single source of truth.
// Struktur flat: part1 berisi semua peralatan (survey + pengujian menjadi satu).
// part2 dikosongkan — tidak dipakai lagi di UI baru.
// =====================================================================

const ISOLASI_FIELDS = [
  { name: "rGnd", label: "R-G (MΩ)", type: "number" },
  { name: "sGnd", label: "S-G (MΩ)", type: "number" },
  { name: "tGnd", label: "T-G (MΩ)", type: "number" },
  { name: "rs",   label: "R-S (MΩ)", type: "number" },
  { name: "st",   label: "S-T (MΩ)", type: "number" },
  { name: "rt",   label: "R-T (MΩ)", type: "number" },
];

// Setiap field isolasi punya 2 foto mandiri: pengukuran + nilai
const ISOLASI_PER_FIELD = {
  perFieldPhotos: 2,
  perFieldPhotoLabels: ["Foto Jauh", "Foto Hasil Pengujian"],
  photo: false,
};

// Jarak gabungan — 4 arah dalam 1 grup, masing-masing 2 foto
const jarakGroup = {
  key: "jarak", label: "Jarak",
  perFieldPhotos: 2,
  perFieldPhotoLabels: ["Foto Jauh", "Foto Hasil Pengukuran"],
  valueLabel: "Jarak (cm)",
  photo: false,
  fields: [
    { name: "depan",    label: "Depan",    type: "number" },
    { name: "kiri",     label: "Kiri",     type: "number" },
    { name: "kanan",    label: "Kanan",    type: "number" },
    { name: "belakang", label: "Belakang", type: "number" },
  ],
};

export const formSchema = {
  // ── Semua grup ada di part1. part2 dikosongkan. ──
  part1: [

    // ═══════════════════════════════════════════════
    //  PHB TM
    // ═══════════════════════════════════════════════
    {
      key: "phb_tm",
      label: "PHB TM",
      groups: [
        // ── SURVEY ──────────────────────────────────
        {
          key: "spesifikasi", label: "Spesifikasi PHB TM",
          photo: true, minPhotos: 1,
          photoLabels: ["Foto Full PHB TM"],
          fields: [
            { name: "spesifikasi", label: "Spesifikasi", type: "text", placeholder: "IMDM1A" },
            { name: "tahun",       label: "Tahun Pembuatan", type: "number" },
          ],
        },
        {
          key: "incoming", label: "Incoming",
          photo: true, minPhotos: 3,
          photoLabels: ["Foto Pemutus (CB)","Foto Nameplate PHB Incoming","Foto Nameplate CB"],
          fields: [
            { name: "merk",         label: "Merk",          type: "text" },
            { name: "tipe",         label: "Tipe",          type: "text" },
            { name: "jenisPemutus", label: "Jenis Pemutus", type: "text" },
            { name: "ratingV",      label: "Rating V",      type: "number" },
            { name: "ratingI",      label: "Rating I (A)",  type: "number" },
          ],
        },
        {
          key: "outgoing", label: "Outgoing",
          kind: "dynamic",
          photo: true, minPhotos: 3,
          photoLabels: ["Foto Pemutus (CB)","Foto Nameplate PHB Outgoing","Foto Nameplate CB"],
          fields: [
            { name: "merk",         label: "Merk",          type: "text" },
            { name: "tipe",         label: "Tipe",          type: "text" },
            { name: "jenisPemutus", label: "Jenis Pemutus", type: "text" },
            { name: "ratingV",      label: "Rating V",      type: "number" },
            { name: "ratingI",      label: "Rating I (A)",  type: "number" },
          ],
        },
        {
          key: "relay_proteksi", label: "Relay Proteksi",
          photo: true, minPhotos: 2,
          photoLabels: ["Foto Setting OCR","Foto Setting DGR"],
          fields: [
            { name: "merk",       label: "Merk Relay",  type: "text" },
            { name: "tipe",       label: "Tipe Relay",  type: "text" },
            { name: "settingOCR", label: "Setting OCR", type: "text" },
            { name: "settingDGR", label: "Setting DGR", type: "text" },
          ],
        },
        {
          key: "fuse", label: "Fuse",
          photo: true, minPhotos: 1,
          photoLabels: ["Foto Fuse Nameplate"],
          fields: [{ name: "rating", label: "Rating Fuse", type: "text" }],
        },
        // CT & PT dipisah tombol kameranya (urutan: CT in → CT out → PT in → PT out)
        {
          key: "ct_incoming", label: "CT Incoming",
          photo: true, minPhotos: 1,
          photoLabels: ["Foto CT Incoming"],
          fields: [{ name: "ratingCT", label: "Rating CT", type: "text", placeholder: "100/5" }],
        },
        {
          key: "ct_outgoing", label: "CT Outgoing",
          photo: true, minPhotos: 1,
          photoLabels: ["Foto CT Outgoing"],
          fields: [{ name: "ratingCT", label: "Rating CT", type: "text", placeholder: "100/5" }],
        },
        {
          key: "pt_incoming", label: "PT Incoming",
          photo: true, minPhotos: 1,
          photoLabels: ["Foto PT Incoming"],
          fields: [{ name: "ratingPT", label: "Rating PT", type: "text" }],
        },
        {
          key: "pt_outgoing", label: "PT Outgoing",
          photo: true, minPhotos: 1,
          photoLabels: ["Foto PT Outgoing"],
          fields: [{ name: "ratingPT", label: "Rating PT", type: "text" }],
        },
        {
          key: "lbs", label: "LBS",
          kind: "dynamic",
          photo: true, minPhotos: 3,
          photoLabels: ["Foto LBS","Foto Nameplate LBS","Foto Pengoperasian LBS"],
          fields: [
            { name: "merk", label: "Merk LBS", type: "text" },
            { name: "tipe", label: "Tipe LBS", type: "text" },
          ],
        },
        {
          key: "la", label: "LA / Isolator",
          kind: "dynamic",
          photo: true, minPhotos: 2,
          photoLabels: ["Foto LA","Foto Nameplate LA"],
          fields: [{ name: "tipe", label: "Tipe LA", type: "text" }],
        },
        {
          key: "kabel_incoming", label: "Kabel SKTM Incoming",
          photo: true, minPhotos: 2,
          photoLabels: ["Foto Nameplate Kabel","Foto Jalur Kabel Incoming"],
          fields: [
            { name: "tipe",   label: "Tipe Kabel",    type: "text" },
            { name: "ukuran", label: "Ukuran (mm²)", type: "text" },
          ],
        },
        {
          key: "kabel_outgoing", label: "Kabel SKTM Outgoing",
          photo: true, minPhotos: 2,
          photoLabels: ["Foto Nameplate Kabel","Foto Jalur Kabel Outgoing"],
          fields: [
            { name: "tipe",   label: "Tipe Kabel",    type: "text" },
            { name: "ukuran", label: "Ukuran (mm²)", type: "text" },
          ],
        },
        {
          key: "kabel_sktm", label: "Spesifikasi Kabel SKTM (Saluran TM)",
          photo: true, minPhotos: 2,
          photoLabels: ["Foto Nameplate Kabel TM", "Foto Jalur Kabel TM"],
          fields: [
            { name: "tipe",   label: "Tipe Kabel",    type: "text", placeholder: "N2XSY" },
            { name: "ukuran", label: "Ukuran (mm²)",  type: "text", placeholder: "3 x 1 x 50 mm²" },
          ],
        },
        {
          key: "grounding_cubicle", label: "Grounding Cubicle",
          photo: true, minPhotos: 2,
          photoLabels: ["Foto Grounding Body Cubicle","Foto Ground Rod Cubicle"],
          fields: [
            { name: "tipe",   label: "Tipe (Al/Cu)",  type: "text" },
            { name: "ukuran", label: "Ukuran (mm²)", type: "text" },
          ],
        },
        {
          key: "grounding_la", label: "Grounding LA",
          photo: true, minPhotos: 2,
          photoLabels: ["Foto Grounding LA","Foto Ground Rod LA"],
          fields: [
            { name: "tipe",   label: "Tipe (Al/Cu)",  type: "text" },
            { name: "ukuran", label: "Ukuran (mm²)", type: "text" },
          ],
        },
        jarakGroup,

        // ── PENGUJIAN ────────────────────────────────
        {
          key: "isolasi_cubicle_incoming", label: "Tahanan Isolasi Cubicle Incoming",
          ...ISOLASI_PER_FIELD, fields: ISOLASI_FIELDS,
        },
        {
          key: "isolasi_cubicle_outgoing", label: "Tahanan Isolasi Cubicle TM Outgoing",
          ...ISOLASI_PER_FIELD, fields: ISOLASI_FIELDS,
        },
        {
          key: "isolasi_kabel_incoming", label: "Tahanan Isolasi Kabel TM Incoming",
          ...ISOLASI_PER_FIELD, fields: ISOLASI_FIELDS,
        },
        {
          key: "isolasi_kabel_outgoing", label: "Tahanan Isolasi Kabel TM Outgoing",
          ...ISOLASI_PER_FIELD, fields: ISOLASI_FIELDS,
        },
        {
          key: "grounding_phbtm", label: "Pengukuran Grounding PHB TM",
          photo: true, minPhotos: 1,
          photoLabels: ["Foto Pengukuran Grounding PHB TM"],
          fields: [{ name: "nilai", label: "Nilai Pengukuran (Ω)", type: "number" }],
        },
        {
          key: "grounding_arester", label: "Pengukuran Grounding Arester TM",
          photo: true, minPhotos: 1,
          photoLabels: ["Foto Pengukuran Grounding Arester TM"],
          fields: [{ name: "nilai", label: "Nilai Pengukuran (Ω)", type: "number" }],
        },
        {
          key: "putaran_fasa", label: "Putaran Fasa",
          kind: "dynamic",
          photo: true, photoOnly: true, minPhotos: 1,
          photoLabels: ["Foto Putaran Fasa"],
          fields: [],
        },
        {
          key: "suhu_incoming", label: "Pengukuran Suhu Incoming",
          perFieldPhotos: 2,
          perFieldPhotoLabels: ["Foto Pengukuran (Jauh)", "Foto Nilai"],
          photo: false,
          fields: [
            { name: "R", label: "Phasa R (°C)", type: "number" },
            { name: "S", label: "Phasa S (°C)", type: "number" },
            { name: "T", label: "Phasa T (°C)", type: "number" },
          ],
        },
        {
          key: "suhu_outgoing", label: "Pengukuran Suhu Outgoing",
          perFieldPhotos: 2,
          perFieldPhotoLabels: ["Foto Pengukuran (Jauh)", "Foto Nilai"],
          photo: false,
          fields: [
            { name: "R", label: "Phasa R (°C)", type: "number" },
            { name: "S", label: "Phasa S (°C)", type: "number" },
            { name: "T", label: "Phasa T (°C)", type: "number" },
          ],
        },
      ],
    },

    // ═══════════════════════════════════════════════
    //  TRAFO
    // ═══════════════════════════════════════════════
    {
      key: "trafo",
      label: "Trafo",
      hasIsolasiTransformator: true,
      groups: [
        // ── SURVEY ──────────────────────────────────
        {
          key: "nameplate", label: "Spesifikasi Trafo",
          photo: true, minPhotos: 2,
          photoLabels: ["Foto Full Trafo","Foto Nameplate Trafo"],
          fields: [
            { name: "merk",            label: "Merk",                 type: "text" },
            { name: "typeVector",      label: "Type / Vector Group",  type: "text" },
            { name: "noSeri",          label: "No Seri",              type: "text" },
            { name: "kapasitas",       label: "Kapasitas (kVA)",      type: "number" },
            { name: "tahun",           label: "Tahun Pembuatan",      type: "number" },
            { name: "teganganPS",      label: "Tegangan P/S (V)",     type: "text", placeholder: "20000/400" },
            { name: "arusPS",          label: "Arus P/S (A)",         type: "text" },
            { name: "impedensi",       label: "Impedensi (%)",        type: "number" },
            { name: "sistemPendingin", label: "Sistem Pendingin",     type: "text", placeholder: "ONAN" },
            { name: "berat",           label: "Berat (kg)",           type: "number" },
          ],
        },
        // Komponen trafo — masing-masing tombol kamera sendiri
        { key: "grounding_kabel_tm", label: "Grounding Kabel TM Sisi Trafo", photo: true, photoOnly: true, minPhotos: 1, fields: [] },
        {
          key: "grounding_body", label: "Grounding Body Trafo",
          photo: true, minPhotos: 1,
          photoLabels: ["Foto Grounding Body Trafo"],
          fields: [
            { name: "tipe",   label: "Tipe (Al/Cu)",  type: "text" },
            { name: "ukuran", label: "Ukuran (mm²)",  type: "number" },
          ],
        },
        {
          key: "grounding_netral", label: "Grounding Netral Trafo",
          photo: true, minPhotos: 1,
          photoLabels: ["Foto Grounding Netral Trafo"],
          fields: [
            { name: "tipe",   label: "Tipe (Al/Cu)",  type: "text" },
            { name: "ukuran", label: "Ukuran (mm²)",  type: "number" },
          ],
        },
        { key: "dgpt",               label: "DGPT",                           photo: true, photoOnly: true, minPhotos: 1, fields: [] },
        { key: "kran_atas",          label: "Kran Atas",                      photo: true, photoOnly: true, minPhotos: 1, fields: [] },
        { key: "kran_bawah",         label: "Kran Bawah",                     photo: true, photoOnly: true, minPhotos: 1, fields: [] },
        { key: "kaki_pengunci",      label: "Kaki Pengunci Gerak Trafo",      photo: true, photoOnly: true, minPhotos: 1, fields: [] },
        {
          key: "grounding_pengukuran", label: "Pengukuran Grounding Trafo",
          photo: true, minPhotos: 2,
          photoLabels: ["Foto Pengukuran Grounding Netral","Foto Pengukuran Grounding Body"],
          fields: [
            { name: "nilaiNetral", label: "Nilai Grounding Netral (Ω)", type: "number" },
            { name: "nilaiBody",   label: "Nilai Grounding Body (Ω)",   type: "number" },
          ],
        },
        jarakGroup,

        // ── PENGUJIAN ────────────────────────────────
        {
          key: "isolasi_primer", label: "Tahanan Isolasi Primer",
          ...ISOLASI_PER_FIELD,
          fields: [
            { name: "rGnd", label: "Rg — R-G (MΩ)", type: "number" },
            { name: "sGnd", label: "Sg — S-G (MΩ)", type: "number" },
            { name: "tGnd", label: "Tg — T-G (MΩ)", type: "number" },
            { name: "rS",   label: "Rs — R-S (MΩ)", type: "number" },
            { name: "sT",   label: "St — S-T (MΩ)", type: "number" },
            { name: "tR",   label: "Tr — T-R (MΩ)", type: "number" },
          ],
        },
        {
          key: "isolasi_skunder", label: "Tahanan Isolasi Sekunder",
          ...ISOLASI_PER_FIELD,
          fields: [
            { name: "rGnd", label: "Rg — R-G (MΩ)", type: "number" },
            { name: "sGnd", label: "Sg — S-G (MΩ)", type: "number" },
            { name: "tGnd", label: "Tg — T-G (MΩ)", type: "number" },
            { name: "nGnd", label: "Ng — N-G (MΩ)", type: "number" },
            { name: "rS",   label: "Rs — R-S (MΩ)", type: "number" },
            { name: "sT",   label: "St — S-T (MΩ)", type: "number" },
            { name: "tR",   label: "Tr — T-R (MΩ)", type: "number" },
            { name: "rN",   label: "Rn — R-N (MΩ)", type: "number" },
            { name: "sN",   label: "Sn — S-N (MΩ)", type: "number" },
            { name: "tN",   label: "Tn — T-N (MΩ)", type: "number" },
          ],
        },
        {
          key: "isolasi_primer_skunder", label: "Tahanan Isolasi Primer–Sekunder",
          ...ISOLASI_PER_FIELD,
          fields: [
            { name: "PR_SR", label: "Primer R – Sekunder R (MΩ)", type: "number" },
            { name: "PR_SS", label: "Primer R – Sekunder S (MΩ)", type: "number" },
            { name: "PR_ST", label: "Primer R – Sekunder T (MΩ)", type: "number" },
            { name: "PR_SN", label: "Primer R – Sekunder N (MΩ)", type: "number" },
            { name: "PS_SR", label: "Primer S – Sekunder R (MΩ)", type: "number" },
            { name: "PS_SS", label: "Primer S – Sekunder S (MΩ)", type: "number" },
            { name: "PS_ST", label: "Primer S – Sekunder T (MΩ)", type: "number" },
            { name: "PS_SN", label: "Primer S – Sekunder N (MΩ)", type: "number" },
            { name: "PT_SR", label: "Primer T – Sekunder R (MΩ)", type: "number" },
            { name: "PT_SS", label: "Primer T – Sekunder S (MΩ)", type: "number" },
            { name: "PT_ST", label: "Primer T – Sekunder T (MΩ)", type: "number" },
            { name: "PT_SN", label: "Primer T – Sekunder N (MΩ)", type: "number" },
          ],
        },
        {
          key: "suhu_tm", label: "Suhu Sisi Primer",
          perFieldPhotos: 2,
          perFieldPhotoLabels: ["Foto Pengukuran (Jauh)", "Foto Nilai"],
          photo: false,
          fields: [
            { name: "R", label: "Phasa R (°C)", type: "number" },
            { name: "S", label: "Phasa S (°C)", type: "number" },
            { name: "T", label: "Phasa T (°C)", type: "number" },
            { name: "N", label: "Netral (°C)",  type: "number" },
          ],
        },
        {
          key: "suhu_tr", label: "Suhu Sisi Sekunder",
          perFieldPhotos: 2,
          perFieldPhotoLabels: ["Foto Pengukuran (Jauh)", "Foto Nilai"],
          photo: false,
          fields: [
            { name: "R", label: "Phasa R (°C)", type: "number" },
            { name: "S", label: "Phasa S (°C)", type: "number" },
            { name: "T", label: "Phasa T (°C)", type: "number" },
            { name: "N", label: "Netral (°C)",  type: "number" },
          ],
        },
        {
          key: "suhu_body", label: "Suhu Body Trafo",
          photo: true, minPhotos: 1,
          photoLabels: ["Foto Suhu Body Trafo"],
          fields: [{ name: "nilai", label: "Nilai (°C)", type: "number" }],
        },
      ],
    },

    // ═══════════════════════════════════════════════
    //  PHB TR
    // ═══════════════════════════════════════════════
    {
      key: "phb_tr",
      label: "PHB TR",
      groups: [
        // ── SURVEY ──────────────────────────────────
        {
          key: "phb_tr_full", label: "PHB TR",
          photo: true, minPhotos: 1,
          photoLabels: ["Foto Full PHB TR"],
          fields: [
            { name: "merk",       label: "Merk",             type: "text" },
            { name: "type",       label: "Tipe",             type: "text" },
            { name: "noSeri",     label: "No Seri",          type: "text" },
            { name: "kapasitas",  label: "Kapasitas (kVA)",  type: "number" },
            { name: "teganganPS", label: "Tegangan P/S (V)", type: "text" },
            { name: "arusPS",     label: "Arus P/S (A)",     type: "text" },
          ],
        },
        {
          key: "acb_utama", label: "ACB Utama",
          photo: true, minPhotos: 1,
          photoLabels: ["Foto Full ACB UTAMA"],
          fields: [
            { name: "merk",    label: "Merk ACB",     type: "text" },
            { name: "tipe",    label: "Tipe ACB",     type: "text" },
            { name: "ratingV", label: "Rating V",     type: "number" },
            { name: "ratingI", label: "Rating I (A)", type: "number" },
          ],
        },
        {
          key: "nameplate_acb", label: "Nameplate ACB UTAMA",
          photo: true, minPhotos: 1,
          photoLabels: ["Foto Nameplate ACB UTAMA"],
          fields: [{ name: "nameplate", label: "Data Nameplate", type: "text" }],
        },
        {
          key: "cb_cabang", label: "CB Cabang",
          photo: true, minPhotos: 1,
          photoLabels: ["Foto CB Cabang"],
          fields: [
            { name: "jumlah",  label: "Jumlah CB",    type: "number" },
            { name: "ratingI", label: "Rating I (A)", type: "number" },
          ],
        },
        {
          key: "nameplate_cb", label: "Nameplate CB Cabang",
          photo: true, minPhotos: 1,
          photoLabels: ["Foto Nameplate CB Cabang"],
          fields: [{ name: "nameplate", label: "Data Nameplate", type: "text" }],
        },
        {
          key: "pengaman", label: "Pengaman Jurusan",
          photo: true, photoOnly: true, minPhotos: 3,
          fields: [],
        },
        {
          key: "grounding_cubicle", label: "Grounding Cubicle",
          photo: true, minPhotos: 2,
          photoLabels: ["Foto Grounding Body Cubicle","Foto Ground Rod Cubicle"],
          fields: [
            { name: "tipe",   label: "Tipe (Al/Cu)",  type: "text" },
            { name: "ukuran", label: "Ukuran (mm²)", type: "text" },
          ],
        },
        {
          key: "kabel_tr", label: "Spesifikasi Kabel TR",
          photo: true, minPhotos: 2,
          photoLabels: ["Foto Nameplate Kabel TR", "Foto Jalur Kabel TR"],
          fields: [
            { name: "merk",    label: "Merk",        type: "text" },
            { name: "tipe",    label: "Tipe / Jenis", type: "text", placeholder: "NYY" },
            { name: "ukuran",  label: "Ukuran",       type: "text", placeholder: "16 Core 1 x 185 mm²" },
            { name: "panjang", label: "Panjang (m)",  type: "number" },
          ],
        },
        {
          key: "grounding_phbtr", label: "Pengukuran Grounding PHB TR",
          photo: true, minPhotos: 1,
          photoLabels: ["Foto Pengukuran Grounding PHB TR"],
          fields: [{ name: "nilai", label: "Nilai Pengukuran (Ω)", type: "number" }],
        },
        jarakGroup,

        // ── PENGUJIAN ────────────────────────────────
        {
          key: "putaran_fasa", label: "Putaran Fasa",
          photo: true, photoOnly: true, minPhotos: 2,
          fields: [],
          photoLabels: ["Foto Putaran Fasa 1","Foto Putaran Fasa 2"],
        },
        {
          key: "isolasi_incoming", label: "Tahanan Isolasi Incoming (RSTn-GND)",
          ...ISOLASI_PER_FIELD,
          fields: [
            { name: "rGnd", label: "R-G (MΩ)", type: "number" },
            { name: "sGnd", label: "S-G (MΩ)", type: "number" },
            { name: "tGnd", label: "T-G (MΩ)", type: "number" },
            { name: "nGnd", label: "N-G (MΩ)", type: "number" },
            { name: "rs",   label: "R-S (MΩ)", type: "number" },
            { name: "st",   label: "S-T (MΩ)", type: "number" },
          ],
        },
        {
          key: "isolasi_kabel_tr", label: "Tahanan Isolasi Kabel TR",
          ...ISOLASI_PER_FIELD, fields: ISOLASI_FIELDS,
        },
        {
          key: "tegangan", label: "Tegangan PHB TR",
          perFieldPhotos: 2,
          perFieldPhotoLabels: ["Foto Jauh", "Foto Hasil Pengujian"],
          valueLabel: "Tegangan (V)",
          photo: false,
          fields: [
            { name: "RS", label: "R-S (V)", type: "number" },
            { name: "ST", label: "S-T (V)", type: "number" },
            { name: "RT", label: "R-T (V)", type: "number" },
            { name: "RN", label: "R-N (V)", type: "number" },
            { name: "SN", label: "S-N (V)", type: "number" },
            { name: "TN", label: "T-N (V)", type: "number" },
          ],
        },
        {
          key: "beban", label: "Pengukuran Beban",
          perFieldPhotos: 2,
          perFieldPhotoLabels: ["Foto Jauh", "Foto Hasil Pengujian"],
          valueLabel: "Arus (A)",
          photo: false,
          fields: [
            { name: "R", label: "Phasa R (A)", type: "number" },
            { name: "S", label: "Phasa S (A)", type: "number" },
            { name: "T", label: "Phasa T (A)", type: "number" },
            { name: "N", label: "Netral (A)",  type: "number" },
          ],
        },
        {
          key: "suhu_busbar", label: "Suhu Busbar Incoming",
          perFieldPhotos: 2,
          perFieldPhotoLabels: ["Foto Pengukuran (Jauh)", "Foto Nilai"],
          photo: false,
          fields: [
            { name: "R", label: "Phasa R (°C)", type: "number" },
            { name: "S", label: "Phasa S (°C)", type: "number" },
            { name: "T", label: "Phasa T (°C)", type: "number" },
            { name: "N", label: "Netral (°C)",  type: "number" },
          ],
        },
      ],
    },

    // ═══════════════════════════════════════════════
    //  LAIN-LAIN
    // ═══════════════════════════════════════════════
    {
      key: "lain_lain",
      label: "Lain-lain",
      groups: [
        {
          key: "sertifikat", label: "Foto Sertifikat / Hasil Uji Pabrik",
          photo: true, photoOnly: true, minPhotos: 1,
          fields: [],
          photoLabels: ["Foto Sertifikat"],
        },
        {
          key: "k3", label: "Foto K3 & Keselamatan",
          photo: true, photoOnly: true, minPhotos: 5,
          fields: [],
          photoLabels: [
            "Foto APD",
            "Foto Kunci Gembok",
            "Foto APAR",
            "Foto Alat Pengujian",
            "Foto Tanda Bahaya",
          ],
        },
        {
          key: "peralatan", label: "Daftar Peralatan Digunakan",
          photo: false,
          fields: [
            { name: "earthTester",          label: "Earth Tester",           type: "checkbox" },
            { name: "insulationTester10kV", label: "Insulation Tester 10kV", type: "checkbox" },
            { name: "insulationTester1kV",  label: "Insulation Tester 1kV",  type: "checkbox" },
            { name: "thermogun",            label: "Thermogun",              type: "checkbox" },
            { name: "rollMeter",            label: "Roll Meter",             type: "checkbox" },
            { name: "multimeter",           label: "Multimeter",             type: "checkbox" },
          ],
        },
        {
          key: "dokumen", label: "Foto Dokumen",
          photo: true, photoOnly: true, minPhotos: 3,
          fields: [],
          photoLabels: [
            "Foto BA Pemeriksaan",
            "Foto Dokumen Panduan Pengoperasian",
            "Foto Dokumen BAST",
          ],
        },
      ],
    },

    // ═══════════════════════════════════════════════
    //  PHB TR SPEC — Tabel Proteksi (dynamic rows, hidden tab — rendered inside PHB TR)
    // ═══════════════════════════════════════════════
    {
      key: "phb_tr_spec",
      label: "PHB TR Spec",
      kind: "dynamic",
      hiddenTab: true,
      hasRowPhoto: false,
      groups: [],
      rowSchema: [
        { name: "nama",            label: "Nama Panel / Komponen",  type: "text",   placeholder: "Panel Utama TM" },
        { name: "merk",            label: "Merk",                   type: "text" },
        { name: "jenis",           label: "Jenis",                  type: "text",   placeholder: "ACB" },
        { name: "besaranProteksi", label: "Besaran Proteksi",       type: "text",   placeholder: "630" },
        { name: "satuan",          label: "Satuan Besaran",          type: "text",   placeholder: "A" },
        { name: "jumlah",          label: "Jumlah Terpasang",       type: "number" },
        { name: "tujuanProteksi",  label: "Tujuan Proteksi",        type: "text" },
      ],
    },

    // ═══════════════════════════════════════════════
    //  GAMBAR (Diagram & Tata Letak)
    // ═══════════════════════════════════════════════
    {
      key: "gambar",
      label: "Gambar",
      groups: [
        { key: "diagram",    label: "Diagram Satu Garis",   photo: true, photoOnly: true, minPhotos: 1, fields: [] },
        { key: "tata_letak", label: "Tata Letak Peralatan", photo: true, photoOnly: true, minPhotos: 1, fields: [] },
      ],
    },

  ],

  // part2 dikosongkan — semua dipindah ke part1
  part2: [],
};

/**
 * Build empty default form.
 * checkbox → false, fields lain → field.default ?? "".
 */
export function buildDefaultForm(schema = formSchema) {
  const out = { part1: {}, part2: {} };
  for (const eq of schema.part1) {
    if (eq.kind === "dynamic") {
      out.part1[eq.key] = { rows: [] };
      continue;
    }
    if (eq.kind === "checklist") {
      out.part1[eq.key] = {};
      for (const item of (eq.items ?? [])) {
        out.part1[eq.key][item.key] = { ada: "", keterangan: "" };
      }
      continue;
    }
    out.part1[eq.key] = {};
    for (const grp of eq.groups) {
      if (grp.kind === "dynamic") {
        out.part1[eq.key][grp.key] = { rows: [] };
        continue;
      }
      if (grp.photoOnly) continue;
      out.part1[eq.key][grp.key] = {};
      for (const f of grp.fields) {
        out.part1[eq.key][grp.key][f.name] =
          f.default ?? (f.type === "checkbox" ? false : "");
      }
    }
  }
  return out;
}
