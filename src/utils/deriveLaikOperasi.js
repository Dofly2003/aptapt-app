function formatTanggal(v) {
  if (!v) return "";
  const d = v?.toDate ? v.toDate() : new Date(v);
  if (isNaN(d)) return String(v);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

/**
 * Auto-derive TemplateLaikOperasi `data` fields from a pengujian Firestore snapshot.
 * Covers all sections I–XII of the complete Laik Operasi document.
 */
export function deriveLaikOperasiFromPengujian(d) {
  const fd = d.formData?.part1 ?? {};
  const ph = d.photos?.part1 ?? {};
  const slot = (arr, idx = 0) => {
    const url = Array.isArray(arr) ? arr[idx] : null;
    return url ? { url } : null;
  };

  return {
    // ── Info Umum ──────────────────────────────────────────────────────────
    nomor:      d.noLhpp  || "",
    namaGardu:  d.nama    || "",
    namaLokasi: d.nama    || "",
    lokasi:     d.alamat  || "",
    tanggal:    d.tanggal ? formatTanggal(d.tanggal) : "",

    // ── I. Jarak Bebas ────────────────────────────────────────────────────
    jarakBebas: {
      phbTm: { kiri: fd.phb_tm?.jarak?.kiri ?? "", kanan: fd.phb_tm?.jarak?.kanan ?? "", depan: fd.phb_tm?.jarak?.depan ?? "", belakang: fd.phb_tm?.jarak?.belakang ?? "" },
      trafo:  { kiri: fd.trafo?.jarak?.kiri  ?? "", kanan: fd.trafo?.jarak?.kanan  ?? "", depan: fd.trafo?.jarak?.depan  ?? "", belakang: fd.trafo?.jarak?.belakang  ?? "" },
      phbTr:  { kiri: fd.phb_tr?.jarak?.kiri ?? "", kanan: fd.phb_tr?.jarak?.kanan ?? "", depan: fd.phb_tr?.jarak?.depan ?? "", belakang: fd.phb_tr?.jarak?.belakang ?? "" },
    },
    fotoJarakBebas: {
      phbTm: { jauh: slot(ph["phb_tm.jarak.depan"], 0), pengukuran: slot(ph["phb_tm.jarak.depan"], 1) },
      trafo:  { jauh: slot(ph["trafo.jarak.depan"],  0), pengukuran: slot(ph["trafo.jarak.depan"],  1) },
      phbTr:  { jauh: slot(ph["phb_tr.jarak.depan"], 0), pengukuran: slot(ph["phb_tr.jarak.depan"], 1) },
    },

    // ── II. Konstruksi ────────────────────────────────────────────────────
    fotoKonstruksi: {
      phbTm: slot(ph["phb_tm.incoming"], 3),
      trafo:  slot(ph["trafo.nameplate"],    0),
      phbTr:  slot(ph["phb_tr.phb_tr_full"],0),
    },

    // ── III. PHB TM ───────────────────────────────────────────────────────
    fotoLbs: [
      slot(ph["phb_tm.lbs.0"], 0),
      slot(ph["phb_tm.lbs.1"], 0) ?? slot(ph["phb_tm.lbs.0"], 2),
    ],

    // ── IV. PHB TR ────────────────────────────────────────────────────────
    fotoPhbTr: [
      slot(ph["phb_tr.putaran_fasa"], 0),
      slot(ph["phb_tr.putaran_fasa"], 1),
    ],

    // ── V. Pengaman Elektrik ──────────────────────────────────────────────
    pengamanElektrik: {
      nama:    "Panel Utama Tegangan Rendah",
      merk:    fd.phb_tr?.acb_utama?.merk   ?? "",
      tipe:    fd.phb_tr?.acb_utama?.tipe   ?? "ACB",
      ratingI: fd.phb_tr?.acb_utama?.ratingI ?? "",
      jumlah:  1,
      tujuan:  "Memproteksi instalasi apabila terjadi arus lebih dari trafo",
    },
    fotoPengamanElektrik: {
      phbTr: slot(ph["phb_tr.acb_utama"], 0),
      phbTm: slot(ph["phb_tm.incoming"],  0),
    },

    // ── VI. Pengaman Mekanik ──────────────────────────────────────────────
    fotoPengamanMekanik: {
      dgpt:       slot(ph["trafo.dgpt"],         0),
      gerakTrafo: slot(ph["trafo.kaki_pengunci"], 0),
    },

    // ── VII. Evaluasi Komponen ────────────────────────────────────────────
    fotoEvaluasiKomponen: {
      lbs:      slot(ph["phb_tm.lbs.0"],          0),
      relay:    slot(ph["phb_tm.relay_proteksi"],  0),
      ct:       slot(ph["phb_tm.ct_incoming"],     0),
      dgpt:     slot(ph["trafo.dgpt"],             0),
      acb:      slot(ph["phb_tr.acb_utama"],       0),
      kranTrafo:slot(ph["trafo.kran_bawah"],       0),
    },

    // ── VIII. Suhu ────────────────────────────────────────────────────────
    suhuTmPrimer:   { R: fd.trafo?.suhu_tm?.R ?? "", S: fd.trafo?.suhu_tm?.S ?? "", T: fd.trafo?.suhu_tm?.T ?? "", N: fd.trafo?.suhu_tm?.N ?? "" },
    suhuTrSekunder: { R: fd.trafo?.suhu_tr?.R ?? "", S: fd.trafo?.suhu_tr?.S ?? "", T: fd.trafo?.suhu_tr?.T ?? "", N: fd.trafo?.suhu_tr?.N ?? "" },
    suhuPhbTm:      { R: fd.phb_tm?.suhu_incoming?.R ?? "", S: fd.phb_tm?.suhu_incoming?.S ?? "", T: fd.phb_tm?.suhu_incoming?.T ?? "" },
    suhuPhbTr:      { R: fd.phb_tr?.suhu_busbar?.R ?? "", S: fd.phb_tr?.suhu_busbar?.S ?? "", T: fd.phb_tr?.suhu_busbar?.T ?? "", N: fd.phb_tr?.suhu_busbar?.N ?? "" },
    fotoSuhu: [
      slot(ph["trafo.suhu_tm.R"],          0),
      slot(ph["trafo.suhu_tm.S"],          0),
      slot(ph["trafo.suhu_tr.R"],          0),
      slot(ph["trafo.suhu_tr.S"],          0),
      slot(ph["phb_tm.suhu_incoming.R"],   0),
      slot(ph["phb_tm.suhu_incoming.S"],   0),
    ],

    // ── IX. Tahanan Isolasi ───────────────────────────────────────────────
    isolasiPhbTm: {
      rGnd: fd.phb_tm?.isolasi_cubicle_incoming?.rGnd ?? "",
      sGnd: fd.phb_tm?.isolasi_cubicle_incoming?.sGnd ?? "",
      tGnd: fd.phb_tm?.isolasi_cubicle_incoming?.tGnd ?? "",
      rs:   fd.phb_tm?.isolasi_cubicle_incoming?.rs   ?? "",
      st:   fd.phb_tm?.isolasi_cubicle_incoming?.st   ?? "",
      rt:   fd.phb_tm?.isolasi_cubicle_incoming?.rt   ?? "",
    },
    isolasiKabelTm: {
      rGnd: fd.phb_tm?.isolasi_kabel_incoming?.rGnd ?? "",
      sGnd: fd.phb_tm?.isolasi_kabel_incoming?.sGnd ?? "",
      tGnd: fd.phb_tm?.isolasi_kabel_incoming?.tGnd ?? "",
      rs:   fd.phb_tm?.isolasi_kabel_incoming?.rs   ?? "",
      st:   fd.phb_tm?.isolasi_kabel_incoming?.st   ?? "",
      rt:   fd.phb_tm?.isolasi_kabel_incoming?.rt   ?? "",
    },
    isolasiPrimer: {
      rGnd: fd.trafo?.isolasi_primer?.rGnd ?? "",
      sGnd: fd.trafo?.isolasi_primer?.sGnd ?? "",
      tGnd: fd.trafo?.isolasi_primer?.tGnd ?? "",
      rS:   fd.trafo?.isolasi_primer?.rS   ?? "",
      sT:   fd.trafo?.isolasi_primer?.sT   ?? "",
      tR:   fd.trafo?.isolasi_primer?.tR   ?? "",
    },
    isolasiSkunder: {
      rGnd: fd.trafo?.isolasi_skunder?.rGnd ?? "",
      sGnd: fd.trafo?.isolasi_skunder?.sGnd ?? "",
      tGnd: fd.trafo?.isolasi_skunder?.tGnd ?? "",
      nGnd: fd.trafo?.isolasi_skunder?.nGnd ?? "",
      rS:   fd.trafo?.isolasi_skunder?.rS   ?? "",
      sT:   fd.trafo?.isolasi_skunder?.sT   ?? "",
      tR:   fd.trafo?.isolasi_skunder?.tR   ?? "",
      rN:   fd.trafo?.isolasi_skunder?.rN   ?? "",
      sN:   fd.trafo?.isolasi_skunder?.sN   ?? "",
      tN:   fd.trafo?.isolasi_skunder?.tN   ?? "",
    },
    isolasiPrimerSkunder: {
      PR_SR: fd.trafo?.isolasi_primer_skunder?.PR_SR ?? "",
      PR_SS: fd.trafo?.isolasi_primer_skunder?.PR_SS ?? "",
      PR_ST: fd.trafo?.isolasi_primer_skunder?.PR_ST ?? "",
      PR_SN: fd.trafo?.isolasi_primer_skunder?.PR_SN ?? "",
      PS_SR: fd.trafo?.isolasi_primer_skunder?.PS_SR ?? "",
      PS_SS: fd.trafo?.isolasi_primer_skunder?.PS_SS ?? "",
      PS_ST: fd.trafo?.isolasi_primer_skunder?.PS_ST ?? "",
      PS_SN: fd.trafo?.isolasi_primer_skunder?.PS_SN ?? "",
      PT_SR: fd.trafo?.isolasi_primer_skunder?.PT_SR ?? "",
      PT_SS: fd.trafo?.isolasi_primer_skunder?.PT_SS ?? "",
      PT_ST: fd.trafo?.isolasi_primer_skunder?.PT_ST ?? "",
      PT_SN: fd.trafo?.isolasi_primer_skunder?.PT_SN ?? "",
    },
    isolasiPhbTr: {
      rGnd: fd.phb_tr?.isolasi_incoming?.rGnd ?? "",
      sGnd: fd.phb_tr?.isolasi_incoming?.sGnd ?? "",
      tGnd: fd.phb_tr?.isolasi_incoming?.tGnd ?? "",
      nGnd: fd.phb_tr?.isolasi_incoming?.nGnd ?? "",
      rs:   fd.phb_tr?.isolasi_incoming?.rs   ?? "",
      st:   fd.phb_tr?.isolasi_incoming?.st   ?? "",
    },
    isolasiKabelTr: {
      rGnd: fd.phb_tr?.isolasi_kabel_tr?.rGnd ?? "",
      sGnd: fd.phb_tr?.isolasi_kabel_tr?.sGnd ?? "",
      tGnd: fd.phb_tr?.isolasi_kabel_tr?.tGnd ?? "",
      rs:   fd.phb_tr?.isolasi_kabel_tr?.rs   ?? "",
      st:   fd.phb_tr?.isolasi_kabel_tr?.st   ?? "",
      rt:   fd.phb_tr?.isolasi_kabel_tr?.rt   ?? "",
    },
    fotoIsolasi: [
      slot(ph["phb_tm.isolasi_cubicle_incoming.rGnd"], 0),
      slot(ph["phb_tm.isolasi_cubicle_incoming.sGnd"], 0),
      slot(ph["trafo.isolasi_primer.rGnd"],            0),
      slot(ph["trafo.isolasi_primer.sGnd"],            0),
      slot(ph["trafo.isolasi_skunder.rGnd"],           0),
      slot(ph["trafo.isolasi_skunder.sGnd"],           0),
      slot(ph["phb_tr.isolasi_incoming.rGnd"],         0),
      slot(ph["phb_tr.isolasi_incoming.sGnd"],         0),
      slot(ph["phb_tm.isolasi_kabel_incoming.rGnd"],   0),
      slot(ph["phb_tr.isolasi_kabel_tr.rGnd"],         0),
    ],

    // ── X. Grounding ─────────────────────────────────────────────────────
    groundingHasil: {
      bodyTrafo:   fd.trafo?.grounding_pengukuran?.nilaiBody   ?? "",
      netralTrafo: fd.phb_tm?.grounding_phbtm?.nilai           ?? "",
      phbTm:       fd.phb_tm?.grounding_phbtm?.nilai           ?? "",
      phbTr:       fd.phb_tr?.grounding_phbtr?.nilai           ?? "",
    },
    fotoPengukuranGrounding: [
      slot(ph["trafo.grounding_pengukuran"], 0),
      slot(ph["trafo.grounding_pengukuran"], 1),
      slot(ph["phb_tm.grounding_phbtm"],     0),
      slot(ph["phb_tr.grounding_phbtr"],     0),
    ],
    fotoSistemGrounding: {
      bodyTrafo:   slot(ph["trafo.grounding_body"],    0),
      netralTrafo: slot(ph["trafo.grounding_netral"],  0),
      phbTm:       slot(ph["phb_tm.grounding_cubicle"],0),
      phbTr:       slot(ph["phb_tr.grounding_cubicle"],0),
    },

    // ── XI. Spesifikasi Teknik ────────────────────────────────────────────
    spesKabelTm: {
      merk:    fd.phb_tm?.kabel_incoming?.merk   ?? fd.phb_tm?.kabel_sktm?.merk   ?? "",
      tipe:    fd.phb_tm?.kabel_incoming?.tipe   ?? fd.phb_tm?.kabel_sktm?.tipe   ?? "",
      ukuran:  fd.phb_tm?.kabel_incoming?.ukuran ?? fd.phb_tm?.kabel_sktm?.ukuran ?? "",
      panjang: fd.phb_tm?.kabel_incoming?.panjang ?? fd.phb_tm?.kabel_outgoing?.panjang ?? "",
    },
    spesKabelTr: {
      merk:    fd.phb_tr?.kabel_tr?.merk    ?? "",
      tipe:    fd.phb_tr?.kabel_tr?.tipe    ?? "",
      ukuran:  fd.phb_tr?.kabel_tr?.ukuran  ?? "",
      panjang: fd.phb_tr?.kabel_tr?.panjang ?? "",
    },
    spesPhbTm: {
      merk:    fd.phb_tm?.incoming?.merk    ?? "",
      tipe:    fd.phb_tm?.incoming?.tipe    ?? "",
      ratingV: fd.phb_tm?.incoming?.ratingV ?? "",
      ratingI: fd.phb_tm?.incoming?.ratingI ?? "",
    },
    spesPhbTr: {
      merk:    fd.phb_tr?.acb_utama?.merk    ?? "",
      tipe:    fd.phb_tr?.acb_utama?.tipe    ?? "",
      ratingI: fd.phb_tr?.acb_utama?.ratingI ?? "",
      jumlah:  1,
      tujuan:  "Memproteksi instalasi jika terjadi arus lebih yang terjadi akibat konsleting",
    },
    spesTrafo: {
      merk:            fd.trafo?.nameplate?.merk            ?? "",
      typeVector:      fd.trafo?.nameplate?.typeVector       ?? "",
      noSeri:          fd.trafo?.nameplate?.noSeri           ?? "",
      kapasitas:       fd.trafo?.nameplate?.kapasitas        ?? "",
      tahun:           fd.trafo?.nameplate?.tahun            ?? "",
      teganganPS:      fd.trafo?.nameplate?.teganganPS       ?? "",
      arusPS:          fd.trafo?.nameplate?.arusPS           ?? "",
      impedensi:       fd.trafo?.nameplate?.impedensi        ?? "",
      sistemPendingin: fd.trafo?.nameplate?.sistemPendingin  ?? "",
      jenisMinyak:     fd.trafo?.nameplate?.jenisMinyak      ?? "",
      volume:          fd.trafo?.nameplate?.volume           ?? "",
    },
    fotoTrafo: slot(ph["trafo.nameplate"], 1),

    // ── TTD auto-fill ─────────────────────────────────────────────────────
    // Saksi (client): ambil dari ttd_client jika ada, fallback ke saksiNama manual
    saksi1Nama:       d.ttd_client?.nama    || d.saksiNama    || "",
    saksi1Jabatan:    d.ttd_client?.jabatan || d.saksiJabatan || "",
    saksi2Nama:       d.ttd_client?.nama    || d.saksiNama    || "",
    saksi2Jabatan:    d.ttd_client?.jabatan || d.saksiJabatan || "",
    saksi3Nama:       d.ttd_client?.nama    || d.saksiNama    || "",
    saksi3Jabatan:    d.ttd_client?.jabatan || d.saksiJabatan || "",
    saksi4Nama:       d.ttd_client?.nama    || d.saksiNama    || "",
    saksi4Jabatan:    d.ttd_client?.jabatan || d.saksiJabatan || "",
    saksi2Instansi:   d.nama || "",
    // URL TTD & stempel client untuk kolom Saksi
    saksiSignatureUrl: d.ttd_client?.signature?.url ?? null,
    saksiStempelUrl:   d.ttd_client?.stempel?.url   ?? null,
    // Pemeriksa & Penguji (tenaga teknik):
    // Prioritas 1 — lookup live dari instansi.penanggungJawab via penanggungJawabId
    // Prioritas 2 — snapshot ttd yang disimpan saat assign (nama+jabatan+signature)
    // Prioritas 3 — field manual pemeriksaNama
    pemeriksaNama:         d.ttd?.nama              || d.pemeriksaNama    || "",
    pemeriksaJabatan:      d.ttd?.jabatan           || d.pemeriksaJabatan || "",
    pemeriksaSignatureUrl: d.ttd?.signature?.url    ?? null,
    pemeriksaStempelUrl:   d.ttd?.stempel?.url      ?? null,
    pj1Id: d.ttd?.penanggungJawabId ?? null,
    pj2Id: d.ttd?.penanggungJawabId ?? null,
    pj3Id: d.ttd?.penanggungJawabId ?? null,
    pj4Id: d.ttd?.penanggungJawabId ?? null,
    pj5Id: d.ttd?.penanggungJawabId ?? null,
  };
}

/**
 * Merge user-saved laikOperasi (loData) on top of auto-derived baseline.
 * Empty strings and nulls in loData do NOT override derived values —
 * only real user edits win. Arrays: loData wins if any element is non-null.
 */
export function mergeLaikOperasiData(derived, loData) {
  if (!loData || typeof loData !== "object") return derived;
  const result = { ...derived };
  for (const key of Object.keys(loData)) {
    const lo = loData[key];
    const dr = derived[key];
    if (lo === null || lo === undefined || lo === "") continue;
    if (Array.isArray(lo)) {
      const hasContent = lo.some((el) => el !== null && el !== undefined && el !== "");
      result[key] = hasContent ? lo : (dr ?? lo);
    } else if (typeof lo === "object") {
      result[key] = mergeLaikOperasiData(dr ?? {}, lo);
    } else {
      result[key] = lo;
    }
  }
  return result;
}
