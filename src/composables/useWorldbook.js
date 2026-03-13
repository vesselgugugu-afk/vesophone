import { ref, computed, watch } from 'vue'

const KEY_WB = 'worldbooks'
const KEY_ORDER = 'wbOrder'

const load = (key, def) => {
  const s = localStorage.getItem(key)
  return s ? JSON.parse(s) : def
}

const worldbooks = ref(load(KEY_WB, []))
const wbOrder = ref(load(KEY_ORDER, []))
const wbExpanded = ref(false)

watch(worldbooks, (v) => localStorage.setItem(KEY_WB, JSON.stringify(v)), { deep: true })
watch(wbOrder, (v) => localStorage.setItem(KEY_ORDER, JSON.stringify(v)), { deep: true })

const wbGroups = computed(() => {
  const groups = new Set(worldbooks.value.map((w) => w.group || '通用'))
  return Array.from(groups).sort()
})

const enabledWorldbooks = computed(() => {
  const enabled = worldbooks.value.filter((w) => w.enabled)
  if (wbOrder.value.length === 0) return enabled
  return [...enabled].sort((a, b) => {
    const ai = wbOrder.value.indexOf(a.id)
    const bi = wbOrder.value.indexOf(b.id)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
})

export function useWorldbook() {
  const saveWb = (form) => {
    if (!form.title) return false
    const newWb = {
      id: Date.now() + Math.random(),
      title: form.title,
      group: form.group || '通用',
      content: form.content,
      enabled: true,
      injectRole: form.injectRole || 'system'
    }
    worldbooks.value.push(newWb)
    wbOrder.value.push(newWb.id)
    return true
  }

  const deleteWb = (id) => {
    worldbooks.value = worldbooks.value.filter((w) => w.id !== id)
    wbOrder.value = wbOrder.value.filter((i) => i !== id)
  }

  const moveWbOrder = (index, dir) => {
    const enabledIds = enabledWorldbooks.value.map((w) => w.id)
    const reordered = [...enabledIds]
    const temp = reordered[index]
    reordered[index] = reordered[index + dir]
    reordered[index + dir] = temp
    // 将新顺序合并回 wbOrder（保留未启用的条目位置不变）
    const newOrder = [...wbOrder.value]
    reordered.forEach((id, i) => {
      const pos = newOrder.indexOf(enabledIds[i])
      if (pos !== -1) newOrder[pos] = id
    })
    wbOrder.value = newOrder
  }

  // 核心新增：整组删除
  const deleteGroup = (groupName) => {
    const idsToDelete = worldbooks.value.filter(w => (w.group || '通用') === groupName).map(w => w.id)
    worldbooks.value = worldbooks.value.filter(w => !idsToDelete.includes(w.id))
    wbOrder.value = wbOrder.value.filter(id => !idsToDelete.includes(id))
  }

  // 核心新增：导出 JSON
  const exportGroupJson = (groupName) => {
    let items = []
    if (groupName === 'All') {
      items = worldbooks.value
    } else {
      items = worldbooks.value.filter(w => (w.group || '通用') === groupName)
    }
    return JSON.stringify(items, null, 2)
  }

  // 核心新增：导入 JSON
  const importGroupJson = (jsonStr) => {
    try {
      const items = JSON.parse(jsonStr)
      if (!Array.isArray(items)) return false
      let successCount = 0
      items.forEach(item => {
        if (item.title && item.content) {
          const newId = Date.now() + Math.random()
          worldbooks.value.push({
            id: newId,
            title: item.title,
            group: item.group || '通用',
            content: item.content,
            enabled: item.enabled ?? false,
            injectRole: item.injectRole || 'system'
          })
          wbOrder.value.push(newId)
          successCount++
        }
      })
      return successCount
    } catch (e) {
      return false
    }
  }

  return {
    worldbooks,
    wbGroups,
    wbOrder,
    wbExpanded,
    enabledWorldbooks,
    saveWb,
    deleteWb,
    moveWbOrder,
    deleteGroup,
    exportGroupJson,
    importGroupJson
  }
}
