/**
 * exportLhppDocx.js — Generate LHPP Word document (.docx) dari data laporan.
 * Struktur sama dengan LhppPDF.jsx: Cover, A.1–A.6, B.1–B.7, C.1–C.4, D, E.
 */
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, AlignmentType, WidthType, BorderStyle, VerticalAlign,
  ShadingType, PageBreak, UnderlineType,
} from "docx";
import { getField, getPhotos, formatDate } from "../templates/laporan/shared/helpers";

const gf = (form, path) => getField(form, path);
const gp = (photos, part, key) => getPhotos(photos, part, key);

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

// ─── Image fetch ─────────────────────────────────────────────────────────────
async function fetchImgBuf(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
}

function makeImg(buf, w = 150, h = 100) {
  if (!buf) return null;
  return new ImageRun({ data: buf, transformation: { width: w, height: h }, type: "jpg" });
}

// ─── Border / shading constants ───────────────────────────────────────────────
const B1 = { style: BorderStyle.SINGLE, size: 4, color: "000000", space: 0 };
const BALL = { top: B1, bottom: B1, left: B1, right: B1 };
const BNONE = {
  top:    { style: BorderStyle.NIL, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NIL, size: 0, color: "FFFFFF" },
  left:   { style: BorderStyle.NIL, size: 0, color: "FFFFFF" },
  right:  { style: BorderStyle.NIL, size: 0, color: "FFFFFF" },
};
const shade = fill => ({ type: ShadingType.SOLID, fill, color: "auto" });

// ─── Low-level builders ───────────────────────────────────────────────────────

function run(text, opts = {}) {
  return new TextRun({
    text: String(text ?? ""),
    bold:    opts.bold    || false,
    italics: opts.italic  || false,
    size:    opts.size    || 18,        // half-points: 18=9pt, 20=10pt, 22=11pt
    font:    "Times New Roman",
    color:   opts.color   || undefined,
    underline: opts.underline ? { type: UnderlineType.SINGLE } : undefined,
  });
}

function para(text, opts = {}) {
  const children = Array.isArray(text) ? text : [run(text, opts)];
  return new Paragraph({
    alignment: opts.center ? AlignmentType.CENTER : (opts.right ? AlignmentType.RIGHT : AlignmentType.LEFT),
    spacing: opts.spacing ?? { before: 0, after: 0 },
    border: opts.topBorder ? { top: { style: BorderStyle.SINGLE, size: 4, color: "000000", space: 2 } } : undefined,
    children,
  });
}

function cPara(text, opts = {}) { return para(text, { ...opts, center: true }); }

function spacer(before = 60, after = 60) {
  return new Paragraph({ spacing: { before, after }, children: [] });
}

function pgBreak() {
  return new Paragraph({ spacing: { before: 0, after: 0 }, children: [new PageBreak()] });
}

function secTitle(text, size = 22) {
  return para([run(text, { bold: true, size, underline: true })], {
    center: true,
    spacing: { before: 120, after: 80 },
  });
}

function subTitle(text) {
  return para([run(text, { bold: true, size: 18, underline: true })], {
    center: true,
    spacing: { before: 80, after: 40 },
  });
}

// ─── Cell builders ────────────────────────────────────────────────────────────

function mkCell(content, { w, bold, center, fill, colSpan, borders = BALL } = {}) {
  let children;
  if (Array.isArray(content) && content.every(c => c instanceof Paragraph || c instanceof Table)) {
    children = content;
  } else if (content instanceof Paragraph || content instanceof Table) {
    children = [content];
  } else {
    // string / number
    children = [para(String(content ?? ""), { bold, center })];
  }
  return new TableCell({
    children,
    width: w != null ? { size: w, type: WidthType.PERCENTAGE } : undefined,
    columnSpan: colSpan,
    shading: fill ? shade(fill) : undefined,
    verticalAlign: VerticalAlign.CENTER,
    borders,
  });
}

function hCell(text, opts = {}) {
  return mkCell(text, { bold: true, center: true, fill: opts.fill ?? "F5E6C8", ...opts });
}

function emptyCell(w) {
  return mkCell("", { w });
}

// ─── Kop surat table ──────────────────────────────────────────────────────────

function kopTable(instansi, code, logoBuf) {
  const { nama = "PT. Adytia Putra Tehnik", subtitle = "ELECTRICAL CONTRACTOR & TECHNICAL ENGGINEERING", alamat = "", email, telp } = instansi ?? {};

  const logoCell = mkCell(
    logoBuf
      ? [para([makeImg(logoBuf, 48, 38)], { center: true })]
      : [para("")],
    { w: 13, borders: BALL }
  );

  const infoLines = [
    para([run(nama, { bold: true, size: 22 })], { center: true, spacing: { before: 0, after: 0 } }),
    para([run(subtitle, { size: 15 })], { center: true, spacing: { before: 0, after: 0 } }),
    ...(alamat ? [para([run(alamat, { size: 14 })], { center: true, spacing: { before: 0, after: 0 } })] : []),
    ...((email && email !== "-") || (telp && telp !== "-") ? [
      para([run([email && email !== "-" ? `Email: ${email}` : "", telp && telp !== "-" ? `Telp. ${telp}` : ""].filter(Boolean).join("  "), { size: 14 })], { center: true, spacing: { before: 0, after: 0 } }),
    ] : []),
  ];

  const centerCell = mkCell(infoLines, { borders: BALL });

  const codeCell = mkCell(
    code ? [para([run(`FORM - ${code}`, { bold: true, size: 18 })], { center: true })] : [para("")],
    { w: 13, borders: BALL }
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({ children: [logoCell, centerCell, codeCell] })],
  });
}

// ─── Data box (info laporan) ──────────────────────────────────────────────────

function dataBox(data) {
  const allRows = [
    ["Nama Perusahaan",     data.nama],
    ["Lokasi Pemeriksaan",  data.alamat],
    ["Tanggal Pemeriksaan", formatDate(data.ttd?.tanggal)],
    ...(data.noLhpp && data.noLhpp !== "-" ? [["No. LHPP", data.noLhpp]] : []),
  ];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: allRows.map(([label, val]) => new TableRow({ children: [
      mkCell(label, { w: 36, bold: true }),
      mkCell(`: ${val ?? "-"}`, { w: 64 }),
    ]})),
  });
}

// ─── Signature table ──────────────────────────────────────────────────────────

function sigTable(data, instansi, sig1Buf, sig2Buf) {
  function sigCell(label, nama, jabatan, imgBuf) {
    const img = imgBuf ? makeImg(imgBuf, 95, 55) : null;
    return new TableCell({
      children: [
        para([run(label, { bold: true, size: 16 })], { center: true }),
        spacer(160, 0),
        img
          ? para([img], { center: true, spacing: { before: 0, after: 0 } })
          : spacer(400, 0),
        para([run(nama || "(......................)", { bold: true, size: 16, underline: true })], { center: true, topBorder: true }),
        ...(jabatan ? [para([run(jabatan, { size: 14 })], { center: true })] : []),
      ],
      width: { size: 50, type: WidthType.PERCENTAGE },
      borders: BNONE,
      verticalAlign: VerticalAlign.BOTTOM,
    });
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({ children: [
      sigCell(data.nama ?? "", data.ttd_client?.nama || data.nama, data.ttd_client?.jabatan, sig1Buf),
      sigCell(instansi?.nama ?? "", data.ttd?.nama, data.ttd?.jabatan, sig2Buf),
    ]})],
  });
}

// ─── Photo grid (2 kolom) ─────────────────────────────────────────────────────

function photoGrid(items, imgMap) {
  const valid = items.filter(it => it.url && imgMap.get(it.url));
  if (!valid.length) return null;

  const rows = [];
  for (let i = 0; i < valid.length; i += 2) {
    const pair = valid.slice(i, i + 2);
    while (pair.length < 2) pair.push(null);
    rows.push(new TableRow({
      children: pair.map(it => {
        if (!it) return mkCell("", { borders: BALL });
        const buf = imgMap.get(it.url);
        const img = buf ? makeImg(buf, 150, 110) : null;
        return new TableCell({
          children: [
            para([run(it.label, { bold: true, size: 15 })], { center: true }),
            img
              ? para([img], { center: true, spacing: { before: 20, after: 0 } })
              : para([run("(foto tidak tersedia)", { size: 14, italic: true, color: "888888" })], { center: true }),
          ],
          borders: BALL,
          verticalAlign: VerticalAlign.TOP,
        });
      }),
    }));
  }

  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
}

// ─── Full-width photo ─────────────────────────────────────────────────────────

function fullPhoto(url, imgMap, label) {
  const buf = url ? imgMap.get(url) : null;
  if (!buf) return cPara(`(foto ${label} tidak tersedia)`, { spacing: { before: 40, after: 40 } });
  return para([makeImg(buf, 380, 270)], { center: true, spacing: { before: 40, after: 40 } });
}

// ─── Nameplate table (No / Uraian / Keterangan) ───────────────────────────────

function nameplateTable(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [hCell("No", { w: 8 }), hCell("Uraian", { w: 40, center: false }), hCell("Keterangan", { center: false })] }),
      ...rows.map(([lbl, val], i) => new TableRow({ children: [
        mkCell(String(i + 1), { w: 8, center: true }),
        mkCell(lbl, { w: 40 }),
        mkCell(val ?? "-"),
      ]})),
    ],
  });
}

// ─── Kop + Data + Title + Sig wrapper ────────────────────────────────────────

function buildPage({ code, title, data, instansi, logoBuf, sig1Buf, sig2Buf, content }) {
  return [
    kopTable(instansi, code, logoBuf),
    spacer(40, 40),
    dataBox(data),
    spacer(40, 40),
    secTitle(title),
    ...content,
    spacer(80, 0),
    sigTable(data, instansi, sig1Buf, sig2Buf),
    pgBreak(),
  ];
}

// ─── Section content builders ─────────────────────────────────────────────────

// A.1 PHB TM
function contentA1(form, photos, imgMap) {
  const rows = [
    ["Spesifikasi",         gf(form,"part1.phb_tm.spesifikasi.spesifikasi")],
    ["Tahun Pembuatan",     gf(form,"part1.phb_tm.spesifikasi.tahun")],
    ["Merk",                gf(form,"part1.phb_tm.incoming.merk")],
    ["Tipe",                gf(form,"part1.phb_tm.incoming.tipe")],
    ["Jenis Pemutus",       gf(form,"part1.phb_tm.incoming.jenisPemutus")],
    ["Rating Tegangan (V)", gf(form,"part1.phb_tm.incoming.ratingV")],
    ["Rating Arus (A)",     gf(form,"part1.phb_tm.incoming.ratingI")],
  ];
  const items = [
    { label:"Foto Nameplate PHB TM", url: gp(photos,"part1","phb_tm.incoming")[1] },
    { label:"Foto Full PHB TM",      url: gp(photos,"part1","phb_tm.spesifikasi")[0] },
  ];
  return [nameplateTable(rows), spacer(), photoGrid(items, imgMap)].filter(Boolean);
}

// A.2 Saluran TM
function contentA2(form, photos, imgMap) {
  const rows = [
    ["Merk",          gf(form,"part1.phb_tm.kabel_sktm.merk")],
    ["Tipe / Jenis",  gf(form,"part1.phb_tm.kabel_sktm.tipe")],
    ["Ukuran",        gf(form,"part1.phb_tm.kabel_sktm.ukuran")],
    ["Panjang (m)",   gf(form,"part1.phb_tm.kabel_sktm.panjang")],
  ].filter(([, v]) => v && v !== "-");
  const items = [
    { label:"Foto Nameplate Kabel TM", url: gp(photos,"part1","phb_tm.kabel_sktm")[0] },
    { label:"Foto Jalur Kabel TM",     url: gp(photos,"part1","phb_tm.kabel_sktm")[1] },
  ];
  return [nameplateTable(rows), spacer(), photoGrid(items, imgMap)].filter(Boolean);
}

// A.3 Trafo
function contentA3(form, photos, imgMap) {
  const rows = [
    ["Merk",                          gf(form,"part1.trafo.nameplate.merk")],
    ["Type / Vector Group",            gf(form,"part1.trafo.nameplate.typeVector")],
    ["No Seri",                        gf(form,"part1.trafo.nameplate.noSeri")],
    ["Kapasitas (kVA)",                gf(form,"part1.trafo.nameplate.kapasitas")],
    ["Tahun Pembuatan",                gf(form,"part1.trafo.nameplate.tahun")],
    ["Tegangan Primer/Sekunder (V)",   gf(form,"part1.trafo.nameplate.teganganPS")],
    ["Arus Primer/Sekunder (A)",       gf(form,"part1.trafo.nameplate.arusPS")],
    ["Impedensi (%)",                  gf(form,"part1.trafo.nameplate.impedensi")],
    ["Sistem Pendingin",               gf(form,"part1.trafo.nameplate.sistemPendingin")],
    ["Berat (kg)",                     gf(form,"part1.trafo.nameplate.berat")],
  ];
  const items = [
    { label:"Foto Nameplate Trafo", url: gp(photos,"part1","trafo.nameplate")[1] },
    { label:"Foto Full Trafo",      url: gp(photos,"part1","trafo.nameplate")[0] },
  ];
  return [nameplateTable(rows), spacer(), photoGrid(items, imgMap)].filter(Boolean);
}

// A.4 Kabel TR
function contentA4(form, photos, imgMap) {
  const rows = [
    ["Merk",        gf(form,"part1.phb_tr.kabel_tr.merk")],
    ["Tipe / Jenis",gf(form,"part1.phb_tr.kabel_tr.tipe")],
    ["Ukuran",      gf(form,"part1.phb_tr.kabel_tr.ukuran")],
    ["Panjang (m)", gf(form,"part1.phb_tr.kabel_tr.panjang")],
  ];
  const items = [
    { label:"Foto Nameplate Kabel TR", url: gp(photos,"part1","phb_tr.kabel_tr")[0] },
    { label:"Foto Jalur Kabel TR",     url: gp(photos,"part1","phb_tr.kabel_tr")[1] },
  ];
  return [nameplateTable(rows), spacer(), photoGrid(items, imgMap)].filter(Boolean);
}

// A.5 PHB TR Spec
function contentA5(form, photos, imgMap) {
  const specRows = form.part1?.phb_tr_spec?.rows ?? [];
  const hdrs = ["No","Nama Panel/Komponen","Merk","Jenis","Besaran Proteksi","Satuan","Jumlah","Tujuan Proteksi"];
  const keys  = ["nama","merk","jenis","besaranProteksi","satuan","jumlah","tujuanProteksi"];
  const ws    = [5, 22, 11, 9, 13, 9, 8, 23];

  const tbl = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: hdrs.map((h, i) => hCell(h, { w: ws[i], center: i !== 1 && i !== 7 })) }),
      ...(specRows.length ? specRows.map((row, ri) => new TableRow({ children: [
        mkCell(String(ri + 1), { w: 5, center: true }),
        ...keys.map((k, ki) => mkCell(row[k] ?? "-", { w: ws[ki + 1] })),
      ]})) : [new TableRow({ children: [new TableCell({
        children: [cPara("Belum ada data", {})],
        columnSpan: 8, borders: BALL,
      })] })]),
    ],
  });

  const items = [{ label:"Foto Full PHB TR", url: gp(photos,"part1","phb_tr.phb_tr_full")[0] }];
  return [tbl, spacer(), photoGrid(items, imgMap)].filter(Boolean);
}

// A.6 Sertifikat
function contentA6(form, photos, imgMap) {
  const items = gp(photos,"part1","lain_lain.sertifikat").map((url, i) => ({ label:`Foto Sertifikat ${i+1}`, url }));
  return [photoGrid(items, imgMap) ?? para("Tidak ada sertifikat yang dilampirkan.")];
}

// B.1 Konstruksi
function contentB1(form, photos, imgMap) {
  const items = [
    { label:"PHB TM",     url: gp(photos,"part1","phb_tm.spesifikasi")[0] },
    { label:"Saluran TM", url: gp(photos,"part1","phb_tm.kabel_sktm")[0] },
    { label:"Trafo",      url: gp(photos,"part1","trafo.nameplate")[0] },
    { label:"Kabel TR",   url: gp(photos,"part1","phb_tr.kabel_tr")[0] },
    { label:"PHB TR",     url: gp(photos,"part1","phb_tr.phb_tr_full")[0] },
    { label:"Sertifikat", url: gp(photos,"part1","lain_lain.sertifikat")[0] },
  ];
  return [photoGrid(items, imgMap) ?? para("(tidak ada foto konstruksi)")];
}

// B.2 Pembumian
function contentB2(form, photos, imgMap) {
  const f1 = form.part1 ?? {};
  const rows = [
    { nama:"Grounding Cubicle PHB TM",      tipe: f1.phb_tm?.grounding_cubicle?.tipe??"-", ukuran: f1.phb_tm?.grounding_cubicle?.ukuran??"-", nilai: f1.phb_tm?.grounding_phbtm?.nilai??"-" },
    { nama:"Grounding LA / Arester PHB TM", tipe: f1.phb_tm?.grounding_la?.tipe??"-",      ukuran: f1.phb_tm?.grounding_la?.ukuran??"-",      nilai: f1.phb_tm?.grounding_arester?.nilai??"-" },
    { nama:"Grounding Netral Trafo",         tipe:"-", ukuran:"-", nilai: f1.trafo?.grounding_pengukuran?.nilaiNetral??"-" },
    { nama:"Grounding Body Trafo",           tipe:"-", ukuran:"-", nilai: f1.trafo?.grounding_pengukuran?.nilaiBody??"-" },
    { nama:"Grounding Cubicle PHB TR",       tipe: f1.phb_tr?.grounding_cubicle?.tipe??"-", ukuran: f1.phb_tr?.grounding_cubicle?.ukuran??"-", nilai: f1.phb_tr?.grounding_phbtr?.nilai??"-" },
  ];
  const tbl = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [hCell("No",{w:6}), hCell("Nama Grounding",{w:38,center:false}), hCell("Tipe",{w:16}), hCell("Ukuran (mm²)",{w:18}), hCell("Nilai (Ω)",{w:22})] }),
      ...rows.map((r,i) => new TableRow({ children: [
        mkCell(String(i+1), {w:6,center:true}),
        mkCell(r.nama, {w:38}),
        mkCell(r.tipe, {w:16,center:true}),
        mkCell(r.ukuran, {w:18,center:true}),
        mkCell(r.nilai, {w:22,center:true,bold:true}),
      ]})),
    ],
  });
  const items = [
    { label:"Grounding Cubicle PHB TM",  url: gp(photos,"part1","phb_tm.grounding_cubicle")[0] },
    { label:"Grounding LA / Arester TM", url: gp(photos,"part1","phb_tm.grounding_la")[0] },
    { label:"Grounding Netral Trafo",    url: gp(photos,"part1","trafo.grounding_netral")[0] },
    { label:"Grounding Body Trafo",      url: gp(photos,"part1","trafo.grounding_body")[0] },
    { label:"Grounding Cubicle PHB TR",  url: gp(photos,"part1","phb_tr.grounding_cubicle")[0] },
  ].filter(i => i.url);
  return [tbl, spacer(), photoGrid(items, imgMap)].filter(Boolean);
}

// B.3 Pengaman Elektrik
function contentB3(form, photos, imgMap) {
  const f1 = form.part1 ?? {};
  const ada = v => (v && String(v).trim() ? "Ada" : "Tidak Ada");
  const items = [
    { label:"Circuit Breaker (CB)",                    hasil: ada(f1.phb_tm?.incoming?.merk),           ket: f1.phb_tm?.incoming?.tipe??"-",       pk:"phb_tm.incoming" },
    { label:"Fuse",                                    hasil: ada(f1.phb_tm?.fuse?.rating),              ket: f1.phb_tm?.fuse?.rating??"-",          pk:"phb_tm.fuse" },
    { label:"Relai Pengaman",                          hasil: ada(f1.phb_tm?.relay_proteksi?.merk),      ket: `${f1.phb_tm?.relay_proteksi?.merk??""} ${f1.phb_tm?.relay_proteksi?.tipe??""}`.trim()||"-", pk:"phb_tm.relay_proteksi" },
    { label:"Air Circuit Breaker (ACB)",               hasil: ada(f1.phb_tr?.acb_utama?.merk),           ket: `${f1.phb_tr?.acb_utama?.merk??""} ${f1.phb_tr?.acb_utama?.tipe??""}`.trim()||"-",          pk:"phb_tr.acb_utama" },
    { label:"Moulded Case Circuit Breaker (MCCB)",     hasil: ada(f1.phb_tr?.cb_cabang?.ratingI),        ket: f1.phb_tr?.cb_cabang?.ratingI ? `${f1.phb_tr.cb_cabang.ratingI} A`:"-",                     pk:"phb_tr.cb_cabang" },
    { label:"Miniature Circuit Breaker (MCB)",         hasil: ada(f1.phb_tr?.nameplate_cb?.nameplate),   ket: f1.phb_tr?.nameplate_cb?.nameplate??"-", pk:"phb_tr.nameplate_cb" },
    { label:"Fault Passage Indicator (FPI)",           hasil:"-", ket:"-", pk:null },
    { label:"Current Transformer (CT)",                hasil: ada(f1.phb_tm?.ct_incoming?.ratingCT),    ket: f1.phb_tm?.ct_incoming?.ratingCT??"-",  pk:"phb_tm.ct_incoming" },
    { label:"Voltage Presence Indicating System (VPIS)",hasil:"-", ket:"-", pk:null },
  ];
  const tbl = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [hCell("No",{w:5}), hCell("Komponen Pengaman",{w:38,center:false}), hCell("Hasil",{w:13}), hCell("Keterangan",{w:28,center:false}), hCell("Foto",{w:16})] }),
      ...items.map((item, i) => {
        const url = item.pk ? gp(photos,"part1",item.pk)[0] : null;
        const buf = url ? imgMap.get(url) : null;
        const img = buf ? makeImg(buf, 75, 52) : null;
        return new TableRow({ children: [
          mkCell(String(i+1),{w:5,center:true}),
          mkCell(item.label,{w:38}),
          mkCell(item.hasil,{w:13,center:true}),
          mkCell(item.ket,{w:28}),
          new TableCell({
            children: img ? [para([img], { center: true })] : [cPara("-")],
            width: { size: 16, type: WidthType.PERCENTAGE },
            borders: BALL, verticalAlign: VerticalAlign.CENTER,
          }),
        ]});
      }),
    ],
  });
  return [tbl];
}

// B.4 Pengaman Mekanik
function contentB4(form, photos, imgMap) {
  const items = [
    { label:"DGPT / Relay Buchholz", url: gp(photos,"part1","trafo.dgpt")[0] },
    { label:"Pagar Pengaman Trafo",  url: gp(photos,"part1","trafo.nameplate")[0] },
    { label:"Pengaman Roda / Kaki",  url: gp(photos,"part1","trafo.kaki_pengunci")[0] },
  ];
  return [photoGrid(items, imgMap) ?? para("(tidak ada foto pengaman mekanik)")];
}

// B.5 Jarak Bebas
function contentB5(form) {
  function clearTable(label, d) {
    return [
      subTitle(`Jarak Bebas ${label} (cm)`),
      new Table({
        width: { size: 55, type: WidthType.PERCENTAGE },
        rows: [["Depan","depan"],["Kiri","kiri"],["Kanan","kanan"],["Belakang","belakang"]].map(([dir, key]) =>
          new TableRow({ children: [
            mkCell(dir, { w: 45 }),
            mkCell(d[key] ?? "-", { center: true }),
          ]}),
        ),
      }),
    ];
  }
  return [
    ...clearTable("PHB TM", form.part1?.phb_tm?.jarak ?? {}),
    ...clearTable("Trafo",  form.part1?.trafo?.jarak  ?? {}),
    ...clearTable("PHB TR", form.part1?.phb_tr?.jarak ?? {}),
  ];
}

// B.6 Diagram Satu Garis
function contentB6(form, photos, imgMap) {
  const url = gp(photos,"part1","gambar.diagram")[0];
  return [fullPhoto(url, imgMap, "Diagram Satu Garis")];
}

// B.7 Tata Letak
function contentB7(form, photos, imgMap) {
  const url = gp(photos,"part1","gambar.tata_letak")[0];
  return [fullPhoto(url, imgMap, "Tata Letak Peralatan")];
}

// C.1 Tahanan Isolasi
function contentC1(form) {
  const ISOL_TM = [
    {name:"rGnd",label:"R-G"},{name:"sGnd",label:"S-G"},{name:"tGnd",label:"T-G"},
    {name:"rs",  label:"R-S"},{name:"st",  label:"S-T"},{name:"rt",  label:"R-T"},
  ];
  const ISOL_TR = [
    {name:"rGnd",label:"R-G"},{name:"sGnd",label:"S-G"},{name:"tGnd",label:"T-G"},
    {name:"nGnd",label:"N-G"},{name:"rs",  label:"R-S"},{name:"st",  label:"S-T"},
  ];
  const ISOL_TRAFO_S = [
    {name:"ffFg",label:"F-F / F-G"},
    {name:"psR", label:"Primer-Skunder R"},
    {name:"psST",label:"Primer-Skunder S-T"},
  ];

  function isoTbl(title, eqKey, grpKey, fields) {
    return [
      subTitle(title),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [hCell("No",{w:8}), hCell("Parameter",{w:55,center:false}), hCell("Nilai (MΩ)",{w:37})] }),
          ...fields.map((f, fi) => {
            const val = gf(form, `part1.${eqKey}.${grpKey}.${f.name}`);
            return new TableRow({ children: [
              mkCell(String(fi+1),{w:8,center:true}),
              mkCell(`${f.label} (MΩ)`,{w:55}),
              mkCell(val??"-",{w:37,center:true,bold:true}),
            ]});
          }),
        ],
      }),
    ];
  }

  return [
    ...isoTbl("PHB TM — Cubicle Incoming",  "phb_tm","isolasi_cubicle_incoming", ISOL_TM),
    ...isoTbl("PHB TM — Cubicle Outgoing",  "phb_tm","isolasi_cubicle_outgoing", ISOL_TM),
    ...isoTbl("Kabel TM — Incoming",         "phb_tm","isolasi_kabel_incoming",   ISOL_TM),
    ...isoTbl("Kabel TM — Outgoing",         "phb_tm","isolasi_kabel_outgoing",   ISOL_TM),
    ...isoTbl("Trafo — Isolasi Primer",      "trafo", "isolasi_primer",  ISOL_TM),
    ...isoTbl("Trafo — Isolasi Sekunder",    "trafo", "isolasi_skunder", ISOL_TRAFO_S),
    ...isoTbl("PHB TR — Incoming",           "phb_tr","isolasi_incoming",  ISOL_TR),
    ...isoTbl("Kabel TR",                    "phb_tr","isolasi_kabel_tr",  ISOL_TM),
  ];
}

// C.2 Tahanan Pembumian
function contentC2(form, photos, imgMap) {
  const f1 = form.part1 ?? {};
  const entries = [
    { label:"Grounding PHB TM",       nilai: gf(form,"part1.phb_tm.grounding_phbtm.nilai"),           pk:"phb_tm.grounding_phbtm" },
    { label:"Grounding Arester TM",   nilai: gf(form,"part1.phb_tm.grounding_arester.nilai"),          pk:"phb_tm.grounding_arester" },
    { label:"Grounding Netral Trafo", nilai: gf(form,"part1.trafo.grounding_pengukuran.nilaiNetral"),  pk:"trafo.grounding_pengukuran" },
    { label:"Grounding Body Trafo",   nilai: gf(form,"part1.trafo.grounding_pengukuran.nilaiBody"),    pk:"trafo.grounding_pengukuran" },
    { label:"Grounding PHB TR",       nilai: gf(form,"part1.phb_tr.grounding_phbtr.nilai"),            pk:"phb_tr.grounding_phbtr" },
  ];
  const tbl = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [hCell("No",{w:6}), hCell("Titik Grounding",{w:44,center:false}), hCell("Nilai (Ω)",{w:18}), hCell("Foto",{w:32})] }),
      ...entries.map((e,i) => {
        const url = gp(photos,"part1",e.pk)[0];
        const buf = url ? imgMap.get(url) : null;
        const img = buf ? makeImg(buf, 110, 65) : null;
        return new TableRow({ children: [
          mkCell(String(i+1),{w:6,center:true}),
          mkCell(e.label,{w:44}),
          mkCell(e.nilai,{w:18,center:true,bold:true}),
          new TableCell({
            children: img ? [para([img],{center:true})] : [cPara("(tidak ada foto)")],
            width:{size:32,type:WidthType.PERCENTAGE}, borders:BALL, verticalAlign:VerticalAlign.CENTER,
          }),
        ]});
      }),
    ],
  });
  return [tbl];
}

// C.3 Evaluasi
function contentC3(form) {
  const f1 = form.part1 ?? {};
  const ok  = v => (v && String(v).trim() ? "Baik" : "-");
  const items = [
    { label:"Name Plate",               hasil: ok(f1.trafo?.nameplate?.merk),             ket: f1.trafo?.nameplate?.merk ? `Trafo: ${f1.trafo.nameplate.merk}`:"-" },
    { label:"Busbar",                   hasil: ok(f1.phb_tm?.suhu_incoming?.R),            ket: f1.phb_tm?.suhu_incoming?.R ? `Suhu R: ${f1.phb_tm.suhu_incoming.R}°C`:"-" },
    { label:"Arrester / LA",            hasil: ok(f1.phb_tm?.la1?.tipe),                  ket: f1.phb_tm?.la1?.tipe??"-" },
    { label:"LBS",                      hasil: ok(f1.phb_tm?.lbs1?.merk),                 ket: `${f1.phb_tm?.lbs1?.merk??""} ${f1.phb_tm?.lbs1?.tipe??""}`.trim()||"-" },
    { label:"Fuse Cut Out",             hasil: ok(f1.phb_tm?.fuse?.rating),               ket: f1.phb_tm?.fuse?.rating??"-" },
    { label:"PT (Potential Transformer)",hasil: ok(f1.phb_tm?.pt_incoming?.ratingPT),     ket: f1.phb_tm?.pt_incoming?.ratingPT??"-" },
    { label:"Pengukur Suhu Oil (DGPT)", hasil:"-", ket:"-" },
    { label:"Grounding",                hasil: ok(f1.phb_tm?.grounding_cubicle?.tipe),    ket: f1.phb_tm?.grounding_cubicle?.tipe ? `Tipe: ${f1.phb_tm.grounding_cubicle.tipe}`:"-" },
    { label:"Kran Minyak",              hasil:"-", ket:"-" },
  ];
  const tbl = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [hCell("No",{w:5}), hCell("Komponen",{w:36,center:false}), hCell("Kondisi",{w:20}), hCell("Keterangan",{w:39,center:false})] }),
      ...items.map((item,i) => new TableRow({ children: [
        mkCell(String(i+1),{w:5,center:true}),
        mkCell(item.label,{w:36}),
        mkCell(item.hasil,{w:20,center:true}),
        mkCell(item.ket,{w:39}),
      ]})),
    ],
  });
  return [tbl];
}

// C.4 Pengujian Sistem (foto)
function contentC4(form, photos, imgMap) {
  const keys = [
    "phb_tm.incoming","phb_tm.fuse","phb_tm.relay_proteksi",
    "trafo.nameplate","trafo.dgpt","phb_tr.acb_utama","phb_tr.cb_cabang",
  ];
  const items = keys.flatMap(pk => {
    const [u1, u2] = gp(photos,"part1",pk);
    return [
      u1 ? { label:`${pk} (jauh)`,  url: u1 } : null,
      u2 ? { label:`${pk} (nilai)`, url: u2 } : null,
    ].filter(Boolean);
  });
  return [photoGrid(items, imgMap) ?? para("Tidak ada foto pengujian sistem.")];
}

// D Data Hasil Uji
function contentD(form) {
  const teg = form.part1?.phb_tr?.tegangan ?? {};
  const beb = form.part1?.phb_tr?.beban ?? {};

  function measTable(title, rows, unit) {
    return [
      subTitle(title),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [hCell("Parameter",{w:50,center:false}), hCell("Nilai",{w:50})] }),
          ...rows.map(([lbl,val]) => new TableRow({ children: [
            mkCell(lbl,{w:50}),
            mkCell(val != null ? `${val} ${unit}` : "-",{w:50,center:true,bold:true}),
          ]})),
        ],
      }),
    ];
  }

  return [
    ...measTable("Hasil Pengukuran Tegangan PHB TR",
      [["R-S",teg.RS],["S-T",teg.ST],["R-T",teg.RT],["R-N",teg.RN],["S-N",teg.SN],["T-N",teg.TN]], "V"),
    ...measTable("Hasil Pengukuran Beban (Arus)",
      [["Phasa R",beb.R],["Phasa S",beb.S],["Phasa T",beb.T],["Netral N",beb.N]], "A"),
  ];
}

// E Rekomendasi Laik Operasi
function contentE(data, form, photos, imgMap) {
  const f1    = form.part1 ?? {};
  const kva   = pv(f1.trafo?.nameplate?.kapasitas);
  const merk  = f1.trafo?.nameplate?.merk ?? "";
  const hasData = Object.values({ ...f1.trafo?.isolasi_primer, ...f1.trafo?.isolasi_skunder }).some(v => pv(v) !== null);
  const MIN_TM = 1000, MIN_TR = 100;

  // Summary
  const summaryTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      ["Nama Instalasi",              data.nama ?? "—"],
      ["Lokasi Pemeriksaan",          data.alamat ?? "—"],
      ["Kapasitas / Daya Tersambung", kva ? `${kva} kVA${merk ? ` (${merk})` : ""}` : "—"],
      ["Hasil Pemeriksaan",           hasData ? "LAIK OPERASI" : "DATA BELUM TERSEDIA"],
      ["Tindak Lanjut",               hasData ? "Instalasi dapat dioperasikan sesuai ketentuan peraturan yang berlaku." : "Lengkapi data pengujian."],
    ].map(([lbl, val]) => new TableRow({ children: [
      mkCell(lbl, { w: 36, bold: true }),
      mkCell(`: ${val}`, { w: 64 }),
    ]})),
  });

  // Isolasi
  const ip  = f1.trafo?.isolasi_primer          ?? {};
  const isk = f1.trafo?.isolasi_skunder         ?? {};
  const ips = f1.trafo?.isolasi_primer_skunder  ?? {};
  const raw = [
    { isHeader:true, label:"ISOLASI PRIMER" },
    { bagian:"Trafo", parameter:"R – G",    val:pv(ip.rGnd),  std:MIN_TM, pk:"trafo.isolasi_primer.rGnd" },
    { bagian:"Trafo", parameter:"S – G",    val:pv(ip.sGnd),  std:MIN_TM, pk:"trafo.isolasi_primer.sGnd" },
    { bagian:"Trafo", parameter:"T – G",    val:pv(ip.tGnd),  std:MIN_TM, pk:"trafo.isolasi_primer.tGnd" },
    { bagian:"Trafo", parameter:"R – S",    val:pv(ip.rS),    std:MIN_TM, pk:"trafo.isolasi_primer.rS" },
    { bagian:"Trafo", parameter:"S – T",    val:pv(ip.sT),    std:MIN_TM, pk:"trafo.isolasi_primer.sT" },
    { bagian:"Trafo", parameter:"T – R",    val:pv(ip.tR),    std:MIN_TM, pk:"trafo.isolasi_primer.tR" },
    { isHeader:true, label:"ISOLASI SEKUNDER" },
    { bagian:"Trafo", parameter:"R – G",    val:pv(isk.rGnd), std:MIN_TR },
    { bagian:"Trafo", parameter:"S – G",    val:pv(isk.sGnd), std:MIN_TR },
    { bagian:"Trafo", parameter:"T – G",    val:pv(isk.tGnd), std:MIN_TR },
    { bagian:"Trafo", parameter:"N – G",    val:pv(isk.nGnd), std:MIN_TR },
    { bagian:"Trafo", parameter:"R – S",    val:pv(isk.rS),   std:MIN_TR },
    { bagian:"Trafo", parameter:"S – T",    val:pv(isk.sT),   std:MIN_TR },
    { bagian:"Trafo", parameter:"T – R",    val:pv(isk.tR),   std:MIN_TR },
    { bagian:"Trafo", parameter:"R – N",    val:pv(isk.rN),   std:MIN_TR },
    { bagian:"Trafo", parameter:"S – N",    val:pv(isk.sN),   std:MIN_TR },
    { bagian:"Trafo", parameter:"T – N",    val:pv(isk.tN),   std:MIN_TR },
    { isHeader:true, label:"ISOLASI PRIMER – SEKUNDER" },
    { bagian:"Trafo", parameter:"P.R / S.R", val:pv(ips.PR_SR), std:MIN_TM },
    { bagian:"Trafo", parameter:"P.R / S.S", val:pv(ips.PR_SS), std:MIN_TM },
    { bagian:"Trafo", parameter:"P.R / S.T", val:pv(ips.PR_ST), std:MIN_TM },
    { bagian:"Trafo", parameter:"P.R / S.N", val:pv(ips.PR_SN), std:MIN_TM },
    { bagian:"Trafo", parameter:"P.S / S.R", val:pv(ips.PS_SR), std:MIN_TM },
    { bagian:"Trafo", parameter:"P.S / S.S", val:pv(ips.PS_SS), std:MIN_TM },
    { bagian:"Trafo", parameter:"P.S / S.T", val:pv(ips.PS_ST), std:MIN_TM },
    { bagian:"Trafo", parameter:"P.S / S.N", val:pv(ips.PS_SN), std:MIN_TM },
    { bagian:"Trafo", parameter:"P.T / S.R", val:pv(ips.PT_SR), std:MIN_TM },
    { bagian:"Trafo", parameter:"P.T / S.S", val:pv(ips.PT_SS), std:MIN_TM },
    { bagian:"Trafo", parameter:"P.T / S.T", val:pv(ips.PT_ST), std:MIN_TM },
    { bagian:"Trafo", parameter:"P.T / S.N", val:pv(ips.PT_SN), std:MIN_TM },
    { isHeader:true, label:"PHB TR & KABEL TR" },
    { bagian:"PHB TR",   parameter:"Incoming (R-G,S-G,T-G,N-G)", val:minGrp(f1.phb_tr?.isolasi_incoming),  std:MIN_TR, pk:"phb_tr.isolasi_incoming.rGnd" },
    { bagian:"Kabel TR", parameter:"Kabel TR (R-G,S-G,T-G)",      val:minGrp(f1.phb_tr?.isolasi_kabel_tr), std:MIN_TR, pk:"phb_tr.isolasi_kabel_tr.rGnd" },
  ];
  let num = 0;
  const isoRows = raw.map(r => r.isHeader ? r : { ...r, num: ++num });

  const isoTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [
        hCell("No",{w:5,fill:"C8C8C8"}), hCell("Bagian",{w:10,fill:"C8C8C8",center:false}),
        hCell("Parameter",{w:16,fill:"C8C8C8",center:false}), hCell("Nilai (MΩ)",{w:11,fill:"C8C8C8"}),
        hCell("Standar (MΩ)",{w:10,fill:"C8C8C8"}), hCell("Foto Jauh",{w:24,fill:"C8C8C8"}), hCell("Foto Nilai",{w:24,fill:"C8C8C8"}),
      ]}),
      ...isoRows.map(row => {
        if (row.isHeader) {
          return new TableRow({ children: [new TableCell({
            children: [para([run(row.label, { bold:true, italic:true, size:16 })], {})],
            columnSpan: 7, borders: BALL, shading: shade("D0D0D0"),
          })] });
        }
        const u1 = row.pk ? gp(photos,"part1",row.pk)[0] : null;
        const u2 = row.pk ? gp(photos,"part1",row.pk)[1] : null;
        const img1 = u1 ? makeImg(imgMap.get(u1), 100, 60) : null;
        const img2 = u2 ? makeImg(imgMap.get(u2), 100, 60) : null;
        const bad  = row.val !== null && row.val < row.std;
        return new TableRow({ children: [
          mkCell(String(row.num),{w:5,center:true}),
          mkCell(row.bagian,{w:10}),
          mkCell(row.parameter,{w:16}),
          new TableCell({
            children: [para([run(row.val !== null ? String(row.val) : "—", { bold:bad, size:18, color: bad?"FF0000":"000000" })], { center:true })],
            width:{size:11,type:WidthType.PERCENTAGE}, borders:BALL, verticalAlign:VerticalAlign.CENTER,
          }),
          mkCell(`≥ ${row.std}`,{w:10,center:true}),
          new TableCell({
            children: img1 ? [para([img1],{center:true})] : [cPara("—")],
            width:{size:24,type:WidthType.PERCENTAGE}, borders:BALL, verticalAlign:VerticalAlign.CENTER,
          }),
          new TableCell({
            children: img2 ? [para([img2],{center:true})] : [cPara("—")],
            width:{size:24,type:WidthType.PERCENTAGE}, borders:BALL, verticalAlign:VerticalAlign.CENTER,
          }),
        ]});
      }),
    ],
  });

  // Tegangan
  const teg = f1.phb_tr?.tegangan ?? {};
  const tegRows = [
    { param:"R–S (L-L)", val:pv(teg.RS), nom:380, pk:"phb_tr.tegangan.RS" },
    { param:"S–T (L-L)", val:pv(teg.ST), nom:380, pk:"phb_tr.tegangan.ST" },
    { param:"R–T (L-L)", val:pv(teg.RT), nom:380, pk:"phb_tr.tegangan.RT" },
    { param:"R–N (L-N)", val:pv(teg.RN), nom:220, pk:"phb_tr.tegangan.RN" },
    { param:"S–N (L-N)", val:pv(teg.SN), nom:220, pk:"phb_tr.tegangan.SN" },
    { param:"T–N (L-N)", val:pv(teg.TN), nom:220, pk:"phb_tr.tegangan.TN" },
  ];
  const tegTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [
        hCell("No",{w:5,fill:"C8C8C8"}), hCell("Parameter",{w:14,fill:"C8C8C8",center:false}),
        hCell("Terukur (V)",{w:11,fill:"C8C8C8"}), hCell("Nominal (V)",{w:11,fill:"C8C8C8"}),
        hCell("Deviasi",{w:10,fill:"C8C8C8"}), hCell("Foto Jauh",{w:24.5,fill:"C8C8C8"}), hCell("Foto Nilai",{w:24.5,fill:"C8C8C8"}),
      ]}),
      ...tegRows.map(({ param, val, nom, pk }, i) => {
        const u1 = gp(photos,"part1",pk)[0];
        const u2 = gp(photos,"part1",pk)[1];
        const img1 = u1 ? makeImg(imgMap.get(u1), 100, 60) : null;
        const img2 = u2 ? makeImg(imgMap.get(u2), 100, 60) : null;
        const dev  = val !== null ? ((val - nom) / nom * 100) : null;
        const devStr = dev !== null ? (dev >= 0 ? "+" : "") + dev.toFixed(1) + "%" : "—";
        const out  = dev !== null && Math.abs(dev) > 5;
        return new TableRow({ children: [
          mkCell(String(i+1),{w:5,center:true}),
          mkCell(param,{w:14}),
          mkCell(val ?? "—",{w:11,center:true}),
          mkCell(String(nom),{w:11,center:true}),
          new TableCell({
            children: [para([run(devStr, { bold:out, size:18, color:out?"FF0000":"000000" })], { center:true })],
            width:{size:10,type:WidthType.PERCENTAGE}, borders:BALL, verticalAlign:VerticalAlign.CENTER,
          }),
          new TableCell({
            children: img1 ? [para([img1],{center:true})] : [cPara("—")],
            width:{size:25,type:WidthType.PERCENTAGE}, borders:BALL, verticalAlign:VerticalAlign.CENTER,
          }),
          new TableCell({
            children: img2 ? [para([img2],{center:true})] : [cPara("—")],
            width:{size:25,type:WidthType.PERCENTAGE}, borders:BALL, verticalAlign:VerticalAlign.CENTER,
          }),
        ]});
      }),
    ],
  });

  // Beban
  const beb = f1.phb_tr?.beban ?? {};
  const bebRows = [
    { fasa:"R",          val:pv(beb.R), pk:"phb_tr.beban.R" },
    { fasa:"S",          val:pv(beb.S), pk:"phb_tr.beban.S" },
    { fasa:"T",          val:pv(beb.T), pk:"phb_tr.beban.T" },
    { fasa:"N (Netral)", val:pv(beb.N), pk:"phb_tr.beban.N" },
  ];
  const bebTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [
        hCell("No",{w:5,fill:"C8C8C8"}), hCell("Fasa",{w:35,fill:"C8C8C8",center:false}),
        hCell("Terukur (A)",{w:15,fill:"C8C8C8"}), hCell("Foto Jauh",{w:22.5,fill:"C8C8C8"}), hCell("Foto Nilai",{w:22.5,fill:"C8C8C8"}),
      ]}),
      ...bebRows.map(({ fasa, val, pk }, i) => {
        const u1 = gp(photos,"part1",pk)[0];
        const u2 = gp(photos,"part1",pk)[1];
        const img1 = u1 ? makeImg(imgMap.get(u1), 100, 60) : null;
        const img2 = u2 ? makeImg(imgMap.get(u2), 100, 60) : null;
        return new TableRow({ children: [
          mkCell(String(i+1),{w:5,center:true}),
          mkCell(`Phasa ${fasa}`,{w:35}),
          mkCell(val !== null ? String(val) : "—",{w:15,center:true}),
          new TableCell({
            children: img1 ? [para([img1],{center:true})] : [cPara("—")],
            width:{size:22.5,type:WidthType.PERCENTAGE}, borders:BALL, verticalAlign:VerticalAlign.CENTER,
          }),
          new TableCell({
            children: img2 ? [para([img2],{center:true})] : [cPara("—")],
            width:{size:22.5,type:WidthType.PERCENTAGE}, borders:BALL, verticalAlign:VerticalAlign.CENTER,
          }),
        ]});
      }),
    ],
  });

  // Kesimpulan
  const kvaLabel = kva ? `${kva} kVA` : null;
  const poinList = [
    "Hasil pengujian tahanan isolasi pada seluruh peralatan menunjukkan nilai yang memenuhi standar minimum yang dipersyaratkan.",
    "Hasil pengukuran tegangan pada PHB TR berada dalam batas toleransi ±5% dari tegangan nominal.",
    ...(kvaLabel ? [`Tingkat pembebanan transformator dalam batas yang diizinkan dari kapasitas nominal ${kvaLabel}.`] : []),
    "Berdasarkan hasil evaluasi tersebut, instalasi tenaga listrik ini dinyatakan LAIK OPERASI dan dapat dioperasikan sesuai ketentuan peraturan yang berlaku.",
  ];

  const laikiBox = new Table({
    width: { size: 60, type: WidthType.PERCENTAGE },
    rows: [new TableRow({ children: [new TableCell({
      children: [para([run(hasData ? "LAIK OPERASI" : "DATA BELUM TERSEDIA", {
        bold: true, size: 28,
        color: hasData ? "166534" : "92400E",
      })], { center: true, spacing: { before: 60, after: 60 } })],
      shading: shade(hasData ? "D4EDDA" : "FFF3CD"),
      borders: BALL,
    })]})],
  });

  return [
    summaryTable,
    spacer(60, 60),
    secTitle("I. PENGUJIAN TAHANAN ISOLASI", 20),
    para([run("* Standar minimum: TM ≥ 1.000 MΩ, TR ≥ 100 MΩ (PUIL 2011 / SNI).", { size: 14, italic: true, color: "555555" })], { spacing: { before: 0, after: 40 } }),
    isoTable,
    spacer(80, 80),
    secTitle("II. EVALUASI PENGUKURAN TEGANGAN PHB TR", 20),
    tegTable,
    para([run("* Toleransi: ±5% dari nominal (L-L: 380 V, L-N: 220 V).", { size: 14, italic: true, color: "555555" })], { spacing: { before: 20, after: 40 } }),
    spacer(40, 40),
    secTitle("III. PENGUKURAN BEBAN (ARUS)", 20),
    bebTable,
    spacer(80, 80),
    secTitle("IV. KESIMPULAN DAN REKOMENDASI", 20),
    new Paragraph({
      spacing: { before: 40, after: 40 },
      children: [
        run("Berdasarkan hasil pemeriksaan dan pengujian yang telah dilaksanakan pada instalasi tenaga listrik "),
        run(data.nama ?? "—", { bold: true }),
        run(` yang berlokasi di ${data.alamat ?? "—"}`),
        ...(kvaLabel ? [run(`, dengan Transformator${merk ? ` ${merk}` : ""} berkapasitas ${kvaLabel}`)] : []),
        run(", dapat disimpulkan sebagai berikut:"),
      ],
    }),
    ...poinList.map((poin, i) => new Paragraph({
      spacing: { before: 40, after: 40 },
      children: [run(`${i + 1}. ${poin}`)],
    })),
    spacer(60, 60),
    laikiBox,
  ];
}

// ─── Collect all photo URLs ───────────────────────────────────────────────────

function collectUrls(data, instansi) {
  const urls = new Set();
  const add = v => { if (v && typeof v === "string" && v.startsWith("http")) urls.add(v); };

  add(instansi?.logo?.url);
  add(data?.ttd?.signature?.url);
  add(data?.ttd?.stempel?.url);
  add(data?.ttd_client?.signature?.url);
  add(data?.ttd_client?.stempel?.url);

  function walk(obj) {
    if (!obj || typeof obj !== "object") return;
    if (Array.isArray(obj)) { obj.forEach(v => typeof v === "string" ? add(v) : walk(v)); return; }
    for (const v of Object.values(obj)) {
      if (typeof v === "string") add(v);
      else walk(v);
    }
  }
  walk(data?.photos);

  return [...urls];
}

// ─── Main export function ─────────────────────────────────────────────────────

export async function downloadLhppDocx(data, instansi, filename = "LHPP.docx") {
  // Fetch all images in parallel
  const allUrls = collectUrls(data, instansi);
  const fetched = await Promise.all(allUrls.map(async url => [url, await fetchImgBuf(url)]));
  const imgMap  = new Map(fetched.filter(([, b]) => b));

  const form   = data.formData ?? {};
  const photos = data.photos   ?? {};

  const logoBuf = imgMap.get(instansi?.logo?.url);
  const sig1Buf = imgMap.get(data.ttd_client?.signature?.url);
  const sig2Buf = imgMap.get(data.ttd?.signature?.url);

  const fp = { data, instansi, logoBuf, sig1Buf, sig2Buf };

  // Cover
  const cover = [
    spacer(800, 0),
    para([run("LAPORAN HASIL", { bold:true, size:36 })], { center:true, spacing:{ before:0, after:80 } }),
    para([run("PEMERIKSAAN DAN PENGUJIAN", { bold:true, size:36 })], { center:true, spacing:{ before:0, after:80 } }),
    cPara("(LHPP)", { size:24, spacing:{ before:0, after:100 } }),
    ...(data.noLhpp ? [cPara(`No. ${data.noLhpp}`, { italic:true, size:20, spacing:{ before:0, after:200 } })] : []),
    para([run(data.nama ?? "(Nama Pelanggan)", { bold:true, size:28 })], { center:true, spacing:{ before:0, after:60 } }),
    cPara(data.alamat ?? "-", { size:20, spacing:{ before:0, after:400 } }),
    cPara("Di susun oleh,", { italic:true, size:16, spacing:{ before:0, after:80 } }),
    new Table({
      width: { size: 55, type: WidthType.PERCENTAGE },
      rows: [new TableRow({ children: [new TableCell({
        children: [
          para([run(instansi?.nama ?? "—", { bold:true, size:22 })], { center:true }),
          ...(instansi?.alamat ? [cPara(instansi.alamat, { size:16 })] : []),
        ],
        borders: BALL,
        verticalAlign: VerticalAlign.CENTER,
      })]})],
    }),
    pgBreak(),
  ];

  const children = [
    ...cover,
    ...buildPage({ ...fp, code:"A.1", title:"SPESIFIKASI TEKNIK PHB TM",                   content: contentA1(form, photos, imgMap) }),
    ...buildPage({ ...fp, code:"A.2", title:"SPESIFIKASI TEKNIK SALURAN TM",                content: contentA2(form, photos, imgMap) }),
    ...buildPage({ ...fp, code:"A.3", title:"SPESIFIKASI TEKNIK TRAFO",                     content: contentA3(form, photos, imgMap) }),
    ...buildPage({ ...fp, code:"A.4", title:"SPESIFIKASI TEKNIK KABEL TR",                  content: contentA4(form, photos, imgMap) }),
    ...buildPage({ ...fp, code:"A.5", title:"SPESIFIKASI TEKNIK PHB TR",                    content: contentA5(form, photos, imgMap) }),
    ...buildPage({ ...fp, code:"A.6", title:"HASIL UJI PABRIK / SERTIFIKAT PRODUK",        content: contentA6(form, photos, imgMap) }),
    ...buildPage({ ...fp, code:"B.1", title:"KONSTRUKSI",                                   content: contentB1(form, photos, imgMap) }),
    ...buildPage({ ...fp, code:"B.2", title:"SISTEM PEMBUMIAN",                             content: contentB2(form, photos, imgMap) }),
    ...buildPage({ ...fp, code:"B.3", title:"PENGAMAN ELEKTRIK",                            content: contentB3(form, photos, imgMap) }),
    ...buildPage({ ...fp, code:"B.4", title:"PENGAMAN MEKANIK",                             content: contentB4(form, photos, imgMap) }),
    ...buildPage({ ...fp, code:"B.5", title:"JARAK BEBAS (CLEARANCE DISTANCE)",             content: contentB5(form) }),
    ...buildPage({ ...fp, code:"B.6", title:"GAMBAR DIAGRAM SATU GARIS",                    content: contentB6(form, photos, imgMap) }),
    ...buildPage({ ...fp, code:"B.7", title:"GAMBAR TATA LETAK PERALATAN UTAMA",            content: contentB7(form, photos, imgMap) }),
    ...buildPage({ ...fp, code:"C.1", title:"HASIL UJI PERALATAN — TAHANAN ISOLASI",        content: contentC1(form) }),
    ...buildPage({ ...fp, code:"C.2", title:"PENGUKURAN TAHANAN PEMBUMIAN",                 content: contentC2(form, photos, imgMap) }),
    ...buildPage({ ...fp, code:"C.3", title:"EVALUASI HASIL UJI PERALATAN",                 content: contentC3(form) }),
    ...buildPage({ ...fp, code:"C.4", title:"PENGUJIAN SISTEM — FOTO PELAKSANAAN UJI",      content: contentC4(form, photos, imgMap) }),
    ...buildPage({ ...fp, code:"D",   title:"DATA HASIL UJI",                               content: contentD(form) }),
    ...buildPage({ ...fp, code:"E",   title:"REKOMENDASI LAIK OPERASI",                     content: contentE(data, form, photos, imgMap) }),
  ];

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: "Times New Roman", size: 18 } },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 }, // ~1.9cm
        },
      },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
