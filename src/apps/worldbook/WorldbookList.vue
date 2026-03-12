<template>
  <div class="wb-main">
    <div
      v-if="items.length === 0"
      style="text-align:center; color:#888; margin-top:30px; font-size:12px;"
    >此文件夹暂无条目</div>

    <div 
      v-if="items.length > 0" 
      style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding:0 5px;"
    >
      <div style="font-size:12px; color:var(--text-sub);">本组共 {{ items.length }} 项</div>
      <div style="display:flex; gap:15px;">
        <span style="font-size:12px; color:#5c8aff; cursor:pointer; font-weight:600;" @click="toggleAll(true)">
          全部启用
        </span>
        <span style="font-size:12px; color:#ff5252; cursor:pointer; font-weight:600;" @click="toggleAll(false)">
          全部关闭
        </span>
      </div>
    </div>

    <div
      v-for="wb in items"
      :key="wb.id"
      style="background:#fff; border-radius:14px; padding:12px; display:flex; flex-direction:column; gap:8px; box-shadow:0 2px 8px rgba(0,0,0,0.03);"
    >
      <!-- 标题行 -->
      <div style="display:flex; align-items:center; gap:8px;">
        <div style="flex:1; font-size:13px; font-weight:600; color:var(--text-main);">{{ wb.title }}</div>
        <ToggleSwitch v-model="wb.enabled" />
        
        <!-- 核心新增：编辑按钮 -->
        <i class="fas fa-edit" style="color:#5c8aff; cursor:pointer; padding:4px;" @click="$emit('edit', wb)"></i>
        
        <i class="fas fa-trash btn-delete" @click="$emit('delete', wb.id)" style="padding:4px; cursor:pointer; color:#ff5252;"></i>
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

const props = defineProps({
  items: { type: Array, required: true }
})
defineEmits(['delete', 'edit'])

const toggleAll = (state) => {
  props.items.forEach(wb => {
    wb.enabled = state
  })
}
</script>
