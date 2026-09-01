import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { subscribe } from "../lib/rtdb";

const ROOT = "monitoring/telemetri";
const CENTER = [-7.75, 112.4];
const ZOOM = 8;
const FRESH_MS = 15 * 60 * 1000;

/* Koordinat manual per stasiun — dipakai kalau alat TIDAK mengirim lat/lon.
   Isi: "idStation": [lat, lng]  */
const COORDS = {
  // "awlr13063l": [-7.98, 112.63],
  // "278e44482bc0cd4255e21ee1a4c4e6e5": [-7.62, 112.19],
};

/* Sementara: sebar stasiun tanpa koordinat ke sekitar Jawa Timur (dummy,
   posisi acak-deterministik dari idStation). Set false kalau sudah pakai
   koordinat asli lewat COORDS / field lat-lon. */
const DUMMY_SPREAD = true;
const JATIM = { latMin: -8.55, latMax: -7.05, lonMin: 111.3, lonMax: 114.2 };
function hashCoord(id) {
  let a = 7, b = 13;
  for (let i = 0; i < id.length; i++) {
    a = (a * 31 + id.charCodeAt(i)) >>> 0;
    b = (b * 131 + id.charCodeAt(i) * 7) >>> 0;
  }
  return [
    JATIM.latMin + ((a % 10000) / 10000) * (JATIM.latMax - JATIM.latMin),
    JATIM.lonMin + ((b % 10000) / 10000) * (JATIM.lonMax - JATIM.lonMin),
  ];
}

const LAT_KEYS = ["lat", "latitude", "gpsLat", "Lat"];
const LON_KEYS = ["lon", "lng", "long", "longitude", "gpsLon", "Lng"];
const LEVEL_KEYS = ["wlevel", "water_level", "level", "level_cm", "tma", "elevation"];

const numOr = (v) => (v != null && Number.isFinite(Number(v)) ? Number(v) : null);
const pick = (obj, keys) => {
  for (const k of keys) {
    const n = numOr(obj?.[k]);
    if (n != null) return n;
  }
  return null;
};

function cardHtml(id, live, approx) {
  const lvl = pick(live, LEVEL_KEYS);
  const v = numOr(live?.vcc);
  const stale = Date.now() - (live?.ts || 0) > FRESH_MS;
  return `
    <div class="wq-card ${stale ? "wq-stale" : ""}">
      <div class="wq-id">${id.slice(0, 8)}…</div>
      <div class="wq-row"><span>💧</span> Water Level: <b>${lvl == null ? "– " : lvl.toFixed(2) + " "}</b>${lvl == null ? "m" : "cm"}</div>
      <div class="wq-row"><span>⚡</span> Tegangan: <b>${v == null ? "– " : v.toFixed(1) + " "}</b>V</div>
      <div class="wq-row wq-time"><span>🕓</span> ${live?.terminalTime || "—"}</div>
      ${approx ? '<div class="wq-approx">◦ posisi perkiraan</div>' : ""}
    </div>`;
}

export default function Peta() {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const markersRef = useRef(new Map()); // id -> circleMarker
  const fittedRef = useRef(false);
  const [stations, setStations] = useState({});
  const [noCoord, setNoCoord] = useState([]);

  useEffect(() => {
    const map = L.map(elRef.current, { center: CENTER, zoom: ZOOM, scrollWheelZoom: true });
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { attribution: "Tiles © Esri", maxZoom: 19 }
    ).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 100);
    return () => map.remove();
  }, []);

  useEffect(() => subscribe(ROOT, (v) => setStations(v || {})), []);

  useEffect(() => {
    const lg = layerRef.current;
    if (!lg) return;
    const markers = markersRef.current;
    const missing = [];
    const pts = [];
    const seen = new Set();

    Object.entries(stations).forEach(([id, node]) => {
      const live = node?.live;
      if (!live) return;
      let lat = pick(live, LAT_KEYS);
      let lon = pick(live, LON_KEYS);
      let approx = false;
      if ((lat == null || lon == null) && COORDS[id]) [lat, lon] = COORDS[id];
      if ((lat == null || lon == null) && DUMMY_SPREAD) { [lat, lon] = hashCoord(id); approx = true; }
      if (lat == null || lon == null) { missing.push(id); return; }
      seen.add(id);
      pts.push([lat, lon]);
      const online = Date.now() - (live.ts || 0) < FRESH_MS;
      const stroke = approx ? "#f59e0b" : online ? "#38bdf8" : "#64748b";
      const fill = approx ? "#f59e0b" : online ? "#0ea5e9" : "#475569";

      let m = markers.get(id);
      if (!m) {
        m = L.circleMarker([lat, lon], { radius: 7, color: stroke, fillColor: fill, fillOpacity: 1, weight: 2 });
        m.bindTooltip("", { permanent: true, direction: "top", className: "wq-tip", offset: [0, -8], interactive: true });
        m.addTo(lg);
        markers.set(id, m);
      } else {
        m.setLatLng([lat, lon]);
        m.setStyle({ color: stroke, fillColor: fill });
      }
      m.setTooltipContent(cardHtml(id, live, approx)); // update konten saja, tanpa redraw
    });

    // buang marker stasiun yang hilang
    for (const [id, m] of markers) {
      if (!seen.has(id)) { lg.removeLayer(m); markers.delete(id); }
    }

    setNoCoord(missing);

    // auto-fit HANYA sekali (jangan reset zoom user saat data live masuk)
    if (!fittedRef.current && pts.length && mapRef.current) {
      fittedRef.current = true;
      try { mapRef.current.fitBounds(L.latLngBounds(pts).pad(0.2)); } catch { /* satu titik */ }
    }
  }, [stations]);

  return (
    <div className="relative">
      <style>{`
        .wq-tip { background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; }
        .wq-tip .leaflet-tooltip-tip, .wq-tip::before { display: none !important; }
        .wq-card { background: rgba(11,42,74,.92); border: 1px solid #1e63a8; border-radius: 10px;
          padding: 7px 10px; color: #dbeafe; font-size: 11px; line-height: 1.55; min-width: 148px;
          box-shadow: 0 6px 18px rgba(0,0,0,.45); }
        .wq-card.wq-stale { opacity: .6; border-color: #475569; }
        .wq-id { font-weight: 700; color: #7dd3fc; margin-bottom: 2px; letter-spacing: .3px; }
        .wq-row b { color: #f8fafc; font-weight: 700; }
        .wq-row span { opacity: .8; }
        .wq-time { color: #93c5fd; }
        .wq-approx { margin-top: 3px; color: #fbbf24; font-size: 10px; }
      `}</style>

      <div
        ref={elRef}
        style={{ height: "calc(100vh - 130px)", width: "100%", borderRadius: 12, overflow: "hidden", background: "#0f172a" }}
      />

      {DUMMY_SPREAD && (
        <div className="absolute bottom-3 left-3 z-[500] bg-slate-900/92 border border-amber-700/60 rounded-lg p-3 text-xs max-w-[300px]">
          <p className="font-semibold text-amber-400 mb-1">Posisi marker masih perkiraan (dummy)</p>
          <p className="text-slate-400">
            Stasiun disebar acak di area Jawa Timur. Isi koordinat asli di <code>COORDS</code> pada <code>Peta.jsx</code> (<code>"idStation": [lat, lng]</code>), lalu set <code>DUMMY_SPREAD = false</code>.
          </p>
        </div>
      )}
      {!DUMMY_SPREAD && noCoord.length > 0 && (
        <div className="absolute bottom-3 left-3 z-[500] bg-slate-900/92 border border-slate-700 rounded-lg p-3 text-xs max-w-[280px]">
          <p className="font-semibold text-amber-400 mb-1">{noCoord.length} stasiun belum ada koordinat</p>
          <p className="text-slate-400">Isi <code>COORDS</code> di <code>Peta.jsx</code>.</p>
        </div>
      )}
    </div>
  );
}
