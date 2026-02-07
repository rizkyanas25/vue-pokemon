import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { MAP_WIDTH, MAP_HEIGHT, TILE_SIZE } from '../constants/game' // We will update constants too

export type Direction = 'up' | 'down' | 'left' | 'right'
export type GameState = 'ROAMING' | 'BATTLE' | 'MENU'

export const useGameStore = defineStore('game', () => {
  const gameState = ref<GameState>('ROAMING')

  const player = ref({
    x: 20,
    y: 20,
    direction: 'down' as Direction,
    step: 0,
    party: [] as any[], // TODO: Define Pokemon type
  })

  // Generate a larger map (40x40)
  // 0 = grass, 1 = wall, 2 = water, 3 = door
  const generateMap = (width: number, height: number) => {
    const map = []
    for (let y = 0; y < height; y++) {
      const row = []
      for (let x = 0; x < width; x++) {
        // Borders
        if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
          row.push(1)
        } else {
          // Random grass or water features
          const rand = Math.random()
          if (rand > 0.95)
            row.push(1) // Rocks
          else if (rand > 0.9)
            row.push(2) // Ponds
          else row.push(0) // Grass
        }
      }
      map.push(row)
    }
    return map
  }

  const currentMap = ref<number[][]>(generateMap(40, 40))

  function movePlayer(dx: number, dy: number) {
    if (gameState.value !== 'ROAMING') return

    const newX = player.value.x + dx
    const newY = player.value.y + dy

    // Check bounds
    if (
      newY < 0 ||
      newY >= currentMap.value.length ||
      newX < 0 ||
      !currentMap.value[newY] ||
      newX >= currentMap.value[newY].length
    ) {
      return
    }

    // Check collision (1 is wall, 2 is water)
    const row = currentMap.value[newY]
    if (!row) return
    const tile = row[newX]
    if (tile === 1 || tile === 2) {
      // Bump sound?
      return
    }

    player.value.x = newX
    player.value.y = newY
    player.value.step = (player.value.step + 1) % 2

    // Check for encounters
    if (tile === 0 && Math.random() < 0.1) {
      gameState.value = 'BATTLE'
    }
  }

  function setDirection(dir: Direction) {
    player.value.direction = dir
  }

  return {
    gameState,
    player,
    currentMap,
    movePlayer,
    setDirection,
  }
})
