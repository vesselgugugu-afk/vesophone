import Dexie from 'dexie'

export const db = new Dexie('AIPhoneDB')

// 升级数据库版本至 7，追加冷推专属表
db.version(7).stores({
  worldbooks: '++id, group, title, enabled',
  characters: '++id, name',
  personas: '++id, title, isActive',
  
  // 混合存储：巨量数据存放在 DB 中
  messages: 'id, sessionId, role, type',
  memories: 'id, sessionId, characterId, date, type, source, importance, weight',

  // 日记/起居注系统
  diaries: '++id, sessionId, characterId, date, level, isArchived',
  memoryBundles: '++id, characterId, level, source, date',

  // 音乐模块专属表
  musicLibrary: 'name', 
  musicStats: 'id',     

  // 线下见面专属表
  offlineSessions: '++id, chatId, createTime',
  offlineMessages: '++id, sessionId, floor, timestamp',

  // 核心新增：专门存储大体积图片的资源表
  media: 'id', // 主键格式如 'char_123' 或 'chat_bg_456'

  // ==========================================
  // 冷推 (Cold Push / Spark) 专属独立数据表
  // ==========================================
  dating_user: '++id, nickname, bio, cover, customCss',
  dating_prefs: '++id, tag, weight, type', 
  dating_profiles: '++id, nickname, gender, age, isRevealed', 
  dating_chats: '++id, profileId, type, status, messageCount', 
  dating_posts: '++id, authorId, content, timestamp'
})

export default db

