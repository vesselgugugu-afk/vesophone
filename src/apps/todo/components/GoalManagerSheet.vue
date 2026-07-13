<template>
  <transition name="slide-up">
    <div v-if="show" class="goal-sheet-mask" @click.self="$emit('close')">
      <div class="goal-sheet">
        <div class="goal-sheet-header">
          <div class="goal-sheet-title">目标管理</div>
          <i class="fas fa-times" @click="$emit('close')"></i>
        </div>

        <div class="goal-type-switcher">
          <div
            class="goal-type-item"
            :class="{ active: activeType === 'week' }"
            @click="activeType = 'week'"
          >
            周目标
          </div>
          <div
            class="goal-type-item"
            :class="{ active: activeType === 'phase' }"
            @click="activeType = 'phase'"
          >
            阶段目标
          </div>
        </div>

        <div class="goal-create-card">
          <div class="goal-create-title">{{ activeType === 'week' ? '新建周目标' : '新建阶段目标' }}</div>

          <div class="goal-create-row">
            <input
              v-model="draftTitle"
              class="goal-input"
              type="text"
              :placeholder="activeType === 'week' ? '例如：本周论文推进' : '例如：本月科研主线'"
            />
          </div>

          <div class="goal-create-row" v-if="activeType === 'week'">
            <select v-model="draftParentId" class="goal-input">
              <option value="">不归属阶段目标</option>
              <option v-for="item in phaseGoals" :key="item.id" :value="String(item.id)">
                {{ item.title }}
              </option>
            </select>
          </div>

          <button class="goal-create-btn" @click="handleCreateGoal">创建目标</button>
        </div>

        <div class="goal-list-section">
          <div class="goal-list-title">{{ activeType === 'week' ? '当前周目标' : '当前阶段目标' }}</div>

          <div v-if="activeGoals.length === 0" class="goal-empty">
            还没有创建任何目标。
          </div>

          <div v-else class="goal-list">
            <div v-for="item in activeGoals" :key="item.id" class="goal-card">
              <div v-if="editingId === item.id" class="goal-edit-block">
                <input v-model="editingTitle" class="goal-input" type="text" />
                <select v-if="activeType === 'week'" v-model="editingParentId" class="goal-input" style="margin-top: 8px;">
                  <option value="">不归属阶段目标</option>
                  <option v-for="phase in phaseGoals" :key="phase.id" :value="String(phase.id)">
                    {{ phase.title }}
                  </option>
                </select>
                <div class="goal-action-row">
                  <button class="small-btn ghost" @click="cancelEdit">取消</button>
                  <button class="small-btn dark" @click="handleSaveEdit(item)">保存</button>
                </div>
              </div>

              <template v-else>
                <div class="goal-card-top">
                  <div class="goal-card-title">{{ item.title }}</div>
                  <div class="goal-card-progress">{{ goalProgressMap[item.id] ?? 0 }}%</div>
                </div>

                <div class="goal-card-sub" v-if="activeType === 'week' && item.parentId">
                  归属阶段：
                  {{
                    phaseGoals.find(phase => phase.id === item.parentId)?.title || '未找到阶段目标'
                  }}
                </div>

                <div class="goal-progress-bar">
                  <div
                    class="goal-progress-bar-inner"
                    :style="{ width: `${goalProgressMap[item.id] ?? 0}%` }"
                  ></div>
                </div>

                <div class="goal-action-row">
                  <button class="small-btn ghost" @click="startEdit(item)">编辑</button>
                  <button class="small-btn danger" @click="handleDelete(item)">删除</button>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed } from 'vue'

/**
 * 目标管理面板
 * 职责：
 * 1. 独立管理阶段目标 / 周目标
 * 2. 负责创建、编辑、删除
 * 3. 展示目标进度条
 * 4. 解决“在日计划编辑里顺手建目标”不自然的问题
 */
const props = defineProps({
  show: { type: Boolean, default: false },
  phaseGoals: { type: Array, default: () => [] },
  weekGoals: { type: Array, default: () => [] },
  goalProgressMap: { type: Object, default: () => ({}) }
})

const emit = defineEmits([
  'close',
  'create-goal',
  'update-goal',
  'delete-goal'
])

const activeType = ref('week')
const draftTitle = ref('')
const draftParentId = ref('')

const editingId = ref(null)
const editingTitle = ref('')
const editingParentId = ref('')

const activeGoals = computed(() => {
  return activeType.value === 'week' ? props.weekGoals : props.phaseGoals
})

const handleCreateGoal = () => {
  const title = draftTitle.value.trim()
  if (!title) return

  emit('create-goal', {
    goalType: activeType.value,
    title,
    parentId: activeType.value === 'week' && draftParentId.value ? Number(draftParentId.value) : null
  })

  draftTitle.value = ''
  draftParentId.value = ''
}

const startEdit = (item) => {
  editingId.value = item.id
  editingTitle.value = item.title || ''
  editingParentId.value = item.parentId ? String(item.parentId) : ''
}

const cancelEdit = () => {
  editingId.value = null
  editingTitle.value = ''
  editingParentId.value = ''
}

const handleSaveEdit = (item) => {
  const title = editingTitle.value.trim()
  if (!title) return

  emit('update-goal', {
    id: item.id,
    title,
    parentId: activeType.value === 'week' && editingParentId.value ? Number(editingParentId.value) : null
  })

  cancelEdit()
}

const handleDelete = (item) => {
  emit('delete-goal', item)
}
</script>

<style scoped>
.goal-sheet-mask {
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

.goal-sheet {
  width: 100%;
  max-height: 84vh;
  background: #ffffff;
  border-radius: 28px 28px 0 0;
  padding: 18px 16px calc(20px + env(safe-area-inset-bottom, 0px));
  overflow-y: auto;
  box-shadow: 0 -12px 40px rgba(0,0,0,0.12);
}

.goal-sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.goal-sheet-title {
  font-size: 17px;
  font-weight: 800;
  color: #1c1c1e;
}

.goal-sheet-header i {
  padding: 8px;
  color: #888;
  cursor: pointer;
}

.goal-type-switcher {
  margin-top: 16px;
  display: flex;
  background: #f4f5f7;
  padding: 4px;
  border-radius: 14px;
}

.goal-type-item {
  flex: 1;
  height: 40px;
  border-radius: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 13px;
  font-weight: 700;
  color: #888;
  cursor: pointer;
}

.goal-type-item.active {
  background: #ffffff;
  color: #1c1c1e;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.goal-create-card {
  margin-top: 16px;
  padding: 14px;
  border-radius: 18px;
  background: #f8f9fa;
}

.goal-create-title {
  font-size: 13px;
  font-weight: 700;
  color: #333;
  margin-bottom: 10px;
}

.goal-create-row {
  margin-top: 8px;
}

.goal-input {
  width: 100%;
  height: 42px;
  border: none;
  outline: none;
  border-radius: 12px;
  background: #ffffff;
  padding: 0 14px;
  font-size: 13px;
  color: #333;
  box-sizing: border-box;
}

.goal-create-btn {
  margin-top: 10px;
  width: 100%;
  height: 42px;
  border: none;
  border-radius: 12px;
  background: #1c1c1e;
  color: #ffffff;
  font-weight: 700;
  cursor: pointer;
}

.goal-list-section {
  margin-top: 18px;
}

.goal-list-title {
  font-size: 13px;
  font-weight: 700;
  color: #555;
  margin-bottom: 10px;
}

.goal-empty {
  padding: 18px;
  border-radius: 16px;
  background: #f8f9fa;
  color: #aaa;
  text-align: center;
  font-size: 12px;
}

.goal-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.goal-card {
  padding: 14px;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 4px 16px rgba(0,0,0,0.03);
  border: 1px solid #f1f2f4;
}

.goal-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.goal-card-title {
  flex: 1;
  font-size: 14px;
  font-weight: 700;
  color: #1c1c1e;
  line-height: 1.5;
}

.goal-card-progress {
  font-size: 12px;
  font-weight: 800;
  color: #666;
}

.goal-card-sub {
  margin-top: 6px;
  font-size: 11px;
  color: #999;
  line-height: 1.6;
}

.goal-progress-bar {
  margin-top: 10px;
  height: 8px;
  border-radius: 999px;
  background: #f1f2f4;
  overflow: hidden;
}

.goal-progress-bar-inner {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #2d3436, #636e72);
}

.goal-action-row {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.small-btn {
  flex: 1;
  height: 36px;
  border: none;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.small-btn.ghost {
  background: #f4f5f7;
  color: #555;
}

.small-btn.dark {
  background: #1c1c1e;
  color: #fff;
}

.small-btn.danger {
  background: #fff2f2;
  color: #d63031;
}

.goal-edit-block {
  display: flex;
  flex-direction: column;
}
</style>
