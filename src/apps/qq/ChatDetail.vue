<template>
  <div style="display:flex; flex-direction:column; flex:1; overflow:hidden; position:relative;">
    
    <component :is="'style'" v-if="chat.customCss">{{ chat.customCss }}</component>

    <div class="app-header">
      <div class="btn-back" @click="$emit('exit')" v-if="!isSelectionMode">
        <i class="fas fa-chevron-left"></i>
      </div>
      <div class="btn-back" @click="cancelSelection" v-else>取消</div>
      
      <div class="app-title">{{ isSelectionMode ? `已选择 ${selectedIds.length} 项` : chat.title }}</div>
      
      <div class="header-right" style="display:flex; gap:15px; align-items:center;">
        <i v-if="!isSelectionMode" class="fas fa-terminal" style="font-size:14px; color:var(--text-sub);" @click="showDebugPanel = true"></i>
        <i v-if="!isSelectionMode" class="fas fa-cog" style="font-size:16px; color:var(--text-sub);" @click="showSettings = true"></i>
      </div>
    </div>

    <!-- 动态聊天区背景 -->
    <div class="chat-area" ref="chatBox" :style="chat.bgImage ? { backgroundImage: `url(${chat.bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}">
      <div v-if="chat.bgImage" style="position:absolute; top:0; left:0; right:0; bottom:0; background:rgba(255,255,255,0.2); pointer-events:none; z-index:0;"></div>

      <template v-for="(msg, index) in visibleMessages" :key="msg.id">
        <div style="position:relative; z-index:1; width:100%;">
          
          <div class="msg-time" v-if="checkShowTime(index)">{{ formatMsgTime(msg) }}</div>

          <div v-if="msg.role === 'system'" class="msg-system">{{ msg.content }}</div>
          
          <div v-else-if="msg.type === 'recalled'" class="msg-recall">
            "{{ msg.role === 'user' ? '你' : chat.title || '对方' }}" 撤回了一条消息
            <span v-if="msg.oldContent" style="color:#5c8aff; cursor:pointer; margin-left:4px;" @click="viewRecall(msg.oldContent)">查看原话</span>
          </div>

          <div v-else-if="msg.type === 'transfer_reply' || msg.type === 'action'" style="display:none;"></div>
          
          <div v-else :class="['msg-row-wrap', { 'selectable': isSelectionMode }]" @click="toggleSelect(msg.id)">
            <div class="msg-checkbox" :class="{ 'checked': selectedIds.includes(msg.id) }" v-if="isSelectionMode"></div>

            <div :class="['msg-row', msg.role === 'user' ? 'is-user' : 'is-ai']">
              <div class="msg-avatar" :style="getAvatarStyle(msg.role)">{{ getAvatarInitials(msg.role) }}</div>
              
              <div class="msg-content-wrapper">
                <div v-if="msg.refText" class="msg-quote"><i class="fas fa-quote-left" style="color:#ccc; margin-right:4px;"></i> {{ msg.refText }}</div>
                
                <template v-if="msg.type === 'transfer'">
                  <div :class="['msg-bubble is-transfer', msg.status]" 
                       @touchstart="startPress(msg)" @touchend="clearPress" @mousedown="startPress(msg)" @mouseup="clearPress"
                       @click.stop="handleTransferClick(msg)">
                    <i :class="msg.status === 'accepted' ? 'fas fa-check-circle' : msg.status === 'rejected' ? 'fas fa-times-circle' : 'fas fa-exchange-alt'"></i>
                    <div>
                      <div class="amt" :style="msg.status === 'rejected' ? 'color:#888;' : ''">￥{{ msg.amount }}</div>
                      <div class="desc" :style="msg.status === 'rejected' ? 'color:#888;' : ''">{{ msg.status === 'accepted' ? '已被领取' : msg.status === 'rejected' ? '已退回' : msg.content || '转账' }}</div>
                    </div>
                  </div>
                </template>

                <template v-else-if="msg.type === 'location'">
                  <div class="msg-bubble is-location" @touchstart="startPress(msg)" @touchend="clearPress" @mousedown="startPress(msg)" @mouseup="clearPress">
                    <i class="fas fa-map-marker-alt"></i><span>{{ msg.content }}</span>
                  </div>
                </template>

                <template v-else-if="msg.type === 'image' || msg.type === 'sticker'">
                  <div class="msg-bubble is-image" @touchstart="startPress(msg)" @touchend="clearPress" @mousedown="startPress(msg)" @mouseup="clearPress">
                    <img v-if="msg.type === 'sticker' && getStickerUrl(msg.content)" :src="getStickerUrl(msg.content)" class="real-sticker" />
                    <div v-else class="msg-pseudo-img">
                      <i :class="msg.type === 'sticker' ? 'fas fa-smile-wink' : 'fas fa-image'" style="font-size:24px; margin-bottom:8px; display:block;"></i>
                      [{{ msg.type === 'sticker' ? '表情包' : '图片' }}] <br/> {{ msg.content }}
                    </div>
                  </div>
                </template>

                <template v-else-if="msg.type === 'voice'">
                  <div class="msg-bubble is-voice" 
                       @touchstart="startPress(msg)" @touchend="clearPress" @mousedown="startPress(msg)" @mouseup="clearPress"
                       @click.stop="msg.showText = !msg.showText" :style="{ width: Math.min(60 + msg.content.length * 5, 200) + 'px' }">
                    <i class="fas fa-wifi" style="transform: rotate(90deg); color: #888;"></i>
                  </div>
                  <div v-if="msg.showText" class="voice-text">{{ msg.content }}</div>
                </template>

                <template v-else-if="msg.type === 'text' || msg.type === 'quote' || !msg.type">
                  <div :class="['msg-bubble']" 
                       @touchstart="startPress(msg)" @touchend="clearPress" @mousedown="startPress(msg)" @mouseup="clearPress">
                    <span v-html="msg.content"></span>
                  </div>
                </template>
                
                <template v-else>
                  <div style="display:none;"></div>
                </template>
                
              </div>
            </div>
          </div>
        </div>
      </template>

      <div v-if="isWaiting" class="msg-row is-ai" style="position:relative; z-index:1; width:100%;">
        <div class="msg-avatar" :style="getAvatarStyle('ai')">{{ getAvatarInitials('ai') }}</div>
        <div class="msg-content-wrapper"><div class="msg-bubble"><i class="fas fa-circle-notch fa-spin"></i></div></div>
      </div>
    </div>

    <!-- 底部输入栏 -->
    <div class="chat-input-area" style="flex-direction:column; padding: 10px 15px calc(15px + env(safe-area-inset-bottom, 0px)); gap:10px; position:relative; z-index:20;">
      
      <div v-if="isSelectionMode" style="display:flex; justify-content:space-around; padding:10px 0;">
        <i class="fas fa-trash" style="font-size:20px; color:#ff5252;" @click="deleteSelected"></i>
      </div>
      
      <div v-else style="display:flex; gap:8px; align-items:center; width:100%;">
        <div class="action-icon-btn" style="background:#eef2ff; color:#5c8aff; border-radius:50%; width:36px; height:36px; font-size:16px;" @click="triggerAiReply">
          <i class="fas fa-robot"></i>
        </div>

        <div v-if="quotingText" style="position:absolute; top:-40px; left:15px; right:15px; background:rgba(240,240,240,0.9); padding:8px 15px; border-radius:10px; font-size:11px; color:#666; display:flex; justify-content:space-between; box-shadow:0 2px 10px rgba(0,0,0,0.05);">
          <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">引用：{{ quotingText }}</span>
          <i class="fas fa-times" style="cursor:pointer;" @click="quotingText = ''"></i>
        </div>

        <input type="text" class="chat-input" v-model="inputText" @keyup.enter="handleSendLocal" placeholder="输入消息..." style="flex:1; min-width:0;" />
        
        <div class="action-icon-btn" @click="toggleStickerPanel">
          <i class="fas fa-smile-wink"></i>
        </div>

        <button v-if="inputText.trim()" class="btn-send" style="height:36px; border-radius:18px; padding:0 14px; flex-shrink:0;" @click="handleSendLocal">发送</button>
        <div v-else class="action-icon-btn" @click="toggleMorePanel" style="border:1px solid #ddd; border-radius:50%; width:36px; height:36px; font-size:16px;">
          <i class="fas fa-plus"></i>
        </div>
      </div>

      <!-- 高级多分组表情包抽屉 -->
      <div v-if="showStickerPanel" class="sticker-panel-wrapper">
        <div v-if="stickerGroups.length === 0" style="text-align:center; color:#888; font-size:12px; margin-top:50px;">
          暂无全局表情包。<br>请在外观或设置的全局管理中添加。
        </div>
        <template v-else>
          <div class="sticker-content">
            <div class="drawer-item" v-for="(st, idx) in currentStickerGroup.stickers" :key="idx" @click="sendSticker(st.name)">
              <div class="sticker-item-img" :style="st.url ? `background-image:url(${st.url})` : ''">
                <i v-if="!st.url" class="fas fa-image" style="color:#ddd; font-size:24px;"></i>
              </div>
              <span style="font-size:10px; color:#666; width:100%; text-align:center; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{{ st.name }}</span>
            </div>
          </div>
          <div class="sticker-tabs">
            <div 
              class="sticker-tab" 
              v-for="g in stickerGroups" 
              :key="g.id"
              :class="{ active: activeStickerGroupId === g.id }"
              @click="activeStickerGroupId = g.id"
            >
              {{ g.name }}
            </div>
          </div>
        </template>
      </div>

      <div v-if="showMorePanel" class="bottom-drawer" style="background:#fff; border-top:none;">
        <div class="drawer-item" @click="openAlert('image')">
          <div style="width:50px; height:50px; background:#f4f5f7; border-radius:14px; display:flex; justify-content:center; align-items:center; font-size:20px; color:#666;"><i class="fas fa-image"></i></div><span style="font-size:11px; color:#888;">图片</span>
        </div>
        <div class="drawer-item" @click="openAlert('voice')">
          <div style="width:50px; height:50px; background:#f4f5f7; border-radius:14px; display:flex; justify-content:center; align-items:center; font-size:20px; color:#666;"><i class="fas fa-microphone"></i></div><span style="font-size:11px; color:#888;">语音</span>
        </div>
        <div class="drawer-item" @click="openAlert('transfer')">
          <div style="width:50px; height:50px; background:#f4f5f7; border-radius:14px; display:flex; justify-content:center; align-items:center; font-size:20px; color:#666;"><i class="fas fa-exchange-alt"></i></div><span style="font-size:11px; color:#888;">转账</span>
        </div>
        <div class="drawer-item" @click="openAlert('location')">
          <div style="width:50px; height:50px; background:#f4f5f7; border-radius:14px; display:flex; justify-content:center; align-items:center; font-size:20px; color:#666;"><i class="fas fa-map-marker-alt"></i></div><span style="font-size:11px; color:#888;">位置</span>
        </div>
        <div class="drawer-item" @click="showMemoryPanel = true; showMorePanel = false">
          <div style="width:50px; height:50px; background:#f4f5f7; border-radius:14px; display:flex; justify-content:center; align-items:center; font-size:20px; color:#666;"><i class="fas fa-book"></i></div><span style="font-size:11px; color:#888;">查看记忆</span>
        </div>
        <div class="drawer-item" @click="showSummaryPanel = true; showMorePanel = false">
          <div style="width:50px; height:50px; background:#eef2ff; border-radius:14px; display:flex; justify-content:center; align-items:center; font-size:20px; color:#5c8aff;"><i class="fas fa-magic"></i></div><span style="font-size:11px; color:#5c8aff; font-weight:600;">聊天总结</span>
        </div>
        <div class="drawer-item" @click="handleReRoll">
          <div style="width:50px; height:50px; background:#fff3f3; border-radius:14px; display:flex; justify-content:center; align-items:center; font-size:20px; color:#ff5252;"><i class="fas fa-dice"></i></div><span style="font-size:11px; color:#ff5252; font-weight:600;">重摇回复</span>
        </div>
      </div>
    </div>

    <!-- 弹窗/抽屉组件全挂载 -->
    <MemoryPanel :show="showMemoryPanel" :chat="chat" @close="showMemoryPanel = false" />
    <ChatSettingsPage :show="showSettings" :chat="chat" @close="showSettings = false" @edit-character="(id) => { showSettings = false; $emit('edit-character', id); }" />
    <DebugPanel :show="showDebugPanel" :logData="apiLog" @close="showDebugPanel = false" />
    <SummaryPanel :show="showSummaryPanel" :chat="chat" @close="showSummaryPanel = false" />

    <!-- Action Sheet -->
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

    <!-- 通用操作弹窗 -->
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
            <div class="ios-alert-btn bold" @click="handleAlertConfirm">仅发送不触发回复</div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, watch, onMounted, computed } from 'vue'
import { useApi } from '@/composables/useApi'
import { usePromptOrder } from '@/composables/usePromptOrder'
import { useChatSessions } from '@/composables/useChatSessions'
import { useProfile } from '@/composables/useProfile'
import { useCharacters } from '@/composables/useCharacters'
import { usePersona } from '@/composables/usePersona'
import { useStickers } from '@/composables/useStickers'

import MemoryPanel from './MemoryPanel.vue'
import ChatSettingsPage from './ChatSettingsPage.vue'
import DebugPanel from './DebugPanel.vue'
import SummaryPanel from './SummaryPanel.vue'

const props = defineProps({ chat: { type: Object, required: true } })
const emit = defineEmits(['exit', 'edit-character'])

const { apiUrl, apiKey, apiModel } = useApi()
const { buildApiMessages } = usePromptOrder()
const { activeMessages, loadSessionData, pushMessage, updateMessage, removeMessages, addMemory, activeMemories } = useChatSessions()
const { userProfile } = useProfile()
const { getCharById } = useCharacters()
const { personas } = usePersona()
const { stickerGroups } = useStickers()

const inputText = ref('')
const isWaiting = ref(false)
const chatBox = ref(null)

const showMorePanel = ref(false)
const showStickerPanel = ref(false)
const showSettings = ref(false)
const showMemoryPanel = ref(false)
const showDebugPanel = ref(false)
const showSummaryPanel = ref(false)

const apiLog = ref({ req: null, res: null, reqTokens: 0, resTokens: 0, time: '' })

onMounted(() => { loadSessionData(props.chat.id) })
watch(() => props.chat.id, (newId) => { loadSessionData(newId) })

const visibleMessages = computed(() => {
  const limit = Number(props.chat.settings?.renderMessageCount) || 50
  return activeMessages.value.slice(-limit)
})

const activeStickerGroupId = ref(null)
watch(stickerGroups, (newGroups) => {
  if (newGroups.length > 0 && !newGroups.find(g => g.id === activeStickerGroupId.value)) {
    activeStickerGroupId.value = newGroups[0].id
  }
}, { immediate: true, deep: true })

const currentStickerGroup = computed(() => {
  return stickerGroups.value.find(g => g.id === activeStickerGroupId.value) || { stickers: [] }
})

const getStickerUrl = (name) => {
  for (const g of stickerGroups.value) {
    const st = g.stickers.find(s => s.name === name)
    if (st) return st.url
  }
  return null
}

const checkShowTime = (index) => {
  if (index === 0) return true
  const currMsg = visibleMessages.value[index]
  const prevMsg = visibleMessages.value[index - 1]
  const currTs = currMsg.timestamp || Math.floor(currMsg.id)
  const prevTs = prevMsg.timestamp || Math.floor(prevMsg.id)
  return (currTs - prevTs) > 5 * 60 * 1000
}

const formatMsgTime = (msg) => {
  const ts = msg.timestamp || Math.floor(msg.id)
  const d = new Date(ts)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const hours = d.getHours().toString().padStart(2, '0')
  const mins = d.getMinutes().toString().padStart(2, '0')
  if (isToday) return `${hours}:${mins}`
  return `${d.getMonth() + 1}-${d.getDate()} ${hours}:${mins}`
}

const getActiveUserPersona = () => {
  if (props.chat.boundPersonaId) return personas.value.find(p => p.id === props.chat.boundPersonaId) || null
  return personas.value.find(p => p.isActive) || null
}

const getAvatarStyle = (r) => {
  if (r === 'user') {
    const p = getActiveUserPersona()
    if (p && p.avatar) return `background-image: url(${p.avatar})`
    if (userProfile.value.avatar) return `background-image: url(${userProfile.value.avatar})`
  }
  if (r === 'ai') {
    if (props.chat.overrideAvatar) return `background-image: url(${props.chat.overrideAvatar})`
    if (!props.chat.isGroup && props.chat.participants.length > 0) {
      const liveChar = getCharById(props.chat.participants[0].id)
      if (liveChar && liveChar.avatar) return `background-image: url(${liveChar.avatar})`
    }
  }
  return ''
}

const getAvatarInitials = (r) => {
  if (r === 'user') {
    const p = getActiveUserPersona()
    if (p && p.avatar) return ''
    if (userProfile.value.avatar) return ''
    return p ? p.name.charAt(0) : userProfile.value.name.charAt(0)
  }
  if (r === 'ai') {
    if (props.chat.overrideAvatar) return ''
    if (!props.chat.isGroup && props.chat.participants.length > 0) {
      const liveChar = getCharById(props.chat.participants[0].id)
      if (liveChar && liveChar.avatar) return ''
    }
    return props.chat.title ? props.chat.title.charAt(0) : 'A'
  }
  return ''
}

const scrollToBottom = () => nextTick(() => { if (chatBox.value) chatBox.value.scrollTop = chatBox.value.scrollHeight })
watch(() => visibleMessages.value.length, scrollToBottom)

const toggleMorePanel = () => { showMorePanel.value = !showMorePanel.value; showStickerPanel.value = false; scrollToBottom() }
const toggleStickerPanel = () => { showStickerPanel.value = !showStickerPanel.value; showMorePanel.value = false; scrollToBottom() }

const sendSticker = (name) => {
  pushMessage(props.chat.id, { role: 'user', type: 'sticker', content: name })
  showStickerPanel.value = false
  scrollToBottom()
}

const quotingText = ref('')
const handleSendLocal = () => {
  if (!inputText.value.trim()) return
  const msgObj = { role: 'user', type: quotingText.value ? 'quote' : 'text', content: inputText.value }
  if (quotingText.value) msgObj.refText = quotingText.value
  pushMessage(props.chat.id, msgObj)
  inputText.value = ''
  quotingText.value = ''
  showMorePanel.value = false
  scrollToBottom()
}

let pressTimer = null
const actionSheet = ref({ show: false, msg: null })
const startPress = (msg) => { if (!isSelectionMode.value) pressTimer = setTimeout(() => { actionSheet.value = { show: true, msg } }, 500) }
const clearPress = () => { if (pressTimer) clearTimeout(pressTimer) }

const handleQuote = () => { quotingText.value = actionSheet.value.msg.content; actionSheet.value.show = false }
const handleEditOwnMsg = () => {
  const newText = prompt('编辑消息：', actionSheet.value.msg.content)
  if (newText) updateMessage(props.chat.id, actionSheet.value.msg.id, { content: newText })
  actionSheet.value.show = false
}
const handleRecallOwn = () => {
  updateMessage(props.chat.id, actionSheet.value.msg.id, { type: 'recalled', oldContent: actionSheet.value.msg.content })
  actionSheet.value.show = false
}

const viewRecall = (oldContent) => {
  alert.value = { show: true, type: 'view_recall', title: '撤回的内容', desc: oldContent, inputs: null }
}

const isSelectionMode = ref(false)
const selectedIds = ref([])
const cancelSelection = () => { isSelectionMode.value = false; selectedIds.value = [] }
const toggleSelect = (id) => {
  if (!isSelectionMode.value) return
  const idx = selectedIds.value.indexOf(id)
  if (idx > -1) selectedIds.value.splice(idx, 1)
  else selectedIds.value.push(id)
}
const deleteSelected = () => {
  if (confirm(`确认删除选中的 ${selectedIds.length} 条消息吗？`)) {
    removeMessages(props.chat.id, selectedIds.value)
    cancelSelection()
  }
}

const alert = ref({ show: false, type: '', title: '', desc: '', inputs: null })
const openAlert = (type) => {
  alert.value.type = type; alert.value.desc = ''
  if (type === 'transfer') { alert.value.title = '发起转账'; alert.value.inputs = [{ placeholder: '金额 (￥)', value: '' }, { placeholder: '备注 (选填)', value: '' }] }
  else if (type === 'location') { alert.value.title = '发送位置'; alert.value.inputs = [{ placeholder: '如：市中心广场', value: '' }] }
  else if (type === 'voice') { alert.value.title = '发送伪语音'; alert.value.inputs = [{ placeholder: '你想说的话', value: '' }] }
  else if (type === 'image') { alert.value.title = '发送伪图片'; alert.value.inputs = [{ placeholder: '视觉描述', value: '' }] }
  alert.value.show = true
  showMorePanel.value = false
}

const handleAlertConfirm = () => {
  if (alert.value.type === 'view_recall') { alert.value.show = false; return }
  const t = alert.value.type; const vals = alert.value.inputs.map(i => i.value)
  if (t === 'transfer' && vals[0]) pushMessage(props.chat.id, { role: 'user', type: 'transfer', amount: vals[0], content: vals[1] || '转账', status: 'pending' })
  else if (t === 'location' && vals[0]) pushMessage(props.chat.id, { role: 'user', type: 'location', content: vals[0] })
  else if (t === 'voice' && vals[0]) pushMessage(props.chat.id, { role: 'user', type: 'voice', content: vals[0], showText: false })
  else if (t === 'image' && vals[0]) pushMessage(props.chat.id, { role: 'user', type: 'image', content: vals[0] })
  
  inputText.value = ''
  alert.value.show = false
  scrollToBottom()
}

let activeTransferMsg = null
const handleTransferClick = (msg) => {
  if (msg.status !== 'pending' || msg.role === 'user') return
  activeTransferMsg = msg
  alert.value = { show: true, type: 'receive_transfer', title: `来自 ${props.chat.title} 的转账`, desc: `金额：￥${msg.amount}\n备注：${msg.content || '无'}`, inputs: null }
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
  showMorePanel.value = false
  let lastAiIdx = -1
  for (let i = activeMessages.value.length - 1; i >= 0; i--) { if (activeMessages.value[i].role === 'ai') { lastAiIdx = i; break; } }
  if (lastAiIdx !== -1) {
    const idsToDelete = activeMessages.value.slice(lastAiIdx).map(m => m.id)
    removeMessages(props.chat.id, idsToDelete)
    triggerAiReply()
  } else window.alert('没有可以重摇的 AI 回复。')
}

// 自动总结保留在此处，触发依赖对话
const checkAndRunAutoSummary = async () => {
  const count = Number(props.chat.settings.autoSummaryCount) || 0
  if (count <= 0) return
  const aiMsgs = activeMessages.value.filter(m => m.role === 'ai')
  if (aiMsgs.length > 0 && aiMsgs.length % count === 0) {
    try {
      const p = getActiveUserPersona()
      const myName = p ? p.name : userProfile.value.name
      const historyText = activeMessages.value.slice(-count * 2)
        .filter(m => m.role !== 'system')
        .map(m => `${m.role === 'ai' ? (props.chat.title || '对方') : myName}: ${m.content}`)
        .join('\n')
      const finalPrompt = props.chat.settings.summaryPrompt + `\n\n【近期对话记录】\n${historyText}`
      const res = await fetch(apiUrl.value, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey.value}` },
        body: JSON.stringify({ model: apiModel.value, messages: [{ role: 'user', content: finalPrompt }] })
      })
      if (res.ok) {
        const data = await res.json()
        await addMemory(props.chat.id, { date: new Date().toLocaleString(), text: data.choices[0].message?.content?.trim() || '' })
        pushMessage(props.chat.id, { role: 'system', type: 'text', content: '记忆已自动归档' })
      }
    } catch (e) { console.error('[Auto Summary Error]', e) }
  }
}

const triggerAiReply = async () => {
  if (isWaiting.value) return
  isWaiting.value = true
  scrollToBottom()

  try {
    if (!apiKey.value) throw new Error('未设置 API 密钥')
    const apiMessages = buildApiMessages(props.chat, activeMessages.value, activeMemories.value)
    
    const reqStr = apiMessages.map(m => m.content).join('')
    apiLog.value.reqTokens = Math.ceil(reqStr.length / 4)
    apiLog.value.req = JSON.parse(JSON.stringify(apiMessages))
    apiLog.value.time = new Date().toLocaleTimeString()

    const response = await fetch(apiUrl.value, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey.value}` },
      body: JSON.stringify({ model: apiModel.value, messages: apiMessages })
    })

    if (!response.ok) {
      let errTxt = response.statusText
      try { const errObj = await response.json(); errTxt = errObj.error?.message || JSON.stringify(errObj) } catch(e){}
      throw new Error(`HTTP ${response.status}: ${errTxt}`)
    }
    
    const data = await response.json()
    if (!data || !data.choices || !data.choices[0]) throw new Error(`API 返回格式异常`)

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
    const fullRegex = /<msg(?:\s+type="([^"]+)")?(?:\s+ref="([^"]+)")?(?:\s+amount="([^"]+)")?(?:\s+action="([^"]+)")?>([\s\S]*?)<\/msg>/i

    let hasMsg = false
    while ((match = msgRegex.exec(rawText)) !== null) {
      hasMsg = true
      const parsed = fullRegex.exec(match[0])
      if (parsed) {
        const mType = parsed[1] || 'text'; const mRef = parsed[2] || ''; const mAmount = parsed[3] || ''; const mAction = parsed[4] || ''; const mContent = parsed[5].trim()
        const tempId = Date.now() + Math.random()

        if (mType === 'recall') {
          pushMessage(props.chat.id, { id: tempId, role: 'ai', type: 'recall_pending', content: mContent })
          setTimeout(() => { updateMessage(props.chat.id, tempId, { type: 'recalled', oldContent: mContent }) }, 1500)
        } else if (mType === 'transfer') {
          pushMessage(props.chat.id, { id: tempId, role: 'ai', type: 'transfer', amount: mAmount, content: mContent, status: 'pending' })
        } else if (mType === 'transfer_reply') {
          pushMessage(props.chat.id, { id: tempId, role: 'ai', type: 'text', content: `[已${mAction === 'accept' ? '领取' : '退回'}你的转账]` })
        } else if (mType === 'voice') {
          pushMessage(props.chat.id, { id: tempId, role: 'ai', type: 'voice', content: mContent, showText: false })
        } else {
          pushMessage(props.chat.id, { id: tempId, role: 'ai', type: mType, refText: mRef, content: mContent })
        }
      }
    }
    if (!hasMsg && rawText.length > 0) pushMessage(props.chat.id, { role: 'ai', type: 'text', content: rawText })

    checkAndRunAutoSummary()

  } catch (error) {
    pushMessage(props.chat.id, { role: 'system', content: `请求失败：${error.message}` })
  } finally {
    isWaiting.value = false
    scrollToBottom()
  }
}
</script>

<style scoped>
.chat-area { flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; background: var(--bg-color); position: relative; }
.chat-input-area { background: #fff; display: flex; flex-shrink: 0; box-shadow: 0 -2px 10px rgba(0,0,0,0.02); }
.chat-input { flex: 1; border: none; background: var(--bg-color); border-radius: 18px; padding: 10px 15px; outline: none; font-size: 14px; }
.btn-send { background: var(--text-main); color: #fff; border: none; padding: 0 16px; font-weight: 600; cursor: pointer; font-size: 13px; }
</style>
