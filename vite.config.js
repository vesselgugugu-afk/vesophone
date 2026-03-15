import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  // 核心修改：添加 base 路径，对应你的 GitHub 仓库名
  base: '/vesophone/', 
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      manifest: {
        // 修改这里：name 是安装提示、启动画面（Splash Screen）上显示的全名
        name: 'Veso Phone',
        // 修改这里：short_name 是手机桌面图标下方显示的短名字（建议不要太长，否则会被手机系统省略号截断）
        short_name: 'Veso Phone',
        description: 'AI Phone Application',
        theme_color: '#f4f5f7',
        background_color: '#f4f5f7',
        display: 'standalone',
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
})
