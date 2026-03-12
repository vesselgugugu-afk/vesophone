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
          :style="musicState.coListenCharId === char.id ? 'border: 1px solid #5c8aff;' : ''"
        >
          <div class="item-avatar" :style="char.avatar ? `background-image: url(${char.avatar})` : ''">
            {{ !char.avatar ? char.name.charAt(0) : '' }}
          </div>
          <div class="item-info">
            <div class="item-name">{{ char.name }}</div>
          </div>
          <div v-if="musicState.coListenCharId === char.id" style="font-size:12px; color:#5c8aff; font-weight:600;">正在一起听 <i class="fas fa-headphones"></i></div>
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

defineProps({ show: Boolean })
const emit = defineEmits(['close'])

const { characters } = useCharacters()
const { musicState, toggleCoListen } = useMusic()

const activeCharName = computed(() => {
  if (!musicState.coListenCharId) return ''
  const c = characters.value.find(c => c.id === musicState.coListenCharId)
  return c ? c.name : '未知角色'
})

const startCoListen = (id) => {
  if (musicState.coListenCharId !== id) {
    toggleCoListen(id)
  }
}

const stopCoListen = () => {
  toggleCoListen(musicState.coListenCharId) // 传入相同的 ID 即为关闭
}
</script>
