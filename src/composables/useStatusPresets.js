import { ref, watch } from 'vue'

const KEY = 'AERO_STATUS_PRESETS'

const load = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || [] }
  catch (e) { return [] }
}

const statusPresets = ref(load())

watch(statusPresets, (val) => {
  localStorage.setItem(KEY, JSON.stringify(val))
}, { deep: true })

export function useStatusPresets() {
  
  const savePreset = (preset) => {
    if (preset.id) {
      const idx = statusPresets.value.findIndex(p => p.id === preset.id)
      if (idx !== -1) {
        statusPresets.value[idx] = { ...preset }
      } else {
        statusPresets.value.push(preset)
      }
    } else {
      statusPresets.value.push({ ...preset, id: Date.now().toString() })
    }
  }

  const deletePreset = (id) => {
    statusPresets.value = statusPresets.value.filter(p => p.id !== id)
  }

  const exportPreset = (preset) => {
    const exportData = {
      id: preset.id || Date.now().toString(),
      name: preset.name || "未命名",
      promptSuffix: preset.promptSuffix || "",
      regexPattern: preset.regexPattern || "",
      replacePattern: preset.replacePattern || ""
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `status_preset_${preset.name}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importJson = (jsonStr) => {
    try {
      const data = JSON.parse(jsonStr)
      let imported = 0
      const items = Array.isArray(data) ? data : [data]
      
      items.forEach(item => {
        // 核心更新：完美融合私有格式与酒馆 SillyTavern 导出格式
        const newPreset = {
          id: item.id || Date.now().toString() + Math.random().toString().slice(2,6),
          name: item.name || item.scriptName || '导入的预设',
          promptSuffix: item.promptSuffix || item.prompt || '',
          regexPattern: item.regexPattern || item.findRegex || item.regex || '',
          replacePattern: item.replacePattern || item.replaceString || item.template || ''
        }
        
        if (newPreset.regexPattern || newPreset.replacePattern) {
          statusPresets.value.push(newPreset)
          imported++
        }
      })
      return imported
    } catch (e) {
      return false
    }
  }

  return { statusPresets, savePreset, deletePreset, exportPreset, importJson }
}
