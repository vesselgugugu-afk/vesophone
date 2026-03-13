<template>
  <div style="position:relative; z-index:1; width:100%;">
    
    <div class="msg-time" v-if="showTime">{{ formatTime(msg) }}</div>

    <div v-if="msg.role === 'system'" class="msg-system">{{ msg.content }}</div>
    
    <div v-else-if="msg.type === 'recalled'" class="msg-recall">
      "{{ msg.role === 'user' ? '你' : chat.title || '对方' }}" 撤回了一条消息
      <span v-if="msg.oldContent" style="color:#5c8aff; cursor:pointer; margin-left:4px;" @click="$emit('view-recall', msg.oldContent)">查看原话</span>
    </div>

    <div v-else-if="msg.type === 'transfer_reply' || msg.type === 'action'" style="display:none;"></div>
    
    <div v-else :class="['msg-row-wrap', { 'selectable': isSelectionMode }]" @click="$emit('toggle-select', msg.id)">
      <div class="msg-checkbox" :class="{ 'checked': isSelected }" v-if="isSelectionMode"></div>

      <div :class="['msg-row', msg.role === 'user' ? 'is-user' : 'is-ai']">
        <div class="msg-avatar" :style="avatarStyle" @click="$emit('click-avatar', msg)">{{ avatarInitials }}</div>
        
        <div class="msg-content-wrapper">
          <div v-if="msg.refText" class="msg-quote">
            <i class="fas fa-quote-left" style="color:#ccc; margin-right:4px;"></i> {{ msg.refText }}
          </div>
          
          <template v-if="msg.type === 'transfer'">
            <div :class="['msg-bubble is-transfer', msg.status]" 
                 @touchstart="$emit('press', msg)" 
                 @touchend="$emit('clear-press')" 
                 @mousedown="$emit('press', msg)" 
                 @mouseup="$emit('clear-press')"
                 @click.stop="$emit('click-transfer', msg)">
              <i :class="msg.status === 'accepted' ? 'fas fa-check-circle' : msg.status === 'rejected' ? 'fas fa-times-circle' : 'fas fa-exchange-alt'"></i>
              <div>
                <div class="amt" :style="msg.status === 'rejected' ? 'color:#888;' : ''">￥{{ msg.amount }}</div>
                <div class="desc" :style="msg.status === 'rejected' ? 'color:#888;' : ''">{{ msg.status === 'accepted' ? '已被领取' : msg.status === 'rejected' ? '已退回' : msg.content || '转账' }}</div>
              </div>
            </div>
          </template>

          <template v-else-if="msg.type === 'location'">
            <div class="msg-bubble is-location" @touchstart="$emit('press', msg)" @touchend="$emit('clear-press')" @mousedown="$emit('press', msg)" @mouseup="$emit('clear-press')">
              <i class="fas fa-map-marker-alt"></i><span>{{ msg.content }}</span>
            </div>
          </template>

          <template v-else-if="msg.type === 'music_share'">
            <div class="msg-bubble is-music" 
                 @click.stop="$emit('click-music-share', msg)" 
                 @touchstart="$emit('press', msg)" 
                 @touchend="$emit('clear-press')" 
                 @mousedown="$emit('press', msg)" 
                 @mouseup="$emit('clear-press')">
              <div class="music-card-header">
                <div class="music-icon"><i class="fas fa-music"></i></div>
                <div class="music-info">
                  <div class="m-name">{{ msg.name }}</div>
                  <div class="m-artist">{{ msg.artist || '未知歌手' }}</div>
                </div>
                <div class="m-play-btn"><i class="fas fa-play"></i></div>
              </div>
              <div class="music-card-desc" v-if="msg.content">
                "{{ msg.content }}"
              </div>
            </div>
          </template>

          <template v-else-if="msg.type === 'music_cmd'">
            <div class="msg-bubble is-music-cmd"
                 @touchstart="$emit('press', msg)" 
                 @touchend="$emit('clear-press')" 
                 @mousedown="$emit('press', msg)" 
                 @mouseup="$emit('clear-press')">
              <div class="cmd-header"><i class="fas fa-broadcast-tower"></i> DJ 强制切歌</div>
              <div class="m-name">{{ msg.name }}</div>
              <div class="m-artist">{{ msg.artist || '未知歌手' }}</div>
              <div class="music-card-desc" v-if="msg.content">"{{ msg.content }}"</div>
            </div>
          </template>

          <template v-else-if="msg.type === 'lyric_share'">
            <div class="msg-bubble is-lyric" 
                 @touchstart="$emit('press', msg)" 
                 @touchend="$emit('clear-press')" 
                 @mousedown="$emit('press', msg)" 
                 @mouseup="$emit('clear-press')">
              <i class="fas fa-quote-left" style="opacity:0.3; font-size:18px; margin-bottom:5px;"></i>
              <div class="lrc-text">{{ msg.text }}</div>
              <div class="lrc-song">—— 《{{ msg.song }}》</div>
              <div class="lrc-user-desc" v-if="msg.content">{{ msg.content }}</div>
            </div>
          </template>

          <template v-else-if="msg.type === 'music_colisten_req'">
            <div class="msg-bubble is-colisten-req" @click.stop="$emit('click-colisten', msg)">
              <div style="font-weight:600; margin-bottom:4px;">
                <i class="fas fa-headphones"></i> 邀请你一起听歌
              </div>
              <div style="font-size:12px; opacity:0.8;">"{{ msg.content }}"</div>
              <div style="font-size:10px; margin-top:8px; text-decoration:underline;">点击处理邀请</div>
            </div>
          </template>

          <template v-else-if="msg.type === 'image' || msg.type === 'sticker'">
            <div class="msg-bubble is-image" @touchstart="$emit('press', msg)" @touchend="$emit('clear-press')" @mousedown="$emit('press', msg)" @mouseup="$emit('clear-press')">
              <img v-if="msg.type === 'sticker' && stickerUrl" :src="stickerUrl" class="real-sticker" />
              <div v-else class="msg-pseudo-img">
                <i :class="msg.type === 'sticker' ? 'fas fa-smile-wink' : 'fas fa-image'" style="font-size:24px; margin-bottom:8px; display:block;"></i>
                [{{ msg.type === 'sticker' ? '表情包' : '图片' }}] <br/> {{ msg.content }}
              </div>
            </div>
          </template>

          <template v-else-if="msg.type === 'voice'">
            <div class="msg-bubble is-voice" 
                 @touchstart="$emit('press', msg)" 
                 @touchend="$emit('clear-press')" 
                 @mousedown="$emit('press', msg)" 
                 @mouseup="$emit('clear-press')"
                 @click.stop="$emit('toggle-voice', msg)" 
                 :style="{ width: Math.min(60 + msg.content.length * 5, 200) + 'px' }">
              <i class="fas fa-wifi" style="transform: rotate(90deg); color: #888;"></i>
            </div>
            <div v-if="msg.showText" class="voice-text">{{ msg.content }}</div>
          </template>

          <template v-else-if="msg.type === 'text' || msg.type === 'quote' || !msg.type">
            <div :class="['msg-bubble']" 
                 @touchstart="$emit('press', msg)" 
                 @touchend="$emit('clear-press')" 
                 @mousedown="$emit('press', msg)" 
                 @mouseup="$emit('clear-press')">
              
              <span v-if="displayContent" v-html="displayContent"></span>
              
              <span v-else style="color:var(--text-sub); font-style:italic; font-size:12px; opacity:0.6;">[ 状态协议更新 ]</span>
              
            </div>
          </template>
          
          <template v-else>
            <div style="display:none;"></div>
          </template>
          
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useProfile } from '@/composables/useProfile'
import { useCharacters } from '@/composables/useCharacters'
import { usePersona } from '@/composables/usePersona'
import { useStickers } from '@/composables/useStickers'

const props = defineProps({
  msg: Object,
  chat: Object,
  isSelectionMode: Boolean,
  isSelected: Boolean,
  showTime: Boolean
})

const emit = defineEmits(['toggle-select', 'press', 'clear-press', 'click-transfer', 'click-music-share', 'click-colisten', 'view-recall', 'toggle-voice', 'click-avatar'])

const { userProfile } = useProfile()
const { getCharById } = useCharacters()
const { personas } = usePersona()
const { stickerGroups } = useStickers()

const formatTime = (msg) => {
  const ts = msg.timestamp || Math.floor(msg.id)
  const d = new Date(ts)
  const hours = d.getHours().toString().padStart(2, '0')
  const mins = d.getMinutes().toString().padStart(2, '0')
  return `${hours}:${mins}`
}

const buildRegexSafe = (patternStr) => {
  if (!patternStr) return null;
  let flags = '';
  let pattern = patternStr;
  const match = patternStr.match(/^\/(.+)\/([a-z]*)$/s);
  if (match) {
    pattern = match[1];
    flags = match[2].includes('g') ? match[2] : match[2] + 'g';
  } else if (patternStr.includes('\\\\[')) {
    pattern = pattern.replace(/\\\\/g, '\\');
  }
  try {
    return new RegExp(pattern, flags);
  } catch(e) {
    return null;
  }
}

// 核心：无差别的历史垃圾清道夫！
const displayContent = computed(() => {
  if (props.msg.type !== 'text' && props.msg.type !== 'quote' && props.msg.type) return props.msg.content
  let txt = props.msg.content || ''
  
  if (props.msg.role === 'ai') {
    // 1. 根据当前的正则进行精确抹除
    if (props.chat?.settings?.regexPattern) {
      try {
        const baseRegex = buildRegexSafe(props.chat.settings.regexPattern);
        if (baseRegex) txt = txt.replace(baseRegex, '').trim()
      } catch (e) {}
    }

    // 2. 清道夫行动：哪怕正则没配上，也强行干掉常见残留结构！防止历史旧账污染气泡
    // 吃掉 ```xml ... ``` 块
    txt = txt.replace(/```[\s\S]*?```/g, '');
    // 吃掉旧版 <status_xxx> ... </status_xxx> 格式
    txt = txt.replace(/<[a-zA-Z0-9_]+>\s*\[[\s\S]*?\]\s*<\/[a-zA-Z0-9_]+>/g, '');
    // 吃掉大量方括号组成的键值对长块 [Name=... Status=...]
    txt = txt.replace(/\[\s*(?:[a-zA-Z0-9_]+[=|\|][\s\S]*?){2,}\]/g, '');

    txt = txt.trim()
  }
  return txt
})

const getActiveUserPersona = () => {
  if (props.chat.boundPersonaId) return personas.value.find(p => p.id === props.chat.boundPersonaId) || null
  return personas.value.find(p => p.isActive) || null
}

const avatarStyle = computed(() => {
  if (props.msg.role === 'user') {
    const p = getActiveUserPersona()
    if (p && p.avatar) return `background-image: url(${p.avatar})`
    if (userProfile.value.avatar) return `background-image: url(${userProfile.value.avatar})`
  }
  if (props.msg.role === 'ai') {
    if (props.chat.overrideAvatar) return `background-image: url(${props.chat.overrideAvatar})`
    if (!props.chat.isGroup && props.chat.participants.length > 0) {
      const liveChar = getCharById(props.chat.participants[0].id)
      if (liveChar && liveChar.avatar) return `background-image: url(${liveChar.avatar})`
    }
  }
  return ''
})

const avatarInitials = computed(() => {
  if (props.msg.role === 'user') {
    const p = getActiveUserPersona()
    if (p && p.avatar) return ''
    if (userProfile.value.avatar) return ''
    return p ? p.name.charAt(0) : userProfile.value.name.charAt(0)
  }
  if (props.msg.role === 'ai') {
    if (props.chat.overrideAvatar) return ''
    if (!props.chat.isGroup && props.chat.participants.length > 0) {
      const liveChar = getCharById(props.chat.participants[0].id)
      if (liveChar && liveChar.avatar) return ''
    }
    return props.chat.title ? props.chat.title.charAt(0) : 'A'
  }
  return ''
})

const stickerUrl = computed(() => {
  for (const g of stickerGroups.value) {
    const st = g.stickers.find(s => s.name === props.msg.content)
    if (st) return st.url
  }
  return null
})
</script>

<style scoped>
.msg-bubble.is-music { background: #2c2c35 !important; color: #fff !important; border-radius: 16px; padding: 12px; min-width: 220px; max-width: 260px; cursor: pointer; text-align: left; border: 1px solid rgba(255,255,255,0.05); box-shadow: 0 4px 15px rgba(0,0,0,0.1) !important; transition: transform 0.2s; }
.msg-bubble.is-music:active { transform: scale(0.98); }
.msg-row.is-user .msg-bubble.is-music { background: #1dd1a1 !important; color: #000 !important; }
.music-card-header { display: flex; align-items: center; gap: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; margin-bottom: 8px; }
.msg-row.is-user .music-card-header { border-bottom: 1px solid rgba(0,0,0,0.1); }
.music-icon { width: 36px; height: 36px; border-radius: 10px; background: #5c8aff; display: flex; justify-content: center; align-items: center; font-size: 16px; color: #fff; flex-shrink: 0; }
.msg-row.is-user .music-icon { background: #000; }
.music-info { flex: 1; overflow: hidden; }
.m-name { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2; }
.m-artist { font-size: 11px; opacity: 0.7; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.m-play-btn { width: 28px; height: 28px; border-radius: 50%; background: #fff; color: #000; display: flex; justify-content: center; align-items: center; font-size: 10px; flex-shrink: 0; }
.msg-row.is-user .m-play-btn { background: #000; color: #fff; }
.music-card-desc { font-size: 12px; opacity: 0.8; font-style: italic; line-height: 1.4; word-break: break-all; }

.msg-bubble.is-music-cmd { background: linear-gradient(135deg, #ff5252, #ff7b7b) !important; color: #fff !important; border-radius: 16px; padding: 12px; min-width: 220px; box-shadow: 0 4px 15px rgba(255,82,82,0.3) !important; }
.cmd-header { font-size: 11px; font-weight: 800; background: rgba(0,0,0,0.2); display: inline-block; padding: 4px 8px; border-radius: 6px; margin-bottom: 8px; }

.msg-bubble.is-lyric { background: #fdfdfd !important; color: #555 !important; border-left: 3px solid #5c8aff; padding: 12px 15px !important; border-radius: 8px !important; box-shadow: 0 2px 10px rgba(0,0,0,0.03) !important; }
.msg-row.is-user .msg-bubble.is-lyric { border-color: #1dd1a1; border-right: 3px solid #1dd1a1; border-left: none; text-align: right; }
.lrc-text { font-size: 14px; font-style: italic; font-weight: 600; margin-bottom: 6px; }
.lrc-song { font-size: 11px; color: #888; margin-bottom: 6px; }
.lrc-user-desc { font-size: 12px; padding-top: 8px; border-top: 1px dashed #eee; color: #333; }

.msg-bubble.is-colisten-req { background: #eef2ff !important; color: #5c8aff !important; border: 1px solid rgba(92,138,255,0.3); padding: 12px 15px !important; cursor: pointer; text-align: center; }
.msg-bubble.is-colisten-req:active { background: #e0e8ff !important; }
</style>

