import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase/config";

/**
 * 🔥 MIGRATION USER ID
 * - Cocokkan berdasarkan userEmail
 * - Update userId agar sesuai UID login sekarang
 */
export const fixUserIdMigration = async (currentUser) => {
  try {
    if (!currentUser) {
      alert("User belum login!");
      return;
    }

    console.log("🚀 Mulai migration...");

    const snapshot = await getDocs(collection(db, "nidi_data"));

    let updated = 0;
    let skipped = 0;

    for (const d of snapshot.docs) {
      const data = d.data();

      // 🔥 hanya data milik user ini (berdasarkan email)
      if (data.userEmail === currentUser.email) {

        // kalau userId berbeda → update
        if (data.userId !== currentUser.uid) {
          await updateDoc(doc(db, "nidi_data", d.id), {
            userId: currentUser.uid
          });

          updated++;
        } else {
          skipped++;
        }
      }
    }

    console.log("🎯 SELESAI");
    console.log("Updated:", updated);
    console.log("Skipped:", skipped);

    alert(`Migration selesai!
Updated: ${updated}
Skipped: ${skipped}`);

  } catch (err) {
    console.error("❌ ERROR MIGRATION:", err);
    alert("Terjadi error, cek console");
  }
};