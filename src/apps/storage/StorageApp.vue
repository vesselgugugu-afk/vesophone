<template>
  <transition name="slide-up">
    <div v-if="show" class="app-window" style="z-index: 40; background: var(--bg-color);">
      <div class="app-header">
        <div class="btn-back" @click="$emit('close')">返回</div>
        <div class="app-title">存储管理</div>
        <div class="header-right"></div>
      </div>

      <div class="content-area">
        <div style="background:#fff; border-radius:16px; padding:20px; text-align:center; box-shadow:0 2px 10px rgba(0,0,0,0.02);">
          <div style="font-size:12px; color:var(--text-sub); margin-bottom:5px;">预估总占用</div>
          <div style="font-size:32px; font-weight:600; color:var(--text-main);">{{ totalSizeMB }} <span style="font-size:14px;">MB</span></div>
        </div>

        <div style="background:#fff; border-radius:16px; padding:15px; box-shadow:0 2px 10px rgba(0,0,0,0.02); display:flex; flex-direction:column; gap:15px;">
          <div style="font-weight:600; font-size:14px; margin-bottom:5px;">空间分布</div>
          
          <div>
            <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:6px;">
              <span>浏览器缓存 (Local Storage)</span>
              <span style="font-weight:600;">{{ lsSizeMB }} MB</span>
            </div>
            <div style="height:8px; background:#f0f0f0; border-radius:4px; overflow:hidden;">
              <div :style="{ width: getPercentage(lsSize, totalSize) + '%', background: '#5c8aff', height: '100%' }"></div>
            </div>
            <div style="font-size:10px; color:#aaa; margin-top:4px;">存储角色设定、系统配置、外观壁纸等</div>
          </div>

          <div>
            <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:6px;">
              <span>本地数据库 (IndexedDB)</span>
              <span style="font-weight:600;">{{ dbSizeMB }} MB</span>
            </div>
            <div style="height:8px; background:#f0f0f0; border-radius:4px; overflow:hidden;">
              <div :style="{ width: getPercentage(dbSize, totalSize) + '%', background: '#1dd1a1', height: '100%' }"></div>
            </div>
            <div style="font-size:10px; color:#aaa; margin-top:4px;">存储海量历史聊天记录、长期记忆库等</div>
          </div>
        </div>

        <div style="background:#fff; border-radius:16px; padding:15px; box-shadow:0 2px 10px rgba(0,0,0,0.02); display:flex; flex-direction:column; gap:10px; margin-top:10px;">
          <div style="font-weight:600; font-size:14px; margin-bottom:5px;">备份与恢复</div>
          <button class="btn-send" style="padding:12px; border-radius:10px; background:#333;" @click="handleExport">
            <i class="fas fa-file-export" style="margin-right:6px;"></i> 导出全量备份 (JSON)
          </button>
          
          <button class="btn-send" style="padding:12px; border-radius:10px; background:#fff; color:#333; border:1px solid #ddd;" @click="$refs.importInput.click()">
            <i class="fas fa-file-import" style="margin-right:6px;"></i> 导入备份覆盖本地
          </button>
          <input type="file" ref="importInput" accept=".json" style="display:none" @change="handleImport" />
          
          <div style="font-size:10px; color:#ff5252; text-align:center; line-height:1.4;">
            导入备份将会清空当前的所有聊天记录、角色和设置，请谨慎操作！
          </div>
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

const lsSize = ref(0)
const dbSize = ref(0)
const totalSize = ref(0)
const lsSizeMB = ref('0.00')
const dbSizeMB = ref('0.00')
const totalSizeMB = ref('0.00')

const importInput = ref(null)

const calculateStorage = async () => {
  // 1. 计算 LocalStorage
  let _ls = 0
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      _ls += ((localStorage[key].length + key.length) * 2)
    }
  }
  lsSize.value = _ls

  // 2. 估算 IndexedDB (将表转成 JSON 字符串算长度)
  let _db = 0
  try {
    const msgs = await db.messages.toArray()
    const mems = await db.memories.toArray()
    _db += JSON.stringify(msgs).length * 2
    _db += JSON.stringify(mems).length * 2
  } catch (e) {
    console.error(e)
  }
  dbSize.value = _db

  totalSize.value = _ls + _db

  lsSizeMB.value = (_ls / 1024 / 1024).toFixed(2)
  dbSizeMB.value = (_db / 1024 / 1024).toFixed(2)
  totalSizeMB.value = (totalSize.value / 1024 / 1024).toFixed(2)
}

watch(() => props.show, (val) => {
  if (val) calculateStorage()
})
onMounted(calculateStorage)

const getPercentage = (part, total) => {
  if (total === 0) return 0
  return Math.min(100, Math.max(0, (part / total) * 100))
}

const handleExport = async () => {
  const backup = { localStorage: {}, indexedDB: { messages: [], memories: [] } }
  
  // 收集 LS
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    backup.localStorage[key] = localStorage.getItem(key)
  }
  
  // 收集 DB
  backup.indexedDB.messages = await db.messages.toArray()
  backup.indexedDB.memories = await db.memories.toArray()

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup))
  const node = document.createElement('a')
  node.setAttribute("href", dataStr)
  node.setAttribute("download", `AI_Phone_Backup_${new Date().getTime()}.json`)
  document.body.appendChild(node)
  node.click()
  node.remove()
}

const handleImport = (e) => {
  const file = e.target.files[0]
  if (!file) return
  if (!confirm('警告：此操作不可逆！导入将覆盖当前全部数据，是否继续？')) return

  const reader = new FileReader()
  reader.onload = async (ev) => {
    try {
      const backup = JSON.parse(ev.target.result)
      
      // 1. 恢复 LS
      if (backup.localStorage) {
        localStorage.clear()
        for (const [k, v] of Object.entries(backup.localStorage)) {
          localStorage.setItem(k, v)
        }
      }
      
      // 2. 恢复 DB
      if (backup.indexedDB) {
        await db.messages.clear()
        await db.memories.clear()
        if (backup.indexedDB.messages?.length) await db.messages.bulkAdd(backup.indexedDB.messages)
        if (backup.indexedDB.memories?.length) await db.memories.bulkAdd(backup.indexedDB.memories)
      }

      alert('恢复成功！页面即将刷新加载新数据。')
      window.location.reload()
    } catch (error) {
      alert('导入失败，JSON 格式可能不正确：' + error.message)
    }
  }
  reader.readAsText(file)
}
</script>
