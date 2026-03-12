import { ref, computed, watch } from 'vue'
import { useWorldbook } from './useWorldbook'
import { usePersona } from './usePersona'
import { useStickers } from './useStickers'
import { useMusic } from './useMusic'

const KEY = 'promptOrder'
const KEY_CUSTOM = 'customPrompts'

const load = (key, def) => { const s = localStorage.getItem(key); return s ? JSON.parse(s) : def }

const defaultOrder = [
  { id: 'sys_functional',   type: 'system', key: 'functional' },
  { id: 'sys_global_wb',    type: 'system', key: 'global_worldbook' },
  { id: 'sys_local_wb',     type: 'system', key: 'local_worldbook' },
  { id: 'sys_persona',      type: 'system', key: 'persona' },
  { id: 'sys_character',    type: 'system', key: 'character' },
  { id: 'sys_memory',       type: 'system', key: 'memory' },
  { id: 'sys_chat_history', type: 'system', key: 'chat_history' }
]

let savedOrder = load(KEY, defaultOrder)
let savedCustoms = load(KEY_CUSTOM, [])

if (savedOrder.length > 0 && typeof savedOrder[0] === 'string') savedOrder = defaultOrder
if (!savedOrder.find(o => o.key === 'functional')) savedOrder.unshift({ id: 'sys_functional', type: 'system', key: 'functional' })
if (!savedOrder.find(o => o.key === 'memory')) {
  const charIdx = savedOrder.findIndex(o => o.key === 'character')
  savedOrder.splice(charIdx > -1 ? charIdx + 1 : 0, 0, { id: 'sys_memory', type: 'system', key: 'memory' })
}

const migratedOrder = []
savedOrder.forEach(item => {
  if (item.type === 'custom') {
    if (!savedCustoms.find(c => c.id === item.id)) savedCustoms.push(item)
    const catId = 'cat_group_' + item.category
    if (!migratedOrder.find(o => o.id === catId)) migratedOrder.push({ id: catId, type: 'custom_category', category: item.category })
  } else migratedOrder.push(item)
})

const promptOrder = ref(migratedOrder)
const customPrompts = ref(savedCustoms)

watch(promptOrder, (v) => localStorage.setItem(KEY, JSON.stringify(v)), { deep: true })
watch(customPrompts, (v) => localStorage.setItem(KEY_CUSTOM, JSON.stringify(v)), { deep: true })

const ORDER_NAMES = { functional: '线上聊天协议指导 (必选)', global_worldbook: '全局世界书', local_worldbook: '局部世界书（角色绑定）', persona: '我的人设', character: '角色设定', memory: '长期记忆库', chat_history: '聊天记录' }
const ORDER_ICONS = { functional: 'fas fa-terminal', global_worldbook: 'fas fa-globe', local_worldbook: 'fas fa-book', persona: 'fas fa-id-badge', character: 'fas fa-robot', memory: 'fas fa-brain', chat_history: 'fas fa-comments' }

export function usePromptOrder() {
  const { worldbooks, enabledWorldbooks } = useWorldbook()
  const { personas } = usePersona()
  const { stickerGroups } = useStickers()
  const { musicState } = useMusic()

  const getOrderName = (key) => ORDER_NAMES[key] || key
  const getOrderIcon = (key) => ORDER_ICONS[key] || 'fas fa-circle'
  const moveOrder = (index, dir) => { const arr = [...promptOrder.value]; const temp = arr[index]; arr[index] = arr[index + dir]; arr[index + dir] = temp; promptOrder.value = arr }

  const saveCustomPrompt = (form) => {
    if (!form.name || !form.content) return false
    const catName = form.category || '自定义'; const catId = 'cat_group_' + catName
    if (!promptOrder.value.find(o => o.id === catId)) promptOrder.value.push({ id: catId, type: 'custom_category', category: catName })
    customPrompts.value.push({ id: 'custom_' + Date.now(), name: form.name, category: catName, content: form.content, injectRole: form.injectRole || 'system' })
    return true
  }

  const deleteCustomPrompts = (ids) => {
    customPrompts.value = customPrompts.value.filter(p => !ids.includes(p.id))
    const activeCats = new Set(customPrompts.value.map(p => p.category))
    promptOrder.value = promptOrder.value.filter(item => item.type === 'custom_category' ? activeCats.has(item.category) : true)
  }

  const moveCustomItem = (cat, index, dir) => {
    const items = customPrompts.value.filter(p => p.category === cat)
    if (index + dir < 0 || index + dir >= items.length) return
    const id1 = items[index].id; const id2 = items[index + dir].id
    const i1 = customPrompts.value.findIndex(p => p.id === id1)
    const i2 = customPrompts.value.findIndex(p => p.id === id2)
    const temp = customPrompts.value[i1]; customPrompts.value[i1] = customPrompts.value[i2]; customPrompts.value[i2] = temp
  }

  const getOnlineChatProtocol = (availableStickers = []) => {
    const stickerNames = availableStickers.length > 0 ? availableStickers.map(s => s.name).join(', ') : '暂无'
    return `[聊天指导：关于网聊的基本素养 ]
你现在正在通过现代通讯软件与用户进行【纯线上聊天】。
【绝对禁止】：严禁在回复中使用星号或括号包裹任何动作描写，这看起来很奇怪。你只能通过打字、发图、转账、语音等线上行为交互。
你必须将你要发送的内容用 <msg type="类型" 属性="值">内容</msg> 标签包裹。支持多个标签模拟连发。

支持的 type 类型：
1. text: 纯文本。
2. quote: 引用。必须带 ref="原话" 属性。
3. recall: 撤回。内容写你想撤回的那句话。
4. transfer: 发起转账。内容写备注。必须带 amount="金额" 属性。
5. transfer_reply: 处理转账。内容空。必须带 action="accept" 或 action="reject" 属性。
6. location: 发位置。内容写地名。
7. image: 发图片。内容写你的图片视觉描述。
8. voice: 发语音。内容写你语音里说的话。
9. sticker: 发表情包。已知你的表情包库：${stickerNames}
10. music_share: 推荐音乐给用户。属性: name="歌名", artist="歌手"。内容写分享语。
11. music_colisten_req: 邀请用户一起听歌。内容写邀请语。
12. music_cmd: 音乐设备控制。属性: action="play", name="你要放的歌名", artist="歌手"。内容写你的播歌前摇语。(注意：仅在“一起听”状态下你才可以切歌！)`
  }

  const buildCharacterPrompt = (char, chatVariablesState) => {
    if (!char) return ''
    let prompt = char.description || ''
    if (char.advancedSettingsEnabled) {
      if (char.statusUpdatePrompt) prompt += `\n\n${char.statusUpdatePrompt}`
      const valState = chatVariablesState || {}
      if (Object.keys(valState).length > 0) prompt += `\n\n[当前变量状态]\n` + Object.entries(valState).map(([k, v]) => `- ${k}: ${v}`).join('\n')
      let activeCondPrompts = []
      if (char.variables) {
        char.variables.forEach(v => {
          let currentVal = valState[v.name]; if (currentVal === undefined) currentVal = v.default;
          if (v.conditions) {
            v.conditions.forEach(cond => {
              let isMatch = false;
              if (v.type === 'boolean') { isMatch = String(currentVal) === String(cond.value); }
              else {
                const numVal = parseFloat(currentVal);
                if (cond.operator === 'between') isMatch = numVal >= parseFloat(cond.valueMin) && numVal <= parseFloat(cond.valueMax);
                else if (cond.operator === '==') isMatch = numVal == parseFloat(cond.value);
                else if (cond.operator === '>') isMatch = numVal > parseFloat(cond.value);
                else if (cond.operator === '<') isMatch = numVal < parseFloat(cond.value);
                else if (cond.operator === '>=') isMatch = numVal >= parseFloat(cond.value);
                else if (cond.operator === '<=') isMatch = numVal <= parseFloat(cond.value);
              }
              if (isMatch && cond.prompt && cond.prompt.trim()) activeCondPrompts.push(cond.prompt.trim());
            })
          }
        })
      }
      if (activeCondPrompts.length > 0) prompt += `\n\n[当前阶段专属设定]\n` + activeCondPrompts.join('\n\n')
    }
    return prompt.trim()
  }

  // 时间格式化辅助函数
  const formatDate = (ts) => {
    const d = new Date(ts)
    return `[${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}]`
  }

const previewData = computed(() => {
  let text = ''
  let staticTokenStr = ''
  promptOrder.value.forEach((item) => {
    if (item.key === 'functional') {
      const fp = getOnlineChatProtocol([])
      text += `[线上聊天协议指导]\n${fp}\n\n`
      staticTokenStr += fp
    } else if (item.type === 'custom_category') {
      const catItems = customPrompts.value.filter(p => p.category === item.category)
      if (catItems.length > 0) {
        text += `[组 · ${item.category}]\n`
        catItems.forEach(cp => {
          text += `  · ${cp.name}: ${cp.content}\n`
          staticTokenStr += cp.content
        })
        text += '\n'
      }
    } else if (item.key === 'global_worldbook') {
      if (enabledWorldbooks.value.length > 0) {
        text += `[全局世界书]\n`
        enabledWorldbooks.value.forEach((wb) => {
          text += `  · ${wb.title}: ${wb.content}\n`
          staticTokenStr += wb.content
        })
        text += '\n'
      }
    } else if (item.key === 'local_worldbook') {
      text += `[局部世界书] (因聊天绑定动态生效)\n\n`
    } else if (item.key === 'persona') {
      text += `[我的人设] (全局或聊天专属覆盖)\n\n`
    } else if (item.key === 'character') {
      text += `[角色设定] (动态条件注入)\n\n`
    } else if (item.key === 'memory') {
      text += `[长期记忆库] (动态提取)\n\n`
    } else if (item.key === 'chat_history') {
      text += `[聊天记录] (动态切片)\n\n`
    }
  })
  return { text: text.trim(), tokens: Math.ceil(staticTokenStr.length / 4) }
})


  const buildApiMessages = (currentChat, activeMessages, activeMemories) => {
    const apiMessages = []
    let availableStickers = []
    if (currentChat.boundStickerGroups) {
      currentChat.boundStickerGroups.forEach(gid => {
        const group = stickerGroups.value.find(g => g.id === gid)
        if (group) availableStickers.push(...group.stickers)
      })
    }
    let activePersona = personas.value.find(p => p.id === currentChat.boundPersonaId) || personas.value.find(p => p.isActive)

    promptOrder.value.forEach((item) => {
      if (item.key === 'functional') { 
        let baseProtocol = getOnlineChatProtocol(availableStickers)
        if (musicState.coListenCharId === currentChat.id && musicState.currentSongName) {
          const queueList = musicState.playlist.slice(musicState.currentIndex + 1, musicState.currentIndex + 4)
          let queueStr = queueList.length > 0 ? `接下来的播放队列依次是：${queueList.map(s => `《${s.name}》`).join('、')}。` : ''
          baseProtocol += `\n\n[🎶 音乐同频系统状态]
你和用户正在“一起听”音乐！
当前正在播放：《${musicState.currentSongName}》- ${musicState.currentArtist}
${musicState.islandSubtitle ? `当前刚好唱到这句歌词：“${musicState.islandSubtitle}”` : ''}
${queueStr}
你可以结合歌词回复，也可以把它当bgm继续聊。如果你有想听的歌，可以使用 <msg type="music_cmd" action="play"> 为用户切一首新歌。`
        }
        apiMessages.push({ role: 'system', content: baseProtocol }) 
      }
      else if (item.type === 'custom_category') { const catItems = customPrompts.value.filter(p => p.category === item.category); catItems.forEach(cp => apiMessages.push({ role: cp.injectRole || 'system', content: cp.content })) }
      else if (item.key === 'global_worldbook') { enabledWorldbooks.value.forEach((wb) => apiMessages.push({ role: wb.injectRole || 'system', content: wb.content })) }
      else if (item.key === 'local_worldbook') {
        if (currentChat.boundWorldbookIds) {
          currentChat.boundWorldbookIds.forEach(wid => {
            const wb = worldbooks.value.find(w => w.id === wid)
            if (wb) apiMessages.push({ role: wb.injectRole || 'system', content: wb.content })
          })
        }
      }
      else if (item.key === 'persona') { if (activePersona) apiMessages.push({ role: 'system', content: activePersona.content }) }
      else if (item.key === 'character') {
        let charPrompt = ''
        if (currentChat.isGroup && currentChat.participants) charPrompt = '群聊列表：\n' + currentChat.participants.map((c) => `- ${c.name}：\n${buildCharacterPrompt(c, currentChat.variablesState)}`).join('\n\n')
        else charPrompt = buildCharacterPrompt(currentChat.participants?.[0], currentChat.variablesState)
        if (charPrompt.trim()) apiMessages.push({ role: 'system', content: charPrompt.trim() })
      }
      else if (item.key === 'memory') {
        if (activeMemories && activeMemories.length > 0) {
          const memStr = activeMemories.map((m, i) => `${i+1}. [${m.date}] ${m.text}`).join('\n')
          apiMessages.push({ role: 'system', content: `[长期记忆]\n${memStr}` })
        }
      }
      else if (item.key === 'chat_history') {
        const contextCount = Number(currentChat.settings?.contextMessageCount) || 20
        const recentMessages = (activeMessages || []).slice(-contextCount)

        const history = recentMessages
          .filter((m) => m.role !== 'system')
          .map((m) => {
            // 核心修复：提取并拼接精确的时间戳前缀！
            const timePrefix = formatDate(m.timestamp || m.id) + ' '
            let prefix = '', cont = m.content
            
            if (m.type === 'recalled') { prefix = '【撤回了一条消息】原内容：'; cont = m.oldContent || m.content }
            else if (m.type === 'transfer') prefix = `【发起转账: ￥${m.amount}，状态: ${m.status}】备注：`
            else if (m.type === 'voice') prefix = '【发了一条语音消息】原话：'
            else if (m.type === 'image') prefix = '【发送图片】描述：'
            else if (m.type === 'sticker') prefix = '【发送表情包】'
            else if (m.type === 'location') prefix = '【发送位置】'
            else if (m.type === 'quote') prefix = `【引用回复: "${m.refText}"】`
            else if (m.type === 'lyric_share') prefix = `【分享了一句歌词："${m.text}"】来自歌曲《${m.song}》。附加语：`
            else if (m.type === 'music_share') prefix = `【推荐了一首歌: 《${m.name}》- ${m.artist}】附加语：`
            else if (m.type === 'music_colisten_req') prefix = `【发出了“一起听歌”邀请】`
            else if (m.type === 'music_cmd') prefix = `【使用了切歌，换成了: 《${m.name}》】附加语：`
            
            return { role: m.role === 'ai' ? 'assistant' : 'user', content: timePrefix + prefix + cont }
          })
        apiMessages.push(...history)
      }
    })
    return apiMessages
  }

  return { promptOrder, customPrompts, getOrderName, getOrderIcon, moveOrder, moveCustomItem, saveCustomPrompt, deleteCustomPrompts, previewData, buildApiMessages, buildCharacterPrompt }
}
