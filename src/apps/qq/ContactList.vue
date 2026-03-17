<template>
  <div class="contact-page-wrapper">
    
    <!-- 核心修复：固定顶部操作栏，绝对不参与滚动 -->
    <div class="top-fixed-section">
      <div class="action-menu-box">
        <div class="menu-item" @click="$emit('create-char')">
          <div class="menu-left">
            <div class="icon-wrap" style="background:#ff9f43;">
              <i class="fas fa-user-plus"></i>
            </div>
            <span class="menu-text">添加好友 / 导入角色</span>
          </div>
          <i class="fas fa-chevron-right arrow-icon"></i>
        </div>
        
        <div class="menu-divider"></div>

        <div class="menu-item" @click="showNewFriends = true">
          <div class="menu-left">
            <div class="icon-wrap" style="background:#1dd1a1; position: relative;">
              <i class="fas fa-user-friends"></i>
              <!-- 醒目的动态红点悬浮在图标右上角 -->
              <div v-if="friendRequests.length > 0" class="red-badge">
                {{ friendRequests.length }}
              </div>
            </div>
            <span class="menu-text">新的朋友</span>
          </div>
          <div class="menu-right">
            <span v-if="friendRequests.length > 0" class="new-text-hint">有新申请</span>
            <i class="fas fa-chevron-right arrow-icon"></i>
          </div>
        </div>
      </div>
    </div>

    <!-- 下方：独立滚动的联系人列表 -->
    <div class="scrollable-list-section">
      <div class="list-header-title">我的联系人 ({{ characters.length }})</div>

      <div v-if="characters.length === 0" class="empty-state">
        <i class="fas fa-address-book"></i>
        <span>暂无角色，点击上方添加好友</span>
      </div>

      <!-- 联系人列表 -->
      <div 
        class="list-item" 
        v-for="char in characters" 
        :key="char.id"
        @click="$emit('edit-char', char.id)"
      >
        <div class="item-avatar" :style="char.avatar ? `background-image: url(${char.avatar})` : ''">
          {{ !char.avatar ? char.name.charAt(0) : '' }}
        </div>
        <div class="item-info">
          <div class="item-name">
            {{ char.name }} 
            <span class="item-tag" v-if="char.trueName !== char.name">真名: {{ char.trueName }}</span>
          </div>
          <div class="item-desc">{{ char.description || '这个人很懒，什么都没写' }}</div>
        </div>
        <i class="fas fa-trash btn-delete" @click.stop="promptDelete(char)"></i>
      </div>
    </div>

    <!-- 删除防呆弹窗 -->
    <InnerModal :show="deleteModal.show" @close="deleteModal.show = false">
      <div class="modal-title" style="color:#ff5252;">删除联系人</div>
      <div class="delete-warning-content">
        确定要彻底删除 <b>{{ deleteModal.char?.name }}</b> 吗？<br><br>
        <span class="warning-tag">
          <i class="fas fa-exclamation-triangle"></i> 删除后，相关的单人聊天记录和记忆库将被同步抹除，且无法恢复！
        </span>
      </div>
      <div class="modal-actions modal-btn-group">
        <button class="btn-cancel" @click="deleteModal.show = false">取消</button>
        <button class="btn-confirm btn-danger" @click="executeDelete">彻底删除</button>
      </div>
    </InnerModal>

    <!-- 好友验证申请模态框 -->
    <InnerModal :show="showNewFriends" @close="showNewFriends = false">
      <div class="modal-title">新的朋友</div>
      
      <div v-if="friendRequests.length === 0" class="empty-requests">
        <i class="fas fa-inbox"></i>
        <span>暂无新的好友请求</span>
      </div>
      
      <div v-else class="requests-list">
        <div v-for="req in friendRequests" :key="req.id" class="request-card">
          
          <div class="req-header">
            <div class="req-avatar" :style="getReqAvatar(req.chatId)"></div>
            <div class="req-info">
              <div class="req-name">{{ getReqName(req.chatId) }}</div>
              <div class="req-source">来自: 匿名交友匹配</div>
            </div>
          </div>
          
          <div class="req-messages-box">
            <div v-for="(msg, idx) in req.messages" :key="idx" class="req-msg-item" :class="{'no-border': idx === req.messages.length - 1}">
              <div class="req-time">{{ new Date(msg.time).toLocaleString() }}</div>
              <div class="req-text">"{{ msg.text }}"</div>
            </div>
          </div>
          
          <div class="req-actions">
            <button class="btn-ignore" @click="removeFriendRequest(req.id)">忽略</button>
            <button class="btn-accept" @click="handleAccept(req.id)">通过验证</button>
          </div>
        </div>
      </div>
      
      <div class="modal-actions" style="margin-top: 10px;">
        <button class="btn-cancel full-width-btn" @click="showNewFriends = false">关闭面板</button>
      </div>
    </InnerModal>

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useCharacters } from '@/composables/useCharacters'
import { useChatSessions } from '@/composables/useChatSessions'
import InnerModal from '@/components/InnerModal.vue'

defineEmits(['edit-char', 'create-char'])

const { characters, deleteChar } = useCharacters()
const { chatSessions, friendRequests, acceptFriendRequest, removeFriendRequest, deleteSession } = useChatSessions()

const showNewFriends = ref(false)
const deleteModal = ref({ show: false, char: null })

const handleOpenNewFriends = () => {
  showNewFriends.value = true
}

onMounted(() => {
  window.addEventListener('qq-open-new-friends', handleOpenNewFriends)
})

onUnmounted(() => {
  window.removeEventListener('qq-open-new-friends', handleOpenNewFriends)
})

const promptDelete = (char) => {
  deleteModal.value = { show: true, char }
}

const executeDelete = () => {
  const charId = deleteModal.value.char.id
  const session = chatSessions.value.find(c => !c.isGroup && c.participants && c.participants.length > 0 && c.participants[0].id === charId)
  if (session) deleteSession(session.id)
  deleteChar(charId)
  window.dispatchEvent(new CustomEvent('sys-toast', { detail: '角色及相关数据已彻底抹除' }))
  deleteModal.value.show = false
}

const getReqChat = (chatId) => { return chatSessions.value.find(c => c.id === chatId) }

const getReqAvatar = (chatId) => {
  const chat = getReqChat(chatId)
  if (chat && chat.overrideAvatar) return `background-image:url(${chat.overrideAvatar})`
  if (chat && chat.participants && chat.participants.length > 0) {
    const char = characters.value.find(c => c.id === chat.participants[0].id)
    if (char && char.avatar) return `background-image:url(${char.avatar})`
  }
  return ''
}

const getReqName = (chatId) => {
  const chat = getReqChat(chatId)
  return chat ? chat.title : '未知角色'
}

const handleAccept = (id) => {
  acceptFriendRequest(id)
  window.dispatchEvent(new CustomEvent('sys-toast', { detail: '已通过好友验证，快去聊天吧！' }))
  if (friendRequests.value.length === 0) {
    showNewFriends.value = false
  }
}
</script>

<style scoped>
/* 终极布局容器：Flex 上下分层 */
.contact-page-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  /* 移除了导致遮挡底栏的 position: absolute 等属性 */
  background: transparent;
}

/* 顶部操作区：死死钉在上面 */
.top-fixed-section {
  flex-shrink: 0;
  padding: 15px 16px 5px 16px;
  z-index: 10;
}

.action-menu-box {
  background: #fff; 
  border-radius: 16px; 
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);
  overflow: hidden;
}

.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  cursor: pointer;
  transition: background 0.2s;
}
.menu-item:active { background: #f4f5f7; }

.menu-left { display: flex; align-items: center; gap: 14px; }
.menu-right { display: flex; align-items: center; gap: 8px; }

.icon-wrap {
  width: 40px; height: 40px;
  border-radius: 12px;
  display: flex; justify-content: center; align-items: center;
  color: white; font-size: 16px;
}
.menu-text { font-weight: 700; font-size: 15px; color: #1c1c1e; }
.arrow-icon { color: #ccc; font-size: 12px; }
.menu-divider { height: 1px; background: #f5f5f5; margin: 0 16px; }

/* 动态红点 */
.red-badge {
  position: absolute; top: -4px; right: -6px; 
  background: #ff3b30; color: #fff; 
  font-size: 11px; font-weight: 800;
  border-radius: 12px; padding: 2px 6px;
  box-shadow: 0 2px 6px rgba(255, 59, 48, 0.4);
  border: 2px solid #fff;
  animation: pop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes pop { 0% { transform: scale(0.5); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
.new-text-hint { font-size: 12px; color: #ff3b30; font-weight: 600; }

/* 底部滚动区：所有联系人都在这里滑 */
.scrollable-list-section {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 10px 16px 20px 16px; /* 恢复正常 padding */
  -webkit-overflow-scrolling: touch;
}

.list-header-title {
  font-size: 12px; color: #8e8e93; font-weight: 700;
  margin-bottom: 12px; padding-left: 4px;
}

.empty-state {
  text-align: center; color: #8e8e93; font-size: 13px; margin-top: 40px;
}
.empty-state i { font-size: 36px; opacity: 0.3; margin-bottom: 12px; display: block; }

/* 其他弹窗与卡片样式 */
.delete-warning-content { padding: 20px 15px; text-align: center; color: #555; font-size: 14px; line-height: 1.6; }
.warning-tag { color: #ff5252; font-size: 12px; background: rgba(255,82,82,0.1); padding: 6px 12px; border-radius: 8px; display: inline-block; margin-top: 10px; }
.modal-btn-group { display: flex; gap: 12px; padding: 0 15px 15px; }
.btn-danger { background: #ff5252 !important; color: #fff; }

.empty-requests { text-align: center; color: #8e8e93; padding: 40px 0; }
.empty-requests i { font-size: 40px; opacity: 0.2; margin-bottom: 16px; display: block; }

.requests-list { display: flex; flex-direction: column; gap: 16px; margin: 15px 0; max-height: 50vh; overflow-y: auto; padding: 0 4px; }
.request-card { background: #f4f5f7; padding: 16px; border-radius: 16px; display: flex; flex-direction: column; gap: 12px; }
.req-header { display: flex; gap: 12px; align-items: center; }
.req-avatar { width: 46px; height: 46px; border-radius: 50%; background-color: #ddd; background-size: cover; background-position: center; border: 2px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.req-name { font-weight: 800; font-size: 16px; color: #1c1c1e; }
.req-source { font-size: 11px; color: #8e8e93; margin-top: 2px; }

.req-messages-box { background: #fff; padding: 12px; border-radius: 12px; display: flex; flex-direction: column; gap: 10px; }
.req-msg-item { padding-bottom: 10px; border-bottom: 1px dashed #e5e5ea; }
.req-msg-item.no-border { border-bottom: none; padding-bottom: 0; }
.req-time { font-size: 10px; color: #8e8e93; margin-bottom: 6px; }
.req-text { font-size: 13px; color: #333; line-height: 1.5; font-style: italic; }

.req-actions { display: flex; gap: 10px; margin-top: 4px; }
.btn-ignore { flex: 1; padding: 12px; border-radius: 12px; background: #fff; border: none; color: #ff3b30; font-weight: 700; cursor: pointer; }
.btn-accept { flex: 1; padding: 12px; border-radius: 12px; background: #14CCCC; border: none; color: #fff; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(20,204,204,0.3); }

.full-width-btn { width: 100%; border-radius: 12px; padding: 14px; font-weight: 700; background: #f4f5f7; color: #1c1c1e; }
</style>
