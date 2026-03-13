<template>
  <div class="meeting-card-wrapper" :class="{'is-user': msg.role === 'user'}">
    
    <div class="avatar-box" :style="avatar ? `background-image: url(${avatar})` : ''">
      <span v-if="!avatar">{{ name.charAt(0) }}</span>
    </div>

    <div class="meeting-card glass-card">
      <div class="card-header">
        <span class="card-name">{{ name }}</span>
      </div>
      
      <!-- 解析后的思维链与正文区 -->
      <div v-if="msg.content">
        <!-- 思维链折叠区 -->
        <div v-if="parsedMessage.thinking" class="thinking-block">
           <div class="thinking-header" @click="isThinkExpanded = !isThinkExpanded">
             <span><i class="fas fa-brain"></i> 潜意识运算中...</span>
             <i :class="isThinkExpanded ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
           </div>
           <div class="thinking-body" v-show="isThinkExpanded">
             {{ parsedMessage.thinking }}
           </div>
        </div>
        <!-- 正常正文区 -->
        <div class="card-content" v-if="parsedMessage.content">
          {{ parsedMessage.content }}
        </div>
      </div>
      
      <div class="card-content" v-else-if="msg.status === 'waiting'">
        <i class="fas fa-circle-notch fa-spin" style="color: #888;"></i> 正在构思...
      </div>

      <div class="card-footer">
        <span class="footer-item"><i class="fas fa-hashtag"></i> {{ msg.floor }}</span>
        <span class="footer-item"><i class="far fa-clock"></i> {{ formatTime(msg.timestamp) }}</span>
        <span class="footer-item" v-if="msg.tokens"><i class="fas fa-coins"></i> {{ msg.tokens }} tk</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  msg: Object,
  avatar: String,
  name: String
})

const isThinkExpanded = ref(false)

// 正则解析 <thinking> 标签
const parsedMessage = computed(() => {
  const text = props.msg.content || ''
  const thinkMatch = text.match(/<thinking>([\s\S]*?)<\/thinking>/i)
  if (thinkMatch) {
    return {
      thinking: thinkMatch[1].trim(),
      content: text.replace(/<thinking>[\s\S]*?<\/thinking>/i, '').trim()
    }
  }
  return { thinking: null, content: text }
})

const formatTime = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}
</script>

<style scoped>
.meeting-card-wrapper { display: flex; flex-direction: column; align-items: center; margin-bottom: 30px; width: 100%; padding: 0 10px; box-sizing: border-box; }
.avatar-box { width: 50px; height: 50px; border-radius: 50%; background: var(--text-main); color: #fff; display: flex; justify-content: center; align-items: center; font-size: 18px; font-weight: 600; background-size: cover; background-position: center; border: 3px solid rgba(255,255,255,0.8); box-shadow: 0 5px 15px rgba(0,0,0,0.1); z-index: 2; margin-bottom: -25px; }
.glass-card { width: 100%; max-width: 600px; background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border-radius: 16px; padding: 35px 20px 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: 1px solid rgba(255,255,255,0.5); box-sizing: border-box; }
.is-user .glass-card { background: rgba(238, 242, 255, 0.85); border: 1px solid rgba(92, 138, 255, 0.2); }
.card-header { text-align: center; margin-bottom: 10px; }
.card-name { font-size: 14px; font-weight: 700; color: #333; }
.card-content { font-size: 15px; line-height: 1.8; color: #222; white-space: pre-wrap; word-wrap: break-word; }

/* 思考链样式 */
.thinking-block { margin-bottom: 15px; background: rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.05); border-radius: 8px; overflow: hidden; }
.thinking-header { padding: 8px 12px; font-size: 12px; color: #888; display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none; }
.thinking-body { padding: 0 12px 12px; font-size: 13px; color: #666; line-height: 1.6; white-space: pre-wrap; max-height: 200px; overflow-y: auto; border-top: 1px dashed rgba(0,0,0,0.05); margin-top: 5px; padding-top: 10px; }

.card-footer { display: flex; justify-content: space-between; margin-top: 15px; padding-top: 10px; border-top: 1px dashed rgba(0,0,0,0.1); }
.footer-item { font-size: 11px; color: #888; display: flex; align-items: center; gap: 4px; }
</style>

