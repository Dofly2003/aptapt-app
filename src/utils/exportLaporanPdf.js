import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const PAGE_W_MM = 210;
const PAGE_H_MM = 297;
const CANVAS_SCALE = 2;
const JPEG_QUALITY = 0.92;

/**
 * Export all `.laporan-page-sheet` elements inside `element` to a multi-page PDF.
 * Each sheet is captured at exactly 794×1123 px (A4 @ 96 dpi × scale).
 */
export async function exportLaporanPdf(element, filename = "laporan.pdf", onProgress) {
  if (!element) throw new Error("Element tidak ditemukan");

  const report = (current, total, label) => onProgress?.({ current, total, label });

  report(0, 100, "Memuat gambar...");
  await inlineImages(element);

  const sheets = [...element.querySelectorAll(".laporan-page-sheet")];
  if (sheets.length === 0) throw new Error("Tidak ada halaman ditemukan (.laporan-page-sheet).");

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });

  for (let i = 0; i < sheets.length; i++) {
    report(Math.round((i / sheets.length) * 90), 100, `Render halaman ${i + 1}/${sheets.length}`);

    const sheet = sheets[i];
    const w = sheet.scrollWidth  || 794;
    const h = sheet.scrollHeight || 1123;

    const canvas = await html2canvas(sheet, {
      scale: CANVAS_SCALE,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      width: w,
      height: h,
      scrollX: 0,
      scrollY: 0,
      imageTimeout: 15000,
    });

    const imgData = canvas.toDataURL("image/jpeg", JPEG_QUALITY);

    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, 0, PAGE_W_MM, PAGE_H_MM, undefined, "FAST");

    canvas.width = canvas.height = 0;
    await sleep(20);
  }

  report(95, 100, "Menyusun PDF...");
  await sleep(30);
  pdf.save(filename);
  report(100, 100, "Selesai");
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function inlineImages(element) {
  const imgs = [...element.querySelectorAll("img")];
  const CONCURRENCY = 4;
  for (let i = 0; i < imgs.length; i += CONCURRENCY) {
    await Promise.all(imgs.slice(i, i + CONCURRENCY).map(inlineOne));
  }
}

async function inlineOne(img) {
  if (!img.src || img.src.startsWith("data:")) return;
  try {
    const res = await fetch(img.src, { mode: "cors" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const dataUrl = await blobToDataURL(blob);
    img.src = dataUrl;
    await new Promise((r) => { if (img.complete) return r(); img.onload = r; img.onerror = r; });
  } catch (e) {
    console.warn("Gagal inline image:", img.src, e.message);
    img.style.visibility = "hidden";
  }
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}
