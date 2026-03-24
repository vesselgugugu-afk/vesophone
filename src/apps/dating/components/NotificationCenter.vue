<template>
  <div class="notify-mask" @click.self="$emit('close')">
    <div class="notify-box">
      <div class="n-header">
        <span class="n-title"><i class="fas fa-bell"></i> 消息中心</span>
        <div style="display:flex; gap: 15px;">
          <i class="fas fa-check-double n-action" @click="markAllRead"></i>
          <i class="fas fa-times n-close" @click="$emit('close')"></i>
        </div>
      </div>

      <div class="n-tabs">
        <div class="n-tab" :class="{ active: activeTab === 'comment' }" @click="activeTab = 'comment'">
          评论回复
          <div class="n-dot" v-if="unreadComments > 0"></div>
        </div>
        <div class="n-tab" :class="{ active: activeTab === 'mention' }" @click="activeTab = 'mention'">
          @我的
          <div class="n-dot" v-if="unreadMentions > 0"></div>
        </div>
        <div class="n-tab" :class="{ active: activeTab === 'dm' }" @click="activeTab = 'dm'">
          未关注人私信
          <div class="n-dot" v-if="unreadDms > 0"></div>
        </div>
      </div>

      <div class="n-list">
        <div v-if="filteredList.length === 0" class="n-empty">
          <i class="fas fa-wind"></i>
          <p>这里静悄悄的...</p>
        </div>

        <div
          class="n-item"
          v-for="msg in filteredList"
          :key="msg.id"
          :class="{ unread: !msg.isRead, disabled: openingId === msg.id }"
          @click="handleItemClick(msg)"
        >
          <div class="n-avatar">
            <i class="fas fa-comment-dots" v-if="msg.type === 'comment'"></i>
            <i class="fas fa-at" v-else-if="msg.type === 'mention'"></i>
            <i class="fas fa-paper-plane" v-else></i>
          </div>

          <div class="n-content">
            <div class="n-name">
              {{ msg.fromName }}
              <span class="n-time">{{ formatTime(msg.time) }}</span>
            </div>
            <div class="n-text">{{ msg.content }}</div>
            <div class="n-sub" v-if="msg.type === 'comment'">点击查看原帖</div>
            <div class="n-sub" v-else-if="msg.type === 'mention'">点击查看被提到的位置</div>
            <div class="n-sub" v-else-if="openingId === msg.id">正在建立聊天...</div>
            <div class="n-sub" v-else>点击进入私聊</div>
          </div>

          <div class="n-right">
            <i class="fas fa-circle-notch fa-spin" v-if="openingId === msg.id"></i>
            <i class="fas fa-chevron-right" v-else></i>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 消息中心侧滑面板
 *
 * 这次修改重点：
 * - 样式从 fixed 改成 absolute
 * 原理：
 * - 它应该受限于当前冷推 App 内容区域
 * - 而不是直接吸附整个浏览器视口
 */

import { ref, computed } from 'vue'
import db from '@/db'
import { useDatingFeed } from '@/composables/useDatingFeed'
import { useDatingMatch } from '@/composables/useDatingMatch'
import { useCharacters } from '@/composables/useCharacters'

const emit = defineEmits(['close', 'open-post', 'open-chat'])

const { notifications, markAllRead, markNotificationRead } = useDatingFeed()
const { generateFullProfile } = useDatingMatch()
const { characters } = useCharacters()

const activeTab = ref('comment')
const openingId = ref(null)

const unreadComments = computed(() => notifications.value.filter(n => !n.isRead && n.type === 'comment').length)
const unreadMentions = computed(() => notifications.value.filter(n => !n.isRead && n.type === 'mention').length)
const unreadDms = computed(() => notifications.value.filter(n => !n.isRead && n.type === 'dm').length)

const filteredList = computed(() => {
  return notifications.value
    .filter(n => n.type === activeTab.value)
    .sort((a, b) => (b.time || 0) - (a.time || 0))
})

const formatTime = (ts) => {
  const d = new Date(ts)
  const now = Date.now()
  const diff = now - ts
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${d.getMonth() + 1}/${d.getDate()}`
}

const openPendingDm = async (msg) => {
  openingId.value = msg.id
  try {
    if (msg.chatId) {
      markNotificationRead(msg.id)
      emit('open-chat', msg.chatId)
      emit('close')
      return
    }

    if (msg.pendingRealCharId) {
      const actor = msg.pendingActor || {}
      const fakeProfile = {
        nickname: actor.nickname || msg.fromName || '匿名网友',
        baseInfo: {
          bio: actor.content || msg.content || '因为你的动态而来',
          appearance_summary: '一个让你觉得似曾相识的人',
          age: actor.age || 20,
          gender: actor.gender || '保密'
        },
        tags: actor.tags || [],
        fullJson: {},
        realCharId: msg.pendingRealCharId
      }

      const pid = await db.dating_profiles.add(fakeProfile)
      const cid = await db.dating_chats.add({
        profileId: pid,
        messageCount: 0,
        status: 'active',
        type: 'feed'
      })

      msg.chatId = cid
      markNotificationRead(msg.id)
      window.dispatchEvent(new CustomEvent('dating-refresh-chats'))
      emit('open-chat', cid)
      emit('close')
      return
    }

    const pending = msg.pendingBaseInfo || msg.pendingActor
    const baseInfo = {
      nickname: pending?.nickname || msg.fromName || '匿名网友',
      age: pending?.age || 20,
      gender: pending?.gender || '保密',
      tags: pending?.tags || [],
      bio: pending?.bio || pending?.content || msg.content || '因为你的动态而来'
    }

    const res = await generateFullProfile(baseInfo, false)
    if (!res.success) {
      window.dispatchEvent(new CustomEvent('sys-toast', { detail: `私信建立失败：${res.error}` }))
      return
    }

    msg.chatId = res.chatId
    markNotificationRead(msg.id)
    window.dispatchEvent(new CustomEvent('dating-refresh-chats'))
    emit('open-chat', res.chatId)
    emit('close')
  } catch (e) {
    console.error('通知私信打开失败', e)
    window.dispatchEvent(new CustomEvent('sys-toast', { detail: '私信建立失败，请稍后重试' }))
  } finally {
    openingId.value = null
  }
}

const handleItemClick = async (msg) => {
  if (openingId.value) return

  if (msg.type === 'comment' || msg.type === 'mention') {
    markNotificationRead(msg.id)
    emit('open-post', msg.postId)
    emit('close')
    return
  }

  if (msg.type === 'dm') {
    await openPendingDm(msg)
  }
}
</script>

<style scoped>
.notify-mask {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.4);
  z-index: 900;
  display: flex;
  justify-content: flex-end;
  backdrop-filter: blur(4px);
}

.notify-box {
  background: #fff;
  width: 85%;
  height: 100%;
  box-shadow: -10px 0 30px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  animation: slideLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideLeft {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.n-header {
  padding: 15px 20px 15px;
  background: #f4f5f7;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.n-title {
  font-weight: 800;
  font-size: 16px;
  color: #1c1c1e;
  display: flex;
  align-items: center;
  gap: 8px;
}

.n-action {
  color: #14CCCC;
  font-size: 16px;
  cursor: pointer;
}

.n-close {
  color: #8e8e93;
  font-size: 18px;
  cursor: pointer;
}

.n-tabs {
  display: flex;
  border-bottom: 1px solid #e5e5ea;
}

.n-tab {
  flex: 1;
  text-align: center;
  padding: 15px 0;
  font-size: 13px;
  font-weight: 700;
  color: #8e8e93;
  cursor: pointer;
  position: relative;
}

.n-tab.active {
  color: #14CCCC;
  border-bottom: 2px solid #14CCCC;
}

.n-dot {
  width: 6px;
  height: 6px;
  background: #ff3b30;
  border-radius: 50%;
  position: absolute;
  top: 12px;
  right: 15px;
}

.n-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px 0;
}

.n-empty {
  text-align: center;
  padding: 50px 0;
  color: #c7c7cc;
}

.n-empty i {
  font-size: 40px;
  margin-bottom: 10px;
  opacity: 0.5;
}

.n-item {
  display: flex;
  gap: 12px;
  padding: 15px 20px;
  border-bottom: 1px solid #f9f9f9;
  transition: background 0.2s;
  cursor: pointer;
}

.n-item.unread {
  background: rgba(20, 204, 204, 0.05);
}

.n-item.disabled {
  opacity: 0.7;
}

.n-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #e5e5ea;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #ffffff;
  font-size: 16px;
  flex-shrink: 0;
}

.n-content {
  flex: 1;
  min-width: 0;
}

.n-name {
  font-weight: 700;
  font-size: 13px;
  color: #1c1c1e;
  margin-bottom: 4px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.n-time {
  font-size: 10px;
  color: #8e8e93;
  font-weight: normal;
  flex-shrink: 0;
}

.n-text {
  font-size: 13px;
  color: #555;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.n-sub {
  margin-top: 5px;
  font-size: 11px;
  color: #9ca3af;
}

.n-right {
  width: 18px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  color: #c7c7cc;
  flex-shrink: 0;
}
</style>
