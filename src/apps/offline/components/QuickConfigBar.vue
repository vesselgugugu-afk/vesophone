<template>
  <div class="ios-action-sheet-mask" v-if="show" @click.self="$emit('close')">
    <div class="quick-config-panel">
      <div class="panel-header">
        <div class="panel-title">线下环境快捷配置</div>
        <i class="fas fa-times close-icon" @click="$emit('close')"></i>
      </div>

      <div class="scroll-body">
        <!-- 第一块：RP参数 -->
        <div class="config-group">
          <div class="config-label">回复字数限制</div>
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:15px;">
            <input type="number" min="10" v-model="localConfig.wordCountMin" style="width:60px; padding:6px; border:1px solid #ddd; border-radius:6px; text-align:center; font-size:12px;" />
            <span style="color:#888;">到</span>
            <input type="number" min="10" v-model="localConfig.wordCountMax" style="width:60px; padding:6px; border:1px solid #ddd; border-radius:6px; text-align:center; font-size:12px;" />
            <span style="font-size:12px; font-weight:600;">字</span>
          </div>

          <div class="config-label">防抢话与规范指令</div>
          <textarea class="style-textarea" v-model="localConfig.antiRepeatPrompt" style="height: 60px;"></textarea>
        </div>

        <!-- 第二块：文风与场景预设 -->
        <div class="config-group">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <div class="config-label" style="margin:0;">场景与文风要求</div>
            <div style="display:flex; gap:6px;">
              <select style="background:#fff; border:1px solid #ddd; padding:4px; font-size:11px; border-radius:6px;" v-model="selectedStyleId" @change="applyStylePreset">
                <option value="">预设...</option>
                <option v-for="s in stylePresets" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
              <button class="mini-btn" @click="saveStylePreset">保存</button>
              <button class="mini-btn danger" @click="deleteStylePreset" v-if="selectedStyleId">删除</button>
            </div>
          </div>
          <textarea class="style-textarea" v-model="localConfig.stylePrompt" placeholder="可输入或导入长篇文风限制..."></textarea>
          <div style="text-align:right; margin-top:8px;">
            <button class="mini-btn" @click="triggerTxtImport"><i class="fas fa-file-import"></i> 导入 TXT</button>
            <input type="file" accept=".txt" ref="txtInput" style="display:none;" @change="handleTxtImport" />
          </div>
        </div>

        <!-- 第三块：独立总结配置 -->
        <div class="config-group">
          <div class="config-label">记忆凝结 (仅抽取未总结的楼层)</div>
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; margin-bottom:10px;">
            <span>每隔多少条 AI 消息自动归档</span>
            <div style="display:flex; align-items:center; gap:6px;">
              <input type="number" min="0" v-model="localConfig.autoSummaryCount" style="width:50px; text-align:center; border:1px solid #eee; border-radius:6px; padding:4px;" />
              <span style="color:#888; font-size:11px;">(0为关)</span>
            </div>
          </div>
          <textarea class="style-textarea" v-model="localConfig.summaryPrompt" style="height: 60px; margin-bottom:10px;" placeholder="总结 Prompt..."></textarea>
          <div class="action-btn" style="background:#eef2ff; color:#5c8aff;" @click="triggerManualSummary">
            <i class="fas fa-magic"></i> 立即手动提取当前记忆
          </div>
        </div>
      </div>

      <div style="display:flex; gap:10px; margin-top:15px;">
        <div class="action-btn secondary" @click="$emit('open-advanced')">
          <i class="fas fa-layer-group"></i> 排序引擎
        </div>
        <div class="action-btn primary" @click="saveAndClose">应用设置</div>
      </div>
      
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  show: Boolean,
  config: Object
})

const emit = defineEmits(['close', 'save', 'open-advanced', 'trigger-manual-summary'])

const localConfig = ref({ 
  wordCountMin: 150, wordCountMax: 300, 
  antiRepeatPrompt: '', stylePrompt: '', 
  autoSummaryCount: 0, summaryPrompt: '' 
})

const stylePresets = ref(JSON.parse(localStorage.getItem('offline_style_presets')) || [])
const selectedStyleId = ref('')
const txtInput = ref(null)

watch(() => props.show, (val) => {
  if (val && props.config) {
    localConfig.value = { ...props.config }
  }
})

const saveStylePreset = () => {
  const name = prompt('保存文风预设为：', '新文风')
  if (name) {
    const newId = 'sty_' + Date.now()
    stylePresets.value.push({ id: newId, name, text: localConfig.value.stylePrompt })
    localStorage.setItem('offline_style_presets', JSON.stringify(stylePresets.value))
    selectedStyleId.value = newId
    window.dispatchEvent(new CustomEvent('sys-toast', { detail: '文风已保存' }))
  }
}

const applyStylePreset = () => {
  const p = stylePresets.value.find(s => s.id === selectedStyleId.value)
  if (p) localConfig.value.stylePrompt = p.text
}

const deleteStylePreset = () => {
  if (confirm('确认删除该文风？')) {
    stylePresets.value = stylePresets.value.filter(s => s.id !== selectedStyleId.value)
    localStorage.setItem('offline_style_presets', JSON.stringify(stylePresets.value))
    selectedStyleId.value = ''
  }
}

const triggerTxtImport = () => { txtInput.value.click() }
const handleTxtImport = (e) => {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    localConfig.value.stylePrompt = ev.target.result
    window.dispatchEvent(new CustomEvent('sys-toast', { detail: 'TXT 文风导入成功' }))
    txtInput.value.value = ''
  }
  reader.readAsText(file)
}

const triggerManualSummary = () => {
  emit('save', { ...localConfig.value }) // 先保存配置
  emit('trigger-manual-summary')
  emit('close')
}

const saveAndClose = () => {
  emit('save', { ...localConfig.value })
  emit('close')
}
</script>

<style scoped>
.ios-action-sheet-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 999999; display: flex; align-items: flex-end; backdrop-filter: blur(5px); }
.quick-config-panel { width: 100%; max-height: 85vh; background: #fff; border-radius: 20px 20px 0 0; padding: 20px; box-sizing: border-box; display: flex; flex-direction: column; }
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-shrink: 0; }
.panel-title { font-size: 16px; font-weight: 700; color: #333; }
.close-icon { font-size: 18px; color: #888; cursor: pointer; padding: 5px; }

.scroll-body { flex: 1; overflow-y: auto; padding-bottom: 10px; }
.config-group { margin-bottom: 15px; background: #f9f9f9; padding: 15px; border-radius: 12px; }
.config-label { font-size: 13px; font-weight: 600; color: #444; margin-bottom: 10px; }

.style-textarea { width: 100%; height: 100px; border: 1px solid #ddd; border-radius: 8px; padding: 10px; font-size: 12px; outline: none; resize: none; box-sizing: border-box; }
.mini-btn { padding: 4px 8px; font-size: 11px; background: #fff; border: 1px solid #ddd; border-radius: 6px; cursor: pointer; color: #333; }
.mini-btn.danger { color: #ff5252; border-color: #ff5252; }

.action-btn { flex: 1; padding: 12px 0; text-align: center; border-radius: 12px; font-weight: 600; font-size: 14px; cursor: pointer; transition: transform 0.2s; display: flex; justify-content: center; align-items: center; gap: 6px; }
.action-btn:active { transform: scale(0.98); }
.action-btn.secondary { background: #f0f0f0; color: #555; }
.action-btn.primary { background: var(--text-main); color: #fff; }
</style>

