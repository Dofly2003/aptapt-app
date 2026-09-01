// Teal Chevron Frame — SVG kop dual logo + chevron stripe + footer bar teal
// Dipakai instansi dgn kopStyle: "tealChevron"
//
// Props sama dgn FormalFrame:
//   instansi, data, ttd, ttd_client, code, title, showMataUji, showFooterTtd, children
//
// Catatan: gaya ini gak nampilin MataUjiTable & DualSignature — footer cuma bar dgn website.
// Kalau showMataUji=true & code+title ada, di-render sebagai label ringan di atas content.

export default function TealChevronFrame({
  instansi, data, ttd, ttd_client,
  code, title,
  showMataUji = true,
  showFooterTtd = true, // di gaya ini "footer TTD" gak ada, cuma bar; tapi tetep respect prop
  children,
}) {
  return (
    <>
      <div style={{ flexShrink: 0 }}>
        <TealChevronKop instansi={instansi} data={data} />
        {showMataUji && code && title && (
          <div style={{
            padding: "6px 10px", background: "#E6F6FA",
            borderLeft: "3px solid #006B80", marginTop: 4, marginBottom: 6,
            fontSize: "10pt", fontWeight: 700, color: "#003055",
          }}>
            {code} — {title}
          </div>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        {children}
      </div>

      <div style={{ flexShrink: 0, marginTop: "auto" }}>
        <TealChevronFooter instansi={instansi} />
      </div>
    </>
  );
}

// ─── SVG Kop: dual logo + chevron stripe teal ────────────────────────────────
function TealChevronKop({ instansi }) {
  const logo  = instansi?.logo?.url;
  const logo2 = instansi?.logo2?.url;
  return (
    <div style={{ marginBottom: 6 }}>
      <svg viewBox="0 0 614 100" style={{ width: "100%", display: "block" }}>
        <rect width="614" height="100" fill="#ffffff"/>
        <defs>
          <linearGradient id="kop-teal-g1" x1="26" y1="0" x2="491" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#035971"/>
            <stop offset="100%" stopColor="#00A2B9"/>
          </linearGradient>
        </defs>
        <polygon points="26,6 491,6 472,25 26,25" fill="url(#kop-teal-g1)"/>
        <polygon points="497,6 515,6 496,25 478,25" fill="#00A2B9"/>
        <polygon points="519,7 553,7 543,17 509,17" fill="#035971"/>
        <polygon points="556,7 562,7 552,17 546,17" fill="#FAF30E"/>

        {logo ? (
          <image href={logo} x="20" y="30" width="170" height="62" preserveAspectRatio="xMidYMid meet"/>
        ) : (
          <>
            <rect x="20" y="30" width="170" height="62" fill="none" stroke="#B0BEC5" strokeWidth="1" strokeDasharray="4 3"/>
            <text x="105" y="65" textAnchor="middle" fontSize="10" fill="#90A4AE">(Logo Instansi)</text>
          </>
        )}

        {logo2 ? (
          <image href={logo2} x="424" y="30" width="170" height="62" preserveAspectRatio="xMidYMid meet"/>
        ) : (
          <>
            <rect x="424" y="30" width="170" height="62" fill="none" stroke="#B0BEC5" strokeWidth="1" strokeDasharray="4 3"/>
            <text x="509" y="65" textAnchor="middle" fontSize="10" fill="#90A4AE">(Logo Partner)</text>
          </>
        )}
      </svg>
    </div>
  );
}

// ─── SVG Footer: bar teal + swoosh kiri + website ────────────────────────────
function TealChevronFooter({ instansi }) {
  const web = instansi?.web || "";
  return (
    <div>
      <svg viewBox="0 0 614 45" style={{ width: "100%", display: "block" }}>
        <rect width="614" height="45" fill="#ffffff"/>
        <defs>
          <linearGradient id="ft-teal-g1" x1="153" y1="0" x2="561" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0A6478"/>
            <stop offset="100%" stopColor="#0092A7"/>
          </linearGradient>
        </defs>
        <polygon points="153,27 172,3 561,3 561,27" fill="url(#ft-teal-g1)"/>
        {web && (
          <text x="540" y="19" textAnchor="end" fontSize="10" fontWeight="600" fill="#ffffff">{web}</text>
        )}
        <polygon points="82,27 100,27 130,3 112,3" fill="#024657"/>
        <polygon points="98,27 112,27 142,3 128,3" fill="#106999"/>
        <polygon points="116,27 128,27 158,3 146,3" fill="#0490AA"/>
      </svg>
    </div>
  );
}
