<template>
  <div class="content-area" style="background: var(--bg-color); height: 100%; overflow-y: auto; padding: 20px; box-sizing: border-box;">
    
    <div style="font-size:12px; color:var(--text-sub); line-height:1.6; margin-bottom:15px;">
      【线下见面专属注入流】越靠上的模块越先注入。您可以自由决定快捷面板的插入位置，甚至自定义系统底层的基础设定指令。
    </div>

    <!-- 预设面板 -->
    <div style="background:#f4f5f7; border-radius:10px; padding:12px; margin-bottom:15px; display:flex; flex-direction:column; gap:12px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div style="font-weight:600; font-size:13px; color:var(--text-main);">结构预设库</div>
        <div style="display:flex; gap:6px; align-items:center;">
          <i class="fas fa-trash" style="color:#ff5252; cursor:pointer; padding:4px;" @click="handleDeletePreset" title="删除选中预设"></i>
          <select style="background:#fff; border:1px solid #ddd; padding:4px 8px; font-size:11px; border-radius:6px; outline:none; max-width:110px;" v-model="selectedPresetId" @change="applyPreset">
            <option value="">预设...</option>
            <option v-for="p in offlinePromptPresets" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
          <button class="btn-send" style="padding:4px 10px; border-radius:6px; font-size:11px; margin-left:4px;" @click="handleSavePreset">保存当前</button>
        </div>
      </div>
      
      <div style="display:flex; justify-content:flex-end; gap:8px; border-top:1px dashed #ddd; padding-top:10px;">
        <button class="btn-cancel" style="padding:4px 12px; font-size:11px; border-radius:6px;" @click="triggerImport">导入文件</button>
        <button class="btn-confirm" style="padding:4px 12px; font-size:11px; border-radius:6px;" @click="handleExportConfig">导出文件</button>
      </div>
    </div>
    
    <input type="file" ref="fileInput" accept=".json,application/json" style="display:none;" @change="handleFileChange" />

    <div class="multiselect-bar" v-if="selectedIds.length > 0" style="background:#ff5252; color:#fff; padding:10px 15px; border-radius:10px; margin-bottom:15px; display:flex; justify-content:space-between;">
      <span>已选 {{ selectedIds.length }} 项</span>
      <i class="fas fa-trash" style="cursor:pointer; font-size:16px;" @click="handleDeleteSelected"></i>
    </div>

    <!-- 统一排序列表 -->
    <template v-for="(item, index) in offlinePromptOrder" :key="item.id">

      <!-- 系统内置模块 -->
      <SortItem
        v-if="item.type !== 'custom_category'"
        :icon="getOrderIcon(item.key)"
        :locked="true"
        :canUp="index > 0"
        :canDown="index < offlinePromptOrder.length - 1"
        @up="moveOrder(index, -1)"
        @down="moveOrder(index, 1)"
      >
        {{ getOrderName(item.key) }}
        <template #extra>
          <span
            v-if="item.key === 'worldbook'"
            @click="wbExpanded = !wbExpanded"
            style="font-size:11px; color:#5c8aff; cursor:pointer;"
          >{{ wbExpanded ? '收起' : '展开排序' }}</span>
          
          <i v-if="item.key === 'offline_base'" class="fas fa-edit" style="color:#5c8aff; cursor:pointer; font-size:12px;" @click="showBaseEditModal = true"></i>
        </template>
      </SortItem>

      <template v-if="item.key === 'worldbook' && wbExpanded">
        <SortItem
          v-for="(wb, wi) in enabledWorldbooks"
          :key="wb.id"
          :subItem="true"
          :canUp="wi > 0"
          :canDown="wi < enabledWorldbooks.length - 1"
          @up="moveWbOrder(wi, -1)"
          @down="moveWbOrder(wi, 1)"
        >
          {{ wb.title }}
          <template #extra>
            <span style="font-size:10px; color:var(--text-sub); flex-shrink:0; margin-left:4px;">
              {{ wb.injectRole === 'assistant' ? '助手' : wb.injectRole === 'user' ? '用户' : '系统' }}
            </span>
          </template>
        </SortItem>
        <div v-if="enabledWorldbooks.length === 0" style="font-size:12px; color:var(--text-sub); text-align:center; padding:10px;">暂无已开启的世界书条目</div>
      </template>

      <!-- 自定义分类组容器 -->
      <SortItem
        v-if="item.type === 'custom_category'"
        icon="fas fa-layer-group"
        :locked="false"
        :canUp="index > 0"
        :canDown="index < offlinePromptOrder.length - 1"
        @up="moveOrder(index, -1)"
        @down="moveOrder(index, 1)"
      >
        组：{{ item.category }} ({{ getCatItems(item.category).length }})
        <template #extra>
          <span
            class="sort-expand-btn"
            @click="toggleCustomExpanded(item.category)"
            style="font-size:11px; color:#5c8aff; cursor:pointer;"
          >{{ customExpanded[item.category] ? '收起' : '展开排序' }}</span>
        </template>
      </SortItem>

      <!-- 自定义分类组内的子条目 -->
      <template v-if="item.type === 'custom_category' && customExpanded[item.category]">
        <div 
          v-for="(cp, cpi) in getCatItems(item.category)" 
          :key="cp.id" 
          class="custom-prompt-item" 
          :style="{ padding: '15px', marginBottom: '10px', marginLeft: '16px', borderLeft: '3px solid var(--text-main)', borderRadius: '0 10px 10px 0', background: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.02)', opacity: cp.enabled !== false ? '1' : '0.5' }"
        >
          <div style="display:flex; gap:10px;">
            <input type="checkbox" :value="cp.id" v-model="selectedIds" />
            <div style="flex:1;">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                <ToggleSwitch :modelValue="cp.enabled !== false" @update:modelValue="val => cp.enabled = val" style="transform: scale(0.7); margin-left:-5px;" />
                <span style="font-weight:600; font-size:13px; flex:1;">{{ cp.name }}</span>
                <span style="font-size:10px; color:var(--text-sub);">
                  {{ cp.injectRole === 'assistant' ? '助手' : cp.injectRole === 'user' ? '用户' : '系统' }}
                </span>
              </div>
              <div style="font-size:12px; color:#666; line-height:1.5;">{{ cp.content }}</div>
            </div>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:10px; padding-top:10px; border-top:1px dashed #eee;">
            <i class="fas fa-arrow-up" style="color:#888; cursor:pointer;" @click="moveCustomItem(item.category, cpi, -1)" v-if="cpi > 0"></i>
            <i class="fas fa-arrow-down" style="color:#888; cursor:pointer;" @click="moveCustomItem(item.category, cpi, 1)" v-if="cpi < getCatItems(item.category).length - 1"></i>
            <i class="fas fa-edit" style="color:#5c8aff; cursor:pointer; margin-left:10px;" @click="openEditCustom(cp)"></i>
            <i class="fas fa-trash" style="color:#ff5252; cursor:pointer;" @click="deleteCustomPrompts([cp.id])"></i>
          </div>
        </div>
      </template>

    </template>

    <!-- 底座提示词编辑弹窗 -->
    <InnerModal :show="showBaseEditModal" @close="showBaseEditModal = false">
      <div class="modal-title">编辑线下环境底座</div>
      <div style="font-size:11px; color:#888; margin-bottom:10px;">这是注入顺序中最高级别的系统基石，推荐保留物理法则限制。</div>
      <textarea v-model="offlineBasePrompt" style="width:100%; height:150px; padding:10px; border:1px solid #ddd; border-radius:8px; box-sizing:border-box; resize:none; font-size:12px; line-height:1.5;"></textarea>
      <div class="modal-actions" style="display:flex; gap:10px; margin-top:15px;">
        <button class="btn-cancel" style="flex:1; padding:10px; border-radius:8px;" @click="showBaseEditModal = false">取消</button>
        <button class="btn-confirm" style="flex:1; padding:10px; border-radius:8px; background:var(--text-main); color:#fff;" @click="saveBaseSetting">保存</button>
      </div>
    </InnerModal>

    <!-- 预览与新建弹窗 -->
    <InnerModal :show="showPreview" @close="showPreview = false">
      <div class="modal-title">线下注入流预览</div>
      <div class="preview-token" style="font-size:12px; color:#888; margin-bottom:10px;">预计静态 Token 数：约 {{ previewData.tokens }} 个</div>
      <div class="preview-box" style="width:100%; height:300px; overflow-y:auto; background:#f4f5f7; border-radius:8px; padding:10px; font-size:12px; color:#333; white-space:pre-wrap;">{{ previewData.text }}</div>
      <div class="modal-actions" style="margin-top:15px; display:flex; gap:10px;">
        <button class="btn-cancel" style="flex:1; padding:10px; border-radius:8px;" @click="handleExportConfig">导出配置</button>
        <button class="btn-confirm" style="flex:1; padding:10px; border-radius:8px; background:var(--text-main); color:#fff;" @click="showPreview = false">关闭</button>
      </div>
    </InnerModal>

    <InnerModal :show="showAddModal" @close="closeAddModal">
      <div class="modal-title">{{ addForm.id ? '编辑自定义节点' : '添加自定义节点' }}</div>
      <div style="display:flex; flex-direction:column; gap:10px; margin:15px 0;">
        <input class="modal-input" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:8px; box-sizing:border-box;" v-model="addForm.name" placeholder="名称（如：动作强化指令）" />
        <input class="modal-input" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:8px; box-sizing:border-box;" v-model="addForm.category" placeholder="分类组名（如：风格控制）" />
        <textarea class="modal-textarea" style="width:100%; height:100px; padding:10px; border:1px solid #ddd; border-radius:8px; box-sizing:border-box; resize:none;" v-model="addForm.content" placeholder="提示词内容..."></textarea>
        <RoleSelector v-model="addForm.injectRole" />
      </div>
      <div class="modal-actions" style="display:flex; gap:10px;">
        <button class="btn-cancel" style="flex:1; padding:10px; border-radius:8px;" @click="closeAddModal">取消</button>
        <button class="btn-confirm" style="flex:1; padding:10px; border-radius:8px; background:var(--text-main); color:#fff;" @click="handleSaveCustom" :disabled="!addForm.name || !addForm.content">保存</button>
      </div>
    </InnerModal>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useOfflinePrompt } from '@/composables/useOfflinePrompt'
import { useWorldbook } from '@/composables/useWorldbook'
import SortItem from '@/components/SortItem.vue'
import InnerModal from '@/components/InnerModal.vue'
import RoleSelector from '@/components/RoleSelector.vue'
import ToggleSwitch from '@/components/ToggleSwitch.vue'

const {
  offlinePromptOrder, offlineCustomPrompts, offlinePromptPresets, offlineBasePrompt,
  getOrderName, getOrderIcon, moveOrder, moveCustomItem, saveCustomPrompt, deleteCustomPrompts, 
  previewData, importConfig, savePromptPreset, loadPromptPreset, deletePromptPreset, saveState
} = useOfflinePrompt()

const { enabledWorldbooks, wbExpanded, moveWbOrder } = useWorldbook()

const selectedIds = ref([])
const selectedPresetId = ref('')
const showPreview = ref(false)
const showAddModal = ref(false)
const showBaseEditModal = ref(false)
const addForm = ref({ name: '', category: '', content: '', injectRole: 'system', enabled: true })
const customExpanded = ref({})
const fileInput = ref(null)

const saveBaseSetting = () => {
  saveState()
  showBaseEditModal.value = false
  window.dispatchEvent(new CustomEvent('sys-toast', { detail: '底层环境基石已更新' }))
}

const getCatItems = (category) => offlineCustomPrompts.value.filter(p => p.category === category)
const toggleCustomExpanded = (category) => { customExpanded.value[category] = !customExpanded.value[category] }
const handleDeleteSelected = () => { deleteCustomPrompts(selectedIds.value); selectedIds.value = [] }

const openEditCustom = (cp) => { addForm.value = JSON.parse(JSON.stringify(cp)); showAddModal.value = true }
const openAddModal = () => { addForm.value = { name: '', category: '', content: '', injectRole: 'system', enabled: true }; showAddModal.value = true }
const closeAddModal = () => { addForm.value = { name: '', category: '', content: '', injectRole: 'system', enabled: true }; showAddModal.value = false }

const handleSaveCustom = () => {
  if (addForm.value.id) {
    const idx = offlineCustomPrompts.value.findIndex(p => p.id === addForm.value.id)
    if (idx !== -1) offlineCustomPrompts.value[idx] = { ...offlineCustomPrompts.value[idx], ...addForm.value }
    
    const catName = addForm.value.category || '自定义'
    const catId = 'cat_group_' + catName
    if (!offlinePromptOrder.value.find(o => o.id === catId)) {
      offlinePromptOrder.value.push({ id: catId, type: 'custom_category', category: catName })
    }
    
    const activeCats = new Set(offlineCustomPrompts.value.map(p => p.category))
    offlinePromptOrder.value = offlinePromptOrder.value.filter(item => item.type === 'custom_category' ? activeCats.has(item.category) : true)

    customExpanded.value[catName] = true
    closeAddModal()
  } else {
    if (saveCustomPrompt(addForm.value)) {
      const cat = addForm.value.category || '自定义'
      customExpanded.value[cat] = true
      closeAddModal()
    }
  }
}

const handleSavePreset = () => {
  const name = prompt('为当前的结构与提示词起个名字：', '新预设')
  if (name) {
    const newId = savePromptPreset(name)
    selectedPresetId.value = newId
    window.dispatchEvent(new CustomEvent('sys-toast', { detail: '预设保存成功' }))
  }
}

const applyPreset = () => {
  if (!selectedPresetId.value) return
  if (confirm('加载预设将覆盖当前的提示词结构，是否继续？')) {
    loadPromptPreset(selectedPresetId.value)
    window.dispatchEvent(new CustomEvent('sys-toast', { detail: '预设已应用' }))
  } else {
    selectedPresetId.value = ''
  }
}

const handleDeletePreset = () => {
  if (!selectedPresetId.value) return alert('请先从下拉框选择一个预设')
  if (confirm('确定删除此预设吗？')) {
    deletePromptPreset(selectedPresetId.value)
    selectedPresetId.value = ''
    window.dispatchEvent(new CustomEvent('sys-toast', { detail: '预设已删除' }))
  }
}

const triggerImport = () => { fileInput.value.click() }
const handleFileChange = (e) => {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    if (importConfig(ev.target.result)) window.dispatchEvent(new CustomEvent('sys-toast', { detail: '配置导入成功' }))
    else alert('导入失败：不是有效的提示词配置文件。')
    fileInput.value.value = ''
  }
  reader.readAsText(file)
}

const handleExportConfig = () => {
  const exportData = {
    offlinePromptOrder: offlinePromptOrder.value,
    offlineCustomPrompts: offlineCustomPrompts.value,
    offlineBasePrompt: offlineBasePrompt.value,
    exportedAt: new Date().toLocaleString()
  }
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `aero-offline-prompt-config-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
  window.dispatchEvent(new CustomEvent('sys-toast', { detail: '注入配置已导出' }))
}

defineExpose({ openPreview: () => { showPreview.value = true }, openAddModal })
</script>
