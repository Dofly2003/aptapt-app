import { db } from "../firebase/config";
import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  serverTimestamp, query, where,
} from "firebase/firestore";

const COL = "jadwalTim";

export async function getJadwalByRange(startDate, endDate) {
  const snap = await getDocs(
    query(
      collection(db, COL),
      where("tanggal", ">=", startDate),
      where("tanggal", "<=", endDate),
    )
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createJadwal(data) {
  return addDoc(collection(db, COL), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateJadwal(id, data) {
  return updateDoc(doc(db, COL, id), { ...data, updatedAt: serverTimestamp() });
}

export async function removeJadwal(id) {
  return deleteDoc(doc(db, COL, id));
}
