<template>
  <transition name="fade-scale">
    <div v-if="show" class="swipe-modal">
      
      <div class="swipe-header">
        <i class="fas fa-chevron-down" style="cursor: pointer; font-size: 20px;" @click="$emit('close')"></i>
        <div style="font-weight: 600; letter-spacing: 1px;">冷推速配</div>
        <i class="fas fa-sliders-h" style="cursor: pointer; color: #14CCCC; font-size: 18px;" @click="$emit('open-filter')"></i>
      </div>
      
      <div class="card-container">
        
        <div v-if="isGenerating" class="loading-state">
          <div class="radar-pulse"></div>
          <p>正在搜寻高匹配度目标...</p>
        </div>

        <div v-else-if="cards.length === 0" class="empty-state">
          <div class="radar-idle"><i class="fas fa-satellite-dish" style="font-size: 40px; color: #14CCCC; margin-bottom: 20px;"></i></div>
          <p style="margin-bottom: 20px; font-weight: 600; color: #fff;">雷达已就绪</p>
          <button class="btn-start-scan" @click="fetchCards">开始扫描</button>
        </div>

        <template v-else>
          <div v-for="(card, index) in visibleCards" :key="index" class="swipe-card" :class="{'card-top': index === 0, 'card-behind': index === 1, 'fly-left': topCardAction === 'left' && index === 0, 'fly-right': topCardAction === 'right' && index === 0}" :style="getCardBg(card)">
            <div class="card-img-placeholder"><div class="gradient-overlay"></div></div>
            <div class="card-info">
              <div class="card-title">{{ card.nickname }} <span class="card-age">{{ card.age }}岁 / {{ card.gender }}</span></div>
              <div class="tag-list"><span class="tag" v-for="(tag, tIdx) in card.tags" :key="tIdx">{{ tag }}</span></div>
              <div class="card-bio">{{ card.bio }}</div>
              <div class="card-appearance"><i class="fas fa-eye"></i> {{ card.appearance_summary }}</div>
            </div>
          </div>
        </template>
      </div>

      <div class="swipe-actions" v-if="cards.length > 0 && !isGenerating">
        <button class="btn-action btn-pass" @click="handleAction('left')" :disabled="topCardAction !== null || pendingMatchCard !== null"><i class="fas fa-times"></i></button>
        <button class="btn-action btn-wink" @click="handleWink" :disabled="topCardAction !== null || pendingMatchCard !== null"><i class="fas fa-heartbeat"></i></button>
        <button class="btn-action btn-chat" @click="handleAction('right')" :disabled="topCardAction !== null || pendingMatchCard !== null"><i class="fas fa-comment"></i></button>
      </div>
      
      <!-- 匹配确认弹窗 & 生成阻断 -->
      <div class="match-confirm-mask" v-if="pendingMatchCard">
        <div class="match-confirm-box">
          <div class="match-icon">
            <i v-if="isMatching" class="fas fa-spinner fa-spin"></i>
            <i v-else class="fas fa-heart"></i>
          </div>
          <h3 style="color: #1c1c1e; font-size: 18px; margin-bottom: 8px;">{{ isMatching ? '建立链路中...' : '看对眼了？' }}</h3>
          <p style="color: #8e8e93; font-size: 13px; line-height: 1.5; margin-bottom: 24px;">
            {{ isMatching ? '正在生成深层精神网络，请稍候...' : `是否确定与 ${pendingMatchCard.nickname} 开启聊天？` }}
          </p>
          <div class="match-actions" v-if="!isMatching">
            <button class="btn-cancel-match" @click="confirmMatch(false)">我再想想</button>
            <button class="btn-start-match" @click="confirmMatch(true)">连接同频</button>
          </div>
          <div class="match-actions" v-else>
            <button class="btn-cancel-match" style="background:#ff3b30; color:#fff;" @click="cancelOngoingMatch">强制中断</button>
          </div>
        </div>
      </div>

      <!-- 错误提示弹窗 -->
      <div class="error-modal-mask" v-if="errorText">
        <div class="error-box">
          <i class="fas fa-exclamation-triangle" style="font-size:30px; color:#ff3b30; margin-bottom:12px;"></i>
          <h3 style="color:#1c1c1e; margin-bottom:8px;">连接异常</h3>
          <div style="font-size:12px; color:#8e8e93; max-height:100px; overflow-y:auto; margin-bottom:20px; text-align:left; background:#f4f5f7; padding:10px; border-radius:8px;">{{ errorText }}</div>
          <button style="width:100%; padding:12px; background:#1c1c1e; color:#fff; border:none; border-radius:12px;" @click="errorText = null">我知道了</button>
        </div>
      </div>

    </div>
  </transition>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useDatingMatch } from '@/composables/useDatingMatch'
import { useDatingPrefs } from '@/composables/useDatingPrefs'

const props = defineProps({ show: Boolean })
const emit = defineEmits(['close', 'open-filter', 'start-chat'])

const { generateSwipeCards, generateFullProfile, isGenerating } = useDatingMatch()
const { addPrefTag } = useDatingPrefs()

const cards = ref([])
const topCardAction = ref(null) 
const pendingMatchCard = ref(null) 
const isMatching = ref(false)
const abortMatch = ref(false)
const errorText = ref(null)

const getCardBg = (card) => {
  const hash = card.nickname.charCodeAt(0) + (card.age || 20)
  return { '--card-theme': `hsl(${hash % 360}, 40%, 40%)` }
}
const visibleCards = computed(() => cards.value.slice(0, 2))

const fetchCards = async () => {
  errorText.value = null
  const res = await generateSwipeCards()
  if (res.success && res.data.length > 0) {
    cards.value = res.data
  } else {
    errorText.value = res.error || '未获取到卡片数据'
  }
}

const handleWink = () => {
  const topCard = cards.value[0]
  if (!topCard) return
  topCard.tags.forEach(t => addPrefTag(t))
  window.dispatchEvent(new CustomEvent('sys-toast', { detail: '已记录偏好特征！' }))
}

const handleAction = (direction) => {
  if (cards.value.length === 0 || topCardAction.value !== null) return
  if (direction === 'right') { pendingMatchCard.value = cards.value[0]; return }
  topCardAction.value = direction
  setTimeout(() => { cards.value.shift(); topCardAction.value = null }, 400)
}

const confirmMatch = async (accept) => {
  if (!accept) { pendingMatchCard.value = null; return }
  
  isMatching.value = true
  abortMatch.value = false
  const targetCard = pendingMatchCard.value
  
  const res = await generateFullProfile(targetCard, false)
  
  if (abortMatch.value) {
    // 若中途取消，静默丢弃
    isMatching.value = false
    pendingMatchCard.value = null
    return
  }

  isMatching.value = false
  pendingMatchCard.value = null
  
  if (res.success) {
    topCardAction.value = 'right'
    emit('start-chat', res.chatId)
    setTimeout(() => { cards.value.shift(); topCardAction.value = null }, 400)
  } else {
    errorText.value = res.error || '链路建立失败'
  }
}

const cancelOngoingMatch = () => {
  abortMatch.value = true
  isMatching.value = false
  pendingMatchCard.value = null
}
</script>

<style scoped>
.swipe-modal { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #111; z-index: 200; display: flex; flex-direction: column; overflow: hidden; }
.fade-scale-enter-active, .fade-scale-leave-active { transition: opacity 0.3s, transform 0.3s; }
.fade-scale-enter-from, .fade-scale-leave-to { opacity: 0; transform: scale(0.95); }
.swipe-header { padding: calc(env(safe-area-inset-top) + 16px) 20px 20px; display: flex; justify-content: space-between; color: white; align-items: center; z-index: 10; }
.card-container { flex: 1; position: relative; display: flex; justify-content: center; align-items: center; perspective: 1000px; overflow: hidden; }
.loading-state, .empty-state { position: absolute; display: flex; flex-direction: column; align-items: center; color: #8e8e93; font-size: 14px; text-align: center; }
.radar-pulse { width: 60px; height: 60px; border-radius: 50%; background: rgba(20, 204, 204, 0.2); border: 2px solid #14CCCC; animation: radar 1.5s infinite ease-out; margin-bottom: 20px; }
@keyframes radar { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }
.btn-start-scan { padding: 14px 32px; background: #14CCCC; color: white; border: none; border-radius: 30px; font-weight: 700; font-size: 16px; cursor: pointer; }
.swipe-card { position: absolute; width: 85%; height: 75%; background: #ffffff; border-radius: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); display: flex; flex-direction: column; overflow: hidden; transition: transform 0.4s, opacity 0.4s; transform-origin: bottom center; }
.card-top { z-index: 3; transform: scale(1) translateY(0); opacity: 1; }
.card-behind { z-index: 2; transform: scale(0.92) translateY(20px); opacity: 0.8; }
.fly-left { transform: translateX(-150%) rotate(-15deg) !important; opacity: 0 !important; pointer-events: none; }
.fly-right { transform: translateX(150%) rotate(15deg) !important; opacity: 0 !important; pointer-events: none; }
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
.btn-action { width: 64px; height: 64px; border-radius: 50%; background: #ffffff; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 10px 20px rgba(0,0,0,0.2); font-size: 24px; }
.btn-pass { color: #ff3b30; } .btn-wink { color: #ff2d55; width: 54px; height: 54px; font-size: 20px; } .btn-chat { color: #14CCCC; }
.match-confirm-mask { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); backdrop-filter: blur(5px); z-index: 500; display: flex; justify-content: center; align-items: center; }
.match-confirm-box { background: #fff; width: 80%; border-radius: 24px; padding: 30px 20px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.3); animation: pop 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes pop { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
.match-icon { width: 60px; height: 60px; border-radius: 50%; background: rgba(20, 204, 204, 0.1); color: #14CCCC; font-size: 28px; display: flex; justify-content: center; align-items: center; margin: 0 auto 16px; }
.match-actions { display: flex; gap: 12px; }
.match-actions button { flex: 1; padding: 12px; border-radius: 12px; border: none; font-weight: 600; font-size: 14px; cursor: pointer; }
.btn-cancel-match { background: #f4f5f7; color: #8e8e93; }
.btn-start-match { background: #14CCCC; color: white; }
.error-modal-mask { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 600; display: flex; justify-content: center; align-items: center; }
.error-box { background: #fff; width: 75%; border-radius: 20px; padding: 24px; text-align: center; }
</style>
