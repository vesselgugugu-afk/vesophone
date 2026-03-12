<template>
  <div class="wb-main">
    <div
      v-if="items.length === 0"
      style="text-align:center; color:#888; margin-top:30px; font-size:12px;"
    >此文件夹暂无条目</div>

    <div
      v-for="wb in items"
      :key="wb.id"
      style="background:#fff; border-radius:14px; padding:12px; display:flex; flex-direction:column; gap:8px; box-shadow:0 2px 8px rgba(0,0,0,0.03);"
    >
      <!-- 标题行 -->
      <div style="display:flex; align-items:center; gap:8px;">
        <div style="flex:1; font-size:13px; font-weight:600; color:var(--text-main);">{{ wb.title }}</div>
        <ToggleSwitch v-model="wb.enabled" />
        <i class="fas fa-trash btn-delete" @click="$emit('delete', wb.id)" style="padding:4px;"></i>
      </div>
      <!-- 内容预览 -->
      <div style="font-size:12px; color:var(--text-sub); line-height:1.4;">{{ wb.content }}</div>
      <!-- 注入角色 -->
      <RoleSelector v-model="wb.injectRole" />
    </div>
  </div>
</template>

<script setup>
import ToggleSwitch from '@/components/ToggleSwitch.vue'
import RoleSelector from '@/components/RoleSelector.vue'

defineProps({
  items: { type: Array, required: true }
})
defineEmits(['delete'])
</script>
