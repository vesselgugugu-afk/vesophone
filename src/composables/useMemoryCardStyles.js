import { ref, watch } from 'vue'

const KEY = 'memoryCardStylePresets'

const defaultPresets = [
  { id: 'preset_def_1', name: '复古拍立得', css: 'background: #fffdf8; border: 1px solid #e2d9c2; box-shadow: 2px 4px 12px rgba(139,121,88,0.1); border-radius: 4px; padding: 16px; font-family: "Kaiti", "STKaiti", serif; color: #3e3832;' },
  { id: 'preset_def_2', name: '暗黑极简', css: 'background: #1c1c1e; color: #f2f2f7; border: 1px solid #3a3a3c; box-shadow: 0 8px 24px rgba(0,0,0,0.4); border-radius: 16px;' },
  { id: 'preset_def_3', name: '透明毛玻璃', css: 'background: rgba(255,255,255,0.65); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.8); border-radius: 20px; box-shadow: 0 4px 30px rgba(0,0,0,0.05); color: #1c1c1e;' },
  { id: 'preset_def_4', name: '原木信笺', css: 'background: #f4ede4; border-left: 4px solid #c8b6a6; border-radius: 4px 16px 16px 4px; color: #5c4e41; box-shadow: 0 2px 10px rgba(0,0,0,0.05);' },
  { id: 'preset_def_5', name: '赛博荧光', css: 'background: #0f0f13; color: #00ffcc; border: 1px solid rgba(0,255,204,0.3); box-shadow: 0 0 15px rgba(0,255,204,0.1); border-radius: 12px;' }
]

const load = (key, def) => {
  const s = localStorage.getItem(key)
  if (s) {
    const parsed = JSON.parse(s)
    if (parsed.length > 0) return parsed
  }
  return def
}

const presets = ref(load(KEY, defaultPresets))

watch(presets, (v) => localStorage.setItem(KEY, JSON.stringify(v)), { deep: true })

export function useMemoryCardStyles() {
  const addPreset = (name, css) => {
    const id = 'preset_' + Date.now()
    presets.value.push({ id, name, css })
    return id
  }

  const updatePreset = (id, updates) => {
    const p = presets.value.find(i => i.id === id)
    if (p) Object.assign(p, updates)
  }

  const deletePreset = (id) => {
    presets.value = presets.value.filter(p => p.id !== id)
  }

  const getPresetById = (id) => {
    return presets.value.find(p => p.id === id) || null
  }

  const exportPresets = () => {
    return JSON.stringify(presets.value, null, 2)
  }

  const importPresets = (jsonStr) => {
    try {
      const data = JSON.parse(jsonStr)
      if (Array.isArray(data)) {
        presets.value.push(...data)
        return true
      }
      return false
    } catch (e) {
      return false
    }
  }

  return { presets, addPreset, updatePreset, deletePreset, getPresetById, exportPresets, importPresets }
}
