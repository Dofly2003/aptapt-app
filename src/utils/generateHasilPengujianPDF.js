import jsPDF from "jspdf";

// ─────────────────────────────────────────────
// UTIL: Load image URL → base64 data URL
// ─────────────────────────────────────────────
const loadImage = (url) =>
  new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext("2d").drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });

// ─────────────────────────────────────────────
// UTIL: Draw a single bordered cell with text
//   x, y       = top-left of cell
//   w, h       = width, height
//   text       = string or null
//   opts       = { bold, fontSize, align, valign, padding }
// ─────────────────────────────────────────────
const drawCell = (pdf, x, y, w, h, text, opts = {}) => {
  const {
    bold = false,
    fontSize = 9,
    align = "left",
    valign = "top",
    padding = 2,
  } = opts;

  pdf.rect(x, y, w, h);

  if (!text) return;

  pdf.setFont("times", bold ? "bold" : "normal");
  pdf.setFontSize(fontSize);

  const lines = pdf.splitTextToSize(String(text), w - padding * 2);
  const lineH = fontSize * 0.352778 * 1.2; // pt → mm × line-height
  const textH = lines.length * lineH;

  let textY;
  if (valign === "middle") {
    textY = y + h / 2 - textH / 2 + lineH * 0.75;
  } else {
    textY = y + padding + lineH * 0.75;
  }

  let textX;
  if (align === "center") textX = x + w / 2;
  else if (align === "right") textX = x + w - padding;
  else textX = x + padding;

  pdf.text(lines, textX, textY, { align });
};

// ─────────────────────────────────────────────
// UTIL: Draw image inside a cell (auto-fit)
//   Gambar diposisikan di tengah cell secara horizontal & vertikal
// ─────────────────────────────────────────────
const drawImagesInCell = (pdf, images, cellX, cellY, cellW, cellH, gap = 3) => {
  const validImgs = images.filter(Boolean);
  if (!validImgs.length) return;

  const pad = 3;
  const maxW = cellW - pad * 2;
  const maxH = cellH - pad * 2;

  // Bagi lebar secara merata
  const imgW = (maxW - gap * (validImgs.length - 1)) / validImgs.length;
  const imgH = Math.min(maxH, imgW * 1.2); // max rasio 1:1.2

  // Centering vertikal
  const startY = cellY + (cellH - imgH) / 2;
  // Centering horizontal
  const totalW = validImgs.length * imgW + (validImgs.length - 1) * gap;
  let startX = cellX + (cellW - totalW) / 2;

  validImgs.forEach((imgData) => {
    pdf.addImage(imgData, "JPEG", startX, startY, imgW, imgH);
    startX += imgW + gap;
  });
};

// ─────────────────────────────────────────────
// SECTION: Header 3-kolom (match <table> HTML)
// ─────────────────────────────────────────────
const drawHeader = async (pdf, x, y, totalW, logoImgData) => {
  const h = 22;
  const col1W = 28;  // logo
  const col3W = 52;  // company info
  const col2W = totalW - col1W - col3W; // judul

  // Outer border
  pdf.rect(x, y, totalW, h);
  // Inner dividers
  pdf.line(x + col1W, y, x + col1W, y + h);
  pdf.line(x + col1W + col2W, y, x + col1W + col2W, y + h);

  // Col 1: Logo
  if (logoImgData) {
    pdf.addImage(logoImgData, "PNG", x + 2, y + 2, col1W - 4, h - 4);
  }

  // Col 2: Judul (bold, centered, multiline)
  pdf.setFont("times", "bold");
  pdf.setFontSize(9);
  const titleText =
    "BERITA ACARA PEMERIKSAAN PHB TM PADA INSTALASI MILIK PELANGGAN (IML)";
  const titleLines = pdf.splitTextToSize(titleText, col2W - 6);
  const lineH = 9 * 0.352778 * 1.4;
  const textTotalH = titleLines.length * lineH;
  const titleY = y + h / 2 - textTotalH / 2 + lineH * 0.8;
  pdf.text(titleLines, x + col1W + col2W / 2, titleY, { align: "center" });

  // Col 3: Company info (kiri, kecil)
  pdf.setFont("times", "normal");
  pdf.setFontSize(7.5);
  const cX = x + col1W + col2W + 2;
  pdf.text("PT. ADYTIA PUTRA TEHNIK", cX, y + 6);
  pdf.text("Desa Gading Watu RT.04 RW.04", cX, y + 11);
  pdf.text("Menganti - Gresik", cX, y + 16);

  return y + h; // kembalikan y baru
};

// ─────────────────────────────────────────────
// SECTION: Tabel dengan header foto + data rows
//   Struktur:
//   ┌──────────┬─────────────────────────┐
//   │  Label   │  [foto foto foto]       │  ← photoRowH
//   ├──────────┼─────────────────────────┤
//   │  Field1  │  : Value                │  ← rowH × n
//   │  Field2  │  : Value                │
//   └──────────┴─────────────────────────┘
// ─────────────────────────────────────────────
const drawPhotoTable = (pdf, x, y, totalW, label, images, rows, photoRowH = 36) => {
  const leftW = 52;
  const rightW = totalW - leftW;
  const rowH = 6;
  const totalH = photoRowH + rows.length * rowH;

  // Outer border
  pdf.rect(x, y, totalW, totalH);

  // ── Header row (label + foto) ──
  drawCell(pdf, x, y, leftW, photoRowH, label, {
    bold: true,
    fontSize: 8,
    valign: "top",
    padding: 3,
  });

  // Kanan: cell border + gambar di dalamnya
  pdf.rect(x + leftW, y, rightW, photoRowH);
  if (images.length) {
    drawImagesInCell(pdf, images, x + leftW, y, rightW, photoRowH);
  }

  // ── Data rows ──
  pdf.setFont("times", "normal");
  pdf.setFontSize(9);
  let ry = y + photoRowH;

  rows.forEach(([labelStr, valueStr]) => {
    // Kiri: label
    pdf.rect(x, ry, leftW, rowH);
    pdf.text(labelStr || "", x + 3, ry + 4);

    // Kanan: value
    pdf.rect(x + leftW, ry, rightW, rowH);
    pdf.text(`: ${valueStr || "-"}`, x + leftW + 3, ry + 4);

    ry += rowH;
  });

  return y + totalH; // kembalikan y baru
};

// ─────────────────────────────────────────────
// SECTION: Tabel pengoperasian (hanya foto, tanpa rows)
// ─────────────────────────────────────────────
const drawPhotoOnlyTable = (pdf, x, y, totalW, label, images, tableH = 38) => {
  const leftW = 52;
  const rightW = totalW - leftW;

  pdf.rect(x, y, totalW, tableH);
  drawCell(pdf, x, y, leftW, tableH, label, {
    bold: true,
    fontSize: 8,
    valign: "top",
    padding: 3,
  });
  pdf.rect(x + leftW, y, rightW, tableH);

  if (images.length) {
    drawImagesInCell(pdf, images, x + leftW, y, rightW, tableH);
  }

  return y + tableH;
};

// ─────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────
export const generateHasilPengujianPDF = async (data, form, photos) => {
  const pdf = new jsPDF("p", "mm", "a4");

  const PAGE_W = 210;
  const M = 10; // margin kiri & kanan
  const CW = PAGE_W - M * 2; // 190mm content width

  pdf.setFont("times", "normal");
  pdf.setFontSize(9);

  let y = M;

  // ─── 1. HEADER ───────────────────────────────
  // Opsional: load logo jika ada
  // const logoData = await loadImage("/logo.png");
  const logoData = null;
  y = await drawHeader(pdf, M, y, CW, logoData);
  y += 5;

  // ─── 2. PARAGRAF ─────────────────────────────
  pdf.setFont("times", "normal");
  pdf.setFontSize(9);
  const paraText =
    "Pada hari ini telah melaksanakan pemeriksaan PHB TM pada instalasi milik pelanggan oleh petugas PT. ADYTIA PUTRA TEHNIK.";
  const paraLines = pdf.splitTextToSize(paraText, CW);
  pdf.text(paraLines, M, y);
  y += paraLines.length * 4.5 + 4;

  // ─── 3. IDENTITAS ────────────────────────────
  const identitas = [
    ["Nama Pelanggan", data?.nama],
    ["Alamat", data?.alamat],
    ["Daya", data?.daya],
    ["Tarif", data?.tarif],
    ["IDPEL", data?.idpel],
  ];

  const labelW = 38;
  identitas.forEach(([label, value]) => {
    pdf.setFont("times", "normal");
    pdf.setFontSize(9);
    pdf.text(`${label}`, M, y);
    pdf.text(`: ${value || "-"}`, M + labelW, y);
    y += 5;
  });
  y += 4;

  // ─── 4. JUDUL SECTION ────────────────────────
  pdf.setFont("times", "bold");
  pdf.setFontSize(10);
  pdf.text("PEMERIKSAAN PHBTM / KUBIKEL", PAGE_W / 2, y, { align: "center" });
  y += 5;

  // ─── 5. FOTO UTAMA (di atas tabel, centered) ─
  const mainPhotoUrls = photos?.part1?.phb_tm_Nameplate || [];
  const mainPhotoData = await Promise.all(mainPhotoUrls.slice(0, 3).map(loadImage));
  const validMain = mainPhotoData.filter(Boolean);

  if (validMain.length > 0) {
    const imgW = 32;
    const imgH = 28;
    const gap = 5;
    const totalImgW = validMain.length * imgW + (validMain.length - 1) * gap;
    let imgX = (PAGE_W - totalImgW) / 2;

    validMain.forEach((imgData) => {
      pdf.addImage(imgData, "JPEG", imgX, y, imgW, imgH);
      imgX += imgW + gap;
    });
    y += imgH + 5;
  }

  // ─── 6. TABEL NAMEPLATE PHB TM ───────────────
  const nameplateImgUrls = photos?.part1?.phb_tm_Nameplate || [];
  const nameplateImgData = await Promise.all(
    nameplateImgUrls.slice(0, 3).map(loadImage)
  );

  const nameplateRows = [
    ["Merk", form?.part1?.phb_tm?.Merk],
    ["Type", form?.part1?.phb_tm?.Type],
    ["No Seri", form?.part1?.phb_tm?.NoSeri],
    ["Tahun", form?.part1?.phb_tm?.Tahun],
    ["Tegangan", form?.part1?.phb_tm?.Tegangan],
    ["Arus", form?.part1?.phb_tm?.Arus],
    ["Breaking Capacity", form?.part1?.phb_tm?.BreakingCapacity],
    ["Power Heater", form?.part1?.phb_tm?.PowerHeater],
  ];

  y = drawPhotoTable(
    pdf,
    M, y, CW,
    "> Nameplate PHB TM OUTGOING",
    nameplateImgData.filter(Boolean),
    nameplateRows,
    36
  );
  y += 5;

  // ─── 7. TABEL PENGOPERASIAN LBS ──────────────
  const opImgUrls = photos?.part1?.phb_tm_Pengoperasian || [];
  const opImgData = await Promise.all(opImgUrls.slice(0, 2).map(loadImage));

  y = drawPhotoOnlyTable(
    pdf,
    M, y, CW,
    "> Pengoperasian LBS",
    opImgData.filter(Boolean),
    38
  );
  y += 5;

  // ─── 8. TABEL FUSE (RELAY) ───────────────────
  const fuseImgUrls = photos?.part1?.phb_tm_Fuse || [];
  const fuseImgData = await Promise.all(fuseImgUrls.slice(0, 2).map(loadImage));

  const fuseRows = [
    ["Merk", form?.part1?.fuse?.Merk],
    ["Type", form?.part1?.fuse?.Type],
    ["No Seri", form?.part1?.fuse?.NoSeri],
    ["Tahun", form?.part1?.fuse?.Tahun],
    ["Tegangan", form?.part1?.fuse?.Tegangan],
  ];

  y = drawPhotoTable(
    pdf,
    M, y, CW,
    "> Nameplate FUSE (RELAY)",
    fuseImgData.filter(Boolean),
    fuseRows,
    36
  );

  // ─── 9. FOOTER ───────────────────────────────
  pdf.setFont("times", "normal");
  pdf.setFontSize(9);
  pdf.text("________________________", 148, 282);
  pdf.text("Teknisi", 163, 287);

  // ─── SAVE ─────────────────────────────────────
  pdf.save(`laporan-${data?.nama || "pengujian"}.pdf`);
};