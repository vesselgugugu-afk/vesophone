<template>
  <transition name="slide-up">
    <div v-if="show" class="date-sheet-mask" @click.self="$emit('close')">
      <div class="date-sheet">
        <div class="date-sheet-header">
          <button class="month-nav-btn" @click="$emit('change-month', -1)">
            <i class="fas fa-chevron-left"></i>
          </button>

          <div class="date-sheet-title">{{ monthTitle }}</div>

          <button class="month-nav-btn" @click="$emit('change-month', 1)">
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>

        <div class="week-row">
          <div v-for="item in weekTitles" :key="item" class="week-cell">{{ item }}</div>
        </div>

        <div class="date-grid">
          <div
            v-for="cell in calendarCells"
            :key="cell.key"
            class="date-cell"
            :class="{
              muted: !cell.inCurrentMonth,
              active: cell.dateStr === selectedDate,
              marked: markedDateSet.has(cell.dateStr)
            }"
            @click="cell.inCurrentMonth && $emit('select-date', cell.dateStr)"
          >
            <div class="date-num">{{ cell.day }}</div>
            <div v-if="markedDateSet.has(cell.dateStr)" class="date-dot"></div>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { computed } from 'vue'

/**
 * 日期选择面板
 * 职责：
 * 1. 快速切换月份
 * 2. 快速选择某一天
 * 3. 有记录的日期显示小圆点
 */
const props = defineProps({
  show: { type: Boolean, default: false },
  currentYear: { type: Number, default: new Date().getFullYear() },
  currentMonth: { type: Number, default: new Date().getMonth() + 1 },
  selectedDate: { type: String, default: '' },
  markedDates: { type: Array, default: () => [] }
})

defineEmits(['close', 'select-date', 'change-month'])

const weekTitles = ['一', '二', '三', '四', '五', '六', '日']

const monthTitle = computed(() => {
  const monthNames = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ]
  return `${monthNames[props.currentMonth - 1]} ${props.currentYear}`
})

const markedDateSet = computed(() => {
  return new Set(props.markedDates)
})

const calendarCells = computed(() => {
  const year = props.currentYear
  const month = props.currentMonth

  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)

  let startWeekday = firstDay.getDay()
  if (startWeekday === 0) startWeekday = 7

  const prevMonthLastDay = new Date(year, month - 1, 0).getDate()
  const daysInMonth = lastDay.getDate()

  const cells = []

  for (let i = startWeekday - 1; i > 0; i--) {
    const day = prevMonthLastDay - i + 1
    const d = new Date(year, month - 2, day)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    cells.push({
      key: `prev-${dateStr}`,
      day,
      dateStr,
      inCurrentMonth: false
    })
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    cells.push({
      key: `current-${dateStr}`,
      day,
      dateStr,
      inCurrentMonth: true
    })
  }

  const nextFill = 42 - cells.length
  for (let day = 1; day <= nextFill; day++) {
    const d = new Date(year, month, day)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    cells.push({
      key: `next-${dateStr}`,
      day,
      dateStr,
      inCurrentMonth: false
    })
  }

  return cells
})
</script>

<style scoped>
.date-sheet-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 99999;
  background: rgba(0,0,0,0.28);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.date-sheet {
  width: 100%;
  max-height: 78vh;
  background: #ffffff;
  border-radius: 28px 28px 0 0;
  padding: 18px 16px calc(20px + env(safe-area-inset-bottom, 0px));
  box-shadow: 0 -12px 40px rgba(0,0,0,0.12);
}

.date-sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.date-sheet-title {
  font-size: 15px;
  font-weight: 800;
  color: #1c1c1e;
  letter-spacing: 0.5px;
}

.month-nav-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 12px;
  background: #f4f5f7;
  color: #555;
  cursor: pointer;
}

.week-row {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}

.week-cell {
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  color: #999;
  padding-bottom: 6px;
}

.date-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}

.date-cell {
  height: 48px;
  border-radius: 14px;
  background: #f8f9fa;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
}

.date-cell.muted {
  opacity: 0.35;
}

.date-cell.active {
  background: #1c1c1e;
  color: #fff;
}

.date-cell.marked .date-dot {
  background: #1c1c1e;
}

.date-cell.active .date-dot {
  background: #fff;
}

.date-num {
  font-size: 13px;
  font-weight: 700;
}

.date-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #b5b5ba;
  margin-top: 4px;
}
</style>
