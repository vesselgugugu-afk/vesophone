import { computed } from 'vue'
import db from '@/db'

/**
 * Todo 核心逻辑层
 * 职责：
 * 1. 管理计划项与结果项
 * 2. 管理阶段目标 / 周目标 / 日计划 / 子任务层级
 * 3. 构建 Tab1 对账数据
 * 4. 提供目标进度计算
 * 5. 提供日期面板和周视图所需的数据辅助方法
 * 6. 支持循环任务（每日 / 每周）
 * 7. 支持子任务结果也走统一结果体系
 * 8. 本次补充：单次任务 deadlineDate、循环任务结束日期 endDate
 */
export function useTodo() {
  const normalizeDate = (dateLike = new Date()) => {
    const d = new Date(dateLike)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const getWeekKey = (dateLike = new Date()) => {
    const d = new Date(dateLike)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
    const week1 = new Date(d.getFullYear(), 0, 4)
    const weekNo = 1 + Math.round((((d.getTime() - week1.getTime()) / 86400000) - 3 + ((week1.getDay() + 6) % 7)) / 7)
    return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`
  }

  const getMonthKey = (dateLike = new Date()) => {
    const d = new Date(dateLike)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  /**
   * 获取某个日期所在周的 7 天（周一到周日）
   */
  const getDaysOfWeek = (dateStr) => {
    const d = new Date(dateStr)
    const day = d.getDay() || 7
    d.setDate(d.getDate() - day + 1)
    const days = []
    for (let i = 0; i < 7; i++) {
      days.push(normalizeDate(new Date(d)))
      d.setDate(d.getDate() + 1)
    }
    return days
  }

  /**
   * 将日期转成“周几”
   * 返回：
   * 1~7 => 周一到周日
   */
  const getWeekdayNumber = (dateLike) => {
    const d = new Date(dateLike)
    const jsDay = d.getDay()
    return jsDay === 0 ? 7 : jsDay
  }

  /**
   * 判断循环任务模板在某天是否仍处于有效期
   */
  const isTodoInRecurringDateRange = (todo, dateStr) => {
    if (!todo) return false

    const targetDate = normalizeDate(dateStr)
    const startDate = todo.startDate ? normalizeDate(todo.startDate) : ''
    const endDate = todo.endDate ? normalizeDate(todo.endDate) : ''

    if (startDate && targetDate < startDate) return false
    if (endDate && targetDate > endDate) return false

    return true
  }

  /**
   * 判断某条任务在某天是否应该出现
   * 规则：
   * 1. recurrence = none 只看 dueDate
   * 2. recurrence = daily 每天都出现（在有效期内）
   * 3. recurrence = weekly 只有命中 recurrenceDays 才出现
   */
  const isTodoScheduledForDate = (todo, dateStr) => {
    if (!todo) return false
    if (todo.goalType !== 'day') return false
    if (todo.status === 'archived') return false
    if (todo.isPaused) return false

    const recurrence = todo.recurrence || 'none'
    const targetDate = normalizeDate(dateStr)

    if (recurrence === 'none') {
      return String(todo.dueDate || '') === targetDate
    }

    if (!isTodoInRecurringDateRange(todo, targetDate)) {
      return false
    }

    if (recurrence === 'daily') {
      return true
    }

    if (recurrence === 'weekly') {
      const weekday = getWeekdayNumber(targetDate)
      const recurrenceDays = Array.isArray(todo.recurrenceDays)
        ? todo.recurrenceDays.map(item => Number(item))
        : []

      return recurrenceDays.includes(weekday)
    }

    return false
  }

  const createEmptyTodo = (dateStr = normalizeDate(), goalType = 'day') => {
    return {
      goalType,
      owner: 'user',
      title: '',
      category: '',
      quadrant: 2,
      status: 'active',
      dueDate: goalType === 'day' || goalType === 'subtask' ? dateStr : '',
      deadlineDate: '',
      startDate: goalType === 'week' || goalType === 'phase' ? dateStr : '',
      endDate: '',
      periodKey: goalType === 'week' ? getWeekKey(dateStr) : (goalType === 'phase' ? getMonthKey(dateStr) : dateStr),
      note: '',
      parentId: null,
      recurrence: 'none',
      recurrenceDays: [],
      isPaused: false,
      sortOrder: 0,
      createdAt: Date.now(),
      completedAt: null
    }
  }

  const createEmptyResult = (planId = null, dateStr = normalizeDate()) => {
    return {
      planId,
      date: dateStr,
      resultType: 'done',
      actualText: '',
      score: 100,
      reason: '',
      isExtra: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  }

  const addTodo = async (payload = {}) => {
    const goalType = payload.goalType || 'day'
    const dateStr = payload.dueDate || payload.startDate || normalizeDate()
    const base = createEmptyTodo(dateStr, goalType)
    const todo = {
      ...base,
      ...payload
    }
    return await db.todos.add(todo)
  }

  const updateTodo = async (id, patch = {}) => {
    return await db.todos.update(id, patch)
  }

  /**
   * 删除计划或目标
   * 当前策略：
   * 1. 删除直接子项
   * 2. 删除对应结果
   */
  const removeTodo = async (id) => {
    const children = await db.todos.where('parentId').equals(id).toArray()

    for (const child of children) {
      const grandChildren = await db.todos.where('parentId').equals(child.id).toArray()
      for (const grand of grandChildren) {
        await db.todo_results.where('planId').equals(grand.id).delete()
        await db.todos.delete(grand.id)
      }

      await db.todo_results.where('planId').equals(child.id).delete()
      await db.todos.delete(child.id)
    }

    await db.todo_results.where('planId').equals(id).delete()
    await db.todos.delete(id)
  }

  const addResult = async (payload = {}) => {
    const base = createEmptyResult(payload.planId || null, payload.date || normalizeDate())
    const result = {
      ...base,
      ...payload,
      updatedAt: Date.now()
    }
    return await db.todo_results.add(result)
  }

  const getResultByPlanAndDate = async (planId, dateStr) => {
    return await db.todo_results
      .where('planId')
      .equals(planId)
      .filter(item => item.date === dateStr)
      .first()
  }

  const saveResultForPlan = async (planId, dateStr, payload = {}) => {
    const exists = await getResultByPlanAndDate(planId, dateStr)
    if (exists) {
      await db.todo_results.update(exists.id, {
        ...payload,
        updatedAt: Date.now()
      })
      return exists.id
    }
    return await addResult({
      planId,
      date: dateStr,
      ...payload
    })
  }

  const removeResult = async (id) => {
    return await db.todo_results.delete(id)
  }

  /**
   * 删除某条计划在某日的结果
   * 用于子任务取消勾选
   */
  const removeResultByPlanAndDate = async (planId, dateStr) => {
    const exists = await getResultByPlanAndDate(planId, dateStr)
    if (!exists) return null
    await db.todo_results.delete(exists.id)
    return exists.id
  }

  const getTodosByGoalType = async (goalType) => {
    const list = await db.todos.where('goalType').equals(goalType).toArray()
    return list
      .filter(item => item.status !== 'archived')
      .sort((a, b) => {
        const aSort = Number(a.sortOrder || 0)
        const bSort = Number(b.sortOrder || 0)
        if (aSort !== bSort) return aSort - bSort
        return Number(a.createdAt || 0) - Number(b.createdAt || 0)
      })
  }

  const getPhaseGoals = async () => {
    return await getTodosByGoalType('phase')
  }

  const getWeekGoals = async () => {
    return await getTodosByGoalType('week')
  }

  /**
   * 获取某天的“今日任务”
   * 规则：
   * 1. 单次任务：dueDate === dateStr 且 recurrence = none
   * 2. 循环任务：根据 recurrence / recurrenceDays 命中今天
   */
  const getPlansByDate = async (dateStr) => {
    const allTodos = await db.todos.toArray()

    const list = allTodos
      .filter(item => item.goalType === 'day')
      .filter(item => isTodoScheduledForDate(item, dateStr))
      .sort((a, b) => {
        const aSort = Number(a.sortOrder || 0)
        const bSort = Number(b.sortOrder || 0)
        if (aSort !== bSort) return aSort - bSort
        return Number(a.createdAt || 0) - Number(b.createdAt || 0)
      })

    return list
  }

  const getPlansByDateRange = async (dateArray) => {
    const allTodos = await db.todos.toArray()
    const resultMap = new Map()

    for (const dateStr of dateArray) {
      const list = allTodos
        .filter(item => item.goalType === 'day')
        .filter(item => isTodoScheduledForDate(item, dateStr))

      for (const item of list) {
        const key = `${item.id}_${dateStr}`
        resultMap.set(key, {
          ...item,
          _scheduledDate: dateStr
        })
      }
    }

    return Array.from(resultMap.values())
  }

  const getSubtasks = async (parentId) => {
    const list = await db.todos.where('parentId').equals(parentId).toArray()
    return list
      .filter(item => item.goalType === 'subtask')
      .sort((a, b) => {
        const aSort = Number(a.sortOrder || 0)
        const bSort = Number(b.sortOrder || 0)
        if (aSort !== bSort) return aSort - bSort
        return Number(a.createdAt || 0) - Number(b.createdAt || 0)
      })
  }

  const replaceSubtasks = async (parentId, subtasks = [], dateStr = normalizeDate()) => {
    const oldSubtasks = await getSubtasks(parentId)

    for (const item of oldSubtasks) {
      await db.todo_results.where('planId').equals(item.id).delete()
      await db.todos.delete(item.id)
    }

    for (let i = 0; i < subtasks.length; i++) {
      const title = String(subtasks[i]?.title || '').trim()
      if (!title) continue

      await addTodo({
        goalType: 'subtask',
        title,
        dueDate: dateStr,
        periodKey: dateStr,
        parentId,
        sortOrder: i,
        note: subtasks[i]?.note || '',
        category: subtasks[i]?.category || '',
        quadrant: subtasks[i]?.quadrant || 2
      })
    }
  }

  const getResultsByDate = async (dateStr) => {
    return await db.todo_results.where('date').equals(dateStr).toArray()
  }

  /**
   * 获取某天 Tab1 用的对账数据
   * 本次补充：
   * 1. 子任务带上当天结果
   * 2. 父任务继续带当天结果
   */
  const getPlanResultPairsByDate = async (dateStr) => {
    const plans = await getPlansByDate(dateStr)
    const results = await getResultsByDate(dateStr)
    const allTodos = await db.todos.toArray()

    const planResults = []

    for (const plan of plans) {
      const result = results.find(r => r.planId === plan.id && !r.isExtra) || null

      const subtasks = await getSubtasks(plan.id)
      const subtasksWithResults = subtasks.map(subtask => {
        const subtaskResult = results.find(r => r.planId === subtask.id && !r.isExtra) || null
        return {
          ...subtask,
          result: subtaskResult
        }
      })

      const weekGoal = allTodos.find(item => item.id === plan.parentId && item.goalType === 'week') || null
      const phaseGoal = weekGoal ? (allTodos.find(item => item.id === weekGoal.parentId && item.goalType === 'phase') || null) : null

      planResults.push({
        plan,
        result,
        subtasks: subtasksWithResults,
        weekGoal,
        phaseGoal,
        isRecurringProjection: plan.recurrence && plan.recurrence !== 'none'
      })
    }

    const extraResults = results.filter(r => r.isExtra)

    return {
      planResults,
      extraResults
    }
  }

  const appendTimelineEvent = async (payload = {}) => {
    return await db.timeline.add({
      type: payload.type || 'custom',
      content: payload.content || '',
      timestamp: payload.timestamp || Date.now(),
      meta: payload.meta || null
    })
  }

  const getResultScoreByType = (resultType) => {
    const map = {
      done: 100,
      partial: 60,
      missed: 0,
      replaced: 40,
      extra: 100
    }
    return map[resultType] ?? 0
  }

  const buildDaySummaryFromPairs = (pairs = []) => {
    const total = pairs.length
    let done = 0
    let todo = 0
    let partial = 0
    let missed = 0

    for (const item of pairs) {
      if (!item.result) {
        todo += 1
        continue
      }
      if (item.result.resultType === 'done') done += 1
      else if (item.result.resultType === 'partial') partial += 1
      else if (item.result.resultType === 'missed') missed += 1
      else todo += 1
    }

    return {
      total,
      done,
      todo,
      partial,
      missed
    }
  }

  /**
   * 计算目标进度
   * 规则：
   * 1. 周目标：统计它下面挂载的日计划结果平均分
   * 2. 阶段目标：统计它下面挂载的周目标平均进度
   */
  const calculateGoalProgress = async (goal) => {
    if (!goal) return 0

    if (goal.goalType === 'week') {
      const childPlans = await db.todos.where('parentId').equals(goal.id).toArray()
      const dayPlans = childPlans.filter(item => item.goalType === 'day')

      if (dayPlans.length === 0) return 0

      const planIds = dayPlans.map(item => item.id)
      const allResults = await db.todo_results.where('planId').anyOf(planIds).toArray()

      let totalScore = 0

      for (const plan of dayPlans) {
        const result = allResults
          .filter(item => item.planId === plan.id)
          .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))[0]

        if (!result) {
          totalScore += 0
          continue
        }

        totalScore += Number(result.score || getResultScoreByType(result.resultType))
      }

      return Math.round(totalScore / dayPlans.length)
    }

    if (goal.goalType === 'phase') {
      const childWeeks = await db.todos.where('parentId').equals(goal.id).toArray()
      const weekGoals = childWeeks.filter(item => item.goalType === 'week')

      if (weekGoals.length === 0) return 0

      let total = 0
      for (const weekGoal of weekGoals) {
        total += await calculateGoalProgress(weekGoal)
      }

      return Math.round(total / weekGoals.length)
    }

    return 0
  }

  /**
   * 获取某个月哪些日期有记录
   * 有记录定义：
   * 1. 当天有日计划（含命中的循环任务）
   * 2. 或当天有结果记录
   */
  const getMarkedDatesByMonth = async (year, month) => {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`
    const allTodos = await db.todos.toArray()
    const results = await db.todo_results.toArray()

    const markedSet = new Set()

    /**
     * 先标记单次任务
     */
    for (const todo of allTodos) {
      if (todo.goalType !== 'day') continue
      if (todo.status === 'archived') continue

      if ((todo.recurrence || 'none') === 'none' && String(todo.dueDate || '').startsWith(monthStr)) {
        markedSet.add(todo.dueDate)
      }
    }

    /**
     * 再标记循环任务在该月命中的日期
     */
    const daysInMonth = new Date(year, month, 0).getDate()
    const recurringTodos = allTodos.filter(item => {
      return item.goalType === 'day'
        && item.status !== 'archived'
        && !item.isPaused
        && (item.recurrence === 'daily' || item.recurrence === 'weekly')
    })

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

      for (const todo of recurringTodos) {
        if (isTodoScheduledForDate(todo, dateStr)) {
          markedSet.add(dateStr)
        }
      }
    }

    /**
     * 结果记录也会标记日期
     */
    for (const result of results) {
      if (String(result.date || '').startsWith(monthStr)) {
        markedSet.add(result.date)
      }
    }

    return Array.from(markedSet)
  }

  const todayStr = computed(() => normalizeDate())

  return {
    todayStr,
    normalizeDate,
    getWeekKey,
    getMonthKey,
    getDaysOfWeek,
    getWeekdayNumber,
    isTodoInRecurringDateRange,
    isTodoScheduledForDate,
    createEmptyTodo,
    createEmptyResult,
    addTodo,
    updateTodo,
    removeTodo,
    addResult,
    saveResultForPlan,
    removeResult,
    removeResultByPlanAndDate,
    getTodosByGoalType,
    getPhaseGoals,
    getWeekGoals,
    getPlansByDate,
    getPlansByDateRange,
    getSubtasks,
    replaceSubtasks,
    getResultsByDate,
    getResultByPlanAndDate,
    getPlanResultPairsByDate,
    appendTimelineEvent,
    getResultScoreByType,
    buildDaySummaryFromPairs,
    calculateGoalProgress,
    getMarkedDatesByMonth
  }
}
