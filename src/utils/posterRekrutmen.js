/**
 * Generates a standalone HTML poster for a job posting.
 * Opens in a new window so the user can Ctrl+P / Print-to-PDF.
 */

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function parseList(text) {
  return (text || "")
    .split(/\n|;/)
    .map(s => s.replace(/^[-•*▸]\s*/, "").trim())
    .filter(Boolean);
}

function renderItems(items, fallback) {
  const list = items.length ? items : fallback;
  return list.map(item => `<li>${escapeHtml(item)}</li>`).join("\n          ");
}

export function openPosterWindow(rekrutmen, formUrl) {
  const kualList = parseList(rekrutmen.kualifikasi);
  const descList = parseList(rekrutmen.keterangan);

  const kualItems = renderItems(kualList, ["Disesuaikan dengan posisi"]);
  const descItems = renderItems(descList, ["Disesuaikan dengan posisi"]);

  const posisi   = escapeHtml((rekrutmen.posisi || "POSISI TERSEDIA").toUpperCase());
  const dept     = rekrutmen.departemen ? ` · ${escapeHtml(rekrutmen.departemen)}` : "";
  const deadline = rekrutmen.tanggalTutup
    ? `Dibuka hingga ${escapeHtml(rekrutmen.tanggalTutup)}`
    : "Lowongan dibuka hingga posisi terisi";
  const safeFormUrl = JSON.stringify(String(formUrl || ""));

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Poster – ${escapeHtml(rekrutmen.posisi || "Posisi")} | PT. Adytia</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@500;600;700&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
<style>
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    background: #060d18;
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 100vh;
    padding: 32px 20px 48px;
    font-family: 'Barlow', sans-serif;
    gap: 20px;
  }

  /* ── Toolbar ── */
  .toolbar {
    display: flex; gap: 10px;
    width: 794px;
  }
  .btn {
    padding: 10px 22px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 14px; font-weight: 700;
    letter-spacing: 2px; text-transform: uppercase;
    border: none; cursor: pointer;
    display: flex; align-items: center; gap: 8px;
    transition: opacity .15s;
  }
  .btn:hover { opacity: .85; }
  .btn-print { background: #F5A623; color: #0C1A28; }
  .btn-close { background: rgba(255,255,255,.08); color: rgba(255,255,255,.6); }

  @media print {
    body { background: none; padding: 0; }
    .toolbar { display: none !important; }
    .poster { box-shadow: none !important; page-break-inside: avoid; }
  }

  /* ── POSTER SHELL ── */
  .poster {
    width: 794px;
    background: #0C1A28;
    position: relative;
    overflow: hidden;
    box-shadow: 0 40px 100px rgba(0,0,0,.7);
  }

  .grid-bg {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(245,166,35,.045) 1px, transparent 1px),
      linear-gradient(90deg, rgba(245,166,35,.045) 1px, transparent 1px);
    background-size: 36px 36px;
    pointer-events: none;
  }

  .accent-bar {
    position: absolute; top: 0; left: 0;
    width: 7px; height: 100%;
    background: linear-gradient(180deg, #F5A623 0%, #E07B00 100%);
    z-index: 5;
  }

  .corner-tri {
    position: absolute; top: 0; right: 0;
    width: 0; height: 0;
    border-style: solid;
    border-width: 0 90px 90px 0;
    border-color: transparent #F5A623 transparent transparent;
    z-index: 5;
  }

  .glow-circle {
    position: absolute;
    top: 120px; left: 300px;
    width: 460px; height: 460px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(245,166,35,.07) 0%, transparent 70%);
    pointer-events: none;
  }

  .content {
    position: relative; z-index: 2;
    padding: 52px 64px 48px 72px;
  }

  /* Header */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 44px;
  }

  .logo-block .company-name {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 30px; letter-spacing: 3px;
    color: #F5A623; line-height: 1;
  }
  .logo-block .company-sub {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 11px; letter-spacing: 3.5px;
    color: rgba(255,255,255,.35);
    text-transform: uppercase; margin-top: 4px;
  }

  .badge {
    background: #F5A623; color: #0C1A28;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 13px; font-weight: 700;
    letter-spacing: 3px; text-transform: uppercase;
    padding: 7px 18px;
    display: flex; align-items: center; gap: 7px;
    margin-top: 4px;
  }
  .badge-dot {
    width: 6px; height: 6px;
    background: #0C1A28; border-radius: 50%;
  }

  /* Headline */
  .eyebrow {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 13px; letter-spacing: 5px;
    color: rgba(255,255,255,.4);
    text-transform: uppercase; margin-bottom: 6px;
  }

  .headline {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 96px; line-height: .88;
    color: #ffffff; letter-spacing: 4px;
    margin-bottom: 2px;
  }

  .position-row {
    display: flex; align-items: center;
    gap: 14px; margin-bottom: 6px;
  }
  .bolt-svg { width: 44px; height: 56px; flex-shrink: 0; }
  .position-name {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 72px; line-height: 1;
    color: #F5A623; letter-spacing: 4px;
  }

  /* Divider */
  .divider {
    display: flex; align-items: center; gap: 14px;
    margin: 26px 0;
  }
  .div-line { flex: 1; height: 1px; background: rgba(245,166,35,.25); }
  .div-diamond {
    width: 9px; height: 9px;
    background: #F5A623; transform: rotate(45deg); flex-shrink: 0;
  }

  /* Cards */
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 18px; }

  .card {
    background: rgba(255,255,255,.038);
    border: 1px solid rgba(245,166,35,.18);
    padding: 22px 24px;
  }

  .card-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 11px; letter-spacing: 3.5px;
    color: #F5A623; text-transform: uppercase;
    margin-bottom: 14px;
    display: flex; align-items: center; gap: 10px;
  }
  .card-label::before {
    content: ''; display: block;
    width: 22px; height: 2px;
    background: #F5A623; flex-shrink: 0;
  }

  .check-list { list-style: none; }
  .check-list li {
    display: flex; align-items: flex-start; gap: 10px;
    font-size: 14px; color: rgba(255,255,255,.82);
    line-height: 1.45; margin-bottom: 10px;
  }
  .check-list li:last-child { margin-bottom: 0; }
  .check-list li::before {
    content: '▸'; color: #F5A623;
    font-size: 11px; margin-top: 3px; flex-shrink: 0;
  }
  .hl { color: #F5A623; font-weight: 600; }

  /* Apply section */
  .apply-section {
    display: flex; align-items: center; gap: 28px;
    background: rgba(245,166,35,.06);
    border: 1px solid rgba(245,166,35,.28);
    padding: 24px 28px; margin-top: 18px;
  }
  .apply-text { flex: 1; }
  .apply-cta {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 36px; color: #ffffff;
    letter-spacing: 3px; line-height: 1; margin-bottom: 6px;
  }
  .apply-desc { font-size: 13px; color: rgba(255,255,255,.5); margin-bottom: 12px; }
  .apply-url {
    display: inline-flex; align-items: center; gap: 8px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 17px; font-weight: 600;
    color: #F5A623; letter-spacing: 1px;
    word-break: break-all;
  }
  .apply-url svg { width: 16px; height: 16px; fill: none; stroke: #F5A623; stroke-width: 2; flex-shrink: 0; }

  .qr-wrap {
    background: #ffffff; padding: 10px 10px 8px;
    display: flex; flex-direction: column; align-items: center; gap: 5px;
    flex-shrink: 0;
  }
  .qr-caption {
    font-size: 9.5px; font-weight: 700;
    color: #0C1A28; letter-spacing: 1.5px; text-transform: uppercase;
  }

  /* Footer */
  .footer {
    margin-top: 28px; padding-top: 18px;
    border-top: 1px solid rgba(255,255,255,.07);
    display: flex; justify-content: space-between; align-items: center;
  }
  .footer-left {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 12px; letter-spacing: 2px;
    color: rgba(255,255,255,.25); text-transform: uppercase;
  }
  .footer-right { font-size: 12px; color: rgba(255,255,255,.2); }

  .corner-tri-bl {
    position: absolute; bottom: 0; left: 0;
    width: 0; height: 0; border-style: solid;
    border-width: 70px 0 0 70px;
    border-color: transparent transparent transparent rgba(245,166,35,.18);
    z-index: 5;
  }
</style>
</head>
<body>

<!-- Toolbar (hidden saat print) -->
<div class="toolbar">
  <button class="btn btn-print" onclick="window.print()">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
    Cetak / Simpan PDF
  </button>
  <button class="btn btn-close" onclick="window.close()">Tutup</button>
</div>

<div class="poster">
  <div class="grid-bg"></div>
  <div class="accent-bar"></div>
  <div class="corner-tri"></div>
  <div class="corner-tri-bl"></div>
  <div class="glow-circle"></div>

  <div class="content">

    <div class="header">
      <div class="logo-block">
        <div class="company-name">PT. Adytia</div>
        <div class="company-sub">Engineering &amp; Technical Solutions${dept}</div>
      </div>
      <div class="badge">
        <div class="badge-dot"></div>
        Posisi Tersedia
      </div>
    </div>

    <div class="eyebrow">Kami Membuka Lowongan Untuk</div>
    <div class="headline">LOWONGAN<br>KERJA</div>
    <div class="position-row">
      <svg class="bolt-svg" viewBox="0 0 30 44" fill="none">
        <path d="M20 2L3 25H14L10 42L27 19H16L20 2Z" fill="#F5A623"/>
      </svg>
      <div class="position-name">${posisi}</div>
    </div>

    <div class="divider">
      <div class="div-diamond"></div>
      <div class="div-line"></div>
      <div class="div-diamond"></div>
      <div class="div-line"></div>
      <div class="div-diamond"></div>
    </div>

    <div class="two-col">
      <div class="card">
        <div class="card-label">Persyaratan</div>
        <ul class="check-list">
          ${kualItems}
        </ul>
      </div>
      <div class="card">
        <div class="card-label">Deskripsi Kerja</div>
        <ul class="check-list">
          ${descItems}
        </ul>
      </div>
    </div>

    <div class="apply-section">
      <div class="apply-text">
        <div class="apply-cta">CARA MELAMAR</div>
        <div class="apply-desc">Scan QR Code atau buka link berikut untuk mengisi formulir lamaran online</div>
        <div class="apply-url">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          ${escapeHtml(formUrl || "")}
        </div>
      </div>
      <div class="qr-wrap">
        <div id="qrcode"></div>
        <div class="qr-caption">Scan untuk melamar</div>
      </div>
    </div>

    <div class="footer">
      <div class="footer-left">© PT. Adytia Putra Tehnik — Surabaya, Jawa Timur</div>
      <div class="footer-right">${deadline}</div>
    </div>

  </div>
</div>

<script>
  new QRCode(document.getElementById("qrcode"), {
    text: ${safeFormUrl},
    width: 130, height: 130,
    colorDark: "#0C1A28", colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
  });
<\/script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) {
    alert("Popup diblokir browser. Izinkan popup untuk halaman ini lalu coba lagi.");
    return;
  }
  win.opener = null;
  win.document.write(html);
  win.document.close();
}
