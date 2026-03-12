<template>
  <div class="wb-sidebar">
    <div
      class="folder-item"
      :class="{ active: modelValue === 'All' }"
      @click="$emit('update:modelValue', 'All')"
    >
      <i class="fas fa-layer-group"></i>
      <span>全部</span>
    </div>
    <div
      class="folder-item"
      v-for="g in groups"
      :key="g"
      :class="{ active: modelValue === g }"
      @click="$emit('update:modelValue', g)"
    >
      <i class="fas fa-folder"></i>
      <span>{{ g }}</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  groups:     { type: Array,  required: true },
  modelValue: { type: String, default: 'All' }
})
defineEmits(['update:modelValue'])
</script>
