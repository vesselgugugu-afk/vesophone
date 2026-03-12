import { reactive, watch } from 'vue'
import { useMusicApi } from './useMusicApi'
import db from '@/db'

const audio = new Audio()
audio.crossOrigin = 'anonymous'

// 缓存 Key
const STORE_KEY = 'AERO_PLAYER_V7'
const COLISTEN_KEY = 'AERO_COLISTEN_CHAR_ID'
const LYRIC_CSS_KEY = 'AERO_LYRIC_CSS'
const LYRIC_PRESETS_KEY = 'AERO_LYRIC_PRESETS'

const saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}')
const savedCoListen = localStorage.getItem(COLISTEN_KEY) || null
const savedLyricCss = localStorage.getItem(LYRIC_CSS_KEY) || ''
const savedLyricPresets = JSON.parse(localStorage.getItem(LYRIC_PRESETS_KEY) || '[]')

// 全局响应式状态机
const musicState = reactive({
  playlist: saved.playlist || [],
  currentIndex: saved.index || -1,
  playMode: saved.playMode || 0, // 0: 列表循环, 1: 单曲循环, 2: 随机播放
  isPlaying: false,
  currentTime: 0,
  totalDuration: 0,
  volume: 65,

  // UI 渲染信息
  currentSongName: '',
  currentArtist: '',
  currentCoverUrl: 'https://files.catbox.moe/k265vj.png',

  // 歌词与灵动岛状态
  parsedLyrics: [],
  currentLyricIndex: -1,
  islandSubtitle: 'AERO OS Ready',

  // 核心：一起听状态（绑定的角色 ID，null 表示独立听歌）
  coListenCharId: savedCoListen !== 'null' ? savedCoListen : null,

  // 核心新增：歌词卡片美化数据
  customLyricCss: savedLyricCss,
  lyricCssPresets: savedLyricPresets
})

// 单例模式，防止重复绑定监听器
let isInitialized = false
let sessionCounter = 0

export function useMusic() {
  const { resolveBestMatch, fetchLyrics } = useMusicApi()

  if (!isInitialized) {
    // 1. 绑定音频进度事件
    audio.addEventListener('timeupdate', () => {
      musicState.currentTime = audio.currentTime || 0;
      musicState.totalDuration = audio.duration || 0;

      // 动态歌词滚动匹配
      if (musicState.parsedLyrics.length) {
        const idx = musicState.parsedLyrics.findIndex(l => l.t > musicState.currentTime) - 1;
        if (idx >= 0 && idx !== musicState.currentLyricIndex) {
          musicState.currentLyricIndex = idx;
          const txt = musicState.parsedLyrics[idx].txt;
          if (txt && txt.trim()) {
            musicState.islandSubtitle = txt;
          }
        }
      }
    })

    // 2. 绑定播放状态事件
    audio.addEventListener('play', () => { 
      musicState.isPlaying = true 
    })
    
    audio.addEventListener('pause', () => { 
      musicState.isPlaying = false
      if (musicState.playlist[musicState.currentIndex]) {
        musicState.islandSubtitle = musicState.playlist[musicState.currentIndex].artist;
      }
    })
    
    audio.addEventListener('ended', () => { 
      playNext(true) 
    })

    // 3. 监听状态并缓存到 LocalStorage
    watch(() => [musicState.playlist, musicState.currentIndex, musicState.playMode], () => {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        playlist: musicState.playlist,
        index: musicState.currentIndex,
        playMode: musicState.playMode
      }))
    }, { deep: true })

    watch(() => musicState.coListenCharId, (newId) => {
      localStorage.setItem(COLISTEN_KEY, newId || 'null')
    })
    
    // 核心新增：持久化 CSS 预设
    watch(() => musicState.customLyricCss, (v) => {
      localStorage.setItem(LYRIC_CSS_KEY, v)
    })
    
    watch(() => musicState.lyricCssPresets, (v) => {
      localStorage.setItem(LYRIC_PRESETS_KEY, JSON.stringify(v))
    }, { deep: true })

    // 4. 听歌时长统计打点系统 (每秒检测，满10秒写一次 DB)
    setInterval(() => {
      if (musicState.isPlaying && !audio.paused && !audio.ended && audio.readyState > 2) {
        sessionCounter++
        if (sessionCounter >= 10) {
          flushStatsToDB(sessionCounter)
          sessionCounter = 0
        }
      }
    }, 1000)

    isInitialized = true
  }

  // --- 内部方法：写入数据库 ---
  const flushStatsToDB = async (secs) => {
    if (!db.musicStats) return 
    try {
      let stats = await db.musicStats.get('global')
      if (!stats) {
        stats = { id: 'global', totalSoloTime: 0, coListenTime: {}, dailyTrends: {} }
      }
      
      const todayKey = new Date().toDateString()

      if (musicState.coListenCharId) {
        if (!stats.coListenTime[musicState.coListenCharId]) {
          stats.coListenTime[musicState.coListenCharId] = 0
        }
        stats.coListenTime[musicState.coListenCharId] += secs
      } else {
        stats.totalSoloTime += secs
      }

      if (!stats.dailyTrends[todayKey]) {
        stats.dailyTrends[todayKey] = 0
      }
      stats.dailyTrends[todayKey] += secs

      await db.musicStats.put(stats)
    } catch (e) {
      console.error('[Music Stats] Failed to save DB', e)
    }
  }

  // --- 歌词解析逻辑 ---
  const parseLrc = (text) => {
    const lines = [];
    const re = /^\[(\d+):(\d+)(\.\d+)?\](.*)$/;
    text.split('\n').forEach(line => {
      const m = line.trim().match(re);
      if (m && m[4]) {
        lines.push({ 
          t: parseInt(m[1]) * 60 + parseInt(m[2]) + (m[3] ? parseFloat('0' + m[3]) : 0), 
          txt: m[4] 
        });
      }
    });
    return lines;
  }

  // --- 播放器核心控制指令 ---
  const loadSong = async (item, autoPlay = true) => {
    musicState.islandSubtitle = 'Resolving Source...';
    musicState.parsedLyrics = [];
    musicState.currentLyricIndex = -1;
    
    musicState.currentSongName = item.name;
    musicState.currentArtist = item.artist;
    musicState.currentCoverUrl = item.cachedCover || 'https://files.catbox.moe/k265vj.png';

    const resolved = await resolveBestMatch(item.name, item.artist, (msg) => {
      musicState.islandSubtitle = msg;
    });

    if (resolved) {
      if (resolved.cover && resolved.cover.startsWith('http')) {
        item.cachedCover = resolved.cover;
        musicState.currentCoverUrl = resolved.cover;
      }
      audio.src = resolved.url;
      if (autoPlay) {
        audio.play().catch(() => { 
          musicState.isPlaying = false; 
        });
      }
      const lrcText = await fetchLyrics(resolved.lrc_id, resolved.lrc_src, item.name, item.artist);
      if (lrcText) {
        musicState.parsedLyrics = parseLrc(lrcText);
      } else {
        musicState.islandSubtitle = 'Instrumental / No Lyrics';
      }
    } else {
      musicState.islandSubtitle = 'Resource Unavailable';
      musicState.isPlaying = false;
    }
  }

  const togglePlay = () => {
    if (!audio.src) return;
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  }

  const playNext = async (isAuto = false) => {
    if (!musicState.playlist.length) return;
    const len = musicState.playlist.length;
    
    if (musicState.playMode === 1 && isAuto) {
      // 单曲循环
      audio.currentTime = 0;
      audio.play();
    } else if (musicState.playMode === 2) {
      // 随机播放
      musicState.currentIndex = Math.floor(Math.random() * len);
      await loadSong(musicState.playlist[musicState.currentIndex]);
    } else {
      // 列表循环
      musicState.currentIndex = (musicState.currentIndex + 1) % len;
      await loadSong(musicState.playlist[musicState.currentIndex]);
    }
  }

  const playPrev = async () => {
    if (!musicState.playlist.length) return;
    const len = musicState.playlist.length;
    
    if (musicState.playMode === 2) {
      musicState.currentIndex = Math.floor(Math.random() * len);
    } else {
      musicState.currentIndex = (musicState.currentIndex - 1 + len) % len;
    }
    await loadSong(musicState.playlist[musicState.currentIndex]);
  }

  const playSpecific = async (songObj) => {
    const idx = musicState.playlist.findIndex(t => t.name === songObj.name && t.artist === songObj.artist);
    if (idx !== -1) {
      musicState.currentIndex = idx;
    } else {
      musicState.playlist.splice(musicState.currentIndex + 1, 0, songObj);
      musicState.currentIndex++;
    }
    await loadSong(musicState.playlist[musicState.currentIndex], true);
  }

  const seek = (time) => {
    if (audio.duration) {
      audio.currentTime = time;
    }
  }

  const toggleCoListen = (charId) => {
    if (musicState.coListenCharId === charId) {
      musicState.coListenCharId = null 
    } else {
      musicState.coListenCharId = charId 
    }
  }

  return {
    audio,
    musicState,
    loadSong,
    togglePlay,
    playNext,
    playPrev,
    playSpecific,
    seek,
    toggleCoListen
  }
}

