import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).href;

async function extractTextPdfJs(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let html = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    let pageText = "";
    let lastY = null;
    for (const item of content.items) {
      if ("str" in item) {
        // insert line break when Y position changes significantly
        if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
          pageText += "\n";
        }
        pageText += item.str;
        lastY = item.transform[5];
      }
    }
    // wrap each page as paragraphs
    const paras = pageText
      .split("\n")
      .map(l => l.trim())
      .filter(Boolean)
      .map(l => `<p>${l}</p>`)
      .join("");
    if (i > 1) html += `<hr><p><strong>Halaman ${i}</strong></p>`;
    html += paras;
  }
  return html;
}

async function extractTextOcr(file) {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("ind+eng");
  const arrayBuffer = await file.arrayBuffer();
  const pdfjsLib2 = await import("pdfjs-dist");
  const pdf = await pdfjsLib2.getDocument({ data: arrayBuffer }).promise;
  let html = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob = await new Promise(res => canvas.toBlob(res, "image/png"));
    const { data } = await worker.recognize(blob);
    const paras = data.text
      .split("\n")
      .map(l => l.trim())
      .filter(Boolean)
      .map(l => `<p>${l}</p>`)
      .join("");
    if (i > 1) html += `<hr><p><strong>Halaman ${i}</strong></p>`;
    html += paras;
  }
  await worker.terminate();
  return html;
}

export async function convertPdfToHtml(file, onStatus) {
  onStatus?.("Mengekstrak teks dari PDF...");
  const html = await extractTextPdfJs(file);
  const textLen = html.replace(/<[^>]*>/g, "").trim().length;

  if (textLen < 50) {
    onStatus?.("Teks sedikit, mencoba OCR (ini mungkin butuh waktu)...");
    return extractTextOcr(file);
  }
  return html;
}

export async function convertDocxToHtml(file) {
  const mammoth = (await import("mammoth")).default;
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  return result.value;
}
