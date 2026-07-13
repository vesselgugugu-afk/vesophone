import { ref, computed, onBeforeUnmount } from 'vue'

/**
 * 番茄钟 / 专注系统核心逻辑
 * 当前职责：
 * 1. 支持倒计时 / 正计时
 * 2. 支持主动创建自定义时长
 * 3. 支持专注类型（含“允许查阅”属性）
 * 4. 使用时间戳避免后台切换导致计时漂移
 * 5. 提供选择页与全屏专注态所需的全部状态
 */
export function usePomodoro() {
  /**
   * 专注类型配置
   * allowReference:
   * - true  表示允许合理离开当前页面去查阅资料
   * - false 表示更偏封闭专注，不建议频繁切出
   */
  const focusTypes = ref([
    {
      key: 'deep_focus',
      label: '沉浸专注',
      desc: '更适合写作、输出、推主线，不建议频繁切出。',
      allowReference: false
    },
    {
      key: 'research_focus',
      label: '查阅型专注',
      desc: '允许合理查文献、翻资料、切去工作工具。',
      allowReference: true
    },
    {
      key: 'light_focus',
      label: '轻任务推进',
      desc: '适合整理、收集、低压推进类事务。',
      allowReference: true
    }
  ])

  /**
   * 推荐时长选项
   * 这里只是快捷选项，真正开始时仍允许用户自定义分钟数
   */
  const quickDurationOptions = ref([15, 25, 50, 90])

  /**
   * 选择页状态
   */
  const selectedTimerMode = ref('countdown') // countdown | countup
  const selectedDurationMinutes = ref(25)
  const selectedFocusTypeKey = ref('deep_focus')

  /**
   * 会话状态：
   * idle     未开始
   * running  进行中
   * paused   已暂停
   * finished 已完成，等待领取结算
   */
  const status = ref('idle')

  /**
   * 当前会话配置
   */
  const sessionTimerMode = ref('countdown')
  const sessionDurationMinutes = ref(25)
  const sessionFocusTypeKey = ref('deep_focus')

  /**
   * 时间戳状态
   * segmentStartTime: 当前这段 running 开始时间
   * accumulatedElapsedSeconds: 之前已累计的秒数
   */
  const segmentStartTime = ref(null)
  const accumulatedElapsedSeconds = ref(0)

  /**
   * 展示状态
   */
  const elapsedSeconds = ref(0)
  const remainingSeconds = ref(25 * 60)

  /**
   * 完成后的会话 payload
   * 页面层领取后负责：
   * 1. 写库
   * 2. 奖励结算
   * 3. 时间轴记录
   */
  const completedSession = ref(null)

  /**
   * 轮询器
   */
  let ticker = null

  /**
   * 当前选中的专注类型
   */
  const selectedFocusType = computed(() => {
    return focusTypes.value.find(item => item.key === selectedFocusTypeKey.value) || focusTypes.value[0]
  })

  /**
   * 当前会话的专注类型
   */
  const currentFocusType = computed(() => {
    return focusTypes.value.find(item => item.key === sessionFocusTypeKey.value) || focusTypes.value[0]
  })

  /**
   * 当前会话总目标秒数
   * 对于 countup 也允许设置“目标参考时长”，用于做进度与提醒节点
   */
  const targetSeconds = computed(() => {
    return Math.max(0, Number(sessionDurationMinutes.value || 0) * 60)
  })

  /**
   * 当前展示秒数：
   * - countdown 显示剩余
   * - countup   显示已走过
   */
  const displaySeconds = computed(() => {
    if (sessionTimerMode.value === 'countup') {
      return Math.max(0, Number(elapsedSeconds.value || 0))
    }
    return Math.max(0, Number(remainingSeconds.value || 0))
  })

  /**
   * 时间格式化
   */
  const formattedTime = computed(() => {
    const total = Math.max(0, Number(displaySeconds.value || 0))
    const hh = Math.floor(total / 3600)
    const mm = Math.floor((total % 3600) / 60)
    const ss = total % 60

    if (hh > 0) {
      return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
    }

    return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
  })

  /**
   * 进度百分比
   * - countdown: 已消耗 / 总时长
   * - countup:   已经过 / 目标参考时长（封顶 100）
   */
  const progressPercent = computed(() => {
    const total = Number(targetSeconds.value || 0)
    if (!total) return 0

    const elapsed = Number(elapsedSeconds.value || 0)
    return Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)))
  })

  /**
   * 当前会话标题
   */
  const sessionTitle = computed(() => {
    if (sessionTimerMode.value === 'countup') {
      return `${currentFocusType.value.label} · 正计时`
    }
    return `${currentFocusType.value.label} · ${sessionDurationMinutes.value} 分钟`
  })

  /**
   * 停止 ticker
   */
  const stopTicker = () => {
    if (ticker) {
      clearInterval(ticker)
      ticker = null
    }
  }

  /**
   * 刷新真实时间
   * 这是整套防漂移的关键
   */
  const syncByTimestamp = () => {
    if (!segmentStartTime.value || status.value !== 'running') return

    const currentSegmentElapsed = Math.floor((Date.now() - Number(segmentStartTime.value)) / 1000)
    const totalElapsed = Number(accumulatedElapsedSeconds.value || 0) + currentSegmentElapsed

    elapsedSeconds.value = Math.max(0, totalElapsed)

    if (sessionTimerMode.value === 'countdown') {
      const remain = Math.max(0, Number(targetSeconds.value || 0) - totalElapsed)
      remainingSeconds.value = remain

      if (remain <= 0) {
        finishSession()
      }
    } else {
      remainingSeconds.value = 0
    }
  }

  /**
   * 启动 ticker
   */
  const startTicker = () => {
    stopTicker()
    syncByTimestamp()
    ticker = setInterval(() => {
      syncByTimestamp()
    }, 250)
  }

  /**
   * 设置计时模式
   */
  const setTimerMode = (mode) => {
    if (status.value !== 'idle' && status.value !== 'finished') return
    if (mode !== 'countdown' && mode !== 'countup') return
    selectedTimerMode.value = mode
  }

  /**
   * 设置时长
   */
  const setDurationMinutes = (minutes) => {
    if (status.value !== 'idle' && status.value !== 'finished') return
    const value = Math.max(1, Math.min(240, Number(minutes || 1)))
    selectedDurationMinutes.value = value
  }

  /**
   * 设置专注类型
   */
  const setFocusType = (focusTypeKey) => {
    if (status.value !== 'idle' && status.value !== 'finished') return
    const exists = focusTypes.value.some(item => item.key === focusTypeKey)
    if (!exists) return
    selectedFocusTypeKey.value = focusTypeKey
  }

  /**
   * 开始专注
   */
  const startSession = () => {
    sessionTimerMode.value = selectedTimerMode.value
    sessionDurationMinutes.value = selectedDurationMinutes.value
    sessionFocusTypeKey.value = selectedFocusTypeKey.value

    elapsedSeconds.value = 0
    remainingSeconds.value = Math.max(0, Number(sessionDurationMinutes.value || 0) * 60)
    accumulatedElapsedSeconds.value = 0
    segmentStartTime.value = Date.now()
    completedSession.value = null
    status.value = 'running'

    startTicker()
  }

  /**
   * 暂停
   */
  const pauseSession = () => {
    if (status.value !== 'running') return

    syncByTimestamp()
    accumulatedElapsedSeconds.value = Number(elapsedSeconds.value || 0)
    segmentStartTime.value = null
    status.value = 'paused'
    stopTicker()
  }

  /**
   * 继续
   */
  const resumeSession = () => {
    if (status.value !== 'paused') return

    segmentStartTime.value = Date.now()
    status.value = 'running'
    startTicker()
  }

  /**
   * 主动停止 / 放弃
   */
  const stopSession = () => {
    stopTicker()

    status.value = 'idle'
    segmentStartTime.value = null
    accumulatedElapsedSeconds.value = 0
    elapsedSeconds.value = 0
    remainingSeconds.value = Math.max(0, Number(selectedDurationMinutes.value || 0) * 60)
    completedSession.value = null
  }

  /**
   * 完成专注
   */
  const finishSession = () => {
    stopTicker()

    syncByTimestamp()

    status.value = 'finished'

    const end = Date.now()
    const totalElapsed = Number(elapsedSeconds.value || 0)
    const finalDurationMinutes = Math.max(1, Math.round(totalElapsed / 60))

    completedSession.value = {
      timerMode: sessionTimerMode.value,
      duration: finalDurationMinutes,
      targetDuration: Number(sessionDurationMinutes.value || 0),
      totalSeconds: totalElapsed,
      startTime: end - totalElapsed * 1000,
      endTime: end,
      status: 'completed',
      focusTypeKey: sessionFocusTypeKey.value,
      focusTypeLabel: currentFocusType.value.label,
      allowReference: !!currentFocusType.value.allowReference
    }
  }

  /**
   * 领取完成结果后重置
   */
  const consumeCompletedSession = () => {
    const payload = completedSession.value
    completedSession.value = null

    status.value = 'idle'
    segmentStartTime.value = null
    accumulatedElapsedSeconds.value = 0
    elapsedSeconds.value = 0
    remainingSeconds.value = Math.max(0, Number(selectedDurationMinutes.value || 0) * 60)

    return payload
  }

  onBeforeUnmount(() => {
    stopTicker()
  })

  return {
    focusTypes,
    quickDurationOptions,
    selectedTimerMode,
    selectedDurationMinutes,
    selectedFocusTypeKey,
    selectedFocusType,
    currentFocusType,
    status,
    sessionTimerMode,
    sessionDurationMinutes,
    elapsedSeconds,
    remainingSeconds,
    displaySeconds,
    formattedTime,
    progressPercent,
    sessionTitle,
    completedSession,
    setTimerMode,
    setDurationMinutes,
    setFocusType,
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
    consumeCompletedSession
  }
}
