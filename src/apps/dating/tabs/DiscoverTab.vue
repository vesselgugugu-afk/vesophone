<template>
  <div class="tab-discover">
    <div class="action-cards">
      <div class="action-card" @click="$emit('open-swipe')">
        <div class="action-icon"><i class="fas fa-layer-group"></i></div>
        <div class="action-title">速配卡片</div>
        <div class="action-desc">左滑无感 右滑开聊</div>
      </div>
      <div class="action-card" @click="$emit('open-random')">
        <div class="action-icon" style="background: #f0f0f0; color: #1c1c1e;"><i class="fas fa-microphone"></i></div>
        <div class="action-title">随机聊天室</div>
        <div class="action-desc">设定场景 匿名相遇</div>
      </div>
    </div>

    <div class="feed-section">
      <div class="section-header">
        <div class="section-title">广场动态</div>
        <div class="refresh-btn"><i class="fas fa-sync-alt" style="font-size: 10px;"></i> 换一批</div>
      </div>
      
      <!-- 预置的假数据，后续可以换成 AI 随机生成的帖子 -->
      <div class="post-card">
        <div class="post-header">
          <div class="post-avatar"><i class="fas fa-user"></i></div>
          <div class="post-info">
            <div class="post-name">匿名用户_8A2F</div>
            <div class="post-time">刚刚</div>
          </div>
        </div>
        <div class="post-content">深夜的便利店总是让人觉得安心，关东煮的热气好像能驱散一整天的疲惫。有人也喜欢这种感觉吗？</div>
        <div class="tag-list">
          <span class="tag">夜猫子</span>
          <span class="tag">便利店</span>
        </div>
      </div>
    </div>

    <!-- 发帖悬浮按钮 -->
    <div class="fab">
      <i class="fas fa-pen"></i>
    </div>
  </div>
</template>

<script setup>
defineEmits(['open-swipe', 'open-random'])
</script>

<style scoped>
.tab-discover { animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

.action-cards { display: flex; gap: 12px; padding: 16px 20px; }
.action-card { flex: 1; background: #ffffff; border-radius: 16px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer; border: 1px solid transparent; }
.action-card:active { transform: scale(0.98); }
.action-icon { width: 40px; height: 40px; border-radius: 50%; background: rgba(20, 204, 204, 0.1); color: #14CCCC; display: flex; align-items: center; justify-content: center; font-size: 16px; }
.action-title { font-size: 14px; font-weight: 600; color: #1c1c1e; }
.action-desc { font-size: 10px; color: #8e8e93; text-align: center; }

.feed-section { padding: 0 20px 20px; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.section-title { font-size: 14px; font-weight: 600; color: #8e8e93; }
.refresh-btn { color: #14CCCC; font-size: 12px; display: flex; align-items: center; gap: 4px; cursor: pointer; }

.post-card { background: #ffffff; border-radius: 16px; padding: 16px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); cursor: pointer; transition: transform 0.1s; }
.post-card:active { transform: scale(0.98); }
.post-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.post-avatar { width: 36px; height: 36px; border-radius: 50%; background: #eee; display: flex; align-items: center; justify-content: center; color: #c7c7cc; font-size: 16px; }
.post-info { flex: 1; }
.post-name { font-size: 14px; font-weight: 600; color: #1c1c1e; }
.post-time { font-size: 10px; color: #8e8e93; }
.post-content { font-size: 14px; line-height: 1.5; margin-bottom: 12px; color: #1c1c1e; }
.tag-list { display: flex; flex-wrap: wrap; gap: 6px; }
.tag { font-size: 10px; padding: 4px 8px; background: rgba(20, 204, 204, 0.1); color: #14CCCC; border-radius: 4px; font-weight: 500; }

.fab { position: absolute; bottom: 90px; right: 20px; width: 50px; height: 50px; border-radius: 50%; background: #14CCCC; color: white; display: flex; align-items: center; justify-content: center; font-size: 18px; box-shadow: 0 4px 12px rgba(20, 204, 204, 0.4); cursor: pointer; z-index: 90; transition: transform 0.2s; }
.fab:active { transform: scale(0.9); }
</style>
