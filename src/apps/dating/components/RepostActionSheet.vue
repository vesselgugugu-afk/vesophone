<template>
  <div class="repost-mask" v-if="show" @click.self="handleClose">
    <div class="repost-sheet">
      <div class="sheet-handle"></div>

      <div class="sheet-header">
        <div class="sheet-title">转发动态</div>
        <i class="fas fa-times sheet-close" @click="handleClose"></i>
      </div>

      <!-- 统一转发文案输入区：无论转主页还是转私聊都可编辑 -->
      <div class="note-box">
        <div class="note-label">转发文案（可编辑）</div>
        <textarea
          v-model="shareNote"
          class="note-input"
          placeholder="例如：这条说得有点准。"
        ></textarea>
      </div>

      <div v-if="mode === 'entry'" class="sheet-body">
        <div class="post-preview-box">
          <div class="preview-label">当前动态</div>
          <div class="preview-author">{{ post?.nickname || '匿名网友' }}</div>
          <div class="preview-content">{{ post?.content || '暂无内容' }}</div>
        </div>

        <button class="action-btn home-btn" @click="emit('repost-home', shareNote.trim())">
          <div class="action-icon"><i class="fas fa-home"></i></div>
          <div class="action-main">
            <div class="action-title">转发到我的主页</div>
            <div class="action-desc">会带上你自己编辑的转发文案，且后续也可能收到评论和私信</div>
          </div>
        </button>

        <button class="action-btn chat-btn" @click="openChatMode">
          <div class="action-icon"><i class="fas fa-comment-dots"></i></div>
          <div class="action-main">
            <div class="action-title">转发到冷推私聊</div>
            <div class="action-desc">把这条动态作为帖子卡片发给某个冷推聊天对象</div>
          </div>
        </button>
      </div>

      <div v-else class="sheet-body">
        <div class="sub-head">
          <i class="fas fa-chevron-left sub-back" @click="mode = 'entry'"></i>
          <span class="sub-title">选择私聊对象</span>
        </div>

        <div v-if="isLoading" class="loading-box">
          <i class="fas fa-circle-notch fa-spin"></i>
          <div>正在读取聊天列表...</div>
        </div>

        <div v-else-if="chatList.length === 0" class="empty-box">
          <i class="fas fa-inbox"></i>
          <div>你还没有可转发的冷推私聊对象</div>
        </div>

        <div v-else class="chat-list">
          <div class="chat-item" v-for="chat in chatList" :key="chat.id" @click="handleChooseChat(chat)">
            <div class="chat-avatar" :style="chat.avatarStyle"></div>

            <div class="chat-info">
              <div class="chat-name-row">
                <div class="chat-name">{{ chat.title }}</div>
                <div class="chat-state">{{ chat.statusText }}</div>
              </div>
              <div class="chat-desc">{{ chat.desc }}</div>
            </div>

            <i class="fas fa-chevron-right chat-arrow"></i>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 转发动作面板
 *
 * 本次重点：
 * 1. 增加统一“转发文案”输入区
 * 2. 转发到主页时也会把这个文案带出去
 * 3. 转发到私聊时，作为附言带出去
 */

import { ref, watch } from 'vue'
import db from '@/db'
import { useDatingAvatar } from '@/composables/useDatingAvatar'

const props = defineProps({
  show: { type: Boolean, default: false },
  post: { type: Object, default: null }
})

const emit = defineEmits(['close', 'repost-home', 'repost-chat'])

const { getStableAvatar } = useDatingAvatar()

const mode = ref('entry')
const shareNote = ref('')
const chatList = ref([])
const isLoading = ref(false)

watch(() => props.show, async (val) => {
  if (val) {
    mode.value = 'entry'
    shareNote.value = ''
    chatList.value = []
  }
})

const handleClose = () => {
  emit('close')
}

const openChatMode = async () => {
  mode.value = 'chat'
  await loadChatList()
}

const loadChatList = async () => {
  isLoading.value = true
  try {
    const chats = await db.dating_chats.toArray()
    const profiles = await db.dating_profiles.toArray()

    const activeChats = chats
      .filter(item => item.status !== 'exited')
      .reverse()

    chatList.value = activeChats.map(chat => {
      const profile = profiles.find(p => p.id === chat.profileId) || {}
      return {
        id: chat.id,
        title: chat.status === 'revealed'
          ? (profile.fullJson?.name || profile.nickname || '匿名网友')
          : (profile.nickname || '匿名网友'),
        statusText: chat.status === 'revealed'
          ? '已揭晓'
          : (chat.type === 'feed' ? '广场相识' : (chat.type === 'blind' ? '盲聊' : '速配')),
        desc: profile.baseInfo?.bio || '试着去了解 TA 吧...',
        avatarStyle: `background-image: url(${getStableAvatar(profile.nickname || '匿名网友')}); background-size: cover; background-position: center;`
      }
    })
  } catch (e) {
    console.error('读取冷推聊天列表失败', e)
    chatList.value = []
  } finally {
    isLoading.value = false
  }
}

const handleChooseChat = (chat) => {
  emit('repost-chat', {
    chatId: chat.id,
    note: shareNote.value.trim()
  })
}
</script>

<style scoped>
.repost-mask {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.45);
  z-index: 1400;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.repost-sheet {
  width: 100%;
  background: #ffffff;
  border-radius: 24px 24px 0 0;
  padding: 10px 16px calc(16px + env(safe-area-inset-bottom));
  animation: slideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 -10px 30px rgba(0,0,0,0.12);
  max-height: 82vh;
  overflow-y: auto;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.sheet-handle {
  width: 42px;
  height: 5px;
  border-radius: 3px;
  background: #d1d5db;
  margin: 0 auto 12px;
}

.sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.sheet-title {
  font-size: 16px;
  font-weight: 800;
  color: #1c1c1e;
}

.sheet-close {
  font-size: 16px;
  color: #8e8e93;
  cursor: pointer;
  padding: 6px;
}

.sheet-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.note-box {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 12px;
  margin-bottom: 12px;
}

.note-label {
  font-size: 12px;
  font-weight: 700;
  color: #374151;
  margin-bottom: 8px;
}

.note-input {
  width: 100%;
  min-height: 74px;
  resize: none;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  line-height: 1.55;
  color: #1f2937;
  box-sizing: border-box;
  font-family: inherit;
}

.post-preview-box {
  background: #f7f8fa;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 14px;
}

.preview-label {
  font-size: 11px;
  color: #8e8e93;
  margin-bottom: 6px;
}

.preview-author {
  font-size: 13px;
  font-weight: 700;
  color: #1c1c1e;
  margin-bottom: 6px;
}

.preview-content {
  font-size: 13px;
  color: #374151;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

.action-btn {
  border: none;
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #e5e7eb;
  padding: 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  text-align: left;
}

.action-btn:active {
  transform: scale(0.99);
}

.action-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #ffffff;
  flex-shrink: 0;
}

.home-btn .action-icon {
  background: linear-gradient(135deg, #14CCCC, #0db4b4);
}

.chat-btn .action-icon {
  background: linear-gradient(135deg, #1f2937, #374151);
}

.action-main {
  flex: 1;
  min-width: 0;
}

.action-title {
  font-size: 14px;
  font-weight: 700;
  color: #1c1c1e;
  margin-bottom: 4px;
}

.action-desc {
  font-size: 11px;
  color: #8e8e93;
  line-height: 1.45;
}

.sub-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
}

.sub-back {
  font-size: 14px;
  color: #8e8e93;
  cursor: pointer;
  padding: 4px;
}

.sub-title {
  font-size: 14px;
  font-weight: 700;
  color: #1c1c1e;
}

.loading-box,
.empty-box {
  background: #f9fafb;
  border-radius: 16px;
  padding: 28px 16px;
  text-align: center;
  color: #8e8e93;
  font-size: 13px;
}

.loading-box i,
.empty-box i {
  font-size: 24px;
  margin-bottom: 10px;
  display: block;
}

.chat-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.chat-item {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.chat-item:active {
  background: #f9fafb;
}

.chat-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #e5e7eb;
  flex-shrink: 0;
}

.chat-info {
  flex: 1;
  min-width: 0;
}

.chat-name-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 4px;
}

.chat-name {
  font-size: 14px;
  font-weight: 700;
  color: #1c1c1e;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-state {
  font-size: 10px;
  color: #8e8e93;
  flex-shrink: 0;
}

.chat-desc {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.45;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-arrow {
  font-size: 12px;
  color: #c7c7cc;
  flex-shrink: 0;
}
</style>
