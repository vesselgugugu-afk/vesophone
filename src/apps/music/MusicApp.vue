<template>
  <transition name="slide-up">
    <div v-if="show" class="app-window" style="z-index: 50; background: #111;">
      
      <div class="bg-blur" :style="{ backgroundImage: `url('${musicState.currentCoverUrl}')` }"></div>
      <div class="bg-overlay"></div>

      <div class="music-header">
        <button class="icon-btn" @click="$emit('close')"><i class="fas fa-chevron-down"></i></button>
        <div class="header-info">
          <!-- 核心修复：正确显示动态计算出的同频聊天名字 -->
          <div v-if="musicState.coListenCharId" class="co-listen-badge"><i class="fas fa-headphones"></i> 一起听: {{ coListenName }}</div>
          <div v-else style="font-size:12px; color:#aaa; font-weight:600; letter-spacing:1px;">AERO MUSIC</div>
        </div>
        <button class="icon-btn" @click="activeModal = 'search'"><i class="fas fa-search"></i></button>
      </div>

      <div class="main-view" @click="viewMode = viewMode === 'disc' ? 'lrc' : 'disc'">
        <div class="disc-wrapper" :class="{ 'hidden': viewMode === 'lrc' }">
          <div class="disc-case" :class="{ 'playing': musicState.isPlaying }">
            <div class="disc-cover" :style="{ backgroundImage: `url('${musicState.currentCoverUrl}')` }"></div>
          </div>
        </div>
        <div class="lrc-wrapper" :class="{ 'hidden': viewMode === 'disc' }">
          <LrcScroller :parsedLyrics="musicState.parsedLyrics" :currentLyricIndex="musicState.currentLyricIndex" :currentSubtitle="musicState.islandSubtitle" @seek="handleSeek" @share="openLyricShareTarget" />
        </div>
      </div>

      <div class="song-info-area">
        <div class="song-name">{{ musicState.currentSongName || '暂无播放' }}</div>
        <div class="song-artist">{{ musicState.currentArtist || '选择一首歌开始' }}</div>
      </div>

      <div class="control-area">
        <div class="progress-row">
          <span class="time">{{ formatTime(musicState.currentTime) }}</span>
          <div class="progress-bar" @click="onProgressClick"><div class="progress-fill" :style="{ width: progressPercent + '%' }"></div></div>
          <span class="time">{{ formatTime(musicState.totalDuration) }}</span>
        </div>

        <div class="btn-row">
          <button class="ctrl-btn sub" @click="switchPlayMode" v-html="playModeIcon"></button>
          <button class="ctrl-btn main" @click="playPrev"><i class="fas fa-step-backward"></i></button>
          <button class="play-btn" @click="togglePlay"><i :class="musicState.isPlaying ? 'fas fa-pause' : 'fas fa-play'"></i></button>
          <button class="ctrl-btn main" @click="playNext(false)"><i class="fas fa-step-forward"></i></button>
          <button class="ctrl-btn sub" @click="activeModal = 'playlist'"><i class="fas fa-list-ul"></i></button>
        </div>

        <div class="action-row">
          <button class="action-btn" @click="activeModal = 'coListen'" :class="{'active': musicState.coListenCharId}">
            <i class="fas fa-user-friends"></i> {{ musicState.coListenCharId ? '同频中' : '邀请同频' }}
          </button>
          <button class="action-btn" @click="activeModal = 'library'"><i class="fas fa-folder-open"></i> 歌单库</button>
          <button class="action-btn" @click="activeModal = 'stats'"><i class="fas fa-chart-bar"></i> 记录</button>
          <button class="action-btn" @click="openIslandSettings"><i class="fas fa-layer-group"></i> 悬浮窗</button>
          <button class="action-btn" @click="activeModal = 'lyricCss'"><i class="fas fa-paint-brush"></i> 卡片样式</button>
        </div>
      </div>

      <div class="ios-alert-mask" v-if="!!pendingLrcText && !pendingLrcCharId" @click.self="pendingLrcText = null" style="z-index: 100;">
        <div class="ios-alert" style="width: 280px; padding:0;">
          <div class="ios-alert-title" style="padding:15px; border-bottom:1px solid #eee;">发送歌词给谁？</div>
          <div style="max-height: 300px; overflow-y:auto; text-align:left;">
             <div v-for="char in characters" :key="char.id" class="char-share-item" @click="pendingLrcCharId = char.id">{{ char.name }}</div>
          </div>
          <div class="ios-alert-btn" @click="pendingLrcText = null" style="width:100%; border-top:1px solid #eee;">取消</div>
        </div>
      </div>

      <div class="ios-alert-mask" v-if="!!pendingLrcCharId" @click.self="pendingLrcCharId = null; pendingLrcText = null" style="z-index: 100;">
        <div class="ios-alert">
          <div class="ios-alert-title"><i class="fas fa-quote-left" style="color:#5c8aff;"></i> 分享歌词卡片</div>
          <div class="ios-alert-desc"><b>《{{ musicState.currentSongName }}》</b><br><i style="margin-top: 5px; display: inline-block;">{{ pendingLrcText }}</i></div>
          <div class="ios-alert-inputs"><input class="ios-alert-input" v-model="customLrcMsg" placeholder="添加附加语 (选填)" /></div>
          <div class="ios-alert-actions">
            <div class="ios-alert-btn" @click="pendingLrcCharId = null; pendingLrcText = null">取消</div>
            <div class="ios-alert-btn bold" @click="confirmShareLrc">发送</div>
          </div>
        </div>
      </div>

      <div class="ios-alert-mask" v-if="showIslandSettings" @click.self="showIslandSettings = false" style="z-index: 100;">
        <div class="ios-alert" style="width: 300px;">
          <div class="ios-alert-title">悬浮窗模式设定</div>
          <div style="padding: 15px; text-align: left; display: flex; flex-direction: column; gap: 15px;">
            <div class="setting-group">
              <div class="setting-label">显示模式</div>
              <div class="mode-tabs">
                <div class="mode-tab" :class="{ active: islandSettings.mode === 'capsule' }" @click="islandSettings.mode = 'capsule'">灵动岛</div>
                <div class="mode-tab" :class="{ active: islandSettings.mode === 'desktop' }" @click="islandSettings.mode = 'desktop'">桌面歌词</div>
              </div>
            </div>
            <div class="setting-group">
              <div class="setting-label">大小缩放 ({{ islandSettings.scale }}x)</div>
              <input type="range" class="diy-range" min="0.5" max="1.5" step="0.1" v-model="islandSettings.scale" @input="saveIslandSettings" />
            </div>
            <div class="setting-group">
              <div class="setting-label">透明度 ({{ islandSettings.opacity }})</div>
              <input type="range" class="diy-range" min="0.1" max="1.0" step="0.1" v-model="islandSettings.opacity" @input="saveIslandSettings" />
            </div>
          </div>
          <div class="ios-alert-actions"><div class="ios-alert-btn bold" style="width: 100%; border: none;" @click="showIslandSettings = false">完成</div></div>
        </div>
      </div>

      <CoListenInvite :show="activeModal === 'coListen'" @close="activeModal = null" />
      <SearchPanel    :show="activeModal === 'search'"   @close="activeModal = null" />
      <PlaylistDrawer :show="activeModal === 'playlist'" @close="activeModal = null" />
      <LibraryModal   :show="activeModal === 'library'"  @close="activeModal = null" />
      <StatsModal     :show="activeModal === 'stats'"    @close="activeModal = null" />
      <LyricCssPanel  :show="activeModal === 'lyricCss'" @close="activeModal = null" />

    </div>
  </transition>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useMusic } from '@/composables/useMusic'
import { useCharacters } from '@/composables/useCharacters'
import { useChatSessions } from '@/composables/useChatSessions'

import LrcScroller    from './components/LrcScroller.vue'
import CoListenInvite from './modals/CoListenInvite.vue'
import SearchPanel    from './modals/SearchPanel.vue'
import PlaylistDrawer from './modals/PlaylistDrawer.vue'
import LibraryModal   from './modals/LibraryModal.vue'
import StatsModal     from './modals/StatsModal.vue'
import LyricCssPanel  from './modals/LyricCssPanel.vue'

defineProps({ show: Boolean })
const emit = defineEmits(['close'])

const { musicState, togglePlay, playNext, playPrev, seek } = useMusic()
const { characters } = useCharacters()
const { pushMessage, sessions } = useChatSessions()

const viewMode = ref('disc')
const activeModal = ref(null)

const pendingLrcText = ref(null)
const pendingLrcCharId = ref(null)
const customLrcMsg = ref('')

const showIslandSettings = ref(false)
const islandSettings = ref({ mode: 'capsule', scale: 1.0, opacity: 0.95 })

// 核心修复：根据 coListenCharId 动态查找会话标题
const coListenName = computed(() => {
  if (!musicState.coListenCharId) return ''
  if (!sessions || !sessions.value) return '未知会话'
  const chat = sessions.value.find(c => c.id === musicState.coListenCharId)
  if (chat) return chat.title
  return '未知会话'
})

const openIslandSettings = () => { try { const s = localStorage.getItem('islandSettings'); if (s) islandSettings.value = JSON.parse(s) } catch(e) {}; showIslandSettings.value = true }
const saveIslandSettings = () => { localStorage.setItem('islandSettings', JSON.stringify(islandSettings.value)); window.dispatchEvent(new CustomEvent('update-island-settings', { detail: islandSettings.value })) }

const progressPercent = computed(() => { if (musicState.totalDuration === 0) return 0; return (musicState.currentTime / musicState.totalDuration) * 100 })
const playModeIcon = computed(() => {
  if (musicState.playMode === 0) return '<i class="fas fa-repeat"></i>'
  if (musicState.playMode === 1) return '<i class="fas fa-repeat" style="position:relative;"><span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:8px;font-weight:900;background:#fff;color:#000;border-radius:50%;width:12px;height:12px;display:flex;align-items:center;justify-content:center;">1</span></i>'
  return '<i class="fas fa-random"></i>'
})

const switchPlayMode = () => { musicState.playMode = (musicState.playMode + 1) % 3 }
const formatTime = (s) => { const mins = Math.floor(s / 60); const secs = Math.floor(s % 60).toString().padStart(2, '0'); return `${mins}:${secs}` }
const onProgressClick = (e) => { const rect = e.currentTarget.getBoundingClientRect(); if (musicState.totalDuration) seek(musicState.totalDuration * ((e.clientX - rect.left) / rect.width)) }
const handleSeek = (time) => seek(time)

const openLyricShareTarget = (txt) => { pendingLrcText.value = txt; customLrcMsg.value = '' }
const confirmShareLrc = () => {
  let targetChatId = pendingLrcCharId.value;
  if (sessions && sessions.value) {
    const matchedChat = sessions.value.find(s => !s.isGroup && s.participants && s.participants.length > 0 && s.participants[0].id === pendingLrcCharId.value)
    if (matchedChat) targetChatId = matchedChat.id
  }
  pushMessage(targetChatId, { role: 'user', type: 'lyric_share', text: pendingLrcText.value, song: musicState.currentSongName, content: customLrcMsg.value || '这句歌词让我想起了你...' })
  window.dispatchEvent(new CustomEvent('sys-toast', { detail: '歌词卡片已发送至聊天' }))
  pendingLrcCharId.value = null; pendingLrcText.value = null
}
</script>

<style scoped>
.bg-blur { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-size: cover; background-position: center; filter: blur(40px) brightness(0.6); transform: scale(1.2); z-index: -2; transition: background-image 0.5s ease; }
.bg-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.8) 100%); z-index: -1; }
.music-header { display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; }
.icon-btn { background: none; border: none; color: #fff; font-size: 20px; cursor: pointer; opacity: 0.8; transition: 0.2s; }
.icon-btn:hover { opacity: 1; transform: scale(1.1); }
.header-info { flex: 1; display: flex; justify-content: center; }
.co-listen-badge { background: rgba(29, 209, 161, 0.2); color: #1dd1a1; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; border: 1px solid rgba(29, 209, 161, 0.3); max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.main-view { flex: 1; position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden; cursor: pointer; }
.disc-wrapper { transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1); position: absolute; }
.disc-wrapper.hidden { opacity: 0; transform: scale(0.8) translateY(-20px); pointer-events: none; }
.disc-case { width: 260px; height: 260px; border-radius: 50%; background: #111; border: 6px solid rgba(255,255,255,0.1); box-shadow: 0 20px 50px rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; animation: spin 20s linear infinite; animation-play-state: paused; }
.disc-case.playing { animation-play-state: running; }
.disc-cover { width: 70%; height: 70%; border-radius: 50%; background-size: cover; background-position: center; box-shadow: inset 0 0 0 2px rgba(0,0,0,0.3); transition: background-image 0.5s; }
.lrc-wrapper { width: 100%; height: 100%; position: absolute; transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
.lrc-wrapper.hidden { opacity: 0; transform: scale(0.9); pointer-events: none; }

.song-info-area { padding: 0 30px; text-align: left; margin-bottom: 20px; }
.song-name { font-size: 24px; font-weight: 700; color: #fff; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
.song-artist { font-size: 14px; color: rgba(255,255,255,0.6); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.control-area { padding: 0 20px 30px; display: flex; flex-direction: column; gap: 20px; }
.progress-row { display: flex; align-items: center; gap: 15px; font-size: 11px; color: rgba(255,255,255,0.5); }
.progress-bar { flex: 1; height: 4px; background: rgba(255,255,255,0.2); border-radius: 2px; cursor: pointer; position: relative; }
.progress-fill { height: 100%; background: #fff; border-radius: 2px; position: relative; pointer-events: none; }
.progress-fill::after { content: ''; position: absolute; right: -5px; top: -4px; width: 12px; height: 12px; background: #fff; border-radius: 50%; box-shadow: 0 0 5px rgba(0,0,0,0.5); }
.btn-row { display: flex; justify-content: space-between; align-items: center; padding: 0 10px; }
.ctrl-btn { background: none; border: none; color: #fff; cursor: pointer; transition: 0.2s; }
.ctrl-btn:active { transform: scale(0.9); }
.ctrl-btn.sub { font-size: 18px; opacity: 0.6; }
.ctrl-btn.main { font-size: 28px; }
.play-btn { width: 64px; height: 64px; border-radius: 50%; background: #fff; color: #000; border: none; display: flex; justify-content: center; align-items: center; font-size: 24px; cursor: pointer; box-shadow: 0 10px 20px rgba(0,0,0,0.2); transition: 0.2s; }
.play-btn:active { transform: scale(0.95); }

.action-row { display: flex; justify-content: space-around; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); }
.action-btn { background: none; border: none; color: rgba(255,255,255,0.5); font-size: 11px; display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; }
.action-btn i { font-size: 18px; }
.action-btn.active { color: #1dd1a1; }
.action-btn.active i { filter: drop-shadow(0 0 8px rgba(29,209,161,0.5)); }

@keyframes spin { 100% { transform: rotate(360deg); } }

.char-share-item { padding: 15px 20px; font-size: 14px; color: #333; border-bottom: 1px solid #f9f9f9; cursor: pointer; }
.char-share-item:active { background: #f0f0f0; }

.ios-alert-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 999999; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(5px); }
.ios-alert { background: rgba(255,255,255,0.95); width: 280px; border-radius: 18px; text-align: center; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
.ios-alert-title { font-size: 16px; font-weight: 600; padding: 20px 20px 5px; color: #000; }
.ios-alert-desc { font-size: 13px; color: #555; padding: 0 20px 15px; }
.ios-alert-inputs { padding: 0 15px 15px; display: flex; flex-direction: column; gap: 8px; }
.ios-alert-input { width: 100%; box-sizing: border-box; background: rgba(0,0,0,0.05); border: 1px solid rgba(0,0,0,0.1); border-radius: 8px; padding: 10px; font-size: 13px; outline: none; }
.ios-alert-actions { display: flex; border-top: 1px solid rgba(0,0,0,0.1); }
.ios-alert-btn { flex: 1; padding: 12px 0; font-size: 16px; color: #007aff; cursor: pointer; border-right: 1px solid rgba(0,0,0,0.1); }
.ios-alert-btn:last-child { border-right: none; }
.ios-alert-btn.bold { font-weight: 600; }

.setting-group { display: flex; flex-direction: column; gap: 8px; }
.setting-label { font-size: 12px; color: #666; font-weight: 600; }
.mode-tabs { display: flex; background: rgba(0,0,0,0.05); border-radius: 8px; padding: 4px; }
.mode-tab { flex: 1; text-align: center; font-size: 12px; padding: 6px 0; border-radius: 6px; cursor: pointer; color: #555; transition: 0.2s; }
.mode-tab.active { background: #fff; color: #000; font-weight: 600; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
.diy-range { width: 100%; accent-color: #5c8aff; }
</style>
