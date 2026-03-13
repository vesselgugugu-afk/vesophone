<template>
  <transition name="slide-up">
    <div v-if="show" class="app-window" style="z-index: 40; background: var(--bg-color);">
      <div class="app-header">
        <div class="btn-back" @click="$emit('close')">返回</div>
        <div class="app-title">外观与桌面工坊</div>
        <div class="header-right"></div>
      </div>

      <div class="editor-tabs" style="margin-top:0; padding-top:10px; background:#fff; overflow-x:auto;">
        <div :class="['editor-tab', { active: activeTab === 'ui' }]" style="white-space:nowrap;" @click="activeTab = 'ui'">壁纸</div>
        <div :class="['editor-tab', { active: activeTab === 'icons' }]" style="white-space:nowrap;" @click="activeTab = 'icons'">应用改名</div>
        <div :class="['editor-tab', { active: activeTab === 'widgets' }]" style="white-space:nowrap;" @click="activeTab = 'widgets'">组件工坊</div>
        <div :class="['editor-tab', { active: activeTab === 'css' }]" style="white-space:nowrap;" @click="activeTab = 'css'">全局CSS</div>
      </div>

      <input type="file" ref="fileInput" accept="image/*" style="display:none;" @change="handleFileChange" />

      <div class="content-area" v-if="activeTab === 'ui'">
        <div class="appearance-section">
          <div class="appearance-title">全局壁纸</div>
          <div class="appearance-item">
            <div class="appearance-label">桌面背景图</div>
            <div class="appearance-actions">
              <div class="appearance-img-btn" :style="{ backgroundImage: `url(${appearance.wallpaper})` }" @click="triggerUrlInput('wallpaper')">URL</div>
              <div class="appearance-btn" @click="triggerFileUpload('wallpaper')">本地上传</div>
              <div class="appearance-btn" @click="clearImage('wallpaper')">清除</div>
            </div>
          </div>
        </div>
        <div style="font-size:12px; color:#888; text-align:center; padding:20px 0;">
          提示：桌面小组件的独立图片和文字，请在桌面长按进入编辑模式后，点击小组件本体进行配置。
        </div>
      </div>

      <div class="content-area" v-if="activeTab === 'icons'">
        <div class="appearance-section">
          <div class="appearance-title">主屏应用深度定制</div>
          <div style="font-size:11px; color:#888; margin-bottom:12px; line-height:1.5;">在此修改桌面图标及应用下方显示的名称。长按桌面图标进入编辑模式可以自由排版！</div>
          <div class="appearance-item" v-for="app in desktopApps" :key="app.id" style="flex-direction:column; align-items:flex-start; gap:10px;">
            <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
              <div style="display:flex; align-items:center; gap:8px; flex:1;">
                <div class="appearance-img-btn" style="width:36px; height:36px; border-radius:10px;" :style="{ backgroundImage: `url(${app.icon || appearance.icons[app.appId]})` }"></div>
                <input type="text" v-model="app.name" @input="updateAppInfo(app.id, app.name, undefined)" style="border:1px solid #eee; padding:6px 10px; border-radius:8px; font-size:12px; outline:none; flex:1;"/>
              </div>
              <div class="appearance-actions" style="margin-left:10px;">
                <div class="appearance-btn" @click="triggerAppFileUpload(app.id)">上传</div>
                <div class="appearance-btn" @click="clearAppImage(app.id)">清除</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="content-area" v-if="activeTab === 'widgets'">
        <div style="display:flex; gap:10px; margin-bottom:15px;">
          <button class="btn-confirm" style="flex:1; padding:10px; font-size:13px;" @click="openWidgetCreator"><i class="fas fa-plus"></i> 制作新组件</button>
          <button class="btn-cancel" style="padding:10px; font-size:13px;" @click="exportCustomWidgets"><i class="fas fa-download"></i> 导出</button>
          <button class="btn-cancel" style="padding:10px; font-size:13px;" @click="triggerWidgetImport"><i class="fas fa-file-import"></i> 导入</button>
        </div>

        <div class="appearance-section" v-if="customWidgetLibrary.length === 0">
          <div style="font-size:12px; color:#888; text-align:center; padding:20px 0;">您还没有创造任何自定义小组件。</div>
        </div>

        <div class="appearance-section" v-for="w in customWidgetLibrary" :key="w.id" style="padding:10px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-size:14px; font-weight:600; color:var(--text-main);">{{ w.name }}</div>
              <div style="font-size:11px; color:#888; margin-top:2px;">尺寸: {{ w.size }}</div>
            </div>
            <div style="color:#ff3b30; padding:10px; cursor:pointer;" @click="removeCustomWidget(w.id)"><i class="fas fa-trash"></i></div>
          </div>
        </div>
      </div>

      <div class="content-area" v-if="activeTab === 'css'">
        <div class="appearance-section" style="height:100%;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div class="appearance-title" style="border:none; padding:0;">全局 CSS 编辑器</div>
            <div style="display:flex; gap:6px;">
              <select style="background:#f4f5f7; border:none; padding:4px; font-size:11px; border-radius:6px; outline:none;" @change="applyCssPreset($event.target.value)">
                <option value="">加载预设...</option>
                <option v-for="p in cssPresets" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
            </div>
          </div>
          <textarea v-model="appearance.globalCss" style="flex:1; width:100%; min-height:250px; background:#282c34; color:#abb2bf; font-family:monospace; font-size:12px; padding:12px; border-radius:10px; border:none; outline:none; resize:none;" placeholder="在此处编写全局影响的 CSS 代码..."></textarea>
          <div style="display:flex; gap:10px; margin-top:10px;">
            <button class="btn-send" style="flex:1; padding:10px; border-radius:10px;" @click="handleSavePreset">保存为预设</button>
            <button class="btn-cancel" style="flex:1; padding:10px; border-radius:10px;" @click="exportCssPresets">导出配置</button>
          </div>
        </div>
      </div>

      <!-- 创作弹窗 -->
      <transition name="fade">
        <div v-if="showWidgetCreator" class="diy-modal-mask">
          <div class="diy-modal glass">
            <h3 style="font-size:16px; margin-bottom:15px; text-align:center;">创造自定义组件</h3>
            
            <div style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:12px; padding-right:5px;">
              <div>
                <label style="font-size:12px; color:#666;">组件名称</label>
                <input class="modal-input" v-model="draftWidget.name" placeholder="起个名字吧" />
              </div>
              
              <div style="display:flex; gap:10px;">
                <div style="flex:1;">
                  <label style="font-size:12px; color:#666;">占用尺寸</label>
                  <select class="modal-input" v-model="draftWidget.size">
                    <option value="1x1">1x1 (最小)</option>
                    <option value="2x1">2x1 (长条)</option>
                    <option value="2x2">2x2 (中方块)</option>
                    <option value="4x1">4x1 (横幅)</option>
                    <option value="4x2">4x2 (大卡片)</option>
                  </select>
                </div>
                <div style="flex:1;">
                  <label style="font-size:12px; color:#666;">点击动作 (可选)</label>
                  <select class="modal-input" v-model="draftWidget.props.clickAction">
                    <option value="">无动作</option>
                    <option value="app:qq">打开 QQ</option>
                    <option value="app:music">打开 音乐</option>
                    <option value="app:worldbook">打开 世界书</option>
                    <option value="app:storage">打开 文件管理</option>
                  </select>
                </div>
              </div>

              <div>
                <label style="font-size:12px; color:#666;">实时预览</label>
                <div style="margin-top:6px; padding:15px; background:repeating-linear-gradient(45deg, #f4f5f7, #f4f5f7 10px, #fff 10px, #fff 20px); border-radius:16px; display:flex; justify-content:center; align-items:center; overflow:hidden;" :style="{ height: getPreviewStyle(draftWidget.size).containerHeight }">
                  <div style="position:relative;" :style="getPreviewStyle(draftWidget.size).style">
                    <DesktopWidgets :item="draftWidget" />
                  </div>
                </div>
              </div>

              <div>
                <label style="font-size:12px; color:#666;">HTML 模板 (支持 {title}, {desc}, {bgImage}, {avatar}, {time}, {date})</label>
                <textarea class="modal-textarea" v-model="draftWidget.templateHtml" style="height:100px; font-family:monospace; font-size:11px;" placeholder="在此编写HTML"></textarea>
              </div>
              
              <div>
                <label style="font-size:12px; color:#666;">CSS 样式 (自动作用域隔离)</label>
                <textarea class="modal-textarea" v-model="draftWidget.templateCss" style="height:80px; font-family:monospace; font-size:11px;" placeholder="直接写CSS即可，绝对不会影响全局"></textarea>
              </div>
            </div>

            <div class="modal-actions" style="margin-top:15px;">
              <button class="btn-cancel" @click="showWidgetCreator = false">取消</button>
              <button class="btn-confirm" @click="saveCustomWidget">保存组件</button>
            </div>
          </div>
        </div>
      </transition>

    </div>
  </transition>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAppearance } from '@/composables/useAppearance'
import { useDesktop } from '@/composables/useDesktop'
import DesktopWidgets from '@/components/DesktopWidgets.vue'

defineProps({ show: Boolean })
defineEmits(['close'])

const { appearance, cssPresets, saveCssPreset, exportCssPresets } = useAppearance()
const { getDesktopApps, updateAppInfo, customWidgetLibrary, addCustomWidget, removeCustomWidget, exportCustomWidgets, importCustomWidgets } = useDesktop()

const desktopApps = computed(() => getDesktopApps())

const activeTab = ref('ui')
const fileInput = ref(null)
let currentUploadTarget = ''
let isAppUpload = false 

// 图像极限压缩引擎
const compressImage = (base64Str, maxWidth = 800) => {
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
      resolve(canvas.toDataURL('image/jpeg', 0.8))
    }
  })
}

const setTargetValue = (targetPath, value) => {
  const parts = targetPath.split('.')
  if (parts.length === 1) appearance.value[parts[0]] = value
  else if (parts.length === 2) appearance.value[parts[0]][parts[1]] = value
}
const triggerUrlInput = (targetPath) => { const url = prompt('请输入绝对 URL：'); if (url) setTargetValue(targetPath, url) }
const triggerFileUpload = (targetPath) => { isAppUpload = false; currentUploadTarget = targetPath; fileInput.value.click() }
const triggerAppFileUpload = (appId) => { isAppUpload = true; currentUploadTarget = appId; fileInput.value.click() }
const clearImage = (targetPath) => setTargetValue(targetPath, '')
const clearAppImage = (appId) => updateAppInfo(appId, undefined, '')

const handleFileChange = (e) => {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = async (ev) => {
    const compressed = await compressImage(ev.target.result, 800) // 全局压缩
    if (isAppUpload) updateAppInfo(currentUploadTarget, undefined, compressed)
    else setTargetValue(currentUploadTarget, compressed)
    fileInput.value.value = ''
  }
  reader.readAsDataURL(file)
}
const applyCssPreset = (pid) => { const preset = cssPresets.value.find(p => p.id === Number(pid)); if (preset) appearance.value.globalCss = preset.css }
const handleSavePreset = () => { if (!appearance.value.globalCss.trim()) return; const name = prompt('起个名字：', '全局美化1'); if (name) { saveCssPreset(name, appearance.value.globalCss); alert('成功！') } }

const showWidgetCreator = ref(false)
const draftWidget = ref(null)

const openWidgetCreator = () => {
  draftWidget.value = {
    component: 'diy_html',
    name: '快捷开启音乐',
    size: '4x1',
    templateHtml: '<div class="glass" style="width:100%; height:100%; padding:0 20px; display:flex; justify-content:space-between; align-items:center; background-image:url(\'{bgImage}\'); background-size:cover; border-radius:30px;">\n  <div style="font-size:18px; font-weight:800; color:#333;">{title}</div>\n  <div style="font-size:24px; color:#5c8aff;"><i class="fas fa-play-circle"></i></div>\n</div>',
    templateCss: '/* 自动作用域隔离，写在这里的CSS很安全 */\ndiv { }',
    props: { title: 'Play Music', desc: '', bgImage: '', clickAction: 'app:music' }
  }
  showWidgetCreator.value = true
}

const saveCustomWidget = () => {
  if(!draftWidget.value.name) return alert('请输入名称')
  addCustomWidget({
    name: draftWidget.value.name,
    size: draftWidget.value.size,
    templateHtml: draftWidget.value.templateHtml,
    templateCss: draftWidget.value.templateCss,
    props: { clickAction: draftWidget.value.props.clickAction || '' }
  })
  showWidgetCreator.value = false
}

const triggerWidgetImport = () => {
  const str = prompt('请粘贴 JSON 配置数据：')
  if(str) {
    if(importCustomWidgets(str)) alert('导入成功！您可以去桌面添加它了。')
    else alert('解析失败，请检查 JSON 格式')
  }
}

const getPreviewStyle = (size) => {
  const map = {
    '1x1': { w: 76, h: 76, scale: 0.8, ch: '90px' },
    '2x1': { w: 164, h: 76, scale: 0.8, ch: '90px' },
    '2x2': { w: 164, h: 164, scale: 0.5, ch: '110px' },
    '4x1': { w: 340, h: 76, scale: 0.45, ch: '60px' },
    '4x2': { w: 340, h: 164, scale: 0.4, ch: '100px' }
  }
  const s = map[size] || map['2x2']
  return {
    style: { width: `${s.w}px`, height: `${s.h}px`, transform: `scale(${s.scale})`, transformOrigin: 'center center' },
    containerHeight: s.ch
  }
}
</script>

<style scoped>
.diy-modal-mask { position: absolute; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; justify-content: center; align-items: center; padding: 20px; }
.diy-modal { width: 100%; max-height: 85vh; background: #fff; border-radius: 24px; padding: 20px; display: flex; flex-direction: column; }
.modal-input { width: 100%; padding: 10px 12px; border: 1px solid #eee; border-radius: 10px; font-size: 13px; outline: none; margin-top: 4px; background:#f9f9f9; }
.modal-textarea { width: 100%; padding: 10px 12px; border: 1px solid #eee; border-radius: 10px; font-size: 13px; outline: none; margin-top: 4px; background:#f9f9f9; resize: none; }
</style>
