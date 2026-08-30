import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import DOMPurify from "dompurify";

export async function exportDokumenToPdf(htmlContent, filename = "dokumen") {
  // Mount a hidden container to render the HTML
  const container = document.createElement("div");
  container.style.cssText = [
    "position:fixed",
    "top:-9999px",
    "left:-9999px",
    "width:794px",          // A4 width at 96dpi
    "padding:48px",
    "background:#ffffff",
    "font-family:'Times New Roman',serif",
    "font-size:11pt",
    "line-height:1.6",
    "color:#000000",
  ].join(";");

  // Inject basic prose styles
  const safeHtml = DOMPurify.sanitize(htmlContent, {
    ALLOWED_TAGS: ["h1","h2","h3","h4","p","ul","ol","li","strong","em","mark","del",
      "blockquote","hr","br","span","div","table","thead","tbody","tr","th","td","a"],
    ALLOWED_ATTR: ["style","class","href"],
  });

  container.innerHTML = `
    <style>
      h1 { font-size:18pt; font-weight:bold; margin:12pt 0 6pt; }
      h2 { font-size:14pt; font-weight:bold; margin:10pt 0 5pt; }
      h3 { font-size:12pt; font-weight:bold; margin:8pt 0 4pt; }
      p  { margin:0 0 8pt; }
      ul, ol { margin:0 0 8pt; padding-left:24pt; }
      li { margin-bottom:4pt; }
      blockquote { border-left:3px solid #ccc; margin:8pt 0; padding:4pt 12pt; color:#555; }
      hr { border:none; border-top:1px solid #ccc; margin:12pt 0; }
      strong { font-weight:bold; }
      em { font-style:italic; }
      mark { background:#fef08a; }
      del { text-decoration:line-through; }
      [style*="text-align:center"] { text-align:center; }
      [style*="text-align:right"]  { text-align:right;  }
      [style*="text-align:justify"]{ text-align:justify;}
    </style>
    <div>${safeHtml}</div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });

    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW  = pageW;
    const imgH  = (canvas.height * imgW) / canvas.width;

    let posY = 0;
    let remaining = imgH;
    let page = 0;

    while (remaining > 0) {
      if (page > 0) pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, -posY, imgW, imgH);
      posY += pageH;
      remaining -= pageH;
      page++;
    }

    pdf.save(`${filename}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}
