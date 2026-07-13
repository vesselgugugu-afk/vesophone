<template>
  <transition name="slide-up">
    <div v-if="show" class="result-sheet-mask" @click.self="$emit('close')">
      <div class="result-sheet">
        <div class="result-sheet-header">
          <div class="result-sheet-title">记录今日结果</div>
          <i class="fas fa-times" @click="$emit('close')"></i>
        </div>

        <div class="result-plan-card" v-if="plan">
          <div class="result-plan-label">对应计划</div>
          <div class="result-plan-title">{{ plan.title || '未命名计划' }}</div>
          <div class="result-plan-note" v-if="plan.note">{{ plan.note }}</div>
        </div>

        <div class="result-section">
          <div class="result-label">结果类型</div>
          <div class="result-type-grid">
            <div
              v-for="item in resultTypes"
              :key="item.value"
              class="result-type-item"
              :class="{ active: draft.resultType === item.value }"
              @click="draft.resultType = item.value"
            >
              <div class="result-type-name">{{ item.label }}</div>
              <div class="result-type-desc">{{ item.desc }}</div>
            </div>
          </div>
        </div>

        <div class="result-section">
          <div class="result-label">实际发生了什么</div>
          <textarea
            v-model="draft.actualText"
            class="result-textarea"
            placeholder="例如：实际写了 300 字；或虽然没完成，但读了两篇文献；或今天改做别的了。"
          ></textarea>
        </div>

        <div class="result-section" v-if="draft.resultType === 'missed' || draft.resultType === 'replaced'">
          <div class="result-label">原因 / 说明</div>
          <textarea
            v-model="draft.reason"
            class="result-textarea small"
            placeholder="例如：状态差、临时有别的事、计划定得过高。"
          ></textarea>
        </div>

        <div class="result-actions">
          <button class="btn-cancel" @click="$emit('close')">取消</button>
          <button class="btn-save" @click="handleSave">保存结果</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { reactive, watch } from 'vue'

/**
 * 结果填写弹层
 * 当前阶段职责：
 * 1. 为某条计划填写今日结果
 * 2. 支持 done / partial / missed / replaced / extra
 * 3. 将结果类型与文本说明统一收集后回传给父组件
 */
const props = defineProps({
  show: { type: Boolean, default: false },
  plan: { type: Object, default: null },
  modelValue: {
    type: Object,
    default: () => ({
      resultType: 'done',
      actualText: '',
      reason: ''
    })
  }
})

const emit = defineEmits(['close', 'save'])

const draft = reactive({
  resultType: 'done',
  actualText: '',
  reason: ''
})

const resultTypes = [
  { value: 'done', label: '已完成', desc: '基本按计划做到了' },
  { value: 'partial', label: '部分完成', desc: '做了一部分，但未完全达成' },
  { value: 'missed', label: '没做', desc: '今天没有推进这项计划' },
  { value: 'replaced', label: '改做别的', desc: '今天处理了别的事情' },
  { value: 'extra', label: '计划外完成', desc: '额外做了一件计划外事项' }
]

watch(
  () => props.show,
  (val) => {
    if (val) {
      draft.resultType = props.modelValue?.resultType || 'done'
      draft.actualText = props.modelValue?.actualText || ''
      draft.reason = props.modelValue?.reason || ''
    }
  },
  { immediate: true }
)

const handleSave = () => {
  emit('save', {
    resultType: draft.resultType,
    actualText: draft.actualText,
    reason: draft.reason
  })
}
</script>

<style scoped>
.result-sheet-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 99999;
  background: rgba(0,0,0,0.32);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.result-sheet {
  width: 100%;
  max-height: 82vh;
  background: #fff;
  border-radius: 28px 28px 0 0;
  padding: 18px 16px calc(20px + env(safe-area-inset-bottom, 0px));
  overflow-y: auto;
  box-shadow: 0 -12px 40px rgba(0,0,0,0.12);
}

.result-sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.result-sheet-title {
  font-size: 17px;
  font-weight: 800;
  color: #1c1c1e;
}

.result-sheet-header i {
  padding: 8px;
  color: #888;
  cursor: pointer;
}

.result-plan-card {
  margin-top: 14px;
  padding: 14px;
  border-radius: 18px;
  background: #f8f5ef;
}

.result-plan-label {
  font-size: 11px;
  color: #9b8f80;
  margin-bottom: 6px;
  font-weight: 700;
}

.result-plan-title {
  font-size: 15px;
  font-weight: 700;
  color: #3f372f;
  line-height: 1.5;
}

.result-plan-note {
  margin-top: 8px;
  font-size: 12px;
  color: #7d7368;
  line-height: 1.7;
  white-space: pre-wrap;
}

.result-section {
  margin-top: 18px;
}

.result-label {
  font-size: 12px;
  color: #777;
  font-weight: 700;
  margin-bottom: 10px;
}

.result-type-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.result-type-item {
  padding: 12px;
  border-radius: 16px;
  background: #f4f5f7;
  border: 1px solid transparent;
  cursor: pointer;
}

.result-type-item.active {
  background: rgba(92, 138, 255, 0.08);
  border-color: rgba(92, 138, 255, 0.22);
}

.result-type-name {
  font-size: 13px;
  font-weight: 700;
  color: #333;
}

.result-type-desc {
  font-size: 11px;
  color: #888;
  line-height: 1.6;
  margin-top: 6px;
}

.result-textarea {
  width: 100%;
  min-height: 110px;
  border: none;
  outline: none;
  resize: none;
  border-radius: 18px;
  background: #f4f5f7;
  padding: 14px;
  box-sizing: border-box;
  font-size: 13px;
  color: #333;
  line-height: 1.7;
}

.result-textarea.small {
  min-height: 88px;
}

.result-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.btn-cancel {
  flex: 1;
  height: 46px;
  border: none;
  border-radius: 14px;
  background: #ededf0;
  color: #444;
  font-weight: 700;
  cursor: pointer;
}

.btn-save {
  flex: 1;
  height: 46px;
  border: none;
  border-radius: 14px;
  background: #1c1c1e;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}
</style>
