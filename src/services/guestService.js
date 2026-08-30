import { db, firebaseConfig } from "../firebase/config";
import {
  collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc,
  addDoc, query, where, serverTimestamp, Timestamp, onSnapshot,
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const GUEST_DOMAIN = "guest.adytia-pt.web.app";

const secondaryApp =
  getApps().find((a) => a.name === "secondary") ||
  initializeApp(firebaseConfig, "secondary");
const secondaryAuth = getAuth(secondaryApp);

export const GUEST_WEB_MODULES = [
  { key: "rab",       label: "RAB / Penawaran" },
  { key: "instansi",  label: "Instansi" },
  { key: "pengujian", label: "Data Pengujian" },
  { key: "invoice",   label: "Invoice" },
  { key: "keuangan",  label: "Keuangan" },
  { key: "sdm",       label: "SDM / HR" },
  { key: "pengadaan", label: "Pengadaan" },
  { key: "inventori", label: "Inventori" },
  { key: "produksi",  label: "Produksi" },
  { key: "penjualan", label: "Penjualan & CRM" },
  { key: "proyek",    label: "Proyek" },
  { key: "aset",      label: "Aset & Maintenance" },
];

export const GUEST_MOBILE_MODULES = [
  { key: "pengujian", label: "Pengujian (Form)" },
  { key: "rab",       label: "RAB" },
  { key: "invoice",   label: "Invoice" },
  { key: "keuangan",  label: "Keuangan" },
  { key: "inventori", label: "Inventori" },
];

export const PERMISSION_LEVELS = [
  { value: "none",           label: "Tidak Ada" },
  { value: "read",           label: "Hanya Baca" },
  { value: "write",          label: "Edit Bebas" },
  { value: "write_approval", label: "Edit + Persetujuan" },
];

export const DEFAULT_PERMISSIONS = {
  web: Object.fromEntries(GUEST_WEB_MODULES.map((m) => [m.key, "none"])),
  mobile: Object.fromEntries(GUEST_MOBILE_MODULES.map((m) => [m.key, "none"])),
};

export function guestEmail(username) {
  return `${username}@${GUEST_DOMAIN}`;
}

export async function createGuestAccount({ username, password, displayName, expiresAt, note, permissions }) {
  const email = guestEmail(username);

  const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
  const uid = cred.user.uid;

  const resolvedPerms = permissions || DEFAULT_PERMISSIONS;
  const resolvedExpiry = expiresAt ? Timestamp.fromDate(new Date(expiresAt)) : null;

  // Simpan di users (untuk AuthContext — menghindari read guest_accounts saat login)
  await setDoc(doc(db, "users", uid), {
    name: displayName,
    username,
    email,
    role: "guest",
    disabled: false,
    createdAt: serverTimestamp(),
    guestPermissions: resolvedPerms,
    guestExpiresAt: resolvedExpiry,
    guestIsActive: true,
  });

  // Simpan di guest_accounts (untuk manajemen oleh superadmin)
  await setDoc(doc(db, "guest_accounts", uid), {
    uid,
    username,
    displayName,
    email,
    isActive: true,
    note: note || "",
    expiresAt: resolvedExpiry,
    createdAt: serverTimestamp(),
    permissions: resolvedPerms,
  });

  return uid;
}

export async function updateGuestAccount(uid, data) {
  const update = { ...data };
  if ("expiresAt" in update && typeof update.expiresAt === "string") {
    update.expiresAt = update.expiresAt
      ? Timestamp.fromDate(new Date(update.expiresAt))
      : null;
  }
  await updateDoc(doc(db, "guest_accounts", uid), update);

  // Sync fields yang relevan ke users doc (AuthContext membacanya saat login)
  const usersSync = {};
  if ("permissions" in update)  usersSync.guestPermissions = update.permissions;
  if ("expiresAt" in update)    usersSync.guestExpiresAt   = update.expiresAt;
  if ("isActive" in update) {
    usersSync.guestIsActive = update.isActive;
    usersSync.disabled      = !update.isActive;
  }
  if (Object.keys(usersSync).length > 0) {
    await updateDoc(doc(db, "users", uid), usersSync);
  }
}

export async function deleteGuestAccount(uid) {
  await deleteDoc(doc(db, "guest_accounts", uid));
  await updateDoc(doc(db, "users", uid), { disabled: true, role: "deleted_guest" });
}

export async function getGuestAccounts() {
  const snap = await getDocs(collection(db, "guest_accounts"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getGuestAccount(uid) {
  const snap = await getDoc(doc(db, "guest_accounts", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function submitForApproval({
  guestUid, guestUsername, module, targetCollection, docId,
  operation, proposedData, currentData,
}) {
  await addDoc(collection(db, "pending_approvals"), {
    guestUid,
    guestUsername,
    module,
    targetCollection,
    docId: docId || null,
    operation,
    proposedData,
    currentData: currentData || null,
    status: "pending",
    createdAt: serverTimestamp(),
    reviewedBy: null,
    reviewedAt: null,
    reviewNote: null,
  });
}

export function subscribeApprovals(status, callback) {
  const q = query(
    collection(db, "pending_approvals"),
    where("status", "==", status)
  );
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    items.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
    callback(items);
  });
}

export async function getApprovals(status = "pending") {
  const q = query(
    collection(db, "pending_approvals"),
    where("status", "==", status)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getMyApprovals(guestUid) {
  const q = query(
    collection(db, "pending_approvals"),
    where("guestUid", "==", guestUid)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function reviewApproval(approvalId, { approved, note, reviewedBy }) {
  const ref = doc(db, "pending_approvals", approvalId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Approval tidak ditemukan");

  const approval = snap.data();

  if (approval.status !== "pending") {
    throw new Error("Approval ini sudah diproses sebelumnya");
  }

  if (approved) {
    const { targetCollection, docId, operation, proposedData } = approval;

    const ALLOWED_COLLECTIONS = ["dokumen_keuangan", "pengujian"];
    if (!ALLOWED_COLLECTIONS.includes(targetCollection)) {
      throw new Error("Koleksi tidak diizinkan dalam approval");
    }
    const ALLOWED_OPERATIONS = ["create", "update", "delete"];
    if (!ALLOWED_OPERATIONS.includes(operation)) {
      throw new Error("Operasi tidak diizinkan");
    }

    // Hapus field berbahaya dari proposedData sebelum ditulis ke Firestore
    const BLOCKED_FIELDS = ["role", "disabled", "saldo", "guestPermissions", "guestExpiresAt", "guestIsActive"];
    const safeData = Object.fromEntries(
      Object.entries(proposedData || {}).filter(([k]) => !BLOCKED_FIELDS.includes(k))
    );

    if (operation === "create") {
      await addDoc(collection(db, targetCollection), safeData);
    } else if (operation === "update" && docId) {
      await updateDoc(doc(db, targetCollection, docId), safeData);
    } else if (operation === "delete" && docId) {
      await deleteDoc(doc(db, targetCollection, docId));
    }
  }

  await updateDoc(ref, {
    status: approved ? "approved" : "rejected",
    reviewedBy,
    reviewedAt: serverTimestamp(),
    reviewNote: note || null,
  });
}

export function isGuestExpired(guestData) {
  if (!guestData?.expiresAt) return false;
  const exp = guestData.expiresAt.toDate
    ? guestData.expiresAt.toDate()
    : new Date(guestData.expiresAt);
  return exp < new Date();
}
