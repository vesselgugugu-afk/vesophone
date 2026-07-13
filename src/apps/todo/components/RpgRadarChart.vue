<template>
  <div class="radar-wrap">
    <svg class="radar-svg" viewBox="0 0 240 240">
      <!-- 背景同心六边形：用于形成雷达图层级 -->
      <polygon
        v-for="(polygon, index) in backgroundPolygons"
        :key="`bg_${index}`"
        :points="polygon"
        class="radar-bg-polygon"
      />

      <!-- 辐射线：从中心到每个技能维度 -->
      <line
        v-for="(line, index) in axisLines"
        :key="`line_${index}`"
        :x1="120"
        y1="120"
        :x2="line.x"
        :y2="line.y"
        class="radar-axis-line"
      />

      <!-- 数据面：技能成长可视化 -->
      <polygon
        :points="dataPolygon"
        class="radar-data-polygon"
      />

      <!-- 数据点 -->
      <circle
        v-for="(point, index) in dataPoints"
        :key="`point_${index}`"
        :cx="point.x"
        :cy="point.y"
        r="4"
        class="radar-data-point"
      />

      <!-- 标签 -->
      <text
        v-for="(label, index) in labelPoints"
        :key="`label_${index}`"
        :x="label.x"
        :y="label.y"
        class="radar-label"
      >
        {{ label.text }}
      </text>
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue'

/**
 * 技能雷达图
 * 当前职责：
 * 1. 显示 6 维成长维度
 * 2. 使用纯 SVG 绘制，减少外部依赖
 * 3. 为后续 DIY 技能维度预留统一显示组件
 */
const props = defineProps({
  skills: {
    type: Array,
    default: () => ([
      { label: '执行', value: 40 },
      { label: '专注', value: 35 },
      { label: '学术', value: 30 },
      { label: '生活', value: 28 },
      { label: '创造', value: 24 },
      { label: '社交', value: 20 }
    ])
  }
})

/**
 * 获取六边形顶点
 * centerX, centerY 为中心点
 * radius 为半径
 * count 固定等于维度数
 */
const getPolygonPoints = (radius, values = null) => {
  const cx = 120
  const cy = 120
  const count = props.skills.length || 6
  const points = []

  for (let i = 0; i < count; i++) {
    const angle = (-90 + (360 / count) * i) * Math.PI / 180
    const percent = values ? (Number(values[i] || 0) / 100) : 1
    const x = cx + Math.cos(angle) * radius * percent
    const y = cy + Math.sin(angle) * radius * percent
    points.push(`${x},${y}`)
  }

  return points.join(' ')
}

/**
 * 背景网格
 */
const backgroundPolygons = computed(() => {
  return [
    getPolygonPoints(88),
    getPolygonPoints(70),
    getPolygonPoints(52),
    getPolygonPoints(34)
  ]
})

/**
 * 轴线
 */
const axisLines = computed(() => {
  const cx = 120
  const cy = 120
  const radius = 88
  const count = props.skills.length || 6
  const list = []

  for (let i = 0; i < count; i++) {
    const angle = (-90 + (360 / count) * i) * Math.PI / 180
    list.push({
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius
    })
  }

  return list
})

/**
 * 数据多边形
 */
const dataPolygon = computed(() => {
  const values = props.skills.map(item => Number(item.value || 0))
  return getPolygonPoints(88, values)
})

/**
 * 数据点
 */
const dataPoints = computed(() => {
  const cx = 120
  const cy = 120
  const radius = 88
  const count = props.skills.length || 6

  return props.skills.map((item, index) => {
    const angle = (-90 + (360 / count) * index) * Math.PI / 180
    const percent = Number(item.value || 0) / 100
    return {
      x: cx + Math.cos(angle) * radius * percent,
      y: cy + Math.sin(angle) * radius * percent
    }
  })
})

/**
 * 标签位置
 */
const labelPoints = computed(() => {
  const cx = 120
  const cy = 120
  const radius = 108
  const count = props.skills.length || 6

  return props.skills.map((item, index) => {
    const angle = (-90 + (360 / count) * index) * Math.PI / 180
    return {
      text: item.label,
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius
    }
  })
})
</script>

<style scoped>
.radar-wrap {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.radar-svg {
  width: 100%;
  max-width: 260px;
  height: auto;
}

.radar-bg-polygon {
  fill: none;
  stroke: #e6e8eb;
  stroke-width: 1;
}

.radar-axis-line {
  stroke: #eceef1;
  stroke-width: 1;
}

.radar-data-polygon {
  fill: rgba(28, 28, 30, 0.10);
  stroke: #1c1c1e;
  stroke-width: 2;
}

.radar-data-point {
  fill: #1c1c1e;
}

.radar-label {
  fill: #8e8e93;
  font-size: 11px;
  font-weight: 700;
  text-anchor: middle;
  dominant-baseline: middle;
}
</style>
