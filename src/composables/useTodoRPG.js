import { ref } from 'vue'
import db from '@/db'

/**
 * Todo RPG 系统逻辑层
 * 当前职责：
 * 1. 维护 RPG 当前状态
 * 2. 维护奖励流水
 * 3. 负责任务结果奖励结算
 * 4. 负责专注奖励结算
 * 5. 负责“同任务同日只升不降”
 * 6. 为 Tab4、侧边栏、奖励浮层提供统一数据
 */
export function useTodoRPG() {
  const rpgState = ref({
    id: 1,
    level: 1,
    exp: 0,
    nextExp: 120,
    actionPoints: 0,
    bondLevel: 1,
    todayExp: 0,
    todayAp: 0,
    weeklyBossHp: 100,
    weeklyBossMaxHp: 100,
    updatedAt: Date.now()
  })

  /**
   * 规范化日期
   */
  const normalizeDate = (dateLike = new Date()) => {
    const d = new Date(dateLike)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  /**
   * 等级曲线
   * 当前版本采用简单线性增长
   */
  const getNextExpByLevel = (level) => {
    return 120 + (Math.max(1, Number(level)) - 1) * 60
  }

  /**
   * 确保 RPG 状态表里有默认记录
   */
  const ensureRpgState = async () => {
    let state = await db.todo_rpg_state.get(1)

    if (!state) {
      state = {
        id: 1,
        level: 1,
        exp: 0,
        nextExp: getNextExpByLevel(1),
        actionPoints: 0,
        bondLevel: 1,
        todayExp: 0,
        todayAp: 0,
        weeklyBossHp: 100,
        weeklyBossMaxHp: 100,
        updatedAt: Date.now()
      }
      await db.todo_rpg_state.put(state)
    }

    return state
  }

  /**
   * 读取最近奖励记录
   */
  const getRecentRewardLogs = async (limit = 12) => {
    const list = await db.reward_logs.orderBy('createdAt').reverse().limit(limit).toArray()
    return list
  }

  /**
   * 读取今天奖励汇总
   */
  const getTodayRewardSummary = async (dateStr = normalizeDate()) => {
    const logs = await db.reward_logs.where('date').equals(dateStr).toArray()

    let todayExp = 0
    let todayAp = 0

    for (const item of logs) {
      todayExp += Number(item.exp || 0)
      todayAp += Number(item.ap || 0)
    }

    return {
      todayExp,
      todayAp
    }
  }

  /**
   * 重新加载 RPG 当前状态
   * 同时同步 todayExp / todayAp
   */
  const loadRpgState = async () => {
    const state = await ensureRpgState()
    const today = await getTodayRewardSummary()

    const finalState = {
      ...state,
      todayExp: today.todayExp,
      todayAp: today.todayAp
    }

    await db.todo_rpg_state.put({
      ...state,
      todayExp: today.todayExp,
      todayAp: today.todayAp,
      updatedAt: Date.now()
    })

    rpgState.value = finalState
    return finalState
  }

  /**
   * 结果类型对应的奖励等级
   * 用于“只升不降”
   */
  const getRewardLevelByResultType = (resultType) => {
    const map = {
      missed: 0,
      replaced: 1,
      partial: 2,
      done: 3,
      extra: 3
    }
    return map[resultType] ?? 0
  }

  /**
   * 四象限经验系数
   */
  const getQuadrantMultiplier = (quadrant) => {
    const map = {
      1: 1.2,
      2: 1.15,
      3: 1.0,
      4: 0.8
    }
    return map[Number(quadrant)] ?? 1
  }

  /**
   * 计算普通计划结果奖励
   */
  const calculateTodoReward = ({ resultType, quadrant = 2 }) => {
    const rewardLevel = getRewardLevelByResultType(resultType)

    const baseMap = {
      done: { exp: 20, ap: 1, reason: '完成计划' },
      partial: { exp: 10, ap: 0, reason: '部分推进' },
      missed: { exp: 0, ap: 0, reason: '未推进' },
      replaced: { exp: 6, ap: 0, reason: '计划替换' }
    }

    const base = baseMap[resultType] || { exp: 0, ap: 0, reason: '未结算' }
    const multiplier = getQuadrantMultiplier(quadrant)

    return {
      exp: Math.round(base.exp * multiplier),
      ap: base.ap,
      rewardLevel,
      reason: base.reason
    }
  }

  /**
   * 计算计划外事项奖励
   */
  const calculateExtraReward = () => {
    return {
      exp: 15,
      ap: 1,
      rewardLevel: 3,
      reason: '计划外完成'
    }
  }

  /**
   * 计算专注奖励
   * 当前版本按照专注分钟数给奖励
   */
  const calculatePomodoroReward = ({ duration = 25 }) => {
    const mins = Number(duration || 0)

    if (mins >= 90) {
      return {
        exp: 24,
        ap: 2,
        rewardLevel: 3,
        reason: '完成长时专注'
      }
    }

    if (mins >= 50) {
      return {
        exp: 16,
        ap: 1,
        rewardLevel: 2,
        reason: '完成深度专注'
      }
    }

    return {
      exp: 8,
      ap: 1,
      rewardLevel: 1,
      reason: '完成标准专注'
    }
  }

  /**
   * 把奖励写入当前 RPG 状态
   * 负责：
   * 1. 经验累加
   * 2. 行动点累加
   * 3. 升级计算
   */
  const applyRewardToState = async ({ exp = 0, ap = 0 }) => {
    const state = await ensureRpgState()

    let level = Number(state.level || 1)
    let currentExp = Number(state.exp || 0) + Number(exp || 0)
    let actionPoints = Number(state.actionPoints || 0) + Number(ap || 0)
    let nextExp = Number(state.nextExp || getNextExpByLevel(level))
    let levelUpCount = 0

    while (currentExp >= nextExp) {
      currentExp -= nextExp
      level += 1
      nextExp = getNextExpByLevel(level)
      levelUpCount += 1
    }

    const updatedState = {
      ...state,
      level,
      exp: currentExp,
      nextExp,
      actionPoints,
      updatedAt: Date.now()
    }

    await db.todo_rpg_state.put(updatedState)

    const finalState = await loadRpgState()

    return {
      state: finalState,
      levelUpCount
    }
  }

  /**
   * 结算普通计划奖励
   * 规则：
   * 1. 按 planId + date 唯一结算
   * 2. 只升不降
   * 3. 如果从 partial 升到 done，只补差额
   */
  const settleTodoPlanReward = async ({
    planId,
    date,
    resultType,
    quadrant = 2,
    planTitle = ''
  }) => {
    const reward = calculateTodoReward({ resultType, quadrant })

    const existing = await db.reward_logs
      .where('sourceType')
      .equals('todo_plan_daily')
      .filter(item => item.sourceId === planId && item.date === date)
      .first()

    let deltaExp = 0
    let deltaAp = 0
    let logId = null

    if (!existing) {
      if (reward.rewardLevel <= 0) {
        return {
          rewardGranted: false,
          deltaExp: 0,
          deltaAp: 0,
          levelUpCount: 0,
          reason: reward.reason,
          state: await loadRpgState()
        }
      }

      logId = await db.reward_logs.add({
        sourceType: 'todo_plan_daily',
        sourceId: planId,
        date,
        exp: reward.exp,
        ap: reward.ap,
        rewardLevel: reward.rewardLevel,
        reason: reward.reason,
        meta: {
          planId,
          resultType,
          quadrant,
          planTitle
        },
        createdAt: Date.now()
      })

      deltaExp = reward.exp
      deltaAp = reward.ap
    } else {
      if (reward.rewardLevel > Number(existing.rewardLevel || 0)) {
        deltaExp = Math.max(0, Number(reward.exp || 0) - Number(existing.exp || 0))
        deltaAp = Math.max(0, Number(reward.ap || 0) - Number(existing.ap || 0))

        await db.reward_logs.update(existing.id, {
          exp: reward.exp,
          ap: reward.ap,
          rewardLevel: reward.rewardLevel,
          reason: reward.reason,
          meta: {
            ...(existing.meta || {}),
            planId,
            resultType,
            quadrant,
            planTitle
          }
        })

        logId = existing.id
      } else {
        return {
          rewardGranted: false,
          deltaExp: 0,
          deltaAp: 0,
          levelUpCount: 0,
          reason: reward.reason,
          state: await loadRpgState()
        }
      }
    }

    const result = await applyRewardToState({
      exp: deltaExp,
      ap: deltaAp
    })

    return {
      rewardGranted: deltaExp > 0 || deltaAp > 0,
      deltaExp,
      deltaAp,
      levelUpCount: result.levelUpCount,
      reason: reward.reason,
      logId,
      state: result.state
    }
  }

  /**
   * 结算计划外事项奖励
   * 规则：
   * 1. 计划外事项按 resultId 唯一结算
   * 2. 每条 extra 只发一次
   */
  const settleExtraReward = async ({
    resultId,
    date,
    actualText = ''
  }) => {
    const existing = await db.reward_logs
      .where('sourceType')
      .equals('extra_result')
      .filter(item => item.sourceId === resultId)
      .first()

    if (existing) {
      return {
        rewardGranted: false,
        deltaExp: 0,
        deltaAp: 0,
        levelUpCount: 0,
        reason: '计划外完成',
        state: await loadRpgState()
      }
    }

    const reward = calculateExtraReward()

    const logId = await db.reward_logs.add({
      sourceType: 'extra_result',
      sourceId: resultId,
      date,
      exp: reward.exp,
      ap: reward.ap,
      rewardLevel: reward.rewardLevel,
      reason: reward.reason,
      meta: {
        resultId,
        actualText
      },
      createdAt: Date.now()
    })

    const result = await applyRewardToState({
      exp: reward.exp,
      ap: reward.ap
    })

    return {
      rewardGranted: true,
      deltaExp: reward.exp,
      deltaAp: reward.ap,
      levelUpCount: result.levelUpCount,
      reason: reward.reason,
      logId,
      state: result.state
    }
  }

  /**
   * 结算番茄钟奖励
   * 规则：
   * 1. 一条 pomodoro 记录只结算一次
   * 2. 使用 recordId 作为唯一来源
   */
  const settlePomodoroReward = async ({
    recordId,
    duration = 25,
    startTime = null,
    endTime = null
  }) => {
    const existing = await db.reward_logs
      .where('sourceType')
      .equals('pomodoro')
      .filter(item => item.sourceId === recordId)
      .first()

    if (existing) {
      return {
        rewardGranted: false,
        deltaExp: 0,
        deltaAp: 0,
        levelUpCount: 0,
        reason: '专注奖励已结算',
        state: await loadRpgState()
      }
    }

    const reward = calculatePomodoroReward({ duration })
    const date = normalizeDate(endTime || Date.now())

    const logId = await db.reward_logs.add({
      sourceType: 'pomodoro',
      sourceId: recordId,
      date,
      exp: reward.exp,
      ap: reward.ap,
      rewardLevel: reward.rewardLevel,
      reason: reward.reason,
      meta: {
        recordId,
        duration,
        startTime,
        endTime
      },
      createdAt: Date.now()
    })

    const result = await applyRewardToState({
      exp: reward.exp,
      ap: reward.ap
    })

    return {
      rewardGranted: true,
      deltaExp: reward.exp,
      deltaAp: reward.ap,
      levelUpCount: result.levelUpCount,
      reason: reward.reason,
      logId,
      state: result.state
    }
  }

  return {
    rpgState,
    normalizeDate,
    ensureRpgState,
    loadRpgState,
    getRecentRewardLogs,
    getTodayRewardSummary,
    getRewardLevelByResultType,
    getQuadrantMultiplier,
    calculateTodoReward,
    calculateExtraReward,
    calculatePomodoroReward,
    applyRewardToState,
    settleTodoPlanReward,
    settleExtraReward,
    settlePomodoroReward
  }
}
