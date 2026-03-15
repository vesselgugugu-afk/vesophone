<template>
  <div class="tab-profile">
    <div class="profile-cover">
      <!-- 触发打开设置弹窗 -->
      <i class="fas fa-cog btn-settings" @click="$emit('open-settings')"></i>
      <div class="btn-camera"><i class="fas fa-camera"></i></div>
    </div>
    
    <div class="profile-header">
      <div class="profile-avatar"><i><i class="fas fa-user"></i></i></div>
      <div class="profile-name">{{ playerProfile.nickname }}</div>
      <div class="profile-desc">
        “{{ playerProfile.bio }}” <i class="fas fa-edit" style="font-size: 10px;"></i>
      </div>
    </div>

    <div class="pref-section">
      <div class="pref-box">
        <div class="pref-header">
          <div class="pref-title"><i class="fas fa-crosshairs"></i> 偏好收集箱</div>
        </div>
        <div class="pref-tags">
          <div class="pref-tag" v-for="tag in prefTags" :key="tag.id">
            {{ tag.tag }} <span>x{{ tag.weight }}</span>
          </div>
          <div class="pref-tag add-btn"><i class="fas fa-plus" style="font-size: 10px;"></i> 添加</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useDatingPlayer } from '@/composables/useDatingPlayer'
import { useDatingPrefs } from '@/composables/useDatingPrefs'

defineEmits(['open-settings'])

const { playerProfile } = useDatingPlayer()
const { prefTags } = useDatingPrefs()
</script>

<style scoped>
.tab-profile { animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

.profile-cover { height: 140px; background: linear-gradient(45deg, #14CCCC, #2c3e50); position: relative; }
.btn-settings { position: absolute; top: 20px; right: 20px; color: white; cursor: pointer; z-index: 10; font-size: 18px; }
.btn-camera { position: absolute; bottom: 12px; right: 12px; color: white; opacity: 0.8; cursor: pointer; background: rgba(0,0,0,0.3); padding: 6px; border-radius: 50%; font-size: 12px;}

.profile-header { padding: 0 20px 20px; text-align: center; background: #ffffff; border-bottom: 1px solid #e5e5ea; position: relative; margin-top: -40px; border-radius: 24px 24px 0 0; }
.profile-avatar { width: 80px; height: 80px; border-radius: 50%; background: #ffffff; border: 4px solid #ffffff; color: #14CCCC; display: flex; align-items: center; justify-content: center; margin: 0 auto 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); position: relative; font-size: 32px;}
.profile-avatar i { background: rgba(20, 204, 204, 0.1); width: 100%; height: 100%; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.profile-name { font-size: 20px; font-weight: 700; color: #1c1c1e; }
.profile-desc { font-size: 12px; color: #8e8e93; margin-top: 8px; padding: 0 20px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; }

.pref-section { padding: 20px; }
.pref-box { background: #ffffff; border-radius: 16px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); margin-bottom: 20px; }
.pref-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.pref-title { font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 6px; color: #1c1c1e; }
.pref-tags { display: flex; flex-wrap: wrap; gap: 8px; }
.pref-tag { font-size: 12px; padding: 6px 12px; border: 1px solid #14CCCC; color: #14CCCC; border-radius: 16px; display: flex; align-items: center; gap: 4px; }
.pref-tag.add-btn { border-style: dashed; color: #8e8e93; border-color: #c7c7cc; cursor: pointer; }
</style>
