import { db } from "../firebase/config";
import {
  doc, getDoc, setDoc, collection,
  query, where, orderBy, limit, getDocs,
  runTransaction, serverTimestamp,
} from "firebase/firestore";

export const KASBON_SALDO = "kasbon_saldo";
export const KASBON_TX    = "kasbon_transactions";

export const KATEGORI_EXPENSE = [
  { value: "makan",     label: "Makan & Minum",   emoji: "🍽️" },
  { value: "transport", label: "Transport",        emoji: "🚗" },
  { value: "lainnya",   label: "Lainnya",          emoji: "📋" },
];

export function formatRp(n) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", minimumFractionDigits: 0,
  }).format(n ?? 0);
}

export function todayStr() {
  return new Date().toISOString().split("T")[0];
}

// ─── READ ───────────────────────────────────────────────────────────────────

export async function getSaldo(userId) {
  const snap = await getDoc(doc(db, KASBON_SALDO, userId));
  return snap.exists() ? snap.data() : { saldo: 0, hutang: 0 };
}

export async function getAllSaldo() {
  const snap = await getDocs(collection(db, KASBON_SALDO));
  return snap.docs.map(d => ({ userId: d.id, ...d.data() }));
}

export async function getTransactions(userId, maxCount = 80) {
  const q = query(
    collection(db, KASBON_TX),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(maxCount),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getAllTransactions(maxCount = 150) {
  const q = query(
    collection(db, KASBON_TX),
    orderBy("createdAt", "desc"),
    limit(maxCount),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ─── WRITE ──────────────────────────────────────────────────────────────────

/**
 * Finance/superadmin memberikan uang ke user.
 * Jika user punya hutang → hutang dilunasi dulu, sisa masuk saldo.
 */
export async function topUp({ userId, userName, jumlah, keterangan, operator }) {
  await runTransaction(db, async (tx) => {
    const saldoRef = doc(db, KASBON_SALDO, userId);
    const snap     = await tx.get(saldoRef);
    const cur      = snap.exists() ? snap.data() : { saldo: 0, hutang: 0 };

    let saldo  = cur.saldo  ?? 0;
    let hutang = cur.hutang ?? 0;

    // Lunasi hutang dulu
    let reimburse = 0;
    if (hutang > 0) {
      reimburse = Math.min(jumlah, hutang);
      hutang   -= reimburse;
      saldo    += jumlah - reimburse;
    } else {
      saldo += jumlah;
    }

    tx.set(saldoRef, { userId, userName, saldo, hutang, updatedAt: serverTimestamp() });

    tx.set(doc(collection(db, KASBON_TX)), {
      userId,
      userName,
      type:         "topup",
      kategori:     reimburse > 0 ? "topup+reimburse" : "topup",
      jumlah,
      reimburseAmount: reimburse,
      saldoBefore:  cur.saldo  ?? 0,
      hutangBefore: cur.hutang ?? 0,
      saldoAfter:   saldo,
      hutangAfter:  hutang,
      keterangan:   keterangan || "",
      buktiUrl:     null,
      operatorId:   operator.uid,
      operatorName: operator.displayName || operator.name || operator.email || "",
      tanggal:      todayStr(),
      createdAt:    serverTimestamp(),
    });
  });
}

/**
 * User mencatat pengeluaran.
 * Jika saldo cukup → kurangi saldo. Jika tidak → saldo 0 + sisanya jadi hutang perusahaan.
 */
export async function addExpense({ userId, userName, jumlah, kategori, keterangan, buktiUrl, operator }) {
  await runTransaction(db, async (tx) => {
    const saldoRef = doc(db, KASBON_SALDO, userId);
    const snap     = await tx.get(saldoRef);
    const cur      = snap.exists() ? snap.data() : { saldo: 0, hutang: 0 };

    let saldo  = cur.saldo  ?? 0;
    let hutang = cur.hutang ?? 0;

    if (saldo >= jumlah) {
      saldo -= jumlah;
    } else {
      hutang += jumlah - saldo;
      saldo   = 0;
    }

    tx.set(saldoRef, { userId, userName, saldo, hutang, updatedAt: serverTimestamp() });

    tx.set(doc(collection(db, KASBON_TX)), {
      userId,
      userName,
      type:         "expense",
      kategori,
      jumlah,
      reimburseAmount: 0,
      saldoBefore:  cur.saldo  ?? 0,
      hutangBefore: cur.hutang ?? 0,
      saldoAfter:   saldo,
      hutangAfter:  hutang,
      keterangan:   keterangan || "",
      buktiUrl:     buktiUrl  || null,
      operatorId:   operator.uid,
      operatorName: operator.displayName || operator.name || operator.email || "",
      tanggal:      todayStr(),
      createdAt:    serverTimestamp(),
    });
  });
}
