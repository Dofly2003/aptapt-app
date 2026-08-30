import { forwardRef } from "react";

const W = 1122;
const H = 794;

const NAVY   = "#1a2f5f";
const NAVY_D = "#0d1e3c";
const NAVY_M = "#1e3a72";
const CHAR   = "#1e1e2e";
const RED    = "#c0392b";
const RED_L  = "#e74c3c";
const AMBER  = "#f59e0b";
const CREAM  = "#faf7f0";
const GOLD   = "#c8a847";
const DARK_T = "#0f1e3c";
const GRAY_T = "#4a5568";

function fmt(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function Corner({ t, b, l, r }) {
  const top  = t !== undefined;
  const left = l !== undefined;
  return (
    <div style={{ position: "absolute", top: t, bottom: b, left: l, right: r, width: 32, height: 32 }}>
      <div style={{ position: "absolute", [top ? "top" : "bottom"]: 0, [left ? "left" : "right"]: 0, width: 32, height: 2, background: `linear-gradient(${left ? "to right" : "to left"}, ${GOLD}, transparent)` }} />
      <div style={{ position: "absolute", [top ? "top" : "bottom"]: 0, [left ? "left" : "right"]: 0, width: 2, height: 32, background: `linear-gradient(${top ? "to bottom" : "to top"}, ${GOLD}, transparent)` }} />
      <div style={{ position: "absolute", [top ? "top" : "bottom"]: 5, [left ? "left" : "right"]: 5, width: 4, height: 4, borderRadius: "50%", background: GOLD, opacity: 0.75 }} />
    </div>
  );
}

function InfoCard({ icon, label, value }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      background: "white",
      border: `1px solid rgba(226,220,205,0.9)`,
      borderLeft: `3px solid ${NAVY}`,
      borderRadius: 6,
      padding: "10px 14px",
      flex: 1,
      minWidth: 0,
      boxShadow: "0 1px 5px rgba(0,0,0,0.07)",
    }}>
      <span style={{ fontSize: 17, lineHeight: 1, flexShrink: 0 }}>{icon}</span>
      <div style={{ minWidth: 0, overflow: "hidden" }}>
        <div style={{
          fontSize: 6.5, color: "#94a3b8", letterSpacing: 1.5,
          textTransform: "uppercase", fontFamily: "Arial,sans-serif", marginBottom: 3,
          whiteSpace: "nowrap",
        }}>{label}</div>
        <div style={{
          fontSize: 9.5, fontWeight: "bold", color: DARK_T,
          fontFamily: "Arial,sans-serif", lineHeight: 1.3,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{value || "—"}</div>
      </div>
    </div>
  );
}

function SigBlock({ name, title, company, align = "left" }) {
  return (
    <div style={{ textAlign: align }}>
      {align === "left" && (
        <div style={{ width: 170, borderTop: "1.5px solid #374151", marginBottom: 7 }} />
      )}
      {align === "right" && (
        <div style={{ width: 170, borderTop: "1.5px solid #374151", marginBottom: 7, marginLeft: "auto" }} />
      )}
      <div style={{ fontSize: 13, fontWeight: "bold", color: DARK_T, fontFamily: "Georgia,serif" }}>{name}</div>
      <div style={{ fontSize: 9, color: RED, fontStyle: "italic", fontFamily: "Arial,sans-serif", marginTop: 2 }}>{title}</div>
      <div style={{ fontSize: 9, color: GRAY_T, fontFamily: "Arial,sans-serif", marginTop: 1 }}>{company}</div>
    </div>
  );
}

const TemplateSertifikatMagang = forwardRef(function TemplateSertifikatMagang({ data, logoUrl }, ref) {
  const {
    nomorSertifikat = "000/APT-MGNG/I/2026",
    nama            = "Nama Peserta Magang",
    nim             = "",
    institusi       = "",
    divisi          = "",
    periodeAwal     = "",
    periodeAkhir    = "",
    pembimbing      = "Roshy Maulana",
    direktur        = "Adytia Putra",
    tanggalTerbit   = "",
    tahun           = new Date().getFullYear(),
  } = data || {};

  const periode =
    periodeAwal && periodeAkhir ? `${fmt(periodeAwal)} – ${fmt(periodeAkhir)}`
    : periodeAwal ? fmt(periodeAwal) : "—";

  return (
    <div ref={ref} style={{
      width: W, height: H, display: "flex",
      fontFamily: "Georgia,'Times New Roman',serif",
      overflow: "hidden", backgroundColor: CREAM,
    }}>

      {/* ══ SIDEBAR ══ */}
      <div style={{
        width: 210, flexShrink: 0,
        background: `linear-gradient(160deg, ${NAVY_M} 0%, ${NAVY} 45%, ${NAVY_D} 100%)`,
        display: "flex", flexDirection: "column",
        alignItems: "center", padding: "30px 18px 22px",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -60, right: -60, width: 180, height: 180, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.06)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: 80, left: -50, width: 140, height: 140, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.04)", pointerEvents: "none" }} />

        <div style={{ width: 108, height: 108, borderRadius: "50%", background: "white", border: "4px solid rgba(255,255,255,0.2)", boxShadow: `0 4px 24px rgba(0,0,0,0.35), 0 0 0 1px rgba(245,158,11,0.35)`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: 16, flexShrink: 0 }}>
          {logoUrl
            ? <img src={logoUrl} alt="Logo" crossOrigin="anonymous" style={{ width: 88, height: 88, objectFit: "contain" }} />
            : <div style={{ fontFamily: "Georgia,serif", fontSize: 28, fontWeight: "bold", color: NAVY_D, letterSpacing: 1 }}>APT</div>
          }
        </div>

        <div style={{ textAlign: "center", marginBottom: 2 }}>
          <div style={{ color: "rgba(255,255,255,0.92)", fontSize: 12, fontWeight: "bold", lineHeight: 1.3 }}><span style={{ color: AMBER }}>PT.</span> ADYTIA</div>
          <div style={{ color: "rgba(255,255,255,0.92)", fontSize: 12, fontWeight: "bold" }}>PUTRA TEHNIK</div>
          <div style={{ color: "rgba(255,255,255,0.38)", fontSize: 8, fontStyle: "italic", marginTop: 5, fontFamily: "Georgia,serif", letterSpacing: 0.5 }}>Engineering Excellence</div>
        </div>

        <div style={{ width: "60%", margin: "16px auto", display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ flex: 1, height: 1, background: "rgba(245,158,11,0.35)" }} />
          <div style={{ width: 4, height: 4, borderRadius: "50%", background: AMBER, opacity: 0.75 }} />
          <div style={{ flex: 1, height: 1, background: "rgba(245,158,11,0.35)" }} />
        </div>

        <div style={{ textAlign: "center" }}>
          <div style={{ color: "rgba(203,213,225,0.65)", fontSize: 8, letterSpacing: 3.5, fontFamily: "Arial,sans-serif" }}>SURABAYA ·</div>
          <div style={{ color: "rgba(203,213,225,0.65)", fontSize: 8, letterSpacing: 3.5, fontFamily: "Arial,sans-serif", marginTop: 3 }}>INDONESIA</div>
        </div>

        <div style={{ width: "60%", margin: "16px auto", display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ flex: 1, height: 1, background: "rgba(245,158,11,0.35)" }} />
          <div style={{ width: 4, height: 4, borderRadius: "50%", background: AMBER, opacity: 0.75 }} />
          <div style={{ flex: 1, height: 1, background: "rgba(245,158,11,0.35)" }} />
        </div>

        <div style={{ marginTop: "auto", background: "rgba(0,0,0,0.28)", border: `1px solid rgba(245,158,11,0.38)`, borderRadius: 8, padding: "12px 14px", textAlign: "center", width: "100%", boxSizing: "border-box" }}>
          <div style={{ color: "rgba(148,163,184,0.75)", fontSize: 7, letterSpacing: 2, textTransform: "uppercase", fontFamily: "Arial,sans-serif", marginBottom: 6 }}>NO. SERTIFIKAT</div>
          <div style={{ color: AMBER, fontSize: 9, fontWeight: "bold", fontFamily: "'Courier New',monospace", wordBreak: "break-all", letterSpacing: 0.5 }}>{nomorSertifikat}</div>
        </div>

        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, background: `linear-gradient(to right, ${RED}, ${RED_L})` }} />
      </div>

      {/* ══ RIGHT ══ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ background: `linear-gradient(90deg, ${CHAR} 0%, #2a2a3e 100%)`, padding: "10px 30px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div style={{ color: "rgba(156,163,175,0.85)", fontSize: 8, letterSpacing: 3.5, textTransform: "uppercase", fontFamily: "Arial,sans-serif" }}>SERTIFIKAT RESMI · CERTIFICATE OF INTERNSHIP</div>
          <div style={{ color: AMBER, fontSize: 11, fontWeight: "bold", letterSpacing: 2, fontFamily: "Arial,sans-serif" }}>APT · {tahun}</div>
        </div>
        <div style={{ height: 5, flexShrink: 0, background: `linear-gradient(to right, ${RED}, ${RED_L})` }} />

        {/* Content area */}
        <div style={{ flex: 1, backgroundColor: CREAM, position: "relative", overflow: "hidden" }}>

          {/* Corner ornaments */}
          <Corner t={10} l={10} /><Corner t={10} r={10} />
          <Corner b={10} l={10} /><Corner b={10} r={10} />

          {/* Decorative medallion — right side, vertically centered in lower portion */}
          <div style={{ position: "absolute", right: 32, bottom: 130, width: 180, height: 180, pointerEvents: "none", zIndex: 0 }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `2px solid rgba(26,47,95,0.08)` }} />
            <div style={{ position: "absolute", inset: 14, borderRadius: "50%", border: `1.5px solid rgba(26,47,95,0.055)` }} />
            <div style={{ position: "absolute", inset: 28, borderRadius: "50%", border: `1px solid rgba(26,47,95,0.035)` }} />
            <div style={{ position: "absolute", inset: 42, borderRadius: "50%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
              <div style={{ fontSize: 34, fontWeight: "900", color: "rgba(26,47,95,0.05)", letterSpacing: 3, lineHeight: 1, fontFamily: "Georgia,serif" }}>APT</div>
              <div style={{ width: 38, height: 1, background: "rgba(26,47,95,0.055)" }} />
              <div style={{ fontSize: 5.5, letterSpacing: 2, color: "rgba(26,47,95,0.04)", fontFamily: "Arial,sans-serif", textTransform: "uppercase" }}>Verified</div>
            </div>
          </div>

          {/* ── 4-GROUP LAYOUT with space-between ── */}
          <div style={{
            position: "absolute", inset: 0,
            padding: "18px 38px 16px 36px",
            display: "flex", flexDirection: "column",
            justifyContent: "space-between",
            zIndex: 1,
          }}>

            {/* G1 — Badge + Title */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 7 }}>
                <div style={{ background: `linear-gradient(135deg, ${RED}, ${RED_L})`, color: "white", fontSize: 7, fontWeight: "bold", letterSpacing: 2.5, padding: "4px 12px", textTransform: "uppercase", fontFamily: "Arial,sans-serif", borderRadius: 2 }}>SERTIFIKAT MAGANG</div>
                <div style={{ color: "#94a3b8", fontSize: 10, fontFamily: "Arial,sans-serif" }}>Tahun {tahun}</div>
              </div>
              <div style={{ fontSize: 62, fontWeight: "bold", color: DARK_T, lineHeight: 1, letterSpacing: 2 }}>SERTIFIKAT</div>
              <div style={{ fontSize: 9.5, letterSpacing: 6.5, color: RED, textTransform: "uppercase", marginTop: 6, fontFamily: "Arial,sans-serif" }}>KERJA PRAKTIK &amp; MAGANG</div>
            </div>

            {/* G2 — Divider + Recipient */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 11 }}>
                <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, ${NAVY}2a, transparent)` }} />
                <div style={{ width: 5, height: 5, transform: "rotate(45deg)", background: NAVY, opacity: 0.14 }} />
              </div>
              <div style={{ fontStyle: "italic", color: "#6b7280", fontSize: 11, marginBottom: 5 }}>Diberikan kepada:</div>
              <div style={{ fontSize: 43, fontWeight: "bold", color: DARK_T, lineHeight: 1.04, letterSpacing: 0.3 }}>{nama}</div>
              <div style={{ marginTop: 7, width: 200, height: 2.5, background: `linear-gradient(to right, ${RED}, transparent)` }} />
              {(nim || institusi) && (
                <div style={{ color: GRAY_T, fontSize: 10, marginTop: 6, fontFamily: "Arial,sans-serif" }}>
                  {nim && <span><strong>NIM:</strong> {nim}</span>}
                  {nim && institusi && <span style={{ margin: "0 10px", color: "#d1d5db" }}>·</span>}
                  {institusi && <span>{institusi}</span>}
                </div>
              )}
            </div>

            {/* G3 — Body + Cards */}
            <div>
              <div style={{ fontSize: 11, color: "#374151", lineHeight: 1.72, marginBottom: 12, fontFamily: "Arial,sans-serif", maxWidth: 610 }}>
                Telah melaksanakan program magang dengan penuh komitmen, dedikasi, dan tanggung jawab
                sebagai <strong style={{ color: "#1e40af" }}>{divisi || "—"}</strong> di{" "}
                <strong style={{ color: "#1e40af" }}>PT. Adytia Putra Tehnik</strong>. Selama masa magang
                berlangsung, yang bersangkutan menunjukkan kinerja yang{" "}
                <strong style={{ color: RED }}>memuaskan</strong> serta memperlihatkan sikap profesional
                dan etos kerja yang tinggi dalam menjalankan setiap tugas yang diberikan.
              </div>
              {/* Cards — nowrap text */}
              <div style={{ display: "flex", gap: 8 }}>
                <InfoCard icon="📅" label="Periode Magang" value={periode} />
                <InfoCard icon="🏢" label="Divisi / Bagian" value={divisi} />
                <InfoCard icon="🎓" label="Institusi" value={institusi} />
              </div>
            </div>

            {/* G4 — Dual Signature + Date */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, rgba(26,47,95,0.13), rgba(26,47,95,0.02))` }} />
                <div style={{ display: "flex", gap: 3 }}>
                  {[0.13, 0.09, 0.06].map((op, i) => (
                    <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: NAVY, opacity: op }} />
                  ))}
                </div>
                <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, rgba(26,47,95,0.13), rgba(26,47,95,0.02))` }} />
              </div>

              {/* Three-column signature row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <SigBlock
                  name={pembimbing}
                  title="Pembimbing Magang"
                  company="PT. Adytia Putra Tehnik"
                />
                {/* Center: city + date */}
                <div style={{ textAlign: "center", paddingBottom: 2 }}>
                  <div style={{ fontSize: 8.5, color: GRAY_T, fontStyle: "italic", fontFamily: "Arial,sans-serif", marginBottom: 3 }}>Surabaya, diterbitkan pada</div>
                  <div style={{ fontSize: 13, fontWeight: "bold", color: DARK_T, fontFamily: "Georgia,serif" }}>{fmt(tanggalTerbit)}</div>
                </div>
                <SigBlock
                  name={direktur}
                  title="Direktur Utama"
                  company="PT. Adytia Putra Tehnik"
                  align="right"
                />
              </div>
            </div>

          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ height: 4, background: `linear-gradient(to right, ${RED}, ${RED_L})` }} />
          <div style={{ height: 12, background: `linear-gradient(90deg, ${CHAR} 0%, #2a2a3e 100%)` }} />
        </div>
      </div>
    </div>
  );
});

export default TemplateSertifikatMagang;
