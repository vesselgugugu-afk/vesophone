import { ref, watch } from 'vue'

const load = (key, def) => {
  const s = localStorage.getItem(key)
  return s ? JSON.parse(s) : def
}

// 主 API
const apiUrl = ref(load('apiUrl', 'https://api.openai.com/v1/chat/completions'))
const apiKey = ref(load('apiKey', ''))
const apiModel = ref(load('apiModel', 'gpt-4o'))

// 参数
const temperature = ref(Number(load('temperature', 1.0)))
const top_p = ref(Number(load('top_p', 1.0)))
const stream = ref(load('stream', false) === true || load('stream', 'false') === 'true')

// 副 API (用于后台总结)
const useSubApi = ref(load('useSubApi', false) === true || load('useSubApi', 'false') === 'true')
const subApiUrl = ref(load('subApiUrl', ''))
const subApiKey = ref(load('subApiKey', ''))
const subApiModel = ref(load('subApiModel', ''))

const apiPresets = ref(load('apiPresets', []))
const subApiPresets = ref(load('subApiPresets', []))

watch(apiUrl, (v) => localStorage.setItem('apiUrl', JSON.stringify(v)))
watch(apiKey, (v) => localStorage.setItem('apiKey', JSON.stringify(v)))
watch(apiModel, (v) => localStorage.setItem('apiModel', JSON.stringify(v)))
watch(temperature, (v) => localStorage.setItem('temperature', JSON.stringify(v)))
watch(top_p, (v) => localStorage.setItem('top_p', JSON.stringify(v)))
watch(stream, (v) => localStorage.setItem('stream', JSON.stringify(v)))

watch(useSubApi, (v) => localStorage.setItem('useSubApi', JSON.stringify(v)))
watch(subApiUrl, (v) => localStorage.setItem('subApiUrl', JSON.stringify(v)))
watch(subApiKey, (v) => localStorage.setItem('subApiKey', JSON.stringify(v)))
watch(subApiModel, (v) => localStorage.setItem('subApiModel', JSON.stringify(v)))

watch(apiPresets, (v) => localStorage.setItem('apiPresets', JSON.stringify(v)), { deep: true })
watch(subApiPresets, (v) => localStorage.setItem('subApiPresets', JSON.stringify(v)), { deep: true })

const availableModels = ref([])
const isFetchingModels = ref(false)

const availableSubModels = ref([])
const isFetchingSubModels = ref(false)

export function useApi() {
  // --- 主 API 预设与拉取 ---
  const savePreset = (name) => {
    if (!name) return false
    apiPresets.value.push({
      id: Date.now(),
      name,
      apiUrl: apiUrl.value,
      apiKey: apiKey.value,
      apiModel: apiModel.value,
      temperature: temperature.value,
      top_p: top_p.value,
      stream: stream.value,
      useSubApi: useSubApi.value,
      subApiUrl: subApiUrl.value,
      subApiKey: subApiKey.value,
      subApiModel: subApiModel.value
    })
    return true
  }

  const deletePreset = (id) => {
    apiPresets.value = apiPresets.value.filter(p => p.id !== id)
  }

  const applyPreset = (preset) => {
    if (preset) {
      apiUrl.value = preset.apiUrl || ''
      apiKey.value = preset.apiKey || ''
      apiModel.value = preset.apiModel || ''
      temperature.value = preset.temperature ?? 1.0
      top_p.value = preset.top_p ?? 1.0
      stream.value = preset.stream || false
      useSubApi.value = preset.useSubApi || false
      subApiUrl.value = preset.subApiUrl || ''
      subApiKey.value = preset.subApiKey || ''
      subApiModel.value = preset.subApiModel || ''
    }
  }

  const fetchModels = async () => {
    if (!apiUrl.value || !apiKey.value) {
      alert('请先填写主接口地址和 API 密钥')
      return
    }
    isFetchingModels.value = true
    try {
      let endpoint = apiUrl.value.replace(/\/chat\/completions\/?$/, '/models')
      if (endpoint === apiUrl.value) {
        if (endpoint.endsWith('/')) endpoint += 'models'
        else endpoint += '/models'
      }

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${apiKey.value}` }
      })
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      
      const data = await response.json()
      if (data && data.data && Array.isArray(data.data)) {
        availableModels.value = data.data.map(m => m.id)
      } else {
        throw new Error('返回的数据格式不符合标准 (缺少 data 数组)')
      }
    } catch (error) {
      alert(`拉取主模型失败：${error.message}`)
    } finally {
      isFetchingModels.value = false
    }
  }

  // --- 副 API 预设与拉取 ---
  const saveSubPreset = (name) => {
    if (!name) return false
    subApiPresets.value.push({
      id: Date.now(),
      name,
      subApiUrl: subApiUrl.value,
      subApiKey: subApiKey.value,
      subApiModel: subApiModel.value
    })
    return true
  }

  const deleteSubPreset = (id) => {
    subApiPresets.value = subApiPresets.value.filter(p => p.id !== id)
  }

  const applySubPreset = (preset) => {
    if (preset) {
      subApiUrl.value = preset.subApiUrl || ''
      subApiKey.value = preset.subApiKey || ''
      subApiModel.value = preset.subApiModel || ''
    }
  }

  const fetchSubModels = async () => {
    if (!subApiUrl.value || !subApiKey.value) {
      alert('请先填写副接口地址和 API 密钥')
      return
    }
    isFetchingSubModels.value = true
    try {
      let endpoint = subApiUrl.value.replace(/\/chat\/completions\/?$/, '/models')
      if (endpoint === subApiUrl.value) {
        if (endpoint.endsWith('/')) endpoint += 'models'
        else endpoint += '/models'
      }

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${subApiKey.value}` }
      })
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      
      const data = await response.json()
      if (data && data.data && Array.isArray(data.data)) {
        availableSubModels.value = data.data.map(m => m.id)
      } else {
        throw new Error('返回的数据格式不符合标准 (缺少 data 数组)')
      }
    } catch (error) {
      alert(`拉取副模型失败：${error.message}`)
    } finally {
      isFetchingSubModels.value = false
    }
  }

  // --- 探针测试 ---
  const testResult = ref('')
  const isTesting = ref(false)
  
  const testModel = async (isSub = false) => {
    const targetUrl = isSub ? subApiUrl.value : apiUrl.value
    const targetKey = isSub ? subApiKey.value : apiKey.value
    const targetModel = isSub ? subApiModel.value : apiModel.value

    if (!targetUrl || !targetKey) return alert('请先填写完整的测试地址和密钥！')

    isTesting.value = true
    testResult.value = `[请求发送中...] 正在呼叫 ${targetModel}`
    const start = Date.now()

    try {
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${targetKey}` },
        body: JSON.stringify({
          model: targetModel,
          messages: [{ role: 'user', content: 'Say "Hello World"' }],
          temperature: temperature.value,
          top_p: top_p.value,
          stream: false
        })
      })
      if (!res.ok) {
        const errText = await res.text()
        throw new Error(`HTTP ${res.status}: ${errText}`)
      }
      const data = await res.json()
      const latency = Date.now() - start
      const reply = data.choices[0]?.message?.content || '未返回内容'
      testResult.value = `[✅ 测试成功] 耗时 ${latency}ms\n模型回复: ${reply}`
    } catch (e) {
      testResult.value = `[❌ 测试失败]\n${e.message}`
    } finally {
      isTesting.value = false
    }
  }

  return { 
    apiUrl, apiKey, apiModel, 
    temperature, top_p, stream,
    useSubApi, subApiUrl, subApiKey, subApiModel,
    apiPresets, savePreset, deletePreset, applyPreset,
    subApiPresets, saveSubPreset, deleteSubPreset, applySubPreset,
    availableModels, isFetchingModels, fetchModels,
    availableSubModels, isFetchingSubModels, fetchSubModels,
    testResult, isTesting, testModel
  }
}
