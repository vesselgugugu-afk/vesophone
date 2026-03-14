<template>
  <transition name="slide-up">
    <div v-if="show" class="app-window" style="z-index: 120; background: var(--bg-color);">
      <div class="app-header">
        <div class="btn-back" @click="$emit('close')">返回</div>
        <div class="app-title">记忆库使用手册</div>
        <div class="header-right"></div>
      </div>

      <div class="content-area">
        <div class="manual-card">
          <div class="manual-title">功能概览</div>
          <div class="manual-text">
            记忆库分为两条轨道：
            <br>1. 结构化记忆（核心 / 里程碑 / 事件）
            <br>2. 起居注（日记）
          </div>
        </div>

        <div class="manual-card">
          <div class="manual-title">入口位置</div>
          <div class="manual-text">
            - 桌面 App：那年今日（全角色）
            <br>- 聊天内入口：更多 → 查看记忆（当前角色）
          </div>
        </div>

        <div class="manual-card">
          <div class="manual-title">三大页面</div>
          <div class="manual-text">
            - 核心羁绊：重要记忆，可新增、编辑、删除
            <br>- 共同经历：里程碑时间轴，显示关键词/来源
            <br>- 起居注：日记列表，支持筛选、归档、整理
          </div>
        </div>

        <div class="manual-card">
          <div class="manual-title">起居注等级</div>
          <div class="manual-text">
            - L1：原始日记
            <br>- L2：阶段总结
            <br>- L3：高阶回忆
          </div>
        </div>

        <div class="manual-card">
          <div class="manual-title">整理与归档</div>
          <div class="manual-text">
            - 勾选任意起居注 → 生成 L2/L3
            <br>- 被选中的条目会标记为已归档
            <br>- 归档不删除，只是不再注入
          </div>
        </div>

        <div class="manual-card">
          <div class="manual-title">自动归档</div>
          <div class="manual-text">
            - 达到阈值后自动整理
            <br>- 是否包含 L2/L3 可配置
            <br>- 目标级别可配置
          </div>
        </div>

        <div class="manual-card">
          <div class="manual-title">提示词自定义</div>
          <div class="manual-text">
            在“设置”里可自定义：
            <br>- 总结提示词
            <br>- 起居注提示词
            <br>- 起居注整理提示词
          </div>
        </div>

        <div class="manual-card">
          <div class="manual-title">群聊记忆规则</div>
          <div class="manual-text">
            - JSON 输出带 character_id
            <br>- 未填写时自动拆分给所有角色
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
defineProps({ show: Boolean })
defineEmits(['close'])
</script>

<style scoped>
.manual-card {
  background: #fff;
  border-radius: 14px;
  padding: 15px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.03);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.manual-title {
  font-size: 14px;
  font-weight: 700;
  color: #333;
}
.manual-text {
  font-size: 12px;
  color: #666;
  line-height: 1.6;
}
</style>
