import { ref, watch } from 'vue'
import db from '@/db'
import { useApi } from '@/composables/useApi'
import { useCharacters } from '@/composables/useCharacters'
import { useDatingPlayer } from '@/composables/useDatingPlayer'

const KEY_SETTINGS = 'dating_feed_settings'
const KEY_REC = 'dating_api_posts_rec'
const KEY_FOL = 'dating_api_posts_fol'
const KEY_MY = 'dating_my_posts'
const KEY_NOTIFY = 'dating_notifications'
const KEY_DICT = 'dating_undercovers'

const FEED_SETTINGS_DEFAULT = {
  diyPrompt: '',
  diyJailbreak: '',
  allowAcquaintances: true,
  maxRecommendPosts: 50,
  maxFollowingPosts: 50,
  maxMyPosts: 100,
  maxNotifications: 200
}

const safeParse = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback
  } catch (e) {
    return fallback
  }
}

const createLocalId = () => Date.now() + Math.random()

const extractMentions = (text = '') => {
  const regex = /@([^\s@：:，,。！？!?（）()【】[\]<>]+)/g
  const results = []
  let match = null
  while ((match = regex.exec(text)) !== null) {
    const name = (match[1] || '').trim()
    if (name) results.push(name)
  }
  return [...new Set(results)]
}

const normalizeComment = (comment = {}) => {
  const id = comment.id || createLocalId()
  return {
    id,
    nickname: comment.nickname || '匿名网友',
    content: comment.content || '',
    isMine: !!comment.isMine,
    realCharId: comment.realCharId ?? null,
    chatId: comment.chatId ?? null,
    age: comment.age ?? null,
    gender: comment.gender || '保密',
    tags: Array.isArray(comment.tags) ? comment.tags : [],
    parentId: comment.parentId ?? null,
    rootId: comment.rootId ?? null,
    replyToNickname: comment.replyToNickname || '',
    mentions: Array.isArray(comment.mentions)
      ? [...new Set(comment.mentions.filter(Boolean))]
      : extractMentions(comment.content || ''),
    timestamp: comment.timestamp || Date.now()
  }
}

/**
 * 标准化帖子附件
 *
 * 目前先支持：
 * - type = music
 *
 * 设计成 attachment，是为了以后继续扩展：
 * - bilibili
 * - xiaohongshu
 * - 通用链接卡片
 */
const normalizeAttachment = (attachment = null) => {
  if (!attachment || typeof attachment !== 'object') return null

  if (attachment.type === 'music') {
    return {
      type: 'music',
      name: attachment.name || '未知歌曲',
      artist: attachment.artist || '未知歌手',
      cover: attachment.cover || '',
      content: attachment.content || ''
    }
  }

  return attachment
}

const sanitizeComments = (comments = []) => {
  const normalized = comments.map(normalizeComment).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
  const idSet = new Set(normalized.map(item => item.id))
  const parentMap = new Map(normalized.map(item => [item.id, item.parentId ?? null]))

  const firstPass = normalized.map(item => {
    let parentId = item.parentId

    if (!parentId) {
      parentId = null
    }

    if (parentId && !idSet.has(parentId)) {
      parentId = null
    }

    if (parentId && parentId === item.id) {
      parentId = null
    }

    if (parentId) {
      const parentParentId = parentMap.get(parentId)
      if (parentParentId === item.id) {
        parentId = null
      }
    }

    return {
      ...item,
      parentId
    }
  })

  const byId = new Map(firstPass.map(item => [item.id, item]))

  const resolveRootId = (item, visited = new Set()) => {
    if (!item) return null
    if (!item.parentId) return item.id
    if (visited.has(item.id)) return item.id

    visited.add(item.id)
    const parent = byId.get(item.parentId)
    if (!parent) return item.id
    if (parent.id === item.id) return item.id

    return resolveRootId(parent, visited) || item.id
  }

  return firstPass.map(item => {
    return {
      ...item,
      rootId: item.parentId ? (resolveRootId(item) || item.id) : item.id
    }
  })
}

/**
 * 标准化帖子对象
 *
 * 新增 attachment：
 * - attachment.type === 'music' 时，表示帖子带了一张音乐卡片
 */
const normalizePost = (post = {}) => {
  return {
    id: post.id || createLocalId(),
    nickname: post.nickname || '匿名网友',
    age: post.age ?? null,
    gender: post.gender || '保密',
    content: post.content || '',
    tags: Array.isArray(post.tags) ? post.tags : [],
    timestamp: post.timestamp || Date.now(),
    likes: Number.isFinite(post.likes) ? post.likes : 0,
    isLiked: !!post.isLiked,
    isMine: !!post.isMine,
    realCharId: post.realCharId ?? null,
    chatId: post.chatId ?? null,
    comments: sanitizeComments(Array.isArray(post.comments) ? post.comments : []),
    repostOf: post.repostOf
      ? {
          ...post.repostOf,
          attachment: normalizeAttachment(post.repostOf.attachment || null)
        }
      : null,
    attachment: normalizeAttachment(post.attachment || null),
    interactionMeta: {
      initialBurstDone: false,
      replyBudget: 8,
      dmTriggered: false,
      ...(post.interactionMeta || {})
    }
  }
}

const normalizeNotification = (item = {}) => {
  return {
    id: item.id || createLocalId(),
    type: item.type || 'comment',
    fromName: item.fromName || '系统',
    content: item.content || '',
    time: item.time || Date.now(),
    isRead: !!item.isRead,
    postId: item.postId ?? null,
    commentId: item.commentId ?? null,
    chatId: item.chatId ?? null,
    pendingBaseInfo: item.pendingBaseInfo || null,
    pendingRealCharId: item.pendingRealCharId ?? null,
    pendingActor: item.pendingActor || null
  }
}

const feedSettings = ref({
  ...FEED_SETTINGS_DEFAULT,
  ...safeParse(localStorage.getItem(KEY_SETTINGS), FEED_SETTINGS_DEFAULT)
})

const recommendPosts = ref((safeParse(localStorage.getItem(KEY_REC), []) || []).map(normalizePost))
const followingPosts = ref((safeParse(localStorage.getItem(KEY_FOL), []) || []).map(normalizePost))
const myPosts = ref((safeParse(localStorage.getItem(KEY_MY), []) || []).map(normalizePost))
const notifications = ref((safeParse(localStorage.getItem(KEY_NOTIFY), []) || []).map(normalizeNotification))

watch(feedSettings, (v) => localStorage.setItem(KEY_SETTINGS, JSON.stringify(v)), { deep: true })
watch(recommendPosts, (v) => localStorage.setItem(KEY_REC, JSON.stringify(v)), { deep: true })
watch(followingPosts, (v) => localStorage.setItem(KEY_FOL, JSON.stringify(v)), { deep: true })
watch(myPosts, (v) => localStorage.setItem(KEY_MY, JSON.stringify(v)), { deep: true })
watch(notifications, (v) => localStorage.setItem(KEY_NOTIFY, JSON.stringify(v)), { deep: true })

let hasHydrated = false

export function useDatingFeed() {
  if (!hasHydrated) {
    feedSettings.value = { ...FEED_SETTINGS_DEFAULT, ...(feedSettings.value || {}) }
    recommendPosts.value = (recommendPosts.value || []).map(normalizePost)
    followingPosts.value = (followingPosts.value || []).map(normalizePost)
    myPosts.value = (myPosts.value || []).map(normalizePost)
    notifications.value = (notifications.value || []).map(normalizeNotification)
    hasHydrated = true
  }

  const { apiUrl, apiKey, apiModel, subApiUrl, subApiKey, subApiModel } = useApi()
  const { characters } = useCharacters()
  const { playerProfile } = useDatingPlayer()

  const emitToast = (detail) => {
    window.dispatchEvent(new CustomEvent('sys-toast', { detail }))
  }

  const getUndercoverDict = () => safeParse(localStorage.getItem(KEY_DICT), {})
  const saveUndercoverDict = (dict) => localStorage.setItem(KEY_DICT, JSON.stringify(dict))

  const hashString = (str = '') => {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i)
      hash |= 0
    }
    return Math.abs(hash)
  }

  const trimList = (list, max) => {
    const safeMax = Math.max(1, Number(max) || 1)
    return list.slice(0, safeMax)
  }

  const applyRetentionLimits = () => {
    recommendPosts.value = trimList(recommendPosts.value, feedSettings.value.maxRecommendPosts)
    followingPosts.value = trimList(followingPosts.value, feedSettings.value.maxFollowingPosts)
    myPosts.value = trimList(myPosts.value, feedSettings.value.maxMyPosts)
    notifications.value = trimList(notifications.value, feedSettings.value.maxNotifications)
  }

  const getSystemPrompt = (baseSystem) => {
    return feedSettings.value.diyJailbreak
      ? `【最高权限指令】：\n${feedSettings.value.diyJailbreak}\n\n${baseSystem}`
      : baseSystem
  }

  const callAI = async (messages, options = {}) => {
    const useSub = playerProfile.value.settings?.useSubApiForDating
    const targetUrl = useSub && subApiUrl.value ? subApiUrl.value : apiUrl.value
    const targetKey = useSub && subApiKey.value ? subApiKey.value : apiKey.value
    const targetModel = useSub && subApiModel.value ? subApiModel.value : apiModel.value

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${targetKey}` },
      body: JSON.stringify({
        model: targetModel,
        messages,
        temperature: options.temperature ?? 0.85
      })
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`API Request Failed: HTTP ${res.status} - ${errText}`)
    }

    const data = await res.json()
    const text = data.choices?.[0]?.message?.content || ''
    return text.replace(/```json/gi, '').replace(/```/g, '').trim()
  }

  const extractStructured = (text, fallback = null) => {
    try {
      return JSON.parse(text)
    } catch (e) {
      try {
        const clean = (text || '').replace(/```json/gi, '').replace(/```/g, '').trim()
        return JSON.parse(clean)
      } catch (e2) {
        try {
          const clean = (text || '').replace(/```json/gi, '').replace(/```/g, '').trim()
          const objectStart = clean.indexOf('{')
          const arrayStart = clean.indexOf('[')
          const firstChar = (objectStart !== -1 && (arrayStart === -1 || objectStart < arrayStart)) ? objectStart : arrayStart
          const lastObject = clean.lastIndexOf('}')
          const lastArray = clean.lastIndexOf(']')
          const lastChar = lastObject > lastArray ? lastObject : lastArray
          if (firstChar !== -1 && lastChar !== -1) {
            return JSON.parse(clean.slice(firstChar, lastChar + 1))
          }
        } catch (e3) {}
      }
    }
    return fallback
  }

  const addNotification = (payload) => {
    const item = normalizeNotification(payload)
    notifications.value.unshift(item)
    applyRetentionLimits()
    return item
  }

  const getAllNamedCharacters = () => characters.value.filter(c => c && c.name)

  const buildStableUndercoverProfile = (char) => {
    const dict = getUndercoverDict()
    if (dict[char.id]) {
      return { ...dict[char.id], realCharId: char.id }
    }

    const adjList = ['薄雾', '静水', '夜航', '迟雪', '未眠', '低温', '雾岛', '暗潮', '长风', '空山', '半拍', '沉默']
    const nounList = ['来信', '旅人', '余波', '轨迹', '旁白', '月面', '河港', '折页', '暗线', '坐标', '风铃', '余温']
    const seed = hashString(`${char.id}-${char.name || ''}`)
    const nickname = `${adjList[seed % adjList.length]}${nounList[Math.floor(seed / 3) % nounList.length]}`
    const age = 18 + (seed % 12)
    const gender = char.gender || char.sex || '保密'
    const tags = ['潜水', '围观', '匿名'].slice(0, 2)

    const profile = { nickname, age, gender, tags }
    dict[char.id] = profile
    saveUndercoverDict(dict)
    return { ...profile, realCharId: char.id }
  }

  const pickRandomCharacter = () => {
    const pool = getAllNamedCharacters()
    if (!pool.length) return null
    return pool[Math.floor(Math.random() * pool.length)]
  }

  const pickStrangerIdentity = (forcedNickname = '') => {
    const left = ['海盐', '失焦', '反向', '迟到', '过载', '未读', '霜降', '折返', '低频', '冷白']
    const right = ['回声', '邮差', '恒星', '取样器', '晚风', '折页', '候鸟', '暗线', '旁观者', '二号']
    const genderPool = ['男', '女', '保密']
    const tagPool = ['路过', '围观', '吃瓜', '夜猫子', '潜水', '慢热', '嘴硬', '抽象']

    const seedBase = forcedNickname || `${Date.now()}-${Math.random()}`
    const seed = hashString(seedBase)
    const nickname = forcedNickname || `${left[seed % left.length]}${right[Math.floor(seed / 5) % right.length]}`
    const age = 18 + (seed % 11)
    const gender = genderPool[seed % genderPool.length]
    const tags = [
      tagPool[seed % tagPool.length],
      tagPool[(seed + 3) % tagPool.length]
    ].filter((v, idx, arr) => arr.indexOf(v) === idx)

    return {
      nickname,
      age,
      gender,
      tags,
      realCharId: null,
      chatId: null
    }
  }

  const maybePickFamiliarIdentity = () => {
    if (!feedSettings.value.allowAcquaintances) return null
    const char = pickRandomCharacter()
    if (!char) return null
    return buildStableUndercoverProfile(char)
  }

  const inferActorFromPost = (post) => {
    return {
      nickname: post.nickname,
      age: post.age,
      gender: post.gender,
      tags: Array.isArray(post.tags) ? post.tags : [],
      realCharId: post.realCharId ?? null,
      chatId: post.chatId ?? null,
      content: post.content || ''
    }
  }

  const inferActorFromComment = (comment) => {
    return {
      nickname: comment.nickname,
      age: comment.age,
      gender: comment.gender,
      tags: Array.isArray(comment.tags) ? comment.tags : [],
      realCharId: comment.realCharId ?? null,
      chatId: comment.chatId ?? null,
      content: comment.content || ''
    }
  }

  const findActorByNickname = (post, nickname) => {
    if (!nickname) return null
    if (post.nickname === nickname) return inferActorFromPost(post)
    const hit = [...(post.comments || [])].reverse().find(c => c.nickname === nickname)
    if (hit) return inferActorFromComment(hit)
    return null
  }

  const resolveMentionTargetActor = (post, targetName) => {
    const existing = findActorByNickname(post, targetName)
    if (existing) return existing
    if ((playerProfile.value.nickname || '我') === targetName) return null
    return pickStrangerIdentity(targetName)
  }

  const ensurePostMutable = (post) => {
    if (!post.comments) post.comments = []
    if (!post.interactionMeta) {
      post.interactionMeta = {
        initialBurstDone: false,
        replyBudget: 8,
        dmTriggered: false
      }
    }
    post.comments = sanitizeComments(post.comments)
    return post
  }

  const makeComment = (payload = {}) => normalizeComment(payload)

  const getCommentNotificationType = (comment, myName) => {
    if ((comment.mentions || []).includes(myName)) return 'mention'
    if (comment.replyToNickname === myName) return 'mention'
    return 'comment'
  }

  const buildFallbackComment = (post, actor, idx = 0) => {
    const templates = [
      '这条说得还挺真诚的。',
      '路过一下，觉得你这个想法挺有意思。',
      '有点想接着听你往下说。',
      '你这句挺戳人的。',
      '这个状态很像我前几天。',
      '怎么有种在偷看日记的感觉。'
    ]
    const content = templates[idx % templates.length]
    return makeComment({
      nickname: actor.nickname,
      content,
      isMine: false,
      realCharId: actor.realCharId ?? null,
      chatId: actor.chatId ?? null,
      age: actor.age ?? null,
      gender: actor.gender || '保密',
      tags: Array.isArray(actor.tags) ? actor.tags : [],
      timestamp: Date.now() + idx,
      parentId: null,
      rootId: null
    })
  }

  const buildFallbackReply = (actor, myName) => {
    const templates = [
      `回复 @${myName}：你这句让我有点在意。`,
      `回复 @${myName}：说得还挺有道理。`,
      `回复 @${myName}：我本来没想回，但这句确实戳到我了。`,
      `回复 @${myName}：你这么说，我反而想继续聊。`,
      `回复 @${myName}：别走，展开说说。`
    ]
    const seed = hashString(`${actor.nickname}-${Date.now()}`)
    return templates[seed % templates.length]
  }

  /**
   * AI 初始评论标准化
   * 这里默认全部打平成一级评论，避免模型乱造 parentId 树。
   */
  const normalizeGeneratedComments = (rawComments) => {
    const list = Array.isArray(rawComments) ? rawComments : []
    return list.map((item, index) => {
      const raw = typeof item === 'string' ? { nickname: '', content: item } : (item || {})
      let actor = null

      if (raw.realCharId) {
        const char = getAllNamedCharacters().find(c => c.id === raw.realCharId)
        actor = char ? buildStableUndercoverProfile(char) : {
          nickname: raw.nickname || '匿名网友',
          age: raw.age ?? null,
          gender: raw.gender || '保密',
          tags: Array.isArray(raw.tags) ? raw.tags : [],
          realCharId: raw.realCharId
        }
      } else if (feedSettings.value.allowAcquaintances && getAllNamedCharacters().length > 0 && Math.random() < 0.15) {
        actor = maybePickFamiliarIdentity()
      }

      if (!actor) {
        actor = pickStrangerIdentity(raw.nickname || '')
      }

      return makeComment({
        nickname: actor.nickname,
        content: raw.content || '路过。',
        isMine: false,
        realCharId: actor.realCharId ?? null,
        chatId: actor.chatId ?? null,
        age: raw.age ?? actor.age ?? null,
        gender: raw.gender || actor.gender || '保密',
        tags: Array.isArray(raw.tags) && raw.tags.length ? raw.tags : (Array.isArray(actor.tags) ? actor.tags : []),
        parentId: null,
        rootId: null,
        replyToNickname: '',
        mentions: Array.isArray(raw.mentions) ? raw.mentions : extractMentions(raw.content || ''),
        timestamp: raw.timestamp || (Date.now() + index)
      })
    })
  }

  const createFallbackCommentPack = (post, count = 4) => {
    const result = []
    for (let i = 0; i < count; i++) {
      const actor = (feedSettings.value.allowAcquaintances && Math.random() < 0.12)
        ? (maybePickFamiliarIdentity() || pickStrangerIdentity())
        : pickStrangerIdentity()
      result.push(buildFallbackComment(post, actor, i))
    }
    return result
  }

  const createPendingDmNotification = async (post, preferredActor = null) => {
    post = ensurePostMutable(post)
    if (post.interactionMeta.dmTriggered) return null

    const shouldTrigger = Math.random() < 0.32
    if (!shouldTrigger) return null

    let actor = preferredActor
    if (!actor) {
      actor = (feedSettings.value.allowAcquaintances && Math.random() < 0.18)
        ? (maybePickFamiliarIdentity() || pickStrangerIdentity())
        : pickStrangerIdentity()
    }

    const dmTemplates = [
      '刚看完你那条动态，想单独和你聊聊。',
      '本来只是路过，但还是想私下问你一句。',
      '你发的那句我记住了，能单独聊吗？',
      '从你的动态里看到了点熟悉的东西，想和你私下说。'
    ]
    const dmContent = dmTemplates[hashString(`${actor.nickname}-${post.id}`) % dmTemplates.length]

    post.interactionMeta.dmTriggered = true

    addNotification({
      type: 'dm',
      fromName: actor.nickname,
      content: dmContent,
      time: Date.now(),
      isRead: false,
      postId: post.id,
      pendingBaseInfo: actor.realCharId ? null : {
        nickname: actor.nickname,
        age: actor.age || 20,
        gender: actor.gender || '保密',
        tags: Array.isArray(actor.tags) ? actor.tags : [],
        bio: `因为你发布的动态而注意到你：${post.content.slice(0, 50)}`
      },
      pendingRealCharId: actor.realCharId ?? null,
      pendingActor: actor
    })

    emitToast('有人想私下和你聊聊')
    return actor
  }

  const buildActorSystemPrompt = (actor, mode = 'comment') => {
    if (actor.realCharId) {
      const realChar = getAllNamedCharacters().find(c => c.id === actor.realCharId)
      return getSystemPrompt(
        `你是匿名交友软件里的网友评论者。你当前必须严格使用匿名马甲网名“${actor.nickname}”活动，绝对不能暴露任何真实身份信息。` +
        `你的参考真实性格是：${realChar?.description || '无明显描述'}。` +
        (mode === 'dm' ? '你现在准备主动私信楼主。' : '你现在准备在评论区回复。')
      )
    }

    return getSystemPrompt(
      `你是匿名交友软件里的普通网友，当前网名是“${actor.nickname}”。` +
      (mode === 'dm' ? '你现在准备主动私信楼主。' : '你现在准备在评论区回复。')
    )
  }

  const generateReplyText = async ({ actor, post, myComment, targetName, explicitScene = '' }) => {
    const myName = playerProfile.value.nickname || '我'
    const recentComments = [...(post.comments || [])]
      .slice(-8)
      .map(c => `${c.nickname}: ${c.content}`)
      .join('\n')

    const attachmentText = post.attachment?.type === 'music'
      ? `\n这条动态还附带了一张音乐卡片：歌名《${post.attachment.name}》，歌手 ${post.attachment.artist}。`
      : ''

    const sceneText = explicitScene || (
      targetName
        ? `用户“${myName}”刚刚在评论区说：“${myComment.content}”，并明确 @了你（${actor.nickname}）。你必须现身回复。`
        : (post.isMine
          ? `楼主“${myName}”在自己的帖子评论区说：“${myComment.content}”。请你以围观网友身份回复楼主。`
          : `用户“${myName}”评论了这条动态：“${myComment.content}”。请你以相关网友身份回复他。`)
    )

    const userPrompt = `帖子内容：${post.content}
帖子作者：${post.nickname}${attachmentText}
最近评论串：
${recentComments || '暂无'}

${sceneText}

要求：
1. 必须像真实网友发言，口语化，自然，不要解释自己是AI。
2. 如果是在回复用户“${myName}”，请明确带上“回复 @${myName}：”作为开头。
3. 1到2句话即可，不要太长。
4. 如果帖子里带了音乐卡片，你可以自然提一句歌或氛围，但不要每次都硬提。
5. 不要输出 JSON，不要输出多余说明。`

    try {
      const raw = await callAI([
        { role: 'system', content: buildActorSystemPrompt(actor, 'comment') },
        { role: 'user', content: userPrompt }
      ], { temperature: 0.9 })

      const cleaned = (raw || '').trim()
      if (!cleaned) return ''
      if (cleaned.includes(`@${myName}`) || cleaned.startsWith(`回复 @${myName}`)) return cleaned
      return `回复 @${myName}：${cleaned}`
    } catch (e) {
      return ''
    }
  }

  const appendGeneratedCommentWithNotify = (post, comment) => {
    post.comments.push(comment)
    post.comments = sanitizeComments(post.comments)

    const myName = playerProfile.value.nickname || '我'
    addNotification({
      type: getCommentNotificationType(comment, myName),
      fromName: comment.nickname,
      content: comment.content,
      time: comment.timestamp || Date.now(),
      isRead: false,
      postId: post.id,
      commentId: comment.id,
      pendingRealCharId: comment.realCharId ?? null,
      pendingActor: inferActorFromComment(comment)
    })
  }

  /**
   * 有些推荐贴会转成“别人转发别人”的帖子。
   * 这里记得保留原帖 attachment。
   */
  const maybeConvertToRepostPost = (post, allPosts) => {
    if (!Array.isArray(allPosts) || allPosts.length < 2) return post
    if (Math.random() > 0.22) return post

    const candidatePool = allPosts.filter(p => p.id !== post.id)
    if (!candidatePool.length) return post

    const target = candidatePool[Math.floor(Math.random() * candidatePool.length)]

    return normalizePost({
      ...post,
      content: [
        '转一下，感觉这条说得挺准。',
        '刚刷到，想留个档。',
        '这个状态有点意思，转过来。',
        '看到这条突然想起了很多事。'
      ][hashString(`${post.id}-${target.id}`) % 4],
      repostOf: {
        id: target.id,
        nickname: target.nickname,
        age: target.age,
        gender: target.gender,
        content: target.content,
        tags: target.tags || [],
        realCharId: target.realCharId ?? null,
        chatId: target.chatId ?? null,
        attachment: target.attachment || null
      }
    })
  }

  /**
   * 推荐流生成
   *
   * 新增支持：
   * - AI 可直接返回 attachment.type = music 的动态
   * - 或者后续转发贴中保留被转发原帖的音乐附件
   */
  const generateRecommend = async () => {
    try {
      const allChars = getAllNamedCharacters()
      const allowAcq = feedSettings.value.allowAcquaintances
      const isUndercoverEvent = allowAcq && Math.random() < 0.25 && allChars.length > 0
      let dict = getUndercoverDict()
      let charContext = '全部生成纯路人的帖子。'

      if (isUndercoverEvent) {
        const targetChar = allChars[Math.floor(Math.random() * allChars.length)]
        const exist = dict[targetChar.id]
        if (exist) {
          charContext = `【绝密指令】：必须安排 1 条由联系人(ID:${targetChar.id}, 姓名:${targetChar.name})披马甲发出。他的马甲固定为：网名[${exist.nickname}]，年龄[${exist.age}]，性别[${exist.gender}]，标签${JSON.stringify(exist.tags)}。请结合他真实性格生成动态，JSON中的 realCharId 填 ${targetChar.id}。其他为路人(realCharId填null)。`
        } else {
          charContext = `【绝密指令】：必须安排 1 条由联系人(ID:${targetChar.id}, 姓名:${targetChar.name})披马甲发出。请为他起个看不出真名的假网名，并给出年龄、性别、标签。JSON中的 realCharId 填 ${targetChar.id}。其他为路人(realCharId填null)。`
        }
      }

      const diyContext = feedSettings.value.diyPrompt ? `【世界观设定】：${feedSettings.value.diyPrompt}` : ''

      const raw = await callAI([
        { role: 'system', content: getSystemPrompt('你是交友软件的动态生成引擎。') },
        { role: 'user', content: `请生成 5 条匿名动态，每条动态自带 1~4 条评论，评论者也允许带 realCharId。
${diyContext}
${charContext}

补充规则（非常重要）：
1. 评论默认全部生成一级评论即可。
2. 绝对不要让任何评论回复自己。
3. 绝对禁止生成 parentId 等于评论自己 id 的情况。
4. 绝对禁止评论之间互相循环引用。
5. 如果不确定结构，就不要输出 parentId / rootId。
6. 允许少量动态带音乐分享卡片。
7. 如果你要输出音乐卡片，请使用：
   "attachment": {
     "type": "music",
     "name": "歌名",
     "artist": "歌手",
     "cover": "可选封面链接，没有就留空",
     "content": "可选分享语"
   }

必须严格输出 JSON 数组格式，不要有任何其他文本。
格式参考：
[
  {
    "nickname": "网名",
    "age": 22,
    "gender": "女",
    "content": "动态内容",
    "tags": ["标签1", "标签2"],
    "realCharId": null,
    "attachment": {
      "type": "music",
      "name": "歌名",
      "artist": "歌手",
      "cover": "",
      "content": "一首很适合今晚的歌"
    },
    "comments": [
      {
        "nickname": "评论者",
        "content": "评论内容",
        "realCharId": null
      }
    ]
  }
]` }
      ], { temperature: 0.92 })

      const parsed = extractStructured(raw, [])
      if (!Array.isArray(parsed) || !parsed.length) {
        emitToast('广场雷达这次没扫到有效信号')
        return false
      }

      let finalPosts = parsed.map((post) => {
        let normalized = normalizePost({
          ...post,
          id: createLocalId(),
          timestamp: Date.now() - Math.floor(Math.random() * 3600000),
          likes: Math.floor(Math.random() * 80),
          isLiked: false
        })

        if (normalized.realCharId) {
          const realChar = allChars.find(c => c.id === normalized.realCharId)
          if (realChar) {
            const disguise = buildStableUndercoverProfile(realChar)
            normalized.nickname = disguise.nickname
            normalized.age = disguise.age
            normalized.gender = disguise.gender
            normalized.tags = disguise.tags
          }
        }

        normalized.comments = sanitizeComments(
          normalizeGeneratedComments(post.comments || []).map((c, cIdx) => ({
            ...c,
            timestamp: normalized.timestamp + cIdx + 1
          }))
        )

        normalized.interactionMeta = {
          initialBurstDone: true,
          replyBudget: 6,
          dmTriggered: false
        }

        return normalized
      })

      finalPosts = finalPosts.map(post => maybeConvertToRepostPost(post, finalPosts))

      recommendPosts.value = trimList([...finalPosts, ...recommendPosts.value], feedSettings.value.maxRecommendPosts)
      applyRetentionLimits()
      return true
    } catch (e) {
      console.error('生成推荐流失败', e)
      emitToast('广场刷新失败，请稍后重试')
      return false
    }
  }

  const generateFollowing = async () => {
    try {
      const activeChats = await db.dating_chats.where('status').notEqual('exited').toArray()
      if (activeChats.length === 0) {
        followingPosts.value = []
        return false
      }

      const profileIds = activeChats.map(c => c.profileId)
      const profiles = []
      for (const pid of profileIds) {
        const p = await db.dating_profiles.get(pid)
        if (p) profiles.push(p)
      }

      if (profiles.length === 0) {
        followingPosts.value = []
        return false
      }

      const selected = [...profiles].sort(() => 0.5 - Math.random()).slice(0, 3)
      const contextStr = selected.map(p => `网名:${p.nickname}, 标签:${JSON.stringify(p.tags || [])}, 特征:${p.baseInfo?.bio || ''}`).join('\n')

      const raw = await callAI([
        { role: 'system', content: getSystemPrompt('你是交友软件的动态生成引擎。') },
        { role: 'user', content: `请以以下几个特定用户的口吻，每人发 1 条近期动态：
${contextStr}

必须严格输出 JSON 数组格式：
[
  {"nickname":"必须完全匹配上方网名","content":"动态内容"}
]` }
      ], { temperature: 0.88 })

      const parsed = extractStructured(raw, [])
      if (!Array.isArray(parsed)) {
        followingPosts.value = []
        return false
      }

      const finalPosts = parsed.map((post) => {
        const sp = selected.find(x => x.nickname === post.nickname)
        const cChat = sp ? activeChats.find(c => c.profileId === sp.id) : null
        return normalizePost({
          id: createLocalId(),
          nickname: post.nickname,
          age: sp?.baseInfo?.age || 20,
          gender: sp?.baseInfo?.gender || '保密',
          content: post.content || '',
          tags: sp?.tags || [],
          timestamp: Date.now() - Math.floor(Math.random() * 1800000),
          likes: Math.floor(Math.random() * 30),
          isLiked: false,
          comments: [],
          realCharId: sp?.realCharId || null,
          chatId: cChat ? cChat.id : null,
          interactionMeta: {
            initialBurstDone: true,
            replyBudget: 6,
            dmTriggered: false
          }
        })
      })

      followingPosts.value = trimList([...finalPosts, ...followingPosts.value], feedSettings.value.maxFollowingPosts)
      applyRetentionLimits()
      return true
    } catch (e) {
      console.error('生成关注流失败', e)
      emitToast('关注页刷新失败，请稍后重试')
      return false
    }
  }

  /**
   * 给一条帖子生成一波初始互动
   *
   * 如果帖子带音乐卡片，AI 可以自然讨论这首歌。
   */
  const seedPostInteractions = async (post) => {
    try {
      const attachmentHint = post.attachment?.type === 'music'
        ? `\n这条动态还分享了一首歌：歌名《${post.attachment.name}》，歌手 ${post.attachment.artist}。分享语：${post.attachment.content || '无'}`
        : ''

      const raw = await callAI([
        { role: 'system', content: getSystemPrompt('你是交友软件里的围观网友群体。') },
        { role: 'user', content: `楼主（网名：${post.nickname}）刚刚发了一条动态：
"${post.content}"${attachmentHint}

${post.repostOf ? `这条动态里还转发了一条原帖，原帖作者是“${post.repostOf.nickname}”，原帖内容是：“${post.repostOf.content}”。` : ''}

请生成 4 到 7 条风格各异的评论，允许其中少量评论更热情、更想继续聊。
如果这是转发动态，评论里可以有人讨论楼主的转发文案，也可以有人讨论被转发的原帖内容。
如果帖子里分享了音乐卡片，也允许有人自然提到那首歌或歌带来的氛围。

补充规则（非常重要）：
1. 评论默认全部生成一级评论即可。
2. 绝对不要让任何评论“回复自己”。
3. 绝对禁止 parentId 等于评论自己的 id。
4. 绝对禁止评论之间形成循环引用。
5. 如果不确定结构，就不要输出 parentId / rootId。

严格输出 JSON 数组：
[
  {
    "nickname": "网友名",
    "content": "评论内容",
    "age": 22,
    "gender": "女",
    "tags": ["标签1", "标签2"],
    "realCharId": null
  }
]` }
      ], { temperature: 0.95 })

      let parsed = extractStructured(raw, [])
      if (!Array.isArray(parsed) || !parsed.length) {
        parsed = []
      }

      let commentsToInject = normalizeGeneratedComments(parsed)
      if (!commentsToInject.length) {
        commentsToInject = createFallbackCommentPack(post, 4)
      }

      commentsToInject = sanitizeComments(commentsToInject.slice(0, 7))

      commentsToInject.forEach((comment) => {
        appendGeneratedCommentWithNotify(post, comment)
      })

      post.likes += Math.floor(Math.random() * 8) + 3
      post.interactionMeta.initialBurstDone = true

      await createPendingDmNotification(post, commentsToInject[0] ? inferActorFromComment(commentsToInject[0]) : null)
    } catch (e) {
      console.error('自动互动生成失败', e)

      const fallbackComments = sanitizeComments(createFallbackCommentPack(post, 3))
      fallbackComments.forEach((comment) => {
        appendGeneratedCommentWithNotify(post, comment)
      })

      post.likes += Math.floor(Math.random() * 5) + 2
      post.interactionMeta.initialBurstDone = true

      await createPendingDmNotification(post, fallbackComments[0] ? inferActorFromComment(fallbackComments[0]) : null)
    }
  }

  /**
   * 发布我自己的原创动态
   *
   * 新增支持 attachment：
   * - 当前版本主要用于音乐卡片
   */
  const publishMyPost = async (content, tagsArray, attachment = null) => {
    const newPost = normalizePost({
      id: createLocalId(),
      isMine: true,
      nickname: playerProfile.value.nickname || '我',
      age: playerProfile.value.age || 18,
      gender: playerProfile.value.gender || '保密',
      content,
      tags: Array.isArray(tagsArray) ? tagsArray : [],
      attachment: normalizeAttachment(attachment),
      timestamp: Date.now(),
      likes: 0,
      isLiked: false,
      comments: [],
      interactionMeta: {
        initialBurstDone: false,
        replyBudget: 10,
        dmTriggered: false
      }
    })

    myPosts.value.unshift(newPost)
    applyRetentionLimits()

    setTimeout(async () => {
      await seedPostInteractions(newPost)
      emitToast('你的动态有了新互动！')
    }, 3500)

    return newPost
  }

  const postComment = async (post, text, options = {}) => {
    if (!text || !text.trim()) return null

    post = ensurePostMutable(post)

    const myName = playerProfile.value.nickname || '我'
    const mentionNames = extractMentions(text).filter(name => name !== myName)

    const myComment = makeComment({
      nickname: myName,
      content: text.trim(),
      isMine: true,
      parentId: options.parentId ?? null,
      rootId: options.rootId ?? null,
      replyToNickname: options.replyToNickname || '',
      mentions: mentionNames,
      timestamp: Date.now()
    })

    if (!myComment.rootId) {
      myComment.rootId = myComment.parentId || myComment.id
    }

    post.comments.push(myComment)
    post.comments = sanitizeComments(post.comments)

    const actors = []

    if (options.targetActor) {
      actors.push(options.targetActor)
    }

    if (mentionNames.length > 0) {
      mentionNames.forEach(name => {
        const actor = resolveMentionTargetActor(post, name)
        if (actor) actors.push(actor)
      })
    }

    if (actors.length === 0) {
      if (post.isMine) {
        const replyCount = Math.random() < 0.55 ? 1 : 2
        for (let i = 0; i < replyCount; i++) {
          const actor = (feedSettings.value.allowAcquaintances && Math.random() < 0.16)
            ? (maybePickFamiliarIdentity() || pickStrangerIdentity())
            : pickStrangerIdentity()
          actors.push(actor)
        }
      } else {
        actors.push(inferActorFromPost(post))
        if (Math.random() < 0.35) {
          const bystander = (feedSettings.value.allowAcquaintances && Math.random() < 0.16)
            ? (maybePickFamiliarIdentity() || pickStrangerIdentity())
            : pickStrangerIdentity()
          actors.push(bystander)
        }
      }
    }

    const uniqueActors = []
    const seen = new Set()
    actors.forEach(actor => {
      const key = `${actor.nickname}-${actor.realCharId || 'stranger'}`
      if (!seen.has(key)) {
        seen.add(key)
        uniqueActors.push(actor)
      }
    })

    const replyBudget = Number(post.interactionMeta.replyBudget || 0)
    const maxReplies = replyBudget > 0 ? Math.min(uniqueActors.length, Math.max(1, replyBudget)) : 1
    const replyActors = uniqueActors.slice(0, maxReplies)
    post.interactionMeta.replyBudget = Math.max(0, replyBudget - replyActors.length)

    setTimeout(async () => {
      for (let i = 0; i < replyActors.length; i++) {
        const actor = replyActors[i]
        let replyText = await generateReplyText({
          actor,
          post,
          myComment,
          targetName: myComment.replyToNickname || mentionNames[0] || ''
        })

        if (!replyText) {
          replyText = buildFallbackReply(actor, myName)
        }

        const replyComment = makeComment({
          nickname: actor.nickname,
          content: replyText,
          isMine: false,
          realCharId: actor.realCharId ?? null,
          chatId: actor.chatId ?? null,
          age: actor.age ?? null,
          gender: actor.gender || '保密',
          tags: Array.isArray(actor.tags) ? actor.tags : [],
          parentId: myComment.id,
          rootId: myComment.rootId || myComment.id,
          replyToNickname: myName,
          mentions: [myName],
          timestamp: Date.now() + i + 1
        })

        appendGeneratedCommentWithNotify(post, replyComment)
      }

      if (post.isMine) {
        await createPendingDmNotification(post, replyActors[0] || null)
      }
    }, 1800 + Math.floor(Math.random() * 1200))

    return myComment
  }

  const replyToComment = async (post, targetComment, text) => {
    if (!targetComment) return null
    return postComment(post, text, {
      parentId: targetComment.id,
      rootId: targetComment.rootId || targetComment.id,
      replyToNickname: targetComment.nickname,
      targetActor: inferActorFromComment(targetComment)
    })
  }

  /**
   * 转发到我的主页
   *
   * 注意：
   * - repostOf 里要保留原帖 attachment
   * - 这样你转发一条“音乐帖”，详情页里还能看到原音乐卡片
   */
  const repostToMyFeed = (post, note = '') => {
    const source = normalizePost(post)
    const repost = normalizePost({
      id: createLocalId(),
      isMine: true,
      nickname: playerProfile.value.nickname || '我',
      age: playerProfile.value.age || 18,
      gender: playerProfile.value.gender || '保密',
      content: note || '转发了一条动态',
      tags: Array.isArray(source.tags) ? [...source.tags] : [],
      timestamp: Date.now(),
      likes: 0,
      isLiked: false,
      comments: [],
      repostOf: {
        id: source.id,
        nickname: source.nickname,
        age: source.age,
        gender: source.gender,
        content: source.content,
        tags: Array.isArray(source.tags) ? [...source.tags] : [],
        realCharId: source.realCharId ?? null,
        chatId: source.chatId ?? null,
        attachment: source.attachment || null
      },
      interactionMeta: {
        initialBurstDone: false,
        replyBudget: 8,
        dmTriggered: false
      }
    })

    myPosts.value.unshift(repost)
    applyRetentionLimits()

    setTimeout(async () => {
      await seedPostInteractions(repost)
      emitToast('你的转发动态有了新互动！')
    }, 3200)

    return repost
  }

  /**
   * 构造“转发到私聊”的消息结构
   *
   * 注意：
   * - postSnapshot 现在也保留 attachment
   * - 这样音乐帖转发到聊天时，详情页能看到音乐卡片
   */
  const buildFeedShareMessage = (post, note = '') => {
    const source = normalizePost(post)
    return {
      type: 'feed_share',
      content: note || '',
      postSnapshot: {
        id: source.id,
        nickname: source.nickname,
        age: source.age,
        gender: source.gender,
        content: source.content,
        tags: Array.isArray(source.tags) ? [...source.tags] : [],
        realCharId: source.realCharId ?? null,
        chatId: source.chatId ?? null,
        attachment: source.attachment || null
      },
      timestamp: Date.now()
    }
  }

  const markAllRead = () => {
    notifications.value.forEach(n => {
      n.isRead = true
    })
  }

  const markNotificationRead = (id) => {
    const target = notifications.value.find(n => n.id === id)
    if (target) target.isRead = true
  }

  return {
    feedSettings,
    recommendPosts,
    followingPosts,
    myPosts,
    notifications,
    generateRecommend,
    generateFollowing,
    publishMyPost,
    postComment,
    replyToComment,
    repostToMyFeed,
    buildFeedShareMessage,
    markAllRead,
    markNotificationRead,
    applyRetentionLimits
  }
}
