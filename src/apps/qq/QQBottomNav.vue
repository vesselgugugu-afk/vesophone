<template>
  <div class="qq-bottom-nav">
    <div :class="['nav-item', { active: modelValue === 'chats' }]" @click="$emit('update:modelValue', 'chats')">
      <i class="fas fa-comment-dots"></i>
    </div>
    <div :class="['nav-item', { active: modelValue === 'contacts' }]" @click="$emit('update:modelValue', 'contacts')">
      <i class="fas fa-address-book"></i>
    </div>
    <div :class="['nav-item', { active: modelValue === 'games' }]" @click="$emit('update:modelValue', 'games')">
      <i class="fas fa-gamepad"></i>
    </div>
    <div :class="['nav-item', { active: modelValue === 'me' }]" @click="$emit('update:modelValue', 'me')">
      <i class="fas fa-user-circle"></i>
    </div>
  </div>
</template>

<script setup>
defineProps({ modelValue: { type: String, default: 'chats' } })
defineEmits(['update:modelValue'])
</script>
