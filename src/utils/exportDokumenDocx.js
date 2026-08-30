import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, UnderlineType, BorderStyle,
} from "docx";
import DOMPurify from "dompurify";

function saveBlobAs(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function resolveAlignment(style = "") {
  if (style.includes("center")) return AlignmentType.CENTER;
  if (style.includes("right"))  return AlignmentType.RIGHT;
  if (style.includes("justify"))return AlignmentType.BOTH;
  return AlignmentType.LEFT;
}

function parseInlineNodes(el) {
  const runs = [];
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent) runs.push(new TextRun({ text: node.textContent }));
      continue;
    }
    const tag = node.tagName?.toLowerCase();
    const bold      = tag === "strong" || tag === "b";
    const italic    = tag === "em"     || tag === "i";
    const strike    = tag === "del"    || tag === "s";
    const highlight = tag === "mark";
    const underline = tag === "u" ? { type: UnderlineType.SINGLE } : undefined;

    const text = node.textContent || "";
    if (!text) continue;

    runs.push(new TextRun({
      text,
      bold:      bold      || undefined,
      italics:   italic    || undefined,
      strike:    strike    || undefined,
      highlight: highlight ? "yellow" : undefined,
      underline,
    }));
  }
  return runs;
}

function elToParagraphs(el) {
  const tag   = el.tagName?.toLowerCase();
  const style = el.getAttribute?.("style") || "";
  const align = resolveAlignment(style);

  if (tag === "h1") {
    return [new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: align, children: parseInlineNodes(el) })];
  }
  if (tag === "h2") {
    return [new Paragraph({ heading: HeadingLevel.HEADING_2, alignment: align, children: parseInlineNodes(el) })];
  }
  if (tag === "h3") {
    return [new Paragraph({ heading: HeadingLevel.HEADING_3, alignment: align, children: parseInlineNodes(el) })];
  }
  if (tag === "p") {
    return [new Paragraph({ alignment: align, children: parseInlineNodes(el) })];
  }
  if (tag === "blockquote") {
    return [new Paragraph({
      indent: { left: 720 },
      border: { left: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" } },
      children: parseInlineNodes(el),
    })];
  }
  if (tag === "hr") {
    return [new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" } },
      children: [],
    })];
  }
  if (tag === "ul" || tag === "ol") {
    const paragraphs = [];
    let idx = 1;
    for (const li of el.querySelectorAll(":scope > li")) {
      const prefix = tag === "ol" ? `${idx++}. ` : "• ";
      paragraphs.push(new Paragraph({
        indent: { left: 720 },
        children: [new TextRun({ text: prefix }), ...parseInlineNodes(li)],
      }));
    }
    return paragraphs;
  }
  // fallback — treat as paragraph
  const text = el.textContent || "";
  if (text.trim()) return [new Paragraph({ children: [new TextRun({ text })] })];
  return [];
}

export async function exportDokumenToDocx(htmlContent, filename = "dokumen") {
  const tmp = document.createElement("div");
  tmp.innerHTML = DOMPurify.sanitize(htmlContent, {
    ALLOWED_TAGS: ["h1","h2","h3","h4","p","ul","ol","li","strong","em","mark","del",
      "blockquote","hr","br","span","div","table","thead","tbody","tr","th","td"],
    ALLOWED_ATTR: ["style","class"],
  });

  const paragraphs = [];
  for (const child of tmp.children) {
    paragraphs.push(...elToParagraphs(child));
  }

  if (paragraphs.length === 0) {
    paragraphs.push(new Paragraph({ children: [new TextRun({ text: "" })] }));
  }

  const doc = new Document({
    sections: [{
      properties: {},
      children: paragraphs,
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveBlobAs(blob, `${filename}.docx`);
}
