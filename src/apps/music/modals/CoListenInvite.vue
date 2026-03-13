<template>
  <div class="inner-modal" v-if="show" @click.self="$emit('close')">
    <div class="modal-card">
      <div class="modal-title">邀请一起听</div>
      
      <div v-if="musicState.coListenCharId" style="text-align:center; padding: 10px; background: #eef2ff; border-radius: 12px; margin-bottom: 10px;">
        <div style="font-size:12px; color:#5c8aff; font-weight:600; margin-bottom:6px;">当前正在与 {{ activeCharName }} 一起听</div>
        <button class="btn-cancel" style="width:100%; color:#ff5252;" @click="stopCoListen">结束一起听</button>
      </div>

      <div style="font-size:12px; color:var(--text-sub); margin-bottom: 10px;">
        开启后，该角色将实时知道你正在播放什么歌曲，并且可以直接在聊天中切歌或点歌。
      </div>

      <div style="display:flex; flex-direction:column; gap:10px; max-height: 300px; overflow-y:auto;">
        <div 
          v-for="char in characters" 
          :key="char.id" 
          class="list-item" 
          @click="startCoListen(char.id)"
          :style="isCoListening(char.id) ? 'border: 1px solid #5c8aff;' : ''"
        >
          <div class="item-avatar" :style="char.avatar ? `background-image: url(${char.avatar})` : ''">
            {{ !char.avatar ? char.name.charAt(0) : '' }}
          </div>
          <div class="item-info">
            <div class="item-name">{{ char.name }}</div>
          </div>
          <div v-if="isCoListening(char.id)" style="font-size:12px; color:#5c8aff; font-weight:600;">正在一起听 <i class="fas fa-headphones"></i></div>
        </div>
      </div>

      <div class="modal-actions" style="margin-top: 15px;">
        <button class="btn-cancel" @click="$emit('close')">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useCharacters } from '@/composables/useCharacters'
import { useMusic } from '@/composables/useMusic'
import { useChatSessions } from '@/composables/useChatSessions' // 引入用于双向查询

defineProps({ show: Boolean })
const emit = defineEmits(['close'])

const { characters } = useCharacters()
const { musicState, toggleCoListen } = useMusic()
const { sessions, chatList } = useChatSessions()

const activeCharName = computed(() => {
  if (!musicState.coListenCharId) return ''
  
  // 1. 优先查角色库
  const char = characters.value.find(c => c.id === musicState.coListenCharId)
  if (char) return char.name
  
  // 2. 备用查会话库 (针对聊天气泡发起的情况)
  const chatArray = (sessions && sessions.value) || (chatList && chatList.value) || []
  const chat = chatArray.find(s => s.id === musicState.coListenCharId)
  if (chat) {
     if (!chat.isGroup && chat.participants && chat.participants.length > 0) {
         return chat.participants[0].name
     }
     return chat.title
  }
  
  return '未知羁绊'
})

// 判断某个角色当前是否在跟你一起听（兼容会话匹配）
const isCoListening = (charId) => {
  if (musicState.coListenCharId === charId) return true
  const chatArray = (sessions && sessions.value) || (chatList && chatList.value) || []
  const chat = chatArray.find(s => s.id === musicState.coListenCharId)
  if (chat && !chat.isGroup && chat.participants && chat.participants[0]?.id === charId) {
     return true
  }
  return false
}

const startCoListen = (charId) => {
  if (!isCoListening(charId)) {
    // 核心修复：当从音乐界面主动挑选角色发起邀请时，优先将其映射为对应该角色的聊天会话 ID (chat.id)，
    // 这样既能点亮列表，大模型在发消息时也能正确收到音乐参数注入！
    const chatArray = (sessions && sessions.value) || (chatList && chatList.value) || []
    const chat = chatArray.find(s => !s.isGroup && s.participants && s.participants[0]?.id === charId)
    toggleCoListen(chat ? chat.id : charId)
  }
}

const stopCoListen = () => {
  toggleCoListen(musicState.coListenCharId) 
}
</script>
