<template>
  <div style="display:flex; align-items:center; gap:6px;">
    <span style="font-size:11px; color:var(--text-sub);">注入角色：</span>
    <div class="role-selector">
      <div
        :class="['role-btn', modelValue === 'system' ? 'active-system' : '']"
        @click="$emit('update:modelValue', 'system')"
      >系统</div>
      <div
        :class="['role-btn', modelValue === 'assistant' ? 'active-assistant' : '']"
        @click="$emit('update:modelValue', 'assistant')"
      >助手</div>
      <div
        :class="['role-btn', modelValue === 'user' ? 'active-user' : '']"
        @click="$emit('update:modelValue', 'user')"
      >用户</div>
    </div>
  </div>
</template>

<script setup>
defineProps({ modelValue: { type: String, default: 'system' } })
defineEmits(['update:modelValue'])
</script>
