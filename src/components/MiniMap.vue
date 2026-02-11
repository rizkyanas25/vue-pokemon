<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { TILE, type TileId } from '../constants/game'
import { overworldMap } from '../data/overworld'

const store = useGameStore()
const canvasRef = ref<HTMLCanvasElement | null>(null)

// Map dimensions
const SECTOR_WIDTH = overworldMap.width // ~43 tiles
const SECTOR_HEIGHT = overworldMap.height // ~31 tiles
const SECTORS_X = 3
const SECTORS_Y = 3

// Minimap display settings
const TILE_SIZE = 2 // Size of each tile on minimap in pixels
const CANVAS_WIDTH = SECTORS_X * SECTOR_WIDTH * TILE_SIZE
const CANVAS_HEIGHT = SECTORS_Y * SECTOR_HEIGHT * TILE_SIZE

const COLORS: Record<number, string> = {
  [TILE.GRASS]: '#4caf50',
  [TILE.WATER]: '#2196f3',
  [TILE.WALL]: '#795548',
  [TILE.PATH]: '#d7ccc8', // lighter brown
  [TILE.BUSH]: '#388e3c', // darker green
  [TILE.BRIDGE]: '#a1887f',
}

const mapKey = (x: number, y: number) => `${x},${y}`

const drawMap = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Clear canvas
  ctx.fillStyle = '#111' // Dark background for "fog of war"
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  // Draw each sector
  for (let wy = 0; wy < SECTORS_Y; wy++) {
    for (let wx = 0; wx < SECTORS_X; wx++) {
      const key = mapKey(wx, wy)
      const tiles = store.mapCache[key]

      if (tiles) {
        drawSector(ctx, tiles, wx, wy)
      }
    }
  }

  // Draw player
  drawPlayer(ctx)
}

const drawSector = (ctx: CanvasRenderingContext2D, tiles: TileId[][], wx: number, wy: number) => {
  const startX = wx * SECTOR_WIDTH * TILE_SIZE
  const startY = wy * SECTOR_HEIGHT * TILE_SIZE

  for (let y = 0; y < tiles.length; y++) {
    const row = tiles[y]
    if (!row) continue
    for (let x = 0; x < row.length; x++) {
      const tile = row[x]
      if (tile !== undefined && COLORS[tile]) {
        ctx.fillStyle = COLORS[tile]
        ctx.fillRect(startX + x * TILE_SIZE, startY + y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
      }
    }
  }
}

const drawPlayer = (ctx: CanvasRenderingContext2D) => {
  const wx = store.worldPos.x
  const wy = store.worldPos.y
  const px = store.player.x
  const py = store.player.y

  // Calculate absolute position on minimap
  const absoluteX = (wx * SECTOR_WIDTH + px) * TILE_SIZE
  const absoluteY = (wy * SECTOR_HEIGHT + py) * TILE_SIZE

  // Draw red dot for player
  ctx.fillStyle = '#ff0000'
  ctx.beginPath()
  ctx.arc(absoluteX + TILE_SIZE / 2, absoluteY + TILE_SIZE / 2, TILE_SIZE * 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 1
  ctx.stroke()
}

// Watch for changes to redraw
watch(
  () => [store.player.x, store.player.y, store.worldPos.x, store.worldPos.y, store.mapCache],
  () => {
    requestAnimationFrame(drawMap)
  },
  { deep: true },
)

onMounted(() => {
  drawMap()
})
</script>

<template>
  <div class="minimap-container">
    <canvas
      ref="canvasRef"
      :width="CANVAS_WIDTH"
      :height="CANVAS_HEIGHT"
      class="minimap-canvas"
    ></canvas>
    <div class="minimap-border"></div>
  </div>
</template>

<style scoped>
.minimap-container {
  position: relative;
  border: 2px solid #fff;
  background: #000;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.5);
  display: inline-block;
  line-height: 0; /* Removing extra vertical space */
}

.minimap-canvas {
  display: block;
  image-rendering: pixelated; /* Keep it crisp */
}

/* Optional: Add a subtle scanline or grid effect overlay */
.minimap-border {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.5);
}
</style>
