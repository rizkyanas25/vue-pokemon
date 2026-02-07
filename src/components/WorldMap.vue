<script setup lang="ts">
import { useGameStore } from '../stores/gameStore'
import { TILE_SIZE, TILE_COLORS, type TileId } from '../constants/game'
import NpcCharacter from './NpcCharacter.vue'
import { computed, ref, onMounted, onUnmounted } from 'vue'

const store = useGameStore()
const windowSize = ref({ width: window.innerWidth, height: window.innerHeight })

const updateSize = () => {
  windowSize.value = { width: window.innerWidth, height: window.innerHeight }
}

onMounted(() => window.addEventListener('resize', updateSize))
onUnmounted(() => window.removeEventListener('resize', updateSize))

// Calculate camera position to center player
const cameraTransform = computed(() => {
  const centerX = windowSize.value.width / 2
  const centerY = windowSize.value.height / 2

  // Player position in pixels (center of tile)
  const playerPxX = store.player.x * TILE_SIZE + TILE_SIZE / 2
  const playerPxY = store.player.y * TILE_SIZE + TILE_SIZE / 2

  const translateX = centerX - playerPxX
  const translateY = centerY - playerPxY

  return `translate(${translateX}px, ${translateY}px)`
})

const mapStyle = computed(() => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${store.currentMap?.[0]?.length || 0}, ${TILE_SIZE}px)`,
  width: 'fit-content',
  transform: cameraTransform.value,
  transition: 'transform 0.2s linear', // smooth camera follow matched to player speed
  willChange: 'transform',
}))

const getTileColor = (type: number) => TILE_COLORS[type as TileId] ?? '#000'
</script>

<template>
  <div class="camera-container">
    <div class="world-map" :style="mapStyle">
      <div v-for="(row, y) in store.currentMap" :key="y" class="map-row">
        <div
          v-for="(tile, x) in row"
          :key="`${x}-${y}`"
          class="tile"
          :style="{
            width: `${TILE_SIZE}px`,
            height: `${TILE_SIZE}px`,
            backgroundColor: getTileColor(tile),
          }"
        >
          <!-- Optional: Render tile image here if we had them -->
          <span v-if="tile === 0" class="grass-detail">.</span>
          <span v-if="tile === 1" class="wall-detail">#</span>
          <span v-if="tile === 2" class="water-detail">~</span>
          <span v-if="tile === 3" class="path-detail">=</span>
        </div>
      </div>

      <NpcCharacter v-for="npc in store.npcs" :key="npc.id" :npc="npc" />
      <slot />
    </div>
  </div>
</template>

<style scoped>
.camera-container {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #000;
  position: relative;
}

.map-row {
  display: contents;
}

.tile {
  box-sizing: border-box;
  image-rendering: pixelated;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(0, 0, 0, 0.2);
  font-weight: bold;
}

.grass-detail {
  font-size: 20px;
  margin-top: -10px;
}
.wall-detail {
  color: rgba(0, 0, 0, 0.4);
}
.water-detail {
  color: rgba(255, 255, 255, 0.4);
}
.path-detail {
  color: rgba(0, 0, 0, 0.25);
}
</style>
