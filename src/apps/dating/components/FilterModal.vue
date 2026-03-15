<template>
  <div v-if="show" class="modal-overlay active" @click.self="$emit('close')">
    <div class="modal-box">
      <div class="modal-title">匹配过滤条件</div>
      
      <div class="form-group">
        <label class="form-label">性别要求</label>
        <div class="radio-group">
          <label class="radio-label"><input type="radio" value="不限" v-model="localFilters.gender"> 不限</label>
          <label class="radio-label"><input type="radio" value="女" v-model="localFilters.gender"> 女</label>
          <label class="radio-label"><input type="radio" value="男" v-model="localFilters.gender"> 男</label>
          <label class="radio-label"><input type="radio" value="自定义" v-model="localFilters.gender"> 自定义</label>
        </div>
        <input v-if="localFilters.gender === '自定义'" type="text" class="form-input" v-model="localFilters.customGender" placeholder="输入自定义性别 (如: 沃尔玛购物袋)" style="margin-top: 8px;">
      </div>

      <div class="form-group">
        <label class="form-label">年龄段 (数字)</label>
        <div class="flex-row">
          <input type="number" class="form-input" v-model="localFilters.minAge" placeholder="最小" style="flex: 1;">
          <span style="color: #8e8e93;">-</span>
          <input type="number" class="form-input" v-model="localFilters.maxAge" placeholder="最大" style="flex: 1;">
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">屏蔽的 Tag (用空格分隔)</label>
        <input type="text" class="form-input" v-model="blockedTagsStr" placeholder="如: 绿茶 渣男">
      </div>

      <div class="form-group">
        <label class="form-label" style="display: flex; justify-content: space-between; align-items: center;">
          <span>NSFW / 隐藏 XP 生成</span>
          <input type="checkbox" v-model="localFilters.enableNSFW" style="accent-color: #ff3b30; width: 16px; height: 16px;">
        </label>
        <div style="font-size: 10px; color: #ff3b30; margin-top: 4px;" v-if="localFilters.enableNSFW">
          警告：开启后可能会生成带有强迫、暗黑、病态占有或成人向暗示的极端人设。
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">其他强制要求</label>
        <textarea class="form-textarea" v-model="localFilters.requirements" placeholder="如：必须是大学生 / 必须会弹吉他..."></textarea>
      </div>

      <div class="modal-btns">
        <button class="btn-cancel" @click="$emit('close')">取消</button>
        <button class="btn-confirm" @click="saveFilters">应用设置</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useDatingPrefs } from '@/composables/useDatingPrefs'

const props = defineProps({ show: Boolean })
const emit = defineEmits(['close'])

const { matchFilters, updateFilters } = useDatingPrefs()

const localFilters = ref({})
const blockedTagsStr = ref('')

watch(() => props.show, (val) => {
  if (val) {
    localFilters.value = JSON.parse(JSON.stringify(matchFilters.value))
    blockedTagsStr.value = (localFilters.value.blockedTags || []).join(' ')
  }
})

const saveFilters = () => {
  localFilters.value.blockedTags = blockedTagsStr.value.split(' ').filter(t => t.trim())
  updateFilters(localFilters.value)
  window.dispatchEvent(new CustomEvent('sys-toast', { detail: '过滤条件已保存' }))
  emit('close')
}
</script>

<style scoped>
.modal-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 300; display: flex; align-items: center; justify-content: center; }
.modal-box { background: #ffffff; width: 85%; max-height: 80vh; overflow-y: auto; border-radius: 24px; padding: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); animation: popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes popIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.modal-title { font-size: 16px; font-weight: 700; margin-bottom: 16px; text-align: center; color: #1c1c1e; }
.form-group { margin-bottom: 16px; }
.form-label { font-size: 12px; color: #8e8e93; margin-bottom: 8px; display: block; font-weight: 600; }
.form-select, .form-input, .form-textarea { width: 100%; padding: 12px; border: 1px solid #e5e5ea; border-radius: 8px; background: #f4f5f7; outline: none; font-family: inherit; font-size: 14px; box-sizing: border-box; }
.form-textarea { resize: none; height: 80px; }
.modal-btns { display: flex; gap: 12px; margin-top: 24px; }
.btn-cancel { flex: 1; padding: 12px; border-radius: 8px; border: none; background: #f4f5f7; font-weight: 600; color: #1c1c1e; cursor: pointer;}
.btn-confirm { flex: 1; padding: 12px; border-radius: 8px; border: none; background: #14CCCC; font-weight: 600; color: white; cursor: pointer;}
.radio-group { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 8px; }
.radio-label { font-size: 13px; display: flex; align-items: center; gap: 4px; cursor: pointer; color: #1c1c1e; }
.radio-label input { accent-color: #14CCCC; }
.flex-row { display: flex; gap: 10px; align-items: center; }
</style>
