<script setup lang="ts">
import { useGameStore } from '../stores/gameStore'
import { TILE_SIZE, ASSETS } from '../constants/game'
import { computed } from 'vue'

const store = useGameStore()

const mapStyle = computed(() => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${store.currentMap?.[0]?.length || 0}, ${TILE_SIZE}px)`,
  width: 'fit-content',
  margin: '0 auto',
  border: '4px solid #333',
  position: 'relative' as const,
}))

const getTileColor = (type: number) => {
  switch (type) {
    case 0:
      return ASSETS.TILES.GRASS
    case 1:
      return ASSETS.TILES.WALL
    case 2:
      return ASSETS.TILES.WATER
    case 3:
      return ASSETS.TILES.DOOR
    default:
      return '#000'
  }
}
</script>

<template>
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
      </div>
    </div>

    <slot />
    <!-- Player and other entities go here -->
  </div>
</template>

<style scoped>
.map-row {
  display: contents; /* Allows children to be part of the grid */
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
  line-height: 0;
  margin-top: -10px;
}
</style>
