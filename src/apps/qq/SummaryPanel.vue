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

          <div v-if="promptPresets.length > 0" class="preset-scroll-area">
             <div v-for="(p, idx) in promptPresets" :key="idx" class="preset-tag">
               <span @click="loadPreset(p)" style="cursor:pointer;">{{ p.name }}</span>
               <i class="fas fa-times" style="cursor:pointer; opacity:0.6; margin-left:6px;" @click="deletePreset(idx)"></i>
             </div>
          </div>

          <div style="display:flex; gap:10px;">
            <button class="btn-cancel" style="flex:1;" @click="restorePromptDefaults">恢复默认提示词</button>
          </div>

          <div style="font-size:12px; font-weight:600; color:#333; margin-top:6px;">结构化记忆提示词</div>
          <textarea v-model="summaryConfigDraft.summaryPrompt" style="width:100%; height:180px; background:#f9f9f9; border:none; border-radius:8px; padding:10px; font-size:12px; outline:none; resize:none; box-sizing:border-box;"></textarea>

          <div style="font-size:12px; font-weight:600; color:#333; margin-top:6px;">起居注提示词</div>
          <textarea v-model="summaryConfigDraft.diaryPrompt" style="width:100%; height:120px; background:#f9f9f9; border:none; border-radius:8px; padding:10px; font-size:12px; outline:none; resize:none; box-sizing:border-box;"></textarea>

          <button class="btn-send" style="width:100%; padding:12px; border-radius:10px; margin-top:10px;" @click="triggerManualSummary" :disabled="isSummarizing">
            <i :class="isSummarizing ? 'fas fa-spinner fa-spin' : 'fas fa-bolt'"></i> {{ isSummarizing ? '正在处理中...' : '开始手动提取当前配置' }}
          </button>
        </div>
      </div>

      <div class="ios-alert-mask" v-if="showSummaryResult" @click.self="showSummaryResult = false" style="z-index: 120;">
        <div class="ios-alert" style="max-width: 340px; width:90%;">
          <div class="ios-alert-title" style="padding-bottom:10px; padding-top:20px;">核对并归档记忆</div>

          <div style="display:flex; gap:8px; padding:0 15px 10px;">
            <button class="btn-cancel" style="flex:1;" :style="viewMode==='text' ? 'background:#000;color:#fff;' : ''" @click="viewMode='text'">文本</button>
            <button class="btn-cancel" style="flex:1;" :style="viewMode==='json' ? 'background:#000;color:#fff;' : ''" @click="viewMode='json'">JSON</button>
          </div>

          <div style="padding: 0 15px 15px;">
            <textarea v-if="viewMode==='text'" v-model="summaryDraft" style="width:100%; height:180px; padding:10px; font-size:13px; border:1px solid rgba(0,0,0,0.1); border-radius:8px; resize:none; outline:none; text-align:left; line-height:1.5; box-sizing:border-box; background:rgba(0,0,0,0.02);"></textarea>
            <textarea v-else v-model="jsonDraft" style="width:100%; height:180px; padding:10px; font-size:12px; font-family:monospace; border:1px solid rgba(0,0,0,0.1); border-radius:8px; resize:none; outline:none; text-align:left; line-height:1.5; box-sizing:border-box; background:rgba(0,0,0,0.02);"></textarea>
          </div>

          <div v-if="viewMode==='json'" style="padding:0 15px 10px;">
            <button class="btn-cancel" style="width:100%;" @click="reparseJson">重新解析 JSON</button>
          </div>

          <div class="ios-alert-actions">
            <div class="ios-alert-btn" @click="showSummaryResult = false">放弃</div>
            <div class="ios-alert-btn bold" @click="confirmSummarySave">确认归档</div>
          </div>
        </div>
      </div>

      <div class="ios-alert-mask" v-if="showArchiveError" @click.self="showArchiveError = false" style="z-index: 130;">
        <div class="ios-alert" style="max-width: 320px; width:90%;">
          <div class="ios-alert-title" style="padding-bottom:15px; padding-top:20px; color:#ff5252;">归档失败</div>
          <div class="ios-alert-desc" style="white-space: pre-wrap; font-size: 13px;">{{ archiveError }}</div>
          <div class="ios-alert-actions">
            <div class="ios-alert-btn bold" @click="showArchiveError = false">我知道了</div>
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
import { useMemorySettings } from '@/composables/useMemorySettings'

const props = defineProps({
  show: Boolean,
  chat: { type: Object, required: true }
})
const emit = defineEmits(['close'])

const { apiUrl, apiKey, apiModel } = useApi()
const { activeMessages, addMemory, addStructuredMemory, addStructuredMemoriesForCharacters, addDiary } = useChatSessions()
const { userProfile } = useProfile()
const { personas } = usePersona()
const { getMemorySettings, updateMemorySettings, getDefaultPrompts } = useMemorySettings()

const manualRangeStart = ref(1)
const manualRangeEnd = ref(null)

const summaryConfigDraft = ref({ autoSummaryCount: 0, summaryPrompt: '', diaryPrompt: '' })
const summaryDraft = ref('')
const jsonDraft = ref('')
const rawJsonText = ref('')
const viewMode = ref('text')

const isSummarizing = ref(false)
const showSummaryResult = ref(false)
const summaryParsed = ref(null)

const showArchiveError = ref(false)
const archiveError = ref('')

const promptPresets = ref(JSON.parse(localStorage.getItem('summaryPromptPresets') || '[]'))

const getPrimaryCharacterId = () => {
  if (props.chat.participants && props.chat.participants[0]) return props.chat.participants[0].id
  return null
}

watch(() => props.show, (val) => {
  if (val) {
    const cid = getPrimaryCharacterId()
    const settings = cid ? getMemorySettings(cid) : getMemorySettings(null)
    summaryConfigDraft.value = {
      autoSummaryCount: Math.max(0, Number(props.chat.settings.autoSummaryCount) || 0),
      summaryPrompt: settings.summaryPrompt || props.chat.settings.summaryPrompt || '',
      diaryPrompt: settings.diaryPrompt || ''
    }
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

const restorePromptDefaults = () => {
  const def = getDefaultPrompts()
  summaryConfigDraft.value.summaryPrompt = def.summaryPrompt
  summaryConfigDraft.value.diaryPrompt = def.diaryPrompt
}

const saveSummarySettings = () => {
  props.chat.settings.autoSummaryCount = Math.max(0, Number(summaryConfigDraft.value.autoSummaryCount) || 0)
  props.chat.settings.summaryPrompt = summaryConfigDraft.value.summaryPrompt

  const cid = getPrimaryCharacterId()
  if (cid) {
    updateMemorySettings(cid, { 
      summaryPrompt: summaryConfigDraft.value.summaryPrompt,
      diaryPrompt: summaryConfigDraft.value.diaryPrompt
    })
  }
  emit('close')
}

const getChatCharacterIds = () => {
  if (!props.chat || !props.chat.participants) return []
  return props.chat.participants.map(c => c.id).filter(Boolean)
}

const buildMemorySummaryPrompt = (basePrompt, diaryPrompt, historyText) => {
  const source = props.chat.isGroup ? 'group_chat' : 'chat'
  const now = new Date()
  const timeStr = now.toLocaleString('zh-CN', { hour12: false })
  let charInfo = ''
  if (props.chat.isGroup && props.chat.participants && props.chat.participants.length > 0) {
    charInfo = '群聊角色列表（必须用 character_id 归属）：\n' + props.chat.participants.map(c => `- ${c.name} (id: ${c.id})`).join('\n')
  } else if (props.chat.participants && props.chat.participants[0]) {
    charInfo = `当前角色 id: ${props.chat.participants[0].id}`
  }

  const diaryHint = diaryPrompt && diaryPrompt.trim() ? `\n\n【起居注风格要求】\n${diaryPrompt.trim()}\n` : ''

  const schema = `请严格输出 JSON，不要输出任何其他文字。JSON 格式如下：
{
  "core_updates": [
    {
      "character_id": "",
      "type": "core",
      "content": "",
      "importance": 1,
      "weight": 1,
      "keywords": [],
      "source": "${source}",
      "timestamp": 0,
      "date": ""
    }
  ],
  "dynamic_events": [
    {
      "character_id": "",
      "type": "event",
      "content": "",
      "importance": 1,
      "weight": 1,
      "keywords": [],
      "source": "${source}",
      "timestamp": 0,
      "date": ""
    }
  ],
  "diary": {
    "content": "",
    "timestamp": 0,
    "date": ""
  }
}

类型说明：
- core: 非常重要的事情
- milestone: 阶段性大事
- event: 普通事件

要求：
1. 如果没有内容，返回空数组。
2. group_chat 必须填写 character_id。
3. timestamp 为毫秒，date 使用本地可读时间。`

  return `${basePrompt || ''}\n${diaryHint}\n当前时间：${timeStr}\n${charInfo ? charInfo + '\n' : ''}\n${schema}\n\n【近期对话记录】\n${historyText}`
}

const extractJsonString = (text) => {
  if (!text) return null
  let t = text.trim()
  const fence = t.match(/```json([\s\S]*?)```/i)
  if (fence) t = fence[1].trim()
  if (t.startsWith('{') && t.endsWith('}')) return t
  const first = t.indexOf('{')
  const last = t.lastIndexOf('}')
  if (first !== -1 && last !== -1 && last > first) return t.slice(first, last + 1)
  return null
}

const parseMemoryJson = (rawText) => {
  const jsonStr = extractJsonString(rawText)
  if (!jsonStr) return null
  try {
    return JSON.parse(jsonStr)
  } catch (e) {
    return null
  }
}

// 核心修复点：强制数据类型安全化
const normalizeParsedResult = (parsed, fallbackSource) => {
  if (!parsed) return { memories: [], diary: null }
  const core = Array.isArray(parsed.core_updates) ? parsed.core_updates : []
  const dynamic = Array.isArray(parsed.dynamic_events) ? parsed.dynamic_events : []
  const all = [...core, ...dynamic]

  const memories = all.map(m => {
    const t = m || {}
    let cid = t.character_id !== undefined ? t.character_id : (t.characterId !== undefined ? t.characterId : null)
    
    // 强制转换为 Number 格式，破除 IndexedDB 类型严格匹配失败的 Bug
    if (cid === '') cid = null
    else if (cid !== null && !isNaN(Number(cid))) cid = Number(cid)

    return {
      characterId: cid,
      type: t.type || 'event',
      content: t.content || t.text || '',
      importance: Number(t.importance || 1),
      weight: Number(t.weight || t.importance || 1),
      keywords: Array.isArray(t.keywords) ? t.keywords : [],
      source: t.source || fallbackSource,
      timestamp: Number(t.timestamp || Date.now()),
      date: t.date || new Date().toLocaleString()
    }
  }).filter(m => m.content && m.content.trim())

  let diary = null
  if (parsed.diary && (parsed.diary.content || parsed.diary.text)) {
    diary = {
      content: parsed.diary.content || parsed.diary.text || '',
      timestamp: Number(parsed.diary.timestamp || Date.now()),
      date: parsed.diary.date || new Date().toLocaleString(),
      source: fallbackSource
    }
  } else if (parsed.diary_content) {
    diary = {
      content: parsed.diary_content,
      timestamp: Date.now(),
      date: new Date().toLocaleString(),
      source: fallbackSource
    }
  }

  return { memories, diary }
}

const buildPreviewText = (normalized) => {
  if (normalized.diary && normalized.diary.content) return normalized.diary.content
  if (!normalized.memories || normalized.memories.length === 0) return ''
  return normalized.memories.map((m, i) => `${i + 1}. ${m.content}`).join('\n')
}

const saveParsedSummary = async (normalized, diaryOverrideText) => {
  const isGroup = props.chat.isGroup
  const characterIds = getChatCharacterIds()
  const source = isGroup ? 'group_chat' : 'chat'
  const defaultCid = getPrimaryCharacterId()

  if (normalized.memories && normalized.memories.length > 0) {
    for (const m of normalized.memories) {
      const memObj = {
        characterId: m.characterId,
        type: m.type || 'event',
        content: m.content,
        importance: m.importance || 1,
        weight: m.weight || m.importance || 1,
        keywords: m.keywords || [],
        source: m.source || source,
        timestamp: m.timestamp || Date.now(),
        date: m.date || new Date().toLocaleString()
      }
      if (isGroup && !memObj.characterId && characterIds.length > 0) {
        await addStructuredMemoriesForCharacters(props.chat.id, characterIds, memObj)
      } else {
        if (!isGroup && !memObj.characterId && defaultCid) memObj.characterId = defaultCid
        await addStructuredMemory(props.chat.id, memObj)
      }
    }
  }

  if (normalized.diary && (normalized.diary.content || diaryOverrideText)) {
    const diaryText = diaryOverrideText && diaryOverrideText.trim() ? diaryOverrideText.trim() : normalized.diary.content
    if (diaryText && diaryText.trim()) {
      if (isGroup && characterIds.length > 0) {
        for (const cid of characterIds) {
          await addDiary(props.chat.id, { 
            characterId: cid,
            content: diaryText, 
            timestamp: normalized.diary.timestamp || Date.now(),
            date: normalized.diary.date || new Date().toLocaleString(),
            source: source,
            level: 1,
            isArchived: false
          })
        }
      } else {
        const cid = defaultCid
        await addDiary(props.chat.id, { 
          characterId: cid,
          content: diaryText, 
          timestamp: normalized.diary.timestamp || Date.now(),
          date: normalized.diary.date || new Date().toLocaleString(),
          source: source,
          level: 1,
          isArchived: false
        })
      }
    }
  }
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
    
    const finalPrompt = buildMemorySummaryPrompt(summaryConfigDraft.value.summaryPrompt, summaryConfigDraft.value.diaryPrompt, historyText)
    
    const res = await fetch(apiUrl.value, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey.value}` },
      body: JSON.stringify({ model: apiModel.value, messages: [{ role: 'user', content: finalPrompt }] })
    })
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const rawText = data.choices[0].message?.content?.trim() || ''
    
    const parsed = parseMemoryJson(rawText)
    const normalized = normalizeParsedResult(parsed, props.chat.isGroup ? 'group_chat' : 'chat')
    summaryParsed.value = normalized.memories.length > 0 || normalized.diary ? normalized : null
    
    const previewText = buildPreviewText(normalized)
    summaryDraft.value = previewText || rawText
    rawJsonText.value = extractJsonString(rawText) || ''
    jsonDraft.value = rawJsonText.value || JSON.stringify(parsed || {}, null, 2)
    viewMode.value = 'text'
    showSummaryResult.value = true
  } catch (e) {
    window.alert(`生成失败: ${e.message}`)
  } finally {
    isSummarizing.value = false
  }
}

const reparseJson = () => {
  try {
    const parsed = JSON.parse(jsonDraft.value)
    const normalized = normalizeParsedResult(parsed, props.chat.isGroup ? 'group_chat' : 'chat')
    summaryParsed.value = normalized.memories.length > 0 || normalized.diary ? normalized : null
    summaryDraft.value = buildPreviewText(normalized) || summaryDraft.value
    window.dispatchEvent(new CustomEvent('sys-toast', { detail: 'JSON 解析成功' }))
  } catch (e) {
    archiveError.value = `JSON 解析失败：${e.message}`
    showArchiveError.value = true
  }
}

const confirmSummarySave = async () => {
  try {
    const finalText = summaryDraft.value ? summaryDraft.value.trim() : ''
    if (!finalText && !summaryParsed.value) {
      archiveError.value = '内容为空，无法归档。\n请在编辑框中填写内容后再试。'
      showArchiveError.value = true
      return
    }
    if (summaryParsed.value) {
      await saveParsedSummary(summaryParsed.value, finalText)
      window.dispatchEvent(new CustomEvent('sys-toast', { detail: '记忆已成功归档' }))
    } else if (finalText) {
      await addMemory(props.chat.id, { date: new Date().toLocaleString(), text: finalText })
      window.dispatchEvent(new CustomEvent('sys-toast', { detail: '已按纯文本归档' }))
    }
    showSummaryResult.value = false
    emit('close')
  } catch (e) {
    archiveError.value = `归档失败，请重试。\n\n错误详情：${e.message || '未知错误'}`
    showArchiveError.value = true
  }
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

