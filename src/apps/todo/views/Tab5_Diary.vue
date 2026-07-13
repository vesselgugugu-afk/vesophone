<template>
  <div class="todo-tab-page">
    <div class="diary-switcher">
      <div class="diary-switch active">每日手账</div>
      <div class="diary-switch">灵感碎片箱</div>
    </div>

    <div class="diary-card">
      <div class="diary-title">记忆与灵感</div>
      <div class="diary-desc">
        这里将承接每日复盘、日记文件夹、灵感碎片与分享给 AI 的入口。
      </div>
    </div>

    <div class="diary-placeholder">
      第 1 批先占位。<br>
      后续会接入 daily_reviews、idea_fragments 与记忆库联动。
    </div>
  </div>
</template>

<script setup>
/**
 * Tab5：日记与灵感骨架
 * 当前阶段职责：
 * 1. 搭建每日手账 / 灵感碎片箱容器
 * 2. 为后续 daily_reviews、idea_fragments、AI 分享入口做铺垫
 */
</script>

<style scoped>
.todo-tab-page {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.diary-switcher {
  display: flex;
  gap: 10px;
}

.diary-switch {
  flex: 1;
  height: 42px;
  border-radius: 14px;
  background: #f1f2f4;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 12px;
  color: #777;
  font-weight: 700;
}

.diary-switch.active {
  background: #fff;
  color: #1c1c1e;
}

.diary-card {
  background: #fff;
  border-radius: 20px;
  padding: 18px;
}

.diary-title {
  font-size: 16px;
  font-weight: 700;
  color: #1c1c1e;
}

.diary-desc {
  font-size: 12px;
  color: #8e8e93;
  line-height: 1.7;
  margin-top: 8px;
}

.diary-placeholder {
  min-height: 320px;
  border-radius: 22px;
  background: linear-gradient(180deg, #fffdfb, #ffffff);
  border: 1px dashed rgba(0,0,0,0.06);
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  color: #999;
  font-size: 12px;
  line-height: 1.8;
  padding: 20px;
}
</style>
