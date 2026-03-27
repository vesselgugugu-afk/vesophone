<template>
  <transition name="slide-up">
    <div v-if="show" class="dating-chat-page">
      
      <!-- 正常顶部栏 -->
      <div class="dating-chat-header" v-if="!isSelectionMode">
        <i class="fas fa-chevron-left" @click="$emit('close')" style="font-size: 18px; padding: 10px; cursor: pointer;"></i>
        
        <div class="header-info" @click="showSimpleProfile = true" style="cursor:pointer;">
          <div class="chat-title">
            {{ pseudoChatObj.title }} 
            <i class="fas fa-info-circle" style="font-size:10px; color:#c7c7cc; margin-left: 4px;"></i>
          </div>
          <div class="chat-sub" v-if="chatData?.status === 'revealed'">身份已揭晓</div>
          <div class="chat-sub" v-else-if="chatData?.status === 'exited'">对方已离开</div>
          <div class="chat-sub" v-else>保密协议生效中...</div>
        </div>
        
        <div style="display:flex; gap:10px; align-items:center;">
          <i class="fas fa-user-plus" v-if="chatData?.status !== 'revealed' && chatData?.status !== 'exited'" style="font-size: 14px; color: #14CCCC; cursor: pointer;" @click="requestReveal"></i>
          <i class="fas fa-terminal" style="font-size: 14px; color: #c7c7cc; cursor: pointer;" @click="showDebugPanel = true"></i>
          <i class="fas fa-ellipsis-h" style="font-size: 18px; color: #8e8e93; cursor: pointer;" @click="handleDisconnect"></i>
        </div>
      </div>
      
      <!-- 多选顶部栏 -->
      <div class="dating-chat-header" v-else style="background:#f4f5f7;">
        <div style="font-size:14px; color:#888;" @click="isSelectionMode = false">取消</div>
        <div style="font-weight:600; font-size:14px;">已选择 {{ selectedMsgs.length }} 项</div>
        <div style="width:28px;"></div>
      </div>

      <!-- 聊天消息区 -->
      <div class="chat-area" ref="chatBox">
        <div class="system-intro" v-if="chatData?.status !== 'revealed'">
          你和 TA 相遇了。<br>对方的人设完全保密，试着去了解 TA 吧。
        </div>

        <template v-for="msg in messages" :key="msg.id">
          <div v-if="msg.type === 'reveal_request'" class="reveal-request-card">
             <div class="icon"><i class="fas fa-heartbeat"></i></div>
             <div class="text">{{ msg.content }}</div>
             <button class="btn-handle" @click="showRevealModal = true">点击处理</button>
          </div>
          
          <div v-else-if="msg.type === 'reveal_request_sent'" class="system-intro" style="background: rgba(20, 204, 204, 0.1); color: #14CCCC; border: 1px solid rgba(20, 204, 204, 0.3);">
            <i class="fas fa-paper-plane" style="margin-right: 4px;"></i> 你向对方发送了交换身份的请求，等待回应...
          </div>
          
          <ChatMessageItem 
            v-else
            :msg="msg"
            :chat="pseudoChatObj"
            :isSelectionMode="isSelectionMode"
            :isSelected="selectedMsgs.includes(msg.id)"
            :showTime="false"
            @press="startPress"
            @clear-press="clearPress"
            @toggle-select="toggleSelect"
            @toggle-voice="(m) => { m.showText = !m.showText }"
            @retry-msg="forceRegenerate"
            @transfer-action="handleTransferAction"
            @click-feed-share="handleClickFeedShare"
          />
        </template>

        <div v-if="isWaiting" class="msg-row is-ai">
          <div class="msg-avatar">?</div>
          <div class="msg-content-wrapper">
            <div class="msg-bubble">
              <i class="fas fa-circle-notch fa-spin"></i>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部输入栏 -->
      <ChatBottomBar 
        v-if="chatData && chatData.status !== 'revealed' && chatData.status !== 'exited'"
        :chat="pseudoChatObj"
        :musicState="musicState"
        :isSelectionMode="isSelectionMode"
        :quotingText="quotingText"
        @send-text="handleSendText"
        @send-sticker="sendSticker"
        @trigger-ai="triggerAiReply"
        @open-alert="openMenuAlert"
        @clear-quote="quotingText = ''"
        @open-memory="handleRestricted('memory')"
        @start-offline="handleRestricted('offline')"
        @open-summary="showSummaryPanel = true"
        @reroll="forceRegenerate"
        @delete-selected="deleteSelected"
        @open-local-music="handleDatingMusicEntry"
        @toggle-colisten="handleDatingColistenEntry"
      />

      <!-- 长按操作菜单 -->
      <ChatActionSheet 
        v-model:show="actionSheet.show" 
        :msg="actionSheet.msg" 
        @quote="handleQuote" 
        @edit="handleEditOwnMsg" 
        @recall="handleRecallOwn"
        @retry="forceRegenerate"
        @regenerate="forceRegenerate"
        @multi-select="isSelectionMode = true"
      />
      
      <!-- 通用弹窗 -->
      <ChatGeneralAlerts v-model:apiErrorDetails="apiErrorDetails" v-model:pendingAutoSummary="pendingAutoSummary" :alert="alert" :chatTitle="pseudoChatObj.title" @close-alert="alert.show = false" @confirm-general="handleAlertConfirm" />

      <!-- 对方简版资料 -->
      <div class="simple-profile-mask" v-if="showSimpleProfile" @click.self="showSimpleProfile = false">
        <div class="simple-profile-box">
          <div class="sp-avatar" :style="`background-image: url(${pseudoChatObj.overrideAvatar}); background-size: cover;`"></div>
          <div class="sp-name">{{ chatProfile?.nickname || '匿名网友' }}</div>
          <div class="sp-basic">{{ chatProfile?.baseInfo?.age || '?' }}岁 / {{ chatProfile?.baseInfo?.gender || '?' }}</div>
          <div class="sp-tags">
            <span v-for="(t, i) in (chatProfile?.tags || chatProfile?.fullJson?.tag || [])" :key="i">{{ t }}</span>
          </div>
          
          <div class="sp-bio">
            <span class="sp-bio-title">社交宣言 / 面具</span>
            <div class="sp-bio-text">"{{ chatProfile?.baseInfo?.bio || '这家伙很神秘，什么都没写' }}"</div>
          </div>
        </div>
      </div>

      <!-- 功能受限提示 -->
      <div class="restricted-modal-mask" v-if="restrictedAlert.show" @click.self="restrictedAlert.show = false">
        <div class="restricted-box">
          <div class="r-icon" :class="restrictedAlert.type"><i :class="restrictedAlert.icon"></i></div>
          <h3>{{ restrictedAlert.title }}</h3>
          <p>{{ restrictedAlert.desc }}</p>
          <button class="r-btn" @click="restrictedAlert.show = false">我知道了</button>
        </div>
      </div>

      <!-- 身份揭晓处理弹窗 -->
      <div class="reveal-modal" v-if="showRevealModal">
        <div class="reveal-box">
          <div class="reveal-icon"><i class="fas fa-heartbeat"></i></div>
          <h3>确立连接</h3>
          <p v-if="undercoverChar"><b>瞳孔地震！</b>原来对面一直披着马甲和你聊天的，竟然是你通讯录里的 <b>{{ undercoverChar.name }}</b>！<br><br>确认摊牌，并将这些聊天记录并入你们的回忆中吗？</p>
          <p v-else>对方已同意你的奔现请求。确认添加 QQ 好友并暴露真实身份吗？</p>
          <div class="reveal-actions">
            <button class="btn-reject" @click="handleRejectReveal">狠心取消</button>
            <button class="btn-accept" @click="handleAcceptReveal">确认摊牌</button>
          </div>
        </div>
      </div>

      <!-- 揭晓成功弹窗 -->
      <div class="reveal-modal" v-if="showSuccessModal">
        <div class="reveal-box">
          <div class="reveal-icon" style="background: rgba(20, 204, 204, 0.1); color: #14CCCC;"><i class="fas fa-check"></i></div>
          <h3 v-if="undercoverChar">掉马甲成功</h3>
          <h3 v-else>请求已送达</h3>
          
          <p style="text-align:left; color:#555; font-size:13px; line-height:1.6;" v-if="undercoverChar">
            所有记录已秘密并入 <b>{{ undercoverChar.name }}</b> 的记忆库中。去 QQ 找 TA 算账吧！
          </p>
          <p style="text-align:left; color:#555; font-size:13px; line-height:1.6;" v-else>
            TA 已向你的 QQ 发送了好友验证申请，请前往 <b style="color:#1c1c1e;">[桌面 - QQ - 通讯录 - 新的朋友]</b> 中查看并处理。
          </p>
          
          <div class="reveal-actions" style="margin-top: 15px;">
            <button class="btn-accept" style="width: 100%; box-shadow: none;" @click="finishReveal">我知道了</button>
          </div>
        </div>
      </div>

      <!-- 被分享帖子详情查看器 -->
      <PostDetailSheet
        :show="showSharedPostDetail"
        :post="currentSharedPost"
        :allow-chat="false"
        @close="showSharedPostDetail = false"
      />

      <!-- 调试/摘要面板 -->
      <DebugPanel :show="showDebugPanel" :logData="apiLog" @close="showDebugPanel = false" />
      <SummaryPanel :show="showSummaryPanel" :chat="pseudoChatObj" @close="showSummaryPanel = false" />

    </div>
  </transition>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import db from '@/db'
import { useApi } from '@/composables/useApi'
import { usePromptOrder } from '@/composables/usePromptOrder'
import { useChatSessions } from '@/composables/useChatSessions'
import { useCharacters } from '@/composables/useCharacters'
import { useDatingMatch } from '@/composables/useDatingMatch'
import { useDatingPlayer } from '@/composables/useDatingPlayer'
import { useDatingAvatar } from '@/composables/useDatingAvatar'
import { useMusic } from '@/composables/useMusic'

import ChatMessageItem from '@/apps/qq/components/ChatMessageItem.vue'
import ChatBottomBar from '@/apps/qq/components/ChatBottomBar.vue'
import ChatActionSheet from '@/apps/qq/components/ChatActionSheet.vue'
import ChatGeneralAlerts from '@/apps/qq/components/ChatGeneralAlerts.vue'
import DebugPanel from '@/apps/qq/DebugPanel.vue'
import SummaryPanel from '@/apps/qq/SummaryPanel.vue'
import PostDetailSheet from '@/apps/dating/components/PostDetailSheet.vue'

const props = defineProps({ show: Boolean, chatId: Number })
const emit = defineEmits(['close'])

const { apiUrl, apiKey, apiModel, subApiUrl, subApiKey, subApiModel } = useApi()
const { buildApiMessages } = usePromptOrder()
const { createSession, addMemory, addFriendRequest, chatSessions } = useChatSessions()
const { getEmptyCharacter, saveCharacter, characters } = useCharacters()
const { getDatingAnonymityRule, parseAIAction } = useDatingMatch()
const { playerProfile } = useDatingPlayer()
const { getStableAvatar } = useDatingAvatar()
const { musicState } = useMusic()

const chatData = ref(null)
const chatProfile = ref(null)
const messages = ref([])

const isWaiting = ref(false)
const chatBox = ref(null)
const showRevealModal = ref(false)
const showSuccessModal = ref(false)
const showSimpleProfile = ref(false)
const showDebugPanel = ref(false)
const showSummaryPanel = ref(false)

const showSharedPostDetail = ref(false)
const currentSharedPost = ref(null)

const quotingText = ref('')
const alert = ref({ show: false, type: '', title: '', desc: '', inputs: null })
const apiErrorDetails = ref(null)
const pendingAutoSummary = ref(null)
const apiLog = ref({ req: null, res: null, reqTokens: 0, resTokens: 0, time: '' })

const restrictedAlert = ref({ show: false, title: '', desc: '', icon: '', type: '' })

let pressTimer = null
const actionSheet = ref({ show: false, msg: null })

const isSelectionMode = ref(false)
const selectedMsgs = ref([])

const safeChatSessions = computed(() => {
  if (chatSessions && Array.isArray(chatSessions.value)) return chatSessions.value
  return []
})

const safePlayerSettings = computed(() => {
  if (playerProfile && playerProfile.value && playerProfile.value.settings) {
    return playerProfile.value.settings
  }
  return {}
})

const undercoverChar = computed(() => {
  if (chatProfile.value && chatProfile.value.realCharId) {
    return characters.value.find(c => c.id === chatProfile.value.realCharId)
  }
  return null
})

watch(() => props.show, async (val) => {
  if (val && props.chatId) {
    chatData.value = await db.dating_chats.get(props.chatId)
    if (chatData.value) {
      chatProfile.value = await db.dating_profiles.get(chatData.value.profileId)
      messages.value = await db.messages.where({ sessionId: `dating_${props.chatId}` }).toArray()
      scrollToBottom()
    } else {
      chatProfile.value = null
      messages.value = []
    }
  } else {
    chatData.value = null
    chatProfile.value = null
    messages.value = []
    isSelectionMode.value = false
    selectedMsgs.value = []
    showSuccessModal.value = false
    showSharedPostDetail.value = false
    currentSharedPost.value = null
  }
})

const pseudoChatObj = computed(() => {
  if (!chatProfile.value) return { title: '加载中...', settings: {} }
  const fakeChar = {
    id: `dating_char_${chatProfile.value.id}`,
    name: chatProfile.value.nickname,
    description: JSON.stringify(chatProfile.value.fullJson, null, 2),
    advancedSettingsEnabled: false
  }
  const niceAvatarUrl = getStableAvatar(chatProfile.value.nickname)
  return {
    id: `dating_${props.chatId}`,
    title: chatProfile.value.nickname,
    isGroup: false,
    participants: [fakeChar],
    overrideAvatar: niceAvatarUrl,
    settings: {
      contextMessageCount: 20,
      autoSummaryCount: 0,
      promptSuffix: getDatingAnonymityRule(chatProfile.value)
    },
    variablesState: {},
    isBlocked: false,
    isBlockedByAi: false
  }
})

const scrollToBottom = () => {
  nextTick(() => {
    if (chatBox.value) chatBox.value.scrollTop = chatBox.value.scrollHeight
  })
}

const handleExternalChatMessageAdded = async (e) => {
  const detail = e.detail || {}
  if (!props.show) return
  if (!props.chatId) return
  if (detail.chatId !== props.chatId) return
  if (!detail.message) return

  const exists = messages.value.find(m => m.id === detail.message.id)
  if (!exists) {
    messages.value.push(detail.message)
    scrollToBottom()
  }

  if (detail.autoTriggerAi && !isWaiting.value) {
    setTimeout(() => {
      triggerAiReply()
    }, 600)
  }
}

onMounted(() => {
  window.addEventListener('dating-chat-message-added', handleExternalChatMessageAdded)
})

onUnmounted(() => {
  window.removeEventListener('dating-chat-message-added', handleExternalChatMessageAdded)
})

const requestReveal = async () => {
  if(confirm('想主动向对方发送交换真实身份（奔现）的请求吗？\n如果好感度不够，对方可能会拒绝哦。')) {
    await pushLocalMessage({ 
      role: 'user', 
      type: 'reveal_request_sent', 
      content: '【系统动作：我正式向你发送了交换真实身份/奔现的请求。如果你愿意，请同意并输出 <action>reveal</action> 动作；如果你觉得还不是时候，请直接在文本里拒绝我。】' 
    })
    triggerAiReply()
  }
}

const startPress = (msg) => {
  pressTimer = setTimeout(() => {
    actionSheet.value = { show: true, msg }
  }, 500)
}

const clearPress = () => {
  if (pressTimer) clearTimeout(pressTimer)
}

const handleQuote = () => {
  quotingText.value = actionSheet.value.msg.content
}

const handleEditOwnMsg = async () => { 
  const newText = prompt('编辑消息：', actionSheet.value.msg.content)
  if (newText) {
    await db.messages.where({ id: actionSheet.value.msg.id }).modify({ content: newText })
    const msg = messages.value.find(m => m.id === actionSheet.value.msg.id)
    if (msg) msg.content = newText
  }
}

const handleRecallOwn = async () => { 
  await db.messages.where({ id: actionSheet.value.msg.id }).modify({ type: 'recalled', oldContent: actionSheet.value.msg.content })
  const msg = messages.value.find(m => m.id === actionSheet.value.msg.id)
  if (msg) {
    msg.type = 'recalled'
    msg.oldContent = msg.content
  }
}

const toggleSelect = (id) => {
  if (selectedMsgs.value.includes(id)) {
    selectedMsgs.value = selectedMsgs.value.filter(x => x !== id)
  } else {
    selectedMsgs.value.push(id)
  }
}

const deleteSelected = async () => {
  if (selectedMsgs.value.length === 0) {
    isSelectionMode.value = false
    return
  }
  if (confirm(`确定删除选中的 ${selectedMsgs.value.length} 条消息吗？`)) {
    await db.messages.where('id').anyOf(selectedMsgs.value).delete()
    messages.value = messages.value.filter(m => !selectedMsgs.value.includes(m.id))
    selectedMsgs.value = []
    isSelectionMode.value = false
  }
}

const forceRegenerate = async () => {
  if (isWaiting.value) return
  actionSheet.value.show = false
  
  let lastUserIdx = -1
  for (let i = messages.value.length - 1; i >= 0; i--) {
    if (messages.value[i].role === 'user') {
      lastUserIdx = i
      break
    }
  }
  let msgsToDelete = lastUserIdx !== -1 ? messages.value.slice(lastUserIdx + 1) : [...messages.value]
  const idsToDelete = msgsToDelete.map(m => m.id)
  if (idsToDelete.length > 0) {
    await db.messages.where('id').anyOf(idsToDelete).delete()
    messages.value = messages.value.filter(m => !idsToDelete.includes(m.id))
  }
  setTimeout(() => {
    triggerAiReply()
  }, 300)
}

const handleTransferAction = async (msg, action) => {
  if (msg.status !== 'pending') return
  const newStatus = action === 'accept' ? 'accepted' : 'rejected'
  await db.messages.where({ id: msg.id }).modify({ status: newStatus })
  const m = messages.value.find(x => x.id === msg.id)
  if (m) m.status = newStatus
  await pushLocalMessage({ role: 'system', type: 'text', content: action === 'accept' ? `你已领取了对方的转账 ￥${msg.amount}` : `你已退回了对方的转账` })
  triggerAiReply()
}

const handleRestricted = (type) => {
  if (type === 'memory') restrictedAlert.value = { show: true, type: 'memory', title: '记忆库锁定', desc: '匿名模式下，你无法偷窥对方的精神记忆库。保持一点神秘感不好吗？', icon: 'fas fa-lock' }
  if (type === 'offline') restrictedAlert.value = { show: true, type: 'offline', title: '安全中心提醒', desc: '网警提醒您：网络交友需谨慎！\n匿名模式下严禁线下奔现，请先交换真实身份并加为好友。', icon: 'fas fa-shield-alt' }
}

/**
 * dating 底栏里的“分享音乐”入口
 * 目前先给出明确提示，避免按钮无响应
 */
const handleDatingMusicEntry = () => {
  restrictedAlert.value = {
    show: true,
    type: 'memory',
    title: '音乐分享入口建设中',
    desc: '冷推聊天目前已接入音乐状态，但“直接选歌分享”面板还未开放。你可以先去广场发音乐动态，或等待下一版入口接入。',
    icon: 'fas fa-music'
  }
}

/**
 * dating 底栏里的“一起听”入口
 * 目前先给出明确提示，避免死按钮
 */
const handleDatingColistenEntry = () => {
  restrictedAlert.value = {
    show: true,
    type: 'memory',
    title: '一起听暂未开放',
    desc: '冷推私聊已接入音乐状态显示，但“一起听”完整交互链路尚未正式开放，所以这里先做提示处理，避免按钮无响应。',
    icon: 'fas fa-headphones'
  }
}

const handleDisconnect = async () => {
  if (!props.chatId || !chatData.value) return
  if(confirm('确定要彻底断开连接并销毁该聊天数据吗？\n(对方将永远从列表中消失)')) {
    await db.dating_chats.delete(props.chatId)
    await db.dating_profiles.delete(chatData.value.profileId)
    await db.messages.where({ sessionId: `dating_${props.chatId}` }).delete()
    window.dispatchEvent(new CustomEvent('sys-toast', { detail: '已彻底断开通信链路' }))
    window.dispatchEvent(new CustomEvent('dating-refresh-chats'))
    emit('close')
  }
}

const pushLocalMessage = async (msgObj, targetChatId = props.chatId) => {
  if (!targetChatId) return
  const fullMsg = { ...msgObj, timestamp: Date.now(), id: Date.now() + Math.random(), sessionId: `dating_${targetChatId}` }
  await db.messages.add(fullMsg)
  if (props.chatId === targetChatId && props.show) {
    messages.value.push(fullMsg)
    scrollToBottom()
  }
  const cData = await db.dating_chats.get(targetChatId)
  if (cData && fullMsg.role === 'user') {
    await db.dating_chats.update(targetChatId, { messageCount: (cData.messageCount || 0) + 1 })
  }
}

const handleSendText = async (txt) => {
  const msgObj = { role: 'user', type: quotingText.value ? 'quote' : 'text', content: txt }
  if (quotingText.value) msgObj.refText = quotingText.value
  await pushLocalMessage(msgObj)
  quotingText.value = ''
}

const sendSticker = async (name) => {
  await pushLocalMessage({ role: 'user', type: 'sticker', content: name })
}

const openMenuAlert = (type) => {
  alert.value.type = type
  if (type === 'transfer') alert.value.title = '发起转账', alert.value.inputs = [{ placeholder: '金额 (￥)', value: '' }, { placeholder: '备注 (选填)', value: '' }]
  else if (type === 'location') alert.value.title = '发送位置', alert.value.inputs = [{ placeholder: '如：市中心广场', value: '' }]
  else if (type === 'voice') alert.value.title = '发送伪语音', alert.value.inputs = [{ placeholder: '你想说的话', value: '' }]
  else if (type === 'image') alert.value.title = '发送伪图片', alert.value.inputs = [{ placeholder: '视觉描述', value: '' }]
  alert.value.show = true
}

const handleAlertConfirm = async () => {
  const t = alert.value.type
  const vals = alert.value.inputs.map(i => i.value)
  const baseObj = { role: 'user' }
  if (t === 'transfer' && vals[0]) await pushLocalMessage({ ...baseObj, type: 'transfer', amount: vals[0], content: vals[1] || '转账', status: 'pending' })
  else if (t === 'location' && vals[0]) await pushLocalMessage({ ...baseObj, type: 'location', content: vals[0] })
  else if (t === 'voice' && vals[0]) await pushLocalMessage({ ...baseObj, type: 'voice', content: vals[0], showText: false })
  else if (t === 'image' && vals[0]) await pushLocalMessage({ ...baseObj, type: 'image', content: vals[0] })
  alert.value.show = false
}

const buildMessagesForApi = () => {
  return messages.value.map(msg => {
    if (msg.type === 'feed_share') {
      const snapshot = msg.postSnapshot || {}
      const tagStr = Array.isArray(snapshot.tags) && snapshot.tags.length ? snapshot.tags.join('、') : '无'
      const noteStr = msg.content ? `附言：${msg.content}\n` : ''

      let attachmentStr = ''
      if (snapshot.attachment && snapshot.attachment.type === 'music') {
        attachmentStr =
          `\n这条动态还分享了一首歌：\n` +
          `歌名：《${snapshot.attachment.name || '未知歌曲'}》\n` +
          `歌手：${snapshot.attachment.artist || '未知歌手'}\n` +
          `分享语：${snapshot.attachment.content || '无'}`
      }

      return {
        ...msg,
        type: 'text',
        content: `【我给你分享了一条广场动态】\n${noteStr}原帖作者：${snapshot.nickname || '匿名网友'}\n原帖内容：${snapshot.content || ''}\n原帖标签：${tagStr}${attachmentStr}`
      }
    }
    return msg
  })
}

const handleClickFeedShare = (msg) => {
  const snapshot = msg.postSnapshot || {}
  currentSharedPost.value = {
    id: snapshot.id || msg.id,
    nickname: snapshot.nickname || '匿名网友',
    age: snapshot.age || null,
    gender: snapshot.gender || '保密',
    content: snapshot.content || msg.content || '',
    tags: snapshot.tags || [],
    timestamp: msg.timestamp || Date.now(),
    likes: 0,
    isLiked: false,
    isMine: false,
    realCharId: snapshot.realCharId ?? null,
    chatId: snapshot.chatId ?? null,
    comments: [],
    repostOf: snapshot.repostOf || null,
    attachment: snapshot.attachment || null
  }
  showSharedPostDetail.value = true
}

const triggerAiReply = async () => {
  if (isWaiting.value) return
  if (!props.chatId) return
  isWaiting.value = true
  scrollToBottom()
  
  const reqChatId = props.chatId
  
  try {
    const apiVisibleMessages = buildMessagesForApi()
    const apiMessages = buildApiMessages(pseudoChatObj.value, apiVisibleMessages, [], [])

    const sysIdxApi = apiMessages.findIndex(x => x.role === 'system')
    if (sysIdxApi > -1) {
      const now = new Date()
      const weekday = now.toLocaleDateString('zh-CN', { weekday: 'long' })
      const timeStr = `${now.toLocaleDateString()} ${now.toLocaleTimeString()} ${weekday}`
      apiMessages[sysIdxApi].content += `\n\n【系统环境感知：当前设备的实时时间为 ${timeStr}。请严格根据这个时间决定你的回复状态。】`
      
      if (undercoverChar.value) {
        apiMessages[sysIdxApi].content = `【绝密系统指令】：你的真实身份是用户 QQ 通讯录里的熟人“${undercoverChar.value.name}”。但你现在正披着马甲（网名：${chatProfile.value.nickname}），在一个匿名交友软件上和用户聊天。用户完全不知道你是谁。\n\n你需要保持你真实的性格特点，但努力伪装身份。如果聊到了解彼此的深层话题，可以故意用只有你们懂的梗暗示他，或者在你觉得时机成熟时，直接输出 <action>reveal</action> 掉马甲向他摊牌！\n\n你的真实完整人设如下（供你内化，绝对不要直接说出来）：\n${undercoverChar.value.description}`
      }
    }

    const safeReq = JSON.parse(JSON.stringify(apiMessages))
    const sysIdx = safeReq.findIndex(x => x.role === 'system')
    if (sysIdx > -1 && chatProfile.value?.fullJson && !undercoverChar.value) {
      const prettyStr = JSON.stringify(chatProfile.value.fullJson, null, 2)
      const compactStr = JSON.stringify(chatProfile.value.fullJson)
      if (prettyStr && safeReq[sysIdx].content.includes(prettyStr)) safeReq[sysIdx].content = safeReq[sysIdx].content.replace(prettyStr, '\n\n【< 剧透打码 >】\n\n')
      else if (compactStr && safeReq[sysIdx].content.includes(compactStr)) safeReq[sysIdx].content = safeReq[sysIdx].content.replace(compactStr, '\n\n【< 剧透打码 >】\n\n')
    }
    
    apiLog.value = { reqTokens: Math.ceil(JSON.stringify(apiMessages).length / 4), req: safeReq, time: new Date().toLocaleTimeString() }

    const useSub = !!safePlayerSettings.value.useSubApiForDating
    const targetUrl = useSub && subApiUrl.value ? subApiUrl.value : apiUrl.value
    const targetKey = useSub && subApiKey.value ? subApiKey.value : apiKey.value
    const targetModel = useSub && subApiModel.value ? subApiModel.value : apiModel.value

    if (!targetUrl || !targetKey || !targetModel) {
      throw new Error('冷推聊天 API 配置不完整')
    }

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${targetKey}` },
      body: JSON.stringify({ model: targetModel, messages: apiMessages, temperature: 0.85 })
    })
    
    if (!res.ok) throw new Error('API 访问失败')
    
    const data = await res.json()
    let rawText = data.choices?.[0]?.message?.content || ''
    
    apiLog.value.res = rawText
    apiLog.value.resTokens = Math.ceil(rawText.length / 4)
    
    rawText = rawText.replace(/<statue_update>([\s\S]*?)<\/statue_update>/gi, '').trim()
    const parsedAction = parseAIAction(rawText)
    rawText = parsedAction.cleanText
    const action = parsedAction.action

    const msgRegex = /<msg(?:[^>]*)>([\s\S]*?)<\/msg>/gi
    const matches = [...rawText.matchAll(msgRegex)]
    if (matches.length > 0) {
      for (const m of matches) {
        const type = (m[0].match(/type="([^"]+)"/) || [])[1] || 'text'
        await pushLocalMessage({ role: 'ai', type, content: m[1].trim() }, reqChatId)
      }
    } else if (rawText.length > 0) {
      await pushLocalMessage({ role: 'ai', type: 'text', content: rawText }, reqChatId)
    }

    if (props.chatId !== reqChatId) return

    if (action === 'exit') {
      window.dispatchEvent(new CustomEvent('sys-toast', { detail: '对方已离开聊天室。' }))
      if (safePlayerSettings.value.autoDeleteOnExit) {
        if (chatData.value) {
          await db.dating_chats.delete(reqChatId)
          await db.dating_profiles.delete(chatData.value.profileId)
          await db.messages.where({ sessionId: `dating_${reqChatId}` }).delete()
          window.dispatchEvent(new CustomEvent('dating-refresh-chats'))
        }
      } else {
        await db.dating_chats.update(reqChatId, { status: 'exited' })
      }
      setTimeout(() => emit('close'), 1500)
    } 
    else if (action === 'reveal') {
      await pushLocalMessage({ role: 'system', type: 'reveal_request', content: '[系统] 对方觉得时机成熟，向你发送了摊牌（交换身份）的请求。' }, reqChatId)
    }

  } catch (e) {
    if (props.chatId === reqChatId) apiErrorDetails.value = e.message
  } finally {
    if (props.chatId === reqChatId) isWaiting.value = false
  }
}

const handleRejectReveal = async () => {
  showRevealModal.value = false
  await pushLocalMessage({ role: 'system', type: 'text', content: '你取消了请求。' })
}

const handleAcceptReveal = async () => {
  showRevealModal.value = false

  if (undercoverChar.value) {
    const realChar = undercoverChar.value
    let realSession = safeChatSessions.value.find(c => !c.isGroup && c.participants && c.participants[0]?.id === realChar.id)
    if (!realSession) {
      realSession = createSession([realChar])
    }
    if (!realSession) return
    
    const allMsgs = await db.messages.toArray()
    const msgsToMigrate = allMsgs.filter(m => m.sessionId === `dating_${props.chatId}`)
    for (const m of msgsToMigrate) {
      await db.messages.update(m.id, { sessionId: realSession.id })
    }

    await addMemory(realSession.id, { 
      characterId: realChar.id, 
      type: 'milestone', 
      source: 'dating_app', 
      content: `【掉马甲事件】太离谱了！原来这几天在冷推(Spark)广场上跟我匿名聊天的“${chatProfile.value.nickname}”，竟然就是 ${realChar.name} 本人！我们今天终于摊牌相认了。` 
    })
    
    showSuccessModal.value = true
    return
  }

  const fullJson = chatProfile.value?.fullJson || {}
  const realName = fullJson.name || chatProfile.value?.nickname || '未知用户'
  
  const newChar = getEmptyCharacter()
  newChar.name = realName
  newChar.trueName = realName
  newChar.description = JSON.stringify(fullJson, null, 2)
  newChar.first_mes = '我们终于正式见面了。'
  newChar.extensions = { aero_vars: { variables: [], variablePresets: [] } }
  newChar.avatar = getStableAvatar(chatProfile.value?.nickname || realName)

  const newCharId = await saveCharacter(newChar) 
  const realChar = characters.value.find(c => c.id === newCharId)
  if (!realChar) return

  const realSession = createSession([realChar])
  if (!realSession) return
  realSession.isBlocked = true 
  realSession.isBlockedByAi = false

  const allMsgs = await db.messages.toArray()
  const msgsToMigrate = allMsgs.filter(m => m.sessionId === `dating_${props.chatId}`)
  for (const m of msgsToMigrate) {
    await db.messages.update(m.id, { sessionId: realSession.id })
  }

  addFriendRequest(realSession.id, `你好，我是 ${realName}，我们在冷推聊得很开心。`)
  await addMemory(realSession.id, { characterId: realChar.id, type: 'milestone', source: 'dating_app', content: `我们在冷推(Spark)相遇，今天正式交换了姓名（原来TA叫${realName}），并互相发送了好友验证。` })
  
  showSuccessModal.value = true
}

const finishReveal = async () => {
  showSuccessModal.value = false
  if (!props.chatId || !chatData.value) {
    emit('close')
    return
  }
  await db.dating_chats.delete(props.chatId)
  await db.dating_profiles.delete(chatData.value.profileId)
  window.dispatchEvent(new CustomEvent('dating-refresh-chats'))
  emit('close')
}
</script>

<style scoped>
.dating-chat-page {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #f4f5f7;
  z-index: 400;
  display: flex;
  flex-direction: column;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}

.dating-chat-header {
  padding: calc(env(safe-area-inset-top) + 10px) 16px 12px;
  background: #ffffff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e5e5ea;
  z-index: 10;
}

.header-info {
  text-align: center;
  flex: 1;
}

.chat-title {
  font-size: 16px;
  font-weight: 700;
  color: #1c1c1e;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.badge {
  font-size: 9px;
  padding: 2px 4px;
  background: #14CCCC;
  color: white;
  border-radius: 4px;
  font-weight: normal;
}

.chat-sub {
  font-size: 10px;
  color: #8e8e93;
  margin-top: 2px;
}

.chat-area {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.system-intro {
  text-align: center;
  font-size: 11px;
  color: #8e8e93;
  background: rgba(0,0,0,0.05);
  padding: 8px 12px;
  border-radius: 8px;
  margin: 0 auto 20px;
  width: fit-content;
  line-height: 1.4;
}

.msg-row.is-ai {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.msg-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #ddd;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #888;
  font-weight: bold;
  flex-shrink: 0;
}

.msg-bubble {
  background: #fff;
  padding: 12px 16px;
  border-radius: 4px 18px 18px 18px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  font-size: 14px;
  line-height: 1.5;
  color: #333;
  max-width: 80%;
}

.reveal-request-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 16px;
  margin: 10px auto;
  width: 80%;
  box-shadow: 0 4px 15px rgba(20, 204, 204, 0.15);
  border: 1px solid rgba(20, 204, 204, 0.3);
  text-align: center;
}

.reveal-request-card .icon {
  color: #14CCCC;
  font-size: 24px;
  margin-bottom: 8px;
}

.reveal-request-card .text {
  font-size: 13px;
  color: #333;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.4;
}

.reveal-request-card .btn-handle {
  background: #14CCCC;
  color: white;
  border: none;
  padding: 8px 24px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 12px;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(20, 204, 204, 0.3);
}

.simple-profile-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0,0,0,0.5);
  z-index: 99999;
  display: flex;
  justify-content: center;
  align-items: center;
  backdrop-filter: blur(5px);
}

.simple-profile-box {
  background: #fff;
  width: 80%;
  border-radius: 24px;
  padding: 24px;
  text-align: center;
  animation: pop 0.2s;
  box-shadow: 0 20px 40px rgba(0,0,0,0.2);
}

.sp-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #f4f5f7;
  margin: 0 auto 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: #ccc;
}

.sp-name {
  font-size: 18px;
  font-weight: 800;
  color: #1c1c1e;
  margin-bottom: 4px;
}

.sp-basic {
  font-size: 12px;
  color: #8e8e93;
  margin-bottom: 16px;
}

.sp-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  margin-bottom: 20px;
}

.sp-tags span {
  background: rgba(20, 204, 204, 0.1);
  color: #14CCCC;
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 6px;
  font-weight: 600;
}

.sp-bio {
  font-size: 12px;
  color: #555;
  line-height: 1.6;
  background: #f9f9f9;
  padding: 16px;
  border-radius: 16px;
  text-align: left;
}

.sp-bio-title {
  font-weight: 700;
  color: #1c1c1e;
  margin-bottom: 6px;
  display: block;
  font-size: 11px;
  text-transform: uppercase;
}

.sp-bio-text {
  margin-bottom: 16px;
  font-style: italic;
}

.restricted-modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0,0,0,0.4);
  z-index: 99999;
  display: flex;
  justify-content: center;
  align-items: center;
  backdrop-filter: blur(8px);
}

.restricted-box {
  background: #ffffff;
  width: 75%;
  border-radius: 24px;
  padding: 30px 24px;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0,0,0,0.2);
  animation: pop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.r-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 24px;
  margin: 0 auto 16px;
}

.r-icon.memory {
  background: #f0f4ff;
  color: #5c8aff;
}

.r-icon.offline {
  background: #fff0f0;
  color: #ff3b30;
}

.restricted-box h3 {
  font-size: 18px;
  font-weight: 800;
  color: #1c1c1e;
  margin-bottom: 10px;
}

.restricted-box p {
  font-size: 13px;
  color: #8e8e93;
  line-height: 1.6;
  margin-bottom: 24px;
  white-space: pre-wrap;
}

.r-btn {
  width: 100%;
  padding: 14px;
  border-radius: 16px;
  background: #1c1c1e;
  color: white;
  border: none;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
}

.reveal-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(5px);
  z-index: 99999;
  display: flex;
  justify-content: center;
  align-items: center;
}

.reveal-box {
  background: #ffffff;
  width: 80%;
  border-radius: 24px;
  padding: 30px 20px;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0,0,0,0.3);
  animation: pop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes pop {
  0% { transform: scale(0.9); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.reveal-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(20, 204, 204, 0.1);
  color: #14CCCC;
  font-size: 28px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0 auto 16px;
}

.reveal-box h3 {
  font-size: 18px;
  font-weight: 700;
  color: #1c1c1e;
  margin-bottom: 8px;
}

.reveal-box p {
  font-size: 13px;
  color: #555;
  margin-bottom: 24px;
  line-height: 1.6;
}

.reveal-actions {
  display: flex;
  gap: 12px;
}

.reveal-actions button {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  border: none;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
}

.btn-reject {
  background: #f4f5f7;
  color: #ff3b30;
}

.btn-accept {
  background: #14CCCC;
  color: white;
  box-shadow: 0 4px 12px rgba(20, 204, 204, 0.3);
}
</style>
