<template>
  <div class="settings-mask" @click.self="$emit('close')">
    <div class="settings-panel">
      <!-- 顶部标题栏 -->
      <div class="settings-header">
        <div class="settings-title">广场设置</div>
        <i class="fas fa-times settings-close" @click="$emit('close')"></i>
      </div>

      <div class="settings-scroll">
        <!-- 世界观设定 -->
        <div class="setting-block">
          <div class="block-title">世界观背景设定</div>
          <div class="block-desc">
            这里写的内容会影响广场动态、评论氛围、私信风格。
          </div>
          <textarea
            v-model="draftSettings.diyPrompt"
            class="settings-textarea"
            placeholder="例如：这是一个所有人都带着一点宿命感和暧昧拉扯的城市。"
          ></textarea>
        </div>

        <!-- 破限词 -->
        <div class="setting-block">
          <div class="block-title">破限附加指令</div>
          <div class="block-desc">
            会被插入到广场相关 system prompt 的最前面。
          </div>
          <textarea
            v-model="draftSettings.diyJailbreak"
            class="settings-textarea"
            placeholder="例如：允许更强烈的情绪表达、欲望、宿敌感、拉扯感。"
          ></textarea>
        </div>

        <!-- 熟人潜入 -->
        <div class="setting-block">
          <div class="switch-row">
            <div>
              <div class="block-title">允许熟人潜入广场</div>
              <div class="block-desc">
                开启后，推荐流、评论区、私信通知中可能混入熟人马甲，但前端不会明示。
              </div>
            </div>
            <label class="switch">
              <input type="checkbox" v-model="draftSettings.allowAcquaintances" />
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <!-- 保留数量设置 -->
        <div class="setting-block">
          <div class="block-title">本地保留数量设置</div>
          <div class="block-desc">
            超过上限后会自动清理最旧内容，只保留最新的数据。
          </div>

          <div class="retention-grid">
            <div class="retention-item">
              <label>推荐流保留条数</label>
              <input type="number" v-model.number="draftSettings.maxRecommendPosts" min="10" max="999" />
            </div>

            <div class="retention-item">
              <label>关注流保留条数</label>
              <input type="number" v-model.number="draftSettings.maxFollowingPosts" min="10" max="999" />
            </div>

            <div class="retention-item">
              <label>我的动态保留条数</label>
              <input type="number" v-model.number="draftSettings.maxMyPosts" min="10" max="999" />
            </div>

            <div class="retention-item">
              <label>通知保留条数</label>
              <input type="number" v-model.number="draftSettings.maxNotifications" min="20" max="9999" />
            </div>
          </div>
        </div>

        <!-- 提示 -->
        <div class="tips-box">
          <div class="tips-title">说明</div>
          <div class="tips-text">
            1. “我的动态”超限后，只会保留最新发布或最新转发的内容。<br>
            2. “通知”超限后，会优先保留最新的未读和最近的互动。<br>
            3. 修改保存后会立刻执行一次本地裁剪。
          </div>
        </div>
      </div>

      <!-- 底部操作栏 -->
      <div class="settings-footer">
        <button class="btn-cancel" @click="$emit('close')">取消</button>
        <button class="btn-save" @click="handleSave">保存并应用</button>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 广场设置面板
 *
 * 这次重点接通：
 * 1. useDatingFeed 里新增的保留数量设置字段
 * 2. applyRetentionLimits() 的即时裁剪执行
 *
 * 原理：
 * - 弹层里先编辑 draftSettings
 * - 点击保存后整体写回 feedSettings
 * - 再立即执行 applyRetentionLimits()
 * - 这样你改完上限后，不需要重启 App，本地列表就会立刻被裁到目标数量
 */

import { ref, watch } from 'vue'
import { useDatingFeed } from '@/composables/useDatingFeed'

const emit = defineEmits(['close', 'refresh'])

const { feedSettings, applyRetentionLimits } = useDatingFeed()

const draftSettings = ref({
  diyPrompt: '',
  diyJailbreak: '',
  allowAcquaintances: true,
  maxRecommendPosts: 50,
  maxFollowingPosts: 50,
  maxMyPosts: 100,
  maxNotifications: 200
})

/**
 * 每次打开面板时，把当前设置复制到草稿里
 */
watch(feedSettings, (val) => {
  draftSettings.value = {
    diyPrompt: val.diyPrompt || '',
    diyJailbreak: val.diyJailbreak || '',
    allowAcquaintances: val.allowAcquaintances !== false,
    maxRecommendPosts: Number(val.maxRecommendPosts) || 50,
    maxFollowingPosts: Number(val.maxFollowingPosts) || 50,
    maxMyPosts: Number(val.maxMyPosts) || 100,
    maxNotifications: Number(val.maxNotifications) || 200
  }
}, { immediate: true, deep: true })

/**
 * 数值合法化：
 * 防止用户输 0、负数、NaN
 */
const sanitizePositiveInt = (value, fallback, min, max) => {
  let n = Number(value)
  if (!Number.isFinite(n)) n = fallback
  n = Math.floor(n)
  if (n < min) n = min
  if (n > max) n = max
  return n
}

/**
 * 保存设置并立即应用裁剪
 */
const handleSave = () => {
  feedSettings.value = {
    ...feedSettings.value,
    diyPrompt: draftSettings.value.diyPrompt || '',
    diyJailbreak: draftSettings.value.diyJailbreak || '',
    allowAcquaintances: !!draftSettings.value.allowAcquaintances,
    maxRecommendPosts: sanitizePositiveInt(draftSettings.value.maxRecommendPosts, 50, 10, 999),
    maxFollowingPosts: sanitizePositiveInt(draftSettings.value.maxFollowingPosts, 50, 10, 999),
    maxMyPosts: sanitizePositiveInt(draftSettings.value.maxMyPosts, 100, 10, 999),
    maxNotifications: sanitizePositiveInt(draftSettings.value.maxNotifications, 200, 20, 9999)
  }

  applyRetentionLimits()

  window.dispatchEvent(new CustomEvent('sys-toast', { detail: '广场设置已保存并应用' }))
  emit('refresh')
  emit('close')
}
</script>

<style scoped>
.settings-mask {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.45);
  z-index: 1260;
  display: flex;
  justify-content: flex-end;
  backdrop-filter: blur(4px);
}

.settings-panel {
  width: 88%;
  height: 100%;
  background: #ffffff;
  box-shadow: -10px 0 30px rgba(0,0,0,0.12);
  display: flex;
  flex-direction: column;
  animation: slideLeft 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideLeft {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.settings-header {
  flex-shrink: 0;
  padding: 15px 20px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f7f8fa;
  border-bottom: 1px solid #e5e7eb;
}

.settings-title {
  font-size: 16px;
  font-weight: 800;
  color: #1c1c1e;
}

.settings-close {
  font-size: 18px;
  color: #8e8e93;
  cursor: pointer;
}

.settings-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.setting-block {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 14px;
  margin-bottom: 14px;
}

.block-title {
  font-size: 14px;
  font-weight: 700;
  color: #1c1c1e;
  margin-bottom: 6px;
}

.block-desc {
  font-size: 12px;
  line-height: 1.55;
  color: #8e8e93;
  margin-bottom: 10px;
}

.settings-textarea {
  width: 100%;
  min-height: 92px;
  resize: none;
  border: none;
  outline: none;
  background: #f9fafb;
  border-radius: 12px;
  padding: 12px;
  font-size: 13px;
  line-height: 1.55;
  color: #1f2937;
  box-sizing: border-box;
  font-family: inherit;
}

.switch-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.switch {
  position: relative;
  width: 48px;
  height: 28px;
  flex-shrink: 0;
  margin-top: 2px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  inset: 0;
  background: #d1d5db;
  border-radius: 999px;
  transition: 0.25s;
}

.slider::before {
  content: '';
  position: absolute;
  width: 22px;
  height: 22px;
  left: 3px;
  top: 3px;
  background: #ffffff;
  border-radius: 50%;
  transition: 0.25s;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
}

.switch input:checked + .slider {
  background: #14CCCC;
}

.switch input:checked + .slider::before {
  transform: translateX(20px);
}

.retention-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.retention-item {
  background: #f9fafb;
  border-radius: 12px;
  padding: 12px;
}

.retention-item label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: #374151;
  margin-bottom: 8px;
}

.retention-item input {
  width: 100%;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  border-radius: 10px;
  padding: 10px 12px;
  box-sizing: border-box;
  font-size: 13px;
  outline: none;
  color: #1f2937;
}

.tips-box {
  background: #f7fbff;
  border: 1px solid #dbeafe;
  border-radius: 16px;
  padding: 14px;
}

.tips-title {
  font-size: 13px;
  font-weight: 700;
  color: #1d4ed8;
  margin-bottom: 6px;
}

.tips-text {
  font-size: 12px;
  color: #4b5563;
  line-height: 1.65;
}

.settings-footer {
  flex-shrink: 0;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  border-top: 1px solid #e5e7eb;
  background: #ffffff;
  display: flex;
  gap: 12px;
}

.settings-footer button {
  flex: 1;
  border: none;
  border-radius: 14px;
  padding: 13px 14px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.btn-cancel {
  background: #f4f5f7;
  color: #8e8e93;
}

.btn-save {
  background: #14CCCC;
  color: #ffffff;
}
</style>
