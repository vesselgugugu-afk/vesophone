<template>
  <transition name="slide-up">
    <div v-if="show" class="app-window" style="z-index: 60; background: var(--bg-color);">
      <div class="app-header">
        <div class="btn-back" @click="$emit('close')">返回</div>
        <div class="app-title">长期记忆库</div>
        <div class="header-right"></div>
      </div>

      <div class="content-area">
        <div v-if="chat.memoryList && chat.memoryList.length === 0 && activeMemories.length === 0" style="text-align:center; color:#888; font-size:12px; margin-top:50px;">
          暂无记忆。<br>请在聊天界面的【更多-聊天总结】中提取。
        </div>
        
        <div style="display:flex; flex-direction:column; gap:10px;">
          <div v-for="mem in activeMemories" :key="mem.id" style="background:#fff; padding:15px; border-radius:14px; box-shadow:0 2px 10px rgba(0,0,0,0.02); display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:10px; color:#aaa;">{{ mem.date }}</span>
              <i class="fas fa-trash" style="color:#ff5252; cursor:pointer;" @click="handleDelete(mem.id)"></i>
            </div>
            <textarea 
              v-model="mem.text" 
              @blur="updateMemory(mem.id, mem.text)"
              style="width:100%; border:none; background:#f9f9f9; padding:10px; border-radius:8px; font-size:13px; resize:vertical; outline:none; min-height:60px;"
              placeholder="记忆内容..."
            ></textarea>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { useChatSessions } from '@/composables/useChatSessions'

const props = defineProps({
  show: Boolean,
  chat: { type: Object, required: true }
})
defineEmits(['close'])

const { activeMemories, updateMemory, deleteMemory } = useChatSessions()

const handleDelete = (id) => {
  if (confirm('确定要删除这条记忆吗？')) {
    deleteMemory(id)
  }
}
</script>
