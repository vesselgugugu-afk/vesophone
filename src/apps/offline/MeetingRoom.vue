<template>
  <div class="meeting-room-container" :style="bgStyle">
    <div class="bg-overlay"></div>

    <!-- 顶部状态栏 -->
    <div class="room-header">
      <div class="header-btn" @click="handleExitClick">
        <i class="fas fa-sign-out-alt"></i> 结束见面
      </div>
      <div class="room-title">与 {{ session.chatTitle }} 的见面</div>
      <div class="header-btn" @click="triggerBgUpload">
        <i class="fas fa-image"></i> 背景
      </div>
      <input type="file" ref="bgUploader" accept="image/*" style="display:none" @change="onBgUploaded" />
    </div>

    <!-- 卡片展示区 -->
    <div class="card-area" ref="scrollBox">
      <div style="height: 20px;"></div>
      
      <div v-if="activeOfflineMessages.length === 0" class="empty-state">
        环境已加载，请主动开启互动。
      </div>

      <MeetingCard 
        v-for="msg in activeOfflineMessages" 
        :key="msg.id" 
        :msg="msg"
        :name="msg.role === 'user' ? userProfile.name : session.chatTitle"
        :avatar="msg.role === 'user' ? userProfile.avatar : charAvatar"
      />
      
      <!-- AI 等待状态 -->
      <MeetingCard 
        v-if="isWaiting"
        :msg="{ role: 'ai', status: 'waiting', floor: activeOfflineMessages.length + 1, timestamp: Date.now() }"
        :name="session.chatTitle"
        :avatar="charAvatar"
      />

      <div style="height: 20px;"></div>
    </div>

    <!-- 底部输入框 -->
    <div class="room-footer glass">
      <div class="footer-btn" @click="showQuickConfig = true">
        <i class="fas fa-sliders-h"></i>
      </div>
      <input type="text" class="room-input" v-model="inputText" @keyup.enter="handleSend" placeholder="描述你的动作或说话内容..." />
      <div class="footer-send-btn" :class="{ 'active': inputText.trim() }" @click="handleSend">
        <i class="fas fa-paper-plane"></i>
      </div>
    </div>

    <QuickConfigBar 
      :show="showQuickConfig" 
      :config="session.config" 
      @close="showQuickConfig = false"
      @save="$emit('update-config', $event)"
    />

  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import { useProfile } from '@/composables/useProfile'
import { useCharacters } from '@/composables/useCharacters'
import MeetingCard from './components/MeetingCard.vue'
import QuickConfigBar from './components/QuickConfigBar.vue'

const props = defineProps({
  session: Object,
  activeOfflineMessages: Array
})

const emit = defineEmits(['exit-request', 'update-config', 'update-bg', 'send-message'])

const { userProfile } = useProfile()
const { getCharById } = useCharacters()

const inputText = ref('')
const scrollBox = ref(null)
const bgUploader = ref(null)
const showQuickConfig = ref(false)
const isWaiting = ref(false) // 阶段三接入 API 会用到

const charAvatar = computed(() => {
  const char = getCharById(props.session.chatId)
  return char ? char.avatar : ''
})

const bgStyle = computed(() => {
  if (props.session.bgImage) {
    return { backgroundImage: `url(${props.session.bgImage})` }
  }
  return { background: '#2c3e50' }
})

const scrollToBottom = () => {
  nextTick(() => {
    if (scrollBox.value) scrollBox.value.scrollTop = scrollBox.value.scrollHeight
  })
}

watch(() => props.activeOfflineMessages.length, scrollToBottom)

const handleSend = () => {
  if (!inputText.value.trim()) return
  emit('send-message', inputText.value)
  inputText.value = ''
  scrollToBottom()
}

const triggerBgUpload = () => {
  bgUploader.value.click()
}

const onBgUploaded = (e) => {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    emit('update-bg', ev.target.result)
  }
  reader.readAsDataURL(file)
}

const handleExitClick = () => {
  emit('exit-request')
}
</script>

<style scoped>
.meeting-room-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  position: relative;
}

.bg-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.3);
  pointer-events: none;
  z-index: 1;
}

.room-header {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: env(safe-area-inset-top, 40px) 15px 15px;
  background: linear-gradient(to bottom, rgba(0,0,0,0.6), transparent);
}

.header-btn {
  color: #fff;
  font-size: 13px;
  background: rgba(255,255,255,0.2);
  padding: 6px 12px;
  border-radius: 20px;
  backdrop-filter: blur(5px);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
}

.room-title {
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
}

.card-area {
  flex: 1;
  position: relative;
  z-index: 2;
  overflow-y: auto;
  padding: 0 15px;
}

.empty-state {
  text-align: center;
  color: rgba(255,255,255,0.7);
  font-size: 13px;
  margin-top: 100px;
}

.room-footer {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 15px 15px calc(15px + env(safe-area-inset-bottom, 0px));
  background: rgba(255,255,255,0.1);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border-top: 1px solid rgba(255,255,255,0.2);
}

.footer-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255,255,255,0.2);
  color: #fff;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 16px;
  cursor: pointer;
}

.room-input {
  flex: 1;
  height: 40px;
  background: rgba(255,255,255,0.8);
  border: none;
  border-radius: 20px;
  padding: 0 15px;
  font-size: 14px;
  outline: none;
  box-shadow: inset 0 2px 5px rgba(0,0,0,0.05);
}

.footer-send-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255,255,255,0.2);
  color: rgba(255,255,255,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 16px;
  transition: all 0.3s;
}

.footer-send-btn.active {
  background: var(--text-main);
  color: #fff;
}
</style>
