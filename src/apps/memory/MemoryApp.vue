<template>
  <transition name="slide-up">
    <div v-if="show" class="app-window" style="z-index: 80; background: var(--bg-color);">
      <component :is="'style'" v-if="memoryGlobalCss">{{ memoryGlobalCss }}</component>

      <transition name="screen-fade" mode="out-in">
        
        <!-- 选角界面 -->
        <div v-if="!selectedCharacter" class="memory-select-screen" key="select-screen">
          <div class="app-header">
            <div class="btn-back" @click="handleBack">返回</div>
            <div class="app-title">那年今日</div>
            <div class="header-right">
              <i class="fas fa-palette" style="margin-right:12px; cursor:pointer;" @click="showStyleManager = true"></i>
              <i class="fas fa-question-circle" style="cursor:pointer;" @click="showManual = true"></i>
            </div>
          </div>

          <div class="memory-select-header">
            <div class="memory-title">Memory Files</div>
            <div class="memory-subtitle">选择一个记忆档案进入</div>
          </div>
          <MemoryCharacterGrid :characters="characters" @select="handleSelectCharacter" />
        </div>

        <!-- 主记忆库界面 -->
        <div v-else class="memory-main-screen" key="main-screen">
          <div class="app-header">
            <div class="btn-back" @click="handleBackToSelect">返回</div>
            <div class="app-title">{{ selectedCharacter.name }} 的记忆</div>
            <div class="header-right">
              <i class="fas fa-palette" style="margin-right:12px; cursor:pointer;" @click="showStyleManager = true"></i>
              <i class="fas fa-cog" style="cursor:pointer;" @click="showSettings = true"></i>
            </div>
          </div>

          <MemoryTabs :tabs="tabs" :activeTab="activeTab" @change="activeTab = $event" />

          <div class="memory-content">
            <MemoryCoreTab 
              v-if="activeTab === 'core'"
              :memories="coreMemories"
              @update="handleUpdateMemory"
              @delete="handleDeleteMemory"
              @create="handleCreateMemory"
            />
            <MemoryMilestoneTab 
              v-if="activeTab === 'milestone'"
              :memories="memories"
              @update="handleUpdateMemory"
              @delete="handleDeleteMemory"
            />
            <MemoryDiaryTab 
              v-if="activeTab === 'diary'"
              :diaries="diaries"
              :settings="memorySettings"
              :character="selectedCharacter"
              @update="handleUpdateDiary"
              @delete="handleDeleteDiary"
              @archive="handleArchiveDiaries"
              @add-summary="handleAddDiarySummary"
              @refresh="refreshDiaries"
              @remind="handleRemind"
            />
          </div>
        </div>

      </transition>

      <MemorySettingsPanel 
        :show="showSettings"
        :character="selectedCharacter"
        :settings="memorySettings"
        @close="showSettings = false"
        @save="handleSaveSettings"
        @reset="handleResetSettings"
      />

      <MemoryCardStyleManager :show="showStyleManager" @close="showStyleManager = false" />

      <MemoryManual :show="showManual" @close="showManual = false" />

      <div class="ios-alert-mask" v-if="showRemindModal" @click.self="showRemindModal = false">
        <div class="ios-alert">
          <div class="ios-alert-title">提醒</div>
          <div class="ios-alert-desc">起居注未归档数量已达到提醒阈值。</div>
          <div class="ios-alert-actions">
            <div class="ios-alert-btn bold" @click="showRemindModal = false">我知道了</div>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useCharacters } from '@/composables/useCharacters'
import { useChatSessions } from '@/composables/useChatSessions'
import { useMemorySettings } from '@/composables/useMemorySettings'

import MemoryTabs from './components/MemoryTabs.vue'
import MemoryCharacterGrid from './components/MemoryCharacterGrid.vue'
import MemoryCoreTab from './components/MemoryCoreTab.vue'
import MemoryMilestoneTab from './components/MemoryMilestoneTab.vue'
import MemoryDiaryTab from './components/MemoryDiaryTab.vue'
import MemorySettingsPanel from './components/MemorySettingsPanel.vue'
import MemoryCardStyleManager from './components/MemoryCardStyleManager.vue'
import MemoryManual from './MemoryManual.vue'

const props = defineProps({ show: Boolean })
const emit = defineEmits(['close'])

const { characters } = useCharacters()
const { chatSessions, getMemoriesByCharacter, getDiariesByCharacter, updateMemoryFields, deleteMemory, addStructuredMemory, updateDiary, deleteDiary, archiveDiaries, addDiary } = useChatSessions()
const { getMemorySettings, updateMemorySettings, resetMemorySettings, getGlobalCss } = useMemorySettings()

const selectedCharacter = ref(null)
const activeTab = ref('core')
const showSettings = ref(false)
const showManual = ref(false)
const showStyleManager = ref(false)
const showRemindModal = ref(false)

const memories = ref([])
const diaries = ref([])

const tabs = [
  { id: 'core', label: '核心羁绊' },
  { id: 'milestone', label: '共同经历' },
  { id: 'diary', label: '起居注' }
]

const memorySettings = computed(() => {
  return selectedCharacter.value ? getMemorySettings(selectedCharacter.value.id) : getMemorySettings(null)
})

const memoryGlobalCss = computed(() => getGlobalCss())

const handleSelectCharacter = async (char) => {
  selectedCharacter.value = char
  activeTab.value = 'core'
  await refreshMemories()
  await refreshDiaries()
}

const handleBack = () => {
  selectedCharacter.value = null
  emit('close')
}

const handleBackToSelect = () => {
  selectedCharacter.value = null
}

const refreshMemories = async () => {
  if (!selectedCharacter.value) return
  const list = await getMemoriesByCharacter(selectedCharacter.value.id)
  memories.value = list
}

const refreshDiaries = async () => {
  if (!selectedCharacter.value) return
  const list = await getDiariesByCharacter(selectedCharacter.value.id, true)
  diaries.value = list
}

watch(() => props.show, async (val) => {
  if (val && selectedCharacter.value) {
    await refreshMemories()
    await refreshDiaries()
  }
})

const coreMemories = computed(() => {
  return memories.value.filter(m => (m.type === 'core' || Number(m.importance) >= 4 || Number(m.weight) >= 4))
})

const getSessionIdByCharacter = () => {
  if (!selectedCharacter.value) return Date.now()
  const chat = chatSessions.value.find(c => c.participants && c.participants.find(p => p.id === selectedCharacter.value.id))
  return chat ? chat.id : Date.now()
}

const handleCreateMemory = async (payload) => {
  if (!selectedCharacter.value) return
  const sessionId = getSessionIdByCharacter()
  await addStructuredMemory(sessionId, { ...payload, characterId: selectedCharacter.value.id, source: 'manual', timestamp: Date.now(), date: new Date().toLocaleString() })
  await refreshMemories()
}

const handleUpdateMemory = async (id, updates) => {
  await updateMemoryFields(id, updates)
  await refreshMemories()
}

const handleDeleteMemory = async (id) => {
  await deleteMemory(id)
  await refreshMemories()
}

const handleUpdateDiary = async (id, updates) => {
  await updateDiary(id, updates)
  await refreshDiaries()
}

const handleDeleteDiary = async (id) => {
  await deleteDiary(id)
  await refreshDiaries()
}

const handleArchiveDiaries = async (ids) => {
  await archiveDiaries(ids)
  await refreshDiaries()
}

const handleAddDiarySummary = async (payload) => {
  if (!payload) return
  await addDiary(payload.sessionId || Date.now(), payload)
  await refreshDiaries()
}

const handleSaveSettings = (updates) => {
  if (!selectedCharacter.value) return
  updateMemorySettings(selectedCharacter.value.id, updates)
  showSettings.value = false
}

const handleResetSettings = () => {
  if (!selectedCharacter.value) return
  resetMemorySettings(selectedCharacter.value.id)
}

const handleRemind = () => {
  showRemindModal.value = true
}
</script>

<style scoped>
.memory-select-screen {
  display: flex;
  flex-direction: column;
  padding: 0;
  height: 100%;
}
.memory-select-header {
  text-align: center;
  margin: 20px 0 30px;
}
.memory-title {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.5px;
  color: var(--text-main);
}
.memory-subtitle {
  font-size: 13px;
  color: #8e8e93;
  margin-top: 6px;
}
.memory-main-screen {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.memory-content {
  flex: 1;
  overflow-y: auto;
  padding: 10px 16px 20px;
}

/* 页面切换高级动效 */
.screen-fade-enter-active,
.screen-fade-leave-active {
  transition: opacity 0.35s cubic-bezier(0.25, 0.8, 0.25, 1), transform 0.35s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.screen-fade-enter-from {
  opacity: 0;
  transform: scale(0.96) translateY(10px);
}
.screen-fade-leave-to {
  opacity: 0;
  transform: scale(1.02) translateY(-10px);
}

.ios-alert-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 999999; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(5px); }
.ios-alert { background: rgba(255,255,255,0.95); width: 280px; border-radius: 18px; text-align: center; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
.ios-alert-title { font-size: 16px; font-weight: 600; padding: 20px 20px 5px; color: #000; }
.ios-alert-desc { font-size: 13px; color: #555; padding: 0 20px 15px; }
.ios-alert-actions { display: flex; border-top: 1px solid rgba(0,0,0,0.1); }
.ios-alert-btn { flex: 1; padding: 12px 0; font-size: 16px; color: #007aff; cursor: pointer; border-right: 1px solid rgba(0,0,0,0.1); }
.ios-alert-btn:last-child { border-right: none; }
.ios-alert-btn:active { background: rgba(0,0,0,0.05); }
.ios-alert-btn.bold { font-weight: 600; }
</style>
