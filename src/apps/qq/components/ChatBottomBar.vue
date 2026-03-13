<template>
  <div class="chat-input-area" style="flex-direction:column; padding: 10px 15px calc(15px + env(safe-area-inset-bottom, 0px)); gap:10px; position:relative; z-index:20;">
    
    <div v-if="isSelectionMode" style="display:flex; justify-content:space-around; padding:10px 0;">
      <i class="fas fa-trash" style="font-size:20px; color:#ff5252;" @click="$emit('delete-selected')"></i>
    </div>
    
    <div v-else style="display:flex; gap:8px; align-items:center; width:100%;">
      <div class="action-icon-btn ai-btn" @click="$emit('trigger-ai')">
        <i class="fas fa-star"></i>
      </div>

      <div v-if="quotingText" style="position:absolute; top:-40px; left:15px; right:15px; background:rgba(240,240,240,0.9); padding:8px 15px; border-radius:10px; font-size:11px; color:#666; display:flex; justify-content:space-between; box-shadow:0 2px 10px rgba(0,0,0,0.05);">
        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">引用：{{ quotingText }}</span>
        <i class="fas fa-times" style="cursor:pointer;" @click="$emit('clear-quote')"></i>
      </div>

      <input type="text" class="chat-input" v-model="localText" @keyup.enter="handleSend" placeholder="输入消息..." style="flex:1; min-width:0;" />
      
      <div class="action-icon-btn" @click="toggleStickerPanel" style="width:36px; height:36px;">
        <i class="fas fa-smile-wink"></i>
      </div>

      <button v-if="localText.trim()" class="btn-send" @click="handleSend">
        <i class="fas fa-paper-plane" style="margin-right:2px; margin-top:1px;"></i>
      </button>
      <div v-else class="action-icon-btn more-btn" @click="toggleMorePanel">
        <i class="fas fa-plus"></i>
      </div>
    </div>

    <div v-if="showStickerPanel" class="sticker-panel-wrapper">
      <div v-if="stickerGroups.length === 0" style="text-align:center; color:#888; font-size:12px; margin-top:50px;">
        暂无全局表情包。<br>请在外观或设置的全局管理中添加。
      </div>
      <template v-else>
        <div class="sticker-content">
          <div class="drawer-item" v-for="(st, idx) in currentStickerGroup.stickers" :key="idx" @click="sendSticker(st.name)">
            <div class="sticker-item-img" :style="st.url ? `background-image:url(${st.url})` : ''">
              <i v-if="!st.url" class="fas fa-image" style="color:#ddd; font-size:24px;"></i>
            </div>
            <span style="font-size:10px; color:#666; width:100%; text-align:center; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{{ st.name }}</span>
          </div>
        </div>
        <div class="sticker-tabs">
          <div 
            class="sticker-tab" 
            v-for="g in stickerGroups" 
            :key="g.id"
            :class="{ active: activeStickerGroupId === g.id }"
            @click="activeStickerGroupId = g.id"
          >
            {{ g.name }}
          </div>
        </div>
      </template>
    </div>

    <!-- 横向分页的“更多”抽屉 -->
    <div v-if="showMorePanel" class="bottom-drawer-pages">
      <div class="drawer-page">
        <div class="drawer-item" @click="$emit('open-alert', 'image')">
          <div class="icon-bg"><i class="fas fa-image"></i></div><span>图片</span>
        </div>
        <div class="drawer-item" @click="$emit('open-alert', 'voice')">
          <div class="icon-bg"><i class="fas fa-microphone"></i></div><span>语音</span>
        </div>
        <div class="drawer-item" @click="$emit('open-alert', 'transfer')">
          <div class="icon-bg"><i class="fas fa-exchange-alt"></i></div><span>转账</span>
        </div>
        <div class="drawer-item" @click="$emit('open-alert', 'location')">
          <div class="icon-bg"><i class="fas fa-map-marker-alt"></i></div><span>位置</span>
        </div>
        <div class="drawer-item" @click="$emit('open-local-music')">
          <div class="icon-bg" style="background:#fff3e0; color:#ff9800;"><i class="fas fa-music"></i></div><span style="color:#ff9800; font-weight:600;">分享音乐</span>
        </div>
        <div class="drawer-item" @click="$emit('open-memory')">
          <div class="icon-bg"><i class="fas fa-book"></i></div><span>查看记忆</span>
        </div>
        <div class="drawer-item" @click="$emit('open-summary')">
          <div class="icon-bg" style="background:#eef2ff; color:#5c8aff;"><i class="fas fa-magic"></i></div><span style="color:#5c8aff; font-weight:600;">聊天总结</span>
        </div>
        <div class="drawer-item" @click="$emit('reroll')">
          <div class="icon-bg" style="background:#fff3f3; color:#ff5252;"><i class="fas fa-dice"></i></div><span style="color:#ff5252; font-weight:600;">重roll回复</span>
        </div>
      </div>
      
      <!-- 第二页 -->
      <div class="drawer-page">
        <div class="drawer-item" @click="$emit('toggle-colisten')">
          <div class="icon-bg" :style="musicState.coListenCharId === chat.id ? 'background:#1dd1a1; color:#fff;' : 'background:#e0f9f1; color:#1dd1a1;'">
            <i class="fas fa-headphones"></i>
          </div>
          <span :style="musicState.coListenCharId === chat.id ? 'color:#1dd1a1; font-weight:600;' : 'color:#666;'">
            {{ musicState.coListenCharId === chat.id ? '结束同频' : '邀请一起听' }}
          </span>
        </div>
        
        <!-- 新增线下见面入口 -->
        <div class="drawer-item" @click="$emit('start-offline')">
          <div class="icon-bg" style="background:#f3e5f5; color:#9c27b0;">
            <i class="fas fa-coffee"></i>
          </div>
          <span style="color:#9c27b0; font-weight:600;">线下见面</span>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useStickers } from '@/composables/useStickers'

const props = defineProps({
  chat: Object,
  musicState: Object,
  isSelectionMode: Boolean,
  quotingText: String
})

const emit = defineEmits([
  'send-text', 'send-sticker', 'trigger-ai', 'delete-selected',
  'open-alert', 'open-local-music', 'open-memory', 'open-summary',
  'reroll', 'toggle-colisten', 'clear-quote', 'start-offline'
])

const { stickerGroups } = useStickers()

const localText = ref('')
const showMorePanel = ref(false)
const showStickerPanel = ref(false)
const activeStickerGroupId = ref(null)

watch(stickerGroups, (newGroups) => {
  if (newGroups.length > 0 && !newGroups.find(g => g.id === activeStickerGroupId.value)) {
    activeStickerGroupId.value = newGroups[0].id
  }
}, { immediate: true, deep: true })

const currentStickerGroup = computed(() => {
  return stickerGroups.value.find(g => g.id === activeStickerGroupId.value) || { stickers: [] }
})

const handleSend = () => {
  if (!localText.value.trim()) return
  emit('send-text', localText.value)
  localText.value = ''
  showMorePanel.value = false
}

const sendSticker = (name) => {
  emit('send-sticker', name)
  showStickerPanel.value = false
}

const toggleMorePanel = () => {
  showMorePanel.value = !showMorePanel.value
  showStickerPanel.value = false
}

const toggleStickerPanel = () => {
  showStickerPanel.value = !showStickerPanel.value
  showMorePanel.value = false
}
</script>

<style scoped>
.chat-input-area { background: #fff; box-shadow: 0 -2px 10px rgba(0,0,0,0.02); }
.chat-input { flex: 1; border: none; background: var(--bg-color); border-radius: 18px; padding: 10px 15px; outline: none; font-size: 14px; }

.action-icon-btn { display: flex; justify-content: center; align-items: center; flex-shrink: 0; cursor: pointer; color: #666; font-size: 20px; transition: transform 0.2s; }
.action-icon-btn:active { transform: scale(0.9); }

.ai-btn { background: #eef2ff; color: #5c8aff; border-radius: 50%; width: 36px; height: 36px; font-size: 16px; }
.more-btn { border: 1px solid #ddd; border-radius: 50%; width: 36px; height: 36px; font-size: 16px; }

.btn-send {
  width: 36px;
  height: 36px;
  background: var(--text-main);
  color: #fff;
  border: none;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
  cursor: pointer;
  border-radius: 50%;
  font-size: 16px;
  transition: transform 0.2s;
}
.btn-send:active { transform: scale(0.9); }

.bottom-drawer-pages {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  background: #fff;
  padding-bottom: 10px;
  scrollbar-width: none;
}
.bottom-drawer-pages::-webkit-scrollbar {
  display: none;
}
.drawer-page {
  min-width: 100%;
  scroll-snap-align: start;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 15px 10px;
  padding: 10px 15px;
}
.drawer-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.icon-bg {
  width: 50px;
  height: 50px;
  background: #f4f5f7;
  border-radius: 14px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 20px;
  color: #666;
  transition: 0.2s;
}
.icon-bg:active {
  transform: scale(0.9);
}
.drawer-item span {
  font-size: 11px;
  color: #888;
}
</style>
