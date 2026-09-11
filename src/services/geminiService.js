const MODELS = [
  "gemini-flash-latest",
  "gemini-3-flash-preview",
  "gemini-pro-latest",
];
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

function getKey() {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) throw new Error("VITE_GEMINI_API_KEY belum diisi di file .env");
  return key;
}

async function urlToBase64(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function callGemini(parts) {
  const key = getKey();
  let lastError;
  for (const model of MODELS) {
    const url = `${BASE_URL}/${model}:generateContent`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
      }),
    });
    if (res.status === 404) {
      const err = await res.json().catch(() => ({}));
      lastError = new Error(err?.error?.message ?? `Model ${model} tidak tersedia`);
      continue;
    }
    if (res.status === 429) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message ?? "Quota Gemini habis, coba lagi nanti");
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message ?? `Gemini error ${res.status}`);
    }
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    try {
      return JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      return match ? JSON.parse(match[0]) : {};
    }
  }
  throw lastError ?? new Error("Semua model Gemini tidak tersedia");
}

/**
 * Baca nameplate / label peralatan dari foto dan isi field form.
 * @param {string[]} photoUrls  - URL foto Firebase Storage
 * @param {Array<{name,label}>} fields - field form yang perlu diisi
 * @returns {Promise<Record<string,string|null>>}
 */
export async function scanNameplate(photoUrls, fields) {
  const validUrls = photoUrls.filter(Boolean);
  if (!validUrls.length) throw new Error("Tidak ada foto untuk di-scan");

  const fieldList = fields
    .filter((f) => f.type !== "checkbox")
    .map((f) => `- "${f.name}": ${f.label}`)
    .join("\n");

  const emptyJson = JSON.stringify(
    Object.fromEntries(fields.filter((f) => f.type !== "checkbox").map((f) => [f.name, null]))
  );

  const prompt = `Kamu adalah AI ekstraksi data teknis dari nameplate/label peralatan listrik.
Analisis gambar berikut dan ekstrak nilai untuk setiap field yang diminta.

Field yang perlu diisi:
${fieldList}

Aturan penting:
- Kembalikan HANYA JSON valid, tanpa penjelasan teks lain
- Nilai numerik: angka saja TANPA satuan (satuan sudah tertera di nama field)
  Contoh: ratingV = "24" bukan "24 kV", ratingI = "630" bukan "630 A"
- Jika field tidak ditemukan di foto, isi null
- Jenis pemutus: gunakan "SF6", "Vacuum", atau "Oil"

Format output (isi nilai yang ditemukan):
${emptyJson}`;

  const imageParts = await Promise.all(
    validUrls.map(async (url) => ({
      inlineData: { mimeType: "image/jpeg", data: await urlToBase64(url) },
    }))
  );

  return callGemini([{ text: prompt }, ...imageParts]);
}

/**
 * Baca nilai angka dari display/layar alat ukur (multimeter, clamp meter, dll).
 * @param {string} photoUrl  - URL foto hasil pengukuran
 * @param {string} fieldLabel - label field (untuk konteks AI)
 * @returns {Promise<string|null>} nilai angka sebagai string, atau null
 */
export async function scanMeasurement(photoUrl, fieldLabel) {
  if (!photoUrl) throw new Error("Tidak ada foto untuk di-scan");

  const prompt = `Baca nilai pengukuran yang ditampilkan pada layar/display alat ukur di gambar ini.
Field: ${fieldLabel}

Aturan:
- Kembalikan JSON: {"value": "<angka>"} atau {"value": null} jika tidak terbaca
- Nilai: angka saja TANPA satuan (contoh: "416" bukan "416 V", "239" bukan "239 V")
- Jika ada beberapa angka di layar, ambil yang paling menonjol/besar
- Jika layar gelap atau tidak terbaca, kembalikan null`;

  const base64 = await urlToBase64(photoUrl);
  const result = await callGemini([
    { text: prompt },
    { inlineData: { mimeType: "image/jpeg", data: base64 } },
  ]);

  return result?.value ?? null;
}

/**
 * Mini-AI: analisa proteksi ACB Utama PHB TR dari spesifikasi + setting-nya.
 * @param {object} acb  - field acb_utama (merk, tipe, ratingV, ratingI, overload,
 *                        instantenious, trippingDelay, settingOverload,
 *                        settingInstantenious, settingTrippingDelay)
 * @param {object} ctx  - { trafoKapasitas, trafoTeganganPS, bebanPersen }
 * @returns {Promise<{tujuanProteksi:string, analisa:string}>}
 */
export async function analisaAcb(acb = {}, ctx = {}) {
  const v = (x) => (x === undefined || x === null || x === "" ? "-" : String(x));

  // Arus nominal trafo sisi sekunder (A) = kVA*1000 / (√3 * V_sekunder)
  const kva = parseFloat(String(ctx.trafoKapasitas ?? "").replace(",", "."));
  const vSek = parseFloat(
    String(ctx.trafoTeganganPS ?? "").replace(/[.\s]/g, "").split(/[/xX-]/)[1] ?? ""
  );
  const inTrafo = Number.isFinite(kva) && Number.isFinite(vSek) && vSek > 0
    ? Math.round((kva * 1000) / (Math.sqrt(3) * vSek))
    : null;

  const prompt = `Kamu insinyur proteksi tenaga listrik. Berdasarkan spesifikasi ACB (Air Circuit Breaker) utama PHB TR berikut, tulis analisa RINGKAS.

Data ACB:
- Merk / Tipe: ${v(acb.merk)} / ${v(acb.tipe)}
- Rating tegangan (Ue): ${v(acb.ratingV)} V
- Rating arus (In): ${v(acb.ratingI)} A
- I Overload (nameplate): ${v(acb.overload)}
- I Instantaneous (nameplate): ${v(acb.instantenious)}
- Tripping delay (nameplate): ${v(acb.trippingDelay)}
- Setting Overload (long-time): ${v(acb.settingOverload)}
- Setting Instantaneous (short-circuit): ${v(acb.settingInstantenious)}
- Setting Tripping delay: ${v(acb.settingTrippingDelay)}

Konteks instalasi:
- Kapasitas trafo: ${v(ctx.trafoKapasitas)} kVA
- Tegangan sekunder: ${Number.isFinite(vSek) ? vSek : "-"} V
- Arus nominal trafo (hitung): ${inTrafo ?? "-"} A
- Persentase pembebanan: ${v(ctx.bebanPersen)} %

Tugas — kembalikan HANYA JSON:
{
  "tujuanProteksi": "1 paragraf (2-4 kalimat) Bahasa Indonesia teknis: fungsi proteksi ACB ini — proteksi beban lebih (overload/long-time), hubung singkat (instantaneous/short-circuit), dan tunda trip — dikaitkan dengan nilai setting yang ada.",
  "analisa": "1 paragraf (2-4 kalimat) Bahasa Indonesia teknis: penilaian kelayakan rating & setting ACB terhadap arus nominal trafo dan pembebanan; sebut bila ada indikasi under/over-protection; beri rekomendasi singkat bila perlu. Jika data kurang, sebutkan asumsi seperlunya."
}
Tanpa markdown, tanpa bullet.`;

  const res = await callGemini([{ text: prompt }]);
  return {
    tujuanProteksi: typeof res?.tujuanProteksi === "string" ? res.tujuanProteksi.trim() : "",
    analisa: typeof res?.analisa === "string" ? res.analisa.trim() : "",
  };
}
