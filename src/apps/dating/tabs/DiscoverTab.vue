<template>
  <div class="tab-discover">
    <!-- 顶部导航栏 -->
    <div class="discover-header">
      <div class="d-tabs">
        <span :class="{ active: currentFeed === 'following' }" @click="switchFeed('following')">关注</span>
        <span :class="{ active: currentFeed === 'recommend' }" @click="switchFeed('recommend')">推荐</span>
      </div>

      <div class="d-actions">
        <i class="fas fa-pen-nib" @click="showPostModal = true"></i>
        <i class="fas fa-sliders-h" @click="showSettingsModal = true"></i>

        <div class="bell-wrapper" @click="showNotifyModal = true">
          <i class="fas fa-bell"></i>
          <div class="red-dot" v-if="hasUnread"></div>
        </div>
      </div>
    </div>

    <!-- 主滚动区域 -->
    <div class="scroll-container">
      <!-- 推荐流顶部功能入口 -->
      <div class="hero-actions" v-if="currentFeed === 'recommend'">
        <div class="hero-card swipe-card" @click="$emit('open-swipe')">
          <div class="card-icon"><i class="fas fa-bolt"></i></div>
          <div class="card-text">
            <h4>冷推速配</h4>
            <p>基于偏好的精准打击</p>
          </div>
        </div>

        <div class="hero-card blind-card" @click="$emit('open-random')">
          <div class="card-icon"><i class="fas fa-mask"></i></div>
          <div class="card-text">
            <h4>盲盒频道</h4>
            <p>遇见不可预知的灵魂</p>
          </div>
        </div>
      </div>

      <!-- 区块标题 -->
      <div class="feed-section-title">
        <span>{{ currentFeed === 'recommend' ? '广场实时动态' : '正在聊天的对象' }}</span>
        <i class="fas fa-sync-alt refresh-btn" :class="{ 'fa-spin': isRefreshing }" @click="forceRefresh"></i>
      </div>

      <!-- 帖子流 -->
      <div class="feed-list" v-if="activePosts.length > 0">
        <div class="feed-item" v-for="post in activePosts" :key="post.id">
          <!-- 发帖人信息 -->
          <div class="feed-header">
            <div
              class="feed-avatar"
              :style="`background-image: url(${getStableAvatar(post.nickname)})`"
              @click.stop="openProfile(post)"
            ></div>

            <div class="feed-user-info" @click="openDetail(post)">
              <div class="feed-name">
                {{ post.nickname }}
                <span class="my-post-tag" v-if="post.isMine">自己</span>
              </div>
              <div class="feed-meta">{{ post.age ? `${post.age}岁 · ` : '' }}{{ post.gender || '未知' }}</div>
            </div>

            <div class="post-time">{{ formatTime(post.timestamp) }}</div>
          </div>

          <!-- 正文 -->
          <div class="feed-content" @click="openDetail(post)">{{ post.content }}</div>

          <!-- 音乐卡片 -->
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

          <!-- 如果这条帖子本身是转发帖，展示原帖快照 -->
          <div class="repost-mini-card" v-if="post.repostOf" @click="openDetail(post)">
            <div class="repost-mini-title">转发动态</div>
            <div class="repost-mini-author">{{ post.repostOf.nickname }}</div>
            <div class="repost-mini-content">{{ post.repostOf.content }}</div>

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
          </div>

          <!-- 标签 -->
          <div class="feed-tags" v-if="post.tags && post.tags.length > 0" @click="openDetail(post)">
            <span v-for="tag in post.tags" :key="tag"><i class="fas fa-hashtag"></i> {{ tag }}</span>
          </div>

          <!-- 底部社交操作栏 -->
          <div class="feed-social-bar">
            <div class="social-btn" @click="toggleLike(post)">
              <i class="fas fa-heart" :class="{ liked: post.isLiked }"></i>
              <span :class="{ 'liked-text': post.isLiked }">{{ post.likes || 0 }}</span>
            </div>

            <div class="social-btn" @click="openDetail(post)">
              <i class="fas fa-comment-dots"></i>
              <span>{{ post.comments ? post.comments.length : 0 }}</span>
            </div>

            <div class="social-flex-spacer"></div>

            <button class="btn-dm-mini" v-if="!post.isMine" @click.stop="handleDM(post)" :disabled="isMatching">
              <i class="fas fa-comment"></i> 聊天
            </button>

            <button class="btn-del-mini" v-else @click.stop="deleteMyPost(post.id)">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- 初始加载态 -->
      <div class="loading-state" v-if="isRefreshing && activePosts.length === 0">
        <div class="radar-pulse"></div>
        <div>信号同步中...</div>
      </div>

      <!-- 空状态 -->
      <div class="empty-state" v-else-if="activePosts.length === 0 && !isRefreshing">
        <i class="fas fa-wind"></i>
        <div>这里空空如也，点击右上角刷新试试</div>
      </div>

      <div style="height: 100px;"></div>
    </div>

    <!-- 帖子详情 -->
    <PostDetailSheet
      :show="showDetailModal"
      :post="currentPost"
      :allow-chat="true"
      @close="showDetailModal = false"
      @open-profile="openProfile"
      @open-chat="handleDM"
      @reposted="handleReposted"
    />

    <!-- 简易资料卡 -->
    <div class="simple-profile-mask" v-if="showProfileModal" @click.self="showProfileModal = false">
      <div class="simple-profile-box">
        <div
          class="sp-avatar"
          :style="`background-image: url(${getStableAvatar(currentProfile?.nickname)}); background-size: cover;`"
        ></div>

        <div class="sp-name">{{ currentProfile?.nickname || '匿名网友' }}</div>
        <div class="sp-basic">{{ currentProfile?.age || '?' }}岁 / {{ currentProfile?.gender || '保密' }}</div>

        <div class="sp-tags" v-if="currentProfile?.tags && currentProfile.tags.length > 0">
          <span v-for="(t, i) in currentProfile.tags" :key="i">{{ t }}</span>
        </div>

        <div class="sp-bio" v-if="currentProfile?.content">
          <span class="sp-bio-title">近期言论</span>
          <div class="sp-bio-text">"{{ currentProfile.content.slice(0, 50) }}..."</div>
        </div>

        <button class="sp-btn-dm" v-if="!currentProfile?.isMine" @click="handleDM(currentProfile)">发起聊天</button>
      </div>
    </div>

    <!-- 发帖弹层 -->
    <div class="post-modal-mask" v-if="showPostModal">
      <div class="post-modal">
        <div class="post-header">
          <span @click="handleClosePostModal" style="color:#8e8e93; font-size:14px; cursor:pointer;">取消</span>
          <span style="font-weight:700;">发布动态</span>
          <span
            @click="handlePublish"
            style="color:#14CCCC; font-weight:700; font-size:14px; cursor:pointer;"
            :style="{ opacity: canPublish ? 1 : 0.5 }"
          >发送</span>
        </div>

        <textarea v-model="newPostContent" class="post-textarea" placeholder="此刻的想法..."></textarea>

        <div class="post-tags-input">
          <input v-model="newPostTags" placeholder="添加标签，用空格隔开" />
        </div>

        <!-- 分享当前播放歌曲 -->
        <div class="music-share-entry">
          <div class="music-share-head">
            <div class="music-share-title">附带音乐</div>
            <div class="music-share-sub">第一版仅支持分享当前正在播放的歌曲</div>
          </div>

          <div v-if="selectedMusicAttachment" class="selected-music-box">
            <div
              class="selected-music-cover"
              :style="selectedMusicAttachment.cover ? `background-image: url(${selectedMusicAttachment.cover})` : ''"
            >
              <i v-if="!selectedMusicAttachment.cover" class="fas fa-music"></i>
            </div>

            <div class="selected-music-main">
              <div class="selected-music-name">{{ selectedMusicAttachment.name }}</div>
              <div class="selected-music-artist">{{ selectedMusicAttachment.artist }}</div>
            </div>

            <button class="music-small-btn remove" @click="clearSelectedMusic">移除</button>
          </div>

          <div v-else class="music-share-actions">
            <button class="music-big-btn" @click="attachCurrentSong">
              <i class="fas fa-music"></i> 分享当前播放
            </button>
          </div>

          <div class="music-current-tip" v-if="musicState.currentSongName">
            当前播放：{{ musicState.currentSongName }} - {{ musicState.currentArtist }}
          </div>
          <div class="music-current-tip empty" v-else>
            当前没有播放歌曲，先去音乐 App 播一首吧
          </div>
        </div>
      </div>
    </div>

    <!-- 通知中心 -->
    <NotificationCenter
      v-if="showNotifyModal"
      @close="showNotifyModal = false"
      @open-post="handleNotifyOpenPost"
      @open-chat="handleNotifyOpenChat"
    />

    <!-- 广场设置面板 -->
    <FeedSettingsModal
      v-if="showSettingsModal"
      @close="showSettingsModal = false"
      @refresh="forceRefresh"
    />

    <!-- 建链加载层 -->
    <div class="dm-loading-mask" v-if="isMatching">
      <div class="dm-loading-box">
        <i class="fas fa-circle-notch fa-spin"></i>
        <p>正在建立加密链路...</p>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 广场页
 *
 * 这次新增的核心能力：
 * 1. 发布动态时支持“附带当前播放歌曲”
 * 2. 帖子流里支持渲染音乐卡片
 * 3. 点击音乐卡片时，把歌曲插入当前播放队列并打开音乐 App
 *
 * 第一版设计原则：
 * - 不碰 useMusicApi 的轮询逻辑
 * - 不嵌套搜索选歌面板
 * - 只支持“分享当前正在播放的歌曲”
 */

import { ref, computed } from 'vue'
import db from '@/db'
import { useCharacters } from '@/composables/useCharacters'
import { useDatingAvatar } from '@/composables/useDatingAvatar'
import { useDatingMatch } from '@/composables/useDatingMatch'
import { useDatingFeed } from '@/composables/useDatingFeed'
import { useMusic } from '@/composables/useMusic'

import NotificationCenter from '@/apps/dating/components/NotificationCenter.vue'
import FeedSettingsModal from '@/apps/dating/components/FeedSettingsModal.vue'
import PostDetailSheet from '@/apps/dating/components/PostDetailSheet.vue'

const emit = defineEmits(['open-chat', 'open-swipe', 'open-random'])

const { characters } = useCharacters()
const { getStableAvatar } = useDatingAvatar()
const { generateFullProfile } = useDatingMatch()
const { musicState, playSpecific } = useMusic()
const {
  feedSettings,
  recommendPosts,
  followingPosts,
  myPosts,
  notifications,
  generateRecommend,
  generateFollowing,
  publishMyPost
} = useDatingFeed()

const currentFeed = ref('recommend')
const isRefreshing = ref(false)
const isMatching = ref(false)

const showPostModal = ref(false)
const showSettingsModal = ref(false)
const showNotifyModal = ref(false)
const newPostContent = ref('')
const newPostTags = ref('')
const selectedMusicAttachment = ref(null)

const showDetailModal = ref(false)
const currentPost = ref(null)

const showProfileModal = ref(false)
const currentProfile = ref(null)

const hasUnread = computed(() => notifications.value.some(n => !n.isRead))

const activePosts = computed(() => {
  if (currentFeed.value === 'recommend') {
    return [...recommendPosts.value, ...myPosts.value].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
  }
  return [...followingPosts.value].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
})

const canPublish = computed(() => {
  return !!newPostContent.value.trim() || !!selectedMusicAttachment.value
})

const switchFeed = async (feed) => {
  currentFeed.value = feed
  if (feed === 'following') {
    await forceRefresh()
  }
}

const forceRefresh = async () => {
  if (isRefreshing.value) return
  isRefreshing.value = true
  try {
    if (currentFeed.value === 'recommend') {
      await generateRecommend()
    } else {
      await generateFollowing()
    }
  } finally {
    isRefreshing.value = false
  }
}

const formatTime = (ts) => {
  if (!ts) return '刚刚'
  const diff = Date.now() - ts
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return new Date(ts).toLocaleDateString()
}

const toggleLike = (post) => {
  post.isLiked = !post.isLiked
  post.likes = (post.likes || 0) + (post.isLiked ? 1 : -1)
}

const openDetail = (post) => {
  currentPost.value = post
  showDetailModal.value = true
}

const openProfile = (obj) => {
  if (!obj) return
  currentProfile.value = {
    ...obj,
    content: obj.content || obj.bio || ''
  }
  showProfileModal.value = true
}

/**
 * 把当前播放歌曲挂到发帖草稿上
 *
 * 第一版直接从 useMusic() 当前状态取：
 * - currentSongName
 * - currentArtist
 * - currentCoverUrl
 */
const attachCurrentSong = () => {
  if (!musicState.currentSongName) {
    window.dispatchEvent(new CustomEvent('sys-toast', { detail: '当前没有可分享的播放歌曲' }))
    return
  }

  selectedMusicAttachment.value = {
    type: 'music',
    name: musicState.currentSongName,
    artist: musicState.currentArtist || '未知歌手',
    cover: musicState.currentCoverUrl || '',
    content: ''
  }

  window.dispatchEvent(new CustomEvent('sys-toast', { detail: '已附带当前播放歌曲' }))
}

const clearSelectedMusic = () => {
  selectedMusicAttachment.value = null
}

const handleClosePostModal = () => {
  showPostModal.value = false
  newPostContent.value = ''
  newPostTags.value = ''
  selectedMusicAttachment.value = null
}

/**
 * 发布动态：
 * - 支持纯文字
 * - 支持纯音乐分享
 * - 支持文字 + 音乐卡片
 */
const handlePublish = async () => {
  if (!canPublish.value) return

  const tagsArr = newPostTags.value.split(' ').filter(Boolean)

  await publishMyPost(
    newPostContent.value.trim() || '分享一首此刻正在听的歌',
    tagsArr,
    selectedMusicAttachment.value
  )

  showPostModal.value = false
  newPostContent.value = ''
  newPostTags.value = ''
  selectedMusicAttachment.value = null
  window.dispatchEvent(new CustomEvent('sys-toast', { detail: '动态发布成功' }))
}

const deleteMyPost = (id) => {
  if (confirm('确定删除这条动态吗？')) {
    myPosts.value = myPosts.value.filter(p => p.id !== id)
    if (currentPost.value && currentPost.value.id === id) {
      showDetailModal.value = false
    }
    window.dispatchEvent(new CustomEvent('sys-toast', { detail: '动态已删除' }))
  }
}

/**
 * 点击帖子里的音乐附件：
 * - 用最小 song 对象塞给 useMusic().playSpecific
 * - 然后尝试打开音乐 App（通过全局事件）
 *
 * 这里不依赖 useMusicApi 的轮询修改，
 * 只是把 name/artist/cachedCover 丢给现有播放链路。
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
    console.error('播放帖子中的音乐失败', e)
    window.dispatchEvent(new CustomEvent('sys-toast', { detail: '播放失败，请稍后重试' }))
  }
}

const handleDM = async (targetObj) => {
  if (!targetObj) return

  showProfileModal.value = false

  if (targetObj.chatId) {
    emit('open-chat', targetObj.chatId)
    return
  }

  isMatching.value = true

  try {
    if (targetObj.realCharId) {
      const realChar = characters.value.find(c => c.id === targetObj.realCharId)
      if (realChar) {
        const fakeProfile = {
          nickname: targetObj.nickname,
          baseInfo: {
            bio: targetObj.content || targetObj.bio || '在广场偶遇的人',
            appearance_summary: '一个让你觉得似曾相识的人',
            age: targetObj.age || 20,
            gender: targetObj.gender || '保密'
          },
          tags: targetObj.tags || [],
          fullJson: {},
          realCharId: targetObj.realCharId
        }

        const pid = await db.dating_profiles.add(fakeProfile)
        const cid = await db.dating_chats.add({
          profileId: pid,
          messageCount: 0,
          status: 'active',
          type: 'feed'
        })

        window.dispatchEvent(new CustomEvent('dating-refresh-chats'))
        emit('open-chat', cid)
        return
      }
    }

    const diyPrefix = feedSettings.value?.diyPrompt ? `【世界观背景设定：${feedSettings.value.diyPrompt}】\n` : ''
    const enhancedObj = {
      nickname: targetObj.nickname || '匿名网友',
      age: targetObj.age || 20,
      gender: targetObj.gender || '保密',
      tags: targetObj.tags || [],
      bio: diyPrefix + (targetObj.content || targetObj.bio || '一个在广场遇到的人')
    }

    const res = await generateFullProfile(enhancedObj, false)
    if (res.success) {
      window.dispatchEvent(new CustomEvent('dating-refresh-chats'))
      emit('open-chat', res.chatId)
    } else {
      window.dispatchEvent(new CustomEvent('sys-toast', { detail: '聊天建立失败：' + res.error }))
    }
  } catch (e) {
    console.error(e)
    window.dispatchEvent(new CustomEvent('sys-toast', { detail: '链路建立异常' }))
  } finally {
    isMatching.value = false
  }
}

const findPostById = (postId) => {
  let target = recommendPosts.value.find(item => item.id === postId)
  if (target) return { post: target, feed: 'recommend' }

  target = myPosts.value.find(item => item.id === postId)
  if (target) return { post: target, feed: 'recommend' }

  target = followingPosts.value.find(item => item.id === postId)
  if (target) return { post: target, feed: 'following' }

  return null
}

const handleNotifyOpenPost = (postId) => {
  showNotifyModal.value = false
  const result = findPostById(postId)
  if (!result) {
    window.dispatchEvent(new CustomEvent('sys-toast', { detail: '原帖已不存在或尚未加载' }))
    return
  }
  currentFeed.value = result.feed
  currentPost.value = result.post
  showDetailModal.value = true
}

const handleNotifyOpenChat = (chatId) => {
  showNotifyModal.value = false
  emit('open-chat', chatId)
}

const handleReposted = () => {
  window.dispatchEvent(new CustomEvent('sys-toast', { detail: '转发成功，已出现在你的主页动态里' }))
}

if (recommendPosts.value.length === 0) {
  forceRefresh()
}
</script>

<style scoped>
.tab-discover {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f4f5f7;
  overflow: hidden;
  position: relative;
}

.discover-header {
  flex-shrink: 0;
  padding: 15px 20px 15px;
  background: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e5e5ea;
  z-index: 10;
}

.d-tabs {
  display: flex;
  gap: 20px;
  font-size: 18px;
  font-weight: 700;
  color: #8e8e93;
}

.d-tabs span {
  cursor: pointer;
  position: relative;
  padding-bottom: 4px;
  transition: color 0.3s;
}

.d-tabs span.active {
  color: #1c1c1e;
  font-size: 20px;
  font-weight: 800;
}

.d-tabs span.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 12px;
  height: 3px;
  background: #14CCCC;
  border-radius: 2px;
}

.d-actions {
  display: flex;
  gap: 18px;
  align-items: center;
  color: #1c1c1e;
  font-size: 18px;
}

.d-actions i {
  cursor: pointer;
}

.bell-wrapper {
  position: relative;
  cursor: pointer;
}

.red-dot {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 8px;
  height: 8px;
  background: #ff3b30;
  border-radius: 50%;
  border: 2px solid #fff;
}

.scroll-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}

.hero-actions {
  display: flex;
  gap: 15px;
  padding: 20px 15px;
}

.hero-card {
  flex: 1;
  border-radius: 20px;
  padding: 20px 15px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  color: white;
  box-shadow: 0 10px 20px rgba(0,0,0,0.1);
}

.hero-card:active {
  transform: scale(0.95);
}

.swipe-card {
  background: linear-gradient(135deg, #ff416c, #ff4b2b);
}

.blind-card {
  background: linear-gradient(135deg, #14CCCC, #0db4b4);
}

.card-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255,255,255,0.2);
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 20px;
}

.card-text h4 {
  margin: 0 0 4px 0;
  font-size: 15px;
  font-weight: 800;
}

.card-text p {
  margin: 0;
  font-size: 11px;
  opacity: 0.9;
}

.feed-section-title {
  padding: 0 20px 10px;
  font-size: 14px;
  font-weight: 800;
  color: #1c1c1e;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.refresh-btn {
  color: #8e8e93;
  font-size: 14px;
  padding: 5px;
  cursor: pointer;
}

.feed-list {
  padding: 0 15px 15px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.feed-item {
  background: #fff;
  border-radius: 20px;
  padding: 16px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.03);
}

.feed-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  position: relative;
}

.feed-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background-color: #ddd;
  background-size: cover;
  background-position: center;
  cursor: pointer;
}

.feed-user-info {
  flex: 1;
  cursor: pointer;
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
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.feed-meta {
  font-size: 11px;
  color: #8e8e93;
  margin-top: 2px;
}

.post-time {
  position: absolute;
  right: 0;
  top: 0;
  font-size: 10px;
  color: #c7c7cc;
}

.feed-content {
  font-size: 14px;
  color: #333;
  line-height: 1.6;
  margin-bottom: 12px;
  white-space: pre-wrap;
  cursor: pointer;
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
  margin-bottom: 12px;
  cursor: pointer;
  color: #fff;
}

.music-attachment-card.inner {
  margin-top: 10px;
  margin-bottom: 0;
}

.music-attachment-card:active {
  transform: scale(0.99);
}

.music-cover {
  width: 54px;
  height: 54px;
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

.repost-mini-card {
  background: #f7f8fa;
  border: 1px solid #ebecef;
  border-radius: 14px;
  padding: 12px;
  margin-bottom: 12px;
  cursor: pointer;
}

.repost-mini-title {
  font-size: 10px;
  color: #8e8e93;
  margin-bottom: 4px;
}

.repost-mini-author {
  font-size: 12px;
  font-weight: 700;
  color: #1c1c1e;
  margin-bottom: 6px;
}

.repost-mini-content {
  font-size: 12px;
  color: #4b5563;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

.feed-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 15px;
  cursor: pointer;
}

.feed-tags span {
  font-size: 11px;
  color: #14CCCC;
  background: rgba(20, 204, 204, 0.1);
  padding: 4px 10px;
  border-radius: 6px;
  font-weight: 600;
}

.feed-social-bar {
  display: flex;
  align-items: center;
  gap: 20px;
  border-top: 1px solid #f4f5f7;
  padding-top: 12px;
}

.social-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #8e8e93;
  font-size: 13px;
  cursor: pointer;
}

.social-btn i {
  font-size: 16px;
  transition: transform 0.2s;
}

.social-btn i.liked {
  color: #ff3b30;
}

.social-btn span.liked-text {
  color: #ff3b30;
  font-weight: 600;
}

.social-flex-spacer {
  flex: 1;
}

.btn-dm-mini {
  background: #1c1c1e;
  color: #fff;
  border: none;
  padding: 6px 16px;
  border-radius: 16px;
  font-weight: 600;
  font-size: 11px;
  cursor: pointer;
}

.btn-del-mini {
  background: #f4f5f7;
  color: #ff3b30;
  border: none;
  padding: 6px 12px;
  border-radius: 16px;
  cursor: pointer;
}

.simple-profile-mask {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 1200;
  display: flex;
  justify-content: center;
  align-items: center;
  backdrop-filter: blur(5px);
}

.simple-profile-box {
  background: #fff;
  width: 75%;
  border-radius: 24px;
  padding: 30px 24px;
  text-align: center;
  animation: pop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 20px 40px rgba(0,0,0,0.2);
}

@keyframes pop {
  0% { transform: scale(0.9); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.sp-avatar {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: #f4f5f7;
  margin: 0 auto 15px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
}

.sp-name {
  font-size: 18px;
  font-weight: 800;
  color: #1c1c1e;
  margin-bottom: 4px;
}

.sp-basic {
  font-size: 12px;
  color: #8e8e93;
  margin-bottom: 16px;
}

.sp-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  margin-bottom: 20px;
}

.sp-tags span {
  background: rgba(20, 204, 204, 0.1);
  color: #14CCCC;
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 6px;
  font-weight: 600;
}

.sp-bio {
  font-size: 12px;
  color: #555;
  line-height: 1.6;
  background: #f9f9f9;
  padding: 16px;
  border-radius: 16px;
  text-align: left;
  margin-bottom: 20px;
}

.sp-bio-title {
  font-weight: 700;
  color: #1c1c1e;
  margin-bottom: 6px;
  display: block;
  font-size: 11px;
  text-transform: uppercase;
}

.sp-bio-text {
  font-style: italic;
}

.sp-btn-dm {
  width: 100%;
  padding: 14px;
  border-radius: 16px;
  background: #1c1c1e;
  color: #fff;
  border: none;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.loading-state,
.empty-state {
  padding: 40px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #8e8e93;
  font-size: 13px;
  text-align: center;
}

.radar-pulse {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid #14CCCC;
  animation: radar 1s infinite ease-out;
  margin-bottom: 15px;
}

@keyframes radar {
  0% { transform: scale(0.5); opacity: 1; }
  100% { transform: scale(1.5); opacity: 0; }
}

.empty-state i {
  font-size: 40px;
  opacity: 0.3;
  margin-bottom: 15px;
}

.dm-loading-mask {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 1300;
  display: flex;
  justify-content: center;
  align-items: center;
}

.dm-loading-box {
  background: #fff;
  padding: 24px 30px;
  border-radius: 16px;
  text-align: center;
  color: #1c1c1e;
  font-weight: 600;
  font-size: 14px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.2);
}

.dm-loading-box i {
  color: #14CCCC;
  font-size: 24px;
  margin-bottom: 10px;
  display: block;
}

.post-modal-mask {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.6);
  z-index: 1250;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.post-modal {
  background: #fff;
  border-radius: 24px 24px 0 0;
  padding: 20px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.post-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.post-textarea {
  width: 100%;
  height: 120px;
  border: none;
  background: #f9f9f9;
  border-radius: 12px;
  padding: 15px;
  font-size: 15px;
  resize: none;
  outline: none;
  box-sizing: border-box;
  color: #1c1c1e;
}

.post-tags-input {
  margin-top: 15px;
}

.post-tags-input input {
  width: 100%;
  border: 1px solid #e5e5ea;
  border-radius: 12px;
  padding: 12px 15px;
  font-size: 13px;
  outline: none;
  box-sizing: border-box;
}

/* 发帖面板中的音乐附带区域 */
.music-share-entry {
  margin-top: 16px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 14px;
}

.music-share-head {
  margin-bottom: 10px;
}

.music-share-title {
  font-size: 13px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 4px;
}

.music-share-sub {
  font-size: 11px;
  color: #8e8e93;
  line-height: 1.5;
}

.selected-music-box {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #111827;
  border-radius: 14px;
  padding: 12px;
  color: #fff;
}

.selected-music-cover {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: rgba(255,255,255,0.08);
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #14CCCC;
  flex-shrink: 0;
}

.selected-music-main {
  flex: 1;
  min-width: 0;
}

.selected-music-name {
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.selected-music-artist {
  font-size: 11px;
  color: rgba(255,255,255,0.72);
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.music-share-actions {
  display: flex;
  justify-content: flex-start;
}

.music-big-btn {
  border: none;
  background: #111827;
  color: #fff;
  padding: 11px 16px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.music-small-btn {
  border: none;
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.music-small-btn.remove {
  background: rgba(255,255,255,0.12);
  color: #fff;
}

.music-current-tip {
  margin-top: 10px;
  font-size: 11px;
  color: #4b5563;
  line-height: 1.5;
}

.music-current-tip.empty {
  color: #9ca3af;
}
</style>
