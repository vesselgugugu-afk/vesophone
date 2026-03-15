<template>
  <transition name="slide-up">
    <div v-if="show" class="dating-chat-page">
      
      <!-- 极简模式 Header -->
      <div class="dating-chat-header">
        <i class="fas fa-chevron-left" @click="$emit('close')" style="font-size: 18px; padding: 10px; cursor: pointer;"></i>
        <div class="header-info">
          <div class="chat-title">{{ chatProfile?.nickname || '匿名网友' }} <span class="badge">{{ chatData?.type === 'blind' ? '盲聊' : '速配' }}</span></div>
          <div class="chat-sub">保密协议生效中...</div>
        </div>
        <i class="fas fa-ellipsis-h" style="font-size: 18px; padding: 10px; color: #8e8e93;"></i>
      </div>

      <!-- 聊天区域复用 QQ 气泡 -->
      <div class="chat-area" ref="chatBox">
        <div class="system-intro">
          你和 TA 相遇了。<br>对方的人设完全保密，试着去了解 TA 吧。
        </div>

        <template v-for="msg in messages" :key="msg.id">
          <ChatMessageItem 
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
            <div class="msg-bubble"><i class="fas fa-circle-notch fa-spin"></i></div>
          </div>
        </div>
      </div>

      <!-- 底部输入框，完全接入多媒体事件 -->
      <ChatBottomBar 
        :chat="pseudoChatObj"
        :musicState="{}"
        :isSelectionMode="false"
        :quotingText="quotingText"
        @send-text="handleSendText"
        @send-sticker="sendSticker"
        @trigger-ai="triggerAiReply"
        @open-alert="openMenuAlert"
        @clear-quote="quotingText = ''"
      />

      <!-- 长按菜单：撤回与引用 -->
      <ChatActionSheet 
        v-model:show="actionSheet.show"
        :msg="actionSheet.msg"
        @quote="handleQuote"
        @edit="handleEditOwnMsg"
        @recall="handleRecallOwn"
      />

      <!-- 输入内容弹窗 (发图/发语音等) -->
      <ChatGeneralAlerts 
        v-model:apiErrorDetails="apiErrorDetails"
        :alert="alert"
        :chatTitle="chatProfile?.nickname"
        @close-alert="alert.show = false"
        @confirm-general="handleAlertConfirm"
      />

      <!-- 揭晓弹窗：大迁移与好友验证发生的地方 -->
      <div class="reveal-modal" v-if="showRevealModal">
        <div class="reveal-box">
          <div class="reveal-icon"><i class="fas fa-heartbeat"></i></div>
          <h3>好感度已达标</h3>
          <p>对方请求与你交换真实身份，是否发送好友验证？</p>
          <div class="reveal-actions">
            <button class="btn-reject" @click="handleRejectReveal">狠心拒绝</button>
            <button class="btn-accept" @click="handleAcceptReveal">交换身份</button>
          </div>
        </div>
      </div>

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

const quotingText = ref('')
const alert = ref({ show: false, type: '', title: '', desc: '', inputs: null })
const apiErrorDetails = ref(null)

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
    messages.value = []
  }
})

const pseudoChatObj = computed(() => {
  if (!chatProfile.value) return {}
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

// ==== 基础交互：长按与各种消息发送 ====

const startPress = (msg) => { 
  pressTimer = setTimeout(() => { actionSheet.value = { show: true, msg } }, 500) 
}
const clearPress = () => { if (pressTimer) clearTimeout(pressTimer) }

const handleQuote = () => { quotingText.value = actionSheet.value.msg.content }
const handleEditOwnMsg = async () => { 
  const newText = prompt('编辑消息：', actionSheet.value.msg.content)
  if (newText) {
    const msgId = actionSheet.value.msg.id
    await db.messages.where({ id: msgId }).modify({ content: newText })
    const msg = messages.value.find(m => m.id === msgId)
    if (msg) msg.content = newText
  }
}
const handleRecallOwn = async () => { 
  const msgId = actionSheet.value.msg.id
  await db.messages.where({ id: msgId }).modify({ type: 'recalled', oldContent: actionSheet.value.msg.content })
  const msg = messages.value.find(m => m.id === msgId)
  if (msg) { msg.type = 'recalled'; msg.oldContent = msg.content }
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
  triggerAiReply()
}

const sendSticker = async (name) => {
  await pushLocalMessage({ role: 'user', type: 'sticker', content: name })
  triggerAiReply()
}

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
  triggerAiReply()
}


// ==== 核心：完整解析 AI 回复 (支持多媒体解析) ====

const triggerAiReply = async () => {
  if (isWaiting.value) return
  isWaiting.value = true
  scrollToBottom()
  
  try {
    const apiMessages = buildApiMessages(pseudoChatObj.value, messages.value, [], [])
    
    const res = await fetch(apiUrl.value, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey.value}` },
      body: JSON.stringify({ model: apiModel.value, messages: apiMessages, temperature: 0.85 })
    })
    
    const data = await res.json()
    let rawText = data.choices[0].message?.content || ''
    
    // 1. 拦截变量更新 (虽然匿名模式可能用不上，但防止污染对话)
    const statusRegex = /<statue_update>([\s\S]*?)<\/statue_update>/gi
    rawText = rawText.replace(statusRegex, '').trim()

    // 2. 拦截冷推专属 Reveal / Exit 动作
    const parsedAction = parseAIAction(rawText)
    rawText = parsedAction.cleanText
    const action = parsedAction.action

    // 3. 正则解析多媒体消息 (<msg type="...">)
    const msgRegex = /<msg(?:[^>]*)>([\s\S]*?)<\/msg>/gi
    const matches = [...rawText.matchAll(msgRegex)]

    if (matches.length > 0) {
      const trailingText = rawText.replace(msgRegex, '').trim()
      
      for (let i = 0; i < matches.length; i++) {
        const m = matches[i]
        const attrRegex = /(\w+)="([^"]+)"/g
        let attrs = {}
        let attrMatch
        while ((attrMatch = attrRegex.exec(m[0])) !== null) { attrs[attrMatch[1]] = attrMatch[2] }
        
        const mType = attrs.type || 'text'
        let mContent = m[1].trim()
        
        // 如果是最后一条消息且带有非标签的文字，作为追加文字 (一般冷推里不太会出现，防止意外)
        if (i === matches.length - 1 && trailingText) {
           mContent += '\n' + trailingText
        }

        const baseMsgObj = { role: 'ai', type: mType, refText: attrs.ref || '', content: mContent }

        if (mType === 'recall') {
          const tempMsg = { ...baseMsgObj, type: 'recall_pending' }
          await pushLocalMessage(tempMsg)
          setTimeout(async () => { 
            await db.messages.where({ id: tempMsg.id }).modify({ type: 'recalled', oldContent: mContent })
            const tMsg = messages.value.find(x => x.id === tempMsg.id)
            if (tMsg) { tMsg.type = 'recalled'; tMsg.oldContent = mContent }
          }, 1500)
        } else if (mType === 'transfer') {
          await pushLocalMessage({ ...baseMsgObj, amount: attrs.amount || '', status: 'pending' })
        } else if (mType === 'transfer_reply') {
          const pendingMsg = messages.value.slice().reverse().find(x => x.type === 'transfer' && x.status === 'pending')
          if (pendingMsg) {
            await db.messages.where({ id: pendingMsg.id }).modify({ status: attrs.action === 'accept' ? 'accepted' : 'rejected' })
            pendingMsg.status = attrs.action === 'accept' ? 'accepted' : 'rejected'
          }
          await pushLocalMessage({ role: 'system', type: 'text', content: attrs.action === 'accept' ? '对方已领取转账' : '对方已退回转账' })
        } else if (mType === 'voice') {
          await pushLocalMessage({ ...baseMsgObj, showText: false })
        } else {
          await pushLocalMessage(baseMsgObj)
        }
      }
    } else if (rawText.length > 0) {
      await pushLocalMessage({ role: 'ai', type: 'text', content: rawText })
    }

    // 4. 处理触发的最终动作
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
      showRevealModal.value = true
    }

  } catch (e) {
    console.error(e)
    window.dispatchEvent(new CustomEvent('sys-toast', { detail: '网络波动，AI无响应' }))
  } finally {
    isWaiting.value = false
  }
}

// ==== 数据大迁移 ====

const handleRejectReveal = async () => {
  showRevealModal.value = false
  await pushLocalMessage({ role: 'system', type: 'text', content: '你拒绝了交换真实身份。' })
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
  
  let selectedAvatar = ''
  const customUrls = (playerProfile.value.settings?.avatarUrls || '').split('\n').map(u => u.trim()).filter(Boolean)

  if (customUrls.length > 0) {
    selectedAvatar = customUrls[Math.floor(Math.random() * customUrls.length)]
  } else {
    const seed = encodeURIComponent(realName)
    selectedAvatar = `https://api.dicebear.com/9.x/micah/svg?seed=${seed}&backgroundColor=f4f5f7,e0f7f7,ffedea`
  }
  newChar.avatar = selectedAvatar

  await saveCharacter(newChar) 

  const allChars = await db.characters.toArray()
  const realChar = allChars[allChars.length - 1] 

  const realSession = createSession([realChar])
  realSession.isBlocked = true 

  await db.messages.where({ sessionId: `dating_${props.chatId}` }).modify({ sessionId: realSession.id })

  addFriendRequest(realSession.id, `你好，我是 ${realName}，很高兴重新认识你。`)

  await addMemory(realSession.id, {
    characterId: realChar.id,
    type: 'milestone',
    source: 'dating_app',
    content: `我们在冷推(Spark)软件上相遇，今天正式交换了真实姓名（原来TA叫${realName}），并互相发送了好友验证。`
  })

  await db.dating_chats.update(props.chatId, { status: 'revealed' })

  window.dispatchEvent(new CustomEvent('sys-toast', { detail: '已向你的 QQ 通讯录发送了好友申请！' }))
  emit('close')
}
</script>

<style scoped>
.dating-chat-page { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #f4f5f7; z-index: 400; display: flex; flex-direction: column; }
.slide-up-enter-active, .slide-up-leave-active { transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(100%); }

.dating-chat-header { padding: calc(env(safe-area-inset-top) + 10px) 10px 10px; background: #ffffff; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e5e5ea; z-index: 10; }
.header-info { text-align: center; }
.chat-title { font-size: 16px; font-weight: 700; color: #1c1c1e; display: flex; align-items: center; justify-content: center; gap: 6px; }
.badge { font-size: 9px; padding: 2px 4px; background: #14CCCC; color: white; border-radius: 4px; font-weight: normal; }
.chat-sub { font-size: 10px; color: #8e8e93; margin-top: 2px; }

.chat-area { flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 15px; }
.system-intro { text-align: center; font-size: 11px; color: #8e8e93; background: rgba(0,0,0,0.05); padding: 8px 12px; border-radius: 8px; margin: 0 auto 20px; width: fit-content; line-height: 1.4; }

.msg-row.is-ai { display: flex; gap: 10px; margin-bottom: 15px; }
.msg-avatar { width: 36px; height: 36px; border-radius: 50%; background: #ddd; display: flex; justify-content: center; align-items: center; color: #888; font-weight: bold; flex-shrink: 0; }
.msg-bubble { background: #fff; padding: 12px 16px; border-radius: 4px 18px 18px 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); font-size: 14px; line-height: 1.5; color: #333; max-width: 80%; }

.reveal-modal { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); backdrop-filter: blur(5px); z-index: 500; display: flex; justify-content: center; align-items: center; }
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
