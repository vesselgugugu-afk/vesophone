<template>
  <div class="tab-chats">
    <div class="chat-list">
      
      <div v-if="chatList.length === 0" style="text-align:center; margin-top: 50px; color:#8e8e93; font-size: 13px;">
        <i class="fas fa-inbox" style="font-size: 40px; margin-bottom: 10px; opacity: 0.5; display: block;"></i>
        还没有匹配到任何人<br>去广场逛逛吧
      </div>

      <div class="chat-item" v-for="chat in chatList" :key="chat.id" @click="$emit('open-chat', chat.id)">
        <div class="chat-avatar" :class="{ 'revealed': chat.status === 'revealed' }" :style="`background-image: url(${getStableAvatar(chat.profile?.nickname)}); background-size: cover; background-position: center;`">
        </div>
        
        <div class="chat-info">
          <div class="chat-name-row">
            <div class="chat-name" :style="chat.status === 'revealed' ? 'color: #14CCCC;' : ''">
              {{ chat.status === 'revealed' ? (chat.profile?.fullJson?.name || chat.profile?.nickname) : (chat.profile?.nickname || '匿名网友') }}
              <span class="chat-type" :class="chat.type === 'blind' ? 'type-blind' : 'type-swipe'">
                {{ chat.type === 'blind' ? '盲聊' : '速配' }}
              </span>
            </div>
            <span class="post-time" v-if="chat.status === 'revealed'">已奔现</span>
            <span class="post-time" v-else-if="chat.status === 'exited'">已离开</span>
            <span class="post-time" v-else>交流中</span>
          </div>
          <div class="chat-msg">
            {{ getPreviewMsg(chat) }}
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import db from '@/db'
import { useDatingAvatar } from '@/composables/useDatingAvatar'

defineEmits(['open-chat'])

const { getStableAvatar } = useDatingAvatar()
const chatList = ref([])

const loadChats = async () => {
  try {
    const chats = await db.dating_chats.toArray()
    const profiles = await db.dating_profiles.toArray()
    const enriched = chats.map(c => {
      const p = profiles.find(prof => prof.id === c.profileId)
      return { ...c, profile: p || {} }
    })
    chatList.value = enriched.reverse()
  } catch (e) {
    console.error('加载列表失败', e)
  }
}

const getPreviewMsg = (chat) => {
  if (chat.status === 'revealed') return '已加入 QQ 通讯录，快去找 TA 吧。'
  if (chat.status === 'exited') return '对方已离开了频道。'
  if (chat.type === 'blind' && chat.scenario) return `[相遇] ${chat.scenario}`
  return chat.profile?.baseInfo?.bio || '试着去了解 TA 吧...'
}

onMounted(() => {
  loadChats()
  window.addEventListener('dating-refresh-chats', loadChats)
})

onUnmounted(() => {
  window.removeEventListener('dating-refresh-chats', loadChats)
})
</script>

<style scoped>
.tab-chats { animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
.chat-list { padding: 12px 20px; }
.chat-item { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid #e5e5ea; cursor: pointer; }
.chat-item:active { background-color: #f9f9f9; }
.chat-avatar { width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #e0e0e0, #f5f5f5); display: flex; align-items: center; justify-content: center; position: relative; flex-shrink: 0; }
.chat-avatar.revealed { border: 2px solid #14CCCC; }
.chat-info { flex: 1; overflow: hidden; }
.chat-name-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.chat-name { font-size: 15px; font-weight: 600; display: flex; align-items: center; gap: 6px; color: #1c1c1e; }
.chat-type { font-size: 9px; padding: 2px 4px; border-radius: 4px; font-weight: 600; }
.type-swipe { background: #fff0f0; color: #ff5252; border: 1px solid #ff5252; }
.type-blind { background: #f0f4ff; color: #5c8aff; border: 1px solid #5c8aff; }
.post-time { font-size: 10px; color: #8e8e93; }
.chat-msg { font-size: 13px; color: #8e8e93; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>
