<template>
  <div class="inner-modal" v-if="show" @click.self="$emit('close')">
    <div class="modal-card" style="background: #1a1a1f; color: #fff; max-height: 85vh;">
      
      <div class="search-header">
        <input 
          type="text" 
          class="search-input" 
          v-model="query" 
          placeholder="搜索歌曲或歌手..." 
          @keyup.enter="handleSearch"
        />
        <button class="search-btn-primary" @click="handleSearch">
          <i class="fas" :class="isSearching ? 'fa-spinner fa-spin' : 'fa-search'"></i>
        </button>
      </div>

      <div class="search-results">
        <div v-if="results.length === 0 && !isSearching" style="text-align: center; color: #666; padding: 30px 0; font-size: 13px;">
          暂无搜索结果
        </div>

        <!-- 轮询状态提示 -->
        <div v-if="isSearching" style="text-align: center; color: #5c8aff; padding: 30px 0; font-size: 13px; font-weight: 600; display:flex; flex-direction:column; align-items:center; gap:10px;">
          <i class="fas fa-satellite-dish fa-spin" style="font-size: 24px;"></i>
          {{ searchStatusText }}
        </div>
        
        <div 
          v-for="(item, idx) in results" 
          :key="idx" 
          class="result-item"
          :class="{ 'selected': selectedIndices.includes(idx) }"
          @click="toggleSelect(idx)"
          v-show="!isSearching"
        >
          <div class="check-circle">
            <i class="fas fa-check" v-if="selectedIndices.includes(idx)"></i>
          </div>
          <div class="item-info">
            <div class="item-name">{{ item.name }}</div>
            <div class="item-artist">{{ Array.isArray(item.artist) ? item.artist.join('/') : item.artist }}</div>
          </div>
          <div class="item-actions">
            <button class="icon-btn" @click.stop="playNow(item)"><i class="fas fa-play"></i></button>
            <button class="icon-btn" @click.stop="addNext(item)"><i class="fas fa-plus"></i></button>
          </div>
        </div>
      </div>

      <transition name="fade">
        <div v-if="selectedIndices.length > 0 && !isSearching" class="batch-action-bar">
          <span>已选 {{ selectedIndices.length }} 首</span>
          <button class="batch-btn" @click="batchAddNext">批量加入队列</button>
        </div>
      </transition>

      <div class="modal-actions" style="margin-top: 10px;">
        <button class="btn-cancel" style="background: #333; color: #fff;" @click="$emit('close')">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useMusicApi } from '@/composables/useMusicApi'
import { useMusic } from '@/composables/useMusic'

const props = defineProps({ show: Boolean })
const emit = defineEmits(['close'])

const { searchMusic } = useMusicApi()
const { musicState, loadSong } = useMusic()

const query = ref('')
const results = ref([])
const isSearching = ref(false)
const searchStatusText = ref('')
const selectedIndices = ref([])

watch(() => props.show, (val) => {
  if (!val) {
    selectedIndices.value = []
  }
})

const handleSearch = async () => {
  if (!query.value.trim() || isSearching.value) return
  isSearching.value = true
  results.value = []
  selectedIndices.value = []
  
  try {
    results.value = await searchMusic(query.value, (status) => {
      searchStatusText.value = status // 实时接收并在 UI 渲染状态
    })
    if(results.value.length === 0) searchStatusText.value = '全网均未找到该歌曲'
  } catch (e) {
    searchStatusText.value = '搜索失败'
  } finally {
    isSearching.value = false
  }
}

const toggleSelect = (idx) => {
  const pos = selectedIndices.value.indexOf(idx)
  if (pos > -1) selectedIndices.value.splice(pos, 1)
  else selectedIndices.value.push(idx)
}

const formatSong = (item) => ({
  name: item.name,
  artist: Array.isArray(item.artist) ? item.artist.join('/') : item.artist
})

const playNow = async (item) => {
  const song = formatSong(item)
  musicState.playlist.splice(musicState.currentIndex + 1, 0, song)
  musicState.currentIndex++
  await loadSong(song, true)
  emit('close')
}

const addNext = (item) => {
  const song = formatSong(item)
  musicState.playlist.splice(musicState.currentIndex + 1, 0, song)
  alert('已加入下一首')
}

const batchAddNext = () => {
  const songs = selectedIndices.value.map(idx => formatSong(results.value[idx]))
  musicState.playlist.splice(musicState.currentIndex + 1, 0, ...songs)
  alert(`已批量加入 ${songs.length} 首歌曲`)
  selectedIndices.value = []
  emit('close')
}
</script>

<style scoped>
.search-header { display: flex; gap: 10px; margin-bottom: 15px; }
.search-input { flex: 1; background: #2a2a30; border: 1px solid #3a3a40; color: #fff; padding: 12px 15px; border-radius: 12px; outline: none; font-size: 14px; }
.search-input:focus { border-color: #5c8aff; }
.search-btn-primary { width: 44px; background: #5c8aff; color: #fff; border: none; border-radius: 12px; font-size: 16px; cursor: pointer; }

.search-results { display: flex; flex-direction: column; gap: 8px; overflow-y: auto; min-height: 200px; max-height: 400px; padding-bottom: 50px; }
.result-item { display: flex; align-items: center; gap: 12px; padding: 12px; background: #222228; border-radius: 12px; border: 1px solid transparent; cursor: pointer; transition: 0.2s; }
.result-item.selected { border-color: #5c8aff; background: #252a35; }
.check-circle { width: 18px; height: 18px; border-radius: 50%; border: 2px solid #555; display: flex; justify-content: center; align-items: center; font-size: 10px; color: #fff; }
.result-item.selected .check-circle { background: #5c8aff; border-color: #5c8aff; }
.item-info { flex: 1; overflow: hidden; }
.item-name { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item-artist { font-size: 11px; color: #888; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.item-actions { display: flex; gap: 8px; }
.icon-btn { width: 32px; height: 32px; border-radius: 8px; background: #333; color: #fff; border: none; display: flex; justify-content: center; align-items: center; cursor: pointer; }
.icon-btn:hover { background: #5c8aff; }

.batch-action-bar { position: absolute; bottom: 80px; left: 20px; right: 20px; background: #5c8aff; padding: 12px 20px; border-radius: 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 10px 20px rgba(92,138,255,0.3); font-weight: 600; font-size: 13px; }
.batch-btn { background: #fff; color: #5c8aff; border: none; padding: 6px 14px; border-radius: 12px; font-weight: 600; cursor: pointer; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s, transform 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(10px); }
</style>
