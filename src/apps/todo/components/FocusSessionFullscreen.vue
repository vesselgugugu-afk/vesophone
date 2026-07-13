<template>
  <div class="focus-session-overlay">
    <!-- 顶部状态区 -->
    <div class="focus-session-top">
      <div class="focus-session-top-left">
        <div class="focus-session-pill">{{ sessionTitle }}</div>
        <div class="focus-session-meta">
          {{ currentFocusType.allowReference ? '查阅型专注 · 允许合理离开' : '沉浸型专注 · 尽量保持在当前页面' }}
        </div>
      </div>

      <div class="focus-session-top-right">
        <button class="sound-toggle-btn" @click="showSoundPanel = !showSoundPanel">
          <i class="fas fa-volume-up"></i>
        </button>
      </div>
    </div>

    <!-- 声音控制面板 -->
    <div v-if="showSoundPanel" class="sound-panel">
      <!-- 上方固定：当前已选择声音块 -->
      <div class="active-sound-zone">
        <div class="active-sound-head">
          <div class="active-sound-title">当前声音块</div>
          <div class="active-sound-sub">这里是你已经加入当前混音的声音</div>
        </div>

        <div v-if="soundBlocks.length === 0" class="active-sound-empty">
          还没有添加任何声音。你可以在下方加入环境音、URL 音频或搜索音乐。
        </div>

        <div v-else class="sound-block-list">
          <div v-for="block in soundBlocks" :key="block.id" class="sound-block-item">
            <div class="sound-block-top">
              <div class="sound-block-main">
                <div class="sound-block-name">{{ block.title }}</div>
                <div class="sound-block-sub">
                  {{ getBlockTypeLabel(block.type) }}
                  <span v-if="block.artist"> · {{ block.artist }}</span>
                </div>
              </div>

              <div class="sound-block-actions">
                <button class="sound-mini-btn" @click="toggleBlockPlayback(block.id)">
                  {{ block.isPlaying ? '暂停' : '播放' }}
                </button>
                <button class="sound-mini-btn danger" @click="removeSoundBlock(block.id)">删除</button>
              </div>
            </div>

            <div class="sound-block-volume-row">
              <div class="sound-block-volume-label">音量</div>
              <input
                :value="block.volume"
                class="sound-block-volume-slider"
                type="range"
                min="0"
                max="1"
                step="0.01"
                @input="updateBlockVolume(block.id, Number($event.target.value))"
              />
              <div class="sound-block-volume-value">{{ Math.round(block.volume * 100) }}%</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 下方：添加声音 -->
      <div class="add-sound-zone">
        <div class="add-sound-head">
          <div class="add-sound-title">添加声音</div>
          <div class="add-sound-sub">支持环境音、URL 音频和搜索音乐，加入后会出现在上方混音区</div>
        </div>

        <!-- 来源切换 -->
        <div class="sound-source-tabs">
          <div
            class="sound-source-tab"
            :class="{ active: soundSourceType === 'builtin' }"
            @click="soundSourceType = 'builtin'"
          >
            环境音
          </div>
          <div
            class="sound-source-tab"
            :class="{ active: soundSourceType === 'url' }"
            @click="soundSourceType = 'url'"
          >
            URL
          </div>
          <div
            class="sound-source-tab"
            :class="{ active: soundSourceType === 'music' }"
            @click="soundSourceType = 'music'"
          >
            音乐搜索
          </div>
        </div>

        <!-- 内置环境音 -->
        <div v-if="soundSourceType === 'builtin'" class="sound-section">
          <div class="builtin-sound-list">
            <div
              v-for="item in builtinSounds"
              :key="item.key"
              class="builtin-sound-item"
              :class="{ disabled: isBuiltinSoundAdded(item.key) }"
              @click="handleAddBuiltinSound(item)"
            >
              <div class="builtin-sound-main">
                <div class="builtin-sound-name">{{ item.label }}</div>
                <div class="builtin-sound-file">{{ item.file }}</div>
              </div>

              <div class="builtin-sound-state">
                {{ isBuiltinSoundAdded(item.key) ? '已加入' : '加入' }}
              </div>
            </div>
          </div>
        </div>

        <!-- URL 音频 -->
        <div v-if="soundSourceType === 'url'" class="sound-section">
          <div class="url-audio-desc">
            输入可直接访问的音频直链。成功后会作为一个独立声音块加入当前混音。
          </div>

          <div class="url-audio-row">
            <input
              v-model="customAudioUrl"
              class="url-audio-input"
              type="text"
              placeholder="粘贴音频 URL"
            />
            <button class="url-audio-btn" @click="addUrlSoundBlock">添加</button>
          </div>

          <div v-if="urlDuplicateTip" class="duplicate-tip">
            该 URL 已经加入当前混音。
          </div>
        </div>

        <!-- 音乐搜索 -->
        <div v-if="soundSourceType === 'music'" class="sound-section">
          <div class="music-search-row">
            <input
              v-model="musicQuery"
              class="music-search-input"
              type="text"
              placeholder="搜索歌曲或歌手..."
              @keyup.enter="handleSearchMusic"
            />
            <button class="music-search-btn" @click="handleSearchMusic">
              <i class="fas" :class="isSearchingMusic ? 'fa-spinner fa-spin' : 'fa-search'"></i>
            </button>
          </div>

          <div v-if="isSearchingMusic" class="music-search-status">
            {{ searchStatusText || '正在搜索...' }}
          </div>

          <div v-if="!isSearchingMusic && musicSearchResults.length > 0" class="music-result-list">
            <div
              v-for="(item, idx) in musicSearchResults"
              :key="`${idx}_${item.id || item.name}`"
              class="music-result-item"
            >
              <div class="music-result-main">
                <div class="music-result-name">{{ item.name }}</div>
                <div class="music-result-artist">{{ formatArtist(item.artist) }}</div>
              </div>

              <button
                class="music-add-btn"
                :class="{ disabled: isMusicResultAdded(item) }"
                @click="handleAddMusicResult(item)"
              >
                {{ isMusicResultAdded(item) ? '已加入' : '加入' }}
              </button>
            </div>
          </div>

          <div v-if="!isSearchingMusic && musicSearchResults.length === 0" class="music-empty">
            暂无搜索结果
          </div>
        </div>
      </div>

      <div class="sound-license-note">
        部分环境音资源来自 moodist（remvze / MIT License）
      </div>
    </div>

    <!-- 中间主计时区域 -->
    <div class="focus-center-zone">
      <div class="focus-big-ring" :style="ringStyle">
        <div class="focus-big-ring-inner">
          <div class="focus-big-time">{{ formattedTime }}</div>
          <div class="focus-big-status">{{ statusLabel }}</div>
          <div class="focus-big-progress">
            已推进 {{ progressPercent }}%
          </div>
        </div>
      </div>
    </div>

    <!-- AI 陪伴卡 -->
    <div class="focus-ai-card">
      <div class="focus-ai-card-left">
        <div class="focus-ai-avatar dark">
          <i class="fas fa-user-astronaut"></i>
        </div>
      </div>

      <div class="focus-ai-card-right">
        <div class="focus-ai-card-name">系统同桌</div>
        <div class="focus-ai-card-msg">{{ currentAiMessage }}</div>
        <div class="focus-ai-card-sub">
          {{ status === 'running' ? '正在陪你压住节奏' : status === 'paused' ? '等待你恢复这一轮推进' : '本轮专注已完成' }}
        </div>
      </div>
    </div>

    <!-- 中断信息 -->
    <div class="focus-interrupt-card">
      <div class="interrupt-row">
        <div class="interrupt-label">离开记录</div>
        <div class="interrupt-value">{{ interruptCount }} 次</div>
      </div>

      <div class="interrupt-desc">
        {{ currentFocusType.allowReference
          ? '当前类型允许合理查阅资料，离开页面会被记录但不直接视为违规。'
          : '当前类型更偏封闭专注，建议减少切出与频繁跳转。' }}
      </div>
    </div>

    <!-- 底部控制栏 -->
    <div class="focus-action-bar" v-if="status === 'running'">
      <button class="fullscreen-btn secondary" @click="handlePauseSession">暂停</button>
      <button class="fullscreen-btn danger" @click="handleStopSession">结束</button>
    </div>

    <div class="focus-action-bar" v-else-if="status === 'paused'">
      <button class="fullscreen-btn primary" @click="handleResumeSession">继续</button>
      <button class="fullscreen-btn danger" @click="handleStopSession">放弃</button>
    </div>

    <div class="focus-action-bar" v-else-if="status === 'finished'">
      <button class="fullscreen-btn primary" @click="handleConsumeFinished">领取结算</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { usePomodoro } from '@/composables/usePomodoro'
import { useMusicApi } from '@/composables/useMusicApi'

/**
 * 全屏专注覆盖层
 * 当前职责：
 * 1. 覆盖整个 TodoApp
 * 2. 真正执行专注计时
 * 3. 支持 AI 鼓励语节点
 * 4. 支持切屏检测
 * 5. 支持多声音块混音
 * 6. 支持本地记忆当前混音配置
 */
const props = defineProps({
  config: {
    type: Object,
    default: () => ({
      timerMode: 'countdown',
      durationMinutes: 25,
      focusTypeKey: 'deep_focus',
      focusTypeLabel: '沉浸专注',
      allowReference: false
    })
  }
})

const emit = defineEmits(['close', 'session-finished'])

const { searchMusic, resolveBestMatch } = useMusicApi()

const {
  currentFocusType,
  status,
  elapsedSeconds,
  formattedTime,
  progressPercent,
  sessionTitle,
  setTimerMode,
  setDurationMinutes,
  setFocusType,
  startSession,
  pauseSession,
  resumeSession,
  stopSession,
  consumeCompletedSession
} = usePomodoro()

const FOCUS_SOUND_MEMORY_KEY = 'TODO_FOCUS_SOUND_BLOCKS_V1'

/**
 * 切屏 / 中断次数
 */
const interruptCount = ref(0)

/**
 * AI 鼓励语
 */
const currentAiMessage = ref('我会在这轮专注里陪着你，先把节奏立起来。')

/**
 * 已触发过的鼓励节点
 */
const triggeredMilestones = ref([])

/**
 * 声音面板
 */
const showSoundPanel = ref(false)
const soundSourceType = ref('builtin')
const urlDuplicateTip = ref(false)

/**
 * 本地环境音列表
 */
const builtinSounds = ref([
  {
    key: 'river',
    label: '溪流',
    file: 'river.mp3',
    url: '/focus-audio/river.mp3'
  },
  {
    key: 'light-rain',
    label: '细雨',
    file: 'light-rain.mp3',
    url: '/focus-audio/light-rain.mp3'
  },
  {
    key: 'campfire',
    label: '篝火',
    file: 'campfire.mp3',
    url: '/focus-audio/campfire.mp3'
  },
  {
    key: 'birds',
    label: '鸟鸣',
    file: 'birds.mp3',
    url: '/focus-audio/birds.mp3'
  },
  {
    key: 'binaural-alpha',
    label: 'Alpha 双耳',
    file: 'binaural-alpha.wav',
    url: '/focus-audio/binaural-alpha.wav'
  }
])

/**
 * URL 音频输入
 */
const customAudioUrl = ref('')

/**
 * 音乐搜索
 */
const musicQuery = ref('')
const musicSearchResults = ref([])
const isSearchingMusic = ref(false)
const searchStatusText = ref('')

/**
 * 当前声音块列表
 * 每个声音块都维护自己的 audio 实例
 */
const soundBlocks = ref([])

/**
 * 用于生成唯一声音块 id
 */
const createSoundBlockId = () => {
  return `sound_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

/**
 * 当前已过去的整分钟
 */
const elapsedMinutes = computed(() => {
  return Math.floor(Number(elapsedSeconds.value || 0) / 60)
})

/**
 * 状态文案
 */
const statusLabel = computed(() => {
  if (status.value === 'running') return '专注进行中'
  if (status.value === 'paused') return '已暂停'
  if (status.value === 'finished') return '已完成'
  return '准备开始'
})

/**
 * 环形进度
 */
const ringStyle = computed(() => {
  const percent = Number(progressPercent.value || 0)
  return {
    background: `conic-gradient(#1c1c1e ${percent}%, #eceef1 ${percent}% 100%)`
  }
})

/**
 * 格式化 artist
 */
const formatArtist = (artist) => {
  if (Array.isArray(artist)) return artist.join('/')
  return artist || '未知作者'
}

/**
 * 声音块类型文案
 */
const getBlockTypeLabel = (type) => {
  const map = {
    builtin: '环境音',
    url: 'URL 音频',
    music: '搜索音乐'
  }
  return map[type] || '声音'
}

/**
 * 创建 audio 实例
 */
const createAudioElement = (src, volume = 0.45, loop = true) => {
  const audio = new Audio()
  audio.crossOrigin = 'anonymous'
  audio.src = src
  audio.loop = loop
  audio.volume = Math.max(0, Math.min(1, Number(volume || 0)))
  return audio
}

/**
 * 停止并销毁某个声音块的 audio
 */
const destroySoundBlockAudio = (block) => {
  if (!block || !block.audio) return
  try {
    block.audio.pause()
    block.audio.src = ''
    block.audio.load()
  } catch (error) {
    console.warn('销毁音频实例失败：', error)
  }
}

/**
 * 判重：内置环境音
 */
const isBuiltinSoundAdded = (builtinKey) => {
  return soundBlocks.value.some(item => item.type === 'builtin' && item.builtinKey === builtinKey)
}

/**
 * 判重：URL
 */
const isUrlSoundAdded = (url) => {
  return soundBlocks.value.some(item => item.type === 'url' && item.source === url)
}

/**
 * 判重：音乐结果
 * 先按 title + artist 判重
 */
const isMusicResultAdded = (item) => {
  const title = String(item?.name || '').trim()
  const artist = formatArtist(item?.artist)

  return soundBlocks.value.some(block => {
    return block.type === 'music' && block.title === title && (block.artist || '') === artist
  })
}

/**
 * 持久化声音块配置
 * 只保存可序列化配置，不保存 audio 实例
 */
const saveSoundBlocksMemory = () => {
  const payload = soundBlocks.value.map(block => ({
    id: block.id,
    type: block.type,
    title: block.title,
    artist: block.artist || '',
    source: block.source,
    volume: block.volume,
    loop: block.loop,
    builtinKey: block.builtinKey || ''
  }))

  localStorage.setItem(FOCUS_SOUND_MEMORY_KEY, JSON.stringify(payload))
}

/**
 * 恢复声音块配置
 */
const restoreSoundBlocksMemory = async () => {
  const raw = localStorage.getItem(FOCUS_SOUND_MEMORY_KEY)
  if (!raw) return

  try {
    const list = JSON.parse(raw)
    if (!Array.isArray(list)) return

    soundBlocks.value = list.map(item => {
      return {
        id: item.id || createSoundBlockId(),
        type: item.type,
        title: item.title,
        artist: item.artist || '',
        source: item.source,
        volume: Math.max(0, Math.min(1, Number(item.volume || 0.45))),
        isPlaying: false,
        loop: item.loop !== false,
        builtinKey: item.builtinKey || '',
        audio: createAudioElement(item.source, item.volume, item.loop !== false)
      }
    })

    if (status.value === 'running') {
      await resumeAllSoundBlocks()
    }
  } catch (error) {
    console.warn('恢复声音块记忆失败：', error)
  }
}

/**
 * 添加内置环境音声音块
 */
const addBuiltinSoundBlock = async (item) => {
  const audio = createAudioElement(item.url, 0.35, true)

  const block = {
    id: createSoundBlockId(),
    type: 'builtin',
    title: item.label,
    artist: '',
    source: item.url,
    volume: 0.35,
    isPlaying: false,
    loop: true,
    builtinKey: item.key,
    audio
  }

  soundBlocks.value.push(block)

  if (status.value === 'running') {
    try {
      await block.audio.play()
      block.isPlaying = true
    } catch (error) {
      console.warn('环境音播放失败：', error)
    }
  }

  saveSoundBlocksMemory()
}

const handleAddBuiltinSound = async (item) => {
  if (isBuiltinSoundAdded(item.key)) return
  await addBuiltinSoundBlock(item)
}

/**
 * 添加 URL 声音块
 */
const addUrlSoundBlock = async () => {
  const url = String(customAudioUrl.value || '').trim()
  if (!url) return

  if (isUrlSoundAdded(url)) {
    urlDuplicateTip.value = true
    return
  }

  urlDuplicateTip.value = false

  const audio = createAudioElement(url, 0.5, true)

  const block = {
    id: createSoundBlockId(),
    type: 'url',
    title: '外部音频',
    artist: '',
    source: url,
    volume: 0.5,
    isPlaying: false,
    loop: true,
    builtinKey: '',
    audio
  }

  soundBlocks.value.push(block)
  customAudioUrl.value = ''

  if (status.value === 'running') {
    try {
      await block.audio.play()
      block.isPlaying = true
    } catch (error) {
      console.warn('URL 音频播放失败：', error)
    }
  }

  saveSoundBlocksMemory()
}

/**
 * 搜索音乐
 */
const handleSearchMusic = async () => {
  if (!musicQuery.value.trim() || isSearchingMusic.value) return

  isSearchingMusic.value = true
  musicSearchResults.value = []
  searchStatusText.value = ''

  try {
    const result = await searchMusic(musicQuery.value.trim(), (statusText) => {
      searchStatusText.value = statusText
    })
    musicSearchResults.value = Array.isArray(result) ? result : []

    if (musicSearchResults.value.length === 0) {
      searchStatusText.value = '没有搜索到可用结果'
    }
  } catch (error) {
    console.warn('音乐搜索失败：', error)
    searchStatusText.value = '搜索失败'
  } finally {
    isSearchingMusic.value = false
  }
}

/**
 * 添加搜索音乐为声音块
 */
const addMusicSoundBlock = async (item) => {
  const title = item?.name || '未命名歌曲'
  const artist = formatArtist(item?.artist)

  const resolved = await resolveBestMatch(title, artist, (statusText) => {
    searchStatusText.value = statusText
  })

  if (!resolved || !resolved.url) {
    searchStatusText.value = '歌曲解析失败，暂时无法加入'
    return
  }

  const audio = createAudioElement(resolved.url, 0.45, true)

  const block = {
    id: createSoundBlockId(),
    type: 'music',
    title,
    artist,
    source: resolved.url,
    volume: 0.45,
    isPlaying: false,
    loop: true,
    builtinKey: '',
    audio
  }

  soundBlocks.value.push(block)

  if (status.value === 'running') {
    try {
      await block.audio.play()
      block.isPlaying = true
    } catch (error) {
      console.warn('搜索音乐播放失败：', error)
    }
  }

  saveSoundBlocksMemory()
}

const handleAddMusicResult = async (item) => {
  if (isMusicResultAdded(item)) return
  await addMusicSoundBlock(item)
}

/**
 * 更新某个声音块音量
 */
const updateBlockVolume = (blockId, volume) => {
  const block = soundBlocks.value.find(item => item.id === blockId)
  if (!block) return

  block.volume = Math.max(0, Math.min(1, Number(volume || 0)))

  if (block.audio) {
    block.audio.volume = block.volume
  }

  saveSoundBlocksMemory()
}

/**
 * 播放 / 暂停某个声音块
 */
const toggleBlockPlayback = async (blockId) => {
  const block = soundBlocks.value.find(item => item.id === blockId)
  if (!block || !block.audio) return

  if (block.isPlaying) {
    block.audio.pause()
    block.isPlaying = false
  } else {
    try {
      await block.audio.play()
      block.isPlaying = true
    } catch (error) {
      console.warn('声音块播放失败：', error)
    }
  }
}

/**
 * 删除声音块
 */
const removeSoundBlock = (blockId) => {
  const index = soundBlocks.value.findIndex(item => item.id === blockId)
  if (index === -1) return

  const block = soundBlocks.value[index]
  destroySoundBlockAudio(block)
  soundBlocks.value.splice(index, 1)
  saveSoundBlocksMemory()
}

/**
 * 播放全部声音块
 */
const resumeAllSoundBlocks = async () => {
  for (const block of soundBlocks.value) {
    if (!block.audio) continue
    try {
      await block.audio.play()
      block.isPlaying = true
    } catch (error) {
      console.warn('恢复声音块失败：', error)
    }
  }
}

/**
 * 暂停全部声音块
 */
const pauseAllSoundBlocks = () => {
  for (const block of soundBlocks.value) {
    if (!block.audio) continue
    block.audio.pause()
    block.isPlaying = false
  }
}

/**
 * 销毁全部声音块
 */
const destroyAllSoundBlocks = () => {
  for (const block of soundBlocks.value) {
    destroySoundBlockAudio(block)
  }
  soundBlocks.value = []
}

/**
 * 根据专注类型和分钟节点生成本地鼓励语
 */
const buildLocalAiMessage = (minute) => {
  if (currentFocusType.value.allowReference) {
    const pool = [
      `第 ${minute} 分钟，节奏很稳。需要查资料的话就查，但记得回来继续推进。`,
      `第 ${minute} 分钟，你现在是在有效推进，不是被动停留。`,
      `已经到第 ${minute} 分钟了，保持这种工作流，很扎实。`
    ]
    return pool[minute % pool.length]
  }

  const pool = [
    `第 ${minute} 分钟，继续压住这一段，不要切出去。`,
    `已经走到第 ${minute} 分钟了，现在最重要的是保持连贯。`,
    `这一轮的状态不错，再顶一会儿，别让节奏断掉。`
  ]
  return pool[minute % pool.length]
}

/**
 * 节点鼓励语
 */
watch(elapsedMinutes, (minute) => {
  const milestones = [1, 5, 10, 15, 25, 30, 45, 60, 90]
  if (status.value !== 'running') return
  if (!milestones.includes(minute)) return
  if (triggeredMilestones.value.includes(minute)) return

  triggeredMilestones.value.push(minute)
  currentAiMessage.value = buildLocalAiMessage(minute)
})

/**
 * URL 输入变化时重置提示
 */
watch(customAudioUrl, () => {
  urlDuplicateTip.value = false
})

/**
 * 状态变化时统一控制所有声音块
 */
watch(status, async (val) => {
  if (val === 'paused') {
    pauseAllSoundBlocks()
  }

  if (val === 'running') {
    await resumeAllSoundBlocks()
  }

  if (val === 'finished') {
    pauseAllSoundBlocks()
  }
})

/**
 * 切屏检测
 */
const handleVisibilityChange = () => {
  if (document.visibilityState === 'hidden' && status.value === 'running') {
    interruptCount.value += 1

    if (currentFocusType.value.allowReference) {
      currentAiMessage.value = '检测到你离开了专注页，已记录为一次查阅/切出。记得回来继续。'
    } else {
      currentAiMessage.value = '检测到你离开了专注页。当前是沉浸型专注，尽量减少中断。'
    }
  }
}

const handleWindowBlur = () => {
  if (status.value === 'running') {
    interruptCount.value += 1

    if (currentFocusType.value.allowReference) {
      currentAiMessage.value = '已记录一次离开。当前专注类型允许合理查阅，但请继续保持主线推进。'
    } else {
      currentAiMessage.value = '你刚刚离开了专注界面。先回来把这轮专注稳住。'
    }
  }
}

/**
 * 暂停 / 继续 / 停止
 */
const handlePauseSession = () => {
  pauseSession()
  currentAiMessage.value = '先停一下也没关系，记得回来把这轮完成。'
}

const handleResumeSession = async () => {
  resumeSession()
  currentAiMessage.value = '欢迎回来，我们继续把这一轮推进完。'
}

const handleStopSession = () => {
  stopSession()
  pauseAllSoundBlocks()
  emit('close')
}

/**
 * 树成长预留
 * 当前先只按本轮专注分钟数映射一个阶段，供后续真正系统使用
 */
const buildTreePreview = (duration) => {
  const mins = Number(duration || 0)

  if (mins >= 120) {
    return { stageKey: 'young_tree', stageLabel: '小树成形', growthMinutes: mins }
  }
  if (mins >= 60) {
    return { stageKey: 'sprout', stageLabel: '新芽舒展', growthMinutes: mins }
  }
  if (mins >= 25) {
    return { stageKey: 'seedling', stageLabel: '幼苗抬头', growthMinutes: mins }
  }
  return { stageKey: 'seed', stageLabel: '种子蓄势', growthMinutes: mins }
}

/**
 * 领取完成结果
 */
const handleConsumeFinished = () => {
  const payload = consumeCompletedSession()
  if (!payload) return

  pauseAllSoundBlocks()

  const treePreview = buildTreePreview(payload.duration)

  emit('session-finished', {
    ...payload,
    interruptCount: interruptCount.value,
    soundBlocksSnapshot: soundBlocks.value.map(block => ({
      id: block.id,
      type: block.type,
      title: block.title,
      artist: block.artist || '',
      source: block.source,
      volume: block.volume
    })),
    treePreview
  })

  emit('close')
}

onMounted(async () => {
  setTimerMode(props.config.timerMode || 'countdown')
  setDurationMinutes(props.config.durationMinutes || 25)
  setFocusType(props.config.focusTypeKey || 'deep_focus')
  startSession()

  await restoreSoundBlocksMemory()

  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('blur', handleWindowBlur)
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('blur', handleWindowBlur)
  destroyAllSoundBlocks()
})
</script>

<style scoped>
.focus-session-overlay {
  position: absolute;
  inset: 0;
  z-index: 200;
  background: linear-gradient(180deg, #f9f9f8 0%, #f3f4f6 100%);
  padding: calc(env(safe-area-inset-top, 0px) + 18px) 18px calc(env(safe-area-inset-bottom, 0px) + 28px);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.focus-session-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.focus-session-top-left {
  flex: 1;
}

.focus-session-pill {
  display: inline-flex;
  padding: 8px 14px;
  border-radius: 999px;
  background: #1c1c1e;
  color: #fff;
  font-size: 12px;
  font-weight: 800;
}

.focus-session-meta {
  margin-top: 10px;
  font-size: 12px;
  color: #8e8e93;
  line-height: 1.6;
}

.focus-session-top-right {
  display: flex;
  align-items: center;
}

.sound-toggle-btn {
  width: 42px;
  height: 42px;
  border: none;
  border-radius: 14px;
  background: rgba(255,255,255,0.88);
  color: #1c1c1e;
  box-shadow: 0 8px 20px rgba(0,0,0,0.06);
  cursor: pointer;
}

/* 声音面板 */
.sound-panel {
  margin-top: 14px;
  background: rgba(255,255,255,0.92);
  border: 1px solid rgba(0,0,0,0.04);
  border-radius: 22px;
  padding: 14px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.04);
  backdrop-filter: blur(10px);
  max-height: 48vh;
  overflow-y: auto;
}

.sound-panel::-webkit-scrollbar {
  display: none;
}
.sound-panel {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.active-sound-zone {
  position: sticky;
  top: 0;
  z-index: 2;
  background: rgba(255,255,255,0.96);
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(0,0,0,0.05);
}

.active-sound-head,
.add-sound-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.active-sound-title,
.add-sound-title {
  font-size: 13px;
  font-weight: 900;
  color: #1c1c1e;
}

.active-sound-sub,
.add-sound-sub {
  font-size: 11px;
  color: #8e8e93;
  line-height: 1.6;
}

.active-sound-empty {
  margin-top: 10px;
  font-size: 11px;
  color: #9a9aa1;
  line-height: 1.7;
}

.sound-block-list {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sound-block-item {
  background: #f8f9fa;
  border-radius: 16px;
  padding: 12px;
  border: 1px solid rgba(0,0,0,0.03);
}

.sound-block-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.sound-block-main {
  flex: 1;
  min-width: 0;
}

.sound-block-name {
  font-size: 13px;
  font-weight: 800;
  color: #1c1c1e;
  line-height: 1.4;
}

.sound-block-sub {
  margin-top: 4px;
  font-size: 10px;
  color: #8e8e93;
  line-height: 1.6;
}

.sound-block-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.sound-mini-btn {
  height: 32px;
  border: none;
  border-radius: 10px;
  background: #eceef1;
  color: #1c1c1e;
  padding: 0 10px;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}

.sound-mini-btn.danger {
  background: #fff2f2;
  color: #c0392b;
}

.sound-block-volume-row {
  margin-top: 10px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: center;
}

.sound-block-volume-label {
  font-size: 11px;
  font-weight: 700;
  color: #666;
}

.sound-block-volume-slider {
  width: 100%;
}

.sound-block-volume-value {
  font-size: 10px;
  color: #8e8e93;
  font-weight: 800;
  min-width: 38px;
  text-align: right;
}

.add-sound-zone {
  margin-top: 14px;
}

.sound-source-tabs {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.sound-source-tab {
  padding: 8px 12px;
  border-radius: 999px;
  background: #f4f5f7;
  color: #666;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.sound-source-tab.active {
  background: #1c1c1e;
  color: #fff;
}

.sound-section {
  margin-top: 12px;
}

.builtin-sound-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.builtin-sound-item {
  padding: 12px;
  border-radius: 16px;
  background: #f8f9fa;
  border: 1px solid rgba(0,0,0,0.03);
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}

.builtin-sound-item.disabled {
  opacity: 0.56;
  cursor: default;
}

.builtin-sound-main {
  flex: 1;
  min-width: 0;
}

.builtin-sound-name {
  font-size: 13px;
  font-weight: 800;
  color: #1c1c1e;
}

.builtin-sound-file {
  margin-top: 4px;
  font-size: 10px;
  color: #8e8e93;
}

.builtin-sound-state {
  font-size: 11px;
  font-weight: 800;
  color: #666;
  white-space: nowrap;
}

.url-audio-desc {
  font-size: 11px;
  color: #8e8e93;
  line-height: 1.7;
}

.url-audio-row {
  margin-top: 10px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
}

.url-audio-input {
  height: 42px;
  border: none;
  outline: none;
  border-radius: 14px;
  background: #f4f5f7;
  padding: 0 12px;
  font-size: 13px;
  color: #333;
}

.url-audio-btn {
  height: 42px;
  border: none;
  border-radius: 14px;
  background: #1c1c1e;
  color: #fff;
  padding: 0 14px;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.duplicate-tip {
  margin-top: 8px;
  font-size: 11px;
  color: #c0392b;
  line-height: 1.6;
}

/* 音乐搜索 */
.music-search-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
}

.music-search-input {
  height: 42px;
  border: none;
  outline: none;
  border-radius: 14px;
  background: #f4f5f7;
  padding: 0 12px;
  font-size: 13px;
  color: #333;
}

.music-search-btn {
  width: 44px;
  height: 42px;
  border: none;
  border-radius: 14px;
  background: #1c1c1e;
  color: #fff;
  cursor: pointer;
}

.music-search-status {
  margin-top: 10px;
  font-size: 11px;
  color: #6b7280;
  line-height: 1.7;
}

.music-result-list {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.music-result-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-radius: 16px;
  background: #f8f9fa;
  border: 1px solid rgba(0,0,0,0.03);
}

.music-result-main {
  flex: 1;
  min-width: 0;
}

.music-result-name {
  font-size: 13px;
  font-weight: 800;
  color: #1c1c1e;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.music-result-artist {
  margin-top: 4px;
  font-size: 11px;
  color: #8e8e93;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.music-add-btn {
  height: 34px;
  border: none;
  border-radius: 12px;
  background: #1c1c1e;
  color: #fff;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.music-add-btn.disabled {
  background: #e5e7eb;
  color: #888;
  cursor: default;
}

.music-empty {
  margin-top: 12px;
  font-size: 11px;
  color: #a0a0a5;
  line-height: 1.7;
  text-align: center;
  padding: 8px 0;
}

.sound-license-note {
  margin-top: 14px;
  font-size: 10px;
  color: #9a9aa1;
  line-height: 1.6;
}

/* 中央主计时区域 */
.focus-center-zone {
  flex: 1;
  min-height: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.focus-big-ring {
  width: min(72vw, 320px);
  height: min(72vw, 320px);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.focus-big-ring-inner {
  width: calc(min(72vw, 320px) - 36px);
  height: calc(min(72vw, 320px) - 36px);
  border-radius: 50%;
  background: linear-gradient(135deg, #ffffff 0%, #fafafa 100%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  box-shadow:
    0 12px 28px rgba(0,0,0,0.05),
    inset 0 1px 0 rgba(255,255,255,0.95);
}

.focus-big-time {
  font-size: clamp(42px, 11vw, 64px);
  font-weight: 900;
  color: #1c1c1e;
  line-height: 1;
}

.focus-big-status {
  margin-top: 10px;
  font-size: 13px;
  color: #8e8e93;
  font-weight: 800;
}

.focus-big-progress {
  margin-top: 8px;
  font-size: 11px;
  color: #b0b0b5;
  font-weight: 700;
}

/* AI 卡片与中断信息 */
.focus-ai-card,
.focus-interrupt-card {
  background: rgba(255,255,255,0.86);
  border: 1px solid rgba(0,0,0,0.04);
  border-radius: 22px;
  padding: 14px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.04);
  backdrop-filter: blur(10px);
}

.focus-ai-card {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.focus-ai-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: #f4f5f7;
  color: #1c1c1e;
  display: flex;
  justify-content: center;
  align-items: center;
}

.focus-ai-avatar.dark {
  background: #1c1c1e;
  color: #fff;
}

.focus-ai-card-right {
  flex: 1;
}

.focus-ai-card-name {
  font-size: 13px;
  font-weight: 900;
  color: #1c1c1e;
}

.focus-ai-card-msg {
  margin-top: 6px;
  font-size: 12px;
  color: #444;
  line-height: 1.7;
}

.focus-ai-card-sub {
  margin-top: 8px;
  font-size: 10px;
  color: #9a9aa1;
  line-height: 1.6;
}

.focus-interrupt-card {
  margin-top: 10px;
}

.interrupt-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.interrupt-label {
  font-size: 12px;
  font-weight: 800;
  color: #666;
}

.interrupt-value {
  font-size: 13px;
  font-weight: 900;
  color: #1c1c1e;
}

.interrupt-desc {
  margin-top: 8px;
  font-size: 11px;
  color: #8e8e93;
  line-height: 1.7;
}

/* 底部控制栏 */
.focus-action-bar {
  margin-top: 12px;
  display: flex;
  gap: 10px;
}

.fullscreen-btn {
  flex: 1;
  height: 48px;
  border: none;
  border-radius: 18px;
  font-size: 14px;
  font-weight: 900;
  cursor: pointer;
}

.fullscreen-btn.primary {
  background: #1c1c1e;
  color: #fff;
}

.fullscreen-btn.secondary {
  background: #eceef1;
  color: #1c1c1e;
}

.fullscreen-btn.danger {
  background: #fff2f2;
  color: #c0392b;
}
</style>
