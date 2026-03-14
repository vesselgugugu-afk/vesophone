import { ref, watch, computed } from 'vue'

const DEFAULT_PAGE1 = [
  { id: 'w_capsule', type: 'widget', component: 'capsule', size: '4x1', props: { bgImage: '' } },
  { id: 'w_ins', type: 'widget', component: 'ins', size: '4x2', props: { bgImage: '' } },
  { id: 'app_qq', type: 'app', appId: 'qq', name: 'QQ', icon: '', size: '1x1' },
  { id: 'app_worldbook', type: 'app', appId: 'worldbook', name: '世界书', icon: '', size: '1x1' },
  { id: 'app_api', type: 'app', appId: 'api', name: 'API 设置', icon: '', size: '1x1' },
  { id: 'app_appearance', type: 'app', appId: 'appearance', name: '系统外观', icon: '', size: '1x1' },
  { id: 'w_custom', type: 'widget', component: 'custom_card', size: '2x2', props: { bgImage: '' } },
  { id: 'w_health', type: 'widget', component: 'health', size: '2x1', props: { bgImage: '' } },
  { id: 'w_finance', type: 'widget', component: 'finance', size: '2x1', props: { bgImage: '' } },
  { id: 'app_todo', type: 'app', appId: 'todo', name: '待办', icon: '', size: '1x1' },
  { id: 'app_vocab', type: 'app', appId: 'vocab', name: '单词', icon: '', size: '1x1' },
  { id: 'app_music', type: 'app', appId: 'music', name: '网易云', icon: '', size: '1x1' },
  { id: 'app_tomato', type: 'app', appId: 'tomato', name: '番茄钟', icon: '', size: '1x1' }
]

const DEFAULT_PAGE2 = [
  { id: 'app_storage', type: 'app', appId: 'storage', name: '存储', icon: '', size: '1x1' },
  { id: 'app_offline', type: 'app', appId: 'offline', name: '线下见面', icon: '', size: '1x1' },
  { id: 'app_memory', type: 'app', appId: 'memory', name: '那年今日', icon: '', size: '1x1' }
]

const DEFAULT_WIDGET_LIBRARY = [
  { name: '时间与天气胶囊', component: 'capsule', size: '4x1', type: 'widget', props: {} },
  { name: '社交名片 (大)', component: 'ins', size: '4x2', type: 'widget', props: {} },
  { name: '羁绊连线 (一起听)', component: 'colisten_card', size: '4x2', type: 'widget', props: {} },
  { name: '拍立得照片墙', component: 'photo_wall', size: '4x2', type: 'widget', props: {} },
  { name: '仿黑胶播放器', component: 'record_player', size: '2x2', type: 'widget', props: {} },
  { name: '杂志风动态日历', component: 'calendar_pro', size: '2x2', type: 'widget', props: {} },
  { name: '快捷聊天直通车', component: 'quick_chat', size: '2x2', type: 'widget', props: {} },
  { name: '记录提示板 (方)', component: 'custom_card', size: '2x2', type: 'widget', props: {} },
  { name: '健康数据看板', component: 'health', size: '2x1', type: 'widget', props: {} },
  { name: '财务状态看板', component: 'finance', size: '2x1', type: 'widget', props: {} }
]

const load = (key, def) => {
  const s = localStorage.getItem(key)
  return s ? JSON.parse(s) : def
}

export function useDesktop() {
  const page1 = ref(load('desktop_page1', DEFAULT_PAGE1))
  const page2 = ref(load('desktop_page2', DEFAULT_PAGE2))
  
  const customWidgetLibrary = ref(load('customWidgetLibrary', []))

  const ensureMemoryApp = () => {
    const has = [...page1.value, ...page2.value].some(i => i.type === 'app' && i.appId === 'memory')
    if (!has) page2.value.push({ id: 'app_memory', type: 'app', appId: 'memory', name: '那年今日', icon: '', size: '1x1' })
  }
  ensureMemoryApp()

  watch(page1, (v) => localStorage.setItem('desktop_page1', JSON.stringify(v)), { deep: true })
  watch(page2, (v) => localStorage.setItem('desktop_page2', JSON.stringify(v)), { deep: true })
  watch(customWidgetLibrary, (v) => localStorage.setItem('customWidgetLibrary', JSON.stringify(v)), { deep: true })

  const widgetLibrary = computed(() => {
    return [...DEFAULT_WIDGET_LIBRARY, ...customWidgetLibrary.value]
  })

  const getDesktopApps = () => [...page1.value, ...page2.value].filter(item => item.type === 'app')

  const updateAppInfo = (id, newName, newIcon) => {
    let item = page1.value.find(i => i.id === id) || page2.value.find(i => i.id === id)
    if (item) {
      if (newName !== undefined) item.name = newName
      if (newIcon !== undefined) item.icon = newIcon
    }
  }

  const updateWidgetProps = (id, newProps) => {
    let item = page1.value.find(i => i.id === id) || page2.value.find(i => i.id === id)
    if (item && item.type === 'widget') {
      if (!item.props) item.props = {}
      Object.assign(item.props, newProps)
    }
  }

  const removeDesktopItem = (id) => {
    page1.value = page1.value.filter(item => item.id !== id)
    page2.value = page2.value.filter(item => item.id !== id)
  }

  // 核心：面积计算引擎 (防止撑爆第一页)
  const getGridArea = (sizeStr) => {
    if (!sizeStr) return 1
    const [w, h] = sizeStr.split('x').map(Number)
    return (w || 1) * (h || 1)
  }

  const addDesktopItem = (template) => {
    const newItem = { 
      ...template, 
      id: `custom_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      props: { ...template.props }
    }
    
    // 计算第一屏的当前总面积 (满载是 7*4 = 28)
    const page1Area = page1.value.reduce((sum, item) => sum + getGridArea(item.size), 0)
    const newItemArea = getGridArea(newItem.size)

    if (page1Area + newItemArea > 28) {
      // 溢出，强制流放到第二屏
      page2.value.push(newItem)
    } else {
      page1.value.push(newItem)
    }
  }

  const addCustomWidget = (widgetData) => {
    customWidgetLibrary.value.push({
      ...widgetData,
      id: `diy_tpl_${Date.now()}`,
      component: 'diy_html',
      type: 'widget',
      props: {}
    })
  }

  const removeCustomWidget = (id) => {
    customWidgetLibrary.value = customWidgetLibrary.value.filter(w => w.id !== id)
  }

  const exportCustomWidgets = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(customWidgetLibrary.value));
    const a = document.createElement('a');
    a.setAttribute("href", dataStr);
    a.setAttribute("download", "diy_widgets_export.json");
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  const importCustomWidgets = (jsonString) => {
    try {
      const parsed = JSON.parse(jsonString)
      if (Array.isArray(parsed)) {
        customWidgetLibrary.value.push(...parsed)
        return true
      }
      return false
    } catch(e) {
      return false
    }
  }

  return { 
    page1, page2, widgetLibrary, customWidgetLibrary,
    getDesktopApps, updateAppInfo, updateWidgetProps, removeDesktopItem, addDesktopItem,
    addCustomWidget, removeCustomWidget, exportCustomWidgets, importCustomWidgets
  }
}
