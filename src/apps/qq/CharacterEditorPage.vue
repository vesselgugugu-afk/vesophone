<template>
  <transition name="slide-up">
    <div v-if="show" class="app-window" style="z-index: 100; background: rgba(0,0,0,0.5);">
      <div class="editor-card" style="margin-top: env(safe-area-inset-top, 20px);">
        
        <div style="display:flex; justify-content:space-between; align-items:center; padding:15px 20px; z-index:10; background:#fff;">
          <div style="color:var(--text-sub); font-weight:600; font-size:14px; cursor:pointer;" @click="$emit('close')">取消</div>
          <div style="font-weight:600; font-size:16px;">{{ form.id ? '编辑角色' : '新建角色' }}</div>
          <div style="color:var(--text-main); font-weight:600; font-size:14px; cursor:pointer;" @click="handleSave">完成</div>
        </div>

        <div class="editor-cover">
          <div class="editor-avatar-btn" @click="triggerAvatarUpload" :style="form.avatar ? `background-image: url(${form.avatar})` : ''">
            <i v-if="!form.avatar" class="fas fa-camera"></i>
          </div>
          <input type="file" ref="avatarInput" accept="image/*" style="display:none;" @change="onAvatarChange" />
          
          <input type="file" ref="jsonInput" accept=".json,.png" style="display:none;" @change="onFileImport" />
          
          <div style="position:absolute; right:20px; bottom:15px; display:flex; gap:10px; z-index: 20;">
            <button v-if="form.id" class="btn-cancel" style="padding:6px 12px; font-size:12px; border-radius:20px; background:rgba(255,255,255,0.8); backdrop-filter:blur(5px); box-shadow:0 2px 10px rgba(0,0,0,0.1);" @click="exportJson">
              <i class="fas fa-file-export"></i> 导出卡片
            </button>
            <button class="btn-cancel" style="padding:6px 12px; font-size:12px; border-radius:20px; background:rgba(255,255,255,0.8); backdrop-filter:blur(5px); box-shadow:0 2px 10px rgba(0,0,0,0.1);" @click="triggerJsonUpload">
              <i class="fas fa-file-import"></i> 导入 PNG/JSON
            </button>
          </div>
        </div>

        <div class="editor-tabs">
          <div :class="['editor-tab', { active: activeTab === 'basic' }]" @click="activeTab = 'basic'">基础信息</div>
          <div :class="['editor-tab', { active: activeTab === 'advanced' }]" @click="activeTab = 'advanced'">高级配置</div>
        </div>

        <div class="editor-body" v-if="activeTab === 'basic'">
          <div class="ins-input-group">
            <div class="ins-label">网络昵称 (Name)</div>
            <input class="ins-input" v-model="form.name" placeholder="对外的称呼" />
          </div>
          <div class="ins-input-group">
            <div class="ins-label">真实姓名 (True Name)</div>
            <input class="ins-input" v-model="form.trueName" placeholder="内部真名" />
          </div>
          <div class="ins-input-group">
            <div class="ins-label">角色人设 (Description)</div>
            <textarea class="ins-textarea" v-model="form.description" placeholder="详细的设定提示词..."></textarea>
          </div>
          <div class="ins-input-group">
            <div class="ins-label">性格特征 (Personality)</div>
            <textarea class="ins-textarea" style="min-height:50px;" v-model="form.personality" placeholder="简短的性格描述..."></textarea>
          </div>
          <div class="ins-input-group">
            <div class="ins-label">开场白 (First Message)</div>
            <textarea class="ins-textarea" v-model="form.first_mes" placeholder="聊天的第一句话..."></textarea>
          </div>
        </div>

        <div class="editor-body" v-if="activeTab === 'advanced'">
          
          <div class="ins-input-group" style="flex-direction:row; justify-content:space-between; align-items:center;">
            <div>
              <div class="ins-label" style="color:var(--text-main);">启用高级变量系统</div>
              <div style="font-size:10px; color:#888; margin-top:4px;">开启后支持分阶段提示词注入与自动变量捕捉</div>
            </div>
            <ToggleSwitch v-model="form.advancedSettingsEnabled" />
          </div>

          <template v-if="form.advancedSettingsEnabled">
            <div class="ins-input-group">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <div class="ins-label">变量提示词注入 (Variables & Conditions)</div>
                <i class="fas fa-plus-circle" style="color:var(--text-main); cursor:pointer; font-size:16px;" @click="addVariable"></i>
              </div>
              <div v-if="form.variables.length === 0" style="font-size:12px; color:#aaa; text-align:center; padding:10px;">暂无变量</div>
              
              <div class="var-card-wrap" v-for="(v, vIdx) in form.variables" :key="vIdx">
                <div class="var-header">
                  <input class="ins-input" v-model="v.name" placeholder="变量名(如: affection)" />
                  <select class="var-select" v-model="v.type" @change="handleTypeChange(v)">
                    <option value="number">数字</option>
                    <option value="boolean">布尔</option>
                  </select>
                  <input class="ins-input" style="width:60px; text-align:center;" v-model="v.default" placeholder="默认" />
                  <i class="fas fa-trash" style="color:#ff5252; cursor:pointer; padding:6px;" @click="removeVariable(vIdx)"></i>
                </div>

                <div class="cond-list">
                  <div class="cond-item" v-for="(cond, cIdx) in v.conditions" :key="cIdx">
                    <div class="cond-row">
                      <span style="font-size:11px; color:#888;">If</span>
                      <select class="var-select" v-if="v.type === 'number'" v-model="cond.operator">
                        <option value=">">大于</option><option value="<">小于</option><option value=">=">大于等于</option>
                        <option value="<=">小于等于</option><option value="==">等于</option><option value="between">介于</option>
                      </select>
                      <select class="var-select" v-if="v.type === 'boolean'" v-model="cond.operator">
                        <option value="==">等于</option>
                      </select>

                      <input class="ins-input" v-if="v.type === 'number' && cond.operator !== 'between'" v-model="cond.value" placeholder="数值" />
                      <div v-if="v.type === 'number' && cond.operator === 'between'" style="display:flex; align-items:center; gap:4px; flex:1;">
                        <input class="ins-input" style="flex:1; text-align:center; padding:6px;" v-model="cond.valueMin" placeholder="最小" />
                        <span style="font-size:12px; color:#888;">到</span>
                        <input class="ins-input" style="flex:1; text-align:center; padding:6px;" v-model="cond.valueMax" placeholder="最大" />
                      </div>
                      <select class="var-select" v-if="v.type === 'boolean'" v-model="cond.value" style="flex:1;">
                        <option value="true">True (真)</option><option value="false">False (假)</option>
                      </select>

                      <i class="fas fa-times-circle" style="color:#ccc; cursor:pointer;" @click="removeCondition(vIdx, cIdx)"></i>
                    </div>
                    <textarea class="cond-prompt" v-model="cond.prompt" placeholder="满足条件时注入的专属提示词..."></textarea>
                  </div>
                  <div style="font-size:11px; color:var(--accent-color); cursor:pointer; padding:4px 0;" @click="addCondition(vIdx)">
                    <i class="fas fa-plus"></i> 添加阶段分支
                  </div>
                </div>
              </div>
            </div>

            <div class="ins-input-group">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                <div class="ins-label">初始量预设 (Presets)</div>
                <i class="fas fa-plus-circle" style="color:var(--text-main); cursor:pointer;" @click="addPreset"></i>
              </div>
              <div v-if="form.variablePresets.length === 0" style="font-size:12px; color:#aaa; text-align:center; padding:10px;">暂无预设</div>
              <div style="display:flex; flex-direction:column; gap:8px;">
                <div class="var-card-wrap" style="flex-direction:column; align-items:stretch; gap:6px; padding:10px;" v-for="(p, idx) in form.variablePresets" :key="idx">
                  <div style="display:flex; gap:10px;">
                    <input class="ins-input" style="background:transparent; font-weight:600; font-size:13px; padding:0;" v-model="p.name" placeholder="预设名 (如: 初见)" />
                    <i class="fas fa-trash" style="color:#ff5252; cursor:pointer;" @click="removePreset(idx)"></i>
                  </div>
                  <div style="display:flex; gap:10px; flex-wrap:wrap;">
                    <div v-for="v in form.variables" :key="v.name" style="font-size:11px; display:flex; align-items:center; gap:4px; background:#f4f5f7; padding:4px 8px; border-radius:6px;">
                      <span style="color:var(--text-sub);">{{ v.name }}:</span>
                      <input type="text" style="width:40px; border:none; background:transparent; text-align:center; outline:none; font-weight:600;" v-model="p.values[v.name]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="ins-input-group">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                <div class="ins-label">状态更新原则 (Status Update Prompt)</div>
              </div>
              <div style="font-size:11px; color:#aaa; margin-bottom:8px; line-height:1.4;">
                告诉 AI 如何根据对话改变变量，并强制要求其使用 XML 输出更新状态。
              </div>
              <button class="btn-auto-gen" @click="handleGeneratePrompt">
                <i class="fas fa-magic"></i> 根据变量列表自动生成模板
              </button>
              <textarea class="ins-textarea" style="min-height:220px; font-family:monospace; font-size:12px; background:#f9f9f9; padding:10px; border-radius:8px; margin-top:8px;" v-model="form.statusUpdatePrompt"></textarea>
            </div>
          </template>
        </div>

      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useCharacters } from '@/composables/useCharacters'
import { useWorldbook } from '@/composables/useWorldbook'
import ToggleSwitch from '@/components/ToggleSwitch.vue'

const props = defineProps({ show: Boolean, charId: { type: Number, default: null } })
const emit = defineEmits(['close'])

const { saveCharacter, getCharById, getEmptyCharacter, parseV3Card, generateStatusPrompt } = useCharacters()
const { saveWb } = useWorldbook()

const activeTab = ref('basic')
const form = ref(getEmptyCharacter())
const avatarInput = ref(null)
const jsonInput = ref(null)

// 极限压缩引擎
const compressImage = (base64Str, maxWidth = 400) => {
  return new Promise((resolve) => {
    const img = new Image()
    img.src = base64Str
    img.onload = () => {
      if (img.width <= maxWidth) return resolve(base64Str)
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const ratio = maxWidth / img.width
      canvas.width = maxWidth
      canvas.height = img.height * ratio
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.8))
    }
  })
}

watch(() => props.show, (newVal) => {
  if (newVal) {
    activeTab.value = 'basic'
    if (props.charId) {
      const char = getCharById(props.charId)
      form.value = JSON.parse(JSON.stringify(char))
    } else {
      form.value = getEmptyCharacter()
    }
  }
})

const addVariable = () => { form.value.variables.push({ name: '', type: 'number', default: '0', conditions: [] }) }
const removeVariable = (idx) => form.value.variables.splice(idx, 1)
const handleTypeChange = (v) => { v.default = v.type === 'boolean' ? 'false' : '0'; v.conditions = [] }
const addCondition = (vIdx) => {
  const v = form.value.variables[vIdx]
  const op = v.type === 'boolean' ? '==' : '>='
  const val = v.type === 'boolean' ? 'true' : '0'
  form.value.variables[vIdx].conditions.push({ operator: op, value: val, valueMin: '0', valueMax: '100', prompt: '' })
}
const removeCondition = (vIdx, cIdx) => { form.value.variables[vIdx].conditions.splice(cIdx, 1) }

const handleGeneratePrompt = () => {
  if (confirm('这将会覆盖你当前填写的文本框，确定要继续吗？')) {
    form.value.statusUpdatePrompt = generateStatusPrompt(form.value.variables)
  }
}

const addPreset = () => {
  const newPreset = { name: '新预设', values: {} }
  form.value.variables.forEach(v => { newPreset.values[v.name] = v.default })
  form.value.variablePresets.push(newPreset)
}
const removePreset = (idx) => form.value.variablePresets.splice(idx, 1)

const triggerAvatarUpload = () => { avatarInput.value?.click() }

// 接入压缩
const onAvatarChange = (e) => {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = async (ev) => { 
    form.value.avatar = await compressImage(ev.target.result, 400) 
  }
  reader.readAsDataURL(file)
}

const extractPngTextChunk = (arrayBuffer) => {
  const view = new DataView(arrayBuffer)
  let offset = 8
  while (offset < view.byteLength) {
    const length = view.getUint32(offset)
    const type = String.fromCharCode(
      view.getUint8(offset + 4),
      view.getUint8(offset + 5),
      view.getUint8(offset + 6),
      view.getUint8(offset + 7)
    )
    if (type === 'tEXt') {
      const dataBytes = new Uint8Array(arrayBuffer, offset + 8, length)
      const textStr = new TextDecoder('utf-8').decode(dataBytes)
      const nullIdx = textStr.indexOf('\0')
      const keyword = textStr.substring(0, nullIdx)
      
      if (keyword === 'chara') {
        const base64Str = textStr.substring(nullIdx + 1)
        const binString = atob(base64Str)
        const bytes = new Uint8Array(binString.length)
        for (let i = 0; i < binString.length; i++) {
          bytes[i] = binString.charCodeAt(i)
        }
        return new TextDecoder('utf-8').decode(bytes)
      }
    }
    offset += 12 + length
  }
  return null
}

const triggerJsonUpload = () => { jsonInput.value?.click() }

const onFileImport = (e) => {
  const file = e.target.files[0]
  if (!file) return

  const processResult = (jsonString) => {
    const result = parseV3Card(jsonString)
    if (result) {
      Object.assign(form.value, result.character)
      if (result.worldbooks && result.worldbooks.length > 0) {
        let successCount = 0
        result.worldbooks.forEach(wb => { if (saveWb(wb)) successCount++ })
        alert(`角色数据加载成功！同时导入了 ${successCount} 条世界书记录。`)
      } else alert('角色数据加载成功！')
    } else alert('解析失败，不支持的格式。')
    jsonInput.value.value = ''
  }

  if (file.name.toLowerCase().endsWith('.png')) {
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const jsonStr = extractPngTextChunk(ev.target.result)
        if (jsonStr) processResult(jsonStr)
        else alert('未在 PNG 中找到角色数据 (缺少 chara 数据块)')
      } catch(err) { alert('解析 PNG 失败: ' + err.message) }
    }
    reader.readAsArrayBuffer(file)
  } else {
    const reader = new FileReader()
    reader.onload = (ev) => { processResult(ev.target.result) }
    reader.readAsText(file)
  }
}

const exportJson = () => {
  const exportData = {
    spec: "chara_v3",
    spec_version: "3.0",
    data: {
      name: form.value.name,
      description: form.value.description,
      personality: form.value.personality,
      first_mes: form.value.first_mes,
      alternate_greetings: form.value.alternate_greetings || [],
      mes_example: form.value.mes_example || "",
      creator_notes: form.value.creator_notes || "",
      system_prompt: form.value.system_prompt || "",
      post_history_instructions: form.value.post_history_instructions || "",
      tags: form.value.tags || [],
      creator: form.value.creator || "",
      character_version: form.value.character_version || "",
      extensions: {
        aero_vars: form.value.advancedSettingsEnabled ? {
          variables: form.value.variables,
          variablePresets: form.value.variablePresets,
          statusUpdatePrompt: form.value.statusUpdatePrompt
        } : undefined,
        trueName: form.value.trueName
      }
    }
  }
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${form.value.name || 'character'}_v3.json`
  a.click()
  URL.revokeObjectURL(url)
}

const handleSave = async () => {
  // 等待底层存储完成 (IndexedDB)
  if (await saveCharacter(form.value)) emit('close')
  else alert('请至少填写网络昵称。')
}
</script>

<style scoped>
.app-window { position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; }
.editor-card { background: #f4f5f7; border-radius: 20px 20px 0 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 -10px 40px rgba(0,0,0,0.2); }

.editor-cover { height: 160px; background: linear-gradient(135deg, #e0eafc, #cfdef3); position: relative; display: flex; justify-content: center; align-items: center; }
.editor-avatar-btn { width: 80px; height: 80px; border-radius: 50%; background: #fff; box-shadow: 0 10px 20px rgba(0,0,0,0.1); display: flex; justify-content: center; align-items: center; font-size: 24px; color: #ccc; cursor: pointer; border: 3px solid #fff; background-size: cover; background-position: center; transition: 0.2s; }
.editor-avatar-btn:active { transform: scale(0.95); }

.editor-tabs { display: flex; background: #fff; border-bottom: 1px solid #eee; }
.editor-tab { flex: 1; text-align: center; padding: 15px 0; font-size: 14px; font-weight: 600; color: #888; cursor: pointer; position: relative; }
.editor-tab.active { color: var(--text-main); }
.editor-tab.active::after { content: ''; position: absolute; bottom: 0; left: 30%; right: 30%; height: 3px; background: var(--text-main); border-radius: 3px 3px 0 0; }

.editor-body { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 15px; }

.ins-input-group { display: flex; flex-direction: column; gap: 8px; background: #fff; padding: 15px; border-radius: 16px; box-shadow: 0 2px 10px rgba(0,0,0,0.02); }
.ins-label { font-size: 12px; font-weight: 700; color: #555; }
.ins-input { padding: 10px 12px; border: 1px solid #eee; border-radius: 10px; font-size: 14px; background: #f9f9f9; outline: none; transition: 0.2s; }
.ins-input:focus { border-color: #ddd; background: #fff; }
.ins-textarea { padding: 10px 12px; border: 1px solid #eee; border-radius: 10px; font-size: 13px; background: #f9f9f9; outline: none; min-height: 80px; resize: vertical; line-height: 1.5; }
.ins-textarea:focus { border-color: #ddd; background: #fff; }

.var-card-wrap { border: 1px solid #eee; border-radius: 12px; overflow: hidden; }
.var-header { display: flex; align-items: center; gap: 10px; padding: 10px; background: #f9f9f9; border-bottom: 1px solid #eee; }
.var-select { padding: 8px; border: 1px solid #eee; border-radius: 8px; font-size: 12px; background: #fff; outline: none; }
.cond-list { padding: 10px; display: flex; flex-direction: column; gap: 10px; }
.cond-item { background: #f4f5f7; padding: 10px; border-radius: 8px; display: flex; flex-direction: column; gap: 8px; }
.cond-row { display: flex; align-items: center; gap: 8px; }
.cond-prompt { width: 100%; height: 60px; border: 1px solid #eee; border-radius: 8px; padding: 8px; font-size: 12px; resize: none; outline: none; }
.btn-auto-gen { width: 100%; padding: 12px; border-radius: 12px; background: #5c8aff; color: #fff; font-weight: 600; border: none; font-size: 13px; cursor: pointer; box-shadow: 0 4px 15px rgba(92,138,255,0.3); }

.slide-up-enter-active, .slide-up-leave-active { transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(100%); }
</style>
