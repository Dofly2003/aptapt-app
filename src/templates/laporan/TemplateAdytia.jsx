import HeaderLogo from "./shared/HeaderLogo";
import IsolasiBlock from "./shared/IsolasiBlock";
import SignatureBlock from "./shared/SignatureBlock";
import { getField, getPhotos, formatDate } from "./shared/helpers";
import { formSchema } from "../../schema/formSchema";

const FORM_STYLE = {
  width: "210mm",
  margin: "0 auto 12mm",
  padding: "12mm 15mm",
  background: "#fff",
  fontFamily: "'Times New Roman', serif",
  fontSize: "11pt",
  color: "#000",
  lineHeight: 1.4,
  boxSizing: "border-box",
  position: "relative",
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

// Compact arrays with interphase/highlight flags — untuk IsolasiValueCol 3-kolom Trafo
const TRAFO_P_COMPACT = [
  { name: "rGnd", label: "R-G" },
  { name: "sGnd", label: "S-G" },
  { name: "tGnd", label: "T-G" },
  { name: "rS",   label: "R-S", interphase: true },
  { name: "sT",   label: "S-T", interphase: true },
  { name: "tR",   label: "T-R", interphase: true },
];

const TRAFO_S_COMPACT = [
  { name: "rGnd", label: "R-G" },
  { name: "sGnd", label: "S-G" },
  { name: "tGnd", label: "T-G" },
  { name: "nGnd", label: "N-G", highlight: true },
  { name: "rS",   label: "R-S", interphase: true },
  { name: "sT",   label: "S-T", interphase: true },
  { name: "tR",   label: "T-R", interphase: true },
];

// Primer–Sekunder 3 field dari isolasi_primer_skunder (PR_SR=R-R, PS_SS=S-S, PT_ST=T-T)
const PS3_FIELDS = [
  { name: "PR_SR", label: "R–R" },
  { name: "PS_SS", label: "S–S" },
  { name: "PT_ST", label: "T–T" },
];

// ─── helpers ─────────────────────────────────────────────────────────────────
const gf = (form, path) => getField(form, path);
const gp = (photos, part, key) => getPhotos(photos, part, key);

// ─── shared cell styles — diterapkan eksplisit pada setiap cell tabel ────────
const B = "1px solid #000";
const TH_C = { border:B, padding:"4px 8px", fontWeight:"bold", textAlign:"center", verticalAlign:"middle" };
const TH_L = { border:B, padding:"4px 8px", fontWeight:"bold", textAlign:"left",   verticalAlign:"middle" };
const TD_C = { border:B, padding:"4px 8px", textAlign:"center", verticalAlign:"middle" };
const TD_L = { border:B, padding:"4px 8px", textAlign:"left",   verticalAlign:"middle" };
const TD_PHOTO = { border:B, padding:4, textAlign:"center", verticalAlign:"middle" };

export default function TemplateAdytia({ data, instansi, sectionCode }) {
  if (!data) return null;
  const form       = data.formData ?? {};
  const photos     = data.photos ?? {};
  const ttd        = data.ttd ?? {};
  const ttd_client = data.ttd_client ?? {};

  const fp = { form, photos, instansi, data, ttd, ttd_client, sectionCode };

  return (
    <div className="laporan-doc">
      {!sectionCode && <Cover data={data} instansi={instansi} />}

      {/* ── A. PEMERIKSAAN DOKUMEN ── */}
      <LhppPage {...fp} code="A.1" title="SPESIFIKASI TEKNIK PHB TM">
        <NameplateTable rows={[
          ["Spesifikasi", gf(form, "part1.phb_tm.spesifikasi.spesifikasi")],
          ["Tahun Pembuatan", gf(form, "part1.phb_tm.spesifikasi.tahun")],
          ["Merk", gf(form, "part1.phb_tm.incoming.merk")],
          ["Tipe", gf(form, "part1.phb_tm.incoming.tipe")],
          ["Jenis Pemutus", gf(form, "part1.phb_tm.incoming.jenisPemutus")],
          ["Rating Tegangan (V)", gf(form, "part1.phb_tm.incoming.ratingV")],
          ["Rating Arus (A)", gf(form, "part1.phb_tm.incoming.ratingI")],
        ]} />
        <LabeledPhotoRow photos={[
          { label: "Foto Nameplate PHB TM", url: gp(photos,"part1","phb_tm.incoming")[1] },
          { label: "Foto Full PHB TM",      url: gp(photos,"part1","phb_tm.spesifikasi")[0] },
        ]} />
      </LhppPage>

      <LhppPage {...fp} code="A.2" title="SPESIFIKASI TEKNIK SALURAN TM">
        <NameplateTable rows={[
          ["Merk",        gf(form, "part1.phb_tm.kabel_sktm.merk")],
          ["Tipe / Jenis",gf(form, "part1.phb_tm.kabel_sktm.tipe")],
          ["Ukuran",      gf(form, "part1.phb_tm.kabel_sktm.ukuran")],
          ["Panjang (m)", gf(form, "part1.phb_tm.kabel_sktm.panjang")],
        ].filter(([, v]) => v && v !== "-")} />
        <LabeledPhotoRow photos={[
          { label: "Foto Nameplate Kabel TM", url: gp(photos,"part1","phb_tm.kabel_sktm")[0] },
          { label: "Foto Jalur Kabel TM",     url: gp(photos,"part1","phb_tm.kabel_sktm")[1] },
        ]} />
      </LhppPage>

      <LhppPage {...fp} code="A.3" title="SPESIFIKASI TEKNIK TRAFO">
        <NameplateTable rows={[
          ["Merk",                  gf(form, "part1.trafo.nameplate.merk")],
          ["Type / Vector Group",   gf(form, "part1.trafo.nameplate.typeVector")],
          ["No Seri",               gf(form, "part1.trafo.nameplate.noSeri")],
          ["Kapasitas (kVA)",       gf(form, "part1.trafo.nameplate.kapasitas")],
          ["Tahun Pembuatan",       gf(form, "part1.trafo.nameplate.tahun")],
          ["Tegangan Primer/Sekunder (V)", gf(form, "part1.trafo.nameplate.teganganPS")],
          ["Arus Primer/Sekunder (A)",     gf(form, "part1.trafo.nameplate.arusPS")],
          ["Impedensi (%)",         gf(form, "part1.trafo.nameplate.impedensi")],
          ["Sistem Pendingin",      gf(form, "part1.trafo.nameplate.sistemPendingin")],
          ["Berat (kg)",            gf(form, "part1.trafo.nameplate.berat")],
        ]} />
        <LabeledPhotoRow photos={[
          { label: "Foto Nameplate Trafo", url: gp(photos,"part1","trafo.nameplate")[1] },
          { label: "Foto Full Trafo",      url: gp(photos,"part1","trafo.nameplate")[0] },
        ]} />
      </LhppPage>

      <LhppPage {...fp} code="A.4" title="SPESIFIKASI TEKNIK KABEL TR">
        <NameplateTable rows={[
          ["Merk",        gf(form, "part1.phb_tr.kabel_tr.merk")],
          ["Tipe / Jenis",gf(form, "part1.phb_tr.kabel_tr.tipe")],
          ["Ukuran",      gf(form, "part1.phb_tr.kabel_tr.ukuran")],
          ["Panjang (m)", gf(form, "part1.phb_tr.kabel_tr.panjang")],
        ]} />
        <LabeledPhotoRow photos={[
          { label: "Foto Nameplate Kabel TR", url: gp(photos,"part1","phb_tr.kabel_tr")[0] },
          { label: "Foto Jalur Kabel TR",     url: gp(photos,"part1","phb_tr.kabel_tr")[1] },
        ]} />
      </LhppPage>

      <LhppPage {...fp} code="A.5" title="SPESIFIKASI TEKNIK PHB TR">
        <PhbTrProteksiTable rows={form.part1?.phb_tr_spec?.rows ?? []} />
        <LabeledPhotoRow photos={[
          { label: "Foto Full PHB TR", url: gp(photos,"part1","phb_tr.phb_tr_full")[0] },
        ]} />
      </LhppPage>

      <LhppPage {...fp} code="A.6" title="HASIL UJI PABRIK / SERTIFIKAT PRODUK PERALATAN UTAMA">
        <SuratPernyataan data={data} instansi={instansi} />
        <LabeledPhotoRow photos={
          gp(photos,"part1","lain_lain.sertifikat").map((url,i)=>({ label: `Foto Sertifikat ${i+1}`, url }))
        } />
      </LhppPage>

      {/* ── B. PEMERIKSAAN KESESUAIAN DOKUMEN ── */}
      <LhppPage {...fp} code="B.1" title="KONSTRUKSI">
        <AllEquipmentPhotos photos={photos} />
      </LhppPage>

      <LhppPage {...fp} code="B.2" title="SISTEM PEMBUMIAN">
        <DerivedPembumianTable form={form} />
        <DerivedGroundingPhotos photos={photos} />
      </LhppPage>

      <LhppPage {...fp} code="B.3" title="PENGAMAN ELEKTRIK">
        <DerivedPengamanElektrikTable form={form} photos={photos} />
      </LhppPage>

      <LhppPage {...fp} code="B.4" title="PENGAMAN MEKANIK">
        <LabeledPhotoGrid photos={[
          { label: "DGPT / Relay Buchholz",  urls: gp(photos,"part1","trafo.dgpt") },
          { label: "Pagar Pengaman Trafo",   urls: gp(photos,"part1","trafo.nameplate").slice(0,1) },
          { label: "Pengaman Roda / Kaki",   urls: gp(photos,"part1","trafo.kaki_pengunci") },
        ]} />
      </LhppPage>

      <LhppPage {...fp} code="B.5" title="JARAK BEBAS (CLEARANCE DISTANCE)">
        <ClearanceTable label="PHB TM" data={form.part1?.phb_tm?.jarak ?? {}} />
        <ClearanceTable label="Trafo"  data={form.part1?.trafo?.jarak  ?? {}} />
        <ClearanceTable label="PHB TR" data={form.part1?.phb_tr?.jarak ?? {}} />
      </LhppPage>

      <LhppPage {...fp} code="B.6" title="GAMBAR DIAGRAM SATU GARIS (SINGLE LINE DIAGRAM)">
        <FullPhoto photos={gp(photos,"part1","gambar.diagram")} label="Diagram Satu Garis" />
      </LhppPage>

      <LhppPage {...fp} code="B.7" title="GAMBAR TATA LETAK PERALATAN UTAMA">
        <FullPhoto photos={gp(photos,"part1","gambar.tata_letak")} label="Tata Letak Peralatan" />
      </LhppPage>

      {/* ── C. HASIL EVALUASI ── */}

      {/* C.1 PHB TM */}
      <LhppPage {...fp} code="C.1" title="HASIL UJI PERALATAN — TAHANAN ISOLASI PHB TM">
        <SectionHeading>PENGUKURAN TAHANAN ISOLASI PHB TM</SectionHeading>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <IsolasiValueCol title="Cubicle Incoming" fields={ISOLASI_FIELDS_TM} groupKey="isolasi_cubicle_incoming" eqKey="phb_tm" form={form} />
          <IsolasiValueCol title="Cubicle Outgoing" fields={ISOLASI_FIELDS_TM} groupKey="isolasi_cubicle_outgoing" eqKey="phb_tm" form={form} />
        </div>
        <IsolasiTrafoFotoGrid title="Cubicle Incoming" fields={ISOLASI_FIELDS_TM} groupKey="isolasi_cubicle_incoming" eqKey="phb_tm" photos={photos} />
        <IsolasiTrafoFotoGrid title="Cubicle Outgoing" fields={ISOLASI_FIELDS_TM} groupKey="isolasi_cubicle_outgoing" eqKey="phb_tm" photos={photos} />

        <SectionHeading>PENGUKURAN TAHANAN ISOLASI KABEL TM ARAH TRAFO</SectionHeading>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <IsolasiValueCol title="Kabel TM Incoming" fields={ISOLASI_FIELDS_TM} groupKey="isolasi_kabel_incoming" eqKey="phb_tm" form={form} />
          <IsolasiValueCol title="Kabel TM Outgoing" fields={ISOLASI_FIELDS_TM} groupKey="isolasi_kabel_outgoing" eqKey="phb_tm" form={form} />
        </div>
        <IsolasiTrafoFotoGrid title="Kabel TM Incoming" fields={ISOLASI_FIELDS_TM} groupKey="isolasi_kabel_incoming" eqKey="phb_tm" photos={photos} />
        <IsolasiTrafoFotoGrid title="Kabel TM Outgoing" fields={ISOLASI_FIELDS_TM} groupKey="isolasi_kabel_outgoing" eqKey="phb_tm" photos={photos} />
      </LhppPage>

      {/* C.1 Trafo — 3-kolom compact + foto grid */}
      <LhppPage {...fp} code="C.1" title="HASIL UJI PERALATAN — TAHANAN ISOLASI TRANSFORMATOR">
        <SectionHeading>PENGUKURAN TAHANAN ISOLASI TRANSFORMATOR</SectionHeading>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <IsolasiValueCol title="Isolasi Primer"    fields={TRAFO_P_COMPACT} groupKey="isolasi_primer"  eqKey="trafo" form={form} />
          <IsolasiValueCol title="Isolasi Sekunder"  fields={TRAFO_S_COMPACT} groupKey="isolasi_skunder" eqKey="trafo" form={form} />
          <IsolasiValueCol title="Primer – Sekunder" fields={PS3_FIELDS} groupKey="isolasi_primer_skunder" eqKey="trafo" form={form} />
        </div>

        {form.part1?.trafo?.isolasiTransformator?.hasilEvaluasi && (
          <div style={{ border: "0.5px solid #bbb", borderRadius: 4, padding: 8, marginBottom: 12 }}>
            <div style={{ fontWeight: "bold", fontSize: "9pt", marginBottom: 3 }}>Hasil Evaluasi:</div>
            <div style={{ fontSize: "10pt" }}>{form.part1.trafo.isolasiTransformator.hasilEvaluasi}</div>
          </div>
        )}

        <SectionHeading>FOTO DOKUMENTASI MEGGER</SectionHeading>
        <IsolasiTrafoFotoGrid title="Isolasi Primer"   fields={TRAFO_P_COMPACT} groupKey="isolasi_primer"  eqKey="trafo" photos={photos} />
        <IsolasiTrafoFotoGrid title="Isolasi Sekunder" fields={TRAFO_S_COMPACT} groupKey="isolasi_skunder" eqKey="trafo" photos={photos} />
        <IsolasiTrafoFotoGrid title="Primer – Sekunder" fields={PS3_FIELDS} groupKey="isolasi_primer_skunder" eqKey="trafo" photos={photos} />
      </LhppPage>

      {/* C.1 PHB TR */}
      <LhppPage {...fp} code="C.1" title="HASIL UJI PERALATAN — TAHANAN ISOLASI PHB TR">
        <SectionHeading>PENGUKURAN TAHANAN ISOLASI PHB TR</SectionHeading>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <IsolasiValueCol title="Incoming PHB TR" fields={ISOLASI_FIELDS_TR} groupKey="isolasi_incoming"  eqKey="phb_tr" form={form} />
          <IsolasiValueCol title="Kabel TR"         fields={ISOLASI_FIELDS_TM} groupKey="isolasi_kabel_tr" eqKey="phb_tr" form={form} />
        </div>
        <IsolasiTrafoFotoGrid title="Incoming PHB TR" fields={ISOLASI_FIELDS_TR} groupKey="isolasi_incoming"  eqKey="phb_tr" photos={photos} />
        <IsolasiTrafoFotoGrid title="Kabel TR"         fields={ISOLASI_FIELDS_TM} groupKey="isolasi_kabel_tr" eqKey="phb_tr" photos={photos} />
      </LhppPage>

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

      <LhppPage {...fp} code="D" title="DATA HASIL UJI">
        <DataHasilUjiBlock form={form} />
      </LhppPage>

      <LhppPage {...fp} code="E" title="REKOMENDASI LAIK OPERASI">
        <RloContent form={form} data={data} photos={photos} />
      </LhppPage>
    </div>
  );
}

// ─── Cover ───────────────────────────────────────────────────────────────────
function Cover({ data, instansi }) {
  return (
    <div className="laporan-form laporan-cover" style={{ ...FORM_STYLE, minHeight: "285mm", display: "flex", flexDirection: "column" }}>
      <div className="laporan-section" style={{ display: "flex", flexDirection: "column", flex: 1 }}>
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

        <div style={{ marginTop: 40 }} />

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
function LhppPage({ data, instansi, ttd, ttd_client, code, title, children, sectionCode }) {
  if (sectionCode && sectionCode !== code) return null;
  return (
    <div className="laporan-form" style={FORM_STYLE} data-section={code}>
      <div className="laporan-section laporan-header">
        <HeaderLogo instansi={instansi} formNumber={code} />
        <LhppDataBox data={data} />
        <SectionHeading>{title}</SectionHeading>
      </div>

      <div className="laporan-section" style={{ marginBottom: 24 }}>
        {children}
      </div>

      <div className="laporan-section laporan-footer" style={{ paddingBottom: 16 }}>
        <DualSignature data={data} instansi={instansi} ttd={ttd} ttd_client={ttd_client} />
      </div>
    </div>
  );
}

// ─── LhppDataBox ─────────────────────────────────────────────────────────────
function LhppDataBox({ data }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", margin: "8px 0", fontSize: "10pt" }}>
      <tbody>
        {[
          ["Nama Perusahaan",    data.nama],
          ["Lokasi Pemeriksaan", data.alamat],
          ["Tanggal Pemeriksaan",formatDate(data.ttd?.tanggal)],
          ["No. LHPP",           data.noLhpp || "-"],
        ].map(([label, value]) => (
          <tr key={label}>
            <td style={{ ...TD_L, width: "36%", fontWeight: "bold", padding: "3px 8px" }}>{label}</td>
            <td style={{ ...TD_L, padding: "3px 8px" }}>: {value || "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── DualSignature ────────────────────────────────────────────────────────────
function DualSignature({ data, instansi, ttd, ttd_client }) {
  const clientTtd = { ...ttd_client, nama: ttd_client?.nama || data.nama };

  const SigCell = ({ heading, ttdObj }) => (
    <td style={{ width: "50%", textAlign: "center", verticalAlign: "top", padding: "0 16px" }}>
      <div style={{ fontWeight: "bold", fontSize: "11pt", marginBottom: 8 }}>{heading}</div>
      {/* Signature & stamp area – fixed height so name lines align */}
      <div style={{ position: "relative", height: 96, margin: "0 auto" }}>
        {ttdObj?.signature?.url && (
          <img src={ttdObj.signature.url} alt="ttd"
            style={{ position: "absolute", left: "50%", top: 0, transform: "translateX(-50%)",
              maxHeight: 80, maxWidth: 160, objectFit: "contain" }} />
        )}
        {ttdObj?.stempel?.url && (
          <img src={ttdObj.stempel.url} alt="stempel"
            style={{ position: "absolute", left: "50%", top: -8, transform: "translateX(-50%)",
              maxHeight: 118, maxWidth: 108, objectFit: "contain", opacity: 0.85 }} />
        )}
      </div>
      <div style={{ borderTop: "1px solid #000", paddingTop: 4, textAlign: "center" }}>
        <div style={{ fontWeight: "bold", textDecoration: "underline", fontSize: "11pt" }}>
          {ttdObj?.nama || "(......................)"}
        </div>
        {ttdObj?.jabatan && (
          <div style={{ fontSize: "10pt", marginTop: 2 }}>{ttdObj.jabatan}</div>
        )}
      </div>
    </td>
  );

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 20, paddingBottom: 8 }}>
      <tbody>
        <tr>
          <SigCell heading={data.nama} ttdObj={clientTtd} />
          <SigCell heading={instansi?.nama ?? ""} ttdObj={ttd} />
        </tr>
      </tbody>
    </table>
  );
}

// ─── NameplateTable ───────────────────────────────────────────────────────────
function NameplateTable({ rows = [] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12, fontSize: "11pt" }}>
      <thead>
        <tr style={{ background: "#fef3c7" }}>
          <td style={{ ...TH_C, width: "6%" }}>No</td>
          <td style={{ ...TH_L, width: "40%" }}>Uraian</td>
          <td style={TH_L}>Keterangan</td>
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, value], i) => (
          <tr key={i}>
            <td style={TD_C}>{i + 1}</td>
            <td style={TD_L}>{label}</td>
            <td style={TD_L}>{value || "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
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

// ─── ClearanceTable ───────────────────────────────────────────────────────────
function ClearanceTable({ label, data = {} }) {
  const fields = [
    ["Depan",    data.depan],
    ["Kiri",     data.kiri],
    ["Kanan",    data.kanan],
    ["Belakang", data.belakang],
  ];
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12, fontSize: "11pt" }}>
      <thead>
        <tr style={{ background: "#fef3c7" }}>
          <td colSpan={2} style={{ ...TH_L }}>Jarak Bebas {label} (cm)</td>
        </tr>
      </thead>
      <tbody>
        {fields.map(([dir, val]) => (
          <tr key={dir}>
            <td style={{ ...TD_L, width: "35%" }}>{dir}</td>
            <td style={TD_C}>{val || "-"}</td>
          </tr>
        ))}
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
    { label:"PHB TM",     urls: gp(photos,"part1","phb_tm.spesifikasi").slice(0,1) },
    { label:"Saluran TM", urls: gp(photos,"part1","phb_tm.kabel_sktm").slice(0,1) },
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
    { label:"Grounding Cubicle PHB TM", urls: gp(photos,"part1","phb_tm.grounding_cubicle").slice(0,1) },
    { label:"Grounding LA / Arester TM",urls: gp(photos,"part1","phb_tm.grounding_la").slice(0,1) },
    { label:"Grounding Netral Trafo",   urls: gp(photos,"part1","trafo.grounding_netral").slice(0,1) },
    { label:"Grounding Body Trafo",     urls: gp(photos,"part1","trafo.grounding_body").slice(0,1) },
    { label:"Grounding Cubicle PHB TR", urls: gp(photos,"part1","phb_tr.grounding_cubicle").slice(0,1) },
  ].filter(({ urls }) => urls.length > 0);
  if (!items.length) return null;
  return <LabeledPhotoGrid photos={items} />;
}

// ─── DerivedPembumianTable (B.2, C.2) ────────────────────────────────────────
function DerivedPembumianTable({ form }) {
  const f1 = form.part1 ?? {};
  const rows = [
    {
      nama: "Grounding Cubicle PHB TM",
      tipe: f1.phb_tm?.grounding_cubicle?.tipe || "-",
      ukuran: f1.phb_tm?.grounding_cubicle?.ukuran || "-",
      nilai: f1.phb_tm?.grounding_phbtm?.nilai || "-",
    },
    {
      nama: "Grounding LA / Arester PHB TM",
      tipe: f1.phb_tm?.grounding_la?.tipe || "-",
      ukuran: f1.phb_tm?.grounding_la?.ukuran || "-",
      nilai: f1.phb_tm?.grounding_arester?.nilai || "-",
    },
    {
      nama: "Grounding Netral Trafo",
      tipe: f1.trafo?.grounding_netral?.tipe || "-",
      ukuran: f1.trafo?.grounding_netral?.ukuran || "-",
      nilai: f1.trafo?.grounding_pengukuran?.nilaiNetral || "-",
    },
    {
      nama: "Grounding Body Trafo",
      tipe: f1.trafo?.grounding_body?.tipe || "-",
      ukuran: f1.trafo?.grounding_body?.ukuran || "-",
      nilai: f1.trafo?.grounding_pengukuran?.nilaiBody || "-",
    },
    {
      nama: "Grounding Cubicle PHB TR",
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

// ─── LabeledPhotoGrid — 2 columns: label|photo pairs ─────────────────────────
function LabeledPhotoGrid({ photos = [] }) {
  if (!photos.length) return null;
  return (
    <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:12, fontSize:"10pt" }}>
      <tbody>
        {chunk(photos, 2).map((pair, ri) => (
          <tr key={ri}>
            {pair.map(({ label, urls }, ci) => (
              <td key={ci} style={{ border:B, padding:6, width:"50%", textAlign:"center", verticalAlign:"middle" }}>
                <div style={{ fontWeight:"bold", marginBottom:4, fontSize:"10pt", textAlign:"left" }}>{label}</div>
                {urls?.[0]
                  ? <img src={urls[0]} alt={label} style={{ maxWidth:"100%", maxHeight:140, objectFit:"contain", border:"1px solid #ddd" }} />
                  : <span style={{ color:"#999", fontStyle:"italic", fontSize:"9pt" }}>(tidak ada foto)</span>
                }
              </td>
            ))}
            {pair.length === 1 && <td style={{ border:B, verticalAlign:"middle" }} />}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── LabeledPhotoRow — horizontal row of photos with labels ──────────────────
function LabeledPhotoRow({ photos = [] }) {
  const valid = photos.filter(Boolean);
  if (!valid.length) return null;
  return (
    <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:12 }}>
      <tbody>
        <tr>
          {valid.map(({ label, url }, i) => (
            <td key={i} style={{ border:B, padding:6, textAlign:"center", verticalAlign:"middle", width:`${100/valid.length}%` }}>
              <div style={{ fontWeight:"bold", fontSize:"10pt", marginBottom:4, textAlign:"left" }}>{label}</div>
              {url
                ? <img src={url} alt={label} style={{ maxWidth:"100%", maxHeight:150, objectFit:"contain" }} />
                : <span style={{ color:"#999", fontStyle:"italic", fontSize:"9pt" }}>(tidak ada foto)</span>
              }
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

// ─── FullPhoto — single large photo ──────────────────────────────────────────
function FullPhoto({ photos = [], label }) {
  const url = photos[0];
  return (
    <div style={{ textAlign:"center", border:"1px solid #000", padding:8, marginBottom:12 }}>
      {url
        ? <img src={url} alt={label} style={{ maxWidth:"100%", maxHeight:300, objectFit:"contain" }} />
        : <span style={{ color:"#999", fontStyle:"italic" }}>(tidak ada foto {label})</span>
      }
    </div>
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

// ─── SectionHeading ───────────────────────────────────────────────────────────
function SectionHeading({ children }) {
  return (
    <h3 className="rlo-section-heading" style={{ textAlign:"center", fontWeight:"bold", fontSize:"11pt", margin:"10px 0 6px", textDecoration:"underline" }}>
      {children}
    </h3>
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

// ─── utility ──────────────────────────────────────────────────────────────────
function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}
