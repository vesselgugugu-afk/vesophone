import { ref, watch } from 'vue'

const KEY = 'appAppearance'
const PRESETS_KEY = 'globalCssPresets'

const load = (key, def) => {
  const s = localStorage.getItem(key)
  return s ? JSON.parse(s) : def
}

const defaultAppearance = {
  wallpaper: '',
  widgets: {
    capsule: '',
    customCard: '',
    rectCardHealth: '',
    rectCardFinance: ''
  },
  icons: {
    qq: '',
    worldbook: '',
    api: '',
    appearance: ''
  },
  globalCss: ''
}

const appearance = ref(load(KEY, defaultAppearance))
const cssPresets = ref(load(PRESETS_KEY, []))

watch(appearance, (v) => localStorage.setItem(KEY, JSON.stringify(v)), { deep: true })
watch(cssPresets, (v) => localStorage.setItem(PRESETS_KEY, JSON.stringify(v)), { deep: true })

export function useAppearance() {
  const saveCssPreset = (name, css) => {
    cssPresets.value.push({ id: Date.now(), name, css })
  }

  const deleteCssPreset = (id) => {
    cssPresets.value = cssPresets.value.filter(p => p.id !== id)
  }

  const exportCssPresets = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cssPresets.value))
    const downloadAnchorNode = document.createElement('a')
    downloadAnchorNode.setAttribute("href", dataStr)
    downloadAnchorNode.setAttribute("download", "global_css_presets.json")
    document.body.appendChild(downloadAnchorNode)
    downloadAnchorNode.click()
    downloadAnchorNode.remove()
  }

  return {
    appearance,
    cssPresets,
    saveCssPreset,
    deleteCssPreset,
    exportCssPresets
  }
}
