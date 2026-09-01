import { Capacitor } from "@capacitor/core";

async function getCoords() {
  if (Capacitor.isNativePlatform()) {
    const { Geolocation } = await import("@capacitor/geolocation");
    await Geolocation.requestPermissions();
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  }
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error("no geo")); return; }
    navigator.geolocation.getCurrentPosition(
      p  => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      reject,
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "Accept-Language": "id", "User-Agent": "AptaptWeb/1.0" } }
    );
    const data = await res.json();
    const a = data.address || {};
    const parts = [];

    const village = a.village || a.hamlet || a.suburb || a.neighbourhood;
    if (village) parts.push(village);

    const sub = a.subdistrict || a.city_district;
    if (sub) parts.push(`Kec. ${sub}`);

    const county = a.county || a.regency;
    if (county) {
      parts.push(
        county.startsWith("Kabupaten") || county.startsWith("Kota") ? county : `Kabupaten ${county}`
      );
    } else if (a.city) {
      parts.push(a.city);
    }

    const statePostcode = [a.state, a.postcode].filter(Boolean).join(" ");
    if (statePostcode) parts.push(statePostcode);

    return parts.length ? parts.join(", ") : null;
  } catch {
    return null;
  }
}

function generateCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 14 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function formatCoords(lat, lng) {
  const latStr = `${Math.abs(lat).toFixed(6)}°${lat >= 0 ? "N" : "S"}`;
  const lngStr = `${Math.abs(lng).toFixed(6)}°${lng >= 0 ? "E" : "W"}`;
  return `${latStr}, ${lngStr}`;
}

function getNowParts() {
  const now = new Date();
  const tz = { timeZone: "Asia/Jakarta" };
  return {
    time: now.toLocaleTimeString("id-ID", { ...tz, hour: "2-digit", minute: "2-digit", hour12: false }),
    date: now.toLocaleDateString("id-ID", { ...tz, day: "numeric", month: "long", year: "numeric" }),
    day:  now.toLocaleDateString("id-ID", { ...tz, weekday: "long" }),
  };
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

/**
 * Tambahkan watermark GPS bergaya Timemark ke foto.
 * Selalu resolve — fallback ke file asli jika canvas gagal.
 */
export async function addGpsWatermark(file) {
  let lat = null, lng = null, address = null;
  try {
    const pos = await getCoords();
    lat = pos.lat; lng = pos.lng;
    address = await reverseGeocode(lat, lng);
  } catch { /* GPS tidak tersedia — tetap stamp timestamp */ }

  return new Promise(resolve => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      const W = img.width;
      const H = img.height;
      const canvas = document.createElement("canvas");
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(objectUrl);

      const { time, date, day } = getNowParts();
      const code = generateCode();

      // ── Font sizes (relative to width) ──────────────────────────
      const timeFs  = Math.round(W * 0.125);
      const labelFs = Math.round(W * 0.042);
      const coordFs = Math.round(W * 0.036);
      const codeFs  = Math.round(W * 0.030);
      const brandFs = Math.round(W * 0.050);
      const pad     = Math.round(W * 0.038);
      const sep     = Math.round(W * 0.012);

      // ── Measure address wrap (set font first) ────────────────────
      ctx.font = `${labelFs}px Arial, sans-serif`;
      const addrLines = address ? wrapText(ctx, address, W * 0.82) : [];
      const addrLh    = labelFs * 1.45;

      // ── Block heights ────────────────────────────────────────────
      const timeBlockH  = timeFs * 1.3;
      const addrBlockH  = addrLines.length ? sep + addrLines.length * addrLh : 0;
      const coordBoxH   = coordFs * 2.5;
      const coordBlockH = lat !== null ? sep + coordBoxH : 0;
      const codeBlockH  = codeFs * 1.8;

      const contentH = pad + timeBlockH + addrBlockH + coordBlockH + sep + codeBlockH + pad;

      // ── Y anchors (textBaseline = "top" throughout) ──────────────
      const timeTop  = H - contentH + pad;
      const addrTop  = timeTop + timeBlockH + (addrLines.length ? sep : 0);
      const coordTop = addrTop + addrLines.length * addrLh + (addrLines.length ? sep : 0);
      const codeTop  = coordTop + coordBlockH + sep;

      // ── Dark gradient overlay ────────────────────────────────────
      const gradStart = timeTop - timeFs * 0.5;
      const grad = ctx.createLinearGradient(0, gradStart, 0, H);
      grad.addColorStop(0,    "rgba(0,0,0,0)");
      grad.addColorStop(0.25, "rgba(0,0,0,0.75)");
      grad.addColorStop(1,    "rgba(0,0,0,0.92)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, gradStart, W, H - gradStart);

      // ── Top-right brand badge ────────────────────────────────────
      const brandText = "PT Adytia";
      const subText   = "Foto 100% akurat";
      ctx.font = `bold ${brandFs}px Arial, sans-serif`;
      const brandW = Math.max(ctx.measureText(brandText).width, ctx.measureText(subText).width);
      const bx = W - brandW - pad * 1.4;
      const by = pad * 0.4;

      ctx.fillStyle = "rgba(0,0,0,0.45)";
      roundRect(ctx, bx - pad * 0.35, by - pad * 0.25, brandW + pad * 0.7, brandFs * 2.7, brandFs * 0.25);

      ctx.shadowColor = "rgba(0,0,0,0.7)";
      ctx.shadowBlur  = 6;
      ctx.font = `bold ${brandFs}px Arial, sans-serif`;
      ctx.fillStyle = "#f59e0b";
      ctx.textAlign = "right";
      ctx.textBaseline = "top";
      ctx.fillText(brandText, W - pad * 0.8, by);

      ctx.font = `${Math.round(brandFs * 0.70)}px Arial, sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillText(subText, W - pad * 0.8, by + brandFs * 1.22);
      ctx.shadowBlur = 0;

      // ── Right-edge vertical watermark ────────────────────────────
      const vtText = `© ${code}   PT Adytia Verified`;
      ctx.save();
      ctx.translate(W - codeFs * 0.85, H * 0.5);
      ctx.rotate(-Math.PI / 2);
      ctx.font = `${codeFs}px Arial, sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.40)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(vtText, 0, 0);
      ctx.restore();

      // ── Time (large, bottom-left) ────────────────────────────────
      ctx.font = `bold ${timeFs}px Arial, sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 10;
      ctx.fillText(time, pad, timeTop);

      const timeWidth = ctx.measureText(time).width;

      // ── Amber vertical separator ─────────────────────────────────
      const sepThick = Math.max(4, Math.round(W * 0.006));
      const sepX     = pad + timeWidth + sep * 1.5;
      ctx.shadowBlur = 0;
      ctx.fillStyle  = "#f59e0b";
      ctx.fillRect(sepX, timeTop, sepThick, timeBlockH);

      // ── Date + Day (right of separator) ─────────────────────────
      const dtX = sepX + sepThick + sep * 1.5;
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur  = 4;

      ctx.font = `600 ${labelFs}px Arial, sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.textBaseline = "top";
      ctx.fillText(date, dtX, timeTop + timeFs * 0.08);

      ctx.font = `${labelFs}px Arial, sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.80)";
      ctx.fillText(day, dtX, timeTop + timeFs * 0.08 + labelFs * 1.55);

      // ── Address ──────────────────────────────────────────────────
      if (addrLines.length) {
        ctx.font = `${labelFs}px Arial, sans-serif`;
        ctx.fillStyle = "#ffffff";
        ctx.textBaseline = "top";
        ctx.shadowBlur = 4;
        addrLines.forEach((line, i) => {
          ctx.fillText(line, pad, addrTop + i * addrLh);
        });
      }

      // ── Coordinates box ──────────────────────────────────────────
      if (lat !== null) {
        const coordText = `Koordinat: ${formatCoords(lat, lng)}`;
        ctx.font = `${coordFs}px Arial, sans-serif`;
        const coordBoxW = ctx.measureText(coordText).width + pad * 2;

        ctx.shadowBlur = 0;
        ctx.fillStyle  = "rgba(255,255,255,0.18)";
        roundRect(ctx, pad, coordTop, coordBoxW, coordBoxH, coordFs * 0.4);

        ctx.fillStyle    = "#ffffff";
        ctx.textBaseline = "middle";
        ctx.shadowColor  = "rgba(0,0,0,0.6)";
        ctx.shadowBlur   = 3;
        ctx.fillText(coordText, pad + pad * 0.6, coordTop + coordBoxH / 2);
      }

      // ── Photo code ───────────────────────────────────────────────
      ctx.font = `${codeFs}px Arial, sans-serif`;
      ctx.fillStyle    = "rgba(255,255,255,0.70)";
      ctx.textBaseline = "top";
      ctx.shadowBlur   = 2;
      ctx.fillText(`🛡 Kode Foto: ${code}`, pad, codeTop + (codeBlockH - codeFs) * 0.3);

      canvas.toBlob(
        blob => resolve(new File([blob], file.name, { type: "image/jpeg" })),
        "image/jpeg",
        0.88
      );
    };

    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
    img.src = objectUrl;
  });
}
