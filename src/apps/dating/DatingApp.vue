<template>
  <transition name="slide-up">
    <div v-if="show" class="dating-app-container">
      
      <!-- 修正 Header Padding，删除无用的 iOS 条 -->
      <header class="dating-header">
        <div style="display:flex; align-items:center; gap:12px;">
          <div class="close-icon-btn" @click="$emit('close')">
            <i class="fas fa-times"></i>
          </div>
          <h1 class="header-title">{{ headerTitle }}</h1>
        </div>
        <i class="fas fa-bell header-icon"></i>
      </header>

      <div class="dating-main-content">
        <DiscoverTab v-if="activeTab === 'discover'" @open-swipe="showSwipeModal = true" @open-random="showRandomModal = true" />
        <ChatsTab v-if="activeTab === 'chats'" @open-chat="handleOpenChat" />
        <ProfileTab v-if="activeTab === 'profile'" @open-settings="showSettingsModal = true" />
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
      
    </div>
  </transition>
</template>

<script setup>
import { ref, onMounted } from 'vue'
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

const props = defineProps({ show: Boolean })
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

onMounted(async () => {
  await loadPlayer()
  await loadPrefs()
})

const switchTab = (tabId, title) => {
  activeTab.value = tabId
  headerTitle.value = title
}

const handleOpenChat = (chatId) => {
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
.dating-app-container { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-color: #f4f5f7; color: #1c1c1e; z-index: 500; display: flex; flex-direction: column; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
.slide-up-enter-active, .slide-up-leave-active { transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(100%); }

/* 修复了顶部留白过大的问题 */
.dating-header { padding: calc(env(safe-area-inset-top) + 8px) 16px 12px; background: #ffffff; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e5e5ea; z-index: 10; }
.header-title { font-size: 18px; font-weight: 700; letter-spacing: 1px; margin: 0; }
.header-icon { color: #1c1c1e; font-size: 18px; cursor: pointer; }
.close-icon-btn { width: 30px; height: 30px; background: #f4f5f7; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-size: 14px; cursor: pointer; }
.close-icon-btn:active { background: #e5e5ea; }

.dating-main-content { flex: 1; overflow-y: auto; padding-bottom: 80px; }
.dating-bottom-nav { position: absolute; bottom: 0; width: 100%; background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border-top: 1px solid #e5e5ea; display: flex; justify-content: space-around; padding: 12px 0 calc(12px + env(safe-area-inset-bottom)); z-index: 100; }
.nav-item { display: flex; flex-direction: column; align-items: center; color: #c7c7cc; cursor: pointer; gap: 4px; transition: color 0.2s; }
.nav-item.active { color: #14CCCC; }
.nav-item i { font-size: 20px; }
.nav-item span { font-size: 10px; font-weight: 600; }
</style>
