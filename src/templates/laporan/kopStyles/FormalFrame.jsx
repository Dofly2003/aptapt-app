// Formal Frame — gaya kop tabel 3 kolom + footer DualSignature (No Agenda, NIDI, TTD 4 kolom)
// Dipakai instansi dgn kopStyle: "formal"
//
// Props:
//   instansi, data, ttd, ttd_client — dilempar ke Kop & Footer
//   code, title                     — untuk tabel Mata Uji (opsional; kalau tidak ada, sub-header di-skip)
//   showMataUji                     — default true; false untuk section E (LaikOperasi)
//   showFooterTtd                   — default true; false untuk section yg punya TTD sendiri (LaikOperasi)
//   children                        — konten halaman

import { formatDate } from "../shared/helpers";

const B  = "1px solid #000";
const BO = "2px solid #000";

const MATA_UJI_MAP = {
  F: "PENDAHULUAN",
  A: "PEMERIKSAAN DOKUMEN",
  B: "PEMERIKSAAN KESESUAIAN DOKUMEN",
  C: "HASIL EVALUASI",
  D: "DATA HASIL UJI",
  E: "REKOMENDASI LAIK OPERASI",
};

export default function FormalFrame({
  instansi, data, ttd, ttd_client,
  code, title,
  showMataUji = true,
  showFooterTtd = true,
  children,
}) {
  return (
    <>
      <div className="laporan-section laporan-header" style={{ flexShrink: 0 }}>
        <FormalKop instansi={instansi} data={data} />
        {showMataUji && code && (
          <MataUjiTable code={code} title={title} />
        )}
      </div>

      <div className="laporan-section" style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        {children}
      </div>

      <div style={{ flexShrink: 0 }}>
        {showFooterTtd && (
          <>
            <div className="laporan-section">
              <CatatanBlock />
            </div>
            <div className="laporan-section laporan-footer">
              <DualSignature data={data} instansi={instansi} ttd={ttd} ttd_client={ttd_client} />
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ─── Kop tabel 3 kolom (logo+nama | judul | tanggal/lokasi/no LHPP) ───────────
function FormalKop({ instansi, data }) {
  const tanggal = formatDate(data?.ttd?.tanggal) || data?.ttd?.tanggal || data?.tanggal || "—";
  const noLhpp  = data?.noLhpp || data?.nomor || "—";

  const LBL = { borderRight: B, padding: "3px 6px", fontWeight: "bold", fontSize: "8pt", verticalAlign: "middle", whiteSpace: "nowrap" };
  const COL = { borderRight: B, padding: "3px 3px", textAlign: "center", fontSize: "8pt", verticalAlign: "middle", width: "8%" };
  const VAL = { padding: "3px 6px", fontSize: "8pt", lineHeight: 1.3, wordBreak: "break-word", overflowWrap: "break-word", verticalAlign: "middle" };

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", border: BO, marginBottom: 4, tableLayout: "fixed" }}>
      <tbody>
        <tr>
          <td style={{ border: B, width: "22%", padding: "6px 8px", textAlign: "center", verticalAlign: "middle" }}>
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

          <td style={{ border: B, padding: "8px 12px", textAlign: "center", verticalAlign: "middle", fontWeight: "bold", fontSize: "11pt", lineHeight: 1.65 }}>
            FORMULIR PEMERIKSAAN DAN<br />
            PENGUJIAN INSTALASI PEMANFAATAN<br />
            TM (TEGANGAN MENENGAH)
          </td>

          <td style={{ border: B, width: "30%", padding: 0, height: "1px" }}>
            <table style={{ width: "100%", height: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <tr style={{ borderBottom: B }}>
                  <td style={{ ...LBL, width: "34%" }}>Tanggal</td>
                  <td style={COL}>:</td>
                  <td style={VAL}>{tanggal}</td>
                </tr>
                <tr style={{ borderBottom: B }}>
                  <td style={LBL}>Lokasi</td>
                  <td style={COL}>:</td>
                  <td style={VAL}>{data?.nama || data?.namaLokasi || data?.namaGardu || "—"}{data?.kota ? ` (${data.kota})` : ""}</td>
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

// ─── Mata Uji sub-header ─────────────────────────────────────────────────────
function MataUjiTable({ code, title }) {
  const mataUji = MATA_UJI_MAP[code.split(".")[0]] || code;
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 6, fontSize: "10pt" }}>
      <tbody>
        {[
          ["MATA UJI",       mataUji],
          ["SUB MATA UJI",   title],
          ["HASIL EVALUASI", "SESUAI"],
        ].map(([lbl, val]) => (
          <tr key={lbl}>
            <td style={{ border: B, padding: "3px 8px", fontWeight: "bold", width: "26%" }}>{lbl}</td>
            <td style={{ border: B, padding: "3px 6px", textAlign: "center", width: "3%" }}>:</td>
            <td style={{ border: B, padding: "3px 8px", fontWeight: lbl === "HASIL EVALUASI" ? "bold" : "normal" }}>{val}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Catatan block ────────────────────────────────────────────────────────────
function CatatanBlock() {
  return (
    <div style={{ marginTop: 10, marginBottom: 6 }}>
      <div style={{ padding: "2px 0", fontWeight: "normal", fontSize: "10pt" }}>Catatan :</div>
      {[0, 1, 2, 3].map(i => (
        <div key={i} style={{ border: B, borderTop: i === 0 ? B : "none", height: 20 }} />
      ))}
    </div>
  );
}

// ─── Dual Signature — footer 4 kolom (No Agenda, NIDI, TT Tenaga Teknik, TT Saksi) ──
function DualSignature({ data, instansi, ttd, ttd_client }) {
  const pjId   = ttd?.penanggungJawabId;
  const pjList = instansi?.penanggungJawab ?? [];
  const livePj = pjId
    ? (pjList.find(p => p.id === pjId) ?? pjList.find(p => p.nama === ttd?.nama))
    : pjList.find(p => p.nama === ttd?.nama) ?? (pjList.length === 1 ? pjList[0] : null);

  const ttSigUrl     = livePj?.signature?.url || ttd?.signature?.url;
  const ttStempelUrl = livePj?.stempel?.url   || ttd?.stempel?.url;
  const ttNama       = data.pemeriksaNama || ttd?.nama || livePj?.nama || "(.................)";

  const clientSigUrl     = ttd_client?.signature?.url;
  const clientStempelUrl = ttd_client?.stempel?.url;
  const clientNama       = data.saksiNama || ttd_client?.nama || "(.................)";

  const SigArea = ({ sigUrl, stempelUrl }) => (
    <div style={{ position: "relative", height: 84, margin: "4px auto" }}>
      {sigUrl && (
        <img src={sigUrl} alt="ttd"
          style={{ position: "absolute", left: "50%", top: 0, transform: "translateX(-50%)",
            maxHeight: 84, maxWidth: 120, objectFit: "contain" }} />
      )}
      {stempelUrl && (
        <img src={stempelUrl} alt="stempel"
          style={{ position: "absolute", left: "50%", top: -4, transform: "translateX(-50%)",
            maxHeight: 84, maxWidth: 120, objectFit: "contain", opacity: 0.85 }} />
      )}
    </div>
  );

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", border: B, fontSize: "9pt", tableLayout: "fixed" }}>
      <colgroup>
        <col style={{ width: "15%" }} />
        <col style={{ width: "20%" }} />
        <col style={{ width: "32.5%" }} />
        <col style={{ width: "32.5%" }} />
      </colgroup>
      <tbody>
        <tr style={{ height: 28 }}>
          <td style={{ border: B, padding: "3px 6px", fontWeight: "bold" }}>No Agenda</td>
          <td style={{ border: B, padding: "3px 6px" }}>{data.noAgenda || "—"}</td>
          <td rowSpan={4} style={{ border: B, padding: "6px 8px", textAlign: "center", verticalAlign: "middle" }}>
            <div style={{ fontWeight: "bold", marginBottom: 6 }}>Tenaga Teknik</div>
            <SigArea sigUrl={ttSigUrl} stempelUrl={ttStempelUrl} />
          </td>
          <td rowSpan={4} style={{ border: B, padding: "6px 8px", textAlign: "center", verticalAlign: "middle" }}>
            <div style={{ fontWeight: "bold", marginBottom: 6 }}>Saksi/Pemilik Instalasi</div>
            <SigArea sigUrl={clientSigUrl} stempelUrl={clientStempelUrl} />
          </td>
        </tr>
        <tr style={{ height: 28 }}>
          <td style={{ border: B, padding: "3px 6px", fontWeight: "bold" }}>NIDI</td>
          <td style={{ border: B, padding: "3px 6px", wordBreak: "break-all" }}>{data.noNidi || "—"}</td>
        </tr>
        <tr style={{ height: 28 }}>
          <td style={{ border: B, padding: "3px 6px" }} />
          <td style={{ border: B, padding: "3px 6px" }} />
        </tr>
        <tr style={{ height: 28 }}>
          <td style={{ border: B, padding: "3px 6px" }} />
          <td style={{ border: B, padding: "3px 6px" }} />
        </tr>
        <tr>
          <td style={{ border: B, padding: "3px 6px" }} />
          <td style={{ border: B, padding: "3px 6px" }} />
          <td style={{ border: B, padding: "3px 8px", textAlign: "center", fontWeight: "bold" }}>{ttNama}</td>
          <td style={{ border: B, padding: "3px 8px", textAlign: "center", fontWeight: "bold" }}>{clientNama}</td>
        </tr>
      </tbody>
    </table>
  );
}
