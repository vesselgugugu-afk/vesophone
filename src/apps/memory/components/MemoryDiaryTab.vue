<template>
  <!-- 绝杀第一步：移除了该父容器的所有 relative 和 z-index 封印 -->
  <div class="diary-tab">

    <div class="diary-filters">
      <!-- 绝杀第二步：全面抛弃自定义复杂下拉，回归原生 select 以绝后患 -->
      <select class="native-select" v-model="filterLevel">
        <option value="all">全部级别</option>
        <option value="1">L1 原始记录</option>
        <option value="2">L2 阶段总结</option>
        <option value="3">L3 长期回忆</option>
      </select>

      <select class="native-select" v-model="filterArchived">
        <option value="all">全部状态</option>
        <option value="active">未归档</option>
        <option value="archived">已归档</option>
      </select>

      <select class="native-select" v-model="filterMonth" v-if="monthOptions.length > 0">
        <option value="all">全部时间</option>
        <option v-for="m in monthOptions" :key="m" :value="m">{{ m }}</option>
      </select>

      <button class="btn-ghost" @click="toggleOrganize">{{ organizeMode ? '取消整理' : '整理记忆' }}</button>
    </div>

    <div class="scrubber-track" v-if="monthOptions.length > 1">
      <div class="scrubber">
        <span 
          v-for="m in monthOptions" 
          :key="m" 
          :class="{ active: activeScrub === m }"
          @click="scrollToMonth(m)"
        >{{ m.split('-')[1] }}月</span>
      </div>
    </div>

    <div v-if="filteredDiaries.length === 0" class="empty-tip">暂无起居注</div>

    <div v-for="(group, key) in groupedDiaries" :key="key" class="folder-group" :id="`month-${key}`">
      <div class="folder-tab" :class="{ 'is-collapsed': collapsedMonths.includes(key) }" @click="toggleMonthCollapse(key)">
        <span class="folder-title">{{ key }}</span>
        <span class="folder-count">{{ group.length }} 篇</span>
      </div>
      
      <div class="folder-drawer" :class="{ 'is-open': !collapsedMonths.includes(key) }">
        <div class="folder-drawer-inner">
          <div class="folder-body">
            
            <label class="diary-page" v-for="d in group" :key="d.id" @click="handleOpenCard(d, $event)">
              <div class="diary-checkbox" v-if="organizeMode">
                <input type="checkbox" :value="d.id" v-model="selectedIds" />
              </div>
              <div class="diary-meta" v-else>
                <span class="diary-day">{{ formatDay(d.timestamp || d.date) }}</span>
                <span class="diary-time">{{ formatTime(d.timestamp || d.date) }}</span>
              </div>
              <div class="diary-preview">
                <div class="diary-title">
                  <span>{{ d.title || '起居注' }}</span>
                  <span class="diary-type" :class="'level-' + (d.level || 1)">L{{ d.level || 1 }}</span>
                </div>
                <div class="diary-tags">
                  <span class="tag" v-if="d.isArchived">已归档</span>
                  <span class="tag" v-if="d.type && d.type !== 'daily'">{{ d.type }}</span>
                </div>
                <div class="diary-excerpt">{{ d.content }}</div>
              </div>
              <div class="diary-actions" v-if="!organizeMode">
                <i class="fas fa-edit" @click.stop="openEdit(d)"></i>
                <i class="fas fa-trash" @click.stop="handleDelete(d.id)"></i>
              </div>
            </label>

          </div>
        </div>
      </div>
    </div>

    <button v-if="organizeMode" class="generate-btn" @click="openSummaryModal" :disabled="selectedIds.length === 0">
      生成回忆 (已选 {{ selectedIds.length }} 篇)
    </button>

    <!-- 增强版编辑弹窗 -->
    <InnerModal :show="showEdit" @close="showEdit = false">
      <div class="modal-title">编辑起居注排版</div>
      
      <input class="modal-input" v-model="draft.title" placeholder="标题 / 物品名称" />
      <textarea class="modal-textarea" v-model="draft.content" placeholder="正文内容" style="height:100px;"></textarea>
      
      <div class="modal-hint" style="margin-top:12px;">排版样式预设</div>
      <select class="custom-select" style="width:100%;" v-model="draft.cardStyleId">
        <option value="">基础纯净版式 (无预设)</option>
        <option v-for="p in diaryPresets" :key="p.id" :value="p.id">{{ p.name }} ({{ p.layout }})</option>
      </select>

      <template v-if="needsImage">
        <div class="modal-hint" style="margin-top:12px;">卡片配图 (URL)</div>
        <input class="modal-input" v-model="draft.imageUrl" placeholder="https://..." />
        
        <div class="modal-hint">或 上传本地配图</div>
        <button class="btn-cancel" @click="triggerUpload" style="width:100%;">选择图片</button>
        <input ref="fileInput" type="file" accept="image/*" style="display:none" @change="handleUpload" />
      </template>

      <div style="display:flex; gap:15px; margin-top:16px;">
        <div style="flex:1;">
          <div class="modal-hint">类型 (Tag)</div>
          <input class="modal-input" v-model="draft.type" placeholder="daily/其他" />
        </div>
        <div style="flex:1;">
          <div class="modal-hint">级别 (1-3)</div>
          <input class="modal-input" type="number" min="1" max="3" v-model.number="draft.level" />
        </div>
      </div>

      <div class="modal-hint">归档状态</div>
      <div class="pill-group" style="margin-top:0;">
        <div class="pill-item" :class="{ active: draft.isArchived === false }" @click="draft.isArchived = false">未归档</div>
        <div class="pill-item" :class="{ active: draft.isArchived === true }" @click="draft.isArchived = true">已归档</div>
      </div>

      <div class="modal-hint">高级自定义 CSS</div>
      <textarea class="modal-textarea code-editor" style="height:60px;" v-model="draft.cardStyleCss" placeholder="/* 覆写当前引擎 CSS */"></textarea>

      <!-- 编辑界面的实时排版预览 -->
      <div class="modal-hint" style="margin-top:10px;">排版引擎预览</div>
      <div class="preview-stage">
        <component :is="'style'">{{ previewViewerCss }}</component>
        
        <div style="transform: scale(0.6); transform-origin: top center; pointer-events:none;">
          
          <div v-if="previewLayout === 'wechat'" class="wx-page">
            <div class="wx-header">
              <div class="wx-avatar" :style="userAvatarStyle"></div>
              <div class="wx-user-name">{{ userName }}</div>
              <div class="wx-date">摘录于 {{ activeDateStr }}</div>
            </div>
            <div class="wx-divider"></div>
            <div class="wx-content">{{ draft.content || '正文预览...' }}</div>
            <div class="wx-footer">
              <div class="wx-source"><span class="wx-slash">/</span>{{ draft.title || '标题' }}</div>
              <div class="wx-char-name">{{ charName }} <span class="wx-tag">#{{ draft.type || 'daily' }}</span></div>
            </div>
          </div>

          <div v-else-if="previewLayout === 'calendar'" class="cal-square">
            <div class="cal-time">
              <div class="cal-date-num">{{ activeDay }}</div>
              <div class="cal-month">{{ activeMonthEn }} {{ activeYear }}</div>
              <div class="cal-tag">#{{ draft.type || 'daily' }}</div>
            </div>
            <div class="cal-divider"><div class="cal-dot"></div><div class="cal-line"></div></div>
            <div class="cal-content">{{ draft.content || '正文预览...' }}</div>
            <div class="cal-footer">
              <div class="cal-title">{{ draft.title || 'Memory Archive' }}</div>
              <div class="cal-char-name">{{ charName }}</div>
            </div>
          </div>

          <div v-else-if="previewLayout === 'letter'" class="letter-paper">
            <div class="letter-grid">
              <div class="letter-text">
                <div class="letter-salutation">Dear {{ letterUserName }}：</div>
                <div class="letter-body">
                  <p v-for="(p, idx) in previewLetterParagraphs" :key="idx">{{ p }}</p>
                </div>
                <div class="letter-sign">
                  <div class="letter-sig-name">{{ letterCharName }}</div>
                  <div class="letter-sig-date">{{ letterDateText }}</div>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="previewLayout === 'magazine'" class="mag-card">
            <div class="mag-cover" :style="getDiaryImageStyle(draft, 'https://images.unsplash.com/photo-1476820865390-c52aeebb9891?q=80&w=800&auto=format&fit=crop')">
              <div class="mag-top-bar">
                <span class="mag-tag">#{{ draft.type || 'daily' }}</span>
                <span class="mag-date">{{ formatCardDate(draft.timestamp || draft.date) }}</span>
              </div>
            </div>
            <div class="mag-content">
              <div class="mag-text">
                <span class="mag-dropcap" v-if="previewMagParts.first">{{ previewMagParts.first }}</span>
                <span>{{ previewMagParts.rest }}</span>
              </div>
              <div class="mag-divider"></div>
              <div class="mag-footer">
                <span class="mag-author">{{ charName }}</span>
                <span class="mag-title">{{ draft.title || 'Excerpt' }}</span>
              </div>
            </div>
          </div>

          <div v-else-if="previewLayout === 'pixel'" class="pix-panel">
            <div class="pix-inner">
              <div class="pix-header">
                <div class="pix-header-main">
                  <div class="pix-avatar" :style="getDiaryImageStyle(draft)">
                    <svg v-if="!draft.imageMediaId && !draft.imageUrl" viewBox="0 0 24 24"><path d="M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 0h-4V4h4v2z"/></svg>
                  </div>
                  <div class="pix-title">{{ draft.title || '新手の物件' }}</div>
                </div>
                <div class="pix-btn-close"><svg viewBox="0 0 24 24"><line x1="6" y1="6" x2="18" y2="18"></line><line x1="6" y1="18" x2="18" y2="6"></line></svg></div>
              </div>
              <div class="pix-divider"></div>
              <div class="pix-body">{{ draft.content || '正文预览...' }}</div>
              <div class="pix-footer"><div class="pix-action">回收</div><div class="pix-action">互动</div></div>
            </div>
          </div>

          <div v-else-if="previewLayout === 'journal'" class="journal-paper">
            <div class="journal-header"><div class="journal-title">{{ draft.title || '起居注标题' }}</div><div class="journal-date">date {{ activeDateStr }}</div></div>
            <div class="journal-body">{{ draft.content || '正文预览...' }}</div>
          </div>

          <div v-else-if="previewLayout === 'profile'" class="profile-card">
            <div class="card-banner"><svg class="banner-icon" viewBox="0 0 24 24"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg></div>
            <div class="profile-avatar-container"><div class="profile-avatar-inner" :style="charAvatarStyle"></div></div>
            <div class="profile-info"><div class="profile-name">{{ charName }}</div><div class="profile-bio">{{ draft.title || '标题作为名片签名' }}</div></div>
            <div class="profile-stats"><div class="stat-item"><span class="stat-number">128</span><span class="stat-label">Posts</span></div><div class="stat-divider"></div><div class="stat-item"><span class="stat-number">4.2k</span><span class="stat-label">Followers</span></div></div>
            <div class="profile-action"><button class="btn-follow"><svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>Follow</button></div>
            <div class="profile-divider"><div></div></div>
            <div class="profile-body">{{ draft.content || '正文预览...' }}</div>
            <div class="profile-footer"><div class="profile-tags"><span class="profile-tag-item">#{{ draft.type || 'daily' }}</span></div><div>{{ activeDateStr }}</div></div>
          </div>

          <div v-else class="dd-card">
            <div class="dd-header">
              <div class="dd-avatar" :style="charAvatarStyle"></div>
              <div class="dd-name">{{ charName }}</div>
              <div class="dd-date">{{ activeDateStr }}</div>
            </div>
            <div class="dd-image-area" v-if="draft.imageMediaId || draft.imageUrl" :style="getDiaryImageStyle(draft)"></div>
            <div class="dd-title" v-if="draft.title">{{ draft.title }}</div>
            <div class="dd-content">{{ draft.content || '正文预览...' }}</div>
            <div class="dd-footer">
              <span style="font-weight:bold; background:#f4f5f7; padding:2px 6px; border-radius:4px;">#{{ draft.type || 'daily' }}</span>
              <span>{{ formatTime(draft.timestamp || draft.date) }}</span>
            </div>
          </div>

        </div>
      </div>

      <div class="modal-actions" style="margin-top:20px;">
        <button class="btn-cancel" @click="showEdit = false">取消</button>
        <button class="btn-confirm" @click="saveEdit">保存更新</button>
      </div>
    </InnerModal>

    <!-- 沉浸式引擎渲染 Modal (展示与高清长图克隆保存用) -->
    <div class="viewer-overlay" :class="{ show: showViewerModal }" @click.self="closeViewer">
      <div class="close-modal" @click="closeViewer"><i class="fas fa-times"></i></div>
      
      <div class="render-target-wrap" v-if="activeDiary" id="renderWrap">
        
        <component :is="'style'">{{ activeViewerCss }}</component>
        
        <div id="diaryRenderNode" class="render-engine-box">
          
          <div v-if="activeLayout === 'wechat'" class="wx-page">
            <div class="wx-header">
              <div class="wx-avatar" :style="userAvatarStyle"></div>
              <div class="wx-user-name">{{ userName }}</div>
              <div class="wx-date">摘录于 {{ activeDateStr }}</div>
            </div>
            <div class="wx-divider"></div>
            <div class="wx-content">{{ activeDiary.content }}</div>
            <div class="wx-footer">
              <div class="wx-source"><span class="wx-slash">/</span>{{ activeDiary.title || '无名起居注' }}</div>
              <div class="wx-char-name">{{ charName }} <span class="wx-tag">#{{ activeDiary.type || 'daily' }}</span></div>
            </div>
          </div>

          <div v-else-if="activeLayout === 'calendar'" class="cal-square">
            <div class="cal-time">
              <div class="cal-date-num">{{ activeDay }}</div>
              <div class="cal-month">{{ activeMonthEn }} {{ activeYear }}</div>
              <div class="cal-tag">#{{ activeDiary.type || 'daily' }}</div>
            </div>
            <div class="cal-divider"><div class="cal-dot"></div><div class="cal-line"></div></div>
            <div class="cal-content">{{ activeDiary.content }}</div>
            <div class="cal-footer">
              <div class="cal-title">{{ activeDiary.title || 'Memory Archive' }}</div>
              <div class="cal-char-name">{{ charName }}</div>
            </div>
          </div>

          <div v-else-if="activeLayout === 'letter'" class="letter-paper">
            <div class="letter-grid">
              <div class="letter-text">
                <div class="letter-salutation">Dear {{ letterUserName }}：</div>
                <div class="letter-body">
                  <p v-for="(p, idx) in viewerLetterParagraphs" :key="idx">{{ p }}</p>
                </div>
                <div class="letter-sign">
                  <div class="letter-sig-name">{{ letterCharName }}</div>
                  <div class="letter-sig-date">{{ letterDateText }}</div>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="activeLayout === 'magazine'" class="mag-card">
            <div class="mag-cover" :style="getDiaryImageStyle(activeDiary, 'https://images.unsplash.com/photo-1476820865390-c52aeebb9891?q=80&w=800&auto=format&fit=crop')">
              <div class="mag-top-bar">
                <span class="mag-tag">#{{ activeDiary.type || 'daily' }}</span>
                <span class="mag-date">{{ formatCardDate(activeDiary.timestamp || activeDiary.date) }}</span>
              </div>
            </div>
            <div class="mag-content">
              <div class="mag-text">
                <span class="mag-dropcap" v-if="viewerMagParts.first">{{ viewerMagParts.first }}</span>
                <span>{{ viewerMagParts.rest }}</span>
              </div>
              <div class="mag-divider"></div>
              <div class="mag-footer">
                <span class="mag-author">{{ charName }}</span>
                <span class="mag-title">{{ activeDiary.title || 'Excerpt' }}</span>
              </div>
            </div>
          </div>

          <div v-else-if="activeLayout === 'pixel'" class="pix-panel">
            <div class="pix-inner">
              <div class="pix-header">
                <div class="pix-header-main">
                  <div class="pix-avatar" :style="getDiaryImageStyle(activeDiary)">
                    <svg v-if="!activeDiary.imageMediaId && !activeDiary.imageUrl" viewBox="0 0 24 24"><path d="M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 0h-4V4h4v2z"/></svg>
                  </div>
                  <div class="pix-title">{{ activeDiary.title || '新手の物件' }}</div>
                </div>
                <div class="pix-btn-close"><svg viewBox="0 0 24 24"><line x1="6" y1="6" x2="18" y2="18"></line><line x1="6" y1="18" x2="18" y2="6"></line></svg></div>
              </div>
              <div class="pix-divider"></div>
              <div class="pix-body">{{ activeDiary.content }}</div>
              <div class="pix-footer"><div class="pix-action">回收</div><div class="pix-action">互动</div></div>
            </div>
          </div>

          <div v-else-if="activeLayout === 'journal'" class="journal-paper">
            <div class="journal-header"><div class="journal-title">{{ activeDiary.title || '起居注标题' }}</div><div class="journal-date">date {{ activeDateStr }}</div></div>
            <div class="journal-body">{{ activeDiary.content }}</div>
          </div>

          <div v-else-if="activeLayout === 'profile'" class="profile-card">
            <div class="card-banner"><svg class="banner-icon" viewBox="0 0 24 24"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg></div>
            <div class="profile-avatar-container"><div class="profile-avatar-inner" :style="charAvatarStyle"></div></div>
            <div class="profile-info"><div class="profile-name">{{ charName }}</div><div class="profile-bio">{{ activeDiary.title || '标题作为名片签名' }}</div></div>
            <div class="profile-stats"><div class="stat-item"><span class="stat-number">128</span><span class="stat-label">Posts</span></div><div class="stat-divider"></div><div class="stat-item"><span class="stat-number">4.2k</span><span class="stat-label">Followers</span></div></div>
            <div class="profile-action"><button class="btn-follow"><svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>Follow</button></div>
            <div class="profile-divider"><div></div></div>
            <div class="profile-body">{{ activeDiary.content }}</div>
            <div class="profile-footer"><div class="profile-tags"><span class="profile-tag-item">#{{ activeDiary.type || 'daily' }}</span></div><div>{{ activeDateStr }}</div></div>
          </div>

          <div v-else class="dd-card">
            <div class="dd-header">
              <div class="dd-avatar" :style="charAvatarStyle"></div>
              <div class="dd-name">{{ charName }}</div>
              <div class="dd-date">{{ activeDateStr }}</div>
            </div>
            <div class="dd-image-area" v-if="activeDiary.imageMediaId || activeDiary.imageUrl" :style="getDiaryImageStyle(activeDiary)"></div>
            <div class="dd-title" v-if="activeDiary.title">{{ activeDiary.title }}</div>
            <div class="dd-content">{{ activeDiary.content }}</div>
            <div class="dd-footer">
              <span style="font-weight:bold; background:#f4f5f7; padding:2px 6px; border-radius:4px;">#{{ activeDiary.type || 'daily' }}</span>
              <span>{{ formatTime(activeDiary.timestamp || activeDiary.date) }}</span>
            </div>
          </div>

        </div>
      </div>

      <div class="viewer-actions" v-if="activeDiary">
        <button class="save-img-btn" @click="downloadCardImage">
          <i class="fas fa-camera"></i> 咔嚓，保存相片
        </button>
      </div>
    </div>

    <!-- 生成回忆 Modal -->
    <InnerModal :show="showSummary" @close="showSummary = false">
      <div class="modal-title">生成高级回忆</div>
      <div class="modal-hint" style="text-align:center; margin-bottom:10px;">将提取所选记录的核心内容生成新日记</div>
      <div class="pill-group" style="margin-top:10px;">
        <div class="pill-item" :class="{ active: targetLevel === 2 }" @click="targetLevel = 2">生成 L2 阶段总结</div>
        <div class="pill-item" :class="{ active: targetLevel === 3 }" @click="targetLevel = 3">生成 L3 长期回忆</div>
      </div>
      <div class="modal-actions" style="margin-top:24px;">
        <button class="btn-cancel" @click="showSummary = false" :disabled="isSummarizing">取消</button>
        <button class="btn-confirm" @click="handleSummary" :disabled="selectedIds.length === 0 || isSummarizing">
          <i v-if="isSummarizing" class="fas fa-spinner fa-spin" style="margin-right:6px;"></i>
          {{ isSummarizing ? '正在提取生成...' : '确认生成' }}
        </button>
      </div>
    </InnerModal>

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useApi } from '@/composables/useApi'
import { useDiaryCardStyles } from '@/composables/useDiaryCardStyles'
import { useProfile } from '@/composables/useProfile'
import InnerModal from '@/components/InnerModal.vue'
import db from '@/db'

const props = defineProps({ diaries: Array, settings: Object, character: Object })
const emit = defineEmits(['update', 'delete', 'archive', 'add-summary', 'refresh', 'remind'])

const { apiUrl, apiKey, apiModel } = useApi()
const { presets: diaryPresets, getPresetById } = useDiaryCardStyles()
const { userProfile } = useProfile()

const userName = computed(() => userProfile.value?.name || '我')
const userAvatarStyle = computed(() => userProfile.value?.avatar ? `background-image:url(${userProfile.value.avatar})` : 'background:#eee')

const charName = computed(() => props.character?.name || 'TA')
const charAvatarStyle = computed(() => props.character?.avatar ? `background-image:url(${props.character.avatar})` : 'background:#eee')

const filterLevel = ref('all')
const filterArchived = ref('all')
const filterMonth = ref('all')

const organizeMode = ref(false)
const selectedIds = ref([])
const collapsedMonths = ref([])

const showEdit = ref(false)
const draft = ref({ id: null, title: '', content: '', type: 'daily', level: 1, isArchived: false, cardStyleId: '', cardStyleCss: '', imageUrl: '', imageMediaId: '' })
const fileInput = ref(null)

const showSummary = ref(false)
const targetLevel = ref(2)
const isSummarizing = ref(false)
const activeScrub = ref('')

const showViewerModal = ref(false)
const activeDiary = ref(null)

const mediaMap = ref({})
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

const loadMedia = async () => {
  const records = await db.media.toArray()
  const map = {}
  records.forEach(r => { map[r.id] = r.data })
  mediaMap.value = map
}

const getDropCapParts = (text) => {
  const t = text || ''
  if (!t) return { first: '', rest: '' }
  const first = t.charAt(0)
  const rest = t.slice(1)
  return { first, rest }
}

const splitToParagraphs = (text) => {
  const t = text || ''
  return t.split(/\n+/).map(s => s.trim()).filter(Boolean)
}

const previewMagParts = computed(() => {
  return getDropCapParts(draft.value.content || '正文预览...')
})

const viewerMagParts = computed(() => {
  return getDropCapParts(activeDiary.value?.content || '')
})

const letterUserName = computed(() => convertText(userName.value))
const letterCharName = computed(() => convertText(charName.value))

const previewLetterContent = computed(() => convertText(draft.value.content || '正文预览...'))
const viewerLetterContent = computed(() => convertText(activeDiary.value?.content || ''))

const previewLetterParagraphs = computed(() => splitToParagraphs(previewLetterContent.value))
const viewerLetterParagraphs = computed(() => splitToParagraphs(viewerLetterContent.value))

onMounted(async () => { 
  loadMedia() 
  await loadOpenCC()
})
watch(() => props.diaries, loadMedia, { deep: true })

watch(() => props.settings, (s) => {
  if (!s) return
  targetLevel.value = Number(s.diaryAutoTargetLevel || 2)
}, { immediate: true, deep: true })

const activeLayout = computed(() => {
  if (activeDiary.value) {
    const p = getPresetById(activeDiary.value.cardStyleId)
    return p ? (p.layout || 'default') : 'default'
  }
  return 'default'
})

const previewLayout = computed(() => {
  const p = getPresetById(draft.value.cardStyleId)
  return p ? (p.layout || 'default') : 'default'
})

const needsImage = computed(() => ['magazine', 'pixel', 'default'].includes(previewLayout.value))

const normalizeDate = (d) => { if(!d) return new Date(); const dt = new Date(d); return isNaN(dt.getTime()) ? new Date() : dt }
const getActiveDateObj = (d) => d ? normalizeDate(d.timestamp || d.date) : new Date()

const activeDateObj = computed(() => getActiveDateObj(activeDiary.value || draft.value))
const activeDateStr = computed(() => `${activeDateObj.value.getFullYear()}.${String(activeDateObj.value.getMonth()+1).padStart(2,'0')}.${String(activeDateObj.value.getDate()).padStart(2,'0')}`)
const activeYear = computed(() => activeDateObj.value.getFullYear())
const activeMonthEn = computed(() => ['January','February','March','April','May','June','July','August','September','October','November','December'][activeDateObj.value.getMonth()])
const activeMonthCn = computed(() => ['孟春','仲春','季春','孟夏','仲夏','季夏','孟秋','仲秋','季秋','孟冬','仲冬','季冬'][activeDateObj.value.getMonth()])
const activeDay = computed(() => String(activeDateObj.value.getDate()).padStart(2,'0'))
const letterDateText = computed(() => convertText(`${activeYear.value}年 ${activeMonthCn.value}`))

const toggleMonthCollapse = (mk) => { const i = collapsedMonths.value.indexOf(mk); if(i>-1) collapsedMonths.value.splice(i,1); else collapsedMonths.value.push(mk) }

const formatMonth = (d) => { const dt=normalizeDate(d); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}` }
const formatDay = (d) => String(normalizeDate(d).getDate()).padStart(2,'0')
const formatTime = (d) => { const dt=normalizeDate(d); return `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}` }
const formatCardDate = (d) => { const dt=normalizeDate(d); const ms=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']; return `${ms[dt.getMonth()]} ${String(dt.getDate()).padStart(2,'0')}, ${dt.getFullYear()}` }

const filteredDiaries = computed(() => {
  return (props.diaries || []).filter(d => {
    if (filterLevel.value !== 'all' && String(d.level || 1) !== filterLevel.value) return false
    if (filterArchived.value === 'active' && d.isArchived) return false
    if (filterArchived.value === 'archived' && !d.isArchived) return false
    if (filterMonth.value !== 'all' && formatMonth(d.timestamp || d.date) !== filterMonth.value) return false
    return true
  }).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
})

const groupedDiaries = computed(() => {
  const groups = {}
  filteredDiaries.value.forEach(d => { const k = formatMonth(d.timestamp || d.date); if(!groups[k]) groups[k]=[]; groups[k].push(d) })
  return groups
})

const monthOptions = computed(() => { const s=new Set((props.diaries||[]).map(d=>formatMonth(d.timestamp||d.date))); return Array.from(s).filter(Boolean).sort().reverse() })

const toggleOrganize = () => { organizeMode.value = !organizeMode.value; if(!organizeMode.value) selectedIds.value = [] }

const openEdit = (d) => {
  draft.value = { ...d, cardStyleId: d.cardStyleId||'', cardStyleCss: d.cardStyleCss||'', imageUrl: d.imageUrl||'', imageMediaId: d.imageMediaId||'', title: d.title||'', type: d.type||'daily' }
  showEdit.value = true
}

const triggerUpload = () => { if(fileInput.value) fileInput.value.click() }
const handleUpload = async (e) => {
  const f = e.target.files[0]
  if (!f || !draft.value.id) return alert('先保存，再传图')
  const reader = new FileReader()
  reader.onload = async (ev) => {
    const id = `diary_img_${draft.value.id}`
    await db.media.put({ id, data: ev.target.result })
    draft.value.imageMediaId = id
    draft.value.imageUrl = ''
    await loadMedia()
  }
  reader.readAsDataURL(f)
}

const saveEdit = () => { emit('update', draft.value.id, { ...draft.value }); showEdit.value = false }
const handleDelete = (id) => { if(confirm('删除起居注？')) emit('delete', id) }

const handleOpenCard = (d, e) => {
  if (organizeMode.value) return
  e.preventDefault()
  activeDiary.value = d
  showViewerModal.value = true
}

const closeViewer = () => { showViewerModal.value = false; setTimeout(() => activeDiary.value = null, 300) }

const getDiaryImageStyle = (d, fallback) => {
  if (d.imageMediaId && mediaMap.value[d.imageMediaId]) return `background-image: url(${mediaMap.value[d.imageMediaId]})`
  if (d.imageUrl) return `background-image: url(${d.imageUrl})`
  return fallback ? `background-image: url(${fallback})` : ''
}

const activeViewerCss = computed(() => {
  if (!activeDiary.value) return ''
  let css = ''
  const preset = activeDiary.value.cardStyleId ? getPresetById(activeDiary.value.cardStyleId) : null
  if (preset && preset.css) css += preset.css
  if (activeDiary.value.cardStyleCss) css += '\n' + activeDiary.value.cardStyleCss
  return css || `.dd-card { background: #fff; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); padding: 24px; width: 320px; color: #333; } .dd-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; } .dd-avatar { width: 36px; height: 36px; border-radius: 50%; background-size: cover; } .dd-name { font-size: 15px; font-weight: 600; flex: 1; } .dd-date { font-size: 12px; color: #888; } .dd-image-area { width: 100%; height: 200px; background-size: cover; background-position: center; border-radius: 8px; margin-bottom: 20px; } .dd-title { font-size: 16px; font-weight: bold; margin-bottom: 8px; } .dd-content { font-size: 14px; line-height: 1.6; color: #555; white-space: pre-wrap; } .dd-footer { margin-top: 20px; border-top: 1px solid #eee; padding-top: 12px; display: flex; font-size: 11px; color: #aaa; gap: 8px; }`
})

const previewViewerCss = computed(() => {
  let css = ''
  const preset = draft.value.cardStyleId ? getPresetById(draft.value.cardStyleId) : null
  if (preset && preset.css) css += preset.css
  if (draft.value.cardStyleCss) css += '\n' + draft.value.cardStyleCss
  return css || `.dd-card { background: #fff; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); padding: 24px; width: 320px; color: #333; } .dd-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; } .dd-avatar { width: 36px; height: 36px; border-radius: 50%; background-size: cover; } .dd-name { font-size: 15px; font-weight: 600; flex: 1; } .dd-date { font-size: 12px; color: #888; } .dd-image-area { width: 100%; height: 200px; background-size: cover; background-position: center; border-radius: 8px; margin-bottom: 20px; } .dd-title { font-size: 16px; font-weight: bold; margin-bottom: 8px; } .dd-content { font-size: 14px; line-height: 1.6; color: #555; white-space: pre-wrap; } .dd-footer { margin-top: 20px; border-top: 1px solid #eee; padding-top: 12px; display: flex; font-size: 11px; color: #aaa; gap: 8px; }`
})

// 【核心长图渲染逻辑：克隆节点跳出限制】
const downloadCardImage = async () => {
  const el = document.getElementById('diaryRenderNode')
  if (!el) return
  
  window.dispatchEvent(new CustomEvent('sys-toast', { detail: '正在生成高清长图...' }))
  
  if (!window.html2canvas) {
    await new Promise((res) => { const s = document.createElement('script'); s.src = 'https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js'; s.onload = res; document.head.appendChild(s) })
  }
  
  try {
    // 深度克隆原始卡片
    const clone = el.cloneNode(true)
    
    // 强制脱离一切滚动限制，放在屏幕外自由生长
    clone.style.position = 'absolute'
    clone.style.top = '-9999px'
    clone.style.left = '-9999px'
    clone.style.margin = '0'
    clone.style.maxHeight = 'none'
    clone.style.overflow = 'visible'
    
    // 把专属 CSS 注入克隆体内
    const styleNode = document.createElement('style')
    styleNode.innerHTML = activeViewerCss.value
    clone.insertBefore(styleNode, clone.firstChild)
    
    document.body.appendChild(clone)
    
    // 给予浏览器充足的重排和字体加载时间
    await new Promise(r => setTimeout(r, 400))
    
    const canvas = await window.html2canvas(clone, { 
      scale: 3, 
      backgroundColor: null, 
      useCORS: true, 
      allowTaint: true,
      windowWidth: clone.scrollWidth,
      windowHeight: clone.scrollHeight
    })
    
    document.body.removeChild(clone)

    const link = document.createElement('a')
    link.download = `Memory_Archive_${activeDiary.value.id}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    window.dispatchEvent(new CustomEvent('sys-toast', { detail: '已完整保存至相册' }))
  } catch (err) { 
    alert('保存图片失败，请检查浏览器权限。') 
  }
}

const openSummaryModal = () => { if(selectedIds.value.length > 0) showSummary.value = true }
const handleSummary = async () => {
  if (selectedIds.value.length === 0) return
  if (!apiKey.value) return alert('请配置 API Key')
  const items = (props.diaries || []).filter(d => selectedIds.value.includes(d.id))
  let targetTs = Date.now(), targetDate = new Date().toLocaleString()
  if (items.length > 0) {
    const m = items.reduce((p, c) => (p.timestamp||0) > (c.timestamp||0) ? p : c)
    targetTs = (m.timestamp||Date.now()) + 1
    targetDate = new Date(targetTs).toLocaleString()
  }
  isSummarizing.value = true
  try {
    const base = props.settings?.diaryArchivePrompt || '整理回忆'
    const prompt = `${base}\n\n【选中记录】\n` + items.map((d,i) => `${i+1}. ${d.content}`).join('\n')
    const res = await fetch(apiUrl.value, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey.value}` }, body: JSON.stringify({ model: apiModel.value, messages: [{ role: 'user', content: prompt }] }) })
    if (!res.ok) throw new Error('API Error')
    const data = await res.json()
    const content = data.choices[0].message?.content?.trim() || ''
    if (content) {
      emit('add-summary', { characterId: props.character?.id, content, level: targetLevel.value || 2, type: 'summary', isArchived: false, source: 'diary_archive', timestamp: targetTs, date: targetDate })
      emit('archive', selectedIds.value)
      selectedIds.value = []; organizeMode.value = false; emit('refresh')
    }
  } catch(e) { alert('生成失败') } finally { isSummarizing.value = false; showSummary.value = false }
}
const scrollToMonth = (m) => { activeScrub.value = m; const el = document.getElementById(`month-${m}`); if(el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
watch(() => filteredDiaries.value.length, () => { if(monthOptions.value.length > 0) activeScrub.value = monthOptions.value[0] })
</script>

<style scoped>
/* 核心：移除了 relative 等层级限制，完全释放页面层叠上下文 */
.diary-tab { padding: 10px 0 10px 0; }

.diary-filters { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; padding-right: 40px; }

/* 换成绝对不惹事的原生原生下拉框 */
.native-select {
  appearance: none;
  -webkit-appearance: none;
  background-color: #f4f5f7;
  border: 1px solid transparent;
  border-radius: 20px;
  padding: 6px 28px 6px 14px;
  font-size: 12px;
  font-weight: 600;
  color: #555;
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23888%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  background-size: 12px;
  outline: none;
  cursor: pointer;
  transition: all 0.2s;
}
.native-select:focus { border-color: #ddd; background-color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }

.pill-group { display: flex; gap: 6px; background: #f4f5f7; padding: 4px; border-radius: 12px; }
.pill-item { flex: 1; text-align: center; padding: 10px 0; font-size: 12px; color: #666; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
.pill-item.active { background: #fff; color: #000; font-weight: 600; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }

.btn-ghost { background: transparent; border: 1px solid #ddd; border-radius: 20px; padding: 6px 14px; font-size: 12px; font-weight: 600; cursor: pointer; transition: 0.2s; color:#333; }
.btn-ghost:active { background: #f4f5f7; }

.empty-tip { text-align:center; color:#888; font-size:12px; margin-top:30px; }

.scrubber-track { position: absolute; right: 0; top: 60px; bottom: 20px; width: 40px; pointer-events: none; z-index: 10; }
.scrubber { position: sticky; top: 20px; display: flex; flex-direction: column; align-items: center; gap: 12px; background: rgba(255,255,255,0.9); backdrop-filter: blur(10px); border: 1px solid rgba(0,0,0,0.05); border-radius: 20px; padding: 16px 8px; font-size: 11px; color: #888; box-shadow: 0 6px 20px rgba(0,0,0,0.08); pointer-events: auto; }
.scrubber span { cursor: pointer; writing-mode: vertical-rl; text-align: center; transition: 0.2s; letter-spacing: 2px; }
.scrubber span.active { color: #000; font-weight: 700; transform: scale(1.1); }

.folder-group { margin-bottom: 20px; padding-right: 46px; }
.folder-tab { display: inline-flex; align-items: center; gap: 8px; background: #fdfdfc; padding: 12px 20px; border-radius: 12px 12px 0 0; border: 1px solid #eee; border-bottom: none; cursor: pointer; user-select: none; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.folder-tab:active { transform: scale(0.98); }
.folder-tab.is-collapsed { border-radius: 12px; border-bottom: 1px solid #eee; background: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
.folder-title { font-size: 14px; font-weight: 700; color: #333; }
.folder-count { font-size: 12px; color: #aaa; font-weight: 500; }

.folder-drawer { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.35s cubic-bezier(0.4, 0, 0.2, 1); }
.folder-drawer.is-open { grid-template-rows: 1fr; }
.folder-drawer-inner { overflow: hidden; }
.folder-body { background: #fdfdfc; border: 1px solid #eee; border-radius: 0 12px 12px 12px; padding: 12px; display: flex; flex-direction: column; gap: 12px; }

.diary-page { background: #fff; border-radius: 12px; padding: 16px; display: flex; gap: 12px; align-items: flex-start; box-shadow: 0 2px 8px rgba(0,0,0,0.03); border-left: 3px solid #eee; transition: transform 0.2s; cursor: pointer; }
.diary-page:active { transform: scale(0.98); }
.diary-meta { min-width: 44px; text-align:center; display:flex; flex-direction:column; margin-top:2px; }
.diary-day { font-size: 20px; font-weight: 700; line-height: 1; }
.diary-time { font-size: 10px; opacity: 0.6; margin-top: 4px; }
.diary-preview { flex: 1; }
.diary-title { display:flex; justify-content: space-between; font-size: 14px; font-weight: 700; margin-bottom: 6px; }
.diary-type { font-size: 10px; padding: 3px 8px; border-radius: 6px; font-weight: 600; }
.level-1 { background: rgba(0,0,0,0.05); }
.level-2 { background: rgba(92,138,255,0.1); color: #5c8aff; }
.level-3 { background: rgba(255,152,0,0.1); color: #ff9800; }
.diary-excerpt { font-size: 13px; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; opacity: 0.85; }
.diary-tags { display: flex; gap: 6px; margin-bottom: 8px; }
.tag { font-size: 10px; background: rgba(0,0,0,0.05); padding: 3px 8px; border-radius: 8px; }
.diary-actions { display:flex; gap:16px; opacity:0.3; font-size: 13px; margin-top:4px; }
.diary-actions i { cursor:pointer; transition: 0.2s; }
.diary-actions i:hover { opacity: 1; }

.diary-checkbox { margin-top: 6px; }
.diary-checkbox input { appearance: none; width: 18px; height: 18px; border: 2px solid #ddd; border-radius: 50%; outline: none; position: relative; cursor: pointer; transition: 0.2s; }
.diary-checkbox input:checked { background: #000; border-color: #000; }
.diary-checkbox input:checked::after { content: ''; position: absolute; left: 5px; top: 2px; width: 4px; height: 8px; border: solid #fff; border-width: 0 2px 2px 0; transform: rotate(45deg); }

.generate-btn { width: calc(100% - 28px); margin-top: 16px; padding: 14px; border: none; border-radius: 16px; background: #000; color: #fff; font-size: 14px; font-weight: 600; box-shadow: 0 4px 15px rgba(0,0,0,0.1); transition: 0.2s; cursor: pointer; }
.generate-btn:disabled { background: #ccc; box-shadow: none; cursor: not-allowed; }

.custom-select { appearance: none; background: #f9f9f9; border: 1px solid #eee; border-radius: 10px; padding: 10px 12px; font-size: 12px; outline: none; font-weight: 600; }
.code-editor { font-family: monospace; background: #282a36; color: #f8f8f2; padding: 10px; border-radius: 8px; outline: none; border: none; }

.preview-stage { background: #f4f5f7; border-radius: 12px; padding: 16px; display: flex; justify-content: center; margin-top: 8px; box-shadow: inset 0 2px 10px rgba(0,0,0,0.02); min-height: 120px; overflow: hidden; align-items: center;}

/* ======== 沉浸式引擎渲染区域 ======== */
.viewer-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); z-index: 99999; display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.3s; padding: 20px; box-sizing: border-box; }
.viewer-overlay.show { opacity: 1; pointer-events: auto; }

.close-modal { position: absolute; top: env(safe-area-inset-top, 30px); right: 20px; width: 36px; height: 36px; background: rgba(255,255,255,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; z-index: 100000; cursor: pointer; color: #fff; transition: 0.2s; }
.close-modal:active { background: rgba(255,255,255,0.3); }

/* 原本的显示容器，在克隆长图时会被无视 */
.render-target-wrap { display: flex; justify-content: center; width: 100%; max-height: 80vh; overflow-y: auto; overflow-x: hidden; margin-bottom: 24px; animation: slideUp 0.5s cubic-bezier(0.2, 0.8, 0.2, 1); border-radius: 16px; }
.render-target-wrap::-webkit-scrollbar { display: none; }
@keyframes slideUp { from { transform: translateY(40px) scale(0.95); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }

.viewer-actions { display: flex; justify-content: center; animation: fadeIn 0.8s ease; }
@keyframes fadeIn { from{opacity:0;} to{opacity:1;} }

.save-img-btn { background: #fff; color: #000; border: none; padding: 16px 36px; border-radius: 30px; font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); cursor: pointer; transition: transform 0.2s; }
.save-img-btn:active { transform: scale(0.95); box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
</style>
