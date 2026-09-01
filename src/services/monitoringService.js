// CRUD device monitoring — disimpan di RTDB /monitoring/devices (db2).
// Data live/log sensor TIDAK ditulis dari sini (device tulis via ingest / DB secret).
import { ref, get, set, update, remove, onValue, push } from "firebase/database";
import { db2 } from "../firebase/config";

const DEVICES = "monitoring/devices";

export const DEVICE_TYPES = [
  { value: "panel-daya", label: "Panel Daya (listrik R-S-T)" },
  { value: "ketinggian", label: "Ketinggian / Level" },
  { value: "kualitas-air", label: "Kualitas Air (WQMS)" },
];

/** Realtime listener daftar device. cb menerima array [{id, ...}]. Return unsub. */
export function watchDevices(cb) {
  const r = ref(db2, DEVICES);
  return onValue(r, (snap) => {
    const val = snap.val() || {};
    cb(
      Object.entries(val)
        .map(([id, d]) => ({ id, ...d }))
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
    );
  });
}

export async function getDevice(id) {
  const snap = await get(ref(db2, `${DEVICES}/${id}`));
  return snap.exists() ? { id, ...snap.val() } : null;
}

/** Buat device baru. Return id. */
export async function createDevice(data) {
  const id = push(ref(db2, DEVICES)).key;
  const now = Date.now();
  await set(ref(db2, `${DEVICES}/${id}`), {
    name: data.name || "Device Baru",
    type: data.type || "panel-daya",
    location: data.location || "",
    dataPath: data.dataPath || "",
    active: data.active !== false,
    thresholds: data.thresholds || {},
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function updateDevice(id, patch) {
  await update(ref(db2, `${DEVICES}/${id}`), { ...patch, updatedAt: Date.now() });
}

export async function deleteDevice(id) {
  await remove(ref(db2, `${DEVICES}/${id}`));
}

/** Path data default untuk sebuah device (kalau field dataPath dikosongkan). */
export function defaultDataPath(type, id) {
  if (type === "ketinggian") return `monitoring/ketinggian/${id}`;
  if (type === "kualitas-air") return `monitoring/kualitas-air/${id}`;
  return `monitoring/panel-daya/${id}/log`;
}
