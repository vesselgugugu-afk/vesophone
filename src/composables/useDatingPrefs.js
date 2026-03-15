import { ref } from 'vue'
import db from '@/db'

// 偏好 Tag 收集箱 (挤眼/右滑时增加权重)
const prefTags = ref([])

// 强制过滤条件 (加入了 NSFW 开关和屏蔽词)
const matchFilters = ref({
  gender: '不限',
  customGender: '',
  minAge: null,
  maxAge: null,
  requirements: '',
  blockedTags: [], // 屏蔽的 Tag 列表
  enableNSFW: false // 是否允许生成色色/特殊 XP 内容
})

export function useDatingPrefs() {
  const loadPrefs = async () => {
    try {
      // 加载偏好 Tag，并按权重从高到低排序
      const tags = await db.dating_prefs.where('type').equals('like').toArray()
      prefTags.value = tags.sort((a, b) => b.weight - a.weight)
      
      // 加载本地过滤条件
      const savedFilters = localStorage.getItem('dating_filters')
      if (savedFilters) {
        matchFilters.value = { ...matchFilters.value, ...JSON.parse(savedFilters) }
      }
    } catch (error) {
      console.error('加载冷推偏好失败:', error)
    }
  }

  // 核心：右滑或挤眼时调用，动态增加 Tag 权重
  const addPrefTag = async (tagStr) => {
    if (!tagStr) return
    const normalizedTag = tagStr.trim()
    try {
      const existArray = await db.dating_prefs.where({ type: 'like' }).toArray()
      const exist = existArray.find(t => t.tag === normalizedTag)
      
      if (exist) {
        await db.dating_prefs.update(exist.id, { weight: exist.weight + 1 })
      } else {
        await db.dating_prefs.add({ type: 'like', tag: normalizedTag, weight: 1 })
      }
      await loadPrefs()
    } catch (error) {
      console.error('添加偏好 Tag 失败:', error)
    }
  }

  // 玩家手动在“我的”页面删除偏好 Tag
  const removePrefTag = async (id) => {
    try {
      await db.dating_prefs.delete(id)
      await loadPrefs()
    } catch (error) {
      console.error('删除偏好 Tag 失败:', error)
    }
  }

  // 独立更新过滤条件
  const updateFilters = (newFilters) => {
    matchFilters.value = { ...matchFilters.value, ...newFilters }
    localStorage.setItem('dating_filters', JSON.stringify(matchFilters.value))
  }

  // 供 AI 生成卡片时调用的工具函数：获取权重最高的 N 个 Tag
  const getTopTags = (limit = 5) => {
    return prefTags.value.slice(0, limit).map(t => t.tag)
  }

  return {
    prefTags,
    matchFilters,
    loadPrefs,
    addPrefTag,
    removePrefTag,
    updateFilters,
    getTopTags
  }
}

