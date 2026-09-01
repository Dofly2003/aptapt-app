// Registry gaya kop + footer untuk laporan LHPP.
// Instansi.kopStyle → memilih Frame yang dipakai di SEMUA section (A.1 – F).
//
// Cara nambah gaya baru:
//   1. Bikin file XxxFrame.jsx dgn signature:
//        ({ instansi, data, ttd, ttd_client, code, title,
//           showMataUji, showFooterTtd, children }) => JSX
//   2. Tambah entry di sini.
//   3. Selesai — admin instansi otomatis lihat opsi baru di dropdown.

import FormalFrame from "./FormalFrame";
import FormalClientFrame from "./FormalClientFrame";
import TealChevronFrame from "./TealChevronFrame";

export const KOP_STYLES = {
  formal: {
    label: "Formal — Tabel Kop Hitam",
    description: "Kop tabel 3 kolom (logo | judul | tanggal/lokasi/no) dgn footer TTD 4 kolom.",
    Frame: FormalFrame,
  },
  formalClient: {
    label: "Formal Client — Footer TTD Klien Saja",
    description: "Kop tabel 3 kolom identik Formal, footer hanya TTD Saksi/Pemilik (tanpa Tenaga Teknik).",
    Frame: FormalClientFrame,
  },
  tealChevron: {
    label: "Teal Chevron — SVG Modern",
    description: "Kop SVG dual logo dgn stripe teal + footer bar teal berisi website.",
    Frame: TealChevronFrame,
  },
};

export const DEFAULT_KOP_STYLE = "formal";

export function getKopStyle(id) {
  return KOP_STYLES[id]?.Frame ?? KOP_STYLES[DEFAULT_KOP_STYLE].Frame;
}

export function getKopStyleMeta(id) {
  return KOP_STYLES[id] ?? KOP_STYLES[DEFAULT_KOP_STYLE];
}
