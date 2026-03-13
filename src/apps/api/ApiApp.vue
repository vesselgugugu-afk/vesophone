<template>
  <transition name="slide-up">
    <div v-if="show" class="app-window">
      <div class="app-header">
        <div class="btn-back" @click="$emit('close')">返回</div>
        <div class="app-title">引擎与底层设置</div>
        <div class="header-right"></div>
      </div>
      
      <div class="content-area">
        
        <!-- 全局主预设管理区域 -->
        <div style="background:#fff; border-radius:16px; padding:15px; display:flex; flex-direction:column; gap:12px; box-shadow:0 2px 8px rgba(0,0,0,0.03);">
          <div style="font-size:12px; font-weight:600; color:var(--text-main);">全局主配置存档</div>
          <div style="display:flex; gap:8px; align-items:center;">
            <select style="flex:1; padding:10px; border:1px solid #eee; border-radius:10px; outline:none; font-size:13px; background:var(--bg-color);" v-model="selectedPresetId" @change="handleApplyPreset">
              <option :value="null">-- 选择或管理预设 --</option>
              <option v-for="p in apiPresets" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
            <button class="btn-confirm" style="padding:10px 14px; border-radius:10px; font-size:12px; flex:none;" @click="showSaveModal = true">保存</button>
            <i class="fas fa-trash btn-delete" v-if="selectedPresetId" @click="handleDeletePreset" style="padding:10px;"></i>
          </div>
        </div>

        <!-- 主 API 核心 -->
        <div style="background:#fff; border-radius:16px; padding:15px; display:flex; flex-direction:column; gap:12px; box-shadow:0 2px 8px rgba(0,0,0,0.03); margin-top:15px;">
          <div style="font-size:12px; font-weight:600; color:var(--text-main); display:flex; align-items:center; gap:6px;">
            <i class="fas fa-server"></i> 主力推理引擎 (负责日常对话与 RP)
          </div>
          
          <div style="display:flex; flex-direction:column; gap:6px;">
            <label style="font-size:11px; color:var(--text-sub);">接口地址</label>
            <input type="text" class="api-input" v-model="apiUrl" placeholder="https://api.openai.com/v1/chat/completions" />
          </div>

          <div style="display:flex; flex-direction:column; gap:6px;">
            <label style="font-size:11px; color:var(--text-sub);">API 密钥</label>
            <input type="password" class="api-input" v-model="apiKey" placeholder="sk-..." />
          </div>

          <div style="display:flex; flex-direction:column; gap:6px;">
            <label style="font-size:11px; color:var(--text-sub);">模型名称</label>
            <div style="display:flex; gap:8px;">
              <input type="text" class="api-input" style="flex:1;" v-model="apiModel" placeholder="gpt-4o" />
              <button class="btn-cancel" style="padding:0 15px; border-radius:12px; font-size:12px; display:flex; align-items:center; gap:4px;" @click="fetchModels" :disabled="isFetchingModels">
                <i :class="isFetchingModels ? 'fas fa-spinner fa-spin' : 'fas fa-cloud-download-alt'"></i>
              </button>
            </div>
            <select v-if="availableModels.length > 0" v-model="apiModel" class="api-input" style="margin-top:4px;">
              <option disabled value="">或从拉取的列表中选择</option>
              <option v-for="m in availableModels" :key="m" :value="m">{{ m }}</option>
            </select>
          </div>
          
          <button class="btn-send" style="padding:10px; border-radius:10px; font-size:12px; margin-top:5px;" @click="testModel(false)" :disabled="isTesting">
            <i class="fas fa-plug"></i> 测试主模型通信
          </button>
        </div>

        <!-- 进阶采样参数 -->
        <div style="background:#fff; border-radius:16px; padding:15px; display:flex; flex-direction:column; gap:15px; box-shadow:0 2px 8px rgba(0,0,0,0.03); margin-top:15px;">
          <div style="font-size:12px; font-weight:600; color:var(--text-main);">进阶采样参数</div>
          
          <div>
            <div style="display:flex; justify-content:space-between; font-size:12px; color:#555; margin-bottom:8px;">
              <span>发散度 (Temperature)</span>
              <span>{{ temperature }}</span>
            </div>
            <input type="range" min="0" max="2" step="0.1" v-model.number="temperature" style="width:100%;" />
          </div>

          <div>
            <div style="display:flex; justify-content:space-between; font-size:12px; color:#555; margin-bottom:8px;">
              <span>核采样 (Top P)</span>
              <span>{{ top_p }}</span>
            </div>
            <input type="range" min="0" max="1" step="0.05" v-model.number="top_p" style="width:100%;" />
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #eee; padding-top:12px;">
            <div>
              <div style="font-size:13px; color:var(--text-main);">流式输出 (Stream)</div>
              <div style="font-size:10px; color:#888; margin-top:2px;">开启后打字机效果 (需Chat底层支持)</div>
            </div>
            <ToggleSwitch v-model="stream" />
          </div>
        </div>

        <!-- 副 API (总结专用) 完整强化版 -->
        <div style="background:#fff; border-radius:16px; padding:15px; display:flex; flex-direction:column; gap:12px; box-shadow:0 2px 8px rgba(0,0,0,0.03); margin-top:15px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:12px; font-weight:600; color:var(--text-main); display:flex; align-items:center; gap:6px;">
              <i class="fas fa-microchip"></i> 独立副引擎 (用于自动总结归档)
            </div>
            <ToggleSwitch v-model="useSubApi" />
          </div>

          <div v-if="useSubApi" style="display:flex; flex-direction:column; gap:10px; margin-top:5px; border-top:1px solid #eee; padding-top:12px;">
            
            <!-- 副预设管理 -->
            <div style="display:flex; gap:8px; align-items:center; margin-bottom:6px;">
              <select style="flex:1; padding:8px; border:1px solid #eee; border-radius:10px; outline:none; font-size:12px; background:var(--bg-color);" v-model="selectedSubPresetId" @change="handleApplySubPreset">
                <option :value="null">-- 副引擎预设 --</option>
                <option v-for="p in subApiPresets" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
              <button class="btn-confirm" style="padding:8px 12px; border-radius:10px; font-size:11px; flex:none;" @click="showSubSaveModal = true">保存</button>
              <i class="fas fa-trash btn-delete" v-if="selectedSubPresetId" @click="handleDeleteSubPreset" style="padding:8px;"></i>
            </div>

            <input type="text" class="api-input" v-model="subApiUrl" placeholder="副API地址" />
            <input type="password" class="api-input" v-model="subApiKey" placeholder="副API密钥" />
            
            <!-- 副引擎模型拉取 -->
            <div style="display:flex; gap:8px;">
              <input type="text" class="api-input" style="flex:1;" v-model="subApiModel" placeholder="副模型 (如 deepseek-chat)" />
              <button class="btn-cancel" style="padding:0 15px; border-radius:12px; font-size:12px; display:flex; align-items:center; gap:4px;" @click="fetchSubModels" :disabled="isFetchingSubModels">
                <i :class="isFetchingSubModels ? 'fas fa-spinner fa-spin' : 'fas fa-cloud-download-alt'"></i>
              </button>
            </div>
            <select v-if="availableSubModels.length > 0" v-model="subApiModel" class="api-input">
              <option disabled value="">或从拉取的列表中选择</option>
              <option v-for="m in availableSubModels" :key="m" :value="m">{{ m }}</option>
            </select>

            <button class="btn-cancel" style="padding:10px; border-radius:10px; font-size:12px;" @click="testModel(true)" :disabled="isTesting">测试副模型通信</button>
          </div>
        </div>

        <!-- 测试回显控制台 -->
        <div v-if="testResult" style="background:#282c34; border-radius:12px; padding:12px; margin-top:15px; color:#98c379; font-family:monospace; font-size:12px; white-space:pre-wrap; line-height:1.5;">
          {{ testResult }}
        </div>

        <!-- 原生化工具 -->
        <div style="margin-top:20px; display:flex; flex-direction:column; gap:10px; padding-bottom:30px;">
          <button style="background:#1dd1a1; color:#fff; border:none; padding:12px; border-radius:12px; font-weight:600; cursor:pointer;" @click="installPWA">
            <i class="fas fa-download"></i> 将 App 安装到桌面 (PWA)
          </button>
          <button style="background:#5c8aff; color:#fff; border:none; padding:12px; border-radius:12px; font-weight:600; cursor:pointer;" @click="requestNotify">
            <i class="fas fa-bell"></i> 开启后台原生消息弹窗
          </button>
        </div>

      </div>

      <!-- 主预设保存弹窗 -->
      <InnerModal :show="showSaveModal" @close="showSaveModal = false">
        <div class="modal-title">保存为全局主预设</div>
        <input class="modal-input" v-model="presetNameInput" placeholder="给这个主配置起个名字" />
        <div class="modal-actions">
          <button class="btn-cancel" @click="showSaveModal = false">取消</button>
          <button class="btn-confirm" @click="confirmSavePreset" :disabled="!presetNameInput.trim()">保存</button>
        </div>
      </InnerModal>

      <!-- 副预设保存弹窗 -->
      <InnerModal :show="showSubSaveModal" @close="showSubSaveModal = false">
        <div class="modal-title">保存为副引擎预设</div>
        <input class="modal-input" v-model="subPresetNameInput" placeholder="给这个副配置起个名字" />
        <div class="modal-actions">
          <button class="btn-cancel" @click="showSubSaveModal = false">取消</button>
          <button class="btn-confirm" @click="confirmSaveSubPreset" :disabled="!subPresetNameInput.trim()">保存</button>
        </div>
      </InnerModal>

    </div>
  </transition>
</template>

<script setup>
import { ref } from 'vue'
import { useApi } from '@/composables/useApi'
import InnerModal from '@/components/InnerModal.vue'
import ToggleSwitch from '@/components/ToggleSwitch.vue'

defineProps({ show: Boolean })
defineEmits(['close'])

const { 
  apiUrl, apiKey, apiModel, 
  temperature, top_p, stream,
  useSubApi, subApiUrl, subApiKey, subApiModel,
  apiPresets, savePreset, deletePreset, applyPreset,
  subApiPresets, saveSubPreset, deleteSubPreset, applySubPreset,
  availableModels, isFetchingModels, fetchModels,
  availableSubModels, isFetchingSubModels, fetchSubModels,
  testResult, isTesting, testModel
} = useApi()

// 主预设逻辑
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
    selectedPresetId.value = apiPresets.value[apiPresets.value.length - 1].id
  }
}

const handleDeletePreset = () => {
  if (selectedPresetId.value) {
    deletePreset(selectedPresetId.value)
    selectedPresetId.value = null
  }
}

// 副预设逻辑
const selectedSubPresetId = ref(null)
const showSubSaveModal = ref(false)
const subPresetNameInput = ref('')

const handleApplySubPreset = () => {
  if (selectedSubPresetId.value) {
    const p = subApiPresets.value.find(item => item.id === selectedSubPresetId.value)
    if (p) applySubPreset(p)
  }
}

const confirmSaveSubPreset = () => {
  if (saveSubPreset(subPresetNameInput.value.trim())) {
    subPresetNameInput.value = ''
    showSubSaveModal.value = false
    selectedSubPresetId.value = subApiPresets.value[subApiPresets.value.length - 1].id
  }
}

const handleDeleteSubPreset = () => {
  if (selectedSubPresetId.value) {
    deleteSubPreset(selectedSubPresetId.value)
    selectedSubPresetId.value = null
  }
}

// 请求通知权限
const requestNotify = () => {
  if (!('Notification' in window)) return alert('当前浏览器不支持系统通知')
  Notification.requestPermission().then(p => {
    if(p === 'granted') alert('通知权限已开启！网页在后台时，收到消息将触发原生弹窗。')
    else alert('请求被拒绝，请去浏览器设置中手动开启。')
  })
}

// 触发桌面安装
const installPWA = () => {
  if (window.deferredPrompt) {
    window.deferredPrompt.prompt()
    window.deferredPrompt.userChoice.then(() => {
      window.deferredPrompt = null
    })
  } else {
    alert('当前环境无法主动触发安装。请通过浏览器的“选项”->“添加到主屏幕/安装应用”来完成安装。')
  }
}
</script>

<style scoped>
.api-input {
  padding: 12px;
  border: 1px solid #eee;
  border-radius: 12px;
  outline: none;
  font-size: 14px;
  background: var(--bg-color);
}
</style>
