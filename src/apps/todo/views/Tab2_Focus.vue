<template>
  <div class="focus-workbench-page">
    <!-- 顶部总览 -->
    <div class="focus-head-card">
      <div class="focus-kicker">FOCUS WORKBENCH</div>
      <div class="focus-title">番茄钟工作台</div>
      <div class="focus-sub">
        这里用于保存与管理你的番茄钟预设。点击某个预设后再启动专注，不再直接把 Tab2 当设置页。
      </div>
    </div>

    <!-- 入口操作区 -->
    <div class="focus-card">
      <div class="section-title">快速操作</div>
      <div class="quick-action-row">
        <button class="quick-action-btn dark" @click="openCreateSinglePreset">
          新建番茄钟
        </button>
        <button class="quick-action-btn light" @click="openCreateGroupPreset">
          新建番茄钟组
        </button>
      </div>
    </div>

    <!-- 最近启动 -->
    <div class="focus-card">
      <div class="section-title">最近启动</div>

      <div v-if="recentLaunchCards.length === 0" class="empty-text">
        还没有启动记录。你可以先创建一个预设。
      </div>

      <div v-else class="preset-list">
        <div
          v-for="item in recentLaunchCards"
          :key="`recent_${item.id}`"
          class="preset-item"
        >
          <div class="preset-main">
            <div class="preset-title">{{ item.title }}</div>
            <div class="preset-sub">{{ buildPresetSubText(item) }}</div>
          </div>

          <div class="preset-actions">
            <button class="mini-btn dark" @click="openLaunchConfirm(item)">启动</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 单个番茄钟预设 -->
    <div class="focus-card">
      <div class="section-title">番茄钟预设</div>

      <div v-if="singlePresets.length === 0" class="empty-text">
        还没有单个预设。点击上方“新建番茄钟”开始创建。
      </div>

      <div v-else class="preset-list">
        <div
          v-for="item in singlePresets"
          :key="item.id"
          class="preset-item"
        >
          <div class="preset-main">
            <div class="preset-title">{{ item.title }}</div>
            <div class="preset-sub">{{ buildPresetSubText(item) }}</div>
          </div>

          <div class="preset-actions">
            <button class="mini-btn" @click="openEditPreset(item)">编辑</button>
            <button class="mini-btn dark" @click="openLaunchConfirm(item)">启动</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 番茄钟组 -->
    <div class="focus-card">
      <div class="section-title">番茄钟组</div>

      <div v-if="groupPresets.length === 0" class="empty-text">
        还没有番茄钟组。点击上方“新建番茄钟组”开始创建。
      </div>

      <div v-else class="preset-list">
        <div
          v-for="item in groupPresets"
          :key="item.id"
          class="preset-item"
        >
          <div class="preset-main">
            <div class="preset-title">{{ item.title }}</div>
            <div class="preset-sub">{{ buildPresetSubText(item) }}</div>
          </div>

          <div class="preset-actions">
            <button class="mini-btn" @click="openEditPreset(item)">编辑</button>
            <button class="mini-btn dark" @click="openLaunchConfirm(item)">启动</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 预设编辑弹层 -->
    <transition name="fade">
      <div v-if="showPresetEditor" class="sheet-mask" @click.self="closePresetEditor">
        <div class="sheet-card">
          <div class="sheet-head">
            <div class="sheet-title">{{ editingPreset?.id ? '编辑预设' : '新建预设' }}</div>
            <i class="fas fa-times" @click="closePresetEditor"></i>
          </div>

          <div class="sheet-section">
            <div class="sheet-label">预设类型</div>
            <div class="type-row">
              <div
                class="type-chip"
                :class="{ active: draft.type === 'single' }"
                @click="draft.type = 'single'"
              >
                单个番茄钟
              </div>
              <div
                class="type-chip"
                :class="{ active: draft.type === 'group' }"
                @click="draft.type = 'group'"
              >
                番茄钟组
              </div>
            </div>
          </div>

          <div class="sheet-section">
            <div class="sheet-label">名称</div>
            <input v-model="draft.title" class="sheet-input" type="text" placeholder="例如：论文推进 50 / 10 x3" />
          </div>

          <div class="sheet-grid-two">
            <div class="sheet-section in-grid">
              <div class="sheet-label">计时方式</div>
              <select v-model="draft.timerMode" class="sheet-input">
                <option value="countdown">倒计时</option>
                <option value="countup">正计时</option>
              </select>
            </div>

            <div class="sheet-section in-grid">
              <div class="sheet-label">专注类型</div>
              <select v-model="draft.focusTypeKey" class="sheet-input">
                <option v-for="item in focusTypes" :key="item.key" :value="item.key">
                  {{ item.label }}
                </option>
              </select>
            </div>
          </div>

          <!-- 单个预设字段 -->
          <div v-if="draft.type === 'single'" class="sheet-grid-two">
            <div class="sheet-section in-grid">
              <div class="sheet-label">时长（分钟）</div>
              <input v-model.number="draft.durationMinutes" class="sheet-input" type="number" min="1" max="240" />
            </div>
          </div>

          <!-- 组预设字段 -->
          <div v-if="draft.type === 'group'" class="sheet-grid-two">
            <div class="sheet-section in-grid">
              <div class="sheet-label">专注时长（分钟）</div>
              <input v-model.number="draft.focusMinutes" class="sheet-input" type="number" min="1" max="240" />
            </div>

            <div class="sheet-section in-grid">
              <div class="sheet-label">休息时长（分钟）</div>
              <input v-model.number="draft.breakMinutes" class="sheet-input" type="number" min="1" max="120" />
            </div>

            <div class="sheet-section in-grid">
              <div class="sheet-label">轮数</div>
              <input v-model.number="draft.rounds" class="sheet-input" type="number" min="1" max="12" />
            </div>
          </div>

          <div v-if="draft.type === 'group'" class="sheet-hint">
            番茄钟组结构：专注 + 休息 交替执行。当前批次先完成工作台与启动入口，自动串联执行将在下一批接入。
          </div>

          <div class="sheet-actions">
            <button class="sheet-btn light" @click="closePresetEditor">取消</button>
            <button class="sheet-btn dark" @click="savePreset">保存</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- 启动确认弹层 -->
    <transition name="fade">
      <div v-if="showLaunchConfirm" class="sheet-mask" @click.self="closeLaunchConfirm">
        <div class="sheet-card">
          <div class="sheet-head">
            <div class="sheet-title">启动确认</div>
            <i class="fas fa-times" @click="closeLaunchConfirm"></i>
          </div>

          <div class="confirm-main">
            <div class="confirm-name">{{ launchTarget?.title }}</div>
            <div class="confirm-sub">{{ launchTarget ? buildPresetSubText(launchTarget) : '' }}</div>
          </div>

          <div class="sheet-actions">
            <button class="sheet-btn light" @click="closeLaunchConfirm">取消</button>
            <button class="sheet-btn dark" @click="handleLaunchNow">开始</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

/**
 * Tab2：番茄钟工作台（6.10）
 * 当前职责：
 * 1. 展示单个番茄钟预设
 * 2. 展示番茄钟组
 * 3. 支持新建 / 编辑 / 启动
 * 4. 启动后仍通过 start-focus-session 交给父层打开全屏专注
 * 5. 预设先用 localStorage 持久化（后续可切 db 表）
 */
const emit = defineEmits(['start-focus-session'])

const PRESET_STORE_KEY = 'TODO_FOCUS_PRESETS_V1'
const RECENT_STORE_KEY = 'TODO_FOCUS_RECENT_V1'

const focusTypes = ref([
  {
    key: 'deep_focus',
    label: '沉浸专注',
    desc: '更适合写作、输出、推主线，不建议频繁切出。',
    allowReference: false
  },
  {
    key: 'research_focus',
    label: '查阅型专注',
    desc: '允许合理查文献、翻资料、切去工作工具。',
    allowReference: true
  },
  {
    key: 'light_focus',
    label: '轻任务推进',
    desc: '适合整理、收集、低压推进类事务。',
    allowReference: true
  }
])

/**
 * 预设总表（single + group）
 */
const presets = ref([])

/**
 * 最近启动（只存 id）
 */
const recentLaunchIds = ref([])

const singlePresets = computed(() => {
  return presets.value.filter(item => item.type === 'single')
})

const groupPresets = computed(() => {
  return presets.value.filter(item => item.type === 'group')
})

const recentLaunchCards = computed(() => {
  const cards = []
  for (const id of recentLaunchIds.value) {
    const found = presets.value.find(item => item.id === id)
    if (found) cards.push(found)
  }
  return cards
})

/**
 * 编辑弹层状态
 */
const showPresetEditor = ref(false)
const editingPreset = ref(null)
const draft = ref({
  id: '',
  type: 'single',
  title: '',
  timerMode: 'countdown',
  focusTypeKey: 'deep_focus',
  durationMinutes: 25,
  focusMinutes: 50,
  breakMinutes: 10,
  rounds: 3
})

/**
 * 启动确认弹层状态
 */
const showLaunchConfirm = ref(false)
const launchTarget = ref(null)

const createId = () => {
  return `focus_preset_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

const normalizeDraft = () => {
  const type = draft.value.type === 'group' ? 'group' : 'single'
  const base = {
    id: draft.value.id || createId(),
    type,
    title: String(draft.value.title || '').trim() || (type === 'group' ? '未命名番茄钟组' : '未命名番茄钟'),
    timerMode: draft.value.timerMode === 'countup' ? 'countup' : 'countdown',
    focusTypeKey: focusTypes.value.some(item => item.key === draft.value.focusTypeKey) ? draft.value.focusTypeKey : 'deep_focus',
    createdAt: Date.now(),
    updatedAt: Date.now()
  }

  if (type === 'single') {
    return {
      ...base,
      durationMinutes: Math.max(1, Math.min(240, Number(draft.value.durationMinutes || 25)))
    }
  }

  return {
    ...base,
    focusMinutes: Math.max(1, Math.min(240, Number(draft.value.focusMinutes || 50))),
    breakMinutes: Math.max(1, Math.min(120, Number(draft.value.breakMinutes || 10))),
    rounds: Math.max(1, Math.min(12, Number(draft.value.rounds || 3)))
  }
}

const saveToStore = () => {
  localStorage.setItem(PRESET_STORE_KEY, JSON.stringify(presets.value))
  localStorage.setItem(RECENT_STORE_KEY, JSON.stringify(recentLaunchIds.value))
}

const loadFromStore = () => {
  const rawPresets = localStorage.getItem(PRESET_STORE_KEY)
  const rawRecent = localStorage.getItem(RECENT_STORE_KEY)

  if (rawPresets) {
    try {
      const list = JSON.parse(rawPresets)
      presets.value = Array.isArray(list) ? list : []
    } catch (error) {
      presets.value = []
    }
  }

  if (rawRecent) {
    try {
      const list = JSON.parse(rawRecent)
      recentLaunchIds.value = Array.isArray(list) ? list : []
    } catch (error) {
      recentLaunchIds.value = []
    }
  }

  if (presets.value.length === 0) {
    presets.value = [
      {
        id: createId(),
        type: 'single',
        title: '标准番茄钟',
        timerMode: 'countdown',
        focusTypeKey: 'deep_focus',
        durationMinutes: 25,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: createId(),
        type: 'single',
        title: '深度推进',
        timerMode: 'countdown',
        focusTypeKey: 'research_focus',
        durationMinutes: 50,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: createId(),
        type: 'group',
        title: '50/10 x3',
        timerMode: 'countdown',
        focusTypeKey: 'deep_focus',
        focusMinutes: 50,
        breakMinutes: 10,
        rounds: 3,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ]
    saveToStore()
  }
}

const getFocusTypeByKey = (key) => {
  return focusTypes.value.find(item => item.key === key) || focusTypes.value[0]
}

const buildPresetSubText = (item) => {
  const focusType = getFocusTypeByKey(item.focusTypeKey)

  if (item.type === 'single') {
    return `${item.timerMode === 'countup' ? '正计时' : '倒计时'} · ${item.durationMinutes} 分钟 · ${focusType.label}`
  }

  const total = Number(item.focusMinutes || 0) * Number(item.rounds || 0)
    + Number(item.breakMinutes || 0) * Math.max(0, Number(item.rounds || 0) - 1)

  return `${item.focusMinutes}/${item.breakMinutes} × ${item.rounds} · 总计约 ${total} 分钟 · ${focusType.label}`
}

const openCreateSinglePreset = () => {
  editingPreset.value = null
  draft.value = {
    id: '',
    type: 'single',
    title: '',
    timerMode: 'countdown',
    focusTypeKey: 'deep_focus',
    durationMinutes: 25,
    focusMinutes: 50,
    breakMinutes: 10,
    rounds: 3
  }
  showPresetEditor.value = true
}

const openCreateGroupPreset = () => {
  editingPreset.value = null
  draft.value = {
    id: '',
    type: 'group',
    title: '',
    timerMode: 'countdown',
    focusTypeKey: 'deep_focus',
    durationMinutes: 25,
    focusMinutes: 50,
    breakMinutes: 10,
    rounds: 3
  }
  showPresetEditor.value = true
}

const openEditPreset = (item) => {
  editingPreset.value = item
  draft.value = {
    id: item.id,
    type: item.type,
    title: item.title,
    timerMode: item.timerMode,
    focusTypeKey: item.focusTypeKey,
    durationMinutes: item.durationMinutes || 25,
    focusMinutes: item.focusMinutes || 50,
    breakMinutes: item.breakMinutes || 10,
    rounds: item.rounds || 3
  }
  showPresetEditor.value = true
}

const closePresetEditor = () => {
  showPresetEditor.value = false
  editingPreset.value = null
}

const savePreset = () => {
  const normalized = normalizeDraft()

  if (editingPreset.value?.id) {
    const index = presets.value.findIndex(item => item.id === editingPreset.value.id)
    if (index !== -1) {
      presets.value[index] = {
        ...presets.value[index],
        ...normalized,
        createdAt: presets.value[index].createdAt || Date.now(),
        updatedAt: Date.now()
      }
    }
  } else {
    presets.value.unshift(normalized)
  }

  saveToStore()
  closePresetEditor()
}

const openLaunchConfirm = (item) => {
  launchTarget.value = item
  showLaunchConfirm.value = true
}

const closeLaunchConfirm = () => {
  launchTarget.value = null
  showLaunchConfirm.value = false
}

const pushRecent = (presetId) => {
  const next = [presetId, ...recentLaunchIds.value.filter(id => id !== presetId)].slice(0, 6)
  recentLaunchIds.value = next
  saveToStore()
}

/**
 * 启动预设
 * 说明：
 * 1. single：直接启动
 * 2. group：当前先启动第一段 focus，并把 group 信息塞进 payload，后续在父层继续接自动串联
 */
const handleLaunchNow = () => {
  if (!launchTarget.value) return

  const target = launchTarget.value
  const focusType = getFocusTypeByKey(target.focusTypeKey)
  pushRecent(target.id)

  if (target.type === 'single') {
    emit('start-focus-session', {
      timerMode: target.timerMode,
      durationMinutes: Number(target.durationMinutes || 25),
      focusTypeKey: focusType.key,
      focusTypeLabel: focusType.label,
      allowReference: !!focusType.allowReference,
      presetType: 'single',
      presetId: target.id,
      presetTitle: target.title
    })
  } else {
    emit('start-focus-session', {
      timerMode: target.timerMode,
      durationMinutes: Number(target.focusMinutes || 50),
      focusTypeKey: focusType.key,
      focusTypeLabel: focusType.label,
      allowReference: !!focusType.allowReference,
      presetType: 'group',
      presetId: target.id,
      presetTitle: target.title,
      groupPlan: {
        focusMinutes: Number(target.focusMinutes || 50),
        breakMinutes: Number(target.breakMinutes || 10),
        rounds: Number(target.rounds || 3)
      }
    })
  }

  closeLaunchConfirm()
}

onMounted(() => {
  loadFromStore()
})
</script>

<style scoped>
.focus-workbench-page {
  padding: 16px 16px 110px;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.focus-workbench-page::-webkit-scrollbar {
  display: none;
}
.focus-workbench-page {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.focus-head-card,
.focus-card {
  background: #ffffff;
  border-radius: 24px;
  padding: 16px;
  box-shadow: 0 6px 18px rgba(0,0,0,0.03);
  border: 1px solid rgba(0,0,0,0.03);
}

.focus-kicker {
  font-size: 10px;
  font-weight: 800;
  color: #9a9aa1;
  letter-spacing: 1px;
}

.focus-title {
  margin-top: 6px;
  font-size: 22px;
  font-weight: 900;
  color: #1c1c1e;
}

.focus-sub {
  margin-top: 8px;
  font-size: 12px;
  color: #8e8e93;
  line-height: 1.7;
}

.section-title {
  font-size: 14px;
  font-weight: 900;
  color: #1c1c1e;
}

.quick-action-row {
  margin-top: 12px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.quick-action-btn {
  height: 44px;
  border: none;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.quick-action-btn.dark {
  background: #1c1c1e;
  color: #fff;
}

.quick-action-btn.light {
  background: #eceef1;
  color: #1c1c1e;
}

.empty-text {
  margin-top: 12px;
  font-size: 12px;
  color: #9aa1a8;
  line-height: 1.7;
}

.preset-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.preset-item {
  background: #f8f9fa;
  border: 1px solid rgba(0,0,0,0.03);
  border-radius: 16px;
  padding: 12px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.preset-main {
  flex: 1;
  min-width: 0;
}

.preset-title {
  font-size: 13px;
  font-weight: 800;
  color: #1c1c1e;
  line-height: 1.4;
}

.preset-sub {
  margin-top: 5px;
  font-size: 11px;
  color: #8e8e93;
  line-height: 1.6;
}

.preset-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.mini-btn {
  height: 32px;
  border: none;
  border-radius: 10px;
  background: #eceef1;
  color: #1c1c1e;
  padding: 0 10px;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}

.mini-btn.dark {
  background: #1c1c1e;
  color: #fff;
}

/* 通用弹层 */
.sheet-mask {
  position: fixed;
  inset: 0;
  z-index: 100001;
  background: rgba(0,0,0,0.28);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 16px;
  box-sizing: border-box;
}

.sheet-card {
  width: 100%;
  max-width: 460px;
  max-height: 84vh;
  overflow-y: auto;
  background: #fff;
  border-radius: 22px;
  padding: 16px;
}

.sheet-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sheet-title {
  font-size: 16px;
  font-weight: 900;
  color: #1c1c1e;
}

.sheet-head i {
  color: #888;
  cursor: pointer;
  padding: 8px;
}

.sheet-section {
  margin-top: 14px;
}

.sheet-section.in-grid {
  margin-top: 0;
}

.sheet-label {
  font-size: 12px;
  color: #777;
  font-weight: 700;
  margin-bottom: 8px;
}

.sheet-input {
  width: 100%;
  height: 42px;
  border: none;
  outline: none;
  border-radius: 14px;
  background: #f4f5f7;
  padding: 0 12px;
  box-sizing: border-box;
  font-size: 13px;
  color: #333;
}

.sheet-grid-two {
  margin-top: 14px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.type-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.type-chip {
  padding: 8px 12px;
  border-radius: 999px;
  background: #f4f5f7;
  color: #666;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.type-chip.active {
  background: #1c1c1e;
  color: #fff;
}

.sheet-hint {
  margin-top: 12px;
  font-size: 11px;
  color: #8e8e93;
  line-height: 1.7;
}

.confirm-main {
  margin-top: 12px;
  background: #f8f9fa;
  border-radius: 16px;
  padding: 12px;
}

.confirm-name {
  font-size: 14px;
  font-weight: 900;
  color: #1c1c1e;
}

.confirm-sub {
  margin-top: 6px;
  font-size: 11px;
  color: #8e8e93;
  line-height: 1.7;
}

.sheet-actions {
  margin-top: 16px;
  display: flex;
  gap: 10px;
}

.sheet-btn {
  flex: 1;
  height: 44px;
  border: none;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 900;
  cursor: pointer;
}

.sheet-btn.light {
  background: #eceef1;
  color: #1c1c1e;
}

.sheet-btn.dark {
  background: #1c1c1e;
  color: #fff;
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.22s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
