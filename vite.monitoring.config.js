import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// Build terpisah untuk subdomain monitoring.pt-adytia.com
// Output ke dist-monitoring/ — dipasang ke Firebase Hosting target "monitoring".
// Bundle ini SENGAJA ramping: hanya import React + firebase/database + recharts,
// tidak menyeret tesseract/pdf/chart admin dari app utama.
export default defineConfig({
  base: "/",

  build: {
    outDir: "dist-monitoring",
    emptyOutDir: true,
    minify: false, // sama seperti vite.config.js — hindari esbuild OOM di Windows
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      input: resolve(__dirname, "monitoring.html"),
    },
  },

  optimizeDeps: {
    entries: ["monitoring.html"],
    exclude: ["pdfjs-dist"],
  },

  plugins: [
    react(),
    {
      // Dev-only: sajikan monitoring.html untuk SEMUA route (SPA fallback),
      // supaya `npm run dev:monitoring` + buka /kualitas-air tidak 404 ke app utama.
      name: "monitoring-html-fallback",
      apply: "serve",
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (
            req.method === "GET" &&
            req.headers.accept?.includes("text/html") &&
            !req.url.startsWith("/@") &&
            !req.url.startsWith("/node_modules") &&
            !req.url.includes(".")
          ) {
            req.url = "/monitoring.html";
          }
          next();
        });
      },
    },
  ],
});
