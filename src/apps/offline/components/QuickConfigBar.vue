<template>
  <div class="ios-action-sheet-mask" v-if="show" @click.self="$emit('close')">
    <div class="quick-config-panel">
      <div class="panel-header">
        <div class="panel-title">线下环境注入配置</div>
        <i class="fas fa-times close-icon" @click="$emit('close')"></i>
      </div>

      <div class="config-group">
        <div class="config-label">回复字数下限控制</div>
        <div style="display:flex; align-items:center; gap:10px;">
          <input type="range" min="50" max="800" step="50" v-model="localConfig.wordCount" style="flex:1;" />
          <span style="font-size:12px; font-weight:600; width:50px; text-align:right;">{{ localConfig.wordCount }} 字</span>
        </div>
      </div>

      <div class="config-group">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div class="config-label" style="margin:0;">禁止抢话与复述</div>
          <ToggleSwitch v-model="localConfig.antiRepeat" />
        </div>
        <div style="font-size:11px; color:#888; margin-top:5px;">开启后，系统将在末尾强制注入禁止复述和代替用户行动的强指令。</div>
      </div>

      <div class="config-group">
        <div class="config-label">场景文风与细节要求</div>
        <textarea 
          class="style-textarea" 
          v-model="localConfig.stylePrompt" 
          placeholder="例如：请注重周围环境的白描，注意人物的微表情和肢体接触..."
        ></textarea>
      </div>

      <div class="save-btn" @click="saveAndClose">应用配置</div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import ToggleSwitch from '@/components/ToggleSwitch.vue'

const props = defineProps({
  show: Boolean,
  config: Object
})

const emit = defineEmits(['close', 'save'])

const localConfig = ref({ wordCount: 150, antiRepeat: true, stylePrompt: '' })

watch(() => props.show, (val) => {
  if (val && props.config) {
    localConfig.value = { ...props.config }
  }
})

const saveAndClose = () => {
  emit('save', { ...localConfig.value })
  emit('close')
}
</script>

<style scoped>
.ios-action-sheet-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 999999; display: flex; align-items: flex-end; backdrop-filter: blur(5px); }
.quick-config-panel { width: 100%; background: #fff; border-radius: 20px 20px 0 0; padding: 20px; box-sizing: border-box; }
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.panel-title { font-size: 16px; font-weight: 700; color: #333; }
.close-icon { font-size: 18px; color: #888; cursor: pointer; padding: 5px; }

.config-group { margin-bottom: 20px; background: #f9f9f9; padding: 15px; border-radius: 12px; }
.config-label { font-size: 13px; font-weight: 600; color: #444; margin-bottom: 10px; }

.style-textarea { width: 100%; height: 80px; border: 1px solid #ddd; border-radius: 8px; padding: 10px; font-size: 13px; outline: none; resize: none; box-sizing: border-box; }

.save-btn { width: 100%; padding: 14px 0; background: var(--text-main); color: #fff; text-align: center; border-radius: 12px; font-weight: 600; font-size: 15px; cursor: pointer; transition: transform 0.2s; }
.save-btn:active { transform: scale(0.98); }
</style>
