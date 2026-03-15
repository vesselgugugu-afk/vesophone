<template>
  <div v-if="show" class="modal-overlay active" @click.self="$emit('close')">
    <div class="modal-box">
      <div class="modal-title">系统与高阶设置</div>

      <!-- 头像库设置 -->
      <div class="form-group">
        <label class="form-label">自定义奔现头像库 (URL)</label>
        <textarea class="form-textarea" v-model="localSettings.avatarUrls" placeholder="填入网络图片 URL，每行一个。奔现加 QQ 好友时，将从中随机抽取作为角色头像。若为空，则使用默认算法生成。"></textarea>
      </div>

      <!-- 强制爱与系统开关 -->
      <div class="form-group">
        <label class="form-label">剧情机制控制</label>
        
        <label class="toggle-row">
          <span>对方离开聊天时自动抹除数据</span>
          <input type="checkbox" v-model="localSettings.autoDeleteOnExit">
        </label>
        
        <label class="toggle-row">
          <span>允许 AI 主动厌恶并退出聊天室</span>
          <input type="checkbox" v-model="localSettings.allowAiExit">
        </label>
        
        <label class="toggle-row">
          <span>允许 AI 拒绝你的交换身份请求</span>
          <input type="checkbox" v-model="localSettings.allowAiReject">
        </label>
        
        <div style="font-size: 10px; color: #8e8e93; margin-top: 6px;">
          注：关闭后两项，系统将启动“强制爱”约束，对方将无法逃跑并强制同意奔现。
        </div>
      </div>

      <!-- UI 设置 -->
      <div class="form-group" style="margin-top: 20px;">
        <label class="form-label">全局自定义 CSS</label>
        <textarea class="form-textarea" style="font-family: monospace; height: 60px;" v-model="localCss" placeholder=".swipe-card { background: #000; }"></textarea>
      </div>

      <div class="modal-btns">
        <button class="btn-cancel" @click="$emit('close')">取消</button>
        <button class="btn-confirm" @click="saveSettings">保存应用</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useDatingPlayer } from '@/composables/useDatingPlayer'

const props = defineProps({ show: Boolean })
const emit = defineEmits(['close'])

const { playerProfile, updateSettings, updatePlayer } = useDatingPlayer()

const localSettings = ref({
  autoDeleteOnExit: true,
  allowAiExit: true,
  allowAiReject: true,
  avatarUrls: ''
})
const localCss = ref('')

watch(() => props.show, (val) => {
  if (val) {
    const s = playerProfile.value.settings || {}
    localSettings.value = {
      autoDeleteOnExit: s.autoDeleteOnExit ?? true,
      allowAiExit: s.allowAiExit ?? true,
      allowAiReject: s.allowAiReject ?? true,
      avatarUrls: s.avatarUrls || ''
    }
    localCss.value = playerProfile.value.customCss || ''
  }
})

const saveSettings = async () => {
  await updateSettings(localSettings.value)
  await updatePlayer({ customCss: localCss.value })
  window.dispatchEvent(new CustomEvent('sys-toast', { detail: '设置已保存' }))
  emit('close')
}
</script>

<style scoped>
.modal-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 300; display: flex; align-items: center; justify-content: center; }
.modal-box { background: #ffffff; width: 85%; max-height: 85vh; overflow-y: auto; border-radius: 24px; padding: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); animation: popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes popIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.modal-title { font-size: 16px; font-weight: 700; margin-bottom: 20px; text-align: center; color: #1c1c1e; }
.form-group { margin-bottom: 16px; }
.form-label { font-size: 12px; color: #8e8e93; margin-bottom: 8px; display: block; font-weight: 600; }
.form-textarea { width: 100%; padding: 12px; border: 1px solid #e5e5ea; border-radius: 8px; background: #f4f5f7; outline: none; font-family: inherit; font-size: 13px; resize: none; height: 120px; box-sizing: border-box; }
.toggle-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #1c1c1e; padding: 8px 0; border-bottom: 1px solid #f4f5f7; cursor: pointer; }
.toggle-row input { accent-color: #14CCCC; width: 16px; height: 16px; }
.modal-btns { display: flex; gap: 12px; margin-top: 24px; }
.btn-cancel { flex: 1; padding: 12px; border-radius: 8px; border: none; background: #f4f5f7; font-weight: 600; color: #1c1c1e; cursor: pointer;}
.btn-confirm { flex: 1; padding: 12px; border-radius: 8px; border: none; background: #14CCCC; font-weight: 600; color: white; cursor: pointer;}
</style>
