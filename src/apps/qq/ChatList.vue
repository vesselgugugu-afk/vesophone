<template>
  <div class="content-area">
    <div
      v-if="chatSessions.length === 0"
      style="text-align:center; color:#888; margin-top:50px; font-size:14px;"
    >暂无对话，点击右上角 + 开始</div>

    <div
      class="list-item"
      v-for="chat in chatSessions"
      :key="chat.id"
      @click="$emit('enter', chat)"
    >
      <div class="item-avatar" :style="getAvatarStyle(chat)">
        {{ getAvatarInitials(chat) }}
      </div>
      <div class="item-info">
        <div class="item-name">{{ chat.title }}</div>
        <div class="item-desc">{{ chat.lastMessage || '暂无消息' }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useChatSessions } from '@/composables/useChatSessions'
import { useCharacters } from '@/composables/useCharacters'

defineEmits(['enter'])

const { chatSessions } = useChatSessions()
const { getCharById } = useCharacters()

const getAvatarStyle = (chat) => {
  if (chat.overrideAvatar) return `background-image: url(${chat.overrideAvatar})`
  if (!chat.isGroup && chat.participants && chat.participants.length > 0) {
    // 实时获取通讯录中的最新头像
    const liveChar = getCharById(chat.participants[0].id)
    if (liveChar && liveChar.avatar) return `background-image: url(${liveChar.avatar})`
  }
  return ''
}

const getAvatarInitials = (chat) => {
  if (chat.overrideAvatar) return ''
  if (!chat.isGroup && chat.participants && chat.participants.length > 0) {
    const liveChar = getCharById(chat.participants[0].id)
    if (liveChar && liveChar.avatar) return ''
  }
  return chat.title ? chat.title.charAt(0) : 'A'
}
</script>
