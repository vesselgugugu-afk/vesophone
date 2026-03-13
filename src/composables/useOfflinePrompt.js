import { ref, computed } from 'vue'
import { useCharacters } from '@/composables/useCharacters'
import { useProfile } from '@/composables/useProfile'
import { usePersona } from '@/composables/usePersona'
import { useWorldbook } from '@/composables/useWorldbook'

export function useOfflinePrompt() {
  const { getCharById } = useCharacters()
  const { userProfile } = useProfile()
  const { personas } = usePersona()
  const { enabledWorldbooks } = useWorldbook()

  const defaultOrder = [
    { id: 'sys_offline_base', key: 'offline_base' },
    { id: 'sys_offline_char', key: 'offline_char' },
    { id: 'sys_offline_user', key: 'offline_user' },
    { id: 'sys_long_term_memory', key: 'long_term_memory' },
    { id: 'sys_local_worldbook', key: 'local_worldbook' }, // 新增独立局部世界书节点
    { id: 'sys_worldbook', key: 'worldbook' },
    { id: 'sys_chat_history', key: 'chat_history' },
    { id: 'sys_offline_quick', key: 'offline_quick' }
  ]

  let savedOrder = JSON.parse(localStorage.getItem('aero_offline_prompt_order'))
  if (savedOrder) {
    // 兼容补丁：如果老配置里没有局部世界书，则自动插入
    if (!savedOrder.find(o => o.key === 'local_worldbook')) {
      const memIndex = savedOrder.findIndex(o => o.key === 'long_term_memory')
      savedOrder.splice(memIndex !== -1 ? memIndex + 1 : 4, 0, { id: 'sys_local_worldbook', key: 'local_worldbook' })
    }
  } else {
    savedOrder = defaultOrder
  }

  const offlinePromptOrder = ref(savedOrder)
  const offlineCustomPrompts = ref(JSON.parse(localStorage.getItem('aero_offline_custom_prompts')) || [])
  const offlinePromptPresets = ref(JSON.parse(localStorage.getItem('aero_offline_prompt_presets')) || [])
  
  const offlineBasePrompt = ref(localStorage.getItem('aero_offline_base_prompt') || '【系统指令】这是一场沉浸式线下角色扮演（RP）。遵循物理法则，绝不出现网络聊天词汇。对话如小说般自然，包含神态与动作，动作建议使用 *星号* 或（括号）包裹。')

  const saveState = () => {
    localStorage.setItem('aero_offline_prompt_order', JSON.stringify(offlinePromptOrder.value))
    localStorage.setItem('aero_offline_custom_prompts', JSON.stringify(offlineCustomPrompts.value))
    localStorage.setItem('aero_offline_prompt_presets', JSON.stringify(offlinePromptPresets.value))
    localStorage.setItem('aero_offline_base_prompt', offlineBasePrompt.value)
  }

  const getOrderName = (key) => {
    const map = {
      offline_base: '线下环境底座 (基础物理与网聊屏蔽)',
      offline_char: '角色档案与主设定',
      offline_user: 'User(我)的档案',
      long_term_memory: '长期记忆归档库',
      local_worldbook: '局部特殊设定 (单聊专属世界书)',
      worldbook: '全局世界书注入',
      chat_history: '聊天记录插入点',
      offline_quick: '快捷面板指令 (字数/防抢话/文风)'
    }
    return map[key] || key
  }

  const getOrderIcon = (key) => {
    const map = {
      offline_base: 'fas fa-globe',
      offline_char: 'fas fa-user-circle',
      offline_user: 'fas fa-id-badge',
      long_term_memory: 'fas fa-brain',
      local_worldbook: 'fas fa-bookmark',
      worldbook: 'fas fa-book',
      chat_history: 'fas fa-comments',
      offline_quick: 'fas fa-sliders-h'
    }
    return map[key] || 'fas fa-cube'
  }

  const moveOrder = (index, dir) => {
    const target = index + dir
    if (target < 0 || target >= offlinePromptOrder.value.length) return
    const temp = offlinePromptOrder.value[index]
    offlinePromptOrder.value[index] = offlinePromptOrder.value[target]
    offlinePromptOrder.value[target] = temp
    saveState()
  }

  const saveCustomPrompt = (promptObj) => {
    if (!promptObj.name || !promptObj.content) return false
    promptObj.id = promptObj.id || 'cp_' + Date.now()
    promptObj.category = promptObj.category || '自定义'
    promptObj.enabled = promptObj.enabled !== false
    promptObj.injectRole = promptObj.injectRole || 'system'
    offlineCustomPrompts.value.push(promptObj)

    const catId = 'cat_group_' + promptObj.category
    if (!offlinePromptOrder.value.find(o => o.id === catId)) {
      offlinePromptOrder.value.push({ id: catId, type: 'custom_category', category: promptObj.category })
    }
    saveState()
    return true
  }

  const deleteCustomPrompts = (ids) => {
    offlineCustomPrompts.value = offlineCustomPrompts.value.filter(p => !ids.includes(p.id))
    const activeCats = new Set(offlineCustomPrompts.value.map(p => p.category))
    offlinePromptOrder.value = offlinePromptOrder.value.filter(item => 
      item.type === 'custom_category' ? activeCats.has(item.category) : true
    )
    saveState()
  }

  const moveCustomItem = (category, index, dir) => {
    const items = offlineCustomPrompts.value.filter(p => p.category === category)
    const targetIndex = index + dir
    if (targetIndex < 0 || targetIndex >= items.length) return
    const idA = items[index].id
    const idB = items[targetIndex].id
    const realIndexA = offlineCustomPrompts.value.findIndex(p => p.id === idA)
    const realIndexB = offlineCustomPrompts.value.findIndex(p => p.id === idB)
    const temp = offlineCustomPrompts.value[realIndexA]
    offlineCustomPrompts.value[realIndexA] = offlineCustomPrompts.value[realIndexB]
    offlineCustomPrompts.value[realIndexB] = temp
    saveState()
  }

  const savePromptPreset = (name) => {
    const newId = 'preset_' + Date.now()
    offlinePromptPresets.value.push({ id: newId, name, order: JSON.parse(JSON.stringify(offlinePromptOrder.value)), customs: JSON.parse(JSON.stringify(offlineCustomPrompts.value)), base: offlineBasePrompt.value })
    saveState()
    return newId
  }
  const loadPromptPreset = (id) => {
    const preset = offlinePromptPresets.value.find(p => p.id === id)
    if (preset) {
      offlinePromptOrder.value = JSON.parse(JSON.stringify(preset.order))
      offlineCustomPrompts.value = JSON.parse(JSON.stringify(preset.customs))
      if (preset.base) offlineBasePrompt.value = preset.base
      saveState()
    }
  }
  const deletePromptPreset = (id) => { offlinePromptPresets.value = offlinePromptPresets.value.filter(p => p.id !== id); saveState() }
  const importConfig = (jsonString) => {
    try {
      const data = JSON.parse(jsonString)
      if (data.offlinePromptOrder && data.offlineCustomPrompts) {
        offlinePromptOrder.value = data.offlinePromptOrder
        offlineCustomPrompts.value = data.offlineCustomPrompts
        if (data.offlineBasePrompt) offlineBasePrompt.value = data.offlineBasePrompt
        saveState()
        return true
      }
      return false
    } catch (e) { return false }
  }

  const buildOfflineApiMessages = (chat, config, offlineMessages, activeMemories) => {
    const messages = []
    let currentSystemContent = ''

    const pushSystem = () => {
      if (currentSystemContent.trim()) {
        messages.push({ role: 'system', content: currentSystemContent.trim() })
        currentSystemContent = ''
      }
    }

    let charSetting = '未绑定角色设定'
    let localWb = ''
    if (chat && !chat.isGroup && chat.participants?.length > 0) {
      const char = getCharById(chat.participants[0].id)
      if (char) charSetting = char.systemPrompt || char.description || charSetting
    }
    if (chat?.worldbook) {
      localWb = chat.worldbook
    }

    const persona = chat?.boundPersonaId ? personas.value.find(p => p.id === chat.boundPersonaId) : personas.value.find(p => p.isActive)
    const myName = persona?.name || userProfile.value.name
    const myDesc = persona?.description || ''

    for (const item of offlinePromptOrder.value) {
      if (item.key === 'chat_history') {
        pushSystem()
        offlineMessages.forEach(m => { messages.push({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content }) })
        continue
      }

      let injectedText = ''
      let role = 'system'

      if (item.key === 'offline_base') {
        injectedText = offlineBasePrompt.value + '\n'
      } 
      else if (item.key === 'offline_char') {
        injectedText = `【你的角色设定】\n${charSetting}\n`
      } 
      else if (item.key === 'offline_user') {
        injectedText = `【User(我)的设定】\n名字：${myName}\n${myDesc}\n`
      } 
      else if (item.key === 'long_term_memory') {
        if (activeMemories && activeMemories.length > 0) {
          injectedText = `【你们的长期记忆】\n` + activeMemories.map(m => `[${m.date}] ${m.text}`).join('\n') + `\n`
        }
      }
      else if (item.key === 'local_worldbook') {
        if (localWb) {
          injectedText = `【局部特殊设定】\n${localWb}\n`
        }
      }
      else if (item.key === 'offline_quick') {
        let quickTxt = `【行为与文风准则】\n`
        if (config.antiRepeatPrompt) quickTxt += `- 动作规范：${config.antiRepeatPrompt}\n`
        if (config.wordCountMin && config.wordCountMax) quickTxt += `- 字数限制：严格控制在 ${config.wordCountMin} 到 ${config.wordCountMax} 字之间。\n`
        if (config.stylePrompt) quickTxt += `- 核心文风/场景要求：${config.stylePrompt}\n`
        injectedText = quickTxt
      } 
      else if (item.key === 'worldbook') {
        enabledWorldbooks.value.forEach(wb => {
          if (wb.injectRole === 'system') currentSystemContent += `\n【世界书：${wb.title}】\n${wb.content}\n`
          else { pushSystem(); messages.push({ role: wb.injectRole, content: `【世界书补充：${wb.title}】\n${wb.content}` }) }
        })
        continue
      } 
      else if (item.type === 'custom_category') {
        const catItems = offlineCustomPrompts.value.filter(p => p.category === item.category && p.enabled !== false)
        for (const cp of catItems) {
          if (cp.injectRole === 'system') currentSystemContent += `\n【${cp.name}】\n${cp.content}\n`
          else { pushSystem(); messages.push({ role: cp.injectRole, content: `【${cp.name}】\n${cp.content}` }) }
        }
        continue
      }

      if (injectedText) {
        if (role === 'system') currentSystemContent += `\n${injectedText}\n`
        else { pushSystem(); messages.push({ role, content: injectedText }) }
      }
    }
    pushSystem()
    return messages
  }

  const previewData = computed(() => {
    const msgs = buildOfflineApiMessages(null, { wordCountMin: 150, wordCountMax: 300, antiRepeatPrompt: '禁止抢话', stylePrompt: '测试预览' }, [], [])
    const text = JSON.stringify(msgs, null, 2)
    return { text, tokens: Math.ceil(text.length / 4) }
  })

  return {
    offlinePromptOrder, offlineCustomPrompts, offlinePromptPresets, offlineBasePrompt, 
    getOrderName, getOrderIcon, moveOrder, saveCustomPrompt, deleteCustomPrompts, 
    moveCustomItem, savePromptPreset, loadPromptPreset, deletePromptPreset, saveState,
    importConfig, buildOfflineApiMessages, previewData
  }
}

