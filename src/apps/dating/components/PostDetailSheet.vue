<template>
  <transition name="slide-up">
    <div class="detail-page" v-if="show && post">
      <!-- 顶部栏 -->
      <div class="detail-header">
        <i class="fas fa-chevron-left back-btn" @click="$emit('close')"></i>
        <span class="detail-title">动态详情</span>
        <div class="detail-header-actions">
          <i class="fas fa-retweet header-action" @click="showRepostSheet = true"></i>
        </div>
      </div>

      <!-- 主滚动区 -->
      <div class="detail-scroll">
        <!-- 主贴 -->
        <div class="detail-main-post">
          <div class="feed-header">
            <div
              class="feed-avatar"
              :style="`background-image: url(${getStableAvatar(post.nickname)})`"
              @click="requestOpenProfile(post)"
            ></div>

            <div class="feed-user-info">
              <div class="feed-name">
                {{ post.nickname }}
                <span class="my-post-tag" v-if="post.isMine">自己</span>
              </div>
              <div class="feed-meta">{{ post.age ? `${post.age}岁 · ` : '' }}{{ post.gender || '未知' }}</div>
            </div>

            <button class="btn-chat" v-if="allowChat && !post.isMine" @click="requestOpenChat(post)">聊天</button>
          </div>

          <div class="detail-content">{{ post.content }}</div>

          <!-- 当前帖子自己的音乐卡片 -->
          <div
            class="music-attachment-card"
            v-if="post.attachment && post.attachment.type === 'music'"
            @click="handleClickMusicAttachment(post.attachment)"
          >
            <div class="music-cover" :style="post.attachment.cover ? `background-image: url(${post.attachment.cover})` : ''">
              <i v-if="!post.attachment.cover" class="fas fa-music"></i>
            </div>

            <div class="music-main">
              <div class="music-label">分享音乐</div>
              <div class="music-name">{{ post.attachment.name }}</div>
              <div class="music-artist">{{ post.attachment.artist }}</div>
              <div class="music-note" v-if="post.attachment.content">{{ post.attachment.content }}</div>
            </div>

            <div class="music-side">
              <i class="fas fa-play"></i>
            </div>
          </div>

          <!-- 如果这是转发贴，则展示原帖快照 -->
          <div class="repost-card" v-if="post.repostOf">
            <div class="repost-title">转发的原动态</div>
            <div class="repost-author">{{ post.repostOf.nickname }}</div>
            <div class="repost-content">{{ post.repostOf.content }}</div>

            <div
              class="music-attachment-card inner"
              v-if="post.repostOf.attachment && post.repostOf.attachment.type === 'music'"
              @click.stop="handleClickMusicAttachment(post.repostOf.attachment)"
            >
              <div class="music-cover" :style="post.repostOf.attachment.cover ? `background-image: url(${post.repostOf.attachment.cover})` : ''">
                <i v-if="!post.repostOf.attachment.cover" class="fas fa-music"></i>
              </div>

              <div class="music-main">
                <div class="music-label">原帖音乐</div>
                <div class="music-name">{{ post.repostOf.attachment.name }}</div>
                <div class="music-artist">{{ post.repostOf.attachment.artist }}</div>
                <div class="music-note" v-if="post.repostOf.attachment.content">{{ post.repostOf.attachment.content }}</div>
              </div>

              <div class="music-side">
                <i class="fas fa-play"></i>
              </div>
            </div>

            <div class="repost-tags" v-if="post.repostOf.tags && post.repostOf.tags.length > 0">
              <span v-for="tag in post.repostOf.tags" :key="tag"><i class="fas fa-hashtag"></i> {{ tag }}</span>
            </div>
          </div>

          <div class="feed-tags" v-if="post.tags && post.tags.length > 0">
            <span v-for="tag in post.tags" :key="tag"><i class="fas fa-hashtag"></i> {{ tag }}</span>
          </div>

          <div class="detail-time-row">{{ formatFullTime(post.timestamp) }}</div>
        </div>

        <!-- 评论区 -->
        <div class="comments-area">
          <div class="comments-title">全部评论 ({{ commentCount }})</div>

          <div v-if="rootComments.length === 0" class="empty-comments">
            还没有人评论，快来抢沙发。
          </div>

          <PostCommentItem
            v-for="comment in rootComments"
            :key="comment.id"
            :comment="comment"
            :all-comments="post.comments || []"
            :depth="0"
            :can-chat="allowChat"
            @reply="prepareReply"
            @open-profile="requestOpenProfile"
            @open-chat="requestOpenChat"
          />
        </div>
      </div>

      <!-- 当前回复目标提示 -->
      <div class="reply-banner" v-if="replyingTo">
        <div class="reply-banner-text">正在回复 @{{ replyingTo.nickname }}</div>
        <i class="fas fa-times reply-close" @click="cancelReply"></i>
      </div>

      <!-- 底部输入栏 -->
      <div class="detail-bottom-bar">
        <input
          type="text"
          v-model="commentInput"
          :placeholder="inputPlaceholder"
          @keyup.enter="handleSend"
        />
        <button class="btn-send-cmt" @click="handleSend" :disabled="!commentInput.trim()">发送</button>
      </div>

      <!-- 转发动作面板 -->
      <RepostActionSheet
        :show="showRepostSheet"
        :post="post"
        @close="showRepostSheet = false"
        @repost-home="handleRepostToMyFeed"
        @repost-chat="handleShareToChat"
      />
    </div>
  </transition>
</template>

<script setup>
/**
 * 统一帖子详情页
 *
 * 这次新增：
 * 1. 支持展示帖子自己的音乐卡片
 * 2. 支持展示转发原帖中的音乐卡片
 * 3. 点击音乐卡片后可直接播放并打开音乐 App
 * 4. 转发到主页 / 转发到私聊时，attachment 会通过 useDatingFeed 保留下去
 */

import { ref, computed, watch } from 'vue'
import db from '@/db'
import { useDatingAvatar } from '@/composables/useDatingAvatar'
import { useDatingFeed } from '@/composables/useDatingFeed'
import { useMusic } from '@/composables/useMusic'
import PostCommentItem from '@/apps/dating/components/PostCommentItem.vue'
import RepostActionSheet from '@/apps/dating/components/RepostActionSheet.vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  post: { type: Object, default: null },
  allowChat: { type: Boolean, default: true }
})

const emit = defineEmits(['close', 'open-profile', 'open-chat', 'reposted', 'shared-to-chat'])

const { getStableAvatar } = useDatingAvatar()
const { postComment, replyToComment, repostToMyFeed, buildFeedShareMessage } = useDatingFeed()
const { playSpecific } = useMusic()

const commentInput = ref('')
const replyingTo = ref(null)
const showRepostSheet = ref(false)

const commentCount = computed(() => {
  return props.post?.comments?.length || 0
})

const rootComments = computed(() => {
  return (props.post?.comments || [])
    .filter(comment => !comment.parentId)
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
})

const inputPlaceholder = computed(() => {
  if (replyingTo.value) return `回复 @${replyingTo.value.nickname}...`
  return '发一条评论...'
})

watch(() => props.show, (val) => {
  if (!val) {
    commentInput.value = ''
    replyingTo.value = null
    showRepostSheet.value = false
  }
})

watch(() => props.post?.id, () => {
  commentInput.value = ''
  replyingTo.value = null
  showRepostSheet.value = false
})

const formatFullTime = (ts) => {
  if (!ts) return ''
  return new Date(ts).toLocaleString('zh-CN', { hour12: false })
}

const prepareReply = (comment) => {
  replyingTo.value = comment
}

const cancelReply = () => {
  replyingTo.value = null
}

const handleSend = async () => {
  if (!props.post || !commentInput.value.trim()) return

  const text = commentInput.value.trim()

  if (replyingTo.value) {
    await replyToComment(props.post, replyingTo.value, text)
  } else {
    await postComment(props.post, text)
  }

  commentInput.value = ''
  replyingTo.value = null
}

/**
 * 点击详情页音乐卡片：
 * - 用最小歌曲结构调用 playSpecific
 * - 然后通知系统打开音乐 App
 */
const handleClickMusicAttachment = async (attachment) => {
  if (!attachment || attachment.type !== 'music') return

  try {
    await playSpecific({
      name: attachment.name,
      artist: attachment.artist,
      cachedCover: attachment.cover || ''
    })

    window.dispatchEvent(new CustomEvent('open-app', { detail: 'music' }))
  } catch (e) {
    console.error('播放帖子音乐失败', e)
    window.dispatchEvent(new CustomEvent('sys-toast', { detail: '播放失败，请稍后重试' }))
  }
}

const requestOpenProfile = (actor) => {
  emit('open-profile', actor)
}

const requestOpenChat = (actor) => {
  emit('open-chat', actor)
}

const handleRepostToMyFeed = (note = '') => {
  if (!props.post) return
  const repost = repostToMyFeed(props.post, note)
  showRepostSheet.value = false
  window.dispatchEvent(new CustomEvent('sys-toast', { detail: '已转发到我的主页' }))
  emit('reposted', repost)
}

const handleShareToChat = async ({ chatId, note }) => {
  if (!props.post || !chatId) return

  try {
    const baseMsg = buildFeedShareMessage(props.post, note)
    const fullMsg = {
      ...baseMsg,
      id: Date.now() + Math.random(),
      role: 'user',
      sessionId: `dating_${chatId}`,
      timestamp: Date.now()
    }

    await db.messages.add(fullMsg)

    const targetChat = await db.dating_chats.get(chatId)
    if (targetChat) {
      await db.dating_chats.update(chatId, {
        messageCount: (targetChat.messageCount || 0) + 1
      })
    }

    showRepostSheet.value = false

    window.dispatchEvent(new CustomEvent('dating-refresh-chats'))

    window.dispatchEvent(new CustomEvent('dating-chat-message-added', {
      detail: {
        chatId,
        message: fullMsg,
        autoTriggerAi: true
      }
    }))

    window.dispatchEvent(new CustomEvent('sys-toast', { detail: '已转发到冷推私聊' }))
    emit('shared-to-chat', { chatId, message: fullMsg })
  } catch (e) {
    console.error('转发到冷推私聊失败', e)
    window.dispatchEvent(new CustomEvent('sys-toast', { detail: '转发失败，请稍后重试' }))
  }
}
</script>

<style scoped>
.detail-page {
  position: absolute;
  inset: 0;
  background: #f4f5f7;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}

.detail-header {
  flex-shrink: 0;
  padding: 12px 16px 12px;
  background: #fff;
  display: grid;
  grid-template-columns: 32px 1fr 32px;
  align-items: center;
  border-bottom: 1px solid #e5e5ea;
}

.back-btn {
  font-size: 18px;
  color: #1c1c1e;
  cursor: pointer;
  padding: 5px;
}

.detail-title {
  text-align: center;
  font-size: 16px;
  font-weight: 700;
  color: #1c1c1e;
}

.detail-header-actions {
  display: flex;
  justify-content: flex-end;
}

.header-action {
  font-size: 16px;
  color: #1c1c1e;
  cursor: pointer;
  padding: 5px;
}

.detail-scroll {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 110px;
}

.detail-main-post {
  background: #fff;
  padding: 20px;
  margin-bottom: 10px;
}

.feed-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.feed-avatar {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background-color: #ddd;
  background-size: cover;
  background-position: center;
  cursor: pointer;
  flex-shrink: 0;
}

.feed-user-info {
  flex: 1;
  min-width: 0;
}

.feed-name {
  font-weight: 700;
  font-size: 15px;
  color: #1c1c1e;
  display: flex;
  align-items: center;
  gap: 6px;
}

.my-post-tag {
  font-size: 9px;
  background: #14CCCC;
  color: #fff;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.feed-meta {
  font-size: 11px;
  color: #8e8e93;
  margin-top: 2px;
}

.btn-chat {
  background: #1c1c1e;
  color: #fff;
  border: none;
  padding: 7px 16px;
  border-radius: 16px;
  font-weight: 600;
  font-size: 11px;
  cursor: pointer;
  flex-shrink: 0;
}

.detail-content {
  font-size: 15px;
  color: #1c1c1e;
  line-height: 1.65;
  margin: 15px 0;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 音乐附件卡片 */
.music-attachment-card {
  background: linear-gradient(135deg, #111827, #1f2937);
  border-radius: 16px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
  cursor: pointer;
  color: #fff;
}

.music-attachment-card.inner {
  margin-top: 12px;
  margin-bottom: 0;
}

.music-attachment-card:active {
  transform: scale(0.99);
}

.music-cover {
  width: 58px;
  height: 58px;
  border-radius: 12px;
  background: rgba(255,255,255,0.08);
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #14CCCC;
  font-size: 18px;
  flex-shrink: 0;
}

.music-main {
  flex: 1;
  min-width: 0;
}

.music-label {
  font-size: 10px;
  color: rgba(255,255,255,0.6);
  margin-bottom: 4px;
}

.music-name {
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.music-artist {
  font-size: 11px;
  color: rgba(255,255,255,0.72);
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.music-note {
  font-size: 11px;
  color: #d1fae5;
  margin-top: 6px;
  line-height: 1.45;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.music-side {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #ffffff;
  color: #111827;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  flex-shrink: 0;
}

.feed-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.feed-tags span {
  font-size: 11px;
  color: #14CCCC;
  background: rgba(20, 204, 204, 0.1);
  padding: 4px 10px;
  border-radius: 6px;
  font-weight: 600;
}

.detail-time-row {
  font-size: 11px;
  color: #8e8e93;
  margin-top: 16px;
}

.repost-card {
  background: #f7f8fa;
  border: 1px solid #ebecef;
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 14px;
}

.repost-title {
  font-size: 11px;
  color: #8e8e93;
  margin-bottom: 6px;
}

.repost-author {
  font-size: 13px;
  font-weight: 700;
  color: #1c1c1e;
  margin-bottom: 8px;
}

.repost-content {
  font-size: 13px;
  color: #374151;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

.repost-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.repost-tags span {
  font-size: 10px;
  color: #14CCCC;
  background: rgba(20, 204, 204, 0.08);
  padding: 3px 8px;
  border-radius: 10px;
  font-weight: 600;
}

.comments-area {
  background: #fff;
  padding: 20px;
  min-height: 55vh;
}

.comments-title {
  font-size: 14px;
  font-weight: 800;
  color: #1c1c1e;
  margin-bottom: 20px;
}

.empty-comments {
  text-align: center;
  color: #8e8e93;
  font-size: 12px;
  padding: 36px 0;
}

.reply-banner {
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(56px + env(safe-area-inset-bottom));
  background: #f7f8fa;
  border-top: 1px solid #e5e5ea;
  border-bottom: 1px solid #e5e5ea;
  padding: 10px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 1001;
}

.reply-banner-text {
  font-size: 12px;
  color: #6b7280;
  font-weight: 600;
}

.reply-close {
  font-size: 14px;
  color: #8e8e93;
  cursor: pointer;
}

.detail-bottom-bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fff;
  padding: 10px 15px calc(env(safe-area-inset-bottom) + 10px);
  display: flex;
  align-items: center;
  border-top: 1px solid #e5e5ea;
  gap: 10px;
  z-index: 1002;
}

.detail-bottom-bar input {
  flex: 1;
  background: #f4f5f7;
  border: none;
  border-radius: 20px;
  padding: 10px 15px;
  font-size: 14px;
  outline: none;
}

.btn-send-cmt {
  background: #14CCCC;
  color: #fff;
  border: none;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
}

.btn-send-cmt:disabled {
  background: #e5e5ea;
  color: #8e8e93;
}
</style>
