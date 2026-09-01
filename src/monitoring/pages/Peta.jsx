import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { subscribe } from "../lib/rtdb";

const ROOT = "monitoring/telemetri";
const CENTER = [-7.6, 112.3];
const ZOOM = 8;
const CARD_ZOOM = 8; // kartu tampil permanen mulai zoom ini ke atas
const FRESH_MS = 15 * 60 * 1000;

/* Koordinat stasiun ST-01..ST-20 (dari lapangan). Stasiun diurutkan by
   idStation lalu ditempatkan ke slot ini berurutan. */
const SLOTS = [
  { name: "ST-01", at: [-6.708, 111.341] }, // Rembang / Pati, pesisir utara
  { name: "ST-02", at: [-6.612, 110.885] }, // Jepara / Kudus, lereng Muria
  { name: "ST-03", at: [-6.875, 112.285] }, // Tuban / Lamongan, Paciran-Brondong
  { name: "ST-04", at: [-7.185, 112.742] }, // Surabaya Utara / Muara Kalimas
  { name: "ST-05", at: [-7.525, 110.850] }, // Surakarta / Karanganyar, hulu Bengawan Solo
  { name: "ST-06", at: [-7.150, 111.420] }, // Blora / Grobogan, Kali Lusi
  { name: "ST-07", at: [-7.160, 111.950] }, // Bojonegoro / Lamongan, Bengawan Solo hilir
  { name: "ST-08", at: [-7.460, 112.480] }, // Mojokerto / Jombang, Brantas hilir / Porong
  { name: "ST-09", at: [-7.680, 113.120] }, // Pasuruan / Probolinggo, pesisir utara
  { name: "ST-10", at: [-7.920, 110.880] }, // Wonogiri / Gunungkidul, hulu Gajah Mungkur
  { name: "ST-11", at: [-7.410, 111.450] }, // Ngawi / Madiun, Bengawan Madiun
  { name: "ST-12", at: [-7.680, 112.020] }, // Nganjuk / Kediri, Brantas tengah
  { name: "ST-13", at: [-7.820, 112.690] }, // Malang / Pasuruan, hulu Kali Porong
  { name: "ST-14", at: [-7.980, 113.250] }, // Probolinggo / Lumajang, Ranu Klakah
  { name: "ST-15", at: [-8.210, 111.090] }, // Pacitan, Teluk Pacitan / Muara Grindulu
  { name: "ST-16", at: [-8.250, 111.720] }, // Trenggalek / Tulungagung, Prigi-Popoh
  { name: "ST-17", at: [-8.360, 112.550] }, // Blitar / Malang Selatan, Sendangbiru
  { name: "ST-18", at: [-8.350, 113.480] }, // Jember / Lumajang, Puger
  { name: "ST-19", at: [-8.580, 114.280] }, // Banyuwangi Selatan, Teluk Grajagan
  { name: "ST-20", at: [-8.120, 114.390] }, // Banyuwangi Utara / Ketapang
];

/* Stasiun ke-21+ (di luar slot) disebar acak-deterministik di Jawa. */
const JAVA = { latMin: -8.4, latMax: -6.3, lonMin: 106.0, lonMax: 114.3 };
function hashCoord(id) {
  let a = 7, b = 13;
  for (let i = 0; i < id.length; i++) {
    a = (a * 31 + id.charCodeAt(i)) >>> 0;
    b = (b * 131 + id.charCodeAt(i) * 7) >>> 0;
  }
  return [
    JAVA.latMin + ((a % 10000) / 10000) * (JAVA.latMax - JAVA.latMin),
    JAVA.lonMin + ((b % 10000) / 10000) * (JAVA.lonMax - JAVA.lonMin),
  ];
}

const LAT_KEYS = ["lat", "latitude", "gpsLat", "Lat"];
const LON_KEYS = ["lon", "lng", "long", "longitude", "gpsLon", "Lng"];
const LEVEL_KEYS = ["wlevel", "water_level", "level", "level_cm", "tma"];

const numOr = (v) => (v != null && Number.isFinite(Number(v)) ? Number(v) : null);
const pick = (obj, keys) => {
  for (const k of keys) {
    const n = numOr(obj?.[k]);
    if (n != null) return n;
  }
  return null;
};

/* Water Level: alat kirim cm -> tampil meter. elevation sudah meter. */
function levelMeter(live) {
  const el = numOr(live?.elevation);
  if (el != null) return el;
  const cm = pick(live, LEVEL_KEYS);
  return cm == null ? null : cm / 100;
}

function cardHtml(name, live, approx) {
  const lvl = levelMeter(live);
  const v = numOr(live?.vcc);
  const ph = numOr(live?.ph);
  const stale = Date.now() - (live?.ts || 0) > FRESH_MS;
  const row = (icon, label, val) =>
    `<div class="wq-row"><span>${icon}</span><span class="wq-lbl">${label}</span><b>${val}</b></div>`;
  return `
    <div class="wq-card ${stale ? "wq-stale" : ""}">
      <div class="wq-id">${name}</div>
      ${row("💧", "Water Level", lvl == null ? "– m" : lvl.toFixed(2) + " m")}
      ${row("⚡", "Tegangan Panel", v == null ? "– V" : v.toFixed(1) + " V")}
      ${row("🟢", "Kualitas Air", ph == null || ph === 0 ? "–" : "pH " + ph.toFixed(1))}
      ${approx ? '<div class="wq-approx">◦ posisi perkiraan</div>' : ""}
    </div>`;
}

export default function Peta() {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const markersRef = useRef(new Map());
  const fittedRef = useRef(false);
  const [stations, setStations] = useState({});

  useEffect(() => {
    const map = L.map(elRef.current, { center: CENTER, zoom: ZOOM, scrollWheelZoom: true });
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { attribution: "Tiles © Esri", maxZoom: 19 }
    ).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const applyZoomClass = () => {
      elRef.current?.classList.toggle("cards-hidden", map.getZoom() < CARD_ZOOM);
    };
    map.on("zoomend", applyZoomClass);
    applyZoomClass();

    setTimeout(() => map.invalidateSize(), 100);
    return () => map.remove();
  }, []);

  useEffect(() => subscribe(ROOT, (v) => setStations(v || {})), []);

  useEffect(() => {
    const lg = layerRef.current;
    if (!lg) return;
    const markers = markersRef.current;
    const pts = [];
    const seen = new Set();

    // urutkan stasiun stabil -> slot ST-01, ST-02, ...
    const entries = Object.entries(stations)
      .filter(([, node]) => node?.live)
      .sort(([a], [b]) => a.localeCompare(b));

    entries.forEach(([id, node], idx) => {
      const live = node.live;
      let lat = pick(live, LAT_KEYS);
      let lon = pick(live, LON_KEYS);
      let approx = false;
      let name = SLOTS[idx]?.name || id.slice(0, 8) + "…";

      if (lat == null || lon == null) {
        if (SLOTS[idx]) { [lat, lon] = SLOTS[idx].at; } // koordinat lapangan
        else { [lat, lon] = hashCoord(id); approx = true; } // stasiun ke-21+
      }
      seen.add(id);
      pts.push([lat, lon]);

      const online = Date.now() - (live.ts || 0) < FRESH_MS;
      const stroke = online ? "#38bdf8" : "#64748b";
      const fill = online ? "#0ea5e9" : "#475569";

      let m = markers.get(id);
      if (!m) {
        m = L.circleMarker([lat, lon], { radius: 7, color: stroke, fillColor: fill, fillOpacity: 1, weight: 2 });
        m.bindTooltip("", { permanent: true, direction: "top", className: "wq-tip", offset: [0, -8], interactive: true });
        m.bindPopup("", { className: "wq-pop", closeButton: false });
        m.addTo(lg);
        markers.set(id, m);
      } else {
        m.setLatLng([lat, lon]);
        m.setStyle({ color: stroke, fillColor: fill });
      }
      const html = cardHtml(name, live, approx);
      m.setTooltipContent(html);
      m.setPopupContent(html);
    });

    for (const [id, m] of markers) {
      if (!seen.has(id)) { lg.removeLayer(m); markers.delete(id); }
    }

    if (!fittedRef.current && pts.length && mapRef.current) {
      fittedRef.current = true;
      try { mapRef.current.fitBounds(L.latLngBounds(pts).pad(0.15)); } catch { /* satu titik */ }
    }
  }, [stations]);

  return (
    <div className="relative">
      <style>{`
        .wq-tip { background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; }
        .wq-tip .leaflet-tooltip-tip, .wq-tip::before { display: none !important; }
        .cards-hidden .wq-tip { display: none !important; }
        .wq-pop .leaflet-popup-content-wrapper { background: transparent; box-shadow: none; }
        .wq-pop .leaflet-popup-content { margin: 0; }
        .wq-pop .leaflet-popup-tip { display: none; }
        .wq-card { background: rgba(12,32,58,.94); border: 1px solid #29527f; border-radius: 8px;
          padding: 0 0 6px; color: #dbeafe; font-size: 11px; line-height: 1.5; min-width: 176px;
          box-shadow: 0 8px 20px rgba(0,0,0,.5); overflow: hidden; }
        .wq-card.wq-stale { opacity: .55; }
        .wq-id { font-weight: 700; color: #fff; background: #2563eb; padding: 3px 9px; font-size: 11px; letter-spacing: .5px; }
        .wq-row { display: flex; align-items: center; gap: 6px; padding: 2px 9px; }
        .wq-row .wq-lbl { color: #93c5fd; flex: 1; }
        .wq-row b { color: #f8fafc; font-weight: 700; }
        .wq-row span:first-child { width: 13px; text-align: center; }
        .wq-approx { padding: 0 9px; color: #fbbf24; font-size: 10px; }
      `}</style>

      <div
        ref={elRef}
        style={{ height: "calc(100vh - 130px)", width: "100%", borderRadius: 12, overflow: "hidden", background: "#0f172a" }}
      />

      {/* Legenda */}
      <div className="absolute bottom-3 left-3 z-[500] bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2 text-[11px] text-slate-300">
        <p className="font-semibold text-slate-200 mb-1">KETERANGAN</p>
        <p>💧 Water Level (m)</p>
        <p>⚡ Tegangan Panel (V)</p>
        <p>🟢 Kualitas Air (pH)</p>
      </div>

      <div className="absolute top-3 right-3 z-[500] bg-slate-900/85 border border-slate-700 rounded-lg px-3 py-2 text-[11px] text-slate-300 pointer-events-none">
        Zoom out jauh untuk sembunyikan kartu · klik titik untuk detail
      </div>
    </div>
  );
}
