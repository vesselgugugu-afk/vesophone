<template>
  <div class="lrc-container">
    <div class="lrc-scroll-box" ref="lrcBox" @scroll="onScroll">
      
      <div v-if="parsedLyrics.length === 0" class="lrc-line highlight">
        {{ currentSubtitle || 'Instrumental / No Lyrics' }}
      </div>

      <div
        v-for="(line, idx) in parsedLyrics"
        :key="idx"
        class="lrc-line"
        :class="{ 
          highlight: idx === currentLyricIndex, 
          selected: idx === pendingLrcIdx 
        }"
        @click.stop="onLineClick(idx, line.t, line.txt)"
        :data-index="idx"
      >
        {{ line.txt }}
      </div>
    </div>

    <!-- 选中某句歌词时弹出的分享操作栏 -->
    <transition name="fade">
      <div v-if="pendingLrcIdx !== -1" class="lrc-action-bar glass">
        <div class="lrc-action-btn" @click="playFromHere">
          <i class="fas fa-play"></i> 从这播放
        </div>
        <div class="lrc-action-btn" @click="shareLrc" style="color: var(--text-main); font-weight: 600;">
          <i class="fas fa-share-alt"></i> 分享给角色
        </div>
        <div class="lrc-action-btn" @click="cancelSelect" style="color: #ff5252;">
          <i class="fas fa-times"></i> 取消
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'

const props = defineProps({
  parsedLyrics: Array,
  currentLyricIndex: Number,
  currentSubtitle: String
})

const emit = defineEmits(['seek', 'share'])

const lrcBox = ref(null)
const pendingLrcIdx = ref(-1)
const pendingLrcTime = ref(0)
const pendingLrcText = ref('')
const isUserScrolling = ref(false)

let scrollTimer = null
let autoClearTimer = null

// 自动滚动到当前歌词
watch(() => props.currentLyricIndex, (newIdx) => {
  if (newIdx >= 0 && !isUserScrolling.value && lrcBox.value && props.parsedLyrics.length > 0) {
    const container = lrcBox.value
    const targetLine = container.querySelector(`[data-index="${newIdx}"]`)
    if (targetLine) {
      const containerRect = container.getBoundingClientRect()
      const lineRect = targetLine.getBoundingClientRect()
      const offset = lineRect.top - containerRect.top - containerRect.height / 2 + lineRect.height / 2
      container.scrollBy({ top: offset, behavior: 'smooth' })
    }
  }
})

const onScroll = () => {
  if (pendingLrcIdx.value !== -1) return
  isUserScrolling.value = true
  clearTimeout(scrollTimer)
  scrollTimer = setTimeout(() => {
    isUserScrolling.value = false
  }, 3000)
}

const onLineClick = (idx, time, txt) => {
  pendingLrcIdx.value = idx
  pendingLrcTime.value = time
  pendingLrcText.value = txt
  isUserScrolling.value = true
  
  clearTimeout(scrollTimer)
  clearTimeout(autoClearTimer)
  
  // 5秒无操作自动取消选择
  autoClearTimer = setTimeout(() => {
    cancelSelect()
  }, 5000)
}

const playFromHere = () => {
  emit('seek', pendingLrcTime.value)
  cancelSelect()
}

const shareLrc = () => {
  emit('share', pendingLrcText.value)
  cancelSelect()
}

const cancelSelect = () => {
  pendingLrcIdx.value = -1
  isUserScrolling.value = false
}

onBeforeUnmount(() => {
  clearTimeout(scrollTimer)
  clearTimeout(autoClearTimer)
})
</script>

<style scoped>
.lrc-container {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  justify-content: center;
  mask-image: linear-gradient(transparent 0%, black 15%, black 85%, transparent 100%);
  -webkit-mask-image: linear-gradient(transparent 0%, black 15%, black 85%, transparent 100%);
}

.lrc-scroll-box {
  width: 90%;
  height: 100%;
  overflow-y: auto;
  text-align: center;
  padding: 50% 0;
  scrollbar-width: none;
  scroll-behavior: smooth;
}
.lrc-scroll-box::-webkit-scrollbar { display: none; }

.lrc-line {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.4);
  padding: 10px 10px;
  transition: all 0.3s;
  cursor: pointer;
  min-height: 20px;
  border-radius: 8px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  margin-bottom: 4px;
}

.lrc-line.highlight {
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  text-shadow: 0 0 15px rgba(255,255,255,0.3), 0 2px 5px rgba(0,0,0,0.8);
}

.lrc-line.selected {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: 1px dashed rgba(255, 255, 255, 0.3);
}

.lrc-action-bar {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  background: rgba(20, 20, 25, 0.9);
  padding: 10px;
  border-radius: 16px;
  gap: 15px;
  z-index: 10;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  border: 1px solid rgba(255,255,255,0.1);
}

.lrc-action-btn {
  font-size: 12px;
  color: #ccc;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 8px;
}
.lrc-action-btn:active { background: rgba(255,255,255,0.1); }
.lrc-action-btn i { font-size: 18px; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
