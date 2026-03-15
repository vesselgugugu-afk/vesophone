<template>
  <transition name="slide-up">
    <div v-if="show" class="app-window" style="z-index: 40; background: #f4f5f7;">
      <div class="app-header">
        <div class="btn-back" @click="$emit('close')">返回</div>
        <div class="app-title">存储与备份</div>
        <div class="header-right"></div>
      </div>

      <div class="content-area" style="padding-bottom: 30px;">
        
        <!-- 顶部总览看板 -->
        <div class="storage-overview glass">
          <div class="overview-title">设备总占用</div>
          <div class="overview-size">{{ totalSizeMB }} <span style="font-size:16px; font-weight:600;">MB</span></div>
          <div class="storage-bar">
            <div v-for="(mod, key) in modules" :key="key" 
                 class="bar-segment" 
                 :style="{ width: getPercentage(mod.size, totalSize) + '%', backgroundColor: mod.color }">
            </div>
          </div>
          <div style="font-size: 11px; color: #888; margin-top: 10px;">
            包含 LocalStorage 与 IndexedDB 数据
          </div>
        </div>

        <!-- 模块化管理列表 -->
        <div style="font-weight:700; font-size:14px; margin: 20px 0 10px 5px; color: var(--text-main);">
          <i class="fas fa-layer-group" style="margin-right: 6px;"></i>空间分布与模块管理
        </div>

        <div class="module-list">
          <div class="module-card glass" v-for="(mod, key) in modules" :key="key">
            <div class="mod-header">
              <div class="mod-info">
                <div class="mod-dot" :style="{ backgroundColor: mod.color }"></div>
                <div>
                  <div class="mod-name">{{ mod.name }}</div>
                  <div class="mod-desc">{{ mod.desc }}</div>
                </div>
              </div>
              <div class="mod-size">{{ (mod.size / 1024 / 1024).toFixed(2) }} MB</div>
            </div>
            
            <div class="mod-actions">
              <button class="mod-btn btn-export" @click="exportModule(key)">
                <i class="fas fa-download"></i> 导出模块
              </button>
              <button class="mod-btn btn-clear" @click="clearModule(key)">
                <i class="fas fa-trash-alt"></i> 清理数据
              </button>
            </div>
          </div>
        </div>

        <!-- 全局高级操作 -->
        <div style="font-weight:700; font-size:14px; margin: 25px 0 10px 5px; color: var(--text-main);">
          <i class="fas fa-tools" style="margin-right: 6px;"></i>全局高级操作
        </div>

        <div class="global-actions glass">
          <button class="action-btn primary" @click="exportAll">
            <i class="fas fa-file-export"></i> 导出全量机器备份
          </button>
          
          <button class="action-btn secondary" @click="$refs.importInput.click()">
            <i class="fas fa-file-import"></i> 导入备份数据 (智能合并)
          </button>
          <input type="file" ref="importInput" accept=".json" style="display:none" @change="handleImport" />

          <button class="action-btn danger" @click="factoryReset">
            <i class="fas fa-skull-crossbones"></i> 恢复出厂设置
          </button>
        </div>

      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import db from '@/db'

const props = defineProps({ show: Boolean })
defineEmits(['close'])

const totalSize = ref(0)
const totalSizeMB = ref('0.00')

const importInput = ref(null)

// 核心：精细化的模块定义引擎
const modules = ref({
  system: { 
    name: '系统与外观', 
    desc: '桌面排版、壁纸、API及全局CSS', 
    size: 0, 
    color: '#ff9f43', 
    keys: ['appearance', 'api_settings', 'desktop_', 'customWidgetLibrary'] 
  },
  social: { 
    name: '角色与会话', 
    desc: '角色档案及最近联系人列表', 
    size: 0, 
    color: '#10ac84', 
    keys: ['characters', 'sessions', 'userProfile'] 
  },
  chat: { 
    name: '聊天记录与记忆', 
    desc: '海量历史记录及长期记忆库', 
    size: 0, 
    color: '#ff6b6b', 
    keys: [], 
    dbTables: ['messages', 'memories'] 
  },
  music: { 
    name: '多媒体与工具', 
    desc: '音乐缓存、待办、播放预设', 
    size: 0, 
    color: '#54a0ff', 
    keys: ['AERO_', 'aero_', 'todo_'], 
    dbTables: ['musicStats'] 
  },
  other: { 
    name: '其他杂项', 
    desc: '系统零碎缓存与未知数据', 
    size: 0, 
    color: '#8395a7', 
    keys: [], 
    isOther: true 
  }
})

// 判定一个 key 属于哪个模块
const getModuleKeyForLS = (keyName) => {
  for (const [mKey, mData] of Object.entries(modules.value)) {
    if (mData.keys && mData.keys.some(k => keyName.includes(k))) {
      return mKey
    }
  }
  return 'other'
}

// 精确计算全盘容量
const calculateStorage = async () => {
  // 重置
  Object.values(modules.value).forEach(m => m.size = 0)
  let _total = 0

  // 1. 扫描 LocalStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    const val = localStorage.getItem(key) || ''
    const bytes = (key.length + val.length) * 2 // UTF-16 估算
    
    const targetMod = getModuleKeyForLS(key)
    modules.value[targetMod].size += bytes
    _total += bytes
  }

  // 2. 扫描 IndexedDB
  try {
    if (db.messages) {
      const msgs = await db.messages.toArray()
      const s1 = JSON.stringify(msgs).length * 2
      modules.value.chat.size += s1
      _total += s1
    }
    if (db.memories) {
      const mems = await db.memories.toArray()
      const s2 = JSON.stringify(mems).length * 2
      modules.value.chat.size += s2
      _total += s2
    }
    if (db.musicStats) {
      const stats = await db.musicStats.toArray()
      const s3 = JSON.stringify(stats).length * 2
      modules.value.music.size += s3
      _total += s3
    }
  } catch (e) {
    console.error('DB 扫描失败:', e)
  }

  totalSize.value = _total
  totalSizeMB.value = (_total / 1024 / 1024).toFixed(2)
}

watch(() => props.show, (val) => {
  if (val) calculateStorage()
})
onMounted(calculateStorage)

const getPercentage = (part, total) => {
  if (total === 0) return 0
  return Math.min(100, Math.max(0, (part / total) * 100))
}

// ---------------- 操作：清理 ----------------

const clearModule = async (mKey) => {
  const mData = modules.value[mKey]
  if (!confirm(`确定要彻底清理【${mData.name}】吗？此操作不可逆！`)) return

  // 清理 LS
  const keysToRemove = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (mData.isOther) {
      if (getModuleKeyForLS(key) === 'other') keysToRemove.push(key)
    } else if (mData.keys && mData.keys.some(k => key.includes(k))) {
      keysToRemove.push(key)
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k))

  // 清理 DB
  if (mData.dbTables) {
    for (const table of mData.dbTables) {
      if (db[table]) await db[table].clear()
    }
  }

  calculateStorage()
  alert(`【${mData.name}】清理完毕。为了防止界面异常，建议刷新页面。`)
}

const factoryReset = async () => {
  if (!confirm('警告：此操作将清空整部手机的所有数据、设置、聊天和角色！您确定要恢复出厂设置吗？')) return
  if (!confirm('最后一次确认：真的要抹除所有数据吗？')) return

  localStorage.clear()
  try {
    if (db.messages) await db.messages.clear()
    if (db.memories) await db.memories.clear()
    if (db.musicStats) await db.musicStats.clear()
  } catch(e){}
  
  alert('数据已清空，系统将自动重启。')
  window.location.reload()
}

// ---------------- 操作：导出 ----------------

const generateExportObj = async (mKey = null) => {
  const backup = { localStorage: {}, indexedDB: {} }
  
  // 提取 LS
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (mKey === null) {
      // 全量
      backup.localStorage[key] = localStorage.getItem(key)
    } else {
      // 分模块
      const mData = modules.value[mKey]
      if (mData.isOther) {
        if (getModuleKeyForLS(key) === 'other') backup.localStorage[key] = localStorage.getItem(key)
      } else if (mData.keys && mData.keys.some(k => key.includes(k))) {
        backup.localStorage[key] = localStorage.getItem(key)
      }
    }
  }

  // 提取 DB
  const dbTablesToExport = mKey === null ? ['messages', 'memories', 'musicStats'] : (modules.value[mKey].dbTables || [])
  for (const table of dbTablesToExport) {
    if (db[table]) {
      try {
        backup.indexedDB[table] = await db[table].toArray()
      } catch(e) {}
    }
  }

  return backup
}

const triggerDownload = (dataObj, prefix) => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataObj))
  const node = document.createElement('a')
  node.setAttribute("href", dataStr)
  node.setAttribute("download", `Vessel_${prefix}_${new Date().getTime()}.json`)
  document.body.appendChild(node)
  node.click()
  node.remove()
}

const exportModule = async (mKey) => {
  const data = await generateExportObj(mKey)
  triggerDownload(data, `Module_${mKey}`)
}

const exportAll = async () => {
  const data = await generateExportObj(null)
  triggerDownload(data, 'Full_Backup')
}

// ---------------- 操作：导入合并 ----------------

const handleImport = (e) => {
  const file = e.target.files[0]
  if (!file) return
  if (!confirm('智能合并：导入的数据将会覆盖对应的模块，无关数据不受影响。是否继续？')) return

  const reader = new FileReader()
  reader.onload = async (ev) => {
    try {
      const backup = JSON.parse(ev.target.result)
      
      // 1. 合并 LS (只覆盖传入的键)
      if (backup.localStorage) {
        for (const [k, v] of Object.entries(backup.localStorage)) {
          localStorage.setItem(k, v)
        }
      }
      
      // 2. 合并 DB (只覆盖传入的表)
      if (backup.indexedDB) {
        for (const [table, rows] of Object.entries(backup.indexedDB)) {
          if (db[table]) {
            await db[table].clear() // 清空旧表
            if (rows && rows.length) await db[table].bulkAdd(rows) // 写入新数据
          }
        }
      }

      alert('数据导入并合并成功！页面即将重载生效。')
      window.location.reload()
    } catch (error) {
      alert('导入失败，文件损坏或非规范的 JSON 格式：\n' + error.message)
    }
  }
  reader.readAsText(file)
}

</script>

<style scoped>
.app-window { display: flex; flex-direction: column; width: 100%; height: 100%; overflow: hidden; font-family: -apple-system, sans-serif; }
.app-header { display: flex; justify-content: space-between; align-items: center; padding: calc(env(safe-area-inset-top, 20px) + 15px) 20px 15px; background: rgba(255,255,255,0.85); backdrop-filter: blur(10px); z-index: 10; border-bottom: 1px solid rgba(0,0,0,0.05); }
.app-title { font-size: 16px; font-weight: 700; color: #333; }
.btn-back { font-size: 14px; color: #5c8aff; font-weight: 600; cursor: pointer; }
.header-right { width: 30px; }

.content-area { flex: 1; overflow-y: auto; padding: 20px; }
.glass { background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.5); box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05); }

/* 概览卡片 */
.storage-overview { border-radius: 20px; padding: 25px 20px; text-align: center; }
.overview-title { font-size: 12px; color: #888; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
.overview-size { font-size: 38px; font-weight: 800; color: #333; line-height: 1; }
.storage-bar { width: 100%; height: 8px; border-radius: 4px; background: #eee; margin-top: 20px; display: flex; overflow: hidden; }
.bar-segment { height: 100%; transition: width 0.5s ease-in-out; }

/* 模块列表 */
.module-list { display: flex; flex-direction: column; gap: 12px; }
.module-card { border-radius: 16px; padding: 15px; display: flex; flex-direction: column; gap: 12px; }
.mod-header { display: flex; justify-content: space-between; align-items: center; }
.mod-info { display: flex; align-items: center; gap: 10px; }
.mod-dot { width: 12px; height: 12px; border-radius: 4px; }
.mod-name { font-size: 14px; font-weight: 700; color: #333; }
.mod-desc { font-size: 11px; color: #888; margin-top: 2px; }
.mod-size { font-size: 13px; font-weight: 600; color: #555; }
.mod-actions { display: flex; gap: 8px; border-top: 1px dashed rgba(0,0,0,0.05); padding-top: 10px; }
.mod-btn { flex: 1; border: none; padding: 8px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 5px; }
.btn-export { background: #f0f4ff; color: #5c8aff; }
.btn-clear { background: #fff0f0; color: #ff5252; }

/* 全局操作 */
.global-actions { border-radius: 16px; padding: 15px; display: flex; flex-direction: column; gap: 10px; }
.action-btn { width: 100%; padding: 14px; border-radius: 12px; font-size: 13px; font-weight: 600; border: none; cursor: pointer; display: flex; justify-content: center; align-items: center; }
.action-btn.primary { background: #333; color: #fff; }
.action-btn.secondary { background: #fff; color: #333; border: 1px solid #ddd; }
.action-btn.danger { background: rgba(255, 82, 82, 0.1); color: #ff5252; margin-top: 10px; }

/* 动画 */
.slide-up-enter-active, .slide-up-leave-active { transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); }
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(100%); opacity: 0; }
</style>
