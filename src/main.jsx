import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from "./context/AuthContext"
import GlobalLoader from "./components/GlobalLoader";
import { LoadingProvider } from "./context/LoadingContext";

/* ======================
   OFFLINE INIT
====================== */
import { startCacheCleaner } from "./offline/cacheCleaner";
startCacheCleaner();

/* ======================
   CAPACITOR NATIVE INIT
====================== */
const isNative = !!(window.Capacitor?.isNativePlatform?.());

if (isNative) {
  Promise.all([
    import('@capacitor/status-bar'),
    import('@capacitor/app'),
  ]).then(([{ StatusBar, Style }, { App }]) => {
    StatusBar.setOverlaysWebView({ overlay: false });
    StatusBar.setBackgroundColor({ color: '#ffffff' });
    StatusBar.setStyle({ style: Style.Light });

    // Android back button: navigasi history web, keluar hanya kalau sudah di root
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });
  }).catch(() => {});
}

/* ======================
   SERVICE WORKER
====================== */

// Skip service worker when running inside Capacitor native app

if (!isNative && "serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");

      console.log("SW REGISTERED:", reg);

      if (reg.waiting) {
        reg.waiting.postMessage("SKIP_WAITING");
      }

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        console.log("SW controlling page now → reload");
        window.location.reload();
      });

    } catch (err) {
      console.log("SW ERROR:", err);
    }
  });
}

/* ======================
   RENDER APP
====================== */

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <LoadingProvider>
        <App />
        <GlobalLoader />
      </LoadingProvider>
    </AuthProvider>
  </StrictMode>
)