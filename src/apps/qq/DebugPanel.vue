<template>
  <transition name="slide-up">
    <div v-if="show" class="app-window" style="z-index: 100; background: #f4f5f7;">
      
      <div class="app-header" style="background:#fff;">
        <div class="btn-back" @click="$emit('close')">返回</div>
        <div class="app-title">API 调试终端</div>
        <div class="header-right"></div>
      </div>

      <div class="content-area" style="padding:15px; display:flex; flex-direction:column; gap:15px;">
        
        <div v-if="!logData || !logData.req" style="text-align:center; color:#888; font-size:12px; margin-top:50px;">
          暂无调用记录。<br>请在当前对话中让 AI 回复一次后再查看。
        </div>

        <template v-else>
          <!-- 统计概览 -->
          <div style="background:#fff; border-radius:12px; padding:15px; box-shadow:0 2px 10px rgba(0,0,0,0.02); display:flex; justify-content:space-around; text-align:center;">
            <div>
              <div style="font-size:11px; color:#888;">发送消耗预估</div>
              <div style="font-size:18px; font-weight:600; color:#5c8aff;">{{ logData.reqTokens }} <span style="font-size:10px;">Tokens</span></div>
            </div>
            <div style="width:1px; background:#eee;"></div>
            <div>
              <div style="font-size:11px; color:#888;">接收消耗预估</div>
              <div style="font-size:18px; font-weight:600; color:#1dd1a1;">{{ logData.resTokens }} <span style="font-size:10px;">Tokens</span></div>
            </div>
            <div style="width:1px; background:#eee;"></div>
            <div>
              <div style="font-size:11px; color:#888;">最后调用</div>
              <div style="font-size:12px; font-weight:600; color:#333; margin-top:4px;">{{ logData.time }}</div>
            </div>
          </div>

          <!-- 发送的内容 (Request Payload) -->
          <div style="background:#fff; border-radius:12px; padding:15px; box-shadow:0 2px 10px rgba(0,0,0,0.02); flex:1; display:flex; flex-direction:column;">
            <div style="font-weight:600; font-size:13px; margin-bottom:10px; color:#5c8aff;">
              <i class="fas fa-upload"></i> Request Messages
            </div>
            <div style="overflow-y:auto; max-height:250px; background:#282c34; border-radius:8px; padding:10px; display:flex; flex-direction:column; gap:8px;">
              <div v-for="(msg, idx) in logData.req" :key="idx" style="font-family:monospace; font-size:11px; line-height:1.4;">
                <span :style="{ color: msg.role === 'system' ? '#e5c07b' : msg.role === 'assistant' ? '#98c379' : '#61afef', fontWeight:'bold' }">
                  [{{ msg.role.toUpperCase() }}]
                </span><br>
                <span style="color:#abb2bf; white-space:pre-wrap;">{{ msg.content }}</span>
              </div>
            </div>
          </div>

          <!-- 接收的内容 (Response Payload) -->
          <div style="background:#fff; border-radius:12px; padding:15px; box-shadow:0 2px 10px rgba(0,0,0,0.02); display:flex; flex-direction:column;">
            <div style="font-weight:600; font-size:13px; margin-bottom:10px; color:#1dd1a1;">
              <i class="fas fa-download"></i> AI 原始回复 (包含 XML)
            </div>
            <div style="background:#282c34; border-radius:8px; padding:10px; font-family:monospace; font-size:11px; line-height:1.4; color:#abb2bf; white-space:pre-wrap; max-height:200px; overflow-y:auto;">
              {{ logData.res }}
            </div>
          </div>
        </template>

      </div>
    </div>
  </transition>
</template>

<script setup>
defineProps({
  show: Boolean,
  logData: { type: Object, default: null }
})
defineEmits(['close'])
</script>
