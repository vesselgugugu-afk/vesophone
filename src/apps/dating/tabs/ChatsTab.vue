<template>
  <div class="tab-chats">
    <div class="chat-list">
      
      <div v-if="chatList.length === 0" style="text-align:center; margin-top: 50px; color:#8e8e93; font-size: 13px;">
        <i class="fas fa-inbox" style="font-size: 40px; margin-bottom: 10px; opacity: 0.5; display: block;"></i>
        还没有匹配到任何人<br>去广场逛逛吧
      </div>

      <div class="chat-item" v-for="chat in chatList" :key="chat.id" @click="$emit('open-chat', chat.id)">
        <div
          class="chat-avatar"
          :class="{ 'revealed': chat.status === 'revealed' }"
          :style="`background-image: url(${getStableAvatar(chat.profile?.nickname)}); background-size: cover; background-position: center;`"
        >
        </div>
        
        <div class="chat-info">
          <div class="chat-name-row">
            <div class="chat-name" :style="chat.status === 'revealed' ? 'color: #14CCCC;' : ''">
              {{ getDisplayName(chat) }}
              <span class="chat-type" :class="getTypeClass(chat.type)">
                {{ getTypeText(chat.type) }}
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
/**
 * 冷推聊天列表页
 *
 * 这次除了保留原来逻辑，还补了一个能力：
 * - 读取每个冷推会话最后一条消息
 * - 如果最后一条是 feed_share，就显示“分享了一条广场动态”
 *
 * 这样转发到冷推私聊后，列表预览不会还是老的 bio。
 */
import { ref, onMounted, onUnmounted } from 'vue'
import db from '@/db'
import { useDatingAvatar } from '@/composables/useDatingAvatar'

defineEmits(['open-chat'])

const { getStableAvatar } = useDatingAvatar()
const chatList = ref([])

/**
 * 加载聊天列表：
 * 1. 读取 dating_chats
 * 2. 读取 dating_profiles
 * 3. 读取 messages 里所有 dating_ 前缀的消息
 * 4. 给每个聊天挂上“最后一条消息”
 */
const loadChats = async () => {
  try {
    const chats = await db.dating_chats.toArray()
    const profiles = await db.dating_profiles.toArray()
    const datingMessages = await db.messages.where('sessionId').startsWith('dating_').toArray()

    const lastMsgMap = {}
    for (const msg of datingMessages) {
      const sessionId = msg.sessionId
      if (!lastMsgMap[sessionId] || (msg.timestamp || 0) > (lastMsgMap[sessionId].timestamp || 0)) {
        lastMsgMap[sessionId] = msg
      }
    }

    const enriched = chats.map(c => {
      const p = profiles.find(prof => prof.id === c.profileId)
      return {
        ...c,
        profile: p || {},
        lastMsg: lastMsgMap[`dating_${c.id}`] || null
      }
    })

    chatList.value = enriched.reverse()
  } catch (e) {
    console.error('加载列表失败', e)
  }
}

const getDisplayName = (chat) => {
  if (chat.status === 'revealed') {
    return chat.profile?.fullJson?.name || chat.profile?.nickname || '匿名网友'
  }
  return chat.profile?.nickname || '匿名网友'
}

const getTypeText = (type) => {
  if (type === 'blind') return '盲聊'
  if (type === 'feed') return '广场'
  return '速配'
}

const getTypeClass = (type) => {
  if (type === 'blind') return 'type-blind'
  if (type === 'feed') return 'type-feed'
  return 'type-swipe'
}

/**
 * 根据最后一条消息类型生成预览文案。
 * 这里让 feed_share 有明确的列表提示。
 */
const formatLastMessage = (msg) => {
  if (!msg) return ''

  if (msg.type === 'feed_share') {
    return msg.role === 'user' ? '[你分享了] 一条广场动态' : '[对方分享了] 一条广场动态'
  }
  if (msg.type === 'voice') {
    return msg.role === 'user' ? '[你发送了语音]' : '[对方发送了语音]'
  }
  if (msg.type === 'image') {
    return msg.role === 'user' ? '[你发送了图片]' : '[对方发送了图片]'
  }
  if (msg.type === 'sticker') {
    return msg.role === 'user' ? '[你发送了表情包]' : '[对方发送了表情包]'
  }
  if (msg.type === 'location') {
    return msg.role === 'user' ? `[你发送了位置] ${msg.content}` : `[对方发送了位置] ${msg.content}`
  }
  if (msg.type === 'transfer') {
    return msg.role === 'user' ? `转账 ￥${msg.amount}` : `对方发来转账 ￥${msg.amount}`
  }
  if (msg.type === 'recalled') {
    return msg.role === 'user' ? '你撤回了一条消息' : '对方撤回了一条消息'
  }

  const content = (msg.content || '').replace(/\n/g, ' ').trim()
  if (!content) return msg.role === 'user' ? '[你发送了一条消息]' : '[对方发送了一条消息]'
  return content
}

const getPreviewMsg = (chat) => {
  if (chat.status === 'revealed') return '已加入 QQ 通讯录，快去找 TA 吧。'
  if (chat.status === 'exited') return '对方已离开了频道。'

  if (chat.lastMsg) {
    return formatLastMessage(chat.lastMsg)
  }

  if (chat.type === 'blind' && chat.scenario) return `[相遇] ${chat.scenario}`
  if (chat.type === 'feed') return chat.profile?.baseInfo?.bio || '你们因为一条动态而认识。'
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

.chat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #e5e5ea;
  cursor: pointer;
}

.chat-item:active {
  background-color: #f9f9f9;
}

.chat-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #e0e0e0, #f5f5f5);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;
}

.chat-avatar.revealed {
  border: 2px solid #14CCCC;
}

.chat-info {
  flex: 1;
  overflow: hidden;
}

.chat-name-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  gap: 10px;
}

.chat-name {
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #1c1c1e;
  min-width: 0;
}

.chat-type {
  font-size: 9px;
  padding: 2px 4px;
  border-radius: 4px;
  font-weight: 600;
  flex-shrink: 0;
}

.type-swipe {
  background: #fff0f0;
  color: #ff5252;
  border: 1px solid #ff5252;
}

.type-blind {
  background: #f0f4ff;
  color: #5c8aff;
  border: 1px solid #5c8aff;
}

.type-feed {
  background: #ecfdf5;
  color: #10b981;
  border: 1px solid #10b981;
}

.post-time {
  font-size: 10px;
  color: #8e8e93;
  flex-shrink: 0;
}

.chat-msg {
  font-size: 13px;
  color: #8e8e93;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
