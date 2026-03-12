<template>
  <transition name="slide-up">
    <div v-if="show" class="app-window">
      <div class="app-header">
        <div class="btn-back" @click="$emit('close')">返回</div>
        <div class="app-title">API 设置</div>
        <div class="header-right"></div>
      </div>
      
      <div class="content-area">
        <!-- 预设管理区域 -->
        <div style="background:#fff; border-radius:16px; padding:15px; display:flex; flex-direction:column; gap:12px; box-shadow:0 2px 8px rgba(0,0,0,0.03);">
          <div style="font-size:12px; font-weight:600; color:var(--text-main);">预设配置</div>
          <div style="display:flex; gap:8px; align-items:center;">
            <select style="flex:1; padding:10px; border:1px solid #eee; border-radius:10px; outline:none; font-size:13px; background:var(--bg-color);" v-model="selectedPresetId" @change="handleApplyPreset">
              <option :value="null">-- 选择或管理预设 --</option>
              <option v-for="p in apiPresets" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
            <button class="btn-confirm" style="padding:10px 14px; border-radius:10px; font-size:12px; flex:none;" @click="showSaveModal = true">保存</button>
            <i class="fas fa-trash btn-delete" v-if="selectedPresetId" @click="handleDeletePreset" style="padding:10px;"></i>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:6px;">
          <label style="font-size:11px; color:var(--text-sub);">接口地址</label>
          <input
            type="text"
            style="padding:12px; border:1px solid #eee; border-radius:12px; outline:none; font-size:14px;"
            v-model="apiUrl"
            placeholder="https://api.openai.com/v1/chat/completions"
          />
        </div>

        <div style="display:flex; flex-direction:column; gap:6px;">
          <label style="font-size:11px; color:var(--text-sub);">API 密钥</label>
          <input
            type="password"
            style="padding:12px; border:1px solid #eee; border-radius:12px; outline:none; font-size:14px;"
            v-model="apiKey"
            placeholder="sk-..."
          />
        </div>

        <div style="display:flex; flex-direction:column; gap:6px;">
          <label style="font-size:11px; color:var(--text-sub);">模型名称</label>
          <div style="display:flex; gap:8px;">
            <input
              type="text"
              style="flex:1; padding:12px; border:1px solid #eee; border-radius:12px; outline:none; font-size:14px;"
              v-model="apiModel"
              placeholder="gpt-4o"
            />
            <button 
              class="btn-cancel" 
              style="padding:0 15px; border-radius:12px; font-size:12px; flex:none; display:flex; align-items:center; gap:4px;" 
              @click="fetchModels" 
              :disabled="isFetchingModels"
            >
              <i :class="isFetchingModels ? 'fas fa-spinner fa-spin' : 'fas fa-cloud-download-alt'"></i>
              拉取
            </button>
          </div>
          <select 
            v-if="availableModels.length > 0" 
            v-model="apiModel"
            style="padding:12px; border:1px solid #eee; border-radius:12px; outline:none; font-size:13px; background:var(--bg-color); margin-top:4px;"
          >
            <option disabled value="">或从拉取的列表中选择</option>
            <option v-for="m in availableModels" :key="m" :value="m">{{ m }}</option>
          </select>
        </div>

        <div style="font-size:12px; color:var(--text-sub); line-height:1.6; padding:0 4px; margin-top:10px;">
          填写后数据自动保存到本地，不会上传到任何服务器。
        </div>
      </div>

      <!-- 弹窗：保存预设 -->
      <InnerModal :show="showSaveModal" @close="showSaveModal = false">
        <div class="modal-title">保存为新预设</div>
        <input class="modal-input" v-model="presetNameInput" placeholder="给这个配置起个名字（如：DeepSeek 配置）" />
        <div class="modal-actions">
          <button class="btn-cancel" @click="showSaveModal = false">取消</button>
          <button class="btn-confirm" @click="confirmSavePreset" :disabled="!presetNameInput.trim()">保存</button>
        </div>
      </InnerModal>

    </div>
  </transition>
</template>

<script setup>
import { ref } from 'vue'
import { useApi } from '@/composables/useApi'
import InnerModal from '@/components/InnerModal.vue'

defineProps({ show: Boolean })
defineEmits(['close'])

const { 
  apiUrl, apiKey, apiModel, 
  apiPresets, savePreset, deletePreset, applyPreset,
  availableModels, isFetchingModels, fetchModels
} = useApi()

const selectedPresetId = ref(null)
const showSaveModal = ref(false)
const presetNameInput = ref('')

const handleApplyPreset = () => {
  if (selectedPresetId.value) {
    const p = apiPresets.value.find(item => item.id === selectedPresetId.value)
    if (p) applyPreset(p)
  }
}

const confirmSavePreset = () => {
  if (savePreset(presetNameInput.value.trim())) {
    presetNameInput.value = ''
    showSaveModal.value = false
    // 自动选中刚保存的预设
    selectedPresetId.value = apiPresets.value[apiPresets.value.length - 1].id
  }
}

const handleDeletePreset = () => {
  if (selectedPresetId.value) {
    deletePreset(selectedPresetId.value)
    selectedPresetId.value = null
  }
}
</script>
