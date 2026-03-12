<template>
  <div :class="['sort-item', { 'sub-item': subItem }]">
    <div style="display:flex; align-items:center; gap:6px; flex:1; min-width:0;">
      <i v-if="icon" :class="icon" style="color:var(--text-sub); width:16px; text-align:center;"></i>
      <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
        <slot />
      </span>
      <slot name="extra" />
    </div>
    <div class="sort-actions">
      <i v-if="locked" class="fas fa-lock lock-icon"></i>
      <i v-if="canUp" class="fas fa-arrow-up" @click="$emit('up')"></i>
      <i v-if="canDown" class="fas fa-arrow-down" @click="$emit('down')"></i>
    </div>
  </div>
</template>

<script setup>
defineProps({
  icon:    { type: String,  default: '' },
  locked:  { type: Boolean, default: false },
  canUp:   { type: Boolean, default: false },
  canDown: { type: Boolean, default: false },
  subItem: { type: Boolean, default: false }
})
defineEmits(['up', 'down'])
</script>
