import { ref } from 'vue'
import db from '@/db'

// 全局单例状态
const playerProfile = ref({
  id: 1, 
  nickname: 'Player_One',
  bio: '一个普通的地球人，偶尔想去火星看看。',
  cover: '',
  customCss: '',
  settings: {
    autoDeleteOnExit: true, // 一方离开是否删除人设释放空间
    allowAiExit: true,      // 是否允许对方(AI)主动离开聊天
    allowAiReject: true,    // 是否允许对方(AI)拒绝你的揭晓请求
    avatarUrls: ''          // 核心新增：自定义头像URL库 (用换行符分割)
  }
})

const isLoaded = ref(false)

export function useDatingPlayer() {
  const loadPlayer = async () => {
    if (isLoaded.value) return
    try {
      const data = await db.dating_user.get(1)
      if (data) {
        playerProfile.value = { 
          ...playerProfile.value, 
          ...data,
          settings: { ...playerProfile.value.settings, ...(data.settings || {}) }
        }
      } else {
        await db.dating_user.put(JSON.parse(JSON.stringify(playerProfile.value)))
      }
      isLoaded.value = true
      applyCustomCss(playerProfile.value.customCss)
    } catch (error) {
      console.error('加载冷推玩家档案失败:', error)
    }
  }

  const updatePlayer = async (updates) => {
    playerProfile.value = { ...playerProfile.value, ...updates }
    try {
      await db.dating_user.put(JSON.parse(JSON.stringify(playerProfile.value)))
      if (updates.customCss !== undefined) {
        applyCustomCss(updates.customCss)
      }
    } catch (error) {
      console.error('保存冷推玩家档案失败:', error)
    }
  }

  const updateSettings = async (settingUpdates) => {
    const newSettings = { ...playerProfile.value.settings, ...settingUpdates }
    await updatePlayer({ settings: newSettings })
  }

  const applyCustomCss = (css) => {
    let styleEl = document.getElementById('dating-custom-css')
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = 'dating-custom-css'
      document.head.appendChild(styleEl)
    }
    styleEl.innerHTML = css || ''
  }

  return {
    playerProfile,
    isLoaded,
    loadPlayer,
    updatePlayer,
    updateSettings
  }
}
