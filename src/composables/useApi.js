import { ref, watch } from 'vue'

const load = (key, def) => {
  const s = localStorage.getItem(key)
  return s ? JSON.parse(s) : def
}

const apiUrl = ref(load('apiUrl', 'https://api.openai.com/v1/chat/completions'))
const apiKey = ref(load('apiKey', ''))
const apiModel = ref(load('apiModel', 'gpt-4o'))

const apiPresets = ref(load('apiPresets', []))

watch(apiUrl, (v) => localStorage.setItem('apiUrl', JSON.stringify(v)))
watch(apiKey, (v) => localStorage.setItem('apiKey', JSON.stringify(v)))
watch(apiModel, (v) => localStorage.setItem('apiModel', JSON.stringify(v)))
watch(apiPresets, (v) => localStorage.setItem('apiPresets', JSON.stringify(v)), { deep: true })

const availableModels = ref([])
const isFetchingModels = ref(false)

export function useApi() {
  const savePreset = (name) => {
    if (!name) return false
    apiPresets.value.push({
      id: Date.now(),
      name,
      apiUrl: apiUrl.value,
      apiKey: apiKey.value,
      apiModel: apiModel.value
    })
    return true
  }

  const deletePreset = (id) => {
    apiPresets.value = apiPresets.value.filter(p => p.id !== id)
  }

  const applyPreset = (preset) => {
    if (preset) {
      apiUrl.value = preset.apiUrl
      apiKey.value = preset.apiKey
      apiModel.value = preset.apiModel
    }
  }

  const fetchModels = async () => {
    if (!apiUrl.value || !apiKey.value) {
      alert('请先填写接口地址和 API 密钥')
      return
    }
    isFetchingModels.value = true
    try {
      // 尝试自动推断 models 接口地址
      let endpoint = apiUrl.value.replace(/\/chat\/completions\/?$/, '/models')
      if (endpoint === apiUrl.value) {
        if (endpoint.endsWith('/')) endpoint += 'models'
        else endpoint += '/models'
      }

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey.value}`
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      if (data && data.data && Array.isArray(data.data)) {
        availableModels.value = data.data.map(m => m.id)
      } else {
        throw new Error('返回的数据格式不符合标准 (缺少 data 数组)')
      }
    } catch (error) {
      alert(`拉取模型失败：${error.message}`)
    } finally {
      isFetchingModels.value = false
    }
  }

  return { 
    apiUrl, apiKey, apiModel, 
    apiPresets, savePreset, deletePreset, applyPreset,
    availableModels, isFetchingModels, fetchModels
  }
}
