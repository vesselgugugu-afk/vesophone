<template>
  <div class="content-area">
    <div class="ins-card glass" style="height:140px; cursor:pointer;" @click="showEditModal = true">
      <div class="ins-bg"></div>
      <div class="ins-avatar" :style="userProfile.avatar ? `background-image: url(${userProfile.avatar})` : ''"></div>
      <div class="ins-content">
        <div class="ins-name">
          {{ userProfile.name }}
          <i class="fas fa-edit" style="font-size:10px; color:#888;"></i>
        </div>
        <div class="ins-sign">{{ userProfile.bio }}</div>
      </div>
    </div>

    <div class="menu-list">
      <div class="menu-item" @click="$emit('go', 'persona')">
        <span><i class="fas fa-id-badge" style="margin-right:10px; color:var(--text-sub);"></i>我的人设管理</span>
        <i class="fas fa-chevron-right" style="color:var(--text-sub);"></i>
      </div>
      <div class="menu-item" @click="$emit('go', 'order')">
        <span><i class="fas fa-sort-amount-down" style="margin-right:10px; color:var(--text-sub);"></i>提示词注入</span>
        <i class="fas fa-chevron-right" style="color:var(--text-sub);"></i>
      </div>
    </div>

    <!-- 本体信息编辑美化弹窗 -->
    <transition name="fade">
      <div v-if="showEditModal" style="position:absolute; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:50; display:flex; justify-content:center; align-items:center; padding:20px;">
        <div style="background:#fff; width:100%; border-radius:24px; padding:20px; box-shadow:0 10px 30px rgba(0,0,0,0.1); display:flex; flex-direction:column; gap:15px;">
          <div style="font-weight:600; text-align:center; font-size:16px;">编辑本体资料</div>
          
          <div style="display:flex; justify-content:center;">
            <div 
              style="width:80px; height:80px; border-radius:50%; background:#f4f5f7; border:2px dashed #ddd; display:flex; justify-content:center; align-items:center; cursor:pointer; background-size:cover; background-position:center; position:relative;"
              :style="editForm.avatar ? `background-image: url(${editForm.avatar})` : ''"
              @click="$refs.meAvatarInput.click()"
            >
              <i v-if="!editForm.avatar" class="fas fa-camera" style="color:#aaa; font-size:24px;"></i>
              <div v-else style="position:absolute; bottom:-5px; right:-5px; background:#fff; border-radius:50%; width:24px; height:24px; display:flex; justify-content:center; align-items:center; box-shadow:0 2px 5px rgba(0,0,0,0.1);"><i class="fas fa-camera" style="font-size:10px; color:#666;"></i></div>
            </div>
            <input type="file" ref="meAvatarInput" accept="image/*" style="display:none;" @change="onMeAvatarChange" />
          </div>

          <div style="display:flex; justify-content:center; font-size:11px; color:#5c8aff; margin-top:-5px; cursor:pointer;" @click="setMeAvatarUrl">或使用网络图片 URL</div>

          <div style="display:flex; flex-direction:column; gap:6px;">
            <label style="font-size:11px; color:#888;">昵称</label>
            <input style="padding:12px; background:#f4f5f7; border:none; border-radius:12px; outline:none; font-size:14px;" v-model="editForm.name" />
          </div>

          <div style="display:flex; flex-direction:column; gap:6px;">
            <label style="font-size:11px; color:#888;">个性签名</label>
            <input style="padding:12px; background:#f4f5f7; border:none; border-radius:12px; outline:none; font-size:14px;" v-model="editForm.bio" />
          </div>

          <div style="display:flex; gap:10px; margin-top:10px;">
            <button style="flex:1; padding:12px; border-radius:12px; border:none; background:#f0f0f0; color:#333; font-weight:600;" @click="showEditModal = false">取消</button>
            <button style="flex:1; padding:12px; border-radius:12px; border:none; background:var(--text-main); color:#fff; font-weight:600;" @click="saveProfile">保存</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useProfile } from '@/composables/useProfile'

defineEmits(['go'])

const { userProfile } = useProfile()
const showEditModal = ref(false)
const editForm = ref({ name: '', bio: '', avatar: '' })
const meAvatarInput = ref(null)

// 监听弹窗打开，初始化数据
import { watch } from 'vue'
watch(showEditModal, (val) => {
  if (val) {
    editForm.value = { name: userProfile.value.name, bio: userProfile.value.bio, avatar: userProfile.value.avatar || '' }
  }
})

const onMeAvatarChange = (e) => {
  const file = e.target.files[0]
  if (!file) return
  if (file.size > 2 * 1024 * 1024) return alert('图片过大')
  const reader = new FileReader()
  reader.onload = (ev) => { editForm.value.avatar = ev.target.result; meAvatarInput.value.value = '' }
  reader.readAsDataURL(file)
}

const setMeAvatarUrl = () => {
  const url = prompt('输入图片 URL:', editForm.value.avatar)
  if (url !== null) editForm.value.avatar = url
}

const saveProfile = () => {
  userProfile.value.name = editForm.value.name
  userProfile.value.bio = editForm.value.bio
  userProfile.value.avatar = editForm.value.avatar
  showEditModal.value = false
}
</script>

