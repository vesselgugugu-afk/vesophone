<template>
  <div class="tab-profile">
    <div class="profile-cover">
      <i class="fas fa-cog btn-settings" @click="$emit('open-settings')"></i>
      <div class="btn-camera"><i class="fas fa-camera"></i></div>
    </div>
    
    <div class="profile-header">
      <div class="profile-avatar"><i><i class="fas fa-user"></i></i></div>
      
      <!-- 点击编辑档案信息 -->
      <div class="profile-name" @click="openEditProfile">
        {{ playerProfile.nickname }} <i class="fas fa-pen" style="font-size: 12px; color: #14CCCC; margin-left: 4px;"></i>
      </div>
      <div class="profile-desc" @click="openEditProfile">
        “{{ playerProfile.bio }}”
      </div>
    </div>

    <div class="pref-section">
      <div class="pref-box">
        <div class="pref-header">
          <div class="pref-title"><i class="fas fa-crosshairs"></i> 偏好收集箱</div>
          <div style="font-size: 10px; color: #8e8e93;">点击标签可调节权重</div>
        </div>
        <div class="pref-tags">
          <!-- 标签本体点击编辑，X号点击删除 -->
          <div class="pref-tag" v-for="tag in prefTags" :key="tag.id">
            <span class="tag-text" @click="openEditTag(tag)">
              {{ tag.tag }} <span class="tag-weight">x{{ tag.weight }}</span>
            </span>
            <i class="fas fa-times delete-tag" @click="removeTag(tag.id)"></i>
          </div>
          <!-- 添加新标签 -->
          <div class="pref-tag add-btn" @click="openAddTag">
            <i class="fas fa-plus" style="font-size: 10px;"></i> 添加
          </div>
        </div>
      </div>
    </div>

    <!-- 1. 编辑个人档案弹窗 -->
    <div class="edit-modal-mask" v-if="showEditProfileModal" @click.self="showEditProfileModal = false">
      <div class="edit-box">
        <h3 style="margin-bottom: 16px; color: #1c1c1e;">编辑个人档案</h3>
        <p style="font-size: 11px; color: #8e8e93; margin-bottom: 16px; text-align: left;">
          这些信息会在聊天开始时，通过系统底层协议偷偷塞给对方的 AI 脑海里。尝试写一些吸引人的介绍吧！
        </p>
        
        <input type="text" class="edit-input" v-model="draftProfile.nickname" placeholder="你的网名">
        <textarea class="edit-textarea" v-model="draftProfile.bio" placeholder="你的交友宣言 / 自我介绍 / 怪癖..."></textarea>
        
        <div class="edit-actions">
          <button class="btn-cancel" @click="showEditProfileModal = false">取消</button>
          <button class="btn-save" @click="saveProfile">保存设定</button>
        </div>
      </div>
    </div>

    <!-- 2. 编辑偏好标签与权重弹窗 -->
    <div class="edit-modal-mask" v-if="showEditTagModal" @click.self="showEditTagModal = false">
      <div class="edit-box">
        <h3 style="margin-bottom: 16px; color: #1c1c1e;">{{ draftTag.id ? '编辑偏好' : '新增偏好' }}</h3>
        
        <div class="form-group">
          <label style="font-size: 12px; color: #8e8e93; display: block; text-align: left; margin-bottom: 6px;">标签名称</label>
          <input type="text" class="edit-input" v-model="draftTag.tag" placeholder="如：病娇 / 强制爱 / 爹系">
        </div>

        <div class="form-group">
          <label style="font-size: 12px; color: #8e8e93; display: block; text-align: left; margin-bottom: 6px;">权重 (数值越大，推流概率越高)</label>
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

  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useDatingPlayer } from '@/composables/useDatingPlayer'
import { useDatingPrefs } from '@/composables/useDatingPrefs'

defineEmits(['open-settings'])

const { playerProfile, updatePlayer } = useDatingPlayer()
const { prefTags } = useDatingPrefs()

// --- 个人档案编辑逻辑 ---
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

// --- 标签与权重编辑逻辑 ---
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
    // 编辑现有标签
    const target = prefTags.value.find(t => t.id === draftTag.value.id)
    if (target) {
      target.tag = tName
      target.weight = tWeight
    }
  } else {
    // 新增标签
    const exist = prefTags.value.find(t => t.tag === tName)
    if (exist) {
      // 存在同名，直接累加权重
      exist.weight += tWeight
    } else {
      // 全新标签
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
  if (idx !== -1) {
    prefTags.value.splice(idx, 1)
  }
}
</script>

<style scoped>
.tab-profile { animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

.profile-cover { height: 140px; background: linear-gradient(45deg, #14CCCC, #2c3e50); position: relative; }
.btn-settings { position: absolute; top: 20px; right: 20px; color: white; cursor: pointer; z-index: 10; font-size: 18px; }
.btn-camera { position: absolute; bottom: 12px; right: 12px; color: white; opacity: 0.8; cursor: pointer; background: rgba(0,0,0,0.3); padding: 6px; border-radius: 50%; font-size: 12px;}

.profile-header { padding: 0 20px 20px; text-align: center; background: #ffffff; border-bottom: 1px solid #e5e5ea; position: relative; margin-top: -40px; border-radius: 24px 24px 0 0; }
.profile-avatar { width: 80px; height: 80px; border-radius: 50%; background: #ffffff; border: 4px solid #ffffff; color: #14CCCC; display: flex; align-items: center; justify-content: center; margin: 0 auto 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); position: relative; font-size: 32px;}
.profile-avatar i { background: rgba(20, 204, 204, 0.1); width: 100%; height: 100%; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.profile-name { font-size: 20px; font-weight: 700; color: #1c1c1e; cursor: pointer; }
.profile-desc { font-size: 12px; color: #8e8e93; margin-top: 8px; padding: 0 20px; cursor: pointer; }

.pref-section { padding: 20px; }
.pref-box { background: #ffffff; border-radius: 16px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); margin-bottom: 20px; }
.pref-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.pref-title { font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 6px; color: #1c1c1e; }
.pref-tags { display: flex; flex-wrap: wrap; gap: 8px; }

/* 优化标签内元素的点击区域布局 */
.pref-tag { font-size: 12px; padding: 0 10px; border: 1px solid #14CCCC; color: #14CCCC; border-radius: 16px; display: flex; align-items: center; height: 28px; }
.tag-text { cursor: pointer; display: flex; align-items: center; gap: 4px; padding-right: 6px; }
.tag-weight { opacity: 0.6; font-size: 10px; font-weight: 600; }
.delete-tag { color: #ff3b30; cursor: pointer; padding: 4px; border-left: 1px solid rgba(20, 204, 204, 0.2); margin-left: 2px; }
.pref-tag.add-btn { border-style: dashed; color: #8e8e93; border-color: #c7c7cc; cursor: pointer; padding: 0 12px; }

/* 弹窗通用样式 */
.edit-modal-mask { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 500; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(5px); }
.edit-box { background: #ffffff; width: 80%; border-radius: 24px; padding: 24px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.2); animation: pop 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes pop { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }

.form-group { margin-bottom: 12px; }
.edit-input, .edit-textarea { width: 100%; padding: 12px; border: 1px solid #e5e5ea; border-radius: 12px; font-size: 14px; background: #f4f5f7; outline: none; box-sizing: border-box; font-family: inherit; }
.edit-textarea { height: 100px; resize: none; margin-bottom: 0; }

.edit-actions { display: flex; gap: 12px; margin-top: 10px; }
.edit-actions button { flex: 1; padding: 12px; border-radius: 12px; border: none; font-weight: 600; font-size: 14px; cursor: pointer; transition: transform 0.1s; }
.edit-actions button:active { transform: scale(0.95); }
.btn-cancel { background: #f4f5f7; color: #8e8e93; }
.btn-save { background: #14CCCC; color: white; box-shadow: 0 4px 12px rgba(20, 204, 204, 0.2); }
</style>
