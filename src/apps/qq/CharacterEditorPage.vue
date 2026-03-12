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
          <input type="file" ref="jsonInput" accept=".json" style="display:none;" @change="onJsonImport" />
          
          <button v-if="!form.id" class="btn-cancel" style="position:absolute; right:20px; bottom:15px; padding:6px 12px; font-size:12px; border-radius:20px; background:rgba(255,255,255,0.8); backdrop-filter:blur(5px);" @click="triggerJsonUpload">
            <i class="fas fa-file-import"></i> 导入 V3 JSON
          </button>
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
          
          <!-- 总开关 -->
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
const onAvatarChange = (e) => {
  const file = e.target.files[0]
  if (!file) return
  if (file.size > 2 * 1024 * 1024) return alert('图片过大')
  const reader = new FileReader()
  reader.onload = (ev) => { form.value.avatar = ev.target.result }
  reader.readAsDataURL(file)
}

const triggerJsonUpload = () => { jsonInput.value?.click() }
const onJsonImport = (e) => {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    const result = parseV3Card(ev.target.result)
    if (result) {
      Object.assign(form.value, result.character)
      if (result.worldbooks && result.worldbooks.length > 0) {
        let successCount = 0
        result.worldbooks.forEach(wb => { if (saveWb(wb)) successCount++ })
        alert(`角色数据加载成功！同时导入了 ${successCount} 条世界书记录。`)
      } else alert('角色数据加载成功！')
    } else alert('解析失败，请确保是标准的 V3 角色卡 JSON。')
    jsonInput.value.value = ''
  }
  reader.readAsText(file)
}

const handleSave = () => {
  if (saveCharacter(form.value)) emit('close')
  else alert('请至少填写网络昵称。')
}
</script>
