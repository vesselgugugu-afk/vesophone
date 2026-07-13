<template>
  <transition name="slide-up">
    <div v-if="show" class="plan-sheet-mask" @click.self="$emit('close')">
      <div class="plan-sheet">
        <div class="plan-sheet-header">
          <div class="plan-sheet-title">{{ isEditMode ? '编辑计划' : '新建计划' }}</div>
          <i class="fas fa-times" @click="$emit('close')"></i>
        </div>

        <!-- 标题 -->
        <div class="plan-section">
          <div class="plan-label">标题</div>
          <input v-model="draft.title" class="plan-input" type="text" placeholder="例如：今天整理第二章提纲" />
        </div>

        <!-- 时间设置：按单次 / 循环分开展示 -->
        <div class="plan-section">
          <div class="plan-label">时间设置</div>

          <div v-if="draft.recurrence === 'none'" class="plan-grid-two">
            <div class="plan-section in-grid">
              <div class="plan-sub-label">安排日期</div>
              <input v-model="draft.scheduleDate" class="plan-input" type="date" />
            </div>

            <div class="plan-section in-grid">
              <div class="plan-sub-label">截止日期</div>
              <input v-model="draft.deadlineDate" class="plan-input" type="date" />
            </div>
          </div>

          <div v-else class="plan-grid-two">
            <div class="plan-section in-grid">
              <div class="plan-sub-label">开始日期</div>
              <input v-model="draft.startDate" class="plan-input" type="date" />
            </div>

            <div class="plan-section in-grid">
              <div class="plan-sub-label">结束日期</div>
              <input v-model="draft.endDate" class="plan-input" type="date" />
            </div>
          </div>

          <div class="date-hint" v-if="draft.recurrence === 'none'">
            单次任务会出现在“安排日期”当天；如果设置了截止日期，前端会额外标记 DDL。
          </div>

          <div class="date-hint" v-else>
            循环任务会从开始日期生效，到结束日期停止；提前结束不会删除以前的历史记录。
          </div>
        </div>

        <!-- 备注 -->
        <div class="plan-section">
          <div class="plan-label">备注详情</div>
          <textarea
            v-model="draft.note"
            class="plan-textarea"
            placeholder="可以写更完整的要求、限制、细节、准备材料、今天想达成的程度。"
          ></textarea>
        </div>

        <!-- 分类 + 四象限 -->
        <div class="plan-grid-two">
          <div class="plan-section">
            <div class="plan-label">分类</div>
            <input v-model="draft.category" class="plan-input" type="text" placeholder="如：学习 / 生活 / 科研" />
          </div>

          <div class="plan-section">
            <div class="plan-label">四象限</div>
            <select v-model="draft.quadrant" class="plan-input">
              <option :value="1">重要且紧急</option>
              <option :value="2">重要不紧急</option>
              <option :value="3">紧急不重要</option>
              <option :value="4">不重要不紧急</option>
            </select>
          </div>
        </div>

        <!-- 循环规则 -->
        <div class="plan-section">
          <div class="plan-label">循环规则</div>

          <div class="recurrence-row">
            <div
              class="recurrence-chip"
              :class="{ active: draft.recurrence === 'none' }"
              @click="draft.recurrence = 'none'"
            >
              不循环
            </div>
            <div
              class="recurrence-chip"
              :class="{ active: draft.recurrence === 'daily' }"
              @click="draft.recurrence = 'daily'"
            >
              每日
            </div>
            <div
              class="recurrence-chip"
              :class="{ active: draft.recurrence === 'weekly' }"
              @click="draft.recurrence = 'weekly'"
            >
              每周
            </div>
          </div>

          <div v-if="draft.recurrence === 'weekly'" class="weekday-picker">
            <div
              v-for="item in weekdayOptions"
              :key="item.value"
              class="weekday-chip"
              :class="{ active: draft.recurrenceDays.includes(item.value) }"
              @click="toggleWeekday(item.value)"
            >
              {{ item.label }}
            </div>
          </div>

          <div class="recurrence-hint">
            循环任务会作为长期模板存在，并在命中的日期自动出现在当天计划里。
          </div>
        </div>

        <!-- 目标绑定 -->
        <div class="plan-grid-two">
          <div class="plan-section">
            <div class="plan-label">所属阶段目标</div>
            <select v-model="draft.phaseGoalId" class="plan-input">
              <option value="">不归属阶段目标</option>
              <option v-for="item in phaseGoals" :key="item.id" :value="String(item.id)">
                {{ item.title }}
              </option>
            </select>
          </div>

          <div class="plan-section">
            <div class="plan-label">所属周目标</div>
            <select v-model="draft.weekGoalId" class="plan-input">
              <option value="">不归属周目标</option>
              <option v-for="item in filteredWeekGoals" :key="item.id" :value="String(item.id)">
                {{ item.title }}
              </option>
            </select>
          </div>
        </div>

        <div class="goal-hint-box">
          目标的创建与管理已移到侧边栏的“目标管理”入口，这里只负责选择已有目标。
        </div>

        <!-- 子任务 -->
        <div class="plan-section">
          <div class="plan-label-row">
            <span class="plan-label">子任务</span>
            <button class="mini-add-btn" @click="handleAddSubtask">添加子任务</button>
          </div>

          <div v-if="draft.subtasks.length === 0" class="subtask-empty">
            当前没有子任务。你可以把大任务拆成几个最小可执行动作。
          </div>

          <div v-else class="subtask-list">
            <div v-for="(item, index) in draft.subtasks" :key="index" class="subtask-item">
              <input
                v-model="item.title"
                class="subtask-input"
                type="text"
                :placeholder="`子任务 ${index + 1}`"
              />
              <button class="subtask-remove-btn" @click="handleRemoveSubtask(index)">删除</button>
            </div>
          </div>
        </div>

        <!-- 删除整个任务（编辑模式） -->
        <div v-if="isEditMode" class="plan-danger-zone">
          <button class="btn-delete-plan" @click="handleDeletePlan">删除此任务</button>
          <div class="plan-danger-hint">将删除该任务、其子任务与关联结果记录。此操作不可恢复。</div>
        </div>

        <!-- 操作 -->
        <div class="plan-actions">
          <button class="btn-cancel" @click="$emit('close')">取消</button>
          <button class="btn-save" @click="handleSave">保存计划</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { reactive, watch, computed } from 'vue'

/**
 * 计划编辑弹层
 * 当前职责：
 * 1. 编辑标题、时间、备注、分类、四象限
 * 2. 绑定已有阶段目标、周目标
 * 3. 编辑子任务
 * 4. 支持循环规则设置（不循环 / 每日 / 每周）
 * 5. 单次任务：安排日期 + 截止日期
 * 6. 循环任务：开始日期 + 结束日期
 * 7. 编辑模式支持删除整个任务（todo）
 */
const props = defineProps({
  show: { type: Boolean, default: false },
  plan: { type: Object, default: null },
  phaseGoals: { type: Array, default: () => [] },
  weekGoals: { type: Array, default: () => [] }
})

const emit = defineEmits([
  'close',
  'save',
  'delete-plan'
])

const weekdayOptions = [
  { value: 1, label: '一' },
  { value: 2, label: '二' },
  { value: 3, label: '三' },
  { value: 4, label: '四' },
  { value: 5, label: '五' },
  { value: 6, label: '六' },
  { value: 7, label: '日' }
]

const draft = reactive({
  title: '',
  scheduleDate: '',
  deadlineDate: '',
  startDate: '',
  endDate: '',
  note: '',
  category: '',
  quadrant: 2,
  recurrence: 'none',
  recurrenceDays: [],
  phaseGoalId: '',
  weekGoalId: '',
  subtasks: []
})

const isEditMode = computed(() => !!props.plan?.id)

const filteredWeekGoals = computed(() => {
  if (!draft.phaseGoalId) return props.weekGoals
  return props.weekGoals.filter(item => String(item.parentId || '') === String(draft.phaseGoalId))
})

watch(
  () => props.show,
  (val) => {
    if (val) {
      draft.title = props.plan?.title || ''
      draft.scheduleDate = props.plan?.scheduleDate || props.plan?.dueDate || ''
      draft.deadlineDate = props.plan?.deadlineDate || ''
      draft.startDate = props.plan?.startDate || props.plan?.dueDate || ''
      draft.endDate = props.plan?.endDate || ''
      draft.note = props.plan?.note || ''
      draft.category = props.plan?.category || ''
      draft.quadrant = Number(props.plan?.quadrant || 2)
      draft.recurrence = props.plan?.recurrence || 'none'
      draft.recurrenceDays = Array.isArray(props.plan?.recurrenceDays)
        ? props.plan.recurrenceDays.map(item => Number(item))
        : []
      draft.phaseGoalId = props.plan?.phaseGoalId ? String(props.plan.phaseGoalId) : ''
      draft.weekGoalId = props.plan?.weekGoalId ? String(props.plan.weekGoalId) : ''
      draft.subtasks = Array.isArray(props.plan?.subtasks)
        ? props.plan.subtasks.map(item => ({ title: item.title || '' }))
        : []
    }
  },
  { immediate: true }
)

watch(
  () => draft.phaseGoalId,
  () => {
    if (!draft.phaseGoalId) return
    const has = filteredWeekGoals.value.some(item => String(item.id) === String(draft.weekGoalId))
    if (!has) draft.weekGoalId = ''
  }
)

watch(
  () => draft.recurrence,
  (val) => {
    if (val !== 'weekly') {
      draft.recurrenceDays = []
    }

    if (val === 'none') {
      if (!draft.scheduleDate && draft.startDate) {
        draft.scheduleDate = draft.startDate
      }
    } else {
      if (!draft.startDate && draft.scheduleDate) {
        draft.startDate = draft.scheduleDate
      }
    }
  }
)

const handleAddSubtask = () => {
  draft.subtasks.push({ title: '' })
}

const handleRemoveSubtask = (index) => {
  draft.subtasks.splice(index, 1)
}

const toggleWeekday = (value) => {
  const exists = draft.recurrenceDays.includes(value)
  if (exists) {
    draft.recurrenceDays = draft.recurrenceDays.filter(item => item !== value)
  } else {
    draft.recurrenceDays = [...draft.recurrenceDays, value].sort((a, b) => a - b)
  }
}

const handleDeletePlan = () => {
  if (!props.plan?.id) return
  const ok = window.confirm(`确认删除任务「${props.plan.title || '未命名任务'}」吗？`)
  if (!ok) return

  emit('delete-plan', {
    id: props.plan.id,
    title: props.plan.title || '未命名任务'
  })
}

const handleSave = () => {
  emit('save', {
    title: draft.title,
    scheduleDate: draft.scheduleDate,
    deadlineDate: draft.deadlineDate,
    startDate: draft.startDate,
    endDate: draft.endDate,
    note: draft.note,
    category: draft.category,
    quadrant: Number(draft.quadrant || 2),
    recurrence: draft.recurrence || 'none',
    recurrenceDays: draft.recurrence === 'weekly'
      ? draft.recurrenceDays.map(item => Number(item)).sort((a, b) => a - b)
      : [],
    phaseGoalId: draft.phaseGoalId ? Number(draft.phaseGoalId) : null,
    weekGoalId: draft.weekGoalId ? Number(draft.weekGoalId) : null,
    subtasks: draft.subtasks
      .map(item => ({ title: String(item.title || '').trim() }))
      .filter(item => item.title)
  })
}
</script>

<style scoped>
.plan-sheet-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 99999;
  background: rgba(0,0,0,0.32);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.plan-sheet {
  width: 100%;
  max-height: 86vh;
  background: #fff;
  border-radius: 28px 28px 0 0;
  padding: 18px 16px calc(20px + env(safe-area-inset-bottom, 0px));
  overflow-y: auto;
  box-shadow: 0 -12px 40px rgba(0,0,0,0.12);
}

.plan-sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.plan-sheet-title {
  font-size: 17px;
  font-weight: 800;
  color: #1c1c1e;
}

.plan-sheet-header i {
  padding: 8px;
  color: #888;
  cursor: pointer;
}

.plan-section {
  margin-top: 16px;
}

.plan-section.in-grid {
  margin-top: 0;
}

.plan-label {
  font-size: 12px;
  color: #777;
  font-weight: 700;
  margin-bottom: 8px;
}

.plan-sub-label {
  font-size: 11px;
  color: #888;
  font-weight: 700;
  margin-bottom: 8px;
}

.plan-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.plan-input {
  width: 100%;
  height: 42px;
  border: none;
  outline: none;
  border-radius: 14px;
  background: #f4f5f7;
  padding: 0 14px;
  font-size: 13px;
  color: #333;
  box-sizing: border-box;
}

.date-hint {
  margin-top: 8px;
  font-size: 11px;
  color: #999;
  line-height: 1.7;
}

.plan-textarea {
  width: 100%;
  min-height: 110px;
  border: none;
  outline: none;
  resize: none;
  border-radius: 18px;
  background: #f4f5f7;
  padding: 14px;
  box-sizing: border-box;
  font-size: 13px;
  color: #333;
  line-height: 1.7;
}

.plan-grid-two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.recurrence-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.recurrence-chip {
  padding: 8px 12px;
  border-radius: 999px;
  background: #f4f5f7;
  color: #666;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.recurrence-chip.active {
  background: #1c1c1e;
  color: #fff;
}

.weekday-picker {
  margin-top: 10px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.weekday-chip {
  width: 34px;
  height: 34px;
  border-radius: 17px;
  background: #f4f5f7;
  color: #666;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.weekday-chip.active {
  background: #1c1c1e;
  color: #fff;
}

.recurrence-hint {
  margin-top: 10px;
  font-size: 11px;
  color: #999;
  line-height: 1.7;
}

.goal-hint-box {
  margin-top: 16px;
  padding: 12px 14px;
  border-radius: 14px;
  background: #f8f9fa;
  color: #888;
  font-size: 12px;
  line-height: 1.7;
}

.subtask-empty {
  border-radius: 16px;
  background: #f7f7f9;
  padding: 14px;
  font-size: 12px;
  color: #999;
  line-height: 1.7;
}

.subtask-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.subtask-item {
  display: flex;
  gap: 8px;
}

.subtask-input {
  flex: 1;
  height: 40px;
  border: none;
  outline: none;
  border-radius: 12px;
  background: #f4f5f7;
  padding: 0 12px;
  font-size: 13px;
  color: #333;
}

.subtask-remove-btn,
.mini-add-btn {
  height: 40px;
  border: none;
  border-radius: 12px;
  background: #ededf0;
  color: #444;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  padding: 0 12px;
  white-space: nowrap;
}

.plan-danger-zone {
  margin-top: 16px;
  padding: 12px;
  border-radius: 14px;
  background: #fff7f7;
  border: 1px solid #ffe5e5;
}

.btn-delete-plan {
  width: 100%;
  height: 42px;
  border: none;
  border-radius: 12px;
  background: #ffefef;
  color: #c0392b;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.plan-danger-hint {
  margin-top: 8px;
  font-size: 11px;
  color: #b06b6b;
  line-height: 1.6;
}

.plan-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.btn-cancel {
  flex: 1;
  height: 46px;
  border: none;
  border-radius: 14px;
  background: #ededf0;
  color: #444;
  font-weight: 700;
  cursor: pointer;
}

.btn-save {
  flex: 1;
  height: 46px;
  border: none;
  border-radius: 14px;
  background: #1c1c1e;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}
</style>
