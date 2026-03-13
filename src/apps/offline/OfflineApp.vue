<template>
  <transition name="slide-up">
    <div v-if="show" class="app-window" style="z-index: 100; background: #f4f5f7;">
      
      <MeetingRoom 
        v-if="currentSession" 
        :session="currentSession"
        :activeOfflineMessages="activeOfflineMessages"
        @exit-request="handleExitRequest"
        @update-config="updateSessionConfig"
        @update-bg="updateSessionBg"
        @user-send="(text) => addOfflineMessage({ role: 'user', content: text, tokens: Math.ceil(text.length / 4) })"
        @ai-reply="(obj) => addOfflineMessage({ role: 'ai', content: obj.text, tokens: obj.tokens })"
        @trigger-summary="handleIngameSummary"
      />

      <div v-else style="display:flex; flex-direction:column; height:100%;">
        <div class="app-header">
          <div class="btn-back" @click="$emit('close')">返回</div>
          <div class="app-title">见面记录</div>
          <div class="header-right"></div>
        </div>
        <div class="content-area">
          <div v-if="offlineSessions.length === 0" style="text-align:center; color:#888; font-size:13px; margin-top:50px;">
            暂无记录。<br>请从 QQ 聊天界面的底部菜单发起见面。
          </div>
          <div class="record-list">
            <div class="record-item" v-for="s in offlineSessions" :key="s.id" @click="openSession(s.id)">
              <div class="r-info">
                <div class="r-title">与 {{ s.chatTitle }} 的见面</div>
                <div class="r-time">{{ new Date(s.createTime).toLocaleString() }}</div>
              </div>
              <i class="fas fa-trash r-del" @click.stop="deleteSession(s.id)"></i>
            </div>
          </div>
        </div>
      </div>

      <ExitSummaryModal 
        :show="showExitModal"
        :isSummarizing="isSummarizing"
        :summaryText="summaryText"
        @cancel="showExitModal = false"
        @confirm="confirmExit"
      />

    </div>
  </transition>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useOffline } from '@/composables/useOffline'
import { useApi } from '@/composables/useApi'
import { useChatSessions } from '@/composables/useChatSessions'

import MeetingRoom from './MeetingRoom.vue'
import ExitSummaryModal from './components/ExitSummaryModal.vue'

const props = defineProps({ show: Boolean })
const emit = defineEmits(['close'])

const { 
  offlineSessions, activeOfflineMessages, currentSession, 
  loadAllSessions, createOrLoadSession, loadSessionById,
  updateSessionConfig, updateSessionBg, updateSessionLastSummarizedFloor,
  addOfflineMessage, deleteSession 
} = useOffline()

const { apiUrl, apiKey, apiModel } = useApi()
const { addMemory } = useChatSessions()

const showExitModal = ref(false)
const isSummarizing = ref(false)
const summaryText = ref('')

const handleOpenMeetingEvent = async (e) => {
  if (e.detail && e.detail.chat) {
    const chat = e.detail.chat
    await createOrLoadSession(chat.id, chat.title)
  }
}

onMounted(async () => {
  await loadAllSessions()
  window.addEventListener('open-offline-meeting', handleOpenMeetingEvent)
})

onUnmounted(() => { window.removeEventListener('open-offline-meeting', handleOpenMeetingEvent) })
watch(() => props.show, async (val) => { if (val && !currentSession.value) await loadAllSessions() })
const openSession = async (id) => { await loadSessionById(id) }

// === 核心：执行切片总结 ===
const executeSummaryApi = async (isManual) => {
  const lastFloor = currentSession.value.lastSummarizedFloor || 0
  const unsummarizedMsgs = activeOfflineMessages.value.filter(m => m.floor > lastFloor)
  
  if (unsummarizedMsgs.length === 0) {
    if (isManual) window.dispatchEvent(new CustomEvent('sys-toast', { detail: '没有未归档的最新对话' }))
    return null
  }

  const historyText = unsummarizedMsgs.map(m => `${m.role === 'ai' ? currentSession.value.chatTitle : 'User'}: ${m.content}`).join('\n')
  const prompt = currentSession.value.config.summaryPrompt + `\n\n【最新记录片段】\n${historyText}`

  try {
    const res = await fetch(apiUrl.value, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey.value}` },
      body: JSON.stringify({ model: apiModel.value, messages: [{ role: 'user', content: prompt }] })
    })
    if (!res.ok) throw new Error('API Error')
    const data = await res.json()
    const resultText = data.choices[0].message?.content?.trim() || ''
    
    const currentMaxFloor = unsummarizedMsgs[unsummarizedMsgs.length - 1].floor
    await updateSessionLastSummarizedFloor(currentMaxFloor)
    
    return resultText
  } catch (e) {
    if (isManual) window.dispatchEvent(new CustomEvent('sys-toast', { detail: '总结失败' }))
    return null
  }
}

const handleIngameSummary = async ({ isManual }) => {
  if (isManual) window.dispatchEvent(new CustomEvent('sys-toast', { detail: '开始提取记忆...' }))
  
  const text = await executeSummaryApi(isManual)
  if (text) {
    await addMemory(currentSession.value.chatId, { date: new Date().toLocaleString(), text })
    window.dispatchEvent(new CustomEvent('sys-toast', { detail: isManual ? '记忆已成功提炼并归档' : '已静默归档最新记忆' }))
  }
}

// 退出拦截
const handleExitRequest = async () => {
  // 核心修复：如果是空记录，直接无情抹除
  if (activeOfflineMessages.value.length === 0) {
    const targetChatId = currentSession.value.chatId
    await deleteSession(currentSession.value.id)
    currentSession.value = null
    window.dispatchEvent(new CustomEvent('offline-meeting-ended', { detail: { chatId: targetChatId } }))
    emit('close')
    return
  }

  const lastFloor = currentSession.value.lastSummarizedFloor || 0
  const unsummarizedMsgs = activeOfflineMessages.value.filter(m => m.floor > lastFloor)
  
  if (unsummarizedMsgs.length === 0) {
    closeSessionAndExit()
    return
  }

  showExitModal.value = true
  isSummarizing.value = true
  summaryText.value = ''

  const text = await executeSummaryApi(false)
  if (text) {
    summaryText.value = text
  } else {
    summaryText.value = "提取记忆失败或网络出错，您可以手动在此写下本次见面的日记片段..."
  }
  isSummarizing.value = false
}

const confirmExit = async (finalText) => {
  if (finalText && finalText.trim()) {
    await addMemory(currentSession.value.chatId, { date: new Date().toLocaleString(), text: finalText.trim() })
  }
  closeSessionAndExit()
}

const closeSessionAndExit = () => {
  const targetChatId = currentSession.value.chatId
  currentSession.value = null
  showExitModal.value = false
  window.dispatchEvent(new CustomEvent('offline-meeting-ended', { detail: { chatId: targetChatId } }))
  emit('close')
}
</script>

<style scoped>
/* 核心修复：补全了所有丢失的样式 */
.app-window { position: fixed; top: 0; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; }
.app-header { display: flex; justify-content: space-between; align-items: center; padding: env(safe-area-inset-top, 40px) 15px 15px; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.05); z-index: 10; flex-shrink: 0; }
.btn-back { color: var(--text-main); font-size: 15px; font-weight: 600; cursor: pointer; }
.app-title { font-size: 16px; font-weight: 700; color: #333; }
.header-right { width: 40px; }
.content-area { flex: 1; overflow-y: auto; padding: 15px; box-sizing: border-box; }

.record-list { display: flex; flex-direction: column; gap: 12px; margin-top: 15px; }
.record-item { background: #fff; border-radius: 12px; padding: 15px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 8px rgba(0,0,0,0.03); cursor: pointer; transition: transform 0.2s; }
.record-item:active { transform: scale(0.98); }
.r-info { flex: 1; }
.r-title { font-size: 15px; font-weight: 600; color: #333; margin-bottom: 6px; }
.r-time { font-size: 11px; color: #888; }
.r-del { color: #ff5252; padding: 10px; font-size: 16px; cursor: pointer; }
</style>

