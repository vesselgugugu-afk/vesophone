<template>
  <transition name="fade">
    <div v-if="show" class="todo-sidebar-mask" @click.self="$emit('close')">
      <div class="todo-sidebar">
        <div class="sidebar-header-card">
          <div class="sidebar-user-row">
            <div class="sidebar-avatar">U</div>
            <div class="sidebar-user-info">
              <div class="sidebar-user-title">今日驾驶舱</div>
              <div class="sidebar-user-sub">当前主线：{{ currentMainlineText }}</div>
            </div>
          </div>

          <div class="sidebar-rpg-row">
            <div class="sidebar-rpg-pill">Lv. {{ rpgState.level }}</div>
            <div class="sidebar-rpg-pill">AP {{ rpgState.actionPoints }}</div>
            <div class="sidebar-rpg-pill">EXP {{ rpgState.todayExp }}</div>
          </div>

          <div class="sidebar-stat-grid">
            <div class="sidebar-stat-card">
              <div class="sidebar-stat-num">{{ summary.total }}</div>
              <div class="sidebar-stat-label">计划数</div>
            </div>
            <div class="sidebar-stat-card">
              <div class="sidebar-stat-num">{{ summary.done }}</div>
              <div class="sidebar-stat-label">已完成</div>
            </div>
            <div class="sidebar-stat-card">
              <div class="sidebar-stat-num">{{ todayFocusMinutes }}</div>
              <div class="sidebar-stat-label">专注分钟</div>
            </div>
          </div>
        </div>

        <!-- 目标管理 -->
        <div class="sidebar-section">
          <div class="sidebar-section-title">目标管理</div>

          <div class="sidebar-main-card" @click="$emit('open-goal-manager')">
            <div class="sidebar-main-card-left">
              <div class="sidebar-main-card-icon">
                <i class="fas fa-bullseye"></i>
              </div>
              <div class="sidebar-main-card-texts">
                <div class="sidebar-main-card-title">打开目标管理</div>
                <div class="sidebar-main-card-desc">集中管理阶段目标与周目标</div>
              </div>
            </div>
            <i class="fas fa-chevron-right"></i>
          </div>

          <div class="sidebar-mini-grid">
            <div class="sidebar-mini-card">
              <div class="sidebar-mini-num">{{ phaseGoalCount }}</div>
              <div class="sidebar-mini-label">阶段目标</div>
            </div>
            <div class="sidebar-mini-card">
              <div class="sidebar-mini-num">{{ weekGoalCount }}</div>
              <div class="sidebar-mini-label">周目标</div>
            </div>
          </div>
        </div>

        <!-- 筛选视图 -->
        <div class="sidebar-section">
          <div class="sidebar-section-title">筛选视图</div>

          <div class="sidebar-filter-list">
            <div
              class="sidebar-filter-chip"
              :class="{ active: activeFilter === 'all' }"
              @click="$emit('change-filter', 'all')"
            >
              全部计划
            </div>

            <div
              class="sidebar-filter-chip"
              :class="{ active: activeFilter === 'unrecorded' }"
              @click="$emit('change-filter', 'unrecorded')"
            >
              未记录结果
            </div>

            <div
              class="sidebar-filter-chip"
              :class="{ active: activeFilter === 'q1' }"
              @click="$emit('change-filter', 'q1')"
            >
              重要且紧急
            </div>

            <div
              class="sidebar-filter-chip"
              :class="{ active: activeFilter === 'q2' }"
              @click="$emit('change-filter', 'q2')"
            >
              重要不紧急
            </div>

            <div
              class="sidebar-filter-chip"
              :class="{ active: activeFilter === 'recurring' }"
              @click="$emit('change-filter', 'recurring')"
            >
              循环任务
            </div>

            <div
              class="sidebar-filter-chip"
              :class="{ active: activeFilter === 'today_due' }"
              @click="$emit('change-filter', 'today_due')"
            >
              今日到期
            </div>

            <div
              class="sidebar-filter-chip"
              :class="{ active: activeFilter === 'overdue' }"
              @click="$emit('change-filter', 'overdue')"
            >
              已逾期
            </div>
          </div>
        </div>

        <!-- 分类筛选 -->
        <div class="sidebar-section" v-if="categories.length > 0">
          <div class="sidebar-section-title">分类</div>

          <div class="sidebar-filter-list">
            <div
              class="sidebar-filter-chip"
              :class="{ active: activeCategory === '' }"
              @click="$emit('change-category', '')"
            >
              全部分类
            </div>

            <div
              v-for="item in categories"
              :key="item"
              class="sidebar-filter-chip"
              :class="{ active: activeCategory === item }"
              @click="$emit('change-category', item)"
            >
              {{ item }}
            </div>
          </div>
        </div>

        <!-- 系统入口 -->
        <div class="sidebar-section">
          <div class="sidebar-section-title">系统入口</div>

          <div class="sidebar-setting-list">
            <div class="sidebar-setting-item">
              <div class="sidebar-setting-left">
                <i class="fas fa-sliders-h"></i>
                <span>番茄钟设置</span>
              </div>
              <span class="sidebar-setting-right">后续接入</span>
            </div>

            <div class="sidebar-setting-item">
              <div class="sidebar-setting-left">
                <i class="fas fa-palette"></i>
                <span>主题与样式</span>
              </div>
              <span class="sidebar-setting-right">后续接入</span>
            </div>

            <div class="sidebar-setting-item">
              <div class="sidebar-setting-left">
                <i class="fas fa-database"></i>
                <span>数据导出</span>
              </div>
              <span class="sidebar-setting-right">后续接入</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { computed } from 'vue'

/**
 * Todo 侧边栏
 * 当前职责：
 * 1. 显示今日状态
 * 2. 显示 RPG 当前等级 / AP / 今日 EXP
 * 3. 提供目标管理入口
 * 4. 提供基础筛选入口（含今日到期 / 已逾期）
 * 5. 提供分类筛选入口
 * 6. 作为系统控制中心
 */
const props = defineProps({
  show: { type: Boolean, default: false },
  summary: {
    type: Object,
    default: () => ({
      total: 0,
      done: 0,
      todo: 0
    })
  },
  todayFocusMinutes: { type: Number, default: 0 },
  phaseGoalCount: { type: Number, default: 0 },
  weekGoalCount: { type: Number, default: 0 },
  currentMainlineText: { type: String, default: '尚未设定本周主线' },
  activeFilter: { type: String, default: 'all' },
  activeCategory: { type: String, default: '' },
  categories: { type: Array, default: () => [] },
  rpgState: {
    type: Object,
    default: () => ({
      level: 1,
      actionPoints: 0,
      todayExp: 0
    })
  }
})

defineEmits(['close', 'open-goal-manager', 'change-filter', 'change-category'])

const summary = computed(() => props.summary)
const rpgState = computed(() => props.rpgState)
</script>

<style scoped>
.todo-sidebar-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 99998;
  background: rgba(0,0,0,0.28);
  display: flex;
  justify-content: flex-start;
  align-items: stretch;
}

.todo-sidebar {
  width: 82%;
  max-width: 340px;
  height: 100%;
  background: #f8f9fa;
  padding: calc(env(safe-area-inset-top, 0px) + 24px) 16px calc(env(safe-area-inset-bottom, 0px) + 20px);
  box-sizing: border-box;
  box-shadow: 10px 0 30px rgba(0,0,0,0.08);
  overflow-y: auto;
}

.sidebar-header-card {
  background: #1c1c1e;
  border-radius: 24px;
  padding: 16px;
  color: #fff;
  box-shadow: 0 12px 28px rgba(28, 28, 30, 0.28);
}

.sidebar-user-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sidebar-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255,255,255,0.12);
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 16px;
  font-weight: 800;
  color: #fff;
}

.sidebar-user-info {
  flex: 1;
}

.sidebar-user-title {
  font-size: 16px;
  font-weight: 800;
}

.sidebar-user-sub {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(255,255,255,0.72);
  line-height: 1.6;
}

.sidebar-rpg-row {
  margin-top: 14px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.sidebar-rpg-pill {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255,255,255,0.1);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.2px;
}

.sidebar-stat-grid {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.sidebar-stat-card {
  background: rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 10px 8px;
  text-align: center;
}

.sidebar-stat-num {
  font-size: 17px;
  font-weight: 800;
  color: #fff;
}

.sidebar-stat-label {
  margin-top: 4px;
  font-size: 10px;
  color: rgba(255,255,255,0.66);
}

.sidebar-section {
  margin-top: 18px;
}

.sidebar-section-title {
  font-size: 12px;
  font-weight: 800;
  color: #8a8a8f;
  margin-bottom: 10px;
  padding-left: 2px;
}

.sidebar-main-card {
  background: #ffffff;
  border-radius: 18px;
  padding: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 6px 18px rgba(0,0,0,0.04);
  cursor: pointer;
}

.sidebar-main-card-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sidebar-main-card-icon {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: #1c1c1e;
  color: #fff;
  display: flex;
  justify-content: center;
  align-items: center;
}

.sidebar-main-card-texts {
  display: flex;
  flex-direction: column;
}

.sidebar-main-card-title {
  font-size: 14px;
  font-weight: 700;
  color: #1c1c1e;
}

.sidebar-main-card-desc {
  margin-top: 4px;
  font-size: 11px;
  color: #999;
}

.sidebar-main-card > i {
  color: #b5b5ba;
}

.sidebar-mini-grid {
  margin-top: 10px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.sidebar-mini-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 12px;
  box-shadow: 0 6px 18px rgba(0,0,0,0.03);
}

.sidebar-mini-num {
  font-size: 18px;
  font-weight: 800;
  color: #1c1c1e;
}

.sidebar-mini-label {
  margin-top: 6px;
  font-size: 11px;
  color: #8e8e93;
}

.sidebar-filter-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.sidebar-filter-chip {
  padding: 8px 12px;
  border-radius: 999px;
  background: #ffffff;
  color: #555;
  font-size: 12px;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);
  cursor: pointer;
  transition: all 0.2s;
}

.sidebar-filter-chip.active {
  background: #1c1c1e;
  color: #fff;
}

.sidebar-setting-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sidebar-setting-item {
  background: #ffffff;
  border-radius: 16px;
  padding: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 6px 18px rgba(0,0,0,0.03);
}

.sidebar-setting-left {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #333;
  font-size: 13px;
  font-weight: 700;
}

.sidebar-setting-left i {
  color: #666;
}

.sidebar-setting-right {
  font-size: 11px;
  color: #aaa;
}
</style>
