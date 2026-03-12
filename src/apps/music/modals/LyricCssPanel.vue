<template>
  <transition name="slide-up">
    <div v-if="show" class="app-window" style="z-index: 200; background: var(--bg-color); display:flex; flex-direction:column;">
      
      <!-- 实时注入用户自定义的 CSS -->
      <component :is="'style'">{{ musicState.customLyricCss }}</component>

      <div class="app-header" style="background: #fff; border-bottom: 1px solid #eee;">
        <div class="btn-back" @click="$emit('close')">
          <i class="fas fa-chevron-down"></i>
        </div>
        <div class="app-title">歌词卡片样式</div>
        <div class="header-right"></div>
      </div>

      <div class="css-panel-content">
        <!-- 实时预览区 (复刻聊天室结构，确保 CSS 选择器生效) -->
        <div class="preview-area">
          <div class="preview-title">实时预览</div>
          <div class="chat-area-mock">
            <div class="msg-row is-user">
              <div class="msg-avatar" style="background: var(--accent-color); color:#fff;">U</div>
              <div class="msg-content-wrapper" style="align-items: flex-end;">
                <!-- 复刻歌词气泡的 DOM 结构 -->
                <div class="msg-bubble is-lyric">
                  <i class="fas fa-quote-left" style="opacity:0.3; font-size:18px; margin-bottom:5px; display:block;"></i>
                  <div class="lrc-text">就算大雨让这座城市颠倒</div>
                  <div class="lrc-song">—— 《小情歌》</div>
                  <div class="lrc-user-desc">这句歌词让我想起了你...</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 操作区 -->
        <div class="ctrl-area">
          <div class="ctrl-header">
            <div style="font-weight:600; font-size:13px;">自定义 CSS 代码</div>
            <div class="icon-btns">
              <i class="fas fa-trash" style="color:#ff5252;" @click="deletePreset" title="删除当前预设"></i>
              <i class="fas fa-file-export" style="color:#5c8aff;" @click="exportCss" title="导出配置"></i>
              <i class="fas fa-file-import" style="color:#1dd1a1;" @click="importCss" title="导入配置"></i>
            </div>
          </div>

          <div class="preset-row">
            <select class="preset-select" v-model="selectedPresetId" @change="applyPreset">
              <option value="">-- 选择预设 / 默认 --</option>
              <option v-for="p in musicState.lyricCssPresets" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
            <button class="btn-save" @click="saveAsPreset">保存预设</button>
          </div>

          <textarea 
            class="css-editor" 
            v-model="musicState.customLyricCss" 
            placeholder="/* 在此编写 CSS */&#10;.msg-bubble.is-lyric {&#10;  background: #fdfdfd;&#10;  border-radius: 8px;&#10;}&#10;.lrc-text { color: #333; }"
          ></textarea>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref } from 'vue'
import { useMusic } from '@/composables/useMusic'

defineProps({ show: Boolean })
defineEmits(['close'])

const { musicState } = useMusic()
const selectedPresetId = ref('')

const applyPreset = () => {
  if (!selectedPresetId.value) return
  const preset = musicState.lyricCssPresets.find(p => p.id === selectedPresetId.value)
  if (preset) {
    musicState.customLyricCss = preset.css
  }
}

const saveAsPreset = () => {
  if (!musicState.customLyricCss.trim()) return alert('CSS 为空，无法保存')
  const name = prompt('为这套歌词样式起个名字：', '精美卡片')
  if (name) {
    const newPreset = { id: Date.now(), name, css: musicState.customLyricCss }
    musicState.lyricCssPresets.push(newPreset)
    selectedPresetId.value = newPreset.id
    window.dispatchEvent(new CustomEvent('sys-toast', { detail: '预设已保存' }))
  }
}

const deletePreset = () => {
  if (!selectedPresetId.value) return alert('请先从下拉框选择一个预设')
  if (confirm('确定删除这个预设吗？')) {
    musicState.lyricCssPresets = musicState.lyricCssPresets.filter(p => p.id !== selectedPresetId.value)
    selectedPresetId.value = ''
    musicState.customLyricCss = ''
  }
}

const exportCss = () => {
  const exportData = {
    type: 'aero_lyric_css',
    css: musicState.customLyricCss
  }
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `lyric-css-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const importCss = () => {
  const cssInput = prompt('请粘贴 JSON 格式的导出数据或纯 CSS 代码：')
  if (!cssInput) return
  try {
    const parsed = JSON.parse(cssInput)
    if (parsed.type === 'aero_lyric_css' && parsed.css) {
      musicState.customLyricCss = parsed.css
    } else {
      musicState.customLyricCss = cssInput
    }
  } catch (e) {
    // 如果不是 JSON，直接当作纯 CSS 处理
    musicState.customLyricCss = cssInput
  }
}
</script>

<style scoped>
.css-panel-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-color);
  overflow-y: auto;
}

.preview-area {
  background: #eef2f5;
  padding: 20px;
  border-bottom: 1px solid #ddd;
}

.preview-title {
  font-size: 11px;
  color: #888;
  margin-bottom: 10px;
  font-weight: 600;
}

.chat-area-mock {
  display: flex;
  flex-direction: column;
}

.msg-row { display: flex; width: 100%; gap: 10px; }
.msg-row.is-user { flex-direction: row-reverse; }
.msg-avatar { width: 36px; height: 36px; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-weight: bold; flex-shrink: 0; }
.msg-content-wrapper { display: flex; flex-direction: column; max-width: 75%; }

/* 基础歌词气泡垫底样式，防止用户 CSS 为空时错乱 */
.msg-bubble.is-lyric { 
  background: #fdfdfd; 
  color: #555; 
  border: 1px solid #eee;
  padding: 12px 15px; 
  border-radius: 8px; 
  box-shadow: 0 2px 10px rgba(0,0,0,0.03); 
  text-align: left;
}
.lrc-text { font-size: 14px; font-style: italic; font-weight: 600; margin-bottom: 6px; }
.lrc-song { font-size: 11px; color: #888; margin-bottom: 6px; }
.lrc-user-desc { font-size: 12px; padding-top: 8px; border-top: 1px dashed #eee; color: #333; }

.ctrl-area {
  padding: 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 15px;
  background: #fff;
}

.ctrl-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.icon-btns {
  display: flex;
  gap: 15px;
  font-size: 14px;
}
.icon-btns i { cursor: pointer; transition: 0.2s; }
.icon-btns i:active { transform: scale(0.8); }

.preset-row {
  display: flex;
  gap: 10px;
}

.preset-select {
  flex: 1;
  background: #f4f5f7;
  border: none;
  padding: 10px;
  border-radius: 8px;
  font-size: 13px;
  outline: none;
}

.btn-save {
  background: var(--text-main);
  color: #fff;
  border: none;
  padding: 0 15px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.css-editor {
  flex: 1;
  min-height: 200px;
  background: #282c34;
  color: #abb2bf;
  font-family: monospace;
  font-size: 12px;
  padding: 15px;
  border-radius: 12px;
  border: none;
  outline: none;
  resize: none;
  line-height: 1.5;
}
</style>
