<template>
  <div :style="appBackgroundStyle" style="width:100%; height:100%; position:relative; display:flex; flex-direction:column;">
    
    <component :is="'style'" v-if="appearance.globalCss">{{ appearance.globalCss }}</component>

    <div class="status-bar">
      <span>{{ time }}</span>
      <span>{{ battery }}%</span>
    </div>

    <!-- 可横滑的桌面 -->
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
            <div class="app-icon">音乐</div>
            <div class="app-icon">番茄钟</div>
          </div>
        </div>
      </div>

      <!-- 第二页 -->
      <div class="screen">
        <div class="apps-grid" style="grid-template-columns: repeat(4, 1fr); height: auto;">
          <div class="app-icon" style="aspect-ratio: 1;" @click="activeApp = 'storage'">存储</div>
        </div>
      </div>
    </div>

    <!-- Dock -->
    <div class="dock glass">
      <div class="app-icon" @click="activeApp = 'api'" :style="getIconStyle('api')">
        <span v-if="!appearance.icons.api">API</span>
      </div>
      <div class="app-icon" @click="activeApp = 'appearance'" :style="getIconStyle('appearance')">
        <span v-if="!appearance.icons.appearance">外观</span>
      </div>
      <div class="app-icon">应用</div>
    </div>

    <!-- App 窗口层 -->
    <QQApp           :show="activeApp === 'qq'"           @close="activeApp = null" />
    <WorldbookApp    :show="activeApp === 'worldbook'"    @close="activeApp = null" />
    <ApiApp          :show="activeApp === 'api'"          @close="activeApp = null" />
    <AppearanceApp   :show="activeApp === 'appearance'"   @close="activeApp = null" />
    <StorageApp      :show="activeApp === 'storage'"      @close="activeApp = null" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useTime }       from '@/composables/useTime'
import { useProfile }    from '@/composables/useProfile'
import { useAppearance } from '@/composables/useAppearance'

import QQApp           from '@/apps/qq/QQApp.vue'
import WorldbookApp    from '@/apps/worldbook/WorldbookApp.vue'
import ApiApp          from '@/apps/api/ApiApp.vue'
import AppearanceApp   from '@/apps/appearance/AppearanceApp.vue'
import StorageApp      from '@/apps/storage/StorageApp.vue'

const { time, date } = useTime()
const { userProfile } = useProfile()
const { appearance } = useAppearance()

const activeApp = ref(null)
const battery   = ref(100)

const appBackgroundStyle = computed(() => {
  if (appearance.value.wallpaper) {
    return {
      backgroundImage: `url(${appearance.value.wallpaper})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    }
  }
  return { background: 'var(--bg-color)' }
})

const getIconStyle = (key) => {
  const url = appearance.value.icons[key]
  return url ? { backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundColor: 'transparent', border: 'none' } : {}
}

const getWidgetStyle = (key) => {
  const url = appearance.value.widgets[key]
  return url ? { backgroundImage: `url(${url})`, backgroundSize: 'cover' } : {}
}
</script>
