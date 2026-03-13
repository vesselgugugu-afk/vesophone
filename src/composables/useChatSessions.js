import { ref, watch } from 'vue'
import db from '@/db'

const KEY = 'chatSessions'
const KEY_CSS = 'chatCssPresets'
const KEY_FRIENDS = 'friendRequests'

const load = (key, def) => {
  const s = localStorage.getItem(key)
  return s ? JSON.parse(s) : def
}

const rawData = load(KEY, [])
rawData.forEach(chat => {
  if (!chat.stickers) chat.stickers = []
  if (chat.memory !== undefined && typeof chat.memory === 'string') {
    chat.memoryList = chat.memory.trim() ? [{ id: Date.now(), text: chat.memory, date: new Date().toLocaleString() }] : []
    delete chat.memory
  }
  if (!chat.memoryList) chat.memoryList = []
  
  if (!chat.settings) {
    chat.settings = { summaryPrompt: '请提取核心长期记忆...', autoSummaryCount: 0 }
  }
  if (chat.settings.renderMessageCount === undefined) chat.settings.renderMessageCount = 50
  if (chat.settings.contextMessageCount === undefined) chat.settings.contextMessageCount = 20
  
  if (chat.settings.proactiveEnabled === undefined) chat.settings.proactiveEnabled = false
  if (chat.settings.proactiveIntervalMin === undefined) chat.settings.proactiveIntervalMin = 60

  if (chat.overrideAvatar === undefined) chat.overrideAvatar = ''
  if (chat.boundPersonaId === undefined) chat.boundPersonaId = null
  if (!chat.boundStickerGroups) chat.boundStickerGroups = []
  if (!chat.boundWorldbookIds) chat.boundWorldbookIds = []
  if (chat.customCss === undefined) chat.customCss = ''
  if (chat.bgImage === undefined) chat.bgImage = ''
  
  if (!chat.variablesState) chat.variablesState = {}

  if (chat.isBlocked === undefined) chat.isBlocked = false
  if (chat.isBlockedByAi === undefined) chat.isBlockedByAi = false
})

const chatSessions = ref(rawData)
const cssPresets = ref(load(KEY_CSS, []))
const friendRequests = ref(load(KEY_FRIENDS, []))

const activeMessages = ref([])
const activeMemories = ref([])
let activeSessionId = null

if (!localStorage.getItem('dbMigrated_v2')) {
  chatSessions.value.forEach(async (chat) => {
    if (chat.messages && chat.messages.length > 0) {
      const msgs = chat.messages.map(m => ({ ...m, sessionId: chat.id, timestamp: m.timestamp || Math.floor(m.id || Date.now()) }))
      await db.messages.bulkAdd(msgs)
      chat.lastMessage = msgs[msgs.length - 1].content 
    }
    if (chat.memoryList && chat.memoryList.length > 0) {
      const mems = chat.memoryList.map(m => ({ ...m, sessionId: chat.id }))
      await db.memories.bulkAdd(mems)
    } else if (chat.memory && typeof chat.memory === 'string') {
      await db.memories.add({ id: Date.now(), sessionId: chat.id, text: chat.memory, date: new Date().toLocaleString() })
    }
    delete chat.messages
    delete chat.memoryList
    delete chat.memory
  })
  localStorage.setItem('dbMigrated_v2', 'true')
}

watch(chatSessions, (v) => localStorage.setItem(KEY, JSON.stringify(v)), { deep: true })
watch(cssPresets, (v) => localStorage.setItem(KEY_CSS, JSON.stringify(v)), { deep: true })
watch(friendRequests, (v) => localStorage.setItem(KEY_FRIENDS, JSON.stringify(v)), { deep: true })

export function useChatSessions() {
  const createSession = (selectedChars) => {
    if (!selectedChars || selectedChars.length === 0) return null
    
    const initialVars = {}
    if (selectedChars.length === 1 && selectedChars[0].variables) {
      selectedChars[0].variables.forEach(v => {
        initialVars[v.name] = v.default
      })
    }

    const newChat = {
      id: Date.now(),
      title: selectedChars.map((c) => c.name).join('、'),
      isGroup: selectedChars.length > 1,
      participants: selectedChars,
      lastMessage: '新对话已创建',
      lastMessageTimestamp: Date.now(),
      settings: {
        summaryPrompt: '请阅读以下对话记录，并以第三人称客观视角总结出核心的"长期记忆"（如重要的事件、建立的关系、得知的情报等）。不要输出任何废话，直接输出总结内容。',
        autoSummaryCount: 0,
        renderMessageCount: 50,
        contextMessageCount: 20,
        proactiveEnabled: false,
        proactiveIntervalMin: 60
      },
      overrideAvatar: '',
      boundPersonaId: null,
      boundStickerGroups: [],
      boundWorldbookIds: [],
      customCss: '',
      bgImage: '',
      variablesState: initialVars,
      isBlocked: false,
      isBlockedByAi: false
    }
    chatSessions.value.unshift(newChat)
    return newChat
  }

  const deleteSession = async (id) => {
    chatSessions.value = chatSessions.value.filter((c) => c.id !== id)
    await db.messages.where({ sessionId: id }).delete()
    await db.memories.where({ sessionId: id }).delete()
  }

  const clearMessages = async (sessionId) => {
    await db.messages.where({ sessionId }).delete()
    if (activeSessionId === sessionId) {
      activeMessages.value = []
    }
    const session = chatSessions.value.find((c) => c.id === sessionId)
    if (session) {
      session.lastMessage = '[聊天记录已清空]'
      session.lastMessageTimestamp = Date.now()
    }
  }

  const loadSessionData = async (sessionId) => {
    activeSessionId = sessionId
    activeMessages.value = await db.messages.where({ sessionId }).toArray()
    activeMemories.value = await db.memories.where({ sessionId }).toArray()
  }

  const pushMessage = async (sessionId, message) => {
    if (!message.id) message.id = Date.now() + Math.random()
    if (!message.timestamp) message.timestamp = Date.now()
    
    const fullMsg = { ...message, sessionId }
    
    await db.messages.add(fullMsg)
    
    if (activeSessionId === sessionId) {
      activeMessages.value.push(fullMsg)
    }

    const session = chatSessions.value.find((c) => c.id === sessionId)
    if (session) {
      if (message.type === 'image') session.lastMessage = '[图片]'
      else if (message.type === 'voice') session.lastMessage = '[语音]'
      else if (message.type === 'sticker') session.lastMessage = '[表情包]'
      else if (message.type === 'transfer') session.lastMessage = '[转账]'
      else if (message.type === 'lyric_share') session.lastMessage = '[歌词卡片]'
      else if (message.type === 'music_share') session.lastMessage = '[音乐推荐]'
      else session.lastMessage = message.content
      
      session.lastMessageTimestamp = message.timestamp
    }
  }

  const updateMessage = async (sessionId, messageId, updates) => {
    await db.messages.where({ id: messageId }).modify(updates)
    const msg = activeMessages.value.find(m => m.id === messageId)
    if (msg) Object.assign(msg, updates)
  }

  const removeMessages = async (sessionId, messageIds) => {
    await db.messages.where('id').anyOf(messageIds).delete()
    activeMessages.value = activeMessages.value.filter(m => !messageIds.includes(m.id))
  }

  const addMemory = async (sessionId, memObj) => {
    if (!memObj.id) memObj.id = Date.now() + Math.random()
    const fullMem = { ...memObj, sessionId }
    await db.memories.add(fullMem)
    activeMemories.value.push(fullMem)
  }

  const deleteMemory = async (memoryId) => {
    await db.memories.where({ id: memoryId }).delete()
    activeMemories.value = activeMemories.value.filter(m => m.id !== memoryId)
  }

  const updateMemory = async (memoryId, text) => {
    await db.memories.where({ id: memoryId }).modify({ text })
    const mem = activeMemories.value.find(m => m.id === memoryId)
    if (mem) mem.text = text
  }

  const saveCssPreset = (name, css) => cssPresets.value.push({ id: Date.now(), name, css })
  const deleteCssPreset = (id) => { cssPresets.value = cssPresets.value.filter(p => p.id !== id) }

  const addFriendRequest = (chatId, text) => {
    if (!friendRequests.value.find(r => r.chatId === chatId)) {
      friendRequests.value.unshift({ id: Date.now(), chatId, text: text || '请求添加你为好友', time: Date.now() })
    }
  }
  const removeFriendRequest = (id) => {
    friendRequests.value = friendRequests.value.filter(r => r.id !== id)
  }
  const acceptFriendRequest = (id) => {
    const req = friendRequests.value.find(r => r.id === id)
    if (req) {
      const chat = chatSessions.value.find(c => c.id === req.chatId)
      if (chat) {
        chat.isBlocked = false
        chat.isBlockedByAi = false
      }
      removeFriendRequest(id)
    }
  }

  return { 
    chatSessions,
    sessions: chatSessions,
    cssPresets,
    activeMessages,
    activeMemories,
    friendRequests,
    createSession,
    deleteSession,
    clearMessages,
    loadSessionData,
    pushMessage,
    updateMessage,
    removeMessages,
    addMemory,
    deleteMemory,
    updateMemory,
    saveCssPreset,
    deleteCssPreset,
    addFriendRequest,
    removeFriendRequest,
    acceptFriendRequest
  }
}
