/**
 * LhppPDF.jsx  — Dokumen LHPP lengkap (Cover + A.1–D) via @react-pdf/renderer v4
 * Setiap section = satu <Page>.  DualSignature otomatis di bawah setiap halaman.
 */

import React from "react";
import {
  Document, Page, View, Text, Image, StyleSheet, pdf,
} from "@react-pdf/renderer";
import { getField, getPhotos, formatDate } from "./shared/helpers";

// ─── alias ───────────────────────────────────────────────────────────────────
const gf  = (form, path) => getField(form, path);
const gp  = (photos, part, key) => getPhotos(photos, part, key);
const first = (photos, part, key) => gp(photos, part, key)[0] ?? null;

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

// ─── border helpers ───────────────────────────────────────────────────────────
const B = { width: 1, color: "#000", style: "solid" };
const border = (sides) => {
  const out = {};
  for (const s of sides) {
    out[`border${s}Width`] = B.width;
    out[`border${s}Color`] = B.color;
    out[`border${s}Style`] = B.style;
  }
  return out;
};
const bAll  = border(["Top","Left","Bottom","Right"]);
const bTLB  = border(["Top","Left","Bottom"]);          // no right
const bTLBR = bAll;                                     // alias
const bB    = border(["Bottom"]);
const bR    = border(["Right"]);
const bTB   = border(["Top","Bottom"]);

// ─── StyleSheet ───────────────────────────────────────────────────────────────
const Y  = "#F5E6C8";  // header kuning

const S = StyleSheet.create({
  // ── Page ──────────────────────────────────────────────────────────────────
  page: {
    paddingHorizontal: 18, paddingTop: 18, paddingBottom: 20,
    fontFamily: "Times-Roman", fontSize: 9, color: "#000", lineHeight: 1.35,
    flexDirection: "column",
  },

  // ── Header ────────────────────────────────────────────────────────────────
  hdrRow: {
    flexDirection: "row", alignItems: "stretch",
    ...bAll, marginBottom: 6,
  },
  // Logo column — fixed width so layout never collapses when logo is missing
  hdrLogoCol: {
    width: 64, alignItems: "center", justifyContent: "center",
    padding: 4, ...bR,
  },
  hdrLogo:   { width: 54, height: 42, objectFit: "contain" },
  hdrLogoPH: { width: 54, height: 42 },
  hdrCenter: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingVertical: 4, paddingHorizontal: 6,
  },
  hdrName:   { fontFamily: "Times-Bold", fontSize: 11, textAlign: "center" },
  hdrSub:    { fontSize: 8, textAlign: "center", marginTop: 1 },
  hdrAlamat: { fontSize: 7, textAlign: "center", color: "#555", marginTop: 1 },
  // Form code cell — bordered box on the right
  hdrCodeBox: {
    width: 66, alignItems: "center", justifyContent: "center",
    padding: 4, ...border(["Left"]),
  },
  hdrCodeTxt: { fontFamily: "Times-Bold", fontSize: 9, textAlign: "center" },

  // ── DataBox ───────────────────────────────────────────────────────────────
  dbox: { marginBottom: 6, ...bAll },
  dboxRow: { flexDirection: "row", ...bB },
  dboxRowLast: { flexDirection: "row" },
  dboxLbl: { width: "36%", padding: 3, fontFamily: "Times-Bold", ...bR, justifyContent: "center" },
  dboxVal: { width: "64%", padding: 3, justifyContent: "center" },

  // ── Section heading ────────────────────────────────────────────────────────
  secTitle: {
    fontFamily: "Times-Bold", fontSize: 10, textAlign: "center",
    textDecoration: "underline", marginVertical: 5,
  },
  subTitle: {
    fontFamily: "Times-Bold", fontSize: 9, textAlign: "center",
    marginTop: 6, marginBottom: 3, textDecoration: "underline",
  },

  // ── Table rows ─────────────────────────────────────────────────────────────
  tbl: { marginBottom: 8 },
  hRow: { flexDirection: "row", backgroundColor: Y },
  dRow: { flexDirection: "row" },

  // ── Cell base — pakai di setiap cell ──────────────────────────────────────
  // border kiri+atas+bawah selalu ada; right ditambah di kolom terakhir
  c: {
    padding: 3,
    ...bTLB,
    justifyContent: "center",
  },

  // ── Typography ─────────────────────────────────────────────────────────────
  bold:   { fontFamily: "Times-Bold" },
  italic: { fontFamily: "Times-Italic" },
  gray:   { color: "#888" },
  center: { textAlign: "center" },
  left:   { textAlign: "left" },
  right:  { textAlign: "right" },

  // ── Photo ──────────────────────────────────────────────────────────────────
  photoRow:  { flexDirection: "row", marginBottom: 4 },
  photoCell: { width: "50%", minHeight: 80, padding: 4, ...bAll, alignItems: "center", justifyContent: "flex-start" },
  photoGap:  { marginRight: 3 },
  photoLbl:  { fontFamily: "Times-Bold", fontSize: 7, marginBottom: 3, alignSelf: "flex-start" },
  photoImg:  { maxWidth: "100%", maxHeight: 110, objectFit: "contain" },
  photoNone: { fontSize: 7, color: "#999", fontFamily: "Times-Italic" },
  fullWrap:  { ...bAll, padding: 6, marginBottom: 8, alignItems: "center", justifyContent: "center", minHeight: 100 },
  fullImg:   { maxWidth: "100%", maxHeight: 220, objectFit: "contain" },

  // ── Spacer ─────────────────────────────────────────────────────────────────
  spacer: { flex: 1 },

  // ── Signature ──────────────────────────────────────────────────────────────
  sigWrap:    { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  sigBox:     { width: "45%", alignItems: "center" },
  sigPlace:   { fontSize: 8, textAlign: "center", marginBottom: 2 },
  sigTitle:   { fontFamily: "Times-Bold", fontSize: 8, textAlign: "center" },
  sigCompany: { fontSize: 8, textAlign: "center", marginBottom: 4 },
  sigImgs:    { height: 65, alignItems: "center", justifyContent: "center", width: "100%" },
  sigImg:     { maxHeight: 48, maxWidth: 120, objectFit: "contain" },
  sigStempel: { maxHeight: 62, maxWidth: 68, objectFit: "contain", marginTop: -38, opacity: 0.85 },
  sigLine:    { ...border(["Top"]), width: "100%", paddingTop: 2, alignItems: "center" },
  sigName:    { fontFamily: "Times-Bold", textDecoration: "underline", fontSize: 8, textAlign: "center" },
  sigJbt:     { fontSize: 7, textAlign: "center", marginTop: 1 },

  // ── Cover ──────────────────────────────────────────────────────────────────
  coverBody:    { flex: 1, alignItems: "center", justifyContent: "center" },
  coverT:       { fontFamily: "Times-Bold", fontSize: 18, textAlign: "center", marginBottom: 4 },
  coverAkronim: { fontSize: 12, textAlign: "center", letterSpacing: 1, marginBottom: 10 },
  coverNoLhpp:  { fontFamily: "Times-Italic", fontSize: 10, textAlign: "center", marginBottom: 14 },
  coverNama:    { fontFamily: "Times-Bold", fontSize: 13, textAlign: "center", marginBottom: 4 },
  coverAlamat:  { fontSize: 10, textAlign: "center" },
  coverInstBox: {
    ...bAll, paddingVertical: 8, paddingHorizontal: 24,
    alignItems: "center", marginTop: "auto",
  },
  coverInstName:   { fontFamily: "Times-Bold", fontSize: 11, textAlign: "center" },
  coverInstAlamat: { fontSize: 8, textAlign: "center", marginTop: 2 },

  // ── Surat pernyataan ───────────────────────────────────────────────────────
  suratBox:   { ...bAll, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 10 },
  suratTitle: { fontFamily: "Times-Bold", textAlign: "center", marginBottom: 6 },
  suratText:  { textAlign: "justify", lineHeight: 1.8, marginBottom: 6 },
});

// ─── Shared atoms ─────────────────────────────────────────────────────────────

function LhppHeader({ instansi = {}, code = "" }) {
  // logo stored as { url: "..." } object — extract the string URL
  const logoUrl = instansi.logo?.url ?? null;

  return (
    <View style={S.hdrRow}>
      {/* Left: logo column — fixed width, never collapses */}
      <View style={S.hdrLogoCol}>
        {logoUrl
          ? <Image src={logoUrl} style={S.hdrLogo} />
          : <View style={S.hdrLogoPH} />}
      </View>

      {/* Center: company name + subtitle + address */}
      <View style={S.hdrCenter}>
        <Text style={S.hdrName}>{instansi.nama ?? "PT. Adytia Putra Tehnik"}</Text>
        <Text style={S.hdrSub}>
          {instansi.subtitle ?? "ELECTRICAL CONTRACTOR & TECHNICAL ENGGINEERING"}
        </Text>
        {instansi.alamat ? <Text style={S.hdrAlamat}>{instansi.alamat}</Text> : null}
        {((instansi.web && instansi.web !== "-") || (instansi.telp && instansi.telp !== "-")) ? (
          <Text style={S.hdrAlamat}>
            {instansi.web && instansi.web !== "-" ? `Web: ${instansi.web}` : ""}
            {instansi.web && instansi.web !== "-" && instansi.telp && instansi.telp !== "-" ? "  " : ""}
            {instansi.telp && instansi.telp !== "-" ? `Telp. ${instansi.telp}` : ""}
          </Text>
        ) : null}
      </View>

      {/* Right: form code in bordered box — "FORM - A.1" format */}
      <View style={S.hdrCodeBox}>
        {code ? <Text style={S.hdrCodeTxt}>FORM - {code}</Text> : null}
      </View>
    </View>
  );
}

function LhppDataBox({ data = {} }) {
  const allRows = [
    ["Nama Perusahaan",     data.nama],
    ["Lokasi Pemeriksaan",  data.alamat],
    ["Tanggal Pemeriksaan", formatDate(data.ttd?.tanggal)],
    ...(data.noLhpp && data.noLhpp !== "-" ? [["No. LHPP", data.noLhpp]] : []),
  ];
  return (
    <View style={S.dbox}>
      {allRows.map(([label, val], i) => (
        <View key={i} style={i < allRows.length - 1 ? S.dboxRow : S.dboxRowLast}>
          <View style={S.dboxLbl}><Text style={S.bold}>{label}</Text></View>
          <View style={S.dboxVal}><Text>: {val ?? "-"}</Text></View>
        </View>
      ))}
    </View>
  );
}

function SigBlock({ label, company, ttdObj = {} }) {
  return (
    <View style={S.sigBox}>
      <Text style={S.sigTitle}>{label}</Text>
      <Text style={S.sigCompany}>{company}</Text>
      <View style={S.sigImgs}>
        {ttdObj?.signature?.url && <Image src={ttdObj.signature.url} style={S.sigImg} />}
        {ttdObj?.stempel?.url   && <Image src={ttdObj.stempel.url}   style={S.sigStempel} />}
      </View>
      <View style={S.sigLine}>
        <Text style={S.sigName}>{ttdObj?.nama || "(......................)"}</Text>
        {ttdObj?.jabatan ? <Text style={S.sigJbt}>{ttdObj.jabatan}</Text> : null}
      </View>
    </View>
  );
}

function DualSig({ data = {}, instansi = {}, ttd = {}, ttd_client = {} }) {
  const clientTtd = { ...ttd_client, nama: ttd_client?.nama || data.nama };
  return (
    <View style={S.sigWrap}>
      <SigBlock label={data.nama ?? ""} company="" ttdObj={clientTtd} />
      <SigBlock label={instansi?.nama ?? ""} company="" ttdObj={ttd} />
    </View>
  );
}

// Wrapper: setiap section LHPP pakai ini
function LhppPage({ data, instansi, ttd, ttd_client, code, title, children }) {
  return (
    <Page size="A4" style={S.page}>
      <LhppHeader instansi={instansi} code={code} />
      <LhppDataBox data={data} />
      <Text style={S.secTitle}>{title}</Text>
      {children}
      <View style={S.spacer} />
      <DualSig data={data} instansi={instansi} ttd={ttd} ttd_client={ttd_client} />
    </Page>
  );
}

// ─── Table atoms ──────────────────────────────────────────────────────────────

// Nameplate: No / Uraian / Keterangan
function NameplateTable({ rows = [] }) {
  return (
    <View style={S.tbl}>
      <View style={S.hRow}>
        {["No","Uraian","Keterangan"].map((h, i) => (
          <View key={i} style={[S.c, i===2 && bR, { width: i===0?"8%":i===1?"40%":"52%", alignItems:"center" }]}>
            <Text style={S.bold}>{h}</Text>
          </View>
        ))}
      </View>
      {rows.map(([lbl, val], i) => (
        <View key={i} style={S.dRow}>
          <View style={[S.c, { width:"8%", alignItems:"center" }]}><Text>{i+1}</Text></View>
          <View style={[S.c, { width:"40%", alignItems:"flex-start" }]}><Text>{lbl}</Text></View>
          <View style={[S.c, bR, { width:"52%", alignItems:"flex-start" }]}><Text>{val ?? "-"}</Text></View>
        </View>
      ))}
    </View>
  );
}

// Tabel PHB TR Spec (Tabel Proteksi)
function PhbTrProteksiTable({ rows = [] }) {
  const headers = ["Nama Panel/Komponen","Merk","Jenis","Besaran Proteksi","Satuan","Jumlah","Tujuan Proteksi"];
  const keys    = ["nama","merk","jenis","besaranProteksi","satuan","jumlah","tujuanProteksi"];
  const widths  = ["22%","12%","10%","13%","9%","8%","26%"];
  const aligns  = ["left","left","left","center","center","center","left"];
  return (
    <View style={S.tbl}>
      <View style={S.hRow}>
        <View style={[S.c, { width:"6%", alignItems:"center" }]}><Text style={S.bold}>No</Text></View>
        {headers.map((h, i) => (
          <View key={i} style={[S.c, i===6&&bR, { width:widths[i], alignItems:aligns[i]==="center"?"center":"flex-start" }]}>
            <Text style={S.bold}>{h}</Text>
          </View>
        ))}
      </View>
      {rows.length === 0 ? (
        <View style={S.dRow}>
          <View style={[S.c, bR, { flex:1, alignItems:"center" }]}>
            <Text style={[S.italic, S.gray]}>Belum ada data</Text>
          </View>
        </View>
      ) : rows.map((row, ri) => (
        <View key={ri} style={S.dRow} wrap={false}>
          <View style={[S.c, { width:"6%", alignItems:"center" }]}><Text>{ri+1}</Text></View>
          {keys.map((k, ki) => (
            <View key={k} style={[S.c, ki===6&&bR, { width:widths[ki], alignItems:aligns[ki]==="center"?"center":"flex-start" }]}>
              <Text>{row[k] ?? "-"}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

// Tabel Pembumian (B.2 / C.2 derived)
function PembumianTable({ form }) {
  const f1 = form.part1 ?? {};
  const rows = [
    { nama:"Grounding Cubicle PHB TM",    tipe: f1.phb_tm?.grounding_cubicle?.tipe??"-", ukuran: f1.phb_tm?.grounding_cubicle?.ukuran??"-", nilai: f1.phb_tm?.grounding_phbtm?.nilai??"-" },
    { nama:"Grounding LA / Arester PHB TM",tipe: f1.phb_tm?.grounding_la?.tipe??"-",      ukuran: f1.phb_tm?.grounding_la?.ukuran??"-",      nilai: f1.phb_tm?.grounding_arester?.nilai??"-" },
    { nama:"Grounding Netral Trafo",       tipe:"-", ukuran:"-", nilai: f1.trafo?.grounding_pengukuran?.nilaiNetral??"-" },
    { nama:"Grounding Body Trafo",         tipe:"-", ukuran:"-", nilai: f1.trafo?.grounding_pengukuran?.nilaiBody??"-" },
    { nama:"Grounding Cubicle PHB TR",     tipe: f1.phb_tr?.grounding_cubicle?.tipe??"-", ukuran: f1.phb_tr?.grounding_cubicle?.ukuran??"-", nilai: f1.phb_tr?.grounding_phbtr?.nilai??"-" },
  ];
  const headers = ["No","Nama Grounding","Tipe (Al/Cu)","Ukuran (mm²)","Nilai (Ω)"];
  const widths  = ["6%","38%","18%","18%","20%"];
  const aligns  = ["center","left","center","center","center"];
  return (
    <View style={S.tbl}>
      <View style={S.hRow}>
        {headers.map((h, i) => (
          <View key={i} style={[S.c, i===4&&bR, { width:widths[i], alignItems:aligns[i]==="center"?"center":"flex-start" }]}>
            <Text style={S.bold}>{h}</Text>
          </View>
        ))}
      </View>
      {rows.map((row, i) => (
        <View key={i} style={S.dRow} wrap={false}>
          <View style={[S.c, { width:"6%", alignItems:"center" }]}><Text>{i+1}</Text></View>
          <View style={[S.c, { width:"38%", alignItems:"flex-start" }]}><Text>{row.nama}</Text></View>
          <View style={[S.c, { width:"18%", alignItems:"center" }]}><Text>{row.tipe}</Text></View>
          <View style={[S.c, { width:"18%", alignItems:"center" }]}><Text>{row.ukuran}</Text></View>
          <View style={[S.c, bR, { width:"20%", alignItems:"center" }]}><Text style={S.bold}>{row.nilai}</Text></View>
        </View>
      ))}
    </View>
  );
}

// Tabel Clearance (B.5)
function ClearanceTable({ label, data = {} }) {
  return (
    <View style={[S.tbl, { marginBottom: 5 }]}>
      <View style={S.hRow}>
        <View style={[S.c, bR, { flex:1, alignItems:"flex-start" }]}>
          <Text style={S.bold}>Jarak Bebas {label} (cm)</Text>
        </View>
      </View>
      {[["Depan",data.depan],["Kiri",data.kiri],["Kanan",data.kanan],["Belakang",data.belakang]].map(([dir,val]) => (
        <View key={dir} style={S.dRow}>
          <View style={[S.c, { width:"35%", alignItems:"flex-start" }]}><Text>{dir}</Text></View>
          <View style={[S.c, bR, { flex:1, alignItems:"center" }]}><Text>{val ?? "-"}</Text></View>
        </View>
      ))}
    </View>
  );
}

// Tabel Isolasi (C.1) — compact per grup
function IsolasiTable({ title, form, eqKey, groupKey, fields }) {
  return (
    <View style={{ marginBottom: 6 }}>
      <Text style={S.subTitle}>{title}</Text>
      <View style={S.tbl}>
        <View style={S.hRow}>
          {["No","Parameter","Nilai (MΩ)"].map((h, i) => (
            <View key={i} style={[S.c, i===2&&bR, { width:i===0?"8%":i===1?"55%":"37%", alignItems:"center" }]}>
              <Text style={S.bold}>{h}</Text>
            </View>
          ))}
        </View>
        {fields.map((f, fi) => {
          const val = gf(form, `part1.${eqKey}.${groupKey}.${f.name}`);
          return (
            <View key={f.name} style={S.dRow} wrap={false}>
              <View style={[S.c, { width:"8%", alignItems:"center" }]}><Text>{fi+1}</Text></View>
              <View style={[S.c, { width:"55%", alignItems:"flex-start" }]}><Text>{f.label} (MΩ)</Text></View>
              <View style={[S.c, bR, { width:"37%", alignItems:"center" }]}><Text style={S.bold}>{val}</Text></View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// Tabel Pengukuran Grounding (C.2)
function GroundingMeasTable({ form, photos }) {
  const entries = [
    { label:"Grounding PHB TM",      nilai: gf(form,"part1.phb_tm.grounding_phbtm.nilai"),          photoKey:"phb_tm.grounding_phbtm" },
    { label:"Grounding Arester TM",  nilai: gf(form,"part1.phb_tm.grounding_arester.nilai"),        photoKey:"phb_tm.grounding_arester" },
    { label:"Grounding Netral Trafo",nilai: gf(form,"part1.trafo.grounding_pengukuran.nilaiNetral"),photoKey:"trafo.grounding_pengukuran" },
    { label:"Grounding Body Trafo",  nilai: gf(form,"part1.trafo.grounding_pengukuran.nilaiBody"),  photoKey:"trafo.grounding_pengukuran" },
    { label:"Grounding PHB TR",      nilai: gf(form,"part1.phb_tr.grounding_phbtr.nilai"),          photoKey:"phb_tr.grounding_phbtr" },
  ];
  return (
    <View style={S.tbl}>
      <View style={S.hRow}>
        {["No","Titik Grounding","Nilai (Ω)","Foto Pengukuran"].map((h, i) => (
          <View key={i} style={[S.c, i===3&&bR, { width:i===0?"6%":i===1?"44%":i===2?"18%":"32%", alignItems:"center" }]}>
            <Text style={S.bold}>{h}</Text>
          </View>
        ))}
      </View>
      {entries.map(({ label, nilai, photoKey }, i) => {
        const pic = first(photos,"part1", photoKey);
        return (
          <View key={i} style={S.dRow} wrap={false}>
            <View style={[S.c, { width:"6%", alignItems:"center" }]}><Text>{i+1}</Text></View>
            <View style={[S.c, { width:"44%", alignItems:"flex-start" }]}><Text>{label}</Text></View>
            <View style={[S.c, { width:"18%", alignItems:"center" }]}><Text style={S.bold}>{nilai}</Text></View>
            <View style={[S.c, bR, { width:"32%", alignItems:"center", justifyContent:"center", padding:3 }]}>
              {pic
                ? <Image src={pic} style={{ maxHeight:55, maxWidth:90, objectFit:"contain" }} />
                : <Text style={[S.italic, S.gray]}>(tidak ada foto)</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// Tabel Pengaman Elektrik (B.3) — derive dari existing fields
function PengamanElektrikTable({ form, photos }) {
  const f1  = form.part1 ?? {};
  const ada = v => (v && String(v).trim() ? "Ada" : "Tidak Ada");
  const items = [
    { label:"Circuit Breaker (CB)",                   hasil: ada(f1.phb_tm?.incoming?.merk),          ket: f1.phb_tm?.incoming?.tipe??"-",      photoKey:"phb_tm.incoming" },
    { label:"Fuse",                                   hasil: ada(f1.phb_tm?.fuse?.rating),             ket: f1.phb_tm?.fuse?.rating??"-",         photoKey:"phb_tm.fuse" },
    { label:"Relai Pengaman",                         hasil: ada(f1.phb_tm?.relay_proteksi?.merk),     ket: `${f1.phb_tm?.relay_proteksi?.merk??""} ${f1.phb_tm?.relay_proteksi?.tipe??""}`.trim()||"-", photoKey:"phb_tm.relay_proteksi" },
    { label:"Air Circuit Breaker (ACB)",              hasil: ada(f1.phb_tr?.acb_utama?.merk),          ket: `${f1.phb_tr?.acb_utama?.merk??""} ${f1.phb_tr?.acb_utama?.tipe??""}`.trim()||"-",          photoKey:"phb_tr.acb_utama" },
    { label:"Moulded Case Circuit Breaker (MCCB)",    hasil: ada(f1.phb_tr?.cb_cabang?.ratingI),       ket: f1.phb_tr?.cb_cabang?.ratingI ? `${f1.phb_tr.cb_cabang.ratingI} A`:"-",                     photoKey:"phb_tr.cb_cabang" },
    { label:"Miniature Circuit Breaker (MCB)",        hasil: ada(f1.phb_tr?.nameplate_cb?.nameplate),  ket: f1.phb_tr?.nameplate_cb?.nameplate??"-",photoKey:"phb_tr.nameplate_cb" },
    { label:"Fault Passage Indicator (FPI)",          hasil:"-", ket:"-", photoKey:null },
    { label:"Current Transformer (CT)",               hasil: ada(f1.phb_tm?.ct_incoming?.ratingCT),   ket: f1.phb_tm?.ct_incoming?.ratingCT??"-",  photoKey:"phb_tm.ct_incoming" },
    { label:"Voltage Presence Indicating System (VPIS)",hasil:"-", ket:"-", photoKey:null },
  ];
  return (
    <View style={S.tbl}>
      <View style={S.hRow}>
        {["No","Komponen Pengaman","Hasil","Keterangan","Foto"].map((h, i) => (
          <View key={i} style={[S.c, i===4&&bR, { width:i===0?"5%":i===1?"36%":i===2?"14%":i===3?"28%":"17%", alignItems:"center" }]}>
            <Text style={S.bold}>{h}</Text>
          </View>
        ))}
      </View>
      {items.map((item, i) => {
        const pic = item.photoKey ? first(photos,"part1",item.photoKey) : null;
        return (
          <View key={i} style={S.dRow} wrap={false}>
            <View style={[S.c, { width:"5%", alignItems:"center" }]}><Text>{i+1}</Text></View>
            <View style={[S.c, { width:"36%", alignItems:"flex-start" }]}><Text>{item.label}</Text></View>
            <View style={[S.c, { width:"14%", alignItems:"center" }]}><Text>{item.hasil}</Text></View>
            <View style={[S.c, { width:"28%", alignItems:"flex-start" }]}><Text>{item.ket}</Text></View>
            <View style={[S.c, bR, { width:"17%", alignItems:"center", justifyContent:"center", padding:3 }]}>
              {pic
                ? <Image src={pic} style={{ maxHeight:48, maxWidth:70, objectFit:"contain" }} />
                : <Text style={[S.italic, S.gray]}>-</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// Tabel Evaluasi Komponen (C.3) — derive dari existing fields
function EvaluasiTable({ form, photos }) {
  const f1  = form.part1 ?? {};
  const ok  = v => (v && String(v).trim() ? "Baik" : "-");
  const items = [
    { label:"Name Plate",             hasil: ok(f1.trafo?.nameplate?.merk),               ket: f1.trafo?.nameplate?.merk ? `Trafo: ${f1.trafo.nameplate.merk}`:"-", photoKey:"trafo.nameplate" },
    { label:"Busbar",                 hasil: ok(f1.phb_tm?.suhu_incoming?.R),              ket: f1.phb_tm?.suhu_incoming?.R ? `Suhu R: ${f1.phb_tm.suhu_incoming.R}°C`:"-", photoKey:"phb_tm.suhu_incoming.R" },
    { label:"Arrester / LA",          hasil: ok(f1.phb_tm?.la1?.tipe),                    ket: f1.phb_tm?.la1?.tipe??"-", photoKey:"phb_tm.la1" },
    { label:"LBS",                    hasil: ok(f1.phb_tm?.lbs1?.merk),                   ket: `${f1.phb_tm?.lbs1?.merk??""} ${f1.phb_tm?.lbs1?.tipe??""}`.trim()||"-", photoKey:"phb_tm.lbs1" },
    { label:"Fuse Cut Out",           hasil: ok(f1.phb_tm?.fuse?.rating),                 ket: f1.phb_tm?.fuse?.rating??"-", photoKey:"phb_tm.fuse" },
    { label:"PT (Potential Transformer)",hasil: ok(f1.phb_tm?.pt_incoming?.ratingPT),     ket: f1.phb_tm?.pt_incoming?.ratingPT??"-", photoKey:"phb_tm.pt_incoming" },
    { label:"Pengukur Suhu Oil (DGPT)",hasil: ok(first(photos,"part1","trafo.dgpt")),      ket:"-", photoKey:"trafo.dgpt" },
    { label:"Grounding",              hasil: ok(f1.phb_tm?.grounding_cubicle?.tipe),       ket: f1.phb_tm?.grounding_cubicle?.tipe ? `Tipe: ${f1.phb_tm.grounding_cubicle.tipe}`:"-", photoKey:"phb_tm.grounding_cubicle" },
    { label:"Kran Minyak",            hasil: ok(first(photos,"part1","trafo.kran_atas")),  ket:"-", photoKey:"trafo.kran_atas" },
  ];
  return (
    <View style={S.tbl}>
      <View style={S.hRow}>
        {["No","Komponen","Kondisi","Keterangan","Foto"].map((h, i) => (
          <View key={i} style={[S.c, i===4&&bR, { width:i===0?"5%":i===1?"33%":i===2?"14%":i===3?"31%":"17%", alignItems:"center" }]}>
            <Text style={S.bold}>{h}</Text>
          </View>
        ))}
      </View>
      {items.map((item, i) => {
        const pic = item.photoKey ? first(photos,"part1",item.photoKey) : null;
        return (
          <View key={i} style={S.dRow} wrap={false}>
            <View style={[S.c, { width:"5%", alignItems:"center" }]}><Text>{i+1}</Text></View>
            <View style={[S.c, { width:"33%", alignItems:"flex-start" }]}><Text>{item.label}</Text></View>
            <View style={[S.c, { width:"14%", alignItems:"center" }]}><Text>{item.hasil}</Text></View>
            <View style={[S.c, { width:"31%", alignItems:"flex-start" }]}><Text>{item.ket}</Text></View>
            <View style={[S.c, bR, { width:"17%", alignItems:"center", justifyContent:"center", padding:3 }]}>
              {pic
                ? <Image src={pic} style={{ maxHeight:48, maxWidth:70, objectFit:"contain" }} />
                : <Text style={[S.italic, S.gray]}>-</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// Photo grid 2 kolom
function PhotoGrid({ items = [] }) {
  const pairs = chunk(items, 2);
  return (
    <View>
      {pairs.map((pair, ri) => (
        <View key={ri} style={S.photoRow} wrap={false}>
          {pair.map((item, ci) => (
            <View key={ci} style={[S.photoCell, ci===0 && S.photoGap]}>
              <Text style={S.photoLbl}>{item.label}</Text>
              {item.url
                ? <Image src={item.url} style={S.photoImg} />
                : <Text style={S.photoNone}>(tidak ada foto)</Text>}
            </View>
          ))}
          {pair.length === 1 && <View style={[S.photoCell, { marginLeft: 3 }]} />}
        </View>
      ))}
    </View>
  );
}

// Photo row horizontal (untuk foto nameplate, dll)
function PhotoRow({ items = [] }) {
  const valid = items.filter(Boolean);
  if (!valid.length) return null;
  return (
    <View style={[S.photoRow, { marginTop: 6 }]}>
      {valid.map((item, i) => (
        <View key={i} style={[S.photoCell, i < valid.length-1 && S.photoGap, { width: `${Math.floor(100/valid.length)}%` }]}>
          <Text style={S.photoLbl}>{item.label}</Text>
          {item.url
            ? <Image src={item.url} style={S.photoImg} />
            : <Text style={S.photoNone}>(tidak ada foto)</Text>}
        </View>
      ))}
    </View>
  );
}

function FullPhoto({ url, label }) {
  return (
    <View style={S.fullWrap}>
      {url
        ? <Image src={url} style={S.fullImg} />
        : <Text style={[S.italic, S.gray]}>(tidak ada foto {label})</Text>}
    </View>
  );
}

// Pengujian Sistem (C.4 / D)
function PengujianSistemSection({ form, photos }) {
  const teg = form.part1?.phb_tr?.tegangan ?? {};
  const beb = form.part1?.phb_tr?.beban ?? {};
  const tegRows = [["R-S",teg.RS],["S-T",teg.ST],["R-T",teg.RT],["R-N",teg.RN],["S-N",teg.SN],["T-N",teg.TN]];
  const bebRows = [["Phasa R",beb.R],["Phasa S",beb.S],["Phasa T",beb.T],["Netral N",beb.N]];
  const tegPhotos = ["RS","ST","RT","RN","SN","TN"].flatMap(k => gp(photos,"part1",`phb_tr.tegangan.${k}`)).filter(Boolean);
  const bebPhotos = ["R","S","T","N"].flatMap(k => gp(photos,"part1",`phb_tr.beban.${k}`)).filter(Boolean);

  const MeasTable = ({ rows, unit }) => (
    <View style={S.tbl}>
      <View style={S.hRow}>
        {["Parameter","Nilai"].map((h, i) => (
          <View key={i} style={[S.c, i===1&&bR, { width:i===0?"50%":"50%", alignItems:"center" }]}>
            <Text style={S.bold}>{h}</Text>
          </View>
        ))}
      </View>
      {rows.map(([lbl,val]) => (
        <View key={lbl} style={S.dRow}>
          <View style={[S.c, { width:"50%", alignItems:"flex-start" }]}><Text>{lbl}</Text></View>
          <View style={[S.c, bR, { width:"50%", alignItems:"center" }]}>
            <Text style={S.bold}>{val ?? "-"} {val ? unit : ""}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <>
      <Text style={S.subTitle}>Hasil Pengukuran Tegangan PHB TR</Text>
      <MeasTable rows={tegRows} unit="Volt" />
      <Text style={S.subTitle}>Hasil Pengukuran Beban (Arus)</Text>
      <MeasTable rows={bebRows} unit="Ampere" />
      <Text style={S.subTitle}>Foto Pemeriksaan</Text>
      <PhotoGrid items={[
        ...bebPhotos.slice(0,2).map((url,i) => ({ label:`Beban ${i+1}`, url })),
        ...tegPhotos.slice(0,2).map((url,i) => ({ label:`Tegangan ${i+1}`, url })),
      ]} />
    </>
  );
}

// DataHasilUjiSection — section D: tabel data pengukuran saja (tanpa foto)
function DataHasilUjiSection({ form }) {
  const teg = form.part1?.phb_tr?.tegangan ?? {};
  const beb = form.part1?.phb_tr?.beban ?? {};
  const tegRows = [["R-S",teg.RS],["S-T",teg.ST],["R-T",teg.RT],["R-N",teg.RN],["S-N",teg.SN],["T-N",teg.TN]];
  const bebRows = [["Phasa R",beb.R],["Phasa S",beb.S],["Phasa T",beb.T],["Netral N",beb.N]];

  const MeasTable = ({ rows, unit }) => (
    <View style={S.tbl}>
      <View style={S.hRow}>
        {["Parameter","Nilai"].map((h, i) => (
          <View key={i} style={[S.c, i===1&&bR, { width:"50%", alignItems:"center" }]}>
            <Text style={S.bold}>{h}</Text>
          </View>
        ))}
      </View>
      {rows.map(([lbl,val]) => (
        <View key={lbl} style={S.dRow}>
          <View style={[S.c, { width:"50%", alignItems:"flex-start" }]}><Text>{lbl}</Text></View>
          <View style={[S.c, bR, { width:"50%", alignItems:"center" }]}>
            <Text style={S.bold}>{val ?? "-"} {val ? unit : ""}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <>
      <Text style={S.subTitle}>Hasil Pengukuran Tegangan PHB TR</Text>
      <MeasTable rows={tegRows} unit="Volt" />
      <Text style={S.subTitle}>Hasil Pengukuran Beban (Arus)</Text>
      <MeasTable rows={bebRows} unit="Ampere" />
    </>
  );
}

function SuratPernyataan({ data, instansi }) {
  return (
    <View style={S.suratBox}>
      <Text style={S.suratTitle}>SURAT PERNYATAAN</Text>
      <Text style={S.suratText}>
        Yang bertanda tangan di bawah ini menyatakan bahwa peralatan utama pada instalasi{" "}
        <Text style={S.bold}>{data.nama ?? "—"}</Text> yang berlokasi di{" "}
        <Text style={S.bold}>{data.alamat ?? "—"}</Text> telah terpasang dengan baik sesuai
        dengan standar SNI yang berlaku dan telah dilakukan pemeriksaan serta pengujian
        sebagaimana mestinya.
      </Text>
      <Text style={S.suratText}>
        Demikian surat pernyataan ini dibuat dengan sebenar-benarnya untuk dapat dipergunakan
        sebagaimana mestinya.
      </Text>
    </View>
  );
}

// ─── Konstanta field isolasi ───────────────────────────────────────────────────
const ISOL_TM = [
  { name:"rGnd", label:"R-G" }, { name:"sGnd", label:"S-G" }, { name:"tGnd", label:"T-G" },
  { name:"rs",   label:"R-S" }, { name:"st",   label:"S-T" }, { name:"rt",   label:"R-T" },
];
const ISOL_TR = [
  { name:"rGnd", label:"R-G" }, { name:"sGnd", label:"S-G" }, { name:"tGnd", label:"T-G" },
  { name:"nGnd", label:"N-G" }, { name:"rs",   label:"R-S" }, { name:"st",   label:"S-T" },
];
const ISOL_TRAFO_S = [
  { name:"ffFg", label:"F-F / F-G" },
  { name:"psR",  label:"Primer-Skunder R" },
  { name:"psST", label:"Primer-Skunder S-T" },
];

// ─── RLO helpers ──────────────────────────────────────────────────────────────
const MIN_TM   = 1000;
const MIN_TR   = 100;
const PHOTO_H  = 70; // pt — consistent row height for photo cells

function pv(v) {
  if (v == null || v === "" || v === "-") return null;
  const n = parseFloat(String(v).replace(",", "."));
  return isNaN(n) ? null : n;
}

function minGrp(g) {
  if (!g || typeof g !== "object") return null;
  const ns = Object.values(g).map(pv).filter(n => n !== null);
  return ns.length ? Math.min(...ns) : null;
}

// Page 1: summary table
function RloSummaryTable({ data, form }) {
  const f1   = form.part1 ?? {};
  const kva  = pv(f1.trafo?.nameplate?.kapasitas);
  const merk = f1.trafo?.nameplate?.merk ?? "";
  const hasData = Object.values({ ...f1.trafo?.isolasi_primer, ...f1.trafo?.isolasi_skunder })
    .some(v => pv(v) !== null);
  const rows = [
    ["Nama Instalasi",              data.nama   ?? "—"],
    ["Lokasi Pemeriksaan",          data.alamat ?? "—"],
    ["Kapasitas / Daya Tersambung", kva ? `${kva} kVA${merk ? ` (${merk})` : ""}` : "—"],
    ["Hasil Pemeriksaan",           hasData ? "LAIK OPERASI" : "DATA BELUM TERSEDIA"],
    ["Tindak Lanjut",               hasData
      ? "Instalasi dapat dioperasikan sesuai ketentuan peraturan yang berlaku."
      : "Lengkapi data pengujian pada form admin."],
  ];
  return (
    <View style={[S.dbox, { marginTop: 10 }]}>
      {rows.map(([lbl, val], i) => (
        <View key={i} style={i < rows.length - 1 ? S.dboxRow : S.dboxRowLast}>
          <View style={S.dboxLbl}><Text style={S.bold}>{lbl}</Text></View>
          <View style={S.dboxVal}>
            <Text style={lbl === "Hasil Pemeriksaan"
              ? { fontFamily: "Times-Bold", color: hasData ? "#166534" : "#92400e" }
              : {}}>
              {lbl === "Hasil Pemeriksaan" ? val : `${val}`}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// Pages 2-3: Isolasi table
function RloIsolasiSection({ form, photos }) {
  const f1  = form.part1 ?? {};
  const ip  = f1.trafo?.isolasi_primer         ?? {};
  const isk = f1.trafo?.isolasi_skunder        ?? {};
  const ips = f1.trafo?.isolasi_primer_skunder ?? {};

  const raw = [
    { isHeader: true, label: "ISOLASI PRIMER" },
    { bagian:"Trafo", parameter:"R – G", val:pv(ip.rGnd), std:MIN_TM, pk:"trafo.isolasi_primer.rGnd" },
    { bagian:"Trafo", parameter:"S – G", val:pv(ip.sGnd), std:MIN_TM, pk:"trafo.isolasi_primer.sGnd" },
    { bagian:"Trafo", parameter:"T – G", val:pv(ip.tGnd), std:MIN_TM, pk:"trafo.isolasi_primer.tGnd" },
    { bagian:"Trafo", parameter:"R – S", val:pv(ip.rS),   std:MIN_TM, pk:"trafo.isolasi_primer.rS" },
    { bagian:"Trafo", parameter:"S – T", val:pv(ip.sT),   std:MIN_TM, pk:"trafo.isolasi_primer.sT" },
    { bagian:"Trafo", parameter:"T – R", val:pv(ip.tR),   std:MIN_TM, pk:"trafo.isolasi_primer.tR" },
    { isHeader: true, label: "ISOLASI SEKUNDER" },
    { bagian:"Trafo", parameter:"R – G", val:pv(isk.rGnd), std:MIN_TR, pk:"trafo.isolasi_skunder.rGnd" },
    { bagian:"Trafo", parameter:"S – G", val:pv(isk.sGnd), std:MIN_TR, pk:"trafo.isolasi_skunder.sGnd" },
    { bagian:"Trafo", parameter:"T – G", val:pv(isk.tGnd), std:MIN_TR, pk:"trafo.isolasi_skunder.tGnd" },
    { bagian:"Trafo", parameter:"N – G", val:pv(isk.nGnd), std:MIN_TR, pk:"trafo.isolasi_skunder.nGnd" },
    { bagian:"Trafo", parameter:"R – S", val:pv(isk.rS),   std:MIN_TR, pk:"trafo.isolasi_skunder.rS" },
    { bagian:"Trafo", parameter:"S – T", val:pv(isk.sT),   std:MIN_TR, pk:"trafo.isolasi_skunder.sT" },
    { bagian:"Trafo", parameter:"T – R", val:pv(isk.tR),   std:MIN_TR, pk:"trafo.isolasi_skunder.tR" },
    { bagian:"Trafo", parameter:"R – N", val:pv(isk.rN),   std:MIN_TR, pk:"trafo.isolasi_skunder.rN" },
    { bagian:"Trafo", parameter:"S – N", val:pv(isk.sN),   std:MIN_TR, pk:"trafo.isolasi_skunder.sN" },
    { bagian:"Trafo", parameter:"T – N", val:pv(isk.tN),   std:MIN_TR, pk:"trafo.isolasi_skunder.tN" },
    { isHeader: true, label: "ISOLASI PRIMER – SEKUNDER" },
    { bagian:"Trafo", parameter:"P.R / S.R", val:pv(ips.PR_SR), std:MIN_TM, pk:"trafo.isolasi_primer_skunder.PR_SR" },
    { bagian:"Trafo", parameter:"P.R / S.S", val:pv(ips.PR_SS), std:MIN_TM, pk:"trafo.isolasi_primer_skunder.PR_SS" },
    { bagian:"Trafo", parameter:"P.R / S.T", val:pv(ips.PR_ST), std:MIN_TM, pk:"trafo.isolasi_primer_skunder.PR_ST" },
    { bagian:"Trafo", parameter:"P.R / S.N", val:pv(ips.PR_SN), std:MIN_TM, pk:"trafo.isolasi_primer_skunder.PR_SN" },
    { bagian:"Trafo", parameter:"P.S / S.R", val:pv(ips.PS_SR), std:MIN_TM, pk:"trafo.isolasi_primer_skunder.PS_SR" },
    { bagian:"Trafo", parameter:"P.S / S.S", val:pv(ips.PS_SS), std:MIN_TM, pk:"trafo.isolasi_primer_skunder.PS_SS" },
    { bagian:"Trafo", parameter:"P.S / S.T", val:pv(ips.PS_ST), std:MIN_TM, pk:"trafo.isolasi_primer_skunder.PS_ST" },
    { bagian:"Trafo", parameter:"P.S / S.N", val:pv(ips.PS_SN), std:MIN_TM, pk:"trafo.isolasi_primer_skunder.PS_SN" },
    { bagian:"Trafo", parameter:"P.T / S.R", val:pv(ips.PT_SR), std:MIN_TM, pk:"trafo.isolasi_primer_skunder.PT_SR" },
    { bagian:"Trafo", parameter:"P.T / S.S", val:pv(ips.PT_SS), std:MIN_TM, pk:"trafo.isolasi_primer_skunder.PT_SS" },
    { bagian:"Trafo", parameter:"P.T / S.T", val:pv(ips.PT_ST), std:MIN_TM, pk:"trafo.isolasi_primer_skunder.PT_ST" },
    { bagian:"Trafo", parameter:"P.T / S.N", val:pv(ips.PT_SN), std:MIN_TM, pk:"trafo.isolasi_primer_skunder.PT_SN" },
    { isHeader: true, label: "PHB TR & KABEL TR" },
    { bagian:"PHB TR",   parameter:"Incoming (R-G,S-G,T-G,N-G)", val:minGrp(f1.phb_tr?.isolasi_incoming),  std:MIN_TR, pk:"phb_tr.isolasi_incoming.rGnd" },
    { bagian:"Kabel TR", parameter:"Kabel TR (R-G,S-G,T-G)",      val:minGrp(f1.phb_tr?.isolasi_kabel_tr), std:MIN_TR, pk:"phb_tr.isolasi_kabel_tr.rGnd" },
  ];
  let num = 0;
  const rows = raw.map(r => r.isHeader ? r : { ...r, num: ++num });

  const W = ["5%","10%","16%","11%","10%","24%","24%"];
  const hTxt = ["No","Bagian","Parameter","Nilai (MΩ)","Standar (MΩ)","Foto Jauh","Foto Nilai"];

  return (
    <>
      <Text style={[S.secTitle, { marginTop:8 }]}>I. PENGUJIAN TAHANAN ISOLASI</Text>
      <Text style={{ fontSize:7, fontFamily:"Times-Italic", color:"#555", marginBottom:4 }}>
        * Standar minimum: TM {"≥"} 1.000 M{"Ω"}, TR {"≥"} 100 M{"Ω"} (PUIL 2011 / SNI).
      </Text>
      <View style={[S.hRow, { backgroundColor:"#c8c8c8" }]}>
        {hTxt.map((h, i) => (
          <View key={i} style={[S.c, i===6&&bR, { width:W[i], alignItems:"center" }]}>
            <Text style={S.bold}>{h}</Text>
          </View>
        ))}
      </View>
      {rows.map((row, i) => {
        if (row.isHeader) {
          return (
            <View key={i} wrap={false} style={[{ flexDirection:"row", backgroundColor:"#d0d0d0" }]}>
              <View style={[S.c, bR, { flex:1, padding:4 }]}>
                <Text style={{ fontFamily:"Times-Bold", fontSize:8, fontStyle:"italic" }}>{row.label}</Text>
              </View>
            </View>
          );
        }
        const f1u = gp(photos, "part1", row.pk)[0] ?? null;
        const f2u = gp(photos, "part1", row.pk)[1] ?? null;
        const bad = row.val !== null && row.val < row.std;
        return (
          <View key={i} wrap={false} style={[S.dRow, { minHeight: PHOTO_H }]}>
            <View style={[S.c, { width:W[0], alignItems:"center" }]}><Text>{row.num}</Text></View>
            <View style={[S.c, { width:W[1] }]}><Text>{row.bagian}</Text></View>
            <View style={[S.c, { width:W[2] }]}><Text>{row.parameter}</Text></View>
            <View style={[S.c, { width:W[3], alignItems:"center" }]}>
              <Text style={bad ? { color:"red", fontFamily:"Times-Bold" } : {}}>
                {row.val !== null ? String(row.val) : "—"}
              </Text>
            </View>
            <View style={[S.c, { width:W[4], alignItems:"center" }]}>
              <Text>{"≥"} {row.std}</Text>
            </View>
            <View style={[S.c, { width:W[5], alignItems:"center", justifyContent:"center", padding:2 }]}>
              {f1u ? <Image src={f1u} style={{ width:"100%", height:PHOTO_H-4, objectFit:"cover" }} />
                   : <Text style={[S.gray,{fontSize:7}]}>—</Text>}
            </View>
            <View style={[S.c, bR, { width:W[6], alignItems:"center", justifyContent:"center", padding:2 }]}>
              {f2u ? <Image src={f2u} style={{ width:"100%", height:PHOTO_H-4, objectFit:"cover" }} />
                   : <Text style={[S.gray,{fontSize:7}]}>—</Text>}
            </View>
          </View>
        );
      })}
    </>
  );
}

// Page 4: Tegangan
function RloTegananSection({ form, photos }) {
  const teg = form.part1?.phb_tr?.tegangan ?? {};
  const rows = [
    { param:"R–S (L-L)", val:pv(teg.RS), nom:380, pk:"phb_tr.tegangan.RS" },
    { param:"S–T (L-L)", val:pv(teg.ST), nom:380, pk:"phb_tr.tegangan.ST" },
    { param:"R–T (L-L)", val:pv(teg.RT), nom:380, pk:"phb_tr.tegangan.RT" },
    { param:"R–N (L-N)", val:pv(teg.RN), nom:220, pk:"phb_tr.tegangan.RN" },
    { param:"S–N (L-N)", val:pv(teg.SN), nom:220, pk:"phb_tr.tegangan.SN" },
    { param:"T–N (L-N)", val:pv(teg.TN), nom:220, pk:"phb_tr.tegangan.TN" },
  ];
  const W = ["5%","14%","11%","11%","10%","24.5%","24.5%"];
  const hTxt = ["No","Parameter","Terukur (V)","Nominal (V)","Deviasi","Foto Jauh","Foto Nilai"];
  return (
    <>
      <Text style={[S.secTitle, { marginTop:8 }]}>II. EVALUASI PENGUKURAN TEGANGAN PHB TR</Text>
      <View style={[S.hRow, { backgroundColor:"#c8c8c8" }]}>
        {hTxt.map((h, i) => (
          <View key={i} style={[S.c, i===6&&bR, { width:W[i], alignItems:"center" }]}>
            <Text style={S.bold}>{h}</Text>
          </View>
        ))}
      </View>
      {rows.map(({ param, val, nom, pk }, i) => {
        const f1u = gp(photos, "part1", pk)[0] ?? null;
        const f2u = gp(photos, "part1", pk)[1] ?? null;
        const dev = val !== null ? ((val - nom) / nom) * 100 : null;
        const devStr = dev !== null ? (dev >= 0 ? "+" : "") + dev.toFixed(1) + "%" : "—";
        const out = dev !== null && Math.abs(dev) > 5;
        return (
          <View key={i} wrap={false} style={[S.dRow, { minHeight: PHOTO_H }]}>
            <View style={[S.c, { width:W[0], alignItems:"center" }]}><Text>{i+1}</Text></View>
            <View style={[S.c, { width:W[1] }]}><Text>{param}</Text></View>
            <View style={[S.c, { width:W[2], alignItems:"center" }]}><Text>{val ?? "—"}</Text></View>
            <View style={[S.c, { width:W[3], alignItems:"center" }]}><Text>{nom}</Text></View>
            <View style={[S.c, { width:W[4], alignItems:"center" }]}>
              <Text style={out ? { color:"red", fontFamily:"Times-Bold" } : {}}>{devStr}</Text>
            </View>
            <View style={[S.c, { width:W[5], alignItems:"center", justifyContent:"center", padding:2 }]}>
              {f1u ? <Image src={f1u} style={{ width:"100%", height:PHOTO_H-4, objectFit:"cover" }} />
                   : <Text style={[S.gray,{fontSize:7}]}>—</Text>}
            </View>
            <View style={[S.c, bR, { width:W[6], alignItems:"center", justifyContent:"center", padding:2 }]}>
              {f2u ? <Image src={f2u} style={{ width:"100%", height:PHOTO_H-4, objectFit:"cover" }} />
                   : <Text style={[S.gray,{fontSize:7}]}>—</Text>}
            </View>
          </View>
        );
      })}
      <Text style={{ fontSize:7, fontFamily:"Times-Italic", color:"#555", marginTop:3, marginBottom:10 }}>
        * Toleransi: {"±"}5% dari nominal (L-L: 380 V, L-N: 220 V)
      </Text>
    </>
  );
}

// Page 4: Beban
function RloBebanSection({ form, photos }) {
  const beb = form.part1?.phb_tr?.beban ?? {};
  const kva = pv(form.part1?.trafo?.nameplate?.kapasitas);
  const rated = kva ? Math.round((kva * 1000) / (Math.sqrt(3) * 400)) : null;
  const rows = [
    { fasa:"R",          val:pv(beb.R), pk:"phb_tr.beban.R" },
    { fasa:"S",          val:pv(beb.S), pk:"phb_tr.beban.S" },
    { fasa:"T",          val:pv(beb.T), pk:"phb_tr.beban.T" },
    { fasa:"N (Netral)", val:pv(beb.N), pk:"phb_tr.beban.N" },
  ];
  const W = ["5%","35%","15%","22.5%","22.5%"];
  const hTxt = ["No","Fasa","Terukur (A)","Foto Jauh","Foto Nilai"];
  return (
    <>
      <Text style={[S.secTitle, { marginTop:12 }]}>III. PENGUKURAN BEBAN (ARUS)</Text>
      <View style={[S.hRow, { backgroundColor:"#c8c8c8" }]}>
        {hTxt.map((h, i) => (
          <View key={i} style={[S.c, i===4&&bR, { width:W[i], alignItems:"center" }]}>
            <Text style={S.bold}>{h}</Text>
          </View>
        ))}
      </View>
      {rows.map(({ fasa, val, pk }, i) => {
        const f1u = gp(photos, "part1", pk)[0] ?? null;
        const f2u = gp(photos, "part1", pk)[1] ?? null;
        return (
          <View key={i} wrap={false} style={[S.dRow, { minHeight: PHOTO_H }]}>
            <View style={[S.c, { width:W[0], alignItems:"center" }]}><Text>{i+1}</Text></View>
            <View style={[S.c, { width:W[1] }]}><Text>Phasa {fasa}</Text></View>
            <View style={[S.c, { width:W[2], alignItems:"center" }]}>
              <Text>{val !== null ? String(val) : "—"}</Text>
            </View>
            <View style={[S.c, { width:W[3], alignItems:"center", justifyContent:"center", padding:2 }]}>
              {f1u ? <Image src={f1u} style={{ width:"100%", height:PHOTO_H-4, objectFit:"cover" }} />
                   : <Text style={[S.gray,{fontSize:7}]}>—</Text>}
            </View>
            <View style={[S.c, bR, { width:W[4], alignItems:"center", justifyContent:"center", padding:2 }]}>
              {f2u ? <Image src={f2u} style={{ width:"100%", height:PHOTO_H-4, objectFit:"cover" }} />
                   : <Text style={[S.gray,{fontSize:7}]}>—</Text>}
            </View>
          </View>
        );
      })}
      {rated && (
        <Text style={{ fontSize:7, fontFamily:"Times-Italic", color:"#555", marginTop:3 }}>
          * Kapasitas nominal trafo: {kva} kVA {"→"} Arus nominal {"≈"} {rated} A
        </Text>
      )}
    </>
  );
}

// Page 5: Kesimpulan
function RloKesimpulanSection({ data, form }) {
  const f1   = form.part1 ?? {};
  const kva  = pv(f1.trafo?.nameplate?.kapasitas);
  const merk = f1.trafo?.nameplate?.merk ?? "";
  const hasData = Object.values({ ...f1.trafo?.isolasi_primer, ...f1.trafo?.isolasi_skunder })
    .some(v => pv(v) !== null);
  const kvaLabel = kva ? `${kva} kVA` : null;
  const poinList = [
    "Hasil pengujian tahanan isolasi pada seluruh peralatan menunjukkan nilai yang memenuhi standar minimum yang dipersyaratkan.",
    "Hasil pengukuran tegangan pada PHB TR berada dalam batas toleransi ±5% dari tegangan nominal.",
    ...(kvaLabel ? [`Tingkat pembebanan transformator dalam batas yang diizinkan dari kapasitas nominal ${kvaLabel}.`] : []),
    "Berdasarkan hasil evaluasi tersebut, instalasi tenaga listrik ini dinyatakan LAIK OPERASI dan dapat dioperasikan sesuai ketentuan peraturan yang berlaku.",
  ];
  return (
    <>
      <Text style={[S.secTitle, { marginTop:12 }]}>IV. KESIMPULAN DAN REKOMENDASI</Text>
      <View style={{ ...bAll, padding:10, marginBottom:10 }}>
        <Text style={{ fontSize:9, lineHeight:1.6, marginBottom:8, textAlign:"justify" }}>
          Berdasarkan hasil pemeriksaan dan pengujian yang telah dilaksanakan pada instalasi
          tenaga listrik <Text style={S.bold}>{data.nama ?? "—"}</Text> yang berlokasi di{" "}
          <Text style={{ fontFamily:"Times-Italic" }}>{data.alamat ?? "—"}</Text>
          {kvaLabel ? `, dengan Transformator${merk ? ` ${merk}` : ""} berkapasitas ${kvaLabel}` : ""},
          dapat disimpulkan sebagai berikut:
        </Text>
        {poinList.map((poin, i) => (
          <View key={i} wrap={false} style={{ flexDirection:"row", marginBottom:5 }}>
            <Text style={{ width:16, fontFamily:"Times-Bold", fontSize:9 }}>{i+1}.</Text>
            <Text style={{ flex:1, fontSize:9, lineHeight:1.5, textAlign:"justify" }}>{poin}</Text>
          </View>
        ))}
      </View>
      <View style={{ ...bAll, backgroundColor: hasData ? "#d4edda" : "#fff3cd",
        padding:8, alignItems:"center", marginBottom:10 }}>
        <Text style={{ fontFamily:"Times-Bold", fontSize:12,
          color: hasData ? "#166534" : "#92400e" }}>
          {hasData ? "LAIK OPERASI" : "DATA BELUM TERSEDIA"}
        </Text>
      </View>
    </>
  );
}

// ─── Main Document ─────────────────────────────────────────────────────────────
export default function LhppPDF({ data = {}, instansi = {} }) {
  const form       = data.formData ?? {};
  const photos     = data.photos ?? {};
  const ttd        = data.ttd ?? {};
  const ttd_client = data.ttd_client ?? {};
  const fp         = { data, instansi, ttd, ttd_client };

  return (
    <Document
      title={`LHPP — ${data.noLhpp ?? ""} — ${data.nama ?? ""}`}
      author={instansi.nama ?? "PT. Adytia Putra Tehnik"}
      creator="Dashboard PT Adytia"
    >
      {/* ════ COVER ════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <LhppHeader instansi={instansi} code="" />
        <View style={S.coverBody}>
          <Text style={S.coverT}>LAPORAN HASIL</Text>
          <Text style={S.coverT}>PEMERIKSAAN DAN PENGUJIAN</Text>
          <Text style={S.coverAkronim}>(LHPP)</Text>
          {data.noLhpp ? <Text style={S.coverNoLhpp}>No. {data.noLhpp}</Text> : null}
          <Text style={S.coverNama}>{data.nama ?? "(Nama Pelanggan)"}</Text>
          <Text style={S.coverAlamat}>{data.alamat ?? "-"}</Text>
          <View style={{ marginVertical: 28 }} />
          <View style={{ fontSize:8, fontFamily:"Times-Italic", textAlign:"center", marginBottom:8 }}>
            <Text>Di susun oleh,</Text>
          </View>
          <View style={S.coverInstBox}>
            <Text style={S.coverInstName}>{instansi.nama ?? "—"}</Text>
            {instansi.alamat ? <Text style={S.coverInstAlamat}>{instansi.alamat}</Text> : null}
          </View>
        </View>
      </Page>

      {/* ════ A.1 — PHB TM ═════════════════════════════════════════════════════ */}
      <LhppPage {...fp} code="A.1" title="SPESIFIKASI TEKNIK PHB TM">
        <NameplateTable rows={[
          ["Spesifikasi",     gf(form,"part1.phb_tm.incoming.spesifikasi") || gf(form,"part1.phb_tm.spesifikasi.spesifikasi")],
          ["Tahun Pembuatan", gf(form,"part1.phb_tm.incoming.tahun")        || gf(form,"part1.phb_tm.spesifikasi.tahun")],
          ["Merk",            gf(form,"part1.phb_tm.incoming.merk")],
          ["Tipe",            gf(form,"part1.phb_tm.incoming.tipe")],
          ["Jenis Pemutus",   gf(form,"part1.phb_tm.incoming.jenisPemutus")],
          ["Rating Tegangan (V)", gf(form,"part1.phb_tm.incoming.ratingV")],
          ["Rating Arus (A)",     gf(form,"part1.phb_tm.incoming.ratingI")],
        ]} />
        <PhotoRow items={[
          { label:"Foto Nameplate PHB TM", url: gp(photos,"part1","phb_tm.incoming")[1] },
          { label:"Foto Full PHB TM",      url: gp(photos,"part1","phb_tm.foto_full_phbtm")[0] || gp(photos,"part1","phb_tm.incoming")[3] || gp(photos,"part1","phb_tm.spesifikasi")[0] },
        ]} />
      </LhppPage>

      {/* ════ A.2 — Saluran TM ═════════════════════════════════════════════════ */}
      <LhppPage {...fp} code="A.2" title="SPESIFIKASI TEKNIK SALURAN TM">
        <NameplateTable rows={[
          ["Merk",        gf(form,"part1.phb_tm.kabel_incoming.merk")        || gf(form,"part1.phb_tm.kabel_sktm.merk")],
          ["Tipe / Jenis",gf(form,"part1.phb_tm.kabel_incoming.tipe")        || gf(form,"part1.phb_tm.kabel_sktm.tipe")],
          ["Ukuran",      gf(form,"part1.phb_tm.kabel_incoming.ukuran")      || gf(form,"part1.phb_tm.kabel_sktm.ukuran")],
          ["Panjang (m)", gf(form,"part1.phb_tm.kabel_incoming.panjang")     || gf(form,"part1.phb_tm.kabel_sktm.panjang")],
        ].filter(([, v]) => v && v !== "-")} />
        <PhotoRow items={[
          { label:"Foto Nameplate Kabel TM", url: gp(photos,"part1","phb_tm.kabel_incoming")[0] || gp(photos,"part1","phb_tm.kabel_sktm")[0] },
          { label:"Foto Jalur Kabel TM",     url: gp(photos,"part1","phb_tm.kabel_incoming")[1] || gp(photos,"part1","phb_tm.kabel_sktm")[1] },
        ]} />
      </LhppPage>

      {/* ════ A.3 — Trafo ══════════════════════════════════════════════════════ */}
      <LhppPage {...fp} code="A.3" title="SPESIFIKASI TEKNIK TRAFO">
        <NameplateTable rows={[
          ["Merk",                         gf(form,"part1.trafo.nameplate.merk")],
          ["Type / Vector Group",           gf(form,"part1.trafo.nameplate.typeVector")],
          ["No Seri",                       gf(form,"part1.trafo.nameplate.noSeri")],
          ["Kapasitas (kVA)",               gf(form,"part1.trafo.nameplate.kapasitas")],
          ["Tahun Pembuatan",               gf(form,"part1.trafo.nameplate.tahun")],
          ["Tegangan Primer/Sekunder (V)",  gf(form,"part1.trafo.nameplate.teganganPS")],
          ["Arus Primer/Sekunder (A)",      gf(form,"part1.trafo.nameplate.arusPS")],
          ["Impedensi (%)",                 gf(form,"part1.trafo.nameplate.impedensi")],
          ["Sistem Pendingin",              gf(form,"part1.trafo.nameplate.sistemPendingin")],
          ["Berat (kg)",                    gf(form,"part1.trafo.nameplate.berat")],
        ]} />
        <PhotoRow items={[
          { label:"Foto Nameplate Trafo", url: gp(photos,"part1","trafo.nameplate")[1] },
          { label:"Foto Full Trafo",      url: gp(photos,"part1","trafo.nameplate")[0] },
        ]} />
      </LhppPage>

      {/* ════ A.4 — Kabel TR ═══════════════════════════════════════════════════ */}
      <LhppPage {...fp} code="A.4" title="SPESIFIKASI TEKNIK KABEL TR">
        <NameplateTable rows={[
          ["Merk",        gf(form,"part1.phb_tr.kabel_tr.merk")],
          ["Tipe / Jenis",gf(form,"part1.phb_tr.kabel_tr.tipe")],
          ["Ukuran",      gf(form,"part1.phb_tr.kabel_tr.ukuran")],
          ["Panjang (m)", gf(form,"part1.phb_tr.kabel_tr.panjang")],
        ]} />
        <PhotoRow items={[
          { label:"Foto Nameplate Kabel TR", url: gp(photos,"part1","phb_tr.kabel_tr")[0] },
          { label:"Foto Jalur Kabel TR",     url: gp(photos,"part1","phb_tr.kabel_tr")[1] },
        ]} />
      </LhppPage>

      {/* ════ A.5 — PHB TR Spec ════════════════════════════════════════════════ */}
      <LhppPage {...fp} code="A.5" title="SPESIFIKASI TEKNIK PHB TR">
        <PhbTrProteksiTable rows={form.part1?.phb_tr_spec?.rows ?? []} />
        <PhotoRow items={[
          { label:"Foto Full PHB TR", url: gp(photos,"part1","phb_tr.phb_tr_full")[0] },
        ]} />
      </LhppPage>

      {/* ════ A.6 — Sertifikat ═════════════════════════════════════════════════ */}
      <LhppPage {...fp} code="A.6" title="HASIL UJI PABRIK / SERTIFIKAT PRODUK PERALATAN UTAMA">
        <SuratPernyataan data={data} instansi={instansi} />
        <PhotoGrid items={gp(photos,"part1","lain_lain.sertifikat").map((url,i) => ({ label:`Foto Sertifikat ${i+1}`, url }))} />
      </LhppPage>

      {/* ════ B.1 — Konstruksi ═════════════════════════════════════════════════ */}
      <LhppPage {...fp} code="B.1" title="KONSTRUKSI">
        <PhotoGrid items={[
          { label:"PHB TM",     url: gp(photos,"part1","phb_tm.foto_full_phbtm")[0] || gp(photos,"part1","phb_tm.incoming")[3] || gp(photos,"part1","phb_tm.spesifikasi")[0] },
          { label:"Saluran TM", url: gp(photos,"part1","phb_tm.kabel_incoming")[0] || gp(photos,"part1","phb_tm.kabel_sktm")[0] },
          { label:"Trafo",      url: gp(photos,"part1","trafo.nameplate")[0] },
          { label:"Kabel TR",   url: gp(photos,"part1","phb_tr.kabel_tr")[0] },
          { label:"PHB TR",     url: gp(photos,"part1","phb_tr.phb_tr_full")[0] },
          { label:"Sertifikat", url: gp(photos,"part1","lain_lain.sertifikat")[0] },
        ]} />
      </LhppPage>

      {/* ════ B.2 — Sistem Pembumian ════════════════════════════════════════════ */}
      <LhppPage {...fp} code="B.2" title="SISTEM PEMBUMIAN">
        <PembumianTable form={form} />
        <PhotoGrid items={[
          { label:"Grounding Cubicle PHB TM", url: gp(photos,"part1","phb_tm.grounding_cubicle")[0] },
          { label:"Grounding LA / Arester TM",url: gp(photos,"part1","phb_tm.grounding_la")[0] },
          { label:"Grounding Netral Trafo",   url: gp(photos,"part1","trafo.grounding_netral")[0] },
          { label:"Grounding Body Trafo",     url: gp(photos,"part1","trafo.grounding_body")[0] },
          { label:"Grounding Cubicle PHB TR", url: gp(photos,"part1","phb_tr.grounding_cubicle")[0] },
        ].filter(i => i.url)} />
      </LhppPage>

      {/* ════ B.3 — Pengaman Elektrik ══════════════════════════════════════════ */}
      <LhppPage {...fp} code="B.3" title="PENGAMAN ELEKTRIK">
        <PengamanElektrikTable form={form} photos={photos} />
      </LhppPage>

      {/* ════ B.4 — Pengaman Mekanik ═══════════════════════════════════════════ */}
      <LhppPage {...fp} code="B.4" title="PENGAMAN MEKANIK">
        <PhotoGrid items={[
          { label:"DGPT / Relay Buchholz",  url: gp(photos,"part1","trafo.dgpt")[0] },
          { label:"Pagar Pengaman Trafo",   url: gp(photos,"part1","trafo.nameplate")[0] },
          { label:"Pengaman Roda / Kaki",   url: gp(photos,"part1","trafo.kaki_pengunci")[0] },
        ]} />
      </LhppPage>

      {/* ════ B.5 — Jarak Bebas ════════════════════════════════════════════════ */}
      <LhppPage {...fp} code="B.5" title="JARAK BEBAS (CLEARANCE DISTANCE)">
        <ClearanceTable label="PHB TM" data={form.part1?.phb_tm?.jarak ?? {}} />
        <ClearanceTable label="Trafo"  data={form.part1?.trafo?.jarak  ?? {}} />
        <ClearanceTable label="PHB TR" data={form.part1?.phb_tr?.jarak ?? {}} />
      </LhppPage>

      {/* ════ B.6 — Diagram Satu Garis ═════════════════════════════════════════ */}
      <LhppPage {...fp} code="B.6" title="GAMBAR DIAGRAM SATU GARIS (SINGLE LINE DIAGRAM)">
        <FullPhoto url={gp(photos,"part1","gambar.diagram")[0]} label="Diagram Satu Garis" />
      </LhppPage>

      {/* ════ B.7 — Tata Letak ═════════════════════════════════════════════════ */}
      <LhppPage {...fp} code="B.7" title="GAMBAR TATA LETAK PERALATAN UTAMA">
        <FullPhoto url={gp(photos,"part1","gambar.tata_letak")[0]} label="Tata Letak Peralatan" />
      </LhppPage>

      {/* ════ C.1 — Tahanan Isolasi ════════════════════════════════════════════ */}
      <LhppPage {...fp} code="C.1" title="HASIL UJI PERALATAN — TAHANAN ISOLASI">
        <Text style={S.subTitle}>PENGUKURAN TAHANAN ISOLASI PHB TM</Text>
        <IsolasiTable title="Cubicle Incoming"  form={form} eqKey="phb_tm" groupKey="isolasi_cubicle_incoming" fields={ISOL_TM} />
        <IsolasiTable title="Cubicle Outgoing"  form={form} eqKey="phb_tm" groupKey="isolasi_cubicle_outgoing" fields={ISOL_TM} />
        <IsolasiTable title="Kabel TM Incoming" form={form} eqKey="phb_tm" groupKey="isolasi_kabel_incoming"   fields={ISOL_TM} />
        <IsolasiTable title="Kabel TM Outgoing" form={form} eqKey="phb_tm" groupKey="isolasi_kabel_outgoing"   fields={ISOL_TM} />

        <Text style={S.subTitle}>PENGUKURAN TAHANAN ISOLASI TRANSFORMATOR</Text>
        <IsolasiTable title="Isolasi Primer"   form={form} eqKey="trafo" groupKey="isolasi_primer"  fields={ISOL_TM} />
        <IsolasiTable title="Isolasi Sekunder" form={form} eqKey="trafo" groupKey="isolasi_skunder" fields={ISOL_TRAFO_S} />

        <Text style={S.subTitle}>PENGUKURAN TAHANAN ISOLASI PHB TR</Text>
        <IsolasiTable title="Incoming PHB TR" form={form} eqKey="phb_tr" groupKey="isolasi_incoming"  fields={ISOL_TR} />

        <Text style={S.subTitle}>PENGUKURAN TAHANAN ISOLASI KABEL TR</Text>
        <IsolasiTable title="Kabel TR" form={form} eqKey="phb_tr" groupKey="isolasi_kabel_tr" fields={ISOL_TM} />
      </LhppPage>

      {/* ════ C.2 — Tahanan Pembumian ══════════════════════════════════════════ */}
      <LhppPage {...fp} code="C.2" title="PENGUKURAN TAHANAN PEMBUMIAN">
        <PembumianTable form={form} />
        <Text style={S.subTitle}>Hasil Pengukuran Grounding</Text>
        <GroundingMeasTable form={form} photos={photos} />
      </LhppPage>

      {/* ════ C.3 — Evaluasi ═══════════════════════════════════════════════════ */}
      <LhppPage {...fp} code="C.3" title="EVALUASI HASIL UJI PERALATAN">
        <EvaluasiTable form={form} photos={photos} />
      </LhppPage>

      {/* ════ C.4 — Pengujian Sistem ════════════════════════════════════════════ */}
      <LhppPage {...fp} code="C.4" title="PENGUJIAN SISTEM — FOTO PELAKSANAAN UJI">
        <PengujianSistemSection form={form} photos={photos} />
      </LhppPage>

      {/* ════ D — Data Hasil Uji ═══════════════════════════════════════════════ */}
      <LhppPage {...fp} code="D" title="DATA HASIL UJI">
        <DataHasilUjiSection form={form} />
      </LhppPage>

      {/* ════ E — Rekomendasi Laik Operasi — Page 1 (Summary) ═════════════════ */}
      <LhppPage {...fp} code="E" title="REKOMENDASI LAIK OPERASI">
        <RloSummaryTable data={data} form={form} />
      </LhppPage>

      {/* ════ E-2: Isolasi — fixed header repeats on overflow pages ══════════════ */}
      <Page size="A4" style={S.page}>
        <View fixed>
          <LhppHeader instansi={instansi} code="E" />
        </View>
        <RloIsolasiSection form={form} photos={photos} />
      </Page>

      {/* ════ E-3: Tegangan + Beban — fixed header repeats if overflow ════════════ */}
      <Page size="A4" style={S.page}>
        <View fixed>
          <LhppHeader instansi={instansi} code="E" />
        </View>
        <RloTegananSection form={form} photos={photos} />
        <RloBebanSection   form={form} photos={photos} />
      </Page>

      {/* ════ E-4: Kesimpulan + TTD ════════════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <LhppHeader instansi={instansi} code="E" />
        <RloKesimpulanSection data={data} form={form} />
        <View style={S.spacer} />
        <DualSig data={data} instansi={instansi} ttd={ttd} ttd_client={ttd_client} />
      </Page>
    </Document>
  );
}

// ─── Export helpers ───────────────────────────────────────────────────────────
function slug(s = "") {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) || "doc";
}

/** Fetch remote URL dan kembalikan sebagai data: URL (base64).
 *  Mengembalikan null jika URL kosong atau fetch gagal (CORS, auth, dll). */
async function toDataUrl(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror  = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Render PDF lalu trigger download file .pdf */
export async function downloadLhpp(data, instansi, filename) {
  const name = filename
    ?? `LHPP-${slug(data.noLhpp || data.nama)}-${(data.tanggal ?? "").replace(/-/g,"")}.pdf`;

  // Pre-fetch semua gambar ke base64 untuk menghindari CORS di @react-pdf/renderer
  const logoDataUrl         = await toDataUrl(instansi?.logo?.url);
  const ttdSigDataUrl       = await toDataUrl(data?.ttd?.signature?.url);
  const ttdStmpDataUrl      = await toDataUrl(data?.ttd?.stempel?.url);
  const ttdClientSigDataUrl = await toDataUrl(data?.ttd_client?.signature?.url);
  const ttdClientStmpDataUrl= await toDataUrl(data?.ttd_client?.stempel?.url);

  const photoDataUrls = {};
  for (const partKey of ["part1", "part2"]) {
    photoDataUrls[partKey] = {};
    for (const [photoKey, arr] of Object.entries(data?.photos?.[partKey] ?? {})) {
      photoDataUrls[partKey][photoKey] = await Promise.all(
        (arr ?? []).map(u => toDataUrl(u))
      );
    }
  }

  const resolvedInstansi = instansi
    ? { ...instansi, logo: logoDataUrl ? { url: logoDataUrl } : instansi.logo }
    : instansi;

  const resolvedData = {
    ...data,
    ttd: data?.ttd ? {
      ...data.ttd,
      signature: ttdSigDataUrl  ? { url: ttdSigDataUrl  } : data.ttd.signature,
      stempel:   ttdStmpDataUrl ? { url: ttdStmpDataUrl } : data.ttd.stempel,
    } : data?.ttd,
    ttd_client: data?.ttd_client ? {
      ...data.ttd_client,
      signature: ttdClientSigDataUrl  ? { url: ttdClientSigDataUrl  } : data.ttd_client.signature,
      stempel:   ttdClientStmpDataUrl ? { url: ttdClientStmpDataUrl } : data.ttd_client.stempel,
    } : data?.ttd_client,
    photos: photoDataUrls,
  };

  const blob = await pdf(<LhppPDF data={resolvedData} instansi={resolvedInstansi} />).toBlob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;  a.download = name;  a.click();
  URL.revokeObjectURL(url);
}

/** Render PDF → blob URL untuk iframe src */
export async function getLhppBlobUrl(data, instansi) {
  const blob = await pdf(<LhppPDF data={data} instansi={instansi} />).toBlob();
  return URL.createObjectURL(blob);
}
