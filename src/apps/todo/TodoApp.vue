<template>
  <transition name="slide-up">
    <div v-if="show" class="todo-app-page">
      <!-- 正常 TodoApp 主界面：只有在未进入全屏专注时才显示顶部 -->
      <div v-if="!showFocusFullscreen" class="todo-app-header">
        <div class="todo-left-group">
          <div class="header-btn" @click="$emit('close')"><i class="fas fa-arrow-left"></i></div>
        </div>

        <div class="todo-app-title-group">
          <div class="todo-app-title">随身日程</div>
        </div>

        <div class="todo-right-group">
          <div class="header-btn" @click="showSidebar = true"><i class="fas fa-bars"></i></div>
        </div>
      </div>

      <div class="todo-app-body">
        <Tab1_List
          v-if="activeTab === 'list' && !showFocusFullscreen"
          :dateTitle="dateTitle"
          :planResults="displayPlanResults"
          :extraResults="displayExtraResults"
          :activeWeekGoals="activeWeekGoalsWithProgress"
          :activePhaseGoals="activePhaseGoalsWithProgress"
          :weekDaysList="weekDaysList"
          @prev-day="goPrevDay"
          @next-day="goNextDay"
          @go-today="goToday"
          @add-plan="handleQuickAddPlan"
          @edit-result="openResultEditor"
          @add-extra-result="openExtraEditor"
          @open-plan-editor="handleOpenPlanEditor"
          @toggle-week-day="toggleWeekDay"
          @open-date-picker="openDatePicker"
          @toggle-subtask="handleToggleSubtask"
          @end-recurring="handleEndRecurring"
        />

        <Tab2_Focus
          v-if="activeTab === 'focus' && !showFocusFullscreen"
          @start-focus-session="handleStartFocusSession"
        />

        <Tab3_Stats v-if="activeTab === 'stats' && !showFocusFullscreen" :summary="summary" />

        <Tab4_RPG
          v-if="activeTab === 'rpg' && !showFocusFullscreen"
          :rpgState="rpgPanelState"
          :activePhaseGoals="activePhaseGoalsWithProgress"
          :activeWeekGoals="activeWeekGoalsWithProgress"
        />

        <Tab5_Diary v-if="activeTab === 'diary' && !showFocusFullscreen" />

        <!-- 全屏专注覆盖层：真正盖住整个 TodoApp -->
        <FocusSessionFullscreen
          v-if="showFocusFullscreen"
          :config="focusSessionConfig"
          @close="handleCloseFocusFullscreen"
          @session-finished="handlePomodoroFinished"
        />
      </div>

      <!-- 底部导航：进入全屏专注后隐藏 -->
      <TodoBottomNav v-if="!showFocusFullscreen" v-model="activeTab" />

      <!-- 右下新建按钮：只在 Tab1 显示 -->
      <button v-if="activeTab === 'list' && !showFocusFullscreen" class="fab-add-btn" @click="openNewPlanEditor">
        <i class="fas fa-plus"></i>
      </button>

      <TodoSidebar
        :show="showSidebar"
        :summary="summary"
        :todayFocusMinutes="todayFocusMinutes"
        :phaseGoalCount="phaseGoals.length"
        :weekGoalCount="weekGoals.length"
        :currentMainlineText="currentMainlineText"
        :activeFilter="activeFilter"
        :activeCategory="activeCategory"
        :categories="availableCategories"
        :rpgState="rpgPanelState"
        @close="showSidebar = false"
        @open-goal-manager="openGoalManager"
        @change-filter="handleChangeFilter"
        @change-category="handleChangeCategory"
      />

      <ResultEditorSheet
        :show="showResultSheet"
        :plan="editingPlan"
        :modelValue="editingResultDraft"
        @close="closeResultEditor"
        @save="handleSaveResult"
      />

      <PlanEditorSheet
        :show="showPlanEditor"
        :plan="editingPlanDraft"
        :phaseGoals="phaseGoals"
        :weekGoals="weekGoals"
        @close="closePlanEditor"
        @save="handleSavePlan"
        @delete-plan="handleDeletePlan"
      />

      <GoalManagerSheet
        :show="showGoalManager"
        :phaseGoals="phaseGoals"
        :weekGoals="weekGoals"
        :goalProgressMap="goalProgressMap"
        @close="closeGoalManager"
        @create-goal="handleCreateGoal"
        @update-goal="handleUpdateGoal"
        @delete-goal="handleDeleteGoal"
      />

      <DatePickerSheet
        :show="showDatePicker"
        :currentYear="pickerYear"
        :currentMonth="pickerMonth"
        :selectedDate="currentDate"
        :markedDates="markedDates"
        @close="closeDatePicker"
        @select-date="handlePickDate"
        @change-month="handleChangePickerMonth"
      />

      <RewardToast
        :show="rewardToast.show"
        :title="rewardToast.title"
        :exp="rewardToast.exp"
        :ap="rewardToast.ap"
        :levelUpCount="rewardToast.levelUpCount"
        :reason="rewardToast.reason"
      />
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import db from '@/db'
import { useTodo } from '@/composables/useTodo'
import { useTodoRPG } from '@/composables/useTodoRPG'

import TodoBottomNav from './TodoBottomNav.vue'
import TodoSidebar from './TodoSidebar.vue'
import Tab1_List from './views/Tab1_List.vue'
import Tab2_Focus from './views/Tab2_Focus.vue'
import Tab3_Stats from './views/Tab3_Stats.vue'
import Tab4_RPG from './views/Tab4_RPG.vue'
import Tab5_Diary from './views/Tab5_Diary.vue'
import ResultEditorSheet from './components/ResultEditorSheet.vue'
import PlanEditorSheet from './components/PlanEditorSheet.vue'
import GoalManagerSheet from './components/GoalManagerSheet.vue'
import DatePickerSheet from './components/DatePickerSheet.vue'
import RewardToast from './components/RewardToast.vue'
import FocusSessionFullscreen from './components/FocusSessionFullscreen.vue'

const props = defineProps({ show: Boolean })
const emit = defineEmits(['close'])

const {
  normalizeDate,
  getWeekKey,
  getMonthKey,
  getDaysOfWeek,
  getMarkedDatesByMonth,
  addTodo,
  addResult,
  updateTodo,
  removeTodo,
  saveResultForPlan,
  removeResultByPlanAndDate,
  getPlanResultPairsByDate,
  appendTimelineEvent,
  buildDaySummaryFromPairs,
  getPhaseGoals,
  getWeekGoals,
  getSubtasks,
  replaceSubtasks,
  calculateGoalProgress
} = useTodo()

const {
  rpgState,
  loadRpgState,
  getRecentRewardLogs,
  settleTodoPlanReward,
  settleExtraReward,
  settlePomodoroReward
} = useTodoRPG()

const activeTab = ref('list')
const showSidebar = ref(false)
const currentDate = ref(normalizeDate())

/**
 * 当前日期对应的原始任务数据
 */
const rawPlanResults = ref([])
const rawExtraResults = ref([])

const phaseGoals = ref([])
const weekGoals = ref([])
const goalProgressMap = ref({})

const showResultSheet = ref(false)
const editingPlan = ref(null)
const editingResultDraft = ref({ resultType: 'done', actualText: '', reason: '' })
const isExtraEditor = ref(false)

const showPlanEditor = ref(false)
const editingPlanDraft = ref(null)

const showGoalManager = ref(false)

const showDatePicker = ref(false)
const pickerYear = ref(new Date().getFullYear())
const pickerMonth = ref(new Date().getMonth() + 1)
const markedDates = ref([])

const todayFocusMinutes = ref(0)
const weekDaysList = ref([])
const recentRewardLogs = ref([])

/**
 * 侧边栏当前筛选
 * all | unrecorded | q1 | q2 | recurring | today_due | overdue
 */
const activeFilter = ref('all')

/**
 * 当前分类筛选
 */
const activeCategory = ref('')

/**
 * 全屏专注层状态
 */
const showFocusFullscreen = ref(false)
const focusSessionConfig = ref({
  timerMode: 'countdown',
  durationMinutes: 25,
  focusTypeKey: 'deep_focus',
  focusTypeLabel: '沉浸专注',
  allowReference: false
})

/**
 * 奖励浮层状态
 */
const rewardToast = ref({
  show: false,
  title: '获得奖励',
  exp: 0,
  ap: 0,
  levelUpCount: 0,
  reason: ''
})

let rewardToastTimer = null

/**
 * 显示奖励结算卡
 */
const showRewardToast = ({ title = '获得奖励', exp = 0, ap = 0, levelUpCount = 0, reason = '' }) => {
  rewardToast.value = {
    show: true,
    title,
    exp,
    ap,
    levelUpCount,
    reason
  }

  if (rewardToastTimer) {
    clearTimeout(rewardToastTimer)
  }

  rewardToastTimer = setTimeout(() => {
    rewardToast.value.show = false
  }, 2200)
}

const loadRpgPanelData = async () => {
  await loadRpgState()
  recentRewardLogs.value = await getRecentRewardLogs(12)
}

const loadTodayFocusMinutes = async () => {
  const list = await db.pomodoro_records.toArray()
  const total = list
    .filter(item => item.status === 'completed')
    .filter(item => normalizeDate(item.endTime || item.startTime || Date.now()) === currentDate.value)
    .reduce((sum, item) => sum + Number(item.duration || 0), 0)

  todayFocusMinutes.value = total
}

const loadGoals = async () => {
  phaseGoals.value = await getPhaseGoals()
  weekGoals.value = await getWeekGoals()

  const progress = {}

  for (const item of phaseGoals.value) {
    progress[item.id] = await calculateGoalProgress(item)
  }

  for (const item of weekGoals.value) {
    progress[item.id] = await calculateGoalProgress(item)
  }

  goalProgressMap.value = progress
}

const loadDayData = async () => {
  const data = await getPlanResultPairsByDate(currentDate.value)
  rawPlanResults.value = data.planResults
  rawExtraResults.value = data.extraResults
}

const loadWeekData = async () => {
  const days = getDaysOfWeek(currentDate.value)
  const dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

  const rows = []

  for (let i = 0; i < days.length; i++) {
    const date = days[i]
    const data = await getPlanResultPairsByDate(date)
    const logged = data.planResults.filter(item => {
      const hasMainResult = !!item.result
      const hasSubtaskProgress = Array.isArray(item.subtasks) && item.subtasks.some(subtask => !!subtask.result)
      return hasMainResult || hasSubtaskProgress
    }).length

    rows.push({
      date,
      name: dayNames[i],
      dateStr: date.slice(5),
      total: data.planResults.length,
      logged,
      expanded: false,
      items: data.planResults
    })
  }

  weekDaysList.value = rows
}

const loadMarkedDates = async () => {
  markedDates.value = await getMarkedDatesByMonth(pickerYear.value, pickerMonth.value)
}

const reloadAll = async () => {
  await loadGoals()
  await loadDayData()
  await loadWeekData()
  await loadRpgPanelData()
  await loadTodayFocusMinutes()
}

watch(() => props.show, async (val) => {
  if (val) {
    activeTab.value = 'list'
    showSidebar.value = false
    currentDate.value = normalizeDate()
    showFocusFullscreen.value = false
    activeFilter.value = 'all'
    activeCategory.value = ''

    const d = new Date(currentDate.value)
    pickerYear.value = d.getFullYear()
    pickerMonth.value = d.getMonth() + 1

    await reloadAll()
    await loadMarkedDates()
  }
})

const availableCategories = computed(() => {
  const set = new Set()

  for (const item of rawPlanResults.value) {
    const category = String(item.plan?.category || '').trim()
    if (category) {
      set.add(category)
    }
  }

  return Array.from(set)
})

/**
 * 判断一条计划在当前视图语义下是否已完成
 */
const isItemDone = (item) => {
  if (item?.result?.resultType === 'done') return true
  if (item?.result?.resultType && item.result.resultType !== 'done') return false

  const subtasks = Array.isArray(item?.subtasks) ? item.subtasks : []
  if (subtasks.length === 0) return false

  const doneCount = subtasks.filter(subtask => !!subtask.result).length
  return doneCount === subtasks.length
}

const displayPlanResults = computed(() => {
  let source = [...(rawPlanResults.value || [])]

  if (activeFilter.value === 'unrecorded') {
    source = source.filter(item => {
      const hasMainResult = !!item.result
      const hasSubtaskProgress = Array.isArray(item.subtasks) && item.subtasks.some(subtask => !!subtask.result)
      return !hasMainResult && !hasSubtaskProgress
    })
  }

  if (activeFilter.value === 'q1') {
    source = source.filter(item => Number(item.plan?.quadrant || 0) === 1)
  }

  if (activeFilter.value === 'q2') {
    source = source.filter(item => Number(item.plan?.quadrant || 0) === 2)
  }

  if (activeFilter.value === 'recurring') {
    source = source.filter(item => item.plan?.recurrence && item.plan.recurrence !== 'none')
  }

  if (activeFilter.value === 'today_due') {
    source = source.filter(item => {
      if (item.plan?.recurrence && item.plan.recurrence !== 'none') return false
      if (!item.plan?.deadlineDate) return false
      if (isItemDone(item)) return false
      return String(item.plan.deadlineDate) === currentDate.value
    })
  }

  if (activeFilter.value === 'overdue') {
    source = source.filter(item => {
      if (item.plan?.recurrence && item.plan.recurrence !== 'none') return false
      if (!item.plan?.deadlineDate) return false
      if (isItemDone(item)) return false
      return String(item.plan.deadlineDate) < currentDate.value
    })
  }

  if (activeCategory.value) {
    source = source.filter(item => String(item.plan?.category || '').trim() === activeCategory.value)
  }

  return source
})

const displayExtraResults = computed(() => {
  return rawExtraResults.value
})

const summary = computed(() => {
  const pairs = displayPlanResults.value.map(item => {
    const subtaskDoneCount = Array.isArray(item.subtasks)
      ? item.subtasks.filter(subtask => !!subtask.result).length
      : 0
    const subtaskTotal = Array.isArray(item.subtasks) ? item.subtasks.length : 0

    if (item.result) {
      return item
    }

    if (subtaskTotal > 0 && subtaskDoneCount > 0) {
      return {
        ...item,
        result: {
          resultType: subtaskDoneCount === subtaskTotal ? 'done' : 'partial'
        }
      }
    }

    return item
  })

  return buildDaySummaryFromPairs(pairs)
})

const dateTitle = computed(() => {
  const d = new Date(currentDate.value)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
})

const activeWeekGoals = computed(() => {
  const currentWeekKey = getWeekKey(currentDate.value)
  return weekGoals.value.filter(item => item.periodKey === currentWeekKey)
})

const activeWeekGoalsWithProgress = computed(() => {
  return activeWeekGoals.value.map(item => ({
    ...item,
    progress: goalProgressMap.value[item.id] ?? 0
  }))
})

const activePhaseGoals = computed(() => {
  const currentMonthKey = getMonthKey(currentDate.value)
  return phaseGoals.value.filter(item => item.periodKey === currentMonthKey)
})

const activePhaseGoalsWithProgress = computed(() => {
  return activePhaseGoals.value.map(item => ({
    ...item,
    progress: goalProgressMap.value[item.id] ?? 0
  }))
})

const currentMainlineText = computed(() => {
  if (activeWeekGoals.value.length > 0) {
    return activeWeekGoals.value.map(item => item.title).join(' / ')
  }
  if (activePhaseGoals.value.length > 0) {
    return activePhaseGoals.value.map(item => item.title).join(' / ')
  }
  return '尚未设定本周主线'
})

const rpgPanelState = computed(() => {
  return {
    ...rpgState.value,
    recentLogs: recentRewardLogs.value,
    partnerName: '系统同桌',
    partnerStatus: '你们正在共同推进本周主线',
    levelLabel: '等级',
    expLabel: '经验',
    apLabel: '行动点',
    bossLabel: '周目标推进体',
    bondLabel: '同桌默契'
  }
})

const handleChangeFilter = (filterKey) => {
  activeFilter.value = filterKey || 'all'
}

const handleChangeCategory = (category) => {
  activeCategory.value = category || ''
}

const goPrevDay = async () => {
  const d = new Date(currentDate.value)
  d.setDate(d.getDate() - 1)
  currentDate.value = normalizeDate(d)
  await loadDayData()
  await loadWeekData()
  await loadRpgPanelData()
  await loadTodayFocusMinutes()
}

const goNextDay = async () => {
  const d = new Date(currentDate.value)
  d.setDate(d.getDate() + 1)
  currentDate.value = normalizeDate(d)
  await loadDayData()
  await loadWeekData()
  await loadRpgPanelData()
  await loadTodayFocusMinutes()
}

const goToday = async () => {
  currentDate.value = normalizeDate()
  await loadDayData()
  await loadWeekData()
  await loadRpgPanelData()
  await loadTodayFocusMinutes()
}

const handleQuickAddPlan = async (payload) => {
  const title = payload?.title?.trim()
  if (!title) return

  await addTodo({
    goalType: 'day',
    title,
    dueDate: currentDate.value,
    deadlineDate: '',
    startDate: currentDate.value,
    endDate: '',
    periodKey: currentDate.value,
    recurrence: 'none',
    recurrenceDays: [],
    isPaused: false,
    sortOrder: Date.now()
  })

  await loadDayData()
  await loadWeekData()
  await loadMarkedDates()
}

const openNewPlanEditor = () => {
  editingPlanDraft.value = {
    title: '',
    scheduleDate: currentDate.value,
    deadlineDate: '',
    startDate: currentDate.value,
    endDate: '',
    note: '',
    category: '',
    quadrant: 2,
    recurrence: 'none',
    recurrenceDays: [],
    phaseGoalId: null,
    weekGoalId: null,
    subtasks: []
  }
  showPlanEditor.value = true
}

const handleOpenPlanEditor = async (item) => {
  if (!item || !item.plan) {
    openNewPlanEditor()
    return
  }

  const subtasks = await getSubtasks(item.plan.id)

  editingPlanDraft.value = {
    id: item.plan.id,
    title: item.plan.title || '',
    scheduleDate: item.plan.dueDate || '',
    deadlineDate: item.plan.deadlineDate || '',
    startDate: item.plan.startDate || item.plan.dueDate || currentDate.value,
    endDate: item.plan.endDate || '',
    note: item.plan.note || '',
    category: item.plan.category || '',
    quadrant: item.plan.quadrant || 2,
    recurrence: item.plan.recurrence || 'none',
    recurrenceDays: Array.isArray(item.plan.recurrenceDays)
      ? item.plan.recurrenceDays.map(day => Number(day))
      : [],
    phaseGoalId: item.phaseGoal?.id || null,
    weekGoalId: item.weekGoal?.id || null,
    subtasks: subtasks.map(subtask => ({
      id: subtask.id,
      title: subtask.title || ''
    }))
  }

  showPlanEditor.value = true
}

const closePlanEditor = () => {
  showPlanEditor.value = false
  editingPlanDraft.value = null
}

const handleDeletePlan = async (payload) => {
  const id = payload?.id
  if (!id) return

  await removeTodo(id)

  await appendTimelineEvent({
    type: 'todo_deleted',
    content: `删除任务：${payload?.title || '未命名任务'}`,
    meta: {
      planId: id,
      date: currentDate.value
    }
  })

  closePlanEditor()
  await reloadAll()
  await loadMarkedDates()
}

const handleEndRecurring = async (item) => {
  if (!item?.plan?.id) return
  if (!item.plan.recurrence || item.plan.recurrence === 'none') return

  const ok = window.confirm(`确认结束循环任务「${item.plan.title || '未命名任务'}」吗？\n历史记录会保留，后续不再继续生成。`)
  if (!ok) return

  await updateTodo(item.plan.id, {
    endDate: currentDate.value,
    updatedAt: Date.now()
  })

  await appendTimelineEvent({
    type: 'todo_recurrence_ended',
    content: `结束循环：${item.plan.title || '未命名任务'}`,
    meta: {
      planId: item.plan.id,
      endDate: currentDate.value
    }
  })

  await loadDayData()
  await loadWeekData()
  await loadMarkedDates()
}

const handleSavePlan = async (payload) => {
  const title = String(payload?.title || '').trim()
  if (!title) return

  const scheduleDate = payload.scheduleDate || currentDate.value
  const deadlineDate = payload.deadlineDate || ''
  const startDate = payload.startDate || currentDate.value
  const endDate = payload.endDate || ''

  const weekGoal = payload.weekGoalId
    ? weekGoals.value.find(item => item.id === Number(payload.weekGoalId))
    : null

  const parentId = weekGoal ? weekGoal.id : null
  const recurrence = payload.recurrence || 'none'
  const recurrenceDays = Array.isArray(payload.recurrenceDays)
    ? payload.recurrenceDays.map(item => Number(item)).sort((a, b) => a - b)
    : []

  if (editingPlanDraft.value?.id) {
    await updateTodo(editingPlanDraft.value.id, {
      title,
      note: payload.note || '',
      category: payload.category || '',
      quadrant: Number(payload.quadrant || 2),
      recurrence,
      recurrenceDays,
      dueDate: recurrence === 'none' ? scheduleDate : '',
      deadlineDate: recurrence === 'none' ? deadlineDate : '',
      startDate: recurrence === 'none' ? scheduleDate : startDate,
      endDate: recurrence === 'none' ? '' : endDate,
      periodKey: recurrence === 'none' ? scheduleDate : '',
      parentId,
      updatedAt: Date.now()
    })

    await replaceSubtasks(editingPlanDraft.value.id, payload.subtasks || [], recurrence === 'none' ? scheduleDate : startDate)
  } else {
    const id = await addTodo({
      goalType: 'day',
      title,
      note: payload.note || '',
      category: payload.category || '',
      quadrant: Number(payload.quadrant || 2),
      dueDate: recurrence === 'none' ? scheduleDate : '',
      deadlineDate: recurrence === 'none' ? deadlineDate : '',
      startDate: recurrence === 'none' ? scheduleDate : startDate,
      endDate: recurrence === 'none' ? '' : endDate,
      periodKey: recurrence === 'none' ? scheduleDate : '',
      recurrence,
      recurrenceDays,
      isPaused: false,
      parentId,
      sortOrder: Date.now()
    })

    await replaceSubtasks(id, payload.subtasks || [], recurrence === 'none' ? scheduleDate : startDate)
  }

  closePlanEditor()
  await reloadAll()
  await loadMarkedDates()
}

const openResultEditor = (item) => {
  isExtraEditor.value = false
  editingPlan.value = item.plan
  editingResultDraft.value = {
    resultType: item.result?.resultType || 'done',
    actualText: item.result?.actualText || '',
    reason: item.result?.reason || ''
  }
  showResultSheet.value = true
}

const openExtraEditor = () => {
  isExtraEditor.value = true
  editingPlan.value = { title: '计划外发生', note: '意外的收获或干扰' }
  editingResultDraft.value = { resultType: 'extra', actualText: '', reason: '' }
  showResultSheet.value = true
}

const closeResultEditor = () => {
  showResultSheet.value = false
  editingPlan.value = null
  isExtraEditor.value = false
  editingResultDraft.value = { resultType: 'done', actualText: '', reason: '' }
}

const handleToggleSubtask = async (payload) => {
  const subtask = payload?.subtask
  if (!subtask?.id) return

  if (subtask.result) {
    await removeResultByPlanAndDate(subtask.id, currentDate.value)

    await appendTimelineEvent({
      type: 'todo_subtask_unchecked',
      content: `取消子任务：${subtask.title || '未命名子任务'}`,
      meta: {
        date: currentDate.value,
        subtaskId: subtask.id
      }
    })
  } else {
    await saveResultForPlan(subtask.id, currentDate.value, {
      resultType: 'done',
      actualText: '',
      reason: '通过子任务勾选完成',
      score: 100,
      isExtra: false
    })

    await appendTimelineEvent({
      type: 'todo_subtask_checked',
      content: `完成子任务：${subtask.title || '未命名子任务'}`,
      meta: {
        date: currentDate.value,
        subtaskId: subtask.id
      }
    })
  }

  await loadDayData()
  await loadWeekData()
  await loadGoals()
  await loadMarkedDates()
}

const handleStartFocusSession = (config) => {
  focusSessionConfig.value = {
    timerMode: config?.timerMode || 'countdown',
    durationMinutes: Number(config?.durationMinutes || 25),
    focusTypeKey: config?.focusTypeKey || 'deep_focus',
    focusTypeLabel: config?.focusTypeLabel || '沉浸专注',
    allowReference: !!config?.allowReference
  }

  showFocusFullscreen.value = true
}

const handleCloseFocusFullscreen = () => {
  showFocusFullscreen.value = false
}

const handleSaveResult = async (payload) => {
  if (isExtraEditor.value) {
    const resultId = await addResult({
      planId: null,
      date: currentDate.value,
      resultType: 'extra',
      actualText: payload.actualText || '',
      reason: payload.reason || '',
      score: 100,
      isExtra: true
    })

    const rewardResult = await settleExtraReward({
      resultId,
      date: currentDate.value,
      actualText: payload.actualText || ''
    })

    if (rewardResult.rewardGranted) {
      showRewardToast({
        title: '计划外完成',
        exp: rewardResult.deltaExp,
        ap: rewardResult.deltaAp,
        levelUpCount: rewardResult.levelUpCount,
        reason: rewardResult.reason
      })
    }

    await appendTimelineEvent({
      type: 'todo_extra_result_created',
      content: payload.actualText || '记录了一项计划外完成事项',
      meta: {
        date: currentDate.value,
        resultType: 'extra',
        rewardExp: rewardResult.deltaExp,
        rewardAp: rewardResult.deltaAp
      }
    })
  } else if (editingPlan.value?.id) {
    await saveResultForPlan(editingPlan.value.id, currentDate.value, {
      resultType: payload.resultType,
      actualText: payload.actualText || '',
      reason: payload.reason || '',
      score: payload.resultType === 'done' ? 100 : (payload.resultType === 'partial' ? 60 : 0),
      isExtra: false
    })

    const rewardResult = await settleTodoPlanReward({
      planId: editingPlan.value.id,
      date: currentDate.value,
      resultType: payload.resultType,
      quadrant: editingPlan.value.quadrant || 2,
      planTitle: editingPlan.value.title || ''
    })

    if (rewardResult.rewardGranted) {
      showRewardToast({
        title: payload.resultType === 'done' ? '完成计划' : '成长结算',
        exp: rewardResult.deltaExp,
        ap: rewardResult.deltaAp,
        levelUpCount: rewardResult.levelUpCount,
        reason: rewardResult.reason
      })
    }

    await appendTimelineEvent({
      type: 'todo_result_saved',
      content: `${editingPlan.value.title || '未命名计划'}：${payload.actualText || payload.resultType}`,
      meta: {
        date: currentDate.value,
        planId: editingPlan.value.id,
        resultType: payload.resultType,
        rewardExp: rewardResult.deltaExp,
        rewardAp: rewardResult.deltaAp
      }
    })
  }

  closeResultEditor()
  await loadDayData()
  await loadWeekData()
  await loadMarkedDates()
  await loadRpgPanelData()
  await loadGoals()
}

const handlePomodoroFinished = async (payload) => {
  if (!payload) return

  const recordId = await db.pomodoro_records.add({
    taskId: null,
    duration: payload.duration,
    startTime: payload.startTime,
    endTime: payload.endTime,
    status: 'completed',
    timerMode: payload.timerMode,
    targetDuration: payload.targetDuration,
    focusTypeKey: payload.focusTypeKey,
    focusTypeLabel: payload.focusTypeLabel,
    allowReference: payload.allowReference,
    interruptCount: payload.interruptCount
  })

  const rewardResult = await settlePomodoroReward({
    recordId,
    duration: payload.duration,
    startTime: payload.startTime,
    endTime: payload.endTime
  })

  if (rewardResult.rewardGranted) {
    showRewardToast({
      title: '专注完成',
      exp: rewardResult.deltaExp,
      ap: rewardResult.deltaAp,
      levelUpCount: rewardResult.levelUpCount,
      reason: rewardResult.reason
    })
  }

  await appendTimelineEvent({
    type: 'pomodoro_completed',
    content: `完成 ${payload.duration} 分钟${payload.focusTypeLabel || '专注'}`,
    meta: {
      duration: payload.duration,
      timerMode: payload.timerMode,
      targetDuration: payload.targetDuration,
      focusTypeKey: payload.focusTypeKey,
      focusTypeLabel: payload.focusTypeLabel,
      allowReference: payload.allowReference,
      interruptCount: payload.interruptCount,
      recordId,
      rewardExp: rewardResult.deltaExp,
      rewardAp: rewardResult.deltaAp
    }
  })

  await loadTodayFocusMinutes()
  await loadRpgPanelData()
}

const openGoalManager = () => {
  showSidebar.value = false
  showGoalManager.value = true
}

const closeGoalManager = () => {
  showGoalManager.value = false
}

const handleCreateGoal = async (payload) => {
  const title = String(payload?.title || '').trim()
  if (!title) return

  if (payload.goalType === 'phase') {
    await addTodo({
      goalType: 'phase',
      title,
      startDate: currentDate.value,
      endDate: '',
      periodKey: getMonthKey(currentDate.value),
      sortOrder: Date.now()
    })
  }

  if (payload.goalType === 'week') {
    await addTodo({
      goalType: 'week',
      title,
      startDate: currentDate.value,
      endDate: '',
      periodKey: getWeekKey(currentDate.value),
      parentId: payload.parentId || null,
      sortOrder: Date.now()
    })
  }

  await appendTimelineEvent({
    type: 'goal_created',
    content: `创建目标：${title}`,
    meta: payload
  })

  await loadGoals()
}

const handleUpdateGoal = async (payload) => {
  await updateTodo(payload.id, {
    title: payload.title,
    parentId: payload.parentId || null,
    updatedAt: Date.now()
  })

  await appendTimelineEvent({
    type: 'goal_updated',
    content: `更新目标：${payload.title}`,
    meta: payload
  })

  await loadGoals()
}

const handleDeleteGoal = async (item) => {
  await removeTodo(item.id)

  await appendTimelineEvent({
    type: 'goal_deleted',
    content: `删除目标：${item.title}`,
    meta: { id: item.id }
  })

  await loadGoals()
  await loadDayData()
  await loadWeekData()
  await loadMarkedDates()
}

const toggleWeekDay = (date) => {
  weekDaysList.value = weekDaysList.value.map(item => {
    if (item.date === date) {
      return {
        ...item,
        expanded: !item.expanded
      }
    }
    return {
      ...item,
      expanded: false
    }
  })
}

const openDatePicker = async () => {
  const d = new Date(currentDate.value)
  pickerYear.value = d.getFullYear()
  pickerMonth.value = d.getMonth() + 1
  await loadMarkedDates()
  showDatePicker.value = true
}

const closeDatePicker = () => {
  showDatePicker.value = false
}

const handlePickDate = async (dateStr) => {
  currentDate.value = dateStr
  showDatePicker.value = false
  await loadDayData()
  await loadWeekData()
  await loadTodayFocusMinutes()
}

const handleChangePickerMonth = async (offset) => {
  let year = pickerYear.value
  let month = pickerMonth.value + offset

  if (month <= 0) {
    month = 12
    year -= 1
  }

  if (month >= 13) {
    month = 1
    year += 1
  }

  pickerYear.value = year
  pickerMonth.value = month
  await loadMarkedDates()
}
</script>

<style scoped>
.todo-app-page {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #f8f9fa;
  z-index: 45;
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.todo-app-header {
  padding: calc(env(safe-area-inset-top) + 10px) 20px 10px;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.todo-left-group,
.todo-right-group {
  display: flex;
  align-items: center;
  min-width: 40px;
}

.todo-right-group {
  justify-content: flex-end;
}

.todo-app-title-group {
  flex: 1;
  text-align: center;
}

.todo-app-title {
  font-size: 16px;
  font-weight: 800;
  color: #000;
  letter-spacing: 0px;
}

.header-btn {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: transparent;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #000;
  font-size: 18px;
  cursor: pointer;
  transition: background 0.2s;
}

.header-btn:active {
  background: rgba(0,0,0,0.05);
}

.todo-app-body {
  flex: 1;
  min-height: 0;
  position: relative;
}

.fab-add-btn {
  position: absolute;
  right: 20px;
  bottom: calc(100px + env(safe-area-inset-bottom, 0px));
  width: 54px;
  height: 54px;
  border-radius: 27px;
  background: #000;
  color: #fff;
  border: none;
  font-size: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  z-index: 60;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.fab-add-btn:active {
  transform: scale(0.9) rotate(45deg);
}
</style>
