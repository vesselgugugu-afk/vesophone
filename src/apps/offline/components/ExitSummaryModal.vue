<template>
  <div class="ios-alert-mask" v-if="show" @click.self="!isSummarizing && $emit('cancel')">
    <div class="ios-alert" style="width: 320px; max-width:90%;">
      
      <div class="ios-alert-title" style="padding-bottom:15px; padding-top:20px;">
         {{ isSummarizing ? '正在凝结记忆...' : '确认并归档记忆' }}
      </div>
      
      <div style="padding: 0 15px 15px;">
        <!-- 加载动画 -->
        <div v-if="isSummarizing" style="height: 150px; display:flex; flex-direction:column; justify-content:center; align-items:center; gap: 15px;">
          <i class="fas fa-spinner fa-spin" style="font-size:30px; color:#5c8aff;"></i>
          <span style="font-size:12px; color:#888;">AI 正在将刚才的经历写成日记...</span>
        </div>
        <!-- 确认编辑框 -->
        <textarea v-else v-model="localText" style="width:100%; height:180px; padding:10px; font-size:13px; border:1px solid rgba(0,0,0,0.1); border-radius:8px; resize:none; outline:none; text-align:left; line-height:1.5; box-sizing:border-box; background:rgba(0,0,0,0.02);"></textarea>
      </div>

      <div class="ios-alert-actions" v-if="!isSummarizing">
        <div class="ios-alert-btn" @click="$emit('cancel')">取消退出</div>
        <div class="ios-alert-btn bold" @click="$emit('confirm', localText)">保存并离开</div>
      </div>
      
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  show: Boolean,
  isSummarizing: Boolean,
  summaryText: String
})

const emit = defineEmits(['cancel', 'confirm'])
const localText = ref('')

watch(() => props.summaryText, (val) => {
  localText.value = val
})
</script>

<style scoped>
.ios-alert-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 999999; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(5px); }
.ios-alert { background: rgba(255,255,255,0.95); border-radius: 18px; text-align: center; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
.ios-alert-title { font-size: 16px; font-weight: 600; color: #000; }
.ios-alert-actions { display: flex; border-top: 1px solid rgba(0,0,0,0.1); }
.ios-alert-btn { flex: 1; padding: 12px 0; font-size: 15px; color: #007aff; cursor: pointer; border-right: 1px solid rgba(0,0,0,0.1); }
.ios-alert-btn:last-child { border-right: none; }
.ios-alert-btn:active { background: rgba(0,0,0,0.05); }
.ios-alert-btn.bold { font-weight: 600; }
</style>
