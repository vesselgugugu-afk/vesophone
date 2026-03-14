<template>
  <div class="character-grid">
    <div 
      class="character-card" 
      v-for="c in characters" 
      :key="c.id"
      @click="$emit('select', c)"
    >
      <div class="avatar-frame">
        <div class="avatar-inner" :style="c.avatar ? `background-image:url(${c.avatar})` : ''">
          <i v-if="!c.avatar" class="fas fa-user"></i>
        </div>
      </div>
      <div class="character-name">{{ c.name }}</div>
      <div class="character-info">Memory Archive</div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  characters: Array
})
defineEmits(['select'])
</script>

<style scoped>
.character-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  padding: 10px 20px;
}

.character-card {
  background-color: #ffffff;
  border-radius: 16px;
  padding: 24px 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  overflow: hidden;
  border: 1px solid transparent;
}

.character-card:active {
  transform: scale(0.97);
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
  border-color: #e5e5ea;
}

/* 精致的极简头像框 */
.avatar-frame {
  width: 80px;
  height: 80px;
  border: 2px solid #000000; /* 细黑线框，增加高级感 */
  border-radius: 50%;
  padding: 4px;
  margin-bottom: 16px;
  position: relative;
  background: #ffffff;
  transition: border-color 0.2s;
}

.character-card:active .avatar-frame {
  border-color: #aeaeb2;
}

.avatar-inner {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #f7f7f8;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #aeaeb2;
  overflow: hidden;
  background-size: cover;
  background-position: center;
}

.avatar-inner i {
  font-size: 24px;
}

.character-name {
  font-size: 16px;
  font-weight: 700;
  color: #1c1c1e;
  letter-spacing: -0.5px;
  margin-bottom: 4px;
}

.character-info {
  font-size: 11px;
  color: #8e8e93;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}
</style>
