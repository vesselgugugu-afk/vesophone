<template>
  <transition name="fade">
    <div v-if="show" class="status-panel-mask" @click.self="$emit('close')">
      <div class="close-btn" @click="$emit('close')">
        <i class="fas fa-times"></i>
      </div>
      
      <div class="status-panel-container">
        <!-- 核心引擎：如果是完整 HTML，拉起 iframe 沙盒隔离渲染 -->
        <iframe 
          v-if="isFullHtml" 
          :srcdoc="renderedHtml" 
          class="status-iframe"
        ></iframe>
        <!-- 如果是普通代码片段，则使用轻量级 DOM 渲染 -->
        <div v-else class="status-content" v-html="renderedHtml"></div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  show: Boolean,
  msg: Object,
  chat: Object
})

defineEmits(['close'])

const buildRegexSafe = (patternStr) => {
  if (!patternStr) return null;
  let flags = '';
  let pattern = patternStr;
  const match = patternStr.match(/^\/(.+)\/([a-z]*)$/s);
  if (match) {
    pattern = match[1];
    flags = match[2].replace('g', '');
  } else if (patternStr.includes('\\\\[')) {
    pattern = pattern.replace(/\\\\/g, '\\');
  }
  return new RegExp(pattern, flags);
}

const renderedHtml = computed(() => {
  if (!props.show || !props.msg || !props.chat) return ''
  
  const settings = props.chat.settings || {}
  
  if (!settings.regexPattern || !settings.replacePattern) {
    return `<div style="color:#aaa; text-align:center; padding:20px; background:rgba(0,0,0,0.5); border-radius:16px;">请先在角色设置中配置正则表达式与 HTML 模板。</div>`
  }

  try {
    const regex = buildRegexSafe(settings.regexPattern);
    const targetText = props.msg.rawStatus || props.msg.content || '';
    const match = targetText.match(regex);
    
    if (match) {
      return match[0].replace(regex, settings.replacePattern)
    } else {
      const safeText = targetText.substring(0, 200).replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<div style="color:#ff5252; text-align:left; padding:20px; background:rgba(0,0,0,0.8); border-radius:16px; font-size: 14px; line-height: 1.5;">
        <div style="font-weight:bold; margin-bottom:8px;">未能匹配到状态。</div>
        <div style="color:#aaa; margin-bottom:4px;">当前消息原文前 200 字:</div>
        <div style="font-family:monospace; background:#222; padding:6px; border-radius:6px; white-space:pre-wrap;">${safeText}</div>
      </div>`
    }
  } catch (e) {
    return `<div style="color:#ff5252; text-align:center; padding:20px; background:rgba(0,0,0,0.5); border-radius:16px;">解析错误:<br>${e.message}</div>`
  }
})

// 沙盒检测器：一旦发现 DOCTYPE，启用绝对隔离
const isFullHtml = computed(() => {
  if (!renderedHtml.value) return false;
  const lower = renderedHtml.value.toLowerCase();
  return lower.includes('<!doctype html>') || lower.includes('<html');
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.status-panel-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  z-index: 999999;
  display: flex;
  justify-content: center;
  align-items: center;
}

.status-panel-container {
  width: 90%;
  max-width: 500px;
  max-height: 85vh;
  overflow-y: auto;
  position: relative;
}

.status-panel-container::-webkit-scrollbar {
  display: none;
}

/* iframe 特殊样式：完美融入无边框 */
.status-iframe {
  width: 100%;
  height: 65vh;
  border: none;
  background: transparent;
  border-radius: 12px;
}

.close-btn {
  position: absolute;
  top: calc(env(safe-area-inset-top, 20px) + 20px);
  right: 20px;
  width: 36px;
  height: 36px;
  background: rgba(255,255,255,0.2);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  z-index: 10;
  box-shadow: 0 4px 10px rgba(0,0,0,0.2);
  border: 1px solid rgba(255,255,255,0.1);
  transition: 0.2s;
}
.close-btn:active {
  background: rgba(255,255,255,0.4);
  transform: scale(0.9);
}

.status-content {
  width: 100%;
}
</style>
