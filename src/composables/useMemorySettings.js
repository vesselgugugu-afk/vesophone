import { ref, watch } from 'vue'

const KEY = 'memorySettings'
const KEY_GLOBAL = 'memoryGlobalCss'

const load = (key, def) => {
  const s = localStorage.getItem(key)
  return s ? JSON.parse(s) : def
}

const defaultSettings = {
  summaryPrompt: `请严格输出 JSON，不要输出任何其他文字。
输出格式如下：
{
  "core_updates": [
    {
      "character_id": "",
      "type": "core",
      "content": "",
      "importance": 5,
      "weight": 5,
      "keywords": ["关键词1","关键词2"],
      "source": "chat",
      "timestamp": 1710000000000,
      "date": "2026-03-12 21:30"
    }
  ],
  "dynamic_events": [
    {
      "character_id": "",
      "type": "event",
      "content": "",
      "importance": 2,
      "weight": 2,
      "keywords": ["关键词1"],
      "source": "chat",
      "timestamp": 1710000000000,
      "date": "2026-03-12 21:30"
    }
  ],
  "diary": {
    "content": "",
    "timestamp": 1710000000000,
    "date": "2026-03-12 21:30"
  }
}

类型说明：
- core: 非常重要的事情
- milestone: 阶段性大事（共同经历）
- event: 普通事件

要求：
1. 如果没有内容，返回空数组。
2. 群聊必须填写 character_id。
3. timestamp 为毫秒，date 使用本地可读时间。
4. 如果有“共同经历/阶段性大事”，务必输出 type 为 milestone。

示例（里程碑）：
{
  "character_id": "123",
  "type": "milestone",
  "content": "两人确认恋人关系",
  "importance": 4,
  "weight": 4,
  "keywords": ["关系","确定"],
  "source": "chat",
  "timestamp": 1710000000000,
  "date": "2026-03-12 21:30"
}

请根据对话内容生成上述 JSON。`,
  diaryPrompt: '以第一人称写一篇起居注（日记），记录今天的经历、情绪与感受，风格自然真实。',
  diaryArchivePrompt: '请将以下起居注整理为一篇更高层级的回忆，保留关键信息与情绪，字数200-400字。',
  diaryRemindThreshold: 20,
  diaryAutoArchiveEnabled: false,
  diaryAutoArchiveThreshold: 15,
  diaryAutoIncludeL2: false,
  diaryAutoIncludeL3: false,
  diaryAutoTargetLevel: 2,
  milestoneLimit: 5
}

const settingsMap = ref(load(KEY, {}))
const globalCss = ref(load(KEY_GLOBAL, ''))

watch(settingsMap, (v) => localStorage.setItem(KEY, JSON.stringify(v)), { deep: true })
watch(globalCss, (v) => localStorage.setItem(KEY_GLOBAL, JSON.stringify(v)), { deep: true })

export function useMemorySettings() {
  const getMemorySettings = (characterId) => {
    if (!characterId) return { ...defaultSettings }
    const saved = settingsMap.value[characterId] || {}
    return { ...defaultSettings, ...saved }
  }

  const updateMemorySettings = (characterId, updates) => {
    if (!characterId) return
    const current = settingsMap.value[characterId] || {}
    settingsMap.value[characterId] = { ...current, ...updates }
  }

  const resetMemorySettings = (characterId) => {
    if (!characterId) return
    settingsMap.value[characterId] = { ...defaultSettings }
  }

  const getDefaultPrompts = () => {
    return {
      summaryPrompt: defaultSettings.summaryPrompt,
      diaryPrompt: defaultSettings.diaryPrompt,
      diaryArchivePrompt: defaultSettings.diaryArchivePrompt
    }
  }

  const getGlobalCss = () => globalCss.value || ''
  const setGlobalCss = (css) => { globalCss.value = css || '' }

  return { getMemorySettings, updateMemorySettings, resetMemorySettings, getDefaultPrompts, getGlobalCss, setGlobalCss }
}
