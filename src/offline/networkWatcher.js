import { Network } from "@capacitor/network";

let _online = navigator.onLine;
const listeners = new Set();

export function isOnline() { return _online; }

export function onNetworkChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notify(online) {
  _online = online;
  listeners.forEach(cb => cb(online));
}

// Capacitor native listener (Android/iOS)
Network.addListener("networkStatusChange", status => {
  notify(status.connected);
});

// Web fallback
window.addEventListener("online",  () => notify(true));
window.addEventListener("offline", () => notify(false));

// Sync initial status from Capacitor
Network.getStatus().then(s => notify(s.connected)).catch(() => {});
