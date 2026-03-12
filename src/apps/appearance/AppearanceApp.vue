<template>
  <transition name="slide-up">
    <div v-if="show" class="app-window" style="z-index: 40; background: var(--bg-color);">
      <div class="app-header">
        <div class="btn-back" @click="$emit('close')">返回</div>
        <div class="app-title">外观设置</div>
        <div class="header-right"></div>
      </div>

      <div class="editor-tabs" style="margin-top:0; padding-top:10px; background:#fff;">
        <div :class="['editor-tab', { active: activeTab === 'ui' }]" @click="activeTab = 'ui'">界面与壁纸</div>
        <div :class="['editor-tab', { active: activeTab === 'icons' }]" @click="activeTab = 'icons'">应用图标</div>
        <div :class="['editor-tab', { active: activeTab === 'css' }]" @click="activeTab = 'css'">全局CSS</div>
      </div>

      <!-- 隐藏的文件上传域，用于共用 -->
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

        <div class="appearance-section">
          <div class="appearance-title">组件图片 (Widgets)</div>
          
          <div class="appearance-item">
            <div class="appearance-label">胶囊左侧小图</div>
            <div class="appearance-actions">
              <div class="appearance-img-btn" :style="{ backgroundImage: `url(${appearance.widgets.capsule})` }" @click="triggerUrlInput('widgets.capsule')">URL</div>
              <div class="appearance-btn" @click="triggerFileUpload('widgets.capsule')">上传</div>
            </div>
          </div>

          <div class="appearance-item">
            <div class="appearance-label">每日记录卡片</div>
            <div class="appearance-actions">
              <div class="appearance-img-btn" :style="{ backgroundImage: `url(${appearance.widgets.customCard})` }" @click="triggerUrlInput('widgets.customCard')">URL</div>
              <div class="appearance-btn" @click="triggerFileUpload('widgets.customCard')">上传</div>
            </div>
          </div>

          <div class="appearance-item">
            <div class="appearance-label">健康卡片</div>
            <div class="appearance-actions">
              <div class="appearance-img-btn" :style="{ backgroundImage: `url(${appearance.widgets.rectCardHealth})` }" @click="triggerUrlInput('widgets.rectCardHealth')">URL</div>
              <div class="appearance-btn" @click="triggerFileUpload('widgets.rectCardHealth')">上传</div>
            </div>
          </div>

          <div class="appearance-item">
            <div class="appearance-label">财务卡片</div>
            <div class="appearance-actions">
              <div class="appearance-img-btn" :style="{ backgroundImage: `url(${appearance.widgets.rectCardFinance})` }" @click="triggerUrlInput('widgets.rectCardFinance')">URL</div>
              <div class="appearance-btn" @click="triggerFileUpload('widgets.rectCardFinance')">上传</div>
            </div>
          </div>

        </div>
      </div>

      <div class="content-area" v-if="activeTab === 'icons'">
        <div class="appearance-section">
          <div class="appearance-title">主屏应用图标</div>
          <div style="font-size:11px; color:#888; margin-bottom:8px;">设置后主页的对应图标将被替换。建议使用正方形图片。</div>
          
          <div class="appearance-item" v-for="key in ['qq', 'worldbook', 'api', 'appearance']" :key="key">
            <div class="appearance-label">{{ getAppName(key) }}</div>
            <div class="appearance-actions">
              <div class="appearance-img-btn" :style="{ backgroundImage: `url(${appearance.icons[key]})` }" @click="triggerUrlInput(`icons.${key}`)">URL</div>
              <div class="appearance-btn" @click="triggerFileUpload(`icons.${key}`)">上传</div>
              <div class="appearance-btn" @click="clearImage(`icons.${key}`)">清除</div>
            </div>
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
            <button class="btn-cancel" style="flex:1; padding:10px; border-radius:10px;" @click="exportCssPresets">导出预设配置</button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref } from 'vue'
import { useAppearance } from '@/composables/useAppearance'

defineProps({ show: Boolean })
defineEmits(['close'])

const { appearance, cssPresets, saveCssPreset, exportCssPresets } = useAppearance()

const activeTab = ref('ui')
const fileInput = ref(null)
let currentUploadTarget = ''

const getAppName = (key) => {
  const names = { qq: 'QQ', worldbook: '世界书', api: 'API', appearance: '外观' }
  return names[key] || key
}

// 通用设值函数，支持通过点路径解析对象 (如 'widgets.capsule')
const setTargetValue = (targetPath, value) => {
  const parts = targetPath.split('.')
  if (parts.length === 1) {
    appearance.value[parts[0]] = value
  } else if (parts.length === 2) {
    appearance.value[parts[0]][parts[1]] = value
  }
}

const triggerUrlInput = (targetPath) => {
  const url = prompt('请输入图片的绝对 URL 地址：')
  if (url) setTargetValue(targetPath, url)
}

const triggerFileUpload = (targetPath) => {
  currentUploadTarget = targetPath
  fileInput.value.click()
}

const clearImage = (targetPath) => {
  setTargetValue(targetPath, '')
}

const handleFileChange = (e) => {
  const file = e.target.files[0]
  if (!file) return
  if (file.size > 2 * 1024 * 1024) {
    alert('图片超过2MB，可能会导致存储失败。')
  }
  const reader = new FileReader()
  reader.onload = (ev) => {
    setTargetValue(currentUploadTarget, ev.target.result)
    fileInput.value.value = ''
  }
  reader.readAsDataURL(file)
}

const applyCssPreset = (pid) => {
  if (!pid) return
  const preset = cssPresets.value.find(p => p.id === Number(pid))
  if (preset) appearance.value.globalCss = preset.css
}

const handleSavePreset = () => {
  if (!appearance.value.globalCss.trim()) return alert('CSS 为空，无法保存')
  const name = prompt('给这个全局 CSS 预设起个名字：', '全局美化1')
  if (name) {
    saveCssPreset(name, appearance.value.globalCss)
    alert('保存成功！')
  }
}
</script>
