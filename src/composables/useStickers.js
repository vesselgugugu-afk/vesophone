import { ref, watch } from 'vue'

const KEY = 'stickerGroups'

const load = (key, def) => {
  const s = localStorage.getItem(key)
  return s ? JSON.parse(s) : def
}

// 给一个默认占位分组供演示
const defaultGroups = [
  {
    id: 'sg_default',
    name: '基础猫猫',
    stickers: [
      { name: '点头', url: 'https://via.placeholder.com/100?text=Nod' },
      { name: '大哭', url: 'https://via.placeholder.com/100?text=Cry' }
    ]
  }
]

const stickerGroups = ref(load(KEY, defaultGroups))

watch(stickerGroups, (v) => localStorage.setItem(KEY, JSON.stringify(v)), { deep: true })

export function useStickers() {
  const addGroup = (name) => {
    stickerGroups.value.push({ id: 'sg_' + Date.now(), name, stickers: [] })
  }
  const deleteGroup = (id) => {
    stickerGroups.value = stickerGroups.value.filter(g => g.id !== id)
  }
  return { stickerGroups, addGroup, deleteGroup }
}
