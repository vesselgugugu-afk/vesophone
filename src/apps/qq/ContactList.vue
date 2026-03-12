<template>
  <div class="content-area" style="padding-top: 10px;">
    
    <!-- 仿微信顶部操作栏 -->
    <div style="background: #fff; border-radius: 16px; overflow: hidden; margin-bottom: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
      <div class="menu-item" style="padding: 15px;" @click="$emit('create-char')">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="width:36px; height:36px; background:#ff9f43; color:#fff; border-radius:10px; display:flex; justify-content:center; align-items:center;">
            <i class="fas fa-user-plus"></i>
          </div>
          <span style="font-weight:600; font-size:14px;">添加好友 / 导入角色</span>
        </div>
        <i class="fas fa-chevron-right" style="color:#ccc; font-size:12px;"></i>
      </div>
      <div class="menu-item" style="padding: 15px; border-top: 1px solid #f5f5f5;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="width:36px; height:36px; background:#1dd1a1; color:#fff; border-radius:10px; display:flex; justify-content:center; align-items:center;">
            <i class="fas fa-user-friends"></i>
          </div>
          <span style="font-weight:600; font-size:14px;">新的朋友</span>
        </div>
        <i class="fas fa-chevron-right" style="color:#ccc; font-size:12px;"></i>
      </div>
    </div>

    <div style="font-size:11px; color:var(--text-sub); font-weight:600; padding:0 5px 8px;">我的联系人 ({{ characters.length }})</div>

    <div
      v-if="characters.length === 0"
      style="text-align:center; color:#888; margin-top:30px; font-size:13px;"
    >暂无角色，点击上方添加好友</div>

    <!-- 联系人列表 -->
    <div 
      class="list-item" 
      v-for="char in characters" 
      :key="char.id"
      @click="$emit('edit-char', char.id)"
    >
      <div class="item-avatar" :style="char.avatar ? `background-image: url(${char.avatar})` : ''">
        {{ !char.avatar ? char.name.charAt(0) : '' }}
      </div>
      <div class="item-info">
        <div class="item-name">{{ char.name }} <span class="item-tag" v-if="char.trueName !== char.name">真名: {{ char.trueName }}</span></div>
        <div class="item-desc">{{ char.description || '这个人很懒，什么都没写' }}</div>
      </div>
      <i class="fas fa-trash btn-delete" @click.stop="deleteChar(char.id)"></i>
    </div>
  </div>
</template>

<script setup>
import { useCharacters } from '@/composables/useCharacters'

defineEmits(['edit-char', 'create-char'])

const { characters, deleteChar } = useCharacters()
</script>

