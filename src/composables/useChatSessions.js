import { ref, watch, toRaw } from 'vue'
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

const rawFriends = load(KEY_FRIENDS, [])
rawFriends.forEach(r => {
  if (r.text && !r.messages) {
    r.messages = [{ text: r.text, time: r.time }]
  }
})
const friendRequests = ref(rawFriends)

const activeMessages = ref([])
const activeMemories = ref([])
const activeDiaries = ref([])
let activeSessionId = null

if (!localStorage.getItem('dbMigrated_v2')) {
  chatSessions.value.forEach(async (chat) => {
    if (chat.messages && chat.messages.length > 0) {
      const msgs = chat.messages.map(m => ({ ...m, sessionId: chat.id, timestamp: m.timestamp || Math.floor(m.id || Date.now()) }))
      await db.messages.bulkAdd(msgs)
      chat.lastMessage = msgs[msgs.length - 1].content 
    }
    if (chat.memoryList && chat.memoryList.length > 0) {
      const mems = chat.memoryList.map(m => {
        const isGroup = chat.isGroup
        const charId = (!isGroup && chat.participants && chat.participants[0] && chat.participants[0].id) ? chat.participants[0].id : null
        return { 
          ...m, 
          sessionId: chat.id, 
          characterId: charId !== null && !isNaN(Number(charId)) ? Number(charId) : charId,
          content: m.content || m.text || '',
          type: m.type || 'event',
          source: m.source || 'chat',
          importance: m.importance !== undefined ? m.importance : 1,
          weight: m.weight !== undefined ? m.weight : (m.importance !== undefined ? m.importance : 1),
          keywords: m.keywords || [],
          isArchived: m.isArchived || false,
          timestamp: m.timestamp || Date.now()
        }
      })
      await db.memories.bulkAdd(mems)
    } else if (chat.memory && typeof chat.memory === 'string') {
      const isGroup = chat.isGroup
      const charId = (!isGroup && chat.participants && chat.participants[0] && chat.participants[0].id) ? chat.participants[0].id : null
      await db.memories.add({ 
        id: Date.now(), 
        sessionId: chat.id, 
        characterId: charId !== null && !isNaN(Number(charId)) ? Number(charId) : charId,
        text: chat.memory, 
        content: chat.memory,
        date: new Date().toLocaleString(),
        type: 'event',
        source: 'chat',
        importance: 1,
        weight: 1,
        keywords: [],
        isArchived: false,
        timestamp: Date.now()
      })
    }
    delete chat.messages
    delete chat.memoryList
    delete chat.memory
  })
  localStorage.setItem('dbMigrated_v2', 'true')
}

watch(chatSessions, (v) => {
  const lightData = v.map(c => ({ ...c, overrideAvatar: '', bgImage: '' }))
  localStorage.setItem(KEY, JSON.stringify(lightData))
}, { deep: true })

watch(cssPresets, (v) => localStorage.setItem(KEY_CSS, JSON.stringify(v)), { deep: true })
watch(friendRequests, (v) => localStorage.setItem(KEY_FRIENDS, JSON.stringify(v)), { deep: true })

;(async () => {
  try {
    const records = await db.media.toArray()
    const mediaMap = {}
    records.forEach(r => mediaMap[r.id] = r.data)

    let needCleanLs = false
    for (const chat of chatSessions.value) {
      if (chat.overrideAvatar && chat.overrideAvatar.length > 1000) {
        await db.media.put({ id: `chat_avt_${chat.id}`, data: chat.overrideAvatar })
        needCleanLs = true
      } else if (mediaMap[`chat_avt_${chat.id}`]) {
        chat.overrideAvatar = mediaMap[`chat_avt_${chat.id}`]
      }
      
      if (chat.bgImage && chat.bgImage.length > 1000) {
        await db.media.put({ id: `chat_bg_${chat.id}`, data: chat.bgImage })
        needCleanLs = true
      } else if (mediaMap[`chat_bg_${chat.id}`]) {
        chat.bgImage = mediaMap[`chat_bg_${chat.id}`]
      }
    }
    if (needCleanLs) {
      localStorage.setItem(KEY, JSON.stringify(chatSessions.value.map(c => ({...c, overrideAvatar: '', bgImage: ''}))))
    }
  } catch (e) { console.error(e) }
})()

const toPlain = (obj) => {
  try {
    if (typeof structuredClone === 'function') {
      return structuredClone(toRaw(obj))
    }
  } catch (e) {}
  try {
    return JSON.parse(JSON.stringify(toRaw(obj)))
  } catch (e) {
    return obj
  }
}

export function useChatSessions() {
  const createSession = (selectedChars) => {
    // 核心防线：过滤掉所有 undefined 和 null，防止外部传脏数据导致崩溃
    const validChars = selectedChars?.filter(c => !!c) || []
    if (validChars.length === 0) return null
    
    const initialVars = {}
    if (validChars.length === 1 && validChars[0].variables) {
      validChars[0].variables.forEach(v => {
        initialVars[v.name] = v.default
      })
    }

    const newChat = {
      id: Date.now(),
      title: validChars.map((c) => c.name).join('、'),
      isGroup: validChars.length > 1,
      participants: validChars,
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
    await db.diaries.where({ sessionId: id }).delete()
    await db.media.delete(`chat_avt_${id}`)
    await db.media.delete(`chat_bg_${id}`)
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
    activeDiaries.value = await db.diaries.where({ sessionId }).toArray()
  }

  const pushMessage = async (sessionId, message) => {
    if (!message.id) message.id = Date.now() + Math.random()
    if (!message.timestamp) message.timestamp = Date.now()
    
    const fullMsg = { ...message, sessionId }
    const safeMsg = toPlain(fullMsg)
    
    await db.messages.add(safeMsg)
    
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

      if (fullMsg.role === 'ai' && typeof document !== 'undefined' && document.hidden) {
        if ('Notification' in window && Notification.permission === 'granted') {
          let plainText = fullMsg.content.replace(/<[^>]+>/g, '').trim()
          if (!plainText) plainText = '[收到新动态]'
          new Notification(session.title || 'AI Phone', {
            body: plainText,
            icon: session.overrideAvatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=AI'
          })
        }
      }
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

  const getDefaultCharacterId = (sessionId) => {
    const chat = chatSessions.value.find(c => c.id === sessionId)
    if (chat && !chat.isGroup && chat.participants && chat.participants[0] && chat.participants[0].id) {
      return chat.participants[0].id
    }
    return null
  }

  const addMemory = async (sessionId, memObj) => {
    if (Array.isArray(memObj)) throw new Error('Memory payload invalid: array')
    if (!memObj.id) memObj.id = Date.now() + Math.random()
    const fullMem = { ...memObj, sessionId }
    if (!fullMem.timestamp) fullMem.timestamp = Date.now()
    if (!fullMem.date) fullMem.date = new Date(fullMem.timestamp).toLocaleString()
    if (fullMem.text === undefined && fullMem.content !== undefined) fullMem.text = fullMem.content
    if (fullMem.content === undefined && fullMem.text !== undefined) fullMem.content = fullMem.text
    if (fullMem.type === undefined) fullMem.type = 'event'
    if (fullMem.source === undefined) fullMem.source = 'chat'
    if (fullMem.importance === undefined) fullMem.importance = 1
    if (fullMem.weight === undefined) fullMem.weight = fullMem.importance
    if (fullMem.characterId === undefined) fullMem.characterId = getDefaultCharacterId(sessionId)
    
    if (fullMem.characterId !== null && !isNaN(Number(fullMem.characterId))) fullMem.characterId = Number(fullMem.characterId)

    if (fullMem.keywords === undefined) fullMem.keywords = []
    if (fullMem.isArchived === undefined) fullMem.isArchived = false

    const safeMem = toPlain(fullMem)
    await db.memories.add(safeMem)
    activeMemories.value.push(fullMem)
  }

  const addStructuredMemory = async (sessionId, memObj) => {
    if (!memObj) return
    if (Array.isArray(memObj)) throw new Error('Memory payload invalid: array')
    const normalized = { ...memObj }
    if (!normalized.id) normalized.id = Date.now() + Math.random()
    if (!normalized.timestamp) normalized.timestamp = Date.now()
    if (!normalized.date) normalized.date = new Date(normalized.timestamp).toLocaleString()
    if (normalized.text === undefined && normalized.content !== undefined) normalized.text = normalized.content
    if (normalized.content === undefined && normalized.text !== undefined) normalized.content = normalized.text
    if (normalized.type === undefined) normalized.type = 'event'
    if (normalized.source === undefined) normalized.source = 'chat'
    if (normalized.importance === undefined) normalized.importance = 1
    if (normalized.weight === undefined) normalized.weight = normalized.importance
    if (normalized.characterId === undefined) normalized.characterId = getDefaultCharacterId(sessionId)
    
    if (normalized.characterId !== null && !isNaN(Number(normalized.characterId))) normalized.characterId = Number(normalized.characterId)

    if (normalized.keywords === undefined) normalized.keywords = []
    if (normalized.isArchived === undefined) normalized.isArchived = false
    
    const fullMem = { ...normalized, sessionId }
    const safeMem = toPlain(fullMem)
    await db.memories.add(safeMem)
    if (activeSessionId === sessionId) {
      activeMemories.value.push(fullMem)
    }
    return fullMem
  }

  const addStructuredMemoriesForCharacters = async (sessionId, characterIds, memObj) => {
    if (!characterIds || characterIds.length === 0) return []
    const results = []
    for (const cid of characterIds) {
      const cloned = { ...memObj, characterId: cid }
      const saved = await addStructuredMemory(sessionId, cloned)
      if (saved) results.push(saved)
    }
    return results
  }

  const getMemoriesByCharacter = async (characterId) => {
    if (!characterId) return []
    return await db.memories.where('characterId').anyOf(Number(characterId), String(characterId)).toArray()
  }

  const getMemoriesBySession = async (sessionId) => {
    if (!sessionId) return []
    return await db.memories.where({ sessionId }).toArray()
  }

  const deleteMemory = async (memoryId) => {
    await db.memories.where({ id: memoryId }).delete()
    activeMemories.value = activeMemories.value.filter(m => m.id !== memoryId)
  }

  const updateMemory = async (memoryId, text) => {
    await db.memories.where({ id: memoryId }).modify({ text, content: text })
    const mem = activeMemories.value.find(m => m.id === memoryId)
    if (mem) {
      mem.text = text
      mem.content = text
    }
  }

  const updateMemoryFields = async (memoryId, updates) => {
    await db.memories.where({ id: memoryId }).modify(updates)
    const mem = activeMemories.value.find(m => m.id === memoryId)
    if (mem) Object.assign(mem, updates)
  }

  const addDiary = async (sessionId, diaryObj) => {
    if (!diaryObj) return null
    if (Array.isArray(diaryObj)) throw new Error('Diary payload invalid: array')
    
    let safeCid = diaryObj.characterId || getDefaultCharacterId(sessionId)
    if (safeCid !== null && !isNaN(Number(safeCid))) safeCid = Number(safeCid)

    const fullDiary = {
      id: diaryObj.id,
      sessionId,
      characterId: safeCid,
      date: diaryObj.date || new Date().toLocaleString(),
      timestamp: diaryObj.timestamp || Date.now(),
      content: diaryObj.content || diaryObj.text || '',
      level: diaryObj.level !== undefined ? diaryObj.level : 1,
      isArchived: diaryObj.isArchived !== undefined ? diaryObj.isArchived : false,
      source: diaryObj.source || 'chat',
      title: diaryObj.title || '',
      type: diaryObj.type || 'daily'
    }
    if (!fullDiary.id) delete fullDiary.id
    const safeDiary = toPlain(fullDiary)
    const id = await db.diaries.add(safeDiary)
    fullDiary.id = id
    if (activeSessionId === sessionId) {
      activeDiaries.value.push(fullDiary)
    }
    return fullDiary
  }

  const updateDiary = async (diaryId, updates) => {
    await db.diaries.where({ id: diaryId }).modify(updates)
    const d = activeDiaries.value.find(i => i.id === diaryId)
    if (d) Object.assign(d, updates)
  }

  const deleteDiary = async (diaryId) => {
    await db.diaries.where({ id: diaryId }).delete()
    activeDiaries.value = activeDiaries.value.filter(d => d.id !== diaryId)
  }

  const getDiariesByCharacter = async (characterId, includeArchived = true) => {
    if (!characterId) return []
    let arr = await db.diaries.where('characterId').anyOf(Number(characterId), String(characterId)).toArray()
    if (!includeArchived) {
      arr = arr.filter(d => !d.isArchived)
    }
    return arr
  }

  const archiveDiaries = async (diaryIds) => {
    if (!diaryIds || diaryIds.length === 0) return
    await db.diaries.where('id').anyOf(diaryIds).modify({ isArchived: true })
    activeDiaries.value = activeDiaries.value.map(d => diaryIds.includes(d.id) ? { ...d, isArchived: true } : d)
  }

  const saveCssPreset = (name, css) => cssPresets.value.push({ id: Date.now(), name, css })
  const deleteCssPreset = (id) => { cssPresets.value = cssPresets.value.filter(p => p.id !== id) }

  const addFriendRequest = (chatId, text) => {
    let req = friendRequests.value.find(r => r.chatId === chatId)
    if (req) {
      req.messages = req.messages || [{ text: req.text, time: req.time }]
      req.messages.push({ text: text || '请求添加你为好友', time: Date.now() })
      req.time = Date.now()
      friendRequests.value = friendRequests.value.filter(r => r.id !== req.id)
      friendRequests.value.unshift(req)
    } else {
      friendRequests.value.unshift({ id: Date.now(), chatId, messages: [{ text: text || '请求添加你为好友', time: Date.now() }], time: Date.now() })
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
        pushMessage(req.chatId, { role: 'system', type: 'text', content: '[系统提示：User(我)已通过了你的好友验证。你现在可以正常发送消息了！]' })
      }
      removeFriendRequest(id)
    }
  }

  return { 
    chatSessions, sessions: chatSessions, cssPresets,
    activeMessages, activeMemories, activeDiaries, friendRequests,
    createSession, deleteSession, clearMessages, loadSessionData,
    pushMessage, updateMessage, removeMessages,
    addMemory, addStructuredMemory, addStructuredMemoriesForCharacters,
    getMemoriesByCharacter, getMemoriesBySession,
    deleteMemory, updateMemory, updateMemoryFields,
    addDiary, updateDiary, deleteDiary, getDiariesByCharacter, archiveDiaries,
    saveCssPreset, deleteCssPreset,
    addFriendRequest, removeFriendRequest, acceptFriendRequest
  }
}
