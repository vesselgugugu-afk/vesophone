<template>
  <transition name="slide-up">
    <div v-if="show" class="app-window style-manager-bg" style="z-index: 110;">
      
      <div class="app-header glass-header">
        <div class="btn-back" @click="$emit('close')">返回</div>
        <div class="app-title">卡片排版与样式</div>
        <div class="header-right"></div>
      </div>

      <div class="style-tabs">
        <div class="style-tab" :class="{ active: activeTab === 'core' }" @click="activeTab = 'core'">核心卡片</div>
        <div class="style-tab" :class="{ active: activeTab === 'diary' }" @click="activeTab = 'diary'">起居注分享</div>
      </div>

      <div class="content-area pad-area">
        
        <div class="setting-card" v-if="activeTab === 'core'">
          <div class="card-header">
            <i class="fas fa-magic"></i> 全局记忆库背景 CSS
          </div>
          <div class="card-body">
            <textarea class="code-editor" v-model="globalCssDraft" placeholder="/* 例如：body { background: #fff; } */"></textarea>
            <div class="btn-group">
              <button class="btn-sub" @click="globalCssDraft = ''">清空</button>
              <button class="btn-main" @click="saveGlobalCss">应用全局背景</button>
            </div>
          </div>
        </div>

        <div class="setting-card">
          <div class="card-header" style="justify-content: space-between;">
            <div><i class="fas fa-layer-group"></i> {{ activeTab === 'core' ? '核心记忆样式预设' : '起居注排版预设' }}</div>
            <div class="header-actions">
              <span @click="showImport = true">导入</span>
              <span @click="showExport = true">导出</span>
            </div>
          </div>
          
          <div class="card-body">
            <div class="preset-list" v-if="currentPresets.length > 0">
              <div class="preset-item" v-for="p in currentPresets" :key="p.id" @click="openEdit(p)">
                <div class="preset-info">
                  <div class="preset-name">{{ p.name }}</div>
                  <div class="preset-badge" v-if="p.layout">{{ p.layout }}</div>
                </div>
                <div class="preset-action" @click.stop="handleDelete(p.id)">
                  <i class="fas fa-trash-alt"></i>
                </div>
              </div>
            </div>
            <div v-else class="empty-status">暂无预设</div>
            
            <button class="btn-main full-width" style="margin-top:16px;" @click="openCreate">
              <i class="fas fa-plus"></i> 新增预设
            </button>
          </div>
        </div>

      </div>

      <InnerModal :show="showEdit" @close="showEdit = false">
        <div class="modal-title">{{ editingId ? '编辑预设' : '新增预设' }}</div>
        
        <input class="modal-input" v-model="draft.name" placeholder="预设名称" />
        
        <div v-if="activeTab === 'diary'" style="margin-top:10px;">
          <div class="modal-hint">排版布局引擎 (Layout)</div>
          <select class="custom-select" style="width:100%;" v-model="draft.layout">
            <option value="default">基础纯净版式</option>
            <option value="wechat">微信读书风</option>
            <option value="calendar">锐利日历风</option>
            <option value="letter">古典信笺风</option>
            <option value="magazine">杂志排版风</option>
            <option value="pixel">像素游戏风</option>
            <option value="journal">活页手账风</option>
            <option value="profile">口袋名片风</option>
          </select>
        </div>

        <div class="modal-hint" style="margin-top:10px;">CSS 代码</div>
        <textarea class="modal-textarea code-editor" style="height: 120px;" v-model="draft.css" placeholder="填写对应的 CSS"></textarea>
        
        <div class="modal-hint">排版引擎预览</div>
        <div class="preview-stage">
          <component :is="'style'">{{ draft.css }}</component>
          
          <div v-if="activeTab === 'core'" class="preview-card-mock" :style="draft.css">
            <div style="font-weight:bold;">标题</div>
            <div style="font-size:12px;">核心卡片内容</div>
          </div>
          
          <div v-else-if="activeTab === 'diary'" style="transform: scale(0.6); transform-origin: top center; pointer-events:none;">
            <div v-if="draft.layout === 'wechat'" class="wx-page">
              <div class="wx-header"><div class="wx-avatar" style="background:#eee;"></div><div class="wx-user-name">User</div><div class="wx-date">摘录于 2026.03.15</div></div>
              <div class="wx-divider"></div>
              <div class="wx-content">排版预览正文...</div>
              <div class="wx-footer"><div class="wx-source"><span class="wx-slash">/</span>起居注标题</div><div class="wx-char-name">Char <span class="wx-tag">#daily</span></div></div>
            </div>

            <div v-else-if="draft.layout === 'calendar'" class="cal-square">
              <div class="cal-time"><div class="cal-date-num">15</div><div class="cal-month">March 2026</div><div class="cal-tag">#daily</div></div>
              <div class="cal-divider"><div class="cal-dot"></div><div class="cal-line"></div></div>
              <div class="cal-content">排版预览正文...</div>
              <div class="cal-footer"><div class="cal-title">起居注标题</div><div class="cal-char-name">Char</div></div>
            </div>

            <div v-else-if="draft.layout === 'letter'" class="letter-paper">
              <div class="letter-grid">
                <div class="letter-text">
                  <div class="letter-salutation">Dear {{ previewLetterUserName }}：</div>
                  <div class="letter-body">
                    <p v-for="(p, idx) in previewLetterParagraphs" :key="idx">{{ p }}</p>
                  </div>
                  <div class="letter-sign"><div class="letter-sig-name">{{ previewLetterCharName }}</div><div class="letter-sig-date">{{ previewLetterDateText }}</div></div>
                </div>
              </div>
            </div>

            <div v-else-if="draft.layout === 'magazine'" class="mag-card">
              <div class="mag-cover" style="background:#ddd; height:60px;"><div class="mag-top-bar"><span class="mag-tag">#daily</span><span class="mag-date">MAR 15, 2026</span></div></div>
              <div class="mag-content">
                <div class="mag-text"><span class="mag-dropcap">排</span><span>版预览正文...</span></div>
                <div class="mag-divider"></div>
                <div class="mag-footer"><span class="mag-author">Char</span><span class="mag-title">起居注标题</span></div>
              </div>
            </div>

            <div v-else-if="draft.layout === 'pixel'" class="pix-panel">
              <div class="pix-inner">
                <div class="pix-header">
                  <div class="pix-header-main"><div class="pix-avatar"><svg viewBox="0 0 24 24"><path d="M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 0h-4V4h4v2z"/></svg></div><div class="pix-title">起居注标题</div></div>
                  <div class="pix-btn-close"><svg viewBox="0 0 24 24"><line x1="6" y1="6" x2="18" y2="18"></line><line x1="6" y1="18" x2="18" y2="6"></line></svg></div>
                </div>
                <div class="pix-divider"></div>
                <div class="pix-body">排版预览正文...</div>
                <div class="pix-footer"><div class="pix-action">回收</div><div class="pix-action">互动</div></div>
              </div>
            </div>

            <div v-else-if="draft.layout === 'journal'" class="journal-paper">
              <div class="journal-header"><div class="journal-title">起居注标题</div><div class="journal-date">date 2026.03.15</div></div>
              <div class="journal-body">排版预览正文...</div>
            </div>

            <div v-else-if="draft.layout === 'profile'" class="profile-card">
              <div class="card-banner"><svg class="banner-icon" viewBox="0 0 24 24"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg></div>
              <div class="profile-avatar-container"><div class="profile-avatar-inner" style="background:#eee;"></div></div>
              <div class="profile-info"><div class="profile-name">Char</div><div class="profile-bio">起居注标题</div></div>
              <div class="profile-stats"><div class="stat-item"><span class="stat-number">128</span><span class="stat-label">Posts</span></div><div class="stat-divider"></div><div class="stat-item"><span class="stat-number">4.2k</span><span class="stat-label">Followers</span></div></div>
              <div class="profile-action"><button class="btn-follow"><svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>Follow</button></div>
              <div class="profile-divider"><div></div></div>
              <div class="profile-body">排版预览正文...</div>
              <div class="profile-footer"><div class="profile-tags"><span class="profile-tag-item">#daily</span></div><div>2026.03.15</div></div>
            </div>

            <div v-else class="dd-card">
              <div class="dd-header"><div class="dd-avatar" style="background:#eee;"></div><div class="dd-name">Char</div><div class="dd-date">2026.03.15</div></div>
              <div class="dd-title">起居注标题</div>
              <div class="dd-content">排版预览正文...</div>
              <div class="dd-footer"><span style="font-weight:bold; background:#f4f5f7; padding:2px 6px; border-radius:4px;">#daily</span></div>
            </div>
          </div>
        </div>

        <div class="modal-actions" style="margin-top: 20px;">
          <button class="btn-cancel" @click="showEdit = false">取消</button>
          <button class="btn-confirm" @click="savePreset">保存预设</button>
        </div>
      </InnerModal>

      <InnerModal :show="showImport" @close="showImport = false">
        <div class="modal-title">导入样式预设</div>
        <textarea class="modal-textarea code-editor" style="height: 150px;" v-model="importText" placeholder="粘贴 JSON 格式的预设数据"></textarea>
        <div class="modal-actions" style="margin-top: 20px;">
          <button class="btn-cancel" @click="showImport = false">取消</button>
          <button class="btn-confirm" @click="handleImport">确认导入</button>
        </div>
      </InnerModal>

      <InnerModal :show="showExport" @close="showExport = false">
        <div class="modal-title">导出样式预设</div>
        <textarea class="modal-textarea code-editor" style="height: 150px;" :value="exportText" readonly></textarea>
        <div class="modal-actions" style="margin-top: 20px;">
          <button class="btn-cancel" @click="showExport = false">关闭</button>
          <button class="btn-confirm" @click="copyExport">复制到剪贴板</button>
        </div>
      </InnerModal>

    </div>
  </transition>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import InnerModal from '@/components/InnerModal.vue'
import { useMemoryCardStyles } from '@/composables/useMemoryCardStyles'
import { useDiaryCardStyles } from '@/composables/useDiaryCardStyles'
import { useMemorySettings } from '@/composables/useMemorySettings'

const props = defineProps({ show: Boolean })
defineEmits(['close'])

const activeTab = ref('core')

const coreStyles = useMemoryCardStyles()
const diaryStyles = useDiaryCardStyles()
const { getGlobalCss, setGlobalCss } = useMemorySettings()

const currentPresets = computed(() => {
  return activeTab.value === 'core' ? coreStyles.presets.value : diaryStyles.presets.value
})

const showEdit = ref(false)
const editingId = ref(null)
const draft = ref({ name: '', layout: 'default', css: '' })

const showImport = ref(false)
const showExport = ref(false)
const importText = ref('')

const globalCssDraft = ref(getGlobalCss())
watch(() => props.show, (v) => { if (v) globalCssDraft.value = getGlobalCss() })

const exportText = computed(() => {
  return activeTab.value === 'core' ? coreStyles.exportPresets() : diaryStyles.exportPresets()
})

const openccConverter = ref(null)

const loadOpenCC = () => {
  return new Promise((resolve) => {
    if (window.OpenCC) {
      openccConverter.value = window.OpenCC.Converter({ from: 'cn', to: 'tw' })
      resolve()
      return
    }
    const existing = document.getElementById('opencc-js')
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.OpenCC) openccConverter.value = window.OpenCC.Converter({ from: 'cn', to: 'tw' })
        resolve()
      })
      existing.addEventListener('error', resolve)
      return
    }
    const s = document.createElement('script')
    s.id = 'opencc-js'
    s.src = 'https://cdn.jsdelivr.net/npm/opencc-js@1.0.5/dist/umd/full.js'
    s.onload = () => {
      if (window.OpenCC) openccConverter.value = window.OpenCC.Converter({ from: 'cn', to: 'tw' })
      resolve()
    }
    s.onerror = resolve
    document.head.appendChild(s)
  })
}

const convertText = (text) => {
  const t = text || ''
  if (!openccConverter.value) return t
  try {
    return openccConverter.value(t)
  } catch (e) {
    return t
  }
}

const splitToParagraphs = (text) => {
  const t = text || ''
  return t.split(/\n+/).map(s => s.trim()).filter(Boolean)
}

const previewLetterUserName = computed(() => convertText('远方的旅人'))
const previewLetterCharName = computed(() => convertText('建构师 Vessel'))
const previewLetterDateText = computed(() => convertText('二零二六年 晚秋'))
const previewLetterContent = computed(() => convertText('见字如面。你一定察觉到了，这张信纸上的线条变得更加细密。当我试图将更多的思绪挤进这有限的纸面时，字距与行距的压缩，反而带来了一种不可言说的紧迫与私密感。\n我重新调整了每一次落笔的重心，让缩小后的字符依然能够死死地咬住那条褪色的红线。在这个一切都可以被轻易划过、被瞬间遗忘的世界里，这种不留缝隙的紧密排列，就像是一种固执的抵抗。\n不需要太多的留白来稀释情感。愿你在阅读这密密麻麻的墨迹时，能听见指尖摩挲过纸面时那些细碎的回音。'))
const previewLetterParagraphs = computed(() => splitToParagraphs(previewLetterContent.value))

onMounted(async () => {
  await loadOpenCC()
})

const openCreate = () => {
  editingId.value = null
  draft.value = { name: '', layout: 'default', css: '' }
  showEdit.value = true
}

const openEdit = (p) => {
  editingId.value = p.id
  draft.value = { name: p.name, layout: p.layout || 'default', css: p.css }
  showEdit.value = true
}

const savePreset = () => {
  if (!draft.value.name.trim()) return
  const manager = activeTab.value === 'core' ? coreStyles : diaryStyles
  
  if (editingId.value) {
    manager.updatePreset(editingId.value, { name: draft.value.name.trim(), layout: draft.value.layout, css: draft.value.css })
  } else {
    manager.addPreset(draft.value.name.trim(), draft.value.layout, draft.value.css)
  }
  showEdit.value = false
}

const handleDelete = (id) => {
  if (confirm('确定删除该预设吗？')) {
    const manager = activeTab.value === 'core' ? coreStyles : diaryStyles
    manager.deletePreset(id)
  }
}

const handleImport = () => {
  const manager = activeTab.value === 'core' ? coreStyles : diaryStyles
  if (manager.importPresets(importText.value)) {
    importText.value = ''
    showImport.value = false
    window.dispatchEvent(new CustomEvent('sys-toast', { detail: '导入成功' }))
  } else {
    alert('导入失败，请检查 JSON 格式是否正确')
  }
}

const copyExport = async () => {
  await navigator.clipboard.writeText(exportText.value)
  showExport.value = false
  window.dispatchEvent(new CustomEvent('sys-toast', { detail: '已复制到剪贴板' }))
}

const saveGlobalCss = () => {
  setGlobalCss(globalCssDraft.value)
  window.dispatchEvent(new CustomEvent('sys-toast', { detail: '全局背景已应用' }))
}
</script>

<style scoped>
.style-manager-bg { background-color: #f4f5f7 !important; display: flex; flex-direction: column; }
.glass-header { background: #fff !important; border-bottom: 1px solid rgba(0,0,0,0.05); flex-shrink: 0; }

.style-tabs { display: flex; background: #fff; border-bottom: 1px solid rgba(0,0,0,0.05); flex-shrink: 0; }
.style-tab { flex: 1; text-align: center; padding: 12px 0; font-size: 13px; font-weight: 600; color: #8e8e93; cursor: pointer; position: relative; transition: 0.2s; }
.style-tab.active { color: #1c1c1e; }
.style-tab.active::after { content: ''; position: absolute; bottom: 0; left: 30%; right: 30%; height: 3px; background: #1c1c1e; border-radius: 3px 3px 0 0; }

.content-area { flex: 1; overflow-y: auto; padding: 20px 16px; display: flex; flex-direction: column; gap: 20px; }

.setting-card { background: #ffffff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); overflow: hidden; flex-shrink: 0; }
.card-header { padding: 16px 20px; font-size: 14px; font-weight: 700; color: #1c1c1e; border-bottom: 1px solid #f0f0f0; display: flex; align-items: center; gap: 8px; }
.card-header i { color: #8e8e93; }
.header-actions { display: flex; gap: 12px; font-size: 12px; font-weight: 500; color: #5c8aff; cursor: pointer; }
.card-body { padding: 16px 20px; }

.code-editor { width: 100%; background: #282a36; color: #f8f8f2; border: none; border-radius: 12px; padding: 12px; font-family: "Fira Code", monospace; font-size: 11px; line-height: 1.5; outline: none; resize: none; box-shadow: inset 0 2px 8px rgba(0,0,0,0.2); }
.btn-group { display: flex; gap: 12px; margin-top: 12px; }
.full-width { width: 100%; justify-content: center; }

.btn-main { flex: 1; background: #1c1c1e; color: #fff; border: none; border-radius: 12px; padding: 12px; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; }
.btn-main:active { transform: scale(0.98); }
.btn-sub { background: #f4f5f7; color: #1c1c1e; border: none; border-radius: 12px; padding: 12px 20px; font-size: 13px; font-weight: 600; cursor: pointer; }

.preset-list { display: flex; flex-direction: column; gap: 12px; }
.preset-item { background: #fdfdfc; border: 1px solid #eee; border-radius: 12px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
.preset-info { display: flex; align-items: center; gap: 12px; }
.preset-name { font-size: 13px; font-weight: 600; color: #1c1c1e; min-width: 80px; }
.preset-badge { font-size: 9px; background: #eef2ff; color: #5c8aff; padding: 2px 6px; border-radius: 4px; font-family: monospace; text-transform: uppercase; }
.preset-action { color: #ff3b30; padding: 8px; border-radius: 50%; background: rgba(255,59,48,0.05); }

.empty-status { text-align: center; color: #8e8e93; font-size: 12px; padding: 20px 0; }

.preview-stage { background: #f4f5f7; border-radius: 12px; padding: 16px; display: flex; justify-content: center; margin-top: 8px; box-shadow: inset 0 2px 10px rgba(0,0,0,0.02); min-height: 120px; overflow: hidden; align-items: center;}
.preview-card-mock { width: 100%; background: #fff; border-radius: 8px; padding: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }

.custom-select { appearance: none; background: #f9f9f9; border: 1px solid #eee; border-radius: 10px; padding: 8px 12px; font-size: 12px; outline: none; font-weight: 600; }
</style>
