<template>
  <transition name="slide-up">
    <!-- 修复了这里的内联样式，移除了错误的 position: relative; -->
    <div v-if="show" class="app-window">
      
      <!-- 主动消息触发通知横幅 -->
      <transition name="slide-down">
        <div v-if="proactiveNotification" class="proactive-toast" @click="enterChat(proactiveNotification.chat)">
          <div class="toast-avatar" :style="proactiveNotification.avatar ? `background-image:url(${proactiveNotification.avatar})` : ''">
            {{ !proactiveNotification.avatar ? proactiveNotification.name.charAt(0) : '' }}
          </div>
          <div class="toast-content">
            <div class="toast-title">{{ proactiveNotification.name }}</div>
            <div class="toast-msg">对方发来了一条新消息...</div>
          </div>
        </div>
      </transition>

      <ChatDetail 
        v-if="currentChat" 
        :chat="currentChat" 
        @exit="exitChat" 
        @edit-character="openCharEditor"
      />

      <template v-else>
        <div class="app-header">
          <div class="btn-back" @click="handleBack">
            <i v-if="subPage !== 'main'" class="fas fa-chevron-left"></i>
            <span v-else>关闭</span>
          </div>
          <div class="app-title">
            <span v-if="subPage === 'main'">{{ tabTitle }}</span>
            <span v-if="subPage === 'persona'">我的人设</span>
            <span v-if="subPage === 'order'">提示词注入</span>
          </div>
          <div class="header-right">
            <i v-if="activeTab === 'chats' && subPage === 'main'" class="fas fa-plus" @click="showNewChatModal = true"></i>
            <i v-if="activeTab === 'contacts' && subPage === 'main'" class="fas fa-plus" @click="openCharEditor(null)"></i>
            <i v-if="subPage === 'persona'" class="fas fa-plus" @click="personaPageRef?.openModal()"></i>
            <i v-if="subPage === 'order'" class="fas fa-eye" @click="promptPageRef?.openPreview()"></i>
            <i v-if="subPage === 'order'" class="fas fa-plus" @click="promptPageRef?.openAddModal()"></i>
          </div>
        </div>

        <template v-if="subPage === 'main'">
          <ChatList    v-if="activeTab === 'chats'"    @enter="enterChat" />
          <ContactList v-if="activeTab === 'contacts'" @create-char="openCharEditor(null)" @edit-char="openCharEditor" />
          <GamesPage   v-if="activeTab === 'games'" />
          <MePage      v-if="activeTab === 'me'"       @go="subPage = $event" />
        </template>

        <PersonaPage    v-if="subPage === 'persona'" ref="personaPageRef" />
        <PromptOrderPage v-if="subPage === 'order'"  ref="promptPageRef" />

        <QQBottomNav v-if="subPage === 'main'" v-model="activeTab" />
      </template>

      <CharacterEditorPage :show="showEditorModal" :charId="editingCharId" @close="closeCharEditor" />

      <InnerModal :show="showNewChatModal" @close="showNewChatModal = false">
        <div class="modal-title">选择角色</div>
        <div class="modal-hint">勾选多个角色即为群聊模式，AI 将同时扮演所有角色</div>
        <div style="max-height:200px; overflow-y:auto; display:flex; flex-direction:column; gap:10px;">
          <div v-if="characters.length === 0" style="font-size:13px; color:var(--text-sub); text-align:center; padding:10px;">请先在通讯录中创建角色</div>
          <label v-for="char in characters" :key="char.id" style="display:flex; align-items:center; gap:10px; font-size:14px;">
            <input type="checkbox" :value="char.id" v-model="selectedCharIds" style="width:18px; height:18px; accent-color:var(--text-main);" />
            {{ char.name }}
          </label>
        </div>
        <div class="modal-actions">
          <button class="btn-cancel" @click="showNewChatModal = false">取消</button>
          <button class="btn-confirm" @click="handleStartChat" :disabled="selectedCharIds.length === 0">开始对话</button>
        </div>
      </InnerModal>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useCharacters } from '@/composables/useCharacters'
import { useChatSessions } from '@/composables/useChatSessions'
import { usePromptOrder } from '@/composables/usePromptOrder'
import { useApi } from '@/composables/useApi'
import db from '@/db'

import ChatList       from './ChatList.vue'
import ChatDetail     from './ChatDetail.vue'
import ContactList    from './ContactList.vue'
import GamesPage      from './GamesPage.vue'
import MePage         from './MePage.vue'
import PersonaPage    from './PersonaPage.vue'
import PromptOrderPage from './PromptOrderPage.vue'
import QQBottomNav    from './QQBottomNav.vue'
import CharacterEditorPage from './CharacterEditorPage.vue'
import InnerModal     from '@/components/InnerModal.vue'

const props = defineProps({ show: Boolean })
const emit = defineEmits(['close'])

const { characters, getCharById } = useCharacters()
const { chatSessions, createSession, pushMessage, updateMessage } = useChatSessions()
const { buildApiMessages } = usePromptOrder()
const { apiUrl, apiKey, apiModel } = useApi()

const activeTab    = ref('chats')
const subPage      = ref('main')
const currentChatId = ref(null)

const personaPageRef = ref(null)
const promptPageRef  = ref(null)

const proactiveNotification = ref(null)
let proactiveTimer = null
let isProactiveFetching = false

const currentChat = computed(() => chatSessions.value.find((c) => c.id === currentChatId.value) || null)
const tabTitle = computed(() => ({ chats: '聊天', contacts: '通讯录', games: '游戏', me: '我的' })[activeTab.value])

const enterChat = (chat) => { 
  currentChatId.value = chat.id 
  proactiveNotification.value = null
}
const exitChat  = ()     => { currentChatId.value = null }

const handleBack = () => {
  if (subPage.value !== 'main') subPage.value = 'main'
  else emit('close')
}

const showEditorModal = ref(false)
const editingCharId = ref(null)
const openCharEditor = (id = null) => { editingCharId.value = id; showEditorModal.value = true }
const closeCharEditor = () => { showEditorModal.value = false; editingCharId.value = null }

const showNewChatModal = ref(false)
const selectedCharIds  = ref([])
const handleStartChat = () => {
  const selected = characters.value.filter((c) => selectedCharIds.value.includes(c.id))
  const session  = createSession(selected)
  if (session) {
    selectedCharIds.value  = []
    showNewChatModal.value = false
    enterChat(session)
  }
}

// ==== 真·API驱动后台主动触发引擎 ====
onMounted(() => {
  proactiveTimer = setInterval(async () => {
    if (isProactiveFetching || proactiveNotification.value || !apiKey.value) return

    const now = Date.now()
    for (const chat of chatSessions.value) {
      if (!chat.settings?.proactiveEnabled) continue
      
      const intervalMs = (chat.settings.proactiveIntervalMin || 60) * 60 * 1000
      const lastTime = chat.lastMessageTimestamp || 0
      
      if (now - lastTime > intervalMs && currentChatId.value !== chat.id) {
        isProactiveFetching = true
        
        try {
          const msgs = await db.messages.where({ sessionId: chat.id }).toArray()
          const mems = await db.memories.where({ sessionId: chat.id }).toArray()

          const apiMessages = buildApiMessages(chat, msgs, mems)
          apiMessages.push({ 
            role: 'system', 
            content: '【系统高优指令：触发闲置对话】用户已经有一段时间没有理你了。请根据你的人设性格、先前的聊天语境，主动发一条消息引起话题。' 
          })

          const response = await fetch(apiUrl.value, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey.value}` },
            body: JSON.stringify({ model: apiModel.value, messages: apiMessages })
          })

          if (!response.ok) throw new Error('API Error')
          const data = await response.json()
          let rawText = data.choices[0].message?.content || ''

          const statusRegex = /<statue_update>([\s\S]*?)<\/statue_update>/gi
          rawText = rawText.replace(statusRegex, '').trim()
          
          const msgRegex = /<msg(?:[^>]*)>([\s\S]*?)<\/msg>/gi
          const fullRegex = /<msg(?:\s+type="([^"]+)")?(?:\s+ref="([^"]+)")?(?:\s+amount="([^"]+)")?(?:\s+action="([^"]+)")?>([\s\S]*?)<\/msg>/i

          let hasMsg = false
          let match
          while ((match = msgRegex.exec(rawText)) !== null) {
            hasMsg = true
            const parsed = fullRegex.exec(match[0])
            if (parsed) {
              const mType = parsed[1] || 'text'; const mRef = parsed[2] || ''; const mAmount = parsed[3] || ''; const mAction = parsed[4] || ''; const mContent = parsed[5].trim()
              const tempId = Date.now() + Math.random()

              if (mType === 'recall') {
                pushMessage(chat.id, { id: tempId, role: 'ai', type: 'recall_pending', content: mContent })
                setTimeout(() => { updateMessage(chat.id, tempId, { type: 'recalled', oldContent: mContent }) }, 1500)
              } else if (mType === 'transfer') {
                pushMessage(chat.id, { id: tempId, role: 'ai', type: 'transfer', amount: mAmount, content: mContent, status: 'pending' })
              } else if (mType === 'transfer_reply') {
                pushMessage(chat.id, { id: tempId, role: 'ai', type: 'text', content: `[已${mAction === 'accept' ? '领取' : '退回'}你的转账]` })
              } else if (mType === 'voice') {
                pushMessage(chat.id, { id: tempId, role: 'ai', type: 'voice', content: mContent, showText: false })
              } else {
                pushMessage(chat.id, { id: tempId, role: 'ai', type: mType, refText: mRef, content: mContent })
              }
            }
          }
          if (!hasMsg && rawText.length > 0) pushMessage(chat.id, { role: 'ai', type: 'text', content: rawText })

          let avatarUrl = chat.overrideAvatar
          let charName = chat.title
          if (!avatarUrl && !chat.isGroup && chat.participants.length > 0) {
             const char = getCharById(chat.participants[0].id)
             avatarUrl = char?.avatar || ''
          }
          proactiveNotification.value = { chat: chat, name: charName, avatar: avatarUrl }
          setTimeout(() => { proactiveNotification.value = null }, 4000)

        } catch (e) {
          console.error('[Proactive Engine Error]', e)
        } finally {
          isProactiveFetching = false
          chat.lastMessageTimestamp = Date.now()
          break 
        }
      }
    }
  }, 10000)
})

onUnmounted(() => {
  if (proactiveTimer) clearInterval(proactiveTimer)
})
</script>

<style scoped>
.proactive-toast {
  position: absolute;
  top: env(safe-area-inset-top, 20px);
  left: 15px;
  right: 15px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 15px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  z-index: 200;
  cursor: pointer;
}

.toast-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--accent-color);
  color: #fff;
  display: flex;
  justify-content: center;
  align-items: center;
  background-size: cover;
  background-position: center;
  font-weight: 600;
}

.toast-content {
  flex: 1;
}

.toast-title {
  font-weight: 600;
  font-size: 13px;
  color: #333;
}

.toast-msg {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>

