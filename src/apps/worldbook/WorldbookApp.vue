<template>
  <transition name="slide-up">
    <div v-if="show" class="app-window">
      <div class="app-header">
        <div class="btn-back" @click="$emit('close')">返回</div>
        <div class="app-title">世界书</div>
        <div class="header-right">
          <!-- 点击加号时清空表单，进入新建模式 -->
          <i class="fas fa-plus" @click="openCreateModal"></i>
        </div>
      </div>

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

const { worldbooks, wbGroups, saveWb, deleteWb } = useWorldbook()

const activeGroup = ref('All')
const showModal = ref(false)
const form = ref({ title: '', group: '', content: '' })

const filteredWorldbooks = computed(() => {
  if (activeGroup.value === 'All') return worldbooks.value
  return worldbooks.value.filter((w) => (w.group || '通用') === activeGroup.value)
})

const openCreateModal = () => {
  form.value = { title: '', group: '', content: '' }
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
    // 编辑模式：直接查找到目标并合并属性
    const idx = worldbooks.value.findIndex(w => w.id === form.value.id)
    if (idx !== -1) {
      worldbooks.value[idx] = { ...worldbooks.value[idx], ...form.value }
    }
    closeModal()
  } else {
    // 新建模式
    if (saveWb(form.value)) {
      closeModal()
    }
  }
}
</script>
