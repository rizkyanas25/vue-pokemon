<script setup lang="ts">
import { computed, inject, onMounted } from 'vue'
import { TILE_SIZE, type NpcData } from '../constants/game'
import { TileSizeKey } from '../constants/injectKeys'
import { useGameStore } from '../stores/gameStore'

const props = defineProps<{ npc: NpcData }>()
const store = useGameStore()
const tileSize = inject(TileSizeKey, computed(() => TILE_SIZE))

const spriteUrl = computed(() => store.npcSprites[props.npc.id] ?? props.npc.sprite ?? null)

const npcStyle = computed(() => ({
  width: `${tileSize.value}px`,
  height: `${tileSize.value}px`,
  transform: `translate(${props.npc.x * tileSize.value}px, ${props.npc.y * tileSize.value}px)`,
  position: 'absolute' as const,
  top: 0,
  left: 0,
  backgroundColor: spriteUrl.value ? 'transparent' : props.npc.color ?? '#f1a208',
  border: '2px solid #111',
  borderRadius: '6px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#111',
  fontSize: '12px',
  fontFamily: "'Press Start 2P', cursive",
  zIndex: 9,
  overflow: 'hidden',
}))

const initial = computed(() => props.npc.name.slice(0, 1).toUpperCase())

onMounted(() => {
  void store.ensureNpcSprite(props.npc)
})
</script>

<template>
  <div class="npc-character" :style="npcStyle">
    <img v-if="spriteUrl" :src="spriteUrl" :alt="npc.name" />
    <span v-else>{{ initial }}</span>
  </div>
</template>

<style scoped>
.npc-character {
  pointer-events: none;
  image-rendering: pixelated;
}

.npc-character img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  image-rendering: pixelated;
}
</style>
