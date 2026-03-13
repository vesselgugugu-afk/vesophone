<template>
  <transition name="slide-up">
    <div v-if="show" class="app-window" style="z-index: 90; background:#f4f5f7;">
      <div class="app-header">
        <div class="btn-back" @click="$emit('close')">取消</div>
        <div class="app-title">提取长期记忆</div>
        <div class="header-right" @click="saveSummarySettings" style="color:var(--text-main); font-weight:600;">保存配置</div>
      </div>
      
      <div class="content-area">
        <div style="background:#fff; border-radius:14px; padding:15px; display:flex; flex-direction:column; gap:10px;">
          <div style="font-weight:600; font-size:14px;">自动总结设定</div>
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;">
            <span>每隔多少条 AI 消息归档并提醒</span>
            <div style="display:flex; align-items:center; gap:6px;">
              <input type="number" min="0" v-model="summaryConfigDraft.autoSummaryCount" style="width:50px; text-align:center; border:1px solid #eee; border-radius:6px; padding:4px;" />
              <span style="color:#888; font-size:11px;">(0为关闭)</span>
            </div>
          </div>
        </div>

        <div style="background:#fff; border-radius:14px; padding:15px; display:flex; flex-direction:column; gap:10px;">
          <div style="font-weight:600; font-size:14px;">手动提取消耗 Token</div>
          
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;">
            <span>起始楼层</span>
            <input type="number" min="1" v-model="manualRangeStart" style="width:60px; text-align:center; border:1px solid #eee; border-radius:6px; padding:4px;" />
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;">
            <span>结束楼层 <span style="color:#888;font-size:10px;">(空为最新)</span></span>
            <input type="number" min="1" v-model="manualRangeEnd" placeholder="最新" style="width:60px; text-align:center; border:1px solid #eee; border-radius:6px; padding:4px;" />
          </div>
          <div style="text-align:right; font-size:11px; color:#888;">
             当前总计楼层: {{ activeMessages.length }} 楼
          </div>
          
          <div style="font-weight:600; font-size:12px; margin-top:10px; display:flex; justify-content:space-between; align-items:center;">
            <span>执行 Prompt</span>
            <span style="color:#5c8aff; cursor:pointer;" @click="savePreset"><i class="fas fa-save"></i> 保存为预设</span>
          </div>

          <!-- 预设列表 -->
          <div v-if="promptPresets.length > 0" class="preset-scroll-area">
             <div v-for="(p, idx) in promptPresets" :key="idx" class="preset-tag">
               <span @click="loadPreset(p)" style="cursor:pointer;">{{ p.name }}</span>
               <i class="fas fa-times" style="cursor:pointer; opacity:0.6; margin-left:6px;" @click="deletePreset(idx)"></i>
             </div>
          </div>

          <textarea v-model="summaryConfigDraft.summaryPrompt" style="width:100%; height:120px; background:#f9f9f9; border:none; border-radius:8px; padding:10px; font-size:12px; outline:none; resize:none; box-sizing:border-box;"></textarea>

          <button class="btn-send" style="width:100%; padding:12px; border-radius:10px; margin-top:10px;" @click="triggerManualSummary" :disabled="isSummarizing">
            <i :class="isSummarizing ? 'fas fa-spinner fa-spin' : 'fas fa-bolt'"></i> {{ isSummarizing ? '正在处理中...' : '开始手动提取当前配置' }}
          </button>
        </div>
      </div>

      <!-- 总结结果确认编辑弹窗 (内部状态) -->
      <div class="ios-alert-mask" v-if="showSummaryResult" @click.self="showSummaryResult = false" style="z-index: 120;">
        <div class="ios-alert" style="max-width: 320px; width:90%;">
          <div class="ios-alert-title" style="padding-bottom:15px; padding-top:20px;">核对并归档记忆</div>
          <div style="padding: 0 15px 15px;">
            <textarea v-model="summaryDraft" style="width:100%; height:180px; padding:10px; font-size:13px; border:1px solid rgba(0,0,0,0.1); border-radius:8px; resize:none; outline:none; text-align:left; line-height:1.5; box-sizing:border-box; background:rgba(0,0,0,0.02);"></textarea>
          </div>
          <div class="ios-alert-actions">
            <div class="ios-alert-btn" @click="showSummaryResult = false">放弃</div>
            <div class="ios-alert-btn bold" @click="confirmSummarySave">确认归档</div>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useApi } from '@/composables/useApi'
import { useChatSessions } from '@/composables/useChatSessions'
import { useProfile } from '@/composables/useProfile'
import { usePersona } from '@/composables/usePersona'

const props = defineProps({
  show: Boolean,
  chat: { type: Object, required: true }
})
const emit = defineEmits(['close'])

const { apiUrl, apiKey, apiModel } = useApi()
const { activeMessages, addMemory, pushMessage } = useChatSessions()
const { userProfile } = useProfile()
const { personas } = usePersona()

const manualRangeStart = ref(1)
const manualRangeEnd = ref(null)

const summaryConfigDraft = ref({ autoSummaryCount: 0, summaryPrompt: '' })
const summaryDraft = ref('')
const isSummarizing = ref(false)
const showSummaryResult = ref(false)

const promptPresets = ref(JSON.parse(localStorage.getItem('summaryPromptPresets') || '[]'))

// 当面板打开时，初始化草稿
watch(() => props.show, (val) => {
  if (val) {
    summaryConfigDraft.value = {
      autoSummaryCount: Math.max(0, Number(props.chat.settings.autoSummaryCount) || 0),
      summaryPrompt: props.chat.settings.summaryPrompt || ''
    }
    // 默认起始楼层为最近 50 条左右
    manualRangeStart.value = Math.max(1, activeMessages.value.length - 50)
    manualRangeEnd.value = null
  }
})

const getActiveUserPersona = () => {
  if (props.chat.boundPersonaId) return personas.value.find(p => p.id === props.chat.boundPersonaId) || null
  return personas.value.find(p => p.isActive) || null
}

const savePreset = () => {
  const name = prompt('请输入预设名称：')
  if (name && name.trim()) {
    promptPresets.value.push({ name: name.trim(), prompt: summaryConfigDraft.value.summaryPrompt })
    localStorage.setItem('summaryPromptPresets', JSON.stringify(promptPresets.value))
    window.dispatchEvent(new CustomEvent('sys-toast', { detail: '预设已保存' }))
  }
}

const loadPreset = (p) => {
  summaryConfigDraft.value.summaryPrompt = p.prompt
}

const deletePreset = (idx) => {
  if (confirm('确认删除该预设吗？')) {
    promptPresets.value.splice(idx, 1)
    localStorage.setItem('summaryPromptPresets', JSON.stringify(promptPresets.value))
  }
}

const saveSummarySettings = () => {
  props.chat.settings.autoSummaryCount = Math.max(0, Number(summaryConfigDraft.value.autoSummaryCount) || 0)
  props.chat.settings.summaryPrompt = summaryConfigDraft.value.summaryPrompt
  emit('close')
}

const triggerManualSummary = async () => {
  if (!apiKey.value) return window.alert('请先配置 API Key')
  
  const startIdx = Math.max(0, (Number(manualRangeStart.value) || 1) - 1)
  const endIdx = manualRangeEnd.value ? Math.min(activeMessages.value.length, Number(manualRangeEnd.value)) : activeMessages.value.length
  
  if (startIdx >= endIdx) {
    return window.alert('起始楼层不能大于或等于结束楼层')
  }

  isSummarizing.value = true
  try {
    const p = getActiveUserPersona()
    const myName = p ? p.name : userProfile.value.name
    
    const historyText = activeMessages.value.slice(startIdx, endIdx)
      .filter(m => m.role !== 'system')
      .map(m => `${m.role === 'ai' ? (props.chat.title || '对方') : myName}: ${m.content}`)
      .join('\n')
    
    const finalPrompt = summaryConfigDraft.value.summaryPrompt + `\n\n【近期对话记录】\n${historyText}`
    
    const res = await fetch(apiUrl.value, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey.value}` },
      body: JSON.stringify({ model: apiModel.value, messages: [{ role: 'user', content: finalPrompt }] })
    })
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    summaryDraft.value = data.choices[0].message?.content?.trim() || ''
    
    showSummaryResult.value = true
  } catch (e) {
    window.alert(`生成失败: ${e.message}`)
  } finally {
    isSummarizing.value = false
  }
}

const confirmSummarySave = async () => {
  if (!summaryDraft.value.trim()) return
  await addMemory(props.chat.id, { date: new Date().toLocaleString(), text: summaryDraft.value })
  showSummaryResult.value = false
  pushMessage(props.chat.id, { role: 'system', type: 'text', content: '记忆已手动提取并归档' })
  emit('close')
}
</script>

<style scoped>
.preset-scroll-area {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 5px;
  scrollbar-width: none;
}
.preset-scroll-area::-webkit-scrollbar {
  display: none;
}
.preset-tag {
  background: #eef2ff;
  color: #5c8aff;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  white-space: nowrap;
  display: flex;
  align-items: center;
}
</style>
