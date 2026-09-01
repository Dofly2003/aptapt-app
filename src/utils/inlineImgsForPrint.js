/**
 * Sebelum react-to-print clone DOM, konversi semua <img> src ke data URL.
 * Ini menghindari CORS/CSP error saat react-to-print mencoba preload ulang
 * gambar dari Firebase Storage di dalam iframe print.
 *
 * Kembalikan fungsi restore untuk dipanggil di onAfterPrint.
 */
export async function inlineImgsForPrint(el) {
  const imgs = [...el.querySelectorAll("img")];
  const saved = imgs.map(img => img.src);

  await Promise.allSettled(imgs.map(async img => {
    if (!img.src || img.src.startsWith("data:")) return;
    try {
      const res = await fetch(img.src, { mode: "cors", cache: "no-store" });
      if (!res.ok) return;
      const blob = await res.blob();
      img.src = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch { /* keep original src — CSP fix sudah cover ini */ }
  }));

  return () => imgs.forEach((img, i) => { img.src = saved[i]; });
}
