import { ref } from 'vue'

/**
 * Todo AI 能力骨架
 * 当前阶段职责：
 * 1. 为后续任务拆解、AI 日程生成、复盘润色预留接口
 * 2. 当前先提供空实现，确保模块结构成立
 */
export function useTodoAI() {
  const isBusy = ref(false)

  const splitTaskByAI = async (taskTitle) => {
    isBusy.value = true
    try {
      return [
        `明确任务目标：${taskTitle || '未命名任务'}`,
        '拆成 3 到 5 个最小可执行步骤',
        '先完成最容易启动的第一步'
      ]
    } finally {
      isBusy.value = false
    }
  }

  const generateAiSchedule = async () => {
    isBusy.value = true
    try {
      return []
    } finally {
      isBusy.value = false
    }
  }

  const generateDailyReview = async () => {
    isBusy.value = true
    try {
      return ''
    } finally {
      isBusy.value = false
    }
  }

  return {
    isBusy,
    splitTaskByAI,
    generateAiSchedule,
    generateDailyReview
  }
}
