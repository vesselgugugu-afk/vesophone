<template>
  <div class="tab-profile">
    <!-- 顶部封面 -->
    <div class="profile-cover">
      <i class="fas fa-cog btn-settings" @click="$emit('open-settings')"></i>
      <div class="btn-camera"><i class="fas fa-camera"></i></div>
    </div>
    
    <!-- 基本资料 -->
    <div class="profile-header">
      <div class="profile-avatar"><i><i class="fas fa-user"></i></i></div>
      
      <div class="profile-name" @click="openEditProfile">
        {{ playerProfile.nickname }} <i class="fas fa-pen" style="font-size: 12px; color: #14CCCC; margin-left: 4px;"></i>
      </div>
      <div class="profile-desc" @click="openEditProfile">
        “{{ playerProfile.bio }}”
      </div>
    </div>

    <!-- 主内容 -->
    <div class="pref-section">
      <!-- 偏好收集箱 -->
      <div class="pref-box">
        <div class="pref-header">
          <div class="pref-title"><i class="fas fa-crosshairs"></i> 偏好收集箱</div>
          <div style="font-size: 10px; color: #8e8e93;">点击标签可调节权重</div>
        </div>

        <div class="pref-tags">
          <div class="pref-tag" v-for="tag in prefTags" :key="tag.id">
            <span class="tag-text" @click="openEditTag(tag)">
              {{ tag.tag }} <span class="tag-weight">x{{ tag.weight }}</span>
            </span>
            <i class="fas fa-times delete-tag" @click="removeTag(tag.id)"></i>
          </div>

          <div class="pref-tag add-btn" @click="openAddTag">
            <i class="fas fa-plus" style="font-size: 10px;"></i> 添加
          </div>
        </div>
      </div>

      <!-- 我的动态 -->
      <div class="pref-box" style="margin-top: 20px;">
        <div class="pref-header">
          <div class="pref-title"><i class="fas fa-history"></i> 我的动态</div>
          <div style="font-size: 10px; color: #8e8e93;">{{ myPosts.length }} 条记录</div>
        </div>

        <div class="my-posts-list">
          <div v-if="myPosts.length === 0" class="empty-panel-tip">
            暂无动态，快去广场发一条吧！
          </div>

          <div class="my-post-item" v-for="post in myPosts" :key="post.id" @click="openDetail(post)">
            <div class="post-time">{{ formatTime(post.timestamp) }}</div>
            <div class="post-content">{{ post.content }}</div>

            <!-- 当前帖子自己的音乐附件 -->
            <div
              class="music-attachment-card"
              v-if="post.attachment && post.attachment.type === 'music'"
              @click.stop="handleClickMusicAttachment(post.attachment)"
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

            <!-- 如果自己的这条动态是转发贴，这里展示原帖摘要 -->
            <div class="repost-mini-card" v-if="post.repostOf">
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

            <div class="post-tags" v-if="post.tags && post.tags.length > 0">
              <span v-for="tag in post.tags" :key="tag"><i class="fas fa-hashtag"></i> {{ tag }}</span>
            </div>
            
            <div class="post-bottom-info">
              <span class="post-comment-stat"><i class="fas fa-comment-dots"></i> {{ post.comments ? post.comments.length : 0 }} 评论</span>
              <div class="post-actions">
                <button @click.stop="openEditPost(post)"><i class="fas fa-edit"></i></button>
                <button class="danger" @click.stop="deleteMyPost(post.id)"><i class="fas fa-trash"></i></button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 收到的互动 -->
      <div class="pref-box">
        <div class="pref-header">
          <div class="pref-title"><i class="fas fa-bell"></i> 收到的互动</div>
          <div style="font-size: 10px; color: #8e8e93;">{{ interactionList.length }} 条</div>
        </div>

        <div class="interaction-list">
          <div v-if="interactionList.length === 0" class="empty-panel-tip">
            目前还没有新的互动
          </div>

          <div
            class="interaction-item"
            v-for="item in interactionList"
            :key="item.id"
            :class="{ unread: !item.isRead }"
            @click="handleInteractionClick(item)"
          >
            <div class="interaction-icon">
              <i class="fas fa-at" v-if="item.type === 'mention'"></i>
              <i class="fas fa-comment-dots" v-else></i>
            </div>

            <div class="interaction-body">
              <div class="interaction-top">
                <span class="interaction-name">{{ item.fromName }}</span>
                <span class="interaction-time">{{ formatTime(item.time) }}</span>
              </div>
              <div class="interaction-text">{{ item.content }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 编辑个人档案弹层 -->
    <div class="edit-modal-mask" v-if="showEditProfileModal" @click.self="showEditProfileModal = false">
      <div class="edit-box">
        <h3 style="margin-bottom: 16px; color: #1c1c1e;">编辑个人档案</h3>
        <p style="font-size: 11px; color: #8e8e93; margin-bottom: 16px; text-align: left;">
          这些信息会在聊天开始时，通过系统底层协议偷偷塞给对方的 AI 脑海里。
        </p>

        <input type="text" class="edit-input" v-model="draftProfile.nickname" placeholder="你的网名">
        <textarea class="edit-textarea" v-model="draftProfile.bio" placeholder="你的交友宣言..."></textarea>

        <div class="edit-actions">
          <button class="btn-cancel" @click="showEditProfileModal = false">取消</button>
          <button class="btn-save" @click="saveProfile">保存</button>
        </div>
      </div>
    </div>

    <!-- 编辑标签弹层 -->
    <div class="edit-modal-mask" v-if="showEditTagModal" @click.self="showEditTagModal = false">
      <div class="edit-box">
        <h3 style="margin-bottom: 16px; color: #1c1c1e;">{{ draftTag.id ? '编辑偏好' : '新增偏好' }}</h3>

        <div class="form-group">
          <label style="font-size: 12px; color: #8e8e93; display: block; text-align: left; margin-bottom: 6px;">标签名称</label>
          <input type="text" class="edit-input" v-model="draftTag.tag" placeholder="如：病娇 / 强制爱">
        </div>

        <div class="form-group">
          <label style="font-size: 12px; color: #8e8e93; display: block; text-align: left; margin-bottom: 6px;">权重</label>
          <div style="display: flex; align-items: center; gap: 10px;">
            <input type="range" style="flex: 1; accent-color: #14CCCC;" v-model.number="draftTag.weight" min="1" max="50">
            <input type="number" class="edit-input" style="width: 60px; margin-bottom: 0; text-align: center; padding: 8px;" v-model.number="draftTag.weight" min="1" max="999">
          </div>
        </div>

        <div class="edit-actions" style="margin-top: 20px;">
          <button class="btn-cancel" @click="showEditTagModal = false">取消</button>
          <button class="btn-save" @click="saveTag">确认</button>
        </div>
      </div>
    </div>

    <!-- 编辑动态弹层 -->
    <div class="edit-modal-mask" v-if="showEditPostModal" @click.self="showEditPostModal = false">
      <div class="edit-box">
        <h3 style="margin-bottom: 16px; color: #1c1c1e;">修改动态</h3>
        <textarea class="edit-textarea" v-model="draftPost.content" placeholder="此刻的想法..."></textarea>
        <input type="text" class="edit-input" style="margin-top:12px;" v-model="draftPost.tags" placeholder="标签 (用空格隔开)">

        <div class="edit-actions" style="margin-top: 20px;">
          <button class="btn-cancel" @click="showEditPostModal = false">取消</button>
          <button class="btn-save" @click="saveEditPost">保存修改</button>
        </div>
      </div>
    </div>

    <!-- 统一帖子详情页 -->
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
  </div>
</template>

<script setup>
/**
 * “我的”页面
 *
 * 这次新增：
 * - 我的动态列表支持显示音乐分享卡片
 * - 点击卡片时可直接把歌曲塞回音乐播放器并打开音乐 App
 */

import { ref, computed } from 'vue'
import db from '@/db'
import { useDatingPlayer } from '@/composables/useDatingPlayer'
import { useDatingPrefs } from '@/composables/useDatingPrefs'
import { useDatingFeed } from '@/composables/useDatingFeed'
import { useDatingAvatar } from '@/composables/useDatingAvatar'
import { useCharacters } from '@/composables/useCharacters'
import { useDatingMatch } from '@/composables/useDatingMatch'
import { useMusic } from '@/composables/useMusic'
import PostDetailSheet from '@/apps/dating/components/PostDetailSheet.vue'

const emit = defineEmits(['open-settings', 'open-chat'])

const { playerProfile, updatePlayer } = useDatingPlayer()
const { prefTags } = useDatingPrefs()
const { myPosts, notifications, markNotificationRead, feedSettings } = useDatingFeed()
const { getStableAvatar } = useDatingAvatar()
const { characters } = useCharacters()
const { generateFullProfile } = useDatingMatch()
const { playSpecific } = useMusic()

const showDetailModal = ref(false)
const currentPost = ref(null)

const showProfileModal = ref(false)
const currentProfile = ref(null)

const interactionList = computed(() => {
  return notifications.value
    .filter(item => item.type === 'comment' || item.type === 'mention')
    .sort((a, b) => (b.time || 0) - (a.time || 0))
    .slice(0, 20)
})

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

const formatTime = (ts) => {
  if (!ts) return ''
  const diff = Date.now() - ts
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return new Date(ts).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const handleInteractionClick = (item) => {
  markNotificationRead(item.id)
  const target = myPosts.value.find(post => post.id === item.postId)
  if (!target) {
    window.dispatchEvent(new CustomEvent('sys-toast', { detail: '对应动态已不存在' }))
    return
  }
  currentPost.value = target
  showDetailModal.value = true
}

/**
 * 点击我的动态里的音乐卡片
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
    console.error('播放动态音乐失败', e)
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

  try {
    if (targetObj.realCharId) {
      const realChar = characters.value.find(c => c.id === targetObj.realCharId)
      if (realChar) {
        const fakeProfile = {
          nickname: targetObj.nickname,
          baseInfo: {
            bio: targetObj.content || targetObj.bio || '在评论区遇见的人',
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
      bio: diyPrefix + (targetObj.content || targetObj.bio || '一个在评论区遇见的人')
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
  }
}

const handleReposted = () => {
  window.dispatchEvent(new CustomEvent('sys-toast', { detail: '转发成功，已出现在你的主页动态里' }))
}

/* -------------------- 动态编辑逻辑 -------------------- */
const showEditPostModal = ref(false)
const draftPost = ref({ id: null, content: '', tags: '' })

const deleteMyPost = (id) => {
  if (confirm('确定要永久删除这条动态吗？')) {
    myPosts.value = myPosts.value.filter(p => p.id !== id)
    window.dispatchEvent(new CustomEvent('sys-toast', { detail: '动态已删除' }))
    if (currentPost.value && currentPost.value.id === id) {
      showDetailModal.value = false
    }
  }
}

const openEditPost = (post) => {
  draftPost.value = {
    id: post.id,
    content: post.content,
    tags: (post.tags || []).join(' ')
  }
  showEditPostModal.value = true
}

const saveEditPost = () => {
  const target = myPosts.value.find(p => p.id === draftPost.value.id)
  if (target) {
    target.content = draftPost.value.content
    target.tags = draftPost.value.tags.split(' ').filter(Boolean)
  }
  showEditPostModal.value = false
  window.dispatchEvent(new CustomEvent('sys-toast', { detail: '动态已更新' }))
}

/* -------------------- 个人档案编辑逻辑 -------------------- */
const showEditProfileModal = ref(false)
const draftProfile = ref({ nickname: '', bio: '' })

const openEditProfile = () => {
  draftProfile.value.nickname = playerProfile.value.nickname
  draftProfile.value.bio = playerProfile.value.bio
  showEditProfileModal.value = true
}

const saveProfile = async () => {
  if (!draftProfile.value.nickname.trim()) return
  await updatePlayer({
    nickname: draftProfile.value.nickname,
    bio: draftProfile.value.bio
  })
  window.dispatchEvent(new CustomEvent('sys-toast', { detail: '个人档案已更新，将在新聊天中生效' }))
  showEditProfileModal.value = false
}

/* -------------------- 标签编辑逻辑 -------------------- */
const showEditTagModal = ref(false)
const draftTag = ref({ id: null, tag: '', weight: 5 })

const openAddTag = () => {
  draftTag.value = { id: null, tag: '', weight: 5 }
  showEditTagModal.value = true
}

const openEditTag = (tagItem) => {
  draftTag.value = { id: tagItem.id, tag: tagItem.tag, weight: tagItem.weight }
  showEditTagModal.value = true
}

const saveTag = () => {
  const tName = draftTag.value.tag.trim()
  const tWeight = Number(draftTag.value.weight) || 1
  if (!tName) return

  if (draftTag.value.id) {
    const target = prefTags.value.find(t => t.id === draftTag.value.id)
    if (target) {
      target.tag = tName
      target.weight = tWeight
    }
  } else {
    const exist = prefTags.value.find(t => t.tag === tName)
    if (exist) {
      exist.weight += tWeight
    } else {
      prefTags.value.push({
        id: Date.now(),
        tag: tName,
        weight: tWeight,
        lastUpdated: Date.now()
      })
    }
  }

  showEditTagModal.value = false
}

const removeTag = (id) => {
  const idx = prefTags.value.findIndex(t => t.id === id)
  if (idx !== -1) prefTags.value.splice(idx, 1)
}
</script>

<style scoped>
.tab-profile {
  animation: fadeIn 0.3s ease;
  height: 100%;
  overflow-y: auto;
  background: #f4f5f7;
  position: relative;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

.profile-cover {
  height: 140px;
  background: linear-gradient(45deg, #14CCCC, #2c3e50);
  position: relative;
}

.btn-settings {
  position: absolute;
  top: 20px;
  right: 20px;
  color: white;
  cursor: pointer;
  z-index: 10;
  font-size: 18px;
}

.btn-camera {
  position: absolute;
  bottom: 12px;
  right: 12px;
  color: white;
  opacity: 0.8;
  cursor: pointer;
  background: rgba(0,0,0,0.3);
  padding: 6px;
  border-radius: 50%;
  font-size: 12px;
}

.profile-header {
  padding: 0 20px 20px;
  text-align: center;
  background: #ffffff;
  border-bottom: 1px solid #e5e5ea;
  position: relative;
  margin-top: -40px;
  border-radius: 24px 24px 0 0;
}

.profile-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #ffffff;
  border: 4px solid #ffffff;
  color: #14CCCC;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  position: relative;
  font-size: 32px;
}

.profile-avatar i {
  background: rgba(20, 204, 204, 0.1);
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.profile-name {
  font-size: 20px;
  font-weight: 700;
  color: #1c1c1e;
  cursor: pointer;
}

.profile-desc {
  font-size: 12px;
  color: #8e8e93;
  margin-top: 8px;
  padding: 0 20px;
  cursor: pointer;
}

.pref-section {
  padding: 20px;
  padding-bottom: 100px;
}

.pref-box {
  background: #ffffff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  margin-bottom: 20px;
}

.pref-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.pref-title {
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #1c1c1e;
}

.pref-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pref-tag {
  font-size: 12px;
  padding: 0 10px;
  border: 1px solid #14CCCC;
  color: #14CCCC;
  border-radius: 16px;
  display: flex;
  align-items: center;
  height: 28px;
}

.tag-text {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  padding-right: 6px;
}

.tag-weight {
  opacity: 0.6;
  font-size: 10px;
  font-weight: 600;
}

.delete-tag {
  color: #ff3b30;
  cursor: pointer;
  padding: 4px;
  border-left: 1px solid rgba(20, 204, 204, 0.2);
  margin-left: 2px;
}

.pref-tag.add-btn {
  border-style: dashed;
  color: #8e8e93;
  border-color: #c7c7cc;
  cursor: pointer;
  padding: 0 12px;
}

.empty-panel-tip {
  color: #8e8e93;
  font-size: 12px;
  text-align: center;
  padding: 20px 0;
}

.my-posts-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
}

.my-post-item {
  background: #f9f9f9;
  border-radius: 12px;
  padding: 15px;
  position: relative;
  cursor: pointer;
  border: 1px solid transparent;
  transition: border 0.2s;
}

.my-post-item:active {
  border-color: #14CCCC;
}

.post-time {
  font-size: 10px;
  color: #8e8e93;
  margin-bottom: 8px;
}

.post-content {
  font-size: 13px;
  color: #1c1c1e;
  line-height: 1.6;
  white-space: pre-wrap;
  margin-bottom: 12px;
  word-break: break-word;
}

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
  background: #f2f4f7;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 10px;
  margin-bottom: 12px;
}

.repost-mini-title {
  font-size: 10px;
  color: #8e8e93;
  margin-bottom: 4px;
}

.repost-mini-author {
  font-size: 12px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 6px;
}

.repost-mini-content {
  font-size: 12px;
  color: #4b5563;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

.post-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.post-tags span {
  font-size: 10px;
  color: #14CCCC;
  background: rgba(20, 204, 204, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.post-bottom-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #e5e5ea;
  padding-top: 12px;
  margin-top: 8px;
}

.post-comment-stat {
  color: #14CCCC;
  font-size: 11px;
  font-weight: 600;
}

.post-actions {
  display: flex;
  gap: 8px;
}

.post-actions button {
  background: #fff;
  border: 1px solid #e5e5ea;
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 11px;
  cursor: pointer;
  color: #333;
  display: flex;
  align-items: center;
}

.post-actions button:active {
  background: #f4f5f7;
}

.post-actions button.danger {
  color: #ff3b30;
  border-color: rgba(255,59,48,0.2);
  background: rgba(255,59,48,0.05);
}

.interaction-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.interaction-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background: #f9fafb;
  cursor: pointer;
  border: 1px solid transparent;
}

.interaction-item.unread {
  background: rgba(20, 204, 204, 0.06);
}

.interaction-item:active {
  border-color: #14CCCC;
}

.interaction-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #14CCCC;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 14px;
}

.interaction-body {
  flex: 1;
  min-width: 0;
}

.interaction-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 4px;
}

.interaction-name {
  font-size: 13px;
  font-weight: 700;
  color: #1c1c1e;
}

.interaction-time {
  font-size: 10px;
  color: #8e8e93;
  flex-shrink: 0;
}

.interaction-text {
  font-size: 12px;
  color: #4b5563;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.edit-modal-mask {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.6);
  z-index: 1200;
  display: flex;
  justify-content: center;
  align-items: center;
  backdrop-filter: blur(5px);
}

.edit-box {
  background: #ffffff;
  width: 80%;
  border-radius: 24px;
  padding: 24px;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0,0,0,0.2);
  animation: pop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes pop {
  0% { transform: scale(0.9); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.form-group {
  margin-bottom: 12px;
}

.edit-input,
.edit-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #e5e5ea;
  border-radius: 12px;
  font-size: 14px;
  background: #f4f5f7;
  outline: none;
  box-sizing: border-box;
  font-family: inherit;
}

.edit-textarea {
  height: 100px;
  resize: none;
  margin-bottom: 0;
}

.edit-actions {
  display: flex;
  gap: 12px;
  margin-top: 10px;
}

.edit-actions button {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  border: none;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
}

.btn-cancel {
  background: #f4f5f7;
  color: #8e8e93;
}

.btn-save {
  background: #14CCCC;
  color: white;
  box-shadow: 0 4px 12px rgba(20, 204, 204, 0.2);
}

.simple-profile-mask {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 1250;
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
  animation: popProfile 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 20px 40px rgba(0,0,0,0.2);
}

@keyframes popProfile {
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
</style>
