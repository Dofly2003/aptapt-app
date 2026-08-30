import { formatRupiahPlain, formatTanggalLengkap, hitungTotal, terbilang } from "../../services/rabService";

// A4 at 96 dpi
const A4_W = 794;
const A4_H = 1123;
const MM_TO_PX = A4_W / 210; // ≈ 3.779 px/mm

const C = {
  navy:   "#003087",
  blue:   "#0055B3",
  gold:   "#FFD700",
  surf:   "#F8FAFF",
  border: "#C5D3E8",
  text:   "#1A1A2E",
  muted:  "#6B7280",
  warn:   "#E65100",
  green:  "#15803D",
};

// ── Estimate-based page splits (no DOM measurement required) ───────────────
function estimatePageSplits(allItems, ppnAktif, hasFooter, hasBillTo, marginPx, fontScale) {
  const s         = fontScale;
  const headerH   = Math.round(106 * s);
  const footerH   = hasFooter ? Math.round(46 * s) : 0;
  // Invoice top: INVOICE title row + bill-to block + perihal line
  const topH      = Math.round((hasBillTo ? 175 : 90) * s);
  const theadH    = Math.round(42 * s);
  const rowH      = Math.round(42 * s);
  const summaryH  = Math.round((ppnAktif ? 136 : 102) * s);
  // Invoice closing: paymentBox + catatan + closingMessage + signatureBlock
  const closingH  = Math.round(280 * s);
  const tailH     = summaryH + closingH + 8;

  const innerH     = A4_H - 2 * marginPx;
  const page1Avail = innerH - headerH - footerH - topH - theadH;
  const pageNAvail = innerH - headerH - footerH - theadH;

  if (allItems.length === 0) return [{ start: 0, end: 0 }];

  const splits = [];
  let pageStart = 0, isFirstPage = true, used = 0;

  for (let i = 0; i < allItems.length; i++) {
    const isLast = i === allItems.length - 1;
    const avail  = isFirstPage ? page1Avail : pageNAvail;

    if (isLast) {
      if (i > pageStart && used + rowH + tailH > avail) {
        splits.push({ start: pageStart, end: i });
        pageStart = i; isFirstPage = false; used = 0;
      }
    } else if (i > pageStart && used + rowH > avail - tailH) {
      splits.push({ start: pageStart, end: i });
      pageStart = i; isFirstPage = false; used = 0;
    }
    used += rowH;
  }
  splits.push({ start: pageStart, end: allItems.length });
  return splits;
}

// ── Root component ─────────────────────────────────────────────────────────
export default function TemplateInvoiceAdytia({ data, instansi, pageMargin, fontScale = 1 }) {
  if (!data) return null;

  const marginPx  = Math.round((pageMargin ?? 10) * MM_TO_PX);
  const fs        = (pt) => `${pt * fontScale}pt`;
  const allItems  = data.items || [];
  const totals    = hitungTotal(allItems, data.ppnAktif !== false, 11);
  const ppnAktif  = data.ppnAktif !== false;
  const lokasi    = data.lokasi || deriveKota(instansi?.alamat) || "Gresik";
  const hasFooter = !!(instansi?.alamat || instansi?.telp || instansi?.web);
  const hasBillTo = !!(data.tagihan?.nama || data.tagihan?.perusahaan || data.tagihan?.alamat);

  const pageSplits = estimatePageSplits(allItems, ppnAktif, hasFooter, hasBillTo, marginPx, fontScale);

  const FONT_BASE = {
    fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
    fontSize: fs(10),
    color: C.text,
    lineHeight: 1.5,
  };

  const TH = {
    border: `1px solid #5577AA`, padding: "9px 10px",
    textAlign: "center", fontWeight: 700, fontSize: fs(10), color: "#fff",
  };
  const TD = {
    border: `1px solid ${C.border}`, padding: "8px 10px", verticalAlign: "middle",
  };

  const PAGE_SHELL = {
    ...FONT_BASE,
    width: A4_W,
    height: A4_H,
    background: "#fff",
    overflow: "hidden",
    boxSizing: "border-box",
    padding: marginPx,
    display: "flex",
    flexDirection: "column",
  };

  return (
    <div className="laporan-form" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap');
        .inv-tr-odd  { background: #F8FAFF; }
        .inv-tr-even { background: #FFFFFF; }
        @media screen { .inv-tr:hover { background: #E8F0FE !important; } }
        .laporan-page-sheet { box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
        @media print {
          .laporan-page-sheet { box-shadow: none !important; break-after: page; page-break-after: always; }
          .laporan-page-sheet:last-child { break-after: auto; page-break-after: auto; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      {pageSplits.map((split, pageIdx) => {
        const isFirst   = pageIdx === 0;
        const isLast    = pageIdx === pageSplits.length - 1;
        const pageItems = allItems.slice(split.start, split.end);

        return (
          <div key={pageIdx} className="laporan-page-sheet" style={PAGE_SHELL}>

            {/* Header — every page */}
            <DocHeader instansi={instansi} fs={fs} />

            {/* Content area */}
            <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>

              {/* Page-1 only: invoice title + bill-to + perihal */}
              {isFirst && (
                <>
                  <InvoiceTitleRow data={data} lokasi={lokasi} fs={fs} />
                  <BillToBlock tagihan={data.tagihan} fs={fs} />
                  {data.perihal && (
                    <div style={{ marginBottom: 14, fontSize: fs(10) }}>
                      <span style={{ color: C.navy, fontWeight: 600 }}>Perihal: </span>
                      <span>{data.perihal}</span>
                    </div>
                  )}
                </>
              )}

              {/* Items table */}
              <table style={{ width: "100%", borderCollapse: "collapse", border: `1px solid ${C.border}`, fontSize: fs(10) }}>
                <colgroup>
                  <col style={{ width: "5%" }} /><col style={{ width: "40%" }} />
                  <col style={{ width: "8%" }} /><col style={{ width: "7%" }} />
                  <col style={{ width: "20%" }} /><col style={{ width: "20%" }} />
                </colgroup>
                <thead>
                  <tr style={{ background: C.navy }}>
                    <th style={TH}>No</th>
                    <th style={{ ...TH, textAlign: "left" }}>Nama Pekerjaan / Barang</th>
                    <th style={TH}>Sat</th><th style={TH}>Vol</th>
                    <th style={TH}>Harga Sat (Rp)</th><th style={TH}>Jml Harga (Rp)</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((it, i) => {
                    const globalIdx = split.start + i;
                    const jml = (Number(it.volume) || 0) * (Number(it.hargaSatuan) || 0);
                    return (
                      <tr key={it.id || globalIdx}
                        className={`inv-tr ${globalIdx % 2 === 0 ? "inv-tr-odd" : "inv-tr-even"}`}>
                        <td style={{ ...TD, textAlign: "center" }}>{globalIdx + 1}</td>
                        <td style={TD}>{it.nama}</td>
                        <td style={{ ...TD, textAlign: "center" }}>{it.satuan}</td>
                        <td style={{ ...TD, textAlign: "center" }}>{it.volume}</td>
                        <td style={{ ...TD, textAlign: "right", fontFamily: "monospace" }}>{formatRupiahPlain(it.hargaSatuan)}</td>
                        <td style={{ ...TD, textAlign: "right", fontFamily: "monospace" }}>{formatRupiahPlain(jml)}</td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Summary — last page only */}
                {isLast && (
                  <tbody>
                    <SummaryRows totals={totals} ppnAktif={ppnAktif} TD={TD} fs={fs} />
                  </tbody>
                )}
              </table>

              {/* Closing — last page only */}
              {isLast && (
                <>
                  {(data.pembayaran?.bank || data.pembayaran?.noRek) && (
                    <PaymentBox pembayaran={data.pembayaran} fs={fs} />
                  )}
                  {data.catatan && (
                    <div style={{ marginTop: 12 }}>
                      <GoldBox fs={fs}><strong>Catatan:</strong> <span style={{ whiteSpace: "pre-line" }}>{data.catatan}</span></GoldBox>
                    </div>
                  )}
                  {data.closingMessage && (
                    <p style={{ margin: "20px 0 16px", textAlign: "justify", lineHeight: 1.7 }}>{data.closingMessage}</p>
                  )}
                  <SignatureBlock ttd={data.ttd} instansi={instansi} fs={fs} />
                </>
              )}
            </div>

            {/* Footer — every page */}
            <FooterBar instansi={instansi} fs={fs} />
          </div>
        );
      })}
    </div>
  );
}

// ── InvoiceTitleRow ────────────────────────────────────────────────────────
function InvoiceTitleRow({ data, lokasi, fs }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
      <div>
        <div style={{
          display: "inline-block",
          background: C.navy, color: "#fff",
          fontWeight: 800, fontSize: fs(20),
          letterSpacing: "4px",
          padding: "4px 22px 4px 26px", borderRadius: 4, marginBottom: 4,
        }}>
          INVOICE
        </div>
        {data.nomor && (
          <div style={{ fontSize: fs(9), color: C.muted, marginTop: 2 }}>No. {data.nomor}</div>
        )}
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontWeight: 600, fontSize: fs(9) }}>
          {lokasi}, {formatTanggalLengkap(data.tanggal)}
        </div>
        {data.jatuhTempo && (
          <div style={{ fontSize: fs(9), color: C.warn, fontWeight: 600, marginTop: 4 }}>
            Jatuh Tempo: {formatTanggalLengkap(data.jatuhTempo)}
          </div>
        )}
        <div style={{
          display: "inline-block", marginTop: 6,
          padding: "2px 12px 2px 13px", borderRadius: 20, fontSize: fs(8),
          fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px",
          background: data.status === "final" ? "#DCFCE7" : "#FEF3C7",
          color: data.status === "final" ? C.green : "#92400E",
        }}>
          {data.status === "final" ? "LUNAS" : "BELUM DIBAYAR"}
        </div>
      </div>
    </div>
  );
}

// ── SummaryRows ────────────────────────────────────────────────────────────
function SummaryRows({ totals, ppnAktif, TD, fs }) {
  return (
    <>
      <tr style={{ background: "#EEF2FF" }}>
        <td colSpan={5} style={{ ...TD, textAlign: "right", fontWeight: 700, fontSize: fs(10) }}>JUMLAH</td>
        <td style={{ ...TD, textAlign: "right", fontWeight: 700, fontFamily: "monospace", fontSize: fs(10) }}>
          {formatRupiahPlain(totals.subtotal)}
        </td>
      </tr>
      {ppnAktif && (
        <tr style={{ background: "#FFF8E1" }}>
          <td colSpan={5} style={{ ...TD, textAlign: "right", fontWeight: 700, fontSize: fs(10) }}>PPN 11%</td>
          <td style={{ ...TD, textAlign: "right", fontWeight: 700, fontFamily: "monospace", color: C.warn, fontSize: fs(10) }}>
            {formatRupiahPlain(totals.ppn)}
          </td>
        </tr>
      )}
      <tr style={{ background: C.navy }}>
        <td colSpan={5} style={{ ...TD, border: `1px solid #5577AA`, textAlign: "right", fontWeight: 800, fontSize: fs(12), color: "#fff" }}>
          TOTAL TAGIHAN
        </td>
        <td style={{ ...TD, border: `1px solid #5577AA`, textAlign: "right", fontWeight: 800, fontSize: fs(12), color: C.gold, fontFamily: "monospace" }}>
          {formatRupiahPlain(totals.grandTotal)}
        </td>
      </tr>
      <tr>
        <td colSpan={6} style={{ ...TD, borderTop: "1px dashed #999", background: "#FFFDE7", fontSize: fs(9), fontStyle: "italic", color: "#555" }}>
          Terbilang: <strong style={{ fontStyle: "normal" }}>{terbilang(totals.grandTotal)}</strong>
        </td>
      </tr>
    </>
  );
}

// ── DocHeader ──────────────────────────────────────────────────────────────
function DocHeader({ instansi, fs }) {
  return (
    <div className="inv-doc-header" style={{ marginBottom: 8, flexShrink: 0 }}>
      <div style={{ background: C.navy, borderRadius: "8px 8px 0 0", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <svg viewBox="0 0 1 1" preserveAspectRatio="none"
            style={{ width: "100%", height: "100%", display: "block" }} xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="invHdrGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={C.navy} /><stop offset="100%" stopColor={C.blue} />
              </linearGradient>
            </defs>
            <rect width="1" height="1" fill="url(#invHdrGrad)" />
          </svg>
          <div style={{ position: "absolute", top: -35, right: -35, width: 130, height: 130, background: "rgba(255,255,255,0.05)", borderRadius: "50%" }} />
          <div style={{ position: "absolute", bottom: -24, right: 80, width: 90, height: 90, background: "rgba(255,215,0,0.07)", borderRadius: "50%" }} />
        </div>
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 18, padding: "14px 20px" }}>
          <div style={{ width: 72, height: 72, flexShrink: 0, background: "rgba(255,255,255,0.13)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.25)" }}>
            {instansi?.logo?.url
              ? <img src={instansi.logo.url} alt="logo" style={{ maxWidth: 66, maxHeight: 66, objectFit: "contain" }} />
              : <div style={{ fontSize: fs(22), fontWeight: 800, color: C.gold, letterSpacing: -1 }}>A</div>}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: fs(17), fontWeight: 800, color: "#fff", letterSpacing: "1px", lineHeight: 1.1, marginBottom: 4 }}>
              {instansi?.nama ?? "PT. ADYTIA PUTRA TEHNIK"}
            </div>
            <div style={{ fontSize: fs(8.5), fontWeight: 600, fontStyle: "italic", color: C.gold, letterSpacing: "1.2px", marginBottom: 6 }}>
              {instansi?.tagline ?? "CONTRACTOR & TECHNICAL ENGINEERING"}
            </div>
            {instansi?.alamat && (
              <div style={{ fontSize: fs(8), color: "#B0C4DE", lineHeight: 1.4 }}>{instansi.alamat}</div>
            )}
          </div>
          {(instansi?.telp || instansi?.web) && (
            <div style={{ display: "flex", flexDirection: "column", gap: 5, flexShrink: 0 }}>
              {instansi.telp && <ContactBadge icon="📞" value={instansi.telp} fs={fs} />}
              {instansi.web  && <ContactBadge icon="🌐" value={instansi.web}  fs={fs} />}
            </div>
          )}
        </div>
      </div>
      <div style={{ height: 3, background: C.gold }} />
    </div>
  );
}

function ContactBadge({ icon, value, fs }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.12)", borderRadius: 4, padding: "3px 8px", fontSize: fs(7.5), color: "#E8F0FE" }}>
      <span style={{ fontSize: fs(9), lineHeight: 1, display: "inline-flex", alignItems: "center" }}>{icon}</span>
      <span>{value}</span>
    </div>
  );
}

// ── BillToBlock ────────────────────────────────────────────────────────────
function BillToBlock({ tagihan, fs }) {
  const t = tagihan || {};
  if (!t.nama && !t.perusahaan && !t.alamat) return null;
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: "12px 16px", marginBottom: 14, background: C.surf }}>
      <div style={{ fontSize: fs(8), fontWeight: 700, color: C.navy, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
        Tagihan Kepada
      </div>
      {t.nama       && <div style={{ fontWeight: 700, fontSize: fs(11) }}>{t.nama}</div>}
      {t.perusahaan && <div style={{ fontWeight: 600, color: C.navy, fontSize: fs(10) }}>{t.perusahaan}</div>}
      {t.alamat     && <div style={{ color: C.muted, fontSize: fs(9), marginTop: 2 }}>{t.alamat}</div>}
      {(t.telp || t.email) && (
        <div style={{ display: "flex", gap: 16, marginTop: 4, fontSize: fs(8.5), color: C.muted }}>
          {t.telp  && <span>📞 {t.telp}</span>}
          {t.email && <span>✉ {t.email}</span>}
        </div>
      )}
    </div>
  );
}

// ── PaymentBox ─────────────────────────────────────────────────────────────
function PaymentBox({ pembayaran, fs }) {
  return (
    <div style={{ border: `2px solid ${C.gold}`, borderRadius: 6, padding: "12px 16px", marginTop: 16, background: "#FFFDE7" }}>
      <div style={{ fontWeight: 700, color: C.navy, fontSize: fs(9), marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
        Informasi Pembayaran
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: fs(10) }}>
        {pembayaran.bank && (
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ width: 110, color: C.muted, flexShrink: 0 }}>Bank</span>
            <span>: <strong>{pembayaran.bank}</strong></span>
          </div>
        )}
        {pembayaran.noRek && (
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ width: 110, color: C.muted, flexShrink: 0 }}>No. Rekening</span>
            <span style={{ fontFamily: "monospace", fontWeight: 700 }}>: {pembayaran.noRek}</span>
          </div>
        )}
        {pembayaran.atasNama && (
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ width: 110, color: C.muted, flexShrink: 0 }}>Atas Nama</span>
            <span>: {pembayaran.atasNama}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── GoldBox ────────────────────────────────────────────────────────────────
function GoldBox({ children, fs }) {
  return (
    <div style={{ padding: "8px 12px", borderLeft: `4px solid ${C.gold}`, background: "#FFFDE7", borderRadius: "0 4px 4px 0", fontSize: fs(9), lineHeight: 1.6 }}>
      {children}
    </div>
  );
}

// ── SignatureBlock ─────────────────────────────────────────────────────────
function SignatureBlock({ ttd, instansi, fs }) {
  const hasSig   = Boolean(ttd?.signature?.url);
  const hasStamp = Boolean(ttd?.stempel?.url);
  return (
    <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
      <div style={{ textAlign: "center", minWidth: 200 }}>
        <div style={{ marginBottom: 2, fontSize: fs(10) }}>Hormat Kami,</div>
        <div style={{ fontWeight: 700, marginBottom: 8, fontSize: fs(10) }}>{instansi?.nama ?? ""}</div>
        <div className="inv-sig-box" style={{ position: "relative", width: 160, height: hasSig || hasStamp ? 90 : 44, margin: "0 auto 8px", overflow: "hidden" }}>
          {hasStamp && <img src={ttd.stempel.url} alt="stempel" style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", maxHeight: 90, maxWidth: 160, width: "auto", height: "auto", objectFit: "contain", opacity: 0.85 }} />}
          {hasSig   && <img src={ttd.signature.url} alt="ttd" style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", maxHeight: 90, maxWidth: 130, width: "auto", height: "auto", objectFit: "contain", zIndex: 1 }} />}
        </div>
        <div style={{ borderTop: "1px solid #000", paddingTop: 4 }}>
          <div style={{ fontWeight: 700, textDecoration: "underline", fontSize: fs(10) }}>({ttd?.nama || "........................"})</div>
          <div style={{ fontSize: fs(9), color: C.muted }}>{ttd?.jabatan || ""}</div>
        </div>
      </div>
    </div>
  );
}

// ── FooterBar ──────────────────────────────────────────────────────────────
function FooterBar({ instansi, fs }) {
  if (!instansi?.alamat && !instansi?.telp && !instansi?.web) return null;
  return (
    <div className="inv-footer-bar" style={{ flexShrink: 0, marginTop: "auto" }}>
      <div style={{ height: 3, background: C.gold }} />
      <div style={{ background: C.navy, padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: "0 0 6px 6px", flexWrap: "wrap", gap: 4 }}>
        <div style={{ color: "#B0C4DE", fontSize: fs(7.5) }}>{instansi?.alamat}</div>
        <div style={{ display: "flex", gap: 16, color: "#B0C4DE", fontSize: fs(7.5) }}>
          {instansi?.telp && <span>📞 {instansi.telp}</span>}
          {instansi?.web  && <span>🌐 {instansi.web}</span>}
        </div>
      </div>
    </div>
  );
}

function deriveKota(alamat = "") {
  if (!alamat) return "";
  return alamat.split(",").pop()?.trim().split(/[-–]/).pop()?.trim() || "";
}
