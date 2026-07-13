<template>
  <div class="rpg-page">
    <!-- 双人羁绊区：恢复你和同桌共同成长的叙事 -->
    <div class="bond-card">
      <div class="bond-top-row">
        <div class="bond-role-block">
          <div class="bond-avatar user">我</div>
          <div class="bond-role-name">自己</div>
          <div class="bond-role-sub">今日继续推进</div>
        </div>

        <div class="bond-center-block">
          <div class="bond-kicker">双人羁绊区</div>
          <div class="bond-title">{{ rpgState.bondLabel || '同桌默契' }}</div>
          <div class="bond-level">Lv.{{ rpgState.bondLevel || 1 }}</div>

          <div class="bond-bar">
            <div class="bond-bar-inner" :style="{ width: `${bondPercent}%` }"></div>
          </div>

          <div class="bond-desc">{{ rpgState.partnerStatus || '你们正在共同推进本周主线' }}</div>
        </div>

        <div class="bond-role-block">
          <div class="bond-avatar partner">
            <i class="fas fa-user-astronaut"></i>
          </div>
          <div class="bond-role-name">{{ rpgState.partnerName || '系统同桌' }}</div>
          <div class="bond-role-sub">并肩同步中</div>
        </div>
      </div>
    </div>

    <!-- 主线进度区：新增，集中展示阶段目标 / 周目标推进 -->
    <div class="mainline-card">
      <div class="section-head">
        <div class="section-title">主线进度</div>
        <div class="section-sub">这里集中查看阶段目标与本周任务推进情况</div>
      </div>

      <!-- 阶段目标 -->
      <div class="mainline-group">
        <div class="mainline-group-title">阶段目标</div>

        <div v-if="activePhaseGoals.length === 0" class="mainline-empty">
          当前没有激活中的阶段目标。
        </div>

        <div v-else class="mainline-list">
          <div class="mainline-item" v-for="goal in activePhaseGoals" :key="goal.id">
            <div class="mainline-row">
              <div class="mainline-name">{{ goal.title }}</div>
              <div class="mainline-value">{{ goal.progress || 0 }}%</div>
            </div>

            <div class="mainline-bar">
              <div class="mainline-bar-inner phase" :style="{ width: `${goal.progress || 0}%` }"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 周目标 -->
      <div class="mainline-group">
        <div class="mainline-group-title">周目标</div>

        <div v-if="activeWeekGoals.length === 0" class="mainline-empty">
          当前没有激活中的周目标。
        </div>

        <div v-else class="mainline-list">
          <div class="mainline-item" v-for="goal in activeWeekGoals" :key="goal.id">
            <div class="mainline-row">
              <div class="mainline-name">{{ goal.title }}</div>
              <div class="mainline-value">{{ goal.progress || 0 }}%</div>
            </div>

            <div class="mainline-bar">
              <div class="mainline-bar-inner week" :style="{ width: `${goal.progress || 0}%` }"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 等级 / 经验 / AP 核心数值区 -->
    <div class="core-grid">
      <div class="core-card level-card">
        <div class="core-kicker">{{ rpgState.levelLabel || '等级' }}</div>
        <div class="core-big">Lv.{{ rpgState.level }}</div>
        <div class="core-sub">{{ rpgState.expLabel || '经验' }} {{ rpgState.exp }} / {{ rpgState.nextExp }}</div>
      </div>

      <div class="core-card ap-card">
        <div class="core-kicker">{{ rpgState.apLabel || '行动点' }}</div>
        <div class="core-big">{{ rpgState.actionPoints }}</div>
        <div class="core-sub">今日新增 {{ rpgState.todayAp }}</div>
      </div>

      <div class="core-card today-exp-card">
        <div class="core-kicker">今日 EXP</div>
        <div class="core-big">{{ rpgState.todayExp }}</div>
        <div class="core-sub">今日成长汇总</div>
      </div>
    </div>

    <!-- 经验条：单独拉开层级 -->
    <div class="exp-card">
      <div class="exp-head">
        <div class="exp-title">{{ rpgState.expLabel || '经验进度' }}</div>
        <div class="exp-value">{{ rpgState.exp }} / {{ rpgState.nextExp }}</div>
      </div>

      <div class="exp-bar">
        <div class="exp-bar-inner" :style="{ width: `${expPercent}%` }"></div>
      </div>
    </div>

    <!-- 技能雷达图 -->
    <div class="radar-card">
      <div class="section-head">
        <div class="section-title">技能雷达图</div>
        <div class="section-sub">最近行为映射出的成长倾向</div>
      </div>

      <div class="radar-area">
        <RpgRadarChart :skills="radarSkills" />
      </div>

      <div class="radar-legend">
        <div v-for="item in radarSkills" :key="item.label" class="radar-legend-item">
          <span class="radar-legend-name">{{ item.label }}</span>
          <span class="radar-legend-value">{{ item.value }}</span>
        </div>
      </div>
    </div>

    <!-- 本周 Boss -->
    <div class="boss-card">
      <div class="section-head">
        <div class="section-title">本周 Boss</div>
        <div class="section-sub">你和同桌正在共同攻略本周主线</div>
      </div>

      <div class="boss-row">
        <div class="boss-left">
          <div class="boss-name">{{ rpgState.bossLabel || '周目标推进体' }}</div>
          <div class="boss-desc">{{ currentBossDesc }}</div>
        </div>

        <div class="boss-right">
          {{ rpgState.weeklyBossHp }} / {{ rpgState.weeklyBossMaxHp }}
        </div>
      </div>

      <div class="boss-bar">
        <div class="boss-bar-inner" :style="{ width: `${bossPercent}%` }"></div>
      </div>
    </div>

    <!-- 九宫格入口 -->
    <div class="bingo-card">
      <div class="section-head">
        <div class="section-title">九宫格入口</div>
        <div class="section-sub">后续可消耗 AP 点亮格子并触发连线奖励</div>
      </div>

      <div class="bingo-grid-preview">
        <div v-for="n in 9" :key="n" class="bingo-cell-preview"></div>
      </div>

      <div class="bingo-foot">
        <div class="bingo-foot-text">连线玩法入口预留</div>
        <div class="bingo-foot-pill">AP {{ rpgState.actionPoints }}</div>
      </div>
    </div>

    <!-- 成就 / 商店入口预留 -->
    <div class="reserve-grid">
      <div class="reserve-card">
        <div class="reserve-icon">
          <i class="fas fa-medal"></i>
        </div>
        <div class="reserve-title">成就</div>
        <div class="reserve-sub">后续接入连续完成、专注达成等勋章</div>
      </div>

      <div class="reserve-card">
        <div class="reserve-icon">
          <i class="fas fa-store"></i>
        </div>
        <div class="reserve-title">商店</div>
        <div class="reserve-sub">后续接入 AP 消耗、奖励兑换与事件解锁</div>
      </div>
    </div>

    <!-- 最近成长记录 -->
    <div class="log-card">
      <div class="section-head">
        <div class="section-title">最近成长记录</div>
        <div class="section-sub">你们最近结算过的奖励</div>
      </div>

      <div v-if="recentLogs.length === 0" class="empty-state">
        还没有奖励记录。完成任务或专注后，这里会开始积累战报。
      </div>

      <div v-else class="log-list">
        <div v-for="item in recentLogs" :key="item.id" class="log-item">
          <div class="log-main">
            <div class="log-reason">{{ item.reason || '获得奖励' }}</div>
            <div class="log-source">{{ formatLogSource(item) }}</div>
          </div>

          <div class="log-right">
            <div v-if="item.exp > 0" class="log-num">+{{ item.exp }} EXP</div>
            <div v-if="item.ap > 0" class="log-num ap">+{{ item.ap }} AP</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import RpgRadarChart from '../components/RpgRadarChart.vue'

/**
 * Tab4：RPG 主页面
 * 当前职责：
 * 1. 展示双人羁绊区
 * 2. 展示阶段目标 / 周目标主线进度
 * 3. 展示等级 / 经验 / AP
 * 4. 展示技能雷达图
 * 5. 展示本周 Boss
 * 6. 预留九宫格 / 成就 / 商店入口
 * 7. 展示最近奖励记录
 */
const props = defineProps({
  rpgState: {
    type: Object,
    default: () => ({
      level: 1,
      exp: 0,
      nextExp: 120,
      actionPoints: 0,
      todayExp: 0,
      todayAp: 0,
      weeklyBossHp: 100,
      weeklyBossMaxHp: 100,
      bondLevel: 1,
      partnerName: '系统同桌',
      partnerStatus: '正在与你推进本周主线',
      levelLabel: '等级',
      expLabel: '经验',
      apLabel: '行动点',
      bossLabel: '周目标推进体',
      bondLabel: '同桌默契',
      recentLogs: []
    })
  },
  activePhaseGoals: {
    type: Array,
    default: () => []
  },
  activeWeekGoals: {
    type: Array,
    default: () => []
  }
})

/**
 * 经验百分比
 */
const expPercent = computed(() => {
  const next = Number(props.rpgState?.nextExp || 0)
  const exp = Number(props.rpgState?.exp || 0)
  if (!next) return 0
  return Math.min(100, Math.round((exp / next) * 100))
})

/**
 * Boss 血量百分比
 */
const bossPercent = computed(() => {
  const hp = Number(props.rpgState?.weeklyBossHp || 0)
  const max = Number(props.rpgState?.weeklyBossMaxHp || 0)
  if (!max) return 0
  return Math.max(0, Math.min(100, Math.round((hp / max) * 100)))
})

/**
 * 羁绊条百分比
 */
const bondPercent = computed(() => {
  const level = Number(props.rpgState?.bondLevel || 1)
  const logCount = Array.isArray(props.rpgState?.recentLogs) ? props.rpgState.recentLogs.length : 0
  return Math.max(10, Math.min(100, level * 18 + logCount * 4))
})

/**
 * 最近奖励记录
 */
const recentLogs = computed(() => {
  return props.rpgState?.recentLogs || []
})

/**
 * 技能雷达图数据
 * 当前版本先根据最近奖励日志做基础映射
 * 后续第 8 批再进入可 DIY 化和精细规则
 */
const radarSkills = computed(() => {
  const logs = recentLogs.value

  const todoLogs = logs.filter(item => item.sourceType === 'todo_plan_daily')
  const pomodoroLogs = logs.filter(item => item.sourceType === 'pomodoro')
  const extraLogs = logs.filter(item => item.sourceType === 'extra_result')
  const q12Logs = logs.filter(item => {
    const q = Number(item.meta?.quadrant || 0)
    return q === 1 || q === 2
  })

  const totalExp = logs.reduce((sum, item) => sum + Number(item.exp || 0), 0)

  const execution = Math.min(100, 18 + todoLogs.length * 12)
  const focus = Math.min(100, 12 + pomodoroLogs.length * 18)
  const academic = Math.min(100, 10 + q12Logs.length * 14)
  const life = Math.min(100, 10 + extraLogs.length * 16)
  const create = Math.min(100, 10 + Math.round(totalExp / 4))
  const sync = Math.min(100, 12 + Number(props.rpgState?.bondLevel || 1) * 14 + logs.length * 3)

  return [
    { label: '执行', value: execution },
    { label: '专注', value: focus },
    { label: '学术', value: academic },
    { label: '生活', value: life },
    { label: '创造', value: create },
    { label: '协同', value: sync }
  ]
})

/**
 * Boss 描述
 */
const currentBossDesc = computed(() => {
  const hp = Number(props.rpgState?.weeklyBossHp || 0)
  const max = Number(props.rpgState?.weeklyBossMaxHp || 0)
  if (!max) return '尚未设定本周主线 Boss'
  const percent = hp / max

  if (percent > 0.75) return '主线仍处于厚重阻力阶段'
  if (percent > 0.45) return '你们已经开始撕开推进口'
  if (percent > 0.15) return '主线已接近击破边缘'
  return '本周目标已逼近完成临界点'
})

/**
 * 格式化奖励来源文案
 */
const formatLogSource = (item) => {
  if (item.sourceType === 'todo_plan_daily') {
    return item.meta?.planTitle || '计划结算'
  }
  if (item.sourceType === 'extra_result') {
    return '计划外事项'
  }
  if (item.sourceType === 'pomodoro') {
    return '专注奖励'
  }
  return '系统奖励'
}
</script>

<style scoped>
/* 根容器：修复 Tab4 无法滚动的问题 */
.rpg-page {
  padding: 16px 16px 110px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  overflow-y: auto;
}

/* 隐藏滚动条，避免挤压页面 */
.rpg-page::-webkit-scrollbar {
  display: none;
}
.rpg-page {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

/* =========================
   双人羁绊区
   ========================= */
.bond-card {
  background:
    linear-gradient(135deg, #1c1c1e 0%, #2d2d32 58%, #3a3a40 100%);
  border-radius: 28px;
  padding: 18px 16px;
  color: #fff;
  box-shadow: 0 14px 36px rgba(0,0,0,0.16);
}

.bond-top-row {
  display: grid;
  grid-template-columns: 82px 1fr 82px;
  gap: 10px;
  align-items: center;
}

.bond-role-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.bond-avatar {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 18px;
  font-weight: 900;
  color: #fff;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.16);
}

.bond-avatar.user {
  background: rgba(255,255,255,0.12);
}

.bond-avatar.partner {
  background: rgba(255,255,255,0.12);
}

.bond-role-name {
  margin-top: 8px;
  font-size: 12px;
  font-weight: 800;
}

.bond-role-sub {
  margin-top: 4px;
  font-size: 10px;
  color: rgba(255,255,255,0.62);
  line-height: 1.5;
}

.bond-center-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.bond-kicker {
  font-size: 10px;
  font-weight: 800;
  color: rgba(255,255,255,0.62);
  letter-spacing: 1px;
}

.bond-title {
  margin-top: 6px;
  font-size: 18px;
  font-weight: 900;
  letter-spacing: 0.3px;
}

.bond-level {
  margin-top: 6px;
  font-size: 12px;
  font-weight: 800;
  color: rgba(255,255,255,0.72);
}

.bond-bar {
  margin-top: 10px;
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: rgba(255,255,255,0.12);
  overflow: hidden;
}

.bond-bar-inner {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #ffffff 0%, #d9d9de 100%);
}

.bond-desc {
  margin-top: 10px;
  font-size: 11px;
  color: rgba(255,255,255,0.66);
  line-height: 1.6;
}

/* =========================
   主线进度区
   ========================= */
.mainline-card {
  background: #ffffff;
  border-radius: 24px;
  padding: 16px;
  box-shadow: 0 6px 18px rgba(0,0,0,0.03);
  border: 1px solid rgba(0,0,0,0.03);
}

.mainline-group {
  margin-top: 14px;
}

.mainline-group-title {
  font-size: 12px;
  font-weight: 800;
  color: #8e8e93;
  margin-bottom: 10px;
  letter-spacing: 0.3px;
}

.mainline-empty {
  padding: 12px 0;
  font-size: 12px;
  color: #b1b1b6;
  line-height: 1.7;
}

.mainline-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mainline-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mainline-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.mainline-name {
  flex: 1;
  font-size: 13px;
  font-weight: 700;
  color: #1c1c1e;
  line-height: 1.5;
}

.mainline-value {
  font-size: 11px;
  font-weight: 800;
  color: #8e8e93;
  white-space: nowrap;
}

.mainline-bar {
  height: 8px;
  border-radius: 999px;
  background: #f1f2f4;
  overflow: hidden;
}

.mainline-bar-inner {
  height: 100%;
  border-radius: 999px;
}

.mainline-bar-inner.phase {
  background: linear-gradient(90deg, #5d6670 0%, #2f353b 100%);
}

.mainline-bar-inner.week {
  background: linear-gradient(90deg, #1c1c1e 0%, #4b4b51 100%);
}

/* =========================
   核心数值区
   ========================= */
.core-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.core-card {
  background: #ffffff;
  border-radius: 20px;
  padding: 14px;
  box-shadow: 0 6px 18px rgba(0,0,0,0.03);
  border: 1px solid rgba(0,0,0,0.03);
}

.core-kicker {
  font-size: 11px;
  color: #999;
  font-weight: 800;
  letter-spacing: 0.5px;
}

.core-big {
  margin-top: 8px;
  font-size: 24px;
  font-weight: 900;
  color: #1c1c1e;
  line-height: 1;
}

.core-sub {
  margin-top: 8px;
  font-size: 11px;
  color: #8e8e93;
  line-height: 1.6;
}

/* =========================
   经验条
   ========================= */
.exp-card {
  background: #ffffff;
  border-radius: 22px;
  padding: 16px;
  box-shadow: 0 6px 18px rgba(0,0,0,0.03);
  border: 1px solid rgba(0,0,0,0.03);
}

.exp-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.exp-title {
  font-size: 13px;
  font-weight: 800;
  color: #333;
}

.exp-value {
  font-size: 11px;
  color: #888;
  font-weight: 700;
}

.exp-bar {
  margin-top: 10px;
  height: 9px;
  border-radius: 999px;
  background: #f1f2f4;
  overflow: hidden;
}

.exp-bar-inner {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #1c1c1e 0%, #4b4b51 100%);
}

/* =========================
   通用区块头
   ========================= */
.section-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.section-title {
  font-size: 14px;
  font-weight: 900;
  color: #1c1c1e;
}

.section-sub {
  font-size: 11px;
  color: #999;
  line-height: 1.6;
}

/* =========================
   技能雷达图
   ========================= */
.radar-card {
  background: #ffffff;
  border-radius: 24px;
  padding: 16px;
  box-shadow: 0 6px 18px rgba(0,0,0,0.03);
  border: 1px solid rgba(0,0,0,0.03);
}

.radar-area {
  margin-top: 12px;
}

.radar-legend {
  margin-top: 8px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.radar-legend-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8f9fa;
  border-radius: 12px;
  padding: 8px 10px;
}

.radar-legend-name {
  font-size: 11px;
  color: #666;
  font-weight: 700;
}

.radar-legend-value {
  font-size: 11px;
  color: #1c1c1e;
  font-weight: 900;
}

/* =========================
   Boss
   ========================= */
.boss-card {
  background: #ffffff;
  border-radius: 24px;
  padding: 16px;
  box-shadow: 0 6px 18px rgba(0,0,0,0.03);
  border: 1px solid rgba(0,0,0,0.03);
}

.boss-row {
  margin-top: 12px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.boss-left {
  flex: 1;
}

.boss-name {
  font-size: 15px;
  font-weight: 900;
  color: #1c1c1e;
}

.boss-desc {
  margin-top: 6px;
  font-size: 11px;
  color: #8e8e93;
  line-height: 1.6;
}

.boss-right {
  font-size: 11px;
  color: #888;
  font-weight: 800;
  white-space: nowrap;
}

.boss-bar {
  margin-top: 12px;
  height: 10px;
  border-radius: 999px;
  background: #f1f2f4;
  overflow: hidden;
}

.boss-bar-inner {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #111111 0%, #4d4d55 100%);
}

/* =========================
   九宫格入口
   ========================= */
.bingo-card {
  background: #ffffff;
  border-radius: 24px;
  padding: 16px;
  box-shadow: 0 6px 18px rgba(0,0,0,0.03);
  border: 1px solid rgba(0,0,0,0.03);
}

.bingo-grid-preview {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.bingo-cell-preview {
  aspect-ratio: 1 / 1;
  border-radius: 14px;
  background:
    linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border: 1px solid rgba(0,0,0,0.05);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.9);
}

.bingo-foot {
  margin-top: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.bingo-foot-text {
  font-size: 12px;
  color: #777;
  font-weight: 700;
}

.bingo-foot-pill {
  padding: 6px 10px;
  border-radius: 999px;
  background: #1c1c1e;
  color: #fff;
  font-size: 11px;
  font-weight: 800;
}

/* =========================
   入口预留
   ========================= */
.reserve-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.reserve-card {
  background: #ffffff;
  border-radius: 22px;
  padding: 16px;
  box-shadow: 0 6px 18px rgba(0,0,0,0.03);
  border: 1px solid rgba(0,0,0,0.03);
}

.reserve-icon {
  width: 38px;
  height: 38px;
  border-radius: 14px;
  background: #f4f5f7;
  color: #1c1c1e;
  display: flex;
  justify-content: center;
  align-items: center;
}

.reserve-title {
  margin-top: 10px;
  font-size: 14px;
  font-weight: 800;
  color: #1c1c1e;
}

.reserve-sub {
  margin-top: 6px;
  font-size: 11px;
  color: #999;
  line-height: 1.6;
}

/* =========================
   最近成长记录
   ========================= */
.log-card {
  background: #ffffff;
  border-radius: 24px;
  padding: 16px;
  box-shadow: 0 6px 18px rgba(0,0,0,0.03);
  border: 1px solid rgba(0,0,0,0.03);
}

.empty-state {
  margin-top: 14px;
  font-size: 12px;
  color: #aaa;
  line-height: 1.7;
  text-align: center;
  padding: 12px 0;
}

.log-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.log-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border-radius: 16px;
  background: #f8f9fa;
}

.log-main {
  flex: 1;
}

.log-reason {
  font-size: 13px;
  font-weight: 700;
  color: #1c1c1e;
}

.log-source {
  margin-top: 4px;
  font-size: 11px;
  color: #999;
  line-height: 1.6;
}

.log-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.log-num {
  font-size: 12px;
  font-weight: 900;
  color: #1c1c1e;
}

.log-num.ap {
  color: #666;
}
</style>
