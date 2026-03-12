<template>
  <div class="content-area">
    <div style="font-size:12px; color:var(--text-sub);">
      勾选单选框激活全局人设。在特定聊天设置中可以覆盖此选项。
    </div>

    <div class="list-item" v-for="p in personas" :key="p.id">
      <div class="item-avatar" :style="p.avatar ? `background-image: url(${p.avatar})` : ''">
        {{ !p.avatar ? p.title.charAt(0) : '' }}
      </div>
      <div class="item-info">
        <div class="item-name">
          {{ p.title }} 
          <span style="font-size:10px; color:var(--text-sub); font-weight:normal;">(代入名: {{ p.name }})</span>
        </div>
        <div class="item-desc">{{ p.content }}</div>
      </div>
      <i class="fas fa-edit" style="color:var(--text-sub); padding:8px; cursor:pointer;" @click="openEditModal(p)"></i>
      <input
        type="radio"
        name="activePersona"
        :checked="p.isActive"
        @change="setActivePersona(p.id)"
        style="width:18px; height:18px; accent-color:var(--text-main); flex-shrink:0; margin:0 5px;"
      />
      <i class="fas fa-trash btn-delete" @click="deletePersona(p.id)"></i>
    </div>

    <!-- 隐藏的图片上传框 -->
    <input type="file" ref="fileInput" accept="image/*" style="display:none;" @change="handleFileChange" />

    <InnerModal :show="showModal" @close="showModal = false">
      <div class="modal-title">{{ editingId ? '编辑人设' : '新建人设' }}</div>
      
      <div style="display:flex; gap:15px; align-items:center;">
        <!-- 头像区 -->
        <div 
          style="width:60px; height:60px; border-radius:50%; background:#f4f5f7; border:1px dashed #ccc; display:flex; justify-content:center; align-items:center; cursor:pointer; flex-shrink:0; background-size:cover; background-position:center; overflow:hidden;"
          :style="form.avatar ? `background-image: url(${form.avatar})` : ''"
          @click="$refs.fileInput.click()"
        >
          <i v-if="!form.avatar" class="fas fa-camera" style="color:#aaa;"></i>
        </div>
        <div style="flex:1; display:flex; flex-direction:column; gap:8px;">
          <input class="modal-input" style="padding:8px 12px; font-size:13px;" v-model="form.title" placeholder="预设管理名 (如：末日生存者)" />
          <input class="modal-input" style="padding:8px 12px; font-size:13px;" v-model="form.name" placeholder="对话中展示的昵称 (如：林克)" />
        </div>
      </div>
      <div style="font-size:10px; color:#5c8aff; cursor:pointer; text-align:right;" @click="setAvatarUrl">使用网络图片 URL</div>

      <textarea class="modal-textarea" style="height:120px;" v-model="form.content" placeholder="详细描述你在这个设定下的背景、性格、说话方式，将作为 System Prompt 注入..."></textarea>
      
      <div class="modal-actions">
        <button class="btn-cancel" @click="showModal = false">取消</button>
        <button class="btn-confirm" @click="handleSave">保存</button>
      </div>
    </InnerModal>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { usePersona } from '@/composables/usePersona'
import InnerModal from '@/components/InnerModal.vue'

const emit = defineEmits(['need-modal-ref'])

const { personas, savePersona, updatePersona, deletePersona, setActivePersona } = usePersona()

const showModal = ref(false)
const editingId = ref(null)
const form = ref({ title: '', name: '', avatar: '', content: '' })

const fileInput = ref(null)

const openEditModal = (p) => {
  editingId.value = p.id
  form.value = { title: p.title, name: p.name, avatar: p.avatar, content: p.content }
  showModal.value = true
}

const handleFileChange = (e) => {
  const file = e.target.files[0]
  if (!file) return
  if (file.size > 2 * 1024 * 1024) return alert('图片过大')
  const reader = new FileReader()
  reader.onload = (ev) => { form.value.avatar = ev.target.result; fileInput.value.value = '' }
  reader.readAsDataURL(file)
}

const setAvatarUrl = () => {
  const url = prompt('输入图片 URL:', form.value.avatar)
  if (url !== null) form.value.avatar = url
}

const handleSave = () => {
  if (!form.value.title) return alert('预设名不能为空')
  if (editingId.value) {
    updatePersona(editingId.value, form.value)
  } else {
    savePersona(form.value)
  }
  showModal.value = false
}

// 暴露给外部(QQApp)控制新建弹窗
defineExpose({ 
  openModal: () => { 
    editingId.value = null
    form.value = { title: '', name: '', avatar: '', content: '' }
    showModal.value = true 
  } 
})
</script>
