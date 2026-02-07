<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  dialog: {
    speaker?: string
    lines: string[]
    index: number
  }
}>()

const line = computed(() => props.dialog.lines[props.dialog.index] ?? '')
</script>

<template>
  <div class="dialog-overlay">
    <div class="dialog-box">
      <div v-if="dialog.speaker" class="dialog-speaker">{{ dialog.speaker }}</div>
      <div class="dialog-line">{{ line }}</div>
      <div class="dialog-hint">Enter / Space</div>
    </div>
  </div>
</template>

<style scoped>
.dialog-overlay {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 16px;
  height: var(--battle-panel-height);
  z-index: 300;
  display: flex;
  justify-content: center;
  pointer-events: none;
}

.dialog-box {
  width: min(900px, 96vw);
  height: 100%;
  background: #1f1f1f;
  border: 3px solid #0f0f0f;
  border-radius: 6px;
  color: #fff;
  padding: 16px 20px;
  font-family: 'Press Start 2P', cursive;
  font-size: 14px;
  line-height: 1.5;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
}

.dialog-speaker {
  color: #ffd166;
  margin-bottom: 8px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.dialog-line {
  min-height: 40px;
}

.dialog-hint {
  margin-top: 8px;
  font-size: 10px;
  color: #a0a0a0;
  text-align: right;
}
</style>
