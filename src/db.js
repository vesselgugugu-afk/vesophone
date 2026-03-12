import Dexie from 'dexie'

export const db = new Dexie('AIPhoneDB')

// 升级数据库版本至 3，追加音乐相关表
db.version(3).stores({
  worldbooks: '++id, group, title, enabled',
  characters: '++id, name',
  personas: '++id, title, isActive',
  
  // 混合存储：巨量数据存放在 DB 中
  messages: 'id, sessionId, role, type',
  memories: 'id, sessionId, date',

  // 音乐模块专属表
  musicLibrary: 'name', // 本地歌单库，主键为歌单名
  musicStats: 'id'      // 听歌统计表，使用单例主键 'global'
})

export default db

