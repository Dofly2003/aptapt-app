import { db } from "../firebase/config";
import {
  collection, addDoc, serverTimestamp,
  query, where, orderBy, limit, getDocs,
} from "firebase/firestore";

const COLL = "analytics_events";

// ── Session ID ─────────────────────────────────────────────────────────────────
function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function initSession() {
  let id = localStorage.getItem("_a_sid");
  if (!id) { id = makeId(); localStorage.setItem("_a_sid", id); }
  return id;
}

// ── Geo (fetched once per session, cached in sessionStorage) ───────────────────
let _geoPromise = null;
export async function getGeoInfo() {
  const cached = sessionStorage.getItem("_a_geo");
  if (cached) { try { return JSON.parse(cached); } catch { /* fall through */ } }
  if (!_geoPromise) {
    _geoPromise = fetch("https://ip-api.com/json?fields=city,country,regionName")
      .then(r => r.json())
      .then(d => {
        const geo = { city: d.city || null, country: d.country || null, region: d.regionName || null };
        sessionStorage.setItem("_a_geo", JSON.stringify(geo));
        return geo;
      })
      .catch(() => ({ city: null, country: null, region: null }));
  }
  return _geoPromise;
}

// ── Browser / device detection ─────────────────────────────────────────────────
let _browser = null;
export function getBrowserInfo() {
  if (_browser) return _browser;
  const ua = navigator.userAgent;
  let browser = "Other";
  if (ua.includes("Edg/"))              browser = "Edge";
  else if (ua.includes("Chrome/"))      browser = "Chrome";
  else if (ua.includes("Firefox/"))     browser = "Firefox";
  else if (ua.includes("Safari/") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("OPR/") || ua.includes("Opera"))      browser = "Opera";

  let device = "desktop";
  if (/Mobi|Android|iPhone|iPod/i.test(ua)) device = "mobile";
  else if (/iPad|Tablet/i.test(ua))          device = "tablet";

  _browser = { browser, device };
  return _browser;
}

// ── Page name mapping ──────────────────────────────────────────────────────────
const PAGE_MAP = {
  "/": "Beranda",
  "/about": "Tentang Kami",
  "/contact": "Kontak",
  "/panel1": "Panel",
  "/daftar-nidi-slo": "Daftar NIDI/SLO",
  "/login": "Login",
  "/login-phone": "Login Telepon",
  "/pesanan-saya": "Pesanan Saya",
  "/dashboard": "Dashboard Utama",
  "/dashboard/rab": "Manajemen RAB",
  "/dashboard/invoice": "Manajemen Invoice",
  "/dashboard/instansi": "Manajemen Instansi",
  "/dashboard/pengujian": "Data Pengujian",
  "/dashboard/users": "User Management",
  "/dashboard/guest-accounts": "Akun Tamu",
  "/dashboard/guest-approvals": "Persetujuan Tamu",
  "/dashboard/analytics": "Analytics",
  "/dashboard/laik-operasi": "Laik Operasi",
  "/dashboard/master-harga": "Master Harga",
  "/dashboard/keuangan/kwitansi": "Kwitansi",
  "/dashboard/keuangan/ledger": "Ledger Umum",
  "/dashboard/keuangan/hutang": "Akun Dibayar (AP)",
  "/dashboard/keuangan/piutang": "Akun Diterima (AR)",
  "/dashboard/keuangan/anggaran": "Anggaran",
  "/dashboard/keuangan/arus-kas": "Arus Kas",
  "/dashboard/kasbon": "Arus Kas User",
  "/dashboard/sdm/karyawan": "Data Karyawan",
  "/dashboard/sdm/penggajian": "Penggajian",
  "/dashboard/sdm/absensi": "Absensi",
  "/dashboard/sdm/rekrutmen": "Rekrutmen",
  "/dashboard/sdm/kinerja": "Penilaian Kinerja",
  "/dashboard/sdm/sertifikat-magang": "Sertifikat Magang",
  "/dashboard/pengadaan/purchase-order": "Purchase Order",
  "/dashboard/pengadaan/vendor": "Data Vendor",
  "/dashboard/pengadaan/approval": "Approval Pembelian",
  "/dashboard/pengadaan/penerimaan": "Penerimaan Barang",
  "/dashboard/inventori/stok": "Stok Barang",
  "/dashboard/inventori/pergerakan": "Pergerakan Stok",
  "/dashboard/inventori/gudang": "Master Gudang",
  "/dashboard/produksi/bom": "Bill of Material",
  "/dashboard/produksi/work-order": "Work Order Produksi",
  "/dashboard/produksi/penjadwalan": "Penjadwalan Produksi",
  "/dashboard/produksi/inspeksi": "Inspeksi Kualitas",
  "/dashboard/penjualan/pelanggan": "Data Pelanggan",
  "/dashboard/penjualan/sales-order": "Sales Order",
  "/dashboard/penjualan/invoice": "Invoice Penjualan",
  "/dashboard/penjualan/pipeline": "Pipeline CRM",
  "/dashboard/proyek/daftar": "Manajemen Proyek",
  "/dashboard/proyek/jadwal": "Jadwal Tim",
  "/dashboard/proyek/sumber-daya": "Sumber Daya",
  "/dashboard/aset/daftar": "Daftar Aset",
  "/dashboard/aset/maintenance": "Jadwal Maintenance",
  "/dashboard/aset/work-order": "Work Order Aset",
  "/dashboard/aset/alat-kerja": "Alat Kerja",
  "/dashboard/landing/slides": "CMS Hero Slider",
  "/dashboard/landing/services": "CMS Services",
  "/dashboard/landing/projects": "CMS Projects",
  "/dashboard/landing/testimonials": "CMS Testimonials",
  "/dashboard/landing/settings": "CMS Settings",
  "/app-mobile": "Mobile Home",
  "/app-mobile/form-pengujian": "Daftar Form Pengujian",
  "/app-mobile/keuangan": "Mobile Keuangan",
  "/app-mobile/inventori": "Mobile Inventori",
  "/app-mobile/rab": "Mobile RAB",
  "/app-mobile/invoice": "Mobile Invoice",
  "/app-mobile/kasbon": "Mobile Kasbon",
};

export function getPageName(path) {
  if (PAGE_MAP[path]) return PAGE_MAP[path];
  if (path.startsWith("/dashboard/pengujian/")) return "Detail Pengujian";
  if (path.startsWith("/dashboard/rab/")) return "Editor RAB";
  if (path.startsWith("/dashboard/invoice/")) return "Editor Invoice";
  if (path.startsWith("/dashboard/laik-operasi/")) return "Editor Laik Operasi";
  if (path.startsWith("/dashboard/keuangan/kwitansi/")) return "Editor Kwitansi";
  if (path.startsWith("/dashboard/wo/penyelesaian/")) return "WO Penyelesaian";
  if (path.startsWith("/dashboard/pekerjaan/")) return "Editor Pekerjaan RLO";
  if (path.startsWith("/app-mobile/form-pengujian/")) return "Form Pengujian";
  if (path.startsWith("/app-mobile/laporan/")) return "Form Laporan Mobile";
  if (path.startsWith("/app-mobile/rab/")) return "Editor RAB Mobile";
  if (path.startsWith("/app-mobile/invoice/")) return "Editor Invoice Mobile";
  if (path.startsWith("/app-mobile/maintenance-gardu/")) return "Maintenance Gardu Mobile";
  if (path.startsWith("/laporan/")) return "Preview Laporan";
  if (path.startsWith("/rab/")) return "Preview RAB";
  if (path.startsWith("/invoice/")) return "Preview Invoice";
  if (path.startsWith("/rekrutmen/")) return "Form Lamaran Kerja";
  return path;
}

function getPlatform(path) {
  if (path.startsWith("/app-mobile")) return "mobile";
  if (path.startsWith("/dashboard")) return "web";
  return "public";
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoStr(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// ── Mutable session state (set by hook) ────────────────────────────────────────
let _sid = null;
let _userId = null;
let _userRole = null;

export function setAnalyticsUser(userId, userRole) {
  _userId = userId || null;
  _userRole = userRole || null;
}

// ── Write helpers ──────────────────────────────────────────────────────────────
async function buildBase(eventType, eventName, path) {
  if (!_sid) _sid = initSession();
  const { browser, device } = getBrowserInfo();
  const geo = await getGeoInfo().catch(() => ({ city: null, country: null, region: null }));
  return {
    sessionId: _sid,
    userId: _userId,
    userRole: _userRole,
    eventType,
    eventName,
    path,
    pageName: getPageName(path),
    platform: getPlatform(path),
    browser,
    device,
    city: geo.city,
    country: geo.country,
    timestamp: serverTimestamp(),
    date: todayStr(),
    hour: new Date().getHours(),
  };
}

export async function logPageView(path, pageName, duration = null) {
  try {
    const base = await buildBase("page_view", "page_view", path);
    base.pageName = pageName; // override with pre-computed name
    base.duration = duration;
    await addDoc(collection(db, COLL), base);
  } catch (err) {
    // analytics should never break the app
    if (import.meta.env.DEV) console.warn("[analytics]", err.message);
  }
}

export async function logAction(eventName, metadata = {}) {
  try {
    const path = window.location.pathname;
    const base = await buildBase("click", eventName, path);
    base.metadata = metadata;
    base.duration = null;
    await addDoc(collection(db, COLL), base);
  } catch (err) {
    if (import.meta.env.DEV) console.warn("[analytics]", err.message);
  }
}

export async function logDownload(docType, format = "pdf") {
  await logAction(`download_${docType}_${format}`, { docType, format });
}

export async function logSearch(searchQuery, page) {
  if (!searchQuery?.trim()) return;
  await logAction("search", { query: searchQuery.trim(), page });
}

// ── Query / aggregation (superadmin only) ──────────────────────────────────────
async function fetchEvents(days, maxDocs = 2000) {
  const startDate = daysAgoStr(days - 1);
  const q = query(
    collection(db, COLL),
    where("date", ">=", startDate),
    orderBy("date", "desc"),
    limit(maxDocs)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}

export async function getStats(days = 7) {
  const events = await fetchEvents(days);
  const sessions = new Set(events.map(e => e.sessionId));
  const users    = new Set(events.filter(e => e.userId).map(e => e.userId));
  const pageViews = events.filter(e => e.eventType === "page_view").length;
  const actions   = events.filter(e => e.eventType !== "page_view").length;

  const cityCounts = {};
  events.forEach(e => { if (e.city) cityCounts[e.city] = (cityCounts[e.city] || 0) + 1; });
  const topCity = Object.entries(cityCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return { totalSessions: sessions.size, pageViews, actions, uniqueUsers: users.size, topCity };
}

export async function getTopPages(days = 7, maxItems = 10) {
  const events = await fetchEvents(days);
  const counts = {};
  events.filter(e => e.eventType === "page_view").forEach(e => {
    const key = e.pageName || e.path;
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxItems)
    .map(([pageName, views]) => ({ pageName, views }));
}

export async function getTopActions(days = 7, maxItems = 10) {
  const events = await fetchEvents(days);
  const counts = {};
  events.filter(e => e.eventType !== "page_view").forEach(e => {
    counts[e.eventName] = (counts[e.eventName] || 0) + 1;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxItems)
    .map(([eventName, count]) => ({ eventName, count }));
}

export async function getDailyTimeline(days = 7) {
  const events = await fetchEvents(days);
  const byDate = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    byDate[key] = { date: key, sessions: new Set(), pageViews: 0 };
  }
  events.forEach(e => {
    if (!byDate[e.date]) return;
    byDate[e.date].sessions.add(e.sessionId);
    if (e.eventType === "page_view") byDate[e.date].pageViews++;
  });
  return Object.values(byDate).map(d => ({
    date: d.date,
    sessions: d.sessions.size,
    pageViews: d.pageViews,
  }));
}

export async function getHourlyDistribution(days = 7) {
  const events = await fetchEvents(days);
  const byHour = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));
  events.filter(e => e.eventType === "page_view").forEach(e => {
    if (e.hour >= 0 && e.hour < 24) byHour[e.hour].count++;
  });
  return byHour;
}

export async function getDeviceBreakdown(days = 7) {
  const events = await fetchEvents(days);
  const seen = new Set();
  const counts = { mobile: 0, tablet: 0, desktop: 0 };
  events.forEach(e => {
    if (!seen.has(e.sessionId)) {
      seen.add(e.sessionId);
      if (e.device && counts[e.device] !== undefined) counts[e.device]++;
    }
  });
  return [
    { device: "Desktop", count: counts.desktop, fill: "#3b82f6" },
    { device: "Mobile",  count: counts.mobile,  fill: "#f59e0b" },
    { device: "Tablet",  count: counts.tablet,  fill: "#10b981" },
  ];
}

export async function getTopCities(days = 7, maxItems = 8) {
  const events = await fetchEvents(days);
  const seen = new Set();
  const counts = {};
  events.forEach(e => {
    if (e.city && !seen.has(e.sessionId)) {
      seen.add(e.sessionId);
      counts[e.city] = (counts[e.city] || 0) + 1;
    }
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxItems)
    .map(([city, sessions]) => ({ city, sessions }));
}

export async function getRecentEvents(maxItems = 50) {
  const q = query(
    collection(db, COLL),
    orderBy("timestamp", "desc"),
    limit(maxItems)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
