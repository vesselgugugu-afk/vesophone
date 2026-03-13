<template>
  <div :style="appBackgroundStyle" style="width:100%; height:100%; position:relative; display:flex; flex-direction:column; overflow:hidden;">
    
    <component :is="'style'" v-if="appearance.globalCss">{{ appearance.globalCss }}</component>

    <!-- 拟真全局系统通知 (Toast) 保持悬浮 -->
    <transition name="slide-down-toast">
      <div v-if="sysToast" class="sys-toast glass">
        {{ sysToast }}
      </div>
    </transition>

    <!-- 核心修复 1：实体系统状态栏（不使用 absolute），它会把下面的内容自然往下挤 -->
    <div class="system-status-bar">
      <div class="status-left">
        <span class="status-time">{{ time }}</span>
      </div>
      
      <div class="status-center">
        <MiniCapsule @expand="activeApp = 'music'" />
      </div>

      <div class="status-right">
        <i class="fas fa-signal" style="font-size: 10px; margin-right: 4px;"></i>
        <i class="fas fa-wifi" style="font-size: 10px; margin-right: 6px;"></i>
        <div class="battery-wrapper">
          <div class="battery-body">
            <div class="battery-level" :style="{ width: battery + '%', backgroundColor: isCharging ? '#1dd1a1' : (battery <= 20 ? '#ff5252' : '#000') }"></div>
          </div>
          <div class="battery-cap"></div>
        </div>
        <i v-if="isCharging" class="fas fa-bolt" style="font-size: 8px; color: #1dd1a1; position: absolute; right: 28px;"></i>
      </div>
    </div>

    <!-- 核心修复 2：独立的工作区（flex: 1），所有 App 都在这里面，绝不会越过顶栏 -->
    <div class="workspace-container">
      
      <div class="screens-wrapper">
        <div class="screen">
          <div class="capsule-widget glass">
            <div class="capsule-diy-img" :style="getWidgetStyle('capsule')">
              <span v-if="!appearance.widgets.capsule">IMG</span>
            </div>
            <div class="capsule-time">{{ time }}</div>
            <div class="capsule-info"><div>{{ date }}</div><div>晴</div></div>
          </div>

          <div class="ins-card glass">
            <div class="ins-bg"></div>
            <div class="ins-avatar" :style="userProfile.avatar ? `background-image: url(${userProfile.avatar})` : ''"></div>
            <div class="ins-content">
              <div class="ins-name">{{ userProfile.name }}</div>
              <div class="ins-sign">{{ userProfile.bio }}</div>
            </div>
          </div>

          <div class="grid-section">
            <div class="apps-grid">
              <div class="app-icon" @click="activeApp = 'qq'" :style="getIconStyle('qq')">
                <span v-if="!appearance.icons.qq">QQ</span>
              </div>
              <div class="app-icon" @click="activeApp = 'worldbook'" :style="getIconStyle('worldbook')">
                <span v-if="!appearance.icons.worldbook">世界书</span>
              </div>
              <div class="app-icon" @click="activeApp = 'api'" :style="getIconStyle('api')">
                <span v-if="!appearance.icons.api">API</span>
              </div>
              <div class="app-icon" @click="activeApp = 'appearance'" :style="getIconStyle('appearance')">
                <span v-if="!appearance.icons.appearance">外观</span>
              </div>
            </div>
            <div class="custom-card glass" :style="getWidgetStyle('customCard')">
              <template v-if="!appearance.widgets.customCard">
                <div class="custom-card-title">每日记录</div>
                <div class="custom-card-desc">设计不只是外观和感觉，设计是它如何运作。</div>
              </template>
            </div>
          </div>

          <div class="grid-section">
            <div class="rect-cards-wrapper">
              <div class="rect-card glass" :style="getWidgetStyle('rectCardHealth')">
                <template v-if="!appearance.widgets.rectCardHealth">
                  <div class="rect-title">健康</div><div class="rect-sub">6,432 步</div>
                </template>
              </div>
              <div class="rect-card glass" :style="getWidgetStyle('rectCardFinance')">
                <template v-if="!appearance.widgets.rectCardFinance">
                  <div class="rect-title">财务</div><div class="rect-sub">预算正常</div>
                </template>
              </div>
            </div>
            <div class="apps-grid">
              <div class="app-icon">待办</div>
              <div class="app-icon">单词</div>
              <div class="app-icon" @click="activeApp = 'music'" :style="getIconStyle('music')">
                <span v-if="!appearance?.icons?.music">音乐</span>
              </div>
              <div class="app-icon">番茄钟</div>
            </div>
          </div>
        </div>

        <div class="screen">
          <div class="apps-grid" style="grid-template-columns: repeat(4, 1fr); height: auto;">
            <div class="app-icon" style="aspect-ratio: 1;" @click="activeApp = 'storage'">存储</div>
            
            <!-- 新增：时光酒馆 (线下模式记录) -->
            <div class="app-icon" style="aspect-ratio: 1; background: #f3e5f5; color: #9c27b0; display:flex; flex-direction:column; justify-content:center; align-items:center; font-size:12px; font-weight:600; border-radius:18px; box-shadow:0 4px 10px rgba(0,0,0,0.05);" @click="activeApp = 'offline'">
              <i class="fas fa-wine-glass-alt" style="font-size:24px; margin-bottom:6px;"></i>
              时光酒馆
            </div>

          </div>
        </div>
      </div>

      <div class="dock glass">
        <div class="app-icon" @click="activeApp = 'api'" :style="getIconStyle('api')">
          <span v-if="!appearance.icons.api">API</span>
        </div>
        <div class="app-icon" @click="activeApp = 'appearance'" :style="getIconStyle('appearance')">
          <span v-if="!appearance.icons.appearance">外观</span>
        </div>
        <div class="app-icon">应用</div>
      </div>

      <QQApp           :show="activeApp === 'qq'"           @close="activeApp = null" />
      <WorldbookApp    :show="activeApp === 'worldbook'"    @close="activeApp = null" />
      <ApiApp          :show="activeApp === 'api'"          @close="activeApp = null" />
      <AppearanceApp   :show="activeApp === 'appearance'"   @close="activeApp = null" />
      <StorageApp      :show="activeApp === 'storage'"      @close="activeApp = null" />
      <MusicApp        :show="activeApp === 'music'"        @close="activeApp = null" />
      <OfflineApp      :show="activeApp === 'offline'"      @close="activeApp = null" />
      
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTime }       from '@/composables/useTime'
import { useProfile }    from '@/composables/useProfile'
import { useAppearance } from '@/composables/useAppearance'

import QQApp           from '@/apps/qq/QQApp.vue'
import WorldbookApp    from '@/apps/worldbook/WorldbookApp.vue'
import ApiApp          from '@/apps/api/ApiApp.vue'
import AppearanceApp   from '@/apps/appearance/AppearanceApp.vue'
import StorageApp      from '@/apps/storage/StorageApp.vue'
import MusicApp        from '@/apps/music/MusicApp.vue'
import MiniCapsule     from '@/apps/music/components/MiniCapsule.vue' 
import OfflineApp      from '@/apps/offline/OfflineApp.vue'

const { time, date } = useTime()
const { userProfile } = useProfile()
const { appearance } = useAppearance()

const activeApp = ref(null)

const battery = ref(100)
const isCharging = ref(false)
const sysToast = ref(null)
let toastTimer = null

const showSysToast = (msg) => {
  sysToast.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { sysToast.value = null }, 3500)
}

onMounted(async () => {
  window.addEventListener('sys-toast', (e) => {
    showSysToast(e.detail)
  })

  // 接收从聊天框抛出的开启线下见面事件
  window.addEventListener('open-offline-meeting', (e) => {
    activeApp.value = 'offline'
  })

  if ('getBattery' in navigator) {
    try {
      const bm = await navigator.getBattery()
      
      const updateBatteryInfo = () => {
        const oldLevel = battery.value
        const newLevel = Math.round(bm.level * 100)
        battery.value = newLevel
        isCharging.value = bm.charging

        if (newLevel === 100 && oldLevel < 100) showSysToast('电量已充满。')
        if (newLevel <= 40 && oldLevel > 40 && !bm.charging) showSysToast('电量剩余 40%，请注意充电。')
      }

      const updateChargingInfo = () => {
        isCharging.value = bm.charging
        if (bm.charging) showSysToast(`开始充电，当前电量 ${battery.value}%`)
      }

      battery.value = Math.round(bm.level * 100)
      isCharging.value = bm.charging

      bm.addEventListener('levelchange', updateBatteryInfo)
      bm.addEventListener('chargingchange', updateChargingInfo)
    } catch (e) {}
  }
})

const appBackgroundStyle = computed(() => {
  if (appearance.value.wallpaper) {
    return { backgroundImage: `url(${appearance.value.wallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center' }
  }
  return { background: 'var(--bg-color)' }
})

const getIconStyle = (key) => {
  const url = appearance.value?.icons?.[key]
  return url ? { backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundColor: 'transparent', border: 'none' } : {}
}

const getWidgetStyle = (key) => {
  const url = appearance.value?.widgets?.[key]
  return url ? { backgroundImage: `url(${url})`, backgroundSize: 'cover' } : {}
}
</script>

<style scoped>
.system-status-bar {
  position: relative;
  flex-shrink: 0;
  height: calc(env(safe-area-inset-top, 30px) + 15px);
  min-height: 45px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 25px;
  z-index: 999999;
  background: transparent;
}

.workspace-container {
  flex: 1;
  position: relative;
  width: 100%;
  overflow: hidden;
}

.status-left {
  font-size: 14px;
  font-weight: 700;
  color: #333;
  text-shadow: 0 1px 3px rgba(255,255,255,0.5);
}

.status-center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000000;
}

.status-right {
  display: flex;
  align-items: center;
  color: #333;
  text-shadow: 0 1px 3px rgba(255,255,255,0.5);
  position: relative;
}

.battery-wrapper {
  display: flex;
  align-items: center;
}
.battery-body {
  width: 22px;
  height: 11px;
  border: 1px solid rgba(0,0,0,0.4);
  border-radius: 4px;
  padding: 1px;
  box-sizing: border-box;
}
.battery-level {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s, background-color 0.3s;
}
.battery-cap {
  width: 2px;
  height: 4px;
  background: rgba(0,0,0,0.4);
  border-radius: 0 2px 2px 0;
}

.sys-toast {
  position: absolute;
  top: 10px;
  left: 20px;
  right: 20px;
  padding: 15px 20px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
  text-align: center;
  z-index: 999998;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.slide-down-toast-enter-active,
.slide-down-toast-leave-active { transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-down-toast-enter-from,
.slide-down-toast-leave-to { transform: translateY(-20px) scale(0.95); opacity: 0; }
</style>
