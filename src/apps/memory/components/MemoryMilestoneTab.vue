<template>
  <div class="milestone-tab">
    <!-- 全局点击遮罩，用于关闭下拉菜单 -->
    <div class="dropdown-mask" v-if="activeDropdown" @click="activeDropdown = null"></div>

    <div class="filter-bar">
      <!-- 类型筛选下拉 -->
      <div class="dropdown-wrapper">
        <div class="filter-pill" :class="{ 'is-active': filterType !== 'all' || activeDropdown === 'type' }" @click="toggleDropdown('type')">
          {{ typeLabel }} <i class="fas fa-angle-down"></i>
        </div>
        <div class="dropdown-menu" v-if="activeDropdown === 'type'">
          <div class="dropdown-item" :class="{ active: filterType === 'all' }" @click="selectFilter('type', 'all')">全部类型</div>
          <div class="dropdown-item" :class="{ active: filterType === 'milestone' }" @click="selectFilter('type', 'milestone')">里程碑</div>
          <div class="dropdown-item" :class="{ active: filterType === 'event' }" @click="selectFilter('type', 'event')">普通事件</div>
        </div>
      </div>

      <!-- 来源筛选下拉 -->
      <div class="dropdown-wrapper">
        <div class="filter-pill" :class="{ 'is-active': filterSource !== 'all' || activeDropdown === 'source' }" @click="toggleDropdown('source')">
          {{ sourceLabel }} <i class="fas fa-angle-down"></i>
        </div>
        <div class="dropdown-menu" v-if="activeDropdown === 'source'">
          <div class="dropdown-item" :class="{ active: filterSource === 'all' }" @click="selectFilter('source', 'all')">全部来源</div>
          <div class="dropdown-item" :class="{ active: filterSource === s }" v-for="s in sourceOptions" :key="s" @click="selectFilter('source', s)">
            {{ s }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="filteredMemories.length === 0" class="empty-tip">暂无共同记忆</div>

    <div v-else class="timeline">
      <div class="timeline-line"></div>
      <div class="timeline-item" v-for="m in filteredMemories" :key="m.id" :class="'is-' + m.type">
        
        <div class="timeline-dot">
          <i v-if="m.type === 'milestone'" class="fas fa-star" style="font-size: 10px;"></i>
        </div>
        
        <div class="timeline-content">
          <div class="tl-header">
            <div class="tl-date">{{ m.date || '未标注时间' }}</div>
            <div class="tl-badge" v-if="m.type === 'milestone'">里程碑</div>
          </div>
          
          <div class="tl-text">{{ m.content || m.text }}</div>
          
          <div class="tl-tags">
            <span class="tag source-tag" v-if="m.source" :style="getSourceStyle(m.source)">
              <i :class="getSourceIcon(m.source)"></i> {{ m.source }}
            </span>
            <span class="tag" v-for="(k, idx) in (m.keywords || [])" :key="idx">{{ k }}</span>
          </div>
          
          <div class="tl-actions">
            <i class="fas fa-edit" @click="openEdit(m)"></i>
            <i class="fas fa-trash" @click="handleDelete(m.id)"></i>
          </div>
        </div>
      </div>
    </div>

    <InnerModal :show="showEdit" @close="showEdit = false">
      <div class="modal-title">编辑共同记忆</div>
      
      <textarea class="modal-textarea" v-model="draft.content" placeholder="事件内容"></textarea>
      
      <div class="modal-hint">关键词 (逗号分隔)</div>
      <input class="modal-input" v-model="draft.keywords" placeholder="关键词1,关键词2" />
      
      <div class="modal-hint">来源</div>
      <input class="modal-input" v-model="draft.source" placeholder="chat/offline/group_chat/vocab" />
      
      <div class="modal-hint">类型</div>
      <!-- 使用分段控制器替代下拉框 -->
      <div class="pill-group">
        <div class="pill-item" :class="{ active: draft.type === 'milestone' }" @click="draft.type = 'milestone'">里程碑</div>
        <div class="pill-item" :class="{ active: draft.type === 'event' }" @click="draft.type = 'event'">普通事件</div>
      </div>

      <div class="modal-actions" style="margin-top: 20px;">
        <button class="btn-cancel" @click="showEdit = false">取消</button>
        <button class="btn-confirm" @click="saveEdit">保存</button>
      </div>
    </InnerModal>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import InnerModal from '@/components/InnerModal.vue'

const props = defineProps({
  memories: Array
})
const emit = defineEmits(['update', 'delete'])

const showEdit = ref(false)
const draft = ref({ id: null, content: '', keywords: '', source: '', type: 'event' })

// 自定义下拉菜单状态
const activeDropdown = ref(null)
const filterType = ref('all')
const filterSource = ref('all')

const allMemories = computed(() => Array.isArray(props.memories) ? props.memories : [])

const sourceOptions = computed(() => {
  const set = new Set(allMemories.value.map(m => m.source).filter(Boolean))
  return Array.from(set)
})

const typeLabel = computed(() => {
  if (filterType.value === 'milestone') return '里程碑'
  if (filterType.value === 'event') return '普通事件'
  return '全部类型'
})

const sourceLabel = computed(() => {
  if (filterSource.value !== 'all') return filterSource.value
  return '全部来源'
})

const toggleDropdown = (menu) => {
  activeDropdown.value = activeDropdown.value === menu ? null : menu
}

const selectFilter = (type, val) => {
  if (type === 'type') filterType.value = val
  if (type === 'source') filterSource.value = val
  activeDropdown.value = null
}

const filteredMemories = computed(() => {
  return allMemories.value.filter(m => {
    if (filterType.value !== 'all' && m.type !== filterType.value) return false
    if (filterSource.value !== 'all' && m.source !== filterSource.value) return false
    return m.type === 'milestone' || m.type === 'event'
  }).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
})

const openEdit = (m) => {
  draft.value = { 
    id: m.id, 
    content: m.content || m.text || '', 
    keywords: Array.isArray(m.keywords) ? m.keywords.join(',') : '',
    source: m.source || '',
    type: m.type || 'event'
  }
  showEdit.value = true
}

const saveEdit = () => {
  const kws = draft.value.keywords.split(',').map(s => s.trim()).filter(Boolean)
  emit('update', draft.value.id, { content: draft.value.content, text: draft.value.content, keywords: kws, source: draft.value.source, type: draft.value.type })
  showEdit.value = false
}

const handleDelete = (id) => {
  if (confirm('确定要删除这条记忆吗？')) {
    emit('delete', id)
  }
}

const getSourceStyle = (source) => {
  const map = {
    'chat': { background: '#eef2ff', color: '#5c8aff' },
    'group_chat': { background: '#e8f5e9', color: '#4caf50' },
    'offline': { background: '#f3e5f5', color: '#9c27b0' },
    'vocab': { background: '#fff3e0', color: '#ff9800' }
  }
  return map[source] || { background: '#f4f5f7', color: '#666' }
}

const getSourceIcon = (source) => {
  const map = {
    'chat': 'fas fa-comment',
    'group_chat': 'fas fa-users',
    'offline': 'fas fa-coffee',
    'vocab': 'fas fa-book'
  }
  return map[source] || 'fas fa-link'
}
</script>

<style scoped>
.milestone-tab { padding: 10px 0; position: relative; }

/* 现代化的过滤栏 & 自定义下拉 */
.filter-bar { display:flex; gap:10px; margin-bottom:16px; flex-wrap:wrap; position: relative; z-index: 100; }
.dropdown-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 90; }

.dropdown-wrapper { position: relative; }
.filter-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #f4f5f7;
  color: #555;
  border-radius: 20px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}
.filter-pill:active { transform: scale(0.95); }
.filter-pill.is-active { background: #000; color: #fff; }

.dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  padding: 6px;
  min-width: 130px;
  z-index: 100;
  animation: popDown 0.15s ease-out;
  border: 1px solid rgba(0,0,0,0.05);
}
.dropdown-item {
  padding: 10px 12px;
  font-size: 12px;
  color: #333;
  border-radius: 8px;
  cursor: pointer;
  transition: 0.2s;
  user-select: none;
}
.dropdown-item:hover { background: #f4f5f7; }
.dropdown-item.active { background: #eef2ff; color: #5c8aff; font-weight: 600; }

@keyframes popDown {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Modal 内的分段控制器 (取代原生 select) */
.pill-group {
  display: flex;
  gap: 6px;
  background: #f4f5f7;
  padding: 4px;
  border-radius: 12px;
  margin-top: 6px;
}
.pill-item {
  flex: 1;
  text-align: center;
  padding: 10px 0;
  font-size: 12px;
  color: #666;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.pill-item.active {
  background: #fff;
  color: #000;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.empty-tip { text-align:center; color:#888; font-size:12px; margin-top:30px; }

/* 时间轴主体 */
.timeline { position: relative; padding-left: 20px; margin-bottom: 16px; }
.timeline-line {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 6px;
  width: 2px;
  background: #eee;
  border-radius: 2px;
  z-index: 0;
}

.timeline-item { position: relative; margin-bottom: 20px; z-index: 1; }

/* 默认 Event 小灰点 */
.timeline-dot {
  position: absolute;
  left: -18px;
  top: 18px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ccc;
  border: 2px solid #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 0 2px #fff;
  color: #fff;
}

.timeline-content { 
  background: #fff; 
  border-radius: 12px; 
  padding: 14px; 
  box-shadow: 0 2px 10px rgba(0,0,0,0.03); 
  border: 1px solid rgba(0,0,0,0.02);
}

.tl-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.tl-date { font-size: 11px; color: #888; font-family: monospace; }
.tl-text { font-size: 13px; color: #333; line-height: 1.5; }
.tl-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }

.tag { font-size: 10px; color: #666; background: #f4f5f7; padding: 4px 8px; border-radius: 8px; }
.source-tag { font-weight: 600; }

.tl-actions { display: flex; gap: 12px; margin-top: 12px; color: #ccc; font-size: 13px; }
.tl-actions i { cursor: pointer; transition: 0.2s; }
.tl-actions i:hover { color: #333; }

/* Milestone 大黑点 & 边框高亮 */
.timeline-item.is-milestone .timeline-dot {
  left: -22px;
  top: 14px;
  width: 18px;
  height: 18px;
  background: #000;
  border: none;
  box-shadow: 0 0 0 3px #fff, 0 2px 6px rgba(0,0,0,0.1);
}
.timeline-item.is-milestone .timeline-content {
  border-color: #eee;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
}
.tl-badge {
  font-size: 10px;
  background: #000;
  color: #fff;
  padding: 3px 8px;
  border-radius: 8px;
  font-weight: 600;
}
</style>
