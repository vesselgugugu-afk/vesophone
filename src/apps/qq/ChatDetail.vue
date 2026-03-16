<template>
  <div style="display:flex; flex-direction:column; flex:1; overflow:hidden; position:relative;">
    
    <component :is="'style'" v-if="chat.customCss">{{ chat.customCss }}</component>
    <component :is="'style'" v-if="musicState.customLyricCss">{{ musicState.customLyricCss }}</component>

    <ChatHeader 
      :title="chat.title"
      :isSelectionMode="isSelectionMode"
      :selectedCount="selectedIds.length"
      @exit="$emit('exit')"
      @cancel-selection="cancelSelection"
      @open-debug="showDebugPanel = true"
      @open-settings="showSettings = true"
    />

    <div v-if="pendingRequestId" style="background: #fff8e6; color: #d35400; padding: 10px 15px; font-size: 12px; display: flex; justify-content: space-between; align-items: center; z-index: 10; border-bottom: 1px solid #ffeaa7;">
      <span style="display:flex; align-items:center; gap:6px;"><i class="fas fa-bell"></i> 对方发来了好友验证请求</span>
      <button style="background: #d35400; color: #fff; border: none; border-radius: 6px; padding: 5px 12px; font-size: 11px; cursor: pointer; font-weight: 600;" @click="handleAcceptFriend">去通过</button>
    </div>

    <div class="chat-area" ref="chatBox" :style="chat.bgImage ? { backgroundImage: `url(${chat.bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}">
      <div v-if="chat.bgImage" style="position:absolute; top:0; left:0; right:0; bottom:0; background:rgba(255,255,255,0.2); pointer-events:none; z-index:0;"></div>

      <template v-for="(msg, index) in visibleMessages" :key="msg.id">
        <ChatMessageItem 
          :msg="msg"
          :chat="chat"
          :isSelectionMode="isSelectionMode"
          :isSelected="selectedIds.includes(msg.id)"
          :showTime="index === 0 || (msg.timestamp || Math.floor(msg.id)) - (visibleMessages[index-1].timestamp || Math.floor(visibleMessages[index-1].id)) > 5*60*1000"
          @toggle-select="toggleSelect"
          @press="startPress"
          @clear-press="clearPress"
          @click-transfer="handleTransferClick"
          @click-music-share="handleMusicShareClick"
          @click-colisten="handleColistenReqClick"
          @view-recall="viewRecall"
          @toggle-voice="(m) => { m.showText = !m.showText }"
          @click-avatar="handleAvatarClick"
        />
      </template>

      <div v-if="isWaiting" class="msg-row is-ai" style="position:relative; z-index:1; width:100%;">
        <div class="msg-avatar" :style="getAiAvatarStyle()">{{ getAiAvatarInitials() }}</div>
        <div class="msg-content-wrapper">
          <div class="msg-bubble">
            <i class="fas fa-circle-notch fa-spin"></i>
          </div>
        </div>
      </div>
    </div>

    <div v-if="chat.isBlocked" style="padding:15px; text-align:center; color:#888; font-size:13px; background:#f4f5f7; z-index:20; box-shadow:0 -2px 10px rgba(0,0,0,0.05);">
      <div style="margin-bottom:12px;">你已将对方拉黑，<span style="color:#5c8aff; cursor:pointer;" @click="chat.isBlocked = false">点击解除</span></div>
      <button class="btn-send" style="padding:8px 20px; font-size:12px; border-radius:12px; font-weight:600;" @click="triggerAiReply">
        <i class="fas fa-eye"></i> 视奸 (唤起对方动作)
      </button>
    </div>
    
    <div v-if="chat.isBlockedByAi" style="padding:10px 15px; text-align:center; background:#fff2f2; z-index:20; border-top: 1px solid #ffcccc; display:flex; justify-content:center; gap:10px;">
      <button style="padding:6px 12px; font-size:12px; border-radius:12px; background:#ff5252; color:#fff; border:none; font-weight:600;" @click="sendFriendRequestToAi">
        <i class="fas fa-user-plus"></i> 发送好友申请
      </button>
      <button style="padding:6px 12px; font-size:12px; border-radius:12px; background:#fff; color:#666; border:1px solid #ddd;" @click="triggerAiReply">
        <i class="fas fa-hourglass-half"></i> 等待对方动作...
      </button>
    </div>

    <ChatBottomBar 
      v-show="!chat.isBlocked"
      :chat="chat"
      :musicState="musicState"
      :isSelectionMode="isSelectionMode"
      :quotingText="quotingText"
      @send-text="handleSendText"
      @send-sticker="sendSticker"
      @trigger-ai="triggerAiReply"
      @delete-selected="deleteSelected"
      @open-alert="openMenuAlert"
      @open-local-music="showLocalMusicPicker = true"
      @open-memory="showMemoryPanel = true"
      @open-summary="showSummaryPanel = true"
      @reroll="handleReRoll"
      @toggle-colisten="toggleColistenFromMenu"
      @clear-quote="quotingText = ''"
      @start-offline="startOfflineMeeting"
    />

    <ChatMusicModals 
      v-model:activeMusicCard="activeMusicCard"
      v-model:showLocalMusicPicker="showLocalMusicPicker"
      v-model:showColistenAlert="showColistenAlert"
      :resolvingMusic="resolvingMusic"
      :resolvedMusicData="resolvedMusicData"
      :musicState="musicState"
      :chatTitle="chat.title"
      @play-resolved="playResolvedMusic"
      @add-resolved="addResolvedMusicToQueue"
      @send-music-share="sendMusicShare"
      @reply-colisten="replyColisten"
    />

    <ChatGeneralAlerts 
      v-model:apiErrorDetails="apiErrorDetails"
      v-model:pendingAutoSummary="pendingAutoSummary"
      :alert="alert"
      :chatTitle="chat.title"
      @close-alert="alert.show = false"
      @copy-error="copyErrorJson"
      @confirm-transfer="confirmReceiveTransfer"
      @confirm-general="handleAlertConfirm"
      @confirm-summary="confirmAutoSummary"
      @confirm-meeting="handleMeetingConfirm"
    />

    <ChatActionSheet 
      v-model:show="actionSheet.show"
      :msg="actionSheet.msg"
      @quote="handleQuote"
      @edit="handleEditOwnMsg"
      @recall="handleRecallOwn"
      @multi-select="isSelectionMode = true"
    />

    <MemoryPanel :show="showMemoryPanel" :chat="chat" @close="showMemoryPanel = false" />
    <ChatSettingsPage :show="showSettings" :chat="chat" @close="showSettings = false" @edit-character="(id) => { showSettings = false; $emit('edit-character', id); }" />
    <DebugPanel :show="showDebugPanel" :logData="apiLog" @close="showDebugPanel = false" />
    <SummaryPanel :show="showSummaryPanel" :chat="chat" @close="showSummaryPanel = false" />
    <StatusPanel :show="showStatusPanel" :msg="activeStatusMsg" :chat="chat" @close="showStatusPanel = false" />

  </div>
</template>

<script setup>
import { ref, nextTick, watch, onMounted, onUnmounted, computed } from 'vue'
import { useApi } from '@/composables/useApi'
import { usePromptOrder } from '@/composables/usePromptOrder'
import { useChatSessions } from '@/composables/useChatSessions'
import { useProfile } from '@/composables/useProfile'
import { useCharacters } from '@/composables/useCharacters'
import { useMusic } from '@/composables/useMusic' 
import { useMusicApi } from '@/composables/useMusicApi'
import { useMemorySettings } from '@/composables/useMemorySettings'

import ChatMessageItem from './components/ChatMessageItem.vue'
import ChatBottomBar from './components/ChatBottomBar.vue'
import ChatHeader from './components/ChatHeader.vue'
import ChatActionSheet from './components/ChatActionSheet.vue'
import ChatMusicModals from './components/ChatMusicModals.vue'
import ChatGeneralAlerts from './components/ChatGeneralAlerts.vue'

import MemoryPanel from './MemoryPanel.vue'
import ChatSettingsPage from './ChatSettingsPage.vue'
import DebugPanel from './DebugPanel.vue'
import SummaryPanel from './SummaryPanel.vue'
import StatusPanel from './StatusPanel.vue'

const props = defineProps({ 
  chat: { type: Object, required: true } 
})

const emit = defineEmits(['exit', 'edit-character'])

const { apiUrl, apiKey, apiModel } = useApi()
const { buildApiMessages } = usePromptOrder()
const { activeMessages, activeDiaries, loadSessionData, pushMessage, updateMessage, removeMessages, addMemory, addStructuredMemory, addStructuredMemoriesForCharacters, addDiary, getDiariesByCharacter, archiveDiaries, activeMemories, addFriendRequest, friendRequests, acceptFriendRequest } = useChatSessions()
const { userProfile } = useProfile()
const { getCharById } = useCharacters()
const { musicState, loadSong, toggleCoListen, playSpecific } = useMusic()
const { resolveBestMatch } = useMusicApi()
const { getMemorySettings } = useMemorySettings()

const isWaiting = ref(false)
const chatBox = ref(null)

const showSettings = ref(false)
const showMemoryPanel = ref(false)
const showDebugPanel = ref(false)
const showSummaryPanel = ref(false)
const showLocalMusicPicker = ref(false)
const showColistenAlert = ref(false)
const apiErrorDetails = ref(null)

const showStatusPanel = ref(false)
const activeStatusMsg = ref(null)

const quotingText = ref('')
const apiLog = ref({ req: null, res: null, reqTokens: 0, resTokens: 0, time: '' })
const pendingAutoSummary = ref(null)
const pendingAutoSummaryPayload = ref(null)

const pendingRequestId = computed(() => {
  const req = friendRequests.value.find(r => r.chatId === props.chat.id)
  return req ? req.id : null
})

const handleAcceptFriend = () => {
  if (pendingRequestId.value) {
    acceptFriendRequest(pendingRequestId.value)
    window.dispatchEvent(new CustomEvent('sys-toast', { detail: '已通过好友验证并解除拉黑' }))
  }
}

const handleOfflineEnded = (e) => {
  if (e.detail && e.detail.chatId === props.chat.id) {
    pushMessage(props.chat.id, { role: 'system', type: 'text', content: '[系统提示：你结束了与对方的线下见面，记忆已归档]' })
    scrollToBottom()
  }
}

onMounted(async () => { 
  await loadSessionData(props.chat.id)
  scrollToBottom()
  window.addEventListener('offline-meeting-ended', handleOfflineEnded)
})

onUnmounted(() => {
  window.removeEventListener('offline-meeting-ended', handleOfflineEnded)
})

watch(() => props.chat.id, async (newId) => { 
  await loadSessionData(newId)
  scrollToBottom()
})

const visibleMessages = computed(() => { 
  const limit = Number(props.chat.settings?.renderMessageCount) || 50
  return activeMessages.value.slice(-limit) 
})

const scrollToBottom = () => {
  nextTick(() => { 
    if (chatBox.value) chatBox.value.scrollTop = chatBox.value.scrollHeight 
  })
}

watch(() => visibleMessages.value.length, scrollToBottom)

const getAiAvatarStyle = () => {
  if (props.chat.overrideAvatar) {
    return `background-image: url(${props.chat.overrideAvatar})`
  }
  if (!props.chat.isGroup && props.chat.participants.length > 0) {
    const liveChar = getCharById(props.chat.participants[0].id)
    if (liveChar && liveChar.avatar) {
      return `background-image: url(${liveChar.avatar})`
    }
  }
  return ''
}

const getAiAvatarInitials = () => {
  if (props.chat.overrideAvatar || (!props.chat.isGroup && getCharById(props.chat.participants[0]?.id)?.avatar)) {
    return ''
  }
  return props.chat.title ? props.chat.title.charAt(0) : 'A'
}

const buildRegexSafe = (patternStr) => {
  if (!patternStr) return null;
  let flags = '';
  let pattern = patternStr;
  const match = patternStr.match(/^\/(.+)\/([a-z]*)$/s);
  if (match) {
    pattern = match[1];
    flags = match[2];
  } else if (patternStr.includes('\\\\[')) {
    pattern = pattern.replace(/\\\\/g, '\\');
  }
  try {
    return new RegExp(pattern, flags);
  } catch(e) {
    return null;
  }
}

const handleAvatarClick = (clickedMsg) => {
  if (clickedMsg.role === 'ai') {
    let targetMsg = clickedMsg;
    const regex = buildRegexSafe(props.chat.settings?.regexPattern);
    
    if (regex) {
      const aiMsgs = activeMessages.value.filter(m => m.role === 'ai');
      for (let i = aiMsgs.length - 1; i >= 0; i--) {
        const textToTest = aiMsgs[i].rawStatus || aiMsgs[i].content || '';
        if (textToTest.match(regex)) {
          targetMsg = aiMsgs[i];
          break;
        }
      }
    }
    
    activeStatusMsg.value = targetMsg;
    showStatusPanel.value = true;
  }
}

const startOfflineMeeting = () => {
  window.dispatchEvent(new CustomEvent('open-offline-meeting', { detail: { chat: props.chat } }))
}

const handleMeetingConfirm = (accept) => {
  if (accept) {
    startOfflineMeeting()
  } else {
    pushMessage(props.chat.id, { role: 'system', type: 'text', content: '你拒绝了线下见面邀请' })
  }
  alert.value.show = false
  scrollToBottom()
}

const sendFriendRequestToAi = () => {
  const txt = prompt('输入你想对TA说的验证消息：', '我是...')
  if (txt !== null) {
    pushMessage(props.chat.id, { role: 'user', type: 'text', content: `[发起好友验证]：${txt}` })
    scrollToBottom()
    setTimeout(() => { triggerAiReply() }, 800)
  }
}

const handleSendText = (txt) => {
  const msgObj = { 
    role: 'user', 
    type: quotingText.value ? 'quote' : 'text', 
    content: txt 
  }
  if (quotingText.value) {
    msgObj.refText = quotingText.value
  }
  if (props.chat.isBlockedByAi) {
    msgObj.isFailed = true
  }
  pushMessage(props.chat.id, msgObj)
  quotingText.value = ''
  scrollToBottom()
}

const sendSticker = (name) => { 
  const msgObj = { role: 'user', type: 'sticker', content: name }
  if (props.chat.isBlockedByAi) msgObj.isFailed = true
  pushMessage(props.chat.id, msgObj)
  scrollToBottom() 
}

const sendMusicShare = (song) => { 
  const msgObj = { 
    role: 'user', 
    type: 'music_share', 
    name: song.name, 
    artist: song.artist, 
    content: '我想和你分享这首歌~' 
  }
  if (props.chat.isBlockedByAi) msgObj.isFailed = true
  pushMessage(props.chat.id, msgObj)
  showLocalMusicPicker.value = false
  scrollToBottom() 
}

const activeMusicCard = ref(null)
const resolvingMusic = ref(false)
const resolvedMusicData = ref(null)

const handleMusicShareClick = async (msg) => {
  activeMusicCard.value = msg
  resolvingMusic.value = true
  resolvedMusicData.value = null
  try { 
    const res = await resolveBestMatch(msg.name, msg.artist)
    if (res) {
      resolvedMusicData.value = { ...res, name: msg.name, artist: msg.artist } 
    }
  } catch (e) { 
    console.error(e) 
  } finally { 
    resolvingMusic.value = false 
  }
}

const playResolvedMusic = () => {
  if (resolvedMusicData.value) {
    musicState.playlist.splice(musicState.currentIndex + 1, 0, resolvedMusicData.value)
    musicState.currentIndex++
    loadSong(resolvedMusicData.value, true)
    window.dispatchEvent(new CustomEvent('sys-toast', { detail: '已开始播放' }))
  }
  activeMusicCard.value = null
}

const addResolvedMusicToQueue = () => {
  if (resolvedMusicData.value) {
    musicState.playlist.splice(musicState.currentIndex + 1, 0, resolvedMusicData.value)
    window.dispatchEvent(new CustomEvent('sys-toast', { detail: '已加入播放队列' }))
  }
  activeMusicCard.value = null
}

const toggleColistenFromMenu = () => { 
  toggleCoListen(props.chat.id)
  pushMessage(props.chat.id, { 
    role: 'system', 
    type: 'text', 
    content: musicState.coListenCharId === props.chat.id ? '你已开启一起听羁绊' : '你断开了羁绊' 
  }) 
}

const handleColistenReqClick = () => { 
  showColistenAlert.value = true 
}

const replyColisten = (accept) => {
  if (accept) { 
    toggleCoListen(props.chat.id)
    pushMessage(props.chat.id, { role: 'system', type: 'text', content: '[你接受了一起听邀请，并与对方连接同频]' }) 
  } else { 
    pushMessage(props.chat.id, { role: 'system', type: 'text', content: '[你直接拒绝了对方的一起听邀请]' }) 
  }
  showColistenAlert.value = false
}

let pressTimer = null
const actionSheet = ref({ show: false, msg: null })

const startPress = (msg) => { 
  if (!isSelectionMode.value) {
    pressTimer = setTimeout(() => { 
      actionSheet.value = { show: true, msg } 
    }, 500) 
  }
}

const clearPress = () => { 
  if (pressTimer) clearTimeout(pressTimer) 
}

const handleQuote = () => { 
  quotingText.value = actionSheet.value.msg.content
}

const handleEditOwnMsg = () => { 
  const newText = prompt('编辑消息：', actionSheet.value.msg.content)
  if (newText) {
    updateMessage(props.chat.id, actionSheet.value.msg.id, { content: newText })
  }
}

const handleRecallOwn = () => { 
  updateMessage(props.chat.id, actionSheet.value.msg.id, { 
    type: 'recalled', 
    oldContent: actionSheet.value.msg.content 
  })
}

const isSelectionMode = ref(false)
const selectedIds = ref([])

const cancelSelection = () => { 
  isSelectionMode.value = false
  selectedIds.value = [] 
}

const toggleSelect = (id) => { 
  if (!isSelectionMode.value) return
  const idx = selectedIds.value.indexOf(id)
  if (idx > -1) {
    selectedIds.value.splice(idx, 1)
  } else {
    selectedIds.value.push(id) 
  }
}

const deleteSelected = () => { 
  if (confirm(`确认删除选中的 ${selectedIds.length} 条消息吗？`)) { 
    removeMessages(props.chat.id, selectedIds.value)
    cancelSelection() 
  } 
}

const viewRecall = (oldContent) => { 
  alert.value = { 
    show: true, 
    type: 'view_recall', 
    title: '撤回的内容', 
    desc: oldContent, 
    inputs: null 
  } 
}

const alert = ref({ show: false, type: '', title: '', desc: '', inputs: null })

const openMenuAlert = (type) => {
  alert.value.type = type
  alert.value.desc = ''
  if (type === 'transfer') { 
    alert.value.title = '发起转账'
    alert.value.inputs = [{ placeholder: '金额 (￥)', value: '' }, { placeholder: '备注 (选填)', value: '' }] 
  } else if (type === 'location') { 
    alert.value.title = '发送位置'
    alert.value.inputs = [{ placeholder: '如：市中心广场', value: '' }] 
  } else if (type === 'voice') { 
    alert.value.title = '发送伪语音'
    alert.value.inputs = [{ placeholder: '你想说的话', value: '' }] 
  } else if (type === 'image') { 
    alert.value.title = '发送伪图片'
    alert.value.inputs = [{ placeholder: '视觉描述', value: '' }] 
  }
  alert.value.show = true
}

const handleAlertConfirm = () => {
  const t = alert.value.type
  const vals = alert.value.inputs.map(i => i.value)
  const baseObj = { role: 'user' }
  if (props.chat.isBlockedByAi) baseObj.isFailed = true
  
  if (t === 'transfer' && vals[0]) {
    pushMessage(props.chat.id, { ...baseObj, type: 'transfer', amount: vals[0], content: vals[1] || '转账', status: 'pending' })
  } else if (t === 'location' && vals[0]) {
    pushMessage(props.chat.id, { ...baseObj, type: 'location', content: vals[0] })
  } else if (t === 'voice' && vals[0]) {
    pushMessage(props.chat.id, { ...baseObj, type: 'voice', content: vals[0], showText: false })
  } else if (t === 'image' && vals[0]) {
    pushMessage(props.chat.id, { ...baseObj, type: 'image', content: vals[0] })
  }
  alert.value.show = false
  scrollToBottom()
}

let activeTransferMsg = null
const handleTransferClick = (msg) => {
  if (msg.status !== 'pending' || msg.role === 'user') return
  activeTransferMsg = msg
  alert.value = { 
    show: true, 
    type: 'receive_transfer', 
    title: `来自 ${props.chat.title} 的转账`, 
    desc: `金额：￥${msg.amount}\n备注：${msg.content || '无'}`, 
    inputs: null 
  }
}

const confirmReceiveTransfer = (action) => {
  if (!activeTransferMsg) return
  updateMessage(props.chat.id, activeTransferMsg.id, { status: action === 'accept' ? 'accepted' : 'rejected' })
  pushMessage(props.chat.id, { role: 'system', type: 'text', content: action === 'accept' ? '你已领取转账' : '你已退回转账' })
  pushMessage(props.chat.id, { role: 'user', type: 'transfer_reply', content: '', action: action })
  alert.value.show = false
  scrollToBottom()
}

const handleReRoll = () => {
  if (isWaiting.value) return 
  
  let lastUserIdx = -1
  for (let i = activeMessages.value.length - 1; i >= 0; i--) { 
    if (activeMessages.value[i].role === 'user') { 
      lastUserIdx = i
      break
    } 
  }
  
  if (lastUserIdx !== -1 && lastUserIdx < activeMessages.value.length - 1) {
    const idsToDelete = activeMessages.value.slice(lastUserIdx + 1).map(m => m.id)
    removeMessages(props.chat.id, idsToDelete)
    
    setTimeout(() => {
      triggerAiReply()
    }, 150)
  } else {
    triggerAiReply()
  }
}

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

const getChatCharacterIds = () => {
  if (!props.chat || !props.chat.participants) return []
  return props.chat.participants.map(c => c.id).filter(Boolean)
}

const getPrimaryCharacterId = () => {
  if (props.chat.participants && props.chat.participants[0]) return props.chat.participants[0].id
  return null
}

const buildPreviewText = (normalized) => {
  if (normalized.diary && normalized.diary.content) return normalized.diary.content
  if (!normalized.memories || normalized.memories.length === 0) return ''
  return normalized.memories.map((m, i) => `${i + 1}. ${m.content}`).join('\n')
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
  const isGroup = props.chat.isGroup
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
        await addStructuredMemoriesForCharacters(props.chat.id, characterIds, memObj)
      } else {
        if (!isGroup && !memObj.characterId && defaultCid) memObj.characterId = defaultCid
        await addStructuredMemory(props.chat.id, memObj)
      }
    }
  }

  if (normalized.diary && (normalized.diary.content || diaryOverrideText)) {
    const diaryText = diaryOverrideText && diaryOverrideText.trim() ? diaryOverrideText.trim() : normalized.diary.content
    if (diaryText && diaryText.trim()) {
      if (isGroup && characterIds.length > 0) {
        for (const cid of characterIds) {
          await addDiary(props.chat.id, { 
            characterId: cid,
            content: diaryText, 
            timestamp: normalized.diary.timestamp || Date.now(),
            date: normalized.diary.date || new Date().toLocaleString(),
            source: source,
            level: 1,
            isArchived: false
          })
          await handleDiaryRemind(cid)
          await applyDiaryAutoArchive(cid, props.chat.id)
        }
      } else {
        const cid = defaultCid
        await addDiary(props.chat.id, { 
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
          await applyDiaryAutoArchive(cid, props.chat.id)
        }
      }
    }
  }
}

const buildMemorySummaryPrompt = (basePrompt, diaryPrompt, historyText) => {
  const source = props.chat.isGroup ? 'group_chat' : 'chat'
  const now = new Date()
  const timeStr = now.toLocaleString('zh-CN', { hour12: false })
  let charInfo = ''
  if (props.chat.isGroup && props.chat.participants && props.chat.participants.length > 0) {
    charInfo = '群聊角色列表（必须用 character_id 归属）：\n' + props.chat.participants.map(c => `- ${c.name} (id: ${c.id})`).join('\n')
  } else if (props.chat.participants && props.chat.participants[0]) {
    charInfo = `当前角色 id: ${props.chat.participants[0].id}`
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
2. group_chat 必须填写 character_id。
3. timestamp 为毫秒，date 使用本地可读时间。`

  return `${basePrompt || ''}\n${diaryHint}\n当前时间：${timeStr}\n${charInfo ? charInfo + '\n' : ''}\n${schema}\n\n【近期对话记录】\n${historyText}`
}

const confirmAutoSummary = async () => {
  if (!pendingAutoSummary.value) return
  if (pendingAutoSummaryPayload.value) {
    const source = props.chat.isGroup ? 'group_chat' : 'chat'
    await saveParsedSummary(pendingAutoSummaryPayload.value, null, source)
    window.dispatchEvent(new CustomEvent('sys-toast', { detail: '自动总结已成功归档' }))
    pendingAutoSummaryPayload.value = null
    pendingAutoSummary.value = null
    return
  }
  await addMemory(props.chat.id, { 
    date: new Date().toLocaleString(), 
    text: pendingAutoSummary.value 
  })
  window.dispatchEvent(new CustomEvent('sys-toast', { detail: '自动总结已成功归档' }))
  pendingAutoSummary.value = null
}

const checkAndRunAutoSummary = async () => {
  const count = Number(props.chat.settings?.autoSummaryCount) || 0
  if (count <= 0) return
  
  const aiMsgs = activeMessages.value.filter(m => m.role === 'ai')
  if (aiMsgs.length > 0 && aiMsgs.length % count === 0) {
    try {
      const historyText = activeMessages.value.slice(-count * 2)
        .filter(m => m.role !== 'system')
        .map(m => `${m.role === 'ai' ? 'AI' : 'User'}: ${m.content}`)
        .join('\n')

      const primaryId = getPrimaryCharacterId()
      const settings = primaryId ? getMemorySettings(primaryId) : getMemorySettings(null)
      const basePrompt = settings.summaryPrompt || props.chat.settings.summaryPrompt
      const diaryPrompt = settings.diaryPrompt || ''

      const finalPrompt = buildMemorySummaryPrompt(basePrompt, diaryPrompt, historyText)
      
      const res = await fetch(apiUrl.value, { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${apiKey.value}` 
        }, 
        body: JSON.stringify({ 
          model: apiModel.value, 
          messages: [{ role: 'user', content: finalPrompt }] 
        }) 
      })
      
      if (res.ok) {
        const data = await res.json()
        const rawText = data.choices[0].message?.content?.trim() || ''
        const parsed = parseMemoryJson(rawText)
        const normalized = normalizeParsedResult(parsed, props.chat.isGroup ? 'group_chat' : 'chat')
        const previewText = buildPreviewText(normalized)
        
        // 核心修改：把 JSON 字符串直接拼接到文本里展示在自动总结弹窗中
        const jsonStr = extractJsonString(rawText) || rawText

        if (previewText) {
          pendingAutoSummary.value = `【提取内容预览】\n${previewText}\n\n【原始 JSON 返回】\n${jsonStr}`
          pendingAutoSummaryPayload.value = normalized
        } else if (rawText) {
          pendingAutoSummary.value = rawText
        }
      }
    } catch (e) { 
      console.error('总结失败', e) 
    }
  }
}

const copyErrorJson = () => { 
  navigator.clipboard.writeText(apiErrorDetails.value)
  window.dispatchEvent(new CustomEvent('sys-toast', { detail: '报错详情已复制' })) 
}

const triggerAiReply = async () => {
  if (isWaiting.value) return
  isWaiting.value = true
  scrollToBottom()

  try {
    if (!apiKey.value) throw new Error('未设置 API 密钥')
    
    const contextLimit = Number(props.chat.settings?.statusContextCount ?? 1);
    let aiMsgCount = 0;
    
    const messagesForApi = activeMessages.value.map(m => ({ ...m }));
    
    for (let i = messagesForApi.length - 1; i >= 0; i--) {
      const msg = messagesForApi[i];
      if (msg.role === 'ai') {
        if (msg.rawStatus) {
          if (aiMsgCount < contextLimit) {
            msg.content = msg.content + '\n\n' + msg.rawStatus;
          }
        }
        aiMsgCount++;
      }
    }

    const apiMessages = buildApiMessages(props.chat, messagesForApi, activeMemories.value, activeDiaries.value)
    
    apiLog.value.reqTokens = Math.ceil(apiMessages.map(m => m.content).join('').length / 4)
    apiLog.value.req = JSON.parse(JSON.stringify(apiMessages))
    apiLog.value.time = new Date().toLocaleTimeString()

    const response = await fetch(apiUrl.value, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${apiKey.value}` 
      },
      body: JSON.stringify({ 
        model: apiModel.value, 
        messages: apiMessages 
      })
    })

    if (!response.ok) {
      let errTxt = `API 拒绝访问: HTTP ${response.status} (${response.statusText})`;
      try {
        const errText = await response.text();
        try {
          const errObj = JSON.parse(errText);
          if (errObj.error && errObj.error.message) {
            errTxt += `\n\n【错误详情】\n${errObj.error.message}`;
          } else {
            errTxt += `\n\n【返回参数】\n${JSON.stringify(errObj, null, 2)}`;
          }
        } catch (e) {
          if (errText) errTxt += `\n\n【原始报文】\n${errText}`;
        }
      } catch (e) {}
      throw new Error(errTxt);
    }
    
    const data = await response.json()
    let rawText = data.choices[0].message?.content || ''
    
    apiLog.value.res = rawText
    apiLog.value.resTokens = Math.ceil(rawText.length / 4)

    const statusRegex = /<statue_update>([\s\S]*?)<\/statue_update>/gi
    let match
    while ((match = statusRegex.exec(rawText)) !== null) {
      const innerXml = match[1].trim()
      const tagRegex = /<([^>]+)>([^<]+)<\/\1>/g
      let tagMatch
      while ((tagMatch = tagRegex.exec(innerXml)) !== null) {
        props.chat.variablesState[tagMatch[1]] = tagMatch[2].trim()
      }
    }
    rawText = rawText.replace(statusRegex, '').trim()

    const msgRegex = /<msg(?:[^>]*)>([\s\S]*?)<\/msg>/gi
    const matches = [...rawText.matchAll(msgRegex)]

    if (matches.length > 0) {
      const trailingText = rawText.replace(msgRegex, '').trim()
      
      matches.forEach((m, index) => {
        const attrRegex = /(\w+)="([^"]+)"/g
        let attrs = {}
        let attrMatch
        while ((attrMatch = attrRegex.exec(m[0])) !== null) {
          attrs[attrMatch[1]] = attrMatch[2]
        }
        
        const mType = attrs.type || 'text'
        const mRef = attrs.ref || ''
        const mAmount = attrs.amount || ''
        const mAction = attrs.action || ''
        const mName = attrs.name || ''
        const mArtist = attrs.artist || ''
        let mContent = m[1].trim()
        
        if (mType === 'sys_action') {
          if (mAction === 'block') {
            props.chat.isBlockedByAi = true
            pushMessage(props.chat.id, { role: 'system', type: 'text', content: '[系统提示：对方开启了好友验证，你还不是他(她)朋友。请先发送朋友验证请求，对方验证通过后，才能聊天。]' })
          } else if (mAction === 'unblock') {
            props.chat.isBlockedByAi = false
            pushMessage(props.chat.id, { role: 'system', type: 'text', content: '[系统提示：对方已将你移出黑名单。]' })
          } else if (mAction === 'invite_meeting') {
            alert.value = {
              show: true,
              type: 'invite_meeting',
              title: '线下邀约',
              desc: `${props.chat.title} 突然邀请你线下见面，是否接受？`,
              inputs: null
            }
          } else if (mAction === 'add_friend') {
            addFriendRequest(props.chat.id, mContent)
            window.dispatchEvent(new CustomEvent('sys-toast', { detail: '收到了一条新的好友申请验证' }))
            if (props.chat.isBlocked) {
              pushMessage(props.chat.id, { role: 'system', type: 'text', content: `[拦截的对方动作] 对方尝试发来好友验证请求：${mContent}` })
            }
          }
          return 
        }

        if (props.chat.isBlocked && mType !== 'sys_action') {
          if (mType === 'text') mContent = `[被系统拦截] ${mContent}`
          else if (mType === 'voice') mContent = `[拦截的对方语音] ${mContent}`
          else if (mType === 'image') mContent = `[拦截的对方图片] ${mContent}`
          else if (mType === 'transfer') mContent = `[拦截的对方转账] ${mContent}`
        }

        const tempId = Date.now() + Math.random()
        
        const baseMsgObj = { id: tempId, role: 'ai', type: mType, refText: mRef, content: mContent }
        if (index === matches.length - 1 && trailingText) {
          baseMsgObj.rawStatus = trailingText;
        }

        if (mType === 'recall') {
          pushMessage(props.chat.id, { ...baseMsgObj, type: 'recall_pending' })
          setTimeout(() => { 
            updateMessage(props.chat.id, tempId, { type: 'recalled', oldContent: mContent }) 
          }, 1500)
        } else if (mType === 'transfer') {
          pushMessage(props.chat.id, { ...baseMsgObj, amount: mAmount, status: 'pending' })
        } else if (mType === 'transfer_reply') {
          const pendingMsg = activeMessages.value.slice().reverse().find(m => m.type === 'transfer' && m.status === 'pending')
          if (pendingMsg) {
            updateMessage(props.chat.id, pendingMsg.id, { status: mAction === 'accept' ? 'accepted' : 'rejected' })
          }
          pushMessage(props.chat.id, { role: 'system', type: 'text', content: mAction === 'accept' ? '对方已领取转账' : '对方已退回转账' })
        } else if (mType === 'voice') {
          pushMessage(props.chat.id, { ...baseMsgObj, showText: false })
        } else if (mType === 'music_share' || mType === 'music_cmd') {
          pushMessage(props.chat.id, { ...baseMsgObj, name: mName, artist: mArtist })
          if (mType === 'music_cmd' && mAction === 'play' && mName) {
            playSpecific({ name: mName, artist: mArtist })
          }
        } else if (mType === 'music_colisten_req') {
          pushMessage(props.chat.id, { ...baseMsgObj, type: 'music_colisten_req' })
        } else {
          pushMessage(props.chat.id, baseMsgObj)
        }
      })
    } else if (rawText.length > 0) {
      if (props.chat.isBlocked) rawText = `[被系统拦截] ${rawText}`
      pushMessage(props.chat.id, { role: 'ai', type: 'text', content: rawText })
    }
    
    window.dispatchEvent(new CustomEvent('sys-toast', { detail: '已收到回复' }))
    checkAndRunAutoSummary()

  } catch (error) { 
    apiErrorDetails.value = error.message 
  } finally { 
    isWaiting.value = false
    scrollToBottom() 
  }
}
</script>

<style scoped>
.chat-area { flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; background: var(--bg-color); position: relative; }
</style>
