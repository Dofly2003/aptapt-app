import { db } from "../firebase/config";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

const dataHarga = [
  { daya: 450, slo: 40000, nidi: 40000 },
  { daya: 900, slo: 60000, nidi: 40000 },
  { daya: 1300, slo: 120000, nidi: 40000 },
  { daya: 2200, slo: 135000, nidi: 40000 },
  { daya: 3500, slo: 135000, nidi: 40000 },
  { daya: 4400, slo: 155000, nidi: 40000 },
  { daya: 5500, slo: 200000, nidi: 40000 },
  { daya: 6600, slo: 270000, nidi: 50000 },
  { daya: 7700, slo: 335000, nidi: 50000 },
  { daya: 10600, slo: 335000, nidi: 50000 },
  { daya: 13200, slo: 400000, nidi: 50000 },
  { daya: 16500, slo: 700000, nidi: 50000 },
  { daya: 23000, slo: 850000, nidi: 50000 },
  { daya: 33000, slo: 1100000, nidi: 50000 },
  { daya: 41500, slo: 1135000, nidi: 100000 },
  { daya: 53000, slo: 1550000, nidi: 100000 },
  { daya: 66000, slo: 1700000, nidi: 100000 },
  { daya: 82500, slo: 1700000, nidi: 100000 },
  { daya: 105000, slo: 2100000, nidi: 100000 },
  { daya: 131000, slo: 2700000, nidi: 200000 },
  { daya: 147000, slo: 3000000, nidi: 200000 },
  { daya: 164000, slo: 3350000, nidi: 200000 },
  { daya: 197000, slo: 4000000, nidi: 200000 }
];

export const seedHargaDaya = async () => {
  try {
    for (const item of dataHarga) {

      await setDoc(
        doc(db, "harga_daya", String(item.daya)), // docId = daya
        {
          daya: item.daya,
          slo: item.slo,
          nidi: item.nidi,
          updated_at: serverTimestamp()
        }
      );

      console.log("Inserted:", item.daya);
    }

    console.log("✅ SELESAI INSERT SEMUA HARGA");
  } catch (err) {
    console.error("ERROR:", err);
  }
};