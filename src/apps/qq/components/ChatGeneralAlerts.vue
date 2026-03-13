<template>
  <div class="ios-alert-mask" v-if="!!apiErrorDetails" @click.self="$emit('update:apiErrorDetails', null)">
    <div class="ios-alert">
      <div class="ios-alert-title" style="color:#ff5252; padding-top:20px;">
        <i class="fas fa-bug"></i> AI 核心过载
      </div>
      <div class="ios-alert-desc">大模型接口抛出了异常，回复中断。</div>
      <div style="padding: 0 15px 15px;">
        <textarea readonly class="error-textarea">{{ apiErrorDetails }}</textarea>
      </div>
      <div class="ios-alert-actions">
        <div class="ios-alert-btn" @click="$emit('copy-error')">复制信息</div>
        <div class="ios-alert-btn bold" @click="$emit('update:apiErrorDetails', null)">关闭</div>
      </div>
    </div>
  </div>

  <div class="ios-alert-mask" v-if="alert.show" @click.self="$emit('close-alert')">
    <div class="ios-alert">
      <i v-if="alert.type === 'receive_transfer'" class="fas fa-exchange-alt transfer-icon-large"></i>
      <div class="ios-alert-title">{{ alert.title }}</div>
      
      <div class="ios-alert-desc" v-if="alert.type === 'view_recall'">{{ alert.desc }}</div>
      <div class="ios-alert-desc" v-else-if="alert.desc" style="white-space: pre-wrap; font-size: 14px;">{{ alert.desc }}</div>
      
      <div class="ios-alert-inputs" v-if="alert.inputs">
        <input v-for="(inp, i) in alert.inputs" :key="i" class="ios-alert-input" v-model="inp.value" :placeholder="inp.placeholder" :type="inp.type || 'text'" />
      </div>
      
      <div class="ios-alert-actions">
        <template v-if="alert.type === 'view_recall'">
          <div class="ios-alert-btn bold" style="width:100%; border:none;" @click="$emit('close-alert')">我知道了</div>
        </template>
        <template v-else-if="alert.type === 'receive_transfer'">
          <div class="ios-alert-btn" @click="$emit('close-alert')">取消</div>
          <div class="ios-alert-btn danger" @click="$emit('confirm-transfer', 'reject')">退回</div>
          <div class="ios-alert-btn bold" @click="$emit('confirm-transfer', 'accept')">领取</div>
        </template>
        <template v-else>
          <div class="ios-alert-btn" @click="$emit('close-alert')">取消</div>
          <div class="ios-alert-btn bold" @click="$emit('confirm-general')">确认发送</div>
        </template>
      </div>
    </div>
  </div>

  <div class="ios-alert-mask" v-if="pendingAutoSummary !== null" @click.self="$emit('update:pendingAutoSummary', null)">
    <div class="ios-alert" style="width: 320px; max-width:90%;">
      <div class="ios-alert-title" style="padding-bottom:15px; padding-top:20px;">自动总结已生成</div>
      <div style="padding: 0 15px 15px;">
        <textarea :value="pendingAutoSummary" @input="$emit('update:pendingAutoSummary', $event.target.value)" style="width:100%; height:180px; padding:10px; font-size:13px; border:1px solid rgba(0,0,0,0.1); border-radius:8px; resize:none; outline:none; text-align:left; line-height:1.5; box-sizing:border-box; background:rgba(0,0,0,0.02);"></textarea>
      </div>
      <div class="ios-alert-actions">
        <div class="ios-alert-btn" @click="$emit('update:pendingAutoSummary', null)">忽略</div>
        <div class="ios-alert-btn bold" @click="$emit('confirm-summary')">确认归档</div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  apiErrorDetails: String,
  alert: Object,
  pendingAutoSummary: String,
  chatTitle: String
})
defineEmits([
  'update:apiErrorDetails',
  'update:pendingAutoSummary',
  'close-alert',
  'copy-error',
  'confirm-transfer',
  'confirm-general',
  'confirm-summary'
])
</script>

<style scoped>
.ios-alert-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 999999; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(5px); }
.ios-alert { background: rgba(255,255,255,0.95); width: 280px; border-radius: 18px; text-align: center; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
.ios-alert-title { font-size: 16px; font-weight: 600; padding: 20px 20px 5px; color: #000; }
.ios-alert-desc { font-size: 13px; color: #555; padding: 0 20px 15px; }
.ios-alert-inputs { padding: 0 15px 15px; display: flex; flex-direction: column; gap: 8px; }
.ios-alert-input { width: 100%; box-sizing: border-box; background: rgba(0,0,0,0.05); border: 1px solid rgba(0,0,0,0.1); border-radius: 8px; padding: 10px; font-size: 13px; outline: none; }
.ios-alert-actions { display: flex; border-top: 1px solid rgba(0,0,0,0.1); }
.ios-alert-btn { flex: 1; padding: 12px 0; font-size: 16px; color: #007aff; cursor: pointer; border-right: 1px solid rgba(0,0,0,0.1); }
.ios-alert-btn:last-child { border-right: none; }
.ios-alert-btn:active { background: rgba(0,0,0,0.05); }
.ios-alert-btn.bold { font-weight: 600; }
.ios-alert-btn.danger { color: #ff3b30; }
.error-textarea { width: 100%; height: 150px; background: rgba(0,0,0,0.05); border: 1px solid rgba(0,0,0,0.1); border-radius: 8px; padding: 10px; font-size: 12px; color: #ff5252; outline: none; resize: none; font-family: monospace; }
</style>
