<script setup lang="ts">
import { useGameStore } from '../stores/gameStore'
import { TILE, TILE_COLORS, type TileId } from '../constants/game'
import { TileSizeKey } from '../constants/injectKeys'
import NpcCharacter from './NpcCharacter.vue'
import { computed, ref, onMounted, onUnmounted, provide } from 'vue'

const FIXED_TILE = 48

const store = useGameStore()
const windowSize = ref({ width: window.innerWidth, height: window.innerHeight })

const updateSize = () => {
  windowSize.value = { width: window.innerWidth, height: window.innerHeight }
}

onMounted(() => window.addEventListener('resize', updateSize))
onUnmounted(() => window.removeEventListener('resize', updateSize))

const mapWidth = computed(() => store.currentMap?.[0]?.length ?? 1)
const mapHeight = computed(() => store.currentMap?.length ?? 1)

const tileSize = computed(() => ({
  width: FIXED_TILE,
  height: FIXED_TILE,
}))

provide(TileSizeKey, tileSize)

const totalMapWidth = computed(() => mapWidth.value * FIXED_TILE)
const totalMapHeight = computed(() => mapHeight.value * FIXED_TILE)

const cameraOffset = computed(() => {
  const vw = windowSize.value.width
  const vh = windowSize.value.height

  const playerCenterX = (store.player.x + 0.5) * FIXED_TILE
  const playerCenterY = (store.player.y + 0.5) * FIXED_TILE

  let offsetX = vw / 2 - playerCenterX
  let offsetY = vh / 2 - playerCenterY

  // Clamp so we don't show beyond map edges
  const minX = vw - totalMapWidth.value
  const minY = vh - totalMapHeight.value

  offsetX = Math.min(0, Math.max(minX, offsetX))
  offsetY = Math.min(0, Math.max(minY, offsetY))

  return { x: offsetX, y: offsetY }
})

const mapStyle = computed(() => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${mapWidth.value}, ${FIXED_TILE}px)`,
  gridTemplateRows: `repeat(${mapHeight.value}, ${FIXED_TILE}px)`,
  width: `${totalMapWidth.value}px`,
  height: `${totalMapHeight.value}px`,
  transform: `translate(${cameraOffset.value.x}px, ${cameraOffset.value.y}px)`,
  transition: 'transform 0.2s linear',
}))

const getTileColor = (type: number) => TILE_COLORS[type as TileId] ?? '#000'

const getTileStyle = (tile: TileId) => {
  const style: Record<string, string> = {
    width: `${FIXED_TILE}px`,
    height: `${FIXED_TILE}px`,
    backgroundColor: getTileColor(tile),
  }

  if (tile === TILE.BUSH) {
    style.backgroundImage = "url('/sprites/bush-sprite.png')"
    style.backgroundSize = 'cover'
    style.backgroundRepeat = 'no-repeat'
    style.backgroundPosition = 'center'
  }

  if (tile === TILE.BRIDGE) {
    style.backgroundImage =
      'linear-gradient(90deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0) 20%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.15) 80%, rgba(0,0,0,0) 100%)'
    style.backgroundSize = '24px 100%'
  }

  return style
}
</script>

<template>
  <div class="camera-container">
    <div class="world-map" :style="mapStyle">
      <div v-for="(row, y) in store.currentMap" :key="y" class="map-row">
        <div
          v-for="(tile, x) in row"
          :key="`${x}-${y}`"
          class="tile"
          :style="getTileStyle(tile)"
        >
          <span v-if="tile === TILE.GRASS" class="grass-detail">.</span>
          <span v-if="tile === TILE.WALL" class="wall-detail">#</span>
          <span v-if="tile === TILE.WATER" class="water-detail">~</span>
          <span v-if="tile === TILE.PATH" class="path-detail">=</span>
          <span v-if="tile === TILE.BRIDGE" class="path-detail">=</span>
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

.world-map {
  position: absolute;
  top: 0;
  left: 0;
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
