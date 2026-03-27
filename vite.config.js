import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig(() => {
  const buildTarget = process.env.BUILD_TARGET || ''

  return {
    // 核心修改：
    // 1. GitHub Pages 构建时使用 /vesophone/
    // 2. 本地 / Capacitor 构建时使用 ./
    base: buildTarget === 'gh' ? '/vesophone/' : './',
    plugins: [
      vue(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true
        },
        manifest: {
          name: 'Veso Phone',
          short_name: 'Veso Phone',
          description: 'AI Phone Application',
          theme_color: '#f4f5f7',
          background_color: '#f4f5f7',
          display: 'fullscreen',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    }
  }
})
