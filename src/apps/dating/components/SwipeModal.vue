<template>
  <transition name="fade-scale">
    <div v-if="show" class="swipe-modal">
      
      <!-- 顶部状态栏 -->
      <div class="swipe-header">
        <i class="fas fa-chevron-down" style="cursor: pointer; font-size: 20px;" @click="$emit('close')"></i>
        <div style="font-weight: 600; letter-spacing: 1px;">冷推速配</div>
        <i class="fas fa-sliders-h" style="cursor: pointer; color: #14CCCC; font-size: 18px;" @click="$emit('open-filter')"></i>
      </div>
      
      <!-- 卡片堆叠区 -->
      <div class="card-container">
        
        <div v-if="isGenerating" class="loading-state">
          <div class="radar-pulse"></div>
          <p>正在搜寻高匹配度目标...</p>
        </div>

        <div v-else-if="cards.length === 0" class="empty-state">
          <i class="fas fa-inbox" style="font-size: 40px; color: #c7c7cc; margin-bottom: 10px;"></i>
          <p>附近暂无可匹配卡片</p>
          <button class="btn-reload" @click="fetchCards">重新扫描</button>
        </div>

        <!-- 仅渲染前两张卡片以提升性能 -->
        <div v-for="(card, index) in visibleCards" :key="index" 
             class="swipe-card" 
             :class="{'card-top': index === 0, 'card-behind': index === 1, 'fly-left': topCardAction === 'left' && index === 0, 'fly-right': topCardAction === 'right' && index === 0}"
             :style="getCardBg(card)">
          
          <div class="card-img-placeholder">
            <div class="gradient-overlay"></div>
          </div>
          
          <div class="card-info">
            <div class="card-title">
              {{ card.nickname }} <span class="card-age">{{ card.age }}岁 / {{ card.gender }}</span>
            </div>
            
            <div class="tag-list">
              <span class="tag" v-for="(tag, tIdx) in card.tags" :key="tIdx">{{ tag }}</span>
            </div>
            
            <div class="card-bio">{{ card.bio }}</div>
            <div class="card-appearance"><i class="fas fa-eye"></i> {{ card.appearance_summary }}</div>
          </div>
        </div>
      </div>

      <!-- 底部操作区 -->
      <div class="swipe-actions" v-if="cards.length > 0 && !isGenerating">
        <button class="btn-action btn-pass" @click="handleAction('left')" :disabled="topCardAction !== null"><i class="fas fa-times"></i></button>
        <button class="btn-action btn-wink" @click="handleWink" :disabled="topCardAction !== null"><i class="fas fa-heartbeat"></i></button>
        <button class="btn-action btn-chat" @click="handleAction('right')" :disabled="topCardAction !== null"><i class="fas fa-comment"></i></button>
      </div>
      
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useDatingMatch } from '@/composables/useDatingMatch'
import { useDatingPrefs } from '@/composables/useDatingPrefs'

const props = defineProps({ show: Boolean })
const emit = defineEmits(['close', 'open-filter', 'start-chat'])

const { generateSwipeCards, generateFullProfile, isGenerating } = useDatingMatch()
const { addPrefTag } = useDatingPrefs()

const cards = ref([])
const topCardAction = ref(null) // 'left' 或 'right'

// 颜色生成器，根据 tag 或名称生成独一无二的渐变背景
const getCardBg = (card) => {
  const hash = card.nickname.charCodeAt(0) + (card.age || 20)
  const hue = hash % 360
  return {
    '--card-theme': `hsl(${hue}, 40%, 40%)`
  }
}

const visibleCards = computed(() => cards.value.slice(0, 2))

const fetchCards = async () => {
  cards.value = []
  const newCards = await generateSwipeCards()
  if (newCards && newCards.length > 0) {
    cards.value = newCards
  } else {
    window.dispatchEvent(new CustomEvent('sys-toast', { detail: 'AI 脑力耗尽，未获取到卡片' }))
  }
}

watch(() => props.show, (val) => {
  if (val && cards.value.length === 0) {
    fetchCards()
  }
})

// 挤眼：收集偏好但不滑走
const handleWink = () => {
  const topCard = cards.value[0]
  if (!topCard) return
  topCard.tags.forEach(t => addPrefTag(t))
  window.dispatchEvent(new CustomEvent('sys-toast', { detail: '已记录 XP 偏好！' }))
  
  // 制造一个轻微的心跳特效反馈
  const winkBtn = document.querySelector('.btn-wink')
  if (winkBtn) {
    winkBtn.style.transform = 'scale(1.3)'
    setTimeout(() => { winkBtn.style.transform = 'scale(1)' }, 150)
  }
}

const handleAction = async (direction) => {
  if (cards.value.length === 0 || topCardAction.value !== null) return
  
  const topCard = cards.value[0]
  topCardAction.value = direction

  if (direction === 'right') {
    window.dispatchEvent(new CustomEvent('sys-toast', { detail: '匹配成功，正在构建深度精神网络...' }))
    // 后台静默生成完整人设
    const res = await generateFullProfile(topCard, false)
    if (res) {
      window.dispatchEvent(new CustomEvent('sys-toast', { detail: '人设构建完毕！' }))
    } else {
      window.dispatchEvent(new CustomEvent('sys-toast', { detail: '对方在时空缝隙中走丢了。' }))
    }
  }

  // 动画延迟后移除卡片
  setTimeout(() => {
    cards.value.shift()
    topCardAction.value = null
    if (cards.value.length === 0) {
      fetchCards()
    }
  }, 400)
}
</script>

<style scoped>
.swipe-modal { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #111; z-index: 200; display: flex; flex-direction: column; overflow: hidden; }
.fade-scale-enter-active, .fade-scale-leave-active { transition: opacity 0.3s, transform 0.3s; }
.fade-scale-enter-from, .fade-scale-leave-to { opacity: 0; transform: scale(0.95); }

.swipe-header { padding: calc(env(safe-area-inset-top) + 16px) 20px 20px; display: flex; justify-content: space-between; color: white; align-items: center; z-index: 10; }

.card-container { flex: 1; position: relative; display: flex; justify-content: center; align-items: center; perspective: 1000px; overflow: hidden; }

.loading-state, .empty-state { position: absolute; display: flex; flex-direction: column; align-items: center; color: #8e8e93; font-size: 14px; }
.radar-pulse { width: 60px; height: 60px; border-radius: 50%; background: rgba(20, 204, 204, 0.2); border: 2px solid #14CCCC; animation: radar 1.5s infinite ease-out; margin-bottom: 20px; }
@keyframes radar { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }
.btn-reload { margin-top: 20px; padding: 10px 24px; background: #14CCCC; color: white; border: none; border-radius: 20px; font-weight: 600; cursor: pointer; }

.swipe-card { position: absolute; width: 85%; height: 75%; background: #ffffff; border-radius: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); display: flex; flex-direction: column; overflow: hidden; transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s; transform-origin: bottom center; }
.card-top { z-index: 3; transform: scale(1) translateY(0); opacity: 1; }
.card-behind { z-index: 2; transform: scale(0.92) translateY(20px); opacity: 0.8; }
.fly-left { transform: translateX(-150%) rotate(-15deg) !important; opacity: 0 !important; }
.fly-right { transform: translateX(150%) rotate(15deg) !important; opacity: 0 !important; }

.card-img-placeholder { height: 45%; background: var(--card-theme, #2c3e50); position: relative; display: flex; justify-content: center; align-items: center; }
.gradient-overlay { position: absolute; bottom: 0; width: 100%; height: 50px; background: linear-gradient(to bottom, transparent, #ffffff); }

.card-info { padding: 20px; flex: 1; display: flex; flex-direction: column; overflow-y: auto; }
.card-title { font-size: 22px; font-weight: 800; margin-bottom: 8px; color: #1c1c1e; display: flex; align-items: baseline; gap: 8px; }
.card-age { font-size: 13px; color: #8e8e93; font-weight: 600; }
.tag-list { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; }
.tag { font-size: 11px; padding: 4px 10px; background: rgba(20, 204, 204, 0.1); color: #14CCCC; border-radius: 6px; font-weight: 600; }
.card-bio { font-size: 14px; line-height: 1.6; color: #333; margin-bottom: 12px; font-style: italic; }
.card-appearance { font-size: 12px; line-height: 1.5; color: #8e8e93; background: #f4f5f7; padding: 10px; border-radius: 8px; display: flex; gap: 8px; align-items: flex-start; }

.swipe-actions { padding: 20px 20px calc(20px + env(safe-area-inset-bottom)); display: flex; justify-content: space-evenly; align-items: center; z-index: 10; }
.btn-action { width: 64px; height: 64px; border-radius: 50%; background: #ffffff; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 10px 20px rgba(0,0,0,0.2); transition: transform 0.2s; font-size: 24px; }
.btn-action:active { transform: scale(0.9); }
.btn-pass { color: #ff3b30; } 
.btn-wink { color: #ff2d55; width: 54px; height: 54px; font-size: 20px; box-shadow: 0 5px 15px rgba(255, 45, 85, 0.3); transition: transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275); } 
.btn-chat { color: #14CCCC; }
</style>
