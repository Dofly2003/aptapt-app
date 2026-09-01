// KopStylePreview — mini A4 (di-scale) untuk preview kop+footer di admin instansi
// Render 1 halaman contoh dgn Frame yg dipilih, pakai data instansi live.

import { KOP_STYLES } from "./index";

const A4_W = 794;  // 210mm @ 96dpi (approx)
const A4_H = 1123; // 297mm

export default function KopStylePreview({ instansi, kopStyle, scale = 0.3 }) {
  const Frame = KOP_STYLES[kopStyle]?.Frame ?? KOP_STYLES.formal.Frame;

  const dummyData = {
    nama: instansi?.nama || "Contoh Pelanggan",
    noLhpp: "001/LHPP/DEMO/2026",
    tanggal: new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }),
    ttd: { tanggal: new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }) },
    noAgenda: "—",
    noNidi: "—",
  };

  return (
    <div style={{
      width: A4_W * scale,
      height: A4_H * scale,
      overflow: "hidden",
      border: "1px solid #e2e8f0",
      borderRadius: 6,
      background: "#fff",
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    }}>
      <div style={{
        width: A4_W,
        height: A4_H,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
        background: "#fff",
        padding: "12mm 15mm",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Times New Roman', serif",
        fontSize: "11pt",
        color: "#000",
      }}>
        <Frame
          instansi={instansi}
          data={dummyData}
          ttd={{}}
          ttd_client={{}}
          code="A.1"
          title="SPESIFIKASI TEKNIK PHB TM"
        >
          <div style={{ padding: 20, color: "#94a3b8", fontStyle: "italic", textAlign: "center", marginTop: 40 }}>
            <div style={{ fontSize: "14pt", marginBottom: 8, color: "#64748b", fontStyle: "normal", fontWeight: 700 }}>
              [ Contoh Isi Halaman ]
            </div>
            <div>Konten laporan (tabel, foto, evaluasi) muncul di sini</div>
            <div style={{ marginTop: 8, fontSize: "10pt" }}>sesuai section yang dibuka (A.1 – F)</div>
          </div>
        </Frame>
      </div>
    </div>
  );
}
