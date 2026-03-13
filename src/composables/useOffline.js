import { ref } from 'vue'
import db from '@/db'

export function useOffline() {
  const offlineSessions = ref([])
  const activeOfflineMessages = ref([])
  const currentSession = ref(null)

  const loadAllSessions = async () => {
    const records = await db.offlineSessions.orderBy('createTime').reverse().toArray()
    offlineSessions.value = records
  }

  const createOrLoadSession = async (chatId, chatTitle) => {
    const newSession = {
      chatId,
      chatTitle,
      createTime: Date.now(),
      bgImage: '',
      lastSummarizedFloor: 0,
      config: {
        wordCountMin: 150,
        wordCountMax: 300,
        antiRepeatPrompt: '绝对禁止抢话！禁止复述User的动作和语言！绝不要替User做决定，只描写你自己的反应和话语。',
        stylePrompt: '细腻的环境描写，注重人物的神态与微表情。',
        autoSummaryCount: 0,
        summaryPrompt: '请将以下线下见面的扮演记录总结为一段第一人称（我）视角的日记/记忆。要求保留重要的设定、情感进展和发生的事，字数在 150-300 字左右。'
      }
    }
    const id = await db.offlineSessions.add(newSession)
    newSession.id = id
    currentSession.value = newSession
    activeOfflineMessages.value = []
    return id
  }

  const loadSessionById = async (id) => {
    const session = await db.offlineSessions.get(id)
    if (session) {
      currentSession.value = session
      const msgs = await db.offlineMessages.where({ sessionId: id }).sortBy('floor')
      activeOfflineMessages.value = msgs
    }
  }

  const updateSessionConfig = async (newConfig) => {
    if (!currentSession.value) return
    currentSession.value.config = { ...currentSession.value.config, ...newConfig }
    await db.offlineSessions.update(currentSession.value.id, { config: currentSession.value.config })
  }

  const updateSessionBg = async (bgUrl) => {
    if (!currentSession.value) return
    currentSession.value.bgImage = bgUrl
    await db.offlineSessions.update(currentSession.value.id, { bgImage: bgUrl })
  }

  const updateSessionLastSummarizedFloor = async (floor) => {
    if (!currentSession.value) return
    currentSession.value.lastSummarizedFloor = floor
    await db.offlineSessions.update(currentSession.value.id, { lastSummarizedFloor: floor })
  }

  const addOfflineMessage = async (msgObj) => {
    if (!currentSession.value) return
    const floor = activeOfflineMessages.value.length + 1
    const newMsg = {
      sessionId: currentSession.value.id,
      floor,
      timestamp: Date.now(),
      ...msgObj
    }
    const id = await db.offlineMessages.add(newMsg)
    newMsg.id = id
    activeOfflineMessages.value.push(newMsg)
    return newMsg
  }

  // 核心新增：编辑指定消息
  const updateOfflineMessage = async (msgId, newContent) => {
    await db.offlineMessages.update(msgId, { content: newContent })
    const msg = activeOfflineMessages.value.find(m => m.id === msgId)
    if (msg) msg.content = newContent
  }

  // 核心新增：删除多条消息 (用于手动删除或重Roll截断)
  const deleteOfflineMessages = async (msgIds) => {
    await db.offlineMessages.where('id').anyOf(msgIds).delete()
    activeOfflineMessages.value = activeOfflineMessages.value.filter(m => !msgIds.includes(m.id))
  }

  const deleteSession = async (id) => {
    await db.offlineSessions.delete(id)
    await db.offlineMessages.where({ sessionId: id }).delete()
    offlineSessions.value = offlineSessions.value.filter(s => s.id !== id)
  }

  return {
    offlineSessions,
    activeOfflineMessages,
    currentSession,
    loadAllSessions,
    createOrLoadSession,
    loadSessionById,
    updateSessionConfig,
    updateSessionBg,
    updateSessionLastSummarizedFloor,
    addOfflineMessage,
    updateOfflineMessage,
    deleteOfflineMessages,
    deleteSession
  }
}


