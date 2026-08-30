const RAW_KEY = import.meta.env.VITE_AKUN_ENCRYPT_KEY ?? "";

// Salt tetap per-aplikasi (bukan rahasia — hanya mencegah key reuse antar aplikasi).
// JANGAN ubah nilai ini setelah deployment — perubahan akan membuat semua data
// yang sudah terenkripsi tidak bisa didekripsi.
const APP_SALT = new Uint8Array([
  0x41, 0x64, 0x79, 0x74, 0x69, 0x61, 0x50, 0x54,
  0x32, 0x30, 0x32, 0x34, 0x53, 0x65, 0x63, 0x75,
]);

async function deriveKey() {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(RAW_KEY),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: APP_SALT,
      iterations: 100_000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptText(plaintext) {
  if (!plaintext) return "";
  const key = await deriveKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const cipherBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plaintext)
  );
  const combined = new Uint8Array([...iv, ...new Uint8Array(cipherBuf)]);
  return btoa(String.fromCharCode(...combined));
}

export async function decryptText(encrypted) {
  if (!encrypted) return "";
  try {
    const key = await deriveKey();
    const buf = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
    const iv = buf.slice(0, 12);
    const data = buf.slice(12);
    const decBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
    return new TextDecoder().decode(decBuf);
  } catch {
    // Fallback: data lama sebelum migrasi ke PBKDF2 dikembalikan apa adanya
    return encrypted;
  }
}
