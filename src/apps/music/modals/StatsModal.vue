<template>
  <div class="inner-modal" v-if="show" @click.self="$emit('close')">
    <div class="modal-card" style="background: #1a1a1f; color: #fff; max-height: 85vh;">
      <div class="modal-title"><i class="fas fa-chart-pie"></i> 听歌与羁绊数据</div>
      
      <div v-if="isLoading" style="text-align:center; padding: 20px; color:#888;">加载中...</div>
      <div v-else class="stats-content">
        
        <div class="stat-main-card">
          <div style="font-size:11px; color:#888; text-transform:uppercase;">TOTAL LISTENING TIME</div>
          <div style="font-size:28px; font-weight:700; margin:5px 0;">{{ formatTime(totalAppTime) }}</div>
          <div class="stat-badge">{{ getRank(totalAppTime) }}</div>
        </div>

        <div class="stat-section-title"><i class="fas fa-headphones"></i> 角色共听羁绊</div>
        <div class="bond-list">
          <div v-if="bondList.length === 0" style="text-size:11px; color:#666; text-align:center; padding: 10px;">
            暂无角色羁绊数据，开启“一起听”试试吧。
          </div>
          
          <div v-for="bond in bondList" :key="bond.id" class="bond-item">
            <div class="bond-avatar" :style="bond.avatar ? `background-image:url(${bond.avatar})` : ''">
              {{ !bond.avatar ? bond.name.charAt(0) : '' }}
            </div>
            <div class="bond-info">
              <div class="bond-name">{{ bond.name }}</div>
              <div class="bond-bar-bg">
                <div class="bond-bar-fill" :style="{ width: bond.percent + '%' }"></div>
              </div>
            </div>
            <div class="bond-time">{{ formatTime(bond.time) }}</div>
          </div>
        </div>

      </div>

      <div class="modal-actions" style="margin-top: 15px;">
        <button class="btn-cancel" style="background: #333; color: #fff;" @click="$emit('close')">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import db from '@/db'
import { useCharacters } from '@/composables/useCharacters'

const props = defineProps({ show: Boolean })
const emit = defineEmits(['close'])

const { characters } = useCharacters()

const isLoading = ref(true)
const rawStats = ref({ totalSoloTime: 0, coListenTime: {}, dailyTrends: {} })

const fetchStats = async () => {
  isLoading.value = true
  if (db.musicStats) {
    const data = await db.musicStats.get('global')
    if (data) rawStats.value = data
  }
  isLoading.value = false
}

watch(() => props.show, (val) => {
  if (val) fetchStats()
})

const totalAppTime = computed(() => {
  let total = rawStats.value.totalSoloTime || 0
  Object.values(rawStats.value.coListenTime || {}).forEach(t => total += t)
  return total
})

const bondList = computed(() => {
  const times = rawStats.value.coListenTime || {}
  const list = []
  let maxTime = 1 // 防止除以0
  
  for (const [charId, time] of Object.entries(times)) {
    if (time > 0) {
      const char = characters.value.find(c => String(c.id) === String(charId))
      if (time > maxTime) maxTime = time
      list.push({
        id: charId,
        name: char ? char.name : '已删除角色',
        avatar: char ? char.avatar : '',
        time: time
      })
    }
  }
  
  // 按时间降序，并计算百分比用于进度条
  return list.sort((a, b) => b.time - a.time).map(item => ({
    ...item,
    percent: Math.max(5, (item.time / maxTime) * 100)
  }))
})

const formatTime = (secs) => {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m ${secs % 60}s`
}

const getRank = (secs) => {
  const mins = secs / 60
  if (mins > 5000) return '时间领主'
  if (mins > 1000) return '金耳鉴赏家'
  if (mins > 300) return '节奏旅人'
  if (mins > 60) return '旋律学徒'
  return '初入听界'
}
</script>

<style scoped>
.stats-content { display: flex; flex-direction: column; gap: 15px; overflow-y: auto; padding-right: 5px; }
.stat-main-card { background: #222228; border: 1px solid #333; border-radius: 16px; padding: 20px; text-align: center; }
.stat-badge { display: inline-block; padding: 4px 10px; background: rgba(92,138,255,0.1); border: 1px solid #5c8aff; color: #5c8aff; border-radius: 20px; font-size: 10px; font-weight: 600; }

.stat-section-title { font-size: 13px; font-weight: 600; color: #aaa; margin-top: 10px; }
.bond-list { display: flex; flex-direction: column; gap: 10px; }
.bond-item { display: flex; align-items: center; gap: 12px; background: #222228; padding: 10px; border-radius: 12px; }
.bond-avatar { width: 36px; height: 36px; border-radius: 50%; background: #444; background-size: cover; background-position: center; display: flex; justify-content: center; align-items: center; font-size: 14px; font-weight: bold; }
.bond-info { flex: 1; }
.bond-name { font-size: 13px; font-weight: 600; margin-bottom: 6px; }
.bond-bar-bg { width: 100%; height: 4px; background: #333; border-radius: 2px; }
.bond-bar-fill { height: 100%; background: #5c8aff; border-radius: 2px; }
.bond-time { font-size: 11px; color: #888; width: 50px; text-align: right; }
</style>
