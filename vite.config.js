import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: process.env.CAPACITOR_BUILD ? "./" : "/",

  optimizeDeps: {
    entries: ["index.html"],
    exclude: ["pdfjs-dist"],
  },

  build: {
    // Disable minification — avoids esbuild Go process OOM (VirtualAlloc errno=1455) on
    // Windows machines with low free virtual memory. Firebase Hosting serves brotli/gzip
    // anyway, so transfer size stays comparable. Re-enable once pagefile is enlarged.
    minify: false,
    sourcemap: false,
    chunkSizeWarningLimit: 600,
  },

  plugins: [
    react(),
    // VitePWA({
    //   registerType: 'autoUpdate',
    //   devOptions: { enabled: false },
    //   manifest: {
    //     name: 'PT Adytia App',
    //     short_name: 'Adytia',
    //     start_url: '/app-mobile',
    //     display: 'standalone',
    //     background_color: '#ffffff',
    //     theme_color: '#2563eb',
    //   }
    // })
  ],
})
