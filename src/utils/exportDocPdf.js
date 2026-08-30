import domtoimage from "dom-to-image-more";
import jsPDF from "jspdf";
import { Filesystem, Directory } from "@capacitor/filesystem";

export const isCapacitorNative = () => !!window?.Capacitor?.isNativePlatform?.();

const CANVAS_SCALE = 3;
const JPEG_QUALITY = 0.97;
const PAGE_W_MM = 210;
const PAGE_H_MM = 297;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Pre-fetch external images as data-URIs to avoid CORS issues inside foreignObject
async function inlineImages(element) {
  const imgs = [...element.querySelectorAll("img")];
  const CONCURRENCY = 4;
  for (let i = 0; i < imgs.length; i += CONCURRENCY) {
    await Promise.all(imgs.slice(i, i + CONCURRENCY).map(async (img) => {
      if (!img.src || img.src.startsWith("data:")) return;
      try {
        const res = await fetch(img.src, { mode: "cors" });
        if (!res.ok) return;
        const blob = await res.blob();
        await new Promise((resolve) => {
          const r = new FileReader();
          r.onloadend = () => { img.src = r.result; resolve(); };
          r.onerror = resolve;
          r.readAsDataURL(blob);
        });
        await new Promise((r) => { if (img.complete) return r(); img.onload = r; img.onerror = r; });
      } catch {}
    }));
  }
}

// Capture element via dom-to-image-more → returns an HTMLCanvasElement
// dom-to-image renders from the CSS layout engine, not from screen pixels,
// so output is device-independent (same across all Android/iOS/desktop).
async function captureToCanvas(element, captureW) {
  const w = captureW * CANVAS_SCALE;
  const h = element.scrollHeight * CANVAS_SCALE;

  const blob = await domtoimage.toBlob(element, {
    width: w,
    height: h,
    style: {
      transform: `scale(${CANVAS_SCALE})`,
      transformOrigin: "top left",
    },
    bgcolor: "#ffffff",
  });

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

function placeSlice(pdf, canvas, yPx, sliceH) {
  const h = Math.ceil(sliceH);
  const slice = document.createElement("canvas");
  slice.width  = canvas.width;
  slice.height = h;
  const ctx = slice.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, slice.width, h);
  ctx.drawImage(canvas, 0, yPx, canvas.width, sliceH, 0, 0, canvas.width, h);
  const imgH = (sliceH * PAGE_W_MM) / canvas.width;
  pdf.addImage(
    slice.toDataURL("image/jpeg", JPEG_QUALITY),
    "JPEG", 0, 0, PAGE_W_MM, imgH, undefined, "FAST",
  );
  slice.width = slice.height = 0;
}

/**
 * Export DOM element ke PDF (portrait A4, multi-page).
 *
 * Engine: dom-to-image-more — renders via CSS layout, bukan screen pixels.
 * Hasilnya identik di semua device/OS (tidak tergantung DPI layar atau versi Android).
 *
 * Fitur:
 * - .rab-closing / .inv-closing: TTD+footer dijaga tidak terpotong page break.
 * - Scale 3 (≈288 DPI) + JPEG 0.97.
 * - Capacitor: simpan ke Directory.Documents.
 * - Web: browser download.
 */
export async function exportDocPdf(element, filename = "dokumen.pdf", onProgress) {
  if (!element) throw new Error("Element tidak ditemukan");

  onProgress?.("Memuat gambar...");
  await inlineImages(element);
  await document.fonts.ready;
  await sleep(200);

  onProgress?.("Merender halaman...");

  const captureW = Math.max(element.scrollWidth, 794);
  const canvas   = await captureToCanvas(element, captureW);

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });

  // Tinggi 1 halaman A4 dalam satuan pixel canvas
  const pageSlicePx = (PAGE_H_MM * canvas.width) / PAGE_W_MM;

  // Deteksi posisi closing section (TTD + footer)
  // Kalau akan terpotong page break → akhiri halaman lebih awal
  const closingEl = element.querySelector(".rab-closing, .inv-closing");
  let closingTopPx    = -1;
  let closingHeightPx = 0;

  if (closingEl) {
    const parentRect    = element.getBoundingClientRect();
    const childRect     = closingEl.getBoundingClientRect();
    closingTopPx    = (childRect.top  - parentRect.top)  * CANVAS_SCALE;
    closingHeightPx = childRect.height * CANVAS_SCALE;
  }

  // Slice canvas → PDF pages
  let yPx       = 0;
  let firstPage = true;

  while (yPx < canvas.height) {
    if (!firstPage) pdf.addPage();
    firstPage = false;

    const naturalEnd = yPx + pageSlicePx;
    let   sliceEnd   = Math.min(naturalEnd, canvas.height);

    if (
      closingTopPx > yPx + pageSlicePx * 0.1 &&
      closingTopPx < naturalEnd &&
      closingTopPx + closingHeightPx > naturalEnd &&
      closingHeightPx > 0 &&
      closingHeightPx <= pageSlicePx * 0.9
    ) {
      sliceEnd = closingTopPx;
    }

    const sliceH = sliceEnd - yPx;
    if (sliceH > CANVAS_SCALE * 4) {
      placeSlice(pdf, canvas, yPx, sliceH);
    }
    yPx = sliceEnd;
    await sleep(15);
  }

  canvas.width = canvas.height = 0;
  onProgress?.("Menyimpan PDF...");

  if (isCapacitorNative()) {
    const base64 = pdf.output("datauristring").split(",")[1];
    try {
      await Filesystem.writeFile({
        path: filename, data: base64,
        directory: Directory.Documents, recursive: true,
      });
      return { saved: true, location: "Dokumen" };
    } catch {
      await Filesystem.writeFile({
        path: filename, data: base64,
        directory: Directory.Data, recursive: true,
      });
      return { saved: true, location: "penyimpanan internal" };
    }
  } else {
    pdf.save(filename);
    return { saved: true };
  }
}

export function sanitizeFilename(name) {
  return name.replace(/[/\\?%*:|"<>]/g, "-").trim() || "dokumen";
}
