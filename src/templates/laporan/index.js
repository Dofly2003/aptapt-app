import TemplateAdytia from "./TemplateAdytia";

/**
 * Cara nambah template baru:
 *   1. Bikin file TemplateXYZ.jsx (signature: { data, instansi }).
 *   2. Tambah entry di sini.
 *   3. Selesai — admin akan otomatis lihat opsi baru di dropdown.
 *
 * pdfMode: "lhpp" → tombol PDF di LaporanPreview pakai downloadLhpp (@react-pdf/renderer)
 *          tidak ada / undefined → fallback html2canvas (legacy)
 */
export const TEMPLATES = {
  adytia: { component: TemplateAdytia, label: "Adytia (Internal)", pdfMode: "lhpp" },
  ajs: { component: TemplateAdytia, label: "AJS (Astra Jaya Sejahtera)", pdfMode: "lhpp" },
  // pln: { component: TemplatePLN, label: "PLN (Formal)" },
};

export function getTemplate(id) {
  return TEMPLATES[id]?.component ?? TemplateAdytia;
}