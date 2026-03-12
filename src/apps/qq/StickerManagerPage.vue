<template>
  <transition name="slide-up">
    <div v-if="show" class="app-window" style="z-index: 90; background: var(--bg-color);">
      <div class="app-header">
        <div class="btn-back" @click="$emit('close')">关闭</div>
        <div class="app-title">表情包管理</div>
        <div class="header-right">
          <i class="fas fa-folder-plus" @click="handleCreateGroup" style="font-size:16px;"></i>
        </div>
      </div>

      <div class="content-area">
        <div style="font-size:11px; color:#888; margin-bottom:10px;">
          创建分组后，点击添加按钮可批量导入表情包。
        </div>

        <div v-for="group in stickerGroups" :key="group.id" style="background:#fff; border-radius:14px; padding:15px; margin-bottom:15px; box-shadow:0 2px 10px rgba(0,0,0,0.02);">
          
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid #f0f0f0; padding-bottom:10px;">
            <input v-model="group.name" style="font-weight:600; font-size:14px; border:none; outline:none; background:transparent; flex:1;" placeholder="分组名称" />
            <div style="display:flex; gap:10px;">
              <i class="fas fa-trash" style="color:#ff5252; cursor:pointer;" @click="handleDeleteGroup(group.id)"></i>
            </div>
          </div>

          <!-- 表情包网格展示 -->
          <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:10px; margin-bottom:15px;">
            <div v-for="(st, sIdx) in group.stickers" :key="sIdx" style="position:relative; display:flex; flex-direction:column; align-items:center; gap:4px;">
              <div 
                style="width:100%; aspect-ratio:1; background:#f4f5f7; border-radius:10px; display:flex; justify-content:center; align-items:center; background-size:cover; background-position:center; cursor:pointer; border:2px solid transparent;"
                :style="st.url ? `background-image:url(${st.url});` : ''"
                :class="{'selected-sticker': selectedStickers.includes(st)}"
                @click="toggleStickerSelect(st)"
              >
                <i v-if="!st.url" class="fas fa-image" style="color:#ccc;"></i>
                <div v-if="selectedStickers.includes(st)" style="position:absolute; top:-5px; right:-5px; width:20px; height:20px; background:#1dd1a1; border-radius:50%; display:flex; justify-content:center; align-items:center; color:#fff; border:2px solid #fff; z-index:2;"><i class="fas fa-check" style="font-size:10px;"></i></div>
              </div>
              <span style="font-size:10px; color:#666; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%;">{{ st.name }}</span>
            </div>
          </div>

          <div style="display:flex; gap:10px;">
            <button class="btn-send" style="flex:1; padding:8px; border-radius:8px; font-size:12px; background:#5c8aff;" @click="openBatchImport(group)">
              <i class="fas fa-plus"></i> 批量导入
            </button>
            <button class="btn-send" style="padding:8px 12px; border-radius:8px; font-size:12px; background:#ff5252;" v-if="selectedStickers.length > 0" @click="deleteSelectedStickers(group)">
              <i class="fas fa-trash"></i> 删除所选
            </button>
          </div>

        </div>
      </div>

      <!-- 批量导入弹窗 -->
      <transition name="fade">
        <div v-if="showImportModal" style="position:absolute; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:100; display:flex; justify-content:center; align-items:center; padding:20px;">
          <div style="background:#fff; width:100%; border-radius:24px; padding:20px; box-shadow:0 10px 30px rgba(0,0,0,0.1); display:flex; flex-direction:column; gap:12px;">
            <div style="font-weight:600; text-align:center;">批量导入表情包</div>
            <div style="font-size:11px; color:#888;">
              每行一个，支持格式：<br>
              大哭 https://...<br>
              大哭:https://...<br>
              大哭--https://...
            </div>
            <textarea v-model="batchText" style="width:100%; height:150px; background:#f4f5f7; border:none; border-radius:12px; padding:10px; font-size:12px; outline:none; resize:none; white-space:pre-wrap;" placeholder="在此处粘贴..."></textarea>
            <div style="display:flex; gap:10px; margin-top:10px;">
              <button style="flex:1; padding:12px; border-radius:12px; border:none; background:#f0f0f0; font-weight:600;" @click="showImportModal = false">取消</button>
              <button style="flex:1; padding:12px; border-radius:12px; border:none; background:var(--text-main); color:#fff; font-weight:600;" @click="confirmBatchImport">确认解析</button>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </transition>
</template>

<script setup>
import { ref } from 'vue'
import { useStickers } from '@/composables/useStickers'

defineProps({ show: Boolean })
defineEmits(['close'])

const { stickerGroups, addGroup, deleteGroup } = useStickers()

const selectedStickers = ref([])
const showImportModal = ref(false)
const batchText = ref('')
let targetGroup = null

const handleCreateGroup = () => {
  const name = prompt('请输入新表情包分组名称：', '新分组')
  if (name) addGroup(name)
}

const handleDeleteGroup = (id) => {
  if (confirm('确定删除这个表情包分组及其内部所有表情吗？')) {
    deleteGroup(id)
    selectedStickers.value = [] // 清理可能残留的选中项
  }
}

const toggleStickerSelect = (st) => {
  const idx = selectedStickers.value.indexOf(st)
  if (idx > -1) selectedStickers.value.splice(idx, 1)
  else selectedStickers.value.push(st)
}

const deleteSelectedStickers = (group) => {
  if (confirm(`确定删除选中的 ${selectedStickers.value.length} 个表情包吗？`)) {
    group.stickers = group.stickers.filter(s => !selectedStickers.value.includes(s))
    selectedStickers.value = []
  }
}

const openBatchImport = (group) => {
  targetGroup = group
  batchText.value = ''
  showImportModal.value = true
}

const confirmBatchImport = () => {
  if (!targetGroup) return
  const lines = batchText.value.split('\n')
  let count = 0
  lines.forEach(line => {
    line = line.trim()
    if (!line) return
    // 正则解析：名称 + (空格或冒号或竖线或--) + url
    const match = line.match(/^(.+?)(?:\s+|:|\||--)(https?:\/\/.+)$/)
    if (match) {
      targetGroup.stickers.push({ name: match[1].trim(), url: match[2].trim() })
      count++
    }
  })
  alert(`成功解析并导入了 ${count} 个表情包！`)
  showImportModal.value = false
}
</script>

<style scoped>
.selected-sticker {
  border-color: #1dd1a1 !important;
  opacity: 0.8;
}
</style>

