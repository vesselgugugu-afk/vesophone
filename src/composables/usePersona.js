import { ref, watch } from 'vue'

const KEY = 'personas'

const load = (key, def) => {
  const s = localStorage.getItem(key)
  return s ? JSON.parse(s) : def
}

// 兼容老数据，加上 avatar 和 name
const rawData = load(KEY, [{ id: 1, title: '默认人设', name: '用户', avatar: '', content: '我是一个普通用户。', isActive: true }])
rawData.forEach(p => {
  if (p.avatar === undefined) p.avatar = ''
  if (p.name === undefined) p.name = p.title || '用户'
})

const personas = ref(rawData)

watch(personas, (v) => localStorage.setItem(KEY, JSON.stringify(v)), { deep: true })

export function usePersona() {
  const savePersona = (form) => {
    if (!form.title) return false
    personas.value.push({
      id: Date.now(),
      title: form.title,
      name: form.name || form.title,
      avatar: form.avatar || '',
      content: form.content,
      isActive: personas.value.length === 0
    })
    return true
  }

  const updatePersona = (id, form) => {
    const p = personas.value.find(x => x.id === id)
    if (p) {
      p.title = form.title
      p.name = form.name || form.title
      p.avatar = form.avatar || ''
      p.content = form.content
      return true
    }
    return false
  }

  const deletePersona = (id) => {
    personas.value = personas.value.filter((p) => p.id !== id)
  }

  const setActivePersona = (id) => {
    personas.value.forEach((p) => (p.isActive = p.id === id))
  }

  return { personas, savePersona, updatePersona, deletePersona, setActivePersona }
}

