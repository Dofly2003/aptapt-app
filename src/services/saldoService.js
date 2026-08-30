import {
  doc,
  updateDoc,
  increment,
  addDoc,
  collection,
  serverTimestamp,
  getDocs,
  query,
  where
} from "firebase/firestore";
import { db } from "../firebase/config";

/* =========================
   TAMBAH SALDO (ATOMIC)
========================= */
export const tambahSaldo = async ({
  uid,
  jumlah,
  keterangan = "Topup saldo",
  admin
}) => {
  if (!uid) throw new Error("UID kosong");
  if (!jumlah || jumlah <= 0) throw new Error("Jumlah tidak valid");

  // 1. update saldo utama
  await updateDoc(doc(db, "users", uid), {
    saldo: increment(jumlah)
  });

  // 2. simpan history (audit)
  await addDoc(collection(db, "saldo_history"), {
    user_uid: uid,
    jenis: "saldo_masuk",
    jumlah: jumlah,
    keterangan,
    admin_uid: admin?.uid || null,
    admin_email: admin?.email || "unknown",
    created_at: serverTimestamp()
  });
};

/* =========================
   KURANG SALDO (ATOMIC)
========================= */
export const kurangSaldo = async ({
  uid,
  jumlah,
  keterangan = "Pengurangan saldo",
  admin
}) => {
  if (!uid) throw new Error("UID kosong");
  if (!jumlah || jumlah <= 0) throw new Error("Jumlah tidak valid");

  await updateDoc(doc(db, "users", uid), {
    saldo: increment(-jumlah)
  });

  await addDoc(collection(db, "saldo_history"), {
    user_uid: uid,
    jenis: "penyesuaian",
    jumlah: -jumlah,
    keterangan,
    admin_uid: admin?.uid || null,
    admin_email: admin?.email || "unknown",
    created_at: serverTimestamp()
  });
};

/* =========================
   SYNC SALDO (REKONSILIASI)
========================= */
export const syncSaldoUser = async (uid) => {
  const q = query(
    collection(db, "saldo_history"),
    where("user_uid", "==", uid)
  );

  const snap = await getDocs(q);

  let total = 0;

  snap.forEach((d) => {
    total += Number(d.data().jumlah || 0);
  });

  await updateDoc(doc(db, "users", uid), {
    saldo: total
  });

};

/* =========================
   SYNC SEMUA USER
========================= */
export const syncAllUsers = async () => {
  const usersSnap = await getDocs(collection(db, "users"));

  for (const u of usersSnap.docs) {
    const uid = u.id;

    const q = query(
      collection(db, "saldo_history"),
      where("user_uid", "==", uid)
    );

    const snap = await getDocs(q);

    let total = 0;

    snap.forEach((d) => {
      total += Number(d.data().jumlah || 0);
    });

    await updateDoc(doc(db, "users", uid), {
      saldo: total
    });

  }
};