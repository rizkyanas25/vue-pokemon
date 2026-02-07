<script setup lang="ts">
import { computed } from 'vue'
import { TILE_SIZE, type NpcData } from '../constants/game'

const props = defineProps<{ npc: NpcData }>()

const npcStyle = computed(() => ({
  width: `${TILE_SIZE}px`,
  height: `${TILE_SIZE}px`,
  transform: `translate(${props.npc.x * TILE_SIZE}px, ${props.npc.y * TILE_SIZE}px)`,
  position: 'absolute' as const,
  top: 0,
  left: 0,
  backgroundColor: props.npc.color ?? '#f1a208',
  border: '2px solid #111',
  borderRadius: '6px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#111',
  fontSize: '12px',
  fontFamily: "'Press Start 2P', cursive",
  zIndex: 9,
}))

const initial = computed(() => props.npc.name.slice(0, 1).toUpperCase())
</script>

<template>
  <div class="npc-character" :style="npcStyle">{{ initial }}</div>
</template>

<style scoped>
.npc-character {
  pointer-events: none;
  image-rendering: pixelated;
}
</style>
