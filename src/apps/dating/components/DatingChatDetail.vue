<template>
  <transition name="slide-up">
    <div v-if="show" class="dating-chat-page">
      
      <div class="dating-chat-header">
        <i class="fas fa-chevron-left" @click="$emit('close')" style="font-size: 18px; padding: 10px; cursor: pointer;"></i>
        
        <div class="header-info" @click="showSimpleProfile = true" style="cursor:pointer;">
          <div class="chat-title">
            {{ pseudoChatObj.title }} 
            <i class="fas fa-info-circle" style="font-size:10px; color:#c7c7cc; margin-left: 4px;"></i>
          </div>
          <div class="chat-sub" v-if="chatData?.status === 'revealed'">已加入 QQ 通讯录</div>
          <div class="chat-sub" v-else-if="chatData?.status === 'exited'">对方已离开</div>
          <div class="chat-sub" v-else>保密协议生效中...</div>
        </div>
        
        <div style="display:flex; gap:10px; align-items:center;">
          <i class="fas fa-terminal" style="font-size: 14px; color: #c7c7cc; cursor: pointer;" @click="showDebugPanel = true"></i>
          <i class="fas fa-ellipsis-h" style="font-size: 18px; color: #8e8e93; cursor: pointer;" @click="handleDisconnect"></i>
        </div>
      </div>

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
          
          <ChatMessageItem 
            v-else
            :msg="msg"
            :chat="pseudoChatObj"
            :isSelectionMode="false"
            :isSelected="false"
            :showTime="false"
            @press="startPress"
            @clear-press="clearPress"
            @toggle-voice="(m) => { m.showText = !m.showText }"
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

      <ChatBottomBar 
        v-if="chatData && chatData.status !== 'revealed' && chatData.status !== 'exited'"
        :chat="pseudoChatObj"
        :musicState="{}"
        :isSelectionMode="false"
        :quotingText="quotingText"
        @send-text="handleSendText"
        @send-sticker="sendSticker"
        @trigger-ai="triggerAiReply"
        @open-alert="openMenuAlert"
        @clear-quote="quotingText = ''"
        @open-memory="handleRestricted('memory')"
        @start-offline="handleRestricted('offline')"
        @open-summary="showSummaryPanel = true"
      />

      <ChatActionSheet v-model:show="actionSheet.show" :msg="actionSheet.msg" @quote="handleQuote" @edit="handleEditOwnMsg" @recall="handleRecallOwn" />
      <ChatGeneralAlerts v-model:apiErrorDetails="apiErrorDetails" v-model:pendingAutoSummary="pendingAutoSummary" :alert="alert" :chatTitle="pseudoChatObj.title" @close-alert="alert.show = false" @confirm-general="handleAlertConfirm" />

      <div class="simple-profile-mask" v-if="showSimpleProfile" @click.self="showSimpleProfile = false">
        <div class="simple-profile-box">
          <div class="sp-avatar">?</div>
          <div class="sp-name">{{ chatProfile?.nickname || '匿名网友' }}</div>
          <div class="sp-basic">{{ chatProfile?.age || '?' }}岁 / {{ chatProfile?.gender || '?' }}</div>
          <div class="sp-tags">
            <span v-for="(t, i) in chatProfile?.fullJson?.tag || []" :key="i">{{ t }}</span>
          </div>
          <div class="sp-bio">"{{ chatProfile?.bio || '这家伙很神秘，什么都没写' }}"</div>
        </div>
      </div>

      <!-- 核心新增：美化的权限拦截弹窗 -->
      <div class="restricted-modal-mask" v-if="restrictedAlert.show" @click.self="restrictedAlert.show = false">
        <div class="restricted-box">
          <div class="r-icon" :class="restrictedAlert.type"><i :class="restrictedAlert.icon"></i></div>
          <h3>{{ restrictedAlert.title }}</h3>
          <p>{{ restrictedAlert.desc }}</p>
          <button class="r-btn" @click="restrictedAlert.show = false">我知道了</button>
        </div>
      </div>

      <div class="reveal-modal" v-if="showRevealModal">
        <div class="reveal-box">
          <div class="reveal-icon"><i class="fas fa-heartbeat"></i></div>
          <h3>好感度已达标</h3>
          <p>对方请求与你交换真实身份，是否发送好友验证？</p>
          <div class="reveal-actions">
            <button class="btn-reject" @click="handleRejectReveal">狠心拒绝</button>
            <button class="btn-accept" @click="handleAcceptReveal">发送验证</button>
          </div>
        </div>
      </div>

      <DebugPanel :show="showDebugPanel" :logData="apiLog" @close="showDebugPanel = false" />
      <SummaryPanel :show="showSummaryPanel" :chat="pseudoChatObj" @close="showSummaryPanel = false" />

    </div>
  </transition>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import db from '@/db'
import { useApi } from '@/composables/useApi'
import { usePromptOrder } from '@/composables/usePromptOrder'
import { useChatSessions } from '@/composables/useChatSessions'
import { useCharacters } from '@/composables/useCharacters'
import { useDatingMatch } from '@/composables/useDatingMatch'
import { useDatingPlayer } from '@/composables/useDatingPlayer'

import ChatMessageItem from '@/apps/qq/components/ChatMessageItem.vue'
import ChatBottomBar from '@/apps/qq/components/ChatBottomBar.vue'
import ChatActionSheet from '@/apps/qq/components/ChatActionSheet.vue'
import ChatGeneralAlerts from '@/apps/qq/components/ChatGeneralAlerts.vue'
import DebugPanel from '@/apps/qq/DebugPanel.vue'
import SummaryPanel from '@/apps/qq/SummaryPanel.vue'

const props = defineProps({ show: Boolean, chatId: Number })
const emit = defineEmits(['close'])

const { apiUrl, apiKey, apiModel } = useApi()
const { buildApiMessages } = usePromptOrder()
const { createSession, addMemory, addFriendRequest } = useChatSessions()
const { getEmptyCharacter, saveCharacter } = useCharacters()
const { getDatingAnonymityRule, parseAIAction } = useDatingMatch()
const { playerProfile } = useDatingPlayer()

const chatData = ref(null)
const chatProfile = ref(null)
const messages = ref([])

const isWaiting = ref(false)
const chatBox = ref(null)
const showRevealModal = ref(false)
const showSimpleProfile = ref(false)
const showDebugPanel = ref(false)
const showSummaryPanel = ref(false)

const quotingText = ref('')
const alert = ref({ show: false, type: '', title: '', desc: '', inputs: null })
const apiErrorDetails = ref(null)
const pendingAutoSummary = ref(null)
const apiLog = ref({ req: null, res: null, reqTokens: 0, resTokens: 0, time: '' })

// 权限拦截弹窗状态
const restrictedAlert = ref({ show: false, title: '', desc: '', icon: '', type: '' })

let pressTimer = null
const actionSheet = ref({ show: false, msg: null })

watch(() => props.show, async (val) => {
  if (val && props.chatId) {
    chatData.value = await db.dating_chats.get(props.chatId)
    if (chatData.value) {
      chatProfile.value = await db.dating_profiles.get(chatData.value.profileId)
      messages.value = await db.messages.where({ sessionId: `dating_${props.chatId}` }).toArray()
      scrollToBottom()
    }
  } else {
    chatData.value = null
    chatProfile.value = null
    messages.value = []
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
  return {
    id: `dating_${props.chatId}`,
    title: chatProfile.value.nickname,
    isGroup: false,
    participants: [fakeChar],
    overrideAvatar: '',
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

const scrollToBottom = () => { nextTick(() => { if (chatBox.value) chatBox.value.scrollTop = chatBox.value.scrollHeight }) }

const startPress = (msg) => { pressTimer = setTimeout(() => { actionSheet.value = { show: true, msg } }, 500) }
const clearPress = () => { if (pressTimer) clearTimeout(pressTimer) }
const handleQuote = () => { quotingText.value = actionSheet.value.msg.content }
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
  if (msg) { msg.type = 'recalled'; msg.oldContent = msg.content }
}

// 核心拦截功能唤起优雅弹窗
const handleRestricted = (type) => {
  if (type === 'memory') {
    restrictedAlert.value = {
      show: true, type: 'memory',
      title: '记忆库锁定',
      desc: '匿名模式下，你无法偷窥对方的精神记忆库。保持一点神秘感不好吗？',
      icon: 'fas fa-lock'
    }
  }
  if (type === 'offline') {
    restrictedAlert.value = {
      show: true, type: 'offline',
      title: '安全中心提醒',
      desc: '网警提醒您：网络交友需谨慎！\n匿名模式下严禁线下奔现，请先交换真实身份并加为好友。',
      icon: 'fas fa-shield-alt'
    }
  }
}

const handleDisconnect = async () => {
  if(confirm('确定要彻底断开连接并销毁该聊天数据吗？\n(对方将永远从列表中消失)')) {
    await db.dating_chats.delete(props.chatId)
    await db.dating_profiles.delete(chatData.value.profileId)
    await db.messages.where({ sessionId: `dating_${props.chatId}` }).delete()
    window.dispatchEvent(new CustomEvent('sys-toast', { detail: '已彻底断开通信链路' }))
    emit('close')
  }
}

const pushLocalMessage = async (msgObj) => {
  const fullMsg = { ...msgObj, timestamp: Date.now(), id: Date.now() + Math.random(), sessionId: `dating_${props.chatId}` }
  await db.messages.add(fullMsg)
  messages.value.push(fullMsg)
  scrollToBottom()
  if (chatData.value && fullMsg.role === 'user') {
    chatData.value.messageCount += 1
    await db.dating_chats.update(props.chatId, { messageCount: chatData.value.messageCount })
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

const handleAlertConfirm = async () => { 
  const t = alert.value.type
  const vals = alert.value.inputs.map(i => i.value)
  const baseObj = { role: 'user' }
  
  if (t === 'transfer' && vals[0]) {
    await pushLocalMessage({ ...baseObj, type: 'transfer', amount: vals[0], content: vals[1] || '转账', status: 'pending' })
  } else if (t === 'location' && vals[0]) {
    await pushLocalMessage({ ...baseObj, type: 'location', content: vals[0] })
  } else if (t === 'voice' && vals[0]) {
    await pushLocalMessage({ ...baseObj, type: 'voice', content: vals[0], showText: false })
  } else if (t === 'image' && vals[0]) {
    await pushLocalMessage({ ...baseObj, type: 'image', content: vals[0] })
  }
  alert.value.show = false 
}

const triggerAiReply = async () => {
  if (isWaiting.value) return
  isWaiting.value = true
  scrollToBottom()
  
  try {
    const apiMessages = buildApiMessages(pseudoChatObj.value, messages.value, [], [])
    apiLog.value = { reqTokens: Math.ceil(JSON.stringify(apiMessages).length/4), req: apiMessages, time: new Date().toLocaleTimeString() }

    const res = await fetch(apiUrl.value, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey.value}` },
      body: JSON.stringify({ model: apiModel.value, messages: apiMessages, temperature: 0.85 })
    })
    
    if (!res.ok) throw new Error('API 访问失败')
    
    const data = await res.json()
    let rawText = data.choices[0].message?.content || ''
    
    apiLog.value.res = rawText
    apiLog.value.resTokens = Math.ceil(rawText.length/4)
    
    rawText = rawText.replace(/<statue_update>([\s\S]*?)<\/statue_update>/gi, '').trim()
    const parsedAction = parseAIAction(rawText)
    rawText = parsedAction.cleanText
    const action = parsedAction.action

    const msgRegex = /<msg(?:[^>]*)>([\s\S]*?)<\/msg>/gi
    const matches = [...rawText.matchAll(msgRegex)]
    if (matches.length > 0) {
      for (const m of matches) {
        const type = (m[0].match(/type="([^"]+)"/) || [])[1] || 'text'
        await pushLocalMessage({ role: 'ai', type, content: m[1].trim() })
      }
    } else if (rawText.length > 0) {
      await pushLocalMessage({ role: 'ai', type: 'text', content: rawText })
    }

    if (action === 'exit') {
      window.dispatchEvent(new CustomEvent('sys-toast', { detail: '对方已离开聊天室。' }))
      if (playerProfile.value.settings?.autoDeleteOnExit) {
        await db.dating_chats.delete(props.chatId)
        await db.dating_profiles.delete(chatData.value.profileId)
        await db.messages.where({ sessionId: `dating_${props.chatId}` }).delete()
      } else {
        await db.dating_chats.update(props.chatId, { status: 'exited' })
      }
      setTimeout(() => emit('close'), 1500)
    } 
    else if (action === 'reveal') {
      await pushLocalMessage({ role: 'system', type: 'reveal_request', content: '[系统] 对方好感度已达标，向你发送了交换真实身份的请求。' })
    }

  } catch (e) {
    apiErrorDetails.value = e.message
  } finally {
    isWaiting.value = false
  }
}

const handleRejectReveal = async () => {
  showRevealModal.value = false
  await pushLocalMessage({ role: 'system', type: 'text', content: '你拒绝了对方的请求。' })
}

const handleAcceptReveal = async () => {
  showRevealModal.value = false
  const fullJson = chatProfile.value.fullJson
  const realName = fullJson.name || chatProfile.value.nickname
  const newChar = getEmptyCharacter()
  
  newChar.name = realName
  newChar.trueName = realName
  newChar.description = JSON.stringify(fullJson, null, 2)
  newChar.first_mes = '我们终于正式见面了。'
  
  let selectedAvatar = `https://api.dicebear.com/9.x/micah/svg?seed=${encodeURIComponent(realName)}&backgroundColor=f4f5f7`
  const customUrls = (playerProfile.value.settings?.avatarUrls || '').split('\n').map(u => u.trim()).filter(Boolean)
  if (customUrls.length > 0) {
    selectedAvatar = customUrls[Math.floor(Math.random() * customUrls.length)]
  }
  newChar.avatar = selectedAvatar

  await saveCharacter(newChar) 
  const allChars = await db.characters.toArray()
  const realChar = allChars[allChars.length - 1] 

  const realSession = createSession([realChar])
  realSession.isBlocked = true 

  await db.messages.where({ sessionId: `dating_${props.chatId}` }).modify({ sessionId: realSession.id })
  addFriendRequest(realSession.id, `你好，我是 ${realName}，很高兴重新认识你。`)
  
  await addMemory(realSession.id, { characterId: realChar.id, type: 'milestone', source: 'dating_app', content: `我们在冷推(Spark)相遇，今天正式交换了姓名（原来TA叫${realName}），并互相发送了好友验证。` })
  
  await db.dating_chats.update(props.chatId, { status: 'revealed' })

  window.dispatchEvent(new CustomEvent('sys-toast', { detail: '已向对方发送好友申请！' }))
  emit('close')
}
</script>

<style scoped>
.dating-chat-page { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #f4f5f7; z-index: 400; display: flex; flex-direction: column; }
.slide-up-enter-active, .slide-up-leave-active { transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(100%); }

.dating-chat-header { padding: calc(env(safe-area-inset-top) + 10px) 16px 12px; background: #ffffff; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e5e5ea; z-index: 10; }
.header-info { text-align: center; flex: 1; }
.chat-title { font-size: 16px; font-weight: 700; color: #1c1c1e; display: flex; align-items: center; justify-content: center; gap: 6px; }
.badge { font-size: 9px; padding: 2px 4px; background: #14CCCC; color: white; border-radius: 4px; font-weight: normal; }
.chat-sub { font-size: 10px; color: #8e8e93; margin-top: 2px; }

.chat-area { flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 15px; }
.system-intro { text-align: center; font-size: 11px; color: #8e8e93; background: rgba(0,0,0,0.05); padding: 8px 12px; border-radius: 8px; margin: 0 auto 20px; width: fit-content; line-height: 1.4; }

.msg-row.is-ai { display: flex; gap: 10px; margin-bottom: 15px; }
.msg-avatar { width: 36px; height: 36px; border-radius: 50%; background: #ddd; display: flex; justify-content: center; align-items: center; color: #888; font-weight: bold; flex-shrink: 0; }
.msg-bubble { background: #fff; padding: 12px 16px; border-radius: 4px 18px 18px 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); font-size: 14px; line-height: 1.5; color: #333; max-width: 80%; }

.reveal-request-card { background: #ffffff; border-radius: 16px; padding: 16px; margin: 10px auto; width: 80%; box-shadow: 0 4px 15px rgba(20, 204, 204, 0.15); border: 1px solid rgba(20, 204, 204, 0.3); text-align: center; }
.reveal-request-card .icon { color: #14CCCC; font-size: 24px; margin-bottom: 8px; }
.reveal-request-card .text { font-size: 13px; color: #333; margin-bottom: 16px; font-weight: 600; line-height: 1.4; }
.reveal-request-card .btn-handle { background: #14CCCC; color: white; border: none; padding: 8px 24px; border-radius: 20px; font-weight: 600; font-size: 12px; cursor: pointer; box-shadow: 0 4px 10px rgba(20, 204, 204, 0.3); }

.simple-profile-mask { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 500; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(5px); }
.simple-profile-box { background: #fff; width: 75%; border-radius: 24px; padding: 24px; text-align: center; animation: pop 0.2s; }
.sp-avatar { width: 64px; height: 64px; border-radius: 50%; background: #f4f5f7; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; color: #ccc; }
.sp-name { font-size: 18px; font-weight: 800; color: #1c1c1e; margin-bottom: 4px; }
.sp-basic { font-size: 12px; color: #8e8e93; margin-bottom: 16px; }
.sp-tags { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; margin-bottom: 16px; }
.sp-tags span { background: rgba(20, 204, 204, 0.1); color: #14CCCC; font-size: 10px; padding: 4px 10px; border-radius: 6px; font-weight: 600; }
.sp-bio { font-size: 13px; color: #555; line-height: 1.5; font-style: italic; background: #f9f9f9; padding: 12px; border-radius: 12px; }

/* 拦截警告 UI */
.restricted-modal-mask { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.4); z-index: 550; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(8px); }
.restricted-box { background: #ffffff; width: 75%; border-radius: 24px; padding: 30px 24px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.2); animation: pop 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.r-icon { width: 56px; height: 56px; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-size: 24px; margin: 0 auto 16px; }
.r-icon.memory { background: #f0f4ff; color: #5c8aff; }
.r-icon.offline { background: #fff0f0; color: #ff3b30; }
.restricted-box h3 { font-size: 18px; font-weight: 800; color: #1c1c1e; margin-bottom: 10px; }
.restricted-box p { font-size: 13px; color: #8e8e93; line-height: 1.6; margin-bottom: 24px; white-space: pre-wrap; }
.r-btn { width: 100%; padding: 14px; border-radius: 16px; background: #1c1c1e; color: white; border: none; font-weight: 600; font-size: 14px; cursor: pointer; }

.reveal-modal { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); backdrop-filter: blur(5px); z-index: 600; display: flex; justify-content: center; align-items: center; }
.reveal-box { background: #ffffff; width: 80%; border-radius: 24px; padding: 30px 20px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.3); animation: pop 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes pop { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
.reveal-icon { width: 60px; height: 60px; border-radius: 50%; background: rgba(20, 204, 204, 0.1); color: #14CCCC; font-size: 28px; display: flex; justify-content: center; align-items: center; margin: 0 auto 16px; }
.reveal-box h3 { font-size: 18px; font-weight: 700; color: #1c1c1e; margin-bottom: 8px; }
.reveal-box p { font-size: 12px; color: #8e8e93; margin-bottom: 24px; }
.reveal-actions { display: flex; gap: 12px; }
.reveal-actions button { flex: 1; padding: 12px; border-radius: 12px; border: none; font-weight: 600; font-size: 14px; cursor: pointer; }
.btn-reject { background: #f4f5f7; color: #ff3b30; }
.btn-accept { background: #14CCCC; color: white; box-shadow: 0 4px 12px rgba(20, 204, 204, 0.3); }
</style>
