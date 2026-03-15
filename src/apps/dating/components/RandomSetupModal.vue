<template>
  <div v-if="show" class="modal-overlay active" @click.self="$emit('close')">
    <div class="modal-box">
      <div class="modal-title">设定相遇场景</div>
      
      <div class="form-group">
        <label class="form-label">输入场景描述，AI 将根据场景生成带有隐秘设定的路人与你相遇。</label>
        <textarea class="form-textarea" v-model="scenario" placeholder="例如：深夜的24小时便利店，外面下着大雨，我们都在躲雨..."></textarea>
      </div>

      <!-- AI 批量生成场景列表区 -->
      <div class="scene-generator-area">
        <div class="scene-header">
          <span style="font-size: 12px; font-weight: 600; color: #1c1c1e;">没有灵感？</span>
          <button class="btn-ai-gen" @click="fetchScenes" :disabled="isGeneratingScenes">
            <i :class="isGeneratingScenes ? 'fas fa-spinner fa-spin' : 'fas fa-magic'"></i> 
            {{ isGeneratingScenes ? '正在构思中...' : '让AI构思5个场景' }}
          </button>
        </div>
        
        <div class="scene-list" v-if="aiScenes.length > 0">
          <div class="scene-item" v-for="(scene, idx) in aiScenes" :key="idx" @click="scenario = scene">
            {{ scene }}
          </div>
        </div>
      </div>

      <div class="modal-btns">
        <button class="btn-cancel" @click="$emit('close')">取消</button>
        <button class="btn-confirm" @click="startBlindDate" :disabled="isGenerating">
          <i v-if="isGenerating" class="fas fa-spinner fa-spin"></i>
          <span v-else>潜入夜色</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useDatingMatch } from '@/composables/useDatingMatch'

const props = defineProps({ show: Boolean })
const emit = defineEmits(['close', 'start-chat'])

const { generateFullProfile, generateRandomScenes, isGenerating } = useDatingMatch()
const scenario = ref('')

const isGeneratingScenes = ref(false)
const aiScenes = ref([])

watch(() => props.show, (val) => {
  if (!val) {
    aiScenes.value = []
    scenario.value = ''
  }
})

const fetchScenes = async () => {
  if (isGeneratingScenes.value) return
  isGeneratingScenes.value = true
  try {
    const scenes = await generateRandomScenes()
    if (scenes && scenes.length > 0) {
      aiScenes.value = scenes
    } else {
      window.dispatchEvent(new CustomEvent('sys-toast', { detail: 'AI 脑力耗尽，生成失败' }))
    }
  } finally {
    isGeneratingScenes.value = false
  }
}

const startBlindDate = async () => {
  if (!scenario.value.trim()) {
    window.dispatchEvent(new CustomEvent('sys-toast', { detail: '请填写相遇场景' }))
    return
  }
  const res = await generateFullProfile(null, true, scenario.value)
  if (res) {
    window.dispatchEvent(new CustomEvent('sys-toast', { detail: '相遇成功...' }))
    emit('start-chat', res.chatId)
    emit('close')
  } else {
    window.dispatchEvent(new CustomEvent('sys-toast', { detail: '生成失败，请重试' }))
  }
}
</script>

<style scoped>
.modal-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 300; display: flex; align-items: center; justify-content: center; }
.modal-box { background: #ffffff; width: 85%; border-radius: 24px; padding: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); animation: popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1); max-height: 80vh; overflow-y: auto; }
@keyframes popIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.modal-title { font-size: 16px; font-weight: 700; margin-bottom: 16px; text-align: center; color: #1c1c1e; }
.form-group { margin-bottom: 16px; }
.form-label { font-size: 12px; color: #8e8e93; margin-bottom: 8px; display: block; line-height: 1.5; }
.form-textarea { width: 100%; padding: 12px; border: 1px solid #e5e5ea; border-radius: 8px; background: #f4f5f7; outline: none; font-family: inherit; font-size: 14px; resize: none; height: 100px; box-sizing: border-box; }

.scene-generator-area { background: #f9f9f9; border-radius: 12px; padding: 12px; margin-bottom: 16px; }
.scene-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.btn-ai-gen { background: rgba(20, 204, 204, 0.1); color: #14CCCC; border: none; padding: 6px 12px; border-radius: 16px; font-size: 11px; font-weight: 600; cursor: pointer; }
.btn-ai-gen:disabled { opacity: 0.6; }
.scene-list { display: flex; flex-direction: column; gap: 8px; }
.scene-item { font-size: 12px; color: #333; background: #ffffff; padding: 10px; border-radius: 8px; border: 1px solid #e5e5ea; cursor: pointer; line-height: 1.4; transition: border-color 0.2s; }
.scene-item:active { border-color: #14CCCC; background: #e0f7f7; }

.modal-btns { display: flex; gap: 12px; margin-top: 10px; }
.btn-cancel { flex: 1; padding: 12px; border-radius: 8px; border: none; background: #f4f5f7; font-weight: 600; color: #1c1c1e; cursor: pointer;}
.btn-confirm { flex: 1; padding: 12px; border-radius: 8px; border: none; background: #5c8aff; font-weight: 600; color: white; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 8px;}
.btn-confirm:disabled { opacity: 0.7; }
</style>
