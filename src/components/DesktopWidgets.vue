<template>
  <div class="widget-item-wrapper w-full">
    
    <div v-if="item.component === 'diy_html'" :id="'diy-wrap-' + (item.id || 'preview')" class="diy-widget w-full" style="height:100%; position:relative;">
      <component :is="'style'" v-if="item.templateCss">
        #diy-wrap-{{ item.id || 'preview' }} { {{ item.templateCss }} }
      </component>
      <div class="diy-html-content w-full h-full" v-html="processDiyHtml(item.templateHtml, item.props)"></div>
    </div>

    <div v-else-if="item.component === 'capsule'" class="capsule-widget glass w-full">
      <div class="capsule-diy-img" :style="getImgStyle(item.props?.bgImage)"><span v-if="!item.props?.bgImage">IMG</span></div>
      <div class="capsule-time">{{ time }}</div>
      <div class="capsule-info"><div>{{ date }}</div><div>晴</div></div>
    </div>

    <div v-else-if="item.component === 'ins'" class="ins-card glass w-full">
      <div class="ins-bg" :style="getImgStyle(item.props?.bgImage)"></div>
      <div class="ins-avatar" :style="getImgStyle(item.props?.avatar || userProfile.avatar)"></div>
      <div class="ins-content">
        <div class="ins-name">{{ item.props?.title || userProfile.name || '姓名' }}</div>
        <div class="ins-sign">{{ item.props?.desc || userProfile.bio || '在此处留下你的签名...' }}</div>
      </div>
    </div>

    <div v-else-if="item.component === 'custom_card'" class="custom-card glass w-full" :style="getImgStyle(item.props?.bgImage)">
      <div class="custom-card-title">{{ item.props?.title || '每日记录' }}</div>
      <div class="custom-card-desc">{{ item.props?.desc || '设计不只是外观和感觉，设计是它如何运作。' }}</div>
    </div>

    <div v-else-if="item.component === 'health'" class="rect-card glass w-full" :style="getImgStyle(item.props?.bgImage)">
      <div class="rect-title">{{ item.props?.title || '健康' }}</div>
      <div class="rect-sub">{{ item.props?.desc || '6,432 步' }}</div>
    </div>

    <div v-else-if="item.component === 'finance'" class="rect-card glass w-full" :style="getImgStyle(item.props?.bgImage)">
      <div class="rect-title">{{ item.props?.title || '财务' }}</div>
      <div class="rect-sub">{{ item.props?.desc || '预算正常' }}</div>
    </div>

    <div v-else-if="item.component === 'record_player'" class="record-player glass w-full">
      <div class="record-bg" :style="getImgStyle(item.props?.bgImage || musicState.currentCoverUrl)"></div>
      <div class="vinyl-disk" :class="{ 'is-spinning': musicState.isPlaying }"></div>
      <div class="tonearm" :class="{ 'on-record': musicState.isPlaying }"></div>
      <div class="player-center-hole"></div>
    </div>

    <div v-else-if="item.component === 'photo_wall'" class="photo-wall glass w-full">
      <div class="polaroid p1" :style="getImgStyle(item.props?.img1)"></div>
      <div class="polaroid p2" :style="getImgStyle(item.props?.img2)"></div>
      <div class="polaroid p3" :style="getImgStyle(item.props?.img3)"></div>
      <div class="photo-wall-tag">{{ item.props?.title || 'Memories' }}</div>
    </div>

    <div v-else-if="item.component === 'calendar_pro'" class="calendar-pro glass w-full" :style="getImgStyle(item.props?.bgImage)">
      <div class="cal-month">{{ currentMonth }}</div>
      <div class="cal-day">{{ currentDayNum }}</div>
      <div class="cal-weekday">{{ currentWeekday }}</div>
    </div>

    <div v-else-if="item.component === 'colisten_card'" class="colisten-card glass w-full" :style="getImgStyle(item.props?.bgImage)">
      <div class="co-avatar" :style="getImgStyle(userProfile.avatar)"></div>
      <div class="co-wire">
        <div class="wire-line"></div>
        <div class="co-status" :class="{ 'pulse': musicState.isPlaying }">
          <i class="fas" :class="musicState.isPlaying ? 'fa-music' : 'fa-headphones'"></i>
        </div>
      </div>
      <div class="co-avatar" :style="getImgStyle(coListenAvatar)">
        <div class="no-char" v-if="!coListenAvatar">?</div>
      </div>
    </div>

    <div v-else-if="item.component === 'quick_chat'" class="quick-chat glass w-full" :style="getImgStyle(item.props?.bgImage)">
      <div class="qc-avatar" :style="getImgStyle(qcAvatar)"></div>
      <div class="qc-info">
        <div class="qc-name">{{ qcName }}</div>
        <div class="qc-btn"><i class="fas fa-paper-plane"></i></div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useTime } from '@/composables/useTime'
import { useProfile } from '@/composables/useProfile'
import { useMusic } from '@/composables/useMusic'
import { useChatSessions } from '@/composables/useChatSessions'

const props = defineProps({ item: { type: Object, required: true } })

const { time, date } = useTime()
const { userProfile } = useProfile()
const { musicState } = useMusic()
const { sessions } = useChatSessions()

const getImgStyle = (url) => url ? { backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}

// 核心升级：增加时间、日期等实时数据占位符
const processDiyHtml = (html, widgetProps) => {
  if (!html) return ''
  let res = html
  res = res.replace(/\{title\}/g, widgetProps?.title || '标题')
  res = res.replace(/\{desc\}/g, widgetProps?.desc || '描述')
  res = res.replace(/\{bgImage\}/g, widgetProps?.bgImage || '')
  res = res.replace(/\{avatar\}/g, widgetProps?.avatar || '')
  res = res.replace(/\{time\}/g, time.value || '')
  res = res.replace(/\{date\}/g, date.value || '')
  return res
}

const today = new Date()
const currentMonth = today.toLocaleString('en-US', { month: 'short' }).toUpperCase()
const currentDayNum = today.getDate()
const currentWeekday = today.toLocaleString('zh-CN', { weekday: 'long' })

const coListenAvatar = computed(() => {
  if (!musicState.coListenCharId) return ''
  const chat = sessions.value.find(c => c.id === musicState.coListenCharId)
  return chat?.participants?.[0]?.avatar || ''
})

const qcName = computed(() => {
  if (props.item.props?.title) return props.item.props.title
  const chat = sessions.value.find(c => c.id === props.item.props?.chatId)
  return chat ? chat.title : '未绑定'
})
const qcAvatar = computed(() => {
  if (props.item.props?.avatar) return props.item.props.avatar
  const chat = sessions.value.find(c => c.id === props.item.props?.chatId)
  return chat?.participants?.[0]?.avatar || ''
})
</script>

<style scoped>
.w-full { width: 100% !important; height: 100% !important; margin: 0 !important; box-sizing: border-box; }
.widget-item-wrapper { position: relative; width: 100%; height: 100%; display: flex; }

.diy-widget { overflow: hidden; border-radius: 20px; }
.capsule-widget { border-radius: 30px; display: flex; align-items: center; padding: 0 8px; gap: 10px; }
.capsule-diy-img { width: 36px; height: 36px; border-radius: 50%; background: #eee; display: flex; justify-content: center; align-items: center; font-size: 10px; color: #aaa; flex-shrink: 0; background-size: cover; background-position: center; }
.capsule-time { font-size: 24px; font-weight: 700; color: #333; font-family: -apple-system, sans-serif; letter-spacing: -1px; }
.capsule-info { display: flex; flex-direction: column; font-size: 11px; color: #666; font-weight: 600; line-height: 1.3; }

.ins-card { border-radius: 20px; position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: flex-end; padding: 20px; }
.ins-bg { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(135deg, rgba(255,255,255,0.4), rgba(255,255,255,0.1)); z-index: 1; transition: background 0.3s; }
.ins-avatar { position: absolute; top: 20px; right: 20px; width: 45px; height: 45px; border-radius: 50%; background: #ccc; z-index: 2; border: 2px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.1); background-size: cover; background-position: center; }
.ins-content { position: relative; z-index: 2; }
.ins-name { font-size: 18px; font-weight: 700; color: #2c3e50; margin-bottom: 4px; text-shadow: 0 1px 3px rgba(255,255,255,0.8); }
.ins-sign { font-size: 12px; color: #555; text-shadow: 0 1px 2px rgba(255,255,255,0.8); }

.custom-card { border-radius: 24px; padding: 20px; display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden; }
.custom-card-title { font-size: 16px; font-weight: 700; color: #333; position: relative; z-index: 2; text-shadow: 0 1px 3px rgba(255,255,255,0.8); }
.custom-card-desc { font-size: 12px; color: #666; line-height: 1.5; position: relative; z-index: 2; text-shadow: 0 1px 2px rgba(255,255,255,0.8); }

.rect-card { border-radius: 20px; padding: 15px; display: flex; flex-direction: column; justify-content: center; position: relative; overflow: hidden; }
.rect-title { font-size: 14px; font-weight: 700; color: #333; margin-bottom: 2px; position: relative; z-index: 2; text-shadow: 0 1px 3px rgba(255,255,255,0.8); }
.rect-sub { font-size: 12px; color: #888; position: relative; z-index: 2; text-shadow: 0 1px 2px rgba(255,255,255,0.8); }

.record-player { border-radius: 24px; position: relative; overflow: hidden; display: flex; justify-content: center; align-items: center; background: #fff; }
.record-bg { position: absolute; top:0; left:0; right:0; bottom:0; filter: blur(20px) opacity(0.5); z-index: 0; }
.vinyl-disk { width: 120px; height: 120px; border-radius: 50%; background: radial-gradient(circle, #111 30%, #333 40%, #111 50%, #333 60%, #111 70%); border: 4px solid #000; box-shadow: 0 10px 20px rgba(0,0,0,0.3); z-index: 2; position: relative; }
.is-spinning { animation: spin 4s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }
.player-center-hole { position: absolute; width: 24px; height: 24px; background: #fff; border-radius: 50%; z-index: 3; box-shadow: inset 0 2px 5px rgba(0,0,0,0.5); }
.tonearm { position: absolute; top: 10px; right: 15px; width: 6px; height: 70px; background: linear-gradient(to right, #ccc, #fff, #ccc); border-radius: 4px; transform-origin: top center; transform: rotate(-30deg); transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1); z-index: 4; box-shadow: 2px 2px 5px rgba(0,0,0,0.3); }
.tonearm::after { content:''; position: absolute; bottom: -10px; left: -4px; width: 14px; height: 20px; background: #444; border-radius: 4px; }
.tonearm.on-record { transform: rotate(15deg); }

.photo-wall { border-radius: 24px; position: relative; overflow: hidden; background: #fdfdfd; display: flex; justify-content: center; align-items: center; }
.polaroid { width: 85px; height: 100px; background: #fff; padding: 6px 6px 20px; box-shadow: 0 8px 20px rgba(0,0,0,0.15); border-radius: 4px; position: absolute; background-clip: content-box; border: 1px solid #eee; }
.p1 { transform: rotate(-10deg) translateX(-80px); z-index: 1; }
.p2 { transform: rotate(5deg) translateY(-10px); z-index: 2; }
.p3 { transform: rotate(15deg) translateX(80px); z-index: 3; }
.photo-wall-tag { position: absolute; bottom: 12px; right: 20px; font-family: 'Brush Script MT', cursive, sans-serif; font-size: 18px; color: #555; z-index: 4; text-shadow: 1px 1px 0 #fff; }

.calendar-pro { border-radius: 24px; display: flex; flex-direction: column; justify-content: center; align-items: center; position: relative; overflow: hidden; background: #fff; }
.cal-month { font-size: 16px; font-weight: 800; color: #ff3b30; text-transform: uppercase; letter-spacing: 2px; margin-bottom: -5px; z-index: 2; }
.cal-day { font-size: 60px; font-weight: 300; color: #222; font-family: -apple-system, sans-serif; line-height: 1; z-index: 2; }
.cal-weekday { font-size: 12px; color: #888; font-weight: 600; letter-spacing: 1px; z-index: 2; }

.colisten-card { border-radius: 24px; display: flex; justify-content: space-around; align-items: center; padding: 0 20px; background: linear-gradient(to right, rgba(255,255,255,0.8), rgba(255,255,255,0.4)); position: relative; overflow: hidden; }
.co-avatar { width: 60px; height: 60px; border-radius: 50%; background: #eee; border: 3px solid #fff; box-shadow: 0 5px 15px rgba(0,0,0,0.1); z-index: 2; display: flex; justify-content: center; align-items: center; }
.no-char { font-size: 24px; color: #ccc; font-weight: 700; }
.co-wire { flex: 1; height: 100%; position: relative; display: flex; justify-content: center; align-items: center; }
.wire-line { position: absolute; top: 50%; left: -10px; right: -10px; height: 40px; border-top: 2px dashed rgba(0,0,0,0.15); border-radius: 50%; transform: translateY(-50%); z-index: 1; }
.co-status { width: 36px; height: 36px; border-radius: 50%; background: #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.1); display: flex; justify-content: center; align-items: center; color: #ff5252; font-size: 14px; z-index: 2; transition: all 0.3s; }
.co-status.pulse { animation: beat 1.5s infinite alternate; background: #ff5252; color: #fff; }
@keyframes beat { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255,82,82,0.4); } 100% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(255,82,82,0); } }

.quick-chat { border-radius: 24px; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 10px; background: rgba(255,255,255,0.6); position: relative; overflow: hidden; }
.qc-avatar { width: 56px; height: 56px; border-radius: 20px; background: #eee; box-shadow: 0 5px 15px rgba(0,0,0,0.1); z-index: 2; background-size: cover; background-position: center; }
.qc-info { display: flex; flex-direction: column; align-items: center; z-index: 2; }
.qc-name { font-size: 14px; font-weight: 700; color: #333; margin-bottom: 4px; text-shadow: 0 1px 2px #fff; }
.qc-btn { background: #5c8aff; color: #fff; width: 32px; height: 32px; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-size: 12px; box-shadow: 0 4px 10px rgba(92,138,255,0.3); }
</style>
