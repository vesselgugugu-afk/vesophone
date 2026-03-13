import Dexie from 'dexie'

export const db = new Dexie('AIPhoneDB')

// 升级数据库版本至 5，追加 media 统一多媒体表
db.version(5).stores({
  worldbooks: '++id, group, title, enabled',
  characters: '++id, name',
  personas: '++id, title, isActive',
  
  // 混合存储：巨量数据存放在 DB 中
  messages: 'id, sessionId, role, type',
  memories: 'id, sessionId, date',

  // 音乐模块专属表
  musicLibrary: 'name', 
  musicStats: 'id',     

  // 线下见面专属表
  offlineSessions: '++id, chatId, createTime',
  offlineMessages: '++id, sessionId, floor, timestamp',

  // 核心新增：专门存储大体积图片的资源表
  media: 'id' // 主键格式如 'char_123' 或 'chat_bg_456'
})

export default db
