import { formatTanggalLengkap, terbilang } from "../../services/rabService";

const A4_W = 794;
const FNT  = "'Times New Roman', Times, serif";

export default function TemplateKwitansiAdytia({ data, company }) {
  const {
    nomor                 = "",
    pelangganNama         = "",
    pelangganAlamat       = "",
    keteranganPembayaran  = "",
    nominal               = 0,
    tanggal               = "",
    lokasi                = "Gresik",
    penerima              = "",
    jabatanPenerima       = "",
    ttdUrl                = "",
    stempelUrl            = "",
    logoInstansiUrl       = "",
  } = data || {};

  const {
    companyName = "PT. ADYTIA PUTRA TEHNIK",
    address     = "Desa Gading Watu RT.04 RW.04, Menganti – Gresik",
    email       = "adytiaputratehnik75@gmail.com",
    phone       = "085243570663",
    website     = "https://pt-adytia.com/",
    logoUrl     = "",
    direktur    = "",
  } = company || {};

  const nominalNum   = Number(nominal) || 0;
  const fmtNominal   = nominalNum.toLocaleString("id-ID");
  const terbilangTxt = terbilang(nominalNum);
  const tanggalFmt   = formatTanggalLengkap(tanggal);
  const signerName   = penerima || direktur || "________________";
  const resolvedLogo = logoInstansiUrl || logoUrl;

  return (
    <div style={{ width: A4_W + "px", fontFamily: FNT, fontSize: "11pt", color: "#000", background: "#fff", padding: "16px", boxSizing: "border-box" }}>
      <div style={{ border: "2.5px solid #1e1e1e", display: "flex", minHeight: "590px", boxSizing: "border-box" }}>

        {/* ── KWITANSI vertical strip ── */}
        <div style={{
          width: "38px", borderRight: "2px solid #1e1e1e",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, background: "#1e3a5f",
        }}>
          <span style={{
            writingMode: "vertical-rl", transform: "rotate(180deg)",
            fontWeight: "bold", fontSize: "12pt", letterSpacing: "5px",
            color: "#ffffff", userSelect: "none",
          }}>
            KWITANSI
          </span>
        </div>

        {/* ── Main content ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>

          {/* Header */}
          <div style={{
            display: "flex", borderBottom: "2px solid #1e1e1e",
            padding: "10px 16px", alignItems: "center", gap: "12px",
            background: "#f8faff",
          }}>
            {/* Logo */}
            <div style={{ width: "150px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {resolvedLogo ? (
                <img src={resolvedLogo} alt="logo" style={{ maxWidth: "145px", maxHeight: "100px", objectFit: "contain" }} />
              ) : (
                <div style={{ width: "145px", height: "100px", border: "1.5px dashed #94a3b8", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8pt", color: "#94a3b8", background: "#fff" }}>
                  LOGO
                </div>
              )}
            </div>

            {/* Divider */}
            <div style={{ width: "1.5px", alignSelf: "stretch", background: "#c7d2e0", flexShrink: 0 }} />

            {/* Company info */}
            <div style={{ flex: 1, textAlign: "center", lineHeight: 1.55 }}>
              <div style={{ fontWeight: "bold", fontSize: "14pt", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {companyName}
              </div>
              <div style={{ fontWeight: "bold", fontSize: "10pt", color: "#374151" }}>
                ELECTRICAL CONTRAKTOR &amp; TECHNICAL ENGGINEERING
              </div>
              <div style={{ fontSize: "9.5pt", color: "#374151", marginTop: "2px" }}>{address}</div>
              <div style={{ fontSize: "9.5pt", color: "#374151" }}>
                Email&nbsp;:&nbsp;<span style={{ textDecoration: "underline" }}>{email}</span>
                &nbsp;&nbsp;|&nbsp;&nbsp;
                Telp.&nbsp;{phone}
              </div>
              {website && (
                <div style={{ fontSize: "9.5pt", color: "#1d4ed8", textDecoration: "underline" }}>{website}</div>
              )}
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: "18px 22px", flex: 1, display: "flex", flexDirection: "column" }}>

            {/* ── No + Sudah Terima Dari ── */}
            <table style={{ width: "100%", borderCollapse: "collapse", lineHeight: 1.85, fontFamily: FNT }}>
              <colgroup>
                <col style={{ width: "175px" }} />
                <col style={{ width: "32px" }} />
                <col />
              </colgroup>
              <tbody>
                <tr>
                  <td style={{ verticalAlign: "top", paddingBottom: "2px" }}>
                    <span style={{ fontStyle: "italic" }}>No</span>
                  </td>
                  <td style={{ verticalAlign: "top", textAlign: "center" }}>:</td>
                  <td style={{ verticalAlign: "top", fontWeight: "600" }}>{nomor}</td>
                </tr>
                <tr>
                  <td style={{ verticalAlign: "top" }}>Sudah Terima Dari</td>
                  <td style={{ verticalAlign: "top", textAlign: "center" }}>:</td>
                  <td style={{ verticalAlign: "top" }}>
                    <div style={{ fontWeight: "bold" }}>{pelangganNama}</div>
                    {pelangganAlamat && (
                      <div style={{ color: "#374151", fontSize: "10.5pt" }}>{pelangganAlamat}</div>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ height: "20px" }} />

            {/* ── Untuk Pembayaran ── */}
            <table style={{ width: "100%", borderCollapse: "collapse", lineHeight: 1.85, fontFamily: FNT }}>
              <colgroup>
                <col style={{ width: "175px" }} />
                <col style={{ width: "32px" }} />
                <col />
              </colgroup>
              <tbody>
                <tr>
                  <td style={{ verticalAlign: "top", color: "#92400e", textDecoration: "underline", fontWeight: "bold" }}>
                    Untuk Pembayaran
                  </td>
                  <td style={{ verticalAlign: "top", textAlign: "center", color: "#92400e" }}>:</td>
                  <td style={{ verticalAlign: "top", textDecoration: "underline" }}>
                    {keteranganPembayaran}
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ height: "14px" }} />

            {/* ── Harga & Total Harga ── */}
            <table style={{ width: "100%", borderCollapse: "collapse", lineHeight: 1.85, fontFamily: FNT, tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: "175px" }} />
                <col style={{ width: "32px" }} />
                <col />
                <col style={{ width: "55px" }} />
                <col style={{ width: "145px" }} />
              </colgroup>
              <tbody>
                <tr>
                  <td>Harga</td>
                  <td style={{ textAlign: "center" }}>:</td>
                  <td></td>
                  <td style={{ textAlign: "right", paddingRight: "6px" }}>Rp</td>
                  <td style={{ textAlign: "right" }}>{fmtNominal}</td>
                </tr>
                <tr style={{
                  backgroundColor: "#fef08a",
                  WebkitPrintColorAdjust: "exact",
                  printColorAdjust: "exact",
                }}>
                  <td style={{ fontWeight: "bold", paddingTop: "1px", paddingBottom: "1px" }}>Total Harga</td>
                  <td style={{ textAlign: "center", color: "#92400e" }}>:</td>
                  <td></td>
                  <td style={{ textAlign: "right", paddingRight: "6px", fontWeight: "bold" }}>: Rp</td>
                  <td style={{ textAlign: "right", fontWeight: "bold" }}>{fmtNominal}</td>
                </tr>
              </tbody>
            </table>

            <div style={{ height: "22px" }} />

            {/* ── Terbilang ── */}
            <table style={{ width: "100%", borderCollapse: "collapse", lineHeight: 1.85, fontFamily: FNT }}>
              <colgroup>
                <col style={{ width: "175px" }} />
                <col style={{ width: "32px" }} />
                <col />
              </colgroup>
              <tbody>
                <tr>
                  <td style={{ verticalAlign: "top", color: "#92400e", textDecoration: "underline", fontWeight: "bold" }}>
                    Terbilang
                  </td>
                  <td style={{ verticalAlign: "top", textAlign: "center" }}>:</td>
                  <td style={{ verticalAlign: "top" }}>
                    <em style={{ fontWeight: "bold" }}>"{terbilangTxt}"</em>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Spacer */}
            <div style={{ flex: 1, minHeight: "28px" }} />

            {/* ── Footer / Signature ── */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginRight: "28px" }}>
              <div style={{ textAlign: "center", minWidth: "200px" }}>
                <div style={{ fontSize: "11pt" }}>
                  {lokasi}, {tanggalFmt}
                </div>
                <div style={{ marginTop: "6px", fontWeight: "600" }}>Penerima,</div>

                {/* TTD + stempel area */}
                <div style={{ position: "relative", height: "90px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {ttdUrl && (
                    <img
                      src={ttdUrl}
                      alt="TTD"
                      style={{ position: "absolute", maxHeight: "75px", maxWidth: "130px", objectFit: "contain", zIndex: 1 }}
                    />
                  )}
                  {stempelUrl && (
                    <img
                      src={stempelUrl}
                      alt="Stempel"
                      style={{ position: "absolute", width: "76px", height: "76px", objectFit: "contain", opacity: 0.8, zIndex: 2, left: "50%", transform: "translateX(-20px)" }}
                    />
                  )}
                  {!ttdUrl && !stempelUrl && (
                    <div style={{ width: "80px", height: "80px", borderRadius: "50%", border: "1.5px dashed #c7d2e0", opacity: 0.4 }} />
                  )}
                </div>

                <div style={{ display: "inline-block", minWidth: "150px", borderTop: "1.5px solid #1e1e1e", paddingTop: "3px", fontSize: "11pt" }}>
                  ( {signerName} )
                </div>
                {jabatanPenerima && (
                  <div style={{ fontSize: "9.5pt", color: "#374151", marginTop: "1px" }}>{jabatanPenerima}</div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
