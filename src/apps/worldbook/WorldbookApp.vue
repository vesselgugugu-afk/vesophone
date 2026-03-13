<template>
  <transition name="slide-up">
    <div v-if="show" class="app-window">
      <div class="app-header">
        <div class="btn-back" @click="$emit('close')">返回</div>
        <div class="app-title">世界书</div>
        <div class="header-right" style="display:flex; gap:12px; font-size:14px; align-items:center;">
          <i class="fas fa-file-import" @click="triggerImport" style="color:var(--text-sub);" title="导入 JSON"></i>
          <i class="fas fa-file-export" @click="handleExportGroup" style="color:var(--text-sub);" title="导出当前组"></i>
          <i v-if="activeGroup !== 'All'" class="fas fa-trash" @click="handleDeleteGroup" style="color:#ff5252;" title="删除当前组"></i>
          <i class="fas fa-plus" @click="openCreateModal" style="color:var(--text-main);"></i>
        </div>
      </div>

      <input type="file" ref="fileInput" accept=".json" style="display:none;" @change="onFileChange" />

      <div class="wb-layout">
        <WorldbookSidebar :groups="wbGroups" v-model="activeGroup" />
        <WorldbookList :items="filteredWorldbooks" @delete="deleteWb" @edit="openEditModal" />
      </div>

      <!-- 新建/编辑 世界书弹窗 -->
      <InnerModal :show="showModal" @close="closeModal">
        <div class="modal-title">{{ form.id ? '编辑世界书条目' : '新建世界书条目' }}</div>
        <input class="modal-input" v-model="form.title" placeholder="关键词 / 标题" />
        <input class="modal-input" v-model="form.group" placeholder="分组名称（如：地点、世界观）" />
        <textarea class="modal-textarea" v-model="form.content" placeholder="要注入的内容..."></textarea>
        <div class="modal-hint">开启后此条目将作为全局世界书注入所有对话</div>
        <div class="modal-actions">
          <button class="btn-cancel" @click="closeModal">取消</button>
          <button class="btn-confirm" @click="handleSave">保存</button>
        </div>
      </InnerModal>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useWorldbook } from '@/composables/useWorldbook'
import WorldbookSidebar from './WorldbookSidebar.vue'
import WorldbookList from './WorldbookList.vue'
import InnerModal from '@/components/InnerModal.vue'

defineProps({ show: Boolean })
defineEmits(['close'])

const { worldbooks, wbGroups, saveWb, deleteWb, deleteGroup, exportGroupJson, importGroupJson } = useWorldbook()

const activeGroup = ref('All')
const showModal = ref(false)
const form = ref({ title: '', group: '', content: '' })
const fileInput = ref(null)

const filteredWorldbooks = computed(() => {
  if (activeGroup.value === 'All') return worldbooks.value
  return worldbooks.value.filter((w) => (w.group || '通用') === activeGroup.value)
})

const openCreateModal = () => {
  form.value = { title: '', group: activeGroup.value === 'All' ? '' : activeGroup.value, content: '' }
  showModal.value = true
}

const openEditModal = (wb) => {
  form.value = JSON.parse(JSON.stringify(wb))
  showModal.value = true
}

const closeModal = () => {
  form.value = { title: '', group: '', content: '' }
  showModal.value = false
}

const handleSave = () => {
  if (form.value.id) {
    const idx = worldbooks.value.findIndex(w => w.id === form.value.id)
    if (idx !== -1) {
      worldbooks.value[idx] = { ...worldbooks.value[idx], ...form.value }
    }
    closeModal()
  } else {
    if (saveWb(form.value)) {
      closeModal()
    }
  }
}

const handleDeleteGroup = () => {
  if (confirm(`确定要删除 [${activeGroup.value}] 组下的所有世界书吗？此操作不可逆！`)) {
    deleteGroup(activeGroup.value)
    activeGroup.value = 'All'
    window.dispatchEvent(new CustomEvent('sys-toast', { detail: '分组已删除' }))
  }
}

const handleExportGroup = () => {
  const jsonStr = exportGroupJson(activeGroup.value)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `worldbook-${activeGroup.value}-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
  window.dispatchEvent(new CustomEvent('sys-toast', { detail: '世界书已导出' }))
}

const triggerImport = () => {
  fileInput.value.click()
}

const onFileChange = (e) => {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    const count = importGroupJson(ev.target.result)
    if (count !== false) {
      window.dispatchEvent(new CustomEvent('sys-toast', { detail: `成功导入 ${count} 条记录` }))
    } else {
      alert('导入失败，请检查 JSON 格式是否正确。')
    }
    fileInput.value.value = ''
  }
  reader.readAsText(file)
}
</script>