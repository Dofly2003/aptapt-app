import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// 🔴 OLD PROJECT
const oldApp = initializeApp({
  credential: cert("./webdashboardptapt-firebase-adminsdk-fbsvc-2eac9a1025.json")
}, "old");

// 🟢 NEW PROJECT
const newApp = initializeApp({
  credential: cert("./adytia-pt-firebase-adminsdk-fbsvc-c1d3e1bf74.json")
}, "new");


const oldDb = getFirestore(oldApp);
const newDb = getFirestore(newApp);

/* =========================
   🔥 COPY DOC + SUBCOLLECTION
========================= */
async function copyDocRecursive(oldRef, newRef) {
  const docSnap = await oldRef.get();

  if (!docSnap.exists) return;

  // ✅ copy document utama
  await newRef.set(docSnap.data());

  console.log("📄 Copied:", oldRef.path);

  // 🔥 ambil semua subcollection
  const subcollections = await oldRef.listCollections();

  for (const subCol of subcollections) {
    console.log("📁 Subcollection:", subCol.id);

    const subSnap = await subCol.get();

    for (const subDoc of subSnap.docs) {
      await copyDocRecursive(
        oldRef.collection(subCol.id).doc(subDoc.id),
        newRef.collection(subCol.id).doc(subDoc.id)
      );
    }
  }
}

/* =========================
   🔥 COPY COLLECTION
========================= */
async function migrateCollection(collectionName) {
  const snapshot = await oldDb.collection(collectionName).get();

  console.log(`\n🚀 Migrating collection: ${collectionName}`);

  for (const doc of snapshot.docs) {
    await copyDocRecursive(
      oldDb.collection(collectionName).doc(doc.id),
      newDb.collection(collectionName).doc(doc.id)
    );
  }

  console.log(`✅ Done collection: ${collectionName}`);
}

/* =========================
   🔥 MAIN MIGRATION (AUTO ALL)
========================= */
async function migrateAll() {
  try {
    const collections = await oldDb.listCollections();

    for (const col of collections) {
      await migrateCollection(col.id);
    }

    console.log("\n🎉 ALL DATA MIGRATED SUCCESSFULLY");

  } catch (err) {
    console.error("❌ ERROR:", err);
  }
}

migrateAll();