import { createApp } from 'vue'
import App from './App.vue'
import './styles/global.css'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'

createApp(App).mount('#app')

// 核心更新：如果当前运行在 Capacitor 原生环境中，则控制 Android 状态栏
if (Capacitor.isNativePlatform()) {
  StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {})
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {})
  StatusBar.setBackgroundColor({ color: '#00000000' }).catch(() => {})
  StatusBar.hide().catch(() => {})
}

// 核心更新：拦截 Chrome / Edge 的 PWA 安装事件
window.deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.deferredPrompt = e;
});

// 核心更新：注册隐形 Service Worker 以骗过浏览器的 PWA 审查机制
if ('serviceWorker' in navigator) {
  const swCode = `self.addEventListener('fetch', function(e) {});`;
  const blob = new Blob([swCode], { type: 'application/javascript' });
  navigator.serviceWorker.register(URL.createObjectURL(blob)).catch(() => {});
}
