<template>
  <transition name="slide-up">
    <div v-if="show" class="app-window" style="z-index: 60; background: var(--bg-color);">
      <component :is="'style'" v-if="memoryGlobalCss">{{ memoryGlobalCss }}</component>

      <div class="app-header">
        <div class="btn-back" @click="$emit('close')">返回</div>
        <div class="app-title">长期记忆库</div>
        <div class="header-right">
          <i class="fas fa-palette" style="margin-right:12px; cursor:pointer;" @click="showStyleManager = true"></i>
          <i class="fas fa-cog" style="cursor:pointer;" @click="showSettings = true"></i>
        </div>
      </div>

      <div class="memory-panel-body">
        <div v-if="chat.isGroup" class="group-selector">
          <select v-model="selectedCharId">
            <option v-for="c in chat.participants" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
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

      <MemorySettingsPanel 
        :show="showSettings"
        :character="selectedCharacter"
        :settings="memorySettings"
        @close="showSettings = false"
        @save="handleSaveSettings"
        @reset="handleResetSettings"
      />

      <MemoryCardStyleManager :show="showStyleManager" @close="showStyleManager = false" />

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
import { useChatSessions } from '@/composables/useChatSessions'
import { useMemorySettings } from '@/composables/useMemorySettings'
import { useCharacters } from '@/composables/useCharacters'

import MemoryTabs from '@/apps/memory/components/MemoryTabs.vue'
import MemoryCoreTab from '@/apps/memory/components/MemoryCoreTab.vue'
import MemoryMilestoneTab from '@/apps/memory/components/MemoryMilestoneTab.vue'
import MemoryDiaryTab from '@/apps/memory/components/MemoryDiaryTab.vue'
import MemorySettingsPanel from '@/apps/memory/components/MemorySettingsPanel.vue'
import MemoryCardStyleManager from '@/apps/memory/components/MemoryCardStyleManager.vue'

const props = defineProps({
  show: Boolean,
  chat: { type: Object, required: true }
})
defineEmits(['close'])

const { getMemoriesByCharacter, getDiariesByCharacter, updateMemoryFields, deleteMemory, updateDiary, deleteDiary, archiveDiaries, addDiary, addStructuredMemory } = useChatSessions()
const { getMemorySettings, updateMemorySettings, resetMemorySettings, getGlobalCss } = useMemorySettings()
const { getCharById } = useCharacters()

const tabs = [
  { id: 'core', label: '核心羁绊' },
  { id: 'milestone', label: '共同经历' },
  { id: 'diary', label: '起居注' }
]

const activeTab = ref('core')
const showSettings = ref(false)
const showStyleManager = ref(false)
const showRemindModal = ref(false)

const selectedCharId = ref(null)
const memories = ref([])
const diaries = ref([])

const selectedCharacter = computed(() => {
  if (!selectedCharId.value) return null
  return getCharById(selectedCharId.value)
})

const memorySettings = computed(() => {
  return selectedCharId.value ? getMemorySettings(selectedCharId.value) : getMemorySettings(null)
})

const memoryGlobalCss = computed(() => getGlobalCss())

watch(() => props.show, async (val) => {
  if (val) {
    if (!selectedCharId.value) {
      selectedCharId.value = props.chat.participants && props.chat.participants[0] ? props.chat.participants[0].id : null
    }
    await refreshMemories()
    await refreshDiaries()
  }
})

watch(selectedCharId, async () => {
  await refreshMemories()
  await refreshDiaries()
})

const refreshMemories = async () => {
  if (!selectedCharId.value) return
  memories.value = await getMemoriesByCharacter(selectedCharId.value)
}

const refreshDiaries = async () => {
  if (!selectedCharId.value) return
  diaries.value = await getDiariesByCharacter(selectedCharId.value, true)
}

const coreMemories = computed(() => {
  return memories.value.filter(m => (m.type === 'core' || Number(m.importance) >= 4 || Number(m.weight) >= 4))
})

const handleCreateMemory = async (payload) => {
  if (!selectedCharId.value) return
  await addStructuredMemory(props.chat.id, { ...payload, characterId: selectedCharId.value, source: 'manual', timestamp: Date.now(), date: new Date().toLocaleString() })
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
  if (!selectedCharId.value) return
  updateMemorySettings(selectedCharId.value, updates)
  showSettings.value = false
}

const handleResetSettings = () => {
  if (!selectedCharId.value) return
  resetMemorySettings(selectedCharId.value)
}

const handleRemind = () => {
  showRemindModal.value = true
}
</script>

<style scoped>
.memory-panel-body { display: flex; flex-direction: column; height: 100%; }
.group-selector { padding: 10px 16px; }
.group-selector select { width: 100%; padding: 8px; border: 1px solid #eee; border-radius: 10px; background: #fff; }
.memory-content { flex: 1; overflow-y: auto; padding: 10px 16px 20px; }

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
