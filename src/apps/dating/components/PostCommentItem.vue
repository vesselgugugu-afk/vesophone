<template>
  <div class="comment-node" :style="nodeStyle">
    <div class="comment-row">
      <div class="cmt-avatar" :style="avatarStyle" @click.stop="handleOpenProfile">
        <i v-if="comment.isMine" class="fas fa-user"></i>
      </div>

      <div class="cmt-main">
        <div class="cmt-head">
          <div class="cmt-name-wrap">
            <span class="cmt-name" :class="{ 'is-me': comment.isMine }">{{ comment.nickname }}</span>
          </div>
          <span class="cmt-time">{{ formatTime(comment.timestamp) }}</span>
        </div>

        <div class="cmt-text">{{ comment.content }}</div>

        <div class="cmt-actions">
          <span class="action-btn" @click.stop="emit('reply', comment)">回复</span>
          <span class="action-btn" v-if="canChat && !comment.isMine" @click.stop="emit('open-chat', comment)">聊天</span>
        </div>
      </div>
    </div>

    <div class="comment-children" v-if="childComments.length > 0">
      <PostCommentItem
        v-for="child in childComments"
        :key="child.id"
        :comment="child"
        :all-comments="allComments"
        :depth="depth + 1"
        :can-chat="canChat"
        :visited-ids="[...visitedIds, currentCommentId]"
        @reply="emit('reply', $event)"
        @open-profile="emit('open-profile', $event)"
        @open-chat="emit('open-chat', $event)"
      />
    </div>

    <div class="comment-guard-tip" v-if="hasDepthLimit">
      该楼层层级过深，已自动折叠以防止异常循环。
    </div>
  </div>
</template>

<script setup>
/**
 * 评论递归组件
 *
 * 这次特别修改：
 * - 去掉前端“熟人马甲”字样
 *
 * 原理：
 * - 底层 realCharId 仍然保留，方便后续点聊天时识别
 * - 但前端不再渲染任何“这是熟人”的提示
 * - 这样用户前台看不出来对方其实是熟人潜入
 */

import { computed } from 'vue'
import { useDatingAvatar } from '@/composables/useDatingAvatar'

const props = defineProps({
  comment: { type: Object, required: true },
  allComments: { type: Array, default: () => [] },
  depth: { type: Number, default: 0 },
  canChat: { type: Boolean, default: true },
  visitedIds: { type: Array, default: () => [] }
})

const emit = defineEmits(['reply', 'open-profile', 'open-chat'])

const { getStableAvatar } = useDatingAvatar()

const MAX_DEPTH = 8

const currentCommentId = computed(() => {
  return props.comment?.id ?? null
})

const hasDepthLimit = computed(() => {
  return props.depth >= MAX_DEPTH
})

const childComments = computed(() => {
  if (!currentCommentId.value) return []
  if (hasDepthLimit.value) return []

  return (props.allComments || [])
    .filter(item => {
      if (!item) return false
      if (item.parentId !== currentCommentId.value) return false
      if (item.id === currentCommentId.value) return false
      if (props.visitedIds.includes(item.id)) return false
      return true
    })
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
})

const nodeStyle = computed(() => {
  const offset = Math.min(props.depth, 4) * 18
  return {
    marginLeft: `${offset}px`
  }
})

const avatarStyle = computed(() => {
  if (props.comment.isMine) return ''
  return `background-image: url(${getStableAvatar(props.comment.nickname)}); background-size: cover; background-position: center;`
})

const handleOpenProfile = () => {
  if (props.comment.isMine) return
  emit('open-profile', props.comment)
}

const formatTime = (ts) => {
  if (!ts) return '刚刚'
  const diff = Date.now() - ts
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}
</script>

<style scoped>
.comment-node {
  width: 100%;
}

.comment-row {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
}

.cmt-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background-color: #f4f5f7;
  background-size: cover;
  background-position: center;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #14CCCC;
  border: 1px solid #e5e5ea;
  cursor: pointer;
}

.cmt-main {
  flex: 1;
  min-width: 0;
}

.cmt-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.cmt-name-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.cmt-name {
  font-size: 13px;
  font-weight: 700;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cmt-name.is-me {
  color: #14CCCC;
}

.cmt-time {
  font-size: 10px;
  color: #9ca3af;
  flex-shrink: 0;
}

.cmt-text {
  font-size: 14px;
  color: #1f2937;
  line-height: 1.55;
  word-break: break-word;
  white-space: pre-wrap;
}

.cmt-actions {
  display: flex;
  gap: 14px;
  margin-top: 8px;
}

.action-btn {
  font-size: 11px;
  color: #8e8e93;
  cursor: pointer;
  user-select: none;
}

.action-btn:active {
  color: #14CCCC;
}

.comment-children {
  margin-top: 2px;
}

.comment-guard-tip {
  margin: 4px 0 10px 44px;
  font-size: 11px;
  color: #9ca3af;
  background: #f9fafb;
  border: 1px dashed #e5e7eb;
  border-radius: 10px;
  padding: 8px 10px;
}
</style>
