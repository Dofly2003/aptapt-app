import { db } from "../firebase/config";
import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  serverTimestamp, query, orderBy, writeBatch, where,
} from "firebase/firestore";

export function formatRupiah(n) {
  if (!n && n !== 0) return "Rp 0";
  return "Rp " + Number(n).toLocaleString("id-ID");
}

const COL_JURNAL = "jurnal";
const COL_HUTANG = "hutangUsaha";
const COL_PIUTANG = "piutangUsaha";
const COL_ANGGARAN = "anggaran";
const COL_ARUS_KAS = "arusKas";

export async function getAllJurnal() {
  const snap = await getDocs(query(collection(db, COL_JURNAL), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function getJurnalById(id) {
  const snap = await getDoc(doc(db, COL_JURNAL, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
export async function createJurnal(data) {
  return addDoc(collection(db, COL_JURNAL), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
export async function updateJurnal(id, data) {
  return updateDoc(doc(db, COL_JURNAL, id), { ...data, updatedAt: serverTimestamp() });
}
export async function removeJurnal(id) {
  return deleteDoc(doc(db, COL_JURNAL, id));
}

export async function getAllHutang() {
  const snap = await getDocs(query(collection(db, COL_HUTANG), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function getHutangById(id) {
  const snap = await getDoc(doc(db, COL_HUTANG, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
export async function createHutang(data) {
  return addDoc(collection(db, COL_HUTANG), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
export async function updateHutang(id, data) {
  return updateDoc(doc(db, COL_HUTANG, id), { ...data, updatedAt: serverTimestamp() });
}
export async function removeHutang(id) {
  return deleteDoc(doc(db, COL_HUTANG, id));
}

export async function getAllPiutang() {
  const snap = await getDocs(query(collection(db, COL_PIUTANG), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function getPiutangById(id) {
  const snap = await getDoc(doc(db, COL_PIUTANG, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
export async function createPiutang(data) {
  return addDoc(collection(db, COL_PIUTANG), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
export async function updatePiutang(id, data) {
  return updateDoc(doc(db, COL_PIUTANG, id), { ...data, updatedAt: serverTimestamp() });
}
export async function removePiutang(id) {
  return deleteDoc(doc(db, COL_PIUTANG, id));
}

export async function getAllAnggaran() {
  const snap = await getDocs(query(collection(db, COL_ANGGARAN), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function getAnggaranById(id) {
  const snap = await getDoc(doc(db, COL_ANGGARAN, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
export async function createAnggaran(data) {
  return addDoc(collection(db, COL_ANGGARAN), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
export async function updateAnggaran(id, data) {
  return updateDoc(doc(db, COL_ANGGARAN, id), { ...data, updatedAt: serverTimestamp() });
}
export async function removeAnggaran(id) {
  return deleteDoc(doc(db, COL_ANGGARAN, id));
}

export async function getAllArusKas() {
  const snap = await getDocs(query(collection(db, COL_ARUS_KAS), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function getArusKasById(id) {
  const snap = await getDoc(doc(db, COL_ARUS_KAS, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
export async function createArusKas(data) {
  return addDoc(collection(db, COL_ARUS_KAS), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
export async function updateArusKas(id, data) {
  return updateDoc(doc(db, COL_ARUS_KAS, id), { ...data, updatedAt: serverTimestamp() });
}
export async function removeArusKas(id) {
  return deleteDoc(doc(db, COL_ARUS_KAS, id));
}

export async function importArusKasBatch(rows) {
  if (!rows.length) return { imported: 0, skipped: 0, saldoAwalSkipped: false };

  const saldoAwalRow = rows.find(r => r.kategori === "saldo_awal");
  const txRows = rows.filter(r => r.kategori !== "saldo_awal");
  if (!txRows.length) return { imported: 0, skipped: 0, saldoAwalSkipped: false };

  const dates = txRows.map(r => r.tanggal).sort();

  // Fetch existing records in import date range for dedup
  const rangeSnap = await getDocs(
    query(
      collection(db, COL_ARUS_KAS),
      where("tanggal", ">=", dates[0]),
      where("tanggal", "<=", dates[dates.length - 1])
    )
  );
  // Key hanya pakai 4 field — saldoSetelah sengaja tidak dipakai di key karena data lama
  // di Firestore tidak punya field itu, sehingga kunci tidak akan cocok dan duplikat lolos
  const dupKey = x => `${x.tanggal}|${x.masuk}|${x.keluar}|${x.keterangan}`;
  const existingKeys = new Set(rangeSnap.docs.map(d => dupKey(d.data())));

  // Skip saldo awal hanya jika ada overlap dalam range import yang sama.
  // Data bulan lain TIDAK menjadi alasan skip — tiap bulan butuh saldo awalnya sendiri.
  const saldoAwalSkipped = saldoAwalRow ? rangeSnap.docs.length > 0 : false;

  const toInsert = [
    ...(saldoAwalRow && !saldoAwalSkipped ? [saldoAwalRow] : []),
    ...txRows,
  ].filter(r => !existingKeys.has(dupKey(r)));

  const CHUNK = 499;
  for (let i = 0; i < toInsert.length; i += CHUNK) {
    const batch = writeBatch(db);
    toInsert.slice(i, i + CHUNK).forEach(row => {
      const ref = doc(collection(db, COL_ARUS_KAS));
      batch.set(ref, { ...row, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    });
    await batch.commit();
  }

  return { imported: toInsert.length, skipped: rows.length - toInsert.length, saldoAwalSkipped };
}

// Pre-check sebelum modal confirm — returns duplikat keys dan apakah saldo awal akan dilewati
export async function preCheckArusKasImport(rawRows, importYear) {
  if (!rawRows.length) return { dupKeys: new Set(), saldoWillSkip: false };

  const txRows = rawRows.map(r => {
    const [dd, mm] = r.tanggalRaw.split("/");
    return {
      tanggal: `${importYear}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`,
      masuk: r.masuk, keluar: r.keluar,
      keterangan: r.keterangan || `Transaksi ${r.jenis}`,
      saldoSetelah: r.saldoSetelah,
    };
  });

  const dates = txRows.map(r => r.tanggal).sort();
  const rangeSnap = await getDocs(
    query(
      collection(db, COL_ARUS_KAS),
      where("tanggal", ">=", dates[0]),
      where("tanggal", "<=", dates[dates.length - 1])
    )
  );
  const dupKey = x => `${x.tanggal}|${x.masuk}|${x.keluar}|${x.keterangan}`;
  const existingKeys = new Set(rangeSnap.docs.map(d => dupKey(d.data())));

  const dupKeys = new Set(
    txRows.filter(r => existingKeys.has(dupKey(r))).map(r => dupKey(r))
  );

  // Saldo awal hanya dilewati jika ada data overlap dalam range import yang sama
  const saldoWillSkip = rangeSnap.docs.length > 0;

  return { dupKeys, saldoWillSkip };
}

export async function deleteArusKasByMonth(year, month) {
  const m = String(month).padStart(2, "0");
  const nm = month === 12 ? 1 : month + 1;
  const ny = month === 12 ? year + 1 : year;
  const start = `${year}-${m}-01`;
  const end = `${ny}-${String(nm).padStart(2, "0")}-01`;

  const snap = await getDocs(
    query(collection(db, COL_ARUS_KAS), where("tanggal", ">=", start), where("tanggal", "<", end))
  );
  const CHUNK = 499;
  const docsToDelete = snap.docs;
  for (let i = 0; i < docsToDelete.length; i += CHUNK) {
    const batch = writeBatch(db);
    docsToDelete.slice(i, i + CHUNK).forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
  return docsToDelete.length;
}
