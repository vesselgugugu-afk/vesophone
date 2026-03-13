<template>
  <div class="app-header" style="padding-top: env(safe-area-inset-top, 40px); min-height: calc(env(safe-area-inset-top, 40px) + 50px);">
    <div class="btn-back" @click="$emit('exit')" v-if="!isSelectionMode">
      <i class="fas fa-chevron-left"></i>
    </div>
    <div class="btn-back" @click="$emit('cancel-selection')" v-else>
      取消
    </div>
    
    <div class="app-title">{{ isSelectionMode ? `已选择 ${selectedCount} 项` : title }}</div>
    
    <div class="header-right" style="display:flex; gap:15px; align-items:center;">
      <i v-if="!isSelectionMode" class="fas fa-terminal" style="font-size:14px; color:var(--text-sub);" @click="$emit('open-debug')"></i>
      <i v-if="!isSelectionMode" class="fas fa-cog" style="font-size:16px; color:var(--text-sub);" @click="$emit('open-settings')"></i>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: String,
  isSelectionMode: Boolean,
  selectedCount: Number
})
defineEmits(['exit', 'cancel-selection', 'open-debug', 'open-settings'])
</script>
