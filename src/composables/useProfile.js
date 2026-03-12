import { ref, watch } from 'vue'

const KEY = 'userProfile'

const userProfile = ref(
  JSON.parse(localStorage.getItem(KEY) || 'null') || {
    name: '用户',
    bio: '保持饥渴，保持愚蠢。',
    avatar: '' // 新增头像字段
  }
)

watch(userProfile, (val) => localStorage.setItem(KEY, JSON.stringify(val)), { deep: true })

export function useProfile() {
  const editProfile = () => {
    const newName = prompt('输入新名称：', userProfile.value.name)
    if (newName) userProfile.value.name = newName
    const newBio = prompt('输入新签名：', userProfile.value.bio)
    if (newBio) userProfile.value.bio = newBio
    const newAvatar = prompt('输入头像URL (留空则显示首字母)：', userProfile.value.avatar)
    if (newAvatar !== null) userProfile.value.avatar = newAvatar
  }

  return { userProfile, editProfile }
}
