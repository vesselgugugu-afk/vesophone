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
    // 查找该角色今天是否已经有未完成的见面记录，这里简化为每次从 QQ 进入都创建新记录
    // 也可以扩展为找最近的一条。目前我们采用每次点击都开辟一次新见面的逻辑。
    const newSession = {
      chatId,
      chatTitle,
      createTime: Date.now(),
      bgImage: '',
      config: {
        wordCount: 150,
        antiRepeat: true,
        stylePrompt: '细腻的环境描写，注重人物的神态与微表情。'
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
    addOfflineMessage,
    deleteSession
  }
}
