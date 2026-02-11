<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/gameStore'

const props = defineProps<{
  dialog: {
    speaker?: string
    lines: string[]
    index: number
  }
}>()

const store = useGameStore()
const line = computed(() => props.dialog.lines[props.dialog.index] ?? '')

const advanceDialog = () => {
  if (store.gameState !== 'DIALOG') return
  store.advanceDialog()
}
</script>

<template>
  <div class="dialog-overlay">
    <div class="dialog-box" @click="advanceDialog">
      <div v-if="dialog.speaker" class="dialog-speaker">{{ dialog.speaker }}</div>
      <div class="dialog-line">{{ line }}</div>
      <div class="dialog-arrow">▼</div>
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
  pointer-events: auto;
  cursor: pointer;
  position: relative;
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

.dialog-arrow {
  position: absolute;
  right: 16px;
  bottom: 10px;
  font-size: 14px;
  color: #a0a0a0;
  animation: dialog-blink 0.9s infinite;
}

@keyframes dialog-blink {
  0%,
  100% {
    opacity: 0.2;
  }
  50% {
    opacity: 1;
  }
}
</style>
