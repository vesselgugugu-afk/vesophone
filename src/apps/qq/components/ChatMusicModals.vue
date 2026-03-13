<template>
  <div class="ios-alert-mask" v-if="activeMusicCard" @click.self="$emit('update:activeMusicCard', null)">
    <div class="music-action-popup">
      <div class="music-action-cover" :style="resolvedMusicData ? `background-image:url(${resolvedMusicData.cover})` : ''">
        <i v-if="resolvingMusic" class="fas fa-spinner fa-spin" style="font-size:30px; color:#fff;"></i>
      </div>
      <div class="music-action-info" style="margin-bottom: 20px;">
        <div style="font-size:18px; font-weight:700; color:#333;">{{ activeMusicCard.name }}</div>
        <div style="font-size:12px; color:#888;">{{ activeMusicCard.artist }}</div>
      </div>
      <div class="music-action-btns">
        <button class="m-btn m-play" @click="$emit('play-resolved')" :disabled="!resolvedMusicData">
          <i class="fas fa-play"></i> 立即播放
        </button>
        <button class="m-btn m-add" @click="$emit('add-resolved')" :disabled="!resolvedMusicData">
          <i class="fas fa-plus"></i> 加入歌单
        </button>
      </div>
      <div class="music-action-cancel" @click="$emit('update:activeMusicCard', null)">取消</div>
    </div>
  </div>

  <div class="ios-alert-mask" v-if="showLocalMusicPicker" @click.self="$emit('update:showLocalMusicPicker', false)">
    <div class="ios-alert" style="width: 300px; padding: 0;">
      <div class="ios-alert-title" style="padding: 15px;">从播放列表选取分享</div>
      <div style="max-height: 250px; overflow-y: auto; text-align: left; padding: 0 15px 15px;">
         <div v-if="musicState.playlist.length === 0" style="color:#888; font-size:12px; text-align:center; padding: 20px 0;">
           暂无歌曲，请先去音乐App搜索
         </div>
         <div v-for="(song, idx) in musicState.playlist" :key="idx" class="local-music-item" @click="$emit('send-music-share', song)">
           <div class="l-name">{{ song.name }}</div>
           <div class="l-artist">{{ song.artist }}</div>
         </div>
      </div>
      <div class="ios-alert-actions">
        <div class="ios-alert-btn" @click="$emit('update:showLocalMusicPicker', false)">取消</div>
      </div>
    </div>
  </div>

  <div class="ios-alert-mask" v-if="showColistenAlert" @click.self="$emit('update:showColistenAlert', false)">
    <div class="ios-alert">
      <div class="ios-alert-title">
        <i class="fas fa-headphones" style="color:#5c8aff;"></i> 一起听邀请
      </div>
      <div class="ios-alert-desc" style="margin-top:10px;">
        {{ chatTitle }} 邀请你进入“一起听”状态，是否接受？
      </div>
      <div class="ios-alert-actions">
        <div class="ios-alert-btn danger" @click="$emit('reply-colisten', false)">直接拒绝</div>
        <div class="ios-alert-btn bold" @click="$emit('reply-colisten', true)">接受同频</div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  activeMusicCard: Object,
  resolvingMusic: Boolean,
  resolvedMusicData: Object,
  showLocalMusicPicker: Boolean,
  showColistenAlert: Boolean,
  musicState: Object,
  chatTitle: String
})
defineEmits([
  'update:activeMusicCard',
  'update:showLocalMusicPicker',
  'update:showColistenAlert',
  'play-resolved',
  'add-resolved',
  'send-music-share',
  'reply-colisten'
])
</script>

<style scoped>
.local-music-item { padding: 10px 0; border-bottom: 1px solid #f0f0f0; cursor: pointer; }
.local-music-item:active { background: #f9f9f9; }
.l-name { font-size: 14px; font-weight: 600; color: #333; }
.l-artist { font-size: 11px; color: #888; margin-top: 2px; }
.music-action-popup { background: #fff; border-radius: 24px; padding: 25px 20px; width: max-content; min-width: 260px; max-width: 85vw; box-sizing: border-box; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.1); display: flex; flex-direction: column; }
.music-action-cover { width: 140px; height: 140px; border-radius: 16px; background: #e0e0e0; margin: 0 auto; background-size: cover; background-position: center; box-shadow: 0 10px 20px rgba(0,0,0,0.1); display: flex; justify-content: center; align-items: center; }
.m-btn { flex: 1; padding: 12px 0; border: none; border-radius: 12px; font-weight: 600; font-size: 14px; cursor: pointer; white-space: nowrap; }
.m-play { background: #5c8aff; color: #fff; }
.m-add { background: #f4f5f7; color: #333; }
.m-btn:disabled { opacity: 0.5; pointer-events: none; }
.music-action-cancel { margin-top: 15px; font-size: 12px; color: #888; cursor: pointer; padding: 5px; }
.music-action-btns { display: flex; gap: 10px; width: 100%; }
.ios-alert-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 999999; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(5px); }
.ios-alert { background: rgba(255,255,255,0.95); width: 280px; border-radius: 18px; text-align: center; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
.ios-alert-title { font-size: 16px; font-weight: 600; padding: 20px 20px 5px; color: #000; }
.ios-alert-desc { font-size: 13px; color: #555; padding: 0 20px 15px; }
.ios-alert-actions { display: flex; border-top: 1px solid rgba(0,0,0,0.1); }
.ios-alert-btn { flex: 1; padding: 12px 0; font-size: 16px; color: #007aff; cursor: pointer; border-right: 1px solid rgba(0,0,0,0.1); }
.ios-alert-btn:last-child { border-right: none; }
.ios-alert-btn:active { background: rgba(0,0,0,0.05); }
.ios-alert-btn.bold { font-weight: 600; }
.ios-alert-btn.danger { color: #ff3b30; }
</style>
