<template>
  <transition name="slide-up">
    <div v-if="show" class="dating-app-container">
      <header class="dating-header">
        <div style="display:flex; align-items:center; gap:12px;">
          <div class="close-icon-btn" @click="$emit('close')">
            <i class="fas fa-times"></i>
          </div>
          <h1 class="header-title">{{ headerTitle }}</h1>
        </div>
      </header>

      <div class="dating-main-content">
        <DiscoverTab
          v-if="activeTab === 'discover'"
          @open-swipe="showSwipeModal = true"
          @open-random="showRandomModal = true"
          @open-chat="handleOpenChat"
        />
        <ChatsTab v-if="activeTab === 'chats'" @open-chat="handleOpenChat" />
        <ProfileTab
          v-if="activeTab === 'profile'"
          @open-settings="showSettingsModal = true"
          @open-chat="handleOpenChat"
        />
      </div>

      <nav class="dating-bottom-nav">
        <div class="nav-item" :class="{ active: activeTab === 'discover' }" @click="switchTab('discover', '冷推')">
          <i class="fas fa-compass"></i><span>广场</span>
        </div>
        <div class="nav-item" :class="{ active: activeTab === 'chats' }" @click="switchTab('chats', '私聊')">
          <i class="fas fa-comment-dots"></i><span>私聊</span>
        </div>
        <div class="nav-item" :class="{ active: activeTab === 'profile' }" @click="switchTab('profile', '我的')">
          <i class="fas fa-user"></i><span>我的</span>
        </div>
      </nav>

      <SwipeModal :show="showSwipeModal" @close="showSwipeModal = false" @open-filter="showFilterModal = true" @start-chat="jumpToChat" />
      <FilterModal :show="showFilterModal" @close="showFilterModal = false" />
      <RandomSetupModal :show="showRandomModal" @close="showRandomModal = false" @start-chat="jumpToChat" />
      <DatingChatDetail :show="showChatDetail" :chatId="activeChatId" @close="showChatDetail = false" />
      <SettingsModal :show="showSettingsModal" @close="showSettingsModal = false" />

      <div class="elegant-toast-container">
        <transition-group name="toast-pop">
          <div class="elegant-toast-item" v-for="t in toasts" :key="t.id">
            <div class="toast-icon-wrap">
              <i class="fas fa-info" v-if="!t.isError"></i>
              <i class="fas fa-exclamation-triangle" v-else style="color: #ff3b30;"></i>
            </div>
            <div class="toast-text">{{ t.msg }}</div>
          </div>
        </transition-group>
      </div>
    </div>
  </transition>
</template>

<script setup>
/**
 * 冷推 App 外层容器
 *
 * 这次修复：
 * 1. 顶栏多出来一截的问题
 *    - 原因是内嵌 App 环境里重复吃了 safe-area-inset-top
 * 2. 这里逻辑不变，只保留布局修正
 */

import { ref, onMounted, onUnmounted } from 'vue'
import DiscoverTab from './tabs/DiscoverTab.vue'
import ChatsTab from './tabs/ChatsTab.vue'
import ProfileTab from './tabs/ProfileTab.vue'

import SwipeModal from './components/SwipeModal.vue'
import FilterModal from './components/FilterModal.vue'
import RandomSetupModal from './components/RandomSetupModal.vue'
import DatingChatDetail from './components/DatingChatDetail.vue'
import SettingsModal from './components/SettingsModal.vue'

import { useDatingPlayer } from '@/composables/useDatingPlayer'
import { useDatingPrefs } from '@/composables/useDatingPrefs'

defineProps({ show: Boolean })
const emit = defineEmits(['close'])

const activeTab = ref('discover')
const headerTitle = ref('冷推')

const showSwipeModal = ref(false)
const showFilterModal = ref(false)
const showRandomModal = ref(false)
const showSettingsModal = ref(false)
const showChatDetail = ref(false)
const activeChatId = ref(null)

const { loadPlayer } = useDatingPlayer()
const { loadPrefs } = useDatingPrefs()

const toasts = ref([])
let toastIdCounter = 0

const handleSysToast = (e) => {
  e.stopPropagation()
  const msg = typeof e.detail === 'string' ? e.detail : (e.detail?.text || '操作成功')
  const isError = msg.includes('失败') || msg.includes('异常') || msg.includes('错误')
  const id = toastIdCounter++
  toasts.value.push({ id, msg, isError })

  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, 3000)
}

onMounted(async () => {
  await loadPlayer()
  await loadPrefs()
  window.addEventListener('sys-toast', handleSysToast)
})

onUnmounted(() => {
  window.removeEventListener('sys-toast', handleSysToast)
})

const switchTab = (tabId, title) => {
  activeTab.value = tabId
  headerTitle.value = title
}

const handleOpenChat = (chatId) => {
  if (!chatId) return
  activeTab.value = 'chats'
  headerTitle.value = '私聊'
  activeChatId.value = chatId
  showChatDetail.value = true
}

const jumpToChat = (newChatId) => {
  showSwipeModal.value = false
  showRandomModal.value = false
  switchTab('chats', '私聊')
  setTimeout(() => {
    activeChatId.value = newChatId
    showChatDetail.value = true
  }, 300)
}
</script>

<style scoped>
.dating-app-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #f4f5f7;
  color: #1c1c1e;
  z-index: 500;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}

/**
 * 修复顶栏高出来一截：
 * 原来这里吃了 env(safe-area-inset-top)，但外层容器已经处理过安全区。
 * 所以这里改成固定 padding，避免重复向下顶。
 */
.dating-header {
  padding: 8px 16px 12px;
  background: #ffffff;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #e5e5ea;
  z-index: 10;
}

.header-title {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 1px;
  margin: 0;
}

.close-icon-btn {
  width: 30px;
  height: 30px;
  background: #f4f5f7;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 14px;
  cursor: pointer;
}

.close-icon-btn:active {
  background: #e5e5ea;
}

.dating-main-content {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 80px;
}

.dating-bottom-nav {
  position: absolute;
  bottom: 0;
  width: 100%;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-top: 1px solid #e5e5ea;
  display: flex;
  justify-content: space-around;
  padding: 12px 0 calc(12px + env(safe-area-inset-bottom));
  z-index: 100;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #c7c7cc;
  cursor: pointer;
  gap: 4px;
  transition: color 0.2s;
}

.nav-item.active {
  color: #14CCCC;
}

.nav-item i {
  font-size: 20px;
}

.nav-item span {
  font-size: 10px;
  font-weight: 600;
}

.elegant-toast-container {
  position: absolute;
  top: 70px;
  left: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  pointer-events: none;
  z-index: 999999;
}

.elegant-toast-item {
  background: rgba(30, 30, 30, 0.85);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 12px 20px 12px 14px;
  border-radius: 30px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  pointer-events: auto;
}

.toast-icon-wrap {
  width: 24px;
  height: 24px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #14CCCC;
  font-size: 10px;
}

.toast-text {
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.toast-pop-enter-active,
.toast-pop-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-pop-enter-from {
  opacity: 0;
  transform: translateY(-20px) scale(0.9);
}

.toast-pop-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}
</style>
