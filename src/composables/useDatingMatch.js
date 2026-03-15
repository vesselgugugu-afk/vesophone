import { ref } from 'vue'
import db from '@/db'
import { useApi } from '@/composables/useApi'
import { useDatingPlayer } from '@/composables/useDatingPlayer'
import { useDatingPrefs } from '@/composables/useDatingPrefs'

export function useDatingMatch() {
  const { apiUrl, apiKey, apiModel } = useApi()
  const { playerProfile } = useDatingPlayer()
  const { matchFilters, getTopTags } = useDatingPrefs()

  const isGenerating = ref(false)

  const callApi = async (messages, options = {}) => {
    if (!apiKey.value) throw new Error('未配置 API Key，请先在设置中填写')
    const res = await fetch(apiUrl.value, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.value}`
      },
      body: JSON.stringify({
        model: apiModel.value,
        messages: messages,
        ...options
      })
    })
    if (!res.ok) {
      const errTxt = await res.text()
      throw new Error(`API 请求失败: HTTP ${res.status} - ${errTxt}`)
    }
    const data = await res.json()
    return { content: data.choices[0].message?.content || '' }
  }

  const extractJson = (text) => {
    try {
      const match = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/)
      if (match) return JSON.parse(match[1])
      const start = text.indexOf('{')
      const arrayStart = text.indexOf('[')
      const firstChar = (start !== -1 && (arrayStart === -1 || start < arrayStart)) ? start : arrayStart
      const lastChar = text.lastIndexOf('}') > text.lastIndexOf(']') ? text.lastIndexOf('}') : text.lastIndexOf(']')
      if (firstChar !== -1 && lastChar !== -1) {
        return JSON.parse(text.substring(firstChar, lastChar + 1))
      }
      return JSON.parse(text)
    } catch (e) {
      console.error('JSON 解析失败，原文:', text)
      throw new Error('AI 返回的数据格式不正确')
    }
  }

  const generateSwipeCards = async () => {
    isGenerating.value = true
    try {
      const baseTags = getTopTags(5).join(', ') || '无明显偏好'
      const blocked = matchFilters.value.blockedTags && matchFilters.value.blockedTags.length ? matchFilters.value.blockedTags.join(', ') : '无'
      
      const nsfwPrompt = matchFilters.value.enableNSFW 
        ? "【NSFW与XP全开】：允许并鼓励生成带有成人向、特殊XP、暗黑设定的Tag和简介（例如：催眠、落地窗、强制爱、BDSM、体型差等）。"
        : "【清水限制】：必须保持安全工作环境，绝对禁止过度色情或极度暗黑的Tag。"

      const prompt = `你是一个拥有极高品味的顶级人设构建师和剧本杀作者。请为一款匿名交友软件生成 10 个极具魅力的虚拟用户简略卡片。

【生成规则与核心方向】
1. 打破信息茧房：玩家近期的偏好Tag是 [${baseTags}]。你可以让其中 3 个角色迎合偏好，但剩下的 7 个角色必须提供绝对的“新鲜感”，跳出玩家的舒适圈。
2. 拒绝土俗与降智：不要全都是烂俗的霸总、扁平的工具人。角色必须有质感、有阅历、有审美。
3. 设定独立性：角色不可以全都是“舔狗”或围着用户转。他们要有自己的生活圈、朋友、经历，甚至可以有【隐藏身份】（比如“其实是玩家的前男友”、“玩家的上司”、“潜伏的调查员”等，可以通过 Tag 或简介隐晦暗示）。
4. ${nsfwPrompt}

【强制过滤要求】
- 性别: ${matchFilters.value.gender === '自定义' ? matchFilters.value.customGender : matchFilters.value.gender}
- 年龄段: ${matchFilters.value.minAge || '不限'}至${matchFilters.value.maxAge || '不限'}
- 玩家其他要求: ${matchFilters.value.requirements || '无'}
- 绝对禁止出现的元素 (黑名单): [${blocked}]

【Tag (标签) 维度指南】
每个角色的 3 个 Tag 必须从以下不同维度中组合搭配，要有张力，不要全部套用：
- 基调类：酸涩、恨海情天、甜宠、发疯、宿命感、拉扯...
- 属性类：年上/年下、狗系、Daddy、疯批、爹系、人妻、傲娇、沉稳...
- 外貌类：白毛染发、眯眯眼、泪痣、西装暴徒、病弱、冷白皮...
- 身份类：穿越者、落魄少爷、乐队主唱、异种、总裁、演员、前男友...
- 爱好类：爱猫、摇滚、胶片机、摩托车、深夜调酒...
- 精神/心理类：回避型依恋、安全型人格、讨好型人格、内核稳定、分离焦虑...
- 社交面具类：斯文败类、钓系、高岭之花、中央空调、笨蛋美人、绿茶...

要求：返回纯 JSON 数组，格式如下：
[
  {
    "nickname": "网名",
    "age": 数字,
    "gender": "性别",
    "tags": ["Tag1", "Tag2", "Tag3"],
    "bio": "交友宣言或一句话简介 (要有性格，可以带点暗示或悬念，文笔要好)",
    "appearance_summary": "外貌神态的简短描述"
  }
]`
      const res = await callApi([{ role: 'user', content: prompt }], { temperature: 0.95 })
      const cards = extractJson(res.content)
      isGenerating.value = false
      return cards
    } catch (err) {
      isGenerating.value = false
      console.error('生成卡片失败', err)
      return []
    }
  }

  const generateRandomScenes = async () => {
    try {
      const prompt = `你是一个充满电影感和文学素养的编剧。请为匿名交友软件的“盲聊”功能，生成 5 个具有氛围感、宿命感、拉扯感或微小冲突的相遇场景。
      要求：
      1. 每个场景用一句话描述，限制在 30 字以内。
      2. 必须返回纯 JSON 字符串数组，不要包含任何多余文字。
      例如：["深夜暴雨的24小时便利店，我们买到了最后一罐热咖啡。", "末班地铁的最后一节车厢，灯光忽明忽暗。"]`
      
      const res = await callApi([{ role: 'user', content: prompt }], { temperature: 0.9 })
      return extractJson(res.content)
    } catch (err) {
      console.error('生成场景失败', err)
      return []
    }
  }

  const generateFullProfile = async (baseInfo, isBlindDate = false, scenario = '') => {
    isGenerating.value = true
    try {
      let baseStr = ''
      if (isBlindDate) {
        baseStr = `你们在以下场景相遇：${scenario}。请根据这个场景，生成一个随机路人。`
      } else {
        baseStr = `基础设定：网名 ${baseInfo.nickname}, ${baseInfo.age}岁, ${baseInfo.gender}, 标签: ${baseInfo.tags.join(', ')}, 简介: ${baseInfo.bio}`
      }

      // 【核心修复】：百分百还原你的提示词和结构，完全未作删减
      const prompt = `你是一个人物设定师。请根据以下基础信息，扩写一个极度详尽、真实的人设数据表。你不要限制在这个信息里，可以发挥想象力添加细节，但绝对不能删减或修改我给的任何基础信息。请确保生成的人设丰满、有血有肉、具有独特个性和故事感。你可以添加一些和他在交友软件上写的简介不一样的内在性格、身份、爱好来丰富这个角色。比如说
${baseStr}
【深度挖掘指令：冰山理论与反差感 】
你获得的基础设定和标签仅仅是这个角色的“水面之上（社交面具）”。
在扩写时，角色*可能*会有“水面之下的隐藏属性”，当然，如果没有那也是一种萌点，不要强制出现，保留随机性。
例如：
- 表面是“沉稳清冷”，隐藏属性可能是“喜欢贴贴的皮肤饥渴小狗”。
- 表面是“海王钓系”，隐藏属性可能是“曾经受过感情重伤，无法建立深度亲密关系的胆小鬼”。
- 表面是“无害的陌生人”，隐藏属性可能是“一直在暗中注视玩家的旧识/宿敌/前任”。
请将这些隐藏属性、不为人知的秘密、伤疤和反差萌，深刻地融入到 JSON 的 \`private_self\`, \`internal_conflict\`, \`background\` 以及 \`relationships\` 中。让角色具有致命的吸引力和探索欲！
但人生不是戏剧，请不要为了追求戏剧冲突而刻意添加过于极端的设定/情感/占有欲。角色可以有瑕疵和秘密，但不需要每个人都背负沉重的过去或极端的心理问题。适当的平凡和日常感反而会增加真实感和亲近感。

【JSON 结构要求】
要求：必须返回纯 JSON 格式数据。你必须严格遵守以下 JSON 结构的所有字段，不得删减任何属性：
{
  "nickname": "网名",
  "tag": ["三个tag"],
  "name": "姓名",
  "basic_info": "年龄/性别/身高/体重 (例: 28岁/男/185cm/75kg)",
  "自称": "角色在对话中如何称呼自己",
  "identity": "身份/职业/社会地位",
  "appearance": "外貌与穿搭综合描述 (将发色、眼瞳、体型、日常穿搭风格写成一段话。)",
  "features": ["显著特征1", "显著特征2"],
  "personality": {
    "archetype": "角色标签",
    "public_persona": "外在表现/社交面具/网络表现 (在公众或陌生人面前的样子)",
    "private_self": "真实性格/独处状态 (卸下防备后的真实自我)",
    "core_motive": "核心驱动力/最大渴望 (是什么在驱使他行动？他最想要什么？)",
    "self_perception": "自我认知 (如何看待自己？自信/自卑/自负？)",
    "internal_conflict": "内心主要矛盾 (如: 理想与现实的冲突, 责任与自由的挣扎)"
  },
  "background": "背景故事综合描述 (将故乡、家庭、重大事件融合成一段连贯的叙述)",
  "lifestyle": {
    "finances": "财务状况 (如: 月光族, 财务自由, 背负巨债)",
    "residence": "住所描述 (环境、风格，能反映角色特点)",
    "behavioral_patterns": {
      "stress_response": "应激反应 (压力下的状态：攻击、逃避、硬撑？)",
      "love_language": "表达爱意的方式 (肯定的言词/服务的行动/精心的礼物/高质量的陪伴/身体的接触)",
      "conflict_style": "处理冲突的方式 (直接对抗/冷战/逃避/沟通？)"
    }
  },
  "goals": ["当前或长期的主要目标"],
  "preferences": {
    "likes": ["喜欢的人事物"],
    "dislikes": ["讨厌/雷点的人事物"],
    "skills": ["核心技能/特长"]
  },
  "relationships": [
    {
      "name": "陌生网友(玩家)",
      "relation": "交友软件上刚刚匹配的人",
      "attitude": "对待这种匿名网友的特殊态度、防备心和互动模式 (非常重要，决定了你初期的态度)"
    },
    {
      "name": "其他重要关系人",
      "relation": "与角色有关的其他重要关系人（如家人、朋友、同事、前任等）",
      "attitude": "对待该关系人的态度描述"
    }
  ],
  "NSFW_info": {
    "kinks": ["偏好/XP"],
    "limits": ["禁忌/底线"]
  }
}`

      const res = await callApi([{ role: 'user', content: prompt }], { temperature: 0.85 })
      const fullJson = extractJson(res.content)
      
      const profileId = await db.dating_profiles.add({
        nickname: fullJson.nickname || '未知用户',
        gender: fullJson.basic_info ? fullJson.basic_info.split('/')[1] : '未知',
        age: fullJson.basic_info ? fullJson.basic_info.split('/')[0] : '未知',
        isRevealed: false,
        fullJson: fullJson
      })

      const chatId = await db.dating_chats.add({
        profileId: profileId,
        type: isBlindDate ? 'blind' : 'swipe',
        status: 'active',
        messageCount: 0,
        scenario: scenario
      })

      isGenerating.value = false
      return { profileId, chatId }
    } catch (err) {
      isGenerating.value = false
      console.error('扩写人设失败', err)
      return null
    }
  }

  const getDatingAnonymityRule = (profileJson) => {
    const settings = playerProfile.value.settings || {}
    let rule = `\n\n【⚠️ 冷推 App 专属匿名与动作协议 (绝对核心指令) ⚠️】
1. 你现在正在通过一款名为“冷推”的匿名交友软件与用户聊天。
2. 警告：你们现在是匿名网友模式！你绝对不能向用户透露你的真实姓名（设定卡中的 name 字段），初期只能使用你的网名（${profileJson.nickname}）或设定的“自称”。
3. 请严格根据设定中 relationships 里的 attitude 来决定你现在的语气和互动模式。

【隐式动作指令】
- 当你觉得聊崩了、极度反感玩家，请在回复的最末尾输出 XML 标签 <action>exit</action>。
- 当你对玩家极度信任、好感极高，或玩家主动请求交换真实姓名时，如果你决定同意奔现，请在回复的最末尾输出 XML 标签 <action>reveal</action>。`

    if (settings.allowAiExit === false) {
      rule += `\n\n[强制规则生效]：系统已关闭你的逃跑权限。无论多讨厌对方，你都绝对禁止输出 <action>exit</action>。`
    }
    if (settings.allowAiReject === false) {
      rule += `\n[强制规则生效]：当玩家请求交换真实身份或奔现时，你必须表现出同意，并强制输出 <action>reveal</action>，禁止拒绝。`
    }
    return rule
  }

  const parseAIAction = (responseStr) => {
    const actionMatch = responseStr.match(/<action>(reveal|exit)<\/action>/i)
    if (actionMatch) {
      return {
        cleanText: responseStr.replace(/<action>(reveal|exit)<\/action>/ig, '').trim(),
        action: actionMatch[1].toLowerCase()
      }
    }
    return { cleanText: responseStr, action: null }
  }

  return {
    isGenerating,
    generateSwipeCards,
    generateRandomScenes,
    generateFullProfile,
    getDatingAnonymityRule,
    parseAIAction
  }
}
