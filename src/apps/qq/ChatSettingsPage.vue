<template>
  <transition name="slide-up">
    <div v-if="show" class="app-window" style="z-index: 80; background: var(--bg-color);">
      <component :is="'style'">{{ draft.customCss }}</component>
      
      <div class="app-header">
        <div class="btn-back" @click="$emit('close')">取消</div>
        <div class="app-title">角色设置</div>
        <div class="header-right" @click="handleSave" style="color:var(--text-main); font-size:14px; font-weight:600;">保存</div>
      </div>

      <div class="editor-tabs" style="margin-top:0; padding-top:10px; background:#fff;">
        <div :class="['editor-tab', { active: activeTab === 'basic' }]" @click="activeTab = 'basic'">资料</div>
        <div :class="['editor-tab', { active: activeTab === 'chat' }]" @click="activeTab = 'chat'">功能</div>
        <div :class="['editor-tab', { active: activeTab === 'status' }]" @click="activeTab = 'status'">状态栏</div>
        <div :class="['editor-tab', { active: activeTab === 'css' }]" @click="activeTab = 'css'">外观</div>
      </div>

      <input type="file" ref="fileInput" accept="image/*" style="display:none;" @change="handleFileChange" />
      <input type="file" ref="jsonFileInput" accept=".json,application/json" style="display:none;" @change="handleJsonFileChange" />

      <!-- Tab 1: 基础设置 -->
      <div class="content-area" v-if="activeTab === 'basic'">
        
        <div style="background:#fff; border-radius:14px; padding:20px; display:flex; flex-direction:column; align-items:center; gap:10px; box-shadow:0 2px 10px rgba(0,0,0,0.02);">
          <div 
            style="width:80px; height:80px; border-radius:50%; background:#f4f5f7; border:2px dashed #ddd; display:flex; justify-content:center; align-items:center; cursor:pointer; background-size:cover; background-position:center; position:relative;"
            :style="getDraftAvatarStyle"
            @click="showAvatarAction = true"
          >
            <i v-if="!getDraftAvatarStyle" class="fas fa-camera" style="color:#aaa; font-size:24px;"></i>
            <div style="position:absolute; bottom:-5px; right:-5px; background:#fff; border-radius:50%; width:26px; height:26px; display:flex; justify-content:center; align-items:center; box-shadow:0 2px 8px rgba(0,0,0,0.15);">
              <i class="fas fa-camera" style="font-size:11px; color:#666;"></i>
            </div>
          </div>

          <input 
            style="text-align:center; font-size:18px; font-weight:600; border:none; background:transparent; outline:none; margin-top:8px; width:80%;" 
            v-model="draft.title" 
            placeholder="设置备注名..." 
          />
          
          <div style="font-size:11px; color:#888;">
            网名: {{ aiChar.name || '无' }} <span v-if="aiChar.trueName && aiChar.trueName !== aiChar.name">| 真名: {{ aiChar.trueName }}</span>
          </div>
        </div>

        <div style="background:#fff; border-radius:14px; padding:15px; display:flex; flex-direction:column; gap:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="font-weight:600; font-size:13px; color:var(--text-main);">当前变量状态</div>
            <span style="font-size:11px; color:#5c8aff; cursor:pointer;" @click="saveCurrentVarsToPreset">保存为角色预设</span>
          </div>
          
          <div v-if="!draft.variablesState || Object.keys(draft.variablesState).length === 0" style="font-size:12px; color:#aaa; text-align:center; padding:10px 0;">当前角色无变量</div>
          <div v-else style="display:flex; flex-wrap:wrap; gap:8px;">
            <div v-for="(val, key) in draft.variablesState" :key="key" style="background:#f4f5f7; padding:6px 10px; border-radius:8px; font-size:12px; display:flex; gap:6px; align-items:center;">
              <span style="color:var(--text-sub);">{{ key }}:</span>
              <input type="text" style="width:50px; background:transparent; border:none; border-bottom:1px solid #ddd; outline:none; font-weight:600; text-align:center;" v-model="draft.variablesState[key]" />
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:10px; margin-top:10px; border-top:1px solid #f0f0f0; padding-top:10px;" v-if="aiChar.variablePresets && aiChar.variablePresets.length > 0">
            <span style="font-size:11px; color:var(--text-sub); white-space:nowrap;">应用预设</span>
            <select style="background:#f4f5f7; border:none; padding:6px 10px; font-size:12px; border-radius:8px; outline:none; flex:1;" @change="applyVariablePreset($event.target.value)">
              <option value="">-- 覆盖当前状态 --</option>
              <option v-for="(p, i) in aiChar.variablePresets" :key="i" :value="i">{{ p.name }}</option>
            </select>
          </div>
        </div>

        <div style="background:#fff; border-radius:14px; padding:15px; display:flex; flex-direction:column; gap:12px;">
          <div style="font-weight:600; font-size:13px; color:var(--text-main);">当前人设综合提示词预览</div>
          <div style="font-size:11px; color:#888;">包含基础设定、高级指令及满足条件的【阶段提示词】：</div>
          <div style="background:#f9f9f9; padding:10px; border-radius:8px; font-family:monospace; font-size:11px; color:#555; white-space:pre-wrap; max-height:150px; overflow-y:auto; line-height:1.4;">
            {{ activeCharPrompt }}
          </div>
        </div>

        <div style="background:#fff; border-radius:14px; padding:15px; display:flex; flex-direction:column; gap:12px;">
          <div style="font-weight:600; font-size:13px; color:var(--text-main);">资源绑定</div>
          
          <div style="display:flex; flex-direction:column; gap:8px;">
            <label style="font-size:11px; color:var(--text-sub);">使用我的人设</label>
            <div class="persona-scroll-list">
              <div class="persona-card" :class="{ active: draft.boundPersonaId === null }" @click="draft.boundPersonaId = null">
                <div class="p-avatar"><i class="fas fa-globe"></i></div>
                <div class="p-name">全局默认</div>
              </div>
              <div class="persona-card" v-for="p in personas" :key="p.id" :class="{ active: draft.boundPersonaId === p.id }" @click="draft.boundPersonaId = p.id">
                <div class="p-avatar" :style="p.avatar ? `background-image:url(${p.avatar})` : ''">
                  <i v-if="!p.avatar" class="fas fa-user"></i>
                </div>
                <div class="p-name">{{ p.name || p.title }}</div>
              </div>
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:6px; margin-top:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <label style="font-size:11px; color:var(--text-sub);">绑定表情包库 (允许多选)</label>
              <span style="font-size:11px; color:#5c8aff; cursor:pointer;" @click="showStickerManager = true">管理全局表情包</span>
            </div>
            <div v-if="stickerGroups.length === 0" style="font-size:12px; color:#aaa;">暂无可用表情包组</div>
            <label v-for="sg in stickerGroups" :key="sg.id" style="display:flex; align-items:center; gap:8px; font-size:13px;">
              <input type="checkbox" :value="sg.id" v-model="draft.boundStickerGroups" /> {{ sg.name }}
            </label>
          </div>

          <div style="display:flex; flex-direction:column; gap:8px; margin-top:12px;">
            <label style="font-size:11px; color:var(--text-sub);">绑定局部世界书</label>
            <div v-if="Object.keys(groupedLocalWorldbooks).length === 0" style="font-size:12px; color:#aaa;">暂无世界书资源</div>
            <div class="wb-group-container" v-for="(wbs, groupName) in groupedLocalWorldbooks" :key="groupName">
              <div class="wb-group-header">
                <span style="font-weight:600; color:#555;">{{ groupName }} ({{ wbs.length }})</span>
                <div style="display:flex; gap:10px;">
                  <span style="color:#5c8aff; cursor:pointer;" @click="toggleLocalWbGroup(wbs, true)">全选</span>
                  <span style="color:#ff5252; cursor:pointer;" @click="toggleLocalWbGroup(wbs, false)">清空</span>
                </div>
              </div>
              <div class="wb-group-list">
                <label v-for="wb in wbs" :key="wb.id" class="wb-item-label">
                  <input type="checkbox" :checked="draft.boundWorldbookIds && draft.boundWorldbookIds.includes(wb.id)" @change="toggleLocalWb(wb.id)" />
                  <span class="wb-item-title">{{ wb.title }}</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 2: 聊天功能 -->
      <div class="content-area" v-if="activeTab === 'chat'">
        <div style="background:#fff; border-radius:14px; padding:15px; display:flex; flex-direction:column; gap:15px;">
          <div style="font-weight:600; font-size:13px; color:var(--text-main);">主动发消息系统</div>
          
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-size:13px; color:var(--text-main);">允许主动发消息</div>
              <div style="font-size:10px; color:#888; margin-top:4px;">角色在闲置时有概率主动寻找你</div>
            </div>
            <ToggleSwitch v-model="draft.settings.proactiveEnabled" />
          </div>

          <div v-if="draft.settings.proactiveEnabled" style="display:flex; flex-direction:column; gap:6px;">
            <label style="font-size:11px; color:var(--text-sub);">至少间隔多久才有概率发 (分钟)</label>
            <input type="number" class="ins-input" style="background:#f4f5f7; border-radius:8px; padding:10px;" v-model="draft.settings.proactiveIntervalMin" placeholder="60" />
          </div>
        </div>

        <div style="background:#fff; border-radius:14px; padding:15px; display:flex; flex-direction:column; gap:15px;">
          <div style="font-weight:600; font-size:13px; color:var(--text-main);">性能与上下文控制</div>
          <div style="display:flex; flex-direction:column; gap:6px;">
            <label style="font-size:11px; color:var(--text-sub);">前端渲染消息数 (防卡顿)</label>
            <input type="number" class="ins-input" style="background:#f4f5f7; border-radius:8px; padding:10px;" v-model="draft.settings.renderMessageCount" placeholder="50" />
          </div>
          <div style="display:flex; flex-direction:column; gap:6px;">
            <label style="font-size:11px; color:var(--text-sub);">携带上下文记录数 (节省 Token)</label>
            <input type="number" class="ins-input" style="background:#f4f5f7; border-radius:8px; padding:10px;" v-model="draft.settings.contextMessageCount" placeholder="20" />
          </div>
        </div>
      </div>

      <!-- Tab 3: 状态栏与动态 UI 引擎 -->
      <div class="content-area" v-if="activeTab === 'status'">
        <div style="background:#fff; border-radius:14px; padding:15px; display:flex; flex-direction:column; gap:15px;">
          
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="font-weight:600; font-size:13px; color:var(--text-main);">动态渲染预设库</div>
            <div style="display:flex; gap:8px; align-items:center;">
              <i class="fas fa-trash" style="color:#ff5252; cursor:pointer;" @click="handleDeleteStatusPreset" title="删除选中预设"></i>
              <i class="fas fa-file-export" style="color:#5c8aff; cursor:pointer;" @click="handleExportStatusPreset" title="导出预设"></i>
              <i class="fas fa-file-import" style="color:#1dd1a1; cursor:pointer;" @click="triggerJsonUpload" title="导入JSON文件"></i>
              <select style="background:#f4f5f7; border:none; padding:4px 8px; font-size:11px; border-radius:6px; outline:none; max-width:90px;" v-model="selectedStatusPresetId" @change="applyStatusPreset">
                <option value="">预设库...</option>
                <option v-for="p in statusPresets" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
            </div>
          </div>
          
          <div style="display:flex; flex-direction:column; gap:6px;">
            <label style="font-size:11px; color:var(--text-sub); font-weight:600;">发给AI的状态栏条数 (防Token爆炸)</label>
            <input type="number" class="ins-input" style="background:#f4f5f7; border-radius:8px; padding:10px; font-size:11px;" v-model="draft.settings.statusContextCount" placeholder="默认 1 条，即只发最新的一条状态" />
          </div>

          <div style="display:flex; flex-direction:column; gap:6px;">
            <label style="font-size:11px; color:var(--text-sub); font-weight:600;">输出提示词 (promptSuffix)</label>
            <textarea style="width:100%; height:100px; background:#f4f5f7; border-radius:10px; border:none; outline:none; padding:10px; font-size:12px; resize:none;" v-model="draft.settings.promptSuffix"></textarea>
          </div>

          <div style="display:flex; flex-direction:column; gap:6px;">
            <label style="font-size:11px; color:var(--text-sub); font-weight:600;">匹配正则表达式</label>
            <input class="ins-input" style="background:#f4f5f7; border-radius:8px; padding:10px; font-family:monospace; font-size:11px;" v-model="draft.settings.regexPattern" />
          </div>

          <div style="display:flex; flex-direction:column; gap:6px;">
            <label style="font-size:11px; color:var(--text-sub); font-weight:600;">HTML 渲染模板 (支持 &lt;!DOCTYPE html&gt;)</label>
            <textarea style="width:100%; height:180px; background:#282c34; color:#abb2bf; font-family:monospace; font-size:12px; padding:10px; border-radius:10px; border:none; outline:none; resize:none; line-height:1.5;" v-model="draft.settings.replacePattern"></textarea>
          </div>
          
          <button class="btn-send" style="padding:8px; border-radius:8px; font-size:12px;" @click="handleSaveAsStatusPreset">保存到动态预设库</button>
        </div>
      </div>

      <!-- Tab 4: CSS 外观设置 -->
      <div class="content-area" v-if="activeTab === 'css'">
        
        <div style="background:#fff; border-radius:14px; padding:15px; display:flex; flex-direction:column; gap:12px;">
          <div style="font-weight:600; font-size:13px; color:var(--text-main);">聊天背景图</div>
          <div style="display:flex; gap:10px; align-items:center;">
            <div 
              style="width:50px; height:50px; border-radius:12px; background:#f4f5f7; border:1px dashed #ccc; display:flex; justify-content:center; align-items:center; cursor:pointer; background-size:cover; background-position:center;"
              :style="draft.bgImage ? `background-image:url(${draft.bgImage})` : ''"
              @click="triggerUpload('bg')"
            >
              <i v-if="!draft.bgImage" class="fas fa-camera" style="color:#aaa;"></i>
            </div>
            <div style="flex:1; display:flex; flex-direction:column; gap:6px;">
              <div style="display:flex; gap:6px;">
                <input class="ins-input" style="background:#f4f5f7; border-radius:8px; padding:8px; flex:1; font-size:11px;" v-model="draft.bgImage" placeholder="URL 或点击左侧上传" />
                <button class="btn-cancel" style="padding:0 10px; font-size:11px; border-radius:8px;" @click="draft.bgImage = ''">清除</button>
              </div>
            </div>
          </div>
        </div>

        <div style="background:#fff; border-radius:14px; padding:15px; display:flex; flex-direction:column; gap:12px; flex:1;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="font-weight:600; font-size:13px; color:var(--text-main);">气泡 CSS</div>
            <div style="display:flex; gap:6px;">
              <i class="fas fa-trash" style="color:#ff5252; cursor:pointer; padding:5px;" @click="deleteCurrentPreset" title="删除选中预设"></i>
              <i class="fas fa-file-import" style="color:#5c8aff; cursor:pointer; padding:5px;" @click="importCssPreset" title="粘贴导入预设"></i>
              <select style="background:#f4f5f7; border:none; padding:4px; font-size:11px; border-radius:6px; outline:none; max-width:80px;" v-model="selectedPresetId" @change="applyCssPreset">
                <option value="">预设...</option>
                <option v-for="p in cssPresets" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
            </div>
          </div>
          
          <textarea v-model="draft.customCss" style="width:100%; height:120px; background:#282c34; color:#abb2bf; font-family:monospace; font-size:12px; padding:10px; border-radius:10px; border:none; outline:none; resize:none;"></textarea>
          <button class="btn-send" style="padding:8px; border-radius:8px; font-size:12px;" @click="handleSaveCssPreset">保存为新预设</button>
          
          <div style="margin-top:10px; padding:15px; background:var(--bg-color); border-radius:12px; overflow:hidden;" :style="draft.bgImage ? `background-image:url(${draft.bgImage}); background-size:cover;` : ''">
            <div class="msg-row is-ai">
              <div class="msg-avatar" style="background:#fff; color:#333;">A</div>
              <div class="msg-content-wrapper"><div class="msg-bubble">这是一条 AI 的回复预览</div></div>
            </div>
            <div class="msg-row is-user" style="margin-top:10px;">
              <div class="msg-avatar" style="background:var(--accent-color); color:#fff;">U</div>
              <div class="msg-content-wrapper"><div class="msg-bubble">这是你的发送气泡预览</div></div>
            </div>
          </div>
        </div>
      </div>

      <div class="ios-action-sheet-mask" v-if="showAvatarAction" @click.self="showAvatarAction = false">
        <div class="ios-action-sheet">
          <div class="ios-action-group">
            <div class="ios-action-btn" @click="triggerUpload('avatar')">上传本地图片</div>
            <div class="ios-action-btn" @click="inputAvatarUrl">输入网络 URL</div>
            <div class="ios-action-btn danger" @click="clearAvatar">恢复默认头像</div>
          </div>
          <div class="ios-action-cancel" @click="showAvatarAction = false">取消</div>
        </div>
      </div>

      <StickerManagerPage :show="showStickerManager" @close="showStickerManager = false" />
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { usePersona } from '@/composables/usePersona'
import { useStickers } from '@/composables/useStickers'
import { useWorldbook } from '@/composables/useWorldbook'
import { useChatSessions } from '@/composables/useChatSessions'
import { useCharacters } from '@/composables/useCharacters'
import { usePromptOrder } from '@/composables/usePromptOrder'
import { useStatusPresets } from '@/composables/useStatusPresets'
import ToggleSwitch from '@/components/ToggleSwitch.vue'
import StickerManagerPage from './StickerManagerPage.vue'

const props = defineProps({ show: Boolean, chat: { type: Object, required: true } })
const emit = defineEmits(['close'])

const activeTab = ref('basic')
const showStickerManager = ref(false)
const showAvatarAction = ref(false)

const draft = ref({})

watch(() => props.show, (val) => {
  if (val) {
    draft.value = JSON.parse(JSON.stringify(props.chat))
    
    if (!draft.value.settings) draft.value.settings = {}
    if (draft.value.settings.promptSuffix === undefined) draft.value.settings.promptSuffix = ''
    if (draft.value.settings.regexPattern === undefined) draft.value.settings.regexPattern = ''
    if (draft.value.settings.replacePattern === undefined) draft.value.settings.replacePattern = ''
    // 赋初始值为 1，代表只截取最近1条带给 AI
    if (draft.value.settings.statusContextCount === undefined) draft.value.settings.statusContextCount = 1 
    
    activeTab.value = 'basic'
  }
})

const { personas } = usePersona()
const { stickerGroups } = useStickers()
const { worldbooks } = useWorldbook()
const { cssPresets, saveCssPreset, deleteCssPreset } = useChatSessions()
const { getCharById, saveCharacter } = useCharacters()
const { buildCharacterPrompt } = usePromptOrder()

const { statusPresets, savePreset, deletePreset, exportPreset, importJson } = useStatusPresets()

const fileInput = ref(null)
const jsonFileInput = ref(null)
let uploadTarget = ''

const aiChar = computed(() => {
  if (!draft.value.isGroup && draft.value.participants && draft.value.participants.length > 0) {
    return getCharById(draft.value.participants[0].id) || {}
  }
  return {}
})

const getDraftAvatarStyle = computed(() => {
  if (draft.value.overrideAvatar) return `background-image: url(${draft.value.overrideAvatar})`
  if (aiChar.value && aiChar.value.avatar) return `background-image: url(${aiChar.value.avatar})`
  return ''
})

const activeCharPrompt = computed(() => {
  if (!aiChar.value.id) return '未找到或群聊状态'
  return buildCharacterPrompt(aiChar.value, draft.value.variablesState)
})

const groupedLocalWorldbooks = computed(() => {
  const groups = {}
  worldbooks.value.forEach(wb => {
    const g = wb.group || '通用'
    if (!groups[g]) groups[g] = []
    groups[g].push(wb)
  })
  return groups
})

const toggleLocalWb = (wbId) => {
  if (!draft.value.boundWorldbookIds) draft.value.boundWorldbookIds = []
  const idx = draft.value.boundWorldbookIds.indexOf(wbId)
  if (idx > -1) {
    draft.value.boundWorldbookIds.splice(idx, 1)
  } else {
    draft.value.boundWorldbookIds.push(wbId)
  }
}

const toggleLocalWbGroup = (wbs, state) => {
  if (!draft.value.boundWorldbookIds) draft.value.boundWorldbookIds = []
  wbs.forEach(wb => {
    const idx = draft.value.boundWorldbookIds.indexOf(wb.id)
    if (state && idx === -1) {
      draft.value.boundWorldbookIds.push(wb.id)
    } else if (!state && idx > -1) {
      draft.value.boundWorldbookIds.splice(idx, 1)
    }
  })
}

const handleSave = () => {
  Object.assign(props.chat, draft.value)
  emit('close')
}

const saveCurrentVarsToPreset = () => {
  if (!aiChar.value.id) return alert('群聊不支持保存变量')
  const name = prompt('为当前的变量状态起个名字：', '新预设')
  if (name) {
    if (!aiChar.value.variablePresets) aiChar.value.variablePresets = []
    aiChar.value.variablePresets.push({ name, values: JSON.parse(JSON.stringify(draft.value.variablesState)) })
    saveCharacter(aiChar.value)
    alert('已保存到角色的预设列表中！')
  }
}

const applyVariablePreset = (indexStr) => {
  if (indexStr === '') return
  const preset = aiChar.value.variablePresets[Number(indexStr)]
  if (preset && preset.values) {
    if (!draft.value.variablesState) draft.value.variablesState = {}
    Object.assign(draft.value.variablesState, preset.values)
  }
}

/* ================= 状态栏预设管理 ================= */
const selectedStatusPresetId = ref('')

const applyStatusPreset = () => {
  if (!selectedStatusPresetId.value) return
  const preset = statusPresets.value.find(p => p.id === selectedStatusPresetId.value)
  if (preset) {
    draft.value.settings.promptSuffix = preset.promptSuffix || ''
    draft.value.settings.regexPattern = preset.regexPattern || ''
    draft.value.settings.replacePattern = preset.replacePattern || ''
  }
}

const handleSaveAsStatusPreset = () => {
  if (!draft.value.settings.regexPattern.trim() && !draft.value.settings.replacePattern.trim()) return alert('正则和模板不能为空')
  const name = prompt('为这套动态UI起个名字：', '私有状态栏')
  if (name) {
    savePreset({
      name,
      promptSuffix: draft.value.settings.promptSuffix,
      regexPattern: draft.value.settings.regexPattern,
      replacePattern: draft.value.settings.replacePattern
    })
    window.dispatchEvent(new CustomEvent('sys-toast', { detail: '预设保存成功' }))
  }
}

const handleDeleteStatusPreset = () => {
  if (!selectedStatusPresetId.value) return alert('请先从下拉框选择一个预设')
  if (confirm('确定删除此动态UI预设吗？')) {
    deletePreset(selectedStatusPresetId.value)
    selectedStatusPresetId.value = ''
  }
}

const handleExportStatusPreset = () => {
  if (!selectedStatusPresetId.value) return alert('请先选择一个要导出的预设')
  const preset = statusPresets.value.find(p => p.id === selectedStatusPresetId.value)
  if (preset) {
    exportPreset(preset)
  }
}

const triggerJsonUpload = () => {
  jsonFileInput.value.click()
}

const handleJsonFileChange = (e) => {
  const file = e.target.files[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (ev) => {
    const jsonStr = ev.target.result
    const count = importJson(jsonStr)
    if (count !== false) {
      if (statusPresets.value.length > 0) {
        selectedStatusPresetId.value = statusPresets.value[statusPresets.value.length - 1].id
        applyStatusPreset()
      }
      alert('[导入成功] 已自动填入下方表单！\n[警告]：请务必点击右上角的【保存】按钮，否则不会生效！')
    } else {
      alert('导入失败，请检查 JSON 格式是否损坏')
    }
    jsonFileInput.value.value = ''
  }
  reader.readAsText(file)
}
/* ================================================ */

const triggerUpload = (target) => {
  showAvatarAction.value = false
  uploadTarget = target
  fileInput.value.click()
}

const inputAvatarUrl = () => {
  showAvatarAction.value = false
  const url = prompt('请输入图片的 URL：', draft.value.overrideAvatar)
  if (url !== null) draft.value.overrideAvatar = url
}

const clearAvatar = () => {
  showAvatarAction.value = false
  draft.value.overrideAvatar = ''
}

const handleFileChange = (e) => {
  const file = e.target.files[0]
  if (!file) return
  if (file.size > 2 * 1024 * 1024) return alert('图片过大，可能导致卡顿。')
  const reader = new FileReader()
  reader.onload = (ev) => {
    if (uploadTarget === 'avatar') draft.value.overrideAvatar = ev.target.result
    if (uploadTarget === 'bg') draft.value.bgImage = ev.target.result
    fileInput.value.value = ''
  }
  reader.readAsDataURL(file)
}

const selectedPresetId = ref('')
const applyCssPreset = () => {
  if (!selectedPresetId.value) return
  const preset = cssPresets.value.find(p => p.id === Number(selectedPresetId.value))
  if (preset) draft.value.customCss = preset.css
}
const handleSaveCssPreset = () => {
  if (!draft.value.customCss.trim()) return alert('CSS 为空，无法保存')
  const name = prompt('起个名字：', '气泡美化')
  if (name) { saveCssPreset(name, draft.value.customCss); alert('保存成功') }
}
const deleteCurrentPreset = () => {
  if (selectedPresetId.value) {
    if (confirm('确定删除这个 CSS 预设吗？')) {
      deleteCssPreset(Number(selectedPresetId.value))
      selectedPresetId.value = ''
    }
  } else alert('请先在下拉框选择一个预设')
}
const importCssPreset = () => {
  const css = prompt('请粘贴完整的 CSS 代码以导入：')
  if (css && css.trim()) {
    draft.value.customCss = css.trim()
    alert('已导入到编辑框，你可以点击下方按钮将其保存为预设。')
  }
}
</script>

<style scoped>
.persona-scroll-list { display: flex; overflow-x: auto; gap: 10px; padding: 5px 0; }
.persona-scroll-list::-webkit-scrollbar { display: none; }
.persona-card { width: 70px; flex-shrink: 0; background: #f4f5f7; border-radius: 12px; padding: 10px 5px; display: flex; flex-direction: column; align-items: center; gap: 6px; border: 2px solid transparent; cursor: pointer; transition: all 0.2s; }
.persona-card.active { border-color: var(--accent-color); background: rgba(92, 138, 255, 0.1); }
.p-avatar { width: 40px; height: 40px; border-radius: 50%; background: #ddd; background-size: cover; background-position: center; display: flex; justify-content: center; align-items: center; color: #fff; font-size: 16px; }
.p-name { font-size: 11px; color: #333; font-weight: 600; text-align: center; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.wb-group-container { background: #f4f5f7; border-radius: 10px; padding: 10px; }
.wb-group-header { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid rgba(0,0,0,0.05); }
.wb-group-list { display: flex; flex-direction: column; gap: 8px; max-height: 120px; overflow-y: auto; }
.wb-item-label { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #333; }
.wb-item-title { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>
