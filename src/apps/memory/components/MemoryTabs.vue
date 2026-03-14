<template>
  <div class="memory-tabs">
    <div 
      v-for="tab in tabs" 
      :key="tab.id" 
      class="memory-tab-btn" 
      :class="{ active: activeTab === tab.id }"
      @click="$emit('change', tab.id)"
    >
      {{ tab.label }}
    </div>
  </div>
</template>

<script setup>
defineProps({
  tabs: Array,
  activeTab: String
})
defineEmits(['change'])
</script>

<style scoped>
.memory-tabs {
  display: flex;
  padding: 0 16px;
  border-bottom: 1px solid rgba(0,0,0,0.05);
  background: rgba(255,255,255,0.8);
  backdrop-filter: blur(12px);
}
.memory-tab-btn {
  flex: 1;
  text-align: center;
  padding: 12px 0;
  font-size: 13px;
  color: var(--text-sub);
  cursor: pointer;
  position: relative;
}
.memory-tab-btn.active {
  color: var(--text-main);
  font-weight: 600;
}
.memory-tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 30%;
  right: 30%;
  height: 2px;
  background: #000;
  border-radius: 2px;
}
</style>
