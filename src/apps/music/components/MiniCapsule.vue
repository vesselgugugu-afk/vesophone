<template>
  <div 
    v-if="musicState.currentSongName"
    class="magic-island-container"
    :class="[settings.mode]"
    :style="{
      opacity: settings.opacity,
      transform: `scale(${settings.scale}) translateY(${settings.mode === 'desktop' ? '30px' : '0px'})`
    }"
    @click="$emit('expand')"
  >
    
    <!-- 模式 1：极致灵动岛 (小巧、黑底) -->
    <template v-if="settings.mode === 'capsule'">
      <div class="capsule-bg">
        <div class="cover-spin" :style="{ backgroundImage: `url(${musicState.currentCoverUrl})` }" :class="{ 'paused': !musicState.isPlaying }"></div>
        <div class="island-lrc">
          <div class="song-name" v-if="!musicState.islandSubtitle">{{ musicState.currentSongName }}</div>
          <div class="lrc-text" v-else>{{ musicState.islandSubtitle }}</div>
        </div>
        <div class="wave-icon" :class="{ 'paused': !musicState.isPlaying }">
          <span></span><span></span><span></span>
        </div>
      </div>
    </template>

    <!-- 模式 2：沉浸桌面歌词 (透明、大字、阴影描边) -->
    <template v-if="settings.mode === 'desktop'">
      <div class="desktop-lrc-wrapper">
        <div class="d-song-info" v-if="!musicState.islandSubtitle">
          <i class="fas fa-music"></i> {{ musicState.currentSongName }} - {{ musicState.currentArtist }}
        </div>
        <div class="d-lrc-text" v-else>{{ musicState.islandSubtitle }}</div>
      </div>
    </template>

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useMusic } from '@/composables/useMusic'

defineEmits(['expand'])
const { musicState } = useMusic()

// 默认设置
const settings = ref({
  mode: 'capsule', // 'capsule' | 'desktop'
  scale: 1.0,
  opacity: 0.95
})

const loadSettings = () => {
  try {
    const s = localStorage.getItem('islandSettings')
    if (s) settings.value = JSON.parse(s)
  } catch (e) {}
}

const updateHandler = (e) => {
  settings.value = e.detail
}

onMounted(() => {
  loadSettings()
  window.addEventListener('update-island-settings', updateHandler)
})

onUnmounted(() => {
  window.removeEventListener('update-island-settings', updateHandler)
})
</script>

<style scoped>
.magic-island-container {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  cursor: pointer;
  transform-origin: top center;
  margin-top: 5px;
}

/* --- 灵动岛模式样式 --- */
.capsule {
  display: flex;
  justify-content: center;
}

.capsule-bg {
  background: #000;
  border-radius: 20px;
  height: 32px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
  max-width: 200px;
  min-width: 120px;
}

.cover-spin {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-size: cover;
  background-position: center;
  animation: spin 6s linear infinite;
  flex-shrink: 0;
}
.cover-spin.paused {
  animation-play-state: paused;
}

.island-lrc {
  flex: 1;
  overflow: hidden;
  text-align: center;
}

.song-name, .lrc-text {
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lrc-text {
  color: #1dd1a1;
}

.wave-icon {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 12px;
}
.wave-icon span {
  display: block;
  width: 2px;
  height: 100%;
  background: #1dd1a1;
  border-radius: 1px;
  animation: wave 1s ease-in-out infinite;
}
.wave-icon span:nth-child(2) { animation-delay: -0.5s; }
.wave-icon span:nth-child(3) { animation-delay: -0.2s; }
.wave-icon.paused span { animation-play-state: paused; height: 3px; }

/* --- 桌面歌词模式样式 --- */
.desktop {
  display: flex;
  justify-content: center;
  width: 100vw;
}

.desktop-lrc-wrapper {
  text-align: center;
  padding: 10px 20px;
  pointer-events: auto;
}

.d-song-info {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 2px 4px rgba(0,0,0,0.8), 0 0 10px rgba(0,0,0,0.5);
  letter-spacing: 1px;
}

.d-lrc-text {
  font-size: 18px;
  font-weight: 800;
  background: linear-gradient(135deg, #1dd1a1, #5c8aff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.8));
  line-height: 1.4;
  white-space: nowrap;
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}

@keyframes wave {
  0%, 100% { height: 3px; }
  50% { height: 12px; }
}
</style>

