import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: process.env.CAPACITOR_BUILD ? "./" : "/",

  optimizeDeps: {
    // Only scan the real entry point — avoid Android build artifacts
    entries: ["index.html"],
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
  ]
})