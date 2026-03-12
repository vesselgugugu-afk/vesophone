<template>
  <div class="inner-modal" v-if="show" @click.self="$emit('close')">
    <div class="modal-card" style="background: #1a1a1f; color: #fff; max-height: 80vh;">
      <div class="modal-title"><i class="fas fa-folder-open"></i> 我的歌单库</div>
      
      <div class="library-list">
        <div v-if="libraries.length === 0" style="text-align:center; color:#666; padding: 20px; font-size:12px;">
          暂无本地歌单。<br>请在播放列表中点击保存按钮存入。
        </div>

        <div v-for="lib in libraries" :key="lib.name" class="lib-card">
          <div class="lib-head">
            <span style="font-weight:600; font-size:14px;">{{ lib.name }}</span>
            <span style="font-size:11px; color:#888;">{{ lib.list.length }} 首</span>
          </div>
          <div class="lib-actions">
            <button class="lib-btn primary" @click="loadLib(lib, true)"><i class="fas fa-play"></i> 播放</button>
            <button class="lib-btn" @click="loadLib(lib, false)"><i class="fas fa-plus"></i> 追加</button>
            <button class="lib-btn danger" @click="deleteLib(lib.name)"><i class="fas fa-trash"></i></button>
          </div>
        </div>
      </div>

      <div class="modal-actions" style="margin-top: 15px;">
        <button class="btn-cancel" style="background: #333; color: #fff;" @click="$emit('close')">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import db from '@/db'
import { useMusic } from '@/composables/useMusic'

const props = defineProps({ show: Boolean })
const emit = defineEmits(['close'])

const { musicState, loadSong } = useMusic()
const libraries = ref([])

const fetchLibs = async () => {
  if (db.musicLibrary) {
    libraries.value = await db.musicLibrary.toArray()
  }
}

watch(() => props.show, (val) => {
  if (val) fetchLibs()
})

const loadLib = async (lib, overwrite) => {
  if (overwrite) {
    if (confirm('这将覆盖当前播放列表，确定吗？')) {
      musicState.playlist = JSON.parse(JSON.stringify(lib.list))
      musicState.currentIndex = 0
      await loadSong(musicState.playlist[0], true)
      emit('close')
    }
  } else {
    musicState.playlist.push(...JSON.parse(JSON.stringify(lib.list)))
    alert(`已追加 ${lib.list.length} 首歌曲`)
  }
}

const deleteLib = async (name) => {
  if (confirm(`确定删除歌单 [${name}] 吗？`)) {
    await db.musicLibrary.delete(name)
    fetchLibs()
  }
}
</script>

<style scoped>
.library-list { display: flex; flex-direction: column; gap: 10px; overflow-y: auto; padding: 5px 0; }
.lib-card { background: #222228; border: 1px solid #333; border-radius: 12px; padding: 15px; }
.lib-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.lib-actions { display: flex; gap: 8px; }
.lib-btn { flex: 1; padding: 8px; border: none; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; background: #333; color: #fff; }
.lib-btn.primary { background: #5c8aff; }
.lib-btn.danger { background: rgba(255, 82, 82, 0.1); color: #ff5252; flex: 0 0 40px; }
</style>
