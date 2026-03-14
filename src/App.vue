<template>
  <div :style="appBackgroundStyle" style="width:100%; height:100%; position:relative; display:flex; flex-direction:column; overflow:hidden;">
    
    <component :is="'style'" v-if="appearance.globalCss">{{ appearance.globalCss }}</component>

    <transition name="slide-down-toast">
      <div v-if="sysToast" class="sys-toast glass">{{ sysToast }}</div>
    </transition>

    <div class="system-status-bar">
      <div class="status-left"><span class="status-time">{{ time }}</span></div>
      <div class="status-center"><MiniCapsule @expand="activeApp = 'music'" /></div>
      <div class="status-right">
        <i class="fas fa-signal" style="font-size: 10px; margin-right: 4px;"></i>
        <i class="fas fa-wifi" style="font-size: 10px; margin-right: 6px;"></i>
        <div class="battery-wrapper">
          <div class="battery-body">
            <div class="battery-level" :style="{ width: battery + '%', backgroundColor: isCharging ? '#1dd1a1' : (battery <= 20 ? '#ff5252' : '#000') }"></div>
          </div>
          <div class="battery-cap"></div>
        </div>
        <i v-if="isCharging" class="fas fa-bolt" style="font-size: 8px; color: #1dd1a1; position: absolute; right: 28px;"></i>
      </div>
    </div>

    <!-- 隐藏上传器 -->
    <input type="file" ref="widgetFileInput" accept="image/*" style="display:none;" @change="handleWidgetFileChange" />

    <div class="workspace-container" @click="handleWorkspaceClick">
      
      <transition name="fade">
        <div v-if="isEditMode" class="edit-done-btn glass" @click.stop="isEditMode = false">完成</div>
      </transition>

      <div class="screens-wrapper" :class="{ 'blur-bg': showAddDrawer }">
        <!-- 第一屏 -->
        <div class="screen">
          <VueDraggable v-model="page1" group="desktop" class="desktop-grid" :animation="250" :disabled="!isEditMode" ghost-class="ghost-item" @start="isDragging = true" @end="isDragging = false">
            <div v-for="item in page1" :key="item.id" class="grid-item" :class="[`size-${item.size}`, { 'is-wiggle': isEditMode && !isDragging }]" @touchstart="handleTouchStart" @touchend="handleTouchEnd" @mousedown="handleTouchStart" @mouseup="handleTouchEnd" @contextmenu.prevent>
              
              <div v-if="isEditMode && item.type === 'widget'" class="remove-badge" @click.stop="removeDesktopItem(item.id)">
                <i class="fas fa-minus"></i>
              </div>
              
              <div v-if="item.type === 'app'" class="app-item-wrapper" @click.stop="handleAppClick(item)">
                <div class="app-icon-box glass" :style="getAppBg(item)">
                  <i v-if="!item.icon && !appearance.icons[item.appId]" :class="getDefaultIcon(item.appId)" :style="item.appId === 'offline' ? 'font-size:24px; color:#9c27b0;' : 'font-size:22px; color:var(--text-main);'"></i>
                </div>
                <div class="app-name-label">{{ item.name }}</div>
              </div>

              <!-- 赋予组件点击路由能力 -->
              <div v-else-if="item.type === 'widget'" class="widget-wrap" @click.stop="handleWidgetClick(item)">
                <DesktopWidgets :item="item" />
                <div v-if="isEditMode" class="widget-edit-mask" @click.stop="openWidgetConfig(item)">
                  <div class="edit-btn-glass"><i class="fas fa-pencil-alt"></i> 配置</div>
                </div>
              </div>

            </div>
          </VueDraggable>
        </div>

        <!-- 第二屏 -->
        <div class="screen">
          <VueDraggable v-model="page2" group="desktop" class="desktop-grid" :animation="250" :disabled="!isEditMode" ghost-class="ghost-item" @start="isDragging = true" @end="isDragging = false">
            <div v-for="item in page2" :key="item.id" class="grid-item" :class="[`size-${item.size}`, { 'is-wiggle': isEditMode && !isDragging }]" @touchstart="handleTouchStart" @touchend="handleTouchEnd" @mousedown="handleTouchStart" @mouseup="handleTouchEnd" @contextmenu.prevent>
              
              <div v-if="isEditMode && item.type === 'widget'" class="remove-badge" @click.stop="removeDesktopItem(item.id)">
                <i class="fas fa-minus"></i>
              </div>
              
              <div v-if="item.type === 'app'" class="app-item-wrapper" @click.stop="handleAppClick(item)">
                <div class="app-icon-box glass" :style="getAppBg(item)">
                  <i v-if="!item.icon && !appearance.icons[item.appId]" :class="getDefaultIcon(item.appId)" :style="item.appId === 'offline' ? 'font-size:24px; color:#9c27b0;' : 'font-size:22px; color:var(--text-main);'"></i>
                </div>
                <div class="app-name-label">{{ item.name }}</div>
              </div>

              <div v-else-if="item.type === 'widget'" class="widget-wrap" @click.stop="handleWidgetClick(item)">
                <DesktopWidgets :item="item" />
                <div v-if="isEditMode" class="widget-edit-mask" @click.stop="openWidgetConfig(item)">
                  <div class="edit-btn-glass"><i class="fas fa-pencil-alt"></i> 配置</div>
                </div>
              </div>

            </div>
          </VueDraggable>
        </div>
      </div>
      
      <div class="dock-container">
        <transition name="fade-fast" mode="out-in">
          <div v-if="!isEditMode" class="dock glass">
            <div class="dock-item" @click="activeApp = 'api'">
              <div class="app-icon-box dock-icon glass" :style="appearance.icons.api ? { backgroundImage: `url(${appearance.icons.api})` } : {}">
                <i v-if="!appearance.icons.api" class="fas fa-code" style="font-size:20px; color:var(--text-main);"></i>
              </div>
            </div>
            <div class="dock-item" @click="activeApp = 'appearance'">
              <div class="app-icon-box dock-icon glass" :style="appearance.icons.appearance ? { backgroundImage: `url(${appearance.icons.appearance})` } : {}">
                <i v-if="!appearance.icons.appearance" class="fas fa-paint-brush" style="font-size:20px; color:var(--text-main);"></i>
              </div>
            </div>
            <div class="dock-item">
              <div class="app-icon-box dock-icon glass">
                <i class="fas fa-th-large" style="font-size:20px; color:var(--text-main);"></i>
              </div>
            </div>
          </div>

          <div v-else class="edit-dock glass" @click.stop="showAddDrawer = true">
            <i class="fas fa-plus-circle" style="font-size: 20px; margin-right: 8px;"></i>
            <span>添加小组件</span>
          </div>
        </transition>
      </div>

      <!-- 抽屉 -->
      <transition name="slide-up">
        <div v-if="showAddDrawer" class="widget-drawer-mask" @click.stop="showAddDrawer = false">
          <div class="widget-drawer glass" @click.stop>
            <div class="drawer-header">
              <span>小组件库</span>
              <i class="fas fa-times" @click="showAddDrawer = false" style="cursor:pointer; color:#888;"></i>
            </div>
            <div class="drawer-content">
              <div class="w-card glass" v-for="w in widgetLibrary" :key="w.component + w.name">
                <div class="w-preview-box" :style="{ minHeight: getPreviewStyle(w.size).containerHeight }">
                  <div class="w-preview-scaler" :style="getPreviewStyle(w.size).style">
                    <DesktopWidgets :item="w" />
                  </div>
                </div>
                <div class="w-info-bar">
                  <div class="w-text-info">
                    <div class="w-name">{{ w.name }}</div>
                    <div class="w-size">占用: {{ w.size }} <span v-if="w.component==='diy_html'" style="color:#ff8c5c; margin-left:4px;">(DIY)</span></div>
                  </div>
                  <div class="w-add-btn" @click="handleAddWidget(w)"><i class="fas fa-plus"></i> 添加</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </transition>

      <!-- 独立精细化配置弹窗 -->
      <transition name="fade">
        <div v-if="editingWidget" class="config-modal-mask" @click="closeWidgetConfig">
          <div class="config-modal" @click.stop>
            <h3 style="font-size:16px; font-weight:700; text-align:center; color:var(--text-main);">实例配置</h3>
            
            <div class="config-form" style="margin-top:15px;">
              <template v-if="['ins', 'custom_card', 'health', 'finance', 'photo_wall', 'diy_html'].includes(editingWidget.component)">
                <div class="config-field">
                  <label class="config-label">文案 / 标签</label>
                  <input type="text" class="config-input" v-model="widgetDraft.title" placeholder="主要文案" />
                </div>
                <div class="config-field" v-if="!['photo_wall'].includes(editingWidget.component)">
                  <label class="config-label">副标题 / 描述</label>
                  <input type="text" class="config-input" v-model="widgetDraft.desc" placeholder="详细说明文字" />
                </div>
              </template>

              <!-- 快捷聊天绑定 -->
              <template v-if="editingWidget.component === 'quick_chat'">
                <div class="config-field">
                  <label class="config-label">绑定目标聊天</label>
                  <select class="config-input" v-model="widgetDraft.chatId">
                    <option value="">-- 请选择要快捷联系的角色 --</option>
                    <option v-for="chat in chatSessions" :key="chat.id" :value="chat.id">{{ chat.title }}</option>
                  </select>
                </div>
              </template>

              <!-- 多媒体素材 (带极速压缩) -->
              <div class="config-field" style="margin-top:5px;">
                <label class="config-label">多媒体素材 (自动压缩)</label>
                <div style="display:flex; gap:10px; flex-wrap:wrap;">
                  <button class="config-btn" v-if="!['photo_wall'].includes(editingWidget.component)" @click="triggerWidgetUpload('bgImage')">背景</button>
                  <button class="config-btn" v-if="['ins','diy_html','quick_chat'].includes(editingWidget.component)" @click="triggerWidgetUpload('avatar')">头像</button>
                  <template v-if="editingWidget.component === 'photo_wall'">
                    <button class="config-btn" @click="triggerWidgetUpload('img1')" :class="{'active-btn': widgetDraft.img1}">图一</button>
                    <button class="config-btn" @click="triggerWidgetUpload('img2')" :class="{'active-btn': widgetDraft.img2}">图二</button>
                    <button class="config-btn" @click="triggerWidgetUpload('img3')" :class="{'active-btn': widgetDraft.img3}">图三</button>
                  </template>
                </div>
              </div>

              <div style="display:flex; gap:10px; margin-top:5px;" v-if="widgetDraft.bgImage || widgetDraft.avatar">
                <button class="config-btn config-btn-danger" v-if="widgetDraft.bgImage" @click="widgetDraft.bgImage = ''">清除背景</button>
                <button class="config-btn config-btn-danger" v-if="widgetDraft.avatar" @click="widgetDraft.avatar = ''">清除头像</button>
              </div>
            </div>
            
            <div class="config-actions">
              <button class="btn-cancel" @click="closeWidgetConfig">取消</button>
              <button class="btn-save" @click="saveWidgetConfig">保存应用</button>
            </div>
          </div>
        </div>
      </transition>

      <QQApp           :show="activeApp === 'qq'"           @close="activeApp = null" />
      <WorldbookApp    :show="activeApp === 'worldbook'"    @close="activeApp = null" />
      <ApiApp          :show="activeApp === 'api'"          @close="activeApp = null" />
      <AppearanceApp   :show="activeApp === 'appearance'"   @close="activeApp = null" />
      <StorageApp      :show="activeApp === 'storage'"      @close="activeApp = null" />
      <MusicApp        :show="activeApp === 'music'"        @close="activeApp = null" />
      <OfflineApp      :show="activeApp === 'offline'"      @close="activeApp = null" />
      <MemoryApp       :show="activeApp === 'memory'"       @close="activeApp = null" />
      
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { VueDraggable }  from 'vue-draggable-plus'
import { useTime }       from '@/composables/useTime'
import { useAppearance } from '@/composables/useAppearance'
import { useDesktop }    from '@/composables/useDesktop'
import { useChatSessions } from '@/composables/useChatSessions'

import DesktopWidgets  from '@/components/DesktopWidgets.vue'
import QQApp           from '@/apps/qq/QQApp.vue'
import WorldbookApp    from '@/apps/worldbook/WorldbookApp.vue'
import ApiApp          from '@/apps/api/ApiApp.vue'
import AppearanceApp   from '@/apps/appearance/AppearanceApp.vue'
import StorageApp      from '@/apps/storage/StorageApp.vue'
import MusicApp        from '@/apps/music/MusicApp.vue'
import MiniCapsule     from '@/apps/music/components/MiniCapsule.vue' 
import OfflineApp      from '@/apps/offline/OfflineApp.vue'
import MemoryApp       from '@/apps/memory/MemoryApp.vue'

const { time } = useTime()
const { appearance } = useAppearance()
const { page1, page2, removeDesktopItem, addDesktopItem, updateWidgetProps, widgetLibrary } = useDesktop()
const { chatSessions } = useChatSessions()

const activeApp = ref(null)
const isEditMode = ref(false)
const isDragging = ref(false)
const showAddDrawer = ref(false)
let pressTimer = null

// --- 军用级前端图像压缩引擎 (彻底解决 LocalStorage 5MB 爆盘问题) ---
const compressImage = (base64Str, maxWidth = 600) => {
  return new Promise((resolve) => {
    const img = new Image()
    img.src = base64Str
    img.onload = () => {
      if (img.width <= maxWidth) return resolve(base64Str)
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const ratio = maxWidth / img.width
      canvas.width = maxWidth
      canvas.height = img.height * ratio
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.8)) // 80% 画质强力压缩
    }
  })
}

const handleTouchStart = () => {
  if (isEditMode.value) return
  pressTimer = setTimeout(() => { isEditMode.value = true }, 600)
}
const handleTouchEnd = () => { if (pressTimer) clearTimeout(pressTimer) }

const handleWorkspaceClick = () => {
  if (isEditMode.value && !showAddDrawer.value && !editingWidget.value) isEditMode.value = false
}
const clearEditMode = () => {
  if (isEditMode.value) { isEditMode.value = false; showAddDrawer.value = false; editingWidget.value = null }
}

const handleAppClick = (item) => {
  if (isEditMode.value) return
  if (item.type === 'app') activeApp.value = item.appId
}

// 核心：处理所有的自定义动作与快捷跳转
const handleWidgetClick = (item) => {
  if (isEditMode.value) return
  
  if (item.component === 'record_player') {
    activeApp.value = 'music'
  } 
  else if (item.component === 'quick_chat') {
    if (!item.props?.chatId) return showSysToast('请长按组件绑定目标联系人')
    activeApp.value = 'qq'
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('sys-open-chat', { detail: item.props.chatId }))
    }, 150)
  }
  else if (item.component === 'diy_html' && item.props?.clickAction) {
    // 处理用户自定义的 Action 绑定 (如 app:qq)
    if (item.props.clickAction.startsWith('app:')) {
      activeApp.value = item.props.clickAction.split(':')[1]
    }
  }
}

const handleAddWidget = (template) => {
  addDesktopItem(template)
  showAddDrawer.value = false
  showSysToast(`已排入桌面`)
}

const getPreviewStyle = (size) => {
  const map = {
    '1x1': { w: 76, h: 76, scale: 0.8, ch: 60 },
    '2x1': { w: 164, h: 76, scale: 0.8, ch: 60 },
    '2x2': { w: 164, h: 164, scale: 0.5, ch: 82 },
    '4x1': { w: 340, h: 76, scale: 0.45, ch: 35 },
    '4x2': { w: 340, h: 164, scale: 0.4, ch: 66 }
  }
  const s = map[size] || map['2x2']
  return {
    style: { width: `${s.w}px`, height: `${s.h}px`, transform: `scale(${s.scale})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 },
    containerHeight: `${s.ch}px`
  }
}

const editingWidget = ref(null)
const widgetDraft = ref({ title: '', desc: '', bgImage: '', avatar: '', chatId: '', img1: '', img2: '', img3: '' })
const widgetFileInput = ref(null)
const currentUploadTarget = ref('') 

const openWidgetConfig = (item) => {
  editingWidget.value = item
  widgetDraft.value = {
    title: item.props?.title || '',
    desc: item.props?.desc || '',
    bgImage: item.props?.bgImage || '',
    avatar: item.props?.avatar || '',
    chatId: item.props?.chatId || '',
    img1: item.props?.img1 || '',
    img2: item.props?.img2 || '',
    img3: item.props?.img3 || ''
  }
}
const closeWidgetConfig = () => { editingWidget.value = null }
const saveWidgetConfig = () => {
  if (editingWidget.value) {
    updateWidgetProps(editingWidget.value.id, { ...widgetDraft.value })
    showSysToast('组件配置已保存！')
    closeWidgetConfig()
  }
}
const triggerWidgetUpload = (target) => { currentUploadTarget.value = target; if (widgetFileInput.value) widgetFileInput.value.click() }

// 接入压缩引擎！
const handleWidgetFileChange = (e) => {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = async (ev) => {
    // 瞬间强力压缩
    const compressedData = await compressImage(ev.target.result, 600)
    widgetDraft.value[currentUploadTarget.value] = compressedData
    widgetFileInput.value.value = ''
    showSysToast('图片处理完毕，请保存')
  }
  reader.readAsDataURL(file)
}

const getAppBg = (item) => {
  let url = item.icon || appearance.value.icons[item.appId]
  if (item.appId === 'offline') return { backgroundColor: 'rgba(156, 39, 176, 0.15)' }
  return url ? { backgroundImage: `url(${url})`, backgroundColor: 'transparent', border: 'none' } : {}
}

const getDefaultIcon = (appId) => {
  const icons = { qq: 'fas fa-comment', worldbook: 'fas fa-book-open', api: 'fas fa-code', appearance: 'fas fa-paint-brush', todo: 'fas fa-check-square', vocab: 'fas fa-language', music: 'fas fa-music', tomato: 'fas fa-clock', storage: 'fas fa-folder', offline: 'fas fa-wine-glass-alt', memory: 'fas fa-book' }
  return icons[appId] || 'fas fa-cube'
}

const battery = ref(100)
const isCharging = ref(false)
const sysToast = ref(null)
let toastTimer = null
const showSysToast = (msg) => { sysToast.value = msg; if (toastTimer) clearTimeout(toastTimer); toastTimer = setTimeout(() => { sysToast.value = null }, 3500) }

onMounted(async () => {
  window.addEventListener('sys-toast', (e) => showSysToast(e.detail))
  window.addEventListener('open-offline-meeting', (e) => { activeApp.value = 'offline' })
  if ('getBattery' in navigator) {
    try {
      const bm = await navigator.getBattery()
      const updateBatteryInfo = () => { battery.value = Math.round(bm.level * 100); isCharging.value = bm.charging }
      battery.value = Math.round(bm.level * 100); isCharging.value = bm.charging
      bm.addEventListener('levelchange', updateBatteryInfo)
      bm.addEventListener('chargingchange', updateChargingInfo)
    } catch (e) {}
  }
})

const appBackgroundStyle = computed(() => {
  if (appearance.value.wallpaper) return { backgroundImage: `url(${appearance.value.wallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center' }
  return { background: 'var(--bg-color)' }
})
</script>

<style scoped>
.system-status-bar { position: relative; flex-shrink: 0; height: calc(env(safe-area-inset-top, 30px) + 15px); min-height: 45px; display: flex; justify-content: space-between; align-items: center; padding: 0 25px; z-index: 999999; background: transparent; transition: 0.3s; }
.workspace-container { flex: 1; position: relative; width: 100%; overflow: hidden; display: flex; flex-direction: column; }
.status-left { font-size: 14px; font-weight: 700; color: #333; text-shadow: 0 1px 3px rgba(255,255,255,0.5); }
.status-center { position: absolute; left: 50%; transform: translateX(-50%); z-index: 1000000; }
.status-right { display: flex; align-items: center; color: #333; text-shadow: 0 1px 3px rgba(255,255,255,0.5); position: relative; }
.battery-wrapper { display: flex; align-items: center; }
.battery-body { width: 22px; height: 11px; border: 1px solid rgba(0,0,0,0.4); border-radius: 4px; padding: 1px; box-sizing: border-box; }
.battery-level { height: 100%; border-radius: 2px; transition: width 0.3s, background-color 0.3s; }
.battery-cap { width: 2px; height: 4px; background: rgba(0,0,0,0.4); border-radius: 0 2px 2px 0; }

.screens-wrapper { flex: 1; display: flex; overflow-x: auto; overflow-y: hidden; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; scrollbar-width: none; transition: filter 0.3s; }
.screens-wrapper.blur-bg { filter: blur(5px); transform: scale(0.98); }
.screens-wrapper::-webkit-scrollbar { display: none; }
.screen { min-width: 100%; height: 100%; scroll-snap-align: start; }

.desktop-grid { display: grid; grid-template-columns: repeat(4, 1fr); grid-auto-rows: 76px; gap: 15px 12px; padding: 0px 20px 36px; align-content: start; height: 100%; box-sizing: border-box; }
.size-1x1 { grid-column: span 1; grid-row: span 1; }
.size-2x1 { grid-column: span 2; grid-row: span 1; }
.size-2x2 { grid-column: span 2; grid-row: span 2; }
.size-4x1 { grid-column: span 4; grid-row: span 1; }
.size-4x2 { grid-column: span 4; grid-row: span 2; }
.grid-item { position: relative; }

.app-item-wrapper { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; height: 100%; cursor: pointer; width: 100%; }
.app-icon-box { width: 54px; height: 54px; border-radius: 18px !important; display: flex; justify-content: center; align-items: center; background-size: cover; background-position: center; flex-shrink: 0; }
.app-name-label { font-size: 11px; color: #555; font-weight: 600; margin-top: 5px; text-shadow: 0 1px 2px rgba(255,255,255,0.6); white-space: nowrap; text-align: center; width: 100%; overflow: hidden; text-overflow: ellipsis; }

@keyframes wiggle { 0% { transform: rotate(-1.5deg); } 50% { transform: rotate(1.5deg); } 100% { transform: rotate(-1.5deg); } }
.is-wiggle { animation: wiggle 0.3s infinite ease-in-out alternate; transform-origin: center center; }

.remove-badge { position: absolute; top: -6px; left: -6px; width: 22px; height: 22px; background: rgba(255, 59, 48, 0.95); color: #fff; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-size: 12px; z-index: 20; box-shadow: 0 2px 8px rgba(0,0,0,0.2); cursor: pointer; border: 1.5px solid #fff; }
.edit-done-btn { position: absolute; top: 10px; right: 20px; padding: 8px 16px; font-size: 13px; font-weight: 600; color: var(--text-main); z-index: 50; cursor: pointer; border-radius: 20px; }
.ghost-item { opacity: 0.3; transform: scale(0.95); }

.widget-wrap { position: relative; width: 100%; height: 100%; cursor: pointer; }
.widget-wrap:active { transform: scale(0.98); transition: 0.2s; }
.widget-edit-mask { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.15); border-radius: inherit; display: flex; justify-content: center; align-items: center; z-index: 10; border-radius: 24px; cursor: pointer; }
.edit-btn-glass { background: rgba(255,255,255,0.95); padding: 8px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; color: #333; box-shadow: 0 4px 10px rgba(0,0,0,0.1); pointer-events: none; }

.dock-container { position: absolute; bottom: calc(15px + env(safe-area-inset-bottom, 0px)); left: 20px; right: 20px; height: 70px; z-index: 20; }
.dock { width: 100%; height: 100%; display: flex; justify-content: space-around; align-items: center; padding: 0 10px; border-radius: 35px; }
.dock-item { display: flex; justify-content: center; align-items: center; cursor: pointer; }
.dock-icon { width: 50px; height: 50px; border-radius: 16px !important; margin: 0; }
.edit-dock { width: 100%; height: 100%; border-radius: 35px; display: flex; justify-content: center; align-items: center; font-size: 16px; font-weight: 600; color: #fff; background: rgba(92, 138, 255, 0.85); border: 1px solid rgba(255, 255, 255, 0.3); cursor: pointer; box-shadow: 0 10px 30px rgba(92, 138, 255, 0.3); }

.widget-drawer-mask { position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 100; background: transparent; display: flex; flex-direction: column; justify-content: flex-end; }
.widget-drawer { width: 100%; max-height: 70vh; border-radius: 30px 30px 0 0; padding: 20px 20px calc(20px + env(safe-area-inset-bottom, 0px)); display: flex; flex-direction: column; background: rgba(255,255,255,0.95); box-shadow: 0 -10px 40px rgba(0,0,0,0.1); }
.drawer-header { display: flex; justify-content: space-between; align-items: center; font-size: 16px; font-weight: 700; color: var(--text-main); margin-bottom: 20px; padding: 0 10px; }
.drawer-content { overflow-y: auto; display: flex; flex-direction: column; gap: 15px; padding-bottom: 20px; }

.w-card { padding: 15px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.8); display: flex; flex-direction: column; gap: 12px; }
.w-preview-box { width: 100%; position: relative; display: flex; justify-content: center; align-items: flex-start; overflow: hidden; }
.w-info-bar { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 10px; }
.w-name { font-size: 14px; font-weight: 600; color: var(--text-main); }
.w-size { font-size: 11px; color: var(--text-sub); margin-top: 2px; }
.w-add-btn { background: var(--text-main); color: #fff; padding: 8px 16px; border-radius: 14px; font-size: 12px; font-weight: 600; cursor: pointer; }

.config-modal-mask { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); z-index: 150; display: flex; justify-content: center; align-items: center; padding: 20px; }
.config-modal { width: 300px; padding: 20px; border-radius: 24px; display: flex; flex-direction: column; background: #fff; box-shadow: 0 10px 40px rgba(0,0,0,0.15); }
.config-form { display: flex; flex-direction: column; gap: 12px; }
.config-field { display: flex; flex-direction: column; gap: 4px; }
.config-label { font-size: 12px; color: #666; font-weight: 600; }
.config-input { width: 100%; padding: 10px 12px; border: 1px solid #eee; border-radius: 10px; font-size: 13px; background: #f9f9f9; outline: none; box-sizing: border-box; }
.config-btn { flex: 1; padding: 10px; background: #f4f5f7; border-radius: 10px; font-size: 12px; font-weight: 600; text-align: center; cursor: pointer; color: var(--text-main); border: none; }
.config-btn.active-btn { background: #5c8aff; color: #fff; }
.config-btn-danger { color: #ff3b30; background: #fff3f3; }

.config-actions { display: flex; gap: 10px; margin-top: 20px; }
.config-actions .btn-cancel { flex: 1; padding: 12px; background: #eee; border-radius: 12px; font-weight: 600; color: var(--text-main); border: none; cursor: pointer; }
.config-actions .btn-save { flex: 1; padding: 12px; background: var(--text-main); color: #fff; border-radius: 12px; font-weight: 600; border: none; cursor: pointer; }

.fade-fast-enter-active, .fade-fast-leave-active { transition: opacity 0.15s, transform 0.15s; }
.fade-fast-enter-from, .fade-fast-leave-to { opacity: 0; transform: translateY(10px); }

.sys-toast { position: absolute; top: 10px; left: 20px; right: 20px; padding: 15px 20px; border-radius: 16px; font-size: 13px; font-weight: 600; color: var(--text-main); text-align: center; z-index: 999998; box-shadow: 0 10px 30px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; }
.slide-down-toast-enter-active, .slide-down-toast-leave-active { transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-down-toast-enter-from, .slide-down-toast-leave-to { transform: translateY(-20px) scale(0.95); opacity: 0; }
</style>
