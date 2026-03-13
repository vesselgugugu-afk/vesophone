<template>
  <div class="ios-action-sheet-mask" v-if="show" @click.self="$emit('update:show', false)">
    <div class="ios-action-sheet">
      <div class="ios-action-group">
        <div class="ios-action-btn" @click="emitAction('quote')">引用</div>
        <div class="ios-action-btn" v-if="msg && msg.role === 'user'" @click="emitAction('edit')">编辑</div>
        <div class="ios-action-btn" v-if="msg && msg.role === 'user' && msg.type !== 'recalled'" @click="emitAction('recall')">撤回</div>
        <div class="ios-action-btn danger" @click="emitAction('multi-select')">多选</div>
      </div>
      <div class="ios-action-cancel" @click="$emit('update:show', false)">取消</div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  show: Boolean,
  msg: Object
})
const emit = defineEmits(['update:show', 'quote', 'edit', 'recall', 'multi-select'])

const emitAction = (type) => {
  emit(type)
  emit('update:show', false)
}
</script>
