<template>
  <div class="meeting-room-container" :style="bgStyle">
    <div class="bg-overlay"></div>

    <div class="room-header">
      <div class="header-btn" @click="handleExitClick">
        <i class="fas fa-sign-out-alt"></i> 结束见面
      </div>
      <div class="room-title">与 {{ session.chatTitle }} 的见面</div>
      <div style="display:flex; gap:10px;">
        <div class="header-btn" @click="showDebugPanel = true">
          <i class="fas fa-bug"></i>
        </div>
        <div class="header-btn" @click="triggerBgUpload">
          <i class="fas fa-image"></i> 背景
        </div>
      </div>
      <input type="file" ref="bgUploader" accept="image/*" style="display:none" @change="onBgUploaded" />
    </div>

    <div class="card-area" ref="scrollBox">
      <div style="height: 20px;"></div>
      
      <div v-if="activeOfflineMessages.length === 0" class="empty-state">
        环境已加载，请主动开启互动。
      </div>

      <!-- 核心更新：使用一层包装侦听点击，唤起操作菜单 -->
      <div v-for="msg in activeOfflineMessages" :key="msg.id" @click="openActionSheet(msg)" style="cursor:pointer; position:relative;">
        <MeetingCard 
          :msg="msg"
          :name="msg.role === 'user' ? userProfile.name : session.chatTitle"
          :avatar="msg.role === 'user' ? userProfile.avatar : charAvatar"
        />
      </div>
      
      <MeetingCard 
        v-if="isWaiting"
        :msg="{ role: 'ai', status: 'waiting', floor: activeOfflineMessages.length + 1, timestamp: Date.now() }"
        :name="session.chatTitle"
        :avatar="charAvatar"
      />

      <div style="height: 20px;"></div>
    </div>

    <div class="room-footer glass">
      <div class="footer-btn" @click="showQuickConfig = true">
        <i class="fas fa-sliders-h"></i>
      </div>
      <div class="footer-btn" @click="handleReRoll" style="background:rgba(255,159,67,0.3); color:#ff9f43;" title="重Roll">
        <i class="fas fa-sync-alt"></i>
      </div>
      <input type="text" class="room-input" v-model="inputText" @keyup.enter="handleSend" placeholder="描述你的动作或说话内容..." />
      <div class="footer-send-btn" :class="{ 'active': inputText.trim() && !isWaiting }" @click="handleSend">
        <i class="fas fa-paper-plane"></i>
      </div>
    </div>

    <QuickConfigBar 
      :show="showQuickConfig" 
      :config="session.config" 
      @close="showQuickConfig = false"
      @save="$emit('update-config', $event)"
      @open-advanced="openAdvancedPrompt"
      @trigger-manual-summary="handleManualSummary"
    />

    <transition name="slide-up">
      <div v-if="showAdvancedPrompt" class="app-window" style="z-index: 150; background: var(--bg-color);">
        <div class="app-header">
          <div class="btn-back" @click="showAdvancedPrompt = false">返回</div>
          <div class="app-title">线下高级注入配置</div>
          <div class="header-right" style="display:flex; gap:15px;">
            <i class="fas fa-eye" style="cursor:pointer;" @click="advancedPromptPageRef?.openPreview()"></i>
            <i class="fas fa-plus" style="cursor:pointer;" @click="advancedPromptPageRef?.openAddModal()"></i>
          </div>
        </div>
        <OfflinePromptOrderPage ref="advancedPromptPageRef" />
      </div>
    </transition>

    <!-- 消息操作底部抽屉 -->
    <div class="ios-action-sheet-mask" v-if="actionSheet.show" @click.self="actionSheet.show = false">
      <div class="ios-action-sheet">
        <div class="ios-action-group">
          <div class="ios-action-btn" @click="handleEditMsg">编辑此消息</div>
          <div class="ios-action-btn danger" @click="handleDeleteMsg">删除此消息</div>
        </div>
        <div class="ios-action-cancel" @click="actionSheet.show = false">取消</div>
      </div>
    </div>

    <!-- 退出操作底部抽屉 -->
    <div class="ios-action-sheet-mask" v-if="exitActionSheet" @click.self="exitActionSheet = false">
      <div class="ios-action-sheet">
        <div class="ios-action-group">
          <div class="ios-action-btn" @click="handleExitWithSummary">总结并退出</div>
          <div class="ios-action-btn danger" @click="handleExitDirect">直接退出</div>
        </div>
        <div class="ios-action-cancel" @click="exitActionSheet = false">取消</div>
      </div>
    </div>

    <DebugPanel :show="showDebugPanel" :logData="apiLog" @close="showDebugPanel = false" />

  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch, onMounted } from 'vue'
import { useProfile } from '@/composables/useProfile'
import { useCharacters } from '@/composables/useCharacters'
import { useChatSessions } from '@/composables/useChatSessions'
import { useApi } from '@/composables/useApi'
import { useOfflinePrompt } from '@/composables/useOfflinePrompt'

import MeetingCard from './components/MeetingCard.vue'
import QuickConfigBar from './components/QuickConfigBar.vue'
import OfflinePromptOrderPage from './OfflinePromptOrderPage.vue'
import DebugPanel from '../qq/DebugPanel.vue'

const props = defineProps({
  session: Object,
  activeOfflineMessages: Array
})

const emit = defineEmits(['exit-request', 'exit-direct', 'update-config', 'update-bg', 'user-send', 'ai-reply', 'update-message', 'delete-messages', 'trigger-summary'])

const { userProfile } = useProfile()
const { getCharById } = useCharacters()
const { sessions, chatList, activeMemories, loadSessionData } = useChatSessions()
const { apiUrl, apiKey, apiModel } = useApi()
const { buildOfflineApiMessages } = useOfflinePrompt()

const inputText = ref('')
const scrollBox = ref(null)
const bgUploader = ref(null)
const showQuickConfig = ref(false)
const showAdvancedPrompt = ref(false)
const advancedPromptPageRef = ref(null)
const isWaiting = ref(false)

const showDebugPanel = ref(false)
const apiLog = ref({ req: null, res: null, reqTokens: 0, resTokens: 0, time: '' })

const actionSheet = ref({ show: false, msg: null })
const exitActionSheet = ref(false)

const charAvatar = computed(() => {
  const char = getCharById(props.session.chatId)
  return char ? char.avatar : ''
})

const bgStyle = computed(() => {
  if (props.session.bgImage) return { backgroundImage: `url(${props.session.bgImage})` }
  return { background: '#2c3e50' }
})

const chatObj = computed(() => {
  const arr = (sessions && sessions.value) || (chatList && chatList.value) || []
  return arr.find(c => c.id === props.session.chatId) || { id: props.session.chatId, participants: [] }
})

onMounted(async () => {
  await loadSessionData(props.session.chatId)
  scrollToBottom()
})

const scrollToBottom = () => { nextTick(() => { if (scrollBox.value) scrollBox.value.scrollTop = scrollBox.value.scrollHeight }) }
watch(() => props.activeOfflineMessages.length, scrollToBottom)

const openAdvancedPrompt = () => {
  showQuickConfig.value = false
  showAdvancedPrompt.value = true
}

const openActionSheet = (msg) => {
  if (isWaiting.value) return
  actionSheet.value = { show: true, msg }
}

const handleEditMsg = () => {
  const newText = prompt('编辑消息：', actionSheet.value.msg.content)
  if (newText && newText.trim()) {
    emit('update-message', actionSheet.value.msg.id, newText.trim())
  }
  actionSheet.value.show = false
}

const handleDeleteMsg = () => {
  if (confirm('确定删除这条消息吗？')) {
    emit('delete-messages', [actionSheet.value.msg.id])
  }
  actionSheet.value.show = false
}

// 核心重制：找准最后一个User节点，截断后面并重Roll
const handleReRoll = () => {
  if (isWaiting.value) return
  let lastUserIdx = -1
  for (let i = props.activeOfflineMessages.length - 1; i >= 0; i--) {
    if (props.activeOfflineMessages[i].role === 'user') {
      lastUserIdx = i
      break
    }
  }
  if (lastUserIdx !== -1 && lastUserIdx < props.activeOfflineMessages.length - 1) {
    const idsToDelete = props.activeOfflineMessages.slice(lastUserIdx + 1).map(m => m.id)
    emit('delete-messages', idsToDelete)
    setTimeout(() => { triggerAiReply() }, 150)
  } else {
    triggerAiReply()
  }
}

const handleSend = () => {
  if (!inputText.value.trim() || isWaiting.value) return
  const text = inputText.value
  inputText.value = ''
  emit('user-send', text)
  nextTick(() => triggerAiReply())
}

const triggerAiReply = async () => {
  isWaiting.value = true
  scrollToBottom()
  
  try {
    if (!apiKey.value) throw new Error('未设置 API Key')

    const apiMsgs = buildOfflineApiMessages(
      chatObj.value, 
      props.session.config, 
      props.activeOfflineMessages, 
      activeMemories.value
    )

    apiLog.value.req = JSON.parse(JSON.stringify(apiMsgs))
    apiLog.value.reqTokens = Math.ceil(apiMsgs.map(m => m.content).join('').length / 4)
    apiLog.value.time = new Date().toLocaleTimeString()

    const res = await fetch(apiUrl.value, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey.value}` },
      body: JSON.stringify({ model: apiModel.value, messages: apiMsgs })
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    let reply = data.choices[0].message?.content || ''
    
    apiLog.value.res = reply
    apiLog.value.resTokens = Math.ceil(reply.length / 4)

    // 核心拦截：彻底无情地剥离线下回复中带出的思维链，保持洁净如小说！
    reply = reply.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim()

    emit('ai-reply', { text: reply, tokens: Math.ceil(reply.length / 4) })
    checkAndRunAutoSummary()

  } catch (e) {
    window.dispatchEvent(new CustomEvent('sys-toast', { detail: `AI 交互失败: ${e.message}` }))
  } finally {
    isWaiting.value = false
    scrollToBottom()
  }
}

const checkAndRunAutoSummary = () => {
  const count = Number(props.session.config.autoSummaryCount) || 0
  if (count <= 0) return
  const lastFloor = props.session.lastSummarizedFloor || 0
  const unsummarizedMsgs = props.activeOfflineMessages.filter(m => m.floor > lastFloor)
  const aiCount = unsummarizedMsgs.filter(m => m.role === 'ai').length
  if (aiCount > 0 && aiCount >= count) {
    emit('trigger-summary', { isManual: false })
  }
}

const handleManualSummary = () => { emit('trigger-summary', { isManual: true }) }
const triggerBgUpload = () => { bgUploader.value.click() }
const onBgUploaded = (e) => {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => { emit('update-bg', ev.target.result) }
  reader.readAsDataURL(file)
}
const handleExitClick = () => { exitActionSheet.value = true }
const handleExitWithSummary = () => {
  exitActionSheet.value = false
  emit('exit-request')
}
const handleExitDirect = () => {
  exitActionSheet.value = false
  emit('exit-direct')
}
</script>

<style scoped>
.meeting-room-container { display: flex; flex-direction: column; width: 100%; height: 100%; background-size: cover; background-position: center; position: relative; }
.bg-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.3); pointer-events: none; z-index: 1; }
.room-header { position: relative; z-index: 2; display: flex; justify-content: space-between; align-items: center; padding: env(safe-area-inset-top, 40px) 15px 15px; background: linear-gradient(to bottom, rgba(0,0,0,0.6), transparent); }
.header-btn { color: #fff; font-size: 13px; background: rgba(255,255,255,0.2); padding: 6px 12px; border-radius: 20px; backdrop-filter: blur(5px); cursor: pointer; display: flex; align-items: center; gap: 5px; }
.room-title { color: #fff; font-size: 15px; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
.card-area { flex: 1; position: relative; z-index: 2; overflow-y: auto; padding: 0 15px; }
.empty-state { text-align: center; color: rgba(255,255,255,0.7); font-size: 13px; margin-top: 100px; }
.room-footer { position: relative; z-index: 2; display: flex; align-items: center; gap: 10px; padding: 15px 15px calc(15px + env(safe-area-inset-bottom, 0px)); background: rgba(255,255,255,0.1); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px); border-top: 1px solid rgba(255,255,255,0.2); }
.footer-btn { width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.2); color: #fff; display: flex; justify-content: center; align-items: center; font-size: 16px; cursor: pointer; }
.room-input { flex: 1; height: 40px; background: rgba(255,255,255,0.8); border: none; border-radius: 20px; padding: 0 15px; font-size: 14px; outline: none; box-shadow: inset 0 2px 5px rgba(0,0,0,0.05); }
.footer-send-btn { width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.2); color: rgba(255,255,255,0.5); display: flex; justify-content: center; align-items: center; font-size: 16px; transition: all 0.3s; }
.footer-send-btn.active { background: var(--text-main); color: #fff; }

.ios-action-sheet-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); z-index: 9999; display: flex; flex-direction: column; justify-content: flex-end; }
.ios-action-sheet { padding: 10px; padding-bottom: calc(10px + env(safe-area-inset-bottom)); }
.ios-action-group { background: rgba(255,255,255,0.9); border-radius: 14px; overflow: hidden; margin-bottom: 8px; backdrop-filter: blur(10px); }
.ios-action-btn { padding: 15px; text-align: center; font-size: 16px; color: #007aff; border-bottom: 1px solid rgba(0,0,0,0.1); background: transparent; cursor: pointer; }
.ios-action-btn:last-child { border-bottom: none; }
.ios-action-btn:active { background: rgba(0,0,0,0.05); }
.ios-action-btn.danger { color: #ff3b30; }
.ios-action-cancel { background: #fff; border-radius: 14px; padding: 15px; text-align: center; font-size: 16px; font-weight: 600; color: #007aff; cursor: pointer; }
.ios-action-cancel:active { background: #f0f0f0; }
</style>
