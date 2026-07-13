<template>
  <transition name="fade">
    <div v-if="show" class="summary-mask" @click.self="$emit('close')">
      <div class="summary-card">
        <div class="summary-kicker">FOCUS REPORT</div>
        <div class="summary-title">本轮专注结算</div>
        <div class="summary-sub">
          这一轮已经结束，下面是本次推进、奖励与成长预留摘要。
        </div>

        <div class="summary-grid">
          <div class="summary-stat-card">
            <div class="summary-stat-label">专注时长</div>
            <div class="summary-stat-value">{{ summary.duration }} 分钟</div>
          </div>

          <div class="summary-stat-card">
            <div class="summary-stat-label">专注类型</div>
            <div class="summary-stat-value">{{ summary.focusTypeLabel || '专注' }}</div>
          </div>

          <div class="summary-stat-card">
            <div class="summary-stat-label">离开记录</div>
            <div class="summary-stat-value">{{ summary.interruptCount || 0 }} 次</div>
          </div>

          <div class="summary-stat-card">
            <div class="summary-stat-label">模式</div>
            <div class="summary-stat-value">{{ summary.timerMode === 'countup' ? '正计时' : '倒计时' }}</div>
          </div>
        </div>

        <div class="summary-reward-card">
          <div class="summary-section-title">奖励结算</div>
          <div class="summary-reward-row">
            <div class="summary-reward-chip dark">经验 +{{ reward.exp || 0 }}</div>
            <div class="summary-reward-chip light">行动点 +{{ reward.ap || 0 }}</div>
            <div v-if="reward.levelUpCount > 0" class="summary-reward-chip green">升级 +{{ reward.levelUpCount }}</div>
          </div>
        </div>

        <div class="summary-tree-card">
          <div class="summary-section-title">成长树预留</div>
          <div class="summary-tree-stage">{{ summary.treePreview?.stageLabel || '种子蓄势' }}</div>
          <div class="summary-tree-desc">
            本轮为成长树积累了 {{ summary.treePreview?.growthMinutes || summary.duration || 0 }} 分钟养分。
            后续你可以再决定树的阶段、外观和长期成长规则。
          </div>
        </div>

        <div class="summary-sound-card">
          <div class="summary-section-title">本轮声音</div>

          <div v-if="!summary.soundBlocksSnapshot || summary.soundBlocksSnapshot.length === 0" class="summary-sound-empty">
            本轮未启用任何声音块。
          </div>

          <div v-else class="summary-sound-list">
            <div v-for="item in summary.soundBlocksSnapshot" :key="item.id" class="summary-sound-item">
              <div class="summary-sound-name">{{ item.title }}</div>
              <div class="summary-sound-sub">
                {{ getBlockTypeLabel(item.type) }}
                <span v-if="item.artist"> · {{ item.artist }}</span>
                · 音量 {{ Math.round((item.volume || 0) * 100) }}%
              </div>
            </div>
          </div>
        </div>

        <div class="summary-actions">
          <button class="summary-btn" @click="$emit('close')">完成</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
/**
 * 专注结算页
 * 当前职责：
 * 1. 展示本轮专注摘要
 * 2. 展示奖励结算
 * 3. 展示成长树预留摘要
 * 4. 展示本轮混音使用情况
 */
defineProps({
  show: { type: Boolean, default: false },
  summary: {
    type: Object,
    default: () => ({
      duration: 0,
      focusTypeLabel: '',
      interruptCount: 0,
      timerMode: 'countdown',
      soundBlocksSnapshot: [],
      treePreview: null
    })
  },
  reward: {
    type: Object,
    default: () => ({
      exp: 0,
      ap: 0,
      levelUpCount: 0
    })
  }
})

defineEmits(['close'])

const getBlockTypeLabel = (type) => {
  const map = {
    builtin: '环境音',
    url: 'URL 音频',
    music: '搜索音乐'
  }
  return map[type] || '声音'
}
</script>

<style scoped>
.summary-mask {
  position: fixed;
  inset: 0;
  z-index: 100001;
  background: rgba(0,0,0,0.28);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
}

.summary-card {
  width: 100%;
  max-width: 420px;
  max-height: 88vh;
  overflow-y: auto;
  background: #ffffff;
  border-radius: 28px;
  padding: 18px;
  box-shadow: 0 20px 48px rgba(0,0,0,0.12);
}

.summary-card::-webkit-scrollbar {
  display: none;
}
.summary-card {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.summary-kicker {
  font-size: 10px;
  font-weight: 800;
  color: #9a9aa1;
  letter-spacing: 1px;
}

.summary-title {
  margin-top: 6px;
  font-size: 22px;
  font-weight: 900;
  color: #1c1c1e;
}

.summary-sub {
  margin-top: 8px;
  font-size: 12px;
  color: #8e8e93;
  line-height: 1.7;
}

.summary-grid {
  margin-top: 16px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.summary-stat-card {
  background: #f8f9fa;
  border-radius: 18px;
  padding: 14px;
}

.summary-stat-label {
  font-size: 11px;
  color: #8e8e93;
  font-weight: 700;
}

.summary-stat-value {
  margin-top: 8px;
  font-size: 16px;
  color: #1c1c1e;
  font-weight: 900;
  line-height: 1.4;
}

.summary-reward-card,
.summary-tree-card,
.summary-sound-card {
  margin-top: 14px;
  background: #f8f9fa;
  border-radius: 22px;
  padding: 14px;
}

.summary-section-title {
  font-size: 13px;
  font-weight: 900;
  color: #1c1c1e;
}

.summary-reward-row {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.summary-reward-chip {
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 900;
}

.summary-reward-chip.dark {
  background: #1c1c1e;
  color: #fff;
}

.summary-reward-chip.light {
  background: #eceef1;
  color: #1c1c1e;
}

.summary-reward-chip.green {
  background: #edf8f0;
  color: #2d6b47;
}

.summary-tree-stage {
  margin-top: 10px;
  font-size: 16px;
  font-weight: 900;
  color: #1c1c1e;
}

.summary-tree-desc {
  margin-top: 8px;
  font-size: 12px;
  color: #8e8e93;
  line-height: 1.8;
}

.summary-sound-empty {
  margin-top: 10px;
  font-size: 12px;
  color: #a0a0a5;
  line-height: 1.7;
}

.summary-sound-list {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary-sound-item {
  background: #ffffff;
  border-radius: 14px;
  padding: 10px 12px;
  border: 1px solid rgba(0,0,0,0.03);
}

.summary-sound-name {
  font-size: 13px;
  font-weight: 800;
  color: #1c1c1e;
}

.summary-sound-sub {
  margin-top: 4px;
  font-size: 11px;
  color: #8e8e93;
  line-height: 1.6;
}

.summary-actions {
  margin-top: 16px;
}

.summary-btn {
  width: 100%;
  height: 48px;
  border: none;
  border-radius: 18px;
  background: #1c1c1e;
  color: #fff;
  font-size: 14px;
  font-weight: 900;
  cursor: pointer;
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
