<template>
  <transition name="slide-up">
    <div v-if="show" class="app-window" style="z-index: 100; background: #f4f5f7;">
      
      <MeetingRoom 
        v-if="currentSession" 
        :session="currentSession"
        :activeOfflineMessages="activeOfflineMessages"
        @exit-request="handleExitRequest"
        @exit-direct="closeSessionAndExit"
        @update-config="updateSessionConfig"
        @update-bg="updateSessionBg"
        @user-send="(text) => addOfflineMessage({ role: 'user', content: text, tokens: Math.ceil(text.length / 4) })"
        @ai-reply="(obj) => addOfflineMessage({ role: 'ai', content: obj.text, tokens: obj.tokens })"
        @update-message="updateOfflineMessage"
        @delete-messages="deleteOfflineMessages"
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
        @skip="closeSessionAndExit"
      />

    </div>
  </transition>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useOffline } from '@/composables/useOffline'
import { useApi } from '@/composables/useApi'
import { useChatSessions } from '@/composables/useChatSessions'
import { useMemorySettings } from '@/composables/useMemorySettings'

import MeetingRoom from './MeetingRoom.vue'
import ExitSummaryModal from './components/ExitSummaryModal.vue'

const props = defineProps({ show: Boolean })
const emit = defineEmits(['close'])

const { 
  offlineSessions, activeOfflineMessages, currentSession, 
  loadAllSessions, createOrLoadSession, loadSessionById,
  updateSessionConfig, updateSessionBg, updateSessionLastSummarizedFloor,
  addOfflineMessage, updateOfflineMessage, deleteOfflineMessages, deleteSession 
} = useOffline()

const { apiUrl, apiKey, apiModel } = useApi()
const { chatSessions, addMemory, addStructuredMemory, addStructuredMemoriesForCharacters, addDiary, getDiariesByCharacter, archiveDiaries } = useChatSessions()
const { getMemorySettings } = useMemorySettings()

const showExitModal = ref(false)
const isSummarizing = ref(false)
const summaryText = ref('')
const exitSummaryPayload = ref(null)

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

const extractJsonString = (text) => {
  if (!text) return null
  let t = text.trim()
  const fence = t.match(/```json([\s\S]*?)```/i)
  if (fence) t = fence[1].trim()
  if (t.startsWith('{') && t.endsWith('}')) return t
  const first = t.indexOf('{')
  const last = t.lastIndexOf('}')
  if (first !== -1 && last !== -1 && last > first) return t.slice(first, last + 1)
  return null
}

const parseMemoryJson = (rawText) => {
  const jsonStr = extractJsonString(rawText)
  if (!jsonStr) return null
  try {
    return JSON.parse(jsonStr)
  } catch (e) {
    return null
  }
}

const normalizeParsedResult = (parsed, fallbackSource) => {
  if (!parsed) return { memories: [], diary: null }
  const core = Array.isArray(parsed.core_updates) ? parsed.core_updates : []
  const dynamic = Array.isArray(parsed.dynamic_events) ? parsed.dynamic_events : []
  const all = [...core, ...dynamic]

  const memories = all.map(m => {
    const t = m || {}
    let cid = t.character_id || t.characterId || null
    if (cid === '') cid = null
    return {
      characterId: cid,
      type: t.type || 'event',
      content: t.content || t.text || '',
      importance: Number(t.importance || 1),
      weight: Number(t.weight || t.importance || 1),
      keywords: Array.isArray(t.keywords) ? t.keywords : [],
      source: t.source || fallbackSource,
      timestamp: t.timestamp || Date.now(),
      date: t.date || new Date().toLocaleString()
    }
  }).filter(m => m.content && m.content.trim())

  let diary = null
  if (parsed.diary && (parsed.diary.content || parsed.diary.text)) {
    diary = {
      content: parsed.diary.content || parsed.diary.text || '',
      timestamp: parsed.diary.timestamp || Date.now(),
      date: parsed.diary.date || new Date().toLocaleString(),
      source: fallbackSource
    }
  } else if (parsed.diary_content) {
    diary = {
      content: parsed.diary_content,
      timestamp: Date.now(),
      date: new Date().toLocaleString(),
      source: fallbackSource
    }
  }

  return { memories, diary }
}

const buildPreviewText = (normalized) => {
  if (normalized.diary && normalized.diary.content) return normalized.diary.content
  if (!normalized.memories || normalized.memories.length === 0) return ''
  return normalized.memories.map((m, i) => `${i + 1}. ${m.content}`).join('\n')
}

const getChatCharacterIds = () => {
  const chat = chatSessions.value.find(c => c.id === currentSession.value.chatId)
  if (!chat || !chat.participants) return []
  return chat.participants.map(c => c.id).filter(Boolean)
}

const getPrimaryCharacterId = () => {
  const chat = chatSessions.value.find(c => c.id === currentSession.value.chatId)
  if (chat && chat.participants && chat.participants[0]) return chat.participants[0].id
  return null
}

const applyDiaryAutoArchive = async (characterId, sessionId) => {
  const settings = getMemorySettings(characterId)
  if (!settings.diaryAutoArchiveEnabled) return

  const allActive = await getDiariesByCharacter(characterId, false)
  let candidates = allActive.filter(d => d.level === 1)
  if (settings.diaryAutoIncludeL2) candidates = candidates.concat(allActive.filter(d => d.level === 2))
  if (settings.diaryAutoIncludeL3) candidates = candidates.concat(allActive.filter(d => d.level === 3))

  if (candidates.length < Number(settings.diaryAutoArchiveThreshold || 15)) return
  if (!apiKey.value) return

  const prompt = `${settings.diaryArchivePrompt}\n\n【起居注记录】\n` + candidates.map((d, i) => `${i + 1}. ${d.content}`).join('\n')
  try {
    const res = await fetch(apiUrl.value, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey.value}` },
      body: JSON.stringify({ model: apiModel.value, messages: [{ role: 'user', content: prompt }] })
    })
    if (!res.ok) return
    const data = await res.json()
    const content = data.choices[0].message?.content?.trim() || ''
    if (content) {
      await addDiary(sessionId, { characterId, content, level: Number(settings.diaryAutoTargetLevel || 2), type: 'summary', source: 'diary_auto', timestamp: Date.now(), date: new Date().toLocaleString(), isArchived: false })
      await archiveDiaries(candidates.map(c => c.id))
    }
  } catch (e) {}
}

const handleDiaryRemind = async (characterId) => {
  const settings = getMemorySettings(characterId)
  const allActive = await getDiariesByCharacter(characterId, false)
  const threshold = Number(settings.diaryRemindThreshold || 20)
  if (allActive.length >= threshold) {
    window.dispatchEvent(new CustomEvent('sys-toast', { detail: '起居注未归档数量已达到提醒阈值' }))
  }
}

const saveParsedSummary = async (normalized, diaryOverrideText, source) => {
  const chat = chatSessions.value.find(c => c.id === currentSession.value.chatId)
  const isGroup = chat ? chat.isGroup : false
  const characterIds = getChatCharacterIds()
  const defaultCid = getPrimaryCharacterId()

  if (normalized.memories && normalized.memories.length > 0) {
    for (const m of normalized.memories) {
      const memObj = {
        characterId: m.characterId,
        type: m.type || 'event',
        content: m.content,
        importance: m.importance || 1,
        weight: m.weight || m.importance || 1,
        keywords: m.keywords || [],
        source: m.source || source,
        timestamp: m.timestamp || Date.now(),
        date: m.date || new Date().toLocaleString()
      }
      if (isGroup && !memObj.characterId && characterIds.length > 0) {
        await addStructuredMemoriesForCharacters(currentSession.value.chatId, characterIds, memObj)
      } else {
        if (!isGroup && !memObj.characterId && defaultCid) memObj.characterId = defaultCid
        await addStructuredMemory(currentSession.value.chatId, memObj)
      }
    }
  }

  if (normalized.diary && (normalized.diary.content || diaryOverrideText)) {
    const diaryText = diaryOverrideText && diaryOverrideText.trim() ? diaryOverrideText.trim() : normalized.diary.content
    if (diaryText && diaryText.trim()) {
      if (isGroup && characterIds.length > 0) {
        for (const cid of characterIds) {
          await addDiary(currentSession.value.chatId, { 
            characterId: cid,
            content: diaryText, 
            timestamp: normalized.diary.timestamp || Date.now(),
            date: normalized.diary.date || new Date().toLocaleString(),
            source: source,
            level: 1,
            isArchived: false
          })
          await handleDiaryRemind(cid)
          await applyDiaryAutoArchive(cid, currentSession.value.chatId)
        }
      } else {
        const cid = defaultCid
        await addDiary(currentSession.value.chatId, { 
          characterId: cid,
          content: diaryText, 
          timestamp: normalized.diary.timestamp || Date.now(),
          date: normalized.diary.date || new Date().toLocaleString(),
          source: source,
          level: 1,
          isArchived: false
        })
        if (cid) {
          await handleDiaryRemind(cid)
          await applyDiaryAutoArchive(cid, currentSession.value.chatId)
        }
      }
    }
  }
}

const buildOfflineSummaryPrompt = (basePrompt, diaryPrompt, historyText) => {
  const source = 'offline'
  const now = new Date()
  const timeStr = now.toLocaleString('zh-CN', { hour12: false })
  let charInfo = ''
  const chat = chatSessions.value.find(c => c.id === currentSession.value.chatId)
  if (chat && chat.participants && chat.participants[0]) {
    charInfo = `当前角色 id: ${chat.participants[0].id}`
  }

  const diaryHint = diaryPrompt && diaryPrompt.trim() ? `\n\n【起居注风格要求】\n${diaryPrompt.trim()}\n` : ''

  const schema = `请严格输出 JSON，不要输出任何其他文字。JSON 格式如下：
{
  "core_updates": [
    {
      "character_id": "",
      "type": "core",
      "content": "",
      "importance": 1,
      "weight": 1,
      "keywords": [],
      "source": "${source}",
      "timestamp": 0,
      "date": ""
    }
  ],
  "dynamic_events": [
    {
      "character_id": "",
      "type": "event",
      "content": "",
      "importance": 1,
      "weight": 1,
      "keywords": [],
      "source": "${source}",
      "timestamp": 0,
      "date": ""
    }
  ],
  "diary": {
    "content": "",
    "timestamp": 0,
    "date": ""
  }
}

类型说明：
- core: 非常重要的事情
- milestone: 阶段性大事
- event: 普通事件

要求：
1. 如果没有内容，返回空数组。
2. timestamp 为毫秒，date 使用本地可读时间。`

  return `${basePrompt || ''}\n${diaryHint}\n当前时间：${timeStr}\n${charInfo ? charInfo + '\n' : ''}\n${schema}\n\n【最新记录片段】\n${historyText}`
}

const executeSummaryApi = async (isManual) => {
  const lastFloor = currentSession.value.lastSummarizedFloor || 0
  const unsummarizedMsgs = activeOfflineMessages.value.filter(m => m.floor > lastFloor)
  
  if (unsummarizedMsgs.length === 0) {
    if (isManual) window.dispatchEvent(new CustomEvent('sys-toast', { detail: '没有未归档的最新对话' }))
    return null
  }

  const historyText = unsummarizedMsgs.map(m => `${m.role === 'ai' ? currentSession.value.chatTitle : 'User'}: ${m.content}`).join('\n')

  const cid = getPrimaryCharacterId()
  const settings = cid ? getMemorySettings(cid) : getMemorySettings(null)
  const basePrompt = settings.summaryPrompt || currentSession.value.config.summaryPrompt
  const diaryPrompt = settings.diaryPrompt || ''

  const prompt = buildOfflineSummaryPrompt(basePrompt, diaryPrompt, historyText)

  try {
    const res = await fetch(apiUrl.value, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey.value}` },
      body: JSON.stringify({ model: apiModel.value, messages: [{ role: 'user', content: prompt }] })
    })
    if (!res.ok) throw new Error('API Error')
    const data = await res.json()
    const rawText = data.choices[0].message?.content?.trim() || ''
    
    const currentMaxFloor = unsummarizedMsgs[unsummarizedMsgs.length - 1].floor
    await updateSessionLastSummarizedFloor(currentMaxFloor)

    const parsed = parseMemoryJson(rawText)
    const normalized = normalizeParsedResult(parsed, 'offline')
    const previewText = buildPreviewText(normalized)

    return { rawText, parsed: normalized, previewText }
  } catch (e) {
    if (isManual) window.dispatchEvent(new CustomEvent('sys-toast', { detail: '总结失败' }))
    return null
  }
}

const handleIngameSummary = async ({ isManual }) => {
  if (isManual) window.dispatchEvent(new CustomEvent('sys-toast', { detail: '开始提取记忆...' }))
  
  const res = await executeSummaryApi(isManual)
  if (res && res.parsed) {
    await saveParsedSummary(res.parsed, null, 'offline')
    window.dispatchEvent(new CustomEvent('sys-toast', { detail: isManual ? '记忆已成功提炼并归档' : '已静默归档最新记忆' }))
  } else if (res && res.rawText) {
    await addMemory(currentSession.value.chatId, { date: new Date().toLocaleString(), text: res.rawText })
    window.dispatchEvent(new CustomEvent('sys-toast', { detail: isManual ? '记忆已成功提炼并归档' : '已静默归档最新记忆' }))
  }
}

const handleExitRequest = async () => {
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
  exitSummaryPayload.value = null

  const res = await executeSummaryApi(false)
  if (res && res.parsed) {
    exitSummaryPayload.value = res.parsed
    summaryText.value = res.previewText || ''
  } else if (res && res.rawText) {
    summaryText.value = res.rawText
  } else {
    summaryText.value = "提取记忆失败或网络出错，您可以手动在此写下本次见面的日记片段..."
  }
  isSummarizing.value = false
}

const confirmExit = async (finalText) => {
  if (exitSummaryPayload.value) {
    await saveParsedSummary(exitSummaryPayload.value, finalText, 'offline')
  } else if (finalText && finalText.trim()) {
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
.app-window { position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; }
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
