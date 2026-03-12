<template>
  <transition name="slide-up">
    <div v-if="show" class="playlist-drawer glass-dark">
      <div class="drawer-header">
        <div style="display:flex; align-items:center; gap:10px; font-weight:600; font-size:14px;">
          <i class="fas fa-list-ul"></i> 当前播放 ({{ musicState.playlist.length }})
        </div>
        <div style="display:flex; gap:15px; color:#aaa;">
          <i class="fas fa-save" @click="saveToLibrary" title="保存为歌单"></i>
          <i class="fas fa-trash-alt" @click="clearAll" title="清空"></i>
          <i class="fas fa-times" @click="$emit('close')" style="font-size:16px; margin-left:10px;"></i>
        </div>
      </div>

      <div class="list-content">
        <div v-if="musicState.playlist.length === 0" style="text-align:center; color:#666; margin-top:30px; font-size:12px;">
          列表为空，去搜点歌吧
        </div>
        <div 
          v-for="(track, idx) in musicState.playlist" 
          :key="idx"
          class="track-item"
          @click="playIdx(idx)"
        >
          <div class="track-info" :class="{ 'is-active': musicState.currentIndex === idx }">
            <span class="t-name">{{ track.name }}</span>
            <span class="t-artist">- {{ track.artist }}</span>
          </div>
          <div class="track-del" @click.stop="removeTrack(idx)"><i class="fas fa-times"></i></div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { useMusic } from '@/composables/useMusic'
import db from '@/db'

defineProps({ show: Boolean })
const emit = defineEmits(['close'])

const { musicState, loadSong } = useMusic()

const playIdx = async (idx) => {
  musicState.currentIndex = idx
  await loadSong(musicState.playlist[idx], true)
}

const removeTrack = (idx) => {
  const wasPlaying = (idx === musicState.currentIndex) && musicState.isPlaying
  musicState.playlist.splice(idx, 1)
  
  if (musicState.playlist.length === 0) {
    musicState.currentIndex = -1
    musicState.isPlaying = false
  } else {
    if (idx < musicState.currentIndex) musicState.currentIndex--
    if (musicState.currentIndex >= musicState.playlist.length) musicState.currentIndex = 0
    if (idx === musicState.currentIndex || wasPlaying) {
      loadSong(musicState.playlist[musicState.currentIndex], wasPlaying)
    }
  }
}

const clearAll = () => {
  if (confirm('确认清空播放列表吗？')) {
    musicState.playlist = []
    musicState.currentIndex = -1
    musicState.isPlaying = false
  }
}

const saveToLibrary = async () => {
  if (musicState.playlist.length === 0) return alert('列表为空，无法保存')
  const name = prompt('请输入新歌单名称：', `我的歌单 ${new Date().toLocaleDateString()}`)
  if (name && name.trim()) {
    try {
      await db.musicLibrary.put({ name: name.trim(), list: JSON.parse(JSON.stringify(musicState.playlist)) })
      alert(`歌单 [${name}] 保存成功！`)
    } catch (e) {
      alert('保存失败')
    }
  }
}
</script>

<style scoped>
.playlist-drawer {
  position: absolute; bottom: 0; left: 0; width: 100%; height: 65%;
  background: rgba(20, 20, 25, 0.95); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border-radius: 24px 24px 0 0; display: flex; flex-direction: column;
  z-index: 60; color: #fff; border-top: 1px solid rgba(255,255,255,0.1);
}
.drawer-header { padding: 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); }
.drawer-header i { cursor: pointer; transition: 0.2s; }
.drawer-header i:hover { color: #fff; }

.list-content { flex: 1; overflow-y: auto; padding: 10px 0; }
.track-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; border-bottom: 1px solid rgba(255,255,255,0.02); cursor: pointer; transition: 0.2s; }
.track-item:hover { background: rgba(255,255,255,0.05); }

.track-info { flex: 1; display: flex; align-items: baseline; gap: 8px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; color: #ccc; }
.track-info.is-active { color: #5c8aff; font-weight: 600; }
.t-name { font-size: 14px; }
.t-artist { font-size: 11px; opacity: 0.7; }

.track-del { padding: 5px; color: #666; font-size: 14px; }
.track-item:hover .track-del { color: #ff5252; }

.slide-up-enter-active, .slide-up-leave-active { transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(100%); }
</style>
