import Dexie from 'dexie'

export const db = new Dexie('AIPhoneDB')

// 升级数据库版本至 12
// 本次新增 / 补充：
// 1. Todo 单次任务 deadlineDate
// 2. Todo 循环任务相关字段：recurrenceDays、isPaused、endDate
db.version(12).stores({
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

  // 核心资源表
  media: 'id',

  // 冷推 / Spark 模块
  dating_user: '++id, nickname, bio, cover, customCss',
  dating_prefs: '++id, tag, weight, type',
  dating_profiles: '++id, nickname, gender, age, isRevealed',
  dating_chats: '++id, profileId, type, status, messageCount',
  dating_posts: '++id, authorId, content, timestamp',

  // Todo / RPG / 番茄钟系统
  // goalType: phase | week | day | subtask
  // owner: user | ai
  // status: active | archived
  // recurrence: none | daily | weekly
  // recurrenceDays: [1,2,3,4,5,6,7] 中的若干项，表示周一到周日
  // deadlineDate: 单次任务截止日期
  todos: '++id, goalType, owner, title, category, quadrant, status, dueDate, deadlineDate, startDate, endDate, periodKey, parentId, recurrence, isPaused, sortOrder, createdAt, completedAt',

  // Todo 结果表
  // resultType: done | partial | missed | replaced | extra
  todo_results: '++id, planId, date, resultType, isExtra, createdAt, updatedAt',

  // 番茄钟记录表
  pomodoro_records: '++id, taskId, duration, startTime, endTime, status',

  // 每日复盘表
  daily_reviews: '++id, date, rating, createdAt',

  // 灵感碎片表
  idea_fragments: '++id, timestamp, isProcessed',

  // 全局时间轴
  timeline: '++id, type, timestamp',

  // RPG 奖励流水表
  // sourceType:
  // - todo_plan_daily   某条计划在某一天的奖励结算
  // - extra_result      计划外完成事项奖励
  // - pomodoro          专注奖励
  reward_logs: '++id, sourceType, sourceId, date, rewardLevel, createdAt',

  // RPG 当前状态表
  // 默认只维护一条 id=1 的记录
  todo_rpg_state: 'id, updatedAt'
})

export default db
