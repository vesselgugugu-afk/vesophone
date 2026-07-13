<template>
  <div class="todo-tab-page">
    <div class="stats-block">
      <div class="stats-title">全知视界</div>
      <div class="stats-desc">
        这里将承接热力图、时间轴、AI 日程双轨视图与统计卡片。
      </div>
    </div>

    <div class="stats-grid">
      <div class="stats-card">
        <div class="stats-card-label">今日任务</div>
        <div class="stats-card-value">{{ summary.total }}</div>
      </div>
      <div class="stats-card">
        <div class="stats-card-label">已完成</div>
        <div class="stats-card-value">{{ summary.done }}</div>
      </div>
      <div class="stats-card">
        <div class="stats-card-label">待推进</div>
        <div class="stats-card-value">{{ summary.todo }}</div>
      </div>
    </div>

    <div class="timeline-placeholder">
      双轨时间轴与热力图将在后续批次落地。
    </div>
  </div>
</template>

<script setup>
/**
 * Tab3：统计页骨架
 * 当前阶段职责：
 * 1. 提供统计页容器
 * 2. 提前接收任务摘要数据
 * 3. 为后续时间轴、热力图与 AI 日程双轨视图做铺垫
 */
defineProps({
  summary: {
    type: Object,
    default: () => ({ total: 0, done: 0, todo: 0 })
  }
})
</script>

<style scoped>
.todo-tab-page {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.stats-block {
  background: #fff;
  border-radius: 20px;
  padding: 18px;
}

.stats-title {
  font-size: 16px;
  font-weight: 700;
  color: #1c1c1e;
}

.stats-desc {
  font-size: 12px;
  color: #888;
  line-height: 1.7;
  margin-top: 8px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.stats-card {
  background: #fff;
  border-radius: 18px;
  padding: 16px 12px;
  text-align: center;
}

.stats-card-label {
  font-size: 11px;
  color: #8e8e93;
  margin-bottom: 8px;
}

.stats-card-value {
  font-size: 24px;
  font-weight: 800;
  color: #1c1c1e;
}

.timeline-placeholder {
  background: linear-gradient(180deg, #ffffff, #f7f8fa);
  border-radius: 22px;
  min-height: 320px;
  border: 1px dashed rgba(0,0,0,0.06);
  display: flex;
  justify-content: center;
  align-items: center;
  color: #999;
  font-size: 12px;
  text-align: center;
  padding: 20px;
}
</style>
