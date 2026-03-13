import Dexie from 'dexie'

export const db = new Dexie('AIPhoneDB')

// 升级数据库版本至 4，追加线下见面相关表
db.version(4).stores({
  worldbooks: '++id, group, title, enabled',
  characters: '++id, name',
  personas: '++id, title, isActive',
  
  // 混合存储：巨量数据存放在 DB 中
  messages: 'id, sessionId, role, type',
  memories: 'id, sessionId, date',

  // 音乐模块专属表
  musicLibrary: 'name', // 本地歌单库，主键为歌单名
  musicStats: 'id',     // 听歌统计表，使用单例主键 'global'

  // 线下见面专属表
  offlineSessions: '++id, chatId, createTime',
  offlineMessages: '++id, sessionId, floor, timestamp'
})

export default db


