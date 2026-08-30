export default function HeaderLogo({ instansi, formNumber, hideFormNumber = false }) {
  const SIDE_WIDTH = 110;     // kolom kiri (logo) & kanan (form number) sama lebar = simetris

  return (
    <div style={{ position: "relative", marginBottom: 10 }}>
      <table style={{
        width: "100%",
        borderCollapse: "collapse",
        marginBottom: 4,
        tableLayout: "fixed",
      }}>
        <tbody>
          <tr>
            {/* KIRI: logo */}
            <td style={{
              width: SIDE_WIDTH, verticalAlign: "middle",
              paddingRight: 8, textAlign: "left",
            }}>
              {instansi?.logo?.url ? (
                <img src={instansi.logo.url} alt="logo"
                  style={{ maxHeight: 70, maxWidth: 100, objectFit: "contain" }} />
              ) : (
                <div style={{
                  height: 70, border: "1px dashed #999",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "8pt", color: "#999",
                }}>(Logo)</div>
              )}
            </td>

            {/* TENGAH: nama + tagline + alamat */}
            <td style={{ verticalAlign: "middle", textAlign: "center" }}>
              <div style={{
                fontSize: "16pt", fontWeight: "bold", color: "#000",
                letterSpacing: 1, marginBottom: 2,
              }}>
                {instansi?.nama ?? "—"}
              </div>
              {instansi?.tagline && (
                <div style={{
                  fontSize: "9.5pt", fontWeight: "bold",
                  letterSpacing: 0.5, marginBottom: 2,
                }}>
                  {instansi.tagline}
                </div>
              )}
              <div style={{ fontSize: "9pt", whiteSpace: "pre-line" }}>
                {instansi?.alamat ?? ""}
              </div>
              {(instansi?.web || instansi?.telp) && (
                <div style={{ fontSize: "9pt" }}>
                  {instansi?.web && <>Web : <u>{instansi.web}</u></>}
                  {instansi?.web && instansi?.telp && "  "}
                  {instansi?.telp && <>Telp. {instansi.telp}</>}
                </div>
              )}
            </td>

            {/* KANAN: form number (atau kosong di cover) */}
            <td style={{
              width: SIDE_WIDTH, verticalAlign: "top",
              textAlign: "right", fontSize: "10pt", fontWeight: "bold",
            }}>
              {!hideFormNumber && formNumber ? `FORM - ${formNumber}` : ""}
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ borderTop: "2.5px solid #000", paddingTop: 1 }}>
        <div style={{ borderTop: "1px solid #000" }} />
      </div>
    </div>
  );
}