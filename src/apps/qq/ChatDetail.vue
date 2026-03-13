<template>
  <div style="display:flex; flex-direction:column; flex:1; overflow:hidden; position:relative;">
    
    <component :is="'style'" v-if="chat.customCss">{{ chat.customCss }}</component>
    <component :is="'style'" v-if="musicState.customLyricCss">{{ musicState.customLyricCss }}</component>

    <div class="app-header" style="padding-top: env(safe-area-inset-top, 40px); min-height: calc(env(safe-area-inset-top, 40px) + 50px);">
      <div class="btn-back" @click="$emit('exit')" v-if="!isSelectionMode">
        <i class="fas fa-chevron-left"></i>
      </div>
      <div class="btn-back" @click="cancelSelection" v-else>
        取消
      </div>
      
      <div class="app-title">{{ isSelectionMode ? `已选择 ${selectedIds.length} 项` : chat.title }}</div>
      
      <div class="header-right" style="display:flex; gap:15px; align-items:center;">
        <i v-if="!isSelectionMode" class="fas fa-terminal" style="font-size:14px; color:var(--text-sub);" @click="showDebugPanel = true"></i>
        <i v-if="!isSelectionMode" class="fas fa-cog" style="font-size:16px; color:var(--text-sub);" @click="showSettings = true"></i>
      </div>
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

    <ChatBottomBar 
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
    />

    <div class="ios-alert-mask" v-if="activeMusicCard" @click.self="activeMusicCard = null">
      <div class="music-action-popup">
        <div class="music-action-cover" :style="resolvedMusicData ? `background-image:url(${resolvedMusicData.cover})` : ''">
          <i v-if="resolvingMusic" class="fas fa-spinner fa-spin" style="font-size:30px; color:#fff;"></i>
        </div>
        <div class="music-action-info" style="margin-bottom: 20px;">
          <div style="font-size:18px; font-weight:700; color:#333;">{{ activeMusicCard.name }}</div>
          <div style="font-size:12px; color:#888;">{{ activeMusicCard.artist }}</div>
        </div>
        <div class="music-action-btns">
          <button class="m-btn m-play" @click="playResolvedMusic" :disabled="!resolvedMusicData">
            <i class="fas fa-play"></i> 立即播放
          </button>
          <button class="m-btn m-add" @click="addResolvedMusicToQueue" :disabled="!resolvedMusicData">
            <i class="fas fa-plus"></i> 加入歌单
          </button>
        </div>
        <div class="music-action-cancel" @click="activeMusicCard = null">取消</div>
      </div>
    </div>

    <div class="ios-alert-mask" v-if="showLocalMusicPicker" @click.self="showLocalMusicPicker = false">
      <div class="ios-alert" style="width: 300px; padding: 0;">
        <div class="ios-alert-title" style="padding: 15px;">从播放列表选取分享</div>
        <div style="max-height: 250px; overflow-y: auto; text-align: left; padding: 0 15px 15px;">
           <div v-if="musicState.playlist.length === 0" style="color:#888; font-size:12px; text-align:center; padding: 20px 0;">
             暂无歌曲，请先去音乐App搜索
           </div>
           <div v-for="(song, idx) in musicState.playlist" :key="idx" class="local-music-item" @click="sendMusicShare(song)">
             <div class="l-name">{{ song.name }}</div>
             <div class="l-artist">{{ song.artist }}</div>
           </div>
        </div>
        <div class="ios-alert-actions">
          <div class="ios-alert-btn" @click="showLocalMusicPicker = false">取消</div>
        </div>
      </div>
    </div>

    <div class="ios-alert-mask" v-if="showColistenAlert" @click.self="showColistenAlert = false">
      <div class="ios-alert">
        <div class="ios-alert-title">
          <i class="fas fa-headphones" style="color:#5c8aff;"></i> 一起听邀请
        </div>
        <div class="ios-alert-desc" style="margin-top:10px;">
          {{ chat.title }} 邀请你进入“一起听”状态，是否接受？
        </div>
        <div class="ios-alert-actions">
          <div class="ios-alert-btn danger" @click="replyColisten(false)">直接拒绝</div>
          <div class="ios-alert-btn bold" @click="replyColisten(true)">接受同频</div>
        </div>
      </div>
    </div>

    <div class="ios-alert-mask" v-if="!!apiErrorDetails" @click.self="apiErrorDetails = null">
      <div class="ios-alert">
        <div class="ios-alert-title" style="color:#ff5252; padding-top:20px;">
          <i class="fas fa-bug"></i> AI 核心过载
        </div>
        <div class="ios-alert-desc">大模型接口抛出了异常，回复中断。</div>
        <div style="padding: 0 15px 15px;">
          <textarea readonly class="error-textarea">{{ apiErrorDetails }}</textarea>
        </div>
        <div class="ios-alert-actions">
          <div class="ios-alert-btn" @click="copyErrorJson">复制信息</div>
          <div class="ios-alert-btn bold" @click="apiErrorDetails = null">关闭</div>
        </div>
      </div>
    </div>

    <div class="ios-alert-mask" v-if="alert.show" @click.self="alert.show = false">
      <div class="ios-alert">
        <i v-if="alert.type === 'receive_transfer'" class="fas fa-exchange-alt transfer-icon-large"></i>
        <div class="ios-alert-title">{{ alert.title }}</div>
        
        <div class="ios-alert-desc" v-if="alert.type === 'view_recall'">{{ alert.desc }}</div>
        <div class="ios-alert-desc" v-else-if="alert.desc" style="white-space: pre-wrap; font-size: 14px;">{{ alert.desc }}</div>
        
        <div class="ios-alert-inputs" v-if="alert.inputs">
          <input v-for="(inp, i) in alert.inputs" :key="i" class="ios-alert-input" v-model="inp.value" :placeholder="inp.placeholder" :type="inp.type || 'text'" />
        </div>
        
        <div class="ios-alert-actions">
          <template v-if="alert.type === 'view_recall'">
            <div class="ios-alert-btn bold" style="width:100%; border:none;" @click="alert.show = false">我知道了</div>
          </template>
          <template v-else-if="alert.type === 'receive_transfer'">
            <div class="ios-alert-btn" @click="alert.show = false">取消</div>
            <div class="ios-alert-btn danger" @click="confirmReceiveTransfer('reject')">退回</div>
            <div class="ios-alert-btn bold" @click="confirmReceiveTransfer('accept')">领取</div>
          </template>
          <template v-else>
            <div class="ios-alert-btn" @click="alert.show = false">取消</div>
            <div class="ios-alert-btn bold" @click="handleAlertConfirm">确认发送</div>
          </template>
        </div>
      </div>
    </div>

    <div class="ios-action-sheet-mask" v-if="actionSheet.show" @click.self="actionSheet.show = false">
      <div class="ios-action-sheet">
        <div class="ios-action-group">
          <div class="ios-action-btn" @click="handleQuote">引用</div>
          <div class="ios-action-btn" v-if="actionSheet.msg.role === 'user'" @click="handleEditOwnMsg">编辑</div>
          <div class="ios-action-btn" v-if="actionSheet.msg.role === 'user' && actionSheet.msg.type !== 'recalled'" @click="handleRecallOwn">撤回</div>
          <div class="ios-action-btn danger" @click="isSelectionMode = true; actionSheet.show = false">多选</div>
        </div>
        <div class="ios-action-cancel" @click="actionSheet.show = false">取消</div>
      </div>
    </div>

    <MemoryPanel :show="showMemoryPanel" :chat="chat" @close="showMemoryPanel = false" />
    <ChatSettingsPage :show="showSettings" :chat="chat" @close="showSettings = false" @edit-character="(id) => { showSettings = false; $emit('edit-character', id); }" />
    <DebugPanel :show="showDebugPanel" :logData="apiLog" @close="showDebugPanel = false" />
    <SummaryPanel :show="showSummaryPanel" :chat="chat" @close="showSummaryPanel = false" />
    <StatusPanel :show="showStatusPanel" :msg="activeStatusMsg" :chat="chat" @close="showStatusPanel = false" />

  </div>
</template>

<script setup>
import { ref, nextTick, watch, onMounted, computed } from 'vue'
import { useApi } from '@/composables/useApi'
import { usePromptOrder } from '@/composables/usePromptOrder'
import { useChatSessions } from '@/composables/useChatSessions'
import { useProfile } from '@/composables/useProfile'
import { useCharacters } from '@/composables/useCharacters'
import { useMusic } from '@/composables/useMusic' 
import { useMusicApi } from '@/composables/useMusicApi'

import ChatMessageItem from './components/ChatMessageItem.vue'
import ChatBottomBar from './components/ChatBottomBar.vue'

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
const { activeMessages, loadSessionData, pushMessage, updateMessage, removeMessages, addMemory, activeMemories } = useChatSessions()
const { userProfile } = useProfile()
const { getCharById } = useCharacters()
const { musicState, loadSong, toggleCoListen, playSpecific } = useMusic()
const { resolveBestMatch } = useMusicApi()

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

onMounted(async () => { 
  await loadSessionData(props.chat.id)
  scrollToBottom()
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

const handleSendText = (txt) => {
  const msgObj = { 
    role: 'user', 
    type: quotingText.value ? 'quote' : 'text', 
    content: txt 
  }
  if (quotingText.value) {
    msgObj.refText = quotingText.value
  }
  pushMessage(props.chat.id, msgObj)
  quotingText.value = ''
  scrollToBottom()
}

const sendSticker = (name) => { 
  pushMessage(props.chat.id, { role: 'user', type: 'sticker', content: name })
  scrollToBottom() 
}

const sendMusicShare = (song) => { 
  pushMessage(props.chat.id, { 
    role: 'user', 
    type: 'music_share', 
    name: song.name, 
    artist: song.artist, 
    content: '我想和你分享这首歌~' 
  })
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
  actionSheet.value.show = false 
}

const handleEditOwnMsg = () => { 
  const newText = prompt('编辑消息：', actionSheet.value.msg.content)
  if (newText) {
    updateMessage(props.chat.id, actionSheet.value.msg.id, { content: newText })
  }
  actionSheet.value.show = false 
}

const handleRecallOwn = () => { 
  updateMessage(props.chat.id, actionSheet.value.msg.id, { 
    type: 'recalled', 
    oldContent: actionSheet.value.msg.content 
  })
  actionSheet.value.show = false 
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
  if (t === 'transfer' && vals[0]) {
    pushMessage(props.chat.id, { role: 'user', type: 'transfer', amount: vals[0], content: vals[1] || '转账', status: 'pending' })
  } else if (t === 'location' && vals[0]) {
    pushMessage(props.chat.id, { role: 'user', type: 'location', content: vals[0] })
  } else if (t === 'voice' && vals[0]) {
    pushMessage(props.chat.id, { role: 'user', type: 'voice', content: vals[0], showText: false })
  } else if (t === 'image' && vals[0]) {
    pushMessage(props.chat.id, { role: 'user', type: 'image', content: vals[0] })
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
    triggerAiReply()
  } else {
    window.dispatchEvent(new CustomEvent('sys-toast', { detail: '没有可重摇的回复' }))
  }
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
        
      const finalPrompt = props.chat.settings.summaryPrompt + `\n\n【近期记录】\n${historyText}`
      
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
        await addMemory(props.chat.id, { 
          date: new Date().toLocaleString(), 
          text: data.choices[0].message?.content?.trim() || '' 
        })
        window.dispatchEvent(new CustomEvent('sys-toast', { detail: '聊天记忆已自动归档' }))
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

    const apiMessages = buildApiMessages(props.chat, messagesForApi, activeMemories.value)
    
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

    // ===== 核心增强：HTTP 错误捕获引擎 =====
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
    // ========================================
    
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
.local-music-item { padding: 10px 0; border-bottom: 1px solid #f0f0f0; cursor: pointer; }
.local-music-item:active { background: #f9f9f9; }
.l-name { font-size: 14px; font-weight: 600; color: #333; }
.l-artist { font-size: 11px; color: #888; margin-top: 2px; }
.music-action-popup { background: #fff; border-radius: 24px; padding: 25px 20px; width: max-content; min-width: 260px; max-width: 85vw; box-sizing: border-box; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.1); display: flex; flex-direction: column; }
.music-action-cover { width: 140px; height: 140px; border-radius: 16px; background: #e0e0e0; margin: 0 auto; background-size: cover; background-position: center; box-shadow: 0 10px 20px rgba(0,0,0,0.1); display: flex; justify-content: center; align-items: center; }
.m-btn { flex: 1; padding: 12px 0; border: none; border-radius: 12px; font-weight: 600; font-size: 14px; cursor: pointer; white-space: nowrap; }
.m-play { background: #5c8aff; color: #fff; }
.m-add { background: #f4f5f7; color: #333; }
.m-btn:disabled { opacity: 0.5; pointer-events: none; }
.music-action-cancel { margin-top: 15px; font-size: 12px; color: #888; cursor: pointer; padding: 5px; }
.music-action-btns { display: flex; gap: 10px; width: 100%; }
.ios-alert-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 999999; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(5px); }
.ios-alert { background: rgba(255,255,255,0.95); width: 280px; border-radius: 18px; text-align: center; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
.ios-alert-title { font-size: 16px; font-weight: 600; padding: 20px 20px 5px; color: #000; }
.ios-alert-desc { font-size: 13px; color: #555; padding: 0 20px 15px; }
.ios-alert-inputs { padding: 0 15px 15px; display: flex; flex-direction: column; gap: 8px; }
.ios-alert-input { width: 100%; box-sizing: border-box; background: rgba(0,0,0,0.05); border: 1px solid rgba(0,0,0,0.1); border-radius: 8px; padding: 10px; font-size: 13px; outline: none; }
.ios-alert-actions { display: flex; border-top: 1px solid rgba(0,0,0,0.1); }
.ios-alert-btn { flex: 1; padding: 12px 0; font-size: 16px; color: #007aff; cursor: pointer; border-right: 1px solid rgba(0,0,0,0.1); }
.ios-alert-btn:last-child { border-right: none; }
.ios-alert-btn:active { background: rgba(0,0,0,0.05); }
.ios-alert-btn.bold { font-weight: 600; }
.ios-alert-btn.danger { color: #ff3b30; }
.error-textarea { width: 100%; height: 150px; background: rgba(0,0,0,0.05); border: 1px solid rgba(0,0,0,0.1); border-radius: 8px; padding: 10px; font-size: 12px; color: #ff5252; outline: none; resize: none; font-family: monospace; }
</style>
