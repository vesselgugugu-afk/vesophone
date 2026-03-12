<template>
  <transition name="fade">
    <div class="inner-modal" v-if="show" @click.self="$emit('close')">
      <div class="modal-card">
        <slot />
      </div>
    </div>
  </transition>
</template>

<script setup>
defineProps({ show: Boolean })
defineEmits(['close'])
</script>
