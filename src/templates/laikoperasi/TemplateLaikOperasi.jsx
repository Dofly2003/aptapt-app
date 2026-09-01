// Template Rekomendasi Laik Operasi — 4 halaman A4
// Kop & footer: dari registry ../laporan/kopStyles, dipilih via instansi.kopStyle.
// Konten (jarak bebas, konstruksi, dst) tetap sama untuk semua kopStyle.

import { getKopStyle } from "../laporan/kopStyles";

const A4_W = 794;
const A4_H = 1123;
const MM_TO_PX = A4_W / 210;

const C = {
  teal:    "#006B80",
  tealMid: "#009DB5",
  navy:    "#003055",
  yellow:  "#FFD700",
  orange:  "#E87820",
  border:  "#9E9E9E",
  text:    "#1A1A2E",
  muted:   "#6B7280",
  photoBg: "#F7F7F7",
  thBg:    "#C8E8F0",
  rowAlt:  "#F0FAFC",
};

export const defaultDataLaikOperasi = {
  nomor: "",
  tanggal: new Date().toISOString().slice(0, 10),
  lokasi: "",
  namaGardu: "",
  nomorGardu: "",

  // Seksi 1 — Jarak Bebas
  jarakBebas: {
    phbTm: { kiri: "", kanan: "", depan: "", belakang: "" },
    trafo:  { kiri: "", kanan: "", depan: "", belakang: "" },
    phbTr:  { kiri: "", kanan: "", depan: "", belakang: "" },
  },
  fotoJarakBebas: {
    phbTm: { pengukuran: null, jauh: null },
    trafo:  { pengukuran: null, jauh: null },
    phbTr:  { pengukuran: null, jauh: null },
  },
  saksi1Nama: "", saksi1Jabatan: "", pj1Id: null,
  saksiSignatureUrl: null, saksiStempelUrl: null,
  pemeriksaNama: "", pemeriksaJabatan: "",
  pemeriksaSignatureUrl: null, pemeriksaStempelUrl: null,

  // Seksi 2 — Konstruksi
  fotoKonstruksi: { trafo: null, phbTm: null, phbTr: null },
  saksi2Nama: "", saksi2Jabatan: "", saksi2Instansi: "", pj2Id: null,

  // Seksi 3 — Pemeriksaan Fungsi PHB TM
  analysisSilihKunci: "Interlock berfungsi sebagai pengunci pintu pada PHB TM dan digunakan sebagai proteksi agar tidak terjadi kecelakaan kerja saat kondisi PHB TM bertegangan. Pintu PHB TM dapat dibuka ketika tegangan dan arus pada instalasi sudah dibumikan (grounding). Sedangkan ketika bertegangan, pintu PHB TM tidak dapat dibuka. Pada pemeriksaan ini, disimpulkan bahwa interlock dapat bekerja dengan baik dengan indikator pintu PHB TM tidak dapat dibuka ketika bertegangan, dan dapat dibuka ketika sudah tidak bertegangan.",
  interlockPhbTm: [
    { indikasi: "Interlock Pintu Kubikel Dengan Saklar Pembumian", hasilUji: "Baik / Berfungsi", keterangan: "1. Pintu Kubikel dapat dibuka pada saat saklar pembumian dalam posisi close" },
    { indikasi: "", hasilUji: "", keterangan: "2. Pintu kubikel tidak dapat dibuka pada saat saklar pembumian dalam posisi open" },
    { indikasi: "Interlock Disconnecting Switch (DS) dengan Saklar Pembumian", hasilUji: "Baik / Berfungsi", keterangan: "DS tidak bisa di close saat saklar pembumian dalam posisi tertutup" },
    { indikasi: "Interlock Disconnecting Switch (DS) dengan Circuit Breaker (CB)", hasilUji: "Baik / Berfungsi", keterangan: "1. Kunci B dapat dilepaskan saat DS open" },
    { indikasi: "", hasilUji: "", keterangan: "2. Kunci A dapat dilepaskan saat DS tertutup" },
    { indikasi: "", hasilUji: "", keterangan: "3. Tidak bisa open / close DS tanpa memasukan kunci A dan B" },
    { indikasi: "Circuit Breaker Manual Test", hasilUji: "Baik / Berfungsi", keterangan: "1. Tuas Circuit Breaker dapat ditarik" },
    { indikasi: "", hasilUji: "", keterangan: "2. CB tidak dapat di open/close tanpa memasukan kunci C" },
    { indikasi: "", hasilUji: "", keterangan: "3. Push Button CB bisa di open/close secara manual" },
    { indikasi: "CB/DS Electrical Test", hasilUji: "Baik / Berfungsi", keterangan: "CB/DS dapat dibuka/ditutup secara elektrik" },
    { indikasi: "Switch Function", hasilUji: "Baik / Berfungsi", keterangan: "Tombol open/close dapat dioperasikan secara elektrik" },
    { indikasi: "Protection Relay", hasilUji: "Baik / Berfungsi", keterangan: "Relay pengaman berfungsi pada saat terjadi kesalahan" },
    { indikasi: "Lampu Indikator", hasilUji: "Baik / Berfungsi", keterangan: "1. Indikator \"Close\" CB/DS menyala dan terlihat jelas" },
    { indikasi: "", hasilUji: "", keterangan: "2. Indikator \"Open\" CB/DS menyala dan terlihat jelas" },
    { indikasi: "", hasilUji: "", keterangan: "3. Indikator Fault/Trip Menyala dan terlihat jelas" },
    { indikasi: "Heather/Thermostat", hasilUji: "Baik / Berfungsi", keterangan: "Berfungsi pada saat suhu kelembaban berada diatas/dibawah ambang batas" },
  ],
  interlockPhbTmKontrol: [
    { indikasi: "V.avg", satuan: "kV", keterangan: "Terlihat Pada Power Meter" },
    { indikasi: "I.avg", satuan: "mA", keterangan: "Terlihat Pada Power Meter" },
    { indikasi: "Freq",  satuan: "Hz", keterangan: "Terlihat Pada Power Meter" },
  ],
  fotoLbs: [null, null],
  analysisUrutanFasaTm: "Pengujian urutan fasa bagian incoming, pada alat ukur terlihat lampu indikator menyala sebelah kanan yang menandakan putaran fasa berputar ke arah kanan (searah jarum jam). Maka dari pemeriksaan tersebut dinyatakan putaran fasa sesuai.",
  saksi3Nama: "", saksi3Jabatan: "", pj3Id: null,

  // Seksi 4 — Pemeriksaan Fungsi PHB TR
  interlockPhbTr: [
    { indikasi: "ACB Mechanical Test",  hasilUji: "Baik / Berfungsi", keterangan: "ACB dapat dioperasikan secara manual" },
    { indikasi: "MCCB Mechanical Test", hasilUji: "Baik / Berfungsi", keterangan: "MCCB dapat dioperasikan secara manual" },
    { indikasi: "MCB Mechanical Test",  hasilUji: "Baik / Berfungsi", keterangan: "MCB dapat dioperasikan secara manual" },
    { indikasi: "ACB Electrical Test",  hasilUji: "Baik / Berfungsi", keterangan: "ACB dapat dioperasikan secara otomatis saat terjadi gangguan" },
    { indikasi: "MCCB Electrical Test", hasilUji: "Baik / Berfungsi", keterangan: "MCCB dapat dioperasikan secara otomatis saat terjadi gangguan" },
    { indikasi: "MCB Electrical Test",  hasilUji: "Baik / Berfungsi", keterangan: "MCB dapat dioperasikan secara otomatis saat terjadi gangguan" },
    { indikasi: "Digital Metering",     hasilUji: "Baik / Berfungsi", keterangan: "Power Meter menyala dan dapat terlihat jelas" },
    { indikasi: "Protection Relay",     hasilUji: "Baik / Berfungsi", keterangan: "Relay pengaman berfungsi pada saat terjadi gangguan" },
    { indikasi: "Lampu Indikator",      hasilUji: "Baik / Berfungsi", keterangan: "Lampu Indikator menyala dan terlihat jelas" },
  ],
  interlockPhbTrKontrol: [
    { indikasi: "V.avg", keterangan: "Terlihat Pada Power Meter" },
    { indikasi: "I.avg", keterangan: "Terlihat Pada Power Meter" },
    { indikasi: "Freq",  keterangan: "Terlihat Pada Power Meter" },
    { indikasi: "P.tot", keterangan: "Terlihat Pada Power Meter" },
    { indikasi: "E Del", keterangan: "Terlihat Pada Power Meter" },
  ],
  fotoPhbTr: [null, null],
  analysisUrutanFasaTr: "Pengujian urutan fasa PHB TR, pada alat ukur terlihat lampu indikator menyala sebelah kanan yang menandakan putaran fasa berputar ke arah kanan (searah jarum jam). Maka dari pemeriksaan tersebut dinyatakan urutan fasa sesuai.",
  saksi4Nama: "", saksi4Jabatan: "", pj4Id: null,

  // ── V. Pengaman Elektrik ───────────────────────────────────────────────
  pengamanElektrik: {
    nama: "Panel Utama Tegangan Rendah", merk: "", tipe: "ACB",
    ratingI: "", jumlah: 1,
    tujuan: "Memproteksi instalasi apabila terjadi arus lebih dari trafo",
  },
  fotoPengamanElektrik: { phbTr: null, phbTm: null },

  // ── VI. Pengaman Mekanik ───────────────────────────────────────────────
  fotoPengamanMekanik: { dgpt: null, gerakTrafo: null },

  // ── VII. Evaluasi Komponen Proteksi ───────────────────────────────────
  evaluasiKomponen: [
    { no: 1, komponen: "LBS",        keterangan: "Ada", penjelasan: "Dapat dioperasikan dengan baik" },
    { no: 2, komponen: "CT",         keterangan: "Ada", penjelasan: "Terpasang, dan terhubung" },
    { no: 3, komponen: "RELAY",      keterangan: "Ada", penjelasan: "Terpasang, dan terhubung" },
    { no: 4, komponen: "DGPT",       keterangan: "Ada", penjelasan: "Terpasang, dan terhubung" },
    { no: 5, komponen: "MCCB",       keterangan: "Ada", penjelasan: "Terpasang dengan ukuran yang sesuai" },
    { no: 6, komponen: "Kran Minyak",keterangan: "Ada", penjelasan: "Terpasang dengan baik" },
  ],
  fotoEvaluasiKomponen: { lbs: null, relay: null, ct: null, dgpt: null, acb: null, kranTrafo: null },

  // ── VIII. Suhu ─────────────────────────────────────────────────────────
  suhuTmPrimer:   { R: "", S: "", T: "", N: "" },
  suhuTrSekunder: { R: "", S: "", T: "", N: "" },
  suhuPhbTm:      { R: "", S: "", T: "" },
  suhuPhbTr:      { R: "", S: "", T: "", N: "" },
  fotoSuhu: [null, null, null, null, null, null],

  // ── IX. Tahanan Isolasi ────────────────────────────────────────────────
  isolasiPhbTm:         { rGnd: "", sGnd: "", tGnd: "", rs: "", st: "", rt: "" },
  isolasiKabelTm:       { rGnd: "", sGnd: "", tGnd: "", rs: "", st: "", rt: "" },
  isolasiPrimer:        { rGnd: "", sGnd: "", tGnd: "", rS: "", sT: "", tR: "" },
  isolasiSkunder:       { rGnd: "", sGnd: "", tGnd: "", nGnd: "", rS: "", sT: "", tR: "", rN: "", sN: "", tN: "" },
  isolasiPrimerSkunder: { PR_SR: "", PR_SS: "", PR_ST: "", PR_SN: "", PS_SR: "", PS_SS: "", PS_ST: "", PS_SN: "", PT_SR: "", PT_SS: "", PT_ST: "", PT_SN: "" },
  isolasiPhbTr:         { rGnd: "", sGnd: "", tGnd: "", nGnd: "", rs: "", st: "" },
  isolasiKabelTr:       { rGnd: "", sGnd: "", tGnd: "", rs: "", st: "", rt: "" },
  fotoIsolasi: [null, null, null, null, null, null, null, null, null, null],

  // ── X. Grounding ──────────────────────────────────────────────────────
  sistemPembumian: {
    nama: "Grounding Sistem", tipe: "TNC-S", bahan: "BC Earthing Roots",
    ukuran: "95", satuan: "mm²", jumlah: 4,
    tujuan: "Sebagai proteksi peralatan elektronik atau instrumentasi sehingga dapat mencegah kerusakan akibat adanya bocor arus / tegangan",
  },
  groundingHasil:           { bodyTrafo: "", netralTrafo: "", phbTm: "", phbTr: "" },
  fotoPengukuranGrounding:  [null, null, null, null],
  fotoSistemGrounding:      { bodyTrafo: null, netralTrafo: null, phbTm: null, phbTr: null },

  // ── XI. Spesifikasi Teknik ─────────────────────────────────────────────
  spesKabelTm:  { merk: "", tipe: "", ukuran: "", panjang: "" },
  spesKabelTr:  { merk: "", tipe: "", ukuran: "", panjang: "" },
  spesPhbTm:    { merk: "", tipe: "", ratingV: "", ratingI: "" },
  spesPhbTr:    { merk: "", tipe: "", ratingI: "", jumlah: 1, tujuan: "Memproteksi instalasi jika terjadi arus lebih yang terjadi akibat konsleting" },
  spesTrafo:    { merk: "", typeVector: "", noSeri: "", kapasitas: "", tahun: "", teganganPS: "", arusPS: "", impedensi: "", sistemPendingin: "", jenisMinyak: "", volume: "" },
  fotoTrafo:    null,
  namaLokasi:   "",
  pj5Id:        null,
};

// ─── Root ──────────────────────────────────────────────────────────────────
export default function TemplateLaikOperasi({ data = {}, instansi, pageMargin = 10, fontScale = 1 }) {
  const marginPx = Math.round(pageMargin * MM_TO_PX);
  const fs       = (pt) => `${pt * fontScale}pt`;
  const d        = { ...defaultDataLaikOperasi, ...data };
  const pjList   = instansi?.penanggungJawab ?? [];
  // Fallback: gunakan snapshot ttd (nama+jabatan+signature sudah disimpan saat assign)
  const snapshotPj = d.pemeriksaNama ? {
    id: "snapshot",
    nama:      d.pemeriksaNama,
    jabatan:   d.pemeriksaJabatan,
    signature: d.pemeriksaSignatureUrl ? { url: d.pemeriksaSignatureUrl } : null,
    stempel:   d.pemeriksaStempelUrl   ? { url: d.pemeriksaStempelUrl   } : null,
  } : null;
  const findPj = (pjId) => pjList.find((p) => p.id === pjId) ?? snapshotPj;

  const SHELL = {
    width: A4_W, minHeight: A4_H, background: "#fff",
    boxSizing: "border-box", padding: marginPx, display: "flex", flexDirection: "column",
    fontFamily: "'Times New Roman', 'Times', serif",
    fontSize: fs(11), color: C.text, lineHeight: 1.4,
  };

  const pages = [
    /* Page 1 */ (
      <>
        <SectionHeader label="I. JARAK BEBAS" fs={fs} />
        <MeasurementTable data={d} fs={fs} />
      </>
    ),
    /* Page 2 */ (
      <>
        <BlockTitle label="FOTO PENGUKURAN JARAK BEBAS" fs={fs} mt={0} />
        <PhotoGridJarakBebas foto={d.fotoJarakBebas} fs={fs} />
        <TtdRow
          saksiInstansi={d.saksi2Instansi} saksiNama={d.saksi1Nama} saksiJabatan={d.saksi1Jabatan}
          saksiSignatureUrl={d.saksiSignatureUrl} saksiStempelUrl={d.saksiStempelUrl}
          pj={findPj(d.pj1Id)} instansi={instansi} fs={fs}
        />
      </>
    ),
    /* Page 3 */ (
      <>
        <SectionHeader label="II. KONSTRUKSI" fs={fs} />
        <PhotoGridKonstruksi foto={d.fotoKonstruksi} fs={fs} />
        <TtdRow
          saksiInstansi={d.saksi2Instansi} saksiNama={d.saksi2Nama} saksiJabatan={d.saksi2Jabatan}
          saksiSignatureUrl={d.saksiSignatureUrl} saksiStempelUrl={d.saksiStempelUrl}
          pj={findPj(d.pj2Id)} instansi={instansi} fs={fs}
        />
      </>
    ),
    /* Page 4 — PHB TM: Silih Kunci analysis + Peralatan Proteksi */ (
      <>
        <SectionHeader label="III. PEMERIKSAAN FUNGSI PHB TM" fs={fs} />
        <SubLabel label="Pemeriksaan Silih Kunci (Interlock)" fs={fs} />
        <AnalysisBlock title="Pemeriksaan Silih Kunci (Interlock) PHB TM" text={d.analysisSilihKunci} fs={fs} />
        <SubLabel label="Pemeriksaan Fungsi Proteksi dan Kontrol" fs={fs} />
        <BlockTitle label="PERALATAN PROTEKSI" fs={fs} mt={4} />
        <InterlockTable rows={d.interlockPhbTm ?? []} fs={fs} />
      </>
    ),
    /* Page 5 — PHB TM: Peralatan Kontrol + Foto LBS + Urutan Fasa + TTD */ (
      <>
        <BlockTitle label="PERALATAN KONTROL" fs={fs} mt={0} />
        <KontrolTableTM rows={d.interlockPhbTmKontrol ?? []} fs={fs} />
        <BlockTitle label="FOTO" fs={fs} mt={10} />
        <LbsPhotoGrid fotos={d.fotoLbs ?? []} fs={fs} />
        <AnalysisBlock title="Pengujian Urutan Fasa PHB TM" text={d.analysisUrutanFasaTm} fs={fs} />
        <TtdRow
          saksiInstansi={d.saksi2Instansi} saksiNama={d.saksi3Nama} saksiJabatan={d.saksi3Jabatan}
          saksiSignatureUrl={d.saksiSignatureUrl} saksiStempelUrl={d.saksiStempelUrl}
          pj={findPj(d.pj3Id)} instansi={instansi} fs={fs}
        />
      </>
    ),
    /* Page 6 — PHB TR: Peralatan Proteksi */ (
      <>
        <SectionHeader label="IV. PEMERIKSAAN FUNGSI PHB TR" fs={fs} />
        <SubLabel label="Pemeriksaan Fungsi Proteksi dan Kontrol" fs={fs} />
        <BlockTitle label="PERALATAN PROTEKSI" fs={fs} mt={4} />
        <InterlockTable rows={d.interlockPhbTr ?? []} fs={fs} />
      </>
    ),
    /* Page 7 — PHB TR: Peralatan Kontrol + Foto + Urutan Fasa + TTD */ (
      <>
        <BlockTitle label="PERALATAN KONTROL" fs={fs} mt={0} />
        <KontrolTableTR rows={d.interlockPhbTrKontrol ?? []} fs={fs} />
        <BlockTitle label="FOTO" fs={fs} mt={10} />
        <LbsPhotoGrid fotos={d.fotoPhbTr ?? []} fs={fs} />
        <AnalysisBlock title="Pengujian Urutan Fasa PHB TR" text={d.analysisUrutanFasaTr} fs={fs} />
        <TtdRow
          saksiInstansi={d.saksi2Instansi} saksiNama={d.saksi4Nama} saksiJabatan={d.saksi4Jabatan}
          saksiSignatureUrl={d.saksiSignatureUrl} saksiStempelUrl={d.saksiStempelUrl}
          pj={findPj(d.pj4Id)} instansi={instansi} fs={fs}
        />
      </>
    ),

    /* Page 8 — V. Pengaman Elektrik */ (
      <>
        <SectionHeader label="V. PENGAMAN ELEKTRIK" fs={fs} />
        <PengamanElektrikTable data={d.pengamanElektrik} fs={fs} />
        <BlockTitle label="FOTO PENGAMAN ELEKTRIK" fs={fs} mt={10} />
        <FotoRowDouble
          left={{ src: d.fotoPengamanElektrik?.phbTr?.url, label: "PHB TR — ACB Utama" }}
          right={{ src: d.fotoPengamanElektrik?.phbTm?.url, label: "PHB TM — Incoming" }}
          h={240} fs={fs}
        />
        <TtdRow
          saksiInstansi={d.saksi2Instansi} saksiNama={d.saksi2Nama} saksiJabatan={d.saksi2Jabatan}
          saksiSignatureUrl={d.saksiSignatureUrl} saksiStempelUrl={d.saksiStempelUrl}
          pj={findPj(d.pj2Id)} instansi={instansi} fs={fs}
        />
      </>
    ),

    /* Page 9 — VI. Pengaman Mekanik */ (
      <>
        <SectionHeader label="VI. PENGAMAN MEKANIK" fs={fs} />
        <SubLabel label="1. DGPT (Differential Gas Pressure Temperature)" fs={fs} />
        <div style={{ fontSize: fs(10), lineHeight: 1.55, marginBottom: 8, padding: "0 4px" }}>
          DGPT merupakan alat proteksi mekanik pada transformator yang bekerja berdasarkan perbedaan suhu, tekanan gas, dan level minyak transformator. Alat ini memberikan sinyal alarm atau trip apabila kondisi abnormal terdeteksi.
        </div>
        <BlockTitle label="FOTO DGPT" fs={fs} mt={4} />
        <FotoRowSingle src={d.fotoPengamanMekanik?.dgpt?.url} label="Foto DGPT" h={210} fs={fs} />
        <SubLabel label="2. Kaki Pengunci Trafo" fs={fs} />
        <div style={{ fontSize: fs(10), lineHeight: 1.55, marginBottom: 8, padding: "0 4px" }}>
          Pemeriksaan kaki pengunci trafo dilakukan untuk memastikan transformator tidak bergerak dari posisinya sehingga tidak mengakibatkan kerusakan pada kabel atau busbar yang terhubung.
        </div>
        <BlockTitle label="FOTO KAKI PENGUNCI TRAFO" fs={fs} mt={4} />
        <FotoRowSingle src={d.fotoPengamanMekanik?.gerakTrafo?.url} label="Foto Kaki Pengunci Trafo" h={210} fs={fs} />
        <TtdRow
          saksiInstansi={d.saksi2Instansi} saksiNama={d.saksi2Nama} saksiJabatan={d.saksi2Jabatan}
          saksiSignatureUrl={d.saksiSignatureUrl} saksiStempelUrl={d.saksiStempelUrl}
          pj={findPj(d.pj2Id)} instansi={instansi} fs={fs}
        />
      </>
    ),

    /* Page 10 — VII. Evaluasi Komponen Proteksi */ (
      <>
        <SectionHeader label="VII. EVALUASI KOMPONEN PROTEKSI" fs={fs} />
        <EvaluasiKomponenTable rows={d.evaluasiKomponen ?? []} fs={fs} />
        <BlockTitle label="FOTO EVALUASI KOMPONEN" fs={fs} mt={8} />
        <EvaluasiKomponenPhotos foto={d.fotoEvaluasiKomponen} fs={fs} />
      </>
    ),

    /* Page 11 — VIII. Pengukuran Suhu */ (
      <>
        <SectionHeader label="VIII. PENGUKURAN SUHU" fs={fs} />
        <SuhuTable
          title="PENGUKURAN SUHU KABEL TM — SISI PRIMER"
          rows={[
            { label: "Fasa R", nilai: d.suhuTmPrimer?.R },
            { label: "Fasa S", nilai: d.suhuTmPrimer?.S },
            { label: "Fasa T", nilai: d.suhuTmPrimer?.T },
            { label: "Netral", nilai: d.suhuTmPrimer?.N },
          ]}
          fs={fs}
        />
        <SuhuTable
          title="PENGUKURAN SUHU KABEL TR — SISI SEKUNDER"
          rows={[
            { label: "Fasa R", nilai: d.suhuTrSekunder?.R },
            { label: "Fasa S", nilai: d.suhuTrSekunder?.S },
            { label: "Fasa T", nilai: d.suhuTrSekunder?.T },
            { label: "Netral", nilai: d.suhuTrSekunder?.N },
          ]}
          fs={fs}
        />
        <SuhuTable
          title="PENGUKURAN SUHU PHB TM"
          rows={[
            { label: "Fasa R", nilai: d.suhuPhbTm?.R },
            { label: "Fasa S", nilai: d.suhuPhbTm?.S },
            { label: "Fasa T", nilai: d.suhuPhbTm?.T },
          ]}
          fs={fs}
        />
        <SuhuTable
          title="PENGUKURAN SUHU PHB TR"
          rows={[
            { label: "Fasa R", nilai: d.suhuPhbTr?.R },
            { label: "Fasa S", nilai: d.suhuPhbTr?.S },
            { label: "Fasa T", nilai: d.suhuPhbTr?.T },
            { label: "Netral", nilai: d.suhuPhbTr?.N },
          ]}
          fs={fs}
        />
        <BlockTitle label="FOTO PENGUKURAN SUHU" fs={fs} mt={6} />
        <FotoGrid6
          fotos={d.fotoSuhu ?? []}
          labels={["Suhu TM R","Suhu TM S","Suhu TR R","Suhu TR S","Suhu PHB TM R","Suhu PHB TM S"]}
          h={100} fs={fs}
        />
      </>
    ),

    /* Page 12 — IX. Isolasi Part 1: PHB TM + Kabel TM + Primer */ (
      <>
        <SectionHeader label="IX. TAHANAN ISOLASI" fs={fs} />
        <IsolasiSubTable
          title="TAHANAN ISOLASI PHB TM (CUBICLE INCOMING)"
          rows={[
            { label: "R - GND", nilai: d.isolasiPhbTm?.rGnd },
            { label: "S - GND", nilai: d.isolasiPhbTm?.sGnd },
            { label: "T - GND", nilai: d.isolasiPhbTm?.tGnd },
            { label: "R - S",   nilai: d.isolasiPhbTm?.rs },
            { label: "S - T",   nilai: d.isolasiPhbTm?.st },
            { label: "R - T",   nilai: d.isolasiPhbTm?.rt },
          ]}
          fs={fs}
        />
        <IsolasiSubTable
          title="TAHANAN ISOLASI KABEL TM"
          rows={[
            { label: "R - GND", nilai: d.isolasiKabelTm?.rGnd },
            { label: "S - GND", nilai: d.isolasiKabelTm?.sGnd },
            { label: "T - GND", nilai: d.isolasiKabelTm?.tGnd },
            { label: "R - S",   nilai: d.isolasiKabelTm?.rs },
            { label: "S - T",   nilai: d.isolasiKabelTm?.st },
            { label: "R - T",   nilai: d.isolasiKabelTm?.rt },
          ]}
          fs={fs}
        />
        <IsolasiSubTable
          title="TAHANAN ISOLASI TRAFO — SISI PRIMER"
          rows={[
            { label: "R - GND", nilai: d.isolasiPrimer?.rGnd },
            { label: "S - GND", nilai: d.isolasiPrimer?.sGnd },
            { label: "T - GND", nilai: d.isolasiPrimer?.tGnd },
            { label: "R - S",   nilai: d.isolasiPrimer?.rS },
            { label: "S - T",   nilai: d.isolasiPrimer?.sT },
            { label: "T - R",   nilai: d.isolasiPrimer?.tR },
          ]}
          fs={fs}
        />
      </>
    ),

    /* Page 13 — IX. Isolasi Part 2: Sekunder + Primer-Sekunder + PHB TR + Kabel TR + TTD */ (
      <>
        <IsolasiSubTable
          title="TAHANAN ISOLASI TRAFO — SISI SEKUNDER"
          rows={[
            { label: "R - GND", nilai: d.isolasiSkunder?.rGnd },
            { label: "S - GND", nilai: d.isolasiSkunder?.sGnd },
            { label: "T - GND", nilai: d.isolasiSkunder?.tGnd },
            { label: "N - GND", nilai: d.isolasiSkunder?.nGnd },
            { label: "R - S",   nilai: d.isolasiSkunder?.rS },
            { label: "S - T",   nilai: d.isolasiSkunder?.sT },
            { label: "T - R",   nilai: d.isolasiSkunder?.tR },
            { label: "R - N",   nilai: d.isolasiSkunder?.rN },
            { label: "S - N",   nilai: d.isolasiSkunder?.sN },
            { label: "T - N",   nilai: d.isolasiSkunder?.tN },
          ]}
          fs={fs}
        />
        <IsolasiPrimerSkunderTable data={d.isolasiPrimerSkunder} fs={fs} />
        <IsolasiSubTable
          title="TAHANAN ISOLASI PHB TR (INCOMING)"
          rows={[
            { label: "R - GND", nilai: d.isolasiPhbTr?.rGnd },
            { label: "S - GND", nilai: d.isolasiPhbTr?.sGnd },
            { label: "T - GND", nilai: d.isolasiPhbTr?.tGnd },
            { label: "N - GND", nilai: d.isolasiPhbTr?.nGnd },
            { label: "R - S",   nilai: d.isolasiPhbTr?.rs },
            { label: "S - T",   nilai: d.isolasiPhbTr?.st },
          ]}
          fs={fs}
        />
        <IsolasiSubTable
          title="TAHANAN ISOLASI KABEL TR"
          rows={[
            { label: "R - GND", nilai: d.isolasiKabelTr?.rGnd },
            { label: "S - GND", nilai: d.isolasiKabelTr?.sGnd },
            { label: "T - GND", nilai: d.isolasiKabelTr?.tGnd },
            { label: "R - S",   nilai: d.isolasiKabelTr?.rs },
            { label: "S - T",   nilai: d.isolasiKabelTr?.st },
            { label: "R - T",   nilai: d.isolasiKabelTr?.rt },
          ]}
          fs={fs}
        />
        <TtdRow
          saksiInstansi={d.saksi2Instansi} saksiNama={d.saksi2Nama} saksiJabatan={d.saksi2Jabatan}
          saksiSignatureUrl={d.saksiSignatureUrl} saksiStempelUrl={d.saksiStempelUrl}
          pj={findPj(d.pj3Id)} instansi={instansi} fs={fs}
        />
      </>
    ),

    /* Page 14 — Foto Isolasi (10 foto 5×2) */ (
      <>
        <BlockTitle label="FOTO TAHANAN ISOLASI" fs={fs} mt={0} />
        <FotoIsolasiGrid fotos={d.fotoIsolasi ?? []} fs={fs} />
      </>
    ),

    /* Page 15 — X. Grounding: Sistem + Hasil + Foto Pengukuran */ (
      <>
        <SectionHeader label="X. GROUNDING" fs={fs} />
        <GroundingSection data={d} fs={fs} />
      </>
    ),

    /* Page 16 — X. Grounding: Foto Sistem + TTD */ (
      <>
        <BlockTitle label="FOTO SISTEM GROUNDING TERPASANG" fs={fs} mt={0} />
        <FotoGroundingGrid
          pengukuran={d.fotoPengukuranGrounding ?? []}
          sistem={d.fotoSistemGrounding}
          fs={fs}
        />
        <TtdRow
          saksiInstansi={d.saksi2Instansi} saksiNama={d.saksi2Nama} saksiJabatan={d.saksi2Jabatan}
          saksiSignatureUrl={d.saksiSignatureUrl} saksiStempelUrl={d.saksiStempelUrl}
          pj={findPj(d.pj4Id)} instansi={instansi} fs={fs}
        />
      </>
    ),

    /* Page 17 — XI. Spesifikasi Teknik: Kabel TM/TR + PHB TM/TR */ (
      <>
        <SectionHeader label="XI. SPESIFIKASI TEKNIK" fs={fs} />
        <SpesTable title="SPESIFIKASI KABEL TM (SKTM)" rows={[
          ["Merk", d.spesKabelTm?.merk],
          ["Tipe", d.spesKabelTm?.tipe],
          ["Ukuran Penghantar", d.spesKabelTm?.ukuran],
          ["Panjang", d.spesKabelTm?.panjang ? `${d.spesKabelTm.panjang} m` : ""],
        ]} fs={fs} />
        <SpesTable title="SPESIFIKASI KABEL TR" rows={[
          ["Merk", d.spesKabelTr?.merk],
          ["Tipe", d.spesKabelTr?.tipe],
          ["Ukuran Penghantar", d.spesKabelTr?.ukuran],
          ["Panjang", d.spesKabelTr?.panjang ? `${d.spesKabelTr.panjang} m` : ""],
        ]} fs={fs} />
        <SpesTable title="SPESIFIKASI PHB TM" rows={[
          ["Merk", d.spesPhbTm?.merk],
          ["Tipe", d.spesPhbTm?.tipe],
          ["Rating Tegangan", d.spesPhbTm?.ratingV ? `${d.spesPhbTm.ratingV} kV` : ""],
          ["Rating Arus", d.spesPhbTm?.ratingI ? `${d.spesPhbTm.ratingI} A` : ""],
        ]} fs={fs} />
        <SpesTable title="SPESIFIKASI PHB TR (ACB UTAMA)" rows={[
          ["Merk", d.spesPhbTr?.merk],
          ["Tipe", d.spesPhbTr?.tipe],
          ["Rating Arus", d.spesPhbTr?.ratingI ? `${d.spesPhbTr.ratingI} A` : ""],
          ["Jumlah", d.spesPhbTr?.jumlah],
          ["Tujuan", d.spesPhbTr?.tujuan],
        ]} fs={fs} />
      </>
    ),

    /* Page 18 — XI. Spesifikasi Trafo + Foto + XII. Kesimpulan + TTD */ (
      <>
        <SpesTrafoTable data={d.spesTrafo} fs={fs} />
        <BlockTitle label="FOTO NAMEPLATE TRAFO" fs={fs} mt={6} />
        <FotoRowSingle src={d.fotoTrafo?.url} label="Foto Nameplate Trafo" h={180} fs={fs} />
        <SectionHeader label="XII. KESIMPULAN" fs={fs} />
        <div style={{ border: `1px solid ${C.border}`, padding: "10px 14px", lineHeight: 1.7, fontSize: fs(11) }}>
          <strong>Kesimpulan : </strong>
          Berdasarkan hasil pemeriksaan dan pengujian yang telah dilaksanakan, dapat disimpulkan bahwa instalasi yang terpasang pada{" "}
          <strong>{d.namaLokasi || d.namaGardu || "..."}</strong>{" "}
          telah layak operasi dan telah memenuhi semua standar yang berlaku.
        </div>
        <TtdRow
          saksiInstansi={d.saksi2Instansi} saksiNama={d.saksi2Nama} saksiJabatan={d.saksi2Jabatan}
          saksiSignatureUrl={d.saksiSignatureUrl} saksiStempelUrl={d.saksiStempelUrl}
          pj={findPj(d.pj5Id)} instansi={instansi} fs={fs}
        />
      </>
    ),
  ];

  return (
    <div className="laporan-form" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <style>{`
        .lo-page { box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
        @media print {
          .lo-page { box-shadow: none !important; break-after: page; page-break-after: always; }
          .lo-page:last-child { break-after: auto; page-break-after: auto; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      {pages.map((content, i) => {
        const Frame = getKopStyle(instansi?.kopStyle);
        return (
          <div key={i} className="lo-page" style={SHELL}>
            <Frame
              instansi={instansi}
              data={d}
              ttd={{}}
              ttd_client={{}}
              code="E"
              title="REKOMENDASI LAIK OPERASI"
              showMataUji={false}
              showFooterTtd={false}
            >
              {content}
            </Frame>
          </div>
        );
      })}
    </div>
  );
}

// ─── Typography helpers ────────────────────────────────────────────────────
function SectionHeader({ label, fs }) {
  return (
    <div style={{
      textAlign: "center", fontWeight: 700, fontSize: fs(12),
      borderTop: `2px solid ${C.teal}`, borderBottom: `2px solid ${C.teal}`,
      padding: "5px 0", margin: "8px 0 10px",
      background: "#E6F6FA", letterSpacing: "0.5px",
    }}>
      {label}
    </div>
  );
}

function BlockTitle({ label, fs, mt = 8 }) {
  return (
    <div style={{
      textAlign: "center", fontWeight: 700, fontSize: fs(11),
      border: `1px solid ${C.border}`,
      padding: "4px 0", marginTop: mt, marginBottom: 6,
      background: C.thBg,
    }}>
      {label}
    </div>
  );
}

function SubLabel({ label, fs }) {
  return (
    <div style={{ fontWeight: 600, fontSize: fs(11), margin: "4px 0 6px" }}>
      {label}
    </div>
  );
}

// ─── Measurement Table (Jarak Bebas) ──────────────────────────────────────
const JB_LABEL = { phbTm: "PHB TM", trafo: "Trafo", phbTr: "PHB TR" };
const ARAH     = ["kiri", "kanan", "depan", "belakang"];

function MeasurementTable({ data, fs }) {
  const TD  = { border: `1px solid ${C.border}`, padding: "5px 10px", fontSize: fs(11) };
  const THS = { ...TD, background: C.thBg, fontWeight: 700, textAlign: "center" };

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <colgroup>
        <col style={{ width: "65%" }} />
        <col style={{ width: "35%" }} />
      </colgroup>
      <tbody>
        {Object.entries(JB_LABEL).map(([key, label], si) => (
          <>
            {si > 0 && (
              <tr key={`sep-${key}`}>
                <td colSpan={2} style={{ height: 8, border: "none" }} />
              </tr>
            )}
            <tr key={`hdr-${key}`}>
              <td colSpan={2} style={THS}>JARAK BEBAS {label.toUpperCase()}</td>
            </tr>
            {ARAH.map((arah) => (
              <tr key={`${key}-${arah}`}>
                <td style={TD}>Jarak {label} ke {arah}</td>
                <td style={{ ...TD, textAlign: "center" }}>
                  {data.jarakBebas?.[key]?.[arah] || "-"} cm
                </td>
              </tr>
            ))}
          </>
        ))}
      </tbody>
    </table>
  );
}

// ─── Photo cell ────────────────────────────────────────────────────────────
function PhotoCell({ src, label, h = 150, fs }) {
  return (
    <div style={{
      height: h, background: C.photoBg, border: `1px solid ${C.border}`,
      display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
    }}>
      {src
        ? <img src={src} alt={label} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        : <span style={{ fontSize: fs(8), color: C.muted, textAlign: "center", padding: 6 }}>{label}</span>}
    </div>
  );
}

// ─── Seksi 1: Grid foto jarak bebas (3 baris × 2 kolom) ───────────────────
function PhotoGridJarakBebas({ foto = {}, fs }) {
  const TD  = { border: `1px solid ${C.border}`, padding: 4 };
  const THS = { ...TD, background: C.thBg, fontWeight: 700, textAlign: "center", fontSize: fs(10) };
  const sections = [
    { key: "phbTm", label: "PENGUKURAN JARAK BEBAS PHB TM" },
    { key: "trafo",  label: "PENGUKURAN JARAK BEBAS TRAFO" },
    { key: "phbTr", label: "PENGUKURAN JARAK BEBAS PHB TR" },
  ];

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
      <colgroup><col style={{ width: "50%" }} /><col style={{ width: "50%" }} /></colgroup>
      <tbody>
        {sections.map(({ key, label }) => (
          <>
            <tr key={`title-${key}`}>
              <td colSpan={2} style={THS}>{label}</td>
            </tr>
            <tr key={`foto-${key}`}>
              <td style={TD}>
                <PhotoCell src={foto?.[key]?.pengukuran?.url} label="Foto Pengukuran" h={148} fs={fs} />
              </td>
              <td style={TD}>
                <PhotoCell src={foto?.[key]?.jauh?.url} label="Foto Jauh" h={148} fs={fs} />
              </td>
            </tr>
          </>
        ))}
      </tbody>
    </table>
  );
}

// ─── Seksi 2: Grid foto konstruksi (3 kolom) ──────────────────────────────
function PhotoGridKonstruksi({ foto = {}, fs }) {
  const TD  = { border: `1px solid ${C.border}`, padding: 4 };
  const THS = { ...TD, background: C.thBg, fontWeight: 700, textAlign: "center", fontSize: fs(10), padding: "5px 4px" };
  const items = [
    { key: "trafo",  label: "TRAFO" },
    { key: "phbTm", label: "PHB TM" },
    { key: "phbTr", label: "PHB TR" },
  ];

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", marginTop: 8 }}>
      <colgroup><col /><col /><col /></colgroup>
      <thead>
        <tr>{items.map((it) => <th key={it.key} style={THS}>{it.label}</th>)}</tr>
      </thead>
      <tbody>
        <tr>
          {items.map((it) => (
            <td key={it.key} style={TD}>
              <PhotoCell src={foto?.[it.key]?.url} label={`Foto ${it.label}`} h={220} fs={fs} />
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

// ─── Seksi 3: Grid foto LBS (2 foto berdampingan) ─────────────────────────
function LbsPhotoGrid({ fotos = [], fs }) {
  const TD = { border: `1px solid ${C.border}`, padding: 4 };
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
      <tbody>
        <tr>
          <td style={TD}><PhotoCell src={fotos[0]?.url} label="Foto LBS" h={200} fs={fs} /></td>
        </tr>
      </tbody>
    </table>
  );
}

// ─── Tabel interlock / proteksi PHB TM ────────────────────────────────────
function InterlockTable({ rows = [], fs }) {
  const TH = {
    border: `1px solid ${C.border}`, padding: "5px 8px",
    background: C.thBg, fontWeight: 700, textAlign: "center", fontSize: fs(10),
  };
  const TD = { border: `1px solid ${C.border}`, padding: "5px 8px", fontSize: fs(10), verticalAlign: "top" };

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <colgroup>
        <col style={{ width: "45%" }} />
        <col style={{ width: "23%" }} />
        <col style={{ width: "32%" }} />
      </colgroup>
      <thead>
        <tr>
          <th style={TH}>INDIKASI</th>
          <th style={TH}>HASIL UJI</th>
          <th style={TH}>KETERANGAN</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : C.rowAlt }}>
            <td style={TD}>{row.indikasi}</td>
            <td style={{ ...TD, textAlign: "center", color: "#1A7A4A", fontWeight: 600 }}>{row.hasilUji}</td>
            <td style={TD}>{row.keterangan}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Analysis text block ──────────────────────────────────────────────────
function AnalysisBlock({ title, text, fs }) {
  return (
    <div style={{ border: `1px solid ${C.border}`, marginTop: 6, marginBottom: 4 }}>
      <div style={{ background: C.thBg, padding: "4px 8px", fontWeight: 700, fontSize: fs(10) }}>
        {title}
      </div>
      <div style={{ padding: "6px 8px", fontSize: fs(10), lineHeight: 1.55 }}>
        <strong>Analisa : </strong>{text || "—"}
      </div>
    </div>
  );
}

// ─── Kontrol Table PHB TM (Indikasi | Satuan | Keterangan) ───────────────
function KontrolTableTM({ rows = [], fs }) {
  const TH = { border: `1px solid ${C.border}`, padding: "5px 8px", background: C.thBg, fontWeight: 700, textAlign: "center", fontSize: fs(10) };
  const TD = { border: `1px solid ${C.border}`, padding: "5px 8px", fontSize: fs(10) };
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <colgroup><col style={{ width: "50%" }} /><col style={{ width: "15%" }} /><col style={{ width: "35%" }} /></colgroup>
      <thead><tr><th style={TH}>INDIKASI</th><th style={TH}>HASIL UJI</th><th style={TH}>KETERANGAN</th></tr></thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : C.rowAlt }}>
            <td style={TD}>{row.indikasi}</td>
            <td style={{ ...TD, textAlign: "center" }}>{row.satuan}</td>
            <td style={TD}>{row.keterangan}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Kontrol Table PHB TR (Indikasi | Keterangan) ─────────────────────────
function KontrolTableTR({ rows = [], fs }) {
  const TH = { border: `1px solid ${C.border}`, padding: "5px 8px", background: C.thBg, fontWeight: 700, textAlign: "center", fontSize: fs(10) };
  const TD = { border: `1px solid ${C.border}`, padding: "5px 8px", fontSize: fs(10) };
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <colgroup><col style={{ width: "40%" }} /><col style={{ width: "60%" }} /></colgroup>
      <thead><tr><th style={TH}>INDIKASI</th><th style={TH}>KETERANGAN</th></tr></thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : C.rowAlt }}>
            <td style={TD}>{row.indikasi}</td>
            <td style={TD}>{row.keterangan}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── TTD: Saksi kiri | Pemeriksa & Penguji kanan ──────────────────────────
function TtdRow({ saksiInstansi, saksiNama, saksiJabatan, saksiSignatureUrl, saksiStempelUrl, pj, instansi, fs }) {
  const TH = {
    border: `1px solid ${C.border}`, padding: "5px 12px", width: "50%",
    background: C.thBg, fontWeight: 700, textAlign: "center", fontSize: fs(10),
  };
  const TD = { border: `1px solid ${C.border}`, padding: "8px 12px", width: "50%", verticalAlign: "top" };

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
      <thead>
        <tr>
          <th style={TH}>Saksi</th>
          <th style={TH}>Pemeriksa &amp; Penguji</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={{ ...TD, textAlign: "center" }}>
            <div style={{ fontSize: fs(10), marginBottom: 4 }}>{saksiInstansi || ""}</div>
            <div style={{ position: "relative", display: "inline-block", minHeight: 60 }}>
              {saksiSignatureUrl
                ? <img src={saksiSignatureUrl} alt="ttd klien" style={{ maxHeight: 60, maxWidth: 120, objectFit: "contain", display: "block" }} />
                : <div style={{ height: 60 }} />}
              {saksiStempelUrl && (
                <img src={saksiStempelUrl} alt="stempel klien"
                  style={{ maxHeight: 62, maxWidth: 62, objectFit: "contain", opacity: 0.85,
                    position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%) translateY(20%)" }} />
              )}
            </div>
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 4, fontSize: fs(10) }}>
              {saksiNama
                ? <><strong>({saksiNama})</strong><br /><span style={{ color: C.muted }}>{saksiJabatan}</span></>
                : <span style={{ color: C.muted }}>( ............................ )</span>}
            </div>
          </td>
          <td style={{ ...TD, textAlign: "center" }}>
            <div style={{ fontSize: fs(10), marginBottom: 4 }}>{instansi?.nama ?? ""}</div>
            <div style={{ position: "relative", display: "inline-block", minHeight: 60 }}>
              {pj?.signature?.url
                ? <img src={pj.signature.url} alt="ttd" style={{ maxHeight: 60, maxWidth: 120, objectFit: "contain", display: "block" }} />
                : <div style={{ height: 60 }} />}
              {pj?.stempel?.url && (
                <img src={pj.stempel.url} alt="stempel"
                  style={{ maxHeight: 62, maxWidth: 62, objectFit: "contain", opacity: 0.85,
                    position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%) translateY(20%)" }} />
              )}
            </div>
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 4, fontSize: fs(10) }}>
              {pj
                ? <><strong>({pj.nama})</strong><br /><span style={{ color: C.muted }}>{pj.jabatan}</span></>
                : <span style={{ color: C.muted }}>( ............................ )</span>}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

// ─── TTD Seksi 2: Saksi Tuan Rumah | Pihak Instansi (ES/PLN) ─────────────
function TtdRowDouble({ saksiNama, saksiJabatan, saksiInstansi, pj, instansi, fs }) {
  const TH = {
    border: `1px solid ${C.border}`, padding: "5px 12px", width: "50%",
    background: C.thBg, fontWeight: 700, textAlign: "center", fontSize: fs(10),
  };
  const TD = { border: `1px solid ${C.border}`, padding: "8px 12px", width: "50%", verticalAlign: "top" };

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
      <thead>
        <tr>
          <th style={TH}>
            Saksi
            <div style={{ fontSize: fs(9), fontWeight: 400 }}>(Pihak Tuan Rumah)</div>
          </th>
          <th style={TH}>
            Pemeriksa &amp; Penguji
            <div style={{ fontSize: fs(9), fontWeight: 400 }}>{instansi?.nama ?? ""}</div>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={TD}>
            {saksiInstansi && (
              <div style={{ fontSize: fs(10), marginBottom: 4 }}>{saksiInstansi}</div>
            )}
            <div style={{ height: 68 }} />
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 4, textAlign: "center", fontSize: fs(10) }}>
              {saksiNama
                ? <><strong>({saksiNama})</strong><br /><span style={{ color: C.muted }}>{saksiJabatan}</span></>
                : <span style={{ color: C.muted }}>( ............................ )</span>}
            </div>
          </td>
          <td style={{ ...TD, textAlign: "center" }}>
            {pj?.signature?.url
              ? <img src={pj.signature.url} alt="ttd" style={{ maxHeight: 60, maxWidth: 120, objectFit: "contain" }} />
              : <div style={{ height: 68 }} />}
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 4, fontSize: fs(10) }}>
              {pj
                ? <><strong>({pj.nama})</strong><br /><span style={{ color: C.muted }}>{pj.jabatan}</span></>
                : <span style={{ color: C.muted }}>( ............................ )</span>}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

// ─── V. Pengaman Elektrik table ────────────────────────────────────────────
function PengamanElektrikTable({ data = {}, fs }) {
  const TH = { border: `1px solid ${C.border}`, padding: "5px 8px", background: C.thBg, fontWeight: 700, textAlign: "center", fontSize: fs(10) };
  const TD = { border: `1px solid ${C.border}`, padding: "5px 8px", fontSize: fs(10) };
  const rows = [
    ["Nama Alat Proteksi", data.nama],
    ["Merk", data.merk],
    ["Tipe", data.tipe],
    ["Rating Arus", data.ratingI ? `${data.ratingI} A` : ""],
    ["Jumlah", data.jumlah],
    ["Tujuan Pemasangan", data.tujuan],
  ];
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
      <thead>
        <tr>
          <th style={{ ...TH, width: "35%" }}>KETERANGAN</th>
          <th style={TH}>NILAI / URAIAN</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, val], i) => (
          <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : C.rowAlt }}>
            <td style={TD}>{label}</td>
            <td style={TD}>{val || "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Generic 2-foto row (side by side) ────────────────────────────────────
function FotoRowDouble({ left, right, fs, h = 240 }) {
  const TD = { border: `1px solid ${C.border}`, padding: 4 };
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", marginTop: 4 }}>
      <colgroup><col style={{ width: "50%" }} /><col style={{ width: "50%" }} /></colgroup>
      <tbody>
        <tr>
          <td style={TD}><PhotoCell src={left.src} label={left.label} h={h} fs={fs} /></td>
          <td style={TD}><PhotoCell src={right.src} label={right.label} h={h} fs={fs} /></td>
        </tr>
      </tbody>
    </table>
  );
}

// ─── Single full-width foto ────────────────────────────────────────────────
function FotoRowSingle({ src, label, fs, h = 200 }) {
  return (
    <div style={{ border: `1px solid ${C.border}`, padding: 4, marginTop: 4 }}>
      <PhotoCell src={src} label={label} h={h} fs={fs} />
    </div>
  );
}

// ─── VII. Evaluasi Komponen table ─────────────────────────────────────────
function EvaluasiKomponenTable({ rows = [], fs }) {
  const TH = { border: `1px solid ${C.border}`, padding: "5px 8px", background: C.thBg, fontWeight: 700, textAlign: "center", fontSize: fs(10) };
  const TD = { border: `1px solid ${C.border}`, padding: "5px 8px", fontSize: fs(10) };
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
      <colgroup>
        <col style={{ width: "8%" }} /><col style={{ width: "22%" }} />
        <col style={{ width: "18%" }} /><col />
      </colgroup>
      <thead>
        <tr>
          <th style={TH}>NO</th>
          <th style={TH}>KOMPONEN</th>
          <th style={TH}>KETERANGAN</th>
          <th style={TH}>PENJELASAN</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : C.rowAlt }}>
            <td style={{ ...TD, textAlign: "center" }}>{row.no}</td>
            <td style={TD}>{row.komponen}</td>
            <td style={{ ...TD, textAlign: "center", color: "#1A7A4A", fontWeight: 600 }}>{row.keterangan}</td>
            <td style={TD}>{row.penjelasan}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── VII. Evaluasi Komponen — 6-foto grid (3 baris × 2) ───────────────────
function EvaluasiKomponenPhotos({ foto = {}, fs }) {
  const TD = { border: `1px solid ${C.border}`, padding: 4 };
  const THS = { ...TD, background: C.thBg, fontWeight: 700, textAlign: "center", fontSize: fs(10) };
  const items = [
    { key: "lbs",       label: "LBS" },
    { key: "relay",     label: "RELAY PROTEKSI" },
    { key: "ct",        label: "CT (Current Transformer)" },
    { key: "dgpt",      label: "DGPT" },
    { key: "acb",       label: "ACB" },
    { key: "kranTrafo", label: "KRAN MINYAK TRAFO" },
  ];
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
      <colgroup><col style={{ width: "50%" }} /><col style={{ width: "50%" }} /></colgroup>
      <tbody>
        {[[0, 1], [2, 3], [4, 5]].map(([ai, bi]) => (
          <>
            <tr key={`hdr-${ai}`}>
              <td style={THS}>{items[ai].label}</td>
              <td style={THS}>{items[bi].label}</td>
            </tr>
            <tr key={`foto-${ai}`}>
              <td style={TD}><PhotoCell src={foto?.[items[ai].key]?.url} label={`Foto ${items[ai].label}`} h={128} fs={fs} /></td>
              <td style={TD}><PhotoCell src={foto?.[items[bi].key]?.url} label={`Foto ${items[bi].label}`} h={128} fs={fs} /></td>
            </tr>
          </>
        ))}
      </tbody>
    </table>
  );
}

// ─── VIII. Suhu — single measurement table ────────────────────────────────
function SuhuTable({ title, rows = [], fs }) {
  const TH = { border: `1px solid ${C.border}`, padding: "4px 6px", background: C.thBg, fontWeight: 700, textAlign: "center", fontSize: fs(9.5) };
  const TD = { border: `1px solid ${C.border}`, padding: "4px 6px", fontSize: fs(9.5), textAlign: "center" };
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ background: C.thBg, border: `1px solid ${C.border}`, padding: "4px 8px", fontWeight: 700, fontSize: fs(10), textAlign: "center" }}>
        {title}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...TH, width: "50%" }}>FASA</th>
            <th style={TH}>HASIL (°C)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : C.rowAlt }}>
              <td style={{ ...TD, fontWeight: 600 }}>{row.label}</td>
              <td style={TD}>{row.nilai || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── VIII. Foto Suhu — 6 foto (3 baris × 2) ──────────────────────────────
function FotoGrid6({ fotos = [], labels = [], fs, h = 110 }) {
  const TD = { border: `1px solid ${C.border}`, padding: 4 };
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
      <colgroup><col style={{ width: "50%" }} /><col style={{ width: "50%" }} /></colgroup>
      <tbody>
        {[0, 2, 4].map((start) => (
          <tr key={start}>
            <td style={TD}><PhotoCell src={fotos[start]?.url} label={labels[start] || `Foto ${start + 1}`} h={h} fs={fs} /></td>
            <td style={TD}><PhotoCell src={fotos[start + 1]?.url} label={labels[start + 1] || `Foto ${start + 2}`} h={h} fs={fs} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── 4-photo grid (2 rows × 2) ───────────────────────────────────────────
function FotoGrid4({ fotos = [], labels = [], fs, h = 110 }) {
  const TD = { border: `1px solid ${C.border}`, padding: 4 };
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
      <colgroup><col style={{ width: "50%" }} /><col style={{ width: "50%" }} /></colgroup>
      <tbody>
        {[0, 2].map((start) => (
          <tr key={start}>
            <td style={TD}><PhotoCell src={fotos[start]?.url} label={labels[start] || `Foto ${start + 1}`} h={h} fs={fs} /></td>
            <td style={TD}><PhotoCell src={fotos[start + 1]?.url} label={labels[start + 1] || `Foto ${start + 2}`} h={h} fs={fs} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── IX. Isolasi — single sub-table ───────────────────────────────────────
function IsolasiSubTable({ title, rows = [], fs }) {
  const TH = { border: `1px solid ${C.border}`, padding: "4px 6px", background: C.thBg, fontWeight: 700, textAlign: "center", fontSize: fs(9.5) };
  const TD = { border: `1px solid ${C.border}`, padding: "4px 6px", fontSize: fs(9.5), textAlign: "center" };
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ background: C.thBg, border: `1px solid ${C.border}`, padding: "4px 8px", fontWeight: 700, fontSize: fs(10), textAlign: "center" }}>
        {title}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...TH, width: "40%" }}>PENGUKURAN</th>
            <th style={TH}>HASIL (MΩ)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : C.rowAlt }}>
              <td style={{ ...TD, fontWeight: 600, textAlign: "left" }}>{row.label}</td>
              <td style={TD}>{row.nilai || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── IX. Isolasi Primer–Sekunder matrix ───────────────────────────────────
function IsolasiPrimerSkunderTable({ data = {}, fs }) {
  const TH = { border: `1px solid ${C.border}`, padding: "4px 6px", background: C.thBg, fontWeight: 700, textAlign: "center", fontSize: fs(9.5) };
  const TD = { border: `1px solid ${C.border}`, padding: "4px 6px", fontSize: fs(9.5), textAlign: "center" };
  const cols = ["SR", "SS", "ST"];
  const primerRows = [
    { label: "PR", keys: ["PR_SR", "PR_SS", "PR_ST"] },
    { label: "PS", keys: ["PS_SR", "PS_SS", "PS_ST"] },
    { label: "PT", keys: ["PT_SR", "PT_SS", "PT_ST"] },
  ];
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ background: C.thBg, border: `1px solid ${C.border}`, padding: "4px 8px", fontWeight: 700, fontSize: fs(10), textAlign: "center" }}>
        TAHANAN ISOLASI PRIMER – SEKUNDER (MΩ)
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...TH, width: "22%" }}>PRIMER \ SEKUNDER</th>
            {cols.map((c) => <th key={c} style={TH}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {primerRows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : C.rowAlt }}>
              <td style={{ ...TD, fontWeight: 600 }}>{row.label}</td>
              {row.keys.map((k) => <td key={k} style={TD}>{data[k] || "—"}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Foto Isolasi — 10 foto (5 baris × 2) ────────────────────────────────
function FotoIsolasiGrid({ fotos = [], fs }) {
  const TD = { border: `1px solid ${C.border}`, padding: 4 };
  const labels = [
    "Isolasi PHB TM — R-GND", "Isolasi PHB TM — S-GND",
    "Isolasi Trafo Primer — R-GND", "Isolasi Trafo Primer — S-GND",
    "Isolasi Trafo Sekunder — R-GND", "Isolasi Trafo Sekunder — S-GND",
    "Isolasi PHB TR — R-GND", "Isolasi PHB TR — S-GND",
    "Isolasi Kabel TM — R-GND", "Isolasi Kabel TR — R-GND",
  ];
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
      <colgroup><col style={{ width: "50%" }} /><col style={{ width: "50%" }} /></colgroup>
      <tbody>
        {[0, 2, 4, 6, 8].map((start) => (
          <tr key={start}>
            <td style={TD}><PhotoCell src={fotos[start]?.url} label={labels[start]} h={113} fs={fs} /></td>
            <td style={TD}><PhotoCell src={fotos[start + 1]?.url} label={labels[start + 1]} h={113} fs={fs} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── X. Grounding — Sistem Pembumian + Hasil Pengukuran ───────────────────
function GroundingSection({ data, fs }) {
  const TH = { border: `1px solid ${C.border}`, padding: "5px 8px", background: C.thBg, fontWeight: 700, textAlign: "center", fontSize: fs(10) };
  const TD = { border: `1px solid ${C.border}`, padding: "5px 8px", fontSize: fs(10) };
  const spesRows = [
    ["Nama Sistem Pembumian", data.sistemPembumian?.nama],
    ["Tipe Sistem Pembumian", data.sistemPembumian?.tipe],
    ["Bahan Penghantar", data.sistemPembumian?.bahan],
    ["Ukuran Penghantar", data.sistemPembumian?.ukuran ? `${data.sistemPembumian.ukuran} ${data.sistemPembumian?.satuan || "mm²"}` : ""],
    ["Jumlah Elektroda", data.sistemPembumian?.jumlah],
    ["Tujuan", data.sistemPembumian?.tujuan],
  ];
  const hasilRows = [
    ["Grounding Body Trafo",   data.groundingHasil?.bodyTrafo],
    ["Grounding Netral Trafo", data.groundingHasil?.netralTrafo],
    ["Grounding PHB TM",       data.groundingHasil?.phbTm],
    ["Grounding PHB TR",       data.groundingHasil?.phbTr],
  ];
  return (
    <>
      <SubLabel label="Sistem Pembumian yang Terpasang" fs={fs} />
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
        <colgroup><col style={{ width: "38%" }} /><col /></colgroup>
        <thead><tr><th style={TH}>KETERANGAN</th><th style={TH}>NILAI / URAIAN</th></tr></thead>
        <tbody>
          {spesRows.map(([label, val], i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : C.rowAlt }}>
              <td style={TD}>{label}</td>
              <td style={TD}>{val || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <SubLabel label="Hasil Pengukuran Grounding" fs={fs} />
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
        <colgroup><col style={{ width: "60%" }} /><col /></colgroup>
        <thead>
          <tr>
            <th style={TH}>LOKASI GROUNDING</th>
            <th style={TH}>HASIL (Ω)</th>
          </tr>
        </thead>
        <tbody>
          {hasilRows.map(([label, val], i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : C.rowAlt }}>
              <td style={TD}>{label}</td>
              <td style={{ ...TD, textAlign: "center" }}>{val || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <BlockTitle label="FOTO PENGUKURAN GROUNDING" fs={fs} mt={6} />
      <FotoGrid4
        fotos={data.fotoPengukuranGrounding ?? []}
        labels={["Pengukuran Grounding 1","Pengukuran Grounding 2","Pengukuran Grounding 3","Pengukuran Grounding 4"]}
        h={120} fs={fs}
      />
    </>
  );
}

// ─── X. Foto Sistem Grounding (2 baris × 2) ──────────────────────────────
function FotoGroundingGrid({ pengukuran = [], sistem = {}, fs }) {
  const TD = { border: `1px solid ${C.border}`, padding: 4 };
  const THS = { ...TD, background: C.thBg, fontWeight: 700, textAlign: "center", fontSize: fs(10) };
  const sisItems = [
    { key: "bodyTrafo",   label: "Grounding Body Trafo" },
    { key: "netralTrafo", label: "Grounding Netral Trafo" },
    { key: "phbTm",       label: "Grounding PHB TM" },
    { key: "phbTr",       label: "Grounding PHB TR" },
  ];
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
      <colgroup><col style={{ width: "50%" }} /><col style={{ width: "50%" }} /></colgroup>
      <tbody>
        {[[sisItems[0], sisItems[1]], [sisItems[2], sisItems[3]]].map(([a, b], ri) => (
          <>
            <tr key={`hdr-${ri}`}>
              <td style={THS}>{a.label}</td>
              <td style={THS}>{b.label}</td>
            </tr>
            <tr key={`foto-${ri}`}>
              <td style={TD}><PhotoCell src={sistem?.[a.key]?.url} label={a.label} h={170} fs={fs} /></td>
              <td style={TD}><PhotoCell src={sistem?.[b.key]?.url} label={b.label} h={170} fs={fs} /></td>
            </tr>
          </>
        ))}
      </tbody>
    </table>
  );
}

// ─── XI. Spesifikasi — generic 2-column key-value table ───────────────────
function SpesTable({ title, rows = [], fs }) {
  const TH = { border: `1px solid ${C.border}`, padding: "5px 8px", background: C.thBg, fontWeight: 700, textAlign: "center", fontSize: fs(10) };
  const TD = { border: `1px solid ${C.border}`, padding: "5px 8px", fontSize: fs(10) };
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ background: C.thBg, border: `1px solid ${C.border}`, padding: "4px 8px", fontWeight: 700, fontSize: fs(10), textAlign: "center" }}>
        {title}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <colgroup><col style={{ width: "36%" }} /><col /></colgroup>
        <tbody>
          {rows.map(([label, val], i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : C.rowAlt }}>
              <td style={TD}>{label}</td>
              <td style={TD}>{val || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── XI. Spesifikasi Trafo ─────────────────────────────────────────────────
function SpesTrafoTable({ data = {}, fs }) {
  const rows = [
    ["Merk",              data.merk],
    ["Type / Vector",     data.typeVector],
    ["No. Seri",          data.noSeri],
    ["Kapasitas",         data.kapasitas ? `${data.kapasitas} kVA` : ""],
    ["Tahun Pembuatan",   data.tahun],
    ["Tegangan PS",       data.teganganPS],
    ["Arus PS",           data.arusPS],
    ["Impedensi",         data.impedensi ? `${data.impedensi} %` : ""],
    ["Sistem Pendingin",  data.sistemPendingin],
    ["Jenis Minyak",      data.jenisMinyak],
    ["Volume Minyak",     data.volume ? `${data.volume} Liter` : ""],
  ];
  return <SpesTable title="SPESIFIKASI TRAFO DISTRIBUSI" rows={rows} fs={fs} />;
}
