import { toSvg } from "html-to-image";
import { jsPDF } from "jspdf";

const A4_W_PT = 595.28;
const A4_H_PT = 841.89;
const PIXEL_RATIO = 2;

/**
 * Inline semua <img> sebagai base64 data-URI sebelum toSvg.
 * Ini mencegah gambar Firebase Storage blank karena cross-origin.
 */
async function inlineImages(element) {
  const imgs = [...element.querySelectorAll("img")];
  await Promise.all(
    imgs.map(async (img) => {
      if (!img.src || img.src.startsWith("data:")) return;
      try {
        const res = await fetch(img.src, { mode: "cors" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        img.src = dataUrl;
        await new Promise((r) => {
          if (img.complete) return r();
          img.onload = r;
          img.onerror = r;
        });
      } catch (e) {
        console.warn("Gagal inline gambar:", img.src?.slice(0, 60), e.message);
        img.style.visibility = "hidden";
      }
    })
  );
}

/**
 * Render a DOM element ke SVG via html-to-image, lalu rasterisasi
 * ke canvas dan paginate ke PDF A4.
 *
 * Alur: inline images → HTML element → SVG (toSvg) → Image → Canvas → JPEG → jsPDF
 *
 * @param {HTMLElement} element  - Template yang akan di-capture
 * @param {string}      filename - Nama file tanpa ekstensi .pdf
 * @param {Function}    onStatus - Callback(string) untuk pesan progres
 */
export async function exportElementToPdf(element, filename = "dokumen", onStatus) {
  onStatus?.("Menyiapkan dokumen...");

  // Tunggu font selesai load
  await document.fonts.ready;
  // Inline gambar → hindari cross-origin blank di SVG
  await inlineImages(element);
  // Beri waktu browser selesai paint (font custom, gambar baru di-inline)
  await new Promise((r) => setTimeout(r, 500));

  onStatus?.("Merender SVG...");

  const svgDataUrl = await toSvg(element, {
    cacheBust: true,
    backgroundColor: "#ffffff",
    pixelRatio: PIXEL_RATIO,
    skipAutoScale: true,
    includeQueryParams: true,
  });

  onStatus?.("Mengonversi ke gambar...");

  // Dimensi canvas = dimensi DOM × pixelRatio
  const canvasW = element.scrollWidth  * PIXEL_RATIO;
  const canvasH = element.scrollHeight * PIXEL_RATIO;

  // SVG → Image → Canvas → JPEG data URL
  const jpegDataUrl = await new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width  = canvasW;
      canvas.height = canvasH;

      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvasW, canvasH);
      ctx.drawImage(img, 0, 0, canvasW, canvasH);

      const jpeg = canvas.toDataURL("image/jpeg", 0.95);

      // Bebaskan memori canvas
      canvas.width = canvas.height = 0;

      resolve(jpeg);
    };

    img.onerror = (err) => reject(err);
    img.src = svgDataUrl;
  });

  onStatus?.("Membuat PDF...");

  // Hitung tinggi total dalam PDF points (scale ke lebar A4)
  const renderedH = (canvasH / canvasW) * A4_W_PT;

  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });

  let yOffset = 0;
  let page    = 0;

  while (yOffset < renderedH) {
    if (page > 0) pdf.addPage();
    // Geser gambar ke atas tiap halaman → efek "potong" halaman
    pdf.addImage(jpegDataUrl, "JPEG", 0, -yOffset, A4_W_PT, renderedH, undefined, "FAST");
    yOffset += A4_H_PT;
    page++;
  }

  pdf.save(`${filename}.pdf`);
  onStatus?.(null);
}
