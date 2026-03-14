<template>
  <InnerModal :show="show" @close="$emit('close')">
    <div class="modal-title">{{ character ? character.name : '角色' }} 的记忆设置</div>

    <div class="modal-hint">总结提示词</div>
    <textarea class="modal-textarea large" v-model="draft.summaryPrompt" placeholder="用于结构化记忆的总结提示词"></textarea>

    <div class="modal-hint">起居注提示词</div>
    <textarea class="modal-textarea large" v-model="draft.diaryPrompt" placeholder="用于日记口吻的提示词"></textarea>

    <div class="modal-hint">起居注整理提示词</div>
    <textarea class="modal-textarea large" v-model="draft.diaryArchivePrompt" placeholder="用于整理起居注的提示词"></textarea>

    <div style="display:flex; gap:10px; margin-bottom:12px;">
      <button class="btn-cancel" style="flex:1;" @click="restorePromptDefaults">恢复默认提示词</button>
      <button class="btn-cancel" style="flex:1;" @click="showResetConfirm = true">恢复默认</button>
    </div>

    <div class="modal-hint">起居注提醒阈值</div>
    <input class="modal-input" type="number" min="1" v-model.number="draft.diaryRemindThreshold" />

    <div class="modal-hint">自动整理开关</div>
    <select class="modal-input" v-model="draft.diaryAutoArchiveEnabled">
      <option :value="false">关闭</option>
      <option :value="true">开启</option>
    </select>

    <div class="modal-hint">自动整理阈值</div>
    <input class="modal-input" type="number" min="1" v-model.number="draft.diaryAutoArchiveThreshold" />

    <div class="modal-hint">自动整理包含 L2/L3</div>
    <div style="display:flex; gap:10px; margin-bottom:10px;">
      <label style="font-size:12px;"><input type="checkbox" v-model="draft.diaryAutoIncludeL2" /> 包含 L2</label>
      <label style="font-size:12px;"><input type="checkbox" v-model="draft.diaryAutoIncludeL3" /> 包含 L3</label>
    </div>

    <div class="modal-hint">自动整理目标级别</div>
    <div style="font-size:11px; color:#888; margin-bottom:6px;">生成的新回忆会被标记为该级别</div>
    <select class="modal-input" v-model.number="draft.diaryAutoTargetLevel">
      <option :value="2">L2</option>
      <option :value="3">L3</option>
    </select>

    <div class="modal-hint">里程碑最大展示数量</div>
    <input class="modal-input" type="number" min="1" v-model.number="draft.milestoneLimit" />

    <div class="modal-actions">
      <button class="btn-confirm" @click="$emit('save', draft)">保存</button>
    </div>
  </InnerModal>

  <div class="ios-alert-mask" v-if="showResetConfirm" @click.self="showResetConfirm = false">
    <div class="ios-alert">
      <div class="ios-alert-title">确认恢复默认</div>
      <div class="ios-alert-desc">该操作会重置当前角色的所有记忆设置。</div>
      <div class="ios-alert-actions">
        <div class="ios-alert-btn" @click="showResetConfirm = false">取消</div>
        <div class="ios-alert-btn bold" @click="confirmReset">确认</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import InnerModal from '@/components/InnerModal.vue'
import { useMemorySettings } from '@/composables/useMemorySettings'

const props = defineProps({
  show: Boolean,
  character: Object,
  settings: Object
})
const emit = defineEmits(['close', 'save', 'reset'])

const { getDefaultPrompts } = useMemorySettings()

const draft = ref({
  summaryPrompt: '',
  diaryPrompt: '',
  diaryArchivePrompt: '',
  diaryRemindThreshold: 20,
  diaryAutoArchiveEnabled: false,
  diaryAutoArchiveThreshold: 15,
  diaryAutoIncludeL2: false,
  diaryAutoIncludeL3: false,
  diaryAutoTargetLevel: 2,
  milestoneLimit: 5
})

const showResetConfirm = ref(false)

watch(() => props.settings, (v) => {
  if (v) draft.value = { ...draft.value, ...v }
}, { immediate: true, deep: true })

const confirmReset = () => {
  emit('reset')
  showResetConfirm.value = false
}

const restorePromptDefaults = () => {
  const def = getDefaultPrompts()
  draft.value.summaryPrompt = def.summaryPrompt
  draft.value.diaryPrompt = def.diaryPrompt
  draft.value.diaryArchivePrompt = def.diaryArchivePrompt
}
</script>

<style scoped>
.modal-textarea.large { height: 140px; }

.ios-alert-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 999999; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(5px); }
.ios-alert { background: rgba(255,255,255,0.95); width: 280px; border-radius: 18px; text-align: center; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
.ios-alert-title { font-size: 16px; font-weight: 600; padding: 20px 20px 5px; color: #000; }
.ios-alert-desc { font-size: 13px; color: #555; padding: 0 20px 15px; }
.ios-alert-actions { display: flex; border-top: 1px solid rgba(0,0,0,0.1); }
.ios-alert-btn { flex: 1; padding: 12px 0; font-size: 16px; color: #007aff; cursor: pointer; border-right: 1px solid rgba(0,0,0,0.1); }
.ios-alert-btn:last-child { border-right: none; }
.ios-alert-btn:active { background: rgba(0,0,0,0.05); }
.ios-alert-btn.bold { font-weight: 600; }
</style>
