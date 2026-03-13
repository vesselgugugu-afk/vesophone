<template>
  <div class="content-area" style="padding-top: 10px;">
    
    <!-- 仿微信顶部操作栏 -->
    <div style="background: #fff; border-radius: 16px; overflow: hidden; margin-bottom: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
      <div class="menu-item" style="padding: 15px;" @click="$emit('create-char')">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="width:36px; height:36px; background:#ff9f43; color:#fff; border-radius:10px; display:flex; justify-content:center; align-items:center;">
            <i class="fas fa-user-plus"></i>
          </div>
          <span style="font-weight:600; font-size:14px;">添加好友 / 导入角色</span>
        </div>
        <i class="fas fa-chevron-right" style="color:#ccc; font-size:12px;"></i>
      </div>
      <div class="menu-item" style="padding: 15px; border-top: 1px solid #f5f5f5;" @click="showNewFriends = true">
        <div style="display:flex; align-items:center; gap:12px; position:relative;">
          <div style="width:36px; height:36px; background:#1dd1a1; color:#fff; border-radius:10px; display:flex; justify-content:center; align-items:center;">
            <i class="fas fa-user-friends"></i>
          </div>
          <div v-if="friendRequests.length > 0" style="position:absolute; top:-5px; left:25px; background:#ff5252; color:#fff; font-size:10px; border-radius:10px; padding:2px 6px;">{{ friendRequests.length }}</div>
          <span style="font-weight:600; font-size:14px;">新的朋友</span>
        </div>
        <i class="fas fa-chevron-right" style="color:#ccc; font-size:12px;"></i>
      </div>
    </div>

    <div style="font-size:11px; color:var(--text-sub); font-weight:600; padding:0 5px 8px;">我的联系人 ({{ characters.length }})</div>

    <div
      v-if="characters.length === 0"
      style="text-align:center; color:#888; margin-top:30px; font-size:13px;"
    >暂无角色，点击上方添加好友</div>

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
        <div class="item-name">{{ char.name }} <span class="item-tag" v-if="char.trueName !== char.name">真名: {{ char.trueName }}</span></div>
        <div class="item-desc">{{ char.description || '这个人很懒，什么都没写' }}</div>
      </div>
      <i class="fas fa-trash btn-delete" @click.stop="promptDelete(char)"></i>
    </div>

    <!-- 核心更新：优雅的删除防呆弹窗 -->
    <InnerModal :show="deleteModal.show" @close="deleteModal.show = false">
      <div class="modal-title" style="color:#ff5252;">删除联系人</div>
      <div style="padding:20px 15px; text-align:center; color:#555; font-size:14px; line-height:1.6;">
        确定要彻底删除 <b>{{ deleteModal.char?.name }}</b> 吗？<br><br>
        <span style="color:#ff5252; font-size:12px; background:rgba(255,82,82,0.1); padding:5px 10px; border-radius:6px; display:inline-block;">
          <i class="fas fa-exclamation-triangle"></i> 删除后，相关的单人聊天记录和记忆库将被同步抹除，且无法恢复！
        </span>
      </div>
      <div class="modal-actions" style="display:flex; gap:10px; padding:0 15px 15px;">
        <button class="btn-cancel" style="flex:1; padding:10px; border-radius:8px;" @click="deleteModal.show = false">取消</button>
        <button class="btn-confirm" style="flex:1; padding:10px; border-radius:8px; background:#ff5252; color:#fff; border:none;" @click="executeDelete">彻底删除</button>
      </div>
    </InnerModal>

    <!-- 核心更新：支持多条消息堆叠的好友验证申请模态框 -->
    <InnerModal :show="showNewFriends" @close="showNewFriends = false">
      <div class="modal-title">好友验证请求</div>
      
      <div v-if="friendRequests.length === 0" style="text-align:center; color:#888; font-size:13px; padding:20px 0;">
        暂无新的请求
      </div>
      
      <div v-else style="display:flex; flex-direction:column; gap:10px; margin:15px 0; max-height:350px; overflow-y:auto; padding:0 5px;">
        <div v-for="req in friendRequests" :key="req.id" style="background:#f9f9f9; padding:15px; border-radius:12px; display:flex; flex-direction:column; gap:10px; border:1px solid #eee;">
          
          <div style="display:flex; gap:10px; align-items:center;">
            <div style="width:40px; height:40px; border-radius:50%; background-size:cover; background-position:center; background-color:#ddd;" :style="getReqAvatar(req.chatId)"></div>
            <div style="flex:1;">
              <div style="font-weight:600; font-size:14px; color:#333;">{{ getReqName(req.chatId) }}</div>
              <div style="font-size:10px; color:#888;">最新: {{ new Date(req.time).toLocaleString() }}</div>
            </div>
          </div>
          
          <!-- 多条消息堆叠渲染区 -->
          <div style="font-size:13px; color:#555; background:#fff; padding:10px; border-radius:8px; border:1px solid #e5e5e5; display:flex; flex-direction:column; gap:8px;">
            <div v-for="(msg, idx) in req.messages" :key="idx" :style="idx !== req.messages.length - 1 ? 'border-bottom:1px dashed #f0f0f0; padding-bottom:8px;' : ''">
              <div style="font-size:10px; color:#aaa; margin-bottom:4px;">{{ new Date(msg.time).toLocaleString() }}</div>
              <div style="line-height:1.4;">"{{ msg.text }}"</div>
            </div>
          </div>
          
          <div style="display:flex; gap:10px; margin-top:5px;">
            <button style="flex:1; padding:8px; border-radius:8px; background:#fff; border:1px solid #ddd; color:#666;" @click="removeFriendRequest(req.id)">忽略</button>
            <button style="flex:1; padding:8px; border-radius:8px; background:#1dd1a1; border:none; color:#fff; font-weight:600;" @click="handleAccept(req.id)">同意</button>
          </div>
        </div>
      </div>
      
      <div class="modal-actions">
        <button class="btn-cancel" style="width:100%;" @click="showNewFriends = false">关闭</button>
      </div>
    </InnerModal>

  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useCharacters } from '@/composables/useCharacters'
import { useChatSessions } from '@/composables/useChatSessions'
import InnerModal from '@/components/InnerModal.vue'

defineEmits(['edit-char', 'create-char'])

const { characters, deleteChar } = useCharacters()
const { chatSessions, friendRequests, acceptFriendRequest, removeFriendRequest, deleteSession } = useChatSessions()

const showNewFriends = ref(false)
const deleteModal = ref({ show: false, char: null })

const promptDelete = (char) => {
  deleteModal.value = { show: true, char }
}

const executeDelete = () => {
  const charId = deleteModal.value.char.id
  const session = chatSessions.value.find(c => !c.isGroup && c.participants && c.participants.length > 0 && c.participants[0].id === charId)
  if (session) {
    deleteSession(session.id)
  }
  deleteChar(charId)
  window.dispatchEvent(new CustomEvent('sys-toast', { detail: '角色及相关数据已彻底抹除' }))
  deleteModal.value.show = false
}

const getReqChat = (chatId) => {
  return chatSessions.value.find(c => c.id === chatId)
}

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
  window.dispatchEvent(new CustomEvent('sys-toast', { detail: '已通过好友验证' }))
  if (friendRequests.value.length === 0) {
    showNewFriends.value = false
  }
}
</script>

<style scoped>
.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  cursor: pointer;
}
.menu-item:active {
  background: #f9f9f9;
}
</style>
