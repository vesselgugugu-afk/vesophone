<template>
  <div class="todo-bottom-nav-wrapper">
    <div class="todo-nav-pill glass">
      <div
        v-for="item in tabs"
        :key="item.key"
        class="nav-item"
        :class="{ active: modelValue === item.key }"
        @click="$emit('update:modelValue', item.key)"
      >
        <div class="icon-wrap">
          <i :class="item.icon"></i>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  modelValue: { type: String, default: 'list' }
})

defineEmits(['update:modelValue'])

const tabs = [
  { key: 'list', label: '手账', icon: 'fas fa-book-open' },
  { key: 'focus', label: '专注', icon: 'fas fa-hourglass-half' },
  { key: 'stats', label: '视界', icon: 'fas fa-eye' },
  { key: 'rpg', label: '角色', icon: 'fas fa-chess-knight' },
  { key: 'diary', label: '记忆', icon: 'fas fa-feather-alt' }
]
</script>

<style scoped>
.todo-bottom-nav-wrapper {
  position: absolute;
  bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  left: 0;
  width: 100%;
  display: flex;
  justify-content: center;
  pointer-events: none;
  z-index: 50;
}

.todo-nav-pill {
  pointer-events: auto;
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  padding: 8px 16px;
  border-radius: 999px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0,0,0,0.02);
  gap: 12px;
}

.nav-item {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #a0a0a0;
  cursor: pointer;
  transition: all 0.3s ease;
  -webkit-tap-highlight-color: transparent;
}

.icon-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); /* Q弹曲线 */
}

.nav-item i {
  font-size: 18px;
}

/* 激活状态：纯黑背景，白图标，Q弹放大 */
.nav-item.active {
  background: #000000;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.nav-item.active .icon-wrap {
  transform: scale(1.15);
}
</style>
