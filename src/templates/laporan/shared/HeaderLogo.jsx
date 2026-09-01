import { formatDate } from "./helpers";

const BI = "1px solid #000";
const BO = "2px solid #000";

const LBL = { borderRight: BI, padding: "3px 6px", fontWeight: "bold", fontSize: "8pt", verticalAlign: "middle", whiteSpace: "nowrap" };
const COL = { borderRight: BI, padding: "3px 3px", textAlign: "center", fontSize: "8pt", verticalAlign: "middle", width: "8%" };
const VAL = { padding: "3px 6px", fontSize: "8pt", lineHeight: 1.3, wordBreak: "break-word", overflowWrap: "break-word", verticalAlign: "middle" };

export default function HeaderLogo({ instansi, data }) {
  const tanggal = formatDate(data?.ttd?.tanggal) || data?.ttd?.tanggal || "—";
  const noLhpp  = data?.noLhpp || "—";

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", border: BO, marginBottom: 4, tableLayout: "fixed" }}>
      <tbody>
        <tr>
          {/* KIRI: logo + nama instansi */}
          <td style={{ border: BI, width: "22%", padding: "6px 8px", textAlign: "center", verticalAlign: "middle" }}>
            {instansi?.logo?.url ? (
              <img
                src={instansi.logo.url} alt="logo"
                style={{ maxHeight: 88, maxWidth: 120, objectFit: "contain", display: "block", margin: "0 auto 3px" }}
              />
            ) : (
              <div style={{ height: 58, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8pt", color: "#999", border: "1px dashed #ccc" }}>
                (Logo)
              </div>
            )}
            <div style={{ fontWeight: "bold", fontSize: "7pt", lineHeight: 1.3, marginTop: 2 }}>
              {instansi?.nama ?? "—"}
            </div>
          </td>

          {/* TENGAH: judul formulir */}
          <td style={{ border: BI, padding: "8px 12px", textAlign: "center", verticalAlign: "middle", fontWeight: "bold", fontSize: "11pt", lineHeight: 1.65 }}>
            FORMULIR PEMERIKSAAN DAN<br />
            PENGUJIAN INSTALASI PEMANFAATAN<br />
            TM (TEGANGAN MENENGAH)
          </td>

          {/* KANAN: tabel info — height:"1px" memaksa inner table mengisi penuh tinggi row */}
          <td style={{ border: BI, width: "30%", padding: 0, height: "1px" }}>
            <table style={{ width: "100%", height: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <tr style={{ borderBottom: BI }}>
                  <td style={{ ...LBL, width: "34%" }}>Tanggal</td>
                  <td style={COL}>:</td>
                  <td style={VAL}>{tanggal}</td>
                </tr>
                <tr style={{ borderBottom: BI }}>
                  <td style={LBL}>Lokasi</td>
                  <td style={COL}>:</td>
                  <td style={VAL}>{data?.nama || "—"}{data?.kota ? ` (${data.kota})` : ""}</td>
                </tr>
                <tr>
                  <td style={LBL}>No LHPP</td>
                  <td style={COL}>:</td>
                  <td style={VAL}>{noLhpp}</td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
