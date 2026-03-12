import Dexie from 'dexie'

export const db = new Dexie('AIPhoneDB')

db.version(2).stores({
  worldbooks: '++id, group, title, enabled',
  characters: '++id, name',
  personas: '++id, title, isActive',
  
  // 混合存储：巨量数据存放在 DB 中
  messages: 'id, sessionId, role, type',
  memories: 'id, sessionId, date'
})

export default db
