<template>
  <div class="content-area">
    <div style="font-size:12px; color:var(--text-sub); line-height:1.6;">
      越靠上的模块越先注入。聊天记录位置决定历史消息在提示词中的插入点。点击右上角眼睛预览，点击 + 添加自定义提示词。分类相同的提示词会自动成组。
    </div>

    <div class="multiselect-bar" v-if="selectedIds.length > 0">
      <span>已选 {{ selectedIds.length }} 项</span>
      <i class="fas fa-trash" style="color:#ff5252; cursor:pointer; font-size:16px;" @click="handleDeleteSelected"></i>
    </div>

    <!-- 统一排序列表 -->
    <template v-for="(item, index) in promptOrder" :key="item.id">

      <!-- 系统内置模块 -->
      <SortItem
        v-if="item.type !== 'custom_category'"
        :icon="getOrderIcon(item.key)"
        :locked="true"
        :canUp="index > 0"
        :canDown="index < promptOrder.length - 1"
        @up="moveOrder(index, -1)"
        @down="moveOrder(index, 1)"
      >
        {{ getOrderName(item.key) }}
        <template #extra>
          <span
            class="sort-expand-btn"
            v-if="item.key === 'global_worldbook'"
            @click="wbExpanded = !wbExpanded"
          >{{ wbExpanded ? '收起' : '展开排序' }}</span>
        </template>
      </SortItem>

      <template v-if="item.key === 'global_worldbook' && wbExpanded">
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
        :canDown="index < promptOrder.length - 1"
        @up="moveOrder(index, -1)"
        @down="moveOrder(index, 1)"
      >
        组：{{ item.category }} ({{ getCatItems(item.category).length }})
        <template #extra>
          <span
            class="sort-expand-btn"
            @click="toggleCustomExpanded(item.category)"
          >{{ customExpanded[item.category] ? '收起' : '展开排序' }}</span>
        </template>
      </SortItem>

      <!-- 自定义分类组内的子条目 -->
      <template v-if="item.type === 'custom_category' && customExpanded[item.category]">
        <div 
          v-for="(cp, cpi) in getCatItems(item.category)" 
          :key="cp.id" 
          class="custom-prompt-item" 
          style="margin-left:16px; border-left:3px solid var(--accent-color); border-radius:0 10px 10px 0; background:#f9f9f9;"
        >
          <input type="checkbox" class="cp-checkbox" :value="cp.id" v-model="selectedIds" />
          <div class="cp-info">
            <div class="cp-name">
              {{ cp.name }}
              <span style="font-size:10px; color:var(--text-sub); font-weight:normal; float:right;">
                {{ cp.injectRole === 'assistant' ? '助手' : cp.injectRole === 'user' ? '用户' : '系统' }}
              </span>
            </div>
            <div class="cp-content">{{ cp.content }}</div>
          </div>
          <div class="sort-actions">
            <!-- 新增：单项删除按钮 -->
            <i class="fas fa-trash" style="color:#ff5252; padding:5px; margin-right:4px;" @click="deleteCustomPrompts([cp.id])"></i>
            <i class="fas fa-arrow-up" @click="moveCustomItem(item.category, cpi, -1)" v-if="cpi > 0"></i>
            <i class="fas fa-arrow-down" @click="moveCustomItem(item.category, cpi, 1)" v-if="cpi < getCatItems(item.category).length - 1"></i>
          </div>
        </div>
      </template>

    </template>

    <InnerModal :show="showPreview" @close="showPreview = false">
      <div class="modal-title">提示词注入预览</div>
      <div class="preview-token">预计静态 Token 数：约 {{ previewData.tokens }} 个（不含角色设定与聊天记录）</div>
      <div class="preview-box">{{ previewData.text }}</div>
      <div class="modal-actions">
        <button class="btn-confirm" @click="showPreview = false">关闭</button>
      </div>
    </InnerModal>

    <InnerModal :show="showAddModal" @close="showAddModal = false">
      <div class="modal-title">添加自定义提示词</div>
      <input class="modal-input" v-model="addForm.name" placeholder="名称（如：写作风格、输出格式）" />
      <input class="modal-input" v-model="addForm.category" placeholder="分类名相同时自动成组（如：风格控制）" />
      <textarea class="modal-textarea" v-model="addForm.content" placeholder="提示词内容..."></textarea>
      <RoleSelector v-model="addForm.injectRole" />
      <div class="modal-hint">自定义提示词会以分类成组，支持组与组之间、组内独立排序。</div>
      <div class="modal-actions">
        <button class="btn-cancel" @click="showAddModal = false">取消</button>
        <button class="btn-confirm" @click="handleSaveCustom" :disabled="!addForm.name || !addForm.content">保存</button>
      </div>
    </InnerModal>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { usePromptOrder } from '@/composables/usePromptOrder'
import { useWorldbook } from '@/composables/useWorldbook'
import SortItem from '@/components/SortItem.vue'
import InnerModal from '@/components/InnerModal.vue'
import RoleSelector from '@/components/RoleSelector.vue'

const {
  promptOrder, customPrompts, getOrderName, getOrderIcon,
  moveOrder, moveCustomItem, saveCustomPrompt, deleteCustomPrompts, previewData
} = usePromptOrder()

const { enabledWorldbooks, wbExpanded, moveWbOrder } = useWorldbook()

const selectedIds = ref([])
const showPreview = ref(false)
const showAddModal = ref(false)
const addForm = ref({ name: '', category: '', content: '', injectRole: 'system' })
const customExpanded = ref({})

const getCatItems = (category) => customPrompts.value.filter(p => p.category === category)

const toggleCustomExpanded = (category) => {
  customExpanded.value[category] = !customExpanded.value[category]
}

const handleDeleteSelected = () => {
  deleteCustomPrompts(selectedIds.value)
  selectedIds.value = []
}

const handleSaveCustom = () => {
  if (saveCustomPrompt(addForm.value)) {
    const cat = addForm.value.category || '自定义'
    customExpanded.value[cat] = true
    addForm.value = { name: '', category: '', content: '', injectRole: 'system' }
    showAddModal.value = false
  }
}

defineExpose({
  openPreview: () => { showPreview.value = true },
  openAddModal: () => { showAddModal.value = true }
})
</script>
