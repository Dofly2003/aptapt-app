import { db } from "../firebase/config";
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, runTransaction,
} from "firebase/firestore";

const COL = "dokumen_keuangan";

// ============ CRUD ============
export async function getAllDokumen({ type = null, status = null } = {}) {
  let q = collection(db, COL);
  const constraints = [];
  if (type) constraints.push(where("type", "==", type));
  if (status) constraints.push(where("status", "==", status));
  constraints.push(orderBy("createdAt", "desc"));
  q = constraints.length ? query(q, ...constraints) : q;
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getDokumen(id) {
  const snap = await getDoc(doc(db, COL, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createDokumen(data, userId) {
  const r = await addDoc(collection(db, COL), {
    ...data,
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  // Bump counter setelah berhasil save (kalau nomor sesuai pattern)
  if (data.type && data.tanggal) {
    bumpCounter(data.type, data.tanggal).catch(console.warn);
  }
  return r.id;
}

export async function updateDokumen(id, data) {
  await updateDoc(doc(db, COL, id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteDokumen(id) {
  await deleteDoc(doc(db, COL, id));
}

// ============ COUNTER ============
const ROMAN = ["", "I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];

function counterId(type, dateStr) {
  const d = new Date(dateStr || Date.now());
  return `${type}_${d.getFullYear()}`;
}

/** Read current counter (no increment). Returns next suggested number. */
export async function suggestNomor(type, tanggal) {
  const d = new Date(tanggal || Date.now());
  const cId = counterId(type, tanggal);
  const snap = await getDoc(doc(db, "counters", cId));
  const current = snap.exists() ? (snap.data().value || 0) : 0;
  const next = current + 1;
  const padded = String(next).padStart(3, "0");
  return `${padded}/APT/${ROMAN[d.getMonth() + 1]}/${d.getFullYear()}`;
}

export async function suggestNomorKwitansi(tanggal) {
  const d = new Date(tanggal || Date.now());
  const year = d.getFullYear();
  const cId = `kwitansi_${year}`;
  const snap = await getDoc(doc(db, "counters", cId));
  const current = snap.exists() ? (snap.data().value || 0) : 0;
  const seq = String(current + 1).padStart(3, "0");
  const roman = ROMAN[d.getMonth() + 1];
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `PT.APT/KWT/${seq}/${roman}/${dd}/${mm}/${year}`;
}

/** Atomically bump counter (called on save). Safe to call multiple times. */
async function bumpCounter(type, tanggal) {
  const cId = counterId(type, tanggal);
  const ref = doc(db, "counters", cId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists() ? (snap.data().value || 0) : 0;
    tx.set(ref, { value: current + 1, type, updatedAt: serverTimestamp() }, { merge: true });
  });
}

// ============ MARKUP (untuk auto-fill harga RAB baru dari master_harga) ============
export const MARKUP_PERCENT = 7;

/** Bulatkan harga setelah dikalikan markup ke kelipatan Rp 50 terdekat. */
export function applyMarkup(price, percent = MARKUP_PERCENT) {
  const raw = Number(price) || 0;
  const marked = raw * (1 + percent / 100);
  return Math.round(marked / 50) * 50;
}

// ============ HELPERS ============
export function formatRupiah(num) {
  const n = Number(num) || 0;
  return "Rp " + n.toLocaleString("id-ID");
}

export function formatRupiahPlain(num) {
  return (Number(num) || 0).toLocaleString("id-ID");
}

export function formatTanggalLengkap(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export function hitungTotal(items, ppnAktif, ppnPersen = 11) {
  const subtotal = (items || []).reduce(
    (s, it) => s + (Number(it.volume) || 0) * (Number(it.hargaSatuan) || 0), 0
  );
  const ppn = ppnAktif ? Math.round(subtotal * (ppnPersen / 100)) : 0;
  return { subtotal, ppn, grandTotal: subtotal + ppn };
}

export function newItem() {
  return {
    id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    nama: "", satuan: "pcs", volume: 1, hargaSatuan: 0,
  };
}

export function newGroup(nama = "Pekerjaan Baru") {
  return {
    id: `grp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    nama,
    items: [newItem()],
  };
}

export function hitungSubtotalGroup(items) {
  return (items || []).reduce(
    (s, it) => s + (Number(it.volume) || 0) * (Number(it.hargaSatuan) || 0), 0
  );
}

export function hitungTotalGroups(groups, ppnAktif, ppnPersen = 11) {
  const subtotal = (groups || []).reduce(
    (t, grp) => t + hitungSubtotalGroup(grp.items), 0
  );
  const ppn = ppnAktif ? Math.round(subtotal * (ppnPersen / 100)) : 0;
  return { subtotal, ppn, grandTotal: subtotal + ppn };
}

// Extracts all items from a doc regardless of format (groups or legacy items array)
export function getDocItems(doc) {
  if (doc?.groups?.length) return doc.groups.flatMap(g => g.items || []);
  return doc?.items || [];
}

// Compute totals from a doc in either format
export function hitungTotalFromDoc(doc, ppnPersen = 11) {
  const ppnAktif = doc?.ppnAktif !== false;
  return hitungTotal(getDocItems(doc), ppnAktif, ppnPersen);
}

export const SATUAN_OPTIONS = [
  "pcs", "Pcs", "m", "m²", "m³", "kg", "ltr", "set", "unit", "pack", "lot", "ls", "btg", "rol",
];

export const DEFAULT_CLOSING = {
  rab: "Demikian surat penawaran ini kami sampaikan. Besar harapan kami agar penawaran ini dapat diterima. Atas perhatian dan kepercayaan Bapak/Ibu, kami mengucapkan terima kasih.",
  invoice: "Mohon pembayaran dapat diselesaikan paling lambat pada tanggal jatuh tempo. Terima kasih atas kerjasamanya.",
  kwitansi: "",
};

export const DEFAULT_PEMBUKAAN =
  "Dengan hormat,\n\nBersama surat ini kami mengajukan penawaran harga untuk pekerjaan sebagaimana tersebut pada perihal di atas. Adapun rincian biaya pekerjaan adalah sebagai berikut:";

export const DEFAULT_MASA_BERLAKU = "7 (tujuh) hari sejak tanggal surat ini";

/** Mengubah angka menjadi terbilang Bahasa Indonesia */
export function terbilang(num) {
  const ones = [
    '', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan',
    'Sepuluh', 'Sebelas', 'Dua Belas', 'Tiga Belas', 'Empat Belas', 'Lima Belas',
    'Enam Belas', 'Tujuh Belas', 'Delapan Belas', 'Sembilan Belas',
  ];
  const tens = ['', '', 'Dua Puluh', 'Tiga Puluh', 'Empat Puluh', 'Lima Puluh',
    'Enam Puluh', 'Tujuh Puluh', 'Delapan Puluh', 'Sembilan Puluh'];

  function say(n) {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  }
  function sayH(n) {
    if (n < 100) return say(n);
    const h = Math.floor(n / 100), r = n % 100;
    return (h === 1 ? 'Seratus' : ones[h] + ' Ratus') + (r ? ' ' + say(r) : '');
  }
  function sayK(n) {
    if (n < 1000) return sayH(n);
    const k = Math.floor(n / 1000), r = n % 1000;
    return (k === 1 ? 'Seribu' : sayH(k) + ' Ribu') + (r ? ' ' + sayH(r) : '');
  }
  function sayM(n) {
    if (n < 1e6) return sayK(n);
    const m = Math.floor(n / 1e6), r = n % 1e6;
    return sayH(m) + ' Juta' + (r ? ' ' + sayK(r) : '');
  }
  function sayB(n) {
    if (n < 1e9) return sayM(n);
    const b = Math.floor(n / 1e9), r = n % 1e9;
    return sayH(b) + ' Miliar' + (r ? ' ' + sayM(r) : '');
  }

  const n = Math.round(Number(num) || 0);
  if (n === 0) return 'Nol Rupiah';
  return sayB(n).trim() + ' Rupiah';
}