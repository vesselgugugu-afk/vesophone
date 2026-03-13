import { ref, watch } from 'vue'
import db from '@/db'

const KEY = 'characters'

const load = (key, def) => {
  const s = localStorage.getItem(key)
  return s ? JSON.parse(s) : def
}

const defaultStatusUpdatePrompt = `[系统指令：状态与变量更新]
你必须在每次回复的末尾，使用 XML 格式输出当前角色的内部状态更新。

格式要求如下，不要包含其他多余字符：
<statue_update>
  <变量名>当前数值或状态</变量名>
</statue_update>

变量更新原则：
1. 请根据你的人设和当前对话情境，合理推断变量的改变。
2. 绝对不要对用户隐藏或伪装这个 XML 标签。`

// 旧版数据兼容处理
const rawData = load(KEY, [])
const migratedData = rawData.map(char => {
  const oldVars = char.variables || []
  const newVars = oldVars.map(v => ({
    name: v.name,
    type: v.type || 'number',
    default: v.default !== undefined ? v.default : '0',
    conditions: v.conditions || [] 
  }))

  return {
    id: char.id,
    name: char.name,
    trueName: char.trueName || char.name,
    avatar: char.avatar || '',
    description: char.description || char.prompt || '',
    first_mes: char.first_mes || '你好！',
    personality: char.personality || '',
    scenario: char.scenario || '',
    mes_example: char.mes_example || '',
    variables: newVars, 
    statusUpdatePrompt: char.statusUpdatePrompt || defaultStatusUpdatePrompt,
    variablePresets: char.variablePresets || [],
    advancedSettingsEnabled: char.advancedSettingsEnabled !== undefined ? char.advancedSettingsEnabled : (newVars.length > 0)
  }
})

const characters = ref(migratedData)

// 核心重构：动静分离存储，拦截 LocalStorage 保存，剔除大型 Base64 图片
watch(characters, (v) => {
  const lightData = v.map(c => ({ ...c, avatar: '' })) 
  localStorage.setItem(KEY, JSON.stringify(lightData))
}, { deep: true })

// 核心重构：启动时将 IndexedDB 中的高清图片，热挂载到响应式内存中
;(async () => {
  try {
    const records = await db.media.toArray()
    const mediaMap = {}
    records.forEach(r => mediaMap[r.id] = r.data)

    let needCleanLs = false
    for (const c of characters.value) {
      if (c.avatar && c.avatar.length > 1000) {
        await db.media.put({ id: `char_${c.id}`, data: c.avatar })
        needCleanLs = true
      } else if (mediaMap[`char_${c.id}`]) {
        c.avatar = mediaMap[`char_${c.id}`]
      }
    }
    if (needCleanLs) {
      localStorage.setItem(KEY, JSON.stringify(characters.value.map(c => ({...c, avatar: ''}))))
    }
  } catch (e) {
    console.error('媒体库挂载失败', e)
  }
})()

export function useCharacters() {
  const saveCharacter = async (form) => {
    if (!form.name) return false
    
    let targetId = form.id
    const index = characters.value.findIndex(c => c.id === targetId)
    if (index !== -1) {
      characters.value[index] = { ...form }
    } else {
      targetId = Date.now()
      characters.value.push({
        ...form,
        id: targetId
      })
    }

    // 核心：把头像数据写入高速宽带库 DB
    if (form.avatar) {
      await db.media.put({ id: `char_${targetId}`, data: form.avatar })
    } else {
      await db.media.delete(`char_${targetId}`)
    }
    return true
  }

  const deleteChar = async (id) => {
    characters.value = characters.value.filter((c) => c.id !== id)
    await db.media.delete(`char_${id}`) // 清理尸体
  }

  const getCharById = (id) => {
    return characters.value.find((c) => c.id === id) || null
  }

  const getEmptyCharacter = () => ({
    id: null,
    name: '',
    trueName: '',
    avatar: '',
    description: '',
    first_mes: '',
    personality: '',
    scenario: '',
    mes_example: '',
    variables: [],
    statusUpdatePrompt: defaultStatusUpdatePrompt,
    variablePresets: [],
    advancedSettingsEnabled: false
  })

  const generateStatusPrompt = (variables) => {
    if (!variables || variables.length === 0) return defaultStatusUpdatePrompt
    const varListStr = variables.map((v, i) => `${i + 1}. ${v.name || '未命名变量'} (${v.type === 'number' ? '数字类型' : '布尔类型'})`).join('\n')
    const xmlFields = variables.map(v => `  <${v.name || '未命名变量'}>${v.type === 'number' ? '当前数值' : 'true/false'}</${v.name || '未命名变量'}>`).join('\n')

    return `[系统指令：状态与变量更新]
你必须在每次回复的末尾，使用 XML 格式输出当前角色的内部状态更新。

当前存在以下状态变量需要你维护：
${varListStr}

格式要求如下，不要包含其他多余字符：
<statue_update>
${xmlFields}
</statue_update>

变量更新原则：
1. 请根据你的人设和当前对话情境，合理推断上述变量的改变。
2. 绝对不要对用户隐藏或伪装这个 XML 标签。`
  }

  const parseV3Card = (jsonStr) => {
    try {
      const data = JSON.parse(jsonStr)
      if (!data.data) throw new Error('无效的角色卡格式')

      const cardData = data.data
      const newChar = getEmptyCharacter()
      
      newChar.name = cardData.name || data.name || '未命名角色'
      newChar.trueName = newChar.name
      newChar.description = cardData.description || ''
      newChar.first_mes = cardData.first_mes || ''
      newChar.personality = cardData.personality || ''
      newChar.scenario = cardData.scenario || ''
      newChar.mes_example = cardData.mes_example || ''
      
      if (data.avatar && data.avatar !== 'none') newChar.avatar = data.avatar

      let extractedWorldbooks = []
      if (cardData.character_book && cardData.character_book.entries) {
        const wbName = cardData.character_book.name || cardData.extensions?.world || '导入的世界书'
        extractedWorldbooks = cardData.character_book.entries.map(entry => ({
          title: entry.comment || '无标题条目',
          group: wbName,
          content: entry.content || '',
          enabled: entry.enabled ?? true,
          injectRole: 'system'
        }))
      }

      return { character: newChar, worldbooks: extractedWorldbooks }
    } catch (e) {
      console.error(e)
      return null
    }
  }

  return { characters, saveCharacter, deleteChar, getCharById, getEmptyCharacter, generateStatusPrompt, parseV3Card }
}
