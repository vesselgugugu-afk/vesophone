<template>
  <div class="todo-tab-page">
    
    <!-- 顶部大看板 -->
    <div class="mag-header-card">
      <div class="mag-header-main">
        <div class="mag-date-display" @click="$emit('open-date-picker')">
          <transition :name="dateTransitionName" mode="out-in">
            <div :key="dateTitle" class="mag-date-inner">
              <div class="mag-date-main">
                <span class="mag-month">{{ parsedDate.month }}.</span>
                <span class="mag-day">{{ parsedDate.day }}</span>
              </div>
              <div class="mag-date-sub">{{ parsedDate.subText }}</div>
            </div>
          </transition>
        </div>

        <div class="mag-ai-partner">
          <div class="ai-avatar-wrap">
            <div class="ai-avatar">
              <i class="fas fa-user-astronaut"></i>
            </div>
            <div class="ai-online-dot"></div>
          </div>
          <div class="ai-name">系统同桌</div>
          <div class="ai-status">正在整理今日计划</div>
        </div>
      </div>
    </div>

    <!-- 控制带 -->
    <div class="mag-control-bar">
      <button class="nav-arrow" @click="handlePrevDay"><i class="fas fa-chevron-left"></i></button>
      
      <div class="view-icons">
        <div class="v-icon" :class="{ active: currentView === 'receipt' }" @click="currentView = 'receipt'">
          <i class="fas fa-stream"></i>
        </div>
        <div class="v-divider">/</div>
        <div class="v-icon" :class="{ active: currentView === 'quadrant' }" @click="currentView = 'quadrant'">
          <i class="fas fa-th-large"></i>
        </div>
        <div class="v-divider">/</div>
        <div class="v-icon" :class="{ active: currentView === 'week' }" @click="currentView = 'week'">
          <i class="fas fa-calendar-week"></i>
        </div>
      </div>

      <button class="nav-arrow" @click="handleNextDay"><i class="fas fa-chevron-right"></i></button>
    </div>

    <!-- 视图 1：日手账对账 -->
    <div v-if="currentView === 'receipt'" class="view-container receipt-view">
      <div class="mag-quick-add">
        <!-- 回到今天按钮：并入输入框左侧 -->
        <button class="today-circle-btn" @click="$emit('go-today')">
          今
        </button>

        <div class="input-wrap">
          <i class="fas fa-pen prefix-icon"></i>
          <input 
            v-model="draftTitle" 
            type="text" 
            placeholder="迅速记下新计划..." 
            @keyup.enter="handleAddPlan" 
          />
        </div>
        <button class="mag-btn-black" @click="handleAddPlan">记录</button>
      </div>

      <!-- 表头 -->
      <div class="mag-board-header">
        <div class="mag-col-title">PLAN</div>
        <div class="mag-col-title">RESULT</div>
      </div>

      <!-- 核心对账网格 -->
      <div class="mag-board-grid">
        <div v-if="sortedPlanResults.length === 0 && extraResults.length === 0" class="mag-empty-full">
          空白的一天
        </div>

        <template v-else>
          <!-- 计划内事项对账 -->
          <template v-for="item in sortedPlanResults" :key="item.plan.id">
            <!-- 左侧：计划卡片 -->
            <div class="mag-card plan-card" @click="$emit('open-plan-editor', item)">
              <div class="mc-top">
                <span class="mc-title" :class="{ 'mc-done': getDisplayResultType(item) === 'done' }">{{ item.plan.title }}</span>
              </div>

              <div class="mc-sub" v-if="item.plan.note">{{ item.plan.note }}</div>

              <div class="mc-tags" v-if="item.weekGoal || isRecurringPlan(item.plan) || hasDeadlineDate(item.plan)">
                <span v-if="item.weekGoal" class="mc-tag black">@{{ item.weekGoal.title }}</span>
                <span v-if="isRecurringPlan(item.plan)" class="mc-tag soft">{{ getRecurrenceLabel(item.plan) }}</span>

                <span
                  v-if="hasDeadlineDate(item.plan)"
                  class="mc-tag deadline"
                  :class="{
                    overdue: getDeadlineStatus(item.plan) === 'overdue',
                    warning: getDeadlineStatus(item.plan) === 'warning'
                  }"
                >
                  {{ getDeadlineLabel(item.plan) }}
                </span>
              </div>

              <!-- 结束循环快捷入口 -->
              <div v-if="isRecurringPlan(item.plan)" class="recurring-quick-row" @click.stop>
                <button class="end-recurring-btn" @click.stop="$emit('end-recurring', item)">结束循环</button>
              </div>

              <!-- 子任务展示区 -->
              <div v-if="item.subtasks && item.subtasks.length > 0" class="subtask-panel" @click.stop>
                <div class="subtask-head">
                  <span class="subtask-title">子任务</span>
                  <span class="subtask-progress">{{ getSubtaskDoneCount(item) }}/{{ item.subtasks.length }}</span>
                </div>

                <div class="subtask-list-inline">
                  <div
                    v-for="subtask in item.subtasks"
                    :key="subtask.id"
                    class="subtask-inline-item"
                    @click.stop="$emit('toggle-subtask', { parentItem: item, subtask })"
                  >
                    <div class="subtask-checkbox" :class="{ checked: !!subtask.result }">
                      <i v-if="subtask.result" class="fas fa-check"></i>
                    </div>
                    <div class="subtask-inline-title" :class="{ done: !!subtask.result }">
                      {{ subtask.title }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 右侧：结果卡片 -->
            <div 
              class="mag-card result-card" 
              :class="`st-${getDisplayResultType(item) || 'empty'}`"
              @click="$emit('edit-result', item)"
            >
              <div class="mc-content">
                <div class="mc-r-title">{{ getResultTypeLabel(getDisplayResultType(item)) }}</div>
                <div class="mc-r-desc">{{ getDisplayResultText(item) }}</div>
              </div>
            </div>
          </template>

          <!-- 计划外事项补记 -->
          <template v-if="extraResults.length > 0">
            <div class="extra-header-placeholder"></div>
            <div class="extra-section-title">补记</div>

            <template v-for="ext in extraResults" :key="ext.id">
              <div class="extra-card-placeholder"></div>
              <div class="mag-card result-card st-extra grid-right-only">
                <div class="mc-content">
                  <div class="mc-r-title">计划外</div>
                  <div class="mc-r-desc">{{ ext.actualText }}</div>
                </div>
              </div>
            </template>
          </template>

        </template>
      </div>

      <!-- 明确的补记入口 -->
      <button class="add-extra-btn" @click="$emit('add-extra-result')">
        <i class="fas fa-plus"></i> 补记计划外事项
      </button>

    </div>

    <!-- 视图 2：四象限 -->
    <div v-if="currentView === 'quadrant'" class="view-container quadrant-view">
      <div class="mag-quadrant-grid">
        <div class="mq-cell q1">
          <div class="mq-head"><span class="mq-dot dot-q1"></span>重要且紧急</div>
          <div class="mq-list">
            <div class="mq-item" v-for="item in q1Plans" :key="item.plan.id" @click="$emit('open-plan-editor', item)">
              <span :class="{ 'mc-done': getDisplayResultType(item) === 'done' }">{{ item.plan.title }}</span>
            </div>
          </div>
        </div>
        <div class="mq-cell q2">
          <div class="mq-head"><span class="mq-dot dot-q2"></span>重要不紧急</div>
          <div class="mq-list">
            <div class="mq-item" v-for="item in q2Plans" :key="item.plan.id" @click="$emit('open-plan-editor', item)">
              <span :class="{ 'mc-done': getDisplayResultType(item) === 'done' }">{{ item.plan.title }}</span>
            </div>
          </div>
        </div>
        <div class="mq-cell q3">
          <div class="mq-head"><span class="mq-dot dot-q3"></span>紧急不重要</div>
          <div class="mq-list">
            <div class="mq-item" v-for="item in q3Plans" :key="item.plan.id" @click="$emit('open-plan-editor', item)">
              <span :class="{ 'mc-done': getDisplayResultType(item) === 'done' }">{{ item.plan.title }}</span>
            </div>
          </div>
        </div>
        <div class="mq-cell q4">
          <div class="mq-head"><span class="mq-dot dot-q4"></span>不重要不紧急</div>
          <div class="mq-list">
            <div class="mq-item" v-for="item in q4Plans" :key="item.plan.id" @click="$emit('open-plan-editor', item)">
              <span :class="{ 'mc-done': getDisplayResultType(item) === 'done' }">{{ item.plan.title }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 视图 3：周视图 -->
    <div v-if="currentView === 'week'" class="view-container week-view">
      <div class="mag-week-goals">
        <div class="mw-title">WEEKLY FOCUS</div>
        <div v-if="activeWeekGoals.length === 0" class="mag-empty">本周无特定主线</div>
        <div class="mw-goal-list">
          <div class="mw-goal" v-for="goal in activeWeekGoals" :key="goal.id">
            <div class="mw-goal-name">{{ goal.title }}</div>
            <div class="mw-bar-bg"><div class="mw-bar-fill" :style="{ width: `${goal.progress || 0}%` }"></div></div>
          </div>
        </div>
      </div>

      <div class="mag-week-days">
        <div class="mw-title">THIS WEEK</div>
        <div class="mw-day-list">
          <div class="mw-day-wrap" v-for="day in weekDaysList" :key="day.date">
            
            <div class="mw-day-item" @click="$emit('toggle-week-day', day.date)">
              <div class="mw-day-left">
                <span class="mw-day-name">{{ day.name }}</span>
                <span class="mw-day-date">{{ day.dateStr }}</span>
              </div>
              <div class="mw-day-right">
                <div class="mw-fraction" v-if="day.total > 0">
                  <span class="mw-f-num">{{ day.logged }}</span>
                  <span class="mw-f-divider">/</span>
                  <span class="mw-f-num total">{{ day.total }}</span>
                </div>
                <div class="mw-fraction empty" v-else>
                  <span class="mw-f-num total">REST</span>
                </div>
              </div>
            </div>

            <div class="mw-expand-anim-wrapper" :class="{ 'is-expanded': day.expanded }">
              <div class="mw-expand-panel">
                <div v-if="day.items.length === 0" class="mw-expand-empty">这一天没有计划。</div>
                <div v-else class="mw-expand-list">
                  <div v-for="item in day.items" :key="item.plan.id" class="mw-expand-item">
                    <div class="mw-expand-main">
                      <div class="mw-expand-title" :class="{ 'mc-done': getDisplayResultType(item) === 'done' }">{{ item.plan.title }}</div>
                      <div class="mw-expand-meta-row">
                        <div v-if="isRecurringPlan(item.plan)" class="mw-expand-recurrence">{{ getRecurrenceLabel(item.plan) }}</div>
                        <div
                          v-if="hasDeadlineDate(item.plan)"
                          class="mw-expand-deadline"
                          :class="{
                            overdue: getDeadlineStatus(item.plan) === 'overdue',
                            warning: getDeadlineStatus(item.plan) === 'warning'
                          }"
                        >
                          {{ getDeadlineLabel(item.plan) }}
                        </div>
                      </div>
                    </div>
                    <div class="mw-expand-status" :class="`text-${getDisplayResultType(item) || 'empty'}`">
                      {{ getResultTypeLabel(getDisplayResultType(item)) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  dateTitle: { type: String, default: '' },
  planResults: { type: Array, default: () => [] },
  extraResults: { type: Array, default: () => [] },
  activeWeekGoals: { type: Array, default: () => [] },
  activePhaseGoals: { type: Array, default: () => [] },
  weekDaysList: { type: Array, default: () => [] }
})

const emit = defineEmits([
  'prev-day',
  'next-day',
  'go-today',
  'add-plan',
  'edit-result',
  'add-extra-result',
  'open-plan-editor',
  'toggle-week-day',
  'open-date-picker',
  'toggle-subtask',
  'end-recurring'
])

const currentView = ref('receipt')
const draftTitle = ref('')
const dateTransitionName = ref('slide-left')

const parsedDate = computed(() => {
  const d = new Date(props.dateTitle.replace(/\./g, '-'))
  if (isNaN(d.getTime())) return { month: 'DATE', day: '00', subText: '' }
  const month = d.toLocaleString('en-US', { month: 'long' }).toUpperCase()
  const day = String(d.getDate()).padStart(2, '0')
  const weekday = d.toLocaleDateString('zh-CN', { weekday: 'long' })
  const year = d.getFullYear()
  return { month, day, subText: `${weekday} · ${year}` }
})

const currentDateIso = computed(() => {
  const d = new Date(props.dateTitle.replace(/\./g, '-'))
  if (isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
})

const handlePrevDay = () => { dateTransitionName.value = 'slide-right'; emit('prev-day') }
const handleNextDay = () => { dateTransitionName.value = 'slide-left'; emit('next-day') }

const handleAddPlan = () => {
  const title = draftTitle.value.trim()
  if (!title) return
  emit('add-plan', { title })
  draftTitle.value = ''
}

/**
 * 对 planResults 进行排序，已完成沉底
 */
const sortedPlanResults = computed(() => {
  const notDone = []
  const done = []
  props.planResults.forEach(item => {
    if (getDisplayResultType(item) === 'done') {
      done.push(item)
    } else {
      notDone.push(item)
    }
  })
  return [...notDone, ...done]
})

const q1Plans = computed(() => sortedPlanResults.value.filter(p => p.plan.quadrant === 1))
const q2Plans = computed(() => sortedPlanResults.value.filter(p => p.plan.quadrant === 2))
const q3Plans = computed(() => sortedPlanResults.value.filter(p => p.plan.quadrant === 3))
const q4Plans = computed(() => sortedPlanResults.value.filter(p => p.plan.quadrant === 4))

const getResultTypeLabel = (type) => {
  const map = { done: '已完成', partial: '部分执行', missed: '未推进', replaced: '计划替换', extra: '计划外', empty: '尚未记录' }
  return map[type || 'empty'] || '尚未记录'
}

const getDefaultResultText = (type) => {
  const map = { done: '按原定计划完成。', partial: '完成了一部分。', missed: '今日略过。', replaced: '重心转移。', extra: '额外产出。' }
  return map[type] || ''
}

const isRecurringPlan = (plan) => {
  return !!plan && !!plan.recurrence && plan.recurrence !== 'none'
}

const hasDeadlineDate = (plan) => {
  return !!plan && !!plan.deadlineDate && !isRecurringPlan(plan)
}

const formatShortDate = (dateStr) => {
  if (!dateStr) return ''
  const str = String(dateStr)
  if (str.length >= 10) return str.slice(5)
  return str
}

/**
 * DDL 状态
 * overdue: 当前日期 > ddl
 * warning: ddl 距离当前日期 <= 1 天
 * normal: 其他
 */
const getDeadlineStatus = (plan) => {
  if (!hasDeadlineDate(plan)) return 'none'
  if (!currentDateIso.value) return 'none'

  const cur = new Date(`${currentDateIso.value}T00:00:00`)
  const ddl = new Date(`${String(plan.deadlineDate)}T00:00:00`)
  const diffDays = Math.floor((ddl.getTime() - cur.getTime()) / 86400000)

  if (diffDays < 0) return 'overdue'
  if (diffDays <= 1) return 'warning'
  return 'normal'
}

const getDeadlineLabel = (plan) => {
  const status = getDeadlineStatus(plan)
  const short = formatShortDate(plan.deadlineDate)

  if (status === 'overdue') return `已逾期 ${short}`
  if (status === 'warning') return `临期 ${short}`
  return `DDL ${short}`
}

const getRecurrenceLabel = (plan) => {
  if (!plan) return ''
  if (plan.recurrence === 'daily') return '每日'
  if (plan.recurrence === 'weekly') {
    const days = Array.isArray(plan.recurrenceDays) ? plan.recurrenceDays : []
    const labelMap = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '日' }
    if (days.length === 0) return '每周'
    return `周${days.map(item => labelMap[item] || '').join(' / 周')}`
  }
  return ''
}

const getSubtaskDoneCount = (item) => {
  const subtasks = Array.isArray(item?.subtasks) ? item.subtasks : []
  return subtasks.filter(subtask => !!subtask.result).length
}

const getDisplayResultType = (item) => {
  if (item?.result?.resultType) {
    return item.result.resultType
  }

  const subtasks = Array.isArray(item?.subtasks) ? item.subtasks : []
  if (subtasks.length === 0) return 'empty'

  const doneCount = getSubtaskDoneCount(item)
  if (doneCount === 0) return 'empty'
  if (doneCount === subtasks.length) return 'done'
  return 'partial'
}

const getDisplayResultText = (item) => {
  if (item?.result) {
    return item.result.actualText || getDefaultResultText(item.result.resultType)
  }

  const subtasks = Array.isArray(item?.subtasks) ? item.subtasks : []
  if (subtasks.length === 0) return '尚未记录结果'

  const doneCount = getSubtaskDoneCount(item)
  if (doneCount === 0) return '尚未记录结果'
  return `已完成 ${doneCount}/${subtasks.length} 个子任务`
}
</script>

<style scoped>
/* 隐藏容器滚动条 */
.view-container::-webkit-scrollbar { display: none; }
.view-container { scrollbar-width: none; -ms-overflow-style: none; }

.todo-tab-page {
  padding: 0 20px 100px;
  display: flex; flex-direction: column; gap: 16px; height: 100%; box-sizing: border-box;
}

/* 顶部大看板 */
.mag-header-card {
  background: linear-gradient(135deg, #ffffff 0%, #fdfdfc 100%);
  border-radius: 24px;
  padding: 22px 20px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,1);
  border: 1px solid rgba(0,0,0,0.03);
  flex-shrink: 0;
}

.mag-header-main { display: flex; justify-content: space-between; align-items: center; gap: 18px; }

.mag-date-display { flex: 1; cursor: pointer; min-width: 0; }
.mag-date-inner { display: flex; flex-direction: column; }
.mag-date-main { display: flex; align-items: baseline; gap: 6px; }
.mag-month { font-size: 24px; font-weight: 800; color: #1a1a1a; letter-spacing: 1px; }
.mag-day { font-size: 36px; font-weight: 900; color: #1a1a1a; line-height: 1; }
.mag-date-sub { margin-top: 6px; font-size: 12px; color: #8e8e93; font-weight: 600; letter-spacing: 0.5px; }

.mag-ai-partner {
  width: 110px; display: flex; flex-direction: column; align-items: center; text-align: center; flex-shrink: 0;
}
.ai-avatar-wrap { position: relative; }
.ai-avatar {
  width: 44px; height: 44px; border-radius: 50%; background: #f4f5f7; border: 1px solid #eaeaea;
  display: flex; justify-content: center; align-items: center; color: #98a1aa; font-size: 18px;
}
.ai-online-dot {
  position: absolute; bottom: 2px; right: 2px; width: 10px; height: 10px; background: #2ed573; border: 2px solid #ffffff; border-radius: 50%;
}
.ai-name { margin-top: 8px; font-size: 13px; font-weight: 700; color: #212529; }
.ai-status { margin-top: 4px; font-size: 10px; color: #9aa1a8; line-height: 1.5; max-width: 100%; }

.slide-left-enter-active, .slide-left-leave-active, .slide-right-enter-active, .slide-right-leave-active { transition: all 0.3s ease; }
.slide-left-enter-from { opacity: 0; transform: translateX(15px); }
.slide-left-leave-to { opacity: 0; transform: translateX(-15px); }
.slide-right-enter-from { opacity: 0; transform: translateX(-15px); }
.slide-right-leave-to { opacity: 0; transform: translateX(15px); }

/* 控制带 */
.mag-control-bar { display: flex; align-items: center; justify-content: space-between; padding: 0 10px; flex-shrink: 0; }
.nav-arrow {
  width: 36px; height: 36px; border-radius: 50%; background: #ffffff; border: none; color: #adb5bd; font-size: 14px; cursor: pointer; display: flex; justify-content: center; align-items: center; box-shadow: 0 4px 12px rgba(0,0,0,0.03); transition: all 0.2s;
}
.nav-arrow:active { transform: scale(0.9); }
.view-icons {
  display: flex; align-items: center; gap: 10px; background: #ffffff; padding: 8px 16px; border-radius: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.03);
}
.v-icon {
  font-size: 15px; color: #ced4da; cursor: pointer; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); padding: 4px; display: flex; justify-content: center; align-items: center;
}
.v-icon.active { color: #212529; transform: scale(1.15); }
.v-divider { font-size: 14px; color: #e9ecef; font-weight: 300; }

.view-container { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 15px; }

/* 快速录入 */
.mag-quick-add {
  display: flex; align-items: center; background: #fff; padding: 8px 8px 8px 8px; border-radius: 20px; box-shadow: 0 8px 20px rgba(0,0,0,0.02); gap: 10px; flex-shrink: 0;
}

.today-circle-btn {
  width: 36px;
  height: 36px;
  border-radius: 18px;
  border: none;
  background: #1c1c1e;
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  flex-shrink: 0;
}

.input-wrap { flex: 1; display: flex; align-items: center; }
.prefix-icon { color: #ccc; margin-right: 10px; font-size: 14px; }
.mag-quick-add input { flex: 1; border: none; outline: none; font-size: 14px; font-weight: 500; color: #000; background: transparent; }
.mag-quick-add input::placeholder { color: #bbb; font-weight: 400; }
.mag-btn-black { background: #000; color: #fff; border: none; padding: 10px 16px; border-radius: 14px; font-size: 12px; font-weight: bold; cursor: pointer; }

/* 对账板 */
.mag-board-header { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 0 4px; margin-bottom: -6px; }
.mag-col-title { font-size: 11px; font-weight: 800; letter-spacing: 1px; color: #aaa; text-align: center; }

.mag-board-grid {
  display: grid; 
  grid-template-columns: 1fr 1fr; 
  gap: 12px; 
  align-items: stretch;
}

.mag-empty-full { grid-column: 1 / -1; font-size: 12px; color: #ccc; text-align: center; padding: 30px 0; }

/* 卡片基类 */
.mag-card {
  background: #fff; border-radius: 16px; padding: 14px; cursor: pointer; display: flex; flex-direction: column; gap: 6px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.02); height: auto;
}
.plan-card { border: 1px solid rgba(0,0,0,0.03); justify-content: flex-start; }
.mc-title { font-size: 13px; font-weight: 700; color: #000; line-height: 1.4; }

.mc-done { 
  color: #aaa; 
  text-decoration: line-through; 
  text-decoration-color: #6b8e73;
  text-decoration-thickness: 1.5px;
  font-weight: 500; 
}

.mc-sub { font-size: 11px; color: #888; line-height: 1.4; margin-top: 4px; }
.mc-tags { display: flex; gap: 6px; margin-top: 4px; flex-wrap: wrap; }
.mc-tag { font-size: 9px; padding: 3px 6px; border-radius: 6px; font-weight: 700; }
.mc-tag.black { background: #f0f0f0; color: #000; }
.mc-tag.soft { background: #f6f6f7; color: #666; }
.mc-tag.deadline { background: #f4f5f7; color: #666; }
.mc-tag.deadline.warning { background: #fff5e9; color: #c56a1a; }
.mc-tag.deadline.overdue { background: #ffecec; color: #b53434; }

/* 结束循环快捷入口 */
.recurring-quick-row { margin-top: 6px; }
.end-recurring-btn {
  height: 28px;
  border: none;
  border-radius: 999px;
  background: #f2f2f4;
  color: #555;
  padding: 0 10px;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}

/* 子任务 */
.subtask-panel {
  margin-top: 10px;
  padding: 10px;
  border-radius: 14px;
  background: #f8f9fa;
  border: 1px solid rgba(0,0,0,0.03);
}

.subtask-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.subtask-title {
  font-size: 11px;
  font-weight: 800;
  color: #666;
}

.subtask-progress {
  font-size: 10px;
  font-weight: 800;
  color: #999;
}

.subtask-list-inline {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.subtask-inline-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.subtask-checkbox {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ffffff;
  border: 1px solid #d8dadd;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #1c1c1e;
  font-size: 9px;
  flex-shrink: 0;
}

.subtask-checkbox.checked {
  background: #1c1c1e;
  color: #fff;
  border-color: #1c1c1e;
}

.subtask-inline-title {
  font-size: 11px;
  color: #555;
  line-height: 1.5;
}

.subtask-inline-title.done {
  color: #aaa;
  text-decoration: line-through;
  text-decoration-color: #6b8e73;
  text-decoration-thickness: 1.5px;
}

/* 结果卡片 */
.result-card { border: 1px solid transparent; justify-content: flex-start; }
.result-card.st-done { background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%); border-color: #dcfce7; }
.result-card.st-partial { background: linear-gradient(135deg, #fffbeb 0%, #ffffff 100%); border-color: #fef3c7; }
.result-card.st-missed { background: linear-gradient(135deg, #fef2f2 0%, #ffffff 100%); border-color: #fee2e2; }
.result-card.st-replaced { background: linear-gradient(135deg, #eff6ff 0%, #ffffff 100%); border-color: #dbeafe; }
.result-card.st-extra { background: linear-gradient(135deg, #faf5ff 0%, #ffffff 100%); border-color: #f3e8ff; }
.result-card.st-empty { background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%); border-color: #f1f3f5; }

.mc-content { display: flex; flex-direction: column; gap: 4px; }
.mc-r-title { font-size: 11px; font-weight: 800; color: #333; }
.mc-r-desc { font-size: 11px; color: #666; line-height: 1.4; }

/* 计划外补记 */
.extra-header-placeholder { grid-column: 1; }
.extra-section-title { grid-column: 2; font-size: 11px; font-weight: 800; color: #b0b0b5; padding-left: 2px; margin-top: 10px; }
.extra-card-placeholder { grid-column: 1; }
.grid-right-only { grid-column: 2; }

/* 追加计划外按钮 */
.add-extra-btn {
  margin-top: 10px;
  width: 100%;
  padding: 14px;
  border-radius: 16px;
  border: 1px dashed #dcdcdc;
  background: transparent;
  color: #999;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}
.add-extra-btn:active { background: rgba(0,0,0,0.02); }

/* 四象限 */
.mag-quadrant-grid { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 12px; flex: 1; }
.mq-cell { border-radius: 20px; padding: 14px; display: flex; flex-direction: column; box-shadow: 0 4px 15px rgba(0,0,0,0.02); }
.q1 { background: #fffafa; border: 1px solid #f2e6e6; }
.q2 { background: #f4f8fb; border: 1px solid #e6eff4; }
.q3 { background: #fff8f0; border: 1px solid #f2ece4; }
.q4 { background: #f8f9fa; border: 1px solid #eeeeee; }
.mq-head { font-size: 12px; font-weight: 800; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; color: #212529; }
.mq-dot { width: 6px; height: 6px; border-radius: 50%; }
.dot-q1 { background: #ff7675; }
.dot-q2 { background: #74b9ff; }
.dot-q3 { background: #fdcb6e; }
.dot-q4 { background: #b2bec3; }
.mq-list { display: flex; flex-direction: column; gap: 8px; overflow-y: auto; }
.mq-item { font-size: 12px; color: #495057; background: rgba(255,255,255,0.6); padding: 8px 10px; border-radius: 10px; cursor: pointer; line-height: 1.4; }

/* 周视图 */
.mag-week-goals { background: #fff; border-radius: 24px; padding: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.02); border: 1px solid rgba(0,0,0,0.02); }
.mw-title { font-size: 11px; font-weight: 800; letter-spacing: 1px; color: #aaa; margin-bottom: 16px; }
.mw-goal-list { display: flex; flex-direction: column; gap: 16px; }
.mw-goal { display: flex; flex-direction: column; gap: 8px; }
.mw-goal-name { font-size: 14px; font-weight: 700; color: #000; }
.mw-bar-bg { height: 6px; background: #f0f0f0; border-radius: 3px; overflow: hidden; }
.mw-bar-fill { height: 100%; background: #000; border-radius: 3px; }

.mag-week-days { background: #fff; border-radius: 24px; padding: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.02); border: 1px solid rgba(0,0,0,0.02); margin-top: auto; }
.mw-day-list { display: flex; flex-direction: column; gap: 4px; }
.mw-day-wrap { display: flex; flex-direction: column; }

.mw-day-item { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f8f9fa; padding: 12px 0; cursor: pointer; }
.mw-day-item:last-child { border-bottom: none; }
.mw-day-left { display: flex; align-items: baseline; gap: 10px; }
.mw-day-name { font-size: 13px; font-weight: 800; color: #000; width: 35px; }
.mw-day-date { font-size: 11px; color: #aaa; font-weight: 600; }
.mw-day-right { display: flex; align-items: center; gap: 8px; }

.mw-fraction { display: flex; align-items: center; background: #f4f5f7; padding: 4px 10px; border-radius: 12px; gap: 4px; }
.mw-fraction.empty { background: transparent; }
.mw-f-num { font-size: 13px; font-weight: 800; color: #000; }
.mw-f-num.total { color: #888; }
.mw-f-divider { font-size: 11px; color: #ccc; font-weight: 300; }

.mw-expand-anim-wrapper { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.35s cubic-bezier(0.25, 0.8, 0.25, 1); }
.mw-expand-anim-wrapper.is-expanded { grid-template-rows: 1fr; }
.mw-expand-panel { overflow: hidden; }

.mw-expand-list { display: flex; flex-direction: column; gap: 8px; margin: 4px 0 12px 8px; padding-left: 12px; border-left: 1px dashed #e1dcd1; }
.mw-expand-empty { font-size: 11px; color: #bbb; padding: 6px 0 12px 20px; font-style: italic; }
.mw-expand-item { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.mw-expand-main { flex: 1; min-width: 0; }
.mw-expand-title { font-size: 12px; color: #5a534c; font-weight: 500; line-height: 1.4; }
.mw-expand-meta-row { margin-top: 4px; display: flex; gap: 8px; flex-wrap: wrap; }
.mw-expand-recurrence { font-size: 10px; color: #b0a89d; }
.mw-expand-deadline { font-size: 10px; color: #666; }
.mw-expand-deadline.warning { color: #c56a1a; }
.mw-expand-deadline.overdue { color: #b53434; }

.mw-expand-status { font-size: 10px; padding: 2px 6px; background: #f4f5f7; border-radius: 4px; font-weight: 700; white-space: nowrap; }

.text-done { color: #27ae60; background: #eafaf1; }
.text-partial { color: #d35400; background: #fdf3e8; }
.text-missed { color: #c0392b; background: #fdedec; }
.text-replaced { color: #2980b9; background: #ebf5fb; }
.text-extra { color: #8e44ad; background: #f5eef8; }
.text-empty { color: #95a5a6; background: #f2f4f4; }
</style>
