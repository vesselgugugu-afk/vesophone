<template>
  <div class="core-tab">
    <div class="core-header">
      <div class="core-title">核心羁绊</div>
      <button class="btn-ghost" @click="openCreate">新增</button>
    </div>

    <div v-if="memories.length === 0" class="empty-tip">暂无核心记忆</div>
    <div class="polaroid-grid">
      <div class="polaroid-card" v-for="m in memories" :key="m.id" :style="getCardStyle(m)">
        <div class="polaroid-img" :style="getCardImage(m)">
          <i v-if="!getCardImage(m)" class="fas fa-book-open"></i>
        </div>
        <div class="polaroid-text">{{ m.content || m.text }}</div>
        <div class="polaroid-meta">
          <span class="meta-tag">重要度 {{ m.importance || 1 }}</span>
          <span class="meta-tag" v-if="m.date">{{ m.date }}</span>
        </div>
        <div class="polaroid-actions">
          <i class="fas fa-edit" @click="openEdit(m)"></i>
          <i class="fas fa-trash" @click="handleDelete(m.id)"></i>
        </div>
      </div>
    </div>

    <InnerModal :show="showEdit" @close="showEdit = false">
      <div class="modal-title">{{ isCreate ? '新增核心记忆' : '编辑核心记忆' }}</div>

      <textarea class="modal-textarea" v-model="draft.content" placeholder="记忆内容"></textarea>

      <div class="modal-hint">重要度</div>
      <input class="modal-input" type="number" min="1" max="5" v-model.number="draft.importance" />

      <div class="modal-hint">图片 URL</div>
      <input class="modal-input" v-model="draft.imageUrl" placeholder="https://..." />

      <div class="modal-hint">上传图片</div>
      <button class="btn-cancel" @click="triggerUpload">选择图片</button>
      <input ref="fileInput" type="file" accept="image/*" style="display:none" @change="handleUpload" />

      <div class="modal-hint">样式预设</div>
      <select class="modal-input" v-model="draft.cardStyleId">
        <option value="">不使用预设</option>
        <option v-for="p in presets" :key="p.id" :value="p.id">{{ p.name }}</option>
      </select>

      <div class="modal-hint">自定义样式（覆盖预设）</div>
      <textarea class="modal-textarea" v-model="draft.cardStyleCss" placeholder="background:#fff; border-radius:10px;"></textarea>

      <div class="modal-hint">预览</div>
      <div class="preview-card" :style="previewStyle">
        <div class="preview-img" :style="previewImage"></div>
        <div class="preview-text">{{ draft.content }}</div>
      </div>

      <div class="modal-actions">
        <button class="btn-cancel" @click="showEdit = false">取消</button>
        <button class="btn-confirm" @click="saveEdit">保存</button>
      </div>
    </InnerModal>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import InnerModal from '@/components/InnerModal.vue'
import db from '@/db'
import { useMemoryCardStyles } from '@/composables/useMemoryCardStyles'

const props = defineProps({
  memories: Array
})
const emit = defineEmits(['update', 'delete', 'create'])

const { presets, getPresetById } = useMemoryCardStyles()

const showEdit = ref(false)
const isCreate = ref(false)
const draft = ref({ id: null, content: '', importance: 1, imageUrl: '', imageMediaId: '', cardStyleId: '', cardStyleCss: '' })
const fileInput = ref(null)

const mediaMap = ref({})

const loadMedia = async () => {
  const records = await db.media.toArray()
  const map = {}
  records.forEach(r => { map[r.id] = r.data })
  mediaMap.value = map
}

onMounted(loadMedia)
watch(() => props.memories, loadMedia, { deep: true })

const openEdit = (m) => {
  isCreate.value = false
  draft.value = { 
    id: m.id, 
    content: m.content || m.text || '', 
    importance: Number(m.importance || 1),
    imageUrl: m.imageUrl || '',
    imageMediaId: m.imageMediaId || '',
    cardStyleId: m.cardStyleId || '',
    cardStyleCss: m.cardStyleCss || ''
  }
  showEdit.value = true
}

const openCreate = () => {
  isCreate.value = true
  draft.value = { id: null, content: '', importance: 3, imageUrl: '', imageMediaId: '', cardStyleId: '', cardStyleCss: '' }
  showEdit.value = true
}

const triggerUpload = () => {
  if (fileInput.value) fileInput.value.click()
}

const handleUpload = async (e) => {
  const file = e.target.files[0]
  if (!file || !draft.value.id) {
    alert('请先保存记忆，再上传图片')
    return
  }
  const reader = new FileReader()
  reader.onload = async (ev) => {
    const data = ev.target.result
    const mediaId = `mem_img_${draft.value.id}`
    await db.media.put({ id: mediaId, data })
    draft.value.imageMediaId = mediaId
    draft.value.imageUrl = ''
    await loadMedia()
  }
  reader.readAsDataURL(file)
}

const saveEdit = () => {
  if (isCreate.value) {
    emit('create', { 
      content: draft.value.content, 
      importance: draft.value.importance, 
      weight: draft.value.importance, 
      type: 'core',
      imageUrl: draft.value.imageUrl,
      imageMediaId: draft.value.imageMediaId,
      cardStyleId: draft.value.cardStyleId,
      cardStyleCss: draft.value.cardStyleCss
    })
  } else {
    emit('update', draft.value.id, { 
      content: draft.value.content, 
      text: draft.value.content, 
      importance: draft.value.importance, 
      weight: draft.value.importance,
      imageUrl: draft.value.imageUrl,
      imageMediaId: draft.value.imageMediaId,
      cardStyleId: draft.value.cardStyleId,
      cardStyleCss: draft.value.cardStyleCss
    })
  }
  showEdit.value = false
}

const handleDelete = (id) => {
  if (confirm('确定要删除这条记忆吗？')) {
    emit('delete', id)
  }
}

const getCardStyle = (m) => {
  let style = ''
  const preset = m.cardStyleId ? getPresetById(m.cardStyleId) : null
  if (preset && preset.css) style += preset.css
  if (m.cardStyleCss) style += ';' + m.cardStyleCss
  return style
}

const getCardImage = (m) => {
  if (m.imageMediaId && mediaMap.value[m.imageMediaId]) return `background-image:url(${mediaMap.value[m.imageMediaId]})`
  if (m.imageUrl) return `background-image:url(${m.imageUrl})`
  return ''
}

const previewStyle = computed(() => {
  let style = ''
  const preset = draft.value.cardStyleId ? getPresetById(draft.value.cardStyleId) : null
  if (preset && preset.css) style += preset.css
  if (draft.value.cardStyleCss) style += ';' + draft.value.cardStyleCss
  return style
})

const previewImage = computed(() => {
  if (draft.value.imageMediaId && mediaMap.value[draft.value.imageMediaId]) return `background-image:url(${mediaMap.value[draft.value.imageMediaId]})`
  if (draft.value.imageUrl) return `background-image:url(${draft.value.imageUrl})`
  return ''
})
</script>

<style scoped>
.core-tab { padding: 10px 0; }
.core-header { display:flex; justify-content: space-between; align-items:center; margin-bottom: 10px; }
.core-title { font-size: 13px; font-weight: 700; color: #333; }
.btn-ghost { background: transparent; border: 1px solid #ddd; border-radius: 16px; padding: 6px 10px; font-size: 11px; cursor: pointer; }
.empty-tip { text-align:center; color:#888; font-size:12px; margin-top:30px; }
.polaroid-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.polaroid-card {
  background: #fff;
  border-radius: 8px;
  padding: 10px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.05);
  position: relative;
}
.polaroid-img {
  width: 100%;
  height: 90px;
  background: #f4f5f7;
  border-radius: 6px;
  display:flex;
  align-items:center;
  justify-content:center;
  color:#aaa;
  margin-bottom:8px;
  background-size: cover;
  background-position: center;
}
.polaroid-text {
  font-size: 12px;
  line-height: 1.4;
  color: #333;
}
.polaroid-meta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 6px;
}
.meta-tag {
  font-size: 10px;
  color: #666;
  background: #f4f5f7;
  padding: 2px 6px;
  border-radius: 6px;
}
.polaroid-actions {
  position: absolute;
  right: 8px;
  top: 8px;
  display: flex;
  gap: 6px;
  color: #888;
}
.polaroid-actions i { cursor: pointer; }

.preview-card { background:#fff; padding:10px; border-radius:10px; border:1px solid #eee; }
.preview-img { width:100%; height:60px; background:#f4f5f7; border-radius:6px; margin-bottom:6px; background-size:cover; background-position:center; }
.preview-text { font-size:12px; color:#333; }
</style>
