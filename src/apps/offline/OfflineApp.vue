<template>
  <transition name="slide-up">
    <div v-if="show" class="app-window" style="z-index: 100; background: #f4f5f7;">
      
      <!-- 如果当前有活跃的见面房间，则渲染房间视图 -->
      <MeetingRoom 
        v-if="currentSession" 
        :session="currentSession"
        :activeOfflineMessages="activeOfflineMessages"
        @exit-request="handleExitRequest"
        @update-config="updateSessionConfig"
        @update-bg="updateSessionBg"
        @send-message="handleUserSend"
      />

      <!-- 如果没有活跃房间，显示历史列表 -->
      <div v-else style="display:flex; flex-direction:column; height:100%;">
        <div class="app-header">
          <div class="btn-back" @click="$emit('close')">返回</div>
          <div class="app-title">见面记录</div>
          <div class="header-right"></div>
        </div>
        <div class="content-area">
          <div v-if="offlineSessions.length === 0" style="text-align:center; color:#888; font-size:13px; margin-top:50px;">
            暂无记录。<br>请从 QQ 聊天界面的底部菜单发起见面。
          </div>
          <div class="record-list">
            <div class="record-item" v-for="s in offlineSessions" :key="s.id" @click="openSession(s.id)">
              <div class="r-info">
                <div class="r-title">与 {{ s.chatTitle }} 的见面</div>
                <div class="r-time">{{ new Date(s.createTime).toLocaleString() }}</div>
              </div>
              <i class="fas fa-trash r-del" @click.stop="deleteSession(s.id)"></i>
            </div>
          </div>
        </div>
      </div>

    </div>
  </transition>
</template>

<script setup>
import { onMounted, onUnmounted, watch } from 'vue'
import { useOffline } from '@/composables/useOffline'
import MeetingRoom from './MeetingRoom.vue'

const props = defineProps({ show: Boolean })
const emit = defineEmits(['close'])

const { 
  offlineSessions, 
  activeOfflineMessages, 
  currentSession, 
  loadAllSessions, 
  createOrLoadSession, 
  loadSessionById,
  updateSessionConfig,
  updateSessionBg,
  addOfflineMessage,
  deleteSession 
} = useOffline()

// 监听从 QQ 内部发起见面的全局事件
const handleOpenMeetingEvent = async (e) => {
  if (e.detail && e.detail.chat) {
    const chat = e.detail.chat
    await createOrLoadSession(chat.id, chat.title)
  }
}

onMounted(async () => {
  await loadAllSessions()
  window.addEventListener('open-offline-meeting', handleOpenMeetingEvent)
})

onUnmounted(() => {
  window.removeEventListener('open-offline-meeting', handleOpenMeetingEvent)
})

watch(() => props.show, async (val) => {
  if (val && !currentSession.value) {
    await loadAllSessions()
  }
})

const openSession = async (id) => {
  await loadSessionById(id)
}

const handleUserSend = async (text) => {
  await addOfflineMessage({ role: 'user', content: text })
  // [下一阶段任务]：在这里触发 AI 生成...
}

const handleExitRequest = () => {
  // [下一阶段任务]：在这里弹窗触发大模型总结...
  
  // 目前暂作强制关闭处理
  const targetChatId = currentSession.value.chatId
  currentSession.value = null
  
  // 触发全局事件通知 QQ 界面存入归档文本 (下一阶段将携带真实文本)
  window.dispatchEvent(new CustomEvent('offline-meeting-ended', { 
    detail: { chatId: targetChatId } 
  }))
  
  emit('close')
}
</script>

<style scoped>
.record-list { display: flex; flex-direction: column; gap: 10px; padding: 15px; }
.record-item { background: #fff; padding: 15px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 10px rgba(0,0,0,0.02); cursor: pointer; }
.r-title { font-size: 14px; font-weight: 600; color: #333; margin-bottom: 4px; }
.r-time { font-size: 11px; color: #888; }
.r-del { color: #ff5252; padding: 10px; cursor: pointer; }
</style>
