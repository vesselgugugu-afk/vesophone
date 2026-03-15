<template>
  <div class="tab-chats">
    <div class="chat-list">
      <!-- 等批次5对接真实数据，目前为结构展示 -->
      <div class="chat-item" @click="$emit('open-chat', 1)">
        <div class="chat-avatar"><i class="fas fa-question-circle"></i></div>
        <div class="chat-info">
          <div class="chat-name-row">
            <div class="chat-name">冰镇气泡水 <span class="chat-type type-swipe">速配</span></div>
            <span class="post-time">12:30</span>
          </div>
          <div class="chat-msg">其实我平时不怎么用这个软件的...</div>
        </div>
      </div>

      <div class="chat-item" @click="$emit('open-chat', 2)">
        <div class="chat-avatar"><i class="fas fa-microphone"></i></div>
        <div class="chat-info">
          <div class="chat-name-row">
            <div class="chat-name">24岁 / 男 <span class="chat-type type-blind">盲聊</span></div>
            <span class="post-time">昨天</span>
          </div>
          <div class="chat-msg">你说的那个乐队我也很喜欢！</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineEmits(['open-chat'])
</script>

<style scoped>
.tab-chats { animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

.chat-list { padding: 12px 20px; }
.chat-item { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid #e5e5ea; cursor: pointer; }
.chat-avatar { width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #e0e0e0, #f5f5f5); display: flex; align-items: center; justify-content: center; color: #8e8e93; font-size: 20px; position: relative; }
.chat-avatar.revealed { background: linear-gradient(135deg, rgba(20, 204, 204, 0.1), #e0f7f7); color: #14CCCC; }
.chat-info { flex: 1; overflow: hidden; }
.chat-name-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.chat-name { font-size: 15px; font-weight: 600; display: flex; align-items: center; gap: 6px; color: #1c1c1e; }
.chat-type { font-size: 9px; padding: 2px 4px; border-radius: 4px; font-weight: 600; }
.type-swipe { background: #fff0f0; color: #ff5252; border: 1px solid #ff5252; }
.type-blind { background: #f0f4ff; color: #5c8aff; border: 1px solid #5c8aff; }
.post-time { font-size: 10px; color: #8e8e93; }
.chat-msg { font-size: 13px; color: #8e8e93; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>
