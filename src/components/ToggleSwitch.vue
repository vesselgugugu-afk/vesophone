<template>
  <div
    :class="['toggle-switch', { active: modelValue }]"
    @click="$emit('update:modelValue', !modelValue)"
  ></div>
</template>

<script setup>
defineProps({ modelValue: Boolean })
defineEmits(['update:modelValue'])
</script>
