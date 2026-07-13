<template>
  <transition name="reward-card-fade">
    <div v-if="show" class="reward-toast-wrap">
      <div class="reward-toast-card">
        <!-- 顶部标题区：说明这是一张“成长结算卡” -->
        <div class="reward-toast-head">
          <div class="reward-toast-kicker">成长结算</div>
          <div class="reward-toast-title">{{ title }}</div>
        </div>

        <!-- 中间奖励区：展示 EXP / AP / 升级 -->
        <div class="reward-toast-body">
          <div v-if="exp > 0" class="reward-chip dark">
            <span class="reward-chip-label">经验</span>
            <span class="reward-chip-value">+{{ exp }}</span>
          </div>

          <div v-if="ap > 0" class="reward-chip light">
            <span class="reward-chip-label">行动点</span>
            <span class="reward-chip-value">+{{ ap }}</span>
          </div>

          <div v-if="levelUpCount > 0" class="reward-chip green">
            <span class="reward-chip-label">升级</span>
            <span class="reward-chip-value">+{{ levelUpCount }}</span>
          </div>
        </div>

        <!-- 底部说明：展示为什么得到奖励 -->
        <div v-if="reason" class="reward-toast-foot">
          {{ reason }}
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
/**
 * 奖励浮层
 * 当前职责：
 * 1. 在任务 / 专注结算后展示即时奖励
 * 2. 保持高级、轻量、杂志化的视觉风格
 * 3. 避免做成普通系统 toast，而是更像一张成长结算卡
 */
defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, default: '获得奖励' },
  exp: { type: Number, default: 0 },
  ap: { type: Number, default: 0 },
  levelUpCount: { type: Number, default: 0 },
  reason: { type: String, default: '' }
})
</script>

<style scoped>
.reward-toast-wrap {
  position: fixed;
  top: calc(env(safe-area-inset-top, 0px) + 78px);
  left: 50%;
  transform: translateX(-50%);
  width: calc(100vw - 36px);
  max-width: 360px;
  z-index: 100000;
}

.reward-toast-card {
  background:
    linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(250,250,248,0.96) 100%);
  border: 1px solid rgba(0,0,0,0.05);
  border-radius: 24px;
  padding: 16px;
  box-shadow:
    0 18px 40px rgba(0,0,0,0.10),
    0 4px 12px rgba(0,0,0,0.04),
    inset 0 1px 0 rgba(255,255,255,0.9);
  backdrop-filter: blur(16px);
}

.reward-toast-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.reward-toast-kicker {
  font-size: 10px;
  font-weight: 800;
  color: #9a9aa1;
  letter-spacing: 1px;
}

.reward-toast-title {
  font-size: 18px;
  font-weight: 900;
  color: #1c1c1e;
  line-height: 1.2;
}

.reward-toast-body {
  margin-top: 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.reward-chip {
  min-width: 92px;
  border-radius: 16px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.reward-chip.dark {
  background: linear-gradient(135deg, #1c1c1e 0%, #35353a 100%);
  color: #fff;
}

.reward-chip.light {
  background: linear-gradient(135deg, #f2f3f5 0%, #ffffff 100%);
  color: #1c1c1e;
  border: 1px solid rgba(0,0,0,0.04);
}

.reward-chip.green {
  background: linear-gradient(135deg, #edf8f0 0%, #ffffff 100%);
  color: #296c46;
  border: 1px solid rgba(41,108,70,0.08);
}

.reward-chip-label {
  font-size: 10px;
  font-weight: 800;
  opacity: 0.78;
  letter-spacing: 0.5px;
}

.reward-chip-value {
  font-size: 20px;
  font-weight: 900;
  line-height: 1;
}

.reward-toast-foot {
  margin-top: 12px;
  font-size: 12px;
  color: #8c8c93;
  line-height: 1.6;
}

.reward-card-fade-enter-active,
.reward-card-fade-leave-active {
  transition: all 0.28s ease;
}

.reward-card-fade-enter-from,
.reward-card-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
